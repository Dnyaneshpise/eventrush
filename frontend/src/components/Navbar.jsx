const NAV_LINKS = [
  { key: 'home', label: 'Discover' },
  { key: 'bookings', label: 'My Bookings' },
  { key: 'help', label: 'Help' },
]

export default function Navbar({
  mode,
  view,
  onViewChange,
  onCreateEvent,
  events = [],
  selectedEventId,
  onSwitchEvent,
  route,
  onNavigate,
}) {
  const active = route?.name
  return (
    <div className="navbar">
      <div className="navbar-inner">
        <button className="brand-logo brand-logo--btn" onClick={() => onNavigate('')}>
          Event<span>Rush</span>
        </button>

        <div className="nav-links">
          {events.length > 1 && (
            <select
              className="event-switcher"
              value={selectedEventId || ''}
              onChange={(e) => onSwitchEvent(Number(e.target.value))}
            >
              {events.map((ev) => (
                <option key={ev.id} value={ev.id}>{ev.name}</option>
              ))}
            </select>
          )}
          {NAV_LINKS.map((link) => (
            <button
              key={link.key}
              className={`nav-link nav-link--btn ${active === link.key ? 'active' : ''}`}
              onClick={() => onNavigate(link.key === 'home' ? '' : link.key)}
            >
              {link.label}
            </button>
          ))}
        </div>

        <div className="nav-right">
          <button className="btn btn-primary btn-sm ce-nav-btn" onClick={onCreateEvent}>
            + Create Event
          </button>

          <div className="view-toggle">
            <button
              className={`view-toggle-btn ${view === 'audience' ? 'active' : ''}`}
              onClick={() => onViewChange('audience')}
            >
              Book Tickets
            </button>
            <button
              className={`view-toggle-btn ${view === 'developer' ? 'active' : ''}`}
              onClick={() => onViewChange('developer')}
            >
              Developer
            </button>
          </div>

          <div className="env-pill">
            <span className={`env-dot ${mode === 'mock' ? 'mock' : ''}`} />
            {mode === 'live' ? 'Live' : 'Demo data'}
          </div>

          <div className="avatar">G</div>
        </div>
      </div>
    </div>
  )
}

