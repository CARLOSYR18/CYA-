export default function StockBadge({ stock, minStock }) {
  let dot = 'bg-good', cls = 'text-emerald-700 bg-emerald-50 border-emerald-200', label = 'En stock'
  if (stock <= 0) {
    dot = 'bg-bad'; cls = 'text-red-700 bg-red-50 border-red-200'; label = 'Agotado'
  } else if (stock <= minStock) {
    dot = 'bg-amber'; cls = 'text-amber-700 bg-amber-50 border-amber-200'; label = 'Stock bajo'
  }
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${cls}`}>
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dot}`} />
      {label}
    </span>
  )
}
