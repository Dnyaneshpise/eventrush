import { eventMeta, formatEventDate } from '../eventMeta.js'

export default function EventCard({ event, available, onOpen }) {
  const meta = eventMeta(event)
  const total = event?.totalSeats || 0
  const known = available != null
  const soldOut = known && available === 0
  const low = known && available > 0 && available <= 5

  return (
    <button className="ecard" onClick={() => onOpen(event.id)} aria-label={`Open ${event.name}`}>
      <div className="ecard-poster" style={{ backgroundImage: `linear-gradient(135deg, ${meta.gradient})` }}>
        <span className="ecard-icon">{meta.icon}</span>
        <span className="ecard-cat">{meta.category}</span>
        {soldOut && <span className="ecard-soldout">Sold out</span>}
      </div>

      <div className="ecard-body">
        <h3 className="ecard-title">{event.name}</h3>
        <div className="ecard-venue">{event.venueName || 'Venue to be announced'}</div>
        <div className="ecard-date">{formatEventDate(event.bookingOpensAt)}</div>

        <div className="ecard-foot">
          <span className="ecard-price">from ₹{meta.priceFrom.toLocaleString('en-IN')}</span>
          <span className={`ecard-left ${soldOut ? 'sold' : low ? 'low' : ''}`}>
            {!known
              ? `${total} seats`
              : soldOut
              ? 'Sold out'
              : `${available} of ${total} left`}
          </span>
        </div>
      </div>
    </button>
  )
}
