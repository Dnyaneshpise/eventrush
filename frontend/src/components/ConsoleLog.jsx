function badgeClass(type) {
  if (type === 'success') return 'log-badge success'
  if (type === 'error') return 'log-badge error'
  if (type === 'warn') return 'log-badge warn'
  return 'log-badge info'
}

function badgeLabel(entry) {
  if (entry.httpStatus) return entry.httpStatus
  if (entry.type === 'success') return 'OK'
  if (entry.type === 'error') return 'ERR'
  if (entry.type === 'warn') return 'WARN'
  return 'INFO'
}

export default function ConsoleLog({ entries, bottomRef }) {
  return (
    <div className="console">
      {entries.length === 0 && (
        <div className="console-empty">// waiting for booking activity…</div>
      )}
      {entries.map((entry) => (
        <div className="log-line" key={entry.id}>
          <span className="log-time">{entry.time}</span>
          <span className={badgeClass(entry.type)}>{badgeLabel(entry)}</span>
          <span className="log-msg">{entry.message}</span>
        </div>
      ))}
      <div ref={bottomRef} />
    </div>
  )
}
