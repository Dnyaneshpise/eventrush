export default function Footer({ onNavigate }) {
  return (
    <footer className="site-footer">
      <div className="site-footer-inner">
        <div className="footer-brand">
          <div className="brand-logo">
            Event<span>Rush</span>
          </div>
          <p>Flash-sale ticketing, engineered for fairness under load.</p>
        </div>

        <div className="footer-cols">
          <div className="footer-col">
            <div className="footer-col-title">Explore</div>
            <button className="footer-link" onClick={() => onNavigate('')}>Discover</button>
            <button className="footer-link" onClick={() => onNavigate('bookings')}>My Bookings</button>
            <button className="footer-link" onClick={() => onNavigate('help')}>Help</button>
          </div>

          <div className="footer-col">
            <div className="footer-col-title">For developers</div>
            <button className="footer-link" onClick={() => onNavigate('developer')}>Systems console</button>
            <span className="footer-link muted">API status</span>
            <span className="footer-link muted">Load tests</span>
          </div>
        </div>
      </div>

      <div className="site-footer-base">
        © {new Date().getFullYear()} EventRush · A concurrency demonstration, not a real ticketing service.
      </div>
    </footer>
  )
}
