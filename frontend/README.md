# EventRush — Frontend

A React (Vite) interface for the EventRush booking engine, built to serve
two different audiences from one codebase: people booking tickets, and you
demoing the backend's concurrency engineering to an interviewer.

## Design concept

Ticket flash-sale energy (ink-black poster background, flare-red urgency
accent, marquee-yellow CTAs) paired with a live "systems console" that
mirrors exactly what's happening on the backend. Two views, one toggle:

- **🎟 Book Tickets** — a real auditorium: curved seat row, warm stage
  lighting, plain-English booking outcomes. Built for an actual user.
- **⚙ Developer Console** — seat grid + live HTTP/lock/idempotency log +
  the **"Simulate 6AM Rush"** button, which fires 15 concurrent booking
  requests at the last seat and streams the results live, visually proving
  the race condition is handled. Built for your interview demo.

## Three ways to run this, same code every time

### 1. Standalone dev (fastest iteration)
```
npm install
npm run dev
```
Opens on `http://localhost:5173`. Vite's dev proxy (see `vite.config.js`)
forwards `/api/*` to `http://localhost:8080`, so this works whether your
backend is running standalone (`mvn spring-boot:run`) or via Docker.

### 2. Dockerized, standalone
```
docker build -t eventrush-frontend .
docker run -p 3000:80 eventrush-frontend
```
Serves the built app via nginx at `http://localhost:3000`. Its nginx
config (`nginx.frontend.conf`) proxies `/api/*` to a service named
`nginx` — which only exists once this container is composed together
with the backend (see option 3). Run standalone like this and API calls
will fail to resolve — that's expected; the app falls back to mock mode
automatically in that case.

### 3. Composed with the backend (the real, full system)
From the **backend's** folder (`eventrush/`), with this frontend unzipped
as a sibling folder:
```
docker compose up --build
```
This one command starts MySQL, Redis, 2 backend instances, the backend's
load balancer, AND this frontend — all networked together. Open
`http://localhost:3000`. See the backend's README for details.

## Why relative `/api` instead of a hardcoded URL

`src/api.js` calls a relative path (`/api/events`, not
`http://localhost:8080/api/events`). This is what makes the SAME frontend
code work unchanged across all three run modes above — in dev, Vite's
proxy resolves it; in Docker, nginx's proxy resolves it. The frontend code
never needs to know or care where the backend actually is. This is the
same reverse-proxy pattern real production frontends use, and it's also
why CORS isn't needed anymore — the browser only ever talks to one origin.

## Two modes, automatic (independent of the above)

- **Live mode**: backend reachable → green "API CONNECTED" pill, real data.
- **Mock mode**: backend unreachable → yellow "MOCK MODE" pill, in-memory
  JS simulation of the same idempotency/locking logic (`src/api.js`), so
  the UI is always demoable even with nothing else running.

## What each interaction demonstrates

| UI action | Concept |
|---|---|
| Click a seat, then "Book" (Audience view) | Basic booking flow |
| "Retry last request" (Developer view) | Idempotency — same key, no duplicate booking |
| "Simulate 6AM Rush" (Developer view) | Race condition handling — 15 concurrent requests, exactly 1 wins |
| Rapidly click "Book" many times | Rate limiting — later clicks return 429 |
| Systems Console panel (Developer view) | Live mirror of backend decisions, with real HTTP status codes |
