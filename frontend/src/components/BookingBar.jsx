const MOCK_PRICE = 2499

export default function BookingBar({ selectedSeat, onBook, isBooking }) {
  return (
    <div className={`booking-bar ${selectedSeat ? 'visible' : ''}`}>
      <div className="booking-bar-inner">
        <div className="booking-bar-info">
          <div className="booking-bar-seat">{selectedSeat?.seatNumber}</div>
          <div className="booking-bar-price">
            1 seat · <strong>₹{MOCK_PRICE.toLocaleString('en-IN')}</strong>
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
