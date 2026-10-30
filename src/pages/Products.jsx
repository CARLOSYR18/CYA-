import { useEffect, useMemo, useState, useCallback } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import {
  Plus, Pencil, Trash2, Search, Boxes, ImageOff, X,
  Filter, LayoutGrid, List, AlertTriangle, CheckCircle2,
  DollarSign, Package, Layers, Sparkles, Crown, ArrowRight,
  ZoomIn, ZoomOut, Download, FileSpreadsheet, ChevronRight,
  ChevronLeft, TrendingUp, Eye
} from 'lucide-react'
import AppLayout from '../components/layout/AppLayout'
import Modal from '../components/ui/Modal'
import EmptyState from '../components/ui/EmptyState'
import { productsService } from '../services/productsService'
import { categoriesService } from '../services/categoriesService'
import { suppliersService } from '../services/suppliersService'

const fmt = (n) =>
  `S/ ${(Number(n) || 0).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
const fmtN = (n) => (Number(n) || 0).toLocaleString('es-PE')

export default function Products() {
  const navigate = useNavigate()
  const location = useLocation()

  const [products, setProducts] = useState([])
  const [categories, setCategories] = useState([])
  const [suppliers, setSuppliers] = useState([])
  const [loading, setLoading] = useState(true)

  // Filters & Views
  const [search, setSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('ALL')
  const [stockFilter, setStockFilter] = useState('ALL') // 'ALL' | 'AVAILABLE' | 'LOW' | 'OUT' | 'KITS'
  const [viewMode, setViewMode] = useState('table') // 'table' (rich rows) | 'grid'
  const [showMetrics, setShowMetrics] = useState(false)

  // Pagination
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  // Delete confirmation modal
  const [confirmDelete, setConfirmDelete] = useState(null)

  // Toast / notification after returning from /productos/nuevo or /productos/editar/:id
  const [successToast, setSuccessToast] = useState(
    location.state?.created
      ? `¡Producto "${location.state?.productName || ''}" registrado exitosamente!`
      : location.state?.updated
      ? `¡Producto "${location.state?.productName || ''}" actualizado correctamente!`
      : ''
  )

  useEffect(() => {
    if (successToast) {
      const timer = setTimeout(() => setSuccessToast(''), 4500)
      return () => clearTimeout(timer)
    }
  }, [successToast])

  // ─── Lightbox / Image Preview with Seamless Zoom ───
  const [lightboxProduct, setLightboxProduct] = useState(null)
  const [zoomScale, setZoomScale] = useState(1) // 1x, 1.5x, 2x, 2.5x

  async function loadAll() {
    setLoading(true)
    try {
      const [p, c, s] = await Promise.all([
        productsService.list(),
        categoriesService.list(),
        suppliersService.list()
      ])
      setProducts(p || [])
      setCategories(c || [])
      setSuppliers(s || [])
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadAll()
  }, [])

  /* ─── Computed Statistics ─── */
  const stats = useMemo(() => {
    const totalSkus = products.length
    const totalUnits = products.reduce((acc, p) => acc + (Number(p.stock) || 0), 0)
    const inventoryValuation = products.reduce((acc, p) => {
      const cost = Number(p.cost_price) || Number(p.sale_price) || 0
      return acc + (cost * (Number(p.stock) || 0))
    }, 0)
    const lowStockCount = products.filter(
      (p) => (Number(p.stock) || 0) <= (Number(p.min_stock) || 0) && (Number(p.stock) || 0) > 0
    ).length
    const outOfStockCount = products.filter((p) => (Number(p.stock) || 0) <= 0).length

    return {
      totalSkus,
      totalUnits,
      inventoryValuation,
      lowStockCount,
      outOfStockCount,
      alertsCount: lowStockCount + outOfStockCount
    }
  }, [products])

  /* ─── Filtered Products ─── */
  const filtered = useMemo(() => {
    let result = products

    // Text search
    const q = search.trim().toLowerCase()
    if (q) {
      result = result.filter(
        (p) => p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q)
      )
    }

    // Category filter
    if (selectedCategory !== 'ALL') {
      result = result.filter((p) => p.category_id === selectedCategory)
    }

    // Stock condition filter
    if (stockFilter === 'AVAILABLE') {
      result = result.filter((p) => (Number(p.stock) || 0) > (Number(p.min_stock) || 0))
    } else if (stockFilter === 'LOW') {
      result = result.filter(
        (p) => (Number(p.stock) || 0) <= (Number(p.min_stock) || 0) && (Number(p.stock) || 0) > 0
      )
    } else if (stockFilter === 'OUT') {
      result = result.filter((p) => (Number(p.stock) || 0) <= 0)
    } else if (stockFilter === 'KITS') {
      result = result.filter((p) => p.is_kit)
    }

    return result
  }, [products, search, selectedCategory, stockFilter])

  // Reset pagination when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [search, selectedCategory, stockFilter])

  // Products with images for lightbox cycling
  const productsWithImages = useMemo(() => {
    return filtered.filter(p => !!p.image_url)
  }, [filtered])

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const paginatedProducts = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return filtered.slice(start, start + pageSize)
  }, [filtered, currentPage, pageSize])

  /* ─── Lightbox Navigation & Zoom Handlers ─── */
  const openLightbox = (p) => {
    if (!p.image_url) return
    setLightboxProduct(p)
    setZoomScale(1)
  }

  const closeLightbox = () => {
    setLightboxProduct(null)
    setZoomScale(1)
  }

  const handleNextImage = useCallback(() => {
    if (!lightboxProduct || productsWithImages.length <= 1) return
    const currIdx = productsWithImages.findIndex(p => p.id === lightboxProduct.id)
    const nextIdx = (currIdx + 1) % productsWithImages.length
    setLightboxProduct(productsWithImages[nextIdx])
    setZoomScale(1)
  }, [lightboxProduct, productsWithImages])

  const handlePrevImage = useCallback(() => {
    if (!lightboxProduct || productsWithImages.length <= 1) return
    const currIdx = productsWithImages.findIndex(p => p.id === lightboxProduct.id)
    const prevIdx = (currIdx - 1 + productsWithImages.length) % productsWithImages.length
    setLightboxProduct(productsWithImages[prevIdx])
    setZoomScale(1)
  }, [lightboxProduct, productsWithImages])

  const toggleZoom = () => {
    setZoomScale(prev => (prev === 1 ? 1.75 : 1))
  }

  const zoomIn = (e) => {
    e?.stopPropagation()
    setZoomScale(z => Math.min(3, +(z + 0.35).toFixed(2)))
  }

  const zoomOut = (e) => {
    e?.stopPropagation()
    setZoomScale(z => Math.max(1, +(z - 0.35).toFixed(2)))
  }

  const resetZoom = (e) => {
    e?.stopPropagation()
    setZoomScale(1)
  }

  // Keyboard navigation for image lightbox
  useEffect(() => {
    if (!lightboxProduct) return
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') closeLightbox()
      else if (e.key === 'ArrowRight') handleNextImage()
      else if (e.key === 'ArrowLeft') handlePrevImage()
      else if (e.key === '+' || e.key === '=') zoomIn()
      else if (e.key === '-') zoomOut()
      else if (e.key === '0') resetZoom()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [lightboxProduct, handleNextImage, handlePrevImage])

  // Download image
  const handleDownloadImage = (e) => {
    e?.stopPropagation()
    if (!lightboxProduct?.image_url) return
    const link = document.createElement('a')
    link.href = lightboxProduct.image_url
    link.download = `${lightboxProduct.sku || 'producto'}-${lightboxProduct.name}.jpg`
    link.target = '_blank'
    link.click()
  }

  // Export to Excel / CSV
  const handleExportExcel = () => {
    const headers = ['Código SKU', 'Producto', 'Categoría', 'Stock', 'Unidad', 'Precio Costo (S/)', 'Precio Venta (S/)', 'Estado']
    const rows = filtered.map(p => {
      const cat = categories.find(c => c.id === p.category_id)?.name || 'Sin categoría'
      const stock = Number(p.stock) || 0
      const status = stock <= 0 ? 'Agotado' : stock <= Number(p.min_stock || 0) ? 'Stock Bajo' : 'Disponible'
      return [
        p.sku,
        `"${p.name.replace(/"/g, '""')}"`,
        `"${cat.replace(/"/g, '""')}"`,
        stock,
        p.unit || 'unidad',
        Number(p.cost_price || 0).toFixed(2),
        Number(p.sale_price || 0).toFixed(2),
        status
      ]
    })

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `Productos_Catalogo_${new Date().toISOString().slice(0, 10)}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  async function handleDelete() {
    if (!confirmDelete) return
    await productsService.remove(confirmDelete.id)
    setConfirmDelete(null)
    loadAll()
  }

  const catName = (id) => categories.find((c) => c.id === id)?.name || 'Sin categoría'

  return (
    <AppLayout title="Catálogo de Productos">
      <div className="space-y-4 max-w-7xl mx-auto pb-12">

        {/* ═════════════════════════════════════════════════════════
            SUCCESS TOAST (IF RETURNED FROM /productos/nuevo O EDITAR)
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
            TOP BAR WITH ACTIONS & NEW PRODUCT BUTTON
           ═════════════════════════════════════════════════════════ */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-[#131627] p-4 sm:p-5 rounded-2xl border border-slate-200/80 dark:border-white/10 shadow-xs">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                <Boxes size={18} />
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                Catálogo de Productos
              </h1>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Administración de artículos, existencias, precios y galería multimedia.
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

            <button
              onClick={handleExportExcel}
              className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
              title="Descargar catálogo en formato CSV / Excel"
            >
              <FileSpreadsheet size={14} />
              <span>Excel</span>
            </button>

            {/* NAVIGATES TO DEDICATED FULL PAGE /productos/nuevo INSTEAD OF MODAL */}
            <button
              onClick={() => navigate('/productos/nuevo')}
              className="px-4 py-2 rounded-xl bg-[#5550F2] hover:bg-[#4742E8] text-white text-xs font-bold flex items-center gap-1.5 shadow-sm hover:shadow-indigo-500/25 active:scale-95 transition-all cursor-pointer"
            >
              <Plus size={15} />
              <span>+ Nuevo Producto</span>
            </button>
          </div>
        </div>

        {/* ═════════════════════════════════════════════════════════
            1. EXECUTIVE METRICS BAR (SUPPORTING LIGHT & DARK THEMES)
           ═════════════════════════════════════════════════════════ */}
        {showMetrics && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
            
            {/* Card 1: Total SKUs */}
            <div className="bg-white dark:bg-[#131627] rounded-2xl border border-slate-200/80 dark:border-white/10 p-3.5 sm:p-4.5 shadow-xs flex flex-col justify-between transition-all">
              <div className="flex items-center justify-between gap-1.5 mb-2">
                <p className="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider truncate">
                  Total Catálogo
                </p>
                <div className="w-8 h-8 rounded-xl bg-purple-50 dark:bg-purple-500/10 border border-purple-200 dark:border-purple-500/20 flex items-center justify-center text-purple-600 dark:text-purple-400 shrink-0">
                  <Boxes size={16} />
                </div>
              </div>
              <div>
                <h4 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight font-sans">
                  {loading ? '…' : `${stats.totalSkus} SKUs`}
                </h4>
                <p className="text-[11px] text-slate-400 mt-0.5 truncate">
                  {categories.length} categorías activas
                </p>
              </div>
            </div>

            {/* Card 2: Unidades Físicas */}
            <div className="bg-white dark:bg-[#131627] rounded-2xl border border-slate-200/80 dark:border-white/10 p-3.5 sm:p-4.5 shadow-xs flex flex-col justify-between transition-all">
              <div className="flex items-center justify-between gap-1.5 mb-2">
                <p className="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider truncate">
                  Stock Total Físico
                </p>
                <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0">
                  <Package size={16} />
                </div>
              </div>
              <div>
                <h4 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight font-sans">
                  {loading ? '…' : `${fmtN(stats.totalUnits)} uds.`}
                </h4>
                <p className="text-[11px] text-slate-400 mt-0.5 truncate">En almacén central</p>
              </div>
            </div>

            {/* Card 3: Valorización Estimada */}
            <div className="bg-white dark:bg-[#131627] rounded-2xl border border-slate-200/80 dark:border-white/10 p-3.5 sm:p-4.5 shadow-xs flex flex-col justify-between transition-all">
              <div className="flex items-center justify-between gap-1.5 mb-2">
                <p className="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider truncate">
                  Valorización Stock
                </p>
                <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
                  <DollarSign size={16} />
                </div>
              </div>
              <div>
                <h4 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight font-mono">
                  {loading ? '…' : fmt(stats.inventoryValuation)}
                </h4>
                <p className="text-[11px] text-slate-400 mt-0.5 truncate">Costo base estimado</p>
              </div>
            </div>

            {/* Card 4: Alertas de Quiebre */}
            <div className="bg-white dark:bg-[#131627] rounded-2xl border border-slate-200/80 dark:border-white/10 p-3.5 sm:p-4.5 shadow-xs flex flex-col justify-between transition-all">
              <div className="flex items-center justify-between gap-1.5 mb-2">
                <p className="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider truncate">
                  Control de Quiebres
                </p>
                <div
                  className={`w-8 h-8 rounded-xl border flex items-center justify-center shrink-0 ${
                    stats.alertsCount > 0
                      ? 'bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/20 text-amber-600 dark:text-amber-400'
                      : 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                  }`}
                >
                  {stats.alertsCount > 0 ? (
                    <AlertTriangle size={16} />
                  ) : (
                    <CheckCircle2 size={16} />
                  )}
                </div>
              </div>
              <div>
                <h4 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight font-sans">
                  {loading ? '…' : stats.alertsCount > 0 ? `${stats.alertsCount} en alerta` : '100% Óptimo'}
                </h4>
                <p className="text-[11px] text-slate-400 mt-0.5 truncate">
                  {stats.outOfStockCount > 0 ? `${stats.outOfStockCount} agotados` : 'Sin faltantes críticos'}
                </p>
              </div>
            </div>

          </div>
        )}

        {/* ═════════════════════════════════════════════════════════
            2. INTERACTIVE FILTER & SEARCH BAR
           ═════════════════════════════════════════════════════════ */}
        <div className="bg-white dark:bg-[#131627] rounded-2xl border border-slate-200/80 dark:border-white/10 p-4 sm:p-5 shadow-xs space-y-3">
          {/* Top Row: Search + Category + View Mode */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            
            {/* Search Input with quick clear */}
            <div className="relative flex-1 w-full sm:max-w-md">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl pl-10 pr-9 py-2 text-xs sm:text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:bg-white dark:focus:bg-[#1A1D30] focus:border-indigo-500 transition-all outline-none"
                placeholder="Buscar por nombre de producto o SKU…"
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

            {/* Right side controls: Category Select + View Mode */}
            <div className="flex items-center justify-between sm:justify-start gap-2 w-full sm:w-auto">
              {/* Category Dropdown */}
              <div className="relative flex-1 sm:w-48">
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 text-xs text-slate-700 dark:text-slate-300 font-medium focus:bg-white dark:focus:bg-[#1A1D30] focus:border-indigo-500 transition-all outline-none cursor-pointer"
                >
                  <option value="ALL">Todas las categorías</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* View Mode Toggle: Rich Rows / Grid */}
              <div className="inline-flex items-center p-1 bg-slate-100 dark:bg-white/5 rounded-xl border border-slate-200/80 dark:border-white/10 shrink-0">
                <button
                  type="button"
                  onClick={() => setViewMode('table')}
                  title="Vista en filas ejecutivas"
                  className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                    viewMode === 'table'
                      ? 'bg-white dark:bg-[#1A1D30] text-indigo-600 dark:text-indigo-400 shadow-xs font-semibold'
                      : 'text-slate-400 hover:text-slate-800 dark:hover:text-white'
                  }`}
                >
                  <List size={16} />
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('grid')}
                  title="Vista en tarjetas"
                  className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                    viewMode === 'grid'
                      ? 'bg-white dark:bg-[#1A1D30] text-indigo-600 dark:text-indigo-400 shadow-xs font-semibold'
                      : 'text-slate-400 hover:text-slate-800 dark:hover:text-white'
                  }`}
                >
                  <LayoutGrid size={16} />
                </button>
              </div>
            </div>
          </div>

          {/* Bottom Filter Chips: Quick Status Filter */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs pt-2 border-t border-slate-100 dark:border-white/10 no-scrollbar">
            <span className="text-[11px] font-bold uppercase text-slate-400 mr-1 shrink-0 flex items-center gap-1">
              <Filter size={12} /> Estado:
            </span>

            {[
              { id: 'ALL', label: `Todos (${products.length})` },
              { id: 'AVAILABLE', label: 'Disponibles' },
              { id: 'LOW', label: `Stock Bajo (${stats.lowStockCount})` },
              { id: 'OUT', label: `Agotados (${stats.outOfStockCount})` },
              { id: 'KITS', label: 'Combos / Kits' },
            ].map((tab) => {
              const active = stockFilter === tab.id
              return (
                <button
                  key={tab.id}
                  onClick={() => setStockFilter(tab.id)}
                  className={`px-3 py-1.5 rounded-xl font-bold transition-all whitespace-nowrap shrink-0 cursor-pointer ${
                    active
                      ? 'bg-[#5550F2] text-white shadow-xs'
                      : 'bg-slate-100/80 dark:bg-white/5 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-white/10 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {tab.label}
                </button>
              )
            })}
          </div>
        </div>

        {/* ═════════════════════════════════════════════════════════
            3. PRODUCT LISTINGS (SHOPIFY / STRIPE STYLE RICH ROWS)
           ═════════════════════════════════════════════════════════ */}
        {loading ? (
          <div className="bg-white dark:bg-[#131627] rounded-2xl border border-slate-200/80 dark:border-white/10 p-16 flex flex-col items-center justify-center text-center shadow-xs">
            <div className="w-10 h-10 rounded-full border-2 border-[#5550F2] border-t-transparent animate-spin mb-3" />
            <p className="text-xs font-semibold text-slate-500">Cargando catálogo de productos…</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white dark:bg-[#131627] rounded-2xl border border-slate-200/80 dark:border-white/10 p-10 shadow-xs text-center">
            <EmptyState
              icon={Boxes}
              title="No se encontraron productos"
              description={
                search || selectedCategory !== 'ALL' || stockFilter !== 'ALL'
                  ? 'No hay productos que coincidan con los filtros seleccionados.'
                  : 'Registra tu primer producto para comenzar a controlar inventario y registrar ventas.'
              }
              action={
                search || selectedCategory !== 'ALL' || stockFilter !== 'ALL' ? (
                  <button
                    onClick={() => {
                      setSearch('')
                      setSelectedCategory('ALL')
                      setStockFilter('ALL')
                    }}
                    className="btn-secondary text-xs"
                  >
                    Restablecer filtros
                  </button>
                ) : (
                  <button onClick={() => navigate('/productos/nuevo')} className="btn-primary text-xs">
                    <Plus size={15} /> Nuevo producto
                  </button>
                )
              }
            />
          </div>
        ) : viewMode === 'grid' ? (
          /* ─── GRID / CARD VIEW ─── */
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {paginatedProducts.map((p) => {
                const stock = Number(p.stock) || 0
                const minStock = Number(p.min_stock) || 0
                const isOutOfStock = stock <= 0
                const isLowStock = stock > 0 && stock <= minStock
                const marginPct =
                  p.cost_price > 0 && p.sale_price > p.cost_price
                    ? Math.round(((p.sale_price - p.cost_price) / p.cost_price) * 100)
                    : null

                return (
                  <div
                    key={p.id}
                    className="bg-white dark:bg-[#131627] rounded-2xl border border-slate-200/80 dark:border-white/10 overflow-hidden shadow-xs hover:shadow-md hover:border-indigo-400 dark:hover:border-indigo-500/40 transition-all flex flex-col justify-between group"
                  >
                    <div>
                      {/* Image Header */}
                      <div
                        onClick={() => openLightbox(p)}
                        className={`relative h-48 bg-white dark:bg-white/5 flex items-center justify-center overflow-hidden border-b border-slate-100 dark:border-white/10 ${
                          p.image_url ? 'cursor-pointer' : ''
                        }`}
                        title={p.image_url ? 'Click para ver fotografía' : ''}
                      >
                        {p.image_url ? (
                          <img
                            src={p.image_url}
                            alt={p.name}
                            className="w-full h-full object-contain p-2 transition-transform duration-300 group-hover:scale-105"
                          />
                        ) : (
                          <div className="flex flex-col items-center justify-center text-slate-300 dark:text-slate-600">
                            <ImageOff size={32} strokeWidth={1.5} />
                            <span className="text-[10px] font-medium text-slate-400 dark:text-slate-500 mt-1">Sin fotografía</span>
                          </div>
                        )}

                        {/* Top Badges */}
                        <div className="absolute top-2.5 left-2.5 flex flex-col gap-1.5 items-start pointer-events-none">
                          <span className="font-mono text-[10.5px] font-bold bg-white/95 dark:bg-[#1A1D30]/95 backdrop-blur-sm text-slate-700 dark:text-slate-200 px-2 py-0.5 rounded-lg border border-slate-200/80 dark:border-white/10 shadow-2xs">
                            {p.sku}
                          </span>
                          {p.is_kit && (
                            <span className="text-[10px] font-bold bg-[#5550F2] text-white px-2 py-0.5 rounded-lg shadow-xs">
                              Combo / Kit
                            </span>
                          )}
                        </div>

                        {/* Stock Status Badge */}
                        <div className="absolute top-2.5 right-2.5 pointer-events-none">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10.5px] font-bold ${
                              isOutOfStock
                                ? 'bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/20'
                                : isLowStock
                                ? 'bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20'
                                : 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20'
                            }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                isOutOfStock ? 'bg-rose-500' : isLowStock ? 'bg-amber-500' : 'bg-emerald-500'
                              }`}
                            />
                            <span>{isOutOfStock ? 'Agotado' : isLowStock ? 'Stock Bajo' : 'Disponible'}</span>
                          </span>
                        </div>
                      </div>

                      {/* Card Content */}
                      <div className="p-4">
                        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                          {catName(p.category_id)}
                        </p>
                        <h4 className="font-bold text-slate-900 dark:text-white text-sm leading-snug line-clamp-2 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                          {p.name}
                        </h4>

                        {/* Stock Level */}
                        <div className="mt-3.5 pt-3 border-t border-slate-100 dark:border-white/10 flex items-center justify-between text-xs">
                          <span className="text-slate-500 dark:text-slate-400 font-medium">Existencias:</span>
                          <span
                            className={`font-mono font-bold ${
                              isOutOfStock
                                ? 'text-rose-600 dark:text-rose-400'
                                : isLowStock
                                ? 'text-amber-600 dark:text-amber-400'
                                : 'text-slate-900 dark:text-white'
                            }`}
                          >
                            {stock} {p.unit}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Price & Actions Footer */}
                    <div className="px-4 py-3 bg-slate-50/70 dark:bg-white/5 border-t border-slate-100 dark:border-white/10 flex items-center justify-between">
                      <div>
                        <p className="font-mono font-extrabold text-base text-slate-900 dark:text-white">
                          {fmt(p.sale_price)}
                        </p>
                        {marginPct !== null && (
                          <p className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                            +{marginPct}% margen
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => navigate(`/productos/editar/${p.id}`)}
                          title="Editar producto"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-white/10 transition-colors cursor-pointer"
                        >
                          <Pencil size={15} />
                        </button>
                        <button
                          onClick={() => setConfirmDelete(p)}
                          title="Eliminar producto"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors cursor-pointer"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ) : (
          /* ─── SHOPIFY / STRIPE STYLE: RICH CARD-ROWS WITH 68x68 PHOTO ─── */
          <div className="bg-white dark:bg-[#131627] rounded-2xl border border-slate-200/80 dark:border-white/10 overflow-hidden shadow-xs">
            
            {/* Header */}
            <div className="hidden sm:grid sm:grid-cols-12 gap-4 px-6 py-3.5 bg-slate-50/80 dark:bg-white/5 border-b border-slate-200/80 dark:border-white/10 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider items-center">
              <div className="sm:col-span-6">Artículo / Producto</div>
              <div className="sm:col-span-2 text-right">Existencias / Estado</div>
              <div className="sm:col-span-2 text-right">Precio Comercial</div>
              <div className="sm:col-span-2 text-right">Acciones</div>
            </div>

            {/* Rows List */}
            <div className="divide-y divide-slate-100 dark:divide-white/5">
              {paginatedProducts.map((p) => {
                const stock = Number(p.stock) || 0
                const minStock = Number(p.min_stock) || 0
                const isOutOfStock = stock <= 0
                const isLowStock = stock > 0 && stock <= minStock
                const marginPct =
                  p.cost_price > 0 && p.sale_price > p.cost_price
                    ? Math.round(((p.sale_price - p.cost_price) / p.cost_price) * 100)
                    : null
                const cat = catName(p.category_id)

                return (
                  <div
                    key={p.id}
                    className="p-4 sm:px-6 sm:py-4.5 hover:bg-slate-50/70 dark:hover:bg-white/5 transition-colors group flex flex-col sm:grid sm:grid-cols-12 gap-3 sm:gap-4 sm:items-center"
                  >
                    {/* ── Left Column: Generous Photo (68x68 px) + Title + SKU + Category ── */}
                    <div className="sm:col-span-6 flex items-center gap-4 min-w-0">
                      {/* Generous Photo Box (68x68 px) */}
                      <div
                        onClick={() => openLightbox(p)}
                        className={`relative w-[68px] h-[68px] rounded-2xl overflow-hidden bg-white dark:bg-white/5 border border-slate-200/80 dark:border-white/10 p-1.5 shrink-0 shadow-xs transition-all ${
                          p.image_url ? 'cursor-pointer hover:border-indigo-400 hover:scale-105' : ''
                        }`}
                        title={p.image_url ? 'Click para ampliar fotografía' : 'Sin imagen'}
                      >
                        {p.image_url ? (
                          <img
                            src={p.image_url}
                            alt={p.name}
                            className="w-full h-full object-contain"
                          />
                        ) : (
                          <div className="w-full h-full flex flex-col items-center justify-center text-slate-300 dark:text-slate-600">
                            <ImageOff size={22} strokeWidth={1.5} />
                          </div>
                        )}
                      </div>

                      {/* Product Identity */}
                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4
                            onClick={() => navigate(`/productos/editar/${p.id}`)}
                            className="font-extrabold text-slate-900 dark:text-white text-sm sm:text-base hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors cursor-pointer leading-tight truncate"
                          >
                            {p.name}
                          </h4>
                          {p.is_kit && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-indigo-50 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-500/30">
                              Combo / Kit
                            </span>
                          )}
                        </div>

                        {/* Subtitle: SKU and Category */}
                        <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 font-medium">
                          <span className="font-mono text-[11.5px] font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-white/10 px-2 py-0.5 rounded-md">
                            {p.sku}
                          </span>
                          <span className="text-slate-300 dark:text-slate-600">·</span>
                          <span className="inline-flex items-center gap-1 text-[11.5px]">
                            <Layers size={12} className="text-slate-400 shrink-0" />
                            <span>{cat}</span>
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* ── Middle Left: Stock Quantity & Status Badge ── */}
                    <div className="sm:col-span-2 flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-1.5 text-right">
                      <span className="sm:hidden text-xs text-slate-400 font-medium">Existencias:</span>
                      <div className="text-right">
                        <p
                          className={`font-mono font-black text-sm sm:text-base leading-none ${
                            isOutOfStock
                              ? 'text-rose-600 dark:text-rose-400'
                              : isLowStock
                              ? 'text-amber-600 dark:text-amber-400'
                              : 'text-slate-900 dark:text-white'
                          }`}
                        >
                          {stock}{' '}
                          <span className="text-xs font-normal text-slate-400">
                            {p.unit || 'uds.'}
                          </span>
                        </p>

                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 mt-1.5 rounded-full text-[10.5px] font-bold ${
                            isOutOfStock
                              ? 'bg-rose-50 text-rose-700 border border-rose-200/70 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/20'
                              : isLowStock
                              ? 'bg-amber-50 text-amber-700 border border-amber-200/70 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20'
                              : 'bg-emerald-50 text-emerald-700 border border-emerald-200/70 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              isOutOfStock ? 'bg-rose-500' : isLowStock ? 'bg-amber-500' : 'bg-emerald-500'
                            }`}
                          />
                          <span>{isOutOfStock ? 'Agotado' : isLowStock ? 'Stock Bajo' : 'Disponible'}</span>
                        </span>
                      </div>
                    </div>

                    {/* ── Middle Right: Commercial Price & Cost Info ── */}
                    <div className="sm:col-span-2 flex sm:flex-col items-center sm:items-end justify-between sm:justify-center text-right">
                      <span className="sm:hidden text-xs text-slate-400 font-medium">Precio Venta:</span>
                      <div className="text-right">
                        <p className="font-mono font-black text-base sm:text-lg text-slate-900 dark:text-white leading-tight">
                          {fmt(p.sale_price)}
                        </p>
                        {Number(p.cost_price) > 0 ? (
                          <p className="text-[11px] font-mono text-slate-400 mt-0.5">
                            Costo: {fmt(p.cost_price)}
                            {marginPct !== null && (
                              <span className="text-emerald-600 dark:text-emerald-400 font-bold ml-1">
                                (+{marginPct}%)
                              </span>
                            )}
                          </p>
                        ) : (
                          <p className="text-[10.5px] text-slate-400 mt-0.5">Precio unitario</p>
                        )}
                      </div>
                    </div>

                    {/* ── Right Column: Clean Action Buttons ── */}
                    <div className="sm:col-span-2 flex items-center justify-end gap-1.5 pt-2 sm:pt-0 border-t sm:border-0 border-slate-100 dark:border-white/5">
                      {p.image_url && (
                        <button
                          type="button"
                          onClick={() => openLightbox(p)}
                          title="Ver fotografía ampliada"
                          className="p-2 rounded-xl text-slate-500 dark:text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-white/10 transition-colors cursor-pointer border border-transparent hover:border-slate-200/80 dark:hover:border-white/10"
                        >
                          <Eye size={16} />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => navigate(`/productos/editar/${p.id}`)}
                        title="Editar producto"
                        className="p-2 rounded-xl text-slate-500 dark:text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-white/10 transition-colors cursor-pointer border border-transparent hover:border-slate-200/80 dark:hover:border-white/10"
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmDelete(p)}
                        title="Eliminar producto"
                        className="p-2 rounded-xl text-slate-500 dark:text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors cursor-pointer border border-transparent hover:border-slate-200/80 dark:hover:border-white/10"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Pagination Controls */}
            <div className="p-4 bg-slate-50/70 dark:bg-white/5 border-t border-slate-200/80 dark:border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600 dark:text-slate-400">
              <div>
                Mostrando{' '}
                <strong className="text-slate-900 dark:text-white">
                  {filtered.length === 0 ? 0 : (currentPage - 1) * pageSize + 1}
                </strong>{' '}
                a{' '}
                <strong className="text-slate-900 dark:text-white">
                  {Math.min(currentPage * pageSize, filtered.length)}
                </strong>{' '}
                de <strong className="text-slate-900 dark:text-white">{filtered.length}</strong> productos
              </div>

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

                {Array.from({ length: totalPages }).slice(0, 8).map((_, i) => {
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

                {totalPages > 8 && <span className="px-1 text-slate-400">…</span>}

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
        )}

      </div>

      {/* ═════════════════════════════════════════════════════════
          SEAMLESS LIGHTBOX / IMAGE PREVIEW (NATURAL WHITE BLEND)
         ═════════════════════════════════════════════════════════ */}
      {lightboxProduct && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/60 dark:bg-black/80 backdrop-blur-md transition-all duration-300 animate-in fade-in"
          onClick={closeLightbox}
        >
          {/* Main Modal Container: Pure White in Light Mode so white product images merge seamlessly without a jarring box line */}
          <div
            className="relative w-full max-w-3xl max-h-[92vh] flex flex-col items-center justify-between bg-white dark:bg-[#131627] border border-slate-200/80 dark:border-white/10 rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 text-slate-900 dark:text-white"
            onClick={(e) => e.stopPropagation()}
          >
            {/* ── Lightbox Header ── */}
            <div className="w-full flex items-center justify-between px-5 py-3.5 bg-slate-50/80 dark:bg-white/5 border-b border-slate-100 dark:border-white/10">
              <div className="flex items-center gap-2.5 min-w-0 pr-2">
                <span className="font-mono text-xs font-bold px-2.5 py-0.5 rounded-lg bg-indigo-50 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300 border border-indigo-200/80 dark:border-indigo-500/30">
                  {lightboxProduct.sku}
                </span>
                <h3 className="font-extrabold text-sm text-slate-900 dark:text-white truncate max-w-sm sm:max-w-md">
                  {lightboxProduct.name}
                </h3>
              </div>

              {/* Controls Toolbar: Zoom Out, Reset, Zoom In, Download, Close */}
              <div className="flex items-center gap-1.5 shrink-0">
                <div className="flex items-center bg-slate-100 dark:bg-white/10 rounded-xl p-0.5 border border-slate-200/80 dark:border-white/10">
                  <button
                    type="button"
                    onClick={zoomOut}
                    disabled={zoomScale <= 1}
                    className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white hover:bg-white dark:hover:bg-white/10 disabled:opacity-30 transition-all cursor-pointer"
                    title="Reducir zoom (-)"
                  >
                    <ZoomOut size={15} />
                  </button>

                  <button
                    type="button"
                    onClick={resetZoom}
                    className="px-2 py-0.5 text-[11px] font-mono font-bold text-slate-600 dark:text-slate-300 hover:text-indigo-600 transition-colors cursor-pointer"
                    title="Restablecer tamaño (100%)"
                  >
                    {Math.round(zoomScale * 100)}%
                  </button>

                  <button
                    type="button"
                    onClick={zoomIn}
                    disabled={zoomScale >= 3}
                    className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white hover:bg-white dark:hover:bg-white/10 disabled:opacity-30 transition-all cursor-pointer"
                    title="Aumentar zoom (+)"
                  >
                    <ZoomIn size={15} />
                  </button>
                </div>

                <button
                  type="button"
                  onClick={handleDownloadImage}
                  className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-white/10 dark:hover:bg-white/20 border border-slate-200/80 dark:border-white/10 text-slate-600 dark:text-slate-300 transition-all cursor-pointer"
                  title="Descargar fotografía"
                >
                  <Download size={15} />
                </button>

                <button
                  type="button"
                  onClick={closeLightbox}
                  className="p-2 rounded-xl bg-slate-100 hover:bg-red-50 hover:text-red-600 dark:bg-white/10 dark:hover:bg-red-500/20 dark:hover:text-red-400 text-slate-600 dark:text-slate-300 transition-all cursor-pointer ml-1"
                  title="Cerrar vista previa (Esc)"
                >
                  <X size={15} />
                </button>
              </div>
            </div>

            {/* ── Lightbox Viewport & Image Display ── */}
            <div className="relative w-full h-[52vh] sm:h-[58vh] flex items-center justify-center p-6 overflow-hidden select-none bg-white dark:bg-[#131627]">
              
              {/* Previous Image Arrow */}
              {productsWithImages.length > 1 && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    handlePrevImage()
                  }}
                  className="absolute left-4 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-slate-100/90 dark:bg-white/10 hover:bg-[#5550F2] hover:text-white border border-slate-200 dark:border-white/20 text-slate-700 dark:text-white flex items-center justify-center shadow-lg transition-all active:scale-90 cursor-pointer"
                  title="Foto anterior (Flecha Izquierda)"
                >
                  <ChevronLeft size={20} />
                </button>
              )}

              {/* Product Image */}
              <div
                onClick={toggleZoom}
                className={`relative max-w-full max-h-full flex items-center justify-center transition-transform duration-300 ease-out ${
                  zoomScale === 1 ? 'cursor-zoom-in' : 'cursor-zoom-out'
                }`}
                style={{
                  transform: `scale(${zoomScale})`,
                  transformOrigin: 'center center'
                }}
                title={zoomScale === 1 ? 'Click para ampliar' : 'Click para tamaño original'}
              >
                <img
                  src={lightboxProduct.image_url}
                  alt={lightboxProduct.name}
                  className="max-h-[46vh] sm:max-h-[52vh] max-w-full object-contain transition-all"
                />
              </div>

              {/* Next Image Arrow */}
              {productsWithImages.length > 1 && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleNextImage()
                  }}
                  className="absolute right-4 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-slate-100/90 dark:bg-white/10 hover:bg-[#5550F2] hover:text-white border border-slate-200 dark:border-white/20 text-slate-700 dark:text-white flex items-center justify-center shadow-lg transition-all active:scale-90 cursor-pointer"
                  title="Foto siguiente (Flecha Derecha)"
                >
                  <ChevronRight size={20} />
                </button>
              )}
            </div>

            {/* ── Lightbox Footer: Metadata Card ── */}
            <div className="w-full flex flex-col sm:flex-row items-center justify-between gap-3 px-6 py-4 bg-slate-50/80 dark:bg-white/5 border-t border-slate-100 dark:border-white/10 text-xs">
              <div className="flex items-center gap-3">
                <span className="px-2.5 py-1 rounded-lg bg-slate-200/70 dark:bg-white/10 text-slate-700 dark:text-slate-300 font-bold">
                  {catName(lightboxProduct.category_id)}
                </span>
                <span className="font-mono text-slate-600 dark:text-slate-300 font-bold">
                  {lightboxProduct.stock} {lightboxProduct.unit || 'uds.'} disponibles
                </span>
              </div>

              <div className="flex items-center gap-3">
                <span className="text-slate-500 dark:text-slate-400 font-bold uppercase text-[11px] tracking-wider">
                  Precio de venta:
                </span>
                <span className="text-2xl font-black font-mono text-[#5550F2] dark:text-indigo-400">
                  {fmt(lightboxProduct.sale_price)}
                </span>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* ═════════════════════════════════════════════════════════
          CONFIRM DELETE MODAL
         ═════════════════════════════════════════════════════════ */}
      <Modal
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        title="Eliminar Producto del Catálogo"
        width="max-w-sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-600 dark:text-slate-300">
            ¿Estás seguro de que deseas eliminar permanentemente{' '}
            <strong className="text-slate-900 dark:text-white">{confirmDelete?.name}</strong> (SKU:{' '}
            <span className="font-mono">{confirmDelete?.sku}</span>)?
          </p>
          <p className="text-xs text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-xl p-3">
            ⚠️ Esta acción es irreversible y eliminará el registro del producto.
          </p>
          <div className="flex justify-end gap-2.5 pt-2">
            <button onClick={() => setConfirmDelete(null)} className="btn-secondary">
              Cancelar
            </button>
            <button onClick={handleDelete} className="btn-danger">
              Eliminar
            </button>
          </div>
        </div>
      </Modal>

    </AppLayout>
  )
}
