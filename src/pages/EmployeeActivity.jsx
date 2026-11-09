import { useEffect, useMemo, useState } from 'react'
import {
  Users, Activity, ShoppingCart, Package, ArrowUpRight, ArrowDownLeft,
  ArrowLeftRight, Clock, Search, Calendar, FileSpreadsheet, Eye, Filter,
  UserCheck, ShieldCheck, DollarSign, CheckCircle2, ChevronRight, RefreshCw,
  X, AlertCircle, ShoppingBag, ArrowUpDown, ChevronLeft, Home, TrendingUp,
  BarChart2, PieChart, Sparkles, LayoutGrid, List, Award, Copy, Check,
  ChevronDown, Layers, Box, CheckCircle
} from 'lucide-react'
import AppLayout from '../components/layout/AppLayout'
import EmptyState from '../components/ui/EmptyState'
import Modal from '../components/ui/Modal'
import { salesService } from '../services/salesService'
import { inventoryMovementsService } from '../services/inventoryMovementsService'
import { productsService } from '../services/productsService'
import { usersService } from '../services/usersService'
import { useAuth } from '../context/AuthContext'

function formatMoney(amount, currency = 'S/') {
  return `${currency} ${(Number(amount) || 0).toLocaleString('es-PE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`
}

function formatExactDate(dateStr) {
  if (!dateStr) return { date: '—', time: '' }
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return { date: String(dateStr), time: '' }
  const date = d.toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' })
  const time = d.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', hour12: true })
  return { date, time }
}

function formatRelativeTime(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return ''
  const diffSec = Math.floor((Date.now() - d.getTime()) / 1000)
  if (diffSec < 60) return 'Hace unos segundos'
  const diffMin = Math.floor(diffSec / 60)
  if (diffMin < 60) return `Hace ${diffMin} min`
  const diffHours = Math.floor(diffMin / 60)
  if (diffHours < 24) return `Hace ${diffHours} h`
  const diffDays = Math.floor(diffHours / 24)
  if (diffDays === 1) return 'Ayer'
  return `Hace ${diffDays} días`
}

const AVATAR_PALETTES = [
  'from-blue-600 to-indigo-700',
  'from-purple-600 to-indigo-600',
  'from-emerald-600 to-teal-700',
  'from-amber-500 to-orange-600',
  'from-rose-500 to-pink-600',
  'from-cyan-600 to-blue-700'
]

function getAvatarGradient(name = '') {
  let hash = 0
  for (let i = 0; i < name.length; i++) hash += name.charCodeAt(i)
  return AVATAR_PALETTES[hash % AVATAR_PALETTES.length]
}

export default function EmployeeActivity() {
  const { user: currentAuthUser } = useAuth()

  const [sales, setSales] = useState(() => salesService.getCached?.() || [])
  const [movements, setMovements] = useState(() => inventoryMovementsService.getCached?.() || [])
  const [products, setProducts] = useState(() => productsService.getCached?.() || [])
  const [collaborators, setCollaborators] = useState(() => usersService.getCached?.() || [])
  const [loading, setLoading] = useState(() => !salesService.hasCache?.() && !inventoryMovementsService.hasCache?.())

  // Executive state
  const [showMetrics, setShowMetrics] = useState(true)
  const [viewMode, setViewMode] = useState('table') // 'table' | 'grid'
  const [copiedRef, setCopiedRef] = useState(null)

  // Filters
  const [selectedUser, setSelectedUser] = useState('ALL')
  const [actionFilter, setActionFilter] = useState('ALL') // 'ALL' | 'VENTA' | 'SALIDA' | 'ENTRADA'
  const [periodPreset, setPeriodPreset] = useState('ALL') // 'ALL' | 'TODAY' | '7DAYS' | 'MONTH'
  const [search, setSearch] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  // Detail Modal
  const [detailItem, setDetailItem] = useState(null)

  const loadAll = async () => {
    if (!salesService.hasCache?.() && !inventoryMovementsService.hasCache?.()) {
      setLoading(true)
    }
    const safetyTimer = setTimeout(() => {
      setLoading(false)
    }, 2500)

    try {
      const [s, m, p, u] = await Promise.all([
        salesService.list().catch(() => []),
        inventoryMovementsService.list().catch(() => []),
        productsService.list().catch(() => []),
        usersService.list().catch(() => [])
      ])
      setSales(s || [])
      setMovements(m || [])
      setProducts(p || [])
      setCollaborators(u || [])
    } finally {
      clearTimeout(safetyTimer)
      setLoading(false)
    }
  }

  useEffect(() => {
    loadAll()
  }, [])

  // Product map helper
  const productMap = useMemo(() => {
    const map = {}
    products.forEach((p) => { map[p.id] = p })
    return map
  }, [products])

  // Build unified Activity Log from Sales & Inventory Movements
  const unifiedActivities = useMemo(() => {
    const list = []

    // 1. Process Sales activities
    sales.forEach((sale) => {
      let matchedUser = collaborators.find(
        (u) => (sale.user_id && String(u.id) === String(sale.user_id)) ||
               (u.email && (sale.seller_name?.toLowerCase() === u.email.toLowerCase() || sale.notes?.toLowerCase().includes(u.email.toLowerCase()))) ||
               (u.full_name && sale.seller_name?.toLowerCase() === u.full_name.toLowerCase())
      )

      if (!matchedUser && sale.user_id && currentAuthUser && String(currentAuthUser.id) === String(sale.user_id)) {
        matchedUser = currentAuthUser
      }

      const userName = matchedUser?.full_name || matchedUser?.email?.split('@')[0] || sale.seller_name || 'Administrador'
      const userEmail = matchedUser?.email || (sale.seller_name?.includes('@') ? sale.seller_name : '')
      const userRole = matchedUser?.role || 'admin'

      const totalAmount = salesService.saleTotal(sale)
      const pNum = sale.id ? String(sale.id).slice(-4).toUpperCase() : '0000'
      const clientName = sale.client_name || sale.client?.name || 'Cliente Mostrador'

      // First product thumbnail if available
      const firstItemId = sale.items?.[0]?.product_id
      const firstProduct = firstItemId ? productMap[firstItemId] : null

      const itemsSummary = (sale.items || [])
        .map((it) => `${it.quantity}x ${productMap[it.product_id]?.name || 'Producto'}`)
        .join(', ')

      list.push({
        id: `sale-${sale.id}`,
        rawId: sale.id,
        category: 'VENTA',
        actionLabel: 'Venta Registrada',
        description: `Venta #${pNum} a ${clientName}`,
        details: itemsSummary || 'Detalle comercial de pedido',
        amount: totalAmount,
        currency: 'S/',
        product: firstProduct,
        reference: sale.id ? `#${String(sale.id).slice(-6).toUpperCase()}` : '#VENTA',
        impactType: 'money_positive',
        createdAt: sale.created_at || new Date().toISOString(),
        status: sale.status || 'pagado',
        user: {
          id: matchedUser?.id || sale.user_id,
          name: userName,
          email: userEmail,
          role: userRole,
          initials: (userName || 'EM').slice(0, 2).toUpperCase()
        },
        raw: sale
      })
    })

    // 2. Process Inventory Movements
    movements.forEach((mov) => {
      const isSaleMovement = mov.reason?.toLowerCase().includes('venta')
      const isAiMovement = mov.reference?.toLowerCase().includes('asistente')
      const prod = productMap[mov.product_id]
      const prodName = prod?.name || `SKU #${String(mov.product_id).slice(-4)}`

      let matchedUser = null
      if (isAiMovement) {
        matchedUser = {
          name: 'Asistente IA',
          email: 'asistente@erp.com',
          role: 'bot',
          initials: 'IA',
          isAi: true
        }
      } else if (isSaleMovement && mov.reference) {
        const refClean = mov.reference.replace('#', '').trim()
        const sale = sales.find((s) => s.id && String(s.id).toLowerCase().includes(refClean.toLowerCase()))
        if (sale) {
          matchedUser = collaborators.find(
            (u) => (sale.user_id && String(u.id) === String(sale.user_id)) ||
                   (u.email && (sale.seller_name?.toLowerCase() === u.email.toLowerCase() || sale.notes?.toLowerCase().includes(u.email.toLowerCase()))) ||
                   (u.full_name && sale.seller_name?.toLowerCase() === u.full_name.toLowerCase())
          )
        }
      }

      if (!matchedUser && mov.user_id) {
        matchedUser = collaborators.find((u) => String(u.id) === String(mov.user_id))
      }

      if (!matchedUser && !isAiMovement) {
        matchedUser = {
          name: 'Almacén Central',
          email: '',
          role: 'admin',
          initials: 'AL'
        }
      }

      const isEntry = mov.type === 'entrada'
      const cleanRef = mov.reference ? (mov.reference.startsWith('#') ? mov.reference : `#${mov.reference}`) : null

      list.push({
        id: `mov-${mov.id}`,
        rawId: mov.id,
        category: isEntry ? 'ENTRADA' : 'SALIDA',
        actionLabel: isEntry ? 'Ingreso Stock' : 'Salida Stock',
        description: `${isEntry ? '+' : '-'}${mov.quantity} ud(s). de ${prodName}`,
        details: `Motivo: ${mov.reason || 'Movimiento de almacén'}${cleanRef ? ` · Ref: ${cleanRef}` : ''}`,
        quantity: mov.quantity,
        isEntry,
        product: prod,
        reference: cleanRef || `#${String(mov.id).slice(-6).toUpperCase()}`,
        impactType: isEntry ? 'stock_positive' : 'stock_negative',
        createdAt: mov.created_at || new Date().toISOString(),
        status: 'completado',
        user: {
          id: matchedUser?.id || mov.user_id,
          name: matchedUser?.name || matchedUser?.full_name || matchedUser?.email?.split('@')[0] || 'Almacén',
          email: matchedUser?.email || '',
          role: matchedUser?.role || 'empleado',
          initials: (matchedUser?.name || matchedUser?.full_name || matchedUser?.email || 'AL').slice(0, 2).toUpperCase(),
          isAi: matchedUser?.isAi
        },
        raw: mov
      })
    })

    return list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
  }, [sales, movements, collaborators, productMap, currentAuthUser])

  // KPI Calculations
  const stats = useMemo(() => {
    const employeeActivities = unifiedActivities.filter((a) => a.user.role === 'empleado' || a.user.name.toLowerCase().includes('carlos') || a.user.email.toLowerCase().includes('cya'))
    const employeeSales = employeeActivities.filter((a) => a.category === 'VENTA')
    const totalSalesAmount = employeeSales.reduce((acc, s) => acc + (s.amount || 0), 0)
    const employeeMovements = employeeActivities.filter((a) => a.category === 'ENTRADA' || a.category === 'SALIDA')
    const employeeDispatches = employeeActivities.filter((a) => a.category === 'SALIDA')
    const employeeEntries = employeeActivities.filter((a) => a.category === 'ENTRADA')

    // Find most active employee
    const activityCountByUser = {}
    unifiedActivities.forEach((a) => {
      const key = a.user.name || a.user.email
      activityCountByUser[key] = (activityCountByUser[key] || 0) + 1
    })

    let topEmployeeName = 'Carlos'
    let topEmployeeCount = 0
    Object.entries(activityCountByUser).forEach(([name, count]) => {
      if (count > topEmployeeCount) {
        topEmployeeCount = count
        topEmployeeName = name
      }
    })

    const latest = unifiedActivities[0]

    return {
      totalActions: unifiedActivities.length,
      totalSalesAmount,
      salesCount: employeeSales.length,
      movementsCount: employeeMovements.length,
      dispatchesCount: employeeDispatches.length,
      entriesCount: employeeEntries.length,
      topEmployee: { name: topEmployeeName, count: topEmployeeCount },
      latestAction: latest
    }
  }, [unifiedActivities])

  // Donut Chart Distribution
  const donutData = useMemo(() => {
    const total = unifiedActivities.length || 1
    const salesCount = unifiedActivities.filter((a) => a.category === 'VENTA').length
    const departuresCount = unifiedActivities.filter((a) => a.category === 'SALIDA').length
    const entriesCount = unifiedActivities.filter((a) => a.category === 'ENTRADA').length

    const pctSales = Math.round((salesCount / total) * 100)
    const pctDepartures = Math.round((departuresCount / total) * 100)
    const pctEntries = Math.max(0, 100 - pctSales - pctDepartures)

    const C = 2 * Math.PI * 40 // ~251.32
    const salesStroke = (pctSales / 100) * C
    const depStroke = (pctDepartures / 100) * C
    const entStroke = (pctEntries / 100) * C

    return {
      salesCount,
      departuresCount,
      entriesCount,
      pctSales,
      pctDepartures,
      pctEntries,
      C,
      salesStroke,
      depStroke,
      entStroke
    }
  }, [unifiedActivities])

  // Collaborator Ranking Leaderboard (Top 3)
  const leaderboard = useMemo(() => {
    const map = {}
    unifiedActivities.forEach((a) => {
      const key = a.user.email || a.user.name
      if (!map[key]) {
        map[key] = {
          user: a.user,
          totalOps: 0,
          salesAmount: 0,
          salesCount: 0,
          stockOps: 0
        }
      }
      map[key].totalOps += 1
      if (a.category === 'VENTA') {
        map[key].salesAmount += a.amount || 0
        map[key].salesCount += 1
      } else {
        map[key].stockOps += 1
      }
    })

    return Object.values(map)
      .sort((a, b) => b.totalOps - a.totalOps)
      .slice(0, 3)
  }, [unifiedActivities])

  // Filtered Activities
  const filteredActivities = useMemo(() => {
    return unifiedActivities.filter((item) => {
      // 1. User Filter
      if (selectedUser !== 'ALL') {
        const u = item.user
        const matchesUser =
          (u.email && u.email.toLowerCase() === selectedUser.toLowerCase()) ||
          (u.name && u.name.toLowerCase() === selectedUser.toLowerCase()) ||
          (u.id && String(u.id) === String(selectedUser))
        if (!matchesUser) return false
      }

      // 2. Action Category Filter
      if (actionFilter !== 'ALL') {
        if (item.category !== actionFilter) return false
      }

      // 3. Period Filter
      if (periodPreset !== 'ALL') {
        const itemDate = new Date(item.createdAt)
        const now = new Date()
        if (periodPreset === 'TODAY') {
          if (itemDate.toDateString() !== now.toDateString()) return false
        } else if (periodPreset === '7DAYS') {
          const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
          if (itemDate < sevenDaysAgo) return false
        } else if (periodPreset === 'MONTH') {
          if (itemDate.getMonth() !== now.getMonth() || itemDate.getFullYear() !== now.getFullYear()) return false
        }
      }

      // 4. Text Search
      if (search.trim()) {
        const q = search.toLowerCase()
        const matchText =
          item.description.toLowerCase().includes(q) ||
          item.details.toLowerCase().includes(q) ||
          item.user.name.toLowerCase().includes(q) ||
          item.user.email.toLowerCase().includes(q) ||
          item.actionLabel.toLowerCase().includes(q) ||
          (item.reference && item.reference.toLowerCase().includes(q))
        if (!matchText) return false
      }

      return true
    })
  }, [unifiedActivities, selectedUser, actionFilter, periodPreset, search])

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredActivities.length / pageSize))
  const paginatedActivities = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return filteredActivities.slice(start, start + pageSize)
  }, [filteredActivities, currentPage, pageSize])

  // Copy reference with feedback
  const handleCopyRef = (ref, e) => {
    e?.stopPropagation()
    if (!ref) return
    navigator.clipboard?.writeText(ref.replace('#', ''))
    setCopiedRef(ref)
    setTimeout(() => setCopiedRef(null), 2000)
  }

  // Reset filters
  const handleResetFilters = () => {
    setSelectedUser('ALL')
    setActionFilter('ALL')
    setPeriodPreset('ALL')
    setSearch('')
    setCurrentPage(1)
  }

  const hasActiveFilters = selectedUser !== 'ALL' || actionFilter !== 'ALL' || periodPreset !== 'ALL' || search.trim() !== ''

  // Export to Excel / CSV
  const handleExportExcel = () => {
    const headers = ['Fecha', 'Hora', 'Colaborador', 'Correo', 'Rol', 'Accion', 'Detalle', 'Impacto', 'Estado']
    const rows = filteredActivities.map((act) => {
      const { date, time } = formatExactDate(act.createdAt)
      const impact = act.amount ? `S/ ${act.amount.toFixed(2)}` : act.quantity ? `${act.isEntry ? '+' : '-'}${act.quantity} uds` : '—'
      return [
        `"${date}"`,
        `"${time}"`,
        `"${act.user.name}"`,
        `"${act.user.email}"`,
        `"${act.user.role}"`,
        `"${act.actionLabel}"`,
        `"${act.description} - ${act.details}"`,
        `"${impact}"`,
        `"${act.status}"`
      ].join(',')
    })

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows].join('\n')
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `auditoria_empleados_${new Date().toISOString().slice(0, 10)}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <AppLayout title="Control de Movimientos de Empleados">
      <div className="space-y-6 max-w-[1440px] mx-auto pb-16 animate-fade-in">

        {/* ═════════════════════════════════════════════════════════
            0. BREADCRUMB & HEADER ROW (EXECUTIVE STANDARD)
           ═════════════════════════════════════════════════════════ */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-zinc-400">
            <Home size={14} className="text-slate-400 dark:text-zinc-500" />
            <span className="text-slate-300 dark:text-zinc-600">›</span>
            <span className="font-semibold text-slate-700 dark:text-zinc-300">Administración & Auditoría de Personal</span>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-600 to-purple-600 text-white flex items-center justify-center shadow-lg shadow-indigo-500/25 shrink-0">
                <Activity size={22} />
              </div>
              <div>
                <div className="flex items-center gap-2.5">
                  <h1 className="text-2xl sm:text-[26px] font-black text-slate-900 dark:text-white tracking-tight">
                    Control & Movimientos de Empleados
                  </h1>
                  <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 shadow-xs">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    Auditoría en Vivo
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-slate-500 dark:text-zinc-400 mt-0.5">
                  Monitorea en tiempo real cada venta, cobro y movimiento de stock que realizan tus colaboradores.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2.5 shrink-0">
              {/* Toggle Metrics */}
              <button
                onClick={() => setShowMetrics((v) => !v)}
                className="px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:bg-slate-50 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-200 text-xs sm:text-sm font-semibold flex items-center gap-2 transition-colors cursor-pointer shadow-xs"
                title="Mostrar u ocultar analítica"
              >
                <TrendingUp size={16} className="text-slate-400 dark:text-zinc-400" />
                <span className="hidden sm:inline">{showMetrics ? 'Ocultar KPIs' : 'Ver KPIs'}</span>
              </button>

              {/* Refresh Button */}
              <button
                onClick={loadAll}
                className="p-2.5 rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:bg-slate-50 dark:hover:bg-zinc-700 text-slate-600 dark:text-zinc-300 transition-colors cursor-pointer shadow-xs"
                title="Actualizar registro de auditoría"
              >
                <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
              </button>

              {/* Export Excel Button */}
              <button
                onClick={handleExportExcel}
                className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs sm:text-sm font-bold flex items-center gap-2 shadow-md shadow-emerald-600/20 transition-all cursor-pointer"
                title="Descargar reporte en Excel / CSV"
              >
                <FileSpreadsheet size={16} />
                <span>Exportar Excel</span>
              </button>
            </div>
          </div>
        </div>

        {/* ═════════════════════════════════════════════════════════
            1. 4 EXECUTIVE KPIS WITH SVG SPARKLINE GRADIENTS
           ═════════════════════════════════════════════════════════ */}
        {showMetrics && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-fade-in">

            {/* KPI 1: Ventas por Empleados (Indigo) */}
            <div className="bg-white dark:bg-[#141417] rounded-2xl p-4 sm:p-5 border border-slate-200/80 dark:border-zinc-800 shadow-[0_2px_12px_rgba(0,0,0,0.03)] hover:shadow-card transition-all flex flex-col justify-between relative overflow-hidden group">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[11px] font-bold text-slate-400 dark:text-zinc-400 uppercase tracking-wider">
                    Ventas por Empleados
                  </span>
                  <p className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white mt-1 tracking-tight font-mono">
                    {formatMoney(stats.totalSalesAmount)}
                  </p>
                </div>
                <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 shadow-xs">
                  <ShoppingCart size={20} />
                </div>
              </div>

              <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100 dark:border-zinc-800/80">
                <span className="text-xs text-indigo-600 dark:text-indigo-400 font-bold flex items-center gap-1">
                  <span>{stats.salesCount} ventas registradas</span>
                </span>
                <div className="w-20 h-8 shrink-0">
                  <svg viewBox="0 0 80 32" className="w-full h-full overflow-visible">
                    <defs>
                      <linearGradient id="spkIndigo" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#6366F1" stopOpacity="0.3" />
                        <stop offset="100%" stopColor="#6366F1" stopOpacity="0" />
                      </linearGradient>
                    </defs>
                    <path d="M 0 24 Q 20 28, 40 14 T 80 6 L 80 32 L 0 32 Z" fill="url(#spkIndigo)" />
                    <path d="M 0 24 Q 20 28, 40 14 T 80 6" fill="none" stroke="#6366F1" strokeWidth="2.5" strokeLinecap="round" />
                  </svg>
                </div>
              </div>
            </div>

            {/* KPI 2: Movimientos de Stock (Purple) */}
            <div className="bg-white dark:bg-[#141417] rounded-2xl p-4 sm:p-5 border border-slate-200/80 dark:border-zinc-800 shadow-[0_2px_12px_rgba(0,0,0,0.03)] hover:shadow-card transition-all flex flex-col justify-between relative overflow-hidden group">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[11px] font-bold text-slate-400 dark:text-zinc-400 uppercase tracking-wider">
                    Movimientos de Stock
                  </span>
                  <p className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white mt-1 tracking-tight font-mono">
                    {stats.movementsCount} <span className="text-sm font-semibold text-slate-400">ops.</span>
                  </p>
                </div>
                <div className="w-10 h-10 rounded-2xl bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0 shadow-xs">
                  <Package size={20} />
                </div>
              </div>

              <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100 dark:border-zinc-800/80">
                <span className="text-xs text-purple-600 dark:text-purple-400 font-bold">
                  {stats.dispatchesCount} salidas / despachos
                </span>
                <div className="w-20 h-8 shrink-0">
                  <svg viewBox="0 0 80 32" className="w-full h-full overflow-visible">
                    <defs>
                      <linearGradient id="spkPurple" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#A855F7" stopOpacity="0.3" />
                        <stop offset="100%" stopColor="#A855F7" stopOpacity="0" />
                      </linearGradient>
                    </defs>
                    <path d="M 0 26 Q 20 18, 40 22 T 80 8 L 80 32 L 0 32 Z" fill="url(#spkPurple)" />
                    <path d="M 0 26 Q 20 18, 40 22 T 80 8" fill="none" stroke="#A855F7" strokeWidth="2.5" strokeLinecap="round" />
                  </svg>
                </div>
              </div>
            </div>

            {/* KPI 3: Colaborador Más Activo (Emerald) */}
            <div className="bg-white dark:bg-[#141417] rounded-2xl p-4 sm:p-5 border border-slate-200/80 dark:border-zinc-800 shadow-[0_2px_12px_rgba(0,0,0,0.03)] hover:shadow-card transition-all flex flex-col justify-between relative overflow-hidden group">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[11px] font-bold text-slate-400 dark:text-zinc-400 uppercase tracking-wider">
                    Colaborador Más Activo
                  </span>
                  <p className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mt-1 tracking-tight truncate capitalize">
                    {stats.topEmployee.name || 'Sin registros'}
                  </p>
                </div>
                <div className="w-10 h-10 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 shadow-xs">
                  <UserCheck size={20} />
                </div>
              </div>

              <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100 dark:border-zinc-800/80">
                <span className="text-xs text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                  <Award size={13} /> {stats.topEmployee.count} operaciones
                </span>
                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300">
                  Líder #1
                </span>
              </div>
            </div>

            {/* KPI 4: Última Actividad (Amber) */}
            <div className="bg-white dark:bg-[#141417] rounded-2xl p-4 sm:p-5 border border-slate-200/80 dark:border-zinc-800 shadow-[0_2px_12px_rgba(0,0,0,0.03)] hover:shadow-card transition-all flex flex-col justify-between relative overflow-hidden group">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[11px] font-bold text-slate-400 dark:text-zinc-400 uppercase tracking-wider">
                    Última Actividad en Vivo
                  </span>
                  <p className="text-base sm:text-lg font-black text-slate-900 dark:text-white mt-1 tracking-tight truncate capitalize">
                    {stats.latestAction ? stats.latestAction.user.name : 'Al día'}
                  </p>
                </div>
                <div className="w-10 h-10 rounded-2xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 shadow-xs">
                  <Clock size={20} />
                </div>
              </div>

              <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100 dark:border-zinc-800/80">
                <span className="text-xs text-amber-600 dark:text-amber-400 font-bold truncate">
                  {stats.latestAction ? formatRelativeTime(stats.latestAction.createdAt) : 'Sin eventos hoy'}
                </span>
                {stats.latestAction && (
                  <span className="text-[10px] font-bold text-slate-500 dark:text-zinc-400 bg-slate-100 dark:bg-zinc-800 px-2 py-0.5 rounded-md truncate max-w-[100px]">
                    {stats.latestAction.actionLabel}
                  </span>
                )}
              </div>
            </div>

          </div>
        )}

        {/* ═════════════════════════════════════════════════════════
            2. EXECUTIVE MIDDLE ANALYTICS (DISTRIBUTION & RANKING)
           ═════════════════════════════════════════════════════════ */}
        {showMetrics && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 animate-fade-in">

            {/* CHART 1: DONUT DE DISTRIBUCIÓN OPERATIVA (5 COLS) */}
            <div className="lg:col-span-5 bg-white dark:bg-[#141417] rounded-2xl border border-slate-200/80 dark:border-zinc-800 p-5 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-zinc-800">
                <div className="flex items-center gap-2">
                  <PieChart size={16} className="text-indigo-600 dark:text-indigo-400" />
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Distribución de Operaciones
                  </h3>
                </div>
                <span className="text-[11px] font-bold text-slate-400 font-mono">
                  {unifiedActivities.length} total
                </span>
              </div>

              <div className="flex items-center justify-center py-4">
                <div className="relative w-36 h-36">
                  <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                    <circle cx="50" cy="50" r="40" fill="transparent" stroke="#E2E8F0" strokeWidth="12" className="dark:stroke-zinc-800" />
                    {/* Ventas (Indigo) */}
                    <circle
                      cx="50" cy="50" r="40" fill="transparent"
                      stroke="#6366F1" strokeWidth="12"
                      strokeDasharray={`${donutData.salesStroke} ${donutData.C}`}
                      strokeDashoffset="0"
                      strokeLinecap="round"
                    />
                    {/* Salidas (Rose) */}
                    <circle
                      cx="50" cy="50" r="40" fill="transparent"
                      stroke="#F43F5E" strokeWidth="12"
                      strokeDasharray={`${donutData.depStroke} ${donutData.C}`}
                      strokeDashoffset={-donutData.salesStroke}
                      strokeLinecap="round"
                    />
                    {/* Entradas (Emerald) */}
                    <circle
                      cx="50" cy="50" r="40" fill="transparent"
                      stroke="#10B981" strokeWidth="12"
                      strokeDasharray={`${donutData.entStroke} ${donutData.C}`}
                      strokeDashoffset={-(donutData.salesStroke + donutData.depStroke)}
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
                    <span className="text-xl font-black font-mono text-slate-900 dark:text-white leading-none">
                      {unifiedActivities.length}
                    </span>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-1">
                      Eventos
                    </span>
                  </div>
                </div>
              </div>

              {/* Legend with exact stats */}
              <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-100 dark:border-zinc-800 text-center">
                <div className="p-2 rounded-xl bg-indigo-50/60 dark:bg-indigo-950/20">
                  <span className="text-[10px] font-bold text-indigo-700 dark:text-indigo-400 uppercase block">Ventas</span>
                  <span className="text-xs font-black font-mono text-slate-900 dark:text-white">
                    {donutData.salesCount} ({donutData.pctSales}%)
                  </span>
                </div>
                <div className="p-2 rounded-xl bg-rose-50/60 dark:bg-rose-950/20">
                  <span className="text-[10px] font-bold text-rose-700 dark:text-rose-400 uppercase block">Salidas</span>
                  <span className="text-xs font-black font-mono text-slate-900 dark:text-white">
                    {donutData.departuresCount} ({donutData.pctDepartures}%)
                  </span>
                </div>
                <div className="p-2 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/20">
                  <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 uppercase block">Ingresos</span>
                  <span className="text-xs font-black font-mono text-slate-900 dark:text-white">
                    {donutData.entriesCount} ({donutData.pctEntries}%)
                  </span>
                </div>
              </div>
            </div>

            {/* CHART 2: LEADERBOARD / TOP COLABORADORES (7 COLS) */}
            <div className="lg:col-span-7 bg-white dark:bg-[#141417] rounded-2xl border border-slate-200/80 dark:border-zinc-800 p-5 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-zinc-800">
                <div className="flex items-center gap-2">
                  <Award size={16} className="text-amber-500" />
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Rendimiento por Colaborador (Top Líderes)
                  </h3>
                </div>
                <span className="text-[11px] font-bold text-slate-400">
                  Actividad Consolidada
                </span>
              </div>

              <div className="space-y-3 py-2">
                {leaderboard.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-4">Sin colaboradores con transacciones aún</p>
                ) : (
                  leaderboard.map((item, idx) => (
                    <div
                      key={item.user.email || idx}
                      className="p-3 rounded-xl bg-slate-50/80 dark:bg-zinc-800/40 border border-slate-200/60 dark:border-zinc-700/60 flex items-center justify-between gap-3 hover:border-slate-300 dark:hover:border-zinc-600 transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="relative">
                          <div className={`w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-black shadow-sm bg-gradient-to-tr ${getAvatarGradient(item.user.name)} shrink-0`}>
                            {item.user.initials}
                          </div>
                          <span className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-black text-white shadow-xs ${
                            idx === 0 ? 'bg-amber-500' : idx === 1 ? 'bg-slate-400' : 'bg-amber-700'
                          }`}>
                            #{idx + 1}
                          </span>
                        </div>

                        <div className="min-w-0">
                          <p className="text-xs sm:text-sm font-black text-slate-900 dark:text-white truncate capitalize">
                            {item.user.name}
                          </p>
                          <p className="text-[11px] text-slate-400 font-mono truncate">
                            {item.user.email}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 shrink-0 text-right">
                        <div>
                          <p className="text-[10px] text-slate-400 uppercase font-bold">Ventas</p>
                          <p className="text-xs font-black text-emerald-600 dark:text-emerald-400 font-mono">
                            {formatMoney(item.salesAmount)}
                          </p>
                        </div>
                        <div className="pl-3 border-l border-slate-200 dark:border-zinc-700">
                          <p className="text-[10px] text-slate-400 uppercase font-bold">Operaciones</p>
                          <p className="text-xs font-black text-slate-900 dark:text-white font-mono">
                            {item.totalOps} <span className="text-[10px] font-normal text-slate-400">acts</span>
                          </p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="pt-2 border-t border-slate-100 dark:border-zinc-800 flex items-center justify-between text-xs text-slate-400">
                <span>Total colaboradores registrados: <strong>{collaborators.length}</strong></span>
                <span className="text-indigo-600 dark:text-indigo-400 font-semibold cursor-pointer hover:underline" onClick={() => setSelectedUser('ALL')}>
                  Ver todos los registros →
                </span>
              </div>
            </div>

          </div>
        )}

        {/* ═════════════════════════════════════════════════════════
            3. TOOLBAR DE BÚSQUEDA Y FILTROS AVANZADOS
           ═════════════════════════════════════════════════════════ */}
        <div className="bg-white dark:bg-[#141417] p-4 sm:p-5 rounded-2xl border border-slate-200/80 dark:border-zinc-800 shadow-xs space-y-3.5">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            
            {/* Buscador de texto con botón limpiar */}
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar por cliente, comprobante, producto o colaborador..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setCurrentPage(1) }}
                className="w-full bg-slate-50 dark:bg-zinc-800/60 border border-slate-200 dark:border-zinc-700 rounded-xl pl-10 pr-9 py-2.5 text-xs sm:text-sm text-slate-900 dark:text-white placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium"
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200 cursor-pointer"
                >
                  <X size={15} />
                </button>
              )}
            </div>

            {/* Selector de Colaborador */}
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-xs font-bold text-slate-500 dark:text-zinc-400 flex items-center gap-1">
                <Users size={14} /> Colaborador:
              </span>
              <select
                value={selectedUser}
                onChange={(e) => { setSelectedUser(e.target.value); setCurrentPage(1) }}
                className="bg-slate-50 dark:bg-zinc-800/60 border border-slate-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 dark:text-white outline-none focus:border-indigo-500 cursor-pointer"
              >
                <option value="ALL">Todos los colaboradores</option>
                {collaborators.map((c) => (
                  <option key={c.id || c.email} value={c.email || c.full_name}>
                    {c.full_name || c.email} ({c.role === 'admin' ? 'Administrador' : 'Empleado'})
                  </option>
                ))}
              </select>
            </div>

            {/* Selector de Período */}
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-zinc-800 p-1 rounded-xl shrink-0">
              {[
                { id: 'ALL', label: 'Todo' },
                { id: 'TODAY', label: 'Hoy' },
                { id: '7DAYS', label: '7 días' },
                { id: 'MONTH', label: 'Este Mes' }
              ].map((p) => (
                <button
                  key={p.id}
                  onClick={() => { setPeriodPreset(p.id); setCurrentPage(1) }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    periodPreset === p.id
                      ? 'bg-white dark:bg-indigo-600 text-slate-900 dark:text-white shadow-xs'
                      : 'text-slate-500 dark:text-zinc-400 hover:text-slate-800 dark:hover:text-white'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>

            {/* Selector de Modo de Vista (Tabla vs Cuadrícula) */}
            <div className="flex items-center bg-slate-100 dark:bg-zinc-800 p-1 rounded-xl shrink-0">
              <button
                type="button"
                onClick={() => setViewMode('table')}
                className={`p-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  viewMode === 'table'
                    ? 'bg-white dark:bg-zinc-700 text-indigo-600 dark:text-white shadow-xs'
                    : 'text-slate-400 hover:text-slate-700'
                }`}
                title="Vista en tabla"
              >
                <List size={16} />
              </button>
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  viewMode === 'grid'
                    ? 'bg-white dark:bg-zinc-700 text-indigo-600 dark:text-white shadow-xs'
                    : 'text-slate-400 hover:text-slate-700'
                }`}
                title="Vista en tarjetas ejecutivas"
              >
                <LayoutGrid size={16} />
              </button>
            </div>

          </div>

          {/* Pastillas de filtro de tipo de acción + Reset */}
          <div className="flex items-center justify-between gap-2 overflow-x-auto pt-2 border-t border-slate-100 dark:border-zinc-800/80">
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider shrink-0 flex items-center gap-1 mr-1">
                <Filter size={12} /> Filtrar Acción:
              </span>
              {[
                { id: 'ALL', label: `Todas (${unifiedActivities.length})` },
                { id: 'VENTA', label: `🛒 Solo Ventas (${unifiedActivities.filter(a => a.category === 'VENTA').length})` },
                { id: 'SALIDA', label: `📤 Salidas de Stock (${unifiedActivities.filter(a => a.category === 'SALIDA').length})` },
                { id: 'ENTRADA', label: `📥 Entradas de Stock (${unifiedActivities.filter(a => a.category === 'ENTRADA').length})` },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => { setActionFilter(tab.id); setCurrentPage(1) }}
                  className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                    actionFilter === tab.id
                      ? 'bg-indigo-600 text-white shadow-xs font-bold'
                      : 'bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-300 hover:bg-slate-200 dark:hover:bg-zinc-700'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {hasActiveFilters && (
              <button
                onClick={handleResetFilters}
                className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline shrink-0 cursor-pointer ml-auto"
              >
                Restablecer filtros
              </button>
            )}
          </div>
        </div>

        {/* ═════════════════════════════════════════════════════════
            4. VISTA CENTRAL (TABLA O TARJETAS EJECUTIVAS)
           ═════════════════════════════════════════════════════════ */}
        {paginatedActivities.length === 0 ? (
          <div className="py-16 text-center bg-white dark:bg-[#141417] rounded-2xl border border-slate-200/80 dark:border-zinc-800 shadow-xs">
            <EmptyState
              icon={Activity}
              title="No se encontraron movimientos registrados"
              description="Ningún colaborador ha realizado acciones que coincidan con los filtros seleccionados."
            />
          </div>
        ) : viewMode === 'table' ? (
          /* ─── 4A. TABLA EJECUTIVA CON MINIATURAS DELIMITADAS ─── */
          <div className="bg-white dark:bg-[#141417] rounded-2xl border border-slate-200/80 dark:border-zinc-800 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200/80 dark:border-zinc-800 bg-slate-50/70 dark:bg-zinc-800/40 text-[11px] font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider">
                    <th className="py-3.5 px-4 w-[170px]">Fecha & Hora</th>
                    <th className="py-3.5 px-4 w-[240px]">Colaborador / Empleado</th>
                    <th className="py-3.5 px-4 w-[160px]">Acción Realizada</th>
                    <th className="py-3.5 px-4">Detalle de la Operación</th>
                    <th className="py-3.5 px-4 text-right w-[150px]">Impacto / Monto</th>
                    <th className="py-3.5 px-4 text-center w-[120px]">Estado</th>
                    <th className="py-3.5 px-4 text-center w-[70px]">Ver</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-zinc-800 text-xs">
                  {paginatedActivities.map((act) => {
                    const { date, time } = formatExactDate(act.createdAt)
                    const rel = formatRelativeTime(act.createdAt)
                    const prod = act.product

                    return (
                      <tr
                        key={act.id}
                        className="hover:bg-slate-50/80 dark:hover:bg-zinc-800/40 transition-colors group cursor-pointer"
                        onClick={() => setDetailItem(act)}
                      >
                        {/* 1. Fecha & Hora con tiempo relativo */}
                        <td className="py-4 px-4 whitespace-nowrap">
                          <div className="flex flex-col">
                            <span className="font-extrabold text-slate-900 dark:text-white text-xs">
                              {date}
                            </span>
                            <span className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5 font-mono">
                              <Clock size={11} /> {time}
                            </span>
                            <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-bold mt-0.5">
                              {rel}
                            </span>
                          </div>
                        </td>

                        {/* 2. Colaborador / Empleado con avatar e iniciales */}
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-3">
                            <div className={`w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-black shadow-sm bg-gradient-to-tr ${getAvatarGradient(act.user.name)} shrink-0`}>
                              {act.user.initials}
                            </div>
                            <div className="min-w-0">
                              <p className="font-extrabold text-slate-900 dark:text-white truncate capitalize text-xs sm:text-[13px]">
                                {act.user.name}
                              </p>
                              <p className="text-[11px] text-slate-400 truncate font-mono">
                                {act.user.email}
                              </p>
                              <span className={`inline-block mt-0.5 text-[9.5px] font-black px-2 py-0.5 rounded-md ${
                                act.user.role === 'admin'
                                  ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200/60 dark:border-blue-800'
                                  : 'bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border border-purple-200/60 dark:border-purple-800'
                              }`}>
                                {act.user.role === 'admin' ? 'Administrador' : 'Empleado'}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* 3. Acción Realizada */}
                        <td className="py-4 px-4 whitespace-nowrap">
                          {act.category === 'VENTA' ? (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 shadow-xs">
                              <ShoppingCart size={13} />
                              <span>Venta Realizada</span>
                            </span>
                          ) : act.category === 'SALIDA' ? (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 shadow-xs">
                              <ArrowUpRight size={13} />
                              <span>Salida Stock</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 shadow-xs">
                              <ArrowDownLeft size={13} />
                              <span>Ingreso Stock</span>
                            </span>
                          )}
                        </td>

                        {/* 4. Detalle de la Operación + Miniatura Delimitada */}
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-3">
                            {/* Fotografía protegida contra desbordamientos */}
                            <div className="w-11 h-11 min-w-[44px] min-h-[44px] max-w-[44px] max-h-[44px] rounded-xl bg-slate-50 dark:bg-zinc-800 border border-slate-200/80 dark:border-zinc-700 p-1 flex items-center justify-center shrink-0 shadow-xs overflow-hidden">
                              {prod?.image_url ? (
                                <img
                                  src={prod.image_url}
                                  alt={prod.name}
                                  className="w-full h-full max-w-full max-h-full object-contain"
                                  onError={(e) => { e.currentTarget.style.display = 'none' }}
                                />
                              ) : (
                                <Package size={18} className="text-slate-400" />
                              )}
                            </div>

                            <div className="min-w-0 flex-1">
                              <p className="font-extrabold text-slate-900 dark:text-white text-xs sm:text-[13px] leading-snug truncate">
                                {act.description}
                              </p>
                              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                                <span className="text-[11px] text-slate-500 dark:text-zinc-400 font-medium truncate max-w-[280px]">
                                  {act.details}
                                </span>
                                {act.reference && (
                                  <button
                                    type="button"
                                    onClick={(e) => handleCopyRef(act.reference, e)}
                                    className="font-mono text-[10.5px] bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 text-slate-600 dark:text-zinc-300 px-1.5 py-0.5 rounded border border-slate-200 dark:border-zinc-700 inline-flex items-center gap-1 cursor-pointer transition-colors"
                                    title="Copiar referencia"
                                  >
                                    <span>{act.reference}</span>
                                    {copiedRef === act.reference ? (
                                      <Check size={10} className="text-emerald-500" />
                                    ) : (
                                      <Copy size={10} className="text-slate-400" />
                                    )}
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* 5. Impacto / Monto */}
                        <td className="py-4 px-4 text-right whitespace-nowrap">
                          {act.amount ? (
                            <span className="font-mono font-black text-xs sm:text-sm text-emerald-600 dark:text-emerald-400">
                              +{formatMoney(act.amount)}
                            </span>
                          ) : act.quantity ? (
                            <span className={`font-mono font-black text-xs sm:text-sm ${
                              act.isEntry ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                            }`}>
                              {act.isEntry ? `+${act.quantity}` : `-${act.quantity}`} uds.
                            </span>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>

                        {/* 6. Estado */}
                        <td className="py-4 px-4 text-center whitespace-nowrap">
                          <span className="inline-flex items-center gap-1 text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-800">
                            <CheckCircle2 size={11} /> COMPLETADO
                          </span>
                        </td>

                        {/* 7. Ver Detalle Button */}
                        <td className="py-4 px-4 text-center whitespace-nowrap">
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); setDetailItem(act) }}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                            title="Ver detalles de la auditoría"
                          >
                            <Eye size={16} />
                          </button>
                        </td>

                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          /* ─── 4B. VISTA EN TARJETAS EJECUTIVAS (GRID) ─── */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {paginatedActivities.map((act) => {
              const { date, time } = formatExactDate(act.createdAt)
              const rel = formatRelativeTime(act.createdAt)
              const prod = act.product

              return (
                <div
                  key={act.id}
                  onClick={() => setDetailItem(act)}
                  className="bg-white dark:bg-[#141417] rounded-2xl border border-slate-200/80 dark:border-zinc-800 p-5 shadow-xs hover:shadow-card hover:border-slate-300 dark:hover:border-zinc-700 transition-all flex flex-col justify-between cursor-pointer group"
                >
                  <div>
                    {/* Top: Header de acción + tiempo */}
                    <div className="flex items-center justify-between gap-2 mb-3">
                      {act.category === 'VENTA' ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-black bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                          <ShoppingCart size={13} /> Venta
                        </span>
                      ) : act.category === 'SALIDA' ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-black bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                          <ArrowUpRight size={13} /> Salida Stock
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-black bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                          <ArrowDownLeft size={13} /> Ingreso Stock
                        </span>
                      )}

                      <span className="text-[11px] font-bold text-slate-400 font-mono">
                        {rel}
                      </span>
                    </div>

                    {/* Producto o Descripción */}
                    <div className="flex items-start gap-3 my-3">
                      <div className="w-12 h-12 min-w-[48px] min-h-[48px] max-w-[48px] max-h-[48px] rounded-2xl bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 p-1 flex items-center justify-center shrink-0 shadow-xs overflow-hidden">
                        {prod?.image_url ? (
                          <img
                            src={prod.image_url}
                            alt={prod.name}
                            className="w-full h-full max-w-full max-h-full object-contain"
                            onError={(e) => { e.currentTarget.style.display = 'none' }}
                          />
                        ) : (
                          <Package size={22} className="text-slate-400" />
                        )}
                      </div>

                      <div className="min-w-0">
                        <h4 className="font-black text-slate-900 dark:text-white text-sm leading-tight truncate">
                          {act.description}
                        </h4>
                        <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-2">
                          {act.details}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Bottom: Colaborador e Impacto */}
                  <div className="pt-3 border-t border-slate-100 dark:border-zinc-800 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-black bg-gradient-to-tr ${getAvatarGradient(act.user.name)} shrink-0`}>
                        {act.user.initials}
                      </div>
                      <span className="text-xs font-bold text-slate-800 dark:text-zinc-200 capitalize truncate max-w-[100px]">
                        {act.user.name}
                      </span>
                    </div>

                    <div className="text-right">
                      {act.amount ? (
                        <span className="font-mono font-black text-sm text-emerald-600 dark:text-emerald-400">
                          +{formatMoney(act.amount)}
                        </span>
                      ) : act.quantity ? (
                        <span className={`font-mono font-black text-sm ${act.isEntry ? 'text-emerald-600' : 'text-rose-600'}`}>
                          {act.isEntry ? `+${act.quantity}` : `-${act.quantity}`} uds.
                        </span>
                      ) : null}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* ═════════════════════════════════════════════════════════
            5. PAGINACIÓN INTELIGENTE
           ═════════════════════════════════════════════════════════ */}
        {filteredActivities.length > 0 && (
          <div className="bg-white dark:bg-[#141417] p-4 rounded-2xl border border-slate-200/80 dark:border-zinc-800 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-500 dark:text-zinc-400">
            <div>
              Mostrando <strong className="text-slate-800 dark:text-white">{Math.min(filteredActivities.length, (currentPage - 1) * pageSize + 1)}</strong> a <strong className="text-slate-800 dark:text-white">{Math.min(filteredActivities.length, currentPage * pageSize)}</strong> de <strong className="text-slate-800 dark:text-white">{filteredActivities.length}</strong> operaciones registradas
            </div>

            <div className="flex items-center gap-2 self-center sm:self-auto">
              <button
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:bg-slate-50 dark:hover:bg-zinc-700 disabled:opacity-40 disabled:cursor-not-allowed font-bold text-xs transition-colors cursor-pointer"
              >
                Anterior
              </button>

              <span className="px-2 font-mono font-bold text-slate-900 dark:text-white">
                {currentPage} / {totalPages}
              </span>

              <button
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:bg-slate-50 dark:hover:bg-zinc-700 disabled:opacity-40 disabled:cursor-not-allowed font-bold text-xs transition-colors cursor-pointer"
              >
                Siguiente
              </button>
            </div>
          </div>
        )}

      </div>

      {/* ═════════════════════════════════════════════════════════
          MODAL DETALLE DE AUDITORÍA
         ═════════════════════════════════════════════════════════ */}
      {detailItem && (
        <Modal
          isOpen={Boolean(detailItem)}
          onClose={() => setDetailItem(null)}
          title="Ficha Detallada de Auditoría"
        >
          <div className="space-y-4">
            {/* Header: Tipo y Estado */}
            <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 dark:bg-zinc-800/60 border border-slate-200/80 dark:border-zinc-700">
              <div className="flex items-center gap-2.5">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-white shadow-xs ${
                  detailItem.category === 'VENTA'
                    ? 'bg-indigo-600'
                    : detailItem.isEntry
                    ? 'bg-emerald-600'
                    : 'bg-rose-600'
                }`}>
                  {detailItem.category === 'VENTA' ? (
                    <ShoppingCart size={18} />
                  ) : detailItem.isEntry ? (
                    <ArrowDownLeft size={18} />
                  ) : (
                    <ArrowUpRight size={18} />
                  )}
                </div>
                <div>
                  <h4 className="font-black text-sm text-slate-900 dark:text-white">
                    {detailItem.actionLabel}
                  </h4>
                  <p className="text-[11px] text-slate-400 font-mono">
                    ID: {detailItem.rawId || detailItem.id}
                  </p>
                </div>
              </div>

              <span className="text-xs font-black text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1 rounded-full border border-emerald-200 dark:border-emerald-800">
                Auditado
              </span>
            </div>

            {/* Colaborador */}
            <div className="p-3.5 rounded-2xl border border-slate-200/80 dark:border-zinc-700 space-y-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Responsable del Registro
              </span>
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-black bg-gradient-to-tr ${getAvatarGradient(detailItem.user.name)} shrink-0`}>
                  {detailItem.user.initials}
                </div>
                <div className="min-w-0">
                  <p className="font-black text-slate-900 dark:text-white text-sm capitalize">
                    {detailItem.user.name}
                  </p>
                  <p className="text-xs text-slate-400 font-mono">
                    {detailItem.user.email}
                  </p>
                  <p className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 capitalize">
                    Rol: {detailItem.user.role === 'admin' ? 'Administrador' : 'Empleado'}
                  </p>
                </div>
              </div>
            </div>

            {/* Detalles Operativos */}
            <div className="p-3.5 rounded-2xl border border-slate-200/80 dark:border-zinc-700 space-y-2 text-xs">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Resumen Operativo
              </span>

              <div className="flex items-center justify-between py-1 border-b border-slate-100 dark:border-zinc-800">
                <span className="text-slate-400">Descripción:</span>
                <span className="font-bold text-slate-900 dark:text-white">{detailItem.description}</span>
              </div>

              <div className="flex items-center justify-between py-1 border-b border-slate-100 dark:border-zinc-800">
                <span className="text-slate-400">Detalles:</span>
                <span className="font-medium text-slate-700 dark:text-zinc-200">{detailItem.details}</span>
              </div>

              {detailItem.amount && (
                <div className="flex items-center justify-between py-1 border-b border-slate-100 dark:border-zinc-800">
                  <span className="text-slate-400">Total Transacción:</span>
                  <span className="font-mono font-black text-emerald-600 dark:text-emerald-400 text-sm">
                    {formatMoney(detailItem.amount)}
                  </span>
                </div>
              )}

              {detailItem.quantity && (
                <div className="flex items-center justify-between py-1 border-b border-slate-100 dark:border-zinc-800">
                  <span className="text-slate-400">Unidades Operadas:</span>
                  <span className={`font-mono font-black text-sm ${detailItem.isEntry ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {detailItem.isEntry ? `+${detailItem.quantity}` : `-${detailItem.quantity}`} uds.
                  </span>
                </div>
              )}

              <div className="flex items-center justify-between py-1">
                <span className="text-slate-400">Fecha y Hora:</span>
                <span className="font-mono text-slate-700 dark:text-zinc-300">
                  {formatExactDate(detailItem.createdAt).date} · {formatExactDate(detailItem.createdAt).time}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setDetailItem(null)}
              className="w-full py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-200 font-bold text-xs transition-colors cursor-pointer"
            >
              Cerrar Detalle
            </button>
          </div>
        </Modal>
      )}

    </AppLayout>
  )
}
