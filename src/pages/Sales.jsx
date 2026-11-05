import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import {
  Plus, Trash2, Search, X, CheckCircle2, Clock, Filter,
  Receipt, User, Phone, Package, Eye, AlertCircle, AlertTriangle,
  Pencil, FileSpreadsheet, RotateCcw, Calendar, ChevronLeft,
  ChevronRight, Check, Download, MessageSquare, CreditCard, Copy,
  ArrowUpDown, ExternalLink, MoreHorizontal, ShoppingCart,
  TrendingUp, DollarSign, LayoutGrid, List, ShieldCheck
} from 'lucide-react'
import AppLayout from '../components/layout/AppLayout'
import Modal from '../components/ui/Modal'
import EmptyState from '../components/ui/EmptyState'
import ReceiptModal from '../components/Receipt'
import { salesService } from '../services/salesService'
import { productsService } from '../services/productsService'
import { clientsService } from '../services/clientsService'
import { companySettingsService } from '../services/companySettingsService'
import { usersService } from '../services/usersService'
import { useAuth } from '../context/AuthContext'

/* ─── Currency & Formatting Helpers ─── */
const fmtMoney = (n) =>
  `S/ ${(Number(n) || 0).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

const fmtNumberOnly = (n) =>
  (Number(n) || 0).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

function formatDateTimePE(dateStr) {
  if (!dateStr) return { date: '—', time: '—', full: '—' }
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return { date: String(dateStr), time: '', full: String(dateStr) }

  const day = String(d.getDate()).padStart(2, '0')
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const year = d.getFullYear()
  const hours = String(d.getHours()).padStart(2, '0')
  const mins = String(d.getMinutes()).padStart(2, '0')

  const date = `${day}/${month}/${year}`
  const time = `${hours}:${mins}`
  return { date, time, full: `${date} ${time}` }
}

export default function Sales() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user } = useAuth()

  // Backend Data States
  const [sales, setSales] = useState(() => salesService.getCached?.() || [])
  const [products, setProducts] = useState(() => productsService.getCached?.() || [])
  const [clients, setClients] = useState(() => clientsService.getCached?.() || [])
  const [company, setCompany] = useState(() => companySettingsService.getCached?.() || null)
  const [sellers, setSellers] = useState(() => usersService.getCached?.() || [])
  const [loading, setLoading] = useState(() => !salesService.hasCache?.())

  // ERP Filter & Control States
  const [search, setSearch] = useState('')
  const [statusTab, setStatusTab] = useState('ALL') // 'ALL' | 'pagado' | 'pendiente'
  const [periodFilter, setPeriodFilter] = useState('ALL') // 'ALL' | 'TODAY' | '7DAYS' | 'MONTH'
  const [sellerFilter, setSellerFilter] = useState('ALL')
  const [sortBy, setSortBy] = useState('recent') // 'recent' | 'amount_desc' | 'amount_asc' | 'client_asc'
  const [viewMode, setViewMode] = useState('table') // 'table' | 'grid'
  const [showMetrics, setShowMetrics] = useState(true)

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(12)

  // Modals & Action States
  const [viewingSale, setViewingSale] = useState(null)
  const [viewingReceipt, setViewingReceipt] = useState(null)

  // Edit Sale Modal
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [editingSale, setEditingSale] = useState(null)
  const [editForm, setEditForm] = useState({ clientName: '', clientPhone: '', datetimeLocal: '' })
  const [savingEdit, setSavingEdit] = useState(false)
  const [editError, setEditError] = useState('')

  // Delete Confirmation Modal
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [deleting, setDeleting] = useState(false)

  // Quick Settlement Modal
  const [settlingSale, setSettlingSale] = useState(null)
  const [settling, setSettling] = useState(false)

  // Clipboard feedback
  const [copiedId, setCopiedId] = useState(null)

  // Success Toast
  const [successToast, setSuccessToast] = useState(
    location.state?.created
      ? `Venta #${location.state?.saleId ? String(location.state.saleId).slice(-4).toUpperCase() : ''} registrada exitosamente`
      : ''
  )

  useEffect(() => {
    if (successToast) {
      const timer = setTimeout(() => setSuccessToast(''), 4500)
      return () => clearTimeout(timer)
    }
  }, [successToast])

  // Load Real Data from Supabase
  async function loadAll() {
    if (!salesService.hasCache?.()) setLoading(true)
    try {
      const [s, p, c, comp, u] = await Promise.all([
        salesService.list().catch(() => []),
        productsService.list().catch(() => []),
        clientsService.list().catch(() => []),
        companySettingsService.get().catch(() => null),
        usersService.list().catch(() => [])
      ])
      setSales(s || [])
      setProducts(p || [])
      setClients(c || [])
      setCompany(comp || null)
      setSellers(u || [])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadAll()
  }, [])

  // Product Map
  const productMap = useMemo(() => {
    const map = {}
    products.forEach((p) => { map[p.id] = p })
    return map
  }, [products])

  // Seller Lookup Map
  const sellerMap = useMemo(() => {
    const map = {}
    sellers.forEach((u) => {
      if (u.id) map[u.id] = u
      if (u.email) map[u.email.toLowerCase()] = u
    })
    return map
  }, [sellers])

  // Resolve Seller Name and Role
  const resolveSeller = (sale) => {
    if (sale.seller_name && sale.seller_name !== 'Usuario' && sale.seller_name !== 'Admin') {
      return { name: sale.seller_name, role: sale.seller_role || 'Vendedor' }
    }
    const matched = sellerMap[sale.created_by] || sellerMap[sale.seller_email?.toLowerCase()]
    if (matched) {
      return {
        name: matched.full_name || matched.name || matched.email?.split('@')[0],
        role: matched.role === 'admin' ? 'Administrador' : 'Empleado'
      }
    }
    if (sale.seller_email) {
      return { name: sale.seller_email.split('@')[0], role: 'Vendedor' }
    }
    return { name: 'Ventas', role: 'Operador' }
  }

  // Copy to clipboard helper
  const handleCopy = (text, id) => {
    navigator.clipboard?.writeText(text)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 1800)
  }

  // Filtered & Sorted Sales (100% Real Supabase Data)
  const filteredSales = useMemo(() => {
    let result = [...sales]

    // 1. Status Filter Tab
    if (statusTab === 'pagado') {
      result = result.filter((s) => s.status === 'pagado')
    } else if (statusTab === 'pendiente') {
      result = result.filter((s) => s.status === 'pendiente')
    }

    // 2. Period Filter
    if (periodFilter !== 'ALL') {
      const now = new Date()
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()

      if (periodFilter === 'TODAY') {
        result = result.filter((s) => new Date(s.created_at).getTime() >= todayStart)
      } else if (periodFilter === '7DAYS') {
        const sevenDaysAgo = todayStart - 7 * 24 * 60 * 60 * 1000
        result = result.filter((s) => new Date(s.created_at).getTime() >= sevenDaysAgo)
      } else if (periodFilter === 'MONTH') {
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime()
        result = result.filter((s) => new Date(s.created_at).getTime() >= monthStart)
      }
    }

    // 3. Seller Filter
    if (sellerFilter !== 'ALL') {
      result = result.filter((s) => {
        const sellerInfo = resolveSeller(s)
        return (
          s.created_by === sellerFilter ||
          s.seller_email === sellerFilter ||
          sellerInfo.name.toLowerCase() === sellerFilter.toLowerCase()
        )
      })
    }

    // 4. Omni Search Query
    if (search.trim()) {
      const q = search.toLowerCase().trim()
      result = result.filter((s) => {
        const code = String(s.id || '').slice(-6).toLowerCase()
        const fullId = String(s.id || '').toLowerCase()
        const client = String(s.client_name || '').toLowerCase()
        const phone = String(s.client_phone || '').toLowerCase()
        const seller = resolveSeller(s).name.toLowerCase()
        const itemsMatch = s.items?.some((it) => {
          const pr = productMap[it.product_id]
          const name = (pr?.name || it.name || '').toLowerCase()
          const sku = (pr?.sku || it.sku || '').toLowerCase()
          return name.includes(q) || sku.includes(q)
        })
        return (
          code.includes(q) ||
          fullId.includes(q) ||
          client.includes(q) ||
          phone.includes(q) ||
          seller.includes(q) ||
          itemsMatch
        )
      })
    }

    // 5. Sorting
    result.sort((a, b) => {
      if (sortBy === 'amount_desc') {
        return (Number(b.total) || 0) - (Number(a.total) || 0)
      }
      if (sortBy === 'amount_asc') {
        return (Number(a.total) || 0) - (Number(b.total) || 0)
      }
      if (sortBy === 'client_asc') {
        return String(a.client_name || '').localeCompare(String(b.client_name || ''))
      }
      // Default: recent first
      return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
    })

    return result
  }, [sales, statusTab, periodFilter, sellerFilter, search, sortBy, productMap, sellerMap])

  // Pagination Calculation
  const totalPages = Math.max(1, Math.ceil(filteredSales.length / pageSize))
  const paginatedSales = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return filteredSales.slice(start, start + pageSize)
  }, [filteredSales, currentPage, pageSize])

  // Executive Statistics (matching standard ERP Metrics)
  const stats = useMemo(() => {
    const totalCount = filteredSales.length
    const totalAmount = filteredSales.reduce((sum, s) => sum + (Number(s.total) || 0), 0)

    const paidList = filteredSales.filter((s) => s.status === 'pagado')
    const paidAmount = paidList.reduce((sum, s) => sum + (Number(s.total) || 0), 0)

    const pendingList = filteredSales.filter((s) => s.status === 'pendiente')
    const pendingAmount = pendingList.reduce((sum, s) => sum + (Number(s.total) || 0), 0)

    const avgTicket = totalCount > 0 ? totalAmount / totalCount : 0
    const collectionRate = totalAmount > 0 ? Math.round((paidAmount / totalAmount) * 100) : 100

    return {
      totalCount,
      totalAmount,
      paidCount: paidList.length,
      paidAmount,
      pendingCount: pendingList.length,
      pendingAmount,
      avgTicket,
      collectionRate
    }
  }, [filteredSales])

  // Reset all filters
  const resetFilters = () => {
    setSearch('')
    setStatusTab('ALL')
    setPeriodFilter('ALL')
    setSellerFilter('ALL')
    setSortBy('recent')
    setCurrentPage(1)
  }

  const hasActiveFilters =
    search.trim() !== '' ||
    statusTab !== 'ALL' ||
    periodFilter !== 'ALL' ||
    sellerFilter !== 'ALL' ||
    sortBy !== 'recent'

  // Quick Settlement of Pending Sale
  const handleQuickSettle = async () => {
    if (!settlingSale) return
    setSettling(true)
    try {
      await salesService.update(settlingSale.id, {
        status: 'pagado',
        paid_at: new Date().toISOString()
      })
      await loadAll()
      setSuccessToast(`Pedido #${String(settlingSale.id).slice(-4).toUpperCase()} marcado como pagado exitosamente.`)
      setSettlingSale(null)
    } catch (err) {
      alert(err.message || 'Error al liquidar venta')
    } finally {
      setSettling(false)
    }
  }

  // Edit Sale Details
  const handleOpenEdit = (sale) => {
    setEditingSale(sale)
    const dt = sale.created_at ? new Date(sale.created_at) : new Date()
    const pad = (n) => String(n).padStart(2, '0')
    const localIso = `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}T${pad(dt.getHours())}:${pad(dt.getMinutes())}`
    setEditForm({
      clientName: sale.client_name || '',
      clientPhone: sale.client_phone || '',
      datetimeLocal: localIso
    })
    setEditError('')
    setEditModalOpen(true)
  }

  const handleSaveEdit = async () => {
    if (!editingSale) return
    setSavingEdit(true)
    setEditError('')
    try {
      const updates = {
        client_name: editForm.clientName.trim() || 'Cliente General',
        client_phone: editForm.clientPhone.trim()
      }
      if (editForm.datetimeLocal) {
        const parsed = new Date(editForm.datetimeLocal)
        if (!isNaN(parsed.getTime())) {
          updates.created_at = parsed.toISOString()
        }
      }
      await salesService.update(editingSale.id, updates)
      await loadAll()
      setEditModalOpen(false)
      setEditingSale(null)
      setSuccessToast('Datos de la venta actualizados correctamente.')
    } catch (err) {
      setEditError(err.message || 'Error al actualizar la venta.')
    } finally {
      setSavingEdit(false)
    }
  }

  // Delete Sale
  const handleDeleteSale = async () => {
    if (!confirmDelete) return
    setDeleting(true)
    try {
      await salesService.remove(confirmDelete.id)
      await loadAll()
      setConfirmDelete(null)
      setSuccessToast('Venta anulada del registro con éxito.')
    } catch (err) {
      alert(err.message || 'Error al anular la venta.')
    } finally {
      setDeleting(false)
    }
  }

  // WhatsApp Share
  const handleWhatsApp = (sale) => {
    const phone = (sale.client_phone || '').replace(/\D/g, '')
    const ref = `#${String(sale.id).slice(-4).toUpperCase()}`
    const msg = `Hola ${sale.client_name || 'estimado cliente'}, le saludamos de ${company?.name || 'nuestra empresa'}. Le compartimos el detalle de su pedido ${ref} por un total de ${fmtMoney(sale.total)}. Estado: ${sale.status === 'pagado' ? 'PAGADO' : 'PENDIENTE DE PAGO'}. ¡Gracias por su compra!`
    const url = phone
      ? `https://wa.me/51${phone}?text=${encodeURIComponent(msg)}`
      : `https://wa.me/?text=${encodeURIComponent(msg)}`
    window.open(url, '_blank')
  }

  // Export to Excel / CSV
  const handleExportExcel = () => {
    const headers = [
      'N° Pedido',
      'Fecha Emisión',
      'Hora',
      'Cliente',
      'Teléfono / Doc',
      'Vendedor',
      'Items',
      'Moneda',
      'Total Venta',
      'Estado'
    ]

    const rows = filteredSales.map((s) => {
      const { date, time } = formatDateTimePE(s.created_at)
      const seller = resolveSeller(s)
      return [
        `"VTA-${String(s.id).slice(-6).toUpperCase()}"`,
        `"${date}"`,
        `"${time}"`,
        `"${(s.client_name || 'Cliente General').replace(/"/g, '""')}"`,
        `"${s.client_phone || '—'}"`,
        `"${seller.name.replace(/"/g, '""')}"`,
        s.items?.length || 0,
        'PEN',
        Number(s.total || 0).toFixed(2),
        s.status === 'pagado' ? 'FACTURADO / COBRADO' : 'PENDIENTE DE PAGO'
      ]
    })

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `Ventas_Registro_ERP_${new Date().toISOString().slice(0, 10)}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <AppLayout title="Ventas & Facturación">
      <div className="space-y-5 max-w-[1440px] mx-auto pb-16">

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
            0. TOP EXECUTIVE HEADER TOOLBAR (COHESIVE ERP STYLE)
           ═════════════════════════════════════════════════════════ */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-[#141417] p-4 sm:p-5 rounded-2xl border border-slate-200/80 dark:border-zinc-800 shadow-xs">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-brand/10 text-brand dark:text-blue-400">
                <ShoppingCart size={18} />
              </span>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-zinc-100 tracking-tight font-display">
                Pedidos de Venta & Facturación
              </h1>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-zinc-400 mt-1">
              Registro comercial, comprobantes de pago emitidos y liquidación de cobranzas.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Toggle KPIs */}
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
              title="Exportar órdenes filtradas a Excel / CSV"
            >
              <FileSpreadsheet size={15} />
              <span>Exportar</span>
            </button>

            {/* Primary New Sale Button */}
            <button
              onClick={() => navigate('/ventas/nueva')}
              className="px-4 py-2 rounded-xl bg-brand hover:bg-brand-hover text-white text-xs sm:text-sm font-bold flex items-center gap-1.5 shadow-sm hover:shadow-card active:scale-95 transition-all cursor-pointer"
            >
              <Plus size={16} />
              <span>+ Nueva Venta</span>
            </button>
          </div>
        </div>

        {/* ═════════════════════════════════════════════════════════
            1. EXECUTIVE METRICS BAR (4 CLEAN ENTERPRISE ERP CARDS)
           ═════════════════════════════════════════════════════════ */}
        {showMetrics && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4 animate-fade-in">
            {/* Card 1: Facturación Total */}
            <div className="bg-white dark:bg-[#141417] rounded-2xl border border-slate-200/80 dark:border-zinc-800 p-3.5 sm:p-4.5 shadow-xs flex flex-col justify-between transition-all hover:border-slate-300 dark:hover:border-zinc-700">
              <div className="flex items-center justify-between gap-1.5 mb-2">
                <p className="text-[10px] sm:text-[11px] font-bold text-slate-400 dark:text-zinc-400 uppercase tracking-wider truncate">
                  Total Facturado
                </p>
                <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 flex items-center justify-center text-brand dark:text-blue-400 shrink-0">
                  <DollarSign size={16} />
                </div>
              </div>
              <div>
                <h4 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-zinc-100 tracking-tight font-display font-mono">
                  {loading ? '…' : fmtMoney(stats.totalAmount)}
                </h4>
                <p className="text-[11px] text-slate-400 dark:text-zinc-500 mt-0.5 truncate">
                  {stats.totalCount} pedidos registrados
                </p>
              </div>
            </div>

            {/* Card 2: Cobrado / Liquidado */}
            <div className="bg-white dark:bg-[#141417] rounded-2xl border border-slate-200/80 dark:border-zinc-800 p-3.5 sm:p-4.5 shadow-xs flex flex-col justify-between transition-all hover:border-slate-300 dark:hover:border-zinc-700">
              <div className="flex items-center justify-between gap-1.5 mb-2">
                <p className="text-[10px] sm:text-[11px] font-bold text-slate-400 dark:text-zinc-400 uppercase tracking-wider truncate">
                  Cobrado / Liquidado
                </p>
                <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
                  <CheckCircle2 size={16} />
                </div>
              </div>
              <div>
                <h4 className="text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400 tracking-tight font-display font-mono">
                  {loading ? '…' : fmtMoney(stats.paidAmount)}
                </h4>
                <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold mt-0.5 truncate">
                  {stats.paidCount} cobrados ({stats.collectionRate}%)
                </p>
              </div>
            </div>

            {/* Card 3: Por Cobrar */}
            <div className="bg-white dark:bg-[#141417] rounded-2xl border border-slate-200/80 dark:border-zinc-800 p-3.5 sm:p-4.5 shadow-xs flex flex-col justify-between transition-all hover:border-slate-300 dark:hover:border-zinc-700">
              <div className="flex items-center justify-between gap-1.5 mb-2">
                <p className="text-[10px] sm:text-[11px] font-bold text-slate-400 dark:text-zinc-400 uppercase tracking-wider truncate">
                  Por Cobrar (Pendiente)
                </p>
                <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0">
                  <Clock size={16} />
                </div>
              </div>
              <div>
                <h4 className="text-xl sm:text-2xl font-black text-amber-600 dark:text-amber-400 tracking-tight font-display font-mono">
                  {loading ? '…' : fmtMoney(stats.pendingAmount)}
                </h4>
                <p className="text-[11px] text-amber-600 dark:text-amber-400 font-semibold mt-0.5 truncate">
                  {stats.pendingCount} órdenes pendientes
                </p>
              </div>
            </div>

            {/* Card 4: Ticket Promedio */}
            <div className="bg-white dark:bg-[#141417] rounded-2xl border border-slate-200/80 dark:border-zinc-800 p-3.5 sm:p-4.5 shadow-xs flex flex-col justify-between transition-all hover:border-slate-300 dark:hover:border-zinc-700">
              <div className="flex items-center justify-between gap-1.5 mb-2">
                <p className="text-[10px] sm:text-[11px] font-bold text-slate-400 dark:text-zinc-400 uppercase tracking-wider truncate">
                  Ticket Promedio
                </p>
                <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-purple-50 dark:bg-purple-500/10 border border-purple-200 dark:border-purple-500/20 flex items-center justify-center text-purple-600 dark:text-purple-400 shrink-0">
                  <Receipt size={16} />
                </div>
              </div>
              <div>
                <h4 className="text-xl sm:text-2xl font-black text-purple-600 dark:text-purple-400 tracking-tight font-display font-mono">
                  {loading ? '…' : fmtMoney(stats.avgTicket)}
                </h4>
                <p className="text-[11px] text-slate-400 dark:text-zinc-500 mt-0.5 truncate">
                  Promedio por comprobante
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ═════════════════════════════════════════════════════════
            2. ERP CONTROL PANEL (SEARCH, FILTERS, SEGMENTS, VIEW)
           ═════════════════════════════════════════════════════════ */}
        <div className="bg-white dark:bg-[#141417] rounded-2xl border border-slate-200/80 dark:border-zinc-800 p-3.5 sm:p-4 shadow-xs space-y-3">
          
          {/* Main Search & Segmented Filter Bar */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            
            {/* Search Input */}
            <div className="relative flex-1 w-full lg:max-w-md">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-zinc-500" />
              <input
                className="w-full bg-slate-50 dark:bg-zinc-800/80 border border-slate-200 dark:border-zinc-700 rounded-xl pl-10 pr-9 py-2 text-xs sm:text-sm text-slate-900 dark:text-zinc-100 placeholder:text-slate-400 dark:placeholder:text-zinc-500 focus:bg-white dark:focus:bg-zinc-900 focus:border-brand focus:ring-2 focus:ring-brand/10 transition-all outline-none"
                placeholder="Buscar por cliente, N° pedido, comprobante o artículo…"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value)
                  setCurrentPage(1)
                }}
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

            {/* Status Segment Filter Chips (Matching Users.jsx Style) */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0 no-scrollbar">
              <button
                type="button"
                onClick={() => { setStatusTab('ALL'); setCurrentPage(1) }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                  statusTab === 'ALL'
                    ? 'bg-brand text-white shadow-xs'
                    : 'bg-slate-50 dark:bg-zinc-800 text-slate-600 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-700'
                }`}
              >
                Todas ({sales.length})
              </button>
              <button
                type="button"
                onClick={() => { setStatusTab('pagado'); setCurrentPage(1) }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                  statusTab === 'pagado'
                    ? 'bg-brand text-white shadow-xs'
                    : 'bg-slate-50 dark:bg-zinc-800 text-slate-600 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-700'
                }`}
              >
                Cobrados ({sales.filter((s) => s.status === 'pagado').length})
              </button>
              <button
                type="button"
                onClick={() => { setStatusTab('pendiente'); setCurrentPage(1) }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                  statusTab === 'pendiente'
                    ? 'bg-brand text-white shadow-xs'
                    : 'bg-slate-50 dark:bg-zinc-800 text-slate-600 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-700'
                }`}
              >
                Pendientes ({sales.filter((s) => s.status === 'pendiente').length})
              </button>
            </div>
          </div>

          {/* Secondary Filter Row: Period, Seller, Sort, View Mode */}
          <div className="flex flex-wrap items-center justify-between gap-2.5 pt-2 border-t border-slate-100 dark:border-zinc-800/80 text-xs">
            <div className="flex flex-wrap items-center gap-2">
              {/* Period Filter */}
              <div className="flex items-center gap-1 bg-slate-50 dark:bg-zinc-800/80 rounded-xl px-2.5 py-1.5 border border-slate-200/80 dark:border-zinc-700">
                <Calendar size={13} className="text-slate-400" />
                <select
                  value={periodFilter}
                  onChange={(e) => { setPeriodFilter(e.target.value); setCurrentPage(1) }}
                  className="bg-transparent text-xs text-slate-700 dark:text-zinc-200 font-semibold outline-none cursor-pointer"
                >
                  <option value="ALL" className="dark:bg-zinc-900">Período: Histórico</option>
                  <option value="TODAY" className="dark:bg-zinc-900">Hoy</option>
                  <option value="7DAYS" className="dark:bg-zinc-900">Últimos 7 días</option>
                  <option value="MONTH" className="dark:bg-zinc-900">Este mes</option>
                </select>
              </div>

              {/* Seller Filter */}
              <div className="flex items-center gap-1 bg-slate-50 dark:bg-zinc-800/80 rounded-xl px-2.5 py-1.5 border border-slate-200/80 dark:border-zinc-700">
                <User size={13} className="text-slate-400" />
                <select
                  value={sellerFilter}
                  onChange={(e) => { setSellerFilter(e.target.value); setCurrentPage(1) }}
                  className="bg-transparent text-xs text-slate-700 dark:text-zinc-200 font-semibold outline-none cursor-pointer"
                >
                  <option value="ALL" className="dark:bg-zinc-900">Vendedor: Todos</option>
                  {sellers.map((u) => (
                    <option key={u.id} value={u.full_name || u.email} className="dark:bg-zinc-900">
                      {u.full_name || u.email?.split('@')[0]}
                    </option>
                  ))}
                </select>
              </div>

              {/* Sort By */}
              <div className="flex items-center gap-1 bg-slate-50 dark:bg-zinc-800/80 rounded-xl px-2.5 py-1.5 border border-slate-200/80 dark:border-zinc-700">
                <ArrowUpDown size={13} className="text-slate-400" />
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="bg-transparent text-xs text-slate-700 dark:text-zinc-200 font-semibold outline-none cursor-pointer"
                >
                  <option value="recent" className="dark:bg-zinc-900">Más recientes</option>
                  <option value="amount_desc" className="dark:bg-zinc-900">Mayor importe</option>
                  <option value="amount_asc" className="dark:bg-zinc-900">Menor importe</option>
                  <option value="client_asc" className="dark:bg-zinc-900">Cliente A-Z</option>
                </select>
              </div>

              {/* Clear Filters Button */}
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={resetFilters}
                  className="text-xs font-semibold text-slate-500 hover:text-red-600 dark:hover:text-red-400 flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                >
                  <RotateCcw size={12} />
                  <span>Restablecer</span>
                </button>
              )}
            </div>

            {/* View Switcher: Table vs Cards */}
            <div className="inline-flex items-center p-1 bg-slate-100 dark:bg-zinc-800 rounded-xl border border-slate-200/80 dark:border-zinc-700 shrink-0">
              <button
                type="button"
                onClick={() => setViewMode('table')}
                title="Vista en tabla (estilo ERP)"
                className={`p-1.5 rounded-lg transition-all ${
                  viewMode === 'table'
                    ? 'bg-white dark:bg-zinc-900 text-brand dark:text-blue-400 shadow-xs font-bold'
                    : 'text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-100'
                }`}
              >
                <List size={15} />
              </button>
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                title="Vista en tarjetas (Kanban)"
                className={`p-1.5 rounded-lg transition-all ${
                  viewMode === 'grid'
                    ? 'bg-white dark:bg-zinc-900 text-brand dark:text-blue-400 shadow-xs font-bold'
                    : 'text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-100'
                }`}
              >
                <LayoutGrid size={15} />
              </button>
            </div>
          </div>

        </div>

        {/* ═════════════════════════════════════════════════════════
            3. MAIN CONTENT: ERP TABLE VIEW OR GRID
           ═════════════════════════════════════════════════════════ */}
        {loading ? (
          <div className="bg-white dark:bg-[#141417] rounded-2xl border border-slate-200/80 dark:border-zinc-800 p-16 flex flex-col items-center justify-center text-center shadow-xs">
            <div className="w-10 h-10 rounded-full border-2 border-brand border-t-transparent animate-spin mb-3" />
            <p className="text-xs font-semibold text-slate-600 dark:text-zinc-400">
              Cargando órdenes y registro de ventas…
            </p>
          </div>
        ) : filteredSales.length === 0 ? (
          <div className="bg-white dark:bg-[#141417] rounded-2xl border border-slate-200/80 dark:border-zinc-800 p-8 shadow-xs">
            <EmptyState
              icon={ShoppingCart}
              title="No se encontraron ventas"
              description={
                hasActiveFilters
                  ? 'No hay pedidos ni comprobantes que coincidan con los filtros aplicados.'
                  : 'Aún no se han registrado órdenes comerciales en tu sistema ERP.'
              }
              action={
                hasActiveFilters ? (
                  <button onClick={resetFilters} className="btn-secondary text-xs">
                    Restablecer filtros
                  </button>
                ) : (
                  <button onClick={() => navigate('/ventas/nueva')} className="btn-primary text-xs">
                    <Plus size={15} /> Registrar primera venta
                  </button>
                )
              }
            />
          </div>
        ) : viewMode === 'table' ? (
          /* ─── ENTERPRISE ERP DATA GRID ─── */
          <div className="bg-white dark:bg-[#141417] rounded-2xl border border-slate-200/80 dark:border-zinc-800 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200/80 dark:border-zinc-800 bg-slate-50/70 dark:bg-zinc-800/50 text-[11px] font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider">
                    <th className="py-3 px-4 w-28">N° Pedido</th>
                    <th className="py-3 px-4 whitespace-nowrap min-w-[140px]">Fecha y Hora</th>
                    <th className="py-3 px-4 min-w-[200px]">Cliente</th>
                    <th className="py-3 px-4 min-w-[140px]">Vendedor</th>
                    <th className="py-3 px-4 min-w-[200px]">Artículos Facturados</th>
                    <th className="py-3 px-4 text-right font-mono min-w-[110px]">Total Venta</th>
                    <th className="py-3 px-4 text-center min-w-[120px]">Estado</th>
                    <th className="py-3 px-4 text-right min-w-[130px]">Acciones</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100 dark:divide-zinc-800 text-xs">
                  {paginatedSales.map((s) => {
                    const isPending = s.status === 'pendiente'
                    const orderCode = `VTA-${String(s.id).slice(-4).toUpperCase()}`
                    const { date, time } = formatDateTimePE(s.created_at)
                    const seller = resolveSeller(s)
                    const totalVal = Number(s.total) || 0

                    // Product summary lines
                    const firstItem = s.items?.[0]
                    const firstProduct = firstItem ? productMap[firstItem.product_id] : null
                    const firstItemName = firstProduct?.name || firstItem?.name || 'Venta de productos'
                    const extraItemsCount = (s.items?.length || 1) - 1

                    return (
                      <tr
                        key={s.id}
                        onClick={() => setViewingSale(s)}
                        className="hover:bg-slate-50/80 dark:hover:bg-zinc-800/40 transition-colors cursor-pointer group"
                      >
                        {/* 1. N° Pedido */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400 group-hover:underline">
                              {orderCode}
                            </span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleCopy(orderCode, s.id)
                              }}
                              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                              title="Copiar código de pedido"
                            >
                              {copiedId === s.id ? (
                                <Check size={12} className="text-emerald-500" />
                              ) : (
                                <Copy size={12} />
                              )}
                            </button>
                          </div>
                        </td>

                        {/* 2. Fecha y Hora */}
                        <td className="py-3.5 px-4 whitespace-nowrap text-slate-600 dark:text-zinc-300 font-mono text-[11px]">
                          <span>{date}</span>
                          <span className="text-slate-400 ml-1.5">{time}</span>
                        </td>

                        {/* 3. Cliente */}
                        <td className="py-3.5 px-4">
                          <div>
                            <p className="font-bold text-slate-900 dark:text-zinc-100 uppercase tracking-tight truncate max-w-[200px]">
                              {s.client_name || 'Cliente General'}
                            </p>
                            {s.client_phone && (
                              <p className="text-[11px] text-slate-400 font-mono">
                                Tel: {s.client_phone}
                              </p>
                            )}
                          </div>
                        </td>

                        {/* 4. Vendedor */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-1.5">
                            <div className="w-6 h-6 rounded-md bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 font-bold text-[10px] flex items-center justify-center shrink-0 border border-slate-200 dark:border-zinc-700">
                              {seller.name.slice(0, 2).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <p className="font-semibold text-slate-800 dark:text-zinc-200 truncate">
                                {seller.name}
                              </p>
                              <p className="text-[10px] text-slate-400">
                                {seller.role}
                              </p>
                            </div>
                          </div>
                        </td>

                        {/* 5. Artículos Facturados */}
                        <td className="py-3.5 px-4 text-slate-700 dark:text-zinc-300">
                          <div className="flex items-center gap-1.5">
                            <Package size={13} className="text-slate-400 shrink-0" />
                            <span className="font-medium truncate max-w-[170px]" title={firstItemName}>
                              {firstItemName}
                            </span>
                            {extraItemsCount > 0 && (
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-300 shrink-0">
                                +{extraItemsCount}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* 6. Total Venta */}
                        <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-900 dark:text-zinc-100 whitespace-nowrap">
                          {fmtMoney(totalVal)}
                        </td>

                        {/* 7. Estado (Sobrio tipo ERP Odoo / SAP) */}
                        <td className="py-3.5 px-4 text-center whitespace-nowrap">
                          {isPending ? (
                            <span className="inline-block px-2.5 py-1 rounded-md text-[11px] font-bold uppercase tracking-wider bg-amber-50 text-amber-800 border border-amber-300 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-700/50">
                              Pendiente
                            </span>
                          ) : (
                            <span className="inline-block px-2.5 py-1 rounded-md text-[11px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-800 border border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-700/50">
                              Pagado
                            </span>
                          )}
                        </td>

                        {/* 8. Acciones Rápidas */}
                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                          <div
                            className="flex items-center justify-end gap-1"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {/* Botón de Cobro exprés si está pendiente */}
                            {isPending && (
                              <button
                                type="button"
                                onClick={() => setSettlingSale(s)}
                                className="px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300 dark:hover:bg-emerald-500/20 border border-emerald-200 dark:border-emerald-500/30 text-[11px] font-bold flex items-center gap-1 transition-colors cursor-pointer"
                                title="Liquidar y registrar cobro"
                              >
                                <CreditCard size={12} />
                                <span>Cobrar</span>
                              </button>
                            )}

                            {/* Ver Boleta */}
                            <button
                              type="button"
                              onClick={() => setViewingReceipt(s)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-zinc-800 transition-colors"
                              title="Ver / Imprimir Boleta o Comprobante"
                            >
                              <Receipt size={14} />
                            </button>

                            {/* WhatsApp */}
                            <button
                              type="button"
                              onClick={() => handleWhatsApp(s)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-zinc-800 transition-colors"
                              title="Compartir por WhatsApp"
                            >
                              <MessageSquare size={14} />
                            </button>

                            {/* Editar datos */}
                            <button
                              type="button"
                              onClick={() => handleOpenEdit(s)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-zinc-800 transition-colors"
                              title="Modificar datos de la venta"
                            >
                              <Pencil size={14} />
                            </button>

                            {/* Anular / Eliminar */}
                            <button
                              type="button"
                              onClick={() => setConfirmDelete(s)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-zinc-800 transition-colors"
                              title="Anular venta"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Table Footer: ERP Summary and Pagination Bar */}
            <div className="p-3.5 sm:p-4 bg-slate-50/70 dark:bg-zinc-800/50 border-t border-slate-200/80 dark:border-zinc-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500 dark:text-zinc-400">
              <div className="flex items-center gap-4 flex-wrap">
                <span>
                  Mostrando{' '}
                  <strong className="text-slate-800 dark:text-zinc-200">
                    {(currentPage - 1) * pageSize + 1}
                  </strong>{' '}
                  a{' '}
                  <strong className="text-slate-800 dark:text-zinc-200">
                    {Math.min(currentPage * pageSize, filteredSales.length)}
                  </strong>{' '}
                  de{' '}
                  <strong className="text-slate-800 dark:text-zinc-200">
                    {filteredSales.length}
                  </strong>{' '}
                  pedidos
                </span>

                <span className="hidden md:inline-block w-px h-3.5 bg-slate-300 dark:bg-zinc-700" />

                <span className="hidden md:inline font-mono">
                  Suma mostrada:{' '}
                  <strong className="text-slate-900 dark:text-zinc-100 font-bold">
                    {fmtMoney(paginatedSales.reduce((acc, s) => acc + (Number(s.total) || 0), 0))}
                  </strong>
                </span>
              </div>

              {/* Pagination Controls */}
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  disabled={currentPage <= 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-slate-700 dark:text-zinc-200 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-zinc-700 transition-colors flex items-center gap-1 font-semibold"
                >
                  <ChevronLeft size={14} />
                  <span>Anterior</span>
                </button>

                <span className="px-3 py-1 font-mono font-semibold text-slate-700 dark:text-zinc-300">
                  {currentPage} / {totalPages}
                </span>

                <button
                  type="button"
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-slate-700 dark:text-zinc-200 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-zinc-700 transition-colors flex items-center gap-1 font-semibold"
                >
                  <span>Siguiente</span>
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* ─── KANBAN / CARDS VIEW (ESTILO ODOO CARDS) ─── */
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3.5">
            {paginatedSales.map((s) => {
              const isPending = s.status === 'pendiente'
              const orderCode = `VTA-${String(s.id).slice(-4).toUpperCase()}`
              const { full } = formatDateTimePE(s.created_at)
              const seller = resolveSeller(s)
              const totalVal = Number(s.total) || 0

              return (
                <div
                  key={s.id}
                  onClick={() => setViewingSale(s)}
                  className="bg-white dark:bg-[#141417] rounded-2xl border border-slate-200/80 dark:border-zinc-800 p-4 shadow-xs hover:border-slate-300 dark:hover:border-zinc-700 transition-all cursor-pointer flex flex-col justify-between space-y-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="font-mono text-xs font-bold text-indigo-600 dark:text-indigo-400">
                        {orderCode}
                      </span>
                      <h4 className="font-bold text-slate-900 dark:text-zinc-100 uppercase tracking-tight text-sm mt-0.5 truncate max-w-[200px]">
                        {s.client_name || 'Cliente General'}
                      </h4>
                      <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                        {full}
                      </p>
                    </div>

                    <div className="text-right shrink-0">
                      <p className="text-base font-extrabold font-mono text-slate-900 dark:text-zinc-100">
                        {fmtMoney(totalVal)}
                      </p>
                      <div className="mt-1">
                        {isPending ? (
                          <span className="inline-block px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-amber-50 text-amber-800 border border-amber-300 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-700/50">
                            Pendiente
                          </span>
                        ) : (
                          <span className="inline-block px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-800 border border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-700/50">
                            Pagado
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Items summary */}
                  <div className="py-2 px-2.5 rounded-xl bg-slate-50 dark:bg-zinc-800/50 border border-slate-100 dark:border-zinc-800 text-xs text-slate-600 dark:text-zinc-300 space-y-1">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      Detalle de Artículos ({s.items?.length || 0})
                    </p>
                    <p className="font-medium text-slate-800 dark:text-zinc-200 truncate">
                      {s.items?.[0]?.name || productMap[s.items?.[0]?.product_id]?.name || 'Productos varios'}
                      {(s.items?.length || 0) > 1 && ` y ${(s.items?.length || 0) - 1} más…`}
                    </p>
                  </div>

                  {/* Footer & Actions */}
                  <div className="pt-2 border-t border-slate-100 dark:border-zinc-800 flex items-center justify-between text-xs">
                    <span className="text-[11px] text-slate-400">
                      Vendido por: <strong className="text-slate-600 dark:text-zinc-300 font-semibold">{seller.name}</strong>
                    </span>

                    <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                      {isPending && (
                        <button
                          type="button"
                          onClick={() => setSettlingSale(s)}
                          className="px-2 py-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold"
                          title="Cobrar"
                        >
                          Cobrar
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setViewingReceipt(s)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600"
                        title="Ver Boleta"
                      >
                        <Receipt size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleWhatsApp(s)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-600"
                        title="WhatsApp"
                      >
                        <MessageSquare size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* ═════════════════════════════════════════════════════════
            MODAL 1: DETALLE DE VENTA COMPLETO (ERP ORDER PREVIEW)
           ═════════════════════════════════════════════════════════ */}
        {viewingSale && (
          <Modal
            open={!!viewingSale}
            onClose={() => setViewingSale(null)}
            title={`Orden de Venta VTA-${String(viewingSale.id).slice(-4).toUpperCase()}`}
          >
            <div className="space-y-4">
              {/* Order Header Info */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 rounded-xl bg-slate-50 dark:bg-zinc-800/60 border border-slate-200/80 dark:border-zinc-700 text-xs">
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Cliente</p>
                  <p className="font-bold text-slate-900 dark:text-zinc-100 uppercase mt-0.5">
                    {viewingSale.client_name || 'Cliente General'}
                  </p>
                  {viewingSale.client_phone && (
                    <p className="text-[11px] text-slate-400">{viewingSale.client_phone}</p>
                  )}
                </div>

                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Fecha y Hora</p>
                  <p className="font-semibold text-slate-800 dark:text-zinc-200 mt-0.5">
                    {formatDateTimePE(viewingSale.created_at).full}
                  </p>
                </div>

                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Vendedor</p>
                  <p className="font-semibold text-slate-800 dark:text-zinc-200 mt-0.5">
                    {resolveSeller(viewingSale).name}
                  </p>
                  <p className="text-[10px] text-slate-400">{resolveSeller(viewingSale).role}</p>
                </div>

                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Estado de Pago</p>
                  <div className="mt-0.5">
                    {viewingSale.status === 'pendiente' ? (
                      <span className="inline-block px-2 py-0.5 rounded-md text-[10px] font-bold uppercase bg-amber-50 text-amber-800 border border-amber-300 dark:bg-amber-950/40 dark:text-amber-300">
                        Pendiente de Cobro
                      </span>
                    ) : (
                      <span className="inline-block px-2 py-0.5 rounded-md text-[10px] font-bold uppercase bg-emerald-50 text-emerald-800 border border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300">
                        Facturado / Pagado
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Items Breakdown Table */}
              <div className="rounded-xl border border-slate-200 dark:border-zinc-700 overflow-hidden">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-100/70 dark:bg-zinc-800 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200 dark:border-zinc-700">
                      <th className="py-2.5 px-3">Artículo / Producto</th>
                      <th className="py-2.5 px-3 text-center">Cant.</th>
                      <th className="py-2.5 px-3 text-right">P. Unitario</th>
                      <th className="py-2.5 px-3 text-right">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-zinc-800">
                    {(viewingSale.items || []).map((it, idx) => {
                      const prod = productMap[it.product_id]
                      const name = prod?.name || it.name || `Producto #${idx + 1}`
                      const qty = Number(it.quantity || it.qty || 1)
                      const unitPrice = Number(it.price || it.unit_price || 0)
                      const sub = Number(it.subtotal || qty * unitPrice)

                      return (
                        <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-zinc-800/40">
                          <td className="py-2.5 px-3">
                            <p className="font-semibold text-slate-900 dark:text-zinc-100">{name}</p>
                            {prod?.sku && <p className="text-[10px] text-slate-400 font-mono">SKU: {prod.sku}</p>}
                          </td>
                          <td className="py-2.5 px-3 text-center font-bold text-slate-800 dark:text-zinc-200">
                            {qty}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono text-slate-600 dark:text-zinc-300">
                            {fmtMoney(unitPrice)}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900 dark:text-zinc-100">
                            {fmtMoney(sub)}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="bg-slate-50 dark:bg-zinc-800/80 font-bold border-t border-slate-200 dark:border-zinc-700">
                      <td colSpan={3} className="py-3 px-3 text-right uppercase text-slate-600 dark:text-zinc-300">
                        Total a Pagar:
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-base text-brand dark:text-blue-400">
                        {fmtMoney(viewingSale.total)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Action Buttons in Modal */}
              <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-200 dark:border-zinc-800">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const s = viewingSale
                      setViewingSale(null)
                      setViewingReceipt(s)
                    }}
                    className="btn-secondary text-xs flex items-center gap-1.5"
                  >
                    <Receipt size={14} />
                    <span>Ver Boleta</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleWhatsApp(viewingSale)}
                    className="btn-secondary text-xs flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400"
                  >
                    <MessageSquare size={14} />
                    <span>WhatsApp</span>
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  {viewingSale.status === 'pendiente' && (
                    <button
                      type="button"
                      onClick={() => {
                        const s = viewingSale
                        setViewingSale(null)
                        setSettlingSale(s)
                      }}
                      className="btn-primary text-xs flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700"
                    >
                      <CreditCard size={14} />
                      <span>Registrar Cobro</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setViewingSale(null)}
                    className="btn-secondary text-xs"
                  >
                    Cerrar
                  </button>
                </div>
              </div>
            </div>
          </Modal>
        )}

        {/* ═════════════════════════════════════════════════════════
            MODAL 2: RECEIPT MODAL (TICKET TÉRMICO / IMPRESIÓN)
           ═════════════════════════════════════════════════════════ */}
        {viewingReceipt && (
          <ReceiptModal
            open={!!viewingReceipt}
            onClose={() => setViewingReceipt(null)}
            sale={viewingReceipt}
            company={company}
            client={clients.find((c) => c.name?.toLowerCase() === viewingReceipt.client_name?.toLowerCase())}
            products={products}
          />
        )}

        {/* ═════════════════════════════════════════════════════════
            MODAL 3: LIQUIDAR COBRO RÁPIDO (PENDIENTE -> PAGADO)
           ═════════════════════════════════════════════════════════ */}
        {settlingSale && (
          <Modal
            open={!!settlingSale}
            onClose={() => setSettlingSale(null)}
            title="Confirmar Cobro de Venta"
          >
            <div className="space-y-4 text-xs">
              <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 text-amber-900 dark:text-amber-200 flex items-start gap-3">
                <AlertCircle size={18} className="text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-sm">¿Confirmas la recepción del pago?</p>
                  <p className="mt-1 text-slate-600 dark:text-zinc-300">
                    Se actualizará el estado de la venta <strong>VTA-{String(settlingSale.id).slice(-4).toUpperCase()}</strong> a <strong>PAGADO</strong> por el importe total de <strong className="font-mono">{fmtMoney(settlingSale.total)}</strong>.
                  </p>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  disabled={settling}
                  onClick={() => setSettlingSale(null)}
                  className="btn-secondary text-xs"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  disabled={settling}
                  onClick={handleQuickSettle}
                  className="btn-primary text-xs bg-emerald-600 hover:bg-emerald-700 flex items-center gap-1.5"
                >
                  <CheckCircle2 size={14} />
                  <span>{settling ? 'Procesando…' : 'Confirmar Cobro'}</span>
                </button>
              </div>
            </div>
          </Modal>
        )}

        {/* ═════════════════════════════════════════════════════════
            MODAL 4: EDITAR DATOS DE VENTA (CLIENTE / TELÉFONO / FECHA)
           ═════════════════════════════════════════════════════════ */}
        {editModalOpen && editingSale && (
          <Modal
            open={editModalOpen}
            onClose={() => setEditModalOpen(false)}
            title={`Editar Venta VTA-${String(editingSale.id).slice(-4).toUpperCase()}`}
          >
            <div className="space-y-3.5 text-xs">
              {editError && (
                <div className="p-3 rounded-xl bg-red-50 text-red-700 border border-red-200 flex items-center gap-2">
                  <AlertTriangle size={14} />
                  <span>{editError}</span>
                </div>
              )}

              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-zinc-300 mb-1">
                  Nombre del Cliente
                </label>
                <input
                  type="text"
                  value={editForm.clientName}
                  onChange={(e) => setEditForm((f) => ({ ...f, clientName: e.target.value }))}
                  placeholder="Ej. Juan Pérez"
                  className="w-full bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-lg px-3 py-2 text-xs text-slate-800 dark:text-white outline-none focus:border-brand"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-zinc-300 mb-1">
                  Teléfono / Documento
                </label>
                <input
                  type="text"
                  value={editForm.clientPhone}
                  onChange={(e) => setEditForm((f) => ({ ...f, clientPhone: e.target.value }))}
                  placeholder="Ej. 987654321"
                  className="w-full bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-lg px-3 py-2 text-xs text-slate-800 dark:text-white outline-none focus:border-brand"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-zinc-300 mb-1">
                  Fecha y Hora de Emisión
                </label>
                <input
                  type="datetime-local"
                  value={editForm.datetimeLocal}
                  onChange={(e) => setEditForm((f) => ({ ...f, datetimeLocal: e.target.value }))}
                  className="w-full bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-lg px-3 py-2 text-xs text-slate-800 dark:text-white outline-none focus:border-brand font-mono"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-zinc-800">
                <button
                  type="button"
                  disabled={savingEdit}
                  onClick={() => setEditModalOpen(false)}
                  className="btn-secondary text-xs"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  disabled={savingEdit}
                  onClick={handleSaveEdit}
                  className="btn-primary text-xs flex items-center gap-1.5"
                >
                  <Check size={14} />
                  <span>{savingEdit ? 'Guardando…' : 'Guardar Cambios'}</span>
                </button>
              </div>
            </div>
          </Modal>
        )}

        {/* ═════════════════════════════════════════════════════════
            MODAL 5: CONFIRMAR ANULACIÓN / ELIMINACIÓN DE VENTA
           ═════════════════════════════════════════════════════════ */}
        {confirmDelete && (
          <Modal
            open={!!confirmDelete}
            onClose={() => setConfirmDelete(null)}
            title="Anular Pedido de Venta"
          >
            <div className="space-y-4 text-xs">
              <div className="p-3.5 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-900 dark:text-red-200 flex items-start gap-3">
                <AlertTriangle size={18} className="text-red-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-sm">¿Estás seguro de anular esta venta?</p>
                  <p className="mt-1 text-slate-600 dark:text-zinc-300">
                    Se anulará la orden <strong>VTA-{String(confirmDelete.id).slice(-4).toUpperCase()}</strong> del cliente <strong>{confirmDelete.client_name || 'General'}</strong> por un importe de <strong className="font-mono">{fmtMoney(confirmDelete.total)}</strong>. Esta acción no se puede deshacer.
                  </p>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  disabled={deleting}
                  onClick={() => setConfirmDelete(null)}
                  className="btn-secondary text-xs"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  disabled={deleting}
                  onClick={handleDeleteSale}
                  className="px-3.5 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Trash2 size={14} />
                  <span>{deleting ? 'Anulando…' : 'Confirmar Anulación'}</span>
                </button>
              </div>
            </div>
          </Modal>
        )}

      </div>
    </AppLayout>
  )
}
