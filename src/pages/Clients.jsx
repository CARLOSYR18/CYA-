import { useEffect, useState } from 'react'
import { Users, Phone, ShoppingBag, Calendar, TrendingUp, ChevronRight, X } from 'lucide-react'
import AppLayout from '../components/layout/AppLayout'
import EmptyState from '../components/ui/EmptyState'
import Modal from '../components/ui/Modal'
import StatusBadge from '../components/ui/StatusBadge'
import { getClientsHistory } from '../lib/clientHistory'

const money = (n) => `S/ ${Number(n).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
const dateStr = (iso) => iso ? new Date(iso).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'

export default function Clients() {
  const [clients, setClients] = useState([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null) // client with sales history

  useEffect(() => {
    getClientsHistory()
      .then(setClients)
      .finally(() => setLoading(false))
  }, [])

  return (
    <AppLayout title="Clientes">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 mb-5">
        <p className="text-xs sm:text-sm text-ink-muted">
          Clientes registrados automáticamente al registrar ventas.
        </p>
        <span className="text-xs bg-brand/10 text-brand font-semibold px-3 py-1 rounded-full self-start sm:self-auto shrink-0">
          {clients.length} cliente{clients.length !== 1 ? 's' : ''}
        </span>
      </div>

      {loading ? (
        <p className="text-sm text-ink-muted p-8 text-center">Cargando historial…</p>
      ) : clients.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={Users}
            title="Sin historial de clientes"
            description="Los clientes aparecen aquí automáticamente cuando registras ventas."
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {clients.map((c) => (
            <button
              key={c.id}
              onClick={() => setSelected(c)}
              className="card p-5 text-left hover:shadow-md hover:-translate-y-0.5 transition-all group cursor-pointer w-full"
            >
              {/* Top row */}
              <div className="flex items-start justify-between mb-4">
                <div className="w-10 h-10 rounded-xl bg-brand/10 flex items-center justify-center shrink-0">
                  <span className="text-brand font-display font-bold text-lg leading-none">
                    {c.name.charAt(0).toUpperCase()}
                  </span>
                </div>
                <ChevronRight size={16} className="text-ink-muted group-hover:text-brand transition-colors mt-1" />
              </div>

              {/* Name & phone */}
              <p className="font-semibold text-ink-primary text-sm leading-tight mb-1">{c.name}</p>
              {c.phone && (
                <p className="flex items-center gap-1 text-xs text-ink-muted mb-4">
                  <Phone size={11} /> {c.phone}
                </p>
              )}
              {!c.phone && <div className="mb-4" />}

              {/* Stats */}
              <div className="grid grid-cols-3 gap-1 sm:gap-2 pt-3 border-t border-base-border/60">
                <div className="text-center min-w-0">
                  <p className="text-[10px] text-ink-muted uppercase tracking-wide mb-0.5 flex items-center justify-center gap-1">
                    <ShoppingBag size={9} /> Compras
                  </p>
                  <p className="font-bold text-ink-primary text-xs sm:text-sm">{c.salesCount}</p>
                </div>
                <div className="text-center min-w-0">
                  <p className="text-[10px] text-ink-muted uppercase tracking-wide mb-0.5 flex items-center justify-center gap-1">
                    <TrendingUp size={9} /> Total
                  </p>
                  <p className="font-bold text-brand text-xs sm:text-sm truncate">{money(c.totalSpent)}</p>
                </div>
                <div className="text-center min-w-0">
                  <p className="text-[10px] text-ink-muted uppercase tracking-wide mb-0.5 flex items-center justify-center gap-1">
                    <Calendar size={9} /> Última
                  </p>
                  <p className="font-medium text-ink-secondary text-[10px] sm:text-[11px] truncate">{dateStr(c.lastPurchase)}</p>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* ── Historial de compras del cliente ── */}
      <Modal
        open={!!selected}
        onClose={() => setSelected(null)}
        title={selected ? `Historial — ${selected.name}` : ''}
        width="max-w-2xl"
      >
        {selected && (
          <div className="space-y-4">
            {/* Client info strip */}
            <div className="flex flex-wrap gap-2.5 sm:gap-4 bg-slate-50 rounded-xl p-3 sm:px-4 sm:py-3 text-xs sm:text-sm">
              {selected.phone && (
                <span className="flex items-center gap-1.5 text-ink-secondary">
                  <Phone size={13} className="text-ink-muted" /> {selected.phone}
                </span>
              )}
              <span className="flex items-center gap-1.5 text-ink-secondary">
                <ShoppingBag size={13} className="text-ink-muted" /> {selected.salesCount} compra{selected.salesCount !== 1 ? 's' : ''}
              </span>
              <span className="flex items-center gap-1.5 font-semibold text-brand">
                <TrendingUp size={13} /> {money(selected.totalSpent)} en total
              </span>
            </div>

            {/* Sales list */}
            <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
              {selected.sales.map((sale) => (
                <div key={sale.id} className="border border-base-border rounded-xl overflow-hidden">
                  {/* Sale header */}
                  <div className="flex flex-wrap items-center justify-between gap-1.5 px-3 sm:px-4 py-2 bg-slate-50/80 border-b border-base-border/60">
                    <span className="text-xs text-ink-muted">
                      {new Date(sale.created_at).toLocaleString('es-PE')}
                    </span>
                    <div className="flex items-center gap-2 sm:gap-3">
                      <StatusBadge status={sale.status} />
                      <span className="font-mono font-semibold text-xs sm:text-sm text-ink-primary">
                        {money(sale.items.reduce((s, it) => s + it.quantity * it.unit_price, 0))}
                      </span>
                    </div>
                  </div>
                  {/* Sale items */}
                  <div className="divide-y divide-base-border/40">
                    {sale.items.map((it, i) => (
                      <div key={i} className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 px-3 sm:px-4 py-2 text-xs sm:text-sm">
                        <span className="text-ink-secondary font-medium">{it.product_name || it.product_id}</span>
                        <span className="font-mono text-ink-muted text-xs">
                          {it.quantity} × {money(it.unit_price)} = <span className="text-ink-primary font-medium">{money(it.quantity * it.unit_price)}</span>
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </Modal>
    </AppLayout>
  )
}
