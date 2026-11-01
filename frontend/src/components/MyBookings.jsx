import { formatEventDate } from '../eventMeta.js'

export default function MyBookings({ bookings, onBrowse }) {
  if (bookings.length === 0) {
    return (
      <div className="page">
        <div className="page-head">
          <h1 className="page-title">My Bookings</h1>
          <p className="page-sub">Everything you've booked with EventRush.</p>
        </div>
        <div className="empty-state">
          <div className="empty-state-icon">🎟️</div>
          <h3>No bookings yet</h3>
          <p>When you confirm a seat, your tickets show up here.</p>
          <button className="btn btn-primary" onClick={onBrowse}>
            Browse events
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="page">
      <div className="page-head">
        <h1 className="page-title">My Bookings</h1>
        <p className="page-sub">
          {bookings.length} confirmed {bookings.length === 1 ? 'ticket' : 'tickets'}
        </p>
      </div>

      <div className="ticket-list">
        {bookings.map((b) => (
          <div className="ticket" key={b.idempotencyKey}>
            <div className="ticket-stub">
              <span className="ticket-stub-label">SEAT</span>
              <span className="ticket-stub-seat">{b.seatNumber}</span>
            </div>
            <div className="ticket-main">
              <h3 className="ticket-event">{b.eventName || 'Event'}</h3>
              <div className="ticket-meta">
                <span>Booking #{b.bookingId}</span>
                <span>·</span>
                <span>Attendee: User {b.userId}</span>
              </div>
              <div className="ticket-meta">
                <span>Booked {formatEventDate(b.createdAt)}</span>
                <span>·</span>
                <span className="ticket-status">✓ Confirmed</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
