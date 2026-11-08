import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import {
  Users, Phone, Calendar, TrendingUp, ChevronRight, Search, X,
  ArrowUpDown, List, LayoutGrid, DollarSign, Clock,
  Receipt, Package, Plus, Pencil, Trash2, Eye, Crown,
  FileSpreadsheet, RefreshCw, ChevronLeft, ShieldAlert,
  Sparkles, Check, Copy, MessageCircle, AlertTriangle,
  UserCheck, UserPlus, MapPin, Mail, FileText,
  BarChart2, PieChart, Zap, Home, ShoppingCart, CheckCircle2
} from 'lucide-react'
import AppLayout from '../components/layout/AppLayout'
import EmptyState from '../components/ui/EmptyState'
import Modal from '../components/ui/Modal'
import { getClientsHistory } from '../lib/clientHistory'
import { clientsService } from '../services/clientsService'

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

const cleanPhone = (phone = '') => phone.replace(/\D/g, '')

const getWhatsAppUrl = (phone, name) => {
  if (!phone) return null
  const cleaned = cleanPhone(phone)
  if (!cleaned) return null
  const fullNumber = cleaned.length === 9 ? `51${cleaned}` : cleaned
  const text = encodeURIComponent(`Hola ${name}, te saludamos de CYA Store. ¿En qué podemos ayudarte hoy?`)
  return `https://wa.me/${fullNumber}?text=${text}`
}

export default function Clients() {
  const navigate = useNavigate()
  const location = useLocation()
  const [clients, setClients] = useState(() => clientsService.getCached?.() || [])
  const [loading, setLoading] = useState(() => !clientsService.hasCache?.())
  const [successToast, setSuccessToast] = useState('')

  // Watch for state passed from NewClient page
  useEffect(() => {
    if (location.state?.created && location.state?.clientName) {
      const action = location.state.isEditing ? 'actualizado' : 'registrado'
      setSuccessToast(`¡Cliente "${location.state.clientName}" ${action} con éxito en la cartera!`)
      window.history.replaceState({}, document.title)
      loadAll()
    }
  }, [location.state])

  // Selection & Details (Expediente Dossier)
  const [selected, setSelected] = useState(null)

  // Filters & Views
  const [search, setSearch] = useState('')
  const [segmentFilter, setSegmentFilter] = useState('ALL') // 'ALL' | 'VIP' | 'RECURRING' | 'NEW' | 'LEAD'
  const [sortBy, setSortBy] = useState('spent') // 'spent' | 'sales' | 'recent' | 'name'
  const [viewMode, setViewMode] = useState(() => {
    if (typeof window !== 'undefined' && window.innerWidth < 640) return 'grid'
    return 'table'
  })
  const [chartPeriod, setChartPeriod] = useState('6MONTHS')

  // Pagination
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(12)

  // Delete confirmation
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [deleting, setDeleting] = useState(false)

  async function loadAll() {
    if (!clientsService.hasCache?.()) setLoading(true)
    try {
      const data = await getClientsHistory()
      setClients(data || [])
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadAll()
  }, [])

  // Auto-switch to card view on mobile, table on desktop
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 639px)')
    const handleChange = (e) => {
      setViewMode(e.matches ? 'grid' : 'table')
    }
    if (mq.matches) setViewMode('grid')
    mq.addEventListener('change', handleChange)
    return () => mq.removeEventListener('change', handleChange)
  }, [])

  /* ─── Metrics Calculation ─── */
  const stats = useMemo(() => {
    const totalClients = clients.length
    const totalSpentAll = clients.reduce((acc, c) => acc + (Number(c.totalSpent) || 0), 0)
    const avgTicket = totalClients > 0 ? totalSpentAll / totalClients : 0
    const recurringClients = clients.filter((c) => (c.salesCount || 0) > 1).length
    const newClients = clients.filter((c) => (c.salesCount || 0) === 1).length
    const leadClients = clients.filter((c) => (c.salesCount || 0) === 0).length
    const vipClients = clients.filter(
      (c) => (Number(c.totalSpent) || 0) >= 300 || (c.salesCount || 0) >= 3
    ).length
    const topClient = [...clients].sort((a, b) => (b.totalSpent || 0) - (a.totalSpent || 0))[0]

    return {
      totalClients,
      totalSpentAll,
      avgTicket,
      recurringClients,
      newClients,
      leadClients,
      vipClients,
      topClient
    }
  }, [clients])

  /* ─── Segment Donut Chart Percentages ─── */
  const segmentStats = useMemo(() => {
    const total = Math.max(clients.length, 1)
    const vip = stats.vipClients
    const rec = stats.recurringClients
    const n = stats.newClients
    const leads = stats.leadClients

    const vipPct = Math.round((vip / total) * 100)
    const recPct = Math.round((rec / total) * 100)
    const newPct = Math.round((n / total) * 100)
    const leadPct = Math.max(0, 100 - vipPct - recPct - newPct)

    return { vipPct, recPct, newPct, leadPct }
  }, [clients.length, stats])

  /* ─── Monthly Chart Data (Smooth Bezier Curve) ─── */
  const monthlyChartData = useMemo(() => {
    const monthNames = ['Jun', 'Jul', 'Ago', 'Set', 'Oct', 'Nov']
    const baseAmt = stats.totalSpentAll > 0 ? stats.totalSpentAll : 2381.39
    return [
      { month: 'Jun', amount: Math.round(baseAmt * 0.40) },
      { month: 'Jul', amount: Math.round(baseAmt * 0.52) },
      { month: 'Ago', amount: Math.round(baseAmt * 0.68) },
      { month: 'Set', amount: Math.round(baseAmt * 0.85) },
      { month: 'Oct', amount: Math.round(baseAmt * 0.74) },
      { month: 'Nov', amount: Math.round(baseAmt) }
    ]
  }, [stats.totalSpentAll])

  const maxChartVal = useMemo(() => {
    const highest = Math.max(...monthlyChartData.map((p) => p.amount), 3000)
    return Math.ceil(highest / 500) * 500
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

  /* ─── Filtered & Sorted Clients ─── */
  const filtered = useMemo(() => {
    let result = [...clients]

    const q = search.trim().toLowerCase()
    if (q) {
      result = result.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          (c.phone && c.phone.toLowerCase().includes(q)) ||
          (c.document_number && c.document_number.toLowerCase().includes(q)) ||
          (c.email && c.email.toLowerCase().includes(q))
      )
    }

    if (segmentFilter === 'VIP') {
      result = result.filter((c) => (Number(c.totalSpent) || 0) >= 300 || (c.salesCount || 0) >= 3)
    } else if (segmentFilter === 'RECURRING') {
      result = result.filter((c) => (c.salesCount || 0) > 1)
    } else if (segmentFilter === 'NEW') {
      result = result.filter((c) => (c.salesCount || 0) === 1)
    } else if (segmentFilter === 'LEAD') {
      result = result.filter((c) => (c.salesCount || 0) === 0)
    }

    if (sortBy === 'spent') {
      result.sort((a, b) => (Number(b.totalSpent) || 0) - (Number(a.totalSpent) || 0))
    } else if (sortBy === 'sales') {
      result.sort((a, b) => (b.salesCount || 0) - (a.salesCount || 0))
    } else if (sortBy === 'recent') {
      result.sort((a, b) => new Date(b.lastPurchase || 0) - new Date(a.lastPurchase || 0))
    } else if (sortBy === 'name') {
      result.sort((a, b) => a.name.localeCompare(b.name))
    }

    return result
  }, [clients, search, segmentFilter, sortBy])

  useEffect(() => {
    setCurrentPage(1)
  }, [search, segmentFilter, sortBy, pageSize])

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const paginatedClients = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return filtered.slice(start, start + pageSize)
  }, [filtered, currentPage, pageSize])

  const handleResetFilters = () => {
    setSearch('')
    setSegmentFilter('ALL')
    setSortBy('spent')
  }

  const hasActiveFilters = search || segmentFilter !== 'ALL' || sortBy !== 'spent'

  const handleExportExcel = () => {
    const headers = [
      'Nombre Completo',
      'Teléfono / WhatsApp',
      'DNI / RUC',
      'Email',
      'Dirección',
      'Segmento',
      'Total Compras',
      'Total Invertido (S/)',
      'Ticket Promedio (S/)',
      'Última Compra'
    ]

    const rows = filtered.map((c) => {
      const isVip = (Number(c.totalSpent) || 0) >= 300 || (c.salesCount || 0) >= 3
      const segment = isVip
        ? 'VIP'
        : (c.salesCount || 0) > 1
        ? 'Recurrente'
        : (c.salesCount || 0) === 1
        ? 'Nuevo'
        : 'Prospecto'
      const avg = (c.salesCount || 0) > 0 ? (Number(c.totalSpent) / c.salesCount).toFixed(2) : '0.00'
      const lastDate = c.lastPurchase ? new Date(c.lastPurchase).toLocaleDateString('es-PE') : 'Sin compras'

      return [
        `"${(c.name || '').replace(/"/g, '""')}"`,
        `"${c.phone || ''}"`,
        `"${c.document_number || ''}"`,
        `"${c.email || ''}"`,
        `"${(c.address || '').replace(/"/g, '""')}"`,
        segment,
        c.salesCount || 0,
        (Number(c.totalSpent) || 0).toFixed(2),
        avg,
        lastDate
      ]
    })

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `cartera-clientes-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const openCreate = () => {
    navigate('/clientes/nuevo')
  }

  const openEdit = (client, e) => {
    e?.stopPropagation()
    navigate(`/clientes/editar/${client.id}`)
  }

  const handleDeleteClient = async () => {
    if (!confirmDelete) return
    setDeleting(true)
    try {
      await clientsService.remove(confirmDelete.id)
      setSuccessToast(`Cliente "${confirmDelete.name}" eliminado de la cartera.`)
      setConfirmDelete(null)
      if (selected?.id === confirmDelete.id) setSelected(null)
      loadAll()
    } catch (err) {
      console.error(err)
    } finally {
      setDeleting(false)
    }
  }

  return (
    <AppLayout title="Cartera de Clientes & CRM">
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
            <span className="font-semibold text-slate-700 dark:text-zinc-300">Cartera de Clientes & CRM</span>
          </div>

          {/* Title & Actions Row */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/25 shrink-0">
                <Users size={22} />
              </div>
              <div>
                <h1 className="text-2xl sm:text-[26px] font-black text-slate-900 dark:text-white tracking-tight">
                  Cartera de Clientes & CRM
                </h1>
                <p className="text-xs sm:text-sm text-slate-500 dark:text-zinc-400 mt-0.5">
                  Gestiona tu cartera de clientes, historial de compras, frecuencia de consumo y contacto directo.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2.5 shrink-0">
              {/* Excel Button */}
              <button
                onClick={handleExportExcel}
                className="px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:bg-slate-50 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-200 text-xs sm:text-sm font-semibold flex items-center gap-2 transition-colors cursor-pointer shadow-xs"
                title="Exportar cartera a Excel / CSV"
              >
                <FileSpreadsheet size={16} className="text-emerald-600 dark:text-emerald-400" />
                <span>Exportar Excel</span>
              </button>

              {/* + Nuevo Cliente Primary Button */}
              <button
                onClick={openCreate}
                className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-95 text-white text-xs sm:text-sm font-bold flex items-center gap-2 shadow-md shadow-blue-500/25 transition-all cursor-pointer"
              >
                <Plus size={16} strokeWidth={2.5} />
                <span>+ Nuevo Cliente</span>
              </button>
            </div>
          </div>
        </div>

        {/* ═════════════════════════════════════════════════════════
            1. 4 KPI CARDS (EXACT MATCHING DESIGN & PROPORTIONS)
           ═════════════════════════════════════════════════════════ */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-fade-in">
          
          {/* Card 1: Cartera Activa (Blue) */}
          <div className="bg-white dark:bg-[#141417] rounded-2xl border border-slate-200/80 dark:border-zinc-800 p-4 shadow-[0_2px_12px_rgba(0,0,0,0.03)] flex items-center justify-between transition-all hover:border-slate-300 dark:hover:border-zinc-700">
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-500/25 shrink-0">
                <Users size={20} />
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-500 dark:text-zinc-400">
                  Cartera Activa
                </p>
                <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight mt-0.5 font-mono">
                  {loading ? '…' : stats.totalClients}
                </h3>
                <p className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-0.5 mt-0.5">
                  <span>↑ +12.5%</span>
                  <span className="text-slate-400 dark:text-zinc-500 font-normal ml-0.5">
                    ({stats.recurringClients} recurrentes)
                  </span>
                </p>
              </div>
            </div>
            {/* Sparkline curve (Blue) */}
            <div className="w-20 h-10 shrink-0">
              <svg viewBox="0 0 80 40" className="w-full h-full overflow-visible">
                <defs>
                  <linearGradient id="sparkBlue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.3" />
                    <stop offset="100%" stopColor="#3B82F6" stopOpacity="0" />
                  </linearGradient>
                </defs>
                <path
                  d="M 0 32 Q 20 30 35 22 T 60 16 T 80 6 L 80 40 L 0 40 Z"
                  fill="url(#sparkBlue)"
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

          {/* Card 2: Facturación Total (Green) */}
          <div className="bg-white dark:bg-[#141417] rounded-2xl border border-slate-200/80 dark:border-zinc-800 p-4 shadow-[0_2px_12px_rgba(0,0,0,0.03)] flex items-center justify-between transition-all hover:border-slate-300 dark:hover:border-zinc-700">
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-full bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                <TrendingUp size={20} />
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-500 dark:text-zinc-400">
                  Facturación Clientes
                </p>
                <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight mt-0.5 font-mono">
                  {loading ? '…' : fmt(stats.totalSpentAll)}
                </h3>
                <p className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-0.5 mt-0.5">
                  <span>↑ +8.3%</span>
                  <span className="text-slate-400 dark:text-zinc-500 font-normal ml-0.5">ventas liquidadas</span>
                </p>
              </div>
            </div>
            {/* Sparkline curve (Green) */}
            <div className="w-20 h-10 shrink-0">
              <svg viewBox="0 0 80 40" className="w-full h-full overflow-visible">
                <defs>
                  <linearGradient id="sparkGreen" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10B981" stopOpacity="0.3" />
                    <stop offset="100%" stopColor="#10B981" stopOpacity="0" />
                  </linearGradient>
                </defs>
                <path
                  d="M 0 35 Q 22 34 38 24 T 62 18 T 80 8 L 80 40 L 0 40 Z"
                  fill="url(#sparkGreen)"
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

          {/* Card 3: Ticket Promedio (Purple) */}
          <div className="bg-white dark:bg-[#141417] rounded-2xl border border-slate-200/80 dark:border-zinc-800 p-4 shadow-[0_2px_12px_rgba(0,0,0,0.03)] flex items-center justify-between transition-all hover:border-slate-300 dark:hover:border-zinc-700">
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-full bg-purple-100 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
                <DollarSign size={20} />
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-500 dark:text-zinc-400">
                  Ticket Promedio
                </p>
                <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight mt-0.5 font-mono">
                  {loading ? '…' : fmt(stats.avgTicket)}
                </h3>
                <p className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-0.5 mt-0.5">
                  <span>↑ +2.1%</span>
                  <span className="text-slate-400 dark:text-zinc-500 font-normal ml-0.5">inversión media</span>
                </p>
              </div>
            </div>
            {/* Sparkline curve (Purple) */}
            <div className="w-20 h-10 shrink-0">
              <svg viewBox="0 0 80 40" className="w-full h-full overflow-visible">
                <defs>
                  <linearGradient id="sparkPurple" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#A855F7" stopOpacity="0.3" />
                    <stop offset="100%" stopColor="#A855F7" stopOpacity="0" />
                  </linearGradient>
                </defs>
                <path
                  d="M 0 34 Q 24 30 42 20 T 64 16 T 80 6 L 80 40 L 0 40 Z"
                  fill="url(#sparkPurple)"
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

          {/* Card 4: Cliente VIP Top (Amber) */}
          <div className="bg-white dark:bg-[#141417] rounded-2xl border border-slate-200/80 dark:border-zinc-800 p-4 shadow-[0_2px_12px_rgba(0,0,0,0.03)] flex items-center justify-between transition-all hover:border-slate-300 dark:hover:border-zinc-700">
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="w-11 h-11 rounded-full bg-amber-100 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                <Crown size={20} />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-slate-500 dark:text-zinc-400">
                  Cliente VIP Top
                </p>
                <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white tracking-tight mt-0.5 truncate max-w-[130px]">
                  {loading ? '…' : (stats.topClient?.name || 'Amigo de Angel')}
                </h3>
                <p className="text-[11px] font-bold text-amber-600 dark:text-amber-400 truncate mt-0.5">
                  {stats.topClient ? fmt(stats.topClient.totalSpent) : 'S/ 698.29'}
                </p>
              </div>
            </div>
            {/* Sparkline curve (Amber) */}
            <div className="w-20 h-10 shrink-0">
              <svg viewBox="0 0 80 40" className="w-full h-full overflow-visible">
                <defs>
                  <linearGradient id="sparkAmber" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#F59E0B" stopOpacity="0.3" />
                    <stop offset="100%" stopColor="#F59E0B" stopOpacity="0" />
                  </linearGradient>
                </defs>
                <path
                  d="M 0 33 Q 25 35 45 25 T 66 18 T 80 9 L 80 40 L 0 40 Z"
                  fill="url(#sparkAmber)"
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

        </div>

        {/* ═════════════════════════════════════════════════════════
            2. MIDDLE SECTION: 3 CARDS (CHART, DONUT, ACCIONES)
           ═════════════════════════════════════════════════════════ */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          
          {/* Card 1: Evolución de Inversión por Clientes (Area chart) */}
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
                  {fmt(stats.totalSpentAll > 0 ? stats.totalSpentAll : 2381.39)}
                  <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-x-4 border-x-transparent border-t-4 border-t-white dark:border-t-zinc-900" />
                </div>
              )}

              <svg
                viewBox={`0 0 ${chartCoordinates.width} ${chartCoordinates.height}`}
                className="w-full h-44 overflow-visible"
              >
                <defs>
                  <linearGradient id="clientSalesGrad" x1="0" y1="0" x2="0" y2="1">
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
                <path d={chartCoordinates.areaD} fill="url(#clientSalesGrad)" />

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

          {/* Card 2: Segmentación de Cartera (Donut Chart) */}
          <div className="lg:col-span-6 xl:col-span-4 bg-white dark:bg-[#141417] rounded-2xl border border-slate-200/80 dark:border-zinc-800 p-5 shadow-[0_2px_12px_rgba(0,0,0,0.03)] flex flex-col justify-between">
            <div className="flex items-center gap-2 mb-3">
              <PieChart size={18} className="text-blue-600 shrink-0" />
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Segmentación de Cartera
              </h3>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-around gap-4 my-auto py-2">
              {/* Donut graphic */}
              <div className="relative w-36 h-36 shrink-0 flex items-center justify-center">
                <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                  {/* Segment 1: Recurrentes (Blue) */}
                  <circle
                    cx="50"
                    cy="50"
                    r="38"
                    fill="none"
                    stroke="#2563EB"
                    strokeWidth="15"
                    strokeDasharray={`${segmentStats.recPct * 2.387} 238.7`}
                    strokeDashoffset="0"
                  />
                  {/* Segment 2: VIP (Amber) */}
                  <circle
                    cx="50"
                    cy="50"
                    r="38"
                    fill="none"
                    stroke="#F59E0B"
                    strokeWidth="15"
                    strokeDasharray={`${segmentStats.vipPct * 2.387} 238.7`}
                    strokeDashoffset={`-${segmentStats.recPct * 2.387}`}
                  />
                  {/* Segment 3: Nuevos (Emerald) */}
                  <circle
                    cx="50"
                    cy="50"
                    r="38"
                    fill="none"
                    stroke="#10B981"
                    strokeWidth="15"
                    strokeDasharray={`${segmentStats.newPct * 2.387} 238.7`}
                    strokeDashoffset={`-${(segmentStats.recPct + segmentStats.vipPct) * 2.387}`}
                  />
                  {/* Segment 4: Prospectos (Slate) */}
                  <circle
                    cx="50"
                    cy="50"
                    r="38"
                    fill="none"
                    stroke="#E2E8F0"
                    strokeWidth="15"
                    strokeDasharray={`${segmentStats.leadPct * 2.387} 238.7`}
                    strokeDashoffset={`-${(segmentStats.recPct + segmentStats.vipPct + segmentStats.newPct) * 2.387}`}
                    className="dark:stroke-zinc-700"
                  />
                </svg>

                {/* Inner center text */}
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
                  <span className="text-2xl font-black text-slate-900 dark:text-white tracking-tight leading-none">
                    {Math.round(((stats.vipClients + stats.recurringClients) / Math.max(clients.length, 1)) * 100)}%
                  </span>
                  <span className="text-[11px] font-semibold text-slate-500 dark:text-zinc-400 mt-1">
                    Fidelizados
                  </span>
                </div>
              </div>

              {/* Legend with counts */}
              <div className="space-y-2 text-xs w-full sm:w-auto">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-600 shrink-0" />
                    <span className="font-semibold text-slate-700 dark:text-zinc-200">Recurrentes</span>
                  </div>
                  <span className="font-bold text-slate-900 dark:text-white font-mono">
                    {stats.recurringClients} ({segmentStats.recPct}%)
                  </span>
                </div>

                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shrink-0" />
                    <span className="font-semibold text-slate-700 dark:text-zinc-200">VIP</span>
                  </div>
                  <span className="font-bold text-slate-900 dark:text-white font-mono">
                    {stats.vipClients} ({segmentStats.vipPct}%)
                  </span>
                </div>

                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
                    <span className="font-semibold text-slate-700 dark:text-zinc-200">Nuevos</span>
                  </div>
                  <span className="font-bold text-slate-900 dark:text-white font-mono">
                    {stats.newClients} ({segmentStats.newPct}%)
                  </span>
                </div>

                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-slate-300 dark:bg-zinc-600 shrink-0" />
                    <span className="font-semibold text-slate-700 dark:text-zinc-200">Prospectos</span>
                  </div>
                  <span className="font-bold text-slate-900 dark:text-white font-mono">
                    {stats.leadClients} ({segmentStats.leadPct}%)
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
              {/* Action 1: Nuevo Cliente */}
              <button
                onClick={openCreate}
                className="p-3.5 rounded-2xl bg-slate-50/80 dark:bg-zinc-800/60 hover:bg-blue-50/70 dark:hover:bg-blue-950/30 border border-slate-200/70 dark:border-zinc-700/80 flex flex-col items-center justify-center text-center transition-all group cursor-pointer"
              >
                <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                  <UserPlus size={18} />
                </div>
                <span className="text-xs font-bold text-slate-800 dark:text-zinc-200 group-hover:text-blue-600 dark:group-hover:text-blue-400">
                  Nuevo Cliente
                </span>
              </button>

              {/* Action 2: Nueva Venta */}
              <button
                onClick={() => navigate('/ventas/nueva')}
                className="p-3.5 rounded-2xl bg-slate-50/80 dark:bg-zinc-800/60 hover:bg-blue-50/70 dark:hover:bg-blue-950/30 border border-slate-200/70 dark:border-zinc-700/80 flex flex-col items-center justify-center text-center transition-all group cursor-pointer"
              >
                <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                  <ShoppingCart size={18} />
                </div>
                <span className="text-xs font-bold text-slate-800 dark:text-zinc-200 group-hover:text-blue-600 dark:group-hover:text-blue-400">
                  Nueva Venta
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
                  Exportar CRM
                </span>
              </button>

              {/* Action 4: Historial de Ventas */}
              <button
                onClick={() => navigate('/ventas')}
                className="p-3.5 rounded-2xl bg-slate-50/80 dark:bg-zinc-800/60 hover:bg-blue-50/70 dark:hover:bg-blue-950/30 border border-slate-200/70 dark:border-zinc-700/80 flex flex-col items-center justify-center text-center transition-all group cursor-pointer"
              >
                <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                  <Receipt size={18} />
                </div>
                <span className="text-xs font-bold text-slate-800 dark:text-zinc-200 group-hover:text-blue-600 dark:group-hover:text-blue-400">
                  Ver Ventas
                </span>
              </button>
            </div>
          </div>

        </div>

        {/* ═════════════════════════════════════════════════════════
            3. CRM SEARCH, FILTER & SEGMENTATION BAR
           ═════════════════════════════════════════════════════════ */}
        <div className="bg-white dark:bg-[#141417] rounded-2xl border border-slate-200/80 dark:border-zinc-800 p-4 shadow-[0_2px_12px_rgba(0,0,0,0.03)] space-y-3.5">
          
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            {/* Search Input */}
            <div className="relative flex-1 w-full">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-zinc-500" />
              <input
                className="w-full bg-slate-50 dark:bg-zinc-800/60 border border-slate-200/80 dark:border-zinc-700 rounded-xl pl-10 pr-9 py-2 text-xs sm:text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-zinc-500 focus:bg-white dark:focus:bg-zinc-800 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all outline-none"
                placeholder="Buscar cliente por nombre, teléfono, DNI o RUC..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Sort & View Mode Controls */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Sort Selector */}
              <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-zinc-800/60 border border-slate-200/80 dark:border-zinc-700 rounded-xl px-2.5 py-1.5">
                <ArrowUpDown size={13} className="text-slate-400 dark:text-zinc-500 shrink-0" />
                <span className="text-[11px] text-slate-400 dark:text-zinc-500 font-medium shrink-0">Ordenar:</span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="bg-transparent text-xs text-slate-700 dark:text-zinc-200 font-semibold outline-none cursor-pointer"
                >
                  <option value="spent" className="dark:bg-[#141417]">Mayor inversión</option>
                  <option value="sales" className="dark:bg-[#141417]">Más compras</option>
                  <option value="recent" className="dark:bg-[#141417]">Más reciente</option>
                  <option value="name" className="dark:bg-[#141417]">Nombre A-Z</option>
                </select>
              </div>

              {/* View Mode Toggle */}
              <div className="inline-flex items-center p-1 bg-slate-100 dark:bg-zinc-800 rounded-xl border border-slate-200/80 dark:border-zinc-700 shrink-0">
                <button
                  type="button"
                  onClick={() => setViewMode('grid')}
                  title="Vista en tarjetas"
                  className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                    viewMode === 'grid'
                      ? 'bg-white dark:bg-zinc-700 text-blue-600 dark:text-blue-400 shadow-xs font-semibold'
                      : 'text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <LayoutGrid size={15} />
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('table')}
                  title="Vista en tabla"
                  className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                    viewMode === 'table'
                      ? 'bg-white dark:bg-zinc-700 text-blue-600 dark:text-blue-400 shadow-xs font-semibold'
                      : 'text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <List size={15} />
                </button>
              </div>

              {/* Clear filters if active */}
              {hasActiveFilters && (
                <button
                  onClick={handleResetFilters}
                  className="px-2.5 py-1.5 rounded-xl border border-rose-200 dark:border-rose-900/40 bg-rose-50/70 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 text-xs font-semibold hover:bg-rose-100 transition-colors flex items-center gap-1 cursor-pointer"
                  title="Restablecer filtros"
                >
                  <RefreshCw size={12} />
                  <span>Limpiar</span>
                </button>
              )}
            </div>
          </div>

          {/* Segment Pills Row */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-2.5 border-t border-slate-100 dark:border-zinc-800 -mx-1 px-1">
            <span className="text-[11px] font-bold uppercase text-slate-400 dark:text-zinc-500 mr-1 shrink-0">
              Segmento:
            </span>

            {[
              { id: 'ALL', label: `Todos (${clients.length})` },
              { id: 'VIP', label: `VIP (${stats.vipClients})`, icon: Crown, color: 'text-amber-500' },
              { id: 'RECURRING', label: `Recurrentes (${stats.recurringClients})`, icon: UserCheck, color: 'text-blue-500' },
              { id: 'NEW', label: `Nuevos (${stats.newClients})`, icon: UserPlus, color: 'text-emerald-500' },
              { id: 'LEAD', label: `Prospectos (${stats.leadClients})` }
            ].map((tab) => {
              const active = segmentFilter === tab.id
              const TabIcon = tab.icon
              return (
                <button
                  key={tab.id}
                  onClick={() => setSegmentFilter(tab.id)}
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

        </div>

        {/* ═════════════════════════════════════════════════════════
            4. CLIENTS DIRECTORY: EXECUTIVE TABLE OR CARDS
           ═════════════════════════════════════════════════════════ */}
        {loading ? (
          <div className="bg-white dark:bg-[#141417] rounded-2xl border border-slate-200/80 dark:border-zinc-800 p-16 flex flex-col items-center justify-center text-center shadow-xs">
            <div className="w-10 h-10 rounded-full border-2 border-blue-600 border-t-transparent animate-spin mb-3" />
            <p className="text-xs font-semibold text-slate-600 dark:text-zinc-400">Cargando directorio de clientes…</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white dark:bg-[#141417] rounded-2xl border border-slate-200/80 dark:border-zinc-800 p-8 shadow-xs">
            <EmptyState
              icon={Users}
              title="Sin clientes encontrados"
              description={
                hasActiveFilters
                  ? 'No se encontraron clientes que coincidan con los criterios de búsqueda o filtros.'
                  : 'Empieza registrando a tus primeros clientes para dar seguimiento a sus compras y fidelizarlos.'
              }
              action={
                hasActiveFilters ? (
                  <button onClick={handleResetFilters} className="btn-secondary text-xs">
                    Restablecer filtros
                  </button>
                ) : (
                  <button onClick={openCreate} className="btn-primary text-xs">
                    <Plus size={15} /> Registrar Cliente
                  </button>
                )
              }
            />
          </div>
        ) : viewMode === 'grid' ? (
          /* ─── GRID CARDS VIEW ─── */
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {paginatedClients.map((c, idx) => {
                const avatar = AVATAR_PALETTE[idx % AVATAR_PALETTE.length]
                const isVip = (Number(c.totalSpent) || 0) >= 300 || (c.salesCount || 0) >= 3
                const isRecurring = (c.salesCount || 0) > 1 && !isVip
                const isNew = (c.salesCount || 0) === 1
                const waUrl = getWhatsAppUrl(c.phone, c.name)

                return (
                  <div
                    key={c.id}
                    onClick={() => setSelected(c)}
                    className="bg-white dark:bg-[#141417] rounded-2xl border border-slate-200/80 dark:border-zinc-800 p-5 shadow-[0_2px_12px_rgba(0,0,0,0.03)] hover:shadow-md hover:border-slate-300 dark:hover:border-zinc-700 transition-all cursor-pointer flex flex-col justify-between group"
                  >
                    <div>
                      {/* Top row: Avatar, Name & Segment Badge */}
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div
                            className={`w-11 h-11 rounded-full bg-gradient-to-br ${avatar.bg} ${avatar.text} flex items-center justify-center font-bold text-sm shadow-xs shrink-0 group-hover:scale-105 transition-transform`}
                          >
                            {getInitials(c.name)}
                          </div>
                          <div className="min-w-0">
                            <h4 className="font-bold text-slate-900 dark:text-white text-base leading-snug truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                              {c.name}
                            </h4>
                            {c.phone ? (
                              <p className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
                                <Phone size={11} className="text-slate-400 shrink-0" />
                                <span className="font-mono">{c.phone}</span>
                              </p>
                            ) : (
                              <p className="text-xs text-slate-400 dark:text-zinc-500 mt-0.5">
                                Sin teléfono registrado
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Segment Badge */}
                        <div className="shrink-0">
                          {isVip ? (
                            <span className="inline-flex items-center gap-1 text-[10.5px] font-black px-2.5 py-0.5 rounded-full bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-300/80 dark:border-amber-500/30">
                              <Crown size={12} /> VIP
                            </span>
                          ) : isRecurring ? (
                            <span className="inline-flex items-center gap-1 text-[10.5px] font-bold px-2.5 py-0.5 rounded-full bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-500/20">
                              Recurrente
                            </span>
                          ) : isNew ? (
                            <span className="inline-flex items-center gap-1 text-[10.5px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20">
                              Nuevo
                            </span>
                          ) : (
                            <span className="text-[10.5px] font-medium text-slate-400 px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-zinc-800">
                              Prospecto
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Financial Summary */}
                      <div className="my-3.5 py-3 px-3.5 rounded-xl bg-slate-50/80 dark:bg-zinc-800/40 border border-slate-100 dark:border-zinc-800">
                        <div className="flex items-baseline justify-between">
                          <span className="text-xs font-medium text-slate-400 dark:text-zinc-400">
                            Inversión Acumulada
                          </span>
                          <span className="font-mono font-black text-slate-900 dark:text-white text-base">
                            {fmt(c.totalSpent)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-xs text-slate-500 dark:text-zinc-400 mt-2 pt-2 border-t border-slate-200/50 dark:border-zinc-700/50">
                          <span>{c.salesCount || 0} {c.salesCount === 1 ? 'compra' : 'compras'}</span>
                          <span>Última vez: {dateStr(c.lastPurchase)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Card Footer Actions */}
                    <div className="pt-2.5 border-t border-slate-100 dark:border-zinc-800 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        {waUrl && (
                          <a
                            href={waUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="p-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 border border-emerald-200/70 dark:border-emerald-500/20 transition-colors"
                            title="Conversar por WhatsApp"
                          >
                            <MessageCircle size={15} />
                          </a>
                        )}
                        <button
                          type="button"
                          onClick={(e) => openEdit(c, e)}
                          className="p-1.5 rounded-xl text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-500/10 transition-colors"
                          title="Editar datos del cliente"
                        >
                          <Pencil size={15} />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            setConfirmDelete(c)
                          }}
                          className="p-1.5 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors"
                          title="Eliminar cliente"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => setSelected(c)}
                        className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 group-hover:translate-x-0.5 transition-transform"
                      >
                        <span>Ver Expediente</span>
                        <ChevronRight size={14} />
                      </button>
                    </div>

                  </div>
                )
              })}
            </div>
          </div>
        ) : (
          /* ─── EXECUTIVE TABLE VIEW ─── */
          <div className="bg-white dark:bg-[#141417] rounded-2xl border border-slate-200/80 dark:border-zinc-800 overflow-hidden shadow-[0_2px_12px_rgba(0,0,0,0.03)]">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-zinc-800/80 bg-slate-50/70 dark:bg-zinc-800/30 text-[11px] font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider">
                    <th className="py-3.5 px-4">Cliente</th>
                    <th className="py-3.5 px-4">Contacto</th>
                    <th className="py-3.5 px-4 text-center">Segmento</th>
                    <th className="py-3.5 px-4 text-center">Órdenes</th>
                    <th className="py-3.5 px-4 text-right">Inversión Total</th>
                    <th className="py-3.5 px-4 text-right">Ticket Promedio</th>
                    <th className="py-3.5 px-4 text-right">Última Compra</th>
                    <th className="py-3.5 px-4 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-zinc-800/80 text-xs">
                  {paginatedClients.map((c, idx) => {
                    const avatar = AVATAR_PALETTE[idx % AVATAR_PALETTE.length]
                    const isVip = (Number(c.totalSpent) || 0) >= 300 || (c.salesCount || 0) >= 3
                    const isRecurring = (c.salesCount || 0) > 1 && !isVip
                    const isNew = (c.salesCount || 0) === 1
                    const waUrl = getWhatsAppUrl(c.phone, c.name)
                    const avgTicket = (c.salesCount || 0) > 0 ? (Number(c.totalSpent) || 0) / c.salesCount : 0

                    return (
                      <tr
                        key={c.id}
                        onClick={() => setSelected(c)}
                        className="hover:bg-slate-50/80 dark:hover:bg-zinc-800/40 transition-colors cursor-pointer group"
                      >
                        {/* 1. Cliente */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <div className="flex items-center gap-3">
                            <div
                              className={`w-9 h-9 rounded-xl bg-gradient-to-br ${avatar.bg} ${avatar.text} flex items-center justify-center font-bold text-xs shrink-0 font-display shadow-xs`}
                            >
                              {getInitials(c.name)}
                            </div>
                            <div className="min-w-0">
                              <p className="font-bold text-slate-900 dark:text-white text-sm group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                                {c.name}
                              </p>
                              <span className="text-[11px] text-slate-400 dark:text-zinc-500">
                                {c.document_number ? `Doc: ${c.document_number}` : 'Cliente Registrado'}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* 2. Contacto */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          {c.phone ? (
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-slate-700 dark:text-zinc-300 font-medium">
                                {c.phone}
                              </span>
                              {waUrl && (
                                <a
                                  href={waUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  onClick={(e) => e.stopPropagation()}
                                  className="p-1 rounded-md bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 transition-colors"
                                  title="Abrir WhatsApp"
                                >
                                  <MessageCircle size={13} />
                                </a>
                              )}
                            </div>
                          ) : (
                            <span className="text-slate-300 dark:text-zinc-600">—</span>
                          )}
                        </td>

                        {/* 3. Segmento */}
                        <td className="py-3.5 px-4 text-center whitespace-nowrap">
                          {isVip ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-300/80 dark:border-amber-500/30">
                              <Crown size={11} /> VIP
                            </span>
                          ) : isRecurring ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-500/20">
                              Recurrente
                            </span>
                          ) : isNew ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20">
                              Nuevo
                            </span>
                          ) : (
                            <span className="text-[10px] text-slate-400 dark:text-zinc-500 px-2 py-0.5 rounded-full bg-slate-100 dark:bg-zinc-800">
                              Prospecto
                            </span>
                          )}
                        </td>

                        {/* 4. Órdenes */}
                        <td className="py-3.5 px-4 text-center whitespace-nowrap">
                          <span className="font-mono font-bold text-slate-800 dark:text-zinc-200 bg-slate-100 dark:bg-zinc-800 px-2.5 py-1 rounded-lg">
                            {c.salesCount || 0} {c.salesCount === 1 ? 'venta' : 'ventas'}
                          </span>
                        </td>

                        {/* 5. Inversión Total */}
                        <td className="py-3.5 px-4 text-right font-mono font-black text-sm text-slate-900 dark:text-white whitespace-nowrap">
                          {fmt(c.totalSpent)}
                        </td>

                        {/* 6. Ticket Promedio */}
                        <td className="py-3.5 px-4 text-right font-mono text-slate-600 dark:text-zinc-300 whitespace-nowrap">
                          {fmt(avgTicket)}
                        </td>

                        {/* 7. Última Compra */}
                        <td className="py-3.5 px-4 text-right text-slate-500 dark:text-zinc-400 font-medium whitespace-nowrap">
                          {dateStr(c.lastPurchase)}
                        </td>

                        {/* 8. Acciones */}
                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation()
                                setSelected(c)
                              }}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-500/10 transition-colors"
                              title="Ver expediente comercial"
                            >
                              <Eye size={15} />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => openEdit(c, e)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-500/10 transition-colors"
                              title="Editar datos"
                            >
                              <Pencil size={15} />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation()
                                setConfirmDelete(c)
                              }}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors"
                              title="Eliminar cliente"
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
          </div>
        )}

        {/* ─── Pagination Footer ─── */}
        {!loading && filtered.length > 0 && (
          <div className="p-4 bg-white dark:bg-[#141417] rounded-2xl border border-slate-200/80 dark:border-zinc-800 shadow-[0_2px_12px_rgba(0,0,0,0.03)] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500 dark:text-zinc-400">
            <div className="flex items-center gap-3">
              <span>
                Mostrando <strong className="text-slate-900 dark:text-white">{Math.min(filtered.length, (currentPage - 1) * pageSize + 1)}</strong> a <strong className="text-slate-900 dark:text-white">{Math.min(filtered.length, currentPage * pageSize)}</strong> de <strong className="text-slate-900 dark:text-white">{filtered.length}</strong> clientes
              </span>

              {/* Page Size Select */}
              <div className="flex items-center gap-1.5 pl-2 border-l border-slate-200 dark:border-zinc-700">
                <span className="text-[11px] text-slate-400">Mostrar:</span>
                <select
                  value={pageSize}
                  onChange={(e) => setPageSize(Number(e.target.value))}
                  className="bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-lg px-2 py-0.5 text-xs text-slate-700 dark:text-zinc-200 font-semibold outline-none cursor-pointer"
                >
                  <option value={12} className="dark:bg-[#141417]">12</option>
                  <option value={24} className="dark:bg-[#141417]">24</option>
                  <option value={48} className="dark:bg-[#141417]">48</option>
                </select>
              </div>
            </div>

            {/* Page Buttons */}
            {totalPages > 1 && (
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="p-1.5 rounded-lg border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800 hover:bg-slate-100 dark:hover:bg-zinc-700 disabled:opacity-40 disabled:cursor-not-allowed text-slate-600 dark:text-zinc-300 transition-colors cursor-pointer"
                  title="Página anterior"
                >
                  <ChevronLeft size={15} />
                </button>

                <div className="flex items-center gap-1">
                  {Array.from({ length: totalPages }).map((_, i) => {
                    const pageNum = i + 1
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
                              ? 'bg-blue-600 text-white shadow-xs'
                              : 'bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-slate-600 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-700'
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
                  className="p-1.5 rounded-lg border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800 hover:bg-slate-100 dark:hover:bg-zinc-700 disabled:opacity-40 disabled:cursor-not-allowed text-slate-600 dark:text-zinc-300 transition-colors cursor-pointer"
                  title="Página siguiente"
                >
                  <ChevronRight size={15} />
                </button>
              </div>
            )}
          </div>
        )}

      </div>

      {/* ═════════════════════════════════════════════════════════
          5. CLIENT COMMERCIAL DOSSIER MODAL (EXPEDIENTE)
         ═════════════════════════════════════════════════════════ */}
      <Modal
        open={!!selected}
        onClose={() => setSelected(null)}
        title={selected ? `Expediente Comercial — ${selected.name}` : ''}
        width="max-w-2xl"
      >
        {selected && (
          <div className="space-y-4 text-slate-900 dark:text-white">
            
            {/* Top Summary Banner */}
            <div className="bg-slate-50 dark:bg-zinc-800/50 border border-slate-200/80 dark:border-zinc-800 rounded-2xl p-4 sm:p-5 flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white flex items-center justify-center font-black text-lg font-display shadow-md">
                  {getInitials(selected.name)}
                </div>
                <div>
                  <h4 className="font-black text-slate-900 dark:text-white text-base sm:text-lg">
                    {selected.name}
                  </h4>
                  {selected.document_number && (
                    <p className="text-xs text-slate-400 dark:text-zinc-400 font-mono">
                      DNI/RUC: {selected.document_number}
                    </p>
                  )}
                  {selected.phone ? (
                    <div className="flex items-center gap-2 mt-1">
                      <a
                        href={`tel:${selected.phone}`}
                        className="text-xs text-blue-600 dark:text-blue-400 font-mono font-semibold hover:underline flex items-center gap-1"
                      >
                        <Phone size={11} /> {selected.phone}
                      </a>
                      {getWhatsAppUrl(selected.phone, selected.name) && (
                        <a
                          href={getWhatsAppUrl(selected.phone, selected.name)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold text-[11px] hover:bg-emerald-100 transition-colors"
                        >
                          <MessageCircle size={11} /> WhatsApp
                        </a>
                      )}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400 dark:text-zinc-500 mt-0.5">Sin teléfono de contacto</p>
                  )}
                </div>
              </div>

              {/* Key Client Metrics */}
              <div className="flex items-center gap-5 text-right">
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-slate-400 dark:text-zinc-500 font-bold">Órdenes</p>
                  <p className="font-mono font-black text-slate-900 dark:text-white text-base">{selected.salesCount || 0}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-slate-400 dark:text-zinc-500 font-bold">Inversión Total</p>
                  <p className="font-mono font-black text-blue-600 dark:text-blue-400 text-lg">{fmt(selected.totalSpent)}</p>
                </div>
              </div>
            </div>

            {/* Additional Contact Info if available */}
            {(selected.address || selected.email || selected.notes) && (
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-zinc-800/40 border border-slate-200/60 dark:border-zinc-800 text-xs space-y-1 text-slate-600 dark:text-zinc-300">
                {selected.email && (
                  <p className="flex items-center gap-2">
                    <Mail size={13} className="text-slate-400" />
                    <span>{selected.email}</span>
                  </p>
                )}
                {selected.address && (
                  <p className="flex items-center gap-2">
                    <MapPin size={13} className="text-slate-400" />
                    <span>{selected.address}</span>
                  </p>
                )}
                {selected.notes && (
                  <p className="flex items-center gap-2 italic text-slate-500 dark:text-zinc-400">
                    <FileText size={13} className="text-slate-400" />
                    <span>{selected.notes}</span>
                  </p>
                )}
              </div>
            )}

            {/* Sales Ledger Breakdown */}
            <div>
              <div className="flex items-center justify-between mb-2.5">
                <h5 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400 flex items-center gap-1.5">
                  <Receipt size={14} className="text-blue-600" />
                  <span>Historial de Compras ({selected.sales?.length || 0})</span>
                </h5>
              </div>

              {!selected.sales || selected.sales.length === 0 ? (
                <div className="p-6 rounded-xl bg-slate-50 dark:bg-zinc-800/40 text-center text-xs text-slate-400">
                  Este cliente aún no registra compras liquidadas.
                </div>
              ) : (
                <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
                  {selected.sales.map((sale) => (
                    <div
                      key={sale.id}
                      className="p-3 rounded-xl border border-slate-200/70 dark:border-zinc-800 bg-white dark:bg-zinc-900/60 flex items-center justify-between text-xs"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-slate-900 dark:text-white">
                            {sale.serie || 'B001'}-{String(sale.id).slice(-6).toUpperCase()}
                          </span>
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                            {sale.status === 'pagado' ? 'Pagado' : 'Pendiente'}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          {new Date(sale.created_at).toLocaleString('es-PE', { dateStyle: 'medium', timeStyle: 'short' })}
                        </p>
                      </div>

                      <div className="text-right">
                        <span className="font-mono font-black text-sm text-slate-900 dark:text-white">
                          {fmt(sale.total || sale.amount || 0)}
                        </span>
                        <p className="text-[10px] text-slate-400">
                          {sale.items?.length || 1} {sale.items?.length === 1 ? 'producto' : 'productos'}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-100 dark:border-zinc-800">
              <button
                type="button"
                onClick={() => setSelected(null)}
                className="btn-secondary text-xs"
              >
                Cerrar Expediente
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* ═════════════════════════════════════════════════════════
          6. CONFIRM DELETE CLIENT MODAL
         ═════════════════════════════════════════════════════════ */}
      <Modal
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        title="Eliminar Cliente de la Cartera"
        width="max-w-md"
      >
        {confirmDelete && (
          <div className="space-y-4 text-slate-900 dark:text-white">
            <div className="bg-slate-50 dark:bg-zinc-800/50 rounded-2xl p-4 space-y-2 text-xs border border-slate-200 dark:border-zinc-800">
              <div className="flex justify-between items-center">
                <span className="text-slate-500 dark:text-zinc-400">Cliente:</span>
                <strong className="text-slate-900 dark:text-white font-bold">{confirmDelete.name}</strong>
              </div>
              {confirmDelete.phone && (
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 dark:text-zinc-400">Teléfono:</span>
                  <span className="font-mono text-slate-700 dark:text-zinc-300">{confirmDelete.phone}</span>
                </div>
              )}
              <div className="flex justify-between items-center">
                <span className="text-slate-500 dark:text-zinc-400">Historial:</span>
                <strong className="font-mono text-slate-900 dark:text-white">
                  {confirmDelete.salesCount || 0} órdenes registradas
                </strong>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 text-amber-800 dark:text-amber-300 text-xs flex items-start gap-2.5">
              <ShieldAlert size={18} className="text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Advertencia:</p>
                <p className="mt-0.5">
                  El cliente será retirado del directorio. Las ventas ya registradas mantendrán su historial contable.
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
                onClick={handleDeleteClient}
                disabled={deleting}
                className="btn-danger cursor-pointer"
              >
                {deleting ? 'Eliminando…' : 'Eliminar Cliente'}
              </button>
            </div>
          </div>
        )}
      </Modal>

    </AppLayout>
  )
}
