import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import {
  Plus, Truck, Search, TrendingUp, CheckCircle2, Clock,
  FileSpreadsheet, RotateCcw, Calendar, ChevronLeft, ChevronRight,
  Eye, Package, Building2, User, Phone, Check, X, ShieldCheck,
  AlertCircle
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

  const [purchases, setPurchases] = useState([])
  const [suppliers, setSuppliers] = useState([])
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)

  // Toggle for top KPI metrics cards
  const [showMetrics, setShowMetrics] = useState(false)

  // Filter Form States
  const [filterSupplier, setFilterSupplier] = useState('')
  const [filterOrderNum, setFilterOrderNum] = useState('')
  const [filterStatus, setFilterStatus] = useState('TODOS')
  const [filterDateFrom, setFilterDateFrom] = useState('')
  const [filterDateTo, setFilterDateTo] = useState('')
  const [filterProductQuery, setFilterProductQuery] = useState('')

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  // Viewing detail modal & receiving state
  const [viewing, setViewing] = useState(null)
  const [receivingId, setReceivingId] = useState(null)

  // Toast / notification after returning from /compras/nueva
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

  // Load backend data (100% Real Database Data)
  async function loadAll() {
    setLoading(true)
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
    
    // Distinct suppliers count
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

  return (
    <AppLayout title="Compras">
      <div className="space-y-4 max-w-7xl mx-auto pb-12">

        {/* ═════════════════════════════════════════════════════════
            SUCCESS TOAST (IF RETURNED FROM /compras/nueva)
           ═════════════════════════════════════════════════════════ */}
        {successToast && (
          <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 text-emerald-800 dark:text-emerald-300 text-xs font-semibold flex items-center justify-between shadow-xs animate-slide-up">
            <div className="flex items-center gap-2">
              <CheckCircle2 size={16} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>{successToast}</span>
            </div>
            <button onClick={() => setSuccessToast('')} className="text-emerald-600 hover:text-emerald-800 cursor-pointer">
              <X size={14} />
            </button>
          </div>
        )}

        {/* ═════════════════════════════════════════════════════════
            TOP BAR — COMPRAS & BUTTON "+ NUEVA ORDEN DE COMPRA"
           ═════════════════════════════════════════════════════════ */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-[#131627] p-4 sm:p-5 rounded-2xl border border-slate-200/80 dark:border-white/10 shadow-xs">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                <Truck size={18} />
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                Compras
              </h1>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Control de abastecimiento, órdenes de compra a proveedores e ingreso de stock.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowMetrics(v => !v)}
              className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 text-xs font-semibold text-slate-600 dark:text-slate-300 transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <TrendingUp size={14} />
              <span>{showMetrics ? 'Ocultar Métricas' : 'Ver Métricas'}</span>
            </button>

            {/* NAVIGATES TO DEDICATED FULL PAGE /compras/nueva INSTEAD OF MODAL */}
            <button
              onClick={() => navigate('/compras/nueva')}
              className="px-4 py-2 rounded-xl bg-[#5550F2] hover:bg-[#4742E8] text-white text-xs font-bold flex items-center gap-1.5 shadow-sm hover:shadow-indigo-500/25 active:scale-95 transition-all cursor-pointer"
            >
              <Plus size={15} />
              <span>+ Nueva Orden de Compra</span>
            </button>
          </div>
        </div>

        {/* ═════════════════════════════════════════════════════════
            OPTIONAL EXECUTIVE KPI CARDS (COLLAPSIBLE)
           ═════════════════════════════════════════════════════════ */}
        {showMetrics && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="bg-white dark:bg-[#131627] rounded-2xl border border-slate-200/80 dark:border-white/10 p-4 shadow-xs">
              <p className="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider">Total Comprado</p>
              <h4 className="text-xl font-extrabold text-slate-900 dark:text-white mt-1 font-mono">
                {fmt(stats.totalSpent)}
              </h4>
              <p className="text-[11px] text-slate-400 mt-0.5">{stats.totalCount} órdenes registradas</p>
            </div>

            <div className="bg-white dark:bg-[#131627] rounded-2xl border border-slate-200/80 dark:border-white/10 p-4 shadow-xs">
              <p className="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider">Órdenes Recibidas</p>
              <h4 className="text-xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-1 font-mono">
                {fmt(stats.receivedSpent)}
              </h4>
              <p className="text-[11px] text-emerald-600/80 mt-0.5">{stats.receivedCount} ingresadas a inventario</p>
            </div>

            <div className="bg-white dark:bg-[#131627] rounded-2xl border border-slate-200/80 dark:border-white/10 p-4 shadow-xs">
              <p className="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider">Por Recibir (Pendientes)</p>
              <h4 className="text-xl font-extrabold text-amber-600 dark:text-amber-400 mt-1 font-mono">
                {fmt(stats.pendingSpent)}
              </h4>
              <p className="text-[11px] text-amber-600/80 mt-0.5">{stats.pendingCount} en tránsito/espera</p>
            </div>

            <div className="bg-white dark:bg-[#131627] rounded-2xl border border-slate-200/80 dark:border-white/10 p-4 shadow-xs">
              <p className="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider">Proveedores Activos</p>
              <h4 className="text-xl font-extrabold text-indigo-600 dark:text-indigo-400 mt-1 font-mono">
                {stats.uniqueSuppliersCount}
              </h4>
              <p className="text-[11px] text-slate-400 mt-0.5">Empresas proveedoras vinculadas</p>
            </div>
          </div>
        )}

        {/* ═════════════════════════════════════════════════════════
            CLEAN 2-ROW FILTER PANEL (MATCHING DESIGN SYSTEM)
           ═════════════════════════════════════════════════════════ */}
        <div className="bg-white dark:bg-[#131627] rounded-2xl border border-slate-200/80 dark:border-white/10 p-4 sm:p-5 shadow-xs space-y-3">
          
          {/* Row 1: Proveedor | F. Inicial | F. Final | Estado */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                Proveedor / RUC
              </label>
              <input
                type="text"
                value={filterSupplier}
                onChange={(e) => { setFilterSupplier(e.target.value); setCurrentPage(1) }}
                placeholder="Ej. MR IMPORT, 2060..."
                className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 dark:text-white outline-none focus:border-indigo-500 focus:bg-white dark:focus:bg-[#1A1D30] transition-all font-medium"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1 flex items-center gap-1">
                <Calendar size={12} className="text-slate-400" /> F. Inicial
              </label>
              <input
                type="date"
                value={filterDateFrom}
                onChange={(e) => { setFilterDateFrom(e.target.value); setCurrentPage(1) }}
                className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 dark:text-white outline-none focus:border-indigo-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1 flex items-center gap-1">
                <Calendar size={12} className="text-slate-400" /> F. Final
              </label>
              <input
                type="date"
                value={filterDateTo}
                onChange={(e) => { setFilterDateTo(e.target.value); setCurrentPage(1) }}
                className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 dark:text-white outline-none focus:border-indigo-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                Estado de Recepción
              </label>
              <select
                value={filterStatus}
                onChange={(e) => { setFilterStatus(e.target.value); setCurrentPage(1) }}
                className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 dark:text-white outline-none focus:border-indigo-500 cursor-pointer font-semibold"
              >
                <option value="TODOS">TODOS LOS ESTADOS</option>
                <option value="recibido">Recibido (En Inventario)</option>
                <option value="pendiente">Pendiente (Por Recibir)</option>
              </select>
            </div>
          </div>

          {/* Row 2: No. Orden | Buscar Artículo + Action Buttons */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-6 gap-3 items-end pt-1">
            <div className="md:col-span-2">
              <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                N° Orden / ID
              </label>
              <input
                type="text"
                value={filterOrderNum}
                onChange={(e) => { setFilterOrderNum(e.target.value); setCurrentPage(1) }}
                placeholder="Ej. oc-1, 1024..."
                className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 dark:text-white outline-none focus:border-indigo-500 font-mono"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                Buscar por Producto / SKU
              </label>
              <input
                type="text"
                value={filterProductQuery}
                onChange={(e) => { setFilterProductQuery(e.target.value); setCurrentPage(1) }}
                placeholder="SKU o nombre de artículo..."
                className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 dark:text-white outline-none focus:border-indigo-500"
              />
            </div>

            {/* Action Buttons: Buscar, Excel, Limpiar */}
            <div className="md:col-span-2 flex items-center justify-end gap-2 pt-1 sm:pt-0">
              <button
                type="button"
                onClick={() => setCurrentPage(1)}
                className="px-4 py-2 rounded-xl bg-[#5550F2] hover:bg-[#4742E8] text-white text-xs font-bold flex items-center gap-1.5 shadow-sm active:scale-95 transition-all cursor-pointer"
                title="Aplicar filtros"
              >
                <Search size={14} />
                <span>Buscar</span>
              </button>

              <button
                type="button"
                onClick={handleExportExcel}
                className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm active:scale-95 transition-all cursor-pointer"
                title="Exportar órdenes filtradas a archivo Excel / CSV"
              >
                <FileSpreadsheet size={15} />
                <span>Excel</span>
              </button>

              <button
                type="button"
                onClick={resetFilters}
                className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-600 dark:text-slate-300 text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer"
                title="Limpiar filtros"
              >
                <RotateCcw size={13} />
                <span>Limpiar</span>
              </button>
            </div>
          </div>

        </div>

        {/* ═════════════════════════════════════════════════════════
            TABLE: REGISTRO DE ÓRDENES DE COMPRA
           ═════════════════════════════════════════════════════════ */}
        <div className="bg-white dark:bg-[#131627] rounded-2xl border border-slate-200/80 dark:border-white/10 overflow-hidden shadow-xs">
          
          {loading ? (
            <div className="p-16 flex flex-col items-center justify-center text-center">
              <div className="w-9 h-9 rounded-full border-2 border-[#5550F2] border-t-transparent animate-spin mb-3" />
              <p className="text-xs font-semibold text-slate-500">Cargando órdenes de compra…</p>
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
            <>
              {/* Mobile Card List for phones */}
              <div className="block sm:hidden divide-y divide-slate-100 dark:divide-white/5">
                {paginatedPurchases.map((p, idx) => {
                  const isPending = p.status === 'pendiente'
                  const totalAmount = purchasesService.purchaseTotal(p)
                  const sup = getSupplier(p.supplier_id)
                  const orderNum = p.id ? `OC-${String(p.id).slice(-4)}` : `OC-${String(idx + 1).padStart(4, '0')}`

                  return (
                    <div
                      key={p.id || idx}
                      onClick={() => setViewing(p)}
                      className="p-3.5 space-y-2 hover:bg-slate-50/50 dark:hover:bg-white/5 cursor-pointer transition-colors"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <span className="font-mono text-xs font-bold text-indigo-600 dark:text-indigo-400">
                            {orderNum}
                          </span>
                          <p className="font-bold text-[13px] text-slate-900 dark:text-white uppercase mt-0.5 leading-tight truncate">
                            {sup?.name || supplierName(p.supplier_id)}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-sm font-extrabold font-mono text-slate-900 dark:text-white">
                            S/ {fmtNumberOnly(totalAmount)}
                          </p>
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold mt-1 ${
                              isPending
                                ? 'bg-amber-50 text-amber-700 border border-amber-200/80 dark:bg-amber-500/10 dark:text-amber-400'
                                : 'bg-emerald-50 text-emerald-700 border border-emerald-200/80 dark:bg-emerald-500/10 dark:text-emerald-400'
                            }`}
                          >
                            {isPending ? 'Pendiente' : 'Recibido'}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 pt-1.5 border-t border-slate-100 dark:border-white/5">
                        <span className="truncate">{formatDatePE(p.created_at)} · {p.items?.length || 0} producto(s)</span>
                        <div className="flex items-center gap-1.5 shrink-0 ml-2" onClick={(e) => e.stopPropagation()}>
                          {isPending && (
                            <button
                              type="button"
                              disabled={receivingId === p.id}
                              onClick={() => handleReceive(p)}
                              className="px-2 py-1 rounded-lg text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-500/15 border border-emerald-200 dark:border-emerald-500/30 text-[10px] font-bold flex items-center gap-1"
                            >
                              <CheckCircle2 size={12} />
                              <span>{receivingId === p.id ? '…' : 'Recibir'}</span>
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => setViewing(p)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-white/10"
                            title="Ver detalle"
                          >
                            <Eye size={14} />
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Desktop / Tablet Table */}
              <div className="hidden sm:block overflow-x-auto">
                <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200/80 dark:border-white/10 bg-slate-50/70 dark:bg-white/5 text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
                    <th className="py-3 px-3.5 text-center w-24">N° Orden</th>
                    <th className="py-3 px-3.5 whitespace-nowrap min-w-[150px]">F. Emisión</th>
                    <th className="py-3 px-4 min-w-[180px]">Proveedor</th>
                    <th className="py-3 px-3.5 min-w-[160px]">Artículos</th>
                    <th className="py-3 px-2 text-center w-12">Moneda</th>
                    <th className="py-3 px-3.5 text-right font-mono">Total</th>
                    <th className="py-3 px-3 text-center">Estado</th>
                    <th className="py-3 px-3.5 text-right">Acciones</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100 dark:divide-white/5 text-xs">
                  {paginatedPurchases.map((p, idx) => {
                    const isPending = p.status === 'pendiente'
                    const totalAmount = purchasesService.purchaseTotal(p)
                    const sup = getSupplier(p.supplier_id)
                    const orderNum = p.id ? `OC-${String(p.id).slice(-4)}` : `OC-${String(idx + 1).padStart(4, '0')}`

                    return (
                      <tr
                        key={p.id || idx}
                        onClick={() => setViewing(p)}
                        className="hover:bg-slate-50/80 dark:hover:bg-white/5 transition-colors cursor-pointer group"
                      >
                        {/* N° Orden */}
                        <td className="py-3 px-3.5 text-center">
                          <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400 group-hover:underline">
                            {orderNum}
                          </span>
                        </td>

                        {/* F. Emisión */}
                        <td className="py-3 px-3.5 text-slate-600 dark:text-slate-300 font-mono whitespace-nowrap">
                          {formatDatePE(p.created_at)}
                        </td>

                        {/* Proveedor */}
                        <td className="py-3 px-4">
                          <div>
                            <p className="font-bold text-slate-900 dark:text-white uppercase tracking-tight">
                              {sup?.name || supplierName(p.supplier_id)}
                            </p>
                            {sup?.contact_name && (
                              <p className="text-[11px] text-slate-400">
                                Contacto: {sup.contact_name}
                              </p>
                            )}
                          </div>
                        </td>

                        {/* Artículos / Items */}
                        <td className="py-3 px-3.5 text-slate-700 dark:text-slate-300">
                          <span className="inline-flex items-center gap-1 font-semibold text-slate-900 dark:text-white">
                            <Package size={13} className="text-slate-400" />
                            {p.items?.length || 0} producto(s)
                          </span>
                        </td>

                        {/* Moneda */}
                        <td className="py-3 px-2 text-center font-bold text-slate-600 dark:text-slate-400 font-mono">
                          S/
                        </td>

                        {/* Total */}
                        <td className="py-3 px-3.5 text-right font-mono font-extrabold text-slate-900 dark:text-white whitespace-nowrap">
                          {fmtNumberOnly(totalAmount)}
                        </td>

                        {/* Estado */}
                        <td className="py-3 px-3 text-center whitespace-nowrap">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                              isPending
                                ? 'bg-amber-50 text-amber-700 border border-amber-200/80 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20'
                                : 'bg-emerald-50 text-emerald-700 border border-emerald-200/80 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20'
                            }`}
                          >
                            {isPending ? 'Pendiente' : 'Recibido'}
                          </span>
                        </td>

                        {/* Acciones */}
                        <td className="py-3 px-3.5 text-right whitespace-nowrap">
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
                              className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-white/10 transition-colors"
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
          </>
          )}

          {/* ═════════════════════════════════════════════════════════
              PAGINATION
             ═════════════════════════════════════════════════════════ */}
          <div className="p-3.5 bg-slate-50/70 dark:bg-white/5 border-t border-slate-200/80 dark:border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600 dark:text-slate-400">
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
                className="w-8 h-8 rounded-lg border border-slate-200 dark:border-white/10 flex items-center justify-center text-slate-500 hover:bg-slate-100 dark:hover:bg-white/10 disabled:opacity-40 disabled:pointer-events-none transition-colors cursor-pointer"
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
                        ? 'bg-[#5550F2] text-white shadow-sm'
                        : 'bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10'
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
                className="w-8 h-8 rounded-lg border border-slate-200 dark:border-white/10 flex items-center justify-center text-slate-500 hover:bg-slate-100 dark:hover:bg-white/10 disabled:opacity-40 disabled:pointer-events-none transition-colors cursor-pointer"
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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200/80 dark:border-white/10">
                <div>
                  <p className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
                    Proveedor
                  </p>
                  <p className="font-extrabold text-sm text-slate-900 dark:text-white mt-0.5">
                    {supplierName(viewing.supplier_id)}
                  </p>
                  {getSupplier(viewing.supplier_id)?.contact_name && (
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      Contacto: {getSupplier(viewing.supplier_id)?.contact_name}
                    </p>
                  )}
                  {getSupplier(viewing.supplier_id)?.phone && (
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Tel: {getSupplier(viewing.supplier_id)?.phone}
                    </p>
                  )}
                </div>

                <div className="sm:text-right">
                  <p className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
                    Fecha y Hora
                  </p>
                  <p className="font-mono text-xs text-slate-700 dark:text-slate-300 mt-0.5">
                    {formatDatePE(viewing.created_at)}
                  </p>
                  <div className="mt-2 sm:flex sm:justify-end">
                    <StatusBadge status={viewing.status} />
                  </div>
                </div>
              </div>

              {/* Items Table */}
              <div className="rounded-xl border border-slate-200/80 dark:border-white/10 overflow-hidden">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-white/5 text-[10.5px] uppercase font-bold text-slate-500 border-b border-slate-200/80 dark:border-white/10">
                      <th className="py-2.5 px-3 text-left">Artículo / Producto</th>
                      <th className="py-2.5 px-3 text-center">Cant.</th>
                      <th className="py-2.5 px-3 text-right">Costo Unit.</th>
                      <th className="py-2.5 px-3 text-right">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                    {viewing.items?.map((it, i) => (
                      <tr key={i} className="hover:bg-slate-50/50 dark:hover:bg-white/5">
                        <td className="py-2.5 px-3 font-medium text-slate-900 dark:text-white">
                          {productName(it.product_id)}
                        </td>
                        <td className="py-2.5 px-3 text-center font-mono font-bold">
                          {it.quantity}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-slate-600 dark:text-slate-400">
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
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2 border-t border-slate-100 dark:border-white/10">
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
                  <span className="text-xl font-black font-mono text-[#5550F2]">
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
