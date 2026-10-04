# EventRush Platform

A high-concurrency ticket booking system, built to demonstrate the exact
problems large-scale systems (Amazon, Ticketmaster, BookMyShow) solve
during a flash sale: race conditions, idempotent retries, fairness under
load, rate limiting, and distributed deployment.

```
eventrush-platform/
  backend/    Spring Boot API (Java, MySQL, Redis)
  frontend/   React UI (audience booking view + developer console)
  docker-compose.yml   starts the whole system with one command
  nginx.conf            backend load balancer config
```

## Quick start (the whole system, one command)

Requires Docker Desktop.

```
cd eventrush-platform
docker compose up --build
```

This starts MySQL, Redis, 2 backend instances behind a load balancer, and
the React frontend — 6 containers, fully networked together.

- **App:** http://localhost:3000
- **API directly** (for curl/Postman/JMeter): http://localhost:8080

First boot takes a little longer than usual (cold JVM, connection pools
warming up) — see "Known limitations" in `backend/README.md` if a request
times out on the very first try.

## What to read next

- `backend/README.md` — architecture, concept-by-concept breakdown, how to
  run the JMeter load test, interview talking points
- `frontend/README.md` — design notes, the three ways to run the frontend,
  what each UI interaction demonstrates
- `backend/loadtest/README.md` — load testing setup and how to turn results
  into honest resume numbers

## The two audiences this UI serves

Toggle in the navbar:
- **Book Tickets** — what an actual user sees: a real multi-row auditorium
  seat map (30 seats, 3 rows), live polling (open two browser tabs and book
  the same seat in both — watch the second one get rejected in real time),
  sticky booking bar, toast notifications.
- **Developer** — what you demo in an interview: raw seat grid, a live
  systems console showing HTTP status codes and lock/idempotency decisions,
  and the "Simulate 6AM Rush" button that fires 15 concurrent requests at
  one seat and proves exactly 1 succeeds.
