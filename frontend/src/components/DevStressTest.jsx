export default function DevStressTest({ onRun, isRunning, summary, disabled }) {
  return (
    <div className="stress-box">
      <label className="field-label">Simulate the 6am rush</label>
      <p style={{ fontSize: 12.5, color: 'var(--dev-text-muted)', marginTop: -6, marginBottom: 12 }}>
        Fires 15 concurrent booking requests from 15 different users, all
        targeting the SAME seat at the same instant — the exact scenario
        the locking layer exists for.
      </p>
      <button className="dev-btn dev-btn-danger" onClick={onRun} disabled={isRunning || disabled}>
        {isRunning ? 'Rush in progress…' : disabled ? 'No seat available to rush' : '⚡ Simulate 6AM Rush (15 users)'}
      </button>

      {summary && (
        <div className="stress-summary">
          <span className="stat-chip win">✓ {summary.success} booked</span>
          <span className="stat-chip conflict">✕ {summary.conflict} seat conflict (409)</span>
          <span className="stat-chip limited">⏱ {summary.rateLimited} rate limited (429)</span>
        </div>
      )}
    </div>
  )
}
