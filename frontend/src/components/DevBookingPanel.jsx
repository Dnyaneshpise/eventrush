const USERS = Array.from({ length: 20 }, (_, i) => ({ id: i + 1, label: `Test User ${i + 1}` }))

export default function DevBookingPanel({
  userId,
  onUserChange,
  selectedSeat,
  onBook,
  onRetry,
  canRetry,
  isBooking,
}) {
  return (
    <div>
      <label className="field-label" htmlFor="dev-user-select">
        Booking as
      </label>
      <select
        id="dev-user-select"
        className="dev-select"
        value={userId}
        onChange={(e) => onUserChange(Number(e.target.value))}
      >
        {USERS.map((u) => (
          <option key={u.id} value={u.id}>
            {u.label} (id: {u.id})
          </option>
        ))}
      </select>

      <button className="dev-btn dev-btn-primary" disabled={!selectedSeat || isBooking} onClick={onBook}>
        {selectedSeat ? `Book seat ${selectedSeat.seatNumber}` : 'Select a seat to book'}
      </button>

      <button className="dev-btn dev-btn-secondary" disabled={!canRetry || isBooking} onClick={onRetry}>
        Retry last request (same idempotency key)
      </button>
    </div>
  )
}
