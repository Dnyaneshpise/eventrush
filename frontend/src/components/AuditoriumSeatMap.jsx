// Decorative row - purely visual, sits behind the real seating to
// suggest the venue continues further back than what's bookable here.
function DecorativeRow({ count, seed }) {
  return (
    <div className="row-seats">
      {Array.from({ length: count }).map((_, i) => {
        const taken = (i * 7 + seed) % 5 !== 0
        return <div key={i} className={`deco-seat ${taken ? 'taken' : ''}`} />
      })}
    </div>
  )
}

function seatLift(index, total) {
  const center = (total - 1) / 2
  const distance = Math.abs(index - center)
  const maxLift = 8
  return -(maxLift - (distance / (center || 1)) * maxLift)
}

// Groups a flat seat list into rows by the leading letter of the seat
// number ("A1", "A2" -> row "A"), preserving row order of first
// appearance and seat order within each row.
function groupByRow(seats) {
  const rows = new Map()
  for (const seat of seats) {
    const rowKey = seat.seatNumber.match(/^[A-Za-z]+/)?.[0] || '?'
    if (!rows.has(rowKey)) rows.set(rowKey, [])
    rows.get(rowKey).push(seat)
  }
  return Array.from(rows.entries())
}

export default function AuditoriumSeatMap({ seats, selectedSeatId, onSelect }) {
  const rows = groupByRow(seats)

  return (
    <div className="venue">
      <div className="screen-indicator">
        <div className="screen-shape" />
        <div className="screen-label">Stage</div>
      </div>

      <div className="venue-rows">
        <DecorativeRow count={18} seed={1} />
        <DecorativeRow count={20} seed={3} />
      </div>

      <div className="venue-divider">
        <span>Reserved seating</span>
      </div>

      <div className="venue-rows" style={{ gap: 14 }}>
        {rows.map(([rowLabel, rowSeats]) => (
          <div className="venue-row" key={rowLabel}>
            <div className="row-label">{rowLabel}</div>
            <div className="row-seats">
              {rowSeats.map((seat, i) => {
                const isBooked = seat.status === 'BOOKED'
                const isSelected = seat.id === selectedSeatId
                const cls = [
                  'seat',
                  isBooked ? 'seat--booked' : 'seat--available',
                  isSelected ? 'seat--selected' : '',
                ].join(' ')

                return (
                  <button
                    key={seat.id}
                    className={cls}
                    style={{ '--lift': `${seatLift(i, rowSeats.length)}px` }}
                    disabled={isBooked}
                    onClick={() => onSelect(seat.id)}
                    aria-label={`Seat ${seat.seatNumber}, ${isBooked ? 'taken' : 'available'}`}
                  >
                    {seat.seatNumber}
                  </button>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="legend">
        <div className="legend-item">
          <span className="legend-swatch" style={{ background: 'var(--success-tint)', borderColor: 'var(--success)' }} />
          Available
        </div>
        <div className="legend-item">
          <span className="legend-swatch" style={{ background: 'var(--brand)', borderColor: 'var(--brand)' }} />
          Selected
        </div>
        <div className="legend-item">
          <span className="legend-swatch" style={{ background: '#ebedf2', borderColor: 'var(--border)' }} />
          Taken
        </div>
      </div>
    </div>
  )
}
