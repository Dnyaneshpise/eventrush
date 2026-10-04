import { useState, useEffect, useRef, useCallback } from 'react'
import Navbar from './components/Navbar.jsx'
import EventHero from './components/EventHero.jsx'
import AuditoriumSeatMap from './components/AuditoriumSeatMap.jsx'
import BookingBar from './components/BookingBar.jsx'
import ToastStack from './components/ToastStack.jsx'
import DevSeatGrid from './components/DevSeatGrid.jsx'
import DevBookingPanel from './components/DevBookingPanel.jsx'
import DevStressTest from './components/DevStressTest.jsx'
import ConsoleLog from './components/ConsoleLog.jsx'
import CreateEventFlow from './components/CreateEventFlow.jsx'
import { getEvent, getSeats, bookSeat, resetDemoData, genIdempotencyKey } from './api.js'

function timeNow() {
  return new Date().toLocaleTimeString('en-US', { hour12: false })
}

let toastIdSeq = 0

export default function App() {
  const [view, setView] = useState('audience')
  const [mode, setMode] = useState('mock')
  const [event, setEvent] = useState(null)
  const [allEvents, setAllEvents] = useState([])
  const [seats, setSeats] = useState([])
  const [selectedSeatId, setSelectedSeatId] = useState(null)
  const [userId, setUserId] = useState(1)
  const [logs, setLogs] = useState([])
  const [isBooking, setIsBooking] = useState(false)
  const [lastRequest, setLastRequest] = useState(null)
  const [isRushing, setIsRushing] = useState(false)
  const [rushSummary, setRushSummary] = useState(null)
  const [toasts, setToasts] = useState([])
  const [showCreateEvent, setShowCreateEvent] = useState(false)

  const logIdRef = useRef(0)
  const consoleEndRef = useRef(null)
  const isBookingRef = useRef(false)

  useEffect(() => {
    isBookingRef.current = isBooking
  }, [isBooking])

  const pushToast = useCallback((type, message) => {
    toastIdSeq += 1
    const id = toastIdSeq
    setToasts((prev) => [...prev, { id, type, message }])
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, 3800)
  }, [])

  const pushLog = useCallback((type, message, httpStatus) => {
    logIdRef.current += 1
    setLogs((prev) => [
      ...prev,
      { id: logIdRef.current, type, message, httpStatus, time: timeNow() },
    ])
  }, [])

  useEffect(() => {
    consoleEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [logs])

  const loadData = useCallback(async (eventId) => {
    const eventRes = await getEvent(eventId)
    setMode(eventRes.mode)
    setEvent(eventRes.data)
    setAllEvents(eventRes.all || [])

    const seatsRes = await getSeats(eventRes.data.id)
    setSeats(seatsRes.data)

    pushLog('info', `Loaded event "${eventRes.data.name}" — mode: ${eventRes.mode.toUpperCase()}`)
  }, [pushLog])

  useEffect(() => {
    loadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Poll for seat status changes every few seconds while on the
  // booking screen. This is what makes "two people looking at the
  // same seat map" actually visible: open this app in two tabs,
  // book a seat in one, and watch it turn gray in the other within
  // a few seconds - without anyone refreshing manually. A real
  // production app would use websockets/SSE for instant updates;
  // polling is the simple version of the same idea.
  useEffect(() => {
    if (view !== 'audience' || !event) return

    const interval = setInterval(async () => {
      const seatsRes = await getSeats(event.id)
      setSeats((prevSeats) => {
        const next = seatsRes.data

        // Skip the "someone else took it" check entirely while OUR
        // OWN booking request is still in flight. Without this guard,
        // a poll landing between "server committed my booking" and
        // "my own request finished resolving" would see my selected
        // seat turn BOOKED and wrongly conclude a stranger took it -
        // when it was actually just my own request, still in transit.
        if (selectedSeatId && !isBookingRef.current) {
          const mine = next.find((s) => s.id === selectedSeatId)
          const wasAvailable = prevSeats.find((s) => s.id === selectedSeatId)?.status === 'AVAILABLE'
          if (mine?.status === 'BOOKED' && wasAvailable) {
            setSelectedSeatId(null)
            pushToast('info', `Seat ${mine.seatNumber} was just booked by someone else.`)
          }
        }
        return next
      })
    }, 4000)

    return () => clearInterval(interval)
  }, [view, event, selectedSeatId, pushToast])

  const selectedSeat = seats.find((s) => s.id === selectedSeatId) || null
  const availableCount = seats.filter((s) => s.status === 'AVAILABLE').length

  async function attemptBooking({ seatId, forcedUserId, idempotencyKey, silent } = {}) {
    const uid = forcedUserId ?? userId
    const sId = seatId ?? selectedSeatId
    const key = idempotencyKey ?? genIdempotencyKey()
    const seat = seats.find((s) => s.id === sId)

    if (!silent) {
      pushLog('info', `POST /api/bookings userId=${uid} seatId=${sId} key=${key.slice(0, 8)}…`)
    }

    try {
      const result = await bookSeat({ userId: uid, seatId: sId, eventId: event.id, idempotencyKey: key }, mode)

      if (result.replayed) {
        pushLog('warn', `Idempotency hit — same key already processed. Returning original result, no new booking.`, result.httpStatus)
      } else {
        pushLog('success', `Seat ${seat?.seatNumber || sId} confirmed for user ${uid}.`, result.httpStatus)
      }

      setSeats((prev) => prev.map((s) => (s.id === sId ? { ...s, status: 'BOOKED' } : s)))
      setLastRequest({ userId: uid, seatId: sId, idempotencyKey: key })
      return { ok: true, result }
    } catch (err) {
      const status = err.httpStatus || 500
      const label = status === 409 ? 'error' : status === 429 ? 'warn' : 'error'
      pushLog(label, `user ${uid} → ${err.message}`, status)
      return { ok: false, error: err }
    }
  }

  async function handleBook() {
    if (!selectedSeatId) return
    setIsBooking(true)
    const outcome = await attemptBooking({})
    if (outcome.ok) {
      pushToast('success', `You're going! Seat ${selectedSeat?.seatNumber} is confirmed.`)
      setSelectedSeatId(null)
    } else {
      const status = outcome.error?.httpStatus
      const message =
        status === 409
          ? `Someone just grabbed that seat. Pick another one.`
          : status === 429
          ? `Too many tries — wait a moment and try again.`
          : outcome.error?.message || `Something went wrong. Please try again.`
      pushToast(status === 429 ? 'info' : 'error', message)
      if (status === 409) setSelectedSeatId(null) // seat's genuinely gone, don't leave it "selected"
    }
    setIsBooking(false)
  }

  async function handleRetry() {
    if (!lastRequest) return
    setIsBooking(true)
    pushLog('info', `Retrying identical request (same idempotency key) — simulating a client network retry…`)
    await attemptBooking({
      seatId: lastRequest.seatId,
      forcedUserId: lastRequest.userId,
      idempotencyKey: lastRequest.idempotencyKey,
    })
    setIsBooking(false)
  }

  async function handleRush() {
    const targetSeat = seats.find((s) => s.status === 'AVAILABLE')
    if (!targetSeat) return

    setIsRushing(true)
    setRushSummary(null)
    pushLog('warn', `⚡ 15 users clicking "Buy" on seat ${targetSeat.seatNumber} at the same instant…`)

    const rushUserIds = Array.from({ length: 15 }, (_, i) => ((i + userId) % 20) + 1)

    const results = await Promise.allSettled(
      rushUserIds.map((uid) =>
        attemptBooking({
          seatId: targetSeat.id,
          forcedUserId: uid,
          idempotencyKey: genIdempotencyKey(),
          silent: true,
        })
      )
    )

    const summary = { success: 0, conflict: 0, rateLimited: 0 }
    results.forEach((r) => {
      if (r.value?.ok) summary.success += 1
      else if (r.value?.error?.httpStatus === 429) summary.rateLimited += 1
      else summary.conflict += 1
    })

    pushLog(
      'info',
      `Rush complete: ${summary.success} booked, ${summary.conflict} rejected (seat conflict), ${summary.rateLimited} rate-limited. Exactly ${summary.success} seat was sold — no overselling.`
    )

    setRushSummary(summary)
    setIsRushing(false)
  }

  function handleReset() {
    resetDemoData(mode)
    setSelectedSeatId(null)
    setRushSummary(null)
    setLastRequest(null)
    loadData()
    pushLog('info', 'Demo data reset.')
  }

  function handleSwitchEvent(eventId) {
    setSelectedSeatId(null)
    setLastRequest(null)
    setRushSummary(null)
    loadData(eventId)
  }

  return (
    <div className="app-shell">
      <Navbar
        mode={mode}
        view={view}
        onViewChange={setView}
        onCreateEvent={() => setShowCreateEvent(true)}
        events={allEvents}
        selectedEventId={event?.id}
        onSwitchEvent={handleSwitchEvent}
      />
      <ToastStack toasts={toasts} />

      {showCreateEvent && (
        <CreateEventFlow
          onClose={() => setShowCreateEvent(false)}
          pushToast={pushToast}
          onCreated={(newEvent) => {
            setShowCreateEvent(false)
            loadData(newEvent.id)
          }}
        />
      )}

      {view === 'audience' ? (
        <>
          <EventHero event={event} availableCount={availableCount} totalSeats={event?.totalSeats || seats.length} />
          <div className="container">
            <div className="section">
              <h2 className="section-title">Select your seat</h2>
              <p className="section-subtitle">Tap an available seat below to select it.</p>
              <div className="card">
                <AuditoriumSeatMap seats={seats} selectedSeatId={selectedSeatId} onSelect={setSelectedSeatId} />
              </div>
            </div>
          </div>
          <BookingBar selectedSeat={selectedSeat} onBook={handleBook} isBooking={isBooking} />
        </>
      ) : (
        <div className="dev-shell">
          <div className="container">
            <div className="dev-grid">
              <div className="dev-panel">
                <h2 className="dev-panel-title">Seat Map</h2>
                <DevSeatGrid seats={seats} selectedSeatId={selectedSeatId} onSelect={setSelectedSeatId} />

                <DevBookingPanel
                  userId={userId}
                  onUserChange={setUserId}
                  selectedSeat={selectedSeat}
                  onBook={handleBook}
                  onRetry={handleRetry}
                  canRetry={!!lastRequest}
                  isBooking={isBooking}
                />

                <DevStressTest
                  onRun={handleRush}
                  isRunning={isRushing}
                  summary={rushSummary}
                  disabled={availableCount === 0}
                />

                <div style={{ marginTop: 16 }}>
                  <button className="dev-btn dev-btn-secondary" onClick={handleReset}>
                    Reset demo data
                  </button>
                </div>
              </div>

              <div className="dev-panel">
                <h2 className="dev-panel-title">Systems Console</h2>
                <ConsoleLog entries={logs} bottomRef={consoleEndRef} />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
