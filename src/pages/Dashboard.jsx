import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  PieChart, Pie, Cell
} from 'recharts'
import {
  Boxes, TrendingUp, AlertTriangle, DollarSign, Plus, ArrowRight,
  ShoppingCart, ArrowLeftRight, CheckCircle2, ShieldAlert,
  Calendar, Layers, Package, ArrowUpRight
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

const money = (n) => `S/ ${(Number(n)||0).toLocaleString('es-PE',{minimumFractionDigits:2,maximumFractionDigits:2})}`
const PIE_COLORS = ['#1B4FD8','#0D9166','#CA8A04','#7C3AED','#DB2777','#0891B2','#64748B']

const todayStr = () => new Date().toLocaleDateString('es-PE', { weekday:'long', day:'numeric', month:'long', year:'numeric' })
const shortDate = (iso) => {
  if (!iso) return '—'
  const d = new Date(iso)
  return isNaN(d) ? '—' : d.toLocaleDateString('es-PE',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'})
}

function BarTooltip({ active, payload }) {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  return (
    <div className="bg-white border border-base-border rounded-xl shadow-card px-3.5 py-2.5 text-xs min-w-[160px]">
      <p className="font-semibold text-ink-primary mb-1">{d.fullName}</p>
      <p className="text-brand font-bold text-sm">{payload[0].value} uds.</p>
      {d.revenue > 0 && <p className="text-ink-muted mt-0.5">Total: <span className="font-medium text-ink-secondary">{money(d.revenue)}</span></p>}
    </div>
  )
}
function PieTooltip({ active, payload }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-base-border rounded-xl shadow-card px-3.5 py-2.5 text-xs">
      <p className="font-semibold text-ink-primary mb-1">{payload[0].name}</p>
      <p className="text-ink-secondary">Stock: <span className="font-bold text-ink-primary">{payload[0].value}</span> uds.</p>
    </div>
  )
}

function KPICard({ icon: Icon, iconCls, label, value, badge, footer }) {
  return (
    <div className="bg-white border border-base-border rounded-2xl p-5 shadow-sm hover:shadow-card hover:-translate-y-0.5 transition-all duration-200 group cursor-default flex flex-col gap-4">
      <div className="flex items-start justify-between">
        <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform duration-200 ${iconCls}`}>
          <Icon size={20} strokeWidth={2} />
        </div>
        {badge}
      </div>
      <div>
        <p className="text-2xs font-bold text-ink-muted mb-1.5 uppercase tracking-widest">{label}</p>
        <p className="text-2xl font-display font-bold text-ink-primary tracking-tight leading-none">{value}</p>
      </div>
      {footer && (
        <div className="flex items-center justify-between text-xs text-ink-muted pt-3 border-t border-base-border">
          {footer}
        </div>
      )}
    </div>
  )
}

function LoadingCard() {
  return (
    <div className="bg-white border border-base-border rounded-2xl p-5 shadow-sm space-y-4">
      <div className="skeleton w-11 h-11 rounded-xl" />
      <div className="space-y-2">
        <div className="skeleton w-24 h-3 rounded" />
        <div className="skeleton w-32 h-7 rounded-lg" />
      </div>
      <div className="skeleton w-full h-3 rounded pt-3 border-t border-base-border" />
    </div>
  )
}

export default function Dashboard() {
  const { user } = useAuth()
  const [products, setProducts]     = useState([])
  const [sales, setSales]           = useState([])
  const [categories, setCategories] = useState([])
  const [clients, setClients]       = useState([])
  const [purchases, setPurchases]   = useState([])
  const [loading, setLoading]       = useState(true)

  useEffect(() => {
    Promise.all([
      productsService.list(), salesService.list(),
      categoriesService.list(), clientsService.list(), purchasesService.list(),
    ]).then(([p,s,c,cl,pu]) => {
      setProducts(p||[]); setSales(s||[]); setCategories(c||[])
      setClients(cl||[]); setPurchases(pu||[])
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  const stats = useMemo(() => {
    const totalInvested = purchases
      .filter(p => p.status === 'recibido')
      .reduce((sum,p) => sum + purchasesService.purchaseTotal(p), 0)
    const totalUnits = products.reduce((sum,p) => sum + (Number(p.stock)||0), 0)
    const lowStock   = products.filter(p => (Number(p.stock)||0) <= (Number(p.min_stock)||0))
    const outOfStock = products.filter(p => (Number(p.stock)||0) <= 0)
    const now = new Date()
    const monthSales = sales.filter(s => {
      const d = new Date(s.created_at)
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
    })
    const monthRevenue = monthSales.reduce((sum,s) => sum + salesService.saleTotal(s), 0)
    const avgTicket = monthSales.length > 0 ? monthRevenue / monthSales.length : 0
    return {
      totalInvested, totalUnits, lowStock, outOfStock, monthRevenue,
      monthSalesCount: monthSales.length, avgTicket,
      totalProducts: products.length, totalCategories: categories.length, totalClients: clients.length
    }
  }, [products, sales, purchases, categories, clients])

  const topProducts = useMemo(() => {
    const qty = {}, rev = {}
    sales.forEach(s => {
      if (Array.isArray(s.items)) s.items.forEach(it => {
        const q = Number(it.quantity)||0, p = Number(it.unit_price)||0
        qty[it.product_id] = (qty[it.product_id]||0) + q
        rev[it.product_id] = (rev[it.product_id]||0) + q * p
      })
    })
    return Object.entries(qty).map(([pid,q]) => {
      const name = products.find(p => p.id === pid)?.name || pid
      return { fullName: name, name: name.length > 18 ? name.slice(0,18)+'…' : name, cantidad: q, revenue: rev[pid]||0 }
    }).sort((a,b) => b.cantidad - a.cantidad).slice(0,6)
  }, [sales, products])

  const stockByCategory = useMemo(() =>
    categories.map(c => ({
      name: c.name,
      value: products.filter(p => !p.is_kit && p.category_id === c.id).reduce((s,p) => s + p.stock, 0)
    })).filter(c => c.value > 0)
  , [categories, products])

  const totalStockUnits = stockByCategory.reduce((s,c) => s + c.value, 0)
  const clientMap = useMemo(() => { const m={}; clients.forEach(cl => m[cl.id]=cl.name); return m }, [clients])
  const recentSales = useMemo(() => [...sales].sort((a,b) => new Date(b.created_at)-new Date(a.created_at)).slice(0,5), [sales])
  const lowStockList = useMemo(() => [...stats.lowStock].sort((a,b) => {
    if (a.stock<=0&&b.stock>0) return -1
    if (b.stock<=0&&a.stock>0) return 1
    return a.stock - b.stock
  }).slice(0,5), [stats.lowStock])

  return (
    <AppLayout title="Panel de Control">
      <div className="space-y-5">

        {/* ══ WELCOME BANNER ══ */}
        <div className="relative overflow-hidden bg-gradient-to-br from-brand to-brand-hover rounded-2xl p-5 sm:p-7 text-white shadow-card">
          {/* decorative circles */}
          <div className="absolute -top-8 -right-8 w-56 h-56 rounded-full bg-white/5 pointer-events-none" />
          <div className="absolute top-4 right-24 w-24 h-24 rounded-full bg-white/5 pointer-events-none" />
          <div className="absolute -bottom-10 left-1/3 w-40 h-40 rounded-full bg-white/[0.04] pointer-events-none" />

          <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-5">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <span className="inline-flex items-center gap-1.5 text-2xs font-semibold text-blue-100 bg-white/15 border border-white/20 px-2.5 py-1 rounded-full">
                  <Calendar size={10} />
                  <span className="capitalize">{todayStr()}</span>
                </span>
              </div>
              <h2 className="font-display font-bold text-2xl sm:text-3xl text-white tracking-tight">
                ¡Bienvenido, {user?.full_name?.split(' ')[0] || 'Carlos'}! 👋
              </h2>
              <p className="text-blue-100/80 text-sm mt-2 max-w-md leading-relaxed">
                Resumen del sistema — inventario, ventas y alertas al instante.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <Link to="/ventas"
                className="inline-flex items-center gap-2 bg-white text-brand text-sm font-bold px-4 py-2.5 rounded-xl shadow-sm hover:shadow-md hover:-translate-y-px active:scale-95 transition-all duration-150">
                <ShoppingCart size={14} /> Nueva Venta
              </Link>
              <Link to="/productos"
                className="inline-flex items-center gap-2 bg-white/15 border border-white/25 text-white text-sm font-semibold px-3.5 py-2.5 rounded-xl hover:bg-white/25 active:scale-95 transition-all duration-150">
                <Plus size={14} /> Producto
              </Link>
              <Link to="/movimientos"
                className="inline-flex items-center gap-2 bg-white/15 border border-white/25 text-white text-sm font-semibold px-3.5 py-2.5 rounded-xl hover:bg-white/25 active:scale-95 transition-all duration-150">
                <ArrowLeftRight size={14} />
                <span className="hidden sm:inline">Movimientos</span>
              </Link>
            </div>
          </div>
        </div>

        {/* ══ 4 KPI CARDS ══ */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1,2,3,4].map(i => <LoadingCard key={i} />)}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <KPICard
              icon={DollarSign}
              iconCls="bg-blue-50 text-brand"
              label="Invertido en compras"
              value={money(stats.totalInvested)}
              badge={<span className="badge badge-green">Activo</span>}
              footer={<span>{stats.totalUnits.toLocaleString()} unidades totales</span>}
            />
            <KPICard
              icon={TrendingUp}
              iconCls="bg-emerald-50 text-good"
              label="Ventas del mes"
              value={money(stats.monthRevenue)}
              badge={<span className="badge badge-blue">Este mes</span>}
              footer={
                <>
                  <span>{stats.monthSalesCount} órdenes</span>
                  <span className="font-semibold text-ink-secondary">Prom. {money(stats.avgTicket)}</span>
                </>
              }
            />
            <KPICard
              icon={Boxes}
              iconCls="bg-violet-50 text-violet-600"
              label="Productos en catálogo"
              value={<>{stats.totalProducts} <span className="text-sm font-normal text-ink-muted">SKUs</span></>}
              badge={<span className="badge badge-slate">{stats.totalCategories} cat.</span>}
              footer={
                <>
                  <span>{stats.totalCategories} categorías</span>
                  <Link to="/productos" className="text-brand font-bold hover:underline text-xs flex items-center gap-0.5">
                    Gestionar <ArrowUpRight size={11} />
                  </Link>
                </>
              }
            />
            <KPICard
              icon={stats.lowStock.length > 0 ? AlertTriangle : CheckCircle2}
              iconCls={stats.lowStock.length > 0 ? 'bg-amber-50 text-warn' : 'bg-emerald-50 text-good'}
              label="Alertas de stock"
              value={
                <span className={stats.lowStock.length > 0 ? 'text-warn' : 'text-good'}>
                  {stats.lowStock.length} <span className="text-sm font-normal text-ink-muted">artículos</span>
                </span>
              }
              badge={
                <span className={`badge ${stats.lowStock.length > 0 ? 'badge-amber' : 'badge-green'}`}>
                  {stats.lowStock.length > 0 ? 'Atención' : 'Óptimo'}
                </span>
              }
              footer={
                <>
                  {stats.outOfStock.length > 0
                    ? <span className="text-bad font-semibold">{stats.outOfStock.length} agotados</span>
                    : <span>Sin quiebres críticos</span>
                  }
                  {stats.lowStock.length > 0 && (
                    <Link to="/movimientos" className="text-warn font-bold hover:underline text-xs flex items-center gap-0.5">
                      Reponer <ArrowUpRight size={11} />
                    </Link>
                  )}
                </>
              }
            />
          </div>
        )}

        {/* ══ SECONDARY METRICS ══ */}
        {!loading && (
          <div className="bg-white border border-base-border rounded-xl shadow-sm overflow-hidden">
            <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-base-border">
              {[
                { label: 'Cartera de clientes',     val: stats.totalClients,   unit: 'clientes' },
                {
                  label: 'Disponibilidad de stock',
                  val: `${stats.totalProducts > 0 ? Math.round(((stats.totalProducts - stats.lowStock.length) / stats.totalProducts) * 100) : 100}%`,
                  unit: 'abastecido'
                },
                {
                  label: 'Promedio de rotación',
                  val: stats.monthSalesCount > 0 ? (stats.totalUnits / Math.max(stats.monthSalesCount,1)).toFixed(1) : '0.0',
                  unit: 'uds/orden'
                },
              ].map(({ label, val, unit }) => (
                <div key={label} className="px-5 py-4">
                  <p className="text-2xs font-bold text-ink-muted uppercase tracking-widest mb-1.5">{label}</p>
                  <p className="font-display font-bold text-xl text-ink-primary">
                    {val} <span className="text-sm font-normal text-ink-muted">{unit}</span>
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ══ CHARTS ══ */}
        {!loading && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* Bar chart */}
            <div className="bg-white border border-base-border rounded-2xl shadow-sm lg:col-span-2 flex flex-col overflow-hidden">
              <div className="card-header">
                <div>
                  <h2 className="font-display font-bold text-ink-primary text-lg tracking-tight">Productos Más Vendidos</h2>
                  <p className="text-xs text-ink-muted mt-0.5">Artículos con mayor rotación histórica</p>
                </div>
                <span className="badge badge-slate">Top {topProducts.length}</span>
              </div>
              <div className="p-5 sm:p-6 flex-1">
                {topProducts.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-52">
                    <div className="w-12 h-12 rounded-2xl bg-base-raised border border-base-border flex items-center justify-center text-ink-muted mb-3">
                      <Package size={22} strokeWidth={1.5} />
                    </div>
                    <p className="text-sm font-semibold text-ink-primary">Sin ventas registradas</p>
                    <p className="text-xs text-ink-muted mt-1">Registra ventas para ver la rotación.</p>
                  </div>
                ) : (
                  <div className="w-full h-[240px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={topProducts} layout="vertical" margin={{ left:0, right:24, top:4, bottom:4 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#E8EDF5" horizontal={false} />
                        <XAxis type="number" stroke="#8A96AD" fontSize={11} tickLine={false} axisLine={false} />
                        <YAxis type="category" dataKey="name" stroke="#3D4A63" fontSize={12} width={120} tickLine={false} axisLine={false} />
                        <Tooltip content={<BarTooltip />} cursor={{ fill:'rgba(27,79,216,0.04)' }} />
                        <Bar dataKey="cantidad" fill="#1B4FD8" radius={[0,6,6,0]} barSize={14} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>
            </div>

            {/* Donut */}
            <div className="bg-white border border-base-border rounded-2xl shadow-sm flex flex-col overflow-hidden">
              <div className="card-header">
                <div>
                  <h2 className="font-display font-bold text-ink-primary text-lg tracking-tight">Stock por Categoría</h2>
                  <p className="text-xs text-ink-muted mt-0.5">Distribución del inventario</p>
                </div>
                <div className="w-8 h-8 rounded-xl bg-blue-50 text-brand flex items-center justify-center">
                  <Layers size={15} />
                </div>
              </div>
              <div className="p-5 flex-1 flex flex-col">
                {stockByCategory.length === 0 ? (
                  <div className="flex flex-col items-center justify-center flex-1 h-48">
                    <p className="text-sm font-semibold text-ink-primary">Sin datos</p>
                    <p className="text-xs text-ink-muted mt-1">Crea categorías y asigna productos.</p>
                  </div>
                ) : (
                  <>
                    <div className="relative w-full h-[180px] flex items-center justify-center">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={stockByCategory} dataKey="value" nameKey="name" innerRadius={52} outerRadius={76} paddingAngle={3}>
                            {stockByCategory.map((_,i) => <Cell key={i} fill={PIE_COLORS[i%PIE_COLORS.length]} stroke="transparent" />)}
                          </Pie>
                          <Tooltip content={<PieTooltip />} />
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                        <span className="text-xl font-display font-bold text-ink-primary">{totalStockUnits}</span>
                        <span className="text-2xs text-ink-muted uppercase tracking-widest font-semibold">Uds.</span>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-1.5 mt-3 pt-3 border-t border-base-border justify-center">
                      {stockByCategory.map((c,i) => (
                        <div key={c.name} className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-base-raised border border-base-border text-2xs text-ink-secondary font-medium">
                          <span className="w-2 h-2 rounded-full shrink-0" style={{ background: PIE_COLORS[i%PIE_COLORS.length] }} />
                          <span className="truncate max-w-[70px]">{c.name}</span>
                          <span className="text-ink-muted">({c.value})</span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ══ BOTTOM TABLES ══ */}
        {!loading && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

            {/* Low stock */}
            <div className="card-section flex flex-col">
              <div className="card-header">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-amber-50 text-warn border border-amber-100 flex items-center justify-center shrink-0">
                    <ShieldAlert size={16} />
                  </div>
                  <div>
                    <h3 className="font-display font-bold text-ink-primary text-base">Stock Bajo / Agotado</h3>
                    <p className="text-2xs text-ink-muted">{stats.lowStock.length} de {products.length} en nivel de reorden</p>
                  </div>
                </div>
                <Link to="/movimientos" className="text-xs font-bold text-brand hover:underline flex items-center gap-1">
                  Reponer <ArrowRight size={11} />
                </Link>
              </div>
              {lowStockList.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-10">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-good border border-emerald-100 flex items-center justify-center mb-3">
                    <CheckCircle2 size={18} />
                  </div>
                  <p className="text-sm font-semibold text-ink-primary">Inventario saludable</p>
                  <p className="text-xs text-ink-muted mt-1">Ningún producto bajo el umbral mínimo.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr>
                        <th className="th">SKU / Producto</th>
                        <th className="th text-center">Nivel</th>
                        <th className="th text-right">Estado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {lowStockList.map(p => {
                        const pct = Math.min(Math.round((p.stock/Math.max(p.min_stock,1))*100),100)
                        return (
                          <tr key={p.id} className="tr-hover">
                            <td className="td py-3">
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-2xs bg-base-raised text-ink-muted px-1.5 py-0.5 rounded border border-base-border">{p.sku}</span>
                                <span className="font-medium text-sm truncate max-w-[130px]">{p.name}</span>
                              </div>
                            </td>
                            <td className="td py-3">
                              <div className="flex flex-col items-center min-w-[80px] mx-auto">
                                <span className="text-xs font-bold text-ink-primary">{p.stock} <span className="font-normal text-2xs text-ink-muted">/ mín {p.min_stock}</span></span>
                                <div className="w-full bg-slate-100 rounded-full h-1.5 mt-1 overflow-hidden">
                                  <div
                                    className={`h-full rounded-full transition-all ${p.stock<=0?'bg-bad':pct<50?'bg-warn':'bg-good'}`}
                                    style={{ width:`${Math.max(pct,4)}%` }}
                                  />
                                </div>
                              </div>
                            </td>
                            <td className="td py-3 text-right"><StockBadge stock={p.stock} minStock={p.min_stock} /></td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Recent sales */}
            <div className="card-section flex flex-col">
              <div className="card-header">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-blue-50 text-brand border border-blue-100 flex items-center justify-center shrink-0">
                    <ShoppingCart size={16} />
                  </div>
                  <div>
                    <h3 className="font-display font-bold text-ink-primary text-base">Últimas Ventas</h3>
                    <p className="text-2xs text-ink-muted">Transacciones recientes</p>
                  </div>
                </div>
                <Link to="/ventas" className="text-xs font-bold text-brand hover:underline flex items-center gap-1">
                  Ver todas <ArrowRight size={11} />
                </Link>
              </div>
              {recentSales.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-10">
                  <div className="w-10 h-10 rounded-2xl bg-base-raised border border-base-border flex items-center justify-center mb-3">
                    <ShoppingCart size={18} className="text-ink-muted" strokeWidth={1.5} />
                  </div>
                  <p className="text-sm font-semibold text-ink-primary">Sin ventas aún</p>
                  <p className="text-xs text-ink-muted mt-1">Registra tu primera venta para verla aquí.</p>
                </div>
              ) : (
                <div className="divide-y divide-base-border">
                  {recentSales.map(sale => {
                    const clientName = clientMap[sale.client_id] || sale.client_name || 'Cliente'
                    const total = salesService.saleTotal(sale)
                    const itemsCount = sale.items?.reduce((s,it) => s+it.quantity, 0)||0
                    const initials = clientName.slice(0,2).toUpperCase()
                    return (
                      <div key={sale.id} className="px-4 py-3.5 hover:bg-brand-dim transition-colors flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-xs font-bold text-brand shrink-0 font-display">
                            {initials}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-ink-primary truncate">{clientName}</p>
                            <p className="text-xs text-ink-muted">{shortDate(sale.created_at)} · {itemsCount} art.</p>
                          </div>
                        </div>
                        <div className="text-right shrink-0 flex flex-col items-end gap-1">
                          <span className="font-display font-bold text-sm text-ink-primary">{money(total)}</span>
                          <StatusBadge status={sale.status || 'pagado'} />
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

          </div>
        )}

      </div>
    </AppLayout>
  )
}
