const ICONS = { success: '✓', error: '✕', info: 'ⓘ' }

export default function ToastStack({ toasts }) {
  return (
    <div className="toast-stack">
      {toasts.map((t) => (
        <div className={`toast ${t.type}`} key={t.id}>
          <span className="toast-icon">{ICONS[t.type] || 'ⓘ'}</span>
          <span>{t.message}</span>
        </div>
      ))}
    </div>
  )
}
