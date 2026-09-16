const MAP = {
  pagado:    { label: 'Pagado',    dot: 'bg-good',  cls: 'text-emerald-700 bg-emerald-50 border-emerald-200' },
  pendiente: { label: 'Pendiente', dot: 'bg-amber',  cls: 'text-amber-700  bg-amber-50  border-amber-200' },
  recibido:  { label: 'Recibido',  dot: 'bg-good',  cls: 'text-emerald-700 bg-emerald-50 border-emerald-200' },
  cancelado: { label: 'Cancelado', dot: 'bg-bad',   cls: 'text-red-700    bg-red-50    border-red-200' },
}
export default function StatusBadge({ status }) {
  const info = MAP[status] || { label: status, dot: 'bg-amber', cls: 'text-amber-700 bg-amber-50 border-amber-200' }
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${info.cls}`}>
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${info.dot}`} />
      {info.label}
    </span>
  )
}
