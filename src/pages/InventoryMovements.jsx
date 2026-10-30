import { useEffect, useMemo, useState } from 'react'
import {
  Plus, Pencil, ArrowDownLeft, ArrowUpRight, ArrowLeftRight,
  Trash2, Search, X, Filter, ArrowUpDown, Package,
  Clock, AlertTriangle, FileText, CheckCircle2,
  TrendingUp, TrendingDown, HelpCircle, FileSpreadsheet,
  Calendar, ChevronLeft, ChevronRight, Copy, Check,
  ShoppingCart, ShoppingBag, SlidersHorizontal, RefreshCw,
  Boxes, ShieldAlert, ArrowDownCircle, ArrowUpCircle
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
  entrada: [
    'Ingreso de mercadería',
    'Devolución de cliente',
    'Ajuste de inventario (+)',
    'Reconteo físico',
    'Producción terminada'
  ],
  salida: [
    'Ajuste por merma / daño',
    'Uso interno / muestra',
    'Ajuste de inventario (-)',
    'Devolución a proveedor',
    'Pérdida o caducidad'
  ]
}

/* ── Formateador de Fecha y Hora limpia (sin saltos raros) ── */
function formatDateTime(dateStr) {
  if (!dateStr) return { date: '—', time: '' }
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return { date: String(dateStr), time: '' }
  const date = d.toLocaleDateString('es-PE', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  })
  const time = d.toLocaleTimeString('es-PE', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  })
  return { date, time }
}

/* ── Badge de Tipo de Movimiento moderno ── */
const TypeBadge = ({ type }) =>
  type === 'entrada' ? (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200/80 dark:border-emerald-500/20 whitespace-nowrap shadow-2xs">
      <ArrowDownLeft size={13} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
      <span>Ingreso (+ Entrada)</span>
    </span>
  ) : (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-200/80 dark:border-rose-500/20 whitespace-nowrap shadow-2xs">
      <ArrowUpRight size={13} className="text-rose-600 dark:text-rose-400 shrink-0" />
      <span>Egreso (- Salida)</span>
    </span>
  )

/* ── Badge de Motivo / Concepto contextual ── */
const ReasonBadge = ({ reason }) => {
  if (!reason) {
    return <span className="text-slate-400 dark:text-slate-500 italic text-xs">Sin motivo especificado</span>
  }

  const lower = reason.toLowerCase()
  let icon = <FileText size={12} className="shrink-0 text-slate-500 dark:text-slate-400" />
  let color = 'text-slate-700 dark:text-slate-300 bg-slate-100/80 dark:bg-white/5 border-slate-200/80 dark:border-white/10'

  if (lower.includes('venta') || lower.includes('pedido') || lower.includes('orden')) {
    icon = <ShoppingCart size={12} className="shrink-0 text-blue-600 dark:text-blue-400" />
    color = 'text-blue-700 dark:text-blue-300 bg-blue-50/80 dark:bg-blue-500/10 border-blue-200/70 dark:border-blue-500/20'
  } else if (lower.includes('compra') || lower.includes('proveedor') || lower.includes('recepción') || lower.includes('mercadería')) {
    icon = <ShoppingBag size={12} className="shrink-0 text-emerald-600 dark:text-emerald-400" />
    color = 'text-emerald-700 dark:text-emerald-300 bg-emerald-50/80 dark:bg-emerald-500/10 border-emerald-200/70 dark:border-emerald-500/20'
  } else if (lower.includes('merma') || lower.includes('daño') || lower.includes('venc') || lower.includes('pérdida')) {
    icon = <AlertTriangle size={12} className="shrink-0 text-amber-600 dark:text-amber-400" />
    color = 'text-amber-700 dark:text-amber-300 bg-amber-50/80 dark:bg-amber-500/10 border-amber-200/70 dark:border-amber-500/20'
  } else if (lower.includes('ajuste') || lower.includes('edición') || lower.includes('reconteo')) {
    icon = <SlidersHorizontal size={12} className="shrink-0 text-indigo-600 dark:text-indigo-400" />
    color = 'text-indigo-700 dark:text-indigo-300 bg-indigo-50/80 dark:bg-indigo-500/10 border-indigo-200/70 dark:border-indigo-500/20'
  }

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border max-w-[280px] truncate ${color}`}>
      {icon}
      <span className="truncate" title={reason}>{reason}</span>
    </span>
  )
}

export default function InventoryMovements() {
  const [movements, setMovements] = useState([])
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)

  // Top bar & view controls
  const [showMetrics, setShowMetrics] = useState(true)

  // Filters & Sorting
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('ALL') // 'ALL' | 'entrada' | 'salida'
  const [sortBy, setSortBy] = useState('recent') // 'recent' | 'oldest' | 'highest' | 'lowest'

  // Date Range Filtering (Kardex Audit)
  const [datePreset, setDatePreset] = useState('ALL') // 'ALL' | 'TODAY' | 'WEEK' | 'MONTH' | 'CUSTOM'
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  // Pagination
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  // Reference copy feedback
  const [copiedRef, setCopiedRef] = useState(null)

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

  /* ─── Metrics Computations ─── */
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

    // Text search (Product name, SKU, reason, reference)
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

    // Type filter
    if (typeFilter !== 'ALL') {
      result = result.filter((m) => m.type === typeFilter)
    }

    // Date range filter
    if (datePreset === 'TODAY') {
      const startOfDay = new Date()
      startOfDay.setHours(0, 0, 0, 0)
      result = result.filter((m) => new Date(m.created_at) >= startOfDay)
    } else if (datePreset === 'WEEK') {
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      result = result.filter((m) => new Date(m.created_at) >= weekAgo)
    } else if (datePreset === 'MONTH') {
      const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      result = result.filter((m) => new Date(m.created_at) >= monthAgo)
    } else if (datePreset === 'CUSTOM') {
      if (dateFrom) {
        const fromD = new Date(dateFrom + 'T00:00:00')
        result = result.filter((m) => new Date(m.created_at) >= fromD)
      }
      if (dateTo) {
        const toD = new Date(dateTo + 'T23:59:59')
        result = result.filter((m) => new Date(m.created_at) <= toD)
      }
    }

    // Sorting
    if (sortBy === 'recent') {
      result.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    } else if (sortBy === 'oldest') {
      result.sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
    } else if (sortBy === 'highest') {
      result.sort((a, b) => (Number(b.quantity) || 0) - (Number(a.quantity) || 0))
    } else if (sortBy === 'lowest') {
      result.sort((a, b) => (Number(a.quantity) || 0) - (Number(b.quantity) || 0))
    }

    return result
  }, [movements, products, search, typeFilter, datePreset, dateFrom, dateTo, sortBy])

  // Reset pagination on filter change
  useEffect(() => {
    setCurrentPage(1)
  }, [search, typeFilter, datePreset, dateFrom, dateTo, sortBy, pageSize])

  // Paginated movements
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const paginatedMovements = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return filtered.slice(start, start + pageSize)
  }, [filtered, currentPage, pageSize])

  // Helper getters
  const getProduct = (id) => products.find((p) => p.id === id)
  const productName = (id) => getProduct(id)?.name || 'Producto no encontrado'
  const productSku = (id) => getProduct(id)?.sku || '—'
  const productUnit = (id) => getProduct(id)?.unit || 'uds.'
  const productImage = (id) => getProduct(id)?.image_url || null

  // Copy reference helper
  const handleCopyRef = (ref, e) => {
    e?.stopPropagation()
    if (!ref) return
    navigator.clipboard.writeText(ref)
    setCopiedRef(ref)
    setTimeout(() => setCopiedRef(null), 2000)
  }

  // Export to Excel / CSV
  const handleExportExcel = () => {
    const headers = ['Fecha', 'Hora', 'SKU', 'Producto', 'Tipo', 'Cantidad', 'Unidad', 'Motivo / Concepto', 'Referencia']
    const rows = filtered.map((m) => {
      const prod = getProduct(m.product_id)
      const { date, time } = formatDateTime(m.created_at)
      const typeLabel = m.type === 'entrada' ? 'Ingreso' : 'Egreso'
      const qty = m.type === 'entrada' ? `+${m.quantity}` : `-${m.quantity}`
      return [
        date,
        time,
        prod?.sku || '',
        `"${(prod?.name || 'Producto').replace(/"/g, '""')}"`,
        typeLabel,
        qty,
        prod?.unit || 'uds.',
        `"${(m.reason || '').replace(/"/g, '""')}"`,
        `"${(m.reference || '').replace(/"/g, '""')}"`
      ]
    })

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `kardex-movimientos-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  // Clear all filters
  const handleResetFilters = () => {
    setSearch('')
    setTypeFilter('ALL')
    setDatePreset('ALL')
    setDateFrom('')
    setDateTo('')
    setSortBy('recent')
  }

  const hasActiveFilters = search || typeFilter !== 'ALL' || datePreset !== 'ALL' || dateFrom || dateTo || sortBy !== 'recent'

  // Modal Handlers
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
      setError(`Stock insuficiente. Intentas retirar ${qty} uds., pero solo hay ${prod.stock} disponibles en inventario.`)
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
      setError(err.message || 'No se pudo registrar la operación de stock')
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

  // Selected product in form for dynamic calculation
  const selectedFormProduct = products.find((p) => p.id === form.product_id)
  const currentStock = selectedFormProduct ? Number(selectedFormProduct.stock) || 0 : 0
  const qtyInput = Number(form.quantity) || 0
  const projectedStock =
    form.type === 'entrada' ? currentStock + qtyInput : Math.max(currentStock - qtyInput, 0)

  return (
    <AppLayout title="Control de Movimientos de Inventario">
      <div className="space-y-4 max-w-7xl mx-auto pb-12">

        {/* ═════════════════════════════════════════════════════════
            TOP BAR WITH ACTIONS & NEW MOVEMENT BUTTON
           ═════════════════════════════════════════════════════════ */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-[#131627] p-4 sm:p-5 rounded-2xl border border-slate-200/80 dark:border-white/10 shadow-xs">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                <ArrowLeftRight size={18} />
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                Control de Movimientos
              </h1>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Libro Kardex: Registro cronológico de ingresos, egresos, ventas y ajustes manuales en almacén.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowMetrics((v) => !v)}
              className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 text-xs font-semibold text-slate-600 dark:text-slate-300 transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <TrendingUp size={14} />
              <span>{showMetrics ? 'Ocultar Métricas' : 'Ver Métricas'}</span>
            </button>

            <button
              onClick={handleExportExcel}
              className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
              title="Descargar Kardex en formato CSV / Excel"
            >
              <FileSpreadsheet size={14} />
              <span>Excel</span>
            </button>

            <button
              onClick={openCreate}
              className="px-4 py-2 rounded-xl bg-[#5550F2] hover:bg-[#4742E8] text-white text-xs font-bold flex items-center gap-1.5 shadow-sm hover:shadow-indigo-500/25 active:scale-95 transition-all cursor-pointer"
            >
              <Plus size={15} />
              <span>+ Registrar Movimiento</span>
            </button>
          </div>
        </div>

        {/* ═════════════════════════════════════════════════════════
            1. EXECUTIVE METRICS CARDS (LIGHT & DARK MODE READY)
           ═════════════════════════════════════════════════════════ */}
        {showMetrics && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4 animate-fade-in">
            
            {/* Card 1: Total Movimientos */}
            <div className="bg-white dark:bg-[#131627] rounded-2xl border border-slate-200/80 dark:border-white/10 p-3.5 sm:p-4.5 shadow-xs flex flex-col justify-between transition-all hover:border-slate-300 dark:hover:border-white/20">
              <div className="flex items-center justify-between gap-1.5 mb-2">
                <p className="text-[10.5px] font-bold text-slate-400 dark:text-slate-400 uppercase tracking-wider truncate">
                  Movimientos Totales
                </p>
                <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0">
                  <ArrowLeftRight size={16} />
                </div>
              </div>
              <div>
                <h4 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight font-sans">
                  {loading ? '…' : stats.totalCount}
                </h4>
                <p className="text-[11px] text-slate-400 mt-0.5 truncate">
                  {stats.entriesCount} ingresos · {stats.exitsCount} egresos
                </p>
              </div>
            </div>

            {/* Card 2: Entradas a Bodega */}
            <div className="bg-white dark:bg-[#131627] rounded-2xl border border-slate-200/80 dark:border-white/10 p-3.5 sm:p-4.5 shadow-xs flex flex-col justify-between transition-all hover:border-slate-300 dark:hover:border-white/20">
              <div className="flex items-center justify-between gap-1.5 mb-2">
                <p className="text-[10.5px] font-bold text-slate-400 dark:text-slate-400 uppercase tracking-wider truncate">
                  Entradas a Bodega
                </p>
                <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
                  <ArrowDownCircle size={16} />
                </div>
              </div>
              <div>
                <h4 className="text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400 tracking-tight font-sans">
                  {loading ? '…' : `+${stats.totalInUnits.toLocaleString('es-PE')} uds.`}
                </h4>
                <p className="text-[11px] text-slate-400 mt-0.5 truncate">
                  {stats.entriesCount} operaciones de ingreso
                </p>
              </div>
            </div>

            {/* Card 3: Salidas / Mermas */}
            <div className="bg-white dark:bg-[#131627] rounded-2xl border border-slate-200/80 dark:border-white/10 p-3.5 sm:p-4.5 shadow-xs flex flex-col justify-between transition-all hover:border-slate-300 dark:hover:border-white/20">
              <div className="flex items-center justify-between gap-1.5 mb-2">
                <p className="text-[10.5px] font-bold text-slate-400 dark:text-slate-400 uppercase tracking-wider truncate">
                  Salidas / Mermas
                </p>
                <div className="w-8 h-8 rounded-xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 flex items-center justify-center text-rose-600 dark:text-rose-400 shrink-0">
                  <ArrowUpCircle size={16} />
                </div>
              </div>
              <div>
                <h4 className="text-xl sm:text-2xl font-black text-rose-600 dark:text-rose-400 tracking-tight font-sans">
                  {loading ? '…' : `-${stats.totalOutUnits.toLocaleString('es-PE')} uds.`}
                </h4>
                <p className="text-[11px] text-slate-400 mt-0.5 truncate">
                  {stats.exitsCount} operaciones de despacho
                </p>
              </div>
            </div>

            {/* Card 4: Balance Operativo */}
            <div className="bg-white dark:bg-[#131627] rounded-2xl border border-slate-200/80 dark:border-white/10 p-3.5 sm:p-4.5 shadow-xs flex flex-col justify-between transition-all hover:border-slate-300 dark:hover:border-white/20">
              <div className="flex items-center justify-between gap-1.5 mb-2">
                <p className="text-[10.5px] font-bold text-slate-400 dark:text-slate-400 uppercase tracking-wider truncate">
                  Balance Operativo
                </p>
                <div className="w-8 h-8 rounded-xl bg-purple-50 dark:bg-purple-500/10 border border-purple-200 dark:border-purple-500/20 flex items-center justify-center text-purple-600 dark:text-purple-400 shrink-0">
                  <Package size={16} />
                </div>
              </div>
              <div>
                <h4 className={`text-xl sm:text-2xl font-black tracking-tight font-sans ${
                  stats.netBalance > 0
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : stats.netBalance < 0
                    ? 'text-rose-600 dark:text-rose-400'
                    : 'text-slate-900 dark:text-white'
                }`}>
                  {loading ? '…' : `${stats.netBalance >= 0 ? `+${stats.netBalance}` : stats.netBalance} uds.`}
                </h4>
                <p className="text-[11px] text-slate-400 mt-0.5 truncate">
                  Diferencial neto en almacén
                </p>
              </div>
            </div>

          </div>
        )}

        {/* ═════════════════════════════════════════════════════════
            2. CONTROL & FILTER SUITE (AUDITORÍA & KARDEX)
           ═════════════════════════════════════════════════════════ */}
        <div className="bg-white dark:bg-[#131627] rounded-2xl border border-slate-200/80 dark:border-white/10 p-3.5 sm:p-5 shadow-xs space-y-3.5">
          
          {/* Main search and sort */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            
            {/* Search Input */}
            <div className="relative flex-1 w-full">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
              <input
                className="w-full bg-slate-50/70 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl pl-10 pr-9 py-2 text-xs sm:text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:bg-white dark:focus:bg-[#1a1f36] focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 transition-all outline-none"
                placeholder="Buscar por producto, código SKU, motivo o referencia..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 dark:hover:text-white"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Sort & Quick Date Controls */}
            <div className="flex flex-wrap items-center gap-2">
              
              {/* Sort selector */}
              <div className="flex items-center gap-1.5 bg-slate-50/70 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-2.5 py-1.5">
                <ArrowUpDown size={13} className="text-slate-400 dark:text-slate-500 shrink-0" />
                <span className="text-[11px] text-slate-400 dark:text-slate-400 font-medium shrink-0">Ordenar:</span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="bg-transparent text-xs text-slate-700 dark:text-slate-200 font-semibold outline-none cursor-pointer"
                >
                  <option value="recent" className="dark:bg-[#131627]">Más recientes</option>
                  <option value="oldest" className="dark:bg-[#131627]">Más antiguos</option>
                  <option value="highest" className="dark:bg-[#131627]">Mayor volumen</option>
                  <option value="lowest" className="dark:bg-[#131627]">Menor volumen</option>
                </select>
              </div>

              {/* Reset filter button if active */}
              {hasActiveFilters && (
                <button
                  onClick={handleResetFilters}
                  className="px-2.5 py-1.5 rounded-xl border border-rose-200 dark:border-rose-500/20 bg-rose-50/50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 text-xs font-semibold hover:bg-rose-100 transition-colors flex items-center gap-1 cursor-pointer"
                  title="Restablecer todos los filtros"
                >
                  <RefreshCw size={12} />
                  <span>Limpiar</span>
                </button>
              )}

            </div>
          </div>

          {/* Secondary Filter Row: Type Pills & Date Audit Range */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pt-3 border-t border-slate-100 dark:border-white/5">
            
            {/* Type Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1 -mx-1 px-1">
              <span className="text-[11px] font-bold uppercase text-slate-400 dark:text-slate-500 mr-1 shrink-0 flex items-center gap-1">
                <Filter size={12} /> Tipo:
              </span>

              {[
                { id: 'ALL', label: `Todos (${movements.length})` },
                { id: 'entrada', label: `Ingresos (${stats.entriesCount})`, dot: 'bg-emerald-500' },
                { id: 'salida', label: `Egresos (${stats.exitsCount})`, dot: 'bg-rose-500' },
              ].map((tab) => {
                const active = typeFilter === tab.id
                return (
                  <button
                    key={tab.id}
                    onClick={() => setTypeFilter(tab.id)}
                    className={`px-3 py-1.5 rounded-xl font-semibold transition-all whitespace-nowrap shrink-0 text-xs flex items-center gap-1.5 cursor-pointer ${
                      active
                        ? 'bg-[#5550F2] text-white shadow-xs'
                        : 'bg-slate-100/80 dark:bg-white/5 text-slate-600 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-white/10'
                    }`}
                  >
                    {tab.dot && <span className={`w-1.5 h-1.5 rounded-full ${tab.dot}`} />}
                    <span>{tab.label}</span>
                  </button>
                )
              })}
            </div>

            {/* Date Range Audit Presets & Custom Pickers */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-bold uppercase text-slate-400 dark:text-slate-500 flex items-center gap-1">
                <Calendar size={12} /> Período:
              </span>

              {[
                { id: 'ALL', label: 'Todo' },
                { id: 'TODAY', label: 'Hoy' },
                { id: 'WEEK', label: '7 días' },
                { id: 'MONTH', label: 'Este Mes' },
              ].map((p) => {
                const active = datePreset === p.id
                return (
                  <button
                    key={p.id}
                    onClick={() => {
                      setDatePreset(p.id)
                      setDateFrom('')
                      setDateTo('')
                    }}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                      active
                        ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold shadow-2xs'
                        : 'bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-white/10'
                    }`}
                  >
                    {p.label}
                  </button>
                )
              })}

              {/* Custom Date Pickers */}
              <div className="flex items-center gap-1.5 pl-1">
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => {
                    setDateFrom(e.target.value)
                    setDatePreset('CUSTOM')
                  }}
                  className="bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg px-2 py-1 text-xs text-slate-700 dark:text-slate-200 outline-none"
                  title="Fecha inicial"
                />
                <span className="text-slate-400 text-xs">a</span>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => {
                    setDateTo(e.target.value)
                    setDatePreset('CUSTOM')
                  }}
                  className="bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg px-2 py-1 text-xs text-slate-700 dark:text-slate-200 outline-none"
                  title="Fecha final"
                />
              </div>

            </div>

          </div>

        </div>

        {/* ═════════════════════════════════════════════════════════
            3. MOVEMENTS KARDEX TABLE & MOBILE ADAPTIVE FEED
           ═════════════════════════════════════════════════════════ */}
        {loading ? (
          <div className="bg-white dark:bg-[#131627] rounded-2xl border border-slate-200/80 dark:border-white/10 p-16 flex flex-col items-center justify-center text-center shadow-xs">
            <div className="w-10 h-10 rounded-full border-2 border-indigo-600 border-t-transparent animate-spin mb-3" />
            <p className="text-xs font-semibold text-slate-600 dark:text-slate-400">Cargando libro mayor de movimientos…</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white dark:bg-[#131627] rounded-2xl border border-slate-200/80 dark:border-white/10 p-8 shadow-xs">
            <EmptyState
              icon={ArrowLeftRight}
              title="Sin movimientos registrados"
              description={
                hasActiveFilters
                  ? 'No se encontraron movimientos que coincidan con los filtros seleccionados.'
                  : 'Registra entradas o salidas manuales para ajustar existencias de tu inventario.'
              }
              action={
                hasActiveFilters ? (
                  <button onClick={handleResetFilters} className="btn-secondary text-xs">
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
          <div className="bg-white dark:bg-[#131627] rounded-2xl border border-slate-200/80 dark:border-white/10 overflow-hidden shadow-xs">
            
            {/* ── Mobile View (Rich Cards) ── */}
            <div className="block lg:hidden divide-y divide-slate-100 dark:divide-white/5">
              {paginatedMovements.map((m) => {
                const isEntry = m.type === 'entrada'
                const prod = getProduct(m.product_id)
                const { date, time } = formatDateTime(m.created_at)
                const isUUID = m.reference && m.reference.length > 16 && m.reference.includes('-')
                const shortRef = isUUID ? `#${m.reference.slice(-6).toUpperCase()}` : (m.reference ? `#${m.reference}` : null)

                return (
                  <div key={m.id} className="p-4 space-y-3 hover:bg-slate-50/60 dark:hover:bg-white/[0.02] transition-colors">
                    
                    {/* Header: Product info + quantity */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-10 h-10 rounded-xl bg-white dark:bg-white/5 border border-slate-200/80 dark:border-white/10 p-1 flex items-center justify-center shrink-0 shadow-2xs overflow-hidden">
                          {prod?.image_url ? (
                            <img
                              src={prod.image_url}
                              alt={prod.name}
                              className="w-full h-full object-contain rounded-lg"
                              onError={(e) => { e.currentTarget.style.display = 'none' }}
                            />
                          ) : (
                            <Package size={18} className="text-slate-400 dark:text-slate-500" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-slate-900 dark:text-white text-xs sm:text-sm truncate leading-snug">
                            {prod?.name || 'Producto no encontrado'}
                          </p>
                          <span className="font-mono text-[10.5px] bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-400 px-1.5 py-0.2 rounded border border-slate-200/60 dark:border-white/10">
                            {prod?.sku || 'S/SKU'}
                          </span>
                        </div>
                      </div>

                      <div className="text-right whitespace-nowrap shrink-0">
                        <span className={`font-mono font-black text-sm sm:text-base ${
                          isEntry ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                        }`}>
                          {isEntry ? `+${m.quantity}` : `-${m.quantity}`}
                        </span>
                        <span className="text-[11px] font-medium text-slate-400 dark:text-slate-500 ml-1">
                          {prod?.unit || 'uds.'}
                        </span>
                      </div>
                    </div>

                    {/* Middle: Type badge + Reason badge */}
                    <div className="flex flex-wrap items-center gap-2">
                      <TypeBadge type={m.type} />
                      <ReasonBadge reason={m.reason} />
                    </div>

                    {/* Footer: Date, Reference, Actions */}
                    <div className="flex items-center justify-between text-xs pt-2.5 border-t border-slate-100 dark:border-white/5 text-slate-500">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-700 dark:text-slate-300">
                          {date}
                        </span>
                        <span className="font-mono text-[11px] text-slate-400 flex items-center gap-0.5">
                          <Clock size={11} /> {time}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {shortRef && (
                          <button
                            type="button"
                            onClick={(e) => handleCopyRef(m.reference, e)}
                            className="font-mono text-[11px] bg-slate-100 dark:bg-white/5 hover:bg-slate-200 text-slate-700 dark:text-slate-300 px-2 py-0.5 rounded-lg border border-slate-200 dark:border-white/10 flex items-center gap-1 transition-colors"
                            title={`Referencia: ${m.reference} (Clic para copiar)`}
                          >
                            <span>{shortRef}</span>
                            {copiedRef === m.reference ? <Check size={11} className="text-emerald-500" /> : <Copy size={11} className="text-slate-400" />}
                          </button>
                        )}

                        <button
                          onClick={() => openEdit(m)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 transition-colors"
                          title="Editar registro"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          onClick={() => setConfirmDelete(m)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors"
                          title="Eliminar y revertir stock"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>

                  </div>
                )
              })}
            </div>

            {/* ── Desktop View (Rich Kardex Table) ── */}
            <div className="overflow-x-auto hidden lg:block">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200/80 dark:border-white/10 bg-slate-50/70 dark:bg-white/[0.02] text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    <th className="py-3 px-4 w-[160px]">Fecha y Hora</th>
                    <th className="py-3 px-4">Producto Afectado</th>
                    <th className="py-3 px-4 text-center w-[170px]">Tipo de Movimiento</th>
                    <th className="py-3 px-4 text-right w-[140px]">Cantidad</th>
                    <th className="py-3 px-4">Motivo / Concepto</th>
                    <th className="py-3 px-4 text-center w-[140px]">Referencia</th>
                    <th className="py-3 px-4 text-right w-[90px]">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-white/5 text-xs">
                  {paginatedMovements.map((m) => {
                    const isEntry = m.type === 'entrada'
                    const prod = getProduct(m.product_id)
                    const { date, time } = formatDateTime(m.created_at)
                    const isUUID = m.reference && m.reference.length > 16 && m.reference.includes('-')
                    const shortRef = isUUID ? `#${m.reference.slice(-6).toUpperCase()}` : (m.reference ? `#${m.reference}` : null)

                    return (
                      <tr key={m.id} className="hover:bg-slate-50/80 dark:hover:bg-white/[0.02] transition-colors group">
                        
                        {/* 1. Fecha y Hora */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <div className="flex flex-col">
                            <span className="font-semibold text-slate-800 dark:text-slate-200 text-xs">
                              {date}
                            </span>
                            <span className="text-[11px] font-mono text-slate-400 dark:text-slate-500 flex items-center gap-1 mt-0.5">
                              <Clock size={11} className="shrink-0" />
                              {time}
                            </span>
                          </div>
                        </td>

                        {/* 2. Producto Afectado con Thumbnail */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-3 min-w-[220px]">
                            <div className="w-11 h-11 rounded-xl bg-white dark:bg-white/5 border border-slate-200/80 dark:border-white/10 p-1 flex items-center justify-center shrink-0 shadow-2xs overflow-hidden">
                              {prod?.image_url ? (
                                <img
                                  src={prod.image_url}
                                  alt={prod.name}
                                  className="w-full h-full object-contain rounded-lg"
                                  onError={(e) => { e.currentTarget.style.display = 'none' }}
                                />
                              ) : (
                                <Package size={20} className="text-slate-400 dark:text-slate-500" />
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="font-bold text-slate-900 dark:text-white text-xs sm:text-sm truncate leading-snug" title={prod?.name}>
                                {prod?.name || 'Producto no encontrado'}
                              </p>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                <span className="font-mono text-[10.5px] bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-300 px-1.5 py-0.2 rounded border border-slate-200/60 dark:border-white/10">
                                  {prod?.sku || 'S/SKU'}
                                </span>
                                {prod?.unit && (
                                  <span className="text-[10.5px] text-slate-400">
                                    • {prod.unit}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* 3. Tipo de Movimiento */}
                        <td className="py-3.5 px-4 text-center">
                          <TypeBadge type={m.type} />
                        </td>

                        {/* 4. Cantidad */}
                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                          <span className={`font-mono font-black text-sm sm:text-base ${
                            isEntry ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                          }`}>
                            {isEntry ? `+${m.quantity}` : `-${m.quantity}`}
                          </span>
                          <span className="text-[11px] font-medium text-slate-400 dark:text-slate-500 ml-1">
                            {prod?.unit || 'uds.'}
                          </span>
                        </td>

                        {/* 5. Motivo / Concepto */}
                        <td className="py-3.5 px-4">
                          <ReasonBadge reason={m.reason} />
                        </td>

                        {/* 6. Referencia */}
                        <td className="py-3.5 px-4 text-center whitespace-nowrap">
                          {shortRef ? (
                            <button
                              type="button"
                              onClick={(e) => handleCopyRef(m.reference, e)}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg font-mono text-[11px] bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-white/10 transition-colors cursor-pointer group/ref"
                              title={`Referencia: ${m.reference} (Clic para copiar)`}
                            >
                              <span>{shortRef}</span>
                              {copiedRef === m.reference ? (
                                <Check size={11} className="text-emerald-500" />
                              ) : (
                                <Copy size={11} className="text-slate-400 group-hover/ref:text-slate-600 dark:group-hover/ref:text-white" />
                              )}
                            </button>
                          ) : (
                            <span className="text-slate-300 dark:text-slate-600">—</span>
                          )}
                        </td>

                        {/* 7. Acciones */}
                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => openEdit(m)}
                              title="Editar registro"
                              className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 transition-colors cursor-pointer"
                            >
                              <Pencil size={15} />
                            </button>
                            <button
                              onClick={() => setConfirmDelete(m)}
                              title="Eliminar y revertir stock"
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors cursor-pointer"
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

            {/* ── Table Footer & Modern Pagination ── */}
            <div className="p-3.5 sm:p-4 bg-slate-50/70 dark:bg-white/[0.02] border-t border-slate-100 dark:border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500 dark:text-slate-400">
              
              <div className="flex items-center gap-3">
                <span>
                  Mostrando <strong className="text-slate-900 dark:text-white">{Math.min(filtered.length, (currentPage - 1) * pageSize + 1)}</strong> a <strong className="text-slate-900 dark:text-white">{Math.min(filtered.length, currentPage * pageSize)}</strong> de <strong className="text-slate-900 dark:text-white">{filtered.length}</strong> operaciones
                </span>

                {/* Page Size Select */}
                <div className="flex items-center gap-1.5 pl-2 border-l border-slate-200 dark:border-white/10">
                  <span className="text-[11px] text-slate-400">Filas:</span>
                  <select
                    value={pageSize}
                    onChange={(e) => setPageSize(Number(e.target.value))}
                    className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg px-2 py-0.5 text-xs text-slate-700 dark:text-slate-300 font-semibold outline-none cursor-pointer"
                  >
                    <option value={10} className="dark:bg-[#131627]">10</option>
                    <option value={25} className="dark:bg-[#131627]">25</option>
                    <option value={50} className="dark:bg-[#131627]">50</option>
                    <option value={100} className="dark:bg-[#131627]">100</option>
                  </select>
                </div>
              </div>

              {/* Page Navigation */}
              {totalPages > 1 && (
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="p-1.5 rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 disabled:opacity-40 disabled:cursor-not-allowed text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
                    title="Página anterior"
                  >
                    <ChevronLeft size={15} />
                  </button>

                  <div className="flex items-center gap-1">
                    {Array.from({ length: totalPages }).map((_, i) => {
                      const pageNum = i + 1
                      // Show first, last, current, and neighbours
                      if (
                        pageNum === 1 ||
                        pageNum === totalPages ||
                        (pageNum >= currentPage - 1 && pageNum <= currentPage + 1)
                      ) {
                        return (
                          <button
                            key={pageNum}
                            onClick={() => setCurrentPage(pageNum)}
                            className={`w-7 h-7 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                              currentPage === pageNum
                                ? 'bg-[#5550F2] text-white shadow-xs'
                                : 'bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10'
                            }`}
                          >
                            {pageNum}
                          </button>
                        )
                      }
                      if (pageNum === currentPage - 2 || pageNum === currentPage + 2) {
                        return <span key={pageNum} className="text-slate-400 px-0.5">…</span>
                      }
                      return null
                    })}
                  </div>

                  <button
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="p-1.5 rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 disabled:opacity-40 disabled:cursor-not-allowed text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
                    title="Página siguiente"
                  >
                    <ChevronRight size={15} />
                  </button>
                </div>
              )}

            </div>

          </div>
        )}

      </div>

      {/* ═════════════════════════════════════════════════════════
          4. CREATE / EDIT MOVEMENT MODAL (HIGH-END DESIGN)
         ═════════════════════════════════════════════════════════ */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Editar Movimiento de Almacén' : 'Registrar Operación de Stock'}
        width="max-w-xl"
      >
        <form onSubmit={handleSubmit} className="space-y-4 text-slate-900 dark:text-white">
          
          {/* Movement Type Toggle */}
          <div>
            <label className="label">Tipo de Operación *</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setForm({ ...form, type: 'entrada' })}
                className={`py-3 px-4 rounded-2xl text-xs sm:text-sm font-bold border transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  form.type === 'entrada'
                    ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-300 dark:border-emerald-500/30 ring-2 ring-emerald-100 dark:ring-emerald-500/20 shadow-xs'
                    : 'bg-white dark:bg-white/5 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-white/10'
                }`}
              >
                <ArrowDownLeft size={16} className="text-emerald-600 dark:text-emerald-400" />
                <span>Ingreso (+ Entrada)</span>
              </button>

              <button
                type="button"
                onClick={() => setForm({ ...form, type: 'salida' })}
                className={`py-3 px-4 rounded-2xl text-xs sm:text-sm font-bold border transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  form.type === 'salida'
                    ? 'bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-300 dark:border-rose-500/30 ring-2 ring-rose-100 dark:ring-rose-500/20 shadow-xs'
                    : 'bg-white dark:bg-white/5 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-white/10'
                }`}
              >
                <ArrowUpRight size={16} className="text-rose-600 dark:text-rose-400" />
                <span>Egreso (- Salida)</span>
              </button>
            </div>
          </div>

          {/* Product Select */}
          <div>
            <label className="label">Producto Afectado *</label>
            <select
              className="field dark:bg-[#1a1f36] dark:border-white/10 dark:text-white"
              value={form.product_id}
              onChange={(e) => setForm({ ...form, product_id: e.target.value })}
              required
            >
              <option value="">Selecciona un producto del catálogo…</option>
              {products
                .filter((p) => !p.is_kit)
                .map((p) => (
                  <option key={p.id} value={p.id} className="dark:bg-[#131627]">
                    [{p.sku}] {p.name} — Stock actual: {p.stock} {p.unit || 'uds.'}
                  </option>
                ))}
            </select>
          </div>

          {/* Quantity with Quick Increment Buttons */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="label mb-0">Cantidad de Unidades *</label>
              <div className="flex items-center gap-1">
                {[1, 5, 10, 50].map((inc) => (
                  <button
                    key={inc}
                    type="button"
                    onClick={() => {
                      const cur = Number(form.quantity) || 0
                      setForm({ ...form, quantity: String(cur + inc) })
                    }}
                    className="px-2 py-0.5 rounded-md text-[11px] font-mono font-semibold bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-white/20 transition-colors cursor-pointer"
                  >
                    +{inc}
                  </button>
                ))}
              </div>
            </div>
            <input
              type="number"
              min="1"
              className="field font-mono font-black text-slate-900 dark:text-white text-base dark:bg-[#1a1f36] dark:border-white/10"
              placeholder="Ej. 10"
              value={form.quantity}
              onChange={(e) => setForm({ ...form, quantity: e.target.value })}
              required
            />
          </div>

          {/* Real-time Dynamic Stock Projection Box */}
          {selectedFormProduct && qtyInput > 0 && (
            <div className="bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl p-4 space-y-2 text-xs">
              <p className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <TrendingUp size={14} className="text-[#5550F2]" />
                <span>Simulación de Impacto en Almacén:</span>
              </p>
              <div className="grid grid-cols-3 gap-2 text-center pt-1 font-mono">
                <div className="p-2 rounded-xl bg-white dark:bg-white/5 border border-slate-200/60 dark:border-white/10">
                  <span className="text-[10px] text-slate-400 block uppercase">Stock Actual</span>
                  <strong className="text-slate-800 dark:text-slate-200 font-bold">{currentStock} {selectedFormProduct.unit}</strong>
                </div>
                <div className="p-2 rounded-xl bg-white dark:bg-white/5 border border-slate-200/60 dark:border-white/10">
                  <span className="text-[10px] text-slate-400 block uppercase">Operación</span>
                  <strong className={form.type === 'entrada' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}>
                    {form.type === 'entrada' ? `+${qtyInput}` : `-${qtyInput}`} {selectedFormProduct.unit}
                  </strong>
                </div>
                <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200/60 dark:border-indigo-500/20">
                  <span className="text-[10px] text-indigo-500 dark:text-indigo-400 block uppercase font-bold">Proyectado</span>
                  <strong className="text-[#5550F2] dark:text-indigo-400 font-black">{projectedStock} {selectedFormProduct.unit}</strong>
                </div>
              </div>
            </div>
          )}

          {/* Reason & Quick Chips */}
          <div>
            <label className="label">Motivo o Justificación</label>
            <input
              className="field mb-2 dark:bg-[#1a1f36] dark:border-white/10 dark:text-white"
              placeholder="Ej. Ingreso de lote mensual, merma en almacén, reconteo..."
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
                  className="text-[11px] bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300 px-2 py-0.5 rounded-lg transition-colors cursor-pointer"
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
              className="field font-mono dark:bg-[#1a1f36] dark:border-white/10 dark:text-white"
              placeholder="Ej. GUIA-00234, FACT-881, TICKET-99"
              value={form.reference}
              onChange={(e) => setForm({ ...form, reference: e.target.value })}
            />
          </div>

          {error && (
            <div className="text-xs font-semibold text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 rounded-xl p-3 flex items-center gap-2">
              <AlertTriangle size={15} className="shrink-0 text-rose-600 dark:text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-white/10">
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
          5. CONFIRM DELETE & REVERT STOCK MODAL
         ═════════════════════════════════════════════════════════ */}
      <Modal
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        title="Eliminar Registro y Revertir Stock"
        width="max-w-md"
      >
        {confirmDelete && (
          <div className="space-y-4 text-slate-900 dark:text-white">
            <div className="bg-slate-50 dark:bg-white/5 rounded-2xl p-4 space-y-2.5 text-xs border border-slate-200 dark:border-white/10">
              <div className="flex justify-between items-center">
                <span className="text-slate-500 dark:text-slate-400">Producto:</span>
                <strong className="text-slate-900 dark:text-white font-bold text-right truncate max-w-[200px]">
                  {productName(confirmDelete.product_id)}
                </strong>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 dark:text-slate-400">Tipo de movimiento:</span>
                <TypeBadge type={confirmDelete.type} />
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 dark:text-slate-400">Cantidad afectada:</span>
                <strong className="font-mono text-slate-900 dark:text-white font-black text-sm">
                  {confirmDelete.quantity} {productUnit(confirmDelete.product_id)}
                </strong>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 text-amber-800 dark:text-amber-300 text-xs flex items-start gap-2.5">
              <ShieldAlert size={18} className="text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Efecto en inventario:</p>
                <p className="mt-0.5">
                  Esta acción eliminará el registro histórico y <strong>revertirá automáticamente el stock</strong> de este artículo en tu almacén.
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-2.5 pt-2">
              <button
                onClick={() => setConfirmDelete(null)}
                className="btn-secondary"
              >
                Cancelar
              </button>
              <button
                onClick={handleDelete}
                className="btn-danger cursor-pointer"
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
