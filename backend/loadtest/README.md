# EventRush Load Test

Validates the two claims your resume makes:
1. **Correctness under contention** — hundreds of users racing for 1 seat, exactly 1 succeeds
2. **Throughput** — how many bookings/sec the system handles under bulk concurrent load

## Setup (one time)

1. Install JMeter 5.6+: download from https://jmeter.apache.org/download_jmeter.cgi,
   unzip it anywhere, and either add its `bin/` folder to your PATH or just
   run the `jmeter` command from inside that folder.
2. Start your backend — either:
   - Single instance: `mvn spring-boot:run` (from the `eventrush` folder), or
   - Distributed: `docker compose up --build` (recommended — this is what
     actually proves your "distributed system" resume line too)
3. Seed the load test data:
   ```
   mysql -u root -p -h 127.0.0.1 -P 3307 eventrush < seed_load_test_data.sql
   ```
   This wipes your existing demo data and creates 5,001 seats + 5,000 users
   sized for a real load test. Your small 5-seat interview-demo dataset
   comes back if you wipe the DB and restart the app (DataSeeder reseeds
   automatically on an empty database).

## Run it

```
./run_load_test.sh
```

Takes 1-3 minutes depending on your machine. Opens two things when done:
- `report/index.html` — visual dashboard (throughput graph, latency percentiles, error breakdown)
- `results.jtl` — raw results, one line per request

## What the two thread groups prove

**Thread Group A — Race Condition (300 users vs 1 seat)**
All 300 virtual users hit the SAME seat within about 1 second of each
other. Check the dashboard or run:
```
grep "race" results.jtl | grep -c ',201,'
```
This should print **exactly 1**. If it prints 0, something's wrong with
your seed data or backend connection. If it prints more than 1, your
locking is broken — worth knowing before an interview, not during one.

**Thread Group B — Throughput (100 threads, 5,000 unique bookings)**
Every virtual user here books a DIFFERENT seat, so there's no lock
contention — this isolates the system's raw processing speed. The
dashboard's "Throughput" column (in `report/index.html`, under the
"APDEX" or "Statistics" table) gives you requests/sec. That's your real
number for the resume.

## Turning results into an honest resume line

Once you have real numbers, replace the vague claim with a specific one.
Examples of what a real run might produce (**replace with YOUR actual
numbers, don't copy these**):

> "...validated correctness and throughput using JMeter, confirming zero
> overselling across 300 concurrent requests for a single seat, and
> sustained ~140 bookings/sec with p95 latency under 220ms across 5,000
> concurrent unique bookings."

Specific numbers are more credible than "thousands of concurrent users" —
an interviewer who asks "what numbers did you get?" is far more impressed
by a precise answer than a round one.

## If something looks wrong

- **All requests failing with connection refused** → backend isn't running,
  or it's running on a different port than 8080.
- **Everything returns 404** → `seed_load_test_data.sql` wasn't run, so
  seatId=1/eventId=1 don't exist yet.
- **Thread Group A shows 0 successes** → check that seat id 1 specifically
  is AVAILABLE (`SELECT status FROM seats WHERE id = 1;`) — if you've
  already run the test once, seat 1 is now BOOKED and needs the seed
  script re-run before testing again.
