import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import {
  Building2, Plus, Pencil, Trash2, Search, X, Phone, Mail,
  MapPin, ShoppingBag, DollarSign, TrendingUp, User, Copy,
  Check, FileSpreadsheet, ExternalLink, ArrowUpDown, LayoutGrid,
  List, AlertCircle, CheckCircle2, ChevronRight, Eye,
  RotateCcw, Sparkles, MessageCircle, Clock, Package
} from 'lucide-react'
import AppLayout from '../components/layout/AppLayout'
import Modal from '../components/ui/Modal'
import EmptyState from '../components/ui/EmptyState'
import { suppliersService } from '../services/suppliersService'
import { purchasesService } from '../services/purchasesService'
import { productsService } from '../services/productsService'

const fmt = (n) =>
  `S/ ${(Number(n) || 0).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

const fmtN = (n) => (Number(n) || 0).toLocaleString('es-PE')

const dateStr = (iso) =>
  iso ? new Date(iso).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'

const AVATAR_PALETTES = [
  { bg: 'from-blue-600 to-indigo-700', text: 'text-white' },
  { bg: 'from-emerald-600 to-teal-700', text: 'text-white' },
  { bg: 'from-violet-600 to-purple-700', text: 'text-white' },
  { bg: 'from-amber-500 to-orange-600', text: 'text-white' },
  { bg: 'from-rose-500 to-pink-600', text: 'text-white' },
  { bg: 'from-cyan-600 to-blue-600', text: 'text-white' },
]

const getInitials = (name = '') => {
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + (parts[1]?.[0] || '')).toUpperCase()
}

const cleanPhone = (phone = '') => phone.replace(/\D/g, '')

const getWhatsAppUrl = (phone, name) => {
  if (!phone) return null
  const cleaned = cleanPhone(phone)
  if (!cleaned) return null
  const fullNumber = cleaned.length === 9 ? `51${cleaned}` : cleaned
  const text = encodeURIComponent(`Hola ${name || ''}, te saludamos de CYA Store. ¿Podrías brindarnos información sobre nuestras compras/pedidos?`)
  return `https://wa.me/${fullNumber}?text=${text}`
}

export default function Suppliers() {
  const navigate = useNavigate()
  const location = useLocation()

  const [suppliers, setSuppliers] = useState([])
  const [purchases, setPurchases] = useState([])
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)

  // Filters & State
  const [search, setSearch] = useState('')
  const [segmentFilter, setSegmentFilter] = useState('ALL') // 'ALL' | 'ACTIVE' | 'WHATSAPP' | 'EMPTY'
  const [sortBy, setSortBy] = useState('spent') // 'spent' | 'orders' | 'name' | 'ruc'
  const [viewMode, setViewMode] = useState('grid') // 'grid' | 'table'
  const [showMetrics, setShowMetrics] = useState(true)

  // Dossier Modal
  const [selectedSupplier, setSelectedSupplier] = useState(null)
  const [copiedRuc, setCopiedRuc] = useState(null)

  // Confirm delete
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [deleting, setDeleting] = useState(false)

  // Toast / feedback message after creating/updating from /proveedores/nuevo or /proveedores/editar/:id
  const [successToast, setSuccessToast] = useState(
    location.state?.created
      ? `¡Proveedor "${location.state?.supplierName || ''}" registrado exitosamente!`
      : location.state?.updated
      ? `¡Proveedor "${location.state?.supplierName || ''}" actualizado correctamente!`
      : ''
  )

  useEffect(() => {
    if (successToast) {
      const timer = setTimeout(() => setSuccessToast(''), 4500)
      return () => clearTimeout(timer)
    }
  }, [successToast])

  async function loadAll() {
    setLoading(true)
    try {
      const [sups, purches, prods] = await Promise.all([
        suppliersService.list().catch(() => []),
        purchasesService.list().catch(() => []),
        productsService.list().catch(() => [])
      ])
      setSuppliers(sups || [])
      setPurchases(purches || [])
      setProducts(prods || [])
    } catch (err) {
      console.error('Error cargando proveedores:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadAll()
  }, [])

  /* ─── Per-Supplier Enriched Data Map ─── */
  const supplierDataMap = useMemo(() => {
    const map = {}

    suppliers.forEach((s) => {
      map[s.id] = {
        purchases: [],
        ordersCount: 0,
        pendingOrders: 0,
        receivedOrders: 0,
        totalSpent: 0,
        productsCount: 0
      }
    })

    // Populate purchases
    purchases.forEach((pur) => {
      const sid = pur.supplier_id
      if (sid && map[sid]) {
        const total = purchasesService.purchaseTotal(pur)
        map[sid].purchases.push(pur)
        map[sid].ordersCount += 1
        map[sid].totalSpent += total
        if (pur.status === 'recibido') map[sid].receivedOrders += 1
        else map[sid].pendingOrders += 1
      }
    })

    // Populate products
    products.forEach((p) => {
      const sid = p.supplier_id
      if (sid && map[sid]) {
        map[sid].productsCount += 1
      }
    })

    return map
  }, [suppliers, purchases, products])

  /* ─── Global Executive Stats ─── */
  const stats = useMemo(() => {
    const totalSuppliers = suppliers.length
    const withRucCount = suppliers.filter((s) => s.ruc && s.ruc.trim().length >= 8).length
    const totalOrders = purchases.length
    const pendingOrders = purchases.filter((p) => p.status !== 'recibido').length

    const totalSpentAll = purchases.reduce(
      (sum, p) => sum + purchasesService.purchaseTotal(p),
      0
    )

    // Top supplier by spent
    let topSupplier = null
    let maxSpent = -1
    suppliers.forEach((s) => {
      const d = supplierDataMap[s.id]
      if (d && d.totalSpent > maxSpent) {
        maxSpent = d.totalSpent
        topSupplier = { ...s, totalSpent: d.totalSpent, ordersCount: d.ordersCount }
      }
    })

    const withOrdersCount = suppliers.filter((s) => (supplierDataMap[s.id]?.ordersCount || 0) > 0).length

    return {
      totalSuppliers,
      withRucCount,
      totalOrders,
      pendingOrders,
      totalSpentAll,
      topSupplier,
      withOrdersCount
    }
  }, [suppliers, purchases, supplierDataMap])

  /* ─── Filtered and Sorted Suppliers ─── */
  const filtered = useMemo(() => {
    let result = suppliers.map((s, idx) => {
      const d = supplierDataMap[s.id] || {
        purchases: [],
        ordersCount: 0,
        pendingOrders: 0,
        receivedOrders: 0,
        totalSpent: 0,
        productsCount: 0
      }
      return {
        ...s,
        ...d,
        avatarStyle: AVATAR_PALETTES[idx % AVATAR_PALETTES.length]
      }
    })

    // 1. Search Query
    const q = search.trim().toLowerCase()
    if (q) {
      result = result.filter(
        (s) =>
          (s.name && s.name.toLowerCase().includes(q)) ||
          (s.ruc && s.ruc.toLowerCase().includes(q)) ||
          (s.contact_name && s.contact_name.toLowerCase().includes(q)) ||
          (s.email && s.email.toLowerCase().includes(q)) ||
          (s.phone && s.phone.toLowerCase().includes(q)) ||
          (s.address && s.address.toLowerCase().includes(q))
      )
    }

    // 2. Segment Filter
    if (segmentFilter === 'ACTIVE') {
      result = result.filter((s) => s.ordersCount > 0)
    } else if (segmentFilter === 'WHATSAPP') {
      result = result.filter((s) => Boolean(cleanPhone(s.phone)))
    } else if (segmentFilter === 'EMPTY') {
      result = result.filter((s) => s.ordersCount === 0)
    }

    // 3. Sorting
    if (sortBy === 'spent') {
      result.sort((a, b) => b.totalSpent - a.totalSpent)
    } else if (sortBy === 'orders') {
      result.sort((a, b) => b.ordersCount - a.ordersCount)
    } else if (sortBy === 'name') {
      result.sort((a, b) => a.name.localeCompare(b.name))
    } else if (sortBy === 'ruc') {
      result.sort((a, b) => (a.ruc || '').localeCompare(b.ruc || ''))
    }

    return result
  }, [suppliers, supplierDataMap, search, segmentFilter, sortBy])

  /* ─── Copy RUC ─── */
  const handleCopyRuc = (ruc, e) => {
    e.stopPropagation()
    if (!ruc) return
    navigator.clipboard.writeText(ruc)
    setCopiedRuc(ruc)
    setTimeout(() => setCopiedRuc(null), 2000)
  }

  /* ─── Export to Excel / CSV ─── */
  const handleExportExcel = () => {
    const headers = [
      'Razón Social / Proveedor',
      'RUC / Identificación Fiscal',
      'Persona de Contacto',
      'Teléfono / Celular',
      'Correo Electrónico',
      'Dirección Fiscal',
      'Total Órdenes de Compra',
      'Inversión Total Acumulada (S/)',
      'Productos Asignados'
    ]

    const rows = filtered.map((s) => [
      `"${(s.name || '').replace(/"/g, '""')}"`,
      `"${s.ruc || ''}"`,
      `"${(s.contact_name || '').replace(/"/g, '""')}"`,
      `"${s.phone || ''}"`,
      `"${s.email || ''}"`,
      `"${(s.address || '').replace(/"/g, '""')}"`,
      s.ordersCount,
      s.totalSpent.toFixed(2),
      s.productsCount
    ])

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `directorio-proveedores-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  /* ─── Delete Supplier ─── */
  async function handleDelete() {
    if (!confirmDelete) return
    setDeleting(true)
    try {
      await suppliersService.remove(confirmDelete.id)
      setConfirmDelete(null)
      loadAll()
    } catch (err) {
      console.error(err)
    } finally {
      setDeleting(false)
    }
  }

  return (
    <AppLayout title="Directorio de Proveedores">
      <div className="space-y-5 max-w-[1440px] mx-auto pb-16">

        {/* ═════════════════════════════════════════════════════════
            SUCCESS TOAST NOTIFICATION
           ═════════════════════════════════════════════════════════ */}
        {successToast && (
          <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 text-emerald-800 dark:text-emerald-300 text-xs sm:text-sm font-semibold flex items-center justify-between gap-3 shadow-xs animate-slide-up">
            <div className="flex items-center gap-2.5">
              <CheckCircle2 size={18} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>{successToast}</span>
            </div>
            <button
              onClick={() => setSuccessToast('')}
              className="text-emerald-600 dark:text-emerald-400 hover:text-emerald-800 p-1 cursor-pointer"
            >
              <X size={15} />
            </button>
          </div>
        )}

        {/* ═════════════════════════════════════════════════════════
            0. TOP EXECUTIVE HEADER TOOLBAR
           ═════════════════════════════════════════════════════════ */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-[#141417] p-4 sm:p-5 rounded-2xl border border-slate-200/80 dark:border-zinc-800 shadow-xs">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-brand/10 text-brand dark:text-blue-400">
                <Building2 size={18} />
              </span>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-zinc-100 tracking-tight font-display">
                Directorio de Proveedores
              </h1>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-zinc-400 mt-1">
              Controla tu cadena de suministro, audita compras y mantén contacto directo con tus aliados comerciales.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Toggle KPI Metrics */}
            <button
              onClick={() => setShowMetrics((prev) => !prev)}
              className="px-3 py-2 rounded-xl bg-slate-50 dark:bg-zinc-800/80 hover:bg-slate-100 dark:hover:bg-zinc-700/80 text-slate-700 dark:text-zinc-300 text-xs font-semibold flex items-center gap-1.5 border border-slate-200 dark:border-zinc-700 transition-colors cursor-pointer"
              title="Mostrar / ocultar métricas clave"
            >
              <TrendingUp size={14} className="text-slate-400" />
              <span className="hidden sm:inline">{showMetrics ? 'Ocultar KPIs' : 'Ver KPIs'}</span>
            </button>

            {/* Export Excel */}
            <button
              onClick={handleExportExcel}
              className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer active:scale-95"
              title="Descargar directorio de proveedores en Excel / CSV"
            >
              <FileSpreadsheet size={15} />
              <span>Exportar</span>
            </button>

            {/* Primary New Supplier Button (Navigates to dedicated page) */}
            <button
              onClick={() => navigate('/proveedores/nuevo')}
              className="px-4 py-2 rounded-xl bg-brand hover:bg-brand-hover text-white text-xs sm:text-sm font-bold flex items-center gap-1.5 shadow-sm hover:shadow-card active:scale-95 transition-all cursor-pointer"
            >
              <Plus size={16} />
              <span>+ Nuevo Proveedor</span>
            </button>
          </div>
        </div>

        {/* ═════════════════════════════════════════════════════════
            1. EXECUTIVE METRICS BAR (4 FINNOVA CARDS)
           ═════════════════════════════════════════════════════════ */}
        {showMetrics && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4 animate-fade-in">

            {/* Card 1: Total Proveedores */}
            <div
              className="bg-white dark:bg-[#141417] rounded-2xl border border-slate-200/80 dark:border-zinc-800 p-3.5 sm:p-4.5 shadow-xs flex flex-col justify-between card-mobile-active active:scale-[0.98] transition-all hover:border-slate-300 dark:hover:border-zinc-700"
              style={{ animation: 'slideUp 0.35s cubic-bezier(0.16, 1, 0.3, 1) 40ms both' }}
            >
              <div className="flex items-center justify-between gap-1.5 mb-2">
                <p className="text-[10px] sm:text-[11px] font-bold text-slate-400 dark:text-zinc-400 uppercase tracking-wider truncate">
                  Proveedores Activos
                </p>
                <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 flex items-center justify-center text-brand dark:text-blue-400 shrink-0">
                  <Building2 size={16} />
                </div>
              </div>
              <div>
                <h4 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-zinc-100 tracking-tight font-display">
                  {loading ? '…' : `${stats.totalSuppliers}`}
                </h4>
                <p className="text-[11px] text-slate-400 dark:text-zinc-500 mt-0.5 truncate flex items-center gap-1">
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                    {stats.withRucCount} con RUC registrado
                  </span>
                </p>
              </div>
            </div>

            {/* Card 2: Órdenes de Compra */}
            <div
              className="bg-white dark:bg-[#141417] rounded-2xl border border-slate-200/80 dark:border-zinc-800 p-3.5 sm:p-4.5 shadow-xs flex flex-col justify-between card-mobile-active active:scale-[0.98] transition-all hover:border-slate-300 dark:hover:border-zinc-700"
              style={{ animation: 'slideUp 0.35s cubic-bezier(0.16, 1, 0.3, 1) 90ms both' }}
            >
              <div className="flex items-center justify-between gap-1.5 mb-2">
                <p className="text-[10px] sm:text-[11px] font-bold text-slate-400 dark:text-zinc-400 uppercase tracking-wider truncate">
                  Órdenes de Compra
                </p>
                <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-purple-50 dark:bg-purple-500/10 border border-purple-200 dark:border-purple-500/20 flex items-center justify-center text-purple-600 dark:text-purple-400 shrink-0">
                  <ShoppingBag size={16} />
                </div>
              </div>
              <div>
                <h4 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-zinc-100 tracking-tight font-display">
                  {loading ? '…' : `${stats.totalOrders}`}
                </h4>
                <p className="text-[11px] text-slate-400 dark:text-zinc-500 mt-0.5 truncate">
                  {stats.pendingOrders > 0 ? (
                    <span className="font-bold text-amber-600 dark:text-amber-400">
                      {stats.pendingOrders} pendientes de recepción
                    </span>
                  ) : (
                    'Todas recibidas y auditadas'
                  )}
                </p>
              </div>
            </div>

            {/* Card 3: Inversión Total en Abastecimiento */}
            <div
              className="bg-white dark:bg-[#141417] rounded-2xl border border-slate-200/80 dark:border-zinc-800 p-3.5 sm:p-4.5 shadow-xs flex flex-col justify-between card-mobile-active active:scale-[0.98] transition-all hover:border-slate-300 dark:hover:border-zinc-700"
              style={{ animation: 'slideUp 0.35s cubic-bezier(0.16, 1, 0.3, 1) 140ms both' }}
            >
              <div className="flex items-center justify-between gap-1.5 mb-2">
                <p className="text-[10px] sm:text-[11px] font-bold text-slate-400 dark:text-zinc-400 uppercase tracking-wider truncate">
                  Inversión en Compras
                </p>
                <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
                  <DollarSign size={16} />
                </div>
              </div>
              <div>
                <h4 className="text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400 tracking-tight font-display">
                  {loading ? '…' : fmt(stats.totalSpentAll)}
                </h4>
                <p className="text-[11px] text-slate-400 dark:text-zinc-500 mt-0.5 truncate">
                  Capital invertido en stock
                </p>
              </div>
            </div>

            {/* Card 4: Proveedor Principal */}
            <div
              className="bg-white dark:bg-[#141417] rounded-2xl border border-slate-200/80 dark:border-zinc-800 p-3.5 sm:p-4.5 shadow-xs flex flex-col justify-between card-mobile-active active:scale-[0.98] transition-all hover:border-slate-300 dark:hover:border-zinc-700"
              style={{ animation: 'slideUp 0.35s cubic-bezier(0.16, 1, 0.3, 1) 190ms both' }}
            >
              <div className="flex items-center justify-between gap-1.5 mb-2">
                <p className="text-[10px] sm:text-[11px] font-bold text-slate-400 dark:text-zinc-400 uppercase tracking-wider truncate">
                  Proveedor Top
                </p>
                <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0">
                  <Sparkles size={16} />
                </div>
              </div>
              <div>
                <h4 className="text-base sm:text-lg font-black text-slate-900 dark:text-zinc-100 tracking-tight font-display truncate">
                  {loading ? '…' : stats.topSupplier ? stats.topSupplier.name : 'Sin compras'}
                </h4>
                <p className="text-[11px] text-brand dark:text-blue-400 font-bold mt-0.5 truncate">
                  {stats.topSupplier ? `${fmt(stats.topSupplier.totalSpent)}` : 'S/ 0.00'}
                </p>
              </div>
            </div>

          </div>
        )}

        {/* ═════════════════════════════════════════════════════════
            2. CONTROL BAR (SEARCH, SEGMENT PILLS, SORT, VIEW SWITCH)
           ═════════════════════════════════════════════════════════ */}
        <div
          className="bg-white dark:bg-[#141417] rounded-2xl border border-slate-200/80 dark:border-zinc-800 p-3.5 sm:p-4 shadow-xs space-y-3"
          style={{ animation: 'slideUp 0.35s cubic-bezier(0.16, 1, 0.3, 1) 220ms both' }}
        >
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">

            {/* Search Input */}
            <div className="relative flex-1 w-full lg:max-w-md">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-zinc-500" />
              <input
                className="w-full bg-slate-50 dark:bg-zinc-800/80 border border-slate-200 dark:border-zinc-700 rounded-xl pl-10 pr-9 py-2 text-xs sm:text-sm text-slate-900 dark:text-zinc-100 placeholder:text-slate-400 dark:placeholder:text-zinc-500 focus:bg-white dark:focus:bg-zinc-900 focus:border-brand focus:ring-2 focus:ring-brand/10 transition-all outline-none"
                placeholder="Buscar por Razón Social, RUC, Contacto o Teléfono…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 dark:hover:text-zinc-200"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Segment Filter Chips */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0 no-scrollbar">
              <button
                type="button"
                onClick={() => setSegmentFilter('ALL')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                  segmentFilter === 'ALL'
                    ? 'bg-brand text-white shadow-xs'
                    : 'bg-slate-50 dark:bg-zinc-800 text-slate-600 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-700'
                }`}
              >
                Todos ({suppliers.length})
              </button>
              <button
                type="button"
                onClick={() => setSegmentFilter('ACTIVE')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                  segmentFilter === 'ACTIVE'
                    ? 'bg-brand text-white shadow-xs'
                    : 'bg-slate-50 dark:bg-zinc-800 text-slate-600 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-700'
                }`}
              >
                Con compras ({stats.withOrdersCount})
              </button>
              <button
                type="button"
                onClick={() => setSegmentFilter('WHATSAPP')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                  segmentFilter === 'WHATSAPP'
                    ? 'bg-brand text-white shadow-xs'
                    : 'bg-slate-50 dark:bg-zinc-800 text-slate-600 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-700'
                }`}
              >
                Con WhatsApp
              </button>
              <button
                type="button"
                onClick={() => setSegmentFilter('EMPTY')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                  segmentFilter === 'EMPTY'
                    ? 'bg-brand text-white shadow-xs'
                    : 'bg-slate-50 dark:bg-zinc-800 text-slate-600 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-700'
                }`}
              >
                Sin compras aún ({stats.totalSuppliers - stats.withOrdersCount})
              </button>
            </div>

            {/* Sort & View Mode */}
            <div className="flex items-center justify-between lg:justify-end gap-2 w-full lg:w-auto">
              <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-zinc-800/80 border border-slate-200 dark:border-zinc-700 rounded-xl px-2.5 py-1.5">
                <ArrowUpDown size={13} className="text-slate-400 dark:text-zinc-500 shrink-0" />
                <span className="text-[11px] text-slate-400 dark:text-zinc-500 font-medium shrink-0">Ordenar:</span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="bg-transparent text-xs text-slate-700 dark:text-zinc-200 font-semibold outline-none cursor-pointer"
                >
                  <option value="spent" className="dark:bg-zinc-900">Mayor inversión S/</option>
                  <option value="orders" className="dark:bg-zinc-900">Más órdenes de compra</option>
                  <option value="name" className="dark:bg-zinc-900">Razón Social A-Z</option>
                  <option value="ruc" className="dark:bg-zinc-900">Número de RUC</option>
                </select>
              </div>

              {/* View Switch */}
              <div className="inline-flex items-center p-1 bg-slate-100 dark:bg-zinc-800 rounded-xl border border-slate-200/80 dark:border-zinc-700 shrink-0">
                <button
                  type="button"
                  onClick={() => setViewMode('grid')}
                  title="Vista en tarjetas"
                  className={`p-1.5 rounded-lg transition-all ${
                    viewMode === 'grid'
                      ? 'bg-white dark:bg-zinc-900 text-brand dark:text-blue-400 shadow-xs font-bold'
                      : 'text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-100'
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
                      ? 'bg-white dark:bg-zinc-900 text-brand dark:text-blue-400 shadow-xs font-bold'
                      : 'text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-100'
                  }`}
                >
                  <List size={15} />
                </button>
              </div>
            </div>

          </div>
        </div>

        {/* ═════════════════════════════════════════════════════════
            3. MAIN CONTENT: GRID OR TABLE
           ═════════════════════════════════════════════════════════ */}
        {loading ? (
          <div className="bg-white dark:bg-[#141417] rounded-2xl border border-slate-200/80 dark:border-zinc-800 p-16 flex flex-col items-center justify-center text-center shadow-xs">
            <div className="w-10 h-10 rounded-full border-2 border-brand border-t-transparent animate-spin mb-3" />
            <p className="text-xs font-semibold text-slate-600 dark:text-zinc-400">
              Cargando directorio de proveedores…
            </p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white dark:bg-[#141417] rounded-2xl border border-slate-200/80 dark:border-zinc-800 p-8 shadow-xs">
            <EmptyState
              icon={Building2}
              title="Sin proveedores encontrados"
              description={
                search || segmentFilter !== 'ALL'
                  ? 'No hay proveedores que coincidan con los criterios de búsqueda o filtros aplicados.'
                  : 'Registra a tus proveedores para generar órdenes de compra y abastecer el almacén.'
              }
              action={
                search || segmentFilter !== 'ALL' ? (
                  <button
                    onClick={() => {
                      setSearch('')
                      setSegmentFilter('ALL')
                    }}
                    className="btn-secondary text-xs"
                  >
                    Restablecer filtros
                  </button>
                ) : (
                  <button onClick={() => navigate('/proveedores/nuevo')} className="btn-primary text-xs">
                    <Plus size={15} /> Nuevo Proveedor
                  </button>
                )
              }
            />
          </div>
        ) : viewMode === 'grid' ? (
          /* ─── GRID CARDS VIEW ─── */
          <div
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
            style={{ animation: 'slideUp 0.35s cubic-bezier(0.16, 1, 0.3, 1) 260ms both' }}
          >
            {filtered.map((s) => {
              const waUrl = getWhatsAppUrl(s.phone, s.contact_name || s.name)

              return (
                <div
                  key={s.id}
                  className="bg-white dark:bg-[#141417] rounded-2xl border border-slate-200/80 dark:border-zinc-800 p-5 shadow-xs hover:shadow-card hover:border-slate-300 dark:hover:border-zinc-700 card-mobile-active active:scale-[0.99] transition-all flex flex-col justify-between group"
                >
                  <div>
                    {/* Header: Avatar + Supplier Name + Actions */}
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex items-start gap-3 min-w-0">
                        <div
                          className={`w-11 h-11 rounded-2xl bg-gradient-to-br ${s.avatarStyle.bg} flex items-center justify-center font-black text-sm text-white shrink-0 group-hover:scale-105 transition-transform shadow-xs`}
                        >
                          {getInitials(s.name)}
                        </div>
                        <div className="min-w-0">
                          <h3
                            onClick={() => setSelectedSupplier(s)}
                            className="font-bold text-slate-900 dark:text-zinc-100 text-base leading-snug truncate group-hover:text-brand dark:group-hover:text-blue-400 transition-colors cursor-pointer"
                          >
                            {s.name}
                          </h3>

                          {/* RUC Pill */}
                          <div className="flex items-center gap-1.5 mt-1">
                            {s.ruc ? (
                              <button
                                type="button"
                                onClick={(e) => handleCopyRuc(s.ruc, e)}
                                title="Copiar RUC"
                                className="inline-flex items-center gap-1 font-mono text-[11px] font-bold text-slate-600 dark:text-zinc-300 bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 px-2 py-0.5 rounded-md transition-colors cursor-pointer"
                              >
                                {copiedRuc === s.ruc ? (
                                  <>
                                    <Check size={11} className="text-emerald-600" />
                                    <span className="text-emerald-600">Copiado</span>
                                  </>
                                ) : (
                                  <>
                                    <span>RUC {s.ruc}</span>
                                    <Copy size={10} className="text-slate-400" />
                                  </>
                                )}
                              </button>
                            ) : (
                              <span className="text-[10.5px] font-medium text-slate-400 dark:text-zinc-500 italic">
                                Sin RUC
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Quick Edit/Delete Buttons */}
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => navigate(`/proveedores/editar/${s.id}`)}
                          title="Editar proveedor"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-brand hover:bg-blue-50 dark:hover:bg-blue-500/10 dark:hover:text-blue-400 transition-colors cursor-pointer"
                        >
                          <Pencil size={15} />
                        </button>
                        <button
                          onClick={() => setConfirmDelete(s)}
                          title="Eliminar proveedor"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 dark:hover:text-red-400 transition-colors cursor-pointer"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>

                    {/* Contact details */}
                    <div className="space-y-2 text-xs text-slate-600 dark:text-zinc-400 py-3 border-t border-slate-100 dark:border-zinc-800">
                      {s.contact_name ? (
                        <div className="flex items-center gap-2">
                          <User size={13} className="text-slate-400 shrink-0" />
                          <span className="truncate">
                            Contacto: <strong className="text-slate-800 dark:text-zinc-200">{s.contact_name}</strong>
                          </span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 text-slate-400 dark:text-zinc-600 italic">
                          <User size={13} className="shrink-0" />
                          <span>Contacto no registrado</span>
                        </div>
                      )}

                      {/* Phone & WhatsApp */}
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <Phone size={13} className="text-slate-400 shrink-0" />
                          <span className="truncate font-mono">{s.phone || 'Sin teléfono'}</span>
                        </div>
                        {waUrl && (
                          <a
                            href={waUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 hover:bg-emerald-100 dark:hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-[11px] font-bold border border-emerald-200 dark:border-emerald-500/20 transition-colors shrink-0"
                            title="Conversar por WhatsApp"
                          >
                            <MessageCircle size={11} /> WhatsApp
                          </a>
                        )}
                      </div>

                      {/* Email */}
                      {s.email && (
                        <div className="flex items-center gap-2">
                          <Mail size={13} className="text-slate-400 shrink-0" />
                          <a
                            href={`mailto:${s.email}`}
                            className="truncate text-slate-700 dark:text-zinc-300 hover:text-brand dark:hover:text-blue-400 transition-colors"
                          >
                            {s.email}
                          </a>
                        </div>
                      )}

                      {/* Address */}
                      {s.address && (
                        <div className="flex items-center gap-2">
                          <MapPin size={13} className="text-slate-400 shrink-0" />
                          <span className="truncate text-slate-500 dark:text-zinc-400">{s.address}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Micro-Metrics Breakdown Footer */}
                  <div className="pt-3 border-t border-slate-100 dark:border-zinc-800 space-y-3">
                    <div className="grid grid-cols-2 gap-2 text-center">
                      <div className="bg-slate-50 dark:bg-zinc-800/50 rounded-xl p-2 border border-slate-100 dark:border-zinc-800">
                        <p className="text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider mb-0.5">
                          Compras
                        </p>
                        <p className="font-extrabold text-slate-900 dark:text-zinc-100 text-sm font-display">
                          {s.ordersCount} órdenes
                        </p>
                      </div>

                      <div className="bg-slate-50 dark:bg-zinc-800/50 rounded-xl p-2 border border-slate-100 dark:border-zinc-800">
                        <p className="text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider mb-0.5">
                          Total Facturado
                        </p>
                        <p className="font-extrabold text-brand dark:text-blue-400 text-sm font-display truncate">
                          {fmt(s.totalSpent)}
                        </p>
                      </div>
                    </div>

                    {/* Action to see expediente */}
                    <div className="flex items-center justify-between gap-3 pt-1">
                      <span className="text-[11px] font-semibold text-slate-400 dark:text-zinc-500">
                        {s.productsCount} SKUs provistos
                      </span>

                      <button
                        onClick={() => setSelectedSupplier(s)}
                        className="text-xs font-bold text-brand dark:text-blue-400 hover:text-brand-hover inline-flex items-center gap-1 group/btn cursor-pointer shrink-0"
                      >
                        <span>Ver compras</span>
                        <ChevronRight size={13} className="group-hover/btn:translate-x-0.5 transition-transform" />
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          /* ─── TABLE VIEW ─── */
          <div
            className="bg-white dark:bg-[#141417] rounded-2xl border border-slate-200/80 dark:border-zinc-800 overflow-hidden shadow-xs"
            style={{ animation: 'slideUp 0.35s cubic-bezier(0.16, 1, 0.3, 1) 260ms both' }}
          >
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200/80 dark:border-zinc-800 bg-slate-50/70 dark:bg-zinc-800/50 text-[11px] font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider">
                    <th className="py-3.5 px-4">Proveedor / Empresa</th>
                    <th className="py-3.5 px-4">Contacto Principal</th>
                    <th className="py-3.5 px-4">Teléfono / WhatsApp</th>
                    <th className="py-3.5 px-4">Correo</th>
                    <th className="py-3.5 px-4 text-center">Órdenes</th>
                    <th className="py-3.5 px-4 text-right">Inversión (S/)</th>
                    <th className="py-3.5 px-4 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-zinc-800 text-xs">
                  {filtered.map((s) => {
                    const waUrl = getWhatsAppUrl(s.phone, s.contact_name || s.name)

                    return (
                      <tr
                        key={s.id}
                        className="hover:bg-slate-50/80 dark:hover:bg-zinc-800/40 transition-colors group cursor-pointer"
                        onClick={() => setSelectedSupplier(s)}
                      >
                        {/* Company + RUC */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-3">
                            <div
                              className={`w-9 h-9 rounded-xl bg-gradient-to-br ${s.avatarStyle.bg} flex items-center justify-center font-bold text-xs text-white shrink-0 shadow-xs`}
                            >
                              {getInitials(s.name)}
                            </div>
                            <div>
                              <p className="font-bold text-slate-900 dark:text-zinc-100 text-sm group-hover:text-brand dark:group-hover:text-blue-400 transition-colors">
                                {s.name}
                              </p>
                              <span className="font-mono text-[11px] text-slate-400 dark:text-zinc-500">
                                {s.ruc ? `RUC: ${s.ruc}` : 'Sin RUC'}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* Contact */}
                        <td className="py-3.5 px-4 text-slate-700 dark:text-zinc-300 font-medium">
                          {s.contact_name || <span className="text-slate-300 dark:text-zinc-600 italic">—</span>}
                        </td>

                        {/* Phone / WA */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-slate-600 dark:text-zinc-400">{s.phone || '—'}</span>
                            {waUrl && (
                              <a
                                href={waUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="p-1 rounded bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 hover:scale-110 transition-transform"
                                title="WhatsApp"
                              >
                                <MessageCircle size={13} />
                              </a>
                            )}
                          </div>
                        </td>

                        {/* Email */}
                        <td className="py-3.5 px-4 text-slate-600 dark:text-zinc-400 max-w-xs truncate">
                          {s.email || <span className="text-slate-300 dark:text-zinc-600 italic">—</span>}
                        </td>

                        {/* Orders count */}
                        <td className="py-3.5 px-4 text-center">
                          <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300">
                            {s.ordersCount} compras
                          </span>
                        </td>

                        {/* Valuation */}
                        <td className="py-3.5 px-4 text-right font-extrabold text-sm text-brand dark:text-blue-400 font-display">
                          {fmt(s.totalSpent)}
                        </td>

                        {/* Actions */}
                        <td className="py-3.5 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => setSelectedSupplier(s)}
                              title="Ver expediente"
                              className="p-1.5 rounded-lg text-slate-400 hover:text-brand hover:bg-blue-50 dark:hover:bg-blue-500/10 dark:hover:text-blue-400 transition-colors"
                            >
                              <Eye size={15} />
                            </button>
                            <button
                              onClick={() => navigate(`/proveedores/editar/${s.id}`)}
                              title="Editar proveedor"
                              className="p-1.5 rounded-lg text-slate-400 hover:text-brand hover:bg-blue-50 dark:hover:bg-blue-500/10 dark:hover:text-blue-400 transition-colors"
                            >
                              <Pencil size={15} />
                            </button>
                            <button
                              onClick={() => setConfirmDelete(s)}
                              title="Eliminar proveedor"
                              className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 dark:hover:text-red-400 transition-colors"
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
            <div className="p-3 bg-slate-50/70 dark:bg-zinc-800/40 border-t border-slate-100 dark:border-zinc-800 flex items-center justify-between text-xs text-slate-500 dark:text-zinc-400">
              <span>
                Mostrando <strong>{filtered.length}</strong> de <strong>{suppliers.length}</strong> proveedores registrados
              </span>
              <span>Directorio Oficial de Proveedores ERP</span>
            </div>
          </div>
        )}

      </div>

      {/* ═════════════════════════════════════════════════════════
          4. SUPPLIER DOSSIER / EXPEDIENTE DRILL-DOWN MODAL
         ═════════════════════════════════════════════════════════ */}
      <Modal
        open={!!selectedSupplier}
        onClose={() => setSelectedSupplier(null)}
        title={`Expediente: ${selectedSupplier?.name || ''}`}
        width="max-w-3xl"
      >
        {selectedSupplier && (
          <div className="space-y-4">
            {/* Header info */}
            <div className="bg-slate-50 dark:bg-zinc-800/50 p-4 rounded-xl border border-slate-200/80 dark:border-zinc-700/80 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-slate-900 dark:text-zinc-100 text-base">
                      {selectedSupplier.name}
                    </h3>
                    {selectedSupplier.ruc && (
                      <span className="font-mono text-xs font-bold bg-white dark:bg-zinc-900 px-2 py-0.5 rounded border border-slate-200 dark:border-zinc-700 text-slate-700 dark:text-zinc-300">
                        RUC {selectedSupplier.ruc}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">
                    {selectedSupplier.address || 'Sin dirección fiscal registrada.'}
                  </p>
                </div>

                <button
                  onClick={() => {
                    navigate('/compras/nueva', { state: { supplierId: selectedSupplier.id } })
                  }}
                  className="btn-primary text-xs shrink-0"
                >
                  <Plus size={14} /> Nueva Orden de Compra
                </button>
              </div>

              {/* Contact summary */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2 border-t border-slate-200/60 dark:border-zinc-700/60 text-xs">
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Contacto:</span>
                  <strong className="text-slate-800 dark:text-zinc-200">{selectedSupplier.contact_name || 'No especificado'}</strong>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Teléfono:</span>
                  <span className="font-mono text-slate-800 dark:text-zinc-200">{selectedSupplier.phone || 'Sin registrar'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Correo:</span>
                  <span className="text-slate-800 dark:text-zinc-200 truncate block">{selectedSupplier.email || 'Sin registrar'}</span>
                </div>
              </div>
            </div>

            {/* Financial indicators */}
            <div className="grid grid-cols-3 gap-2.5 text-center">
              <div className="bg-slate-50 dark:bg-zinc-800/40 p-3 rounded-xl border border-slate-200/80 dark:border-zinc-800">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Órdenes Totales</p>
                <p className="font-black text-slate-900 dark:text-zinc-100 text-base font-display">
                  {selectedSupplier.ordersCount} compras
                </p>
              </div>
              <div className="bg-slate-50 dark:bg-zinc-800/40 p-3 rounded-xl border border-slate-200/80 dark:border-zinc-800">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Total Invertido</p>
                <p className="font-black text-brand dark:text-blue-400 text-base font-display">
                  {fmt(selectedSupplier.totalSpent)}
                </p>
              </div>
              <div className="bg-slate-50 dark:bg-zinc-800/40 p-3 rounded-xl border border-slate-200/80 dark:border-zinc-800">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Productos en Catálogo</p>
                <p className="font-black text-emerald-600 dark:text-emerald-400 text-base font-display">
                  {selectedSupplier.productsCount} SKUs
                </p>
              </div>
            </div>

            {/* Purchases history */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-slate-900 dark:text-zinc-100 uppercase tracking-wider">
                Historial de Órdenes de Compra Realizadas
              </h4>

              {selectedSupplier.purchases.length === 0 ? (
                <div className="py-8 text-center bg-slate-50/50 dark:bg-zinc-900/50 rounded-xl border border-dashed border-slate-200 dark:border-zinc-800">
                  <ShoppingBag size={28} className="mx-auto text-slate-300 dark:text-zinc-600 mb-2" />
                  <p className="text-xs font-semibold text-slate-600 dark:text-zinc-400">
                    Aún no hay compras registradas con este proveedor.
                  </p>
                </div>
              ) : (
                <div className="border border-slate-200 dark:border-zinc-800 rounded-xl overflow-hidden max-h-[260px] overflow-y-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead className="bg-slate-50 dark:bg-zinc-800 sticky top-0 z-10 border-b border-slate-200 dark:border-zinc-700">
                      <tr className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        <th className="py-2.5 px-3">Fecha</th>
                        <th className="py-2.5 px-3">Estado</th>
                        <th className="py-2.5 px-3 text-center">Ítems</th>
                        <th className="py-2.5 px-3 text-right">Monto Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-zinc-800">
                      {selectedSupplier.purchases.map((pur) => {
                        const total = purchasesService.purchaseTotal(pur)
                        const itemCount = pur.items?.length || 0

                        return (
                          <tr key={pur.id} className="hover:bg-slate-50 dark:hover:bg-zinc-800/40">
                            <td className="py-2.5 px-3 font-medium text-slate-700 dark:text-zinc-300">
                              {dateStr(pur.created_at)}
                            </td>
                            <td className="py-2.5 px-3">
                              {pur.status === 'recibido' ? (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 dark:bg-emerald-500/10 dark:text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-500/20">
                                  <Check size={11} /> Recibido
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-50 dark:bg-amber-500/10 dark:text-amber-400 px-2 py-0.5 rounded-full border border-amber-200 dark:border-amber-500/20">
                                  <Clock size={11} /> Pendiente
                                </span>
                              )}
                            </td>
                            <td className="py-2.5 px-3 text-center font-mono">
                              {itemCount} producto{itemCount !== 1 ? 's' : ''}
                            </td>
                            <td className="py-2.5 px-3 text-right font-bold font-mono text-slate-900 dark:text-zinc-100">
                              {fmt(total)}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setSelectedSupplier(null)}
                className="btn-secondary text-xs"
              >
                Cerrar Expediente
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* ═════════════════════════════════════════════════════════
          5. CONFIRM DELETE MODAL
         ═════════════════════════════════════════════════════════ */}
      <Modal
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        title="Eliminar Proveedor"
        width="max-w-sm"
      >
        {confirmDelete && (
          <div className="space-y-4">
            <p className="text-sm text-slate-600 dark:text-zinc-300">
              ¿Estás seguro de que deseas eliminar el proveedor{' '}
              <strong className="text-slate-900 dark:text-zinc-100">{confirmDelete.name}</strong>?
            </p>

            {confirmDelete.ordersCount > 0 && (
              <div className="flex items-start gap-2 text-xs text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-xl p-3">
                <AlertCircle size={16} className="shrink-0 mt-0.5" />
                <span>
                  Este proveedor tiene <strong>{confirmDelete.ordersCount}</strong> órdenes de compra asociadas.
                  Las órdenes se mantendrán en el historial pero el proveedor quedará desvinculado.
                </span>
              </div>
            )}

            <div className="flex justify-end gap-2.5 pt-2">
              <button
                onClick={() => setConfirmDelete(null)}
                className="btn-secondary"
              >
                Cancelar
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="btn-danger"
              >
                {deleting ? 'Eliminando…' : 'Eliminar Proveedor'}
              </button>
            </div>
          </div>
        )}
      </Modal>

    </AppLayout>
  )
}
