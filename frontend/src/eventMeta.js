// ============================================================
// PRESENTATION METADATA
// The backend only knows about id/name/totalSeats/bookingOpensAt and
// the venue. A real ticketing UI needs a little more (a category, a
// poster treatment, a "from ₹x" price) to look credible. This module
// derives those deterministically from the fields we DO have, so a
// freshly created backend event still renders as a real-looking card,
// and the mock events can override any value explicitly.
// ============================================================

// Poster gradients - picked deterministically from the event id so the
// same event always gets the same look (stable across reloads).
const GRADIENTS = [
  '#0b2545, #155e9c, #0e7490',
  '#3b0764, #7c3aed, #c026d3',
  '#7f1d1d, #dc2626, #f97316',
  '#052e2b, #0d9488, #22c55e',
  '#1e1b4b, #4338ca, #0ea5e9',
  '#4c0519, #be185d, #f43f5e',
]

const CATEGORY_RULES = [
  { re: /comedy|stand-?up|laugh|humou?r/i, category: 'Comedy', icon: '🎤' },
  { re: /\bipl\b|cricket|match|\bvs\b|league|football|sport|tournament/i, category: 'Sports', icon: '🏏' },
  { re: /music|concert|\blive\b|fest|sunburn|\bedm\b|\btour\b|\bdj\b/i, category: 'Music', icon: '🎶' },
  { re: /play|theatre|theater|drama|musical/i, category: 'Theatre', icon: '🎭' },
]

const CATEGORY_ICON = { Music: '🎶', Comedy: '🎤', Sports: '🏏', Theatre: '🎭', Live: '🎟️' }

export function eventMeta(event) {
  const id = Math.abs(Number(event?.id) || 0)
  const name = event?.name || 'Event'
  const rule = CATEGORY_RULES.find((r) => r.re.test(name))
  const category = event?.category || rule?.category || 'Live'
  const icon = event?.icon || rule?.icon || CATEGORY_ICON[category] || '🎟️'
  const gradient = GRADIENTS[id % GRADIENTS.length]
  const priceFrom = event?.priceFrom || 499 + (id % 6) * 500
  return { category, icon, gradient, priceFrom }
}

export function formatEventDate(iso) {
  if (!iso) return 'Date to be announced'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return 'Date to be announced'
  const date = d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })
  const time = d.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' })
  return `${date} · ${time}`
}
