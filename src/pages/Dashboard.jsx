import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  PieChart, Pie, Cell
} from 'recharts'
import {
  Boxes, TrendingUp, AlertTriangle, DollarSign, Plus, ArrowRight,
  ShoppingCart, ArrowLeftRight, CheckCircle2, ShieldAlert,
  Calendar, Layers, Sparkles, Package, ArrowUpRight
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

const PIE_COLORS = ['#2563EB','#059669','#D97706','#8B5CF6','#EC4899','#06B6D4','#64748B']

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

function KPICard({ icon: Icon, iconBg, label, value, badge, footer, trend }) {
  return (
    <div className="bg-white border border-base-border rounded-2xl p-5 shadow-xs hover:shadow-card hover:-translate-y-0.5 transition-all duration-200 cursor-default group">
      <div className="flex items-start justify-between mb-4">
        <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 transition-transform duration-200 group-hover:scale-105 ${iconBg}`}>
          <Icon size={20} strokeWidth={2} />
        </div>
        {badge}
      </div>
      <p className="text-[11.5px] font-semibold text-ink-muted mb-1 uppercase tracking-wide">{label}</p>
      <p className="text-2xl sm:text-[26px] font-display font-bold text-ink-primary tracking-tight leading-none">{value}</p>
      {footer && (
        <div className="flex items-center justify-between text-[11px] text-ink-muted mt-4 pt-3.5 border-t border-base-border">
          {footer}
        </div>
      )}
    </div>
  )
}

function Spinner() {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="w-10 h-10 rounded-2xl bg-brand/8 border border-brand/20 flex items-center justify-center mb-4">
        <Sparkles size={20} className="text-brand animate-pulse" />
      </div>
      <p className="font-semibold text-ink-primary">Cargando métricas…</p>
      <p className="text-xs text-ink-muted mt-1">Sincronizando inventario y ventas</p>
    </div>
  )
}

const todayStr = () => new Date().toLocaleDateString('es-PE', { weekday:'long', day:'numeric', month:'long', year:'numeric' })
const shortDate = (iso) => {
  if (!iso) return '—'
  const d = new Date(iso)
  return isNaN(d) ? '—' : d.toLocaleDateString('es-PE',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'})
}

export default function Dashboard() {
  const { user } = useAuth()
  const [products, setProducts]   = useState([])
  const [sales, setSales]         = useState([])
  const [categories, setCategories] = useState([])
  const [clients, setClients]     = useState([])
  const [purchases, setPurchases] = useState([])
  const [loading, setLoading]     = useState(true)

  useEffect(() => {
    Promise.all([
      productsService.list(), salesService.list(),
      categoriesService.list(), clientsService.list(), purchasesService.list(),
    ]).then(([p,s,c,cl,pu]) => {
      setProducts(p||[]); setSales(s||[]); setCategories(c||[])
      setClients(cl||[]); setPurchases(pu||[])
      setLoading(false)
    }).catch(()=>setLoading(false))
  }, [])

  const stats = useMemo(() => {
    const totalInvested = purchases
      .filter(p=>p.status==='recibido')
      .reduce((sum,p)=>sum+purchasesService.purchaseTotal(p),0)
    const totalUnits = products.reduce((sum,p)=>sum+(Number(p.stock)||0),0)
    const lowStock   = products.filter(p=>(Number(p.stock)||0)<=(Number(p.min_stock)||0))
    const outOfStock = products.filter(p=>(Number(p.stock)||0)<=0)
    const now = new Date()
    const monthSales = sales.filter(s=>{const d=new Date(s.created_at);return d.getMonth()===now.getMonth()&&d.getFullYear()===now.getFullYear()})
    const monthRevenue = monthSales.reduce((sum,s)=>sum+salesService.saleTotal(s),0)
    const avgTicket = monthSales.length>0 ? monthRevenue/monthSales.length : 0
    return { totalInvested, totalUnits, lowStock, outOfStock, monthRevenue,
      monthSalesCount:monthSales.length, avgTicket,
      totalProducts:products.length, totalCategories:categories.length, totalClients:clients.length }
  },[products,sales,purchases,categories,clients])

  const topProducts = useMemo(()=>{
    const qty={}, rev={}
    sales.forEach(s=>{
      if(Array.isArray(s.items)) s.items.forEach(it=>{
        const q=Number(it.quantity)||0, p=Number(it.unit_price)||0
        qty[it.product_id]=(qty[it.product_id]||0)+q
        rev[it.product_id]=(rev[it.product_id]||0)+q*p
      })
    })
    return Object.entries(qty).map(([pid,q])=>{
      const name=products.find(p=>p.id===pid)?.name||pid
      return { fullName:name, name:name.length>16?name.slice(0,16)+'…':name, cantidad:q, revenue:rev[pid]||0 }
    }).sort((a,b)=>b.cantidad-a.cantidad).slice(0,6)
  },[sales,products])

  const stockByCategory = useMemo(()=>
    categories.map(c=>({
      name:c.name,
      value:products.filter(p=>!p.is_kit&&p.category_id===c.id).reduce((s,p)=>s+p.stock,0)
    })).filter(c=>c.value>0)
  ,[categories,products])

  const totalStockUnits = stockByCategory.reduce((s,c)=>s+c.value,0)
  const clientMap = useMemo(()=>{const m={};clients.forEach(cl=>m[cl.id]=cl.name);return m},[clients])
  const recentSales = useMemo(()=>[...sales].sort((a,b)=>new Date(b.created_at)-new Date(a.created_at)).slice(0,5),[sales])
  const lowStockList = useMemo(()=>[...stats.lowStock].sort((a,b)=>{
    if(a.stock<=0&&b.stock>0)return -1;if(b.stock<=0&&a.stock>0)return 1;return a.stock-b.stock
  }).slice(0,5),[stats.lowStock])

  if (loading) return <AppLayout title="Panel de Control"><Spinner /></AppLayout>

  return (
    <AppLayout title="Panel de Control">
      <div className="space-y-5">

        {/* ══ BANNER DE BIENVENIDA ══ */}
        <div className="relative overflow-hidden bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl p-5 sm:p-7 text-white">
          {/* Decorative shapes */}
          <div className="absolute top-0 right-0 w-72 h-full opacity-10">
            <svg viewBox="0 0 300 200" fill="none" className="w-full h-full">
              <circle cx="250" cy="50" r="120" fill="white"/>
              <circle cx="280" cy="180" r="60" fill="white"/>
            </svg>
          </div>
          <div className="absolute bottom-0 left-40 w-32 h-32 opacity-5">
            <svg viewBox="0 0 100 100" fill="none">
              <rect x="10" y="10" width="80" height="80" rx="20" fill="white"/>
            </svg>
          </div>

          <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-5">
            <div>
              <div className="flex items-center gap-2 mb-2.5">
                <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-blue-100 bg-white/15 border border-white/20 px-2.5 py-1 rounded-full">
                  <Calendar size={11} />
                  <span className="capitalize">{todayStr()}</span>
                </span>
              </div>
              <h2 className="font-display font-bold text-2xl sm:text-3xl text-white tracking-tight">
                ¡Hola, {user?.full_name?.split(' ')[0] || 'Carlos'}! 👋
              </h2>
              <p className="text-blue-100 text-sm mt-1.5 max-w-lg leading-relaxed">
                Aquí tienes el resumen del sistema — inventario, ventas y alertas al instante.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 shrink-0">
              <Link to="/ventas" className="inline-flex items-center gap-2 bg-white text-blue-700 text-sm font-bold px-4 py-2.5 rounded-xl shadow-sm hover:shadow-md hover:-translate-y-px active:scale-95 transition-all duration-150">
                <ShoppingCart size={15} /> Nueva Venta
              </Link>
              <Link to="/productos" className="inline-flex items-center gap-2 bg-white/15 border border-white/25 text-white text-sm font-semibold px-3.5 py-2.5 rounded-xl hover:bg-white/25 transition-all duration-150">
                <Plus size={15} /> Producto
              </Link>
              <Link to="/movimientos" className="inline-flex items-center gap-2 bg-white/15 border border-white/25 text-white text-sm font-semibold px-3.5 py-2.5 rounded-xl hover:bg-white/25 transition-all duration-150">
                <ArrowLeftRight size={15} />
                <span className="hidden sm:inline">Movimientos</span>
              </Link>
            </div>
          </div>
        </div>

        {/* ══ 4 KPI CARDS ══ */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <KPICard
            icon={DollarSign}
            iconBg="bg-blue-50 text-blue-600"
            label="Invertido en compras"
            value={money(stats.totalInvested)}
            badge={<span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 rounded-full px-2 py-0.5">Activo</span>}
            footer={<span>{stats.totalUnits.toLocaleString()} unidades totales</span>}
          />
          <KPICard
            icon={TrendingUp}
            iconBg="bg-emerald-50 text-emerald-600"
            label="Ventas del mes"
            value={money(stats.monthRevenue)}
            badge={<span className="text-[10px] font-bold text-blue-600 bg-blue-50 border border-blue-200 rounded-full px-2 py-0.5">Este mes</span>}
            footer={
              <>
                <span>{stats.monthSalesCount} órdenes</span>
                <span className="font-semibold text-ink-secondary">Prom. {money(stats.avgTicket)}</span>
              </>
            }
          />
          <KPICard
            icon={Boxes}
            iconBg="bg-purple-50 text-purple-600"
            label="Productos en catálogo"
            value={<>{stats.totalProducts} <span className="text-sm font-normal text-ink-muted">SKUs</span></>}
            badge={<span className="text-[10px] font-bold text-purple-600 bg-purple-50 border border-purple-200 rounded-full px-2 py-0.5">Catálogo</span>}
            footer={
              <>
                <span>{stats.totalCategories} categorías</span>
                <Link to="/productos" className="text-brand font-bold hover:underline text-[11px]">Gestionar →</Link>
              </>
            }
          />
          <KPICard
            icon={stats.lowStock.length > 0 ? AlertTriangle : CheckCircle2}
            iconBg={stats.lowStock.length > 0 ? 'bg-amber-50 text-amber-600' : 'bg-emerald-50 text-emerald-600'}
            label="Alertas de stock"
            value={
              <span className={stats.lowStock.length > 0 ? 'text-amber-600' : 'text-emerald-600'}>
                {stats.lowStock.length} <span className="text-sm font-normal text-ink-muted">artículos</span>
              </span>
            }
            badge={
              <span className={`text-[10px] font-bold rounded-full px-2 py-0.5 border ${stats.lowStock.length>0?'text-amber-700 bg-amber-50 border-amber-200':'text-emerald-700 bg-emerald-50 border-emerald-200'}`}>
                {stats.lowStock.length > 0 ? 'Atención' : 'Óptimo'}
              </span>
            }
            footer={
              <>
                {stats.outOfStock.length > 0
                  ? <span className="text-red-600 font-semibold">{stats.outOfStock.length} agotados</span>
                  : <span>Sin quiebres críticos</span>
                }
                {stats.lowStock.length > 0 && (
                  <Link to="/movimientos" className="text-amber font-bold hover:underline text-[11px]">Reponer →</Link>
                )}
              </>
            }
          />
        </div>

        {/* ══ SECONDARY METRICS ══ */}
        <div className="bg-white border border-base-border rounded-xl p-0 grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-base-border shadow-xs overflow-hidden">
          {[
            { label: 'Cartera de clientes', val: stats.totalClients, unit: 'clientes', color: 'text-ink-primary' },
            {
              label: 'Disponibilidad de stock',
              val: `${stats.totalProducts>0?Math.round(((stats.totalProducts-stats.lowStock.length)/stats.totalProducts)*100):100}%`,
              unit: 'abastecido', color: 'text-ink-primary'
            },
            {
              label: 'Promedio de rotación',
              val: stats.monthSalesCount>0?(stats.totalUnits/Math.max(stats.monthSalesCount,1)).toFixed(1):'0.0',
              unit: 'uds/orden', color: 'text-blue-600'
            },
          ].map(({ label, val, unit, color }) => (
            <div key={label} className="px-5 py-4">
              <p className="text-[11px] font-bold text-ink-muted uppercase tracking-widest mb-1.5">{label}</p>
              <p className={`font-display font-bold text-xl ${color}`}>
                {val} <span className="text-sm font-normal text-ink-muted">{unit}</span>
              </p>
            </div>
          ))}
        </div>

        {/* ══ CHARTS ══ */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Bar chart */}
          <div className="bg-white border border-base-border rounded-2xl p-5 sm:p-6 shadow-xs lg:col-span-2 flex flex-col">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6">
              <div>
                <h2 className="font-display font-bold text-ink-primary text-[17px] tracking-tight">Productos Más Vendidos</h2>
                <p className="text-xs text-ink-muted mt-0.5">Artículos con mayor rotación histórica</p>
              </div>
              <span className="self-start sm:self-auto text-[11px] font-semibold text-ink-muted bg-base-raised border border-base-border px-2.5 py-1 rounded-lg">
                Top {topProducts.length}
              </span>
            </div>
            {topProducts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-14 flex-1">
                <div className="w-12 h-12 rounded-2xl bg-base-raised border border-base-border flex items-center justify-center text-ink-muted mb-3">
                  <Package size={22} strokeWidth={1.5} />
                </div>
                <p className="text-sm font-semibold text-ink-primary">Sin ventas registradas</p>
                <p className="text-xs text-ink-muted mt-1 max-w-xs text-center">Registra ventas para ver la rotación de productos.</p>
                <Link to="/ventas" className="btn-primary text-xs mt-4"><Plus size={13} />Primera Venta</Link>
              </div>
            ) : (
              <div className="w-full h-[260px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={topProducts} layout="vertical" margin={{ left:0, right:24, top:4, bottom:4 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" horizontal={false} />
                    <XAxis type="number" stroke="#94A3B8" fontSize={11} tickLine={false} axisLine={false} />
                    <YAxis type="category" dataKey="name" stroke="#64748B" fontSize={12} width={118} tickLine={false} axisLine={false} />
                    <Tooltip content={<BarTooltip />} cursor={{ fill:'rgba(37,99,235,0.05)' }} />
                    <Bar dataKey="cantidad" fill="#2563EB" radius={[0,6,6,0]} barSize={16} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* Donut */}
          <div className="bg-white border border-base-border rounded-2xl p-5 sm:p-6 shadow-xs flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="font-display font-bold text-ink-primary text-[17px] tracking-tight">Stock por Categoría</h2>
                <p className="text-xs text-ink-muted mt-0.5">Distribución del inventario físico</p>
              </div>
              <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center">
                <Layers size={16} />
              </div>
            </div>
            {stockByCategory.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-14 flex-1">
                <p className="text-sm font-semibold text-ink-primary">Sin datos de categorías</p>
                <p className="text-xs text-ink-muted mt-1">Crea categorías y asigna productos.</p>
              </div>
            ) : (
              <>
                <div className="relative w-full h-[200px] flex items-center justify-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={stockByCategory} dataKey="value" nameKey="name" innerRadius={55} outerRadius={80} paddingAngle={3}>
                        {stockByCategory.map((_,i)=><Cell key={i} fill={PIE_COLORS[i%PIE_COLORS.length]} stroke="transparent"/>)}
                      </Pie>
                      <Tooltip content={<PieTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-xl font-display font-bold text-ink-primary">{totalStockUnits}</span>
                    <span className="text-[10px] text-ink-muted uppercase tracking-widest font-semibold">Uds.</span>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1.5 mt-3 pt-3 border-t border-base-border justify-center">
                  {stockByCategory.map((c,i)=>(
                    <div key={c.name} className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-base-raised border border-base-border text-[11px] text-ink-secondary font-medium">
                      <span className="w-2 h-2 rounded-full shrink-0" style={{background:PIE_COLORS[i%PIE_COLORS.length]}} />
                      <span className="truncate max-w-[80px]">{c.name}</span>
                      <span className="text-ink-muted">({c.value})</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {/* ══ TABLES ══ */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

          {/* Low stock */}
          <div className="bg-white border border-base-border rounded-2xl shadow-xs overflow-hidden flex flex-col">
            <div className="p-4 sm:p-5 border-b border-base-border flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 border border-amber-100 flex items-center justify-center">
                  <ShieldAlert size={16} />
                </div>
                <div>
                  <h3 className="font-display font-bold text-ink-primary text-[15px]">Stock Bajo / Agotado</h3>
                  <p className="text-[11px] text-ink-muted">{stats.lowStock.length} de {products.length} en nivel de reorden</p>
                </div>
              </div>
              <Link to="/movimientos" className="text-xs font-bold text-brand hover:underline flex items-center gap-1">
                Reponer <ArrowRight size={12} />
              </Link>
            </div>
            {lowStockList.length === 0 ? (
              <div className="p-10 text-center flex flex-col items-center">
                <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center mb-3">
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
                  <tbody className="divide-y divide-base-border/60">
                    {lowStockList.map(p=>{
                      const pct = Math.min(Math.round((p.stock/Math.max(p.min_stock,1))*100),100)
                      return (
                        <tr key={p.id} className="hover:bg-base-raised/60 transition-colors">
                          <td className="td py-3">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-[11px] bg-base-raised text-ink-muted px-1.5 py-0.5 rounded border border-base-border">{p.sku}</span>
                              <span className="font-medium text-[13px] truncate max-w-[130px]">{p.name}</span>
                            </div>
                          </td>
                          <td className="td py-3">
                            <div className="flex flex-col items-center min-w-[80px] mx-auto">
                              <span className="text-[11px] font-bold text-ink-primary">{p.stock} <span className="font-normal text-[10px] text-ink-muted">/ mín {p.min_stock}</span></span>
                              <div className="w-full bg-slate-100 rounded-full h-1.5 mt-1 overflow-hidden">
                                <div
                                  className={`h-full rounded-full transition-all ${p.stock<=0?'bg-bad':pct<50?'bg-amber':'bg-good'}`}
                                  style={{width:`${Math.max(pct,5)}%`}}
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
          <div className="bg-white border border-base-border rounded-2xl shadow-xs overflow-hidden flex flex-col">
            <div className="p-4 sm:p-5 border-b border-base-border flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center">
                  <ShoppingCart size={16} />
                </div>
                <div>
                  <h3 className="font-display font-bold text-ink-primary text-[15px]">Últimas Ventas</h3>
                  <p className="text-[11px] text-ink-muted">Transacciones recientes</p>
                </div>
              </div>
              <Link to="/ventas" className="text-xs font-bold text-brand hover:underline flex items-center gap-1">
                Ver todas <ArrowRight size={12} />
              </Link>
            </div>
            {recentSales.length === 0 ? (
              <div className="p-10 text-center flex flex-col items-center">
                <div className="w-10 h-10 rounded-2xl bg-base-raised border border-base-border flex items-center justify-center mb-3">
                  <ShoppingCart size={18} className="text-ink-muted" strokeWidth={1.5} />
                </div>
                <p className="text-sm font-semibold text-ink-primary">Sin ventas aún</p>
                <p className="text-xs text-ink-muted mt-1">Registra tu primera venta para verla aquí.</p>
                <Link to="/ventas" className="btn-primary text-xs mt-4"><Plus size={13} />Registrar Venta</Link>
              </div>
            ) : (
              <div className="divide-y divide-base-border/60">
                {recentSales.map(sale=>{
                  const clientName = clientMap[sale.client_id]||sale.client_name||'Cliente'
                  const total = salesService.saleTotal(sale)
                  const itemsCount = sale.items?.reduce((s,it)=>s+it.quantity,0)||0
                  return (
                    <div key={sale.id} className="px-4 py-3.5 hover:bg-base-raised/60 transition-colors flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-[11px] font-bold text-blue-700 shrink-0 font-display">
                          {clientName.slice(0,2).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="text-[13px] font-semibold text-ink-primary truncate">{clientName}</p>
                          <p className="text-[11px] text-ink-muted">{shortDate(sale.created_at)} · {itemsCount} art.</p>
                        </div>
                      </div>
                      <div className="text-right shrink-0 flex flex-col items-end gap-1">
                        <span className="font-display font-bold text-[13px] text-ink-primary">{money(total)}</span>
                        <StatusBadge status={sale.status||'pagado'} />
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
