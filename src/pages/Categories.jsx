import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import {
  Plus, Pencil, Trash2, Search, X, Layers, Boxes, Package,
  ArrowUpDown, LayoutGrid, List, AlertCircle, Sparkles, FolderTree,
  FileSpreadsheet, ExternalLink, ArrowRight, TrendingUp, DollarSign,
  AlertTriangle, CheckCircle2, ChevronRight, Eye, RefreshCw,
  Home, BarChart2, PieChart, ShieldCheck,
  Laptop, Briefcase, Network, Printer, Headphones, Smartphone,
  Shirt, Coffee, Wrench
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
  if (n.includes('audio') || n.includes('sonido') || n.includes('auricular') || n.includes('parlante') || n.includes('airpod')) {
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

  const [categories, setCategories] = useState(() => categoriesService.getCached?.() || [])
  const [products, setProducts] = useState(() => productsService.getCached?.() || [])
  const [loading, setLoading] = useState(() => !categoriesService.hasCache?.())

  // Filters & State
  const [search, setSearch] = useState('')
  const [segmentFilter, setSegmentFilter] = useState('ALL') // 'ALL' | 'ACTIVE' | 'ALERT' | 'EMPTY'
  const [sortBy, setSortBy] = useState('valuation') // 'valuation' | 'products' | 'stock' | 'name'
  const [viewMode, setViewMode] = useState('grid') // 'grid' | 'table'
  const [showMetrics, setShowMetrics] = useState(true)
  const [chartMetric, setChartMetric] = useState('VALUATION') // 'VALUATION' | 'STOCK' | 'SKUS'

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
    if (!categoriesService.hasCache?.()) setLoading(true)
    const safetyTimer = setTimeout(() => {
      setLoading(false)
    }, 2500)

    try {
      const [c, p] = await Promise.all([
        categoriesService.list().catch(() => []),
        productsService.list().catch(() => [])
      ])
      setCategories(c || [])
      setProducts(p || [])
    } catch (err) {
      console.error('Error cargando categorías y productos:', err)
    } finally {
      clearTimeout(safetyTimer)
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
        topValCategory = { ...c, valuation: d.valuation, skuCount: d.skuCount, totalStock: d.totalStock }
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
      emptyCategoriesCount,
      activeCategoriesCount: totalCategories - emptyCategoriesCount
    }
  }, [categories, products, categoryDataMap])

  /* ─── Category Distribution Chart Data (Area Chart) ─── */
  const chartItems = useMemo(() => {
    const sorted = [...categories].map((c) => {
      const d = categoryDataMap[c.id] || { valuation: 0, totalStock: 0, skuCount: 0 }
      const shortName = c.name.length > 10 ? c.name.slice(0, 9) + '…' : c.name
      let val = d.valuation
      if (chartMetric === 'STOCK') val = d.totalStock
      if (chartMetric === 'SKUS') val = d.skuCount

      return {
        id: c.id,
        name: shortName,
        fullName: c.name,
        amount: val,
        valuation: d.valuation,
        stock: d.totalStock,
        skus: d.skuCount
      }
    }).sort((a, b) => b.amount - a.amount)

    if (sorted.length === 0) {
      return [
        { name: 'Cat A', amount: 0 },
        { name: 'Cat B', amount: 0 },
        { name: 'Cat C', amount: 0 },
        { name: 'Cat D', amount: 0 }
      ]
    }

    if (sorted.length === 1) {
      return [
        { name: 'Inicio', amount: 0 },
        { name: sorted[0].name, amount: sorted[0].amount },
        { name: 'Fin', amount: sorted[0].amount }
      ]
    }

    return sorted.slice(0, 6)
  }, [categories, categoryDataMap, chartMetric])

  const maxChartVal = useMemo(() => {
    const max = Math.max(...chartItems.map((d) => d.amount), chartMetric === 'VALUATION' ? 1000 : 10)
    const step = chartMetric === 'VALUATION' ? 500 : 5
    return Math.ceil(max / step) * step
  }, [chartItems, chartMetric])

  const chartSVG = useMemo(() => {
    const width = 460
    const height = 150
    const paddingLeft = 14
    const paddingRight = 14
    const paddingTop = 20
    const paddingBottom = 25
    const innerW = width - paddingLeft - paddingRight
    const innerH = height - paddingTop - paddingBottom

    const coords = chartItems.map((d, i) => {
      const x = paddingLeft + (chartItems.length > 1 ? (i / (chartItems.length - 1)) * innerW : innerW / 2)
      const ratio = maxChartVal > 0 ? d.amount / maxChartVal : 0
      const y = paddingTop + innerH - ratio * innerH
      return { x, y, ...d }
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

    return { coords, pathD, areaD, width, height, innerH, innerW, paddingTop }
  }, [chartItems, maxChartVal])

  /* ─── Donut Chart Calculations (Top Family vs Rest) ─── */
  const donutData = useMemo(() => {
    const total = stats.totalValuation || 1
    const topVal = stats.topValCategory?.valuation || 0
    const restVal = Math.max(0, total - topVal)
    const pctTop = stats.totalValuation > 0 ? Math.round((topVal / total) * 100) : 0
    const pctRest = 100 - pctTop

    // SVG dasharray for circle circumference (r=40, C=2*PI*40 ≈ 251.32)
    const C = 251.32
    const topStroke = (topVal / total) * C
    const restStroke = (restVal / total) * C

    return {
      total,
      topVal,
      restVal,
      pctTop,
      pctRest,
      topStroke,
      restStroke,
      C
    }
  }, [stats])

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
      <div className="space-y-6 max-w-[1440px] mx-auto pb-16">

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
            0. BREADCRUMB & HEADER ROW (EXECUTIVE STANDARD)
           ═════════════════════════════════════════════════════════ */}
        <div className="space-y-3">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-zinc-400">
            <Home size={14} className="text-slate-400 dark:text-zinc-500" />
            <span className="text-slate-300 dark:text-zinc-600">›</span>
            <span className="font-semibold text-slate-700 dark:text-zinc-300">Inventario & Familias de Productos</span>
          </div>

          {/* Title & Actions Row */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/25 shrink-0">
                <FolderTree size={22} />
              </div>
              <div>
                <h1 className="text-2xl sm:text-[26px] font-black text-slate-900 dark:text-white tracking-tight">
                  Categorías de Catálogo
                </h1>
                <p className="text-xs sm:text-sm text-slate-500 dark:text-zinc-400 mt-0.5">
                  Organiza las líneas de tu inventario, controla valorizaciones y audita existencias por familia.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2.5 shrink-0">
              {/* Toggle Metrics */}
              <button
                onClick={() => setShowMetrics((prev) => !prev)}
                className="px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:bg-slate-50 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-200 text-xs sm:text-sm font-semibold flex items-center gap-2 transition-colors cursor-pointer shadow-xs"
                title="Mostrar u ocultar métricas y gráficas"
              >
                <TrendingUp size={16} className="text-slate-400 dark:text-zinc-400" />
                <span className="hidden sm:inline">{showMetrics ? 'Ocultar KPIs' : 'Ver KPIs'}</span>
              </button>

              {/* Export Excel */}
              <button
                onClick={handleExportExcel}
                className="px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:bg-slate-50 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-200 text-xs sm:text-sm font-semibold flex items-center gap-2 transition-colors cursor-pointer shadow-xs"
                title="Descargar catálogo de categorías en Excel / CSV"
              >
                <FileSpreadsheet size={16} className="text-emerald-600 dark:text-emerald-400" />
                <span>Exportar Excel</span>
              </button>

              {/* Primary New Category Button */}
              <button
                onClick={openCreate}
                className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-95 text-white text-xs sm:text-sm font-bold flex items-center gap-2 shadow-md shadow-blue-500/25 transition-all cursor-pointer"
              >
                <Plus size={16} strokeWidth={2.5} />
                <span>+ Nueva Categoría</span>
              </button>
            </div>
          </div>
        </div>

        {/* ═════════════════════════════════════════════════════════
            1. EXECUTIVE METRICS BAR (4 FINNOVA CARDS WITH SPARKLINE GRADIENTS)
           ═════════════════════════════════════════════════════════ */}
        {showMetrics && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-fade-in">

            {/* Card 1: Total Familias (Blue) */}
            <div className="bg-white dark:bg-[#141417] rounded-2xl border border-slate-200/80 dark:border-zinc-800 p-4 shadow-[0_2px_12px_rgba(0,0,0,0.03)] flex items-center justify-between transition-all hover:border-slate-300 dark:hover:border-zinc-700">
              <div className="flex items-center gap-3.5">
                <div className="w-11 h-11 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-500/25 shrink-0">
                  <FolderTree size={20} />
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-500 dark:text-zinc-400">
                    Total Familias
                  </p>
                  <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight mt-0.5 font-mono">
                    {loading ? '…' : stats.totalCategories}
                  </h3>
                  <p className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-0.5 mt-0.5">
                    <span>{stats.activeCategoriesCount} activas</span>
                    <span className="text-slate-400 dark:text-zinc-500 font-normal ml-0.5">
                      · {stats.emptyCategoriesCount} vacías
                    </span>
                  </p>
                </div>
              </div>
              {/* Sparkline curve (Blue) */}
              <div className="w-20 h-10 shrink-0">
                <svg viewBox="0 0 80 40" className="w-full h-full overflow-visible">
                  <defs>
                    <linearGradient id="sparkBlueCat" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.3" />
                      <stop offset="100%" stopColor="#3B82F6" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  <path
                    d="M 0 32 Q 20 30 35 22 T 60 16 T 80 6 L 80 40 L 0 40 Z"
                    fill="url(#sparkBlueCat)"
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

            {/* Card 2: SKUs Clasificados (Purple) */}
            <div className="bg-white dark:bg-[#141417] rounded-2xl border border-slate-200/80 dark:border-zinc-800 p-4 shadow-[0_2px_12px_rgba(0,0,0,0.03)] flex items-center justify-between transition-all hover:border-slate-300 dark:hover:border-zinc-700">
              <div className="flex items-center gap-3.5">
                <div className="w-11 h-11 rounded-full bg-purple-100 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
                  <Boxes size={20} />
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-500 dark:text-zinc-400">
                    SKUs Clasificados
                  </p>
                  <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight mt-0.5 font-mono">
                    {loading ? '…' : `${stats.classifiedProducts} SKUs`}
                  </h3>
                  <p className="text-[11px] font-semibold text-purple-600 dark:text-purple-400 flex items-center gap-0.5 mt-0.5">
                    <span>{stats.catalogCoverage}% catálogo</span>
                    <span className="text-slate-400 dark:text-zinc-500 font-normal ml-0.5">organizado</span>
                  </p>
                </div>
              </div>
              {/* Sparkline curve (Purple) */}
              <div className="w-20 h-10 shrink-0">
                <svg viewBox="0 0 80 40" className="w-full h-full overflow-visible">
                  <defs>
                    <linearGradient id="sparkPurpleCat" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#A855F7" stopOpacity="0.3" />
                      <stop offset="100%" stopColor="#A855F7" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  <path
                    d="M 0 34 Q 24 30 42 20 T 64 16 T 80 6 L 80 40 L 0 40 Z"
                    fill="url(#sparkPurpleCat)"
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

            {/* Card 3: Unidades en Stock (Emerald) */}
            <div className="bg-white dark:bg-[#141417] rounded-2xl border border-slate-200/80 dark:border-zinc-800 p-4 shadow-[0_2px_12px_rgba(0,0,0,0.03)] flex items-center justify-between transition-all hover:border-slate-300 dark:hover:border-zinc-700">
              <div className="flex items-center gap-3.5">
                <div className="w-11 h-11 rounded-full bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                  <Package size={20} />
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-500 dark:text-zinc-400">
                    Unidades en Stock
                  </p>
                  <h3 className="text-xl font-black text-emerald-600 dark:text-emerald-400 tracking-tight mt-0.5 font-mono">
                    {loading ? '…' : `${fmtN(stats.totalStock)} uds.`}
                  </h3>
                  <p className="text-[11px] font-semibold text-slate-400 dark:text-zinc-500 mt-0.5">
                    Almacén central y tiendas
                  </p>
                </div>
              </div>
              {/* Sparkline curve (Emerald) */}
              <div className="w-20 h-10 shrink-0">
                <svg viewBox="0 0 80 40" className="w-full h-full overflow-visible">
                  <defs>
                    <linearGradient id="sparkGreenCat" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10B981" stopOpacity="0.3" />
                      <stop offset="100%" stopColor="#10B981" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  <path
                    d="M 0 35 Q 22 34 38 24 T 62 18 T 80 8 L 80 40 L 0 40 Z"
                    fill="url(#sparkGreenCat)"
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

            {/* Card 4: Valorización de Inventario (Amber) */}
            <div className="bg-white dark:bg-[#141417] rounded-2xl border border-slate-200/80 dark:border-zinc-800 p-4 shadow-[0_2px_12px_rgba(0,0,0,0.03)] flex items-center justify-between transition-all hover:border-slate-300 dark:hover:border-zinc-700">
              <div className="flex items-center gap-3.5">
                <div className="w-11 h-11 rounded-full bg-amber-100 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                  <DollarSign size={20} />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-slate-500 dark:text-zinc-400">
                    Valorización Inventario
                  </p>
                  <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight mt-0.5 font-mono truncate">
                    {loading ? '…' : fmt(stats.totalValuation)}
                  </h3>
                  <p className="text-[11px] font-bold text-amber-600 dark:text-amber-400 mt-0.5 truncate">
                    {stats.topValCategory ? (
                      <>Líder: {stats.topValCategory.name}</>
                    ) : 'Sin categorías'}
                  </p>
                </div>
              </div>
              {/* Sparkline curve (Amber) */}
              <div className="w-20 h-10 shrink-0">
                <svg viewBox="0 0 80 40" className="w-full h-full overflow-visible">
                  <defs>
                    <linearGradient id="sparkAmberCat" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#F59E0B" stopOpacity="0.3" />
                      <stop offset="100%" stopColor="#F59E0B" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  <path
                    d="M 0 33 Q 25 35 45 25 T 66 18 T 80 9 L 80 40 L 0 40 Z"
                    fill="url(#sparkAmberCat)"
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
        )}

        {/* ═════════════════════════════════════════════════════════
            2. MIDDLE SECTION: 3 CARDS (CHART, DONUT, ACCIONES RÁPIDAS)
           ═════════════════════════════════════════════════════════ */}
        {showMetrics && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 animate-fade-in">
            
            {/* Card 1: Distribución de Valor por Familia (Area Chart SVG) */}
            <div className="lg:col-span-6 xl:col-span-5 bg-white dark:bg-[#141417] rounded-2xl border border-slate-200/80 dark:border-zinc-800 p-5 shadow-[0_2px_12px_rgba(0,0,0,0.03)] flex flex-col justify-between">
              <div className="flex items-center justify-between gap-3 mb-4">
                <div className="flex items-center gap-2">
                  <BarChart2 size={18} className="text-blue-600 shrink-0" />
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Distribución por Familia
                  </h3>
                </div>
                <div className="inline-flex items-center bg-slate-50 dark:bg-zinc-800/80 border border-slate-200/80 dark:border-zinc-700 rounded-lg px-2.5 py-1 text-xs">
                  <select
                    value={chartMetric}
                    onChange={(e) => setChartMetric(e.target.value)}
                    className="bg-transparent text-xs text-slate-600 dark:text-zinc-300 font-semibold outline-none cursor-pointer"
                  >
                    <option value="VALUATION" className="dark:bg-zinc-900">Por Valorización (S/)</option>
                    <option value="STOCK" className="dark:bg-zinc-900">Por Existencias (Stock)</option>
                    <option value="SKUS" className="dark:bg-zinc-900">Por Cantidad de SKUs</option>
                  </select>
                </div>
              </div>

              {/* Interactive SVG Chart */}
              <div className="relative pt-6 pb-2 w-full">
                {/* Floating Peak Badge */}
                <div className="absolute top-0 right-6 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800/60 text-blue-700 dark:text-blue-300 text-[11px] font-bold">
                  <span>
                    Pico: {chartMetric === 'VALUATION'
                      ? fmt(Math.max(...chartItems.map((d) => d.amount), 0))
                      : `${fmtN(Math.max(...chartItems.map((d) => d.amount), 0))} uds`}
                  </span>
                  <span className="text-emerald-500 font-extrabold">↑</span>
                </div>

                <svg
                  viewBox={`0 0 ${chartSVG.width} ${chartSVG.height}`}
                  className="w-full h-auto overflow-visible"
                >
                  <defs>
                    <linearGradient id="areaGradientCat" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.35" />
                      <stop offset="100%" stopColor="#3B82F6" stopOpacity="0.0" />
                    </linearGradient>
                  </defs>

                  {/* Horizontal Grid lines */}
                  {[0.25, 0.5, 0.75, 1].map((ratio, idx) => {
                    const y = chartSVG.paddingTop + chartSVG.innerH * (1 - ratio)
                    return (
                      <g key={idx}>
                        <line
                          x1={10}
                          y1={y}
                          x2={chartSVG.width - 10}
                          y2={y}
                          stroke="currentColor"
                          strokeDasharray="4 4"
                          className="text-slate-100 dark:text-zinc-800/80"
                          strokeWidth="1"
                        />
                      </g>
                    )
                  })}

                  {/* Shaded Area */}
                  <path d={chartSVG.areaD} fill="url(#areaGradientCat)" />

                  {/* Curve Path */}
                  <path
                    d={chartSVG.pathD}
                    fill="none"
                    stroke="#2563EB"
                    strokeWidth="3"
                    strokeLinecap="round"
                  />

                  {/* Data Points */}
                  {chartSVG.coords.map((pt, idx) => (
                    <g key={idx} className="group cursor-pointer">
                      <circle
                        cx={pt.x}
                        cy={pt.y}
                        r="4"
                        fill="#FFFFFF"
                        stroke="#2563EB"
                        strokeWidth="2.5"
                        className="transition-all duration-200 group-hover:r-6"
                      />
                      <text
                        x={pt.x}
                        y={chartSVG.height - 4}
                        textAnchor="middle"
                        className="text-[10px] font-bold fill-slate-400 dark:fill-zinc-500"
                      >
                        {pt.name}
                      </text>
                    </g>
                  ))}
                </svg>
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-zinc-800 flex items-center justify-between text-xs text-slate-400">
                <span>
                  Valor medio por familia: <strong className="text-slate-700 dark:text-zinc-200">{fmt(stats.totalValuation / (categories.length || 1))}</strong>
                </span>
                <span className="text-emerald-600 dark:text-emerald-400 font-semibold">Catálogo balanceado</span>
              </div>
            </div>

            {/* Card 2: Concentración de Catálogo (Donut Chart SVG) */}
            <div className="lg:col-span-6 xl:col-span-4 bg-white dark:bg-[#141417] rounded-2xl border border-slate-200/80 dark:border-zinc-800 p-5 shadow-[0_2px_12px_rgba(0,0,0,0.03)] flex flex-col justify-between">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <PieChart size={18} className="text-purple-600 shrink-0" />
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Concentración de Catálogo
                  </h3>
                </div>
                <span className="text-xs font-semibold text-slate-400">
                  {categories.length} familias
                </span>
              </div>

              {/* Donut Chart Visual */}
              <div className="flex items-center justify-center py-4">
                <div className="relative w-40 h-40">
                  <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                    {/* Background track */}
                    <circle
                      cx="50"
                      cy="50"
                      r="40"
                      fill="transparent"
                      stroke="currentColor"
                      strokeWidth="12"
                      className="text-slate-100 dark:text-zinc-800"
                    />
                    {/* Top family slice */}
                    <circle
                      cx="50"
                      cy="50"
                      r="40"
                      fill="transparent"
                      stroke="#2563EB"
                      strokeWidth="12"
                      strokeDasharray={`${donutData.topStroke} ${donutData.C}`}
                      strokeDashoffset="0"
                      strokeLinecap="round"
                    />
                    {/* Rest of families slice */}
                    <circle
                      cx="50"
                      cy="50"
                      r="40"
                      fill="transparent"
                      stroke="#A855F7"
                      strokeWidth="12"
                      strokeDasharray={`${donutData.restStroke} ${donutData.C}`}
                      strokeDashoffset={-donutData.topStroke}
                      strokeLinecap="round"
                    />
                  </svg>
                  {/* Center Content */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                    <span className="text-2xl font-black font-mono text-slate-900 dark:text-white">
                      {donutData.pctTop}%
                    </span>
                    <span className="text-[10px] font-bold text-slate-400 dark:text-zinc-400 uppercase tracking-wider">
                      Líder Catálogo
                    </span>
                  </div>
                </div>
              </div>

              {/* Legend with Metrics */}
              <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-zinc-800 text-xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-600 shrink-0" />
                    <span className="text-slate-600 dark:text-zinc-300 font-medium truncate max-w-[150px]">
                      {stats.topValCategory ? stats.topValCategory.name : 'Sin líder'}
                    </span>
                  </div>
                  <span className="font-mono font-bold text-slate-800 dark:text-white">
                    {fmt(donutData.topVal)} ({donutData.pctTop}%)
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-purple-500 shrink-0" />
                    <span className="text-slate-600 dark:text-zinc-300 font-medium">Otras categorías</span>
                  </div>
                  <span className="font-mono font-bold text-slate-800 dark:text-white">
                    {fmt(donutData.restVal)} ({donutData.pctRest}%)
                  </span>
                </div>
              </div>
            </div>

            {/* Card 3: Acciones Rápidas (Matriz 2x2) */}
            <div className="lg:col-span-12 xl:col-span-3 bg-white dark:bg-[#141417] rounded-2xl border border-slate-200/80 dark:border-zinc-800 p-5 shadow-[0_2px_12px_rgba(0,0,0,0.03)] flex flex-col justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
                  <Sparkles size={16} className="text-amber-500" />
                  Acciones Rápidas
                </h3>
                <p className="text-xs text-slate-500 dark:text-zinc-400 mb-4">
                  Accesos directos de catalogación y gestión de familias.
                </p>

                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    onClick={openCreate}
                    className="p-3 rounded-xl border border-slate-200/80 dark:border-zinc-700 hover:border-blue-500 hover:bg-blue-50/50 dark:hover:bg-blue-950/20 text-left transition-all group cursor-pointer"
                  >
                    <div className="w-7 h-7 rounded-lg bg-blue-50 dark:bg-blue-900/40 text-blue-600 flex items-center justify-center mb-1.5 group-hover:scale-110 transition-transform">
                      <Plus size={15} />
                    </div>
                    <p className="text-xs font-bold text-slate-800 dark:text-zinc-200">Nueva Categoría</p>
                    <p className="text-[10px] text-slate-400">Crear familia</p>
                  </button>

                  <button
                    onClick={() => navigate('/productos/nuevo')}
                    className="p-3 rounded-xl border border-slate-200/80 dark:border-zinc-700 hover:border-emerald-500 hover:bg-emerald-50/50 dark:hover:bg-emerald-950/20 text-left transition-all group cursor-pointer"
                  >
                    <div className="w-7 h-7 rounded-lg bg-emerald-50 dark:bg-emerald-900/40 text-emerald-600 flex items-center justify-center mb-1.5 group-hover:scale-110 transition-transform">
                      <Package size={15} />
                    </div>
                    <p className="text-xs font-bold text-slate-800 dark:text-zinc-200">Nuevo Producto</p>
                    <p className="text-[10px] text-slate-400">Registrar SKU</p>
                  </button>

                  <button
                    onClick={handleExportExcel}
                    className="p-3 rounded-xl border border-slate-200/80 dark:border-zinc-700 hover:border-purple-500 hover:bg-purple-50/50 dark:hover:bg-purple-950/20 text-left transition-all group cursor-pointer"
                  >
                    <div className="w-7 h-7 rounded-lg bg-purple-50 dark:bg-purple-900/40 text-purple-600 flex items-center justify-center mb-1.5 group-hover:scale-110 transition-transform">
                      <FileSpreadsheet size={15} />
                    </div>
                    <p className="text-xs font-bold text-slate-800 dark:text-zinc-200">Exportar CSV</p>
                    <p className="text-[10px] text-slate-400">Descargar datos</p>
                  </button>

                  <button
                    onClick={() => navigate('/productos')}
                    className="p-3 rounded-xl border border-slate-200/80 dark:border-zinc-700 hover:border-amber-500 hover:bg-amber-50/50 dark:hover:bg-amber-950/20 text-left transition-all group cursor-pointer"
                  >
                    <div className="w-7 h-7 rounded-lg bg-amber-50 dark:bg-amber-900/40 text-amber-600 flex items-center justify-center mb-1.5 group-hover:scale-110 transition-transform">
                      <Boxes size={15} />
                    </div>
                    <p className="text-xs font-bold text-slate-800 dark:text-zinc-200">Ver Catálogo</p>
                    <p className="text-[10px] text-slate-400">Todos los SKUs</p>
                  </button>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-zinc-800 flex items-center justify-between text-xs text-slate-400 mt-2">
                <span>Estructura de inventario</span>
                <span className="text-blue-600 dark:text-blue-400 font-bold">ERP v2.4</span>
              </div>
            </div>

          </div>
        )}

        {/* ═════════════════════════════════════════════════════════
            3. CONTROL BAR (SEARCH, SEGMENT PILLS, SORT, VIEW SWITCH)
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
                    ? 'bg-blue-600 text-white shadow-xs'
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
                    ? 'bg-blue-600 text-white shadow-xs'
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
                    ? 'bg-blue-600 text-white shadow-xs'
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
                    ? 'bg-blue-600 text-white shadow-xs'
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
                      ? 'bg-white dark:bg-zinc-900 text-blue-600 dark:text-blue-400 shadow-xs font-bold'
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
                      ? 'bg-white dark:bg-zinc-900 text-blue-600 dark:text-blue-400 shadow-xs font-bold'
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
            4. MAIN CONTENT: GRID OR TABLE
           ═════════════════════════════════════════════════════════ */}
        {loading ? (
          <div className="bg-white dark:bg-[#141417] rounded-2xl border border-slate-200/80 dark:border-zinc-800 p-16 flex flex-col items-center justify-center text-center shadow-xs">
            <div className="w-10 h-10 rounded-full border-2 border-blue-600 border-t-transparent animate-spin mb-3" />
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
                  className="bg-white dark:bg-[#141417] rounded-2xl border border-slate-200/80 dark:border-zinc-800 p-5 shadow-[0_2px_12px_rgba(0,0,0,0.03)] hover:shadow-card hover:border-slate-300 dark:hover:border-zinc-700 card-mobile-active active:scale-[0.99] transition-all flex flex-col justify-between group"
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
                            className="font-bold text-slate-900 dark:text-zinc-100 text-base leading-snug truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors cursor-pointer"
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
                          className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-500/10 dark:hover:text-blue-400 transition-colors cursor-pointer"
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
                        className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:text-blue-700 inline-flex items-center gap-1 group/btn cursor-pointer shrink-0"
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
                              <span className="font-bold text-slate-900 dark:text-zinc-100 text-sm group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
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
                              className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-500/10 dark:hover:text-blue-400 transition-colors"
                            >
                              <Eye size={15} />
                            </button>
                            <button
                              onClick={() => openEdit(c)}
                              title="Editar categoría"
                              className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-500/10 dark:hover:text-blue-400 transition-colors"
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
          5. CATEGORY PRODUCTS EXPLORER MODAL (DRILL-DOWN)
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
                  <span className="text-blue-600 dark:text-blue-400 font-bold">{fmt(selectedCategory.valuation)}</span>
                </div>
              </div>

              <button
                onClick={() => {
                  navigate('/productos/nuevo', { state: { defaultCategory: selectedCategory.id } })
                }}
                className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors shrink-0 cursor-pointer"
              >
                <Plus size={14} /> Añadir Producto
              </button>
            </div>

            {/* Internal search inside category */}
            {selectedCategory.skuCount > 0 && (
              <div className="relative">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  className="w-full bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-xl pl-9 pr-8 py-2 text-xs text-slate-900 dark:text-zinc-100 placeholder:text-slate-400 outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600/20"
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
                  className="mt-3 text-xs font-bold text-blue-600 hover:underline inline-flex items-center gap-1 cursor-pointer"
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
                              className="p-1 rounded-md text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-500/10 cursor-pointer"
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
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-zinc-700 cursor-pointer"
              >
                Cerrar Expediente
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* ═════════════════════════════════════════════════════════
          6. CONFIRM DELETE MODAL
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
                className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-zinc-700 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={handleDelete}
                className="px-3.5 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition-colors cursor-pointer"
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
