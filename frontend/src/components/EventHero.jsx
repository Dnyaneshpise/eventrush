export default function EventHero({ event, availableCount, totalSeats }) {
  const isSoldOut = availableCount === 0
  const isScarce = availableCount > 0 && availableCount <= 1

  return (
    <div className="hero">
      <div className="hero-inner">
        <div>
          <div className="hero-eyebrow">Live music · Bengaluru</div>
          <h1 className="hero-title">{event?.name || 'Loading event…'}</h1>
          <div className="hero-meta">
            <span>
              Sat, 8:00 PM · <strong>Jio Garden</strong>
            </span>
            <span>
              <strong>{totalSeats}</strong> seats total
            </span>
            <span>
              <strong>{availableCount}</strong> remaining
            </span>
          </div>
        </div>

        {isSoldOut ? (
          <div className="hero-badge scarce">
            <span className="hero-badge-dot" />
            Sold out
          </div>
        ) : isScarce ? (
          <div className="hero-badge scarce">
            <span className="hero-badge-dot" />
            Only {availableCount} left
          </div>
        ) : (
          <div className="hero-badge">
            <span className="hero-badge-dot" />
            Booking open
          </div>
        )}
      </div>
    </div>
  )
}
