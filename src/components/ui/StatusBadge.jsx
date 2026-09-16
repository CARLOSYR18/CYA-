export default function StatusBadge({ status }) {
  const map = {
    pagado:    { label: 'Pagado',    cls: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500' },
    pendiente: { label: 'Pendiente', cls: 'bg-amber-50 text-amber-700 border-amber-200',       dot: 'bg-amber-500' },
    recibido:  { label: 'Recibido',  cls: 'bg-blue-50 text-blue-700 border-blue-200',           dot: 'bg-blue-500' },
    cancelado: { label: 'Cancelado', cls: 'bg-slate-100 text-slate-500 border-slate-200',       dot: 'bg-slate-400' },
  }
  const s = map[status] || map.pendiente

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-2xs font-bold border ${s.cls}`}>
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${s.dot}`} />
      {s.label}
    </span>
  )
}
