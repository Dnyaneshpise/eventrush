import { useEffect, useState } from 'react'
import EventCard from './EventCard.jsx'
import { getSeats } from '../api.js'
import { eventMeta } from '../eventMeta.js'

const CATEGORIES = ['All', 'Music', 'Comedy', 'Sports', 'Theatre', 'Live']

export default function DiscoveryHome({ events, onOpen }) {
  const [availability, setAvailability] = useState({})
  const [loading, setLoading] = useState(true)
  const [category, setCategory] = useState('All')
  const [query, setQuery] = useState('')

  // Fetch remaining-seat counts for every card, in parallel. Uses the
  // same /seats endpoint the booking screen uses - no new API surface.
  useEffect(() => {
    let alive = true
    setLoading(true)
    Promise.all(
      events.map((ev) =>
        getSeats(ev.id)
          .then((res) => [ev.id, res.data.filter((s) => s.status === 'AVAILABLE').length])
          .catch(() => [ev.id, null])
      )
    ).then((pairs) => {
      if (!alive) return
      setAvailability(Object.fromEntries(pairs))
      setLoading(false)
    })
    return () => {
      alive = false
    }
  }, [events])

  const q = query.trim().toLowerCase()
  const filtered = events.filter((ev) => {
    const meta = eventMeta(ev)
    const catOk = category === 'All' || meta.category === category
    const qOk = !q || ev.name.toLowerCase().includes(q) || (ev.venueName || '').toLowerCase().includes(q)
    return catOk && qOk
  })

  const showSkeleton = loading || events.length === 0

  return (
    <div className="discover">
      <section className="discover-hero">
        <div className="discover-hero-inner">
          <div className="discover-eyebrow">India's fastest ticket drop</div>
          <h1 className="discover-title">Find your next night out</h1>
          <p className="discover-sub">Concerts, comedy, cricket and more — book in seconds, with zero overselling.</p>
          <div className="discover-search">
            <span className="discover-search-icon">⌕</span>
            <input
              className="discover-search-input"
              placeholder="Search events, artists or venues…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
        </div>
      </section>

      <div className="container">
        <div className="discover-filters">
          {CATEGORIES.map((c) => (
            <button key={c} className={`chip ${category === c ? 'active' : ''}`} onClick={() => setCategory(c)}>
              {c}
            </button>
          ))}
        </div>

        <div className="discover-head">
          <h2 className="section-title">{category === 'All' ? 'Upcoming events' : category}</h2>
          {!showSkeleton && (
            <span className="discover-count">
              {filtered.length} {filtered.length === 1 ? 'event' : 'events'}
            </span>
          )}
        </div>

        {showSkeleton ? (
          <div className="ecard-grid">
            {Array.from({ length: Math.max(events.length, 3) }).map((_, i) => (
              <div key={i} className="ecard ecard--skeleton" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="discover-empty">
            <div className="discover-empty-icon">🔎</div>
            <p>No events match your search.</p>
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => {
                setQuery('')
                setCategory('All')
              }}
            >
              Clear filters
            </button>
          </div>
        ) : (
          <div className="ecard-grid">
            {filtered.map((ev) => (
              <EventCard key={ev.id} event={ev} available={availability[ev.id]} onOpen={onOpen} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
