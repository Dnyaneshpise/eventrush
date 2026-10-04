# EventRush

A high-concurrency ticket booking system built to practice the exact problems
large-scale systems (Amazon, Ticketmaster, BookMyShow) face during a flash sale:
race conditions, idempotent retries, fairness under load, and rate limiting.

## Running the full platform (backend + frontend, distributed)

This is the complete system — 2 backend copies, MySQL, Redis, backend load
balancer, AND the React frontend, all composed together, all started with
one command.

**Requires:** Docker Desktop, and `eventrush-frontend/` unzipped as a
SIBLING folder to this one:

```
some-folder/
  eventrush/            <- this project
  eventrush-frontend/   <- the frontend project
```

Then, from inside `eventrush/`:

```
docker compose up --build
```

Open **http://localhost:3000** — that's the frontend, served by its own
nginx, which reverse-proxies every `/api/*` call to the backend's load
balancer internally. Your browser never talks to port 8080 directly in
this setup; it only ever sees one origin (port 3000), so there's no CORS
involved at all — the two nginx containers handle routing between
themselves on Docker's internal network.

The backend API is still separately reachable at **http://localhost:8080**
for curl/Postman/JMeter — useful for the load test, which talks to the
backend directly and doesn't need the frontend running at all.

**Proof it's really distributed**, not just configured to look that way:

```
curl -i http://localhost:8080/api/events | grep X-Served-By
curl -i http://localhost:8080/api/events | grep X-Served-By
```

Run that a few times — the `X-Served-By` header will alternate between two
different container IDs. That's Nginx round-robining your request across
`app1` and `app2` live. If you stop one container (`docker stop
eventrush-app1-1`) and curl again, the other one keeps answering — that's
the actual property "distributed" is describing: no single point of
failure at the app tier.

Both app copies talk to the SAME MySQL and Redis, which is exactly why the
pessimistic lock and Redis-backed rate limiter/queue matter — they're what
stops the two independent copies from stepping on each other.

## Running single-instance (simpler, for quick local dev)

1. Have MySQL running locally. Update `src/main/resources/application.properties`
   with your username/password if different from `root` / `yourpassword`.
2. Have Redis running locally (default `localhost:6379`):
   `docker run -d -p 6379:6379 redis`
   (or `brew install redis && redis-server` / `sudo apt install redis-server`)
3. `mvn spring-boot:run`
4. On startup, `DataSeeder` auto-creates 1 event, 30 seats across 3 rows
   (A/B/C, 10 seats each, 8 pre-booked scattered around so it reads like a
   real partially-sold venue), and 50 test users (id 1-50).
5. Prove the local-queue version works: `mvn test -Dtest=BookingConcurrencyTest`
   This test creates its own isolated single-seat scenario (separate from
   the seeded venue above) and fires 100 concurrent booking requests at it
   and asserts EXACTLY ONE succeeds. Uses an in-memory H2 DB and the
   original in-memory `BookingQueueService`, so it needs no MySQL or Redis
   to run - kept this way on purpose for a fast, dependency-free test.

## API

```
GET  /api/events
GET  /api/events/{eventId}/seats
POST /api/bookings
     body: { "userId": 1, "seatId": 1, "eventId": 1, "idempotencyKey": "some-uuid" }
```

## Architecture — request flow

```
Client
  |
  v
BookingController
  |
  |--> RedisRateLimiterService.tryConsume(userId)  -- shared across ALL app instances (Lua script, atomic)
  |
  v
RedisBookingQueueService.submit(request)            -- FAIRNESS layer, shared queue via Redis List
  |   (per-event Redis List + 1 worker thread/instance => FIFO order at the Redis level)
  |   push task -> worker pops (any instance) -> pushes result -> submitting instance collects it
  v
BookingService.bookSeat(request)                     -- CORRECTNESS layer
  |
  |--> check idempotencyKey already processed?       -- return cached result if so
  |--> seatRepository.findByIdForUpdate(seatId)       -- SELECT ... FOR UPDATE (row lock)
  |--> check + set status atomically
  |--> save Booking row (unique constraint on seat_id as a DB-level safety net)
  |
  v
NotificationService.sendBookingConfirmation()         -- @Async, doesn't block the response
```

### Two versions, on purpose

| | In-memory (still in the code) | Redis-backed (currently wired to the controller) |
|---|---|---|
| Rate limiter | `RateLimiterService` | `RedisRateLimiterService` |
| Queue | `BookingQueueService` | `RedisBookingQueueService` |
| Works across multiple app instances? | No | Yes |
| Needs Redis running? | No | Yes |
| Used by | `BookingConcurrencyTest` (fast, no infra) | `BookingController` (the real API) |

Keeping both is intentional — it's a strong interview answer to be able to say
"here's the simple version, here's why it breaks at scale, here's the fix,
and here's what changed to make it work." Most candidates can only show the
final version; being able to explain the *evolution* is what stands out.

## Concepts covered (and why each exists)

| Concept | Where | Problem it solves |
|---|---|---|
| Pessimistic locking (`SELECT ... FOR UPDATE`) | `SeatRepository.findByIdForUpdate` | Prevents 2 requests from both reading "seat available" before either writes — the core race condition |
| Idempotency key | `BookingService.bookSeat` step 1 | A retried request (bad network, double-click) never creates a duplicate booking |
| Fair FCFS queue | `BookingQueueService` | Under heavy load, DB locking alone stops overselling but doesn't guarantee the FIRST click wins — this does |
| Rate limiting (token bucket) | `RateLimiterService` | Stops one user from brute-forcing retries to cut the queue |
| DB unique constraint on `bookings.seat_id` | `Booking` entity | Defense in depth — even if the lock logic had a bug, the DB itself refuses a second booking for the same seat |
| Async notification | `NotificationService` | User doesn't wait on a slow email/SMS call to get their booking confirmation |
| Proper HTTP status codes | `GlobalExceptionHandler` | 409 for seat conflict, 429 for rate limit, 404 for not found — not everything is a 500 |

## Known limitations (good to mention proactively in interviews)

- **One worker thread per event, per instance** — with 3 app instances up,
  3 workers could pop from the same event's Redis queue at nearly the same
  moment. Redis's atomic pop still guarantees no task is processed twice,
  but strict "only one worker active at a time" would need a distributed
  lock around the worker itself (Redisson) — a good answer to "how would
  you improve this further?"
- **No load test numbers yet** — the test plan is built (`loadtest/`
  folder — JMeter test with a race-condition thread group and a throughput
  thread group), but it needs to be run against your actual machine to get
  real numbers. See `loadtest/README.md`. Do this before finalizing your
  resume line about JMeter validation — don't claim numbers you haven't
  actually measured.
- **Idempotency keys never expire.** In a real system you'd TTL them (e.g.
  24 hours) so the table doesn't grow forever — currently every booking
  attempt, successful or not that got as far as the DB, is kept.
- **Cold-start latency on the very first request.** Right after `docker
  compose up`, MySQL's connection pool, Redis's connection, and the JVM's
  JIT are all warming up simultaneously. The first booking request can take
  noticeably longer than subsequent ones as a result — a real, well-known
  characteristic of freshly-started multi-service stacks, not a bug. If a
  request ever times out right after startup, it likely still completed
  successfully on the backend; the response just arrived after the client
  gave up waiting. Worth mentioning proactively if asked about production
  readiness — a real fix would be a startup health-check /warmup endpoint,
  or a load balancer that doesn't route traffic to an instance until it's
  confirmed warm.

## Interview talking points (practice saying these out loud)

- "I reproduced the race condition first with a plain Java multithreaded
  demo before touching Spring, so I could isolate the concurrency problem
  from the framework."
- "I use pessimistic locking at the DB level rather than just
  `synchronized` in Java, because `synchronized` only protects one JVM —
  it wouldn't help once you run multiple app instances."
- "Idempotency and locking solve two different problems — locking stops
  concurrent requests from corrupting shared state, idempotency stops the
  same request from being applied twice. I keep both because retries and
  concurrency happen independently of each other."
- "The queue is what gives me actual first-come-first-served fairness — the
  lock alone only guarantees no overselling, not who wins."
