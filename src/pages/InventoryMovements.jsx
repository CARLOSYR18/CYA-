import { useEffect, useMemo, useState } from 'react'
import {
  Plus, Pencil, ArrowDownCircle, ArrowUpCircle, ArrowLeftRight,
  Trash2, Search, X, Filter, ArrowUpDown, Package,
  Layers, Clock, AlertTriangle, FileText, CheckCircle2,
  TrendingUp, TrendingDown, HelpCircle
} from 'lucide-react'
import AppLayout from '../components/layout/AppLayout'
import Modal from '../components/ui/Modal'
import EmptyState from '../components/ui/EmptyState'
import { inventoryMovementsService } from '../services/inventoryMovementsService'
import { productsService } from '../services/productsService'

const emptyForm = {
  product_id: '',
  type: 'entrada',
  quantity: '',
  reason: '',
  reference: ''
}

const QUICK_REASONS = {
  entrada: ['Ingreso de mercadería', 'Devolución de cliente', 'Ajuste de inventario (+)', 'Reconteo de stock'],
  salida: ['Ajuste por merma / daño', 'Uso interno / muestra', 'Ajuste de inventario (-)', 'Devolución a proveedor']
}

const TypeBadge = ({ type }) =>
  type === 'entrada' ? (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-xs">
      <ArrowDownCircle size={13} className="text-emerald-600" />
      <span>Ingreso (+ Entrada)</span>
    </span>
  ) : (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200 shadow-xs">
      <ArrowUpCircle size={13} className="text-rose-600" />
      <span>Egreso (- Salida)</span>
    </span>
  )

export default function InventoryMovements() {
  const [movements, setMovements] = useState([])
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)

  // Filters & Sorting
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('ALL') // 'ALL' | 'entrada' | 'salida'
  const [sortBy, setSortBy] = useState('recent') // 'recent' | 'highest' | 'lowest'

  // Modals & Form
  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [editing, setEditing] = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(null)

  async function loadAll() {
    setLoading(true)
    try {
      const [m, p] = await Promise.all([
        inventoryMovementsService.list(),
        productsService.list()
      ])
      setMovements(m || [])
      setProducts(p || [])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadAll()
  }, [])

  /* ─── Metrics ─── */
  const stats = useMemo(() => {
    const totalCount = movements.length
    const entries = movements.filter((m) => m.type === 'entrada')
    const exits = movements.filter((m) => m.type === 'salida')

    const totalInUnits = entries.reduce((sum, m) => sum + (Number(m.quantity) || 0), 0)
    const totalOutUnits = exits.reduce((sum, m) => sum + (Number(m.quantity) || 0), 0)
    const netBalance = totalInUnits - totalOutUnits

    return {
      totalCount,
      entriesCount: entries.length,
      exitsCount: exits.length,
      totalInUnits,
      totalOutUnits,
      netBalance
    }
  }, [movements])

  /* ─── Filtered & Sorted Movements ─── */
  const filtered = useMemo(() => {
    let result = [...movements]

    const q = search.trim().toLowerCase()
    if (q) {
      result = result.filter((m) => {
        const prod = products.find((p) => p.id === m.product_id)
        const pName = (prod?.name || '').toLowerCase()
        const pSku = (prod?.sku || '').toLowerCase()
        const reason = (m.reason || '').toLowerCase()
        const ref = (m.reference || '').toLowerCase()
        return pName.includes(q) || pSku.includes(q) || reason.includes(q) || ref.includes(q)
      })
    }

    if (typeFilter !== 'ALL') {
      result = result.filter((m) => m.type === typeFilter)
    }

    if (sortBy === 'recent') {
      result.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    } else if (sortBy === 'highest') {
      result.sort((a, b) => (Number(b.quantity) || 0) - (Number(a.quantity) || 0))
    } else if (sortBy === 'lowest') {
      result.sort((a, b) => (Number(a.quantity) || 0) - (Number(b.quantity) || 0))
    }

    return result
  }, [movements, products, search, typeFilter, sortBy])

  function openCreate() {
    setEditing(null)
    setForm(emptyForm)
    setError('')
    setModalOpen(true)
  }

  function openEdit(m) {
    setEditing(m)
    setForm({
      product_id: m.product_id,
      type: m.type,
      quantity: String(m.quantity),
      reason: m.reason || '',
      reference: m.reference || ''
    })
    setError('')
    setModalOpen(true)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (!form.product_id) {
      setError('Selecciona un producto del catálogo')
      return
    }
    const qty = Number(form.quantity)
    if (!qty || qty <= 0) {
      setError('La cantidad debe ser mayor a 0')
      return
    }

    const prod = products.find((p) => p.id === form.product_id)
    if (form.type === 'salida' && prod && !editing && qty > Number(prod.stock)) {
      setError(`Stock insuficiente. Intentas retirar ${qty} uds., pero solo hay ${prod.stock} disponibles.`)
      return
    }

    setSaving(true)
    try {
      const payload = {
        product_id: form.product_id,
        type: form.type,
        quantity: qty,
        reason: form.reason.trim() || (form.type === 'entrada' ? 'Ingreso manual' : 'Salida manual'),
        reference: form.reference.trim()
      }
      if (editing) await inventoryMovementsService.update(editing, payload)
      else await inventoryMovementsService.register(payload)
      setModalOpen(false)
      loadAll()
    } catch (err) {
      setError(err.message || 'No se pudo guardar el movimiento')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    try {
      await inventoryMovementsService.remove(confirmDelete)
    } catch (err) {
      console.error(err)
    }
    setConfirmDelete(null)
    loadAll()
  }

  const productName = (id) => products.find((p) => p.id === id)?.name || 'Producto no encontrado'
  const productSku = (id) => products.find((p) => p.id === id)?.sku || '—'
  const productUnit = (id) => products.find((p) => p.id === id)?.unit || 'uds.'

  // Selected product in form for dynamic preview
  const selectedFormProduct = products.find((p) => p.id === form.product_id)
  const currentStock = selectedFormProduct ? Number(selectedFormProduct.stock) || 0 : 0
  const qtyInput = Number(form.quantity) || 0
  const projectedStock =
    form.type === 'entrada' ? currentStock + qtyInput : Math.max(currentStock - qtyInput, 0)

  return (
    <AppLayout title="Control de Movimientos de Stock">
      <div className="space-y-6 max-w-7xl mx-auto pb-12">

        {/* ═════════════════════════════════════════════════════════
            1. EXECUTIVE METRICS BAR (4 CRISP WHITE CARDS)
           ═════════════════════════════════════════════════════════ */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
          
          {/* Card 1: Total Movimientos */}
          <div
            className="bg-white rounded-2xl border border-slate-200/80 p-3 sm:p-4.5 shadow-xs flex flex-col justify-between card-mobile-active active:scale-[0.98] transition-all hover:border-slate-300"
            style={{ animation: 'slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) 40ms both' }}
          >
            <div className="flex items-center justify-between gap-1.5 mb-1.5 sm:mb-2">
              <p className="text-[10px] sm:text-[11px] font-bold text-slate-500 uppercase tracking-wider truncate">
                Movimientos Totales
              </p>
              <div className="w-7 h-7 sm:w-9 sm:h-9 rounded-lg sm:rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-brand shrink-0">
                <ArrowLeftRight size={14} className="sm:hidden" />
                <ArrowLeftRight size={18} className="hidden sm:block" />
              </div>
            </div>
            <div>
              <h4 className="text-base sm:text-2xl font-extrabold text-slate-900 tracking-tight font-sans whitespace-nowrap overflow-hidden text-ellipsis">
                {loading ? '…' : `${stats.totalCount}`}
              </h4>
              <p className="text-[10px] sm:text-xs text-slate-400 mt-0.5 truncate">
                Operaciones registradas
              </p>
            </div>
          </div>

          {/* Card 2: Ingresos / Entradas */}
          <div
            className="bg-white rounded-2xl border border-slate-200/80 p-3 sm:p-4.5 shadow-xs flex flex-col justify-between card-mobile-active active:scale-[0.98] transition-all hover:border-slate-300"
            style={{ animation: 'slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) 100ms both' }}
          >
            <div className="flex items-center justify-between gap-1.5 mb-1.5 sm:mb-2">
              <p className="text-[10px] sm:text-[11px] font-bold text-slate-500 uppercase tracking-wider truncate">
                Entradas a Bodega
              </p>
              <div className="w-7 h-7 sm:w-9 sm:h-9 rounded-lg sm:rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
                <ArrowDownCircle size={14} className="sm:hidden" />
                <ArrowDownCircle size={18} className="hidden sm:block" />
              </div>
            </div>
            <div>
              <h4 className="text-base sm:text-2xl font-extrabold text-emerald-600 tracking-tight font-sans whitespace-nowrap overflow-hidden text-ellipsis">
                {loading ? '…' : `+${stats.totalInUnits} uds.`}
              </h4>
              <p className="text-[10px] sm:text-xs text-slate-400 mt-0.5 truncate">
                {stats.entriesCount} ingresos manuales
              </p>
            </div>
          </div>

          {/* Card 3: Egresos / Salidas */}
          <div
            className="bg-white rounded-2xl border border-slate-200/80 p-3 sm:p-4.5 shadow-xs flex flex-col justify-between card-mobile-active active:scale-[0.98] transition-all hover:border-slate-300"
            style={{ animation: 'slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) 160ms both' }}
          >
            <div className="flex items-center justify-between gap-1.5 mb-1.5 sm:mb-2">
              <p className="text-[10px] sm:text-[11px] font-bold text-slate-500 uppercase tracking-wider truncate">
                Salidas / Mermas
              </p>
              <div className="w-7 h-7 sm:w-9 sm:h-9 rounded-lg sm:rounded-xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600 shrink-0">
                <ArrowUpCircle size={14} className="sm:hidden" />
                <ArrowUpCircle size={18} className="hidden sm:block" />
              </div>
            </div>
            <div>
              <h4 className="text-base sm:text-2xl font-extrabold text-rose-600 tracking-tight font-sans whitespace-nowrap overflow-hidden text-ellipsis">
                {loading ? '…' : `-${stats.totalOutUnits} uds.`}
              </h4>
              <p className="text-[10px] sm:text-xs text-slate-400 mt-0.5 truncate">
                {stats.exitsCount} egresos registrados
              </p>
            </div>
          </div>

          {/* Card 4: Balance Neto */}
          <div
            className="bg-white rounded-2xl border border-slate-200/80 p-3 sm:p-4.5 shadow-xs flex flex-col justify-between card-mobile-active active:scale-[0.98] transition-all hover:border-slate-300"
            style={{ animation: 'slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) 220ms both' }}
          >
            <div className="flex items-center justify-between gap-1.5 mb-1.5 sm:mb-2">
              <p className="text-[10px] sm:text-[11px] font-bold text-slate-500 uppercase tracking-wider truncate">
                Balance Operativo
              </p>
              <div className="w-7 h-7 sm:w-9 sm:h-9 rounded-lg sm:rounded-xl bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-600 shrink-0">
                <Package size={14} className="sm:hidden" />
                <Package size={18} className="hidden sm:block" />
              </div>
            </div>
            <div>
              <h4 className="text-base sm:text-2xl font-extrabold text-slate-900 tracking-tight font-sans whitespace-nowrap overflow-hidden text-ellipsis">
                {loading ? '…' : `${stats.netBalance >= 0 ? `+${stats.netBalance}` : stats.netBalance} uds.`}
              </h4>
              <p className="text-[10px] sm:text-xs text-slate-400 mt-0.5 truncate">Diferencial neto</p>
            </div>
          </div>

        </div>

        {/* ═════════════════════════════════════════════════════════
            2. CONTROL BAR (SEARCH, TYPE CHIPS, SORT, NEW ACTION)
           ═════════════════════════════════════════════════════════ */}
        <div
          className="bg-white rounded-2xl border border-slate-200/80 p-3.5 sm:p-5 shadow-xs space-y-3"
          style={{ animation: 'slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) 280ms both' }}
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3">
            
            {/* Search Input */}
            <div className="relative flex-1 w-full sm:max-w-md">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                className="w-full bg-slate-50/70 border border-slate-200 rounded-xl pl-10 pr-9 py-2 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-brand focus:ring-2 focus:ring-brand/10 transition-all outline-none"
                placeholder="Buscar por producto, motivo o ref…"
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

            {/* Sorting & Action Button */}
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
                  <option value="highest">Mayor volumen</option>
                  <option value="lowest">Menor volumen</option>
                </select>
              </div>

              <button
                onClick={openCreate}
                className="inline-flex items-center justify-center gap-1.5 bg-brand hover:bg-brand-hover active:scale-95 text-white font-semibold text-xs sm:text-sm px-3.5 py-2 sm:px-4 sm:py-2.5 rounded-xl transition-all shadow-sm shrink-0"
              >
                <Plus size={15} />
                <span>Movimiento</span>
              </button>
            </div>
          </div>

          {/* Quick Filter Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs pt-2 border-t border-slate-100 no-scrollbar -mx-1 px-1">
            <span className="text-[11px] font-semibold uppercase text-slate-400 mr-1 shrink-0 flex items-center gap-1">
              <Filter size={12} /> Tipo:
            </span>

            {[
              { id: 'ALL', label: `Todos (${movements.length})` },
              { id: 'entrada', label: `Ingresos / Entradas (${stats.entriesCount})`, color: 'text-emerald-700' },
              { id: 'salida', label: `Egresos / Salidas (${stats.exitsCount})`, color: 'text-rose-700' },
            ].map((tab) => {
              const active = typeFilter === tab.id
              return (
                <button
                  key={tab.id}
                  onClick={() => setTypeFilter(tab.id)}
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
            3. MOVEMENTS LEDGER (TABLE & MOBILE FEED)
           ═════════════════════════════════════════════════════════ */}
        {loading ? (
          <div className="bg-white rounded-2xl border border-slate-200/80 p-16 flex flex-col items-center justify-center text-center shadow-xs">
            <div className="w-10 h-10 rounded-full border-2 border-brand border-t-transparent animate-spin mb-3" />
            <p className="text-xs font-semibold text-slate-600">Cargando libro de movimientos…</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200/80 p-8 shadow-xs">
            <EmptyState
              icon={ArrowLeftRight}
              title="Sin movimientos registrados"
              description={
                search || typeFilter !== 'ALL'
                  ? 'No se encontraron movimientos que coincidan con los filtros seleccionados.'
                  : 'Registra entradas o salidas manuales para ajustar existencias de tu inventario.'
              }
              action={
                search || typeFilter !== 'ALL' ? (
                  <button
                    onClick={() => {
                      setSearch('')
                      setTypeFilter('ALL')
                    }}
                    className="btn-secondary text-xs"
                  >
                    Restablecer filtros
                  </button>
                ) : (
                  <button onClick={openCreate} className="btn-primary text-xs">
                    <Plus size={15} /> Registrar movimiento
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
              {filtered.map((m) => {
                const isEntry = m.type === 'entrada'
                return (
                  <div key={m.id} className="p-4 space-y-2.5 hover:bg-slate-50/80 transition-colors">
                    <div className="flex items-center justify-between gap-2">
                      <TypeBadge type={m.type} />
                      <span className="text-[11px] text-slate-400 font-mono">
                        {new Date(m.created_at).toLocaleString('es-PE', {
                          dateStyle: 'short',
                          timeStyle: 'short'
                        })}
                      </span>
                    </div>

                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-900 text-sm leading-snug truncate">
                          {productName(m.product_id)}
                        </p>
                        <p className="font-mono text-xs text-slate-400 mt-0.5">
                          SKU: {productSku(m.product_id)}
                        </p>
                      </div>
                      <span
                        className={`font-mono font-extrabold text-base shrink-0 ${
                          isEntry ? 'text-emerald-600' : 'text-rose-600'
                        }`}
                      >
                        {isEntry ? `+${m.quantity}` : `-${m.quantity}`} {productUnit(m.product_id)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-100 text-slate-500">
                      <span className="truncate max-w-[200px] italic">
                        {m.reason || 'Sin motivo detallado'}
                      </span>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {m.reference && (
                          <span className="font-mono text-[11px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-lg border border-slate-200">
                            #{m.reference}
                          </span>
                        )}
                        <button
                          onClick={() => openEdit(m)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-brand hover:bg-blue-50 transition-colors"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          onClick={() => setConfirmDelete(m)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                        >
                          <Trash2 size={14} />
                        </button>
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
                    <th className="py-3 px-4">Fecha y Hora</th>
                    <th className="py-3 px-4">Producto Afectado</th>
                    <th className="py-3 px-4 text-center">Tipo de Movimiento</th>
                    <th className="py-3 px-4 text-right">Cantidad</th>
                    <th className="py-3 px-4">Motivo / Justificación</th>
                    <th className="py-3 px-4 text-center">Referencia</th>
                    <th className="py-3 px-4 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {filtered.map((m) => {
                    const isEntry = m.type === 'entrada'
                    return (
                      <tr key={m.id} className="hover:bg-slate-50/80 transition-colors group">
                        {/* Date */}
                        <td className="py-3.5 px-4 font-mono text-slate-600">
                          {new Date(m.created_at).toLocaleString('es-PE', {
                            dateStyle: 'short',
                            timeStyle: 'short'
                          })}
                        </td>

                        {/* Product */}
                        <td className="py-3.5 px-4">
                          <p className="font-semibold text-slate-900 text-sm">
                            {productName(m.product_id)}
                          </p>
                          <p className="font-mono text-[11px] text-slate-400">
                            {productSku(m.product_id)}
                          </p>
                        </td>

                        {/* Type Badge */}
                        <td className="py-3.5 px-4 text-center">
                          <TypeBadge type={m.type} />
                        </td>

                        {/* Quantity */}
                        <td
                          className={`py-3.5 px-4 text-right font-mono font-extrabold text-sm ${
                            isEntry ? 'text-emerald-600' : 'text-rose-600'
                          }`}
                        >
                          {isEntry ? `+${m.quantity}` : `-${m.quantity}`} {productUnit(m.product_id)}
                        </td>

                        {/* Reason */}
                        <td className="py-3.5 px-4 text-slate-700 font-medium">
                          {m.reason || <span className="text-slate-400 italic">Sin motivo</span>}
                        </td>

                        {/* Reference */}
                        <td className="py-3.5 px-4 text-center font-mono">
                          {m.reference ? (
                            <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded-lg border border-slate-200">
                              #{m.reference}
                            </span>
                          ) : (
                            <span className="text-slate-300">—</span>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => openEdit(m)}
                              title="Editar movimiento"
                              className="p-1.5 rounded-lg text-slate-400 hover:text-brand hover:bg-blue-50 transition-colors"
                            >
                              <Pencil size={15} />
                            </button>
                            <button
                              onClick={() => setConfirmDelete(m)}
                              title="Eliminar y revertir stock"
                              className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
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
                Mostrando <strong>{filtered.length}</strong> de <strong>{movements.length}</strong> movimientos
              </span>
              <span>Libro Mayor de Almacén CYA</span>
            </div>
          </div>
        )}

      </div>

      {/* ═════════════════════════════════════════════════════════
          4. CREATE / EDIT MOVEMENT MODAL
         ═════════════════════════════════════════════════════════ */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Editar Movimiento de Stock' : 'Registrar Operación de Almacén'}
        width="max-w-xl"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* Movement Type Toggle */}
          <div>
            <label className="label">Tipo de Movimiento *</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setForm({ ...form, type: 'entrada' })}
                className={`py-3 px-4 rounded-2xl text-xs sm:text-sm font-bold border transition-all flex items-center justify-center gap-2 ${
                  form.type === 'entrada'
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-300 ring-2 ring-emerald-100'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
              >
                <ArrowDownCircle size={16} />
                <span>Entrada (Ingreso de Stock)</span>
              </button>

              <button
                type="button"
                onClick={() => setForm({ ...form, type: 'salida' })}
                className={`py-3 px-4 rounded-2xl text-xs sm:text-sm font-bold border transition-all flex items-center justify-center gap-2 ${
                  form.type === 'salida'
                    ? 'bg-rose-50 text-rose-700 border-rose-300 ring-2 ring-rose-100'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
              >
                <ArrowUpCircle size={16} />
                <span>Salida (Merma / Ajuste)</span>
              </button>
            </div>
          </div>

          {/* Product Select */}
          <div>
            <label className="label">Producto Afectado *</label>
            <select
              className="field"
              value={form.product_id}
              onChange={(e) => setForm({ ...form, product_id: e.target.value })}
              required
            >
              <option value="">Selecciona un producto del inventario…</option>
              {products
                .filter((p) => !p.is_kit)
                .map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.sku} — {p.name} (Stock actual: {p.stock} {p.unit})
                  </option>
                ))}
            </select>
            <p className="text-[11px] text-slate-400 mt-1">
              Nota: Los combos descuentan automáticamente de sus productos base.
            </p>
          </div>

          {/* Quantity */}
          <div>
            <label className="label">Cantidad de Unidades *</label>
            <input
              type="number"
              min="1"
              className="field font-mono font-bold text-slate-900 text-sm"
              placeholder="Ej. 10"
              value={form.quantity}
              onChange={(e) => setForm({ ...form, quantity: e.target.value })}
              required
            />
          </div>

          {/* Real-time Dynamic Stock Projection Box */}
          {selectedFormProduct && qtyInput > 0 && (
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 space-y-1.5 text-xs">
              <p className="font-semibold text-slate-700 flex items-center gap-1.5">
                <TrendingUp size={14} className="text-brand" />
                <span>Simulación de Impacto en Almacén:</span>
              </p>
              <div className="flex items-center justify-between text-slate-600 font-mono pt-1">
                <span>Stock actual: <strong>{currentStock} uds.</strong></span>
                <span>Operación: <strong className={form.type === 'entrada' ? 'text-emerald-600' : 'text-rose-600'}>{form.type === 'entrada' ? `+${qtyInput}` : `-${qtyInput}`} uds.</strong></span>
                <span>Stock resultante: <strong className="text-brand font-black">{projectedStock} uds.</strong></span>
              </div>
            </div>
          )}

          {/* Reason & Quick Chips */}
          <div>
            <label className="label">Motivo o Justificación</label>
            <input
              className="field mb-2"
              placeholder="Ej. Ajuste de stock mensual, producto dañado, ingreso de lote…"
              value={form.reason}
              onChange={(e) => setForm({ ...form, reason: e.target.value })}
            />
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[10px] uppercase font-bold text-slate-400">Sugerencias:</span>
              {QUICK_REASONS[form.type].map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setForm({ ...form, reason: r })}
                  className="text-[11px] bg-slate-100 hover:bg-slate-200 text-slate-700 px-2 py-0.5 rounded-lg transition-colors"
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          {/* Reference / Document Code */}
          <div>
            <label className="label">N° de Documento / Referencia (Opcional)</label>
            <input
              className="field font-mono"
              placeholder="Ej. GUIA-00234, FACT-881, TICKET-99"
              value={form.reference}
              onChange={(e) => setForm({ ...form, reference: e.target.value })}
            />
          </div>

          {error && (
            <p className="text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-200 rounded-xl p-3">
              {error}
            </p>
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
              {saving ? 'Guardando…' : editing ? 'Guardar Cambios' : 'Confirmar Movimiento'}
            </button>
          </div>
        </form>
      </Modal>

      {/* ═════════════════════════════════════════════════════════
          5. CONFIRM DELETE & REVERT MODAL
         ═════════════════════════════════════════════════════════ */}
      <Modal
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        title="Eliminar Movimiento y Revertir Stock"
        width="max-w-sm"
      >
        {confirmDelete && (
          <div className="space-y-4">
            <div className="bg-slate-50 rounded-2xl p-4 space-y-2 text-xs border border-slate-200">
              <div className="flex justify-between">
                <span className="text-slate-500">Producto:</span>
                <strong className="text-slate-900 text-right truncate max-w-[180px]">
                  {productName(confirmDelete.product_id)}
                </strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Tipo:</span>
                <TypeBadge type={confirmDelete.type} />
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Cantidad afectada:</span>
                <strong className="font-mono text-slate-900 font-bold">{confirmDelete.quantity} uds.</strong>
              </div>
            </div>

            <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-xl p-3">
              ⚠️ Esta acción eliminará el registro histórico y <strong>revertirá automáticamente el stock</strong> en el almacén.
            </p>

            <div className="flex justify-end gap-2.5 pt-2">
              <button
                onClick={() => setConfirmDelete(null)}
                className="btn-secondary"
              >
                Cancelar
              </button>
              <button
                onClick={handleDelete}
                className="btn-danger"
              >
                Eliminar y Revertir
              </button>
            </div>
          </div>
        )}
      </Modal>

    </AppLayout>
  )
}
