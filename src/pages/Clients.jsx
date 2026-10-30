import { useEffect, useMemo, useState } from 'react'
import {
  Users, Phone, ShoppingBag, Calendar, TrendingUp,
  ChevronRight, Search, X, Award, ArrowUpDown, List,
  LayoutGrid, DollarSign, Clock, MessageSquare, ExternalLink,
  Receipt, Package, Plus, Pencil, Trash2, Eye, Crown,
  FileSpreadsheet, RefreshCw, ChevronLeft, ShieldAlert,
  Sparkles, Check, Copy, MessageCircle, AlertTriangle,
  UserCheck, UserPlus, MapPin, Mail, FileText
} from 'lucide-react'
import AppLayout from '../components/layout/AppLayout'
import EmptyState from '../components/ui/EmptyState'
import Modal from '../components/ui/Modal'
import StatusBadge from '../components/ui/StatusBadge'
import { getClientsHistory } from '../lib/clientHistory'
import { clientsService } from '../services/clientsService'
import { salesService } from '../services/salesService'

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

const emptyForm = {
  name: '',
  phone: '',
  document_number: '',
  email: '',
  address: '',
  notes: ''
}

export default function Clients() {
  const [clients, setClients] = useState([])
  const [loading, setLoading] = useState(true)
  
  // Selection & Details (Expediente Dossier)
  const [selected, setSelected] = useState(null)

  // Filters & Views
  const [search, setSearch] = useState('')
  const [segmentFilter, setSegmentFilter] = useState('ALL') // 'ALL' | 'VIP' | 'RECURRING' | 'NEW' | 'LEAD'
  const [sortBy, setSortBy] = useState('spent') // 'spent' | 'sales' | 'recent' | 'name'
  const [viewMode, setViewMode] = useState(() => {
    // En móvil, mostrar tarjetas por defecto (como la imagen 4 del usuario)
    if (typeof window !== 'undefined' && window.innerWidth < 640) return 'grid'
    return 'table'
  })
  const [showMetrics, setShowMetrics] = useState(true)

  // Pagination
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(12)

  // Create / Edit Modal
  const [modalOpen, setModalOpen] = useState(false)
  const [editingClient, setEditingClient] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // Delete confirmation
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [deleting, setDeleting] = useState(false)

  async function loadAll() {
    setLoading(true)
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
    // Set initial
    if (mq.matches) setViewMode('grid')
    mq.addEventListener('change', handleChange)
    return () => mq.removeEventListener('change', handleChange)
  }, [])

  /* ─── Metrics ─── */
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

  /* ─── Filtered & Sorted Clients ─── */
  const filtered = useMemo(() => {
    let result = [...clients]

    // Search query (Name, Phone, DNI/RUC)
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

    // Segment Filter
    if (segmentFilter === 'VIP') {
      result = result.filter((c) => (Number(c.totalSpent) || 0) >= 300 || (c.salesCount || 0) >= 3)
    } else if (segmentFilter === 'RECURRING') {
      result = result.filter((c) => (c.salesCount || 0) > 1)
    } else if (segmentFilter === 'NEW') {
      result = result.filter((c) => (c.salesCount || 0) === 1)
    } else if (segmentFilter === 'LEAD') {
      result = result.filter((c) => (c.salesCount || 0) === 0)
    }

    // Sorting
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

  // Reset pagination on filter change
  useEffect(() => {
    setCurrentPage(1)
  }, [search, segmentFilter, sortBy, pageSize])

  // Paginated Clients
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const paginatedClients = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return filtered.slice(start, start + pageSize)
  }, [filtered, currentPage, pageSize])

  // Reset all filters
  const handleResetFilters = () => {
    setSearch('')
    setSegmentFilter('ALL')
    setSortBy('spent')
  }

  const hasActiveFilters = search || segmentFilter !== 'ALL' || sortBy !== 'spent'

  // Export to Excel / CSV
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

  // Open Create Modal
  const openCreate = () => {
    setEditingClient(null)
    setForm(emptyForm)
    setError('')
    setModalOpen(true)
  }

  // Open Edit Modal
  const openEdit = (client, e) => {
    e?.stopPropagation()
    setEditingClient(client)
    setForm({
      name: client.name || '',
      phone: client.phone || '',
      document_number: client.document_number || '',
      email: client.email || '',
      address: client.address || '',
      notes: client.notes || ''
    })
    setError('')
    setModalOpen(true)
  }

  // Handle Save Client
  const handleSubmitClient = async (e) => {
    e.preventDefault()
    setError('')

    const trimmedName = form.name.trim()
    if (!trimmedName) {
      setError('El nombre o razón social del cliente es obligatorio')
      return
    }

    setSaving(true)
    try {
      const payload = {
        name: trimmedName,
        phone: form.phone.trim() || null,
        document_number: form.document_number.trim() || null,
        email: form.email.trim() || null,
        address: form.address.trim() || null,
        notes: form.notes.trim() || null
      }

      if (editingClient) {
        await clientsService.update(editingClient.id, payload)
      } else {
        await clientsService.create(payload)
      }

      setModalOpen(false)
      loadAll()
    } catch (err) {
      setError(err.message || 'No se pudo guardar la información del cliente')
    } finally {
      setSaving(false)
    }
  }

  // Handle Delete Client
  const handleDeleteClient = async () => {
    if (!confirmDelete) return
    setDeleting(true)
    try {
      await clientsService.remove(confirmDelete.id)
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
      <div className="space-y-4 max-w-7xl mx-auto pb-12">

        {/* ═════════════════════════════════════════════════════════
            TOP BAR WITH ACTIONS & NEW CLIENT BUTTON
           ═════════════════════════════════════════════════════════ */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-[#131627] p-4 sm:p-5 rounded-2xl border border-slate-200/80 dark:border-white/10 shadow-xs">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                <Users size={18} />
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                Cartera de Clientes
              </h1>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              CRM Comercial: Registro de clientes, historial de compras, frecuencia de consumo y contacto directo.
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
              title="Descargar cartera de clientes en Excel / CSV"
            >
              <FileSpreadsheet size={14} />
              <span>Excel</span>
            </button>

            <button
              onClick={openCreate}
              className="px-4 py-2 rounded-xl bg-[#5550F2] hover:bg-[#4742E8] text-white text-xs font-bold flex items-center gap-1.5 shadow-sm hover:shadow-indigo-500/25 active:scale-95 transition-all cursor-pointer"
            >
              <Plus size={15} />
              <span>+ Nuevo Cliente</span>
            </button>
          </div>
        </div>

        {/* ═════════════════════════════════════════════════════════
            1. EXECUTIVE METRICS CARDS (LIGHT & DARK THEMES)
           ═════════════════════════════════════════════════════════ */}
        {showMetrics && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4 animate-fade-in">
            
            {/* Card 1: Cartera Activa */}
            <div className="bg-white dark:bg-[#131627] rounded-2xl border border-slate-200/80 dark:border-white/10 p-3.5 sm:p-4.5 shadow-xs flex flex-col justify-between transition-all hover:border-slate-300 dark:hover:border-white/20">
              <div className="flex items-center justify-between gap-1.5 mb-2">
                <p className="text-[10.5px] font-bold text-slate-400 dark:text-slate-400 uppercase tracking-wider truncate">
                  Cartera Activa
                </p>
                <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0">
                  <Users size={16} />
                </div>
              </div>
              <div>
                <h4 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight font-sans">
                  {loading ? '…' : stats.totalClients}
                </h4>
                <p className="text-[11px] text-slate-400 mt-0.5 truncate">
                  {stats.recurringClients} recurrentes · {stats.newClients} nuevos
                </p>
              </div>
            </div>

            {/* Card 2: Facturación Total */}
            <div className="bg-white dark:bg-[#131627] rounded-2xl border border-slate-200/80 dark:border-white/10 p-3.5 sm:p-4.5 shadow-xs flex flex-col justify-between transition-all hover:border-slate-300 dark:hover:border-white/20">
              <div className="flex items-center justify-between gap-1.5 mb-2">
                <p className="text-[10.5px] font-bold text-slate-400 dark:text-slate-400 uppercase tracking-wider truncate">
                  Facturación Total
                </p>
                <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
                  <TrendingUp size={16} />
                </div>
              </div>
              <div>
                <h4 className="text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400 tracking-tight font-sans">
                  {loading ? '…' : fmt(stats.totalSpentAll)}
                </h4>
                <p className="text-[11px] text-slate-400 mt-0.5 truncate">
                  Ventas totales liquidadas
                </p>
              </div>
            </div>

            {/* Card 3: Ticket Promedio (LTV) */}
            <div className="bg-white dark:bg-[#131627] rounded-2xl border border-slate-200/80 dark:border-white/10 p-3.5 sm:p-4.5 shadow-xs flex flex-col justify-between transition-all hover:border-slate-300 dark:hover:border-white/20">
              <div className="flex items-center justify-between gap-1.5 mb-2">
                <p className="text-[10.5px] font-bold text-slate-400 dark:text-slate-400 uppercase tracking-wider truncate">
                  Ticket Promedio
                </p>
                <div className="w-8 h-8 rounded-xl bg-purple-50 dark:bg-purple-500/10 border border-purple-200 dark:border-purple-500/20 flex items-center justify-center text-purple-600 dark:text-purple-400 shrink-0">
                  <DollarSign size={16} />
                </div>
              </div>
              <div>
                <h4 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight font-sans">
                  {loading ? '…' : fmt(stats.avgTicket)}
                </h4>
                <p className="text-[11px] text-slate-400 mt-0.5 truncate">
                  Inversión media por cliente
                </p>
              </div>
            </div>

            {/* Card 4: Cliente VIP */}
            <div className="bg-white dark:bg-[#131627] rounded-2xl border border-slate-200/80 dark:border-white/10 p-3.5 sm:p-4.5 shadow-xs flex flex-col justify-between transition-all hover:border-slate-300 dark:hover:border-white/20">
              <div className="flex items-center justify-between gap-1.5 mb-2">
                <p className="text-[10.5px] font-bold text-slate-400 dark:text-slate-400 uppercase tracking-wider truncate">
                  Cliente VIP Top
                </p>
                <div className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0">
                  <Crown size={16} />
                </div>
              </div>
              <div>
                <h4 className="text-base sm:text-lg font-black text-slate-900 dark:text-white tracking-tight truncate">
                  {loading ? '…' : stats.topClient?.name || 'Sin clientes'}
                </h4>
                <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-bold mt-0.5 truncate">
                  {stats.topClient ? fmt(stats.topClient.totalSpent) : '—'}
                </p>
              </div>
            </div>

          </div>
        )}

        {/* ═════════════════════════════════════════════════════════
            2. CONTROL, SEARCH & SEGMENTATION BAR
           ═════════════════════════════════════════════════════════ */}
        <div className="bg-white dark:bg-[#131627] rounded-2xl border border-slate-200/80 dark:border-white/10 p-3.5 sm:p-5 shadow-xs space-y-3.5">
          
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            
            {/* Search Input */}
            <div className="relative flex-1 w-full">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
              <input
                className="w-full bg-slate-50/70 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl pl-10 pr-9 py-2 text-xs sm:text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:bg-white dark:focus:bg-[#1a1f36] focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 transition-all outline-none"
                placeholder="Buscar cliente por nombre, teléfono, DNI o RUC..."
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

            {/* Sort & View Mode Controls */}
            <div className="flex flex-wrap items-center gap-2">
              
              {/* Sort Selector */}
              <div className="flex items-center gap-1.5 bg-slate-50/70 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-2.5 py-1.5">
                <ArrowUpDown size={13} className="text-slate-400 dark:text-slate-500 shrink-0" />
                <span className="text-[11px] text-slate-400 font-medium shrink-0">Ordenar:</span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="bg-transparent text-xs text-slate-700 dark:text-slate-200 font-semibold outline-none cursor-pointer"
                >
                  <option value="spent" className="dark:bg-[#131627]">Mayor inversión</option>
                  <option value="sales" className="dark:bg-[#131627]">Más compras</option>
                  <option value="recent" className="dark:bg-[#131627]">Más reciente</option>
                  <option value="name" className="dark:bg-[#131627]">Nombre A-Z</option>
                </select>
              </div>

              {/* View Mode Toggle */}
              <div className="inline-flex items-center p-1 bg-slate-100 dark:bg-white/5 rounded-xl border border-slate-200/80 dark:border-white/10 shrink-0">
                <button
                  type="button"
                  onClick={() => setViewMode('grid')}
                  title="Vista en tarjetas"
                  className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                    viewMode === 'grid'
                      ? 'bg-white dark:bg-[#1a1f36] text-[#5550F2] dark:text-indigo-400 shadow-xs font-semibold'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
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
                      ? 'bg-white dark:bg-[#1a1f36] text-[#5550F2] dark:text-indigo-400 shadow-xs font-semibold'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <List size={15} />
                </button>
              </div>

              {/* Clear filters if active */}
              {hasActiveFilters && (
                <button
                  onClick={handleResetFilters}
                  className="px-2.5 py-1.5 rounded-xl border border-rose-200 dark:border-rose-500/20 bg-rose-50/50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 text-xs font-semibold hover:bg-rose-100 transition-colors flex items-center gap-1 cursor-pointer"
                  title="Restablecer filtros"
                >
                  <RefreshCw size={12} />
                  <span>Limpiar</span>
                </button>
              )}

            </div>

          </div>

          {/* Segment Pills Row */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-2.5 border-t border-slate-100 dark:border-white/5 -mx-1 px-1">
            <span className="text-[11px] font-bold uppercase text-slate-400 dark:text-slate-500 mr-1 shrink-0">
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
                      ? 'bg-[#5550F2] text-white shadow-xs'
                      : 'bg-slate-100/80 dark:bg-white/5 text-slate-600 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-white/10'
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
            3. CLIENTS DIRECTORY (GRID CARDS & EXECUTIVE TABLE)
           ═════════════════════════════════════════════════════════ */}
        {loading ? (
          <div className="bg-white dark:bg-[#131627] rounded-2xl border border-slate-200/80 dark:border-white/10 p-16 flex flex-col items-center justify-center text-center shadow-xs">
            <div className="w-10 h-10 rounded-full border-2 border-indigo-600 border-t-transparent animate-spin mb-3" />
            <p className="text-xs font-semibold text-slate-600 dark:text-slate-400">Cargando directorio de clientes…</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white dark:bg-[#131627] rounded-2xl border border-slate-200/80 dark:border-white/10 p-8 shadow-xs">
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
          /* ─── GRID CARDS VIEW (DISEÑO MINIMALISTA & ELEGANTE SIN RECUADROS GRISES) ─── */
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
                    className="bg-white dark:bg-[#131627] rounded-2xl border border-slate-200/80 dark:border-white/10 p-5 shadow-xs hover:shadow-md hover:border-slate-300 dark:hover:border-white/20 transition-all cursor-pointer flex flex-col justify-between group"
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
                            <h4 className="font-bold text-slate-900 dark:text-white text-base leading-snug truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                              {c.name}
                            </h4>
                            {c.phone ? (
                              <p className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                <Phone size={11} className="text-slate-400 shrink-0" />
                                <span className="font-mono">{c.phone}</span>
                              </p>
                            ) : (
                              <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
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
                            <span className="text-[10.5px] font-medium text-slate-400 px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-white/5">
                              Prospecto
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Financial & Activity Summary - Clean without clumsy grey boxes */}
                      <div className="my-3.5 py-3 px-3.5 rounded-xl bg-slate-50/70 dark:bg-white/[0.03] border border-slate-100 dark:border-white/5">
                        <div className="flex items-baseline justify-between">
                          <span className="text-xs font-medium text-slate-400 dark:text-slate-400">
                            Inversión Acumulada
                          </span>
                          <span className="font-mono font-black text-slate-900 dark:text-white text-base">
                            {fmt(c.totalSpent)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mt-2 pt-2 border-t border-slate-200/50 dark:border-white/5">
                          <span>{c.salesCount || 0} {c.salesCount === 1 ? 'compra' : 'compras'}</span>
                          <span>Última vez: {dateStr(c.lastPurchase)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Card Footer Actions */}
                    <div className="pt-2.5 border-t border-slate-100 dark:border-white/5 flex items-center justify-between gap-2">
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
                          className="p-1.5 rounded-xl text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 transition-colors"
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
                        className="text-xs font-bold text-[#5550F2] dark:text-indigo-400 hover:underline flex items-center gap-1 group-hover:translate-x-0.5 transition-transform"
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
          <div className="bg-white dark:bg-[#131627] rounded-2xl border border-slate-200/80 dark:border-white/10 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200/80 dark:border-white/10 bg-slate-50/70 dark:bg-white/[0.02] text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    <th className="py-3 px-4">Cliente</th>
                    <th className="py-3 px-4">Contacto</th>
                    <th className="py-3 px-4 text-center">Segmento</th>
                    <th className="py-3 px-4 text-center">Órdenes</th>
                    <th className="py-3 px-4 text-right">Inversión Total</th>
                    <th className="py-3 px-4 text-right">Ticket Promedio</th>
                    <th className="py-3 px-4 text-right">Última Compra</th>
                    <th className="py-3 px-4 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-white/5 text-xs">
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
                        className="hover:bg-slate-50/80 dark:hover:bg-white/[0.02] transition-colors cursor-pointer group"
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
                              <p className="font-bold text-slate-900 dark:text-white text-sm group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                                {c.name}
                              </p>
                              <span className="text-[11px] text-slate-400">
                                {c.document_number ? `Doc: ${c.document_number}` : 'Cliente Registrado'}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* 2. Contacto */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          {c.phone ? (
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-slate-700 dark:text-slate-300 font-medium">
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
                            <span className="text-slate-300 dark:text-slate-600">—</span>
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
                            <span className="text-[10px] text-slate-400 px-2 py-0.5 rounded-full bg-slate-100 dark:bg-white/5">
                              Prospecto
                            </span>
                          )}
                        </td>

                        {/* 4. Órdenes */}
                        <td className="py-3.5 px-4 text-center whitespace-nowrap">
                          <span className="font-mono font-bold text-slate-800 dark:text-slate-200 bg-slate-100 dark:bg-white/5 px-2.5 py-1 rounded-lg">
                            {c.salesCount || 0} {c.salesCount === 1 ? 'venta' : 'ventas'}
                          </span>
                        </td>

                        {/* 5. Inversión Total */}
                        <td className="py-3.5 px-4 text-right font-mono font-black text-sm text-slate-900 dark:text-white whitespace-nowrap">
                          {fmt(c.totalSpent)}
                        </td>

                        {/* 6. Ticket Promedio */}
                        <td className="py-3.5 px-4 text-right font-mono text-slate-600 dark:text-slate-300 whitespace-nowrap">
                          {fmt(avgTicket)}
                        </td>

                        {/* 7. Última Compra */}
                        <td className="py-3.5 px-4 text-right text-slate-500 dark:text-slate-400 font-medium whitespace-nowrap">
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
                              className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 transition-colors"
                              title="Ver expediente comercial"
                            >
                              <Eye size={15} />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => openEdit(c, e)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 transition-colors"
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
          <div className="p-3.5 sm:p-4 bg-white dark:bg-[#131627] rounded-2xl border border-slate-200/80 dark:border-white/10 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500 dark:text-slate-400">
            
            <div className="flex items-center gap-3">
              <span>
                Mostrando <strong className="text-slate-900 dark:text-white">{Math.min(filtered.length, (currentPage - 1) * pageSize + 1)}</strong> a <strong className="text-slate-900 dark:text-white">{Math.min(filtered.length, currentPage * pageSize)}</strong> de <strong className="text-slate-900 dark:text-white">{filtered.length}</strong> clientes
              </span>

              {/* Page Size Select */}
              <div className="flex items-center gap-1.5 pl-2 border-l border-slate-200 dark:border-white/10">
                <span className="text-[11px] text-slate-400">Mostrar:</span>
                <select
                  value={pageSize}
                  onChange={(e) => setPageSize(Number(e.target.value))}
                  className="bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg px-2 py-0.5 text-xs text-slate-700 dark:text-slate-300 font-semibold outline-none cursor-pointer"
                >
                  <option value={12} className="dark:bg-[#131627]">12</option>
                  <option value={24} className="dark:bg-[#131627]">24</option>
                  <option value={48} className="dark:bg-[#131627]">48</option>
                </select>
              </div>
            </div>

            {/* Page Buttons */}
            {totalPages > 1 && (
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="p-1.5 rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 disabled:opacity-40 disabled:cursor-not-allowed text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
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
                              ? 'bg-[#5550F2] text-white shadow-xs'
                              : 'bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10'
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
                  className="p-1.5 rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 disabled:opacity-40 disabled:cursor-not-allowed text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
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
          4. CLIENT COMMERCIAL DOSSIER MODAL (EXPEDIENTE)
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
            <div className="bg-slate-50 dark:bg-white/5 border border-slate-200/80 dark:border-white/10 rounded-2xl p-4 sm:p-5 flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-600 to-[#5550F2] text-white flex items-center justify-center font-black text-lg font-display shadow-md">
                  {getInitials(selected.name)}
                </div>
                <div>
                  <h4 className="font-black text-slate-900 dark:text-white text-base sm:text-lg">
                    {selected.name}
                  </h4>
                  {selected.document_number && (
                    <p className="text-xs text-slate-400 font-mono">
                      DNI/RUC: {selected.document_number}
                    </p>
                  )}
                  {selected.phone ? (
                    <div className="flex items-center gap-2 mt-1">
                      <a
                        href={`tel:${selected.phone}`}
                        className="text-xs text-indigo-600 dark:text-indigo-400 font-mono font-semibold hover:underline flex items-center gap-1"
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
                    <p className="text-xs text-slate-400 mt-0.5">Sin teléfono de contacto</p>
                  )}
                </div>
              </div>

              {/* Key Client Metrics */}
              <div className="flex items-center gap-5 text-right">
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Órdenes</p>
                  <p className="font-mono font-black text-slate-900 dark:text-white text-base">{selected.salesCount || 0}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Inversión Total</p>
                  <p className="font-mono font-black text-[#5550F2] dark:text-indigo-400 text-lg">{fmt(selected.totalSpent)}</p>
                </div>
              </div>
            </div>

            {/* Additional Contact Info if available */}
            {(selected.address || selected.email || selected.notes) && (
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200/60 dark:border-white/10 text-xs space-y-1 text-slate-600 dark:text-slate-300">
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
                  <p className="flex items-center gap-2 italic text-slate-500 dark:text-slate-400">
                    <FileText size={13} className="text-slate-400" />
                    <span>{selected.notes}</span>
                  </p>
                )}
              </div>
            )}

            {/* Sales Ledger Breakdown */}
            <div>
              <div className="flex items-center justify-between mb-2.5">
                <h5 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                  <Receipt size={14} className="text-slate-400" />
                  Historial de Compras ({selected.sales?.length || 0})
                </h5>
                <span className="text-[11px] text-slate-400">
                  Ordenado por fecha más reciente
                </span>
              </div>

              {(!selected.sales || selected.sales.length === 0) ? (
                <div className="text-center py-8 bg-slate-50 dark:bg-white/5 rounded-2xl border border-slate-200/80 dark:border-white/10">
                  <ShoppingBag size={28} className="mx-auto text-slate-300 dark:text-slate-600 mb-2" />
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold">
                    Este cliente aún no registra compras emitidas.
                  </p>
                </div>
              ) : (
                <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-1">
                  {selected.sales.map((sale) => {
                    const saleTotal = salesService.saleTotal(sale)

                    return (
                      <div
                        key={sale.id}
                        className="border border-slate-200 dark:border-white/10 rounded-2xl overflow-hidden bg-white dark:bg-white/5 shadow-xs"
                      >
                        {/* Sale Ticket Header */}
                        <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 bg-slate-50/80 dark:bg-white/5 border-b border-slate-100 dark:border-white/5">
                          <div className="flex items-center gap-2">
                            <Clock size={12} className="text-slate-400" />
                            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                              {new Date(sale.created_at).toLocaleString('es-PE', {
                                dateStyle: 'medium',
                                timeStyle: 'short'
                              })}
                            </span>
                            <span className="text-[10px] font-mono text-slate-400 bg-slate-100 dark:bg-white/10 px-1.5 py-0.2 rounded">
                              #{sale.id.slice(-6).toUpperCase()}
                            </span>
                          </div>
                          <div className="flex items-center gap-3">
                            <StatusBadge status={sale.status || 'pagado'} />
                            <span className="font-mono font-black text-sm text-slate-900 dark:text-white">
                              {fmt(saleTotal)}
                            </span>
                          </div>
                        </div>

                        {/* Items Breakdown */}
                        <div className="divide-y divide-slate-100 dark:divide-white/5">
                          {sale.items?.map((it, i) => (
                            <div
                              key={i}
                              className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 px-4 py-2 text-xs"
                            >
                              <div className="flex items-center gap-2">
                                <Package size={13} className="text-slate-400 shrink-0" />
                                <span className="text-slate-800 dark:text-slate-200 font-semibold">
                                  {it.product_name || it.product_id}
                                </span>
                              </div>
                              <span className="font-mono text-slate-500 dark:text-slate-400">
                                {it.quantity} × {fmt(it.unit_price)} ={' '}
                                <strong className="text-slate-900 dark:text-white font-bold">
                                  {fmt((Number(it.quantity) || 1) * (Number(it.unit_price) || 0))}
                                </strong>
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            <div className="flex justify-between items-center pt-3 border-t border-slate-100 dark:border-white/10">
              <button
                type="button"
                onClick={() => openEdit(selected)}
                className="btn-secondary text-xs flex items-center gap-1.5"
              >
                <Pencil size={13} />
                <span>Editar Cliente</span>
              </button>

              <button
                type="button"
                onClick={() => setSelected(null)}
                className="btn-secondary text-xs px-4 py-2"
              >
                Cerrar Expediente
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* ═════════════════════════════════════════════════════════
          5. CREATE / EDIT CLIENT MODAL
         ═════════════════════════════════════════════════════════ */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingClient ? `Editar Cliente — ${editingClient.name}` : 'Registrar Nuevo Cliente'}
        width="max-w-lg"
      >
        <form onSubmit={handleSubmitClient} className="space-y-4 text-slate-900 dark:text-white">
          
          {/* Full Name */}
          <div>
            <label className="label">Nombre Completo o Razón Social *</label>
            <input
              className="field dark:bg-[#1a1f36] dark:border-white/10 dark:text-white"
              placeholder="Ej. Juan Pérez Ramos, Distribuidora Andina S.A.C."
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
          </div>

          {/* Phone & Document Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="label">Teléfono / WhatsApp</label>
              <input
                className="field font-mono dark:bg-[#1a1f36] dark:border-white/10 dark:text-white"
                placeholder="Ej. 917 434 118"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
            </div>
            <div>
              <label className="label">N° DNI / RUC</label>
              <input
                className="field font-mono dark:bg-[#1a1f36] dark:border-white/10 dark:text-white"
                placeholder="Ej. 72345678 / 20601234567"
                value={form.document_number}
                onChange={(e) => setForm({ ...form, document_number: e.target.value })}
              />
            </div>
          </div>

          {/* Email & Address Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="label">Correo Electrónico</label>
              <input
                type="email"
                className="field dark:bg-[#1a1f36] dark:border-white/10 dark:text-white"
                placeholder="Ej. cliente@gmail.com"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>
            <div>
              <label className="label">Dirección de Entrega / Despacho</label>
              <input
                className="field dark:bg-[#1a1f36] dark:border-white/10 dark:text-white"
                placeholder="Ej. Av. Larco 456, Lima"
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
              />
            </div>
          </div>

          {/* Notes / Commercial preferences */}
          <div>
            <label className="label">Notas y Preferencias Comerciales</label>
            <textarea
              rows={2}
              className="field dark:bg-[#1a1f36] dark:border-white/10 dark:text-white resize-none"
              placeholder="Ej. Solicita comprobante con RUC, prefiere entregas por las tardes..."
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
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
              {saving ? 'Guardando…' : editingClient ? 'Guardar Cambios' : 'Registrar Cliente'}
            </button>
          </div>
        </form>
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
            <div className="bg-slate-50 dark:bg-white/5 rounded-2xl p-4 space-y-2 text-xs border border-slate-200 dark:border-white/10">
              <div className="flex justify-between items-center">
                <span className="text-slate-500 dark:text-slate-400">Cliente:</span>
                <strong className="text-slate-900 dark:text-white font-bold">{confirmDelete.name}</strong>
              </div>
              {confirmDelete.phone && (
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 dark:text-slate-400">Teléfono:</span>
                  <span className="font-mono text-slate-700 dark:text-slate-300">{confirmDelete.phone}</span>
                </div>
              )}
              <div className="flex justify-between items-center">
                <span className="text-slate-500 dark:text-slate-400">Historial:</span>
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
