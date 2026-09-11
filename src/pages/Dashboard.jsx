import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  PieChart, Pie, Cell
} from 'recharts'
import {
  Boxes, TrendingUp, AlertTriangle, DollarSign, Plus, ArrowRight,
  ShoppingCart, ArrowLeftRight, CheckCircle2, ShieldAlert,
  Calendar, Layers, Users, Sparkles, Package
} from 'lucide-react'
import AppLayout from '../components/layout/AppLayout'
import StockBadge from '../components/ui/StockBadge'
import StatusBadge from '../components/ui/StatusBadge'
import { useAuth } from '../context/AuthContext'
import { productsService } from '../services/productsService'
import { salesService } from '../services/salesService'
import { categoriesService } from '../services/categoriesService'
import { clientsService } from '../services/clientsService'

const money = (n) => `S/ ${(Number(n) || 0).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

const PIE_COLORS = ['#2563EB', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#06B6D4', '#64748B']

function CustomBarTooltip({ active, payload, label }) {
  if (active && payload && payload.length) {
    const data = payload[0].payload
    return (
      <div className="bg-white p-3 border border-slate-200 rounded-xl shadow-lg text-xs min-w-[160px]">
        <p className="font-semibold text-ink-primary mb-1">{data.fullName || label}</p>
        <p className="text-brand font-bold text-sm">
          {payload[0].value} {payload[0].value === 1 ? 'unidad vendida' : 'unidades vendidas'}
        </p>
        {data.revenue > 0 && (
          <p className="text-ink-secondary text-[11px] mt-0.5">
            Total generado: <span className="font-medium text-ink-primary">{money(data.revenue)}</span>
          </p>
        )}
      </div>
    )
  }
  return null
}

function CustomPieTooltip({ active, payload }) {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white p-3 border border-slate-200 rounded-xl shadow-lg text-xs min-w-[140px]">
        <p className="font-semibold text-ink-primary mb-1">{payload[0].name}</p>
        <p className="text-ink-secondary">
          Stock: <span className="font-bold text-ink-primary">{payload[0].value}</span> uds.
        </p>
      </div>
    )
  }
  return null
}

function formatShortDate(dateStr) {
  if (!dateStr) return '-'
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return '-'
  return d.toLocaleDateString('es-PE', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function Dashboard() {
  const { user } = useAuth()
  const [products, setProducts] = useState([])
  const [sales, setSales] = useState([])
  const [categories, setCategories] = useState([])
  const [clients, setClients] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      productsService.list(),
      salesService.list(),
      categoriesService.list(),
      clientsService.list(),
    ]).then(([p, s, c, cl]) => {
      setProducts(p || [])
      setSales(s || [])
      setCategories(c || [])
      setClients(cl || [])
      setLoading(false)
    }).catch(() => {
      setLoading(false)
    })
  }, [])

  const stats = useMemo(() => {
    const stockValue = products.reduce((sum, p) => sum + (Number(p.stock) || 0) * (Number(p.cost_price) || 0), 0)
    const retailValue = products.reduce((sum, p) => sum + (Number(p.stock) || 0) * (Number(p.sale_price) || 0), 0)
    const totalUnits = products.reduce((sum, p) => sum + (Number(p.stock) || 0), 0)
    const potentialMargin = retailValue - stockValue

    const lowStock = products.filter((p) => (Number(p.stock) || 0) <= (Number(p.min_stock) || 0))
    const outOfStock = products.filter((p) => (Number(p.stock) || 0) <= 0)

    const now = new Date()
    const monthSales = sales.filter((s) => {
      const d = new Date(s.created_at)
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
    })
    const monthRevenue = monthSales.reduce((sum, s) => sum + salesService.saleTotal(s), 0)
    const avgTicket = monthSales.length > 0 ? monthRevenue / monthSales.length : 0

    return {
      stockValue,
      retailValue,
      totalUnits,
      potentialMargin,
      lowStock,
      outOfStock,
      monthRevenue,
      monthSalesCount: monthSales.length,
      avgTicket,
      totalProducts: products.length,
      totalCategories: categories.length,
      totalClients: clients.length,
    }
  }, [products, sales, categories, clients])

  const topProducts = useMemo(() => {
    const qtyByProduct = {}
    const revByProduct = {}
    sales.forEach((s) => {
      if (Array.isArray(s.items)) {
        s.items.forEach((it) => {
          const pid = it.product_id
          const q = Number(it.quantity) || 0
          const p = Number(it.unit_price) || 0
          qtyByProduct[pid] = (qtyByProduct[pid] || 0) + q
          revByProduct[pid] = (revByProduct[pid] || 0) + q * p
        })
      }
    })
    return Object.entries(qtyByProduct)
      .map(([productId, qty]) => {
        const product = products.find((p) => p.id === productId)
        const name = product?.name || productId
        return {
          fullName: name,
          name: name.length > 15 ? name.slice(0, 15) + '…' : name,
          cantidad: qty,
          revenue: revByProduct[productId] || 0,
        }
      })
      .sort((a, b) => b.cantidad - a.cantidad)
      .slice(0, 6)
  }, [sales, products])

  const stockByCategory = useMemo(() => {
    const totalCatUnits = products.reduce((sum, p) => sum + (Number(p.stock) || 0), 0)
    return categories
      .map((c) => {
        const catProducts = products.filter((p) => p.category_id === c.id)
        const val = catProducts.reduce((sum, p) => sum + (Number(p.stock) || 0), 0)
        return {
          name: c.name,
          value: val,
          percent: totalCatUnits > 0 ? Math.round((val / totalCatUnits) * 100) : 0,
        }
      })
      .filter((c) => c.value > 0)
  }, [categories, products])

  const clientMap = useMemo(() => {
    const map = {}
    clients.forEach((cl) => {
      map[cl.id] = cl.name
    })
    return map
  }, [clients])

  const recentSales = useMemo(() => {
    return [...sales]
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(0, 5)
  }, [sales])

  const lowStockList = useMemo(() => {
    return [...stats.lowStock]
      .sort((a, b) => {
        if (a.stock <= 0 && b.stock > 0) return -1
        if (b.stock <= 0 && a.stock > 0) return 1
        return a.stock - b.stock
      })
      .slice(0, 5)
  }, [stats.lowStock])

  // Current formatted date
  const todayFormatted = useMemo(() => {
    const date = new Date()
    return date.toLocaleDateString('es-PE', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })
  }, [])

  if (loading) {
    return (
      <AppLayout title="Panel de Control">
        <div className="flex flex-col items-center justify-center py-28 text-center">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center mb-4 text-brand animate-spin">
            <Sparkles size={24} />
          </div>
          <p className="font-display font-semibold text-ink-primary text-base">Cargando métricas de la empresa…</p>
          <p className="text-xs text-ink-muted mt-1">Sincronizando inventario, ventas y catálogo en tiempo real.</p>
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout title="Panel de Control">
      <div className="space-y-6">
        {/* =========================================================================
            1. HERO / GREETING BANNER WITH QUICK ACTIONS
           ========================================================================= */}
        <div className="bg-white border border-base-border rounded-2xl p-5 sm:p-7 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-brand bg-brand-dim px-2.5 py-0.5 rounded-full border border-brand/20">
                <Calendar size={12} />
                <span className="capitalize">{todayFormatted}</span>
              </span>
              <span className="inline-flex items-center gap-1 text-xs text-ink-muted font-medium">
                • {user?.role === 'admin' ? 'Administrador' : 'Colaborador'}
              </span>
            </div>
            <h1 className="font-display font-bold text-xl sm:text-2xl text-ink-primary tracking-tight">
              ¡Hola de nuevo, {user?.full_name?.split(' ')[0] || 'Carlos'}! 👋
            </h1>
            <p className="text-xs sm:text-sm text-ink-secondary mt-1 max-w-xl">
              Bienvenido al centro de mando. Aquí tienes el rendimiento en tiempo real de tu almacén, ventas del mes y salud del inventario.
            </p>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <Link to="/ventas" className="btn-primary py-2.5 px-4 shadow-sm hover:shadow-brand/25">
              <ShoppingCart size={16} />
              <span>Nueva Venta</span>
            </Link>
            <Link to="/productos" className="btn-secondary py-2.5 px-3.5">
              <Plus size={16} />
              <span>Nuevo Producto</span>
            </Link>
            <Link to="/movimientos" className="btn-secondary py-2.5 px-3.5" title="Entrada / Salida">
              <ArrowLeftRight size={16} />
              <span className="hidden sm:inline">Movimientos</span>
            </Link>
          </div>
        </div>

        {/* =========================================================================
            2. KEY METRIC STAT CARDS (4 Main Cards)
           ========================================================================= */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Valor de Inventario */}
          <div className="card p-5 bg-white hover:border-slate-300 hover:shadow-sm transition-all group">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center transition-transform group-hover:scale-105">
                <DollarSign size={20} strokeWidth={2.2} />
              </div>
              <span className="text-[11px] font-medium text-emerald-700 bg-emerald-50 border border-emerald-200/60 rounded-full px-2 py-0.5">
                Activo
              </span>
            </div>
            <p className="text-xs font-medium text-ink-secondary">Valor total inventario (costo)</p>
            <p className="text-2xl sm:text-[26px] font-display font-bold text-ink-primary tracking-tight mt-1">
              {money(stats.stockValue)}
            </p>
            <div className="flex items-center justify-between text-[11px] text-ink-muted mt-3 pt-2.5 border-t border-slate-100">
              <span>{stats.totalUnits.toLocaleString()} unidades totales</span>
              <span className="font-semibold text-ink-secondary" title="Valor proyectado de venta">
                PVP {money(stats.retailValue)}
              </span>
            </div>
          </div>

          {/* Card 2: Ventas del Mes */}
          <div className="card p-5 bg-white hover:border-slate-300 hover:shadow-sm transition-all group">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center transition-transform group-hover:scale-105">
                <TrendingUp size={20} strokeWidth={2.2} />
              </div>
              <span className="text-[11px] font-medium text-emerald-700 bg-emerald-50 border border-emerald-200/60 rounded-full px-2 py-0.5">
                Este mes
              </span>
            </div>
            <p className="text-xs font-medium text-ink-secondary">Ventas facturadas del mes</p>
            <p className="text-2xl sm:text-[26px] font-display font-bold text-ink-primary tracking-tight mt-1">
              {money(stats.monthRevenue)}
            </p>
            <div className="flex items-center justify-between text-[11px] text-ink-muted mt-3 pt-2.5 border-t border-slate-100">
              <span>{stats.monthSalesCount} órdenes completadas</span>
              <span className="font-semibold text-ink-secondary">
                Prom. {money(stats.avgTicket)}
              </span>
            </div>
          </div>

          {/* Card 3: Productos Activos */}
          <div className="card p-5 bg-white hover:border-slate-300 hover:shadow-sm transition-all group">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100 flex items-center justify-center transition-transform group-hover:scale-105">
                <Boxes size={20} strokeWidth={2.2} />
              </div>
              <span className="text-[11px] font-medium text-indigo-700 bg-indigo-50 border border-indigo-200/60 rounded-full px-2 py-0.5">
                Catálogo
              </span>
            </div>
            <p className="text-xs font-medium text-ink-secondary">Productos registrados</p>
            <p className="text-2xl sm:text-[26px] font-display font-bold text-ink-primary tracking-tight mt-1">
              {stats.totalProducts} <span className="text-xs font-normal text-ink-muted">SKUs</span>
            </p>
            <div className="flex items-center justify-between text-[11px] text-ink-muted mt-3 pt-2.5 border-t border-slate-100">
              <span>En {stats.totalCategories} categorías</span>
              <span className="text-brand font-semibold hover:underline">
                <Link to="/productos">Gestionar →</Link>
              </span>
            </div>
          </div>

          {/* Card 4: Alertas de Stock Bajo */}
          <div className="card p-5 bg-white hover:border-slate-300 hover:shadow-sm transition-all group">
            <div className="flex items-center justify-between mb-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-transform group-hover:scale-105 border ${
                stats.lowStock.length > 0
                  ? 'bg-amber-50 text-amber-600 border-amber-200/80'
                  : 'bg-emerald-50 text-emerald-600 border-emerald-100'
              }`}>
                {stats.lowStock.length > 0 ? (
                  <AlertTriangle size={20} strokeWidth={2.2} />
                ) : (
                  <CheckCircle2 size={20} strokeWidth={2.2} />
                )}
              </div>
              <span className={`text-[11px] font-medium rounded-full px-2 py-0.5 border ${
                stats.lowStock.length > 0
                  ? 'text-amber-800 bg-amber-50 border-amber-200'
                  : 'text-emerald-700 bg-emerald-50 border-emerald-200/60'
              }`}>
                {stats.lowStock.length > 0 ? 'Atención' : 'Óptimo'}
              </span>
            </div>
            <p className="text-xs font-medium text-ink-secondary">Alertas de inventario</p>
            <p className={`text-2xl sm:text-[26px] font-display font-bold tracking-tight mt-1 ${
              stats.lowStock.length > 0 ? 'text-amber-600' : 'text-emerald-600'
            }`}>
              {stats.lowStock.length} <span className="text-xs font-normal text-ink-muted">artículos</span>
            </p>
            <div className="flex items-center justify-between text-[11px] text-ink-muted mt-3 pt-2.5 border-t border-slate-100">
              {stats.outOfStock.length > 0 ? (
                <span className="text-bad font-medium">{stats.outOfStock.length} agotados en 0</span>
              ) : (
                <span>Sin quiebres críticos</span>
              )}
              {stats.lowStock.length > 0 && (
                <span className="text-amber-600 font-semibold hover:underline">
                  <Link to="/movimientos">Reponer →</Link>
                </span>
              )}
            </div>
          </div>
        </div>

        {/* =========================================================================
            3. SECONDARY STATS BAR (Compact Health Indicators)
           ========================================================================= */}
        <div className="bg-white border border-base-border rounded-xl p-3 sm:p-4 shadow-xs grid grid-cols-2 md:grid-cols-4 gap-3 text-center sm:text-left">
          <div className="px-3 border-r border-slate-100 last:border-0">
            <p className="text-[11px] font-medium text-ink-muted">Cartera de clientes</p>
            <p className="text-base sm:text-lg font-display font-bold text-ink-primary mt-0.5">
              {stats.totalClients} <span className="text-xs font-normal text-ink-secondary">clientes registrados</span>
            </p>
          </div>
          <div className="px-3 border-r border-slate-100 last:border-0">
            <p className="text-[11px] font-medium text-ink-muted">Ganancia bruta potencial</p>
            <p className="text-base sm:text-lg font-display font-bold text-emerald-600 mt-0.5">
              +{money(stats.potentialMargin)}
            </p>
          </div>
          <div className="px-3 border-r border-slate-100 last:border-0">
            <p className="text-[11px] font-medium text-ink-muted">Disponibilidad de stock</p>
            <p className="text-base sm:text-lg font-display font-bold text-ink-primary mt-0.5">
              {stats.totalProducts > 0
                ? Math.round(((stats.totalProducts - stats.lowStock.length) / stats.totalProducts) * 100)
                : 100}% <span className="text-xs font-normal text-ink-secondary">abastecido</span>
            </p>
          </div>
          <div className="px-3">
            <p className="text-[11px] font-medium text-ink-muted">Promedio de rotación</p>
            <p className="text-base sm:text-lg font-display font-bold text-brand mt-0.5">
              {stats.monthSalesCount > 0 ? (stats.totalUnits / Math.max(stats.monthSalesCount, 1)).toFixed(1) : '0.0'} <span className="text-xs font-normal text-ink-secondary">uds/orden</span>
            </p>
          </div>
        </div>

        {/* =========================================================================
            4. CHARTS SECTION (2 Columns: Bar Chart & Donut Chart)
           ========================================================================= */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Bar Chart: Productos Más Vendidos */}
          <div className="card p-5 sm:p-6 bg-white lg:col-span-2 flex flex-col justify-between">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
              <div>
                <h2 className="font-display font-bold text-ink-primary text-base sm:text-lg">
                  Productos Más Vendidos
                </h2>
                <p className="text-xs text-ink-muted mt-0.5">
                  Artículos con mayor demanda histórica en ventas
                </p>
              </div>
              <span className="self-start sm:self-auto text-xs font-medium text-ink-secondary bg-slate-100 px-2.5 py-1 rounded-lg">
                Top {topProducts.length} productos
              </span>
            </div>

            {topProducts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="w-12 h-12 rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center text-ink-muted mb-3">
                  <Package size={22} />
                </div>
                <p className="text-sm font-semibold text-ink-primary">Aún no hay ventas registradas</p>
                <p className="text-xs text-ink-muted mt-1 max-w-xs">
                  A medida que se procesen órdenes de compra y venta, aquí verás la rotación de tus artículos más demandados.
                </p>
                <Link to="/ventas" className="btn-primary text-xs mt-4">
                  Registrar Primera Venta
                </Link>
              </div>
            ) : (
              <div className="w-full h-[270px] sm:h-[290px] mt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={topProducts}
                    layout="vertical"
                    margin={{ left: 0, right: 20, top: 5, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" horizontal={false} />
                    <XAxis
                      type="number"
                      stroke="#94A3B8"
                      fontSize={11}
                      tickLine={false}
                      axisLine={{ stroke: '#E2E8F0' }}
                    />
                    <YAxis
                      type="category"
                      dataKey="name"
                      stroke="#475569"
                      fontSize={12}
                      width={120}
                      tickLine={false}
                      axisLine={{ stroke: '#E2E8F0' }}
                    />
                    <Tooltip content={<CustomBarTooltip />} cursor={{ fill: '#F1F5F9' }} />
                    <Bar
                      dataKey="cantidad"
                      fill="#2563EB"
                      radius={[0, 6, 6, 0]}
                      barSize={18}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* Donut Chart: Stock por Categoría */}
          <div className="card p-5 sm:p-6 bg-white flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <div>
                <h2 className="font-display font-bold text-ink-primary text-base sm:text-lg">
                  Stock por Categoría
                </h2>
                <p className="text-xs text-ink-muted mt-0.5">
                  Distribución de inventario físico
                </p>
              </div>
              <div className="w-7 h-7 rounded-lg bg-blue-50 text-brand flex items-center justify-center">
                <Layers size={15} />
              </div>
            </div>

            {stockByCategory.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <p className="text-sm font-semibold text-ink-primary">Sin datos de categorías</p>
                <p className="text-xs text-ink-muted mt-1">Crea categorías y asigna productos para ver la distribución.</p>
              </div>
            ) : (
              <>
                <div className="w-full h-[220px] relative flex items-center justify-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={stockByCategory}
                        dataKey="value"
                        nameKey="name"
                        innerRadius={58}
                        outerRadius={84}
                        paddingAngle={3}
                      >
                        {stockByCategory.map((_, i) => (
                          <Cell
                            key={i}
                            fill={PIE_COLORS[i % PIE_COLORS.length]}
                            stroke="#FFFFFF"
                            strokeWidth={2}
                          />
                        ))}
                      </Pie>
                      <Tooltip content={<CustomPieTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                  {/* Center Text inside Donut */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-xl font-display font-bold text-ink-primary">
                      {stats.totalUnits}
                    </span>
                    <span className="text-[10px] text-ink-muted uppercase tracking-wider font-semibold">
                      Uds. totales
                    </span>
                  </div>
                </div>

                {/* Categories Legend Chips */}
                <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-slate-100 justify-center">
                  {stockByCategory.map((c, i) => (
                    <div
                      key={c.name}
                      className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-100 text-[11px] text-ink-secondary font-medium"
                    >
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0 shadow-xs"
                        style={{ background: PIE_COLORS[i % PIE_COLORS.length] }}
                      />
                      <span className="truncate max-w-[90px]">{c.name}</span>
                      <span className="text-ink-muted font-normal">({c.value})</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {/* =========================================================================
            5. ACTIONABLE DETAILS SECTION (2 Columns: Low Stock & Recent Sales)
           ========================================================================= */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Column 1: Critical Stock / Low Stock Table */}
          <div className="card bg-white overflow-hidden flex flex-col">
            <div className="p-4 sm:p-5 border-b border-base-border flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 border border-amber-200/60 flex items-center justify-center">
                  <ShieldAlert size={16} />
                </div>
                <div>
                  <h3 className="font-display font-bold text-ink-primary text-sm sm:text-base">
                    Atención: Stock Bajo / Agotado
                  </h3>
                  <p className="text-[11px] text-ink-muted">
                    {stats.lowStock.length} de {products.length} productos en nivel de reorden
                  </p>
                </div>
              </div>
              <Link
                to="/movimientos"
                className="text-xs font-semibold text-brand hover:text-brand-hover flex items-center gap-1"
              >
                Reponer stock <ArrowRight size={13} />
              </Link>
            </div>

            {lowStockList.length === 0 ? (
              <div className="p-8 text-center flex flex-col items-center justify-center my-auto">
                <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center mb-2">
                  <CheckCircle2 size={20} />
                </div>
                <p className="text-sm font-semibold text-ink-primary">Inventario completamente saludable</p>
                <p className="text-xs text-ink-muted mt-0.5">Ningún producto está por debajo del umbral de seguridad.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr>
                      <th className="th">SKU / Producto</th>
                      <th className="th text-center">Nivel Stock</th>
                      <th className="th text-right">Estado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {lowStockList.map((p) => {
                      const percentage = Math.min(Math.round((p.stock / Math.max(p.min_stock, 1)) * 100), 100)
                      return (
                        <tr key={p.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="td py-3">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-[11px] bg-slate-100 text-ink-secondary px-1.5 py-0.5 rounded border border-slate-200">
                                {p.sku}
                              </span>
                              <span className="font-medium text-ink-primary truncate max-w-[150px] sm:max-w-[200px]">
                                {p.name}
                              </span>
                            </div>
                          </td>
                          <td className="td py-3 text-center">
                            <div className="inline-flex flex-col items-center min-w-[90px]">
                              <span className="text-xs font-bold text-ink-primary">
                                {p.stock} <span className="font-normal text-[10px] text-ink-muted">/ mín {p.min_stock}</span>
                              </span>
                              <div className="w-full bg-slate-100 rounded-full h-1.5 mt-1 overflow-hidden">
                                <div
                                  className={`h-full rounded-full ${
                                    p.stock <= 0 ? 'bg-bad' : percentage < 50 ? 'bg-amber-500' : 'bg-emerald-500'
                                  }`}
                                  style={{ width: `${Math.max(percentage, 5)}%` }}
                                />
                              </div>
                            </div>
                          </td>
                          <td className="td py-3 text-right">
                            <StockBadge stock={p.stock} minStock={p.min_stock} />
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Column 2: Recent Sales Activity */}
          <div className="card bg-white overflow-hidden flex flex-col">
            <div className="p-4 sm:p-5 border-b border-base-border flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-brand border border-blue-100 flex items-center justify-center">
                  <ShoppingCart size={16} />
                </div>
                <div>
                  <h3 className="font-display font-bold text-ink-primary text-sm sm:text-base">
                    Últimas Ventas Registradas
                  </h3>
                  <p className="text-[11px] text-ink-muted">
                    Transacciones y facturación reciente
                  </p>
                </div>
              </div>
              <Link
                to="/ventas"
                className="text-xs font-semibold text-brand hover:text-brand-hover flex items-center gap-1"
              >
                Ver todas <ArrowRight size={13} />
              </Link>
            </div>

            {recentSales.length === 0 ? (
              <div className="p-8 text-center flex flex-col items-center justify-center my-auto">
                <div className="w-10 h-10 rounded-full bg-slate-50 text-ink-muted border border-slate-200 flex items-center justify-center mb-2">
                  <ShoppingCart size={18} />
                </div>
                <p className="text-sm font-semibold text-ink-primary">Aún no hay ventas en el sistema</p>
                <p className="text-xs text-ink-muted mt-0.5">Emite tu primera venta para comenzar el historial.</p>
                <Link to="/ventas" className="btn-primary text-xs mt-3">
                  + Registrar Venta
                </Link>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {recentSales.map((sale) => {
                  const clientName = clientMap[sale.client_id] || 'Cliente Casual'
                  const total = salesService.saleTotal(sale)
                  const itemsCount = sale.items?.reduce((s, it) => s + it.quantity, 0) || 0

                  return (
                    <div
                      key={sale.id}
                      className="p-3.5 sm:p-4 hover:bg-slate-50/70 transition-colors flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-xl bg-slate-100 border border-slate-200/80 flex items-center justify-center text-xs font-bold text-ink-secondary shrink-0">
                          {clientName.slice(0, 2).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs sm:text-sm font-semibold text-ink-primary truncate">
                            {clientName}
                          </p>
                          <p className="text-[11px] text-ink-muted flex items-center gap-1.5">
                            <span>{formatShortDate(sale.created_at)}</span>
                            <span>•</span>
                            <span>{itemsCount} {itemsCount === 1 ? 'artículo' : 'artículos'}</span>
                          </p>
                        </div>
                      </div>

                      <div className="text-right shrink-0 flex flex-col items-end gap-1">
                        <span className="font-display font-bold text-sm text-ink-primary">
                          {money(total)}
                        </span>
                        <StatusBadge status={sale.status || 'pagado'} />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  )
}
