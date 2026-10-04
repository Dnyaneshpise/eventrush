export default function DevSeatGrid({ seats, selectedSeatId, onSelect }) {
  return (
    <div className="dev-seat-grid">
      {seats.map((seat) => {
        const isBooked = seat.status === 'BOOKED'
        const isSelected = seat.id === selectedSeatId
        const cls = [
          'dev-seat',
          isBooked ? 'dev-seat--booked' : 'dev-seat--available',
          isSelected ? 'dev-seat--selected' : '',
        ].join(' ')

        return (
          <button
            key={seat.id}
            className={cls}
            disabled={isBooked}
            onClick={() => onSelect(seat.id)}
            aria-label={`Seat ${seat.seatNumber}, ${seat.status.toLowerCase()}`}
          >
            {seat.seatNumber}
          </button>
        )
      })}
    </div>
  )
}
