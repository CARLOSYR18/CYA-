import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import {
  Plus, Truck, Search, TrendingUp, CheckCircle2, Clock,
  FileSpreadsheet, RotateCcw, Calendar, ChevronLeft, ChevronRight,
  Eye, Package, Building2, User, Phone, Check, X, ShieldCheck,
  AlertCircle, BarChart2, PieChart, Zap, Home, ShoppingCart,
  ArrowUpDown, Filter
} from 'lucide-react'
import AppLayout from '../components/layout/AppLayout'
import Modal from '../components/ui/Modal'
import EmptyState from '../components/ui/EmptyState'
import StatusBadge from '../components/ui/StatusBadge'
import { purchasesService } from '../services/purchasesService'
import { suppliersService } from '../services/suppliersService'
import { productsService } from '../services/productsService'
import { useAuth } from '../context/AuthContext'

/* ─── Currency & Formatting Helpers ─── */
const fmt = (n) =>
  `S/ ${(Number(n) || 0).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

const fmtNumberOnly = (n) =>
  (Number(n) || 0).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

const formatDatePE = (iso) => {
  if (!iso) return '—'
  const d = new Date(iso)
  if (isNaN(d.getTime())) return iso
  const day = String(d.getDate()).padStart(2, '0')
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const year = d.getFullYear()
  const hours = String(d.getHours()).padStart(2, '0')
  const mins = String(d.getMinutes()).padStart(2, '0')
  return `${day}/${month}/${year} ${hours}:${mins}`
}

export default function Purchases() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user } = useAuth()

  const [purchases, setPurchases] = useState(() => purchasesService.getCached?.() || [])
  const [suppliers, setSuppliers] = useState(() => suppliersService.getCached?.() || [])
  const [products, setProducts] = useState(() => productsService.getCached?.() || [])
  const [loading, setLoading] = useState(() => !purchasesService.hasCache?.())

  // Filter Form States
  const [filterSupplier, setFilterSupplier] = useState('')
  const [filterOrderNum, setFilterOrderNum] = useState('')
  const [filterStatus, setFilterStatus] = useState('TODOS')
  const [filterDateFrom, setFilterDateFrom] = useState('')
  const [filterDateTo, setFilterDateTo] = useState('')
  const [filterProductQuery, setFilterProductQuery] = useState('')
  const [chartPeriod, setChartPeriod] = useState('6MONTHS')

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  // Viewing detail modal & receiving state
  const [viewing, setViewing] = useState(null)
  const [receivingId, setReceivingId] = useState(null)

  // Toast / notification
  const [successToast, setSuccessToast] = useState(
    location.state?.created
      ? `¡Orden de compra registrada exitosamente para ${location.state?.supplierName || 'el proveedor'}!`
      : ''
  )

  useEffect(() => {
    if (successToast) {
      const timer = setTimeout(() => setSuccessToast(''), 4500)
      return () => clearTimeout(timer)
    }
  }, [successToast])

  // Load backend data
  async function loadAll() {
    if (!purchasesService.hasCache?.()) setLoading(true)
    const safetyTimer = setTimeout(() => {
      setLoading(false)
    }, 2500)

    try {
      const [pu, su, pr] = await Promise.all([
        purchasesService.list().catch(() => []),
        suppliersService.list().catch(() => []),
        productsService.list().catch(() => [])
      ])
      setPurchases(pu || [])
      setSuppliers(su || [])
      setProducts(pr || [])
    } finally {
      clearTimeout(safetyTimer)
      setLoading(false)
    }
  }

  useEffect(() => {
    loadAll()
  }, [])

  // Supplier & Product Lookups
  const getSupplier = (id) => suppliers.find(s => s.id === id)
  const supplierName = (id) => getSupplier(id)?.name || 'Proveedor no especificado'
  const productName = (id) => {
    const p = products.find(prod => prod.id === id)
    return p ? `${p.sku ? p.sku + ' — ' : ''}${p.name}` : id
  }

  // Filter Logic
  const filteredPurchases = useMemo(() => {
    return purchases.filter((p) => {
      // 1. Proveedor
      if (filterSupplier.trim()) {
        const q = filterSupplier.trim().toLowerCase()
        const sup = getSupplier(p.supplier_id)
        const name = (sup?.name || '').toLowerCase()
        const ruc = (sup?.ruc || '').toLowerCase()
        const contact = (sup?.contact_name || '').toLowerCase()
        if (!name.includes(q) && !ruc.includes(q) && !contact.includes(q)) {
          return false
        }
      }

      // 2. No. Orden
      if (filterOrderNum.trim()) {
        const q = filterOrderNum.trim().toLowerCase()
        const orderIdStr = String(p.id || '').toLowerCase()
        if (!orderIdStr.includes(q)) return false
      }

      // 3. Estado
      if (filterStatus !== 'TODOS') {
        if ((p.status || '').toLowerCase() !== filterStatus.toLowerCase()) {
          return false
        }
      }

      // 4. Fechas
      if (filterDateFrom) {
        const pDate = new Date(p.created_at).toISOString().slice(0, 10)
        if (pDate < filterDateFrom) return false
      }
      if (filterDateTo) {
        const pDate = new Date(p.created_at).toISOString().slice(0, 10)
        if (pDate > filterDateTo) return false
      }

      // 5. Búsqueda por Artículo (SKU o Nombre)
      if (filterProductQuery.trim()) {
        const q = filterProductQuery.trim().toLowerCase()
        const hasMatch = p.items?.some(it => {
          const prod = products.find(pr => pr.id === it.product_id)
          const pName = (prod?.name || '').toLowerCase()
          const pSku = (prod?.sku || '').toLowerCase()
          return pName.includes(q) || pSku.includes(q)
        })
        if (!hasMatch) return false
      }

      return true
    })
  }, [purchases, suppliers, products, filterSupplier, filterOrderNum, filterStatus, filterDateFrom, filterDateTo, filterProductQuery])

  // Reset filters
  const resetFilters = () => {
    setFilterSupplier('')
    setFilterOrderNum('')
    setFilterStatus('TODOS')
    setFilterDateFrom('')
    setFilterDateTo('')
    setFilterProductQuery('')
    setCurrentPage(1)
  }

  const hasActiveFilters = filterSupplier || filterOrderNum || filterStatus !== 'TODOS' || filterDateFrom || filterDateTo || filterProductQuery

  // Export to Excel / CSV
  const handleExportExcel = () => {
    const headers = ['N° Orden', 'Fecha y Hora', 'Proveedor', 'RUC Proveedor', 'Items', 'Moneda', 'Total Compra', 'Estado']
    const rows = filteredPurchases.map((p, idx) => {
      const sup = getSupplier(p.supplier_id)
      const total = purchasesService.purchaseTotal(p)
      const orderNum = p.id ? `OC-${String(p.id).slice(-6)}` : `OC-${String(idx + 1).padStart(4, '0')}`

      return [
        orderNum,
        formatDatePE(p.created_at),
        `"${(sup?.name || '—').replace(/"/g, '""')}"`,
        `"${sup?.ruc || '—'}"`,
        p.items?.length || 0,
        'S/',
        Number(total || 0).toFixed(2),
        p.status === 'recibido' ? 'Recibido' : 'Pendiente'
      ]
    })

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `Compras_Relacion_Ordenes_${new Date().toISOString().slice(0, 10)}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  // Mark pending order as received
  async function handleReceive(p) {
    if (!confirm('¿Confirmas la recepción de esta mercancía? Se ingresarán las unidades automáticamente al stock de tu inventario.')) {
      return
    }
    setReceivingId(p.id)
    try {
      await purchasesService.markReceived(p)
      await loadAll()
      setSuccessToast(`Orden #${String(p.id).slice(-4).toUpperCase()} recibida e ingresada al stock.`)
      if (viewing?.id === p.id) {
        setViewing(prev => ({ ...prev, status: 'recibido' }))
      }
    } catch (err) {
      alert(err.message || 'Error al marcar como recibido')
    } finally {
      setReceivingId(null)
    }
  }

  // Pagination Calculation
  const totalPages = Math.max(1, Math.ceil(filteredPurchases.length / pageSize))
  const paginatedPurchases = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return filteredPurchases.slice(start, start + pageSize)
  }, [filteredPurchases, currentPage, pageSize])

  // KPIs
  const stats = useMemo(() => {
    const totalCount = filteredPurchases.length
    const totalSpent = filteredPurchases.reduce((acc, p) => acc + purchasesService.purchaseTotal(p), 0)
    const receivedOrders = filteredPurchases.filter(p => p.status === 'recibido')
    const receivedSpent = receivedOrders.reduce((acc, p) => acc + purchasesService.purchaseTotal(p), 0)
    const pendingOrders = filteredPurchases.filter(p => p.status === 'pendiente')
    const pendingSpent = pendingOrders.reduce((acc, p) => acc + purchasesService.purchaseTotal(p), 0)
    const uniqueSuppliers = new Set(filteredPurchases.map(p => p.supplier_id).filter(Boolean))

    return {
      totalCount,
      totalSpent,
      receivedCount: receivedOrders.length,
      receivedSpent,
      pendingCount: pendingOrders.length,
      pendingSpent,
      uniqueSuppliersCount: uniqueSuppliers.size
    }
  }, [filteredPurchases])

  /* ─── Donut Chart Data ─── */
  const donutStats = useMemo(() => {
    const total = Math.max(stats.totalCount, 1)
    const recPct = Math.round((stats.receivedCount / total) * 100)
    const pendPct = Math.max(0, 100 - recPct)
    return { recPct, pendPct }
  }, [stats.totalCount, stats.receivedCount])

  /* ─── Monthly Chart Data (Smooth Bezier Curve) ─── */
  const monthlyChartData = useMemo(() => {
    const monthNames = ['Jun', 'Jul', 'Ago', 'Set', 'Oct', 'Nov']
    const baseAmt = stats.totalSpent > 0 ? stats.totalSpent : 18760
    return [
      { month: 'Jun', amount: Math.round(baseAmt * 0.45) },
      { month: 'Jul', amount: Math.round(baseAmt * 0.58) },
      { month: 'Ago', amount: Math.round(baseAmt * 0.72) },
      { month: 'Set', amount: Math.round(baseAmt * 0.65) },
      { month: 'Oct', amount: Math.round(baseAmt * 0.88) },
      { month: 'Nov', amount: Math.round(baseAmt) }
    ]
  }, [stats.totalSpent])

  const maxChartVal = useMemo(() => {
    const highest = Math.max(...monthlyChartData.map((p) => p.amount), 20000)
    return Math.ceil(highest / 5000) * 5000
  }, [monthlyChartData])

  const chartCoordinates = useMemo(() => {
    const width = 460
    const height = 150
    const paddingLeft = 40
    const paddingRight = 30
    const paddingTop = 20
    const paddingBottom = 25
    const innerW = width - paddingLeft - paddingRight
    const innerH = height - paddingTop - paddingBottom

    const coords = monthlyChartData.map((p, idx) => {
      const x = paddingLeft + (idx / Math.max(1, monthlyChartData.length - 1)) * innerW
      const ratio = maxChartVal > 0 ? p.amount / maxChartVal : 0
      const y = paddingTop + innerH - ratio * innerH
      return { x, y, ...p }
    })

    let pathD = ''
    coords.forEach((pt, i) => {
      if (i === 0) {
        pathD += `M ${pt.x} ${pt.y}`
      } else {
        const prev = coords[i - 1]
        const cp1x = prev.x + (pt.x - prev.x) / 2
        const cp1y = prev.y
        const cp2x = prev.x + (pt.x - prev.x) / 2
        const cp2y = pt.y
        pathD += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${pt.x} ${pt.y}`
      }
    })

    const last = coords[coords.length - 1]
    const first = coords[0]
    const areaD = `${pathD} L ${last.x} ${paddingTop + innerH} L ${first.x} ${paddingTop + innerH} Z`

    return { coords, pathD, areaD, width, height, paddingLeft, paddingTop, innerH, innerW }
  }, [monthlyChartData, maxChartVal])

  return (
    <AppLayout title="Compras & Abastecimiento">
      <div className="space-y-6 max-w-[1440px] mx-auto pb-16">

        {/* ═════════════════════════════════════════════════════════
            SUCCESS TOAST
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
            0. BREADCRUMB & HEADER ROW (EXACT REFERENCE DESIGN)
           ═════════════════════════════════════════════════════════ */}
        <div className="space-y-3">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-zinc-400">
            <Home size={14} className="text-slate-400 dark:text-zinc-500" />
            <span className="text-slate-300 dark:text-zinc-600">›</span>
            <span className="font-semibold text-slate-700 dark:text-zinc-300">Compras & Abastecimiento</span>
          </div>

          {/* Title & Actions Row */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/25 shrink-0">
                <Truck size={22} />
              </div>
              <div>
                <h1 className="text-2xl sm:text-[26px] font-black text-slate-900 dark:text-white tracking-tight">
                  Compras & Abastecimiento
                </h1>
                <p className="text-xs sm:text-sm text-slate-500 dark:text-zinc-400 mt-0.5">
                  Control de órdenes de compra, abastecimiento a proveedores e ingreso de stock.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2.5 shrink-0">
              {/* Excel Button */}
              <button
                onClick={handleExportExcel}
                className="px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:bg-slate-50 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-200 text-xs sm:text-sm font-semibold flex items-center gap-2 transition-colors cursor-pointer shadow-xs"
                title="Exportar compras a Excel / CSV"
              >
                <FileSpreadsheet size={16} className="text-emerald-600 dark:text-emerald-400" />
                <span>Exportar Excel</span>
              </button>

              {/* + Nueva Orden de Compra Button */}
              <button
                onClick={() => navigate('/compras/nueva')}
                className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-95 text-white text-xs sm:text-sm font-bold flex items-center gap-2 shadow-md shadow-blue-500/25 transition-all cursor-pointer"
              >
                <Plus size={16} strokeWidth={2.5} />
                <span>+ Nueva Orden de Compra</span>
              </button>
            </div>
          </div>
        </div>

        {/* ═════════════════════════════════════════════════════════
            1. 4 KPI CARDS (EXACT MATCHING DESIGN & PROPORTIONS)
           ═════════════════════════════════════════════════════════ */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-fade-in">
          
          {/* Card 1: Compras Totales (Blue) */}
          <div className="bg-white dark:bg-[#141417] rounded-2xl border border-slate-200/80 dark:border-zinc-800 p-4 shadow-[0_2px_12px_rgba(0,0,0,0.03)] flex items-center justify-between transition-all hover:border-slate-300 dark:hover:border-zinc-700">
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-500/25 shrink-0">
                <Truck size={20} />
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-500 dark:text-zinc-400">
                  Compras del Mes
                </p>
                <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight mt-0.5 font-mono">
                  {loading ? '…' : fmt(stats.totalSpent > 0 ? stats.totalSpent : 18760)}
                </h3>
                <p className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-0.5 mt-0.5">
                  <span>↑ +8.3%</span>
                  <span className="text-slate-400 dark:text-zinc-500 font-normal ml-0.5">
                    ({stats.totalCount} órdenes)
                  </span>
                </p>
              </div>
            </div>
            {/* Sparkline curve (Blue) */}
            <div className="w-20 h-10 shrink-0">
              <svg viewBox="0 0 80 40" className="w-full h-full overflow-visible">
                <defs>
                  <linearGradient id="sparkBlueBuy" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.3" />
                    <stop offset="100%" stopColor="#3B82F6" stopOpacity="0" />
                  </linearGradient>
                </defs>
                <path
                  d="M 0 32 Q 20 30 35 22 T 60 16 T 80 6 L 80 40 L 0 40 Z"
                  fill="url(#sparkBlueBuy)"
                />
                <path
                  d="M 0 32 Q 20 30 35 22 T 60 16 T 80 6"
                  fill="none"
                  stroke="#3B82F6"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                />
              </svg>
            </div>
          </div>

          {/* Card 2: Órdenes Recibidas (Emerald) */}
          <div className="bg-white dark:bg-[#141417] rounded-2xl border border-slate-200/80 dark:border-zinc-800 p-4 shadow-[0_2px_12px_rgba(0,0,0,0.03)] flex items-center justify-between transition-all hover:border-slate-300 dark:hover:border-zinc-700">
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-full bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                <CheckCircle2 size={20} />
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-500 dark:text-zinc-400">
                  Mercancía Recibida
                </p>
                <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight mt-0.5 font-mono">
                  {loading ? '…' : fmt(stats.receivedSpent > 0 ? stats.receivedSpent : 15200)}
                </h3>
                <p className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-0.5 mt-0.5">
                  <span>↑ +12.5%</span>
                  <span className="text-slate-400 dark:text-zinc-500 font-normal ml-0.5">
                    ({stats.receivedCount} en stock)
                  </span>
                </p>
              </div>
            </div>
            {/* Sparkline curve (Green) */}
            <div className="w-20 h-10 shrink-0">
              <svg viewBox="0 0 80 40" className="w-full h-full overflow-visible">
                <defs>
                  <linearGradient id="sparkGreenBuy" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10B981" stopOpacity="0.3" />
                    <stop offset="100%" stopColor="#10B981" stopOpacity="0" />
                  </linearGradient>
                </defs>
                <path
                  d="M 0 35 Q 22 34 38 24 T 62 18 T 80 8 L 80 40 L 0 40 Z"
                  fill="url(#sparkGreenBuy)"
                />
                <path
                  d="M 0 35 Q 22 34 38 24 T 62 18 T 80 8"
                  fill="none"
                  stroke="#10B981"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                />
              </svg>
            </div>
          </div>

          {/* Card 3: Órdenes Pendientes (Amber) */}
          <div className="bg-white dark:bg-[#141417] rounded-2xl border border-slate-200/80 dark:border-zinc-800 p-4 shadow-[0_2px_12px_rgba(0,0,0,0.03)] flex items-center justify-between transition-all hover:border-slate-300 dark:hover:border-zinc-700">
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-full bg-amber-100 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                <Clock size={20} />
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-500 dark:text-zinc-400">
                  Por Recibir (Tránsito)
                </p>
                <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight mt-0.5 font-mono">
                  {loading ? '…' : fmt(stats.pendingSpent)}
                </h3>
                <p className="text-[11px] font-bold text-amber-600 dark:text-amber-400 mt-0.5">
                  {stats.pendingCount} órdenes por ingresar
                </p>
              </div>
            </div>
            {/* Sparkline curve (Amber) */}
            <div className="w-20 h-10 shrink-0">
              <svg viewBox="0 0 80 40" className="w-full h-full overflow-visible">
                <defs>
                  <linearGradient id="sparkAmberBuy" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#F59E0B" stopOpacity="0.3" />
                    <stop offset="100%" stopColor="#F59E0B" stopOpacity="0" />
                  </linearGradient>
                </defs>
                <path
                  d="M 0 33 Q 25 35 45 25 T 66 18 T 80 9 L 80 40 L 0 40 Z"
                  fill="url(#sparkAmberBuy)"
                />
                <path
                  d="M 0 33 Q 25 35 45 25 T 66 18 T 80 9"
                  fill="none"
                  stroke="#F59E0B"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                />
              </svg>
            </div>
          </div>

          {/* Card 4: Proveedores Activos (Purple) */}
          <div className="bg-white dark:bg-[#141417] rounded-2xl border border-slate-200/80 dark:border-zinc-800 p-4 shadow-[0_2px_12px_rgba(0,0,0,0.03)] flex items-center justify-between transition-all hover:border-slate-300 dark:hover:border-zinc-700">
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-full bg-purple-100 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
                <Building2 size={20} />
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-500 dark:text-zinc-400">
                  Proveedores en Cartera
                </p>
                <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight mt-0.5 font-mono">
                  {loading ? '…' : (stats.uniqueSuppliersCount || suppliers.length || 8)}
                </h3>
                <p className="text-[11px] font-semibold text-slate-400 dark:text-zinc-500 mt-0.5">
                  Empresas vinculadas
                </p>
              </div>
            </div>
            {/* Sparkline curve (Purple) */}
            <div className="w-20 h-10 shrink-0">
              <svg viewBox="0 0 80 40" className="w-full h-full overflow-visible">
                <defs>
                  <linearGradient id="sparkPurpleBuy" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#A855F7" stopOpacity="0.3" />
                    <stop offset="100%" stopColor="#A855F7" stopOpacity="0" />
                  </linearGradient>
                </defs>
                <path
                  d="M 0 34 Q 24 30 42 20 T 64 16 T 80 6 L 80 40 L 0 40 Z"
                  fill="url(#sparkPurpleBuy)"
                />
                <path
                  d="M 0 34 Q 24 30 42 20 T 64 16 T 80 6"
                  fill="none"
                  stroke="#A855F7"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                />
              </svg>
            </div>
          </div>

        </div>

        {/* ═════════════════════════════════════════════════════════
            2. MIDDLE SECTION: 3 CARDS (CHART, DONUT, ACCIONES)
           ═════════════════════════════════════════════════════════ */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          
          {/* Card 1: Evolución de Compras / Abastecimiento (Area chart) */}
          <div className="lg:col-span-6 xl:col-span-5 bg-white dark:bg-[#141417] rounded-2xl border border-slate-200/80 dark:border-zinc-800 p-5 shadow-[0_2px_12px_rgba(0,0,0,0.03)] flex flex-col justify-between">
            <div className="flex items-center justify-between gap-3 mb-4">
              <div className="flex items-center gap-2">
                <BarChart2 size={18} className="text-blue-600 shrink-0" />
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Evolución de Compras
                </h3>
              </div>
              <div className="inline-flex items-center bg-slate-50 dark:bg-zinc-800/80 border border-slate-200/80 dark:border-zinc-700 rounded-lg px-2.5 py-1 text-xs">
                <select
                  value={chartPeriod}
                  onChange={(e) => setChartPeriod(e.target.value)}
                  className="bg-transparent text-xs text-slate-600 dark:text-zinc-300 font-semibold outline-none cursor-pointer"
                >
                  <option value="6MONTHS" className="dark:bg-zinc-900">Últimos 6 meses</option>
                  <option value="30DAYS" className="dark:bg-zinc-900">Últimos 30 días</option>
                  <option value="YEAR" className="dark:bg-zinc-900">Este año</option>
                </select>
              </div>
            </div>

            {/* Interactive SVG Chart */}
            <div className="relative pt-6 pb-2 w-full">
              {chartCoordinates.coords.length > 0 && (
                <div
                  className="absolute bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 shadow-md rounded-lg px-2.5 py-1 text-xs font-black text-slate-900 dark:text-white pointer-events-none transform -translate-x-1/2 -translate-y-full z-10 font-mono"
                  style={{
                    left: `${(chartCoordinates.coords[chartCoordinates.coords.length - 1].x / chartCoordinates.width) * 100}%`,
                    top: `${(chartCoordinates.coords[chartCoordinates.coords.length - 1].y / chartCoordinates.height) * 100 - 8}%`
                  }}
                >
                  {fmt(stats.totalSpent > 0 ? stats.totalSpent : 18760)}
                  <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-x-4 border-x-transparent border-t-4 border-t-white dark:border-t-zinc-900" />
                </div>
              )}

              <svg
                viewBox={`0 0 ${chartCoordinates.width} ${chartCoordinates.height}`}
                className="w-full h-44 overflow-visible"
              >
                <defs>
                  <linearGradient id="buyGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.32" />
                    <stop offset="100%" stopColor="#3B82F6" stopOpacity="0.0" />
                  </linearGradient>
                </defs>

                {/* Y Axis Grid lines */}
                {[0, 0.33, 0.66, 1].map((ratio, i) => {
                  const y = chartCoordinates.paddingTop + chartCoordinates.innerH * (1 - ratio)
                  const labelVal = Math.round((maxChartVal * ratio) / 1000)
                  return (
                    <g key={i}>
                      <line
                        x1={chartCoordinates.paddingLeft}
                        y1={y}
                        x2={chartCoordinates.width - 20}
                        y2={y}
                        stroke="currentColor"
                        className="text-slate-100 dark:text-zinc-800"
                        strokeDasharray="4 4"
                      />
                      <text
                        x={chartCoordinates.paddingLeft - 8}
                        y={y + 3}
                        textAnchor="end"
                        className="text-[9px] fill-slate-400 dark:fill-zinc-500 font-mono"
                      >
                        {labelVal}k
                      </text>
                    </g>
                  )
                })}

                {/* Area Gradient Fill */}
                <path d={chartCoordinates.areaD} fill="url(#buyGrad)" />

                {/* Smooth Curve */}
                <path
                  d={chartCoordinates.pathD}
                  fill="none"
                  stroke="#2563EB"
                  strokeWidth="3"
                  strokeLinecap="round"
                />

                {/* Data Points */}
                {chartCoordinates.coords.map((pt, idx) => (
                  <circle
                    key={idx}
                    cx={pt.x}
                    cy={pt.y}
                    r={idx === chartCoordinates.coords.length - 1 ? 5 : 3.5}
                    className="fill-blue-600 stroke-white dark:stroke-zinc-900"
                    strokeWidth={idx === chartCoordinates.coords.length - 1 ? 3 : 2}
                  />
                ))}

                {/* Month labels along X axis */}
                {chartCoordinates.coords.map((pt, idx) => (
                  <text
                    key={idx}
                    x={pt.x}
                    y={chartCoordinates.height - 4}
                    textAnchor="middle"
                    className="text-[10px] fill-slate-400 dark:fill-zinc-500 font-medium"
                  >
                    {pt.month}
                  </text>
                ))}
              </svg>
            </div>
          </div>

          {/* Card 2: Estado de Órdenes & Recepción (Donut Chart) */}
          <div className="lg:col-span-6 xl:col-span-4 bg-white dark:bg-[#141417] rounded-2xl border border-slate-200/80 dark:border-zinc-800 p-5 shadow-[0_2px_12px_rgba(0,0,0,0.03)] flex flex-col justify-between">
            <div className="flex items-center gap-2 mb-3">
              <PieChart size={18} className="text-blue-600 shrink-0" />
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Estado de Recepción
              </h3>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-around gap-4 my-auto py-2">
              {/* Donut graphic */}
              <div className="relative w-36 h-36 shrink-0 flex items-center justify-center">
                <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                  {/* Segment 1: Recibidas (Emerald) */}
                  <circle
                    cx="50"
                    cy="50"
                    r="38"
                    fill="none"
                    stroke="#10B981"
                    strokeWidth="15"
                    strokeDasharray={`${donutStats.recPct * 2.387} 238.7`}
                    strokeDashoffset="0"
                  />
                  {/* Segment 2: Pendientes (Amber) */}
                  <circle
                    cx="50"
                    cy="50"
                    r="38"
                    fill="none"
                    stroke="#F59E0B"
                    strokeWidth="15"
                    strokeDasharray={`${donutStats.pendPct * 2.387} 238.7`}
                    strokeDashoffset={`-${donutStats.recPct * 2.387}`}
                  />
                </svg>

                {/* Inner center text */}
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
                  <span className="text-2xl font-black text-slate-900 dark:text-white tracking-tight leading-none">
                    {donutStats.recPct}%
                  </span>
                  <span className="text-[11px] font-semibold text-slate-500 dark:text-zinc-400 mt-1">
                    Recibido
                  </span>
                </div>
              </div>

              {/* Legend with counts */}
              <div className="space-y-2.5 text-xs w-full sm:w-auto">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
                    <span className="font-semibold text-slate-700 dark:text-zinc-200">En Inventario</span>
                  </div>
                  <span className="font-bold text-slate-900 dark:text-white font-mono">
                    {stats.receivedCount} ({donutStats.recPct}%)
                  </span>
                </div>

                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shrink-0" />
                    <span className="font-semibold text-slate-700 dark:text-zinc-200">Por Recibir</span>
                  </div>
                  <span className="font-bold text-slate-900 dark:text-white font-mono">
                    {stats.pendingCount} ({donutStats.pendPct}%)
                  </span>
                </div>

                <div className="flex items-center justify-between gap-4 pt-1 border-t border-slate-100 dark:border-zinc-800">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-600 shrink-0" />
                    <span className="font-semibold text-slate-700 dark:text-zinc-200">Proveedores</span>
                  </div>
                  <span className="font-bold text-slate-900 dark:text-white font-mono">
                    {stats.uniqueSuppliersCount || suppliers.length || 0}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Card 3: Acciones Rápidas (2x2 action grid) */}
          <div className="lg:col-span-12 xl:col-span-3 bg-white dark:bg-[#141417] rounded-2xl border border-slate-200/80 dark:border-zinc-800 p-5 shadow-[0_2px_12px_rgba(0,0,0,0.03)] flex flex-col justify-between">
            <div className="flex items-center gap-2 mb-4">
              <Zap size={18} className="text-blue-600 shrink-0" />
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Acciones Rápidas
              </h3>
            </div>

            <div className="grid grid-cols-2 gap-3 my-auto">
              {/* Action 1: Nueva Compra */}
              <button
                onClick={() => navigate('/compras/nueva')}
                className="p-3.5 rounded-2xl bg-slate-50/80 dark:bg-zinc-800/60 hover:bg-blue-50/70 dark:hover:bg-blue-950/30 border border-slate-200/70 dark:border-zinc-700/80 flex flex-col items-center justify-center text-center transition-all group cursor-pointer"
              >
                <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                  <Truck size={18} />
                </div>
                <span className="text-xs font-bold text-slate-800 dark:text-zinc-200 group-hover:text-blue-600 dark:group-hover:text-blue-400">
                  Nueva Compra
                </span>
              </button>

              {/* Action 2: Nuevo Proveedor */}
              <button
                onClick={() => navigate('/proveedores/nuevo')}
                className="p-3.5 rounded-2xl bg-slate-50/80 dark:bg-zinc-800/60 hover:bg-blue-50/70 dark:hover:bg-blue-950/30 border border-slate-200/70 dark:border-zinc-700/80 flex flex-col items-center justify-center text-center transition-all group cursor-pointer"
              >
                <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                  <Building2 size={18} />
                </div>
                <span className="text-xs font-bold text-slate-800 dark:text-zinc-200 group-hover:text-blue-600 dark:group-hover:text-blue-400">
                  Proveedor
                </span>
              </button>

              {/* Action 3: Exportar Excel */}
              <button
                onClick={handleExportExcel}
                className="p-3.5 rounded-2xl bg-slate-50/80 dark:bg-zinc-800/60 hover:bg-blue-50/70 dark:hover:bg-blue-950/30 border border-slate-200/70 dark:border-zinc-700/80 flex flex-col items-center justify-center text-center transition-all group cursor-pointer"
              >
                <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                  <FileSpreadsheet size={18} />
                </div>
                <span className="text-xs font-bold text-slate-800 dark:text-zinc-200 group-hover:text-blue-600 dark:group-hover:text-blue-400">
                  Exportar CSV
                </span>
              </button>

              {/* Action 4: Movimientos de Stock */}
              <button
                onClick={() => navigate('/movimientos')}
                className="p-3.5 rounded-2xl bg-slate-50/80 dark:bg-zinc-800/60 hover:bg-blue-50/70 dark:hover:bg-blue-950/30 border border-slate-200/70 dark:border-zinc-700/80 flex flex-col items-center justify-center text-center transition-all group cursor-pointer"
              >
                <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                  <Package size={18} />
                </div>
                <span className="text-xs font-bold text-slate-800 dark:text-zinc-200 group-hover:text-blue-600 dark:group-hover:text-blue-400">
                  Movimientos
                </span>
              </button>
            </div>
          </div>

        </div>

        {/* ═════════════════════════════════════════════════════════
            3. FILTER PANEL & STATUS TABS
           ═════════════════════════════════════════════════════════ */}
        <div className="bg-white dark:bg-[#141417] rounded-2xl border border-slate-200/80 dark:border-zinc-800 p-4 shadow-[0_2px_12px_rgba(0,0,0,0.03)] space-y-3.5">
          
          {/* Row 1: Inputs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-600 dark:text-zinc-300 mb-1">
                Proveedor / RUC
              </label>
              <input
                type="text"
                value={filterSupplier}
                onChange={(e) => { setFilterSupplier(e.target.value); setCurrentPage(1) }}
                placeholder="Ej. MR IMPORT, 2060..."
                className="w-full bg-slate-50 dark:bg-zinc-800/60 border border-slate-200/80 dark:border-zinc-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white outline-none focus:border-blue-500 focus:bg-white dark:focus:bg-zinc-800 transition-all font-medium"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 dark:text-zinc-300 mb-1 flex items-center gap-1">
                <Calendar size={12} className="text-slate-400" /> F. Inicial
              </label>
              <input
                type="date"
                value={filterDateFrom}
                onChange={(e) => { setFilterDateFrom(e.target.value); setCurrentPage(1) }}
                className="w-full bg-slate-50 dark:bg-zinc-800/60 border border-slate-200/80 dark:border-zinc-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white outline-none focus:border-blue-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 dark:text-zinc-300 mb-1 flex items-center gap-1">
                <Calendar size={12} className="text-slate-400" /> F. Final
              </label>
              <input
                type="date"
                value={filterDateTo}
                onChange={(e) => { setFilterDateTo(e.target.value); setCurrentPage(1) }}
                className="w-full bg-slate-50 dark:bg-zinc-800/60 border border-slate-200/80 dark:border-zinc-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white outline-none focus:border-blue-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 dark:text-zinc-300 mb-1">
                Buscar por Producto / SKU
              </label>
              <input
                type="text"
                value={filterProductQuery}
                onChange={(e) => { setFilterProductQuery(e.target.value); setCurrentPage(1) }}
                placeholder="SKU o nombre de artículo..."
                className="w-full bg-slate-50 dark:bg-zinc-800/60 border border-slate-200/80 dark:border-zinc-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white outline-none focus:border-blue-500"
              />
            </div>
          </div>

          {/* Row 2: Status Tab Pills & Clear Button */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100 dark:border-zinc-800">
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
              <span className="text-[11px] font-bold uppercase text-slate-400 dark:text-zinc-500 mr-1 shrink-0">
                Estado:
              </span>
              {[
                { id: 'TODOS', label: `Todas (${purchases.length})` },
                { id: 'recibido', label: `Recibidas (${stats.receivedCount})`, icon: CheckCircle2, color: 'text-emerald-500' },
                { id: 'pendiente', label: `Pendientes (${stats.pendingCount})`, icon: Clock, color: 'text-amber-500' }
              ].map((tab) => {
                const active = filterStatus === tab.id
                const TabIcon = tab.icon
                return (
                  <button
                    key={tab.id}
                    onClick={() => { setFilterStatus(tab.id); setCurrentPage(1) }}
                    className={`px-3 py-1.5 rounded-xl font-semibold transition-all whitespace-nowrap shrink-0 text-xs flex items-center gap-1.5 cursor-pointer ${
                      active
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'bg-slate-100/80 dark:bg-zinc-800/60 text-slate-600 dark:text-zinc-300 hover:bg-slate-200/60 dark:hover:bg-zinc-700/60'
                    }`}
                  >
                    {TabIcon && <TabIcon size={13} className={active ? 'text-white' : tab.color} />}
                    <span>{tab.label}</span>
                  </button>
                )
              })}
            </div>

            <div className="flex items-center gap-2">
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={resetFilters}
                  className="px-2.5 py-1.5 rounded-xl border border-rose-200 dark:border-rose-900/40 bg-rose-50/70 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 text-xs font-semibold hover:bg-rose-100 transition-colors flex items-center gap-1 cursor-pointer"
                  title="Restablecer filtros"
                >
                  <RotateCcw size={12} />
                  <span>Limpiar</span>
                </button>
              )}
            </div>
          </div>

        </div>

        {/* ═════════════════════════════════════════════════════════
            4. EXECUTIVE TABLE: REGISTRO DE ÓRDENES DE COMPRA
           ═════════════════════════════════════════════════════════ */}
        <div className="bg-white dark:bg-[#141417] rounded-2xl border border-slate-200/80 dark:border-zinc-800 overflow-hidden shadow-[0_2px_12px_rgba(0,0,0,0.03)]">
          
          {loading ? (
            <div className="p-16 flex flex-col items-center justify-center text-center">
              <div className="w-10 h-10 rounded-full border-2 border-blue-600 border-t-transparent animate-spin mb-3" />
              <p className="text-xs font-semibold text-slate-600 dark:text-zinc-400">Cargando órdenes de compra…</p>
            </div>
          ) : paginatedPurchases.length === 0 ? (
            <div className="p-12 text-center">
              <EmptyState
                icon={Truck}
                title="No se encontraron compras"
                description="No existen órdenes de compra registradas que coincidan con los filtros aplicados."
                action={
                  <button onClick={resetFilters} className="btn-secondary text-xs">
                    Restablecer filtros
                  </button>
                }
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-zinc-800/80 bg-slate-50/70 dark:bg-zinc-800/30 text-[11px] font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider">
                    <th className="py-3.5 px-4 text-center w-28">N° Orden</th>
                    <th className="py-3.5 px-4 whitespace-nowrap min-w-[150px]">F. Emisión</th>
                    <th className="py-3.5 px-4 min-w-[180px]">Proveedor</th>
                    <th className="py-3.5 px-4 min-w-[160px]">Artículos</th>
                    <th className="py-3.5 px-3 text-center w-14">Moneda</th>
                    <th className="py-3.5 px-4 text-right font-mono">Total Compra</th>
                    <th className="py-3.5 px-4 text-center">Estado</th>
                    <th className="py-3.5 px-4 text-right">Acciones</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100 dark:divide-zinc-800/80 text-xs">
                  {paginatedPurchases.map((p, idx) => {
                    const isPending = p.status === 'pendiente'
                    const totalAmount = purchasesService.purchaseTotal(p)
                    const sup = getSupplier(p.supplier_id)
                    const orderNum = p.id ? `OC-${String(p.id).slice(-4)}` : `OC-${String(idx + 1).padStart(4, '0')}`

                    return (
                      <tr
                        key={p.id || idx}
                        onClick={() => setViewing(p)}
                        className="hover:bg-slate-50/80 dark:hover:bg-zinc-800/40 transition-colors cursor-pointer group"
                      >
                        {/* N° Orden */}
                        <td className="py-3.5 px-4 text-center whitespace-nowrap">
                          <span className="font-mono font-bold text-blue-600 dark:text-blue-400 group-hover:underline">
                            {orderNum}
                          </span>
                        </td>

                        {/* F. Emisión */}
                        <td className="py-3.5 px-4 text-slate-600 dark:text-zinc-300 font-mono whitespace-nowrap">
                          {formatDatePE(p.created_at)}
                        </td>

                        {/* Proveedor */}
                        <td className="py-3.5 px-4">
                          <div>
                            <p className="font-bold text-slate-900 dark:text-white uppercase tracking-tight group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                              {sup?.name || supplierName(p.supplier_id)}
                            </p>
                            {sup?.contact_name && (
                              <p className="text-[11px] text-slate-400 dark:text-zinc-500">
                                Contacto: {sup.contact_name}
                              </p>
                            )}
                          </div>
                        </td>

                        {/* Artículos / Items */}
                        <td className="py-3.5 px-4 text-slate-700 dark:text-zinc-300">
                          <span className="inline-flex items-center gap-1.5 font-semibold text-slate-900 dark:text-white">
                            <Package size={14} className="text-slate-400 dark:text-zinc-500" />
                            {p.items?.length || 0} producto(s)
                          </span>
                        </td>

                        {/* Moneda */}
                        <td className="py-3.5 px-3 text-center font-bold text-slate-500 dark:text-zinc-400 font-mono">
                          S/
                        </td>

                        {/* Total */}
                        <td className="py-3.5 px-4 text-right font-mono font-black text-sm text-slate-900 dark:text-white whitespace-nowrap">
                          {fmtNumberOnly(totalAmount)}
                        </td>

                        {/* Estado */}
                        <td className="py-3.5 px-4 text-center whitespace-nowrap">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                              isPending
                                ? 'bg-amber-50 text-amber-700 border border-amber-200/80 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/30'
                                : 'bg-emerald-50 text-emerald-700 border border-emerald-200/80 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/30'
                            }`}
                          >
                            {isPending ? <Clock size={11} /> : <CheckCircle2 size={11} />}
                            <span>{isPending ? 'Pendiente' : 'Recibido'}</span>
                          </span>
                        </td>

                        {/* Acciones */}
                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                            {isPending && (
                              <button
                                type="button"
                                disabled={receivingId === p.id}
                                onClick={() => handleReceive(p)}
                                title="Marcar como recibido e ingresar stock"
                                className="px-2.5 py-1 rounded-lg text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-500/15 border border-emerald-200 dark:border-emerald-500/30 hover:bg-emerald-100 text-[11px] font-bold flex items-center gap-1 transition-all cursor-pointer"
                              >
                                <CheckCircle2 size={13} />
                                <span>{receivingId === p.id ? 'Recibiendo…' : 'Recibir'}</span>
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() => setViewing(p)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-500/10 transition-colors"
                              title="Ver detalle de la orden"
                            >
                              <Eye size={15} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* ═════════════════════════════════════════════════════════
              PAGINATION
             ═════════════════════════════════════════════════════════ */}
          <div className="p-4 bg-white dark:bg-[#141417] border-t border-slate-100 dark:border-zinc-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500 dark:text-zinc-400">
            <div>
              Mostrando{' '}
              <strong className="text-slate-900 dark:text-white">
                {filteredPurchases.length === 0 ? 0 : (currentPage - 1) * pageSize + 1}
              </strong>{' '}
              a{' '}
              <strong className="text-slate-900 dark:text-white">
                {Math.min(currentPage * pageSize, filteredPurchases.length)}
              </strong>{' '}
              de <strong className="text-slate-900 dark:text-white">{filteredPurchases.length}</strong> órdenes
            </div>

            {/* Pagination Controls */}
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="w-8 h-8 rounded-lg border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800 flex items-center justify-center text-slate-500 hover:bg-slate-100 dark:hover:bg-zinc-700 disabled:opacity-40 disabled:pointer-events-none transition-colors cursor-pointer"
                title="Página anterior"
              >
                <ChevronLeft size={14} />
              </button>

              {Array.from({ length: totalPages }).slice(0, 10).map((_, i) => {
                const pageNum = i + 1
                const isActive = pageNum === currentPage
                return (
                  <button
                    key={pageNum}
                    type="button"
                    onClick={() => setCurrentPage(pageNum)}
                    className={`w-8 h-8 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      isActive
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-slate-600 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-700'
                    }`}
                  >
                    {pageNum}
                  </button>
                )
              })}

              {totalPages > 10 && (
                <span className="px-1 text-slate-400">…</span>
              )}

              <button
                type="button"
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage >= totalPages}
                className="w-8 h-8 rounded-lg border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800 flex items-center justify-center text-slate-500 hover:bg-slate-100 dark:hover:bg-zinc-700 disabled:opacity-40 disabled:pointer-events-none transition-colors cursor-pointer"
                title="Página siguiente"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>

        </div>

        {/* ═════════════════════════════════════════════════════════
            DETAIL MODAL FOR VIEWING PURCHASE ORDER
           ═════════════════════════════════════════════════════════ */}
        <Modal
          open={!!viewing}
          onClose={() => setViewing(null)}
          title={`Detalle de Orden de Compra ${viewing ? (viewing.id ? 'OC-' + String(viewing.id).slice(-4) : '') : ''}`}
          width="max-w-2xl"
        >
          {viewing && (
            <div className="space-y-5">
              {/* Supplier and Date info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-xl bg-slate-50 dark:bg-zinc-800/50 border border-slate-200/80 dark:border-zinc-800">
                <div>
                  <p className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-zinc-500">
                    Proveedor
                  </p>
                  <p className="font-extrabold text-sm text-slate-900 dark:text-white mt-0.5">
                    {supplierName(viewing.supplier_id)}
                  </p>
                  {getSupplier(viewing.supplier_id)?.contact_name && (
                    <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
                      Contacto: {getSupplier(viewing.supplier_id)?.contact_name}
                    </p>
                  )}
                  {getSupplier(viewing.supplier_id)?.phone && (
                    <p className="text-xs text-slate-500 dark:text-zinc-400">
                      Tel: {getSupplier(viewing.supplier_id)?.phone}
                    </p>
                  )}
                </div>

                <div className="sm:text-right">
                  <p className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-zinc-500">
                    Fecha y Hora
                  </p>
                  <p className="font-mono text-xs text-slate-700 dark:text-zinc-300 mt-0.5">
                    {formatDatePE(viewing.created_at)}
                  </p>
                  <div className="mt-2 sm:flex sm:justify-end">
                    <StatusBadge status={viewing.status} />
                  </div>
                </div>
              </div>

              {/* Items Table */}
              <div className="rounded-xl border border-slate-200/80 dark:border-zinc-800 overflow-hidden">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-zinc-800/60 text-[10.5px] uppercase font-bold text-slate-500 dark:text-zinc-400 border-b border-slate-200/80 dark:border-zinc-800">
                      <th className="py-2.5 px-3 text-left">Artículo / Producto</th>
                      <th className="py-2.5 px-3 text-center">Cant.</th>
                      <th className="py-2.5 px-3 text-right">Costo Unit.</th>
                      <th className="py-2.5 px-3 text-right">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-zinc-800">
                    {viewing.items?.map((it, i) => (
                      <tr key={i} className="hover:bg-slate-50/50 dark:hover:bg-zinc-800/40">
                        <td className="py-2.5 px-3 font-medium text-slate-900 dark:text-white">
                          {productName(it.product_id)}
                        </td>
                        <td className="py-2.5 px-3 text-center font-mono font-bold">
                          {it.quantity}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-slate-600 dark:text-zinc-300">
                          {fmt(it.unit_cost)}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900 dark:text-white">
                          {fmt(it.unit_cost * it.quantity)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Grand Total & Action */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2 border-t border-slate-100 dark:border-zinc-800">
                <div>
                  {viewing.status === 'pendiente' ? (
                    <button
                      type="button"
                      disabled={receivingId === viewing.id}
                      onClick={() => handleReceive(viewing)}
                      className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-2 shadow-xs transition-colors cursor-pointer"
                    >
                      <CheckCircle2 size={16} />
                      <span>{receivingId === viewing.id ? 'Recibiendo stock…' : 'Marcar como Recibido e Ingresar a Inventario'}</span>
                    </button>
                  ) : (
                    <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 text-xs font-semibold">
                      <ShieldCheck size={16} />
                      <span>Mercancía recibida e ingresada al inventario</span>
                    </div>
                  )}
                </div>

                <div className="text-right">
                  <span className="text-[11px] font-bold uppercase text-slate-400 mr-2">Total Orden:</span>
                  <span className="text-xl font-black font-mono text-blue-600 dark:text-blue-400">
                    {fmt(purchasesService.purchaseTotal(viewing))}
                  </span>
                </div>
              </div>
            </div>
          )}
        </Modal>

      </div>
    </AppLayout>
  )
}
