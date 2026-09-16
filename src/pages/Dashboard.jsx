import { useEffect, useMemo, useState, useRef } from 'react'
import { Link } from 'react-router-dom'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts'
import {
  Boxes, TrendingUp, AlertTriangle, DollarSign, Plus,
  ShoppingCart, ArrowLeftRight, CheckCircle2, ShieldAlert,
  Layers, Package, ArrowUpRight, Activity, Users, Clock
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

/* ── helpers ── */
const fmt = (n) => `S/ ${(Number(n)||0).toLocaleString('es-PE',{minimumFractionDigits:2,maximumFractionDigits:2})}`
const PIE_COLORS = ['#2563EB','#0EA5E9','#8B5CF6','#10B981','#F59E0B','#EF4444']
const greeting = () => { const h=new Date().getHours(); return h<12?'Buenos días':h<18?'Buenas tardes':'Buenas noches' }
const dayStr = () => new Date().toLocaleDateString('es-PE',{weekday:'long',day:'numeric',month:'long'})
const timeAgo = (iso) => {
  if (!iso) return '—'
  const diff = Math.round((new Date()-new Date(iso))/60000)
  if (diff<1) return 'ahora'; if (diff<60) return `hace ${diff}m`
  if (diff<1440) return `hace ${Math.round(diff/60)}h`
  return new Date(iso).toLocaleDateString('es-PE',{day:'2-digit',month:'short'})
}

/* ── animated counter hook ── */
function useCounter(target, active=true, duration=900) {
  const [val, setVal] = useState(0)
  useEffect(() => {
    if (!active || target === 0) { setVal(target); return }
    const start = Date.now()
    const id = setInterval(() => {
      const p = Math.min((Date.now()-start)/duration, 1)
      const ease = 1-Math.pow(1-p,3)
      setVal(Math.round(target*ease))
      if (p>=1) clearInterval(id)
    }, 14)
    return () => clearInterval(id)
  }, [target, active, duration])
  return val
}

/* ── intersection observer for staggered entrance ── */
function useFadeIn() {
  const ref = useRef(null)
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect() } }, { threshold: 0.08 })
    if (ref.current) obs.observe(ref.current)
    return () => obs.disconnect()
  }, [])
  return [ref, visible]
}

/* ── 3D horizontal bar shape ── */
const DEPTH = 7
const Bar3D = (props) => {
  const { x, y, width, height, value } = props
  if (!value || value <= 0 || !width || width <= 0) return null
  const front   = '#2563EB'
  const top     = '#60A5FA'
  const side    = '#1D4ED8'
  const topPts  = `${x},${y+DEPTH/2} ${x+DEPTH},${y-DEPTH/2} ${x+width+DEPTH},${y-DEPTH/2} ${x+width},${y+DEPTH/2}`
  const sidePts = `${x+width},${y+DEPTH/2} ${x+width+DEPTH},${y-DEPTH/2} ${x+width+DEPTH},${y+height-DEPTH/2} ${x+width},${y+height+DEPTH/2}`
  return (
    <g style={{filter:'drop-shadow(0 2px 4px rgba(37,99,235,0.25))'}}>
      <rect x={x} y={y+DEPTH/2} width={width} height={height} fill={front} rx={3}/>
      <polygon points={topPts}  fill={top}  style={{opacity:.9}}/>
      <polygon points={sidePts} fill={side} style={{opacity:.85}}/>
    </g>
  )
}

/* ── tooltips ── */
function BTooltip({ active, payload }) {
  if (!active||!payload?.length) return null
  return (
    <div className="bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-xs shadow-xl">
      <p className="text-slate-500 mb-1">{payload[0].payload.fullName}</p>
      <p className="font-bold text-slate-900 text-sm">{payload[0].value} <span className="font-normal text-slate-400">uds.</span></p>
    </div>
  )
}
function PTooltip({ active, payload }) {
  if (!active||!payload?.length) return null
  return (
    <div className="bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-xs shadow-xl">
      <p className="font-semibold text-slate-800">{payload[0].name}</p>
      <p className="text-slate-400 mt-0.5">{payload[0].value} unidades</p>
    </div>
  )
}

/* ── Stat card with animated counter ── */
function StatCard({ icon: Icon, accent, label, rawValue, displayValue, detail, link, linkText, badge, delay=0, active }) {
  const [ref, visible] = useFadeIn()
  const counted = useCounter(rawValue||0, visible&&active)
  return (
    <div ref={ref}
      className="bg-white rounded-2xl border border-slate-200 overflow-hidden"
      style={{
        boxShadow:'0 1px 3px rgba(0,0,0,0.06),0 4px 16px rgba(0,0,0,0.04)',
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(24px)',
        transition: `opacity 0.5s ease ${delay}ms, transform 0.5s cubic-bezier(0.16,1,0.3,1) ${delay}ms`
      }}>
      {/* color accent bar */}
      <div style={{height:3, background:accent}}/>
      <div className="p-4 sm:p-5">
        <div className="flex items-start justify-between mb-4">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{background:`${accent}14`}}>
            <Icon size={18} strokeWidth={2} style={{color:accent}}/>
          </div>
          {badge && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border"
              style={{background:`${accent}10`,color:accent,borderColor:`${accent}30`}}>
              {badge}
            </span>
          )}
        </div>
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{label}</p>
        <p className="text-2xl sm:text-[28px] font-display font-bold text-slate-900 leading-none tracking-tight">
          {displayValue !== undefined ? displayValue : counted}
        </p>
        {detail && <p className="text-xs text-slate-400 mt-2 leading-relaxed">{detail}</p>}
        {link && (
          <Link to={link} className="inline-flex items-center gap-1 text-xs font-semibold mt-3 hover:underline"
            style={{color:accent}}>
            {linkText} <ArrowUpRight size={11}/>
          </Link>
        )}
      </div>
    </div>
  )
}

/* ── Metric row ── */
function MetricRow({ icon:Icon, color, label, value, unit, delay=0 }) {
  const [ref, visible] = useFadeIn()
  return (
    <div ref={ref} className="flex items-center gap-3 px-4 py-3.5 border-b border-slate-100 last:border-0"
      style={{opacity:visible?1:0,transform:visible?'translateX(0)':'translateX(-12px)',transition:`opacity 0.4s ease ${delay}ms,transform 0.4s ease ${delay}ms`}}>
      <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
        style={{background:`${color}12`}}>
        <Icon size={14} strokeWidth={2} style={{color}}/>
      </div>
      <p className="text-xs text-slate-500 flex-1">{label}</p>
      <p className="font-display font-bold text-slate-900 text-sm">
        {value} <span className="text-slate-400 font-normal text-xs">{unit}</span>
      </p>
    </div>
  )
}

/* ── Skeleton ── */
const Skel = ({h='h-44'}) => <div className={`${h} rounded-2xl bg-slate-100 animate-pulse`}/>

/* ── Animated progress bar ── */
function AnimBar({ pct, color }) {
  const [w, setW] = useState(0)
  useEffect(() => { const t=setTimeout(()=>setW(pct),200); return ()=>clearTimeout(t) }, [pct])
  return (
    <div className="flex-1 bg-slate-100 rounded-full h-1.5 overflow-hidden">
      <div className="h-full rounded-full transition-all duration-700 ease-out" style={{width:`${Math.max(w,3)}%`,background:color}}/>
    </div>
  )
}

export default function Dashboard() {
  const { user } = useAuth()
  const [products,setProducts]=useState([])
  const [sales,setSales]=useState([])
  const [categories,setCategories]=useState([])
  const [clients,setClients]=useState([])
  const [purchases,setPurchases]=useState([])
  const [loading,setLoading]=useState(true)

  useEffect(()=>{
    Promise.all([
      productsService.list(),salesService.list(),
      categoriesService.list(),clientsService.list(),purchasesService.list()
    ]).then(([p,s,c,cl,pu])=>{
      setProducts(p||[]);setSales(s||[]);setCategories(c||[])
      setClients(cl||[]);setPurchases(pu||[])
      setLoading(false)
    }).catch(()=>setLoading(false))
  },[])

  const stats=useMemo(()=>{
    const totalInvested=purchases.filter(p=>p.status==='recibido').reduce((s,p)=>s+purchasesService.purchaseTotal(p),0)
    const totalUnits=products.reduce((s,p)=>s+(Number(p.stock)||0),0)
    const lowStock=products.filter(p=>(Number(p.stock)||0)<=(Number(p.min_stock)||0))
    const outOfStock=products.filter(p=>(Number(p.stock)||0)<=0)
    const now=new Date()
    const ms=sales.filter(s=>{const d=new Date(s.created_at);return d.getMonth()===now.getMonth()&&d.getFullYear()===now.getFullYear()})
    const rev=ms.reduce((s,x)=>s+salesService.saleTotal(x),0)
    return{totalInvested,totalUnits,lowStock,outOfStock,monthRevenue:rev,
      monthSalesCount:ms.length,avgTicket:ms.length?rev/ms.length:0,
      totalProducts:products.length,totalCategories:categories.length,totalClients:clients.length}
  },[products,sales,purchases,categories,clients])

  const topProducts=useMemo(()=>{
    const qty={},rev={}
    sales.forEach(s=>s.items?.forEach(it=>{
      const q=Number(it.quantity)||0,p=Number(it.unit_price)||0
      qty[it.product_id]=(qty[it.product_id]||0)+q
      rev[it.product_id]=(rev[it.product_id]||0)+q*p
    }))
    return Object.entries(qty).map(([pid,q])=>{
      const name=products.find(p=>p.id===pid)?.name||pid
      return{fullName:name,name:name.length>18?name.slice(0,18)+'…':name,cantidad:q,revenue:rev[pid]||0}
    }).sort((a,b)=>b.cantidad-a.cantidad).slice(0,6)
  },[sales,products])

  const stockByCategory=useMemo(()=>
    categories.map(c=>({name:c.name,value:products.filter(p=>!p.is_kit&&p.category_id===c.id).reduce((s,p)=>s+p.stock,0)})).filter(c=>c.value>0)
  ,[categories,products])

  const totalSU=stockByCategory.reduce((s,c)=>s+c.value,0)
  const clientMap=useMemo(()=>{const m={};clients.forEach(c=>m[c.id]=c.name);return m},[clients])
  const recentSales=useMemo(()=>[...sales].sort((a,b)=>new Date(b.created_at)-new Date(a.created_at)).slice(0,6),[sales])
  const lowList=useMemo(()=>[...stats.lowStock].sort((a,b)=>a.stock-b.stock).slice(0,5),[stats.lowStock])

  const AVATAR_PALETTE=['#2563EB','#7C3AED','#10B981','#F59E0B','#EF4444','#0EA5E9','#EC4899']
  const nc=(n='')=>{let h=0;for(const c of n)h=c.charCodeAt(0)+((h<<5)-h);return AVATAR_PALETTE[Math.abs(h)%AVATAR_PALETTE.length]}

  const [headerRef, headerVisible] = useFadeIn()

  return (
    <AppLayout title="Panel de Control">
      <div className="space-y-5 pb-8">

        {/* ── Greeting header ── */}
        <div ref={headerRef}
          className="flex flex-col sm:flex-row sm:items-end justify-between gap-4"
          style={{opacity:headerVisible?1:0,transform:headerVisible?'translateY(0)':'translateY(-16px)',transition:'opacity 0.4s ease,transform 0.4s ease'}}>
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"/>
              <span className="text-xs text-slate-400 capitalize">{dayStr()}</span>
            </div>
            <h2 className="font-display font-bold text-2xl sm:text-3xl text-slate-900 tracking-tight">
              {greeting()}, {user?.full_name?.split(' ')[0] || 'bienvenido'} 👋
            </h2>
            <p className="text-slate-400 text-sm mt-1">Resumen de tu negocio al día de hoy.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link to="/ventas" className="btn-primary text-sm"><ShoppingCart size={14}/> Nueva Venta</Link>
            <Link to="/productos" className="btn-secondary text-sm"><Plus size={14}/> Producto</Link>
            <Link to="/movimientos" className="btn-secondary text-sm hidden sm:inline-flex"><ArrowLeftRight size={14}/> Movimiento</Link>
          </div>
        </div>

        {/* ── 4 KPI cards ── */}
        {loading ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {[1,2,3,4].map(i=><Skel key={i} h="h-44"/>)}
          </div>
        ):(
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <StatCard icon={DollarSign} accent="#2563EB" label="Invertido en compras"
              rawValue={Math.round(stats.totalInvested)}
              displayValue={fmt(stats.totalInvested)}
              detail={`${stats.totalUnits.toLocaleString()} unidades en stock`}
              badge="Capital" delay={50} active={!loading}/>
            <StatCard icon={TrendingUp} accent="#10B981" label="Ventas del mes"
              rawValue={Math.round(stats.monthRevenue)}
              displayValue={fmt(stats.monthRevenue)}
              detail={`${stats.monthSalesCount} órdenes · Prom. ${fmt(stats.avgTicket)}`}
              link="/ventas" linkText="Ver ventas" delay={150} active={!loading}/>
            <StatCard icon={Boxes} accent="#7C3AED" label="Productos activos"
              rawValue={stats.totalProducts}
              detail={`${stats.totalCategories} categorías registradas`}
              link="/productos" linkText="Ver catálogo" delay={250} active={!loading}/>
            <StatCard
              icon={stats.lowStock.length>0?AlertTriangle:CheckCircle2}
              accent={stats.lowStock.length>0?'#F59E0B':'#10B981'}
              label="Alertas de stock"
              rawValue={stats.lowStock.length}
              badge={stats.lowStock.length>0?'Atención':'Óptimo'}
              detail={stats.outOfStock.length>0?`${stats.outOfStock.length} agotado(s)`:'Sin quiebres críticos'}
              link={stats.lowStock.length>0?'/movimientos':undefined}
              linkText="Reponer stock" delay={350} active={!loading}/>
          </div>
        )}

        {/* ── Middle section: metrics + donut + 3D bars ── */}
        {!loading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">

            {/* Indicadores */}
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden"
              style={{boxShadow:'0 1px 3px rgba(0,0,0,0.06)'}}>
              <div className="px-4 py-3.5 border-b border-slate-100 flex items-center justify-between">
                <h3 className="font-display font-bold text-slate-800 text-sm">Indicadores clave</h3>
                <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">Este mes</span>
              </div>
              <MetricRow icon={Users}      color="#2563EB" label="Cartera de clientes"
                value={stats.totalClients} unit="clientes" delay={100}/>
              <MetricRow icon={Activity}   color="#10B981" label="Disponibilidad de stock"
                value={`${stats.totalProducts>0?Math.round(((stats.totalProducts-stats.lowStock.length)/stats.totalProducts)*100):100}%`}
                unit="abastecido" delay={180}/>
              <MetricRow icon={TrendingUp} color="#7C3AED" label="Promedio de rotación"
                value={stats.monthSalesCount>0?(stats.totalUnits/Math.max(stats.monthSalesCount,1)).toFixed(1):'0.0'}
                unit="uds/orden" delay={260}/>
              <MetricRow icon={DollarSign} color="#F59E0B" label="Ticket promedio"
                value={fmt(stats.avgTicket)} unit="" delay={340}/>
            </div>

            {/* Donut */}
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden"
              style={{boxShadow:'0 1px 3px rgba(0,0,0,0.06)'}}>
              <div className="px-4 py-3.5 border-b border-slate-100 flex items-center justify-between">
                <h3 className="font-display font-bold text-slate-800 text-sm">Stock por categoría</h3>
                <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center">
                  <Layers size={13} className="text-blue-600"/>
                </div>
              </div>
              {stockByCategory.length===0?(
                <div className="flex flex-col items-center justify-center h-52 text-center px-4">
                  <p className="text-sm font-semibold text-slate-600">Sin datos aún</p>
                  <p className="text-xs text-slate-400 mt-1">Crea categorías y asigna productos.</p>
                </div>
              ):(
                <div className="p-4">
                  <div className="relative w-full h-[160px] sm:h-[180px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={stockByCategory} dataKey="value" nameKey="name"
                          innerRadius="38%" outerRadius="58%" paddingAngle={4}
                          startAngle={90} endAngle={-270}>
                          {stockByCategory.map((_,i)=><Cell key={i} fill={PIE_COLORS[i%PIE_COLORS.length]} stroke="transparent"/>)}
                        </Pie>
                        <Tooltip content={<PTooltip/>}/>
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                      <span className="text-2xl font-display font-bold text-slate-900">{totalSU}</span>
                      <span className="text-[9px] text-slate-400 font-semibold uppercase tracking-widest">uds.</span>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2 mt-3 pt-3 border-t border-slate-100">
                    {stockByCategory.map((c,i)=>(
                      <div key={c.name} className="flex items-center gap-2 text-xs">
                        <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{background:PIE_COLORS[i%PIE_COLORS.length]}}/>
                        <span className="text-slate-600 flex-1 truncate">{c.name}</span>
                        <span className="font-semibold text-slate-800">{c.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* 3D Bar chart */}
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden md:col-span-2 lg:col-span-1"
              style={{boxShadow:'0 1px 3px rgba(0,0,0,0.06)'}}>
              <div className="px-4 py-3.5 border-b border-slate-100 flex items-center justify-between">
                <h3 className="font-display font-bold text-slate-800 text-sm">Productos más vendidos</h3>
                <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">Top {topProducts.length}</span>
              </div>
              {topProducts.length===0?(
                <div className="flex flex-col items-center justify-center h-52 text-center px-4">
                  <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center mb-2">
                    <Package size={18} strokeWidth={1.5} className="text-slate-400"/>
                  </div>
                  <p className="text-sm font-semibold text-slate-600">Sin ventas registradas</p>
                  <p className="text-xs text-slate-400 mt-1">Registra ventas para ver rotación.</p>
                </div>
              ):(
                <div className="px-2 py-4" style={{height:280}}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={topProducts} layout="vertical" margin={{left:0,right:20,top:8,bottom:4}}>
                      <XAxis type="number" stroke="#CBD5E1" fontSize={10} tickLine={false} axisLine={false}/>
                      <YAxis type="category" dataKey="name" stroke="#94A3B8" fontSize={11}
                        width={105} tickLine={false} axisLine={false}/>
                      <Tooltip content={<BTooltip/>} cursor={{fill:'rgba(37,99,235,0.04)'}}/>
                      <Bar dataKey="cantidad" shape={<Bar3D/>} barSize={18} isAnimationActive={true}
                        animationDuration={900} animationEasing="ease-out"/>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Bottom tables ── */}
        {!loading && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5">

            {/* Recent sales */}
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden"
              style={{boxShadow:'0 1px 3px rgba(0,0,0,0.06)'}}>
              <div className="flex items-center justify-between px-4 sm:px-5 py-3.5 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center">
                    <ShoppingCart size={13} className="text-blue-600"/>
                  </div>
                  <div>
                    <h3 className="font-display font-bold text-slate-800 text-sm">Últimas ventas</h3>
                    <p className="text-[11px] text-slate-400 hidden sm:block">Transacciones recientes</p>
                  </div>
                </div>
                <Link to="/ventas" className="text-xs font-semibold text-blue-600 hover:underline flex items-center gap-1">
                  Ver todas <ArrowUpRight size={11}/>
                </Link>
              </div>
              {recentSales.length===0?(
                <div className="flex flex-col items-center justify-center py-12 text-center px-4">
                  <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center mb-3">
                    <ShoppingCart size={18} strokeWidth={1.5} className="text-slate-400"/>
                  </div>
                  <p className="text-sm font-semibold text-slate-600">Sin ventas aún</p>
                  <p className="text-xs text-slate-400 mt-1 mb-4">Registra tu primera venta aquí.</p>
                  <Link to="/ventas" className="btn-primary text-xs"><Plus size={12}/>Registrar venta</Link>
                </div>
              ):(
                <div className="divide-y divide-slate-100">
                  {recentSales.map((sale,i)=>{
                    const cName=clientMap[sale.client_id]||sale.client_name||'Cliente'
                    const total=salesService.saleTotal(sale)
                    const count=sale.items?.reduce((s,it)=>s+it.quantity,0)||0
                    const color=nc(cName)
                    return(
                      <div key={sale.id} className="flex items-center justify-between gap-3 px-4 sm:px-5 py-3 hover:bg-slate-50 transition-colors"
                        style={{animationDelay:`${i*60}ms`}}>
                        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                          <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-[11px] font-bold font-display shrink-0"
                            style={{background:color}}>
                            {cName.slice(0,2).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-slate-800 truncate">{cName}</p>
                            <p className="text-[11px] text-slate-400 flex items-center gap-1">
                              <Clock size={9}/> {timeAgo(sale.created_at)} · {count} art.
                            </p>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1 shrink-0">
                          <span className="font-display font-bold text-sm text-slate-900">{fmt(total)}</span>
                          <StatusBadge status={sale.status||'pagado'}/>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Low stock */}
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden"
              style={{boxShadow:'0 1px 3px rgba(0,0,0,0.06)'}}>
              <div className="flex items-center justify-between px-4 sm:px-5 py-3.5 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-amber-50 flex items-center justify-center">
                    <ShieldAlert size={13} className="text-amber-600"/>
                  </div>
                  <div>
                    <h3 className="font-display font-bold text-slate-800 text-sm">Stock bajo / agotado</h3>
                    <p className="text-[11px] text-slate-400 hidden sm:block">{stats.lowStock.length} de {products.length} en alerta</p>
                  </div>
                </div>
                <Link to="/movimientos" className="text-xs font-semibold text-blue-600 hover:underline flex items-center gap-1">
                  Reponer <ArrowUpRight size={11}/>
                </Link>
              </div>
              {lowList.length===0?(
                <div className="flex flex-col items-center justify-center py-12 text-center px-4">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center mb-3">
                    <CheckCircle2 size={18} className="text-emerald-600"/>
                  </div>
                  <p className="text-sm font-semibold text-slate-600">Inventario en buen estado</p>
                  <p className="text-xs text-slate-400 mt-1">Todos los productos sobre el mínimo.</p>
                </div>
              ):(
                <div className="divide-y divide-slate-100">
                  {lowList.map(p=>{
                    const pct=Math.min(Math.round((p.stock/Math.max(p.min_stock,1))*100),100)
                    const barColor=p.stock<=0?'#EF4444':pct<50?'#F59E0B':'#10B981'
                    return(
                      <div key={p.id} className="flex items-center gap-3 px-4 sm:px-5 py-3.5 hover:bg-slate-50 transition-colors">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="font-mono text-[10px] bg-slate-100 text-slate-400 px-1.5 py-0.5 rounded shrink-0">{p.sku}</span>
                            <span className="text-sm font-semibold text-slate-800 truncate">{p.name}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <AnimBar pct={pct} color={barColor}/>
                            <span className="text-[11px] text-slate-400 font-mono shrink-0">{p.stock}/{p.min_stock}</span>
                          </div>
                        </div>
                        <StockBadge stock={p.stock} minStock={p.min_stock}/>
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
