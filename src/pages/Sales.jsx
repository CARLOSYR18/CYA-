import { useEffect, useMemo, useState } from 'react'
import {
  Plus, Trash2, ShoppingCart, Search, X, TrendingUp,
  DollarSign, CheckCircle2, Clock, Filter, ArrowUpDown,
  Receipt, User, Phone, Package, ChevronRight, Eye,
  Printer, ArrowUpRight, AlertCircle
} from 'lucide-react'
import AppLayout from '../components/layout/AppLayout'
import Modal from '../components/ui/Modal'
import EmptyState from '../components/ui/EmptyState'
import StatusBadge from '../components/ui/StatusBadge'
import ReceiptModal from '../components/Receipt'
import { salesService } from '../services/salesService'
import { productsService } from '../services/productsService'
import { clientsService } from '../services/clientsService'
import { companySettingsService } from '../services/companySettingsService'
import { useAuth } from '../context/AuthContext'

const fmt = (n) =>
  `S/ ${(Number(n) || 0).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

const getInitials = (name = '') => {
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[1][0]).toUpperCase()
}

export default function Sales() {
  const { user } = useAuth()
  const [sales, setSales] = useState([])
  const [products, setProducts] = useState([])
  const [clients, setClients] = useState([])
  const [company, setCompany] = useState(null)
  const [loading, setLoading] = useState(true)

  // Filters & State
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL') // 'ALL' | 'pagado' | 'pendiente'
  const [sortBy, setSortBy] = useState('recent') // 'recent' | 'highest' | 'lowest'

  // Modal State
  const [modalOpen, setModalOpen] = useState(false)
  const [clientName, setClientName] = useState('')
  const [clientPhone, setClientPhone] = useState('')
  const [status, setStatus] = useState('pagado')
  const [discount, setDiscount] = useState('')
  const [items, setItems] = useState([])
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [viewing, setViewing] = useState(null)

  async function loadAll() {
    setLoading(true)
    try {
      const [s, p, c, comp] = await Promise.all([
        salesService.list(),
        productsService.list(),
        clientsService.list(),
        companySettingsService.get()
      ])
      setSales(s || [])
      setProducts(p || [])
      setClients(c || [])
      setCompany(comp || null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadAll()
  }, [])

  /* ─── Sales KPI Metrics ─── */
  const stats = useMemo(() => {
    const totalCount = sales.length
    const totalRevenue = sales.reduce((acc, s) => acc + salesService.saleTotal(s), 0)
    const paidSales = sales.filter((s) => s.status === 'pagado')
    const paidRevenue = paidSales.reduce((acc, s) => acc + salesService.saleTotal(s), 0)
    const pendingSales = sales.filter((s) => s.status === 'pendiente')
    const pendingRevenue = pendingSales.reduce((acc, s) => acc + salesService.saleTotal(s), 0)
    const avgTicket = totalCount > 0 ? totalRevenue / totalCount : 0

    return {
      totalCount,
      totalRevenue,
      paidCount: paidSales.length,
      paidRevenue,
      pendingCount: pendingSales.length,
      pendingRevenue,
      avgTicket
    }
  }, [sales])

  /* ─── Filtered & Sorted Sales ─── */
  const filtered = useMemo(() => {
    let result = [...sales]

    const q = search.trim().toLowerCase()
    if (q) {
      result = result.filter((s) => {
        const cName = (s.client?.name || s.client_name || '').toLowerCase()
        const cPhone = (s.client?.phone || s.client_phone || '').toLowerCase()
        const idStr = (s.id || '').toString().toLowerCase()
        return cName.includes(q) || cPhone.includes(q) || idStr.includes(q)
      })
    }

    if (statusFilter !== 'ALL') {
      result = result.filter((s) => s.status === statusFilter)
    }

    if (sortBy === 'recent') {
      result.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    } else if (sortBy === 'highest') {
      result.sort((a, b) => salesService.saleTotal(b) - salesService.saleTotal(a))
    } else if (sortBy === 'lowest') {
      result.sort((a, b) => salesService.saleTotal(a) - salesService.saleTotal(b))
    }

    return result
  }, [sales, search, statusFilter, sortBy])

  /* ─── New Sale Form Logic ─── */
  function openCreate() {
    setClientName('')
    setClientPhone('')
    setStatus('pagado')
    setDiscount('')
    setItems([{ product_id: '', quantity: 1 }])
    setError('')
    setModalOpen(true)
  }

  function addItemRow() {
    setItems([...items, { product_id: '', quantity: 1 }])
  }

  function removeItemRow(idx) {
    setItems(items.filter((_, i) => i !== idx))
  }

  function updateItem(idx, patch) {
    setItems(items.map((it, i) => (i === idx ? { ...it, ...patch } : it)))
  }

  const subtotal = useMemo(
    () =>
      items.reduce((sum, it) => {
        const p = products.find((p) => p.id === it.product_id)
        return sum + (p ? Number(p.sale_price || 0) * Number(it.quantity || 0) : 0)
      }, 0),
    [items, products]
  )

  const total = useMemo(
    () => Math.max(subtotal - (Number(discount) || 0), 0),
    [subtotal, discount]
  )

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (!clientName.trim()) {
      setError('El nombre del cliente es obligatorio')
      return
    }
    const validItems = items.filter((it) => it.product_id && Number(it.quantity) > 0)
    if (!validItems.length) {
      setError('Agrega al menos un producto a la orden')
      return
    }

    for (const it of validItems) {
      const p = products.find((p) => p.id === it.product_id)
      if (p && Number(it.quantity) > Number(p.stock)) {
        setError(`Stock insuficiente para "${p.name}". Stock disponible: ${p.stock}`)
        return
      }
    }

    setSaving(true)
    try {
      const saleItems = validItems.map((it) => {
        const p = products.find((p) => p.id === it.product_id)
        return {
          product_id: it.product_id,
          quantity: Number(it.quantity),
          unit_price: Number(p.sale_price)
        }
      })

      const result = await salesService.create({
        client_name: clientName.trim(),
        client_phone: clientPhone.trim() || undefined,
        user_id: user.id,
        status,
        items: saleItems,
        discount: Number(discount) || 0
      })

      setModalOpen(false)
      await loadAll()
      setViewing(result)
    } catch (err) {
      setError(err.message || 'No se pudo registrar la venta')
    } finally {
      setSaving(false)
    }
  }

  const getClientLabel = (sale) =>
    sale.client?.name || sale.client_name || clients.find((c) => c.id === sale.client_id)?.name || 'Cliente Particular'

  return (
    <AppLayout title="Gestión de Ventas">
      <div className="space-y-6 max-w-7xl mx-auto pb-12">

        {/* ═════════════════════════════════════════════════════════
            1. EXECUTIVE METRICS BAR (4 CRISP WHITE CARDS)
           ═════════════════════════════════════════════════════════ */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
          
          {/* Card 1: Facturación Total */}
          <div
            className="bg-white rounded-2xl border border-slate-200/80 p-3 sm:p-4.5 shadow-xs flex flex-col justify-between card-mobile-active active:scale-[0.98] transition-all hover:border-slate-300"
            style={{ animation: 'slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) 40ms both' }}
          >
            <div className="flex items-center justify-between gap-1.5 mb-1.5 sm:mb-2">
              <p className="text-[10px] sm:text-[11px] font-bold text-slate-500 uppercase tracking-wider truncate">
                Ventas Totales
              </p>
              <div className="w-7 h-7 sm:w-9 sm:h-9 rounded-lg sm:rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
                <TrendingUp size={14} className="sm:hidden" />
                <TrendingUp size={18} className="hidden sm:block" />
              </div>
            </div>
            <div>
              <h4 className="text-base sm:text-2xl font-extrabold text-slate-900 tracking-tight font-sans whitespace-nowrap overflow-hidden text-ellipsis">
                {loading ? '…' : fmt(stats.totalRevenue)}
              </h4>
              <p className="text-[10px] sm:text-xs text-slate-400 mt-0.5 truncate">
                {stats.totalCount} órdenes generadas
              </p>
            </div>
          </div>

          {/* Card 2: Cobros Liquidados (Pagado) */}
          <div
            className="bg-white rounded-2xl border border-slate-200/80 p-3 sm:p-4.5 shadow-xs flex flex-col justify-between card-mobile-active active:scale-[0.98] transition-all hover:border-slate-300"
            style={{ animation: 'slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) 100ms both' }}
          >
            <div className="flex items-center justify-between gap-1.5 mb-1.5 sm:mb-2">
              <p className="text-[10px] sm:text-[11px] font-bold text-slate-500 uppercase tracking-wider truncate">
                Cobrado en Efectivo
              </p>
              <div className="w-7 h-7 sm:w-9 sm:h-9 rounded-lg sm:rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-brand shrink-0">
                <CheckCircle2 size={14} className="sm:hidden" />
                <CheckCircle2 size={18} className="hidden sm:block" />
              </div>
            </div>
            <div>
              <h4 className="text-base sm:text-2xl font-extrabold text-slate-900 tracking-tight font-sans whitespace-nowrap overflow-hidden text-ellipsis">
                {loading ? '…' : fmt(stats.paidRevenue)}
              </h4>
              <p className="text-[10px] sm:text-xs text-emerald-600 font-medium mt-0.5 truncate">
                {stats.paidCount} ventas pagadas
              </p>
            </div>
          </div>

          {/* Card 3: Ticket Promedio */}
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
              <p className="text-[10px] sm:text-xs text-slate-400 mt-0.5 truncate">
                Por boleta emitida
              </p>
            </div>
          </div>

          {/* Card 4: Por Cobrar / Pendiente */}
          <div
            className="bg-white rounded-2xl border border-slate-200/80 p-3 sm:p-4.5 shadow-xs flex flex-col justify-between card-mobile-active active:scale-[0.98] transition-all hover:border-slate-300"
            style={{ animation: 'slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) 220ms both' }}
          >
            <div className="flex items-center justify-between gap-1.5 mb-1.5 sm:mb-2">
              <p className="text-[10px] sm:text-[11px] font-bold text-slate-500 uppercase tracking-wider truncate">
                Por Cobrar
              </p>
              <div
                className={`w-7 h-7 sm:w-9 sm:h-9 rounded-lg sm:rounded-xl border flex items-center justify-center shrink-0 ${
                  stats.pendingCount > 0
                    ? 'bg-amber-50 border-amber-200 text-amber-600'
                    : 'bg-slate-50 border-slate-200 text-slate-400'
                }`}
              >
                <Clock size={14} className="sm:hidden" />
                <Clock size={18} className="hidden sm:block" />
              </div>
            </div>
            <div>
              <h4 className="text-base sm:text-2xl font-extrabold text-slate-900 tracking-tight font-sans whitespace-nowrap overflow-hidden text-ellipsis">
                {loading ? '…' : fmt(stats.pendingRevenue)}
              </h4>
              <p className="text-[10px] sm:text-xs text-slate-400 mt-0.5 truncate">
                {stats.pendingCount > 0 ? `${stats.pendingCount} órdenes pendientes` : 'Sin pendientes'}
              </p>
            </div>
          </div>

        </div>

        {/* ═════════════════════════════════════════════════════════
            2. CONTROL BAR (SEARCH, STATUS PILLS, NEW SALE ACTION)
           ═════════════════════════════════════════════════════════ */}
        <div
          className="bg-white rounded-2xl border border-slate-200/80 p-3.5 sm:p-5 shadow-xs space-y-3"
          style={{ animation: 'slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) 280ms both' }}
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3">
            
            {/* Search Bar */}
            <div className="relative flex-1 w-full sm:max-w-md">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                className="w-full bg-slate-50/70 border border-slate-200 rounded-xl pl-10 pr-9 py-2 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-brand focus:ring-2 focus:ring-brand/10 transition-all outline-none"
                placeholder="Buscar por cliente, comprobante o teléfono…"
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

            {/* Sorting & Action Button Row */}
            <div className="flex items-center justify-between sm:justify-start gap-2 w-full sm:w-auto">
              <div className="flex items-center gap-1.5 bg-slate-50/70 border border-slate-200 rounded-xl px-2.5 py-1.5 flex-1 sm:flex-initial">
                <ArrowUpDown size={13} className="text-slate-400 shrink-0" />
                <span className="text-[11px] text-slate-400 font-medium shrink-0">Ordenar:</span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="bg-transparent text-xs text-slate-700 font-semibold outline-none cursor-pointer w-full"
                >
                  <option value="recent">Más recientes</option>
                  <option value="highest">Mayor importe</option>
                  <option value="lowest">Menor importe</option>
                </select>
              </div>

              <button
                onClick={openCreate}
                className="inline-flex items-center justify-center gap-1.5 bg-brand hover:bg-brand-hover active:scale-95 text-white font-semibold text-xs sm:text-sm px-3.5 py-2 sm:px-4 sm:py-2.5 rounded-xl transition-all shadow-sm shrink-0"
              >
                <Plus size={15} />
                <span>Nueva Venta</span>
              </button>
            </div>
          </div>

          {/* Quick Status Filter Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs pt-2 border-t border-slate-100 no-scrollbar -mx-1 px-1">
            <span className="text-[11px] font-semibold uppercase text-slate-400 mr-1 shrink-0 flex items-center gap-1">
              <Filter size={12} /> Estado:
            </span>

            {[
              { id: 'ALL', label: `Todas (${sales.length})` },
              { id: 'pagado', label: `Pagadas (${stats.paidCount})`, color: 'text-emerald-700' },
              { id: 'pendiente', label: `Pendientes (${stats.pendingCount})`, color: 'text-amber-700' },
            ].map((tab) => {
              const active = statusFilter === tab.id
              return (
                <button
                  key={tab.id}
                  onClick={() => setStatusFilter(tab.id)}
                  className={`px-3 py-1.5 rounded-xl font-medium transition-all whitespace-nowrap shrink-0 ${
                    active
                      ? 'bg-brand text-white shadow-xs font-semibold'
                      : 'bg-slate-100/70 text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  {tab.label}
                </button>
              )
            })}
          </div>
        </div>

        {/* ═════════════════════════════════════════════════════════
            3. SALES LEDGER (TABLE & MOBILE FEED)
           ═════════════════════════════════════════════════════════ */}
        {loading ? (
          <div className="bg-white rounded-2xl border border-slate-200/80 p-16 flex flex-col items-center justify-center text-center shadow-xs">
            <div className="w-10 h-10 rounded-full border-2 border-brand border-t-transparent animate-spin mb-3" />
            <p className="text-xs font-semibold text-slate-600">Cargando libro de ventas…</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200/80 p-8 shadow-xs">
            <EmptyState
              icon={ShoppingCart}
              title="Sin transacciones comerciales"
              description={
                search || statusFilter !== 'ALL'
                  ? 'No hay ventas que coincidan con los filtros aplicados.'
                  : 'Registra tu primera venta para emitir comprobantes y descontar existencias.'
              }
              action={
                search || statusFilter !== 'ALL' ? (
                  <button
                    onClick={() => {
                      setSearch('')
                      setStatusFilter('ALL')
                    }}
                    className="btn-secondary text-xs"
                  >
                    Restablecer filtros
                  </button>
                ) : (
                  <button onClick={openCreate} className="btn-primary text-xs">
                    <Plus size={15} /> Registrar venta
                  </button>
                )
              }
            />
          </div>
        ) : (
          <div
            className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-xs"
            style={{ animation: 'slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) 320ms both' }}
          >
            {/* Mobile View */}
            <div className="block sm:hidden divide-y divide-slate-100">
              {filtered.map((s) => {
                const client = getClientLabel(s)
                const totalAmount = salesService.saleTotal(s)
                const itemsCount = s.items?.reduce((acc, it) => acc + (Number(it.quantity) || 1), 0) || 0
                const ticketId = `#B001-${s.id ? s.id.toString().slice(-6).toUpperCase() : '000001'}`

                return (
                  <div
                    key={s.id}
                    onClick={() => setViewing(s)}
                    className="p-4 space-y-2.5 hover:bg-slate-50 active:bg-slate-100 transition-colors cursor-pointer card-mobile-active"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono font-bold text-xs bg-slate-100 px-2 py-0.5 rounded-lg border border-slate-200 text-slate-700">
                        {ticketId}
                      </span>
                      <StatusBadge status={s.status || 'pagado'} />
                    </div>

                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-900 text-sm truncate">{client}</p>
                        <p className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-1.5">
                          <Clock size={11} />
                          <span>
                            {new Date(s.created_at).toLocaleString('es-PE', {
                              dateStyle: 'short',
                              timeStyle: 'short'
                            })}
                          </span>
                          <span>•</span>
                          <span>{itemsCount} art.</span>
                        </p>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="font-mono font-extrabold text-base text-slate-900 block">
                          {fmt(totalAmount)}
                        </span>
                        <span className="inline-flex items-center gap-0.5 text-[11px] font-bold text-brand mt-0.5">
                          Ver boleta <ChevronRight size={12} />
                        </span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Desktop View */}
            <div className="overflow-x-auto hidden sm:block">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200/80 bg-slate-50/70 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    <th className="py-3 px-4">Comprobante</th>
                    <th className="py-3 px-4">Fecha y Hora</th>
                    <th className="py-3 px-4">Cliente</th>
                    <th className="py-3 px-4 text-center">Artículos</th>
                    <th className="py-3 px-4 text-right">Total</th>
                    <th className="py-3 px-4 text-center">Estado</th>
                    <th className="py-3 px-4 text-right">Comprobante</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {filtered.map((s) => {
                    const client = getClientLabel(s)
                    const totalAmount = salesService.saleTotal(s)
                    const itemsCount = s.items?.reduce((acc, it) => acc + (Number(it.quantity) || 1), 0) || 0
                    const ticketId = `#B001-${s.id ? s.id.toString().slice(-6).toUpperCase() : '000001'}`

                    return (
                      <tr
                        key={s.id}
                        onClick={() => setViewing(s)}
                        className="hover:bg-slate-50/80 transition-colors cursor-pointer group"
                      >
                        {/* Ticket Code */}
                        <td className="py-3.5 px-4 font-mono font-bold text-slate-700">
                          <span className="bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200/70 group-hover:border-brand/40 group-hover:text-brand transition-colors">
                            {ticketId}
                          </span>
                        </td>

                        {/* Date & Time */}
                        <td className="py-3.5 px-4 text-slate-600">
                          <span className="font-mono text-xs">
                            {new Date(s.created_at).toLocaleString('es-PE', {
                              dateStyle: 'short',
                              timeStyle: 'short'
                            })}
                          </span>
                        </td>

                        {/* Client */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-xs font-bold text-brand shrink-0 font-display">
                              {getInitials(client)}
                            </div>
                            <span className="font-semibold text-slate-900 text-sm group-hover:text-brand transition-colors">
                              {client}
                            </span>
                          </div>
                        </td>

                        {/* Items Count */}
                        <td className="py-3.5 px-4 text-center font-mono">
                          <span className="bg-slate-100 px-2 py-0.5 rounded-lg text-slate-700 font-semibold">
                            {itemsCount} uds.
                          </span>
                        </td>

                        {/* Total Amount */}
                        <td className="py-3.5 px-4 text-right font-mono font-extrabold text-sm text-slate-900">
                          {fmt(totalAmount)}
                        </td>

                        {/* Status Badge */}
                        <td className="py-3.5 px-4 text-center">
                          <StatusBadge status={s.status || 'pagado'} />
                        </td>

                        {/* Action: Open Ticket */}
                        <td className="py-3.5 px-4 text-right">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              setViewing(s)
                            }}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs shadow-xs group-hover:border-brand group-hover:text-brand transition-all"
                          >
                            <Receipt size={13} />
                            <span>Boleta</span>
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Table Footer */}
            <div className="p-3 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <span>
                Mostrando <strong>{filtered.length}</strong> de <strong>{sales.length}</strong> ventas
              </span>
              <span>Libro Mayor de Ventas y Comprobantes</span>
            </div>
          </div>
        )}

      </div>

      {/* ═════════════════════════════════════════════════════════
          4. NEW SALE MODAL (ENHANCED POS CASHIER WORKFLOW)
         ═════════════════════════════════════════════════════════ */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Emitir Nueva Venta"
        width="max-w-2xl"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* Customer info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="label flex items-center gap-1">
                <User size={12} /> Nombre del Cliente *
              </label>
              <input
                className="field"
                placeholder="Ej. Juan Pérez / Empresa SAC"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                autoFocus
                required
              />
            </div>
            <div>
              <label className="label flex items-center gap-1">
                <Phone size={12} /> Teléfono / DNI / RUC
              </label>
              <input
                className="field font-mono"
                placeholder="987 654 321"
                value={clientPhone}
                onChange={(e) => setClientPhone(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="label">Condición de Pago</label>
              <select
                className="field"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                <option value="pagado">Pagado (Al contado)</option>
                <option value="pendiente">Pendiente (A crédito)</option>
              </select>
            </div>
            <div>
              <label className="label">Descuento Global (S/)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                className="field font-mono"
                placeholder="0.00"
                value={discount}
                onChange={(e) => setDiscount(e.target.value)}
              />
            </div>
          </div>

          {/* Line items section */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="label mb-0 flex items-center gap-1.5">
                <Package size={13} /> Artículos de la Orden
              </label>
              <button
                type="button"
                onClick={addItemRow}
                className="text-xs text-brand hover:underline font-bold flex items-center gap-1"
              >
                <Plus size={14} /> Agregar otro producto
              </button>
            </div>

            <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
              {items.map((it, idx) => {
                const prod = products.find((p) => p.id === it.product_id)
                const lineTotal = prod ? Number(prod.sale_price) * Number(it.quantity || 0) : 0
                const isOutOfStock = prod && Number(prod.stock) < Number(it.quantity || 1)

                return (
                  <div
                    key={idx}
                    className="flex flex-col sm:flex-row sm:items-center gap-2.5 bg-slate-50 border border-slate-200 p-3 rounded-2xl"
                  >
                    {/* Product Select */}
                    <div className="flex-1 min-w-0">
                      <select
                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs sm:text-sm text-slate-800 font-medium focus:outline-none focus:border-brand"
                        value={it.product_id}
                        onChange={(e) => updateItem(idx, { product_id: e.target.value })}
                        required
                      >
                        <option value="">Selecciona un producto del catálogo…</option>
                        {products.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.sku} — {p.name} ({fmt(p.sale_price)} | Stock: {p.stock})
                          </option>
                        ))}
                      </select>

                      {prod && (
                        <div className="flex items-center justify-between text-[11px] text-slate-400 mt-1 px-1">
                          <span>
                            Precio: <strong className="text-slate-700">{fmt(prod.sale_price)}</strong>
                          </span>
                          <span className={isOutOfStock ? 'text-red-600 font-bold' : 'text-slate-500'}>
                            Stock disponible: {prod.stock} {prod.unit}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Quantity + Line Total + Delete */}
                    <div className="flex items-center justify-between sm:justify-start gap-2.5 shrink-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs text-slate-400 sm:hidden">Cant:</span>
                        <input
                          type="number"
                          min="1"
                          className="w-16 sm:w-20 bg-white border border-slate-200 rounded-xl py-2 text-center text-xs sm:text-sm font-mono font-bold text-slate-900 focus:outline-none focus:border-brand"
                          value={it.quantity}
                          onChange={(e) => updateItem(idx, { quantity: e.target.value })}
                          required
                        />
                      </div>

                      <span className="w-24 text-right font-mono font-bold text-xs sm:text-sm text-slate-900">
                        {fmt(lineTotal)}
                      </span>

                      {items.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeItemRow(idx)}
                          className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                        >
                          <Trash2 size={15} />
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Financial summary box */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-1.5">
            <div className="flex justify-between items-center text-xs text-slate-500">
              <span>Subtotal:</span>
              <span className="font-mono text-slate-800 font-bold">{fmt(subtotal)}</span>
            </div>
            {Number(discount) > 0 && (
              <div className="flex justify-between items-center text-xs text-amber-600 font-medium">
                <span>Descuento aplicado:</span>
                <span className="font-mono">-{fmt(Number(discount))}</span>
              </div>
            )}
            <div className="flex justify-between items-center text-sm font-extrabold text-slate-900 pt-2 border-t border-slate-200">
              <span className="text-xs uppercase tracking-wider">Total a Liquidar:</span>
              <span className="text-lg font-mono text-brand font-black">{fmt(total)}</span>
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 text-xs font-semibold text-red-700 bg-red-50 border border-red-200 rounded-xl p-3">
              <AlertCircle size={15} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex justify-end gap-2.5 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="btn-secondary"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="btn-primary"
            >
              {saving ? 'Registrando venta…' : 'Emitir y Generar Boleta'}
            </button>
          </div>
        </form>
      </Modal>

      {/* ═════════════════════════════════════════════════════════
          5. VIEW BOLETA / RECEIPT MODAL
         ═════════════════════════════════════════════════════════ */}
      <Modal
        open={!!viewing}
        onClose={() => setViewing(null)}
        title="Comprobante de Venta"
        width="max-w-md"
      >
        {viewing && (
          <ReceiptModal
            sale={viewing}
            client={clients.find((c) => c.id === viewing.client_id) || viewing.client}
            products={products}
            company={company}
          />
        )}
      </Modal>

    </AppLayout>
  )
}
