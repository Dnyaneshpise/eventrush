// ============================================================
// API LAYER
// Talks to the real Spring Boot backend at API_BASE. If it's
// unreachable (backend/DB/Redis not running), automatically
// falls back to an in-memory mock that reproduces the same
// idempotency + atomic-locking behavior in JavaScript, so the
// UI is always demoable - e.g. mid-interview, without needing
// to spin up MySQL + Redis first.
// ============================================================

// In dev (npm run dev), Vite's proxy (see vite.config.js) forwards
// /api/* to the backend on localhost:8080. In Docker, this container's
// own nginx does the same forwarding to the backend service. Either
// way, the browser only ever talks to ONE origin - no CORS needed.
// GET requests (listing events/seats) are simple, fast queries - 1.5s
// is plenty and also doubles as our "is the backend even there" probe.
const API_BASE = '/api'
const FETCH_TIMEOUT_MS = 1500

// Backend itself gives up waiting on the queue after 20s (see
// BookingController). We wait slightly longer than that here, so if
// something really does hang, the BACKEND's specific timeout message
// reaches us before our own generic network abort does.
const BOOKING_TIMEOUT_MS = 22000

async function fetchWithTimeout(url, options = {}, timeoutMs = FETCH_TIMEOUT_MS) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const res = await fetch(url, { ...options, signal: controller.signal })
    return res
  } finally {
    clearTimeout(timeout)
  }
}

// ---------- MOCK BACKEND ----------
// Mirrors BookingService's exact logic: idempotency check first,
// then an atomic "lock -> check -> write" step. The mutex chain
// below is what makes the check-then-write atomic in JS, the same
// job the DB's SELECT...FOR UPDATE does in the real backend.

// Several events so the discovery grid is populated even with no backend
// running. Each carries its own seat layout, exactly like the real API
// (where seats belong to one event). Seat ids stay unique across events
// via one running counter while building.
const MOCK_EVENTS = [
  { id: 1, name: 'Coldplay — Music of the Spheres World Tour', venueName: 'Jio Garden, Bengaluru', category: 'Music', daysAhead: 6, hour: 20, rows: ['A', 'B', 'C'], perRow: 10, preBooked: ['A3', 'A4', 'B1', 'B7', 'B8', 'C2', 'C9', 'C10'] },
  { id: 2, name: 'Arijit Singh Live in Concert', venueName: 'DY Patil Stadium, Mumbai', category: 'Music', daysAhead: 12, hour: 19, rows: ['A', 'B', 'C', 'D'], perRow: 12 },
  { id: 3, name: 'The Comedy Show — Stand-up Night', venueName: 'Kalinga Auditorium, Bengaluru', category: 'Comedy', daysAhead: 3, hour: 21, rows: ['A', 'B'], perRow: 8 },
  { id: 4, name: 'IPL 2026 · RCB vs CSK', venueName: 'M. Chinnaswamy Stadium, Bengaluru', category: 'Sports', daysAhead: 9, hour: 19, rows: ['A', 'B', 'C', 'D', 'E'], perRow: 10 },
  { id: 5, name: 'Sunburn Arena — EDM Night', venueName: 'Palace Grounds, Bengaluru', category: 'Music', daysAhead: 20, hour: 18, rows: ['A', 'B', 'C'], perRow: 12 },
  { id: 6, name: 'Diljit Dosanjh — Dil-Luminati Tour', venueName: 'Gachibowli Arena, Hyderabad', category: 'Music', daysAhead: 15, hour: 20, rows: ['A', 'B', 'C', 'D'], perRow: 10 },
]

function mockBookingOpensAt(ev) {
  const d = new Date(Date.now() + ev.daysAhead * 24 * 60 * 60 * 1000)
  d.setHours(ev.hour, 0, 0, 0)
  return d.toISOString()
}

// Books roughly a quarter of seats deterministically, so a fresh demo
// venue reads like a partially-sold show rather than a pristine grid.
function isPreBooked(seatNumber, rowIndex) {
  const num = parseInt(seatNumber.replace(/^\D+/, ''), 10)
  return (num + rowIndex * 3) % 4 === 0
}

let mockSeatId = 1

function buildSeatsForEvent(ev) {
  const seats = []
  ev.rows.forEach((row, rowIndex) => {
    for (let i = 1; i <= ev.perRow; i++) {
      const seatNumber = `${row}${i}`
      const preBooked = ev.preBooked ? ev.preBooked.includes(seatNumber) : isPreBooked(seatNumber, rowIndex)
      seats.push({ id: mockSeatId++, seatNumber, status: preBooked ? 'BOOKED' : 'AVAILABLE' })
    }
  })
  return seats
}

const mockState = {
  events: [],
  seatsByEvent: {},
  bookings: new Map(), // idempotencyKey -> booking response
  rateLimits: new Map(), // userId -> { tokens, lastRefill }
  seatMutex: Promise.resolve(), // serializes booking attempts, like the DB row lock
}

function resetMockState() {
  mockSeatId = 1
  mockState.events = MOCK_EVENTS.map((ev) => ({
    id: ev.id,
    name: ev.name,
    totalSeats: ev.rows.length * ev.perRow,
    bookingOpensAt: mockBookingOpensAt(ev),
    venueId: ev.id,
    venueName: ev.venueName,
    category: ev.category,
  }))
  mockState.seatsByEvent = {}
  for (const ev of MOCK_EVENTS) {
    mockState.seatsByEvent[ev.id] = buildSeatsForEvent(ev)
  }
  mockState.bookings.clear()
  mockState.rateLimits.clear()
}

resetMockState()

function mockRateLimitCheck(userId) {
  const MAX = 5
  const REFILL_MS = 2000
  const now = Date.now()
  let bucket = mockState.rateLimits.get(userId)
  if (!bucket) {
    bucket = { tokens: MAX, lastRefill: now }
  }
  const elapsed = now - bucket.lastRefill
  const toAdd = Math.floor(elapsed / REFILL_MS)
  if (toAdd > 0) {
    bucket.tokens = Math.min(MAX, bucket.tokens + toAdd)
    bucket.lastRefill = now
  }
  let allowed = false
  if (bucket.tokens > 0) {
    bucket.tokens -= 1
    allowed = true
  }
  mockState.rateLimits.set(userId, bucket)
  return allowed
}

function mockBookSeat({ userId, seatId, eventId, idempotencyKey }) {
  // Queue this attempt behind any currently-running attempt -
  // simulates the pessimistic lock: only one "critical section"
  // runs at a time, no matter how many calls arrive together.
  const run = async () => {
    await new Promise((r) => setTimeout(r, 60 + Math.random() * 120)) // simulate network + DB latency

    if (mockState.bookings.has(idempotencyKey)) {
      return { ...mockState.bookings.get(idempotencyKey), replayed: true, httpStatus: 200 }
    }

    if (!mockRateLimitCheck(userId)) {
      const err = new Error('Too many booking attempts. Please wait a moment and try again.')
      err.httpStatus = 429
      err.code = 'RATE_LIMIT_EXCEEDED'
      throw err
    }

    const seat = (mockState.seatsByEvent[eventId] || []).find((s) => s.id === seatId)
    if (!seat) {
      const err = new Error(`Seat not found: ${seatId}`)
      err.httpStatus = 404
      err.code = 'NOT_FOUND'
      throw err
    }
    if (seat.status !== 'AVAILABLE') {
      const err = new Error(`Seat ${seat.seatNumber} is already booked`)
      err.httpStatus = 409
      err.code = 'SEAT_NOT_AVAILABLE'
      throw err
    }

    seat.status = 'BOOKED'
    const booking = {
      bookingId: mockState.bookings.size + 1,
      userId,
      seatId,
      eventId,
      status: 'CONFIRMED',
      idempotencyKey,
      createdAt: new Date().toISOString(),
      replayed: false,
      httpStatus: 201,
      seatNumber: seat.seatNumber,
    }
    mockState.bookings.set(idempotencyKey, booking)
    return booking
  }

  // Chain onto the shared mutex so attempts are serialized
  const resultPromise = mockState.seatMutex.then(run, run)
  // Keep the chain alive regardless of success/failure of this attempt
  mockState.seatMutex = resultPromise.catch(() => {})
  return resultPromise
}

// ---------- PUBLIC API ----------

export async function getEvent(eventId) {
  try {
    const res = await fetchWithTimeout(`${API_BASE}/events`)
    if (!res.ok) throw new Error('backend not ok')
    const events = await res.json()
    if (events.length === 0) throw new Error('no events')
    const picked = eventId ? events.find((e) => e.id === eventId) : events[events.length - 1]
    return { data: picked || events[events.length - 1], all: events, mode: 'live' }
  } catch {
    const picked = eventId
      ? mockState.events.find((e) => e.id === eventId)
      : mockState.events[mockState.events.length - 1]
    return {
      data: picked || mockState.events[mockState.events.length - 1],
      all: mockState.events,
      mode: 'mock',
    }
  }
}

export async function getSeats(eventId) {
  try {
    const res = await fetchWithTimeout(`${API_BASE}/events/${eventId}/seats`)
    if (!res.ok) throw new Error('backend not ok')
    const seats = await res.json()
    return { data: seats, mode: 'live' }
  } catch {
    const fallbackEventId = mockState.events[0]?.id
    return { data: mockState.seatsByEvent[eventId] || mockState.seatsByEvent[fallbackEventId] || [], mode: 'mock' }
  }
}

export async function bookSeat({ userId, seatId, eventId, idempotencyKey }, mode) {
  if (mode === 'live') {
    let res
    try {
      res = await fetchWithTimeout(
        `${API_BASE}/bookings`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId, seatId, eventId, idempotencyKey }),
        },
        BOOKING_TIMEOUT_MS
      )
    } catch (networkErr) {
      // fetch throws (rather than resolving with a bad status) for
      // things like: request aborted/timed out, DNS/connection
      // refused, or the proxy having no upstream to reach. None of
      // these have an HTTP status - that's exactly what makes them
      // land in a generic bucket if we don't label them here.
      const err = new Error(
        networkErr.name === 'AbortError'
          ? 'Request timed out waiting for the server. It may still be starting up - try again in a few seconds.'
          : 'Could not reach the server. Check that the backend is running.'
      )
      err.httpStatus = 0
      err.code = networkErr.name === 'AbortError' ? 'TIMEOUT' : 'NETWORK_ERROR'
      console.error('[bookSeat] network failure:', networkErr)
      throw err
    }

    const body = await res.json().catch(() => ({}))
    if (!res.ok) {
      const err = new Error(body.message || `Request failed with status ${res.status}`)
      err.httpStatus = res.status
      err.code = body.error || 'UNKNOWN'
      throw err
    }
    return { ...body, httpStatus: res.status }
  }
  return mockBookSeat({ userId, seatId, eventId, idempotencyKey })
}

export function resetDemoData(mode) {
  if (mode === 'mock') resetMockState()
}

// ---------- ORGANIZER: VENUES & EVENTS ----------
// No mock fallback here on purpose - creating events/venues is an
// organizer flow, not something that needs to demo without a backend.

export async function listVenues() {
  const res = await fetchWithTimeout(`${API_BASE}/venues`, {}, 5000)
  if (!res.ok) throw new Error('Could not load venues.')
  return res.json()
}

export async function createVenue({ name, address, rowLabels, seatsPerRow }) {
  const res = await fetchWithTimeout(
    `${API_BASE}/venues`,
    { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, address, rowLabels, seatsPerRow }) },
    8000
  )
  const body = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(body.message || 'Could not create venue.')
  return body
}

export async function createEvent({ name, venueId, bookingOpensAt }) {
  const res = await fetchWithTimeout(
    `${API_BASE}/events`,
    { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, venueId, bookingOpensAt }) },
    10000
  )
  const body = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(body.message || 'Could not create event.')
  return body
}

export function genIdempotencyKey() {
  return (crypto.randomUUID && crypto.randomUUID()) || `key-${Date.now()}-${Math.random()}`
}
