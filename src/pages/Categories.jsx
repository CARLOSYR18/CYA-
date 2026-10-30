import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import {
  Plus, Pencil, Trash2, Search, X, Layers, Boxes, Package,
  ArrowUpDown, LayoutGrid, List, AlertCircle, Sparkles, FolderTree,
  FileSpreadsheet, ExternalLink, ArrowRight, TrendingUp, DollarSign,
  AlertTriangle, CheckCircle2, ChevronRight, Eye, RefreshCw,
  Laptop, Briefcase, Network, Printer, Headphones, Smartphone,
  Shirt, Coffee, Wrench, ShieldAlert
} from 'lucide-react'
import AppLayout from '../components/layout/AppLayout'
import Modal from '../components/ui/Modal'
import EmptyState from '../components/ui/EmptyState'
import { categoriesService } from '../services/categoriesService'
import { productsService } from '../services/productsService'

const fmt = (n) =>
  `S/ ${(Number(n) || 0).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

const fmtN = (n) => (Number(n) || 0).toLocaleString('es-PE')

/* ─── Vibrant & Cohesive Color Palettes (Dark-Mode Native) ─── */
const COLOR_THEMES = [
  {
    id: 'blue',
    label: 'Azul Finnova',
    bg: 'bg-blue-50 dark:bg-blue-500/10',
    border: 'border-blue-200 dark:border-blue-500/20',
    text: 'text-brand dark:text-blue-400',
    bar: 'from-blue-600 to-indigo-600',
    badge: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/15 dark:text-blue-300 dark:border-blue-500/30'
  },
  {
    id: 'purple',
    label: 'Púrpura Imperial',
    bg: 'bg-purple-50 dark:bg-purple-500/10',
    border: 'border-purple-200 dark:border-purple-500/20',
    text: 'text-purple-600 dark:text-purple-400',
    bar: 'from-purple-600 to-violet-600',
    badge: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-500/15 dark:text-purple-300 dark:border-purple-500/30'
  },
  {
    id: 'emerald',
    label: 'Esmeralda',
    bg: 'bg-emerald-50 dark:bg-emerald-500/10',
    border: 'border-emerald-200 dark:border-emerald-500/20',
    text: 'text-emerald-600 dark:text-emerald-400',
    bar: 'from-emerald-500 to-teal-600',
    badge: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-300 dark:border-emerald-500/30'
  },
  {
    id: 'amber',
    label: 'Ámbar Dorado',
    bg: 'bg-amber-50 dark:bg-amber-500/10',
    border: 'border-amber-200 dark:border-amber-500/20',
    text: 'text-amber-600 dark:text-amber-400',
    bar: 'from-amber-500 to-orange-500',
    badge: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/15 dark:text-amber-300 dark:border-amber-500/30'
  },
  {
    id: 'rose',
    label: 'Rosa Rubí',
    bg: 'bg-rose-50 dark:bg-rose-500/10',
    border: 'border-rose-200 dark:border-rose-500/20',
    text: 'text-rose-600 dark:text-rose-400',
    bar: 'from-rose-500 to-pink-600',
    badge: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-500/15 dark:text-rose-300 dark:border-rose-500/30'
  },
  {
    id: 'cyan',
    label: 'Cian Océano',
    bg: 'bg-cyan-50 dark:bg-cyan-500/10',
    border: 'border-cyan-200 dark:border-cyan-500/20',
    text: 'text-cyan-600 dark:text-cyan-400',
    bar: 'from-cyan-500 to-blue-500',
    badge: 'bg-cyan-50 text-cyan-700 border-cyan-200 dark:bg-cyan-500/15 dark:text-cyan-300 dark:border-cyan-500/30'
  },
  {
    id: 'indigo',
    label: 'Índigo Real',
    bg: 'bg-indigo-50 dark:bg-indigo-500/10',
    border: 'border-indigo-200 dark:border-indigo-500/20',
    text: 'text-indigo-600 dark:text-indigo-400',
    bar: 'from-indigo-600 to-purple-600',
    badge: 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-500/15 dark:text-indigo-300 dark:border-indigo-500/30'
  }
]

/* Smart Category Icon Detector */
function getCategoryIcon(name = '', size = 20) {
  const n = name.toLowerCase()
  if (n.includes('comp') || n.includes('laptop') || n.includes('pc') || n.includes('pantalla')) {
    return <Laptop size={size} />
  }
  if (n.includes('oficina') || n.includes('papel') || n.includes('util')) {
    return <Briefcase size={size} />
  }
  if (n.includes('red') || n.includes('switch') || n.includes('cable') || n.includes('wifi')) {
    return <Network size={size} />
  }
  if (n.includes('impres') || n.includes('toner') || n.includes('tinta')) {
    return <Printer size={size} />
  }
  if (n.includes('audio') || n.includes('sonido') || n.includes('auricular') || n.includes('parlante')) {
    return <Headphones size={size} />
  }
  if (n.includes('tel') || n.includes('cel') || n.includes('movil') || n.includes('smart')) {
    return <Smartphone size={size} />
  }
  if (n.includes('ropa') || n.includes('textil') || n.includes('moda')) {
    return <Shirt size={size} />
  }
  if (n.includes('cafe') || n.includes('bebida') || n.includes('alim')) {
    return <Coffee size={size} />
  }
  if (n.includes('ferr') || n.includes('herram') || n.includes('repuest')) {
    return <Wrench size={size} />
  }
  return <Layers size={size} />
}

export default function Categories() {
  const navigate = useNavigate()
  const location = useLocation()

  const [categories, setCategories] = useState([])
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)

  // Filters & State
  const [search, setSearch] = useState('')
  const [segmentFilter, setSegmentFilter] = useState('ALL') // 'ALL' | 'ACTIVE' | 'ALERT' | 'EMPTY'
  const [sortBy, setSortBy] = useState('valuation') // 'valuation' | 'products' | 'stock' | 'name'
  const [viewMode, setViewMode] = useState('grid') // 'grid' | 'table'
  const [showMetrics, setShowMetrics] = useState(true)

  // Detail Modal / Products in Category Drawer
  const [selectedCategory, setSelectedCategory] = useState(null)
  const [categorySearch, setCategorySearch] = useState('')

  // Confirmation Delete Modal
  const [confirmDelete, setConfirmDelete] = useState(null)

  // Toast / feedback message after creating/updating from /categorias/nueva or /categorias/editar/:id
  const [successToast, setSuccessToast] = useState(
    location.state?.created
      ? `¡Categoría "${location.state?.categoryName || ''}" creada exitosamente!`
      : location.state?.updated
      ? `¡Categoría "${location.state?.categoryName || ''}" actualizada correctamente!`
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
      const [c, p] = await Promise.all([
        categoriesService.list(),
        productsService.list()
      ])
      setCategories(c || [])
      setProducts(p || [])
    } catch (err) {
      console.error('Error cargando categorías y productos:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadAll()
  }, [])

  /* ─── Per-Category Enriched Computed Data ─── */
  const categoryDataMap = useMemo(() => {
    const map = {}

    // Initialize all categories
    categories.forEach((c) => {
      map[c.id] = {
        products: [],
        skuCount: 0,
        totalStock: 0,
        valuation: 0,
        lowStockCount: 0,
        outOfStockCount: 0
      }
    })

    // Populate with product metrics
    products.forEach((p) => {
      const cid = p.category_id
      if (cid && map[cid]) {
        const stock = Number(p.stock) || 0
        const minStock = Number(p.min_stock) || 0
        const cost = Number(p.cost_price) || Number(p.sale_price) || 0
        const itemVal = cost * stock

        map[cid].products.push(p)
        map[cid].skuCount += 1
        map[cid].totalStock += stock
        map[cid].valuation += itemVal

        if (stock <= 0) {
          map[cid].outOfStockCount += 1
        } else if (stock <= minStock) {
          map[cid].lowStockCount += 1
        }
      }
    })

    return map
  }, [categories, products])

  /* ─── Global Executive Stats ─── */
  const stats = useMemo(() => {
    const totalCategories = categories.length
    const totalCatalogSkus = products.length
    const classifiedProducts = products.filter((p) => p.category_id).length
    const unclassifiedCount = totalCatalogSkus - classifiedProducts
    const totalStock = products.reduce((sum, p) => sum + (Number(p.stock) || 0), 0)
    
    const totalValuation = products.reduce((sum, p) => {
      const cost = Number(p.cost_price) || Number(p.sale_price) || 0
      return sum + (cost * (Number(p.stock) || 0))
    }, 0)

    // Calculate coverage %
    const catalogCoverage = totalCatalogSkus > 0
      ? Math.round((classifiedProducts / totalCatalogSkus) * 100)
      : 0

    // Top Category by valuation
    let topValCategory = null
    let maxVal = -1
    categories.forEach((c) => {
      const d = categoryDataMap[c.id]
      if (d && d.valuation > maxVal) {
        maxVal = d.valuation
        topValCategory = { ...c, valuation: d.valuation, skuCount: d.skuCount }
      }
    })

    // Count categories with alerts
    let alertCategoriesCount = 0
    let emptyCategoriesCount = 0
    categories.forEach((c) => {
      const d = categoryDataMap[c.id]
      if (d) {
        if (d.skuCount === 0) emptyCategoriesCount += 1
        else if (d.lowStockCount > 0 || d.outOfStockCount > 0) alertCategoriesCount += 1
      }
    })

    return {
      totalCategories,
      classifiedProducts,
      unclassifiedCount,
      catalogCoverage,
      totalStock,
      totalValuation,
      topValCategory,
      alertCategoriesCount,
      emptyCategoriesCount
    }
  }, [categories, products, categoryDataMap])

  /* ─── Filtered and Sorted Categories ─── */
  const filtered = useMemo(() => {
    let result = categories.map((c, idx) => {
      const d = categoryDataMap[c.id] || {
        products: [],
        skuCount: 0,
        totalStock: 0,
        valuation: 0,
        lowStockCount: 0,
        outOfStockCount: 0
      }
      return {
        ...c,
        ...d,
        colorTheme: COLOR_THEMES[idx % COLOR_THEMES.length]
      }
    })

    // 1. Text Search
    const q = search.trim().toLowerCase()
    if (q) {
      result = result.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          (c.description && c.description.toLowerCase().includes(q))
      )
    }

    // 2. Segment Filters
    if (segmentFilter === 'ACTIVE') {
      result = result.filter((c) => c.totalStock > 0)
    } else if (segmentFilter === 'ALERT') {
      result = result.filter((c) => c.lowStockCount > 0 || c.outOfStockCount > 0)
    } else if (segmentFilter === 'EMPTY') {
      result = result.filter((c) => c.skuCount === 0)
    }

    // 3. Sorting
    if (sortBy === 'valuation') {
      result.sort((a, b) => b.valuation - a.valuation)
    } else if (sortBy === 'products') {
      result.sort((a, b) => b.skuCount - a.skuCount)
    } else if (sortBy === 'stock') {
      result.sort((a, b) => b.totalStock - a.totalStock)
    } else if (sortBy === 'name') {
      result.sort((a, b) => a.name.localeCompare(b.name))
    }

    return result
  }, [categories, categoryDataMap, search, segmentFilter, sortBy])

  /* ─── Excel / CSV Exporter ─── */
  const handleExportExcel = () => {
    const headers = [
      'Categoría',
      'Descripción',
      'SKUs Asociados',
      'Existencias Físicas (Unidades)',
      'Valorización Estimada (S/)',
      'Productos con Stock Bajo',
      'Productos Agotados',
      'Estado General'
    ]

    const rows = filtered.map((c) => {
      let status = 'Óptimo'
      if (c.skuCount === 0) status = 'Sin productos'
      else if (c.outOfStockCount > 0) status = 'Con productos agotados'
      else if (c.lowStockCount > 0) status = 'Stock bajo / Atención'

      return [
        `"${(c.name || '').replace(/"/g, '""')}"`,
        `"${(c.description || '').replace(/"/g, '""')}"`,
        c.skuCount,
        c.totalStock,
        c.valuation.toFixed(2),
        c.lowStockCount,
        c.outOfStockCount,
        status
      ]
    })

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `reporte-categorias-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  /* ─── Navigation to New/Edit Category Page ─── */
  function openCreate() {
    navigate('/categorias/nueva')
  }

  function openEdit(c) {
    navigate(`/categorias/editar/${c.id}`)
  }

  async function handleDelete() {
    if (!confirmDelete) return
    try {
      await categoriesService.remove(confirmDelete.id)
    } catch (err) {
      console.error(err)
    }
    setConfirmDelete(null)
    loadAll()
  }

  /* ─── Products inside selected category for Detail Drawer ─── */
  const categoryProductsList = useMemo(() => {
    if (!selectedCategory) return []
    const raw = categoryDataMap[selectedCategory.id]?.products || []
    if (!categorySearch.trim()) return raw
    const q = categorySearch.toLowerCase().trim()
    return raw.filter(
      (p) => p.name.toLowerCase().includes(q) || (p.sku && p.sku.toLowerCase().includes(q))
    )
  }, [selectedCategory, categoryDataMap, categorySearch])

  return (
    <AppLayout title="Clasificación y Familias de Productos">
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
                <FolderTree size={18} />
              </span>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-zinc-100 tracking-tight font-display">
                Categorías de Catálogo
              </h1>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-zinc-400 mt-1">
              Organiza las líneas de tu inventario, controla valorizaciones y audita existencias por familia.
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
              title="Descargar catálogo de categorías en Excel / CSV"
            >
              <FileSpreadsheet size={15} />
              <span>Exportar</span>
            </button>

            {/* Primary New Category Button */}
            <button
              onClick={openCreate}
              className="px-4 py-2 rounded-xl bg-brand hover:bg-brand-hover text-white text-xs sm:text-sm font-bold flex items-center gap-1.5 shadow-sm hover:shadow-card active:scale-95 transition-all cursor-pointer"
            >
              <Plus size={16} />
              <span>+ Nueva Categoría</span>
            </button>
          </div>
        </div>

        {/* ═════════════════════════════════════════════════════════
            1. EXECUTIVE METRICS BAR (4 FINNOVA CARDS)
           ═════════════════════════════════════════════════════════ */}
        {showMetrics && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4 animate-fade-in">

            {/* Card 1: Total Categorías */}
            <div
              className="bg-white dark:bg-[#141417] rounded-2xl border border-slate-200/80 dark:border-zinc-800 p-3.5 sm:p-4.5 shadow-xs flex flex-col justify-between card-mobile-active active:scale-[0.98] transition-all hover:border-slate-300 dark:hover:border-zinc-700"
              style={{ animation: 'slideUp 0.35s cubic-bezier(0.16, 1, 0.3, 1) 40ms both' }}
            >
              <div className="flex items-center justify-between gap-1.5 mb-2">
                <p className="text-[10px] sm:text-[11px] font-bold text-slate-400 dark:text-zinc-400 uppercase tracking-wider truncate">
                  Total Familias
                </p>
                <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-purple-50 dark:bg-purple-500/10 border border-purple-200 dark:border-purple-500/20 flex items-center justify-center text-purple-600 dark:text-purple-400 shrink-0">
                  <FolderTree size={16} />
                </div>
              </div>
              <div>
                <h4 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-zinc-100 tracking-tight font-display">
                  {loading ? '…' : `${stats.totalCategories}`}
                </h4>
                <p className="text-[11px] text-slate-400 dark:text-zinc-500 mt-0.5 truncate flex items-center gap-1">
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                    {stats.totalCategories - stats.emptyCategoriesCount} activas
                  </span>
                  <span>· {stats.emptyCategoriesCount} vacías</span>
                </p>
              </div>
            </div>

            {/* Card 2: SKUs Catalogados */}
            <div
              className="bg-white dark:bg-[#141417] rounded-2xl border border-slate-200/80 dark:border-zinc-800 p-3.5 sm:p-4.5 shadow-xs flex flex-col justify-between card-mobile-active active:scale-[0.98] transition-all hover:border-slate-300 dark:hover:border-zinc-700"
              style={{ animation: 'slideUp 0.35s cubic-bezier(0.16, 1, 0.3, 1) 90ms both' }}
            >
              <div className="flex items-center justify-between gap-1.5 mb-2">
                <p className="text-[10px] sm:text-[11px] font-bold text-slate-400 dark:text-zinc-400 uppercase tracking-wider truncate">
                  SKUs Clasificados
                </p>
                <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 flex items-center justify-center text-brand dark:text-blue-400 shrink-0">
                  <Boxes size={16} />
                </div>
              </div>
              <div>
                <h4 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-zinc-100 tracking-tight font-display">
                  {loading ? '…' : `${stats.classifiedProducts} SKUs`}
                </h4>
                <div className="flex items-center gap-2 mt-1">
                  <div className="flex-1 bg-slate-100 dark:bg-zinc-800 rounded-full h-1.5 overflow-hidden">
                    <div
                      className="bg-brand h-full rounded-full transition-all duration-700"
                      style={{ width: `${stats.catalogCoverage}%` }}
                    />
                  </div>
                  <span className="text-[10px] font-bold text-slate-500 dark:text-zinc-400 shrink-0">
                    {stats.catalogCoverage}%
                  </span>
                </div>
              </div>
            </div>

            {/* Card 3: Existencias Físicas Totales */}
            <div
              className="bg-white dark:bg-[#141417] rounded-2xl border border-slate-200/80 dark:border-zinc-800 p-3.5 sm:p-4.5 shadow-xs flex flex-col justify-between card-mobile-active active:scale-[0.98] transition-all hover:border-slate-300 dark:hover:border-zinc-700"
              style={{ animation: 'slideUp 0.35s cubic-bezier(0.16, 1, 0.3, 1) 140ms both' }}
            >
              <div className="flex items-center justify-between gap-1.5 mb-2">
                <p className="text-[10px] sm:text-[11px] font-bold text-slate-400 dark:text-zinc-400 uppercase tracking-wider truncate">
                  Unidades en Stock
                </p>
                <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
                  <Package size={16} />
                </div>
              </div>
              <div>
                <h4 className="text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400 tracking-tight font-display">
                  {loading ? '…' : `${fmtN(stats.totalStock)} uds.`}
                </h4>
                <p className="text-[11px] text-slate-400 dark:text-zinc-500 mt-0.5 truncate">
                  Almacén central y tiendas
                </p>
              </div>
            </div>

            {/* Card 4: Valorización Estimada */}
            <div
              className="bg-white dark:bg-[#141417] rounded-2xl border border-slate-200/80 dark:border-zinc-800 p-3.5 sm:p-4.5 shadow-xs flex flex-col justify-between card-mobile-active active:scale-[0.98] transition-all hover:border-slate-300 dark:hover:border-zinc-700"
              style={{ animation: 'slideUp 0.35s cubic-bezier(0.16, 1, 0.3, 1) 190ms both' }}
            >
              <div className="flex items-center justify-between gap-1.5 mb-2">
                <p className="text-[10px] sm:text-[11px] font-bold text-slate-400 dark:text-zinc-400 uppercase tracking-wider truncate">
                  Valorización Inventario
                </p>
                <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0">
                  <DollarSign size={16} />
                </div>
              </div>
              <div>
                <h4 className="text-lg sm:text-2xl font-black text-slate-900 dark:text-zinc-100 tracking-tight font-display truncate">
                  {loading ? '…' : fmt(stats.totalValuation)}
                </h4>
                <p className="text-[11px] text-slate-400 dark:text-zinc-500 mt-0.5 truncate">
                  {stats.topValCategory ? (
                    <>Líder: <strong className="text-slate-700 dark:text-zinc-300">{stats.topValCategory.name}</strong></>
                  ) : 'Sin categorías'}
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
                placeholder="Buscar por nombre de familia o descripción…"
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
                Todas ({categories.length})
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
                Con stock activo
              </button>
              <button
                type="button"
                onClick={() => setSegmentFilter('ALERT')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                  segmentFilter === 'ALERT'
                    ? 'bg-brand text-white shadow-xs'
                    : 'bg-slate-50 dark:bg-zinc-800 text-slate-600 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-700'
                }`}
              >
                Con alertas de stock
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
                Sin productos ({stats.emptyCategoriesCount})
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
                  <option value="valuation" className="dark:bg-zinc-900">Mayor valor S/</option>
                  <option value="products" className="dark:bg-zinc-900">Más productos (SKUs)</option>
                  <option value="stock" className="dark:bg-zinc-900">Mayor stock</option>
                  <option value="name" className="dark:bg-zinc-900">Nombre A-Z</option>
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
              Sincronizando familias de categorías…
            </p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white dark:bg-[#141417] rounded-2xl border border-slate-200/80 dark:border-zinc-800 p-8 shadow-xs">
            <EmptyState
              icon={FolderTree}
              title="Sin categorías encontradas"
              description={
                search || segmentFilter !== 'ALL'
                  ? 'No hay categorías que coincidan con los criterios de búsqueda o filtros aplicados.'
                  : 'Crea tu primera categoría para organizar los productos de tu negocio.'
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
                  <button onClick={openCreate} className="btn-primary text-xs">
                    <Plus size={15} /> Nueva categoría
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
            {filtered.map((c) => {
              const theme = c.colorTheme
              const share = products.length > 0 ? Math.round((c.skuCount / products.length) * 100) : 0
              const hasAlert = c.outOfStockCount > 0 || c.lowStockCount > 0

              return (
                <div
                  key={c.id}
                  className="bg-white dark:bg-[#141417] rounded-2xl border border-slate-200/80 dark:border-zinc-800 p-5 shadow-xs hover:shadow-card hover:border-slate-300 dark:hover:border-zinc-700 card-mobile-active active:scale-[0.99] transition-all flex flex-col justify-between group"
                >
                  <div>
                    {/* Header: Icon + Name + Quick Actions */}
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={`w-11 h-11 rounded-2xl ${theme.bg} ${theme.border} ${theme.text} border flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform shadow-xs`}
                        >
                          {getCategoryIcon(c.name, 22)}
                        </div>
                        <div className="min-w-0">
                          <h3
                            onClick={() => setSelectedCategory(c)}
                            className="font-bold text-slate-900 dark:text-zinc-100 text-base leading-snug truncate group-hover:text-brand dark:group-hover:text-blue-400 transition-colors cursor-pointer"
                          >
                            {c.name}
                          </h3>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[11px] font-semibold text-slate-400 dark:text-zinc-500">
                              {share}% del catálogo
                            </span>
                            {hasAlert && (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-50 dark:bg-amber-500/10 dark:text-amber-400 border border-amber-200 dark:border-amber-500/20 px-1.5 py-0.2 rounded-md">
                                <AlertTriangle size={10} />
                                {c.outOfStockCount > 0 ? `${c.outOfStockCount} agotado(s)` : 'Stock bajo'}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => openEdit(c)}
                          title="Editar categoría"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-brand hover:bg-blue-50 dark:hover:bg-blue-500/10 dark:hover:text-blue-400 transition-colors cursor-pointer"
                        >
                          <Pencil size={15} />
                        </button>
                        <button
                          onClick={() => setConfirmDelete(c)}
                          title="Eliminar categoría"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 dark:hover:text-red-400 transition-colors cursor-pointer"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>

                    {/* Description */}
                    <p className="text-xs text-slate-500 dark:text-zinc-400 line-clamp-2 min-h-[32px] mb-4 leading-relaxed">
                      {c.description || (
                        <span className="text-slate-300 dark:text-zinc-600 italic">Sin descripción registrada.</span>
                      )}
                    </p>

                    {/* Preview of Top Products in this category */}
                    {c.products.length > 0 && (
                      <div className="mb-4">
                        <p className="text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider mb-1.5">
                          Muestra de productos:
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {c.products.slice(0, 3).map((p) => (
                            <span
                              key={p.id}
                              className="text-[11px] bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 border border-slate-200/80 dark:border-zinc-700 px-2 py-0.5 rounded-md truncate max-w-[140px]"
                            >
                              {p.name}
                            </span>
                          ))}
                          {c.products.length > 3 && (
                            <span className="text-[10px] text-slate-400 dark:text-zinc-500 self-center">
                              +{c.products.length - 3} más
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Micro-Metrics Breakdown Footer */}
                  <div className="pt-3.5 border-t border-slate-100 dark:border-zinc-800 space-y-3">
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="bg-slate-50 dark:bg-zinc-800/50 rounded-xl p-2 border border-slate-100 dark:border-zinc-800">
                        <p className="text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider mb-0.5">
                          SKUs
                        </p>
                        <p className="font-extrabold text-slate-900 dark:text-zinc-100 text-sm font-display">
                          {c.skuCount}
                        </p>
                      </div>

                      <div className="bg-slate-50 dark:bg-zinc-800/50 rounded-xl p-2 border border-slate-100 dark:border-zinc-800">
                        <p className="text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider mb-0.5">
                          Stock
                        </p>
                        <p className="font-extrabold text-emerald-600 dark:text-emerald-400 text-sm font-display">
                          {fmtN(c.totalStock)}
                        </p>
                      </div>

                      <div className="bg-slate-50 dark:bg-zinc-800/50 rounded-xl p-2 border border-slate-100 dark:border-zinc-800">
                        <p className="text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider mb-0.5">
                          Valor (S/)
                        </p>
                        <p className="font-extrabold text-slate-900 dark:text-zinc-100 text-xs font-display truncate">
                          {fmt(c.valuation)}
                        </p>
                      </div>
                    </div>

                    {/* Progress Bar & Detail Button */}
                    <div className="flex items-center justify-between gap-3 pt-1">
                      <div className="flex-1 bg-slate-100 dark:bg-zinc-800 rounded-full h-1.5 overflow-hidden">
                        <div
                          className={`bg-gradient-to-r ${theme.bar} h-full rounded-full transition-all duration-700`}
                          style={{ width: `${Math.max(share, 5)}%` }}
                        />
                      </div>

                      <button
                        onClick={() => setSelectedCategory(c)}
                        className="text-xs font-bold text-brand dark:text-blue-400 hover:text-brand-hover inline-flex items-center gap-1 group/btn cursor-pointer shrink-0"
                      >
                        <span>Ver productos</span>
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
                    <th className="py-3.5 px-4">Familia / Categoría</th>
                    <th className="py-3.5 px-4">Descripción</th>
                    <th className="py-3.5 px-4 text-center">SKUs</th>
                    <th className="py-3.5 px-4 text-right">Existencias (Uds.)</th>
                    <th className="py-3.5 px-4 text-right">Valorización Estimada</th>
                    <th className="py-3.5 px-4 text-center">Estado</th>
                    <th className="py-3.5 px-4 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-zinc-800 text-xs">
                  {filtered.map((c) => {
                    const theme = c.colorTheme
                    const hasAlert = c.outOfStockCount > 0 || c.lowStockCount > 0

                    return (
                      <tr
                        key={c.id}
                        className="hover:bg-slate-50/80 dark:hover:bg-zinc-800/40 transition-colors group cursor-pointer"
                        onClick={() => setSelectedCategory(c)}
                      >
                        {/* Name + Icon */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-3">
                            <div
                              className={`w-9 h-9 rounded-xl ${theme.bg} ${theme.border} ${theme.text} border flex items-center justify-center shrink-0 shadow-xs`}
                            >
                              {getCategoryIcon(c.name, 18)}
                            </div>
                            <div>
                              <span className="font-bold text-slate-900 dark:text-zinc-100 text-sm group-hover:text-brand dark:group-hover:text-blue-400 transition-colors">
                                {c.name}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* Description */}
                        <td className="py-3.5 px-4 text-slate-500 dark:text-zinc-400 max-w-xs truncate">
                          {c.description || <span className="text-slate-300 dark:text-zinc-600 italic">—</span>}
                        </td>

                        {/* Product count */}
                        <td className="py-3.5 px-4 text-center">
                          <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300">
                            {c.skuCount} SKUs
                          </span>
                        </td>

                        {/* Stock count */}
                        <td className="py-3.5 px-4 text-right font-extrabold text-sm text-emerald-600 dark:text-emerald-400 font-display">
                          {fmtN(c.totalStock)} uds.
                        </td>

                        {/* Valuation */}
                        <td className="py-3.5 px-4 text-right font-bold text-slate-900 dark:text-zinc-100 text-sm font-display">
                          {fmt(c.valuation)}
                        </td>

                        {/* Status */}
                        <td className="py-3.5 px-4 text-center">
                          {c.skuCount === 0 ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10.5px] font-bold bg-slate-100 text-slate-600 dark:bg-zinc-800 dark:text-zinc-400">
                              Sin SKUs
                            </span>
                          ) : c.outOfStockCount > 0 ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10.5px] font-bold bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-500/15 dark:text-rose-300 dark:border-rose-500/30">
                              <AlertCircle size={11} /> {c.outOfStockCount} Agotado
                            </span>
                          ) : c.lowStockCount > 0 ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10.5px] font-bold bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-500/15 dark:text-amber-300 dark:border-amber-500/30">
                              <AlertTriangle size={11} /> Stock bajo
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10.5px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-300 dark:border-emerald-500/30">
                              <CheckCircle2 size={11} /> Óptimo
                            </span>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="py-3.5 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => setSelectedCategory(c)}
                              title="Explorar productos"
                              className="p-1.5 rounded-lg text-slate-400 hover:text-brand hover:bg-blue-50 dark:hover:bg-blue-500/10 dark:hover:text-blue-400 transition-colors"
                            >
                              <Eye size={15} />
                            </button>
                            <button
                              onClick={() => openEdit(c)}
                              title="Editar categoría"
                              className="p-1.5 rounded-lg text-slate-400 hover:text-brand hover:bg-blue-50 dark:hover:bg-blue-500/10 dark:hover:text-blue-400 transition-colors"
                            >
                              <Pencil size={15} />
                            </button>
                            <button
                              onClick={() => setConfirmDelete(c)}
                              title="Eliminar categoría"
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
                Mostrando <strong>{filtered.length}</strong> de <strong>{categories.length}</strong> familias registradas
              </span>
              <span>Directorio Oficial de Categorías ERP</span>
            </div>
          </div>
        )}

      </div>

      {/* ═════════════════════════════════════════════════════════
          4. CATEGORY PRODUCTS EXPLORER MODAL (DRILL-DOWN)
         ═════════════════════════════════════════════════════════ */}
      <Modal
        open={!!selectedCategory}
        onClose={() => {
          setSelectedCategory(null)
          setCategorySearch('')
        }}
        title={`Productos en categoría: ${selectedCategory?.name || ''}`}
        width="max-w-3xl"
      >
        {selectedCategory && (
          <div className="space-y-4">
            {/* Header info */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 dark:bg-zinc-800/50 p-4 rounded-xl border border-slate-200/80 dark:border-zinc-700/80">
              <div>
                <p className="text-xs text-slate-500 dark:text-zinc-400">
                  {selectedCategory.description || 'Sin descripción registrada.'}
                </p>
                <div className="flex items-center gap-3 mt-2 text-xs font-semibold text-slate-700 dark:text-zinc-300">
                  <span><strong>{selectedCategory.skuCount}</strong> SKUs</span>
                  <span>·</span>
                  <span><strong>{fmtN(selectedCategory.totalStock)}</strong> unidades</span>
                  <span>·</span>
                  <span className="text-brand dark:text-blue-400 font-bold">{fmt(selectedCategory.valuation)}</span>
                </div>
              </div>

              <button
                onClick={() => {
                  navigate('/productos/nuevo', { state: { defaultCategory: selectedCategory.id } })
                }}
                className="btn-primary text-xs shrink-0"
              >
                <Plus size={14} /> Añadir Producto
              </button>
            </div>

            {/* Internal search inside category */}
            {selectedCategory.skuCount > 0 && (
              <div className="relative">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  className="w-full bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-xl pl-9 pr-8 py-2 text-xs text-slate-900 dark:text-zinc-100 placeholder:text-slate-400 outline-none focus:border-brand focus:ring-1 focus:ring-brand/20"
                  placeholder="Filtrar por SKU o nombre de producto dentro de esta familia…"
                  value={categorySearch}
                  onChange={(e) => setCategorySearch(e.target.value)}
                />
                {categorySearch && (
                  <button
                    type="button"
                    onClick={() => setCategorySearch('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                  >
                    <X size={13} />
                  </button>
                )}
              </div>
            )}

            {/* Products Table */}
            {categoryProductsList.length === 0 ? (
              <div className="py-8 text-center bg-slate-50/50 dark:bg-zinc-900/50 rounded-xl border border-dashed border-slate-200 dark:border-zinc-800">
                <Package size={32} className="mx-auto text-slate-300 dark:text-zinc-600 mb-2" />
                <p className="text-xs font-semibold text-slate-600 dark:text-zinc-400">
                  {categorySearch
                    ? 'No hay productos que coincidan con la búsqueda.'
                    : 'Aún no hay productos registrados en esta categoría.'}
                </p>
                <button
                  onClick={() => navigate('/productos/nuevo', { state: { defaultCategory: selectedCategory.id } })}
                  className="mt-3 text-xs font-bold text-brand hover:underline inline-flex items-center gap-1"
                >
                  <Plus size={14} /> Crear primer producto aquí
                </button>
              </div>
            ) : (
              <div className="border border-slate-200 dark:border-zinc-800 rounded-xl overflow-hidden max-h-[360px] overflow-y-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="bg-slate-50 dark:bg-zinc-800 sticky top-0 z-10 border-b border-slate-200 dark:border-zinc-700">
                    <tr className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      <th className="py-2.5 px-3">SKU</th>
                      <th className="py-2.5 px-3">Producto</th>
                      <th className="py-2.5 px-3 text-center">Stock</th>
                      <th className="py-2.5 px-3 text-right">Precio Venta</th>
                      <th className="py-2.5 px-3 text-right">Valorización</th>
                      <th className="py-2.5 px-3 text-right">Acción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-zinc-800">
                    {categoryProductsList.map((p) => {
                      const stock = Number(p.stock) || 0
                      const minStock = Number(p.min_stock) || 0
                      const isOut = stock <= 0
                      const isLow = stock > 0 && stock <= minStock
                      const cost = Number(p.cost_price) || Number(p.sale_price) || 0

                      return (
                        <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-zinc-800/40">
                          <td className="py-2 px-3 font-mono text-slate-500 dark:text-zinc-400 font-semibold">
                            {p.sku || '—'}
                          </td>
                          <td className="py-2 px-3 font-medium text-slate-900 dark:text-zinc-100">
                            {p.name}
                          </td>
                          <td className="py-2 px-3 text-center">
                            {isOut ? (
                              <span className="text-[10px] font-bold text-rose-600 bg-rose-50 dark:bg-rose-500/10 px-2 py-0.5 rounded-full border border-rose-200 dark:border-rose-500/20">
                                0 uds (Agotado)
                              </span>
                            ) : isLow ? (
                              <span className="text-[10px] font-bold text-amber-600 bg-amber-50 dark:bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-200 dark:border-amber-500/20">
                                {stock} uds (Bajo)
                              </span>
                            ) : (
                              <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-500/20">
                                {stock} uds
                              </span>
                            )}
                          </td>
                          <td className="py-2 px-3 text-right font-mono font-medium text-slate-700 dark:text-zinc-300">
                            {fmt(p.sale_price)}
                          </td>
                          <td className="py-2 px-3 text-right font-mono font-bold text-slate-900 dark:text-zinc-100">
                            {fmt(cost * stock)}
                          </td>
                          <td className="py-2 px-3 text-right">
                            <button
                              onClick={() => {
                                setSelectedCategory(null)
                                navigate('/productos', { state: { search: p.name } })
                              }}
                              title="Ver en inventario principal"
                              className="p-1 rounded-md text-brand dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-500/10"
                            >
                              <ExternalLink size={13} />
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setSelectedCategory(null)}
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
        title="Eliminar Categoría"
        width="max-w-sm"
      >
        {confirmDelete && (
          <div className="space-y-4">
            <p className="text-sm text-slate-600 dark:text-zinc-300">
              ¿Estás seguro de que deseas eliminar la categoría{' '}
              <strong className="text-slate-900 dark:text-zinc-100">{confirmDelete.name}</strong>?
            </p>

            {confirmDelete.skuCount > 0 && (
              <div className="flex items-start gap-2 text-xs text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-xl p-3">
                <AlertCircle size={16} className="shrink-0 mt-0.5" />
                <span>
                  Hay <strong>{confirmDelete.skuCount}</strong> productos asociados a esta categoría.
                  No se borrarán, pero quedarán como <em>"Sin categoría"</em>.
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
                className="btn-danger"
              >
                Eliminar
              </button>
            </div>
          </div>
        )}
      </Modal>

    </AppLayout>
  )
}
