import { useState, useEffect } from 'react'
import { listVenues, createVenue, createEvent } from '../api.js'

const ROW_PRESETS = [
  { label: 'Intimate (3 rows x 8)', rows: ['A', 'B', 'C'], perRow: 8 },
  { label: 'Standard (5 rows x 10)', rows: ['A', 'B', 'C', 'D', 'E'], perRow: 10 },
  { label: 'Large (8 rows x 12)', rows: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'], perRow: 12 },
]

const STEPS = ['Venue', 'Details', 'Review']

export default function CreateEventFlow({ onClose, onCreated, pushToast }) {
  const [step, setStep] = useState(0)
  const [venues, setVenues] = useState([])
  const [loadingVenues, setLoadingVenues] = useState(true)

  const [venueMode, setVenueMode] = useState('existing') // 'existing' | 'new'
  const [selectedVenueId, setSelectedVenueId] = useState(null)

  const [newVenueName, setNewVenueName] = useState('')
  const [newVenueAddress, setNewVenueAddress] = useState('')
  const [presetIndex, setPresetIndex] = useState(1)

  const [eventName, setEventName] = useState('')
  const [bookingOpensAt, setBookingOpensAt] = useState(() => {
    const d = new Date(Date.now() + 60 * 60 * 1000)
    return d.toISOString().slice(0, 16)
  })

  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    listVenues().then((v) => {
      setVenues(v)
      setLoadingVenues(false)
      if (v.length === 0) setVenueMode('new')
      else setSelectedVenueId(v[0].id)
    })
  }, [])

  const preset = ROW_PRESETS[presetIndex]
  const newVenueSeatCount = preset.rows.length * preset.perRow
  const selectedVenue = venues.find((v) => v.id === selectedVenueId)

  const canGoToDetails = venueMode === 'existing' ? !!selectedVenueId : newVenueName.trim().length > 0
  const canGoToReview = eventName.trim().length > 0 && !!bookingOpensAt

  async function handleSubmit() {
    setSubmitting(true)
    try {
      let venueId = selectedVenueId
      let venueLabel = selectedVenue?.name
      let seatCount = selectedVenue?.totalSeats

      if (venueMode === 'new') {
        const venue = await createVenue({
          name: newVenueName,
          address: newVenueAddress,
          rowLabels: preset.rows,
          seatsPerRow: preset.perRow,
        })
        venueId = venue.id
        venueLabel = venue.name
        seatCount = venue.totalSeats
      }

      const event = await createEvent({
        name: eventName,
        venueId,
        bookingOpensAt: new Date(bookingOpensAt).toISOString(),
      })

      pushToast('success', `"${event.name}" is live at ${venueLabel} — ${seatCount} seats ready to book.`)
      onCreated(event)
    } catch (err) {
      pushToast('error', err.message || 'Could not create the event. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="ce-overlay" onClick={onClose}>
      <div className="ce-modal" onClick={(e) => e.stopPropagation()}>
        <div className="ce-modal-header">
          <div>
            <div className="ce-eyebrow">Organizer Studio</div>
            <h2 className="ce-title">Create a new event</h2>
          </div>
          <button className="ce-close" onClick={onClose} aria-label="Close">✕</button>
        </div>

        <div className="ce-steps">
          {STEPS.map((label, i) => (
            <div key={label} className={`ce-step ${i === step ? 'active' : ''} ${i < step ? 'done' : ''}`}>
              <div className="ce-step-dot">{i < step ? '✓' : i + 1}</div>
              <span>{label}</span>
              {i < STEPS.length - 1 && <div className="ce-step-line" />}
            </div>
          ))}
        </div>

        <div className="ce-body">
          {step === 0 && (
            <div className="ce-fade">
              <div className="ce-toggle">
                <button
                  className={`ce-toggle-btn ${venueMode === 'existing' ? 'active' : ''}`}
                  onClick={() => setVenueMode('existing')}
                  disabled={venues.length === 0}
                >
                  Use an existing venue
                </button>
                <button
                  className={`ce-toggle-btn ${venueMode === 'new' ? 'active' : ''}`}
                  onClick={() => setVenueMode('new')}
                >
                  Create a new venue
                </button>
              </div>

              {venueMode === 'existing' ? (
                loadingVenues ? (
                  <div className="ce-empty">Loading your venues…</div>
                ) : venues.length === 0 ? (
                  <div className="ce-empty">No venues yet — create one to get started.</div>
                ) : (
                  <div className="ce-venue-grid">
                    {venues.map((v) => (
                      <button
                        key={v.id}
                        className={`ce-venue-card ${selectedVenueId === v.id ? 'selected' : ''}`}
                        onClick={() => setSelectedVenueId(v.id)}
                      >
                        <div className="ce-venue-icon">◧</div>
                        <div className="ce-venue-name">{v.name}</div>
                        <div className="ce-venue-meta">{v.address || 'No address set'}</div>
                        <div className="ce-venue-seats">{v.totalSeats} seats</div>
                      </button>
                    ))}
                  </div>
                )
              ) : (
                <div className="ce-form-grid">
                  <label className="ce-field">
                    <span className="ce-field-label">Venue name</span>
                    <input
                      className="ce-input"
                      placeholder="e.g. Palace Grounds, Bengaluru"
                      value={newVenueName}
                      onChange={(e) => setNewVenueName(e.target.value)}
                    />
                  </label>
                  <label className="ce-field">
                    <span className="ce-field-label">Address (optional)</span>
                    <input
                      className="ce-input"
                      placeholder="e.g. Jayamahal, Bengaluru"
                      value={newVenueAddress}
                      onChange={(e) => setNewVenueAddress(e.target.value)}
                    />
                  </label>

                  <div className="ce-field" style={{ gridColumn: '1 / -1' }}>
                    <span className="ce-field-label">Seat layout</span>
                    <div className="ce-preset-row">
                      {ROW_PRESETS.map((p, i) => (
                        <button
                          key={p.label}
                          className={`ce-preset-btn ${presetIndex === i ? 'active' : ''}`}
                          onClick={() => setPresetIndex(i)}
                        >
                          {p.label}
                        </button>
                      ))}
                    </div>
                    <SeatLayoutPreview rows={preset.rows} perRow={preset.perRow} />
                    <div className="ce-seat-total">{newVenueSeatCount} seats total</div>
                  </div>
                </div>
              )}
            </div>
          )}

          {step === 1 && (
            <div className="ce-fade ce-form-grid">
              <label className="ce-field" style={{ gridColumn: '1 / -1' }}>
                <span className="ce-field-label">Event name</span>
                <input
                  className="ce-input"
                  placeholder="e.g. Arijit Singh Live — Bengaluru"
                  value={eventName}
                  onChange={(e) => setEventName(e.target.value)}
                  autoFocus
                />
              </label>
              <label className="ce-field">
                <span className="ce-field-label">Booking opens</span>
                <input
                  type="datetime-local"
                  className="ce-input"
                  value={bookingOpensAt}
                  onChange={(e) => setBookingOpensAt(e.target.value)}
                />
              </label>
              <div className="ce-field">
                <span className="ce-field-label">Venue</span>
                <div className="ce-locked-venue">
                  {venueMode === 'existing' ? selectedVenue?.name : newVenueName}
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="ce-fade">
              <div className="ce-review-card">
                <div className="ce-review-row">
                  <span>Event</span>
                  <strong>{eventName}</strong>
                </div>
                <div className="ce-review-row">
                  <span>Venue</span>
                  <strong>{venueMode === 'existing' ? selectedVenue?.name : newVenueName}</strong>
                </div>
                <div className="ce-review-row">
                  <span>Seats</span>
                  <strong>{venueMode === 'existing' ? selectedVenue?.totalSeats : newVenueSeatCount}</strong>
                </div>
                <div className="ce-review-row">
                  <span>Booking opens</span>
                  <strong>{new Date(bookingOpensAt).toLocaleString()}</strong>
                </div>
              </div>
              <p className="ce-review-note">
                {venueMode === 'new'
                  ? 'A new venue will be created first, then the event and all its seats — in one step.'
                  : 'This venue\'s seat layout will be copied fresh for this event.'}
              </p>
            </div>
          )}
        </div>

        <div className="ce-footer">
          {step > 0 ? (
            <button className="btn btn-ghost" onClick={() => setStep(step - 1)} disabled={submitting}>
              Back
            </button>
          ) : <span />}

          {step < 2 ? (
            <button
              className="btn btn-primary"
              disabled={step === 0 ? !canGoToDetails : !canGoToReview}
              onClick={() => setStep(step + 1)}
            >
              Continue
            </button>
          ) : (
            <button className="btn btn-primary" onClick={handleSubmit} disabled={submitting}>
              {submitting ? 'Creating…' : 'Create event'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

function SeatLayoutPreview({ rows, perRow }) {
  return (
    <div className="ce-layout-preview">
      {rows.map((row) => (
        <div key={row} className="ce-layout-row">
          <span className="ce-layout-row-label">{row}</span>
          {Array.from({ length: perRow }).map((_, i) => (
            <div key={i} className="ce-layout-seat" />
          ))}
        </div>
      ))}
    </div>
  )
}
