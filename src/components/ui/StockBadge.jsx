export default function StockBadge({ stock, minStock }) {
  let tone = 'good'
  let label = 'En stock'
  if (stock <= 0) {
    tone = 'bad'
    label = 'Agotado'
  } else if (stock <= minStock) {
    tone = 'amber'
    label = 'Stock bajo'
  }
  const styles = {
    good: 'bg-good-dim text-good border-good/25',
    amber: 'bg-amber-dim text-amber border-amber/25',
    bad: 'bg-bad-dim text-bad border-bad/25',
  }
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${styles[tone]}`}>
      {label}
    </span>
  )
}
