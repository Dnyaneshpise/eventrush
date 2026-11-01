export default function BookingBar({ selectedSeat, onBook, isBooking, price = 2499, quantity = 1 }) {
  return (
    <div className={`booking-bar ${selectedSeat ? 'visible' : ''}`}>
      <div className="booking-bar-inner">
        <div className="booking-bar-info">
          <div className="booking-bar-seat">{selectedSeat?.seatNumber}</div>
          <div className="booking-bar-price">
            {quantity} seat{quantity > 1 ? 's' : ''} · <strong>₹{(price * quantity).toLocaleString('en-IN')}</strong>
          </div>
        </div>
        <div className="booking-bar-actions">
          <button className="btn btn-primary" onClick={onBook} disabled={isBooking}>
            {isBooking ? 'Confirming…' : 'Confirm booking'}
          </button>
        </div>
      </div>
    </div>
  )
}
