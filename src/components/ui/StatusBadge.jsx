const MAP = {
  pagado: { label: 'Pagado', tone: 'good' },
  pendiente: { label: 'Pendiente', tone: 'amber' },
  recibido: { label: 'Recibido', tone: 'good' },
  cancelado: { label: 'Cancelado', tone: 'bad' },
}
const styles = {
  good: 'bg-good-dim text-good border-good/25',
  amber: 'bg-amber-dim text-amber border-amber/25',
  bad: 'bg-bad-dim text-bad border-bad/25',
}
export default function StatusBadge({ status }) {
  const info = MAP[status] || { label: status, tone: 'amber' }
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${styles[info.tone]}`}>
      {info.label}
    </span>
  )
}
