import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  AreaChart, Area, XAxis, YAxis, Tooltip,
  ResponsiveContainer, BarChart, Bar, Cell
} from 'recharts'
import {
  Boxes, TrendingUp, AlertTriangle, DollarSign, Plus,
  ShoppingCart, ArrowLeftRight, CheckCircle2, ShieldAlert,
  ArrowUpRight, Users, Clock, ArrowDownRight,
  Package, ChevronRight, BarChart3, Filter,
  Layers, RefreshCw
} from 'lucide-react'
import AppLayout from '../components/layout/AppLayout'
import StockBadge from '../components/ui/StockBadge'
import StatusBadge from '../components/ui/StatusBadge'
import { useAuth } from '../context/AuthContext'
import { productsService } from '../services/productsService'
import { salesService } from '../services/salesService'
import { categoriesService } from '../services/categoriesService'
import { clientsService } from '../services/clientsService'
import { purchasesService } from '../services/purchasesService'

/* ─── Formatters ─── */
const fmt = (n) =>
  `S/ ${(Number(n) || 0).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

const fmtN = (n) => (Number(n) || 0).toLocaleString('es-PE')

const timeAgo = (iso) => {
  if (!iso) return '—'
  const diff = Math.round((Date.now() - new Date(iso)) / 60000)
  if (diff < 1) return 'Hace un momento'
  if (diff < 60) return `Hace ${diff} min`
  if (diff < 1440) return `Hace ${Math.round(diff / 60)} h`
  return new Date(iso).toLocaleDateString('es-PE', { day: '2-digit', month: 'short' })
}

const getInitials = (name = '') => {
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[1][0]).toUpperCase()
}

const AVATAR_COLORS = [
  { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
  { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
  { bg: 'bg-violet-50', text: 'text-violet-700', border: 'border-violet-200' },
  { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
  { bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200' },
  { bg: 'bg-cyan-50', text: 'text-cyan-700', border: 'border-cyan-200' },
]

const getAvatarStyle = (name = '') => {
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length]
}

/* ─── Animated Number Hook (Mobile & Desktop Safe) ─── */
function useAnimatedNumber(value, duration = 850) {
  const [displayValue, setDisplayValue] = useState(0)

  useEffect(() => {
    const target = Number(value) || 0
    if (!target) {
      setDisplayValue(0)
      return
    }
    const startTime = performance.now()
    let frameId

    const step = (currentTime) => {
      const elapsed = currentTime - startTime
      const progress = Math.min(elapsed / duration, 1)
      const ease = 1 - Math.pow(1 - progress, 3)
      setDisplayValue(Math.round(target * ease * 100) / 100)

      if (progress < 1) {
        frameId = requestAnimationFrame(step)
      } else {
        setDisplayValue(target)
      }
    }

    frameId = requestAnimationFrame(step)
    return () => cancelAnimationFrame(frameId)
  }, [value, duration])

  return displayValue
}

/* ─── Mini Sparkline for Metric Cards ─── */
function MiniSparkline({ color = '#1B4FD8', trend = 'up' }) {
  const points = trend === 'up'
    ? '0,24 15,20 30,22 45,14 60,16 75,8 90,12 105,4 120,2'
    : '0,4 15,8 30,6 45,16 60,14 75,20 90,18 105,24 120,26'

  return (
    <div className="w-24 h-8 shrink-0 overflow-hidden">
      <svg viewBox="0 0 120 30" className="w-full h-full overflow-visible">
        <defs>
          <linearGradient id={`spark-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.25} />
            <stop offset="100%" stopColor={color} stopOpacity={0.0} />
          </linearGradient>
        </defs>
        <path
          d={`M ${points} L 120,30 L 0,30 Z`}
          fill={`url(#spark-${color.replace('#', '')})`}
        />
        <polyline
          fill="none"
          stroke={color}
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
          points={points}
          className="animate-draw-line"
        />
      </svg>
    </div>
  )
}

/* ─── Tooltips ─── */
const ChartTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-slate-900 text-white rounded-xl px-3.5 py-2.5 shadow-xl text-xs border border-slate-800">
      <p className="text-slate-400 font-medium mb-1">{label}</p>
      <div className="flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-blue-400" />
        <span className="text-slate-300">Total:</span>
        <span className="font-bold text-white font-mono">{fmt(payload[0].value)}</span>
      </div>
    </div>
  )
}

const BarTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null
  const data = payload[0].payload
  return (
    <div className="bg-slate-900 text-white rounded-xl px-3.5 py-2.5 shadow-xl text-xs border border-slate-800">
      <p className="font-semibold text-white mb-1">{data.fullName}</p>
      <div className="flex items-center justify-between gap-4 text-slate-300">
        <span>Unidades vendidas:</span>
        <span className="font-mono font-bold text-blue-400">{data.cantidad} uds.</span>
      </div>
      <div className="flex items-center justify-between gap-4 text-slate-300 mt-1">
        <span>Ingresos generados:</span>
        <span className="font-mono font-bold text-emerald-400">{fmt(data.revenue)}</span>
      </div>
    </div>
  )
}

export default function Dashboard() {
  const { user } = useAuth()
  const [products, setProducts] = useState([])
  const [sales, setSales] = useState([])
  const [categories, setCategories] = useState([])
  const [clients, setClients] = useState([])
  const [purchases, setPurchases] = useState([])
  const [loading, setLoading] = useState(true)
  const [chartView, setChartView] = useState('mes') // 'mes' | 'semana'

  const loadData = async () => {
    setLoading(true)
    try {
      const [p, s, c, cl, pu] = await Promise.all([
        productsService.list(),
        salesService.list(),
        categoriesService.list(),
        clientsService.list(),
        purchasesService.list()
      ])
      setProducts(p || [])
      setSales(s || [])
      setCategories(c || [])
      setClients(cl || [])
      setPurchases(pu || [])
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  /* ─── Financial & Operational Computations ─── */
  const stats = useMemo(() => {
    const inv = purchases
      .filter((p) => p.status === 'recibido')
      .reduce((s, p) => s + purchasesService.purchaseTotal(p), 0)

    const units = products.reduce((s, p) => s + (Number(p.stock) || 0), 0)
    const low = products.filter((p) => (Number(p.stock) || 0) <= (Number(p.min_stock) || 0))
    const out = products.filter((p) => (Number(p.stock) || 0) <= 0)

    const now = new Date()
    const ms = sales.filter((s) => {
      const d = new Date(s.created_at)
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
    })
    const rev = ms.reduce((s, x) => s + salesService.saleTotal(x), 0)
    const avg = ms.length ? rev / ms.length : 0

    // Margen o estimación de balance operativo
    const estimatedCost = ms.reduce((acc, s) => {
      return acc + (s.items?.reduce((subAcc, it) => {
        const prod = products.find(p => p.id === it.product_id)
        const cost = Number(prod?.cost_price || 0)
        return subAcc + (cost * Number(it.quantity || 1))
      }, 0) || 0)
    }, 0)
    const grossProfit = Math.max(rev - estimatedCost, 0)

    return {
      inv,
      units,
      low,
      out,
      rev,
      msCount: ms.length,
      avg,
      grossProfit,
      prods: products.length,
      cats: categories.length,
      cls: clients.length,
      healthPct: products.length > 0 ? Math.round(((products.length - low.length) / products.length) * 100) : 100
    }
  }, [products, sales, purchases, categories, clients])

  /* ─── Clients mapping ─── */
  const clientMap = useMemo(() => {
    const m = {}
    clients.forEach((c) => { m[c.id] = c.name })
    return m
  }, [clients])

  /* ─── Top selling products ─── */
  const topProds = useMemo(() => {
    const qty = {}
    const rev = {}
    sales.forEach((s) =>
      s.items?.forEach((it) => {
        const q = Number(it.quantity) || 0
        const p = Number(it.unit_price) || 0
        qty[it.product_id] = (qty[it.product_id] || 0) + q
        rev[it.product_id] = (rev[it.product_id] || 0) + q * p
      })
    )
    return Object.entries(qty)
      .map(([pid, q]) => {
        const prod = products.find((p) => p.id === pid)
        const name = prod?.name || 'Producto'
        return {
          fullName: name,
          name: name.length > 16 ? name.slice(0, 16) + '…' : name,
          cantidad: q,
          revenue: rev[pid] || 0
        }
      })
      .sort((a, b) => b.cantidad - a.cantidad)
      .slice(0, 5)
  }, [sales, products])

  /* ─── Category distribution ─── */
  const byCat = useMemo(() => {
    return categories
      .map((c) => {
        const catProds = products.filter((p) => !p.is_kit && p.category_id === c.id)
        const stockUnits = catProds.reduce((s, p) => s + (Number(p.stock) || 0), 0)
        return {
          id: c.id,
          name: c.name,
          units: stockUnits,
          count: catProds.length
        }
      })
      .filter((c) => c.units > 0 || c.count > 0)
      .sort((a, b) => b.units - a.units)
  }, [categories, products])

  const totalCatUnits = useMemo(() => byCat.reduce((s, c) => s + c.units, 0), [byCat])

  /* ─── Sales over time (Timeline chart) ─── */
  const timelineData = useMemo(() => {
    const days = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
    const today = new Date()
    const result = []

    for (let i = 6; i >= 0; i--) {
      const d = new Date()
      d.setDate(today.getDate() - i)
      const dayLabel = `${days[d.getDay()]} ${d.getDate()}`
      const dateStr = d.toISOString().slice(0, 10)

      const dayTotal = sales
        .filter((s) => (s.created_at || '').slice(0, 10) === dateStr)
        .reduce((sum, s) => sum + salesService.saleTotal(s), 0)

      result.push({
        name: dayLabel,
        total: dayTotal,
        date: dateStr
      })
    }
    return result
  }, [sales])

  /* ─── Recent sales (limit 6) ─── */
  const recentSales = useMemo(
    () => [...sales].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 6),
    [sales]
  )

  /* ─── Low stock critical items ─── */
  const criticalList = useMemo(
    () => [...stats.low].sort((a, b) => a.stock - b.stock).slice(0, 5),
    [stats.low]
  )

  const greeting = () => {
    const h = new Date().getHours()
    if (h < 12) return 'Buenos días'
    if (h < 19) return 'Buenas tardes'
    return 'Buenas noches'
  }

  const currentDateFormatted = new Date().toLocaleDateString('es-PE', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  })

  /* ─ Mobile & Desktop Safe Animated Counters ─ */
  const animRev   = useAnimatedNumber(stats.rev, 900)
  const animInv   = useAnimatedNumber(stats.inv, 900)
  const animProds = useAnimatedNumber(stats.prods, 700)
  const animUnits = useAnimatedNumber(stats.units, 800)
  const animCount = useAnimatedNumber(stats.msCount, 600)
  const animLow   = useAnimatedNumber(stats.low.length, 500)

  return (
    <AppLayout title="Panel de Control">
      <div className="space-y-6 max-w-7xl mx-auto pb-12">

        {/* ═════════════════════════════════════════════════════════
            1. REFINED EXECUTIVE HEADER (CELESTE / AZUL GRADIENTE)
           ═════════════════════════════════════════════════════════ */}
        <div
          className="relative overflow-hidden rounded-2xl p-5 sm:p-7 shadow-md transition-all text-white"
          style={{
            background: 'linear-gradient(135deg, #0284C7 0%, #2563EB 50%, #1D4ED8 100%)',
            boxShadow: '0 8px 30px rgba(2, 132, 199, 0.25)',
            animation: 'slideUp 0.45s cubic-bezier(0.16, 1, 0.3, 1) both'
          }}
        >
          {/* Subtle background radial glow & decorative light */}
          <div
            className="absolute -right-20 -top-20 w-80 h-80 rounded-full pointer-events-none"
            style={{ background: 'radial-gradient(circle, rgba(255,255,255,0.18) 0%, transparent 70%)' }}
          />
          <div
            className="absolute -left-20 -bottom-20 w-80 h-80 rounded-full pointer-events-none"
            style={{ background: 'radial-gradient(circle, rgba(56,189,248,0.2) 0%, transparent 70%)' }}
          />

          <div className="relative flex flex-col lg:flex-row lg:items-center justify-between gap-5">
            <div>
              <div className="flex items-center gap-2.5 mb-2.5 flex-wrap">
                <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-xs font-semibold bg-white/15 text-white border border-white/25 backdrop-blur-sm">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Almacén Principal Operativo
                </span>
                <span className="text-white/40 text-xs font-normal">|</span>
                <span className="text-sky-100/90 text-xs font-medium capitalize flex items-center gap-1.5">
                  <Clock size={12} className="text-sky-200" />
                  {currentDateFormatted}
                </span>
              </div>

              <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight font-sans">
                {greeting()},{' '}
                <span className="text-sky-100 underline decoration-sky-300/40 underline-offset-4">
                  {user?.full_name ? user.full_name.split(' ')[0] : (user?.email || 'Administrador')}
                </span>{' '}
                👋
              </h1>
              <p className="text-sky-100/80 text-sm mt-1 max-w-2xl leading-relaxed">
                Visión general de inventario, finanzas operativas y flujo comercial en tiempo real.
              </p>
            </div>

            {/* Quick Action Hub */}
            <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap shrink-0">
              <button
                onClick={loadData}
                disabled={loading}
                title="Actualizar datos"
                className="p-2.5 rounded-xl border border-white/20 bg-white/10 hover:bg-white/20 active:scale-95 text-white transition-all shadow-xs backdrop-blur-sm card-mobile-active"
              >
                <RefreshCw size={16} className={loading ? 'animate-spin text-white' : ''} />
              </button>

              <Link
                to="/movimientos"
                className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl border border-white/20 bg-white/10 hover:bg-white/20 active:scale-95 text-white text-xs sm:text-sm font-semibold transition-all shadow-xs backdrop-blur-sm card-mobile-active"
              >
                <ArrowLeftRight size={15} />
                <span>Movimiento</span>
              </Link>

              <Link
                to="/productos"
                className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl border border-white/20 bg-white/10 hover:bg-white/20 active:scale-95 text-white text-xs sm:text-sm font-semibold transition-all shadow-xs backdrop-blur-sm card-mobile-active"
              >
                <Plus size={15} />
                <span>Nuevo Producto</span>
              </Link>

              <Link
                to="/ventas"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white text-blue-700 hover:bg-sky-50 active:scale-95 text-xs sm:text-sm font-bold transition-all shadow-md card-mobile-active"
              >
                <ShoppingCart size={15} className="text-blue-700" />
                <span>Nueva Venta</span>
              </Link>
            </div>
          </div>
        </div>

        {/* ═════════════════════════════════════════════════════════
            2. EXECUTIVE STAT CARDS (4 CRISP WHITE ENTERPRISE CARDS)
           ═════════════════════════════════════════════════════════ */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          
          {/* Card 1: Ventas del Mes */}
          <div
            className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs hover:shadow-md hover:border-slate-300 card-mobile-active active:scale-[0.98] transition-all group relative overflow-hidden flex flex-col justify-between"
            style={{ animation: 'slideUp 0.45s cubic-bezier(0.16, 1, 0.3, 1) 80ms both' }}
          >
            <div>
              <div className="flex items-center justify-between gap-2 mb-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 transition-transform group-hover:scale-105">
                  <TrendingUp size={20} />
                </div>
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100">
                  <ArrowUpRight size={12} />
                  {animCount} ventas
                </span>
              </div>
              <p className="text-xs font-semibold text-slate-500 tracking-wider uppercase mb-1">
                Facturación del Mes
              </p>
              <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight font-sans whitespace-nowrap">
                {loading ? '…' : fmt(animRev)}
              </h3>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
              <span className="text-slate-500">
                Ticket prom: <strong className="text-slate-700">{fmt(stats.avg)}</strong>
              </span>
              <MiniSparkline color="#059669" trend="up" />
            </div>
          </div>

          {/* Card 2: Capital Invertido */}
          <div
            className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs hover:shadow-md hover:border-slate-300 card-mobile-active active:scale-[0.98] transition-all group relative overflow-hidden flex flex-col justify-between"
            style={{ animation: 'slideUp 0.45s cubic-bezier(0.16, 1, 0.3, 1) 160ms both' }}
          >
            <div>
              <div className="flex items-center justify-between gap-2 mb-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-brand transition-transform group-hover:scale-105">
                  <DollarSign size={20} />
                </div>
                <span className="inline-flex items-center text-[11px] font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-100">
                  Compras recibidas
                </span>
              </div>
              <p className="text-xs font-semibold text-slate-500 tracking-wider uppercase mb-1">
                Capital en Inventario
              </p>
              <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight font-sans whitespace-nowrap">
                {loading ? '…' : fmt(animInv)}
              </h3>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
              <span className="text-slate-500">
                Total físico: <strong className="text-slate-700">{fmtN(animUnits)} uds.</strong>
              </span>
              <MiniSparkline color="#1B4FD8" trend="up" />
            </div>
          </div>

          {/* Card 3: Catálogo Activo */}
          <div
            className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs hover:shadow-md hover:border-slate-300 card-mobile-active active:scale-[0.98] transition-all group relative overflow-hidden flex flex-col justify-between"
            style={{ animation: 'slideUp 0.45s cubic-bezier(0.16, 1, 0.3, 1) 240ms both' }}
          >
            <div>
              <div className="flex items-center justify-between gap-2 mb-3">
                <div className="w-10 h-10 rounded-xl bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-600 transition-transform group-hover:scale-105">
                  <Boxes size={20} />
                </div>
                <span className="inline-flex items-center text-[11px] font-semibold px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-100">
                  {stats.cats} Categorías
                </span>
              </div>
              <p className="text-xs font-semibold text-slate-500 tracking-wider uppercase mb-1">
                Catálogo de Productos
              </p>
              <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight font-sans whitespace-nowrap">
                {loading ? '…' : `${animProds} SKUs`}
              </h3>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
              <Link to="/productos" className="text-brand font-semibold hover:underline flex items-center gap-1">
                Explorar catálogo <ChevronRight size={12} />
              </Link>
              <span className="text-slate-400 font-mono text-[11px]">{stats.cls} clientes</span>
            </div>
          </div>

          {/* Card 4: Estado Operativo de Stock */}
          <div
            className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs hover:shadow-md hover:border-slate-300 card-mobile-active active:scale-[0.98] transition-all group relative overflow-hidden flex flex-col justify-between"
            style={{ animation: 'slideUp 0.45s cubic-bezier(0.16, 1, 0.3, 1) 320ms both' }}
          >
            <div>
              <div className="flex items-center justify-between gap-2 mb-3">
                <div className={`w-10 h-10 rounded-xl border flex items-center justify-center transition-transform group-hover:scale-105 ${
                  stats.low.length > 0
                    ? 'bg-amber-50 border-amber-100 text-amber-600'
                    : 'bg-emerald-50 border-emerald-100 text-emerald-600'
                }`}>
                  {stats.low.length > 0 ? <AlertTriangle size={20} /> : <CheckCircle2 size={20} />}
                </div>
                <span className={`inline-flex items-center text-[11px] font-semibold px-2 py-0.5 rounded-full border ${
                  stats.low.length > 0
                    ? 'bg-amber-50 text-amber-700 border-amber-200'
                    : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                }`}>
                  {stats.low.length > 0 ? `${animLow} en alerta` : '100% Saludable'}
                </span>
              </div>
              <p className="text-xs font-semibold text-slate-500 tracking-wider uppercase mb-1">
                Control de Almacén
              </p>
              <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight font-sans whitespace-nowrap">
                {loading ? '…' : stats.low.length > 0 ? `${animLow} críticos` : 'Sin quiebres'}
              </h3>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
              <span className="text-slate-500">
                Agotados: <strong className={stats.out.length > 0 ? 'text-red-600' : 'text-slate-700'}>{stats.out.length}</strong>
              </span>
              <span className="text-xs font-semibold text-slate-600">
                {stats.healthPct}% disponibilidad
              </span>
            </div>
          </div>

        </div>

        {/* ═════════════════════════════════════════════════════════
            3. ANALYTICS & REVENUE HUB (CHARTS SECTION)
           ═════════════════════════════════════════════════════════ */}
        <div
          className="grid grid-cols-1 lg:grid-cols-3 gap-6"
          style={{ animation: 'slideUp 0.45s cubic-bezier(0.16, 1, 0.3, 1) 400ms both' }}
        >

          {/* Main Chart: Flujo de Ingresos últimos 7 días */}
          <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200/80 p-5 sm:p-6 shadow-xs flex flex-col justify-between">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
              <div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-brand" />
                  <h3 className="text-base font-bold text-slate-900 tracking-tight">
                    Tendencia de Ventas Diarias
                  </h3>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Comportamiento comercial de la última semana de operaciones.
                </p>
              </div>

              <div className="flex items-center gap-1.5 bg-slate-100/80 p-1 rounded-xl border border-slate-200/60 self-start sm:self-auto">
                <button
                  type="button"
                  onClick={() => setChartView('mes')}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                    chartView === 'mes'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  Semana actual
                </button>
                <Link
                  to="/ventas"
                  className="px-3 py-1 rounded-lg text-xs font-medium text-slate-500 hover:text-brand transition-colors"
                >
                  Historial completo →
                </Link>
              </div>
            </div>

            {/* Recharts Area Chart */}
            <div className="h-64 sm:h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={timelineData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#1B4FD8" stopOpacity={0.16} />
                      <stop offset="95%" stopColor="#1B4FD8" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <XAxis
                    dataKey="name"
                    stroke="#94A3B8"
                    fontSize={11}
                    tickLine={false}
                    axisLine={{ stroke: '#F1F5F9' }}
                  />
                  <YAxis
                    stroke="#94A3B8"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v) => `S/${v}`}
                  />
                  <Tooltip content={<ChartTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="total"
                    stroke="#1B4FD8"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#colorSales)"
                    activeDot={{ r: 6, stroke: '#1B4FD8', strokeWidth: 2, fill: '#FFFFFF' }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Quick summary underneath chart */}
            <div className="grid grid-cols-3 gap-3 pt-4 mt-4 border-t border-slate-100 text-center">
              <div>
                <p className="text-[11px] text-slate-400 font-medium uppercase tracking-wider">Órdenes Activas</p>
                <p className="text-sm sm:text-base font-bold text-slate-800 font-mono mt-0.5">{stats.msCount}</p>
              </div>
              <div>
                <p className="text-[11px] text-slate-400 font-medium uppercase tracking-wider">Promedio Diario</p>
                <p className="text-sm sm:text-base font-bold text-slate-800 font-mono mt-0.5">
                  {fmt(stats.rev / 7)}
                </p>
              </div>
              <div>
                <p className="text-[11px] text-slate-400 font-medium uppercase tracking-wider">Margen Est.</p>
                <p className="text-sm sm:text-base font-bold text-emerald-600 font-mono mt-0.5">
                  {fmt(stats.grossProfit)}
                </p>
              </div>
            </div>
          </div>

          {/* Right: Productos con Mayor Demanda */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 sm:p-6 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between gap-2 mb-4">
                <div className="flex items-center gap-2">
                  <BarChart3 size={16} className="text-brand" />
                  <h3 className="text-base font-bold text-slate-900 tracking-tight">
                    Top Productos Vendidos
                  </h3>
                </div>
                <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                  Volumen
                </span>
              </div>
              <p className="text-xs text-slate-500 mb-4">
                Artículos con mayor rotación en almacén según ventas registradas.
              </p>

              {topProds.length === 0 ? (
                <div className="py-12 text-center">
                  <div className="w-12 h-12 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center mx-auto mb-2 text-slate-400">
                    <Package size={20} />
                  </div>
                  <p className="text-xs font-semibold text-slate-600">Aún no hay rotación registrada</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">Registra ventas para ver estadísticas.</p>
                </div>
              ) : (
                <div className="h-60 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={topProds} layout="vertical" margin={{ left: -10, right: 10, top: 4, bottom: 4 }}>
                      <XAxis type="number" stroke="#E2E8F0" fontSize={10} tickLine={false} axisLine={false} />
                      <YAxis
                        type="category"
                        dataKey="name"
                        stroke="#64748B"
                        fontSize={11}
                        width={90}
                        tickLine={false}
                        axisLine={false}
                      />
                      <Tooltip content={<BarTooltip />} cursor={{ fill: 'rgba(27,79,216,0.04)' }} />
                      <Bar dataKey="cantidad" fill="#1B4FD8" radius={[0, 6, 6, 0]} barSize={16}>
                        {topProds.map((_, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={index === 0 ? '#1B4FD8' : index === 1 ? '#3B82F6' : '#60A5FA'}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            <div className="pt-3 mt-3 border-t border-slate-100">
              <Link
                to="/productos"
                className="text-xs font-semibold text-brand hover:underline flex items-center justify-between"
              >
                <span>Administrar catálogo completo</span>
                <ChevronRight size={13} />
              </Link>
            </div>
          </div>

        </div>

        {/* ═════════════════════════════════════════════════════════
            4. OPERATIONAL WORKFLOW: RECENT ACTIVITY & STOCK CONTROL
           ═════════════════════════════════════════════════════════ */}
        <div
          className="grid grid-cols-1 lg:grid-cols-2 gap-6"
          style={{ animation: 'slideUp 0.45s cubic-bezier(0.16, 1, 0.3, 1) 480ms both' }}
        >

          {/* Left Panel: Recent Sales Ledger */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden flex flex-col justify-between">
            <div>
              <div className="p-5 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-blue-50 text-brand flex items-center justify-center">
                    <ShoppingCart size={16} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 tracking-tight">
                      Flujo de Ventas Recientes
                    </h3>
                    <p className="text-[11px] text-slate-500">Últimas transacciones registradas</p>
                  </div>
                </div>

                <Link
                  to="/ventas"
                  className="text-xs font-semibold text-brand hover:underline flex items-center gap-1"
                >
                  Ver libro de ventas <ArrowUpRight size={13} />
                </Link>
              </div>

              {recentSales.length === 0 ? (
                <div className="py-12 text-center px-4">
                  <div className="w-12 h-12 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center mx-auto mb-3 text-slate-400">
                    <ShoppingCart size={20} />
                  </div>
                  <p className="text-sm font-semibold text-slate-700">Sin transacciones recientes</p>
                  <p className="text-xs text-slate-400 mt-1 mb-4">Crea una nueva venta para alimentar el historial.</p>
                  <Link to="/ventas" className="btn-primary text-xs py-2">
                    <Plus size={13} /> Registrar venta
                  </Link>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {recentSales.map((sale) => {
                    const clientName = clientMap[sale.client_id] || sale.client_name || 'Cliente Particular'
                    const total = salesService.saleTotal(sale)
                    const itemCount = sale.items?.reduce((s, it) => s + (Number(it.quantity) || 1), 0) || 0
                    const avatarStyle = getAvatarStyle(clientName)

                    return (
                      <div
                        key={sale.id}
                        className="px-5 py-3.5 hover:bg-slate-50/70 transition-colors flex items-center justify-between gap-3 group"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div
                            className={`w-9 h-9 rounded-xl border ${avatarStyle.border} ${avatarStyle.bg} ${avatarStyle.text} flex items-center justify-center text-xs font-bold shrink-0 font-display`}
                          >
                            {getInitials(clientName)}
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-slate-900 truncate group-hover:text-brand transition-colors">
                              {clientName}
                            </p>
                            <p className="text-[11px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                              <span>{timeAgo(sale.created_at)}</span>
                              <span>•</span>
                              <span>{itemCount} ítem{itemCount !== 1 ? 's' : ''}</span>
                            </p>
                          </div>
                        </div>

                        <div className="flex flex-col items-end gap-1 shrink-0">
                          <span className="text-xs font-bold text-slate-900 font-mono">
                            {fmt(total)}
                          </span>
                          <StatusBadge status={sale.status || 'pagado'} />
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            <div className="p-3 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <span>{stats.msCount} ventas registradas este mes</span>
              <span className="font-semibold text-slate-700">Total: {fmt(stats.rev)}</span>
            </div>
          </div>

          {/* Right Panel: Low Stock & Reorder Alerts */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden flex flex-col justify-between">
            <div>
              <div className="p-5 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                    stats.low.length > 0 ? 'bg-amber-50 text-amber-600' : 'bg-emerald-50 text-emerald-600'
                  }`}>
                    {stats.low.length > 0 ? <ShieldAlert size={16} /> : <CheckCircle2 size={16} />}
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 tracking-tight">
                      Alertas de Stock & Reposición
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      {stats.low.length > 0
                        ? `${stats.low.length} producto(s) requieren atención inmediata`
                        : 'Inventario en niveles óptimos'}
                    </p>
                  </div>
                </div>

                <Link
                  to="/movimientos"
                  className="text-xs font-semibold text-brand hover:underline flex items-center gap-1"
                >
                  Gestionar ingresos <ArrowUpRight size={13} />
                </Link>
              </div>

              {criticalList.length === 0 ? (
                <div className="py-12 text-center px-4">
                  <div className="w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center mx-auto mb-3 text-emerald-600">
                    <CheckCircle2 size={24} />
                  </div>
                  <p className="text-sm font-semibold text-slate-800">Inventario 100% saludable</p>
                  <p className="text-xs text-slate-400 max-w-xs mx-auto mt-1">
                    Todos los productos superan el stock mínimo configurado. No hay quiebres de inventario.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {criticalList.map((prod) => {
                    const stock = Number(prod.stock) || 0
                    const minStock = Number(prod.min_stock) || 0
                    const pct = minStock > 0 ? Math.min(Math.round((stock / minStock) * 100), 100) : 0
                    const isZero = stock <= 0

                    return (
                      <div
                        key={prod.id}
                        className="px-5 py-3.5 hover:bg-slate-50/70 transition-colors flex items-center justify-between gap-3 group"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-mono text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded border border-slate-200 shrink-0">
                              {prod.sku || 'SKU'}
                            </span>
                            <span className="text-xs font-semibold text-slate-800 truncate group-hover:text-brand transition-colors">
                              {prod.name}
                            </span>
                          </div>

                          <div className="flex items-center gap-3">
                            {/* Linear Segmented Progress Bar */}
                            <div className="flex-1 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all duration-500 ${
                                  isZero ? 'bg-red-500' : pct < 50 ? 'bg-amber-500' : 'bg-emerald-500'
                                }`}
                                style={{ width: `${Math.max(pct, 4)}%` }}
                              />
                            </div>
                            <span className="text-[11px] font-mono text-slate-500 tabular-nums shrink-0">
                              {stock} / {minStock} mín.
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <StockBadge stock={stock} minStock={minStock} />
                          <Link
                            to="/movimientos"
                            className="text-[11px] font-semibold text-brand hover:bg-brand-dim px-2 py-1 rounded-lg border border-brand/20 transition-colors"
                          >
                            Reponer
                          </Link>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            <div className="p-3 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <span>{stats.out.length} productos agotados</span>
              <Link to="/movimientos" className="font-semibold text-brand hover:underline">
                Ingreso rápido de mercadería →
              </Link>
            </div>
          </div>

        </div>

        {/* ═════════════════════════════════════════════════════════
            5. CATEGORY DISTRIBUTION & INVENTORY BREAKDOWN
           ═════════════════════════════════════════════════════════ */}
        {byCat.length > 0 && (
          <div
            className="bg-white rounded-2xl border border-slate-200/80 p-5 sm:p-6 shadow-xs"
            style={{ animation: 'slideUp 0.45s cubic-bezier(0.16, 1, 0.3, 1) 560ms both' }}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Layers size={16} className="text-brand" />
                <h3 className="text-base font-bold text-slate-900 tracking-tight">
                  Distribución de Stock por Categoría
                </h3>
              </div>
              <span className="text-xs text-slate-400 font-medium">
                {totalCatUnits} unidades físicas totales
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {byCat.map((cat) => {
                const share = totalCatUnits > 0 ? Math.round((cat.units / totalCatUnits) * 100) : 0
                return (
                  <div
                    key={cat.id}
                    className="p-3 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-white hover:border-slate-300 hover:shadow-xs transition-all"
                  >
                    <p className="text-xs font-semibold text-slate-700 truncate mb-1">
                      {cat.name}
                    </p>
                    <p className="text-lg font-bold text-slate-900 font-mono leading-none">
                      {fmtN(cat.units)} <span className="text-[10px] font-normal text-slate-400 font-sans">uds.</span>
                    </p>
                    <div className="mt-2 flex items-center justify-between text-[10px] text-slate-400">
                      <span>{cat.count} SKUs</span>
                      <span className="font-semibold text-slate-600">{share}%</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

      </div>
    </AppLayout>
  )
}
