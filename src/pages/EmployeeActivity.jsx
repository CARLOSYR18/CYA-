import { useEffect, useMemo, useState } from 'react'
import {
  Users, Activity, ShoppingCart, Package, ArrowUpRight, ArrowDownLeft,
  Clock, Search, Calendar, FileSpreadsheet, Eye, Filter, UserCheck,
  ShieldCheck, DollarSign, CheckCircle2, ChevronRight, RefreshCw,
  X, AlertCircle, ShoppingBag, ArrowUpDown, ChevronLeft
} from 'lucide-react'
import AppLayout from '../components/layout/AppLayout'
import EmptyState from '../components/ui/EmptyState'
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

function formatExactDate(dateStr) {
  if (!dateStr) return { date: '—', time: '' }
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return { date: String(dateStr), time: '' }
  const date = d.toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' })
  const time = d.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', hour12: true })
  return { date, time }
}

const AVATAR_PALETTES = [
  'from-blue-600 to-indigo-700',
  'from-purple-600 to-indigo-600',
  'from-emerald-600 to-teal-700',
  'from-amber-500 to-orange-600',
  'from-rose-500 to-pink-600',
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

  // Filters
  const [selectedUser, setSelectedUser] = useState('ALL') // 'ALL' or user email / id
  const [actionFilter, setActionFilter] = useState('ALL') // 'ALL' | 'VENTA' | 'SALIDA' | 'ENTRADA' | 'COBRO'
  const [periodPreset, setPeriodPreset] = useState('ALL') // 'ALL' | 'TODAY' | '7DAYS' | 'MONTH'
  const [search, setSearch] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(12)

  // Detail Modal
  const [detailItem, setDetailItem] = useState(null)

  const loadAll = async () => {
    if (!salesService.hasCache?.() && !inventoryMovementsService.hasCache?.()) {
      setLoading(true)
    }
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

  // Build unified unified Activity Log from Sales & Inventory Movements
  const unifiedActivities = useMemo(() => {
    const list = []

    // 1. Process Sales activities
    sales.forEach((sale) => {
      // Resolve which collaborator made this sale
      let matchedUser = collaborators.find(
        (u) => (sale.user_id && String(u.id) === String(sale.user_id)) ||
               (u.email && (sale.seller_name?.toLowerCase() === u.email.toLowerCase() || sale.notes?.toLowerCase().includes(u.email.toLowerCase()))) ||
               (u.full_name && sale.seller_name?.toLowerCase() === u.full_name.toLowerCase())
      )

      if (!matchedUser && sale.user_id && currentAuthUser && String(currentAuthUser.id) === String(sale.user_id)) {
        matchedUser = currentAuthUser
      }

      const userName = matchedUser?.full_name || matchedUser?.email?.split('@')[0] || sale.seller_name || 'Admin'
      const userEmail = matchedUser?.email || (sale.seller_name?.includes('@') ? sale.seller_name : 'cya@gmail.com')
      const userRole = matchedUser?.role || (userEmail.toLowerCase().includes('cya') ? 'admin' : 'empleado')

      const totalAmount = salesService.saleTotal(sale)
      const pNum = sale.id ? String(sale.id).slice(-4).toUpperCase() : '0000'
      const clientName = sale.client_name || sale.client?.name || 'Cliente Mostrador'

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

      // If it is paid, also mark as payment collection event if relevant
      if (sale.status === 'pagado') {
        // Included implicitly in sale event
      }
    })

    // 2. Process Inventory Movements (stock adjustments, entries, departures)
    movements.forEach((mov) => {
      const isSaleMovement = mov.reason?.toLowerCase().includes('venta')
      const isAiMovement = mov.reference?.toLowerCase().includes('asistente')
      const prod = productMap[mov.product_id]
      const prodName = prod?.name || `SKU #${String(mov.product_id).slice(-4)}`

      // Identify responsible collaborator
      let matchedUser = null
      if (isAiMovement) {
        matchedUser = {
          name: 'Asistente IA',
          email: 'asistente@cleanig.ai',
          role: 'bot',
          initials: 'IA',
          isAi: true
        }
      } else if (isSaleMovement && mov.reference) {
        // Link with sale
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
          name: 'cya@gmail.com',
          email: 'cya@gmail.com',
          role: 'admin',
          initials: 'CY'
        }
      }

      const isEntry = mov.type === 'entrada'

      list.push({
        id: `mov-${mov.id}`,
        rawId: mov.id,
        category: isEntry ? 'ENTRADA' : 'SALIDA',
        actionLabel: isEntry ? 'Ingreso a Almacén' : 'Salida / Despacho',
        description: `${isEntry ? '+' : '-'}${mov.quantity} ${prod?.unit || 'ud(s).'} de ${prodName}`,
        details: `Motivo: ${mov.reason || 'Movimiento de stock'}${mov.reference ? ` · Ref: #${mov.reference.slice(-6).toUpperCase()}` : ''}`,
        quantity: mov.quantity,
        isEntry,
        impactType: isEntry ? 'stock_positive' : 'stock_negative',
        createdAt: mov.created_at || new Date().toISOString(),
        status: 'completado',
        user: {
          id: matchedUser?.id || mov.user_id,
          name: matchedUser?.name || matchedUser?.full_name || matchedUser?.email?.split('@')[0] || 'Admin',
          email: matchedUser?.email || 'cya@gmail.com',
          role: matchedUser?.role || 'empleado',
          initials: (matchedUser?.name || matchedUser?.full_name || matchedUser?.email || 'EM').slice(0, 2).toUpperCase(),
          isAi: matchedUser?.isAi
        },
        raw: mov
      })
    })

    // Sort by timestamp descending (newest first)
    return list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
  }, [sales, movements, collaborators, productMap, currentAuthUser])

  // KPI Calculations
  const stats = useMemo(() => {
    // Filter activities performed specifically by employees (role !== 'admin' or anyone selected)
    const employeeActivities = unifiedActivities.filter((a) => a.user.role === 'empleado' || a.user.name.toLowerCase() === 'carlos')
    const employeeSales = employeeActivities.filter((a) => a.category === 'VENTA')
    const totalSalesAmount = employeeSales.reduce((acc, s) => acc + (s.amount || 0), 0)
    const employeeMovements = employeeActivities.filter((a) => a.category === 'ENTRADA' || a.category === 'SALIDA')
    const employeeDispatches = employeeActivities.filter((a) => a.category === 'SALIDA')

    // Find most active employee
    const activityCountByUser = {}
    employeeActivities.forEach((a) => {
      const key = a.user.name || a.user.email
      activityCountByUser[key] = (activityCountByUser[key] || 0) + 1
    })

    let topEmployeeName = 'carlos'
    let topEmployeeCount = 0
    Object.entries(activityCountByUser).forEach(([name, count]) => {
      if (count > topEmployeeCount) {
        topEmployeeCount = count
        topEmployeeName = name
      }
    })

    const latest = employeeActivities[0]

    return {
      totalActions: employeeActivities.length,
      totalSalesAmount,
      salesCount: employeeSales.length,
      movementsCount: employeeMovements.length,
      dispatchesCount: employeeDispatches.length,
      topEmployee: { name: topEmployeeName, count: topEmployeeCount },
      latestAction: latest
    }
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
          item.actionLabel.toLowerCase().includes(q)
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
    <AppLayout title="Movimientos de Empleados">
      <div className="space-y-5 max-w-7xl mx-auto pb-16 animate-fade-in">

        {/* ═════════════════════════════════════════════════════════
            1. HEADER BAR CON INDICADOR DE AUDITORÍA EN TIEMPO REAL
           ═════════════════════════════════════════════════════════ */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-[#131627] p-5 rounded-2xl border border-slate-200/80 dark:border-white/10 shadow-xs">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-[#5550F2] text-white flex items-center justify-center shadow-lg shadow-indigo-600/30 shrink-0">
              <Activity size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                  Control & Movimientos de Empleados
                </h1>
                <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200/70 dark:border-emerald-500/20">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  Auditoría en Vivo
                </span>
              </div>
              <p className="text-xs sm:text-[13px] text-slate-500 dark:text-slate-400 mt-0.5">
                Monitorea en tiempo real cada venta, cobro y movimiento de stock que realizan tus colaboradores.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={loadAll}
              className="p-2.5 rounded-xl border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors cursor-pointer"
              title="Refrescar auditoría"
            >
              <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
            </button>
            <button
              onClick={handleExportExcel}
              className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-2 shadow-xs transition-colors cursor-pointer"
              title="Descargar reporte en Excel / CSV"
            >
              <FileSpreadsheet size={15} />
              <span>Exportar Excel</span>
            </button>
          </div>
        </div>

        {/* ═════════════════════════════════════════════════════════
            2. 4 EXECUTIVE KPIS ESPECÍFICOS DE EMPLEADOS
           ═════════════════════════════════════════════════════════ */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">

          {/* KPI 1: Ventas por Empleados */}
          <div className="bg-white dark:bg-[#131627] rounded-2xl p-4 sm:p-5 border border-slate-200/80 dark:border-white/10 shadow-xs flex flex-col justify-between">
            <div className="flex items-start justify-between">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Ventas por Empleados
              </span>
              <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-500/15 text-[#5550F2] dark:text-indigo-400 flex items-center justify-center">
                <ShoppingCart size={16} />
              </div>
            </div>
            <div className="mt-3">
              <p className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                {formatMoney(stats.totalSalesAmount)}
              </p>
              <p className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold mt-0.5 flex items-center gap-1">
                <span>{stats.salesCount} ventas registradas</span>
              </p>
            </div>
          </div>

          {/* KPI 2: Despachos de Stock */}
          <div className="bg-white dark:bg-[#131627] rounded-2xl p-4 sm:p-5 border border-slate-200/80 dark:border-white/10 shadow-xs flex flex-col justify-between">
            <div className="flex items-start justify-between">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Movimientos de Stock
              </span>
              <div className="w-8 h-8 rounded-xl bg-purple-50 dark:bg-purple-500/15 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                <Package size={16} />
              </div>
            </div>
            <div className="mt-3">
              <p className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                {stats.movementsCount} operaciones
              </p>
              <p className="text-xs text-purple-600 dark:text-purple-400 font-semibold mt-0.5">
                {stats.dispatchesCount} salidas / despachos
              </p>
            </div>
          </div>

          {/* KPI 3: Empleado Más Activo */}
          <div className="bg-white dark:bg-[#131627] rounded-2xl p-4 sm:p-5 border border-slate-200/80 dark:border-white/10 shadow-xs flex flex-col justify-between">
            <div className="flex items-start justify-between">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Colaborador Más Activo
              </span>
              <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <UserCheck size={16} />
              </div>
            </div>
            <div className="mt-3">
              <p className="text-xl font-black text-slate-900 dark:text-white tracking-tight truncate capitalize">
                {stats.topEmployee.name || 'Sin registros'}
              </p>
              <p className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold mt-0.5">
                {stats.topEmployee.count} operaciones registradas
              </p>
            </div>
          </div>

          {/* KPI 4: Última Actividad */}
          <div className="bg-white dark:bg-[#131627] rounded-2xl p-4 sm:p-5 border border-slate-200/80 dark:border-white/10 shadow-xs flex flex-col justify-between">
            <div className="flex items-start justify-between">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Última Actividad
              </span>
              <div className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                <Clock size={16} />
              </div>
            </div>
            <div className="mt-3">
              <p className="text-base font-black text-slate-900 dark:text-white tracking-tight truncate">
                {stats.latestAction ? stats.latestAction.user.name : 'Al día'}
              </p>
              <p className="text-xs text-amber-600 dark:text-amber-400 font-semibold mt-0.5 truncate">
                {stats.latestAction ? `${formatRelativeTime(stats.latestAction.createdAt)} (${stats.latestAction.actionLabel})` : 'Sin movimientos hoy'}
              </p>
            </div>
          </div>

        </div>

        {/* ═════════════════════════════════════════════════════════
            3. BARRA DE FILTROS AVANZADOS Y AUDITORÍA
           ═════════════════════════════════════════════════════════ */}
        <div className="bg-white dark:bg-[#131627] p-4 sm:p-5 rounded-2xl border border-slate-200/80 dark:border-white/10 shadow-xs space-y-3.5">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            
            {/* Buscador de texto */}
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar por cliente, comprobante, producto o colaborador..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setCurrentPage(1) }}
                className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl pl-10 pr-9 py-2 text-xs sm:text-sm text-slate-900 dark:text-white placeholder:text-slate-400 outline-none focus:border-indigo-500 transition-all"
              />
              {search && (
                <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  <X size={15} />
                </button>
              )}
            </div>

            {/* Selector de Colaborador */}
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1">
                <Users size={14} /> Colaborador:
              </span>
              <select
                value={selectedUser}
                onChange={(e) => { setSelectedUser(e.target.value); setCurrentPage(1) }}
                className="bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 dark:text-white outline-none focus:border-indigo-500 cursor-pointer"
              >
                <option value="ALL" className="dark:bg-[#131627]">Todos los colaboradores</option>
                {collaborators.map((c) => (
                  <option key={c.id || c.email} value={c.email || c.full_name} className="dark:bg-[#131627]">
                    {c.full_name || c.email} ({c.role === 'admin' ? 'Administrador' : 'Empleado'})
                  </option>
                ))}
              </select>
            </div>

            {/* Selector de Período */}
            <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-white/5 p-1 rounded-xl">
              {[
                { id: 'ALL', label: 'Todo' },
                { id: 'TODAY', label: 'Hoy' },
                { id: '7DAYS', label: '7 días' },
                { id: 'MONTH', label: 'Este Mes' }
              ].map((p) => (
                <button
                  key={p.id}
                  onClick={() => { setPeriodPreset(p.id); setCurrentPage(1) }}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    periodPreset === p.id
                      ? 'bg-white dark:bg-[#5550F2] text-slate-900 dark:text-white shadow-xs'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>

          </div>

          {/* Pastillas de filtro de tipo de acción */}
          <div className="flex items-center gap-2 overflow-x-auto pt-2 border-t border-slate-100 dark:border-white/5">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider shrink-0 flex items-center gap-1 mr-1">
              <Filter size={12} /> Filtrar Acción:
            </span>
            {[
              { id: 'ALL', label: `Todas (${filteredActivities.length})` },
              { id: 'VENTA', label: '🛒 Solo Ventas' },
              { id: 'SALIDA', label: '📤 Salidas de Stock' },
              { id: 'ENTRADA', label: '📥 Entradas de Stock' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => { setActionFilter(tab.id); setCurrentPage(1) }}
                className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                  actionFilter === tab.id
                    ? 'bg-[#5550F2] text-white shadow-xs font-bold'
                    : 'bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-white/10'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* ═════════════════════════════════════════════════════════
            4. TABLA CENTRAL DE MOVIMIENTOS & AUDITORÍA DE EMPLEADOS
           ═════════════════════════════════════════════════════════ */}
        <div className="bg-white dark:bg-[#131627] rounded-2xl border border-slate-200/80 dark:border-white/10 shadow-xs overflow-hidden">
          {paginatedActivities.length === 0 ? (
            <div className="py-16 text-center text-slate-500 dark:text-slate-400">
              <EmptyState
                icon={Activity}
                title="No se encontraron movimientos registrados"
                description="Ningún colaborador ha realizado acciones que coincidan con los filtros seleccionados."
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200/80 dark:border-white/10 bg-slate-50/70 dark:bg-white/[0.02] text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    <th className="py-3 px-4 w-[170px]">Fecha & Hora</th>
                    <th className="py-3 px-4 w-[220px]">Colaborador / Empleado</th>
                    <th className="py-3 px-4 w-[160px]">Acción Realizada</th>
                    <th className="py-3 px-4">Detalle de la Operación</th>
                    <th className="py-3 px-4 text-right w-[140px]">Impacto / Monto</th>
                    <th className="py-3 px-4 text-center w-[120px]">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-white/5 text-xs">
                  {paginatedActivities.map((act) => {
                    const { date, time } = formatExactDate(act.createdAt)
                    const rel = formatRelativeTime(act.createdAt)

                    return (
                      <tr key={act.id} className="hover:bg-slate-50/80 dark:hover:bg-white/[0.02] transition-colors">
                        
                        {/* 1. Fecha & Hora con tiempo relativo */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <div className="flex flex-col">
                            <span className="font-bold text-slate-800 dark:text-slate-100 text-xs">
                              {date}
                            </span>
                            <span className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5 font-mono">
                              <Clock size={11} /> {time}
                            </span>
                            <span className="text-[10px] text-indigo-500 dark:text-indigo-400 font-semibold mt-0.5">
                              {rel}
                            </span>
                          </div>
                        </td>

                        {/* 2. Colaborador / Empleado */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-black shadow-sm bg-gradient-to-tr ${getAvatarGradient(act.user.name)} shrink-0`}>
                              {act.user.initials}
                            </div>
                            <div className="min-w-0">
                              <p className="font-extrabold text-slate-900 dark:text-white truncate capitalize">
                                {act.user.name}
                              </p>
                              <p className="text-[11px] text-slate-400 truncate font-mono">
                                {act.user.email}
                              </p>
                              <span className={`inline-block mt-0.5 text-[9.5px] font-black px-1.5 py-0.2 rounded ${
                                act.user.role === 'admin'
                                  ? 'bg-blue-50 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 border border-blue-200/60 dark:border-blue-500/30'
                                  : 'bg-purple-50 dark:bg-purple-500/20 text-purple-700 dark:text-purple-300 border border-purple-200/60 dark:border-purple-500/30'
                              }`}>
                                {act.user.role === 'admin' ? 'Administrador' : 'Empleado'}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* 3. Acción Realizada */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          {act.category === 'VENTA' ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-indigo-50 dark:bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border border-indigo-200/70 dark:border-indigo-500/30">
                              <ShoppingCart size={13} />
                              <span>Venta</span>
                            </span>
                          ) : act.category === 'SALIDA' ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-50 dark:bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-200/70 dark:border-rose-500/30">
                              <ArrowUpRight size={13} />
                              <span>Salida Stock</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-200/70 dark:border-emerald-500/30">
                              <ArrowDownLeft size={13} />
                              <span>Ingreso Stock</span>
                            </span>
                          )}
                        </td>

                        {/* 4. Detalle de la Operación */}
                        <td className="py-3.5 px-4">
                          <p className="font-bold text-slate-800 dark:text-slate-100 text-xs line-clamp-1">
                            {act.description}
                          </p>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-1">
                            {act.details}
                          </p>
                        </td>

                        {/* 5. Impacto / Monto */}
                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                          {act.amount ? (
                            <span className="font-mono font-black text-xs sm:text-[13px] text-emerald-600 dark:text-emerald-400">
                              +{formatMoney(act.amount)}
                            </span>
                          ) : act.quantity ? (
                            <span className={`font-mono font-black text-xs sm:text-[13px] ${act.isEntry ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                              {act.isEntry ? `+${act.quantity}` : `-${act.quantity}`} uds.
                            </span>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>

                        {/* 6. Estado */}
                        <td className="py-3.5 px-4 text-center whitespace-nowrap">
                          <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase ${
                            act.status === 'pagado' || act.status === 'completado'
                              ? 'bg-emerald-50 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/30'
                              : 'bg-amber-50 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-500/30'
                          }`}>
                            {act.status}
                          </span>
                        </td>

                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Paginación */}
          {totalPages > 1 && (
            <div className="p-4 bg-slate-50/70 dark:bg-white/[0.02] border-t border-slate-100 dark:border-white/10 flex items-center justify-between text-xs text-slate-500">
              <span>Mostrando página {currentPage} de {totalPages} ({filteredActivities.length} registros)</span>
              <div className="flex items-center gap-1.5">
                <button
                  disabled={currentPage <= 1}
                  onClick={() => setCurrentPage((p) => p - 1)}
                  className="px-3 py-1 rounded-lg border border-slate-200 dark:border-white/10 disabled:opacity-40 hover:bg-slate-100 cursor-pointer"
                >
                  Anterior
                </button>
                <button
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage((p) => p + 1)}
                  className="px-3 py-1 rounded-lg border border-slate-200 dark:border-white/10 disabled:opacity-40 hover:bg-slate-100 cursor-pointer"
                >
                  Siguiente
                </button>
              </div>
            </div>
          )}
        </div>

      </div>
    </AppLayout>
  )
}

