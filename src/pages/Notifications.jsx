import { useState, useEffect, useMemo } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import {
  Bell,
  AlertTriangle,
  AlertCircle,
  Clock,
  CheckCircle2,
  Boxes,
  ShoppingCart,
  Truck,
  Users,
  Search,
  RefreshCw,
  CheckCheck,
  FileSpreadsheet,
  ArrowRight,
  ExternalLink,
  ShieldAlert,
  Sparkles,
  Info,
  Calendar,
  X,
  Filter
} from 'lucide-react'
import AppLayout from '../components/layout/AppLayout'
import { useAuth } from '../context/AuthContext'
import {
  getDetailedNotifications,
  getReadNotificationIds,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  clearReadNotifications
} from '../lib/notifications'

export default function Notifications() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const companyId = user?.company_id || 'default'

  const [loading, setLoading] = useState(true)
  const [notifications, setNotifications] = useState([])
  const [readIds, setReadIds] = useState(() => getReadNotificationIds(companyId))
  const [activeTab, setActiveTab] = useState('ALL') // 'ALL' | 'CRITICAL' | 'INVENTORY' | 'SALES' | 'PURCHASES' | 'LOG'
  const [search, setSearch] = useState('')
  const [hideRead, setHideRead] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [toastMsg, setToastMsg] = useState(null)

  const showToast = (msg) => {
    setToastMsg(msg)
    setTimeout(() => setToastMsg(null), 3500)
  }

  async function loadData(silent = false) {
    if (!silent) setLoading(true)
    setRefreshing(true)
    try {
      const data = await getDetailedNotifications()
      setNotifications(data || [])
      setReadIds(getReadNotificationIds(companyId))
    } catch (err) {
      console.error('Error cargando notificaciones:', err)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [companyId])

  // Marcar una notificación individual como leída
  const handleMarkAsRead = (id, e) => {
    e?.stopPropagation()
    markNotificationAsRead(id, companyId)
    setReadIds((prev) => (prev.includes(id) ? prev : [...prev, id]))
    showToast('Notificación marcada como leída')
  }

  // Marcar todas como leídas
  const handleMarkAllAsRead = () => {
    const allIds = notifications.map((n) => n.id)
    markAllNotificationsAsRead(allIds, companyId)
    setReadIds(allIds)
    showToast('Todas las notificaciones marcadas como leídas')
  }

  // Desmarcar todas / reiniciar historial
  const handleResetHistory = () => {
    clearReadNotifications(companyId)
    setReadIds([])
    showToast('Historial de lectura restablecido')
  }

  // Formato de fecha relativo amigable
  const formatTimeAgo = (dateInput) => {
    if (!dateInput) return 'Fecha no disponible'
    const date = new Date(dateInput)
    const diffMs = Date.now() - date.getTime()
    const diffMin = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMin / 60)
    const diffDays = Math.floor(diffHours / 24)

    if (diffMin < 1) return 'Hace unos segundos'
    if (diffMin < 60) return `Hace ${diffMin} min`
    if (diffHours < 24) return `Hace ${diffHours} h`
    if (diffDays === 1) return 'Ayer'
    if (diffDays < 7) return `Hace ${diffDays} días`
    return date.toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' })
  }

  // KPIs
  const stats = useMemo(() => {
    const total = notifications.length
    const critical = notifications.filter((n) => n.priority === 'critico').length
    const warning = notifications.filter((n) => n.priority === 'atencion').length
    const unread = notifications.filter((n) => !readIds.includes(n.id)).length
    const inventory = notifications.filter((n) => n.category === 'inventario').length
    const sales = notifications.filter((n) => n.category === 'ventas').length
    const purchases = notifications.filter((n) => n.category === 'compras').length

    return { total, critical, warning, unread, inventory, sales, purchases }
  }, [notifications, readIds])

  // Filtrado
  const filtered = useMemo(() => {
    let result = [...notifications]

    // 1. Filtro por Pestañas
    if (activeTab === 'CRITICAL') {
      result = result.filter((n) => n.priority === 'critico')
    } else if (activeTab === 'INVENTORY') {
      result = result.filter((n) => n.category === 'inventario')
    } else if (activeTab === 'SALES') {
      result = result.filter((n) => n.category === 'ventas')
    } else if (activeTab === 'PURCHASES') {
      result = result.filter((n) => n.category === 'compras')
    } else if (activeTab === 'LOG') {
      result = result.filter((n) => n.priority === 'registro' || n.category === 'usuarios')
    }

    // 2. Filtro de no leídas
    if (hideRead) {
      result = result.filter((n) => !readIds.includes(n.id))
    }

    // 3. Buscador por texto
    const q = search.trim().toLowerCase()
    if (q) {
      result = result.filter(
        (n) =>
          n.title.toLowerCase().includes(q) ||
          n.message.toLowerCase().includes(q) ||
          (n.itemReference && n.itemReference.toLowerCase().includes(q))
      )
    }

    return result
  }, [notifications, activeTab, hideRead, search, readIds])

  // Exportar historial a CSV
  const handleExportCSV = () => {
    const headers = ['Prioridad', 'Categoría', 'Título', 'Detalle', 'Referencia', 'Fecha']
    const rows = filtered.map((n) => [
      `"${n.priority || 'registro'}"`,
      `"${n.category || 'general'}"`,
      `"${(n.title || '').replace(/"/g, '""')}"`,
      `"${(n.message || '').replace(/"/g, '""')}"`,
      `"${n.itemReference || ''}"`,
      `"${new Date(n.date).toLocaleString('es-PE')}"`,
    ])

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `registro-notificaciones-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
    showToast('Reporte de notificaciones exportado a CSV')
  }

  return (
    <AppLayout title="Centro de Notificaciones & Alertas">
      <div className="max-w-7xl mx-auto space-y-6 pb-12">

        {/* ─── Feedback Toast ─── */}
        {toastMsg && (
          <div className="fixed top-6 right-6 z-50 flex items-center gap-2.5 bg-slate-900 text-white text-xs font-semibold px-4 py-3 rounded-2xl shadow-2xl border border-slate-700 animate-fade-in">
            <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
            <span>{toastMsg}</span>
          </div>
        )}

        {/* ─── 1. Header Ejecutivo ─── */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-[#141417] p-5 sm:p-6 rounded-3xl border border-slate-200/80 dark:border-zinc-800 shadow-xs">
          <div className="flex items-start sm:items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center shrink-0 shadow-lg shadow-blue-500/20">
              <Bell size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                  Centro de Notificaciones & Alertas
                </h1>
                {stats.unread > 0 && (
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black bg-rose-500 text-white shadow-xs animate-pulse">
                    {stats.unread} nuevas
                  </span>
                )}
              </div>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-zinc-400 mt-0.5">
                Monitorea en tiempo real alertas de existencias, pagos vencidos, recepción de compras y eventos del sistema.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => loadData(false)}
              disabled={refreshing}
              className="p-2.5 rounded-xl border border-slate-200 dark:border-zinc-700 hover:bg-slate-50 dark:hover:bg-zinc-800 text-slate-600 dark:text-zinc-300 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
              title="Actualizar notificaciones"
            >
              <RefreshCw size={15} className={refreshing ? 'animate-spin text-blue-600' : ''} />
              <span className="hidden sm:inline">Actualizar</span>
            </button>

            {stats.unread > 0 && (
              <button
                type="button"
                onClick={handleMarkAllAsRead}
                className="px-3.5 py-2.5 rounded-xl bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/40 dark:hover:bg-blue-900/50 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800/60 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
                title="Marcar todas como leídas"
              >
                <CheckCheck size={16} />
                <span>Marcar leídas</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleExportCSV}
              className="px-3.5 py-2.5 rounded-xl bg-slate-900 dark:bg-zinc-100 hover:bg-slate-800 dark:hover:bg-white text-white dark:text-zinc-900 text-xs font-bold flex items-center gap-1.5 shadow-sm transition cursor-pointer"
            >
              <FileSpreadsheet size={15} />
              <span className="hidden sm:inline">Exportar</span>
            </button>
          </div>
        </div>

        {/* ─── 2. Metric KPI Cards (4 Columnas) ─── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Críticas */}
          <div
            onClick={() => setActiveTab('CRITICAL')}
            className={`p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#141417] border transition-all cursor-pointer ${
              activeTab === 'CRITICAL'
                ? 'border-rose-500 ring-2 ring-rose-500/20 shadow-md'
                : 'border-slate-200/80 dark:border-zinc-800 hover:border-rose-300'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-400">
                Críticas / Urgentes
              </span>
              <div className="w-8 h-8 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 flex items-center justify-center">
                <AlertTriangle size={16} />
              </div>
            </div>
            <p className="text-2xl sm:text-3xl font-black text-rose-600 dark:text-rose-400 mt-2 font-mono">
              {stats.critical}
            </p>
            <span className="text-[11px] text-slate-500 dark:text-zinc-400 mt-1 block">
              Stock 0 o ventas vencidas
            </span>
          </div>

          {/* Card 2: Atención */}
          <div
            onClick={() => setActiveTab('INVENTORY')}
            className={`p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#141417] border transition-all cursor-pointer ${
              activeTab === 'INVENTORY'
                ? 'border-amber-500 ring-2 ring-amber-500/20 shadow-md'
                : 'border-slate-200/80 dark:border-zinc-800 hover:border-amber-300'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-400">
                Stock & Almacén
              </span>
              <div className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                <Boxes size={16} />
              </div>
            </div>
            <p className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white mt-2 font-mono">
              {stats.inventory}
            </p>
            <span className="text-[11px] text-slate-500 dark:text-zinc-400 mt-1 block">
              Alertas de stock bajo o reposición
            </span>
          </div>

          {/* Card 3: Ventas y Cobranzas */}
          <div
            onClick={() => setActiveTab('SALES')}
            className={`p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#141417] border transition-all cursor-pointer ${
              activeTab === 'SALES'
                ? 'border-blue-500 ring-2 ring-blue-500/20 shadow-md'
                : 'border-slate-200/80 dark:border-zinc-800 hover:border-blue-300'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-400">
                Ventas & Créditos
              </span>
              <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                <ShoppingCart size={16} />
              </div>
            </div>
            <p className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white mt-2 font-mono">
              {stats.sales}
            </p>
            <span className="text-[11px] text-slate-500 dark:text-zinc-400 mt-1 block">
              Cobranzas y vencimientos
            </span>
          </div>

          {/* Card 4: Compras y Abastecimiento */}
          <div
            onClick={() => setActiveTab('PURCHASES')}
            className={`p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#141417] border transition-all cursor-pointer ${
              activeTab === 'PURCHASES'
                ? 'border-purple-500 ring-2 ring-purple-500/20 shadow-md'
                : 'border-slate-200/80 dark:border-zinc-800 hover:border-purple-300'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-400">
                Compras & Proveedores
              </span>
              <div className="w-8 h-8 rounded-xl bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                <Truck size={16} />
              </div>
            </div>
            <p className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white mt-2 font-mono">
              {stats.purchases}
            </p>
            <span className="text-[11px] text-slate-500 dark:text-zinc-400 mt-1 block">
              Órdenes pendientes de recepción
            </span>
          </div>
        </div>

        {/* ─── 3. Barra de Control (Buscador, Tabs y Toggle) ─── */}
        <div className="bg-white dark:bg-[#141417] p-4 sm:p-5 rounded-2xl border border-slate-200/80 dark:border-zinc-800 shadow-xs space-y-3.5">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">

            {/* Input Buscador */}
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar en notificaciones por producto, código, cliente o motivo…"
                className="w-full bg-slate-50 dark:bg-zinc-800/80 border border-slate-200 dark:border-zinc-700 rounded-xl pl-10 pr-9 py-2.5 text-xs sm:text-sm text-slate-900 dark:text-zinc-100 placeholder:text-slate-400 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 dark:hover:text-zinc-200 cursor-pointer"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Switch / Toggle "Solo no leídas" */}
            <div className="flex items-center gap-2 shrink-0">
              <label className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-zinc-300 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={hideRead}
                  onChange={(e) => setHideRead(e.target.checked)}
                  className="w-4 h-4 rounded text-blue-600 border-slate-300 dark:border-zinc-700 focus:ring-blue-500"
                />
                <span>Solo no leídas ({stats.unread})</span>
              </label>

              {readIds.length > 0 && (
                <button
                  type="button"
                  onClick={handleResetHistory}
                  className="text-[11px] text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 underline cursor-pointer ml-1"
                >
                  Restablecer vistas
                </button>
              )}
            </div>
          </div>

          {/* Chips de Pestañas / Filtro */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar pt-1 border-t border-slate-100 dark:border-zinc-800">
            <button
              type="button"
              onClick={() => setActiveTab('ALL')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                activeTab === 'ALL'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-slate-50 dark:bg-zinc-800 text-slate-600 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-700'
              }`}
            >
              Todas ({notifications.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('CRITICAL')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                activeTab === 'CRITICAL'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 hover:bg-rose-100'
              }`}
            >
              Críticas ({stats.critical})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('INVENTORY')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                activeTab === 'INVENTORY'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 hover:bg-amber-100'
              }`}
            >
              Inventario ({stats.inventory})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('SALES')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                activeTab === 'SALES'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-slate-50 dark:bg-zinc-800 text-slate-600 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-700'
              }`}
            >
              Ventas ({stats.sales})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('PURCHASES')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                activeTab === 'PURCHASES'
                  ? 'bg-purple-600 text-white shadow-xs'
                  : 'bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 hover:bg-purple-100'
              }`}
            >
              Compras ({stats.purchases})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('LOG')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                activeTab === 'LOG'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100'
              }`}
            >
              Registro & Kardex
            </button>
          </div>
        </div>

        {/* ─── 4. Listado de Notificaciones ─── */}
        <div className="space-y-3">
          {loading ? (
            <div className="p-12 text-center bg-white dark:bg-[#141417] rounded-3xl border border-slate-200/80 dark:border-zinc-800">
              <RefreshCw size={24} className="animate-spin text-blue-600 mx-auto mb-2" />
              <p className="text-xs font-semibold text-slate-500">Cargando alertas del sistema…</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-12 text-center bg-white dark:bg-[#141417] rounded-3xl border border-slate-200/80 dark:border-zinc-800 space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto shadow-xs">
                <CheckCircle2 size={24} />
              </div>
              <h3 className="font-bold text-slate-900 dark:text-white text-base">
                Todo en orden y al día
              </h3>
              <p className="text-xs text-slate-500 dark:text-zinc-400 max-w-sm mx-auto leading-relaxed">
                No hay notificaciones pendientes en esta categoría. El inventario, ventas y compras están operando con normalidad.
              </p>
            </div>
          ) : (
            filtered.map((item) => {
              const isRead = readIds.includes(item.id)
              const isDanger = item.priority === 'critico'
              const isWarning = item.priority === 'atencion'

              let iconBg = 'bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400'
              let IconComponent = Info

              if (isDanger) {
                iconBg = 'bg-rose-50 text-rose-600 dark:bg-rose-950/50 dark:text-rose-400'
                IconComponent = AlertTriangle
              } else if (isWarning) {
                iconBg = 'bg-amber-50 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400'
                IconComponent = Clock
              } else if (item.category === 'inventario') {
                iconBg = 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-400'
                IconComponent = Boxes
              } else if (item.category === 'compras') {
                iconBg = 'bg-purple-50 text-purple-600 dark:bg-purple-950/50 dark:text-purple-400'
                IconComponent = Truck
              } else if (item.category === 'usuarios') {
                iconBg = 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400'
                IconComponent = Users
              }

              return (
                <div
                  key={item.id}
                  className={`p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#141417] border transition-all duration-150 flex flex-col sm:flex-row sm:items-center justify-between gap-4 group ${
                    isDanger
                      ? 'border-rose-200/80 dark:border-rose-900/40 hover:border-rose-300'
                      : isWarning
                      ? 'border-amber-200/80 dark:border-amber-900/40 hover:border-amber-300'
                      : 'border-slate-200/80 dark:border-zinc-800 hover:border-slate-300'
                  } ${!isRead ? 'ring-1 ring-blue-500/10 bg-slate-50/30 dark:bg-zinc-900/20' : 'opacity-85'}`}
                >
                  {/* Left: Icon + Content */}
                  <div className="flex items-start gap-3.5 min-w-0 flex-1">
                    <div className={`w-10 h-10 rounded-2xl ${iconBg} flex items-center justify-center shrink-0 mt-0.5 shadow-xs`}>
                      <IconComponent size={20} />
                    </div>

                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        {/* Unread indicator */}
                        {!isRead && (
                          <span className="w-2 h-2 rounded-full bg-blue-600 shrink-0" title="No leída" />
                        )}

                        <h4 className="font-extrabold text-sm text-slate-900 dark:text-white leading-tight">
                          {item.title}
                        </h4>

                        {/* Priority Badge */}
                        {isDanger ? (
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                            Crítico
                          </span>
                        ) : isWarning ? (
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                            Atención
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-slate-100 text-slate-700 dark:bg-zinc-800 dark:text-zinc-300 border border-slate-200 dark:border-zinc-700">
                            Registro
                          </span>
                        )}

                        {/* Category Chip */}
                        <span className="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider font-mono">
                          • {item.category}
                        </span>
                      </div>

                      <p className="text-xs text-slate-600 dark:text-zinc-300 leading-relaxed break-words">
                        {item.message}
                      </p>

                      <div className="flex items-center gap-3 text-[11px] text-slate-400 font-medium pt-0.5">
                        <span className="flex items-center gap-1">
                          <Calendar size={12} />
                          {formatTimeAgo(item.date)}
                        </span>
                        {item.itemReference && (
                          <span className="font-mono bg-slate-100 dark:bg-zinc-800 px-1.5 py-0.2 rounded text-[10.5px] text-slate-600 dark:text-zinc-300">
                            Ref: {item.itemReference}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right: Actions */}
                  <div className="flex items-center sm:justify-end gap-2 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 dark:border-zinc-800/80 shrink-0">
                    {!isRead && (
                      <button
                        type="button"
                        onClick={(e) => handleMarkAsRead(item.id, e)}
                        className="p-2 rounded-xl text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-zinc-800 transition cursor-pointer"
                        title="Marcar como leída"
                      >
                        <CheckCircle2 size={16} />
                      </button>
                    )}

                    {item.link && (
                      <button
                        type="button"
                        onClick={() => {
                          handleMarkAsRead(item.id)
                          navigate(item.link)
                        }}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer ${
                          isDanger
                            ? 'bg-rose-50 text-rose-700 hover:bg-rose-100 dark:bg-rose-950/40 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                            : 'bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-950/40 dark:text-blue-300 border border-blue-200 dark:border-blue-800'
                        }`}
                      >
                        <span>{item.actionLabel || 'Ver Detalle'}</span>
                        <ArrowRight size={13} />
                      </button>
                    )}
                  </div>
                </div>
              )
            })
          )}
        </div>

      </div>
    </AppLayout>
  )
}
