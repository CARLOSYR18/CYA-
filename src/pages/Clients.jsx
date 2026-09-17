import { useEffect, useMemo, useState } from 'react'
import {
  Users, Phone, ShoppingBag, Calendar, TrendingUp,
  ChevronRight, Search, X, Award, ArrowUpDown, List,
  LayoutGrid, DollarSign, Clock, MessageSquare, ExternalLink,
  Receipt, Package
} from 'lucide-react'
import AppLayout from '../components/layout/AppLayout'
import EmptyState from '../components/ui/EmptyState'
import Modal from '../components/ui/Modal'
import StatusBadge from '../components/ui/StatusBadge'
import { getClientsHistory } from '../lib/clientHistory'

const fmt = (n) =>
  `S/ ${(Number(n) || 0).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

const dateStr = (iso) =>
  iso ? new Date(iso).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'

const getInitials = (name = '') => {
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[1][0]).toUpperCase()
}

const AVATAR_PALETTE = [
  { bg: 'from-blue-600 to-indigo-700', text: 'text-white' },
  { bg: 'from-emerald-600 to-teal-700', text: 'text-white' },
  { bg: 'from-violet-600 to-purple-700', text: 'text-white' },
  { bg: 'from-amber-500 to-orange-600', text: 'text-white' },
  { bg: 'from-rose-500 to-pink-600', text: 'text-white' },
  { bg: 'from-cyan-600 to-blue-600', text: 'text-white' },
]

export default function Clients() {
  const [clients, setClients] = useState([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null)
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState('spent') // 'spent' | 'sales' | 'recent' | 'name'
  const [viewMode, setViewMode] = useState('grid') // 'grid' | 'table'

  useEffect(() => {
    getClientsHistory()
      .then(setClients)
      .finally(() => setLoading(false))
  }, [])

  /* ─── Metrics ─── */
  const stats = useMemo(() => {
    const totalClients = clients.length
    const totalSpentAll = clients.reduce((acc, c) => acc + (Number(c.totalSpent) || 0), 0)
    const avgTicket = totalClients > 0 ? totalSpentAll / totalClients : 0
    const recurringClients = clients.filter((c) => (c.salesCount || 0) > 1).length
    const topClient = [...clients].sort((a, b) => (b.totalSpent || 0) - (a.totalSpent || 0))[0]

    return {
      totalClients,
      totalSpentAll,
      avgTicket,
      recurringClients,
      topClient
    }
  }, [clients])

  /* ─── Filtered & Sorted Clients ─── */
  const filtered = useMemo(() => {
    let result = [...clients]

    const q = search.trim().toLowerCase()
    if (q) {
      result = result.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          (c.phone && c.phone.toLowerCase().includes(q))
      )
    }

    if (sortBy === 'spent') {
      result.sort((a, b) => (b.totalSpent || 0) - (a.totalSpent || 0))
    } else if (sortBy === 'sales') {
      result.sort((a, b) => (b.salesCount || 0) - (a.salesCount || 0))
    } else if (sortBy === 'recent') {
      result.sort((a, b) => new Date(b.lastPurchase || 0) - new Date(a.lastPurchase || 0))
    } else if (sortBy === 'name') {
      result.sort((a, b) => a.name.localeCompare(b.name))
    }

    return result
  }, [clients, search, sortBy])

  return (
    <AppLayout title="Cartera de Clientes">
      <div className="space-y-6 max-w-7xl mx-auto pb-12">

        {/* ═════════════════════════════════════════════════════════
            1. EXECUTIVE METRICS BAR (4 CRISP WHITE CARDS)
           ═════════════════════════════════════════════════════════ */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
          
          {/* Card 1: Total Clientes */}
          <div
            className="bg-white rounded-2xl border border-slate-200/80 p-3 sm:p-4.5 shadow-xs flex flex-col justify-between card-mobile-active active:scale-[0.98] transition-all hover:border-slate-300"
            style={{ animation: 'slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) 40ms both' }}
          >
            <div className="flex items-center justify-between gap-1.5 mb-1.5 sm:mb-2">
              <p className="text-[10px] sm:text-[11px] font-bold text-slate-500 uppercase tracking-wider truncate">
                Cartera Activa
              </p>
              <div className="w-7 h-7 sm:w-9 sm:h-9 rounded-lg sm:rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-brand shrink-0">
                <Users size={14} className="sm:hidden" />
                <Users size={18} className="hidden sm:block" />
              </div>
            </div>
            <div>
              <h4 className="text-base sm:text-2xl font-extrabold text-slate-900 tracking-tight font-sans whitespace-nowrap overflow-hidden text-ellipsis">
                {loading ? '…' : `${stats.totalClients}`}
              </h4>
              <p className="text-[10px] sm:text-xs text-slate-400 mt-0.5 truncate">
                {stats.recurringClients} recurrentes (+1 compra)
              </p>
            </div>
          </div>

          {/* Card 2: Facturación Histórica Clientes */}
          <div
            className="bg-white rounded-2xl border border-slate-200/80 p-3 sm:p-4.5 shadow-xs flex flex-col justify-between card-mobile-active active:scale-[0.98] transition-all hover:border-slate-300"
            style={{ animation: 'slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) 100ms both' }}
          >
            <div className="flex items-center justify-between gap-1.5 mb-1.5 sm:mb-2">
              <p className="text-[10px] sm:text-[11px] font-bold text-slate-500 uppercase tracking-wider truncate">
                Facturación Total
              </p>
              <div className="w-7 h-7 sm:w-9 sm:h-9 rounded-lg sm:rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
                <TrendingUp size={14} className="sm:hidden" />
                <TrendingUp size={18} className="hidden sm:block" />
              </div>
            </div>
            <div>
              <h4 className="text-base sm:text-2xl font-extrabold text-slate-900 tracking-tight font-sans whitespace-nowrap overflow-hidden text-ellipsis">
                {loading ? '…' : fmt(stats.totalSpentAll)}
              </h4>
              <p className="text-[10px] sm:text-xs text-slate-400 mt-0.5 truncate">Ventas liquidadas</p>
            </div>
          </div>

          {/* Card 3: Promedio por Cliente */}
          <div
            className="bg-white rounded-2xl border border-slate-200/80 p-3 sm:p-4.5 shadow-xs flex flex-col justify-between card-mobile-active active:scale-[0.98] transition-all hover:border-slate-300"
            style={{ animation: 'slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) 160ms both' }}
          >
            <div className="flex items-center justify-between gap-1.5 mb-1.5 sm:mb-2">
              <p className="text-[10px] sm:text-[11px] font-bold text-slate-500 uppercase tracking-wider truncate">
                Ticket Promedio
              </p>
              <div className="w-7 h-7 sm:w-9 sm:h-9 rounded-lg sm:rounded-xl bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-600 shrink-0">
                <DollarSign size={14} className="sm:hidden" />
                <DollarSign size={18} className="hidden sm:block" />
              </div>
            </div>
            <div>
              <h4 className="text-base sm:text-2xl font-extrabold text-slate-900 tracking-tight font-sans whitespace-nowrap overflow-hidden text-ellipsis">
                {loading ? '…' : fmt(stats.avgTicket)}
              </h4>
              <p className="text-[10px] sm:text-xs text-slate-400 mt-0.5 truncate">Por cliente registrado</p>
            </div>
          </div>

          {/* Card 4: Cliente Destacado */}
          <div
            className="bg-white rounded-2xl border border-slate-200/80 p-3 sm:p-4.5 shadow-xs flex flex-col justify-between card-mobile-active active:scale-[0.98] transition-all hover:border-slate-300"
            style={{ animation: 'slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) 220ms both' }}
          >
            <div className="flex items-center justify-between gap-1.5 mb-1.5 sm:mb-2">
              <p className="text-[10px] sm:text-[11px] font-bold text-slate-500 uppercase tracking-wider truncate">
                Cliente VIP
              </p>
              <div className="w-7 h-7 sm:w-9 sm:h-9 rounded-lg sm:rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 shrink-0">
                <Award size={14} className="sm:hidden" />
                <Award size={18} className="hidden sm:block" />
              </div>
            </div>
            <div>
              <h4 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight truncate">
                {loading ? '…' : stats.topClient?.name || 'Ninguno'}
              </h4>
              <p className="text-[10px] sm:text-xs text-emerald-600 font-semibold mt-0.5 truncate">
                {stats.topClient ? fmt(stats.topClient.totalSpent) : '—'}
              </p>
            </div>
          </div>

        </div>

        {/* ═════════════════════════════════════════════════════════
            2. SEARCH, SORT & VIEW FILTER BAR
           ═════════════════════════════════════════════════════════ */}
        <div
          className="bg-white rounded-2xl border border-slate-200/80 p-3.5 sm:p-5 shadow-xs space-y-3"
          style={{ animation: 'slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) 280ms both' }}
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3">
            
            {/* Search Input */}
            <div className="relative flex-1 w-full">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                className="w-full bg-slate-50/70 border border-slate-200 rounded-xl pl-10 pr-9 py-2 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-brand focus:ring-2 focus:ring-brand/10 transition-all outline-none"
                placeholder="Buscar cliente por nombre o teléfono…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Controls: Sorting + View Mode */}
            <div className="flex items-center justify-between sm:justify-start gap-2 w-full sm:w-auto">
              <div className="flex items-center gap-1.5 bg-slate-50/70 border border-slate-200 rounded-xl px-2.5 py-1.5 flex-1 sm:flex-initial">
                <ArrowUpDown size={13} className="text-slate-400 shrink-0" />
                <span className="text-[11px] text-slate-400 font-medium shrink-0">Ordenar:</span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="bg-transparent text-xs text-slate-700 font-semibold outline-none cursor-pointer w-full"
                >
                  <option value="spent">Mayor inversión</option>
                  <option value="sales">Más compras</option>
                  <option value="recent">Más reciente</option>
                  <option value="name">Nombre A-Z</option>
                </select>
              </div>

              {/* View Mode Toggle */}
              <div className="inline-flex items-center p-1 bg-slate-100 rounded-xl border border-slate-200/80 shrink-0">
                <button
                  type="button"
                  onClick={() => setViewMode('grid')}
                  title="Vista en tarjetas"
                  className={`p-1.5 rounded-lg transition-all ${
                    viewMode === 'grid'
                      ? 'bg-white text-brand shadow-xs font-semibold'
                      : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  <LayoutGrid size={15} />
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('table')}
                  title="Vista en tabla"
                  className={`p-1.5 rounded-lg transition-all ${
                    viewMode === 'table'
                      ? 'bg-white text-brand shadow-xs font-semibold'
                      : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  <List size={15} />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ═════════════════════════════════════════════════════════
            3. CLIENTS LIST (GRID CARDS & TABLE VIEW)
           ═════════════════════════════════════════════════════════ */}
        {loading ? (
          <div className="bg-white rounded-2xl border border-slate-200/80 p-16 flex flex-col items-center justify-center text-center shadow-xs">
            <div className="w-10 h-10 rounded-full border-2 border-brand border-t-transparent animate-spin mb-3" />
            <p className="text-xs font-semibold text-slate-600">Cargando base de clientes…</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200/80 p-8 shadow-xs">
            <EmptyState
              icon={Users}
              title="Sin clientes registrados"
              description={
                search
                  ? 'No se encontraron clientes que coincidan con tu búsqueda.'
                  : 'Los clientes se registran automáticamente cuando emites ventas desde el punto de venta o catálogo.'
              }
              action={
                search ? (
                  <button onClick={() => setSearch('')} className="btn-secondary text-xs">
                    Limpiar búsqueda
                  </button>
                ) : null
              }
            />
          </div>
        ) : viewMode === 'grid' ? (
          /* ─── GRID CARDS VIEW ─── */
          <div
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
            style={{ animation: 'slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) 320ms both' }}
          >
            {filtered.map((c, idx) => {
              const avatar = AVATAR_PALETTE[idx % AVATAR_PALETTE.length]
              const isVip = (c.totalSpent || 0) >= 300 || (c.salesCount || 0) >= 3

              return (
                <div
                  key={c.id}
                  onClick={() => setSelected(c)}
                  className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs hover:shadow-md hover:border-slate-300 card-mobile-active active:scale-[0.99] transition-all cursor-pointer flex flex-col justify-between group"
                >
                  <div>
                    {/* Header with Avatar + Badge */}
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${avatar.bg} ${avatar.text} flex items-center justify-center font-bold font-display text-base shadow-xs shrink-0 group-hover:scale-105 transition-transform`}
                        >
                          {getInitials(c.name)}
                        </div>
                        <div className="min-w-0">
                          <h4 className="font-bold text-slate-900 text-sm sm:text-base leading-snug truncate group-hover:text-brand transition-colors">
                            {c.name}
                          </h4>
                          {c.phone ? (
                            <p className="flex items-center gap-1.5 text-xs text-slate-400 mt-0.5">
                              <Phone size={11} className="text-slate-400" />
                              <span className="font-mono">{c.phone}</span>
                            </p>
                          ) : (
                            <p className="text-xs text-slate-400 mt-0.5">Sin teléfono registrado</p>
                          )}
                        </div>
                      </div>

                      {isVip && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 shrink-0">
                          <Award size={11} /> VIP
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Metrics Footer */}
                  <div className="mt-4 pt-3.5 border-t border-slate-100">
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="bg-slate-50/70 rounded-xl p-2 border border-slate-100">
                        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-0.5">
                          Compras
                        </p>
                        <p className="font-bold text-slate-900 text-sm font-mono">
                          {c.salesCount}
                        </p>
                      </div>

                      <div className="bg-slate-50/70 rounded-xl p-2 border border-slate-100">
                        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-0.5">
                          Invertido
                        </p>
                        <p className="font-bold text-brand text-xs sm:text-sm font-mono truncate">
                          {fmt(c.totalSpent)}
                        </p>
                      </div>

                      <div className="bg-slate-50/70 rounded-xl p-2 border border-slate-100">
                        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-0.5">
                          Última vez
                        </p>
                        <p className="font-semibold text-slate-700 text-[11px] truncate">
                          {dateStr(c.lastPurchase)}
                        </p>
                      </div>
                    </div>

                    <div className="mt-3 flex items-center justify-between text-xs text-brand font-semibold group-hover:translate-x-0.5 transition-transform">
                      <span>Ver historial de compras</span>
                      <ChevronRight size={14} />
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          /* ─── TABLE VIEW ─── */
          <div
            className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-xs"
            style={{ animation: 'slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) 320ms both' }}
          >
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200/80 bg-slate-50/70 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    <th className="py-3 px-4">Cliente</th>
                    <th className="py-3 px-4">Teléfono</th>
                    <th className="py-3 px-4 text-center">Órdenes</th>
                    <th className="py-3 px-4 text-right">Total Facturado</th>
                    <th className="py-3 px-4 text-right">Última Compra</th>
                    <th className="py-3 px-4 text-right">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {filtered.map((c, idx) => {
                    const avatar = AVATAR_PALETTE[idx % AVATAR_PALETTE.length]
                    return (
                      <tr
                        key={c.id}
                        onClick={() => setSelected(c)}
                        className="hover:bg-slate-50/80 transition-colors cursor-pointer group"
                      >
                        {/* Avatar + Name */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-3">
                            <div
                              className={`w-9 h-9 rounded-xl bg-gradient-to-br ${avatar.bg} ${avatar.text} flex items-center justify-center font-bold text-xs shrink-0 font-display shadow-xs`}
                            >
                              {getInitials(c.name)}
                            </div>
                            <div>
                              <p className="font-semibold text-slate-900 text-sm group-hover:text-brand transition-colors">
                                {c.name}
                              </p>
                              <span className="text-[11px] text-slate-400">Cliente registrado</span>
                            </div>
                          </div>
                        </td>

                        {/* Phone */}
                        <td className="py-3.5 px-4 font-mono text-slate-600">
                          {c.phone || <span className="text-slate-300">—</span>}
                        </td>

                        {/* Orders count */}
                        <td className="py-3.5 px-4 text-center font-mono font-bold text-slate-800">
                          <span className="bg-slate-100 px-2.5 py-1 rounded-lg">
                            {c.salesCount} venta{c.salesCount !== 1 ? 's' : ''}
                          </span>
                        </td>

                        {/* Total Spent */}
                        <td className="py-3.5 px-4 text-right font-mono font-bold text-sm text-slate-900">
                          {fmt(c.totalSpent)}
                        </td>

                        {/* Last purchase */}
                        <td className="py-3.5 px-4 text-right text-slate-500 font-medium">
                          {dateStr(c.lastPurchase)}
                        </td>

                        {/* Detail Link */}
                        <td className="py-3.5 px-4 text-right">
                          <span className="inline-flex items-center gap-1 text-brand font-semibold hover:underline">
                            Expediente <ChevronRight size={13} />
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            <div className="p-3 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <span>
                Mostrando <strong>{filtered.length}</strong> de <strong>{clients.length}</strong> clientes
              </span>
              <span>Libro Mayor de Ventas CYA</span>
            </div>
          </div>
        )}

      </div>

      {/* ═════════════════════════════════════════════════════════
          4. CLIENT PURCHASE HISTORY DOSSIER (EXPEDIENTE MODAL)
         ═════════════════════════════════════════════════════════ */}
      <Modal
        open={!!selected}
        onClose={() => setSelected(null)}
        title={selected ? `Expediente Comercial — ${selected.name}` : ''}
        width="max-w-2xl"
      >
        {selected && (
          <div className="space-y-4">
            
            {/* Top Summary Banner */}
            <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-brand text-white flex items-center justify-center font-bold text-base font-display shadow-xs">
                  {getInitials(selected.name)}
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 text-sm sm:text-base">{selected.name}</h4>
                  {selected.phone ? (
                    <a
                      href={`tel:${selected.phone}`}
                      className="text-xs text-brand font-mono hover:underline flex items-center gap-1 mt-0.5"
                    >
                      <Phone size={11} /> {selected.phone}
                    </a>
                  ) : (
                    <p className="text-xs text-slate-400 mt-0.5">Sin teléfono de contacto</p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-4 text-right">
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">Órdenes</p>
                  <p className="font-bold text-slate-800 text-sm font-mono">{selected.salesCount}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">Inversión Total</p>
                  <p className="font-extrabold text-brand text-base font-mono">{fmt(selected.totalSpent)}</p>
                </div>
              </div>
            </div>

            {/* Sales ledger list */}
            <div>
              <h5 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2.5 flex items-center gap-1.5">
                <Receipt size={14} className="text-slate-400" />
                Historial de Compras ({selected.sales.length})
              </h5>

              <div className="space-y-3 max-h-[55vh] overflow-y-auto pr-1">
                {selected.sales.map((sale) => {
                  const saleTotal = sale.items.reduce(
                    (sum, it) => sum + (Number(it.quantity) || 1) * (Number(it.unit_price) || 0),
                    0
                  )

                  return (
                    <div
                      key={sale.id}
                      className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-xs"
                    >
                      {/* Ticket Header */}
                      <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 bg-slate-50/80 border-b border-slate-100">
                        <div className="flex items-center gap-2">
                          <Clock size={12} className="text-slate-400" />
                          <span className="text-xs font-medium text-slate-600">
                            {new Date(sale.created_at).toLocaleString('es-PE', {
                              dateStyle: 'medium',
                              timeStyle: 'short'
                            })}
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          <StatusBadge status={sale.status || 'pagado'} />
                          <span className="font-mono font-bold text-sm text-slate-900">
                            {fmt(saleTotal)}
                          </span>
                        </div>
                      </div>

                      {/* Purchased items list */}
                      <div className="divide-y divide-slate-100">
                        {sale.items.map((it, i) => (
                          <div
                            key={i}
                            className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 px-4 py-2 text-xs"
                          >
                            <div className="flex items-center gap-2">
                              <Package size={13} className="text-slate-400 shrink-0" />
                              <span className="text-slate-800 font-semibold">
                                {it.product_name || it.product_id}
                              </span>
                            </div>
                            <span className="font-mono text-slate-500">
                              {it.quantity} × {fmt(it.unit_price)} ={' '}
                              <strong className="text-slate-900 font-bold">
                                {fmt(it.quantity * it.unit_price)}
                              </strong>
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-100">
              <button onClick={() => setSelected(null)} className="btn-secondary text-xs px-4 py-2">
                Cerrar expediente
              </button>
            </div>
          </div>
        )}
      </Modal>

    </AppLayout>
  )
}
