import { useState } from 'react'

const FAQS = [
  {
    q: 'How do I book a ticket?',
    a: 'Open an event, tap an available seat on the seat map, then hit "Confirm booking". Your seat is locked the moment you confirm and it is yours.',
  },
  {
    q: 'What does the "Demo data" pill mean?',
    a: 'When the backend API is reachable, EventRush shows live data. If it is not, the app runs on a built-in simulation of the same booking logic so it stays fully usable — that is Demo data mode.',
  },
  {
    q: 'A seat I picked was taken. Why?',
    a: 'On a busy drop thousands of people tap the same seat at once. EventRush uses database locking so exactly one booking wins — if you see a conflict, that seat was grabbed a split-second before you.',
  },
  {
    q: 'Why am I suddenly rate-limited?',
    a: 'To keep flash sales fair, each user gets a small token bucket. Rapid repeated taps return HTTP 429 until tokens refill a moment later.',
  },
  {
    q: 'Are seats held while I decide?',
    a: 'No. Seats are only locked at the instant you confirm. Until then they stay visible and available to everyone.',
  },
  {
    q: 'Can I cancel or get a refund?',
    a: 'This is a demonstration environment, so cancellations are not processed. A real deployment would follow the organizer\u2019s refund policy.',
  },
]

export default function HelpPage() {
  const [open, setOpen] = useState(0)

  return (
    <div className="page">
      <div className="page-head">
        <h1 className="page-title">Help &amp; Support</h1>
        <p className="page-sub">Answers to the things people actually ask.</p>
      </div>

      <div className="faq-list">
        {FAQS.map((f, i) => (
          <div className={`faq ${open === i ? 'open' : ''}`} key={f.q}>
            <button className="faq-q" onClick={() => setOpen(open === i ? -1 : i)} aria-expanded={open === i}>
              <span>{f.q}</span>
              <span className="faq-chevron">{open === i ? '−' : '+'}</span>
            </button>
            {open === i && <div className="faq-a">{f.a}</div>}
          </div>
        ))}
      </div>

      <div className="help-contact">
        <div>
          <h3>Still stuck?</h3>
          <p>Our support team replies within a few hours.</p>
        </div>
        <button className="btn btn-secondary">Contact support</button>
      </div>
    </div>
  )
}
