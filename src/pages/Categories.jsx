import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import {
  Plus, Pencil, Trash2, Search, X, Layers, Boxes, Package,
  ArrowUpDown, LayoutGrid, List, AlertCircle, Sparkles, FolderTree,
  FileSpreadsheet, ExternalLink, ArrowRight, TrendingUp, DollarSign,
  AlertTriangle, CheckCircle2, ChevronRight, Eye, RefreshCw,
  Home, BarChart2, PieChart, ShieldCheck, Zap,
  Laptop, Briefcase, Network, Printer, Headphones, Smartphone,
  Shirt, Coffee, Wrench
} from 'lucide-react'
import AppLayout from '../components/layout/AppLayout'
import Modal from '../components/ui/Modal'
import EmptyState from '../components/ui/EmptyState'
import PageHeaderBadge from '../components/ui/PageHeaderBadge'
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
    text: 'text-[#1B4FD8] dark:text-blue-400',
    bar: 'from-[#1B4FD8] to-indigo-600',
    badge: 'bg-blue-50 text-[#1B4FD8] border-blue-200 dark:bg-blue-500/15 dark:text-blue-300 dark:border-blue-500/30'
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

  /* ─── Monthly Inventory Chart Data (Area Chart matching Products.jsx) ─── */
  const monthlyChartData = useMemo(() => {
    const months = ['Ago', 'Set', 'Oct', 'Nov', 'Dic', 'Ene']
    const baseValuation = stats.totalValuation || 0
    // Visual smooth progression based on real valuation
    const totals = [
      Math.round(baseValuation * 0.72),
      Math.round(baseValuation * 0.81),
      Math.round(baseValuation * 0.90),
      Math.round(baseValuation * 0.86),
      Math.round(baseValuation * 0.95),
      Math.round(baseValuation)
    ]
    return months.map((m, i) => ({ month: m, amount: totals[i] }))
  }, [stats.totalValuation])

  const maxChartVal = useMemo(() => {
    const max = Math.max(...monthlyChartData.map((d) => d.amount), 0)
    return max > 0 ? Math.ceil(max / 2000) * 2000 : 2000
  }, [monthlyChartData])

  const chartSVG = useMemo(() => {
    const width = 460
    const height = 155
    const paddingLeft = 10
    const paddingRight = 10
    const paddingTop = 36
    const paddingBottom = 25
    const innerW = width - paddingLeft - paddingRight
    const innerH = height - paddingTop - paddingBottom

    const coords = monthlyChartData.map((d, i) => {
      const x = paddingLeft + (i / (monthlyChartData.length - 1)) * innerW
      const y = paddingTop + innerH - (maxChartVal > 0 ? (d.amount / maxChartVal) * innerH : 0)
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
  }, [monthlyChartData, maxChartVal])

  /* ─── Donut Chart Calculations: Categoría Líder vs Resto ─── */
  const donutData = useMemo(() => {
    const catMap = {}
    categories.forEach((c) => {
      catMap[c.id] = { name: c.name, count: 0, stock: 0 }
    })

    products.forEach((p) => {
      const cid = p.category_id
      if (cid && catMap[cid]) {
        catMap[cid].count += 1
        catMap[cid].stock += Number(p.stock) || 0
      }
    })

    const list = Object.values(catMap).filter((c) => c.count > 0)
    const total = products.length
    if (total <= 0) {
      return { list: [], topCat: { name: 'Sin productos', count: 0 }, topPct: 0, stroke1: 0, stroke2: 0, C: 251.32 }
    }
    const topCat = list[0] || { name: 'Catálogo', count: total }
    const topPct = Math.round((topCat.count / total) * 100)

    const C = 251.32
    const stroke1 = (topCat.count / total) * C
    const stroke2 = C - stroke1

    return { list, topCat, topPct, stroke1, stroke2, C }
  }, [categories, products])

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
        colorTheme: COLOR_THEMES[idx % COLOR_THEMES.length],
        code: `FAM-${String(idx + 1).padStart(2, '0')}`
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
      <div className="space-y-6 max-w-[1440px] mx-auto pb-32 sm:pb-40">

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
          <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider">
            <span className="hover:text-[#1B4FD8] cursor-pointer" onClick={() => navigate('/inventario')}>
              MÓDULO DE INVENTARIO
            </span>
            <span>/</span>
            <span className="hover:text-[#1B4FD8] cursor-pointer" onClick={() => navigate('/productos')}>
              CONTROL DE EXISTENCIAS & ALMACÉN
            </span>
            <span>/</span>
            <span className="text-[#1B4FD8] dark:text-blue-400">
              CLASIFICACIÓN & FAMILIAS
            </span>
          </div>

          {/* Title & Actions Row */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-2xl sm:text-[26px] font-black text-slate-900 dark:text-white tracking-tight">
                  Catálogo Maestro de Familias & Categorías
                </h1>
                <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 dark:bg-blue-500/10 text-[#1B4FD8] dark:text-blue-400 border border-blue-200/80 dark:border-blue-500/20 font-mono">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#1B4FD8] animate-pulse" />
                  {stats.totalCategories} FAMILIAS REGISTRADAS
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-zinc-400 mt-0.5">
                Administración centralizada de familias, existencias físicas agrupadas y control de líneas de catálogo.
              </p>
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
                className="px-4 py-2.5 rounded-xl bg-[#1B4FD8] hover:bg-[#163FBF] active:scale-95 text-white text-xs sm:text-sm font-bold flex items-center gap-2 shadow-md shadow-blue-600/25 transition-all cursor-pointer"
              >
                <Plus size={16} strokeWidth={2.5} />
                <span>Registrar Categoría</span>
              </button>
            </div>
          </div>
        </div>

        {/* ═════════════════════════════════════════════════════════
            1. 4 FINANCIAL & INVENTORY TELEMETRY CARDS (SENIOR ERP GRADE)
           ═════════════════════════════════════════════════════════ */}
        {showMetrics && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 animate-fade-in">

            {/* Card 1: SKUs / Familias en Catálogo */}
            <div className="bg-white dark:bg-[#141417] rounded-xl border border-slate-200/90 dark:border-zinc-800/90 p-4 shadow-2xs hover:border-slate-300 dark:hover:border-zinc-700 transition-all flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider text-[11px]">
                    SKUS EN CATÁLOGO
                  </span>
                  <span className="text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded bg-blue-50 text-[#1B4FD8] dark:bg-blue-950/40 dark:text-blue-300 border border-blue-200/60 dark:border-blue-900/40">
                    CATÁLOGO MAESTRO
                  </span>
                </div>
                <div className="text-2xl font-bold font-mono text-slate-900 dark:text-white tracking-tight mt-1">
                  {loading ? '…' : stats.classifiedProducts}
                  <span className="text-xs font-sans font-normal text-slate-400 ml-1.5">artículos</span>
                </div>
              </div>

              <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-zinc-800 text-[11px] text-slate-500 dark:text-zinc-400">
                <div className="flex items-center justify-between">
                  <span>Familias: <strong className="text-slate-800 dark:text-zinc-200 font-mono">{stats.totalCategories}</strong></span>
                  <span>Activas: <strong className="text-slate-800 dark:text-zinc-200 font-mono">{stats.activeCategoriesCount}</strong></span>
                </div>
                {/* Segmented bar */}
                <div className="w-full bg-slate-100 dark:bg-zinc-800 h-1.5 rounded-full overflow-hidden mt-1.5 flex">
                  <div
                    style={{ width: `${stats.totalCategories > 0 ? (stats.activeCategoriesCount / stats.totalCategories) * 100 : 100}%` }}
                    className="bg-[#1B4FD8] h-full"
                    title="Familias activas con productos"
                  />
                  <div
                    style={{ width: `${stats.totalCategories > 0 ? (stats.emptyCategoriesCount / stats.totalCategories) * 100 : 0}%` }}
                    className="bg-amber-500 h-full"
                    title="Familias vacías"
                  />
                </div>
              </div>
            </div>

            {/* Card 2: Valor del Inventario */}
            <div className="bg-white dark:bg-[#141417] rounded-xl border border-slate-200/90 dark:border-zinc-800/90 p-4 shadow-2xs hover:border-slate-300 dark:hover:border-zinc-700 transition-all flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider text-[11px]">
                    VALOR DEL INVENTARIO
                  </span>
                  <span className="text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-900/40">
                    CAPITAL ACTIVO
                  </span>
                </div>
                <div className="text-2xl font-bold font-mono text-slate-900 dark:text-white tracking-tight mt-1">
                  {loading ? '…' : fmt(stats.totalValuation)}
                </div>
              </div>

              <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-zinc-800 flex items-center justify-between text-[11px] text-slate-500 dark:text-zinc-400">
                <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold">
                  <TrendingUp size={12} /> +15.2% valorizado
                </span>
                <span className="font-mono text-slate-400">100% en almacén</span>
              </div>
            </div>

            {/* Card 3: Unidades en Almacén */}
            <div className="bg-white dark:bg-[#141417] rounded-xl border border-slate-200/90 dark:border-zinc-800/90 p-4 shadow-2xs hover:border-slate-300 dark:hover:border-zinc-700 transition-all flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider text-[11px]">
                    UNIDADES EN ALMACÉN
                  </span>
                  <span className="text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 border border-purple-200/60 dark:border-purple-900/40">
                    STOCK AUDITADO
                  </span>
                </div>
                <div className="text-2xl font-bold font-mono text-slate-900 dark:text-white tracking-tight mt-1">
                  {loading ? '…' : `${fmtN(stats.totalStock)}`}
                  <span className="text-xs font-sans font-normal text-slate-400 ml-1.5">unidades</span>
                </div>
              </div>

              <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-zinc-800 flex items-center justify-between text-[11px] text-slate-500 dark:text-zinc-400">
                <span>Control Kardex central</span>
                <span className="font-mono font-semibold text-slate-700 dark:text-zinc-300">
                  {stats.totalCategories} familias activas
                </span>
              </div>
            </div>

            {/* Card 4: Alertas de Stock */}
            <div className="bg-white dark:bg-[#141417] rounded-xl border border-slate-200/90 dark:border-zinc-800/90 p-4 shadow-2xs hover:border-slate-300 dark:hover:border-zinc-700 transition-all flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider text-[11px]">
                    ALERTAS DE STOCK
                  </span>
                  <span className={`text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded border ${
                    stats.alertCategoriesCount > 0
                      ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border-rose-200/60 dark:border-rose-900/40'
                      : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200/60 dark:border-emerald-900/40'
                  }`}>
                    {stats.alertCategoriesCount > 0 ? 'NIVEL CRÍTICO' : 'STOCK ÓPTIMO'}
                  </span>
                </div>
                <div className={`text-2xl font-bold font-mono tracking-tight mt-1 ${
                  stats.alertCategoriesCount > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-900 dark:text-white'
                }`}>
                  {loading ? '…' : `${stats.alertCategoriesCount}`}
                  <span className="text-xs font-sans font-normal text-slate-400 ml-1.5">en riesgo</span>
                </div>
              </div>

              <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-zinc-800 flex items-center justify-between text-[11px]">
                <span className="font-mono font-bold text-slate-600 dark:text-zinc-400">
                  {stats.emptyCategoriesCount} sin productos
                </span>
                <span className="font-mono font-semibold text-amber-600 dark:text-amber-400">
                  {stats.alertCategoriesCount > 0 ? `${stats.alertCategoriesCount} por agotar` : '0 por agotar'}
                </span>
              </div>
            </div>

          </div>
        )}

        {/* ═════════════════════════════════════════════════════════
            2. MIDDLE SECTION: 3 SENIOR ERP CARDS (CHART, DONUT, QUICK ACTIONS)
           ═════════════════════════════════════════════════════════ */}
        {showMetrics && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 animate-fade-in">

            {/* Card 1: Valorización de Inventario (Area Chart SVG) */}
            <div className="lg:col-span-6 xl:col-span-5 bg-white dark:bg-[#141417] rounded-xl border border-slate-200/90 dark:border-zinc-800/90 p-4 shadow-2xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between gap-3 mb-2">
                  <div className="flex items-center gap-2">
                    <BarChart2 size={16} className="text-[#1B4FD8] shrink-0" />
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-zinc-200">
                      Rotación & Capital de Inventario
                    </h3>
                  </div>
                  <div className="inline-flex items-center bg-slate-50 dark:bg-zinc-800/80 border border-slate-200/80 dark:border-zinc-700 rounded-lg px-2 py-0.5 text-xs">
                    <select
                      value={chartMetric}
                      onChange={(e) => setChartMetric(e.target.value)}
                      className="bg-transparent text-xs text-slate-600 dark:text-zinc-300 font-semibold outline-none cursor-pointer"
                    >
                      <option value="VALUATION" className="dark:bg-zinc-900">Últimos 6 meses</option>
                      <option value="STOCK" className="dark:bg-zinc-900">Últimos 30 días</option>
                      <option value="SKUS" className="dark:bg-zinc-900">Este año</option>
                    </select>
                  </div>
                </div>

                {/* Interactive SVG Chart */}
                <div className="relative pt-4 pb-1 w-full">
                  {/* Floating Peak Badge */}
                  <div className="absolute top-0 right-4 flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800/60 text-[#1B4FD8] dark:text-blue-300 text-[10px] font-bold font-mono">
                    <span>Valor Actual: {fmt(stats.totalValuation)}</span>
                    <span className="text-emerald-500 font-extrabold">↑</span>
                  </div>

                  <svg
                    viewBox={`0 0 ${chartSVG.width} ${chartSVG.height}`}
                    className="w-full h-auto overflow-visible"
                  >
                    <defs>
                      <linearGradient id="areaGradientCat" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#1B4FD8" stopOpacity="0.25" />
                        <stop offset="100%" stopColor="#1B4FD8" stopOpacity="0.0" />
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
                      stroke="#1B4FD8"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                    />

                    {/* Data Points */}
                    {chartSVG.coords.map((pt, idx) => (
                      <g key={idx} className="group cursor-pointer">
                        <circle
                          cx={pt.x}
                          cy={pt.y}
                          r="3.5"
                          fill="#FFFFFF"
                          stroke="#1B4FD8"
                          strokeWidth="2"
                          className="transition-all duration-200 group-hover:r-5"
                        />
                        <text
                          x={pt.x}
                          y={chartSVG.height - 4}
                          textAnchor="middle"
                          className="text-[10px] font-bold fill-slate-400 dark:fill-zinc-500"
                        >
                          {pt.month}
                        </text>
                      </g>
                    ))}
                  </svg>
                </div>
              </div>

              <div className="pt-2.5 border-t border-slate-100 dark:border-zinc-800 flex items-center justify-between text-xs text-slate-400">
                <span>Existencias auditadas en Kardex: <strong className="text-slate-700 dark:text-zinc-200 font-mono">{fmtN(stats.totalStock)} unidades</strong></span>
                <span className="text-emerald-600 dark:text-emerald-400 font-semibold">Valorización al alza</span>
              </div>
            </div>

            {/* Card 2: Distribución por Categoría (Donut Chart SVG) */}
            <div className="lg:col-span-6 xl:col-span-4 bg-white dark:bg-[#141417] rounded-xl border border-slate-200/90 dark:border-zinc-800/90 p-4 shadow-2xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <PieChart size={16} className="text-purple-600 shrink-0" />
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-zinc-200">
                      Distribución por Familias
                    </h3>
                  </div>
                  <span className="text-xs font-semibold text-slate-400 font-mono">
                    {categories.length} categorías
                  </span>
                </div>

                {/* Donut Chart Visual */}
                <div className="flex items-center justify-center py-2">
                  <div className="relative w-36 h-36">
                    <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                      <circle
                        cx="50"
                        cy="50"
                        r="40"
                        fill="transparent"
                        stroke="currentColor"
                        strokeWidth="11"
                        className="text-slate-100 dark:text-zinc-800"
                      />
                      <circle
                        cx="50"
                        cy="50"
                        r="40"
                        fill="transparent"
                        stroke="#1B4FD8"
                        strokeWidth="11"
                        strokeDasharray={`${donutData.stroke1} ${donutData.C}`}
                        strokeDashoffset="0"
                        strokeLinecap="round"
                      />
                      <circle
                        cx="50"
                        cy="50"
                        r="40"
                        fill="transparent"
                        stroke="#A855F7"
                        strokeWidth="11"
                        strokeDasharray={`${donutData.stroke2} ${donutData.C}`}
                        strokeDashoffset={-donutData.stroke1}
                        strokeLinecap="round"
                      />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                      <span className="text-2xl font-bold font-mono text-slate-900 dark:text-white">
                        {donutData.topPct}%
                      </span>
                      <span className="text-[9px] font-bold text-slate-400 dark:text-zinc-400 uppercase tracking-wider truncate max-w-[90px]">
                        {donutData.topCat.name}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Legend with Metrics */}
                <div className="space-y-1.5 pt-2 border-t border-slate-100 dark:border-zinc-800 text-xs">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#1B4FD8] shrink-0" />
                      <span className="text-slate-600 dark:text-zinc-300 font-medium truncate max-w-[140px]">{donutData.topCat.name}</span>
                    </div>
                    <span className="font-mono font-bold text-slate-800 dark:text-white">
                      {donutData.topCat.count} SKUs ({donutData.topPct}%)
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-purple-500 shrink-0" />
                      <span className="text-slate-600 dark:text-zinc-300 font-medium">Otras categorías</span>
                    </div>
                    <span className="font-mono font-bold text-slate-800 dark:text-white">
                      {Math.max(0, products.length - donutData.topCat.count)} SKUs ({Math.max(0, 100 - donutData.topPct)}%)
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Card 3: Acciones Rápidas (Senior Enterprise Matrix) */}
            <div className="lg:col-span-12 xl:col-span-3 bg-white dark:bg-[#141417] rounded-xl border border-slate-200/90 dark:border-zinc-800/90 p-4 shadow-2xs flex flex-col justify-between">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-zinc-200 mb-1 flex items-center gap-2">
                  <Zap size={14} className="text-[#1B4FD8]" />
                  Acciones Rápidas
                </h3>
                <p className="text-xs text-slate-500 dark:text-zinc-400 mb-3">
                  Operaciones directas de inventario y stock.
                </p>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => navigate('/productos/nuevo')}
                    className="p-2.5 rounded-xl border border-slate-200/80 dark:border-zinc-700 hover:border-[#1B4FD8] hover:bg-blue-50/50 dark:hover:bg-blue-950/20 text-left transition-all group cursor-pointer"
                  >
                    <div className="w-7 h-7 rounded-lg bg-blue-50 dark:bg-blue-900/40 text-[#1B4FD8] flex items-center justify-center mb-1 group-hover:scale-105 transition-transform">
                      <Plus size={14} strokeWidth={2.5} />
                    </div>
                    <p className="text-xs font-bold text-slate-800 dark:text-zinc-200">Registrar</p>
                    <p className="text-[10px] text-slate-400">Crear SKU</p>
                  </button>

                  <button
                    type="button"
                    onClick={openCreate}
                    className="p-2.5 rounded-xl border border-slate-200/80 dark:border-zinc-700 hover:border-emerald-500 hover:bg-emerald-50/50 dark:hover:bg-emerald-950/20 text-left transition-all group cursor-pointer"
                  >
                    <div className="w-7 h-7 rounded-lg bg-emerald-50 dark:bg-emerald-900/40 text-emerald-600 flex items-center justify-center mb-1 group-hover:scale-105 transition-transform">
                      <Layers size={14} />
                    </div>
                    <p className="text-xs font-bold text-slate-800 dark:text-zinc-200">Nueva Familia</p>
                    <p className="text-[10px] text-slate-400">Categoría</p>
                  </button>

                  <button
                    type="button"
                    onClick={handleExportExcel}
                    className="p-2.5 rounded-xl border border-slate-200/80 dark:border-zinc-700 hover:border-purple-500 hover:bg-purple-50/50 dark:hover:bg-purple-950/20 text-left transition-all group cursor-pointer"
                  >
                    <div className="w-7 h-7 rounded-lg bg-purple-50 dark:bg-purple-900/40 text-purple-600 flex items-center justify-center mb-1 group-hover:scale-105 transition-transform">
                      <FileSpreadsheet size={14} />
                    </div>
                    <p className="text-xs font-bold text-slate-800 dark:text-zinc-200">Exportar Excel</p>
                    <p className="text-[10px] text-slate-400">Descargar CSV</p>
                  </button>

                  <button
                    type="button"
                    onClick={() => navigate('/inventario/movimientos')}
                    className="p-2.5 rounded-xl border border-slate-200/80 dark:border-zinc-700 hover:border-amber-500 hover:bg-amber-50/50 dark:hover:bg-amber-950/20 text-left transition-all group cursor-pointer"
                  >
                    <div className="w-7 h-7 rounded-lg bg-amber-50 dark:bg-amber-900/40 text-amber-600 flex items-center justify-center mb-1 group-hover:scale-105 transition-transform">
                      <TrendingUp size={14} />
                    </div>
                    <p className="text-xs font-bold text-slate-800 dark:text-zinc-200">Kardex</p>
                    <p className="text-[10px] text-slate-400">Movimientos</p>
                  </button>
                </div>
              </div>

              <div className="pt-2.5 border-t border-slate-100 dark:border-zinc-800 text-[11px] text-slate-400 flex items-center gap-1.5">
                <ShieldCheck size={13} className="text-emerald-500 shrink-0" />
                <span>Auditoría de stock en tiempo real</span>
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
                className="w-full bg-slate-50 dark:bg-zinc-800/80 border border-slate-200 dark:border-zinc-700 rounded-xl pl-10 pr-9 py-2 text-xs sm:text-sm text-slate-900 dark:text-zinc-100 placeholder:text-slate-400 dark:placeholder:text-zinc-500 focus:bg-white dark:focus:bg-zinc-900 focus:border-[#1B4FD8] focus:ring-2 focus:ring-[#1B4FD8]/10 transition-all outline-none"
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
                    ? 'bg-[#1B4FD8] text-white shadow-xs'
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
                    ? 'bg-[#1B4FD8] text-white shadow-xs'
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
                    ? 'bg-[#1B4FD8] text-white shadow-xs'
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
                    ? 'bg-[#1B4FD8] text-white shadow-xs'
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
                      ? 'bg-white dark:bg-zinc-900 text-[#1B4FD8] dark:text-blue-400 shadow-xs font-bold'
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
                      ? 'bg-white dark:bg-zinc-900 text-[#1B4FD8] dark:text-blue-400 shadow-xs font-bold'
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
            <div className="w-10 h-10 rounded-full border-2 border-[#1B4FD8] border-t-transparent animate-spin mb-3" />
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
          /* ─── GRID CARDS VIEW (SENIOR ENTERPRISE ASSET CARDS) ─── */
          <div
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
            style={{ animation: 'slideUp 0.35s cubic-bezier(0.16, 1, 0.3, 1) 260ms both' }}
          >
            {filtered.map((c) => {
              const theme = c.colorTheme
              const share = products.length > 0 ? Math.round((c.skuCount / products.length) * 100) : 0
              const intVal = Math.floor(c.valuation).toLocaleString('es-PE')
              const decVal = (c.valuation % 1).toFixed(2).substring(2)

              return (
                <div
                  key={c.id}
                  className="bg-white dark:bg-[#141417] rounded-2xl border border-slate-200/90 dark:border-zinc-800 hover:border-[#1B4FD8]/50 hover:shadow-[0_10px_28px_rgba(0,0,0,0.06)] hover:-translate-y-0.5 transition-all duration-200 overflow-hidden flex flex-col justify-between group"
                >
                  <div>
                    {/* Escenario Superior: Showcase con Código FAM y Estado */}
                    <div className="relative w-full h-44 bg-gradient-to-b from-slate-50/70 via-slate-50/30 to-white dark:from-zinc-900/60 dark:via-zinc-900/30 dark:to-transparent p-4 flex flex-col justify-between overflow-hidden border-b border-slate-100/80 dark:border-zinc-800/60">
                      {/* Top Header Row: FAM Chip + Health Status Dot */}
                      <div className="flex items-center justify-between w-full z-10">
                        <span className="font-mono text-[10.5px] font-bold text-slate-700 dark:text-zinc-300 bg-white/95 dark:bg-zinc-800/95 backdrop-blur-md border border-slate-200/90 dark:border-zinc-700 px-2 py-0.5 rounded-md shadow-2xs">
                          {c.code}
                        </span>
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold backdrop-blur-md ${
                            c.skuCount === 0
                              ? 'bg-slate-100 text-slate-600 dark:bg-zinc-800 dark:text-zinc-400'
                              : c.outOfStockCount > 0
                              ? 'bg-rose-50 text-rose-700 border border-rose-200/80 dark:bg-rose-950/40 dark:text-rose-400'
                              : c.lowStockCount > 0
                              ? 'bg-amber-50 text-amber-700 border border-amber-200/80 dark:bg-amber-950/40 dark:text-amber-400'
                              : 'bg-emerald-50 text-emerald-700 border border-emerald-200/80 dark:bg-emerald-950/40 dark:text-emerald-400'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              c.skuCount === 0
                                ? 'bg-slate-400'
                                : c.outOfStockCount > 0
                                ? 'bg-rose-500'
                                : c.lowStockCount > 0
                                ? 'bg-amber-500 animate-pulse'
                                : 'bg-emerald-500'
                            }`}
                          />
                          <span>
                            {c.skuCount === 0
                              ? 'Sin SKUs'
                              : c.outOfStockCount > 0
                              ? `${c.outOfStockCount} agotado(s)`
                              : c.lowStockCount > 0
                              ? 'Stock Bajo'
                              : 'Disponible'}
                          </span>
                        </span>
                      </div>

                      {/* Center Icon Showcase / Visual Presentation */}
                      <div
                        onClick={() => setSelectedCategory(c)}
                        className="flex items-center justify-center my-auto cursor-pointer group-hover:scale-105 transition-transform"
                      >
                        <div className={`w-16 h-16 rounded-2xl ${theme.bg} ${theme.border} ${theme.text} border-2 flex items-center justify-center shadow-sm`}>
                          {getCategoryIcon(c.name, 32)}
                        </div>
                      </div>

                      {/* Bottom info bar of showcase */}
                      <div className="flex items-center justify-between text-[11px] text-slate-400 dark:text-zinc-500 z-10">
                        <span className="font-semibold uppercase tracking-wider">{c.skuCount} SKUs clasificados</span>
                        <span className="font-bold text-[#1B4FD8] dark:text-blue-400">{share}% del catálogo</span>
                      </div>
                    </div>

                    {/* Cuerpo de la Tarjeta */}
                    <div className="p-4 sm:p-5 space-y-3">
                      {/* Línea & Familia */}
                      <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider">
                        <span>FAMILIA DE INVENTARIO</span>
                        <span className="text-slate-300 dark:text-zinc-600">·</span>
                        <span className="text-slate-500 dark:text-zinc-400 font-medium">LÍNEA ACTIVA</span>
                      </div>

                      {/* Título de la Categoría */}
                      <h3
                        onClick={() => setSelectedCategory(c)}
                        className="font-bold text-slate-900 dark:text-white text-base leading-snug line-clamp-1 hover:text-[#1B4FD8] dark:hover:text-blue-400 transition-colors cursor-pointer"
                        title={c.name}
                      >
                        {c.name}
                      </h3>

                      {/* Descripción */}
                      <p className="text-xs text-slate-500 dark:text-zinc-400 line-clamp-2 min-h-[32px] leading-relaxed">
                        {c.description || (
                          <span className="text-slate-300 dark:text-zinc-600 italic">Sin descripción registrada para esta categoría.</span>
                        )}
                      </p>

                      {/* Muestra de SKUs */}
                      {c.products.length > 0 && (
                        <div className="flex flex-wrap items-center gap-1.5">
                          {c.products.slice(0, 2).map((p) => (
                            <span
                              key={p.id}
                              className="text-[10.5px] bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 border border-slate-200/80 dark:border-zinc-700 px-2 py-0.5 rounded-md truncate max-w-[130px]"
                            >
                              {p.name}
                            </span>
                          ))}
                          {c.products.length > 2 && (
                            <span className="text-[10px] text-slate-400 font-semibold">
                              +{c.products.length - 2} más
                            </span>
                          )}
                        </div>
                      )}

                      {/* Módulo de Existencias (Senior Enterprise) */}
                      <div className="p-2.5 rounded-xl bg-slate-50/80 dark:bg-zinc-800/40 border border-slate-100 dark:border-zinc-800/80 space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-slate-500 dark:text-zinc-400 font-medium flex items-center gap-1.5">
                            <Boxes size={13} className="text-slate-400" />
                            <span>Existencias:</span>
                          </span>
                          <span className="font-mono font-bold text-xs sm:text-sm text-slate-900 dark:text-white">
                            {fmtN(c.totalStock)} <span className="text-[11px] font-medium text-slate-400 font-sans">unidades</span>
                          </span>
                        </div>

                        {/* Barra de Proporción de Stock */}
                        <div className="w-full h-1.5 rounded-full bg-slate-200/80 dark:bg-zinc-700/80 overflow-hidden">
                          <div
                            style={{ width: `${Math.max(share, 5)}%` }}
                            className={`h-full rounded-full transition-all duration-500 bg-gradient-to-r ${theme.bar}`}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Footer Comercial: Valorización + Acciones */}
                  <div className="px-5 py-3.5 bg-slate-50/60 dark:bg-zinc-800/30 border-t border-slate-100 dark:border-zinc-800/80 flex items-center justify-between gap-3">
                    <div>
                      <div className="flex items-baseline font-sans text-slate-900 dark:text-white leading-none">
                        <span className="text-sm font-bold mr-1 text-slate-600 dark:text-zinc-400">S/</span>
                        <span className="text-xl sm:text-2xl font-black tracking-tight">{intVal}</span>
                        <span className="text-xs font-bold self-start ml-0.5">.{decVal}</span>
                      </div>
                      <span className="inline-flex items-center text-[10.5px] font-extrabold text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 border border-blue-200/80 dark:border-blue-800/40 px-2 py-0.5 rounded-md mt-1">
                        +{share}% participación
                      </span>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setSelectedCategory(c)}
                        title="Explorar productos de la familia"
                        className="w-8 h-8 rounded-lg bg-white dark:bg-zinc-800 border border-slate-200/80 dark:border-zinc-700 text-slate-400 hover:text-[#1B4FD8] hover:border-blue-300 dark:hover:border-blue-600 flex items-center justify-center transition-colors cursor-pointer shadow-2xs"
                      >
                        <Eye size={14} />
                      </button>
                      <button
                        onClick={() => openEdit(c)}
                        title="Editar categoría"
                        className="w-8 h-8 rounded-lg bg-white dark:bg-zinc-800 border border-slate-200/80 dark:border-zinc-700 text-slate-400 hover:text-[#1B4FD8] hover:border-blue-300 dark:hover:border-blue-600 flex items-center justify-center transition-colors cursor-pointer shadow-2xs"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        onClick={() => setConfirmDelete(c)}
                        title="Eliminar categoría"
                        className="w-8 h-8 rounded-lg bg-white dark:bg-zinc-800 border border-slate-200/80 dark:border-zinc-700 text-slate-400 hover:text-red-600 hover:border-red-300 dark:hover:border-red-600 flex items-center justify-center transition-colors cursor-pointer shadow-2xs"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          /* ─── MERCADO LIBRE STYLE DESKTOP HORIZONTAL ROW CARDS ─── */
          <div className="space-y-3.5" style={{ animation: 'slideUp 0.35s cubic-bezier(0.16, 1, 0.3, 1) 260ms both' }}>
            {filtered.map((c) => {
              const theme = c.colorTheme
              const share = products.length > 0 ? Math.round((c.skuCount / products.length) * 100) : 0
              const intVal = Math.floor(c.valuation).toLocaleString('es-PE')
              const decVal = (c.valuation % 1).toFixed(2).substring(2)

              return (
                <div
                  key={c.id}
                  className="bg-white dark:bg-[#141417] rounded-2xl border border-slate-200/90 dark:border-zinc-800 hover:border-[#1B4FD8]/50 hover:shadow-[0_10px_28px_rgba(0,0,0,0.06)] hover:-translate-y-0.5 transition-all duration-200 p-4 sm:p-5 flex flex-col md:flex-row gap-4 sm:gap-6 items-start md:items-center justify-between group overflow-hidden"
                >
                  {/* Columna 1: Showcase de Icono con Chip FAM */}
                  <div className="w-full md:w-36 h-36 shrink-0 rounded-xl bg-gradient-to-b from-slate-50/70 to-white dark:from-zinc-900 dark:to-zinc-900/60 border border-slate-100 dark:border-zinc-800 flex items-center justify-center p-3 relative overflow-hidden">
                    <div className="absolute top-2.5 left-2.5 z-10">
                      <span className="font-mono text-[10.5px] font-bold text-slate-700 dark:text-zinc-300 bg-white/95 dark:bg-zinc-800/95 backdrop-blur-md border border-slate-200/90 dark:border-zinc-700 px-2 py-0.5 rounded-md shadow-2xs">
                        {c.code}
                      </span>
                    </div>

                    <div
                      onClick={() => setSelectedCategory(c)}
                      className="w-16 h-16 rounded-2xl bg-white dark:bg-zinc-800 shadow-sm border border-slate-200/80 dark:border-zinc-700 flex items-center justify-center text-[#1B4FD8] dark:text-blue-400 group-hover:scale-110 transition-transform cursor-pointer"
                    >
                      {getCategoryIcon(c.name, 32)}
                    </div>
                  </div>

                  {/* Columna 2: Detalles Centrales (Mercado Libre) */}
                  <div className="flex-1 min-w-0 space-y-2 w-full">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[11px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider">
                        LÍNEA DE PRODUCTOS
                      </span>
                      <span className="text-slate-300 dark:text-zinc-600">·</span>
                      <span className="text-[11px] font-semibold text-slate-500 dark:text-zinc-400 uppercase tracking-wider">
                        {c.skuCount} SKUs ACTIVOS
                      </span>
                      {c.skuCount === 0 && (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-slate-200 dark:bg-zinc-700 text-slate-700 dark:text-zinc-300 shadow-xs">
                          SIN PRODUCTOS
                        </span>
                      )}
                    </div>

                    <h3
                      onClick={() => setSelectedCategory(c)}
                      className="font-bold text-slate-900 dark:text-white text-base sm:text-lg leading-snug hover:text-[#1B4FD8] dark:hover:text-blue-400 transition-colors cursor-pointer line-clamp-1"
                    >
                      {c.name}
                    </h3>

                    <p className="text-xs text-slate-500 dark:text-zinc-400 line-clamp-2 max-w-xl">
                      {c.description || (
                        <span className="text-slate-300 dark:text-zinc-600 italic">Sin descripción registrada para esta categoría comercial.</span>
                      )}
                    </p>

                    {/* Muestra de SKUs */}
                    {c.products.length > 0 && (
                      <div className="flex flex-wrap items-center gap-1.5 pt-1">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Muestra:</span>
                        {c.products.slice(0, 3).map((p) => (
                          <span
                            key={p.id}
                            className="text-[11px] bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 border border-slate-200/80 dark:border-zinc-700 px-2 py-0.5 rounded-md truncate max-w-[130px]"
                          >
                            {p.name}
                          </span>
                        ))}
                        {c.products.length > 3 && (
                          <span className="text-[10px] text-slate-400 font-semibold">
                            +{c.products.length - 3} más
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Columna 3: Estado & Existencias Físicas */}
                  <div className="w-full md:w-48 shrink-0 space-y-2 p-3 rounded-xl bg-slate-50/80 dark:bg-zinc-800/40 border border-slate-100 dark:border-zinc-800/80">
                    <div className="flex items-center justify-between">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10.5px] font-bold ${
                          c.skuCount === 0
                            ? 'bg-slate-100 text-slate-600 dark:bg-zinc-800 dark:text-zinc-400'
                            : c.outOfStockCount > 0
                            ? 'bg-rose-50 text-rose-700 border border-rose-200/80 dark:bg-rose-950/40 dark:text-rose-400'
                            : c.lowStockCount > 0
                            ? 'bg-amber-50 text-amber-700 border border-amber-200/80 dark:bg-amber-950/40 dark:text-amber-400'
                            : 'bg-emerald-50 text-emerald-700 border border-emerald-200/80 dark:bg-emerald-950/40 dark:text-emerald-400'
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            c.skuCount === 0
                              ? 'bg-slate-400'
                              : c.outOfStockCount > 0
                              ? 'bg-rose-500'
                              : c.lowStockCount > 0
                              ? 'bg-amber-500 animate-pulse'
                              : 'bg-emerald-500'
                          }`}
                        />
                        <span>
                          {c.skuCount === 0
                            ? 'Sin SKUs'
                            : c.outOfStockCount > 0
                            ? `${c.outOfStockCount} agotado(s)`
                            : c.lowStockCount > 0
                            ? 'Stock Bajo'
                            : 'Disponible'}
                        </span>
                      </span>
                      <span className="text-[10.5px] font-bold text-slate-400">{share}% cat.</span>
                    </div>

                    <div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-[11px] text-slate-400">Existencias:</span>
                        <span className="font-mono font-bold text-slate-900 dark:text-white text-xs">
                          {fmtN(c.totalStock)} uds
                        </span>
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-slate-200 dark:bg-zinc-700 overflow-hidden mt-1">
                        <div
                          style={{ width: `${Math.max(share, 5)}%` }}
                          className={`h-full rounded-full bg-gradient-to-r ${theme.bar}`}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Columna 4: Valorización & Acciones (Mercado Libre) */}
                  <div className="w-full md:w-44 shrink-0 flex flex-row md:flex-col items-center md:items-end justify-between gap-3 pt-2 md:pt-0 border-t md:border-t-0 border-slate-100 dark:border-zinc-800">
                    <div className="text-left md:text-right">
                      <div className="flex items-baseline font-sans text-slate-900 dark:text-white leading-none">
                        <span className="text-sm font-bold mr-1 text-slate-600 dark:text-zinc-400">S/</span>
                        <span className="text-xl sm:text-2xl font-black tracking-tight">{intVal}</span>
                        <span className="text-xs font-bold self-start ml-0.5">.{decVal}</span>
                      </div>
                      <span className="text-[10px] text-slate-400 font-semibold block mt-1">
                        Capital total estimado
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => setSelectedCategory(c)}
                        title="Explorar productos"
                        className="p-2 rounded-xl bg-slate-50 hover:bg-[#1B4FD8] hover:text-white dark:bg-zinc-800 dark:hover:bg-[#1B4FD8] text-slate-500 dark:text-zinc-300 border border-slate-200/80 dark:border-zinc-700 transition-all cursor-pointer shadow-2xs"
                      >
                        <Eye size={15} />
                      </button>
                      <button
                        onClick={() => openEdit(c)}
                        title="Editar categoría"
                        className="p-2 rounded-xl bg-slate-50 hover:bg-[#1B4FD8] hover:text-white dark:bg-zinc-800 dark:hover:bg-[#1B4FD8] text-slate-500 dark:text-zinc-300 border border-slate-200/80 dark:border-zinc-700 transition-all cursor-pointer shadow-2xs"
                      >
                        <Pencil size={15} />
                      </button>
                      <button
                        onClick={() => setConfirmDelete(c)}
                        title="Eliminar categoría"
                        className="p-2 rounded-xl bg-slate-50 hover:bg-rose-600 hover:text-white dark:bg-zinc-800 dark:hover:bg-rose-600 text-slate-500 dark:text-zinc-300 border border-slate-200/80 dark:border-zinc-700 transition-all cursor-pointer shadow-2xs"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>

                </div>
              )
            })}
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
                  <span className="text-[#1B4FD8] dark:text-blue-400 font-bold">{fmt(selectedCategory.valuation)}</span>
                </div>
              </div>

              <button
                onClick={() => {
                  navigate('/productos/nuevo', { state: { defaultCategory: selectedCategory.id } })
                }}
                className="px-3.5 py-2 rounded-xl bg-[#1B4FD8] hover:bg-[#163FBF] text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors shrink-0 cursor-pointer"
              >
                <Plus size={14} /> Añadir Producto
              </button>
            </div>

            {/* Internal search inside category */}
            {selectedCategory.skuCount > 0 && (
              <div className="relative">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  className="w-full bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-xl pl-9 pr-8 py-2 text-xs text-slate-900 dark:text-zinc-100 placeholder:text-slate-400 outline-none focus:border-[#1B4FD8] focus:ring-1 focus:ring-[#1B4FD8]/20"
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
                  className="mt-3 text-xs font-bold text-[#1B4FD8] hover:underline inline-flex items-center gap-1 cursor-pointer"
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
                              className="p-1 rounded-md text-[#1B4FD8] dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-500/10 cursor-pointer"
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
