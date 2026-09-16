export default function StockBadge({ stock, minStock = 0 }) {
  const s = Number(stock) || 0
  const m = Number(minStock) || 0

  if (s <= 0)   return <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-2xs font-bold bg-red-50 text-red-700 border border-red-200"><span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />Agotado</span>
  if (s <= m)   return <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-2xs font-bold bg-amber-50 text-amber-700 border border-amber-200"><span className="w-1.5 h-1.5 rounded-full bg-amber-500" />Stock bajo</span>
  return          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-2xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />Disponible</span>
}
