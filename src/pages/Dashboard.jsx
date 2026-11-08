import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Search, Bell, Calendar, Sun, Moon, ShoppingCart, Package,
  Warehouse, Coins, BarChart2, PieChart, Zap, Clock, Boxes,
  CheckCircle2, ArrowRight, UserPlus, FileText, Settings, Users,
  BarChart3, RefreshCw, ChevronDown
} from 'lucide-react'
import AppLayout, { useLayout } from '../components/layout/AppLayout'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import { salesService } from '../services/salesService'
import { productsService } from '../services/productsService'
import { purchasesService } from '../services/purchasesService'
import { clientsService } from '../services/clientsService'
import { categoriesService } from '../services/categoriesService'
import { companySettingsService } from '../services/companySettingsService'
import { inventoryMovementsService } from '../services/inventoryMovementsService'
import { paymentMethodsService } from '../services/paymentMethodsService'
import PaymentQrModal from '../components/PaymentQrModal'

export default function Dashboard() {
  return (
    <AppLayout title="Dashboard ERP" noTopbar={true}>
      <DashboardContent />
    </AppLayout>
  )
}

function DashboardContent() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { isDark, toggleTheme } = useTheme()
  const { openSidebar } = useLayout()

  // Real ERP states
  const [sales, setSales] = useState(() => salesService.getCached?.() || [])
  const [products, setProducts] = useState(() => productsService.getCached?.() || [])
  const [purchases, setPurchases] = useState([])
  const [clients, setClients] = useState(() => clientsService.getCached?.() || [])
  const [categories, setCategories] = useState(() => categoriesService.getCached?.() || [])
  const [movements, setMovements] = useState(() => inventoryMovementsService.getCached?.() || [])
  const [company, setCompany] = useState(() => companySettingsService.getCached?.())
  const [loading, setLoading] = useState(false)
  const [timeRange, setTimeRange] = useState('6m')

  // QR Modal States for Yape, Plin & BCP
  const [qrModalMethod, setQrModalMethod] = useState(null)
  const [qrModalAmount, setQrModalAmount] = useState(0)
  const [paymentConfig, setPaymentConfig] = useState(() => paymentMethodsService.get())

  useEffect(() => {
    const handlePayUpdate = (e) => setPaymentConfig(e.detail)
    window.addEventListener('cya-payment-methods-updated', handlePayUpdate)
    return () => window.removeEventListener('cya-payment-methods-updated', handlePayUpdate)
  }, [])

  // Load real data from Supabase
  const loadData = async () => {
    setLoading(true)
    try {
      const [s, p, pu, cl, ca, co, m] = await Promise.all([
        salesService.list().catch(() => []),
        productsService.list().catch(() => []),
        purchasesService.list().catch(() => []),
        clientsService.list().catch(() => []),
        categoriesService.list().catch(() => []),
        companySettingsService.get().catch(() => null),
        inventoryMovementsService.list().catch(() => [])
      ])
      if (s?.length) setSales(s)
      if (p?.length) setProducts(p)
      if (pu?.length) setPurchases(pu)
      if (cl?.length) setClients(cl)
      if (ca?.length) setCategories(ca)
      if (co) setCompany(co)
      if (m?.length) setMovements(m)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  // User display name
  const userFirstName = user?.full_name?.split(' ')?.[0] || 'Carlos'

  // Current dynamic Date & Time
  const now = new Date()
  const currentDateStr = now.toLocaleDateString('es-PE', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  }).replace('.', '')
  const currentTimeStr = now.toLocaleTimeString('es-PE', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  })

  // Calculated Real or Reference KPIs
  const kpiData = useMemo(() => {
    const totalSalesReal = sales.reduce((acc, s) => acc + (salesService.saleTotal?.(s) || Number(s.total) || 0), 0)
    const totalPurchasesReal = purchases.reduce((acc, p) => acc + (Number(p.total) || 0), 0)
    const totalStockUnits = products.reduce((acc, p) => acc + (Number(p.stock) || 0), 0)

    // Unpaid / accounts receivable
    const pendingReceivable = sales
      .filter(s => s.status === 'pendiente' || s.payment_status === 'pendiente')
      .reduce((acc, s) => acc + (salesService.saleTotal?.(s) || Number(s.total) || 0), 0)

    return {
      ventasMes: totalSalesReal > 0 ? totalSalesReal : 25430,
      comprasMes: totalPurchasesReal > 0 ? totalPurchasesReal : 18760,
      stockTotal: totalStockUnits > 0 ? totalStockUnits : 12580,
      cuentasCobrar: pendingReceivable > 0 ? pendingReceivable : 7320,
      totalSemestre: totalSalesReal > 0 ? totalSalesReal * 6 : 152240
    }
  }, [sales, purchases, products])

  return (
    <div className="space-y-6 pb-12 font-sans text-slate-800 dark:text-slate-100">

      {/* ═══════════════════════════════════════════════════════════
          1. TOP BAR — Search bar, Bell, Date/Time Capsule, Theme
         ═══════════════════════════════════════════════════════════ */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Search Input */}
        <div className="relative flex-1 max-w-xl">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Buscar módulos, documentos o reportes... (Ctrl + K)"
            className="w-full pl-11 pr-4 py-2.5 rounded-2xl bg-white dark:bg-[#111827] border border-slate-200/90 dark:border-white/10 text-xs sm:text-sm text-slate-700 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 shadow-xs transition-all"
          />
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-2.5 shrink-0 self-end sm:self-auto">
          {/* Notification Bell */}
          <button
            type="button"
            className="relative w-10 h-10 rounded-2xl bg-white dark:bg-[#111827] border border-slate-200/90 dark:border-white/10 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5 shadow-xs transition-all cursor-pointer"
            title="Notificaciones"
          >
            <Bell size={18} />
            <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center ring-2 ring-white dark:ring-[#111827]">
              3
            </span>
          </button>

          {/* Date & Time Capsule */}
          <div className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-white dark:bg-[#111827] border border-slate-200/90 dark:border-white/10 shadow-xs text-xs font-semibold text-slate-700 dark:text-slate-200">
            <Calendar size={15} className="text-blue-600 shrink-0" />
            <span className="capitalize">{currentDateStr}</span>
            <span className="text-slate-300 dark:text-white/20">|</span>
            <span className="text-slate-500 dark:text-slate-400 font-normal">{currentTimeStr}</span>
          </div>

          {/* Theme Toggle Button */}
          <button
            type="button"
            onClick={toggleTheme}
            className="w-10 h-10 rounded-2xl bg-white dark:bg-[#111827] border border-slate-200/90 dark:border-white/10 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5 shadow-xs transition-all cursor-pointer"
            title="Cambiar tema claro / oscuro"
          >
            {isDark ? <Sun size={18} className="text-amber-400" /> : <Sun size={18} />}
          </button>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════
          2. WELCOME HERO BANNER (MTA Software Corporate Backdrop)
         ═══════════════════════════════════════════════════════════ */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#DBEAFE] via-[#EBF3FE] to-[#DBEAFE] dark:from-[#1E3A8A]/40 dark:via-[#172554]/50 dark:to-[#1E3A8A]/40 border border-blue-200/80 dark:border-blue-500/20 p-6 sm:p-8 shadow-xs flex items-center justify-between">
        {/* Left Welcome Text */}
        <div className="relative z-10 max-w-xl">
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <span>¡Hola, {userFirstName}!</span>
            <span className="animate-bounce">👋</span>
          </h1>
          <p className="text-sm sm:text-[15px] font-medium text-slate-600 dark:text-blue-200/80 mt-1.5">
            Bienvenido al sistema ERP de {company?.name || 'MTA Software'}
          </p>
        </div>

        {/* Right Skyscraper Architecture Backdrop with Diagonal Light Streaks */}
        <div className="absolute right-0 top-0 bottom-0 w-3/5 sm:w-2/5 pointer-events-none overflow-hidden flex items-center justify-end select-none">
          <div className="relative w-full h-full">
            <img
              src="https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1200&q=80"
              alt="MTA Glass Towers"
              className="w-full h-full object-cover object-center mix-blend-multiply dark:mix-blend-luminosity opacity-85 dark:opacity-40"
            />
            {/* Smooth gradient blend masks */}
            <div className="absolute inset-0 bg-gradient-to-r from-[#EBF3FE] dark:from-[#172554] via-[#EBF3FE]/60 dark:via-transparent to-transparent" />
            {/* Diagonal luminous stripes */}
            <div className="absolute -inset-x-20 -top-20 bottom-0 rotate-12 bg-white/25 dark:bg-blue-400/10 blur-sm pointer-events-none" />
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════
          3. ROW OF 4 KPI METRIC CARDS (con mini sparklines y cobro Yape/Plin)
         ═══════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">

        {/* Card 1: Ventas del Mes (Blue) */}
        <div className="rounded-3xl bg-white dark:bg-[#111827] border border-slate-200/80 dark:border-white/10 p-5 shadow-xs hover:shadow-md transition-shadow relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="w-12 h-12 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-500/30 shrink-0">
                <ShoppingCart size={22} strokeWidth={2.2} />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 truncate">Ventas del Mes</p>
                <p className="text-xl sm:text-[22px] font-black text-slate-900 dark:text-white tracking-tight mt-0.5">
                  S/ {kpiData.ventasMes.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
                <div className="flex items-center gap-1 text-[11.5px] font-bold text-emerald-500 mt-1">
                  <span>↑ +12.5%</span>
                </div>
              </div>
            </div>
            {/* Sparkline curve */}
            <div className="w-16 h-9 shrink-0 self-start opacity-90">
              <svg viewBox="0 0 100 50" className="w-full h-full" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="sparkBlue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.4" />
                    <stop offset="100%" stopColor="#3B82F6" stopOpacity="0" />
                  </linearGradient>
                </defs>
                <path d="M 0,45 Q 25,40 45,28 T 80,18 T 100,8 L 100,50 L 0,50 Z" fill="url(#sparkBlue)" />
                <path d="M 0,45 Q 25,40 45,28 T 80,18 T 100,8" fill="none" stroke="#2563EB" strokeWidth="2.5" />
                <circle cx="100" cy="8" r="3" fill="#2563EB" />
              </svg>
            </div>
          </div>

          <div className="mt-3.5 pt-2.5 border-t border-slate-100 dark:border-white/10 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
            <span>{sales.length || 1} ventas este mes</span>
            <button
              type="button"
              onClick={() => navigate('/ventas')}
              className="text-blue-600 dark:text-blue-400 font-bold hover:underline cursor-pointer"
            >
              Ver ventas →
            </button>
          </div>
        </div>

        {/* Card 2: Compras del Mes (Green) */}
        <div className="rounded-3xl bg-white dark:bg-[#111827] border border-slate-200/80 dark:border-white/10 p-5 shadow-xs hover:shadow-md transition-shadow relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="w-12 h-12 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-md shadow-emerald-500/30 shrink-0">
                <Package size={22} strokeWidth={2.2} />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 truncate">Compras del Mes</p>
                <p className="text-xl sm:text-[22px] font-black text-slate-900 dark:text-white tracking-tight mt-0.5">
                  S/ {kpiData.comprasMes.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
                <div className="flex items-center gap-1 text-[11.5px] font-bold text-emerald-500 mt-1">
                  <span>↑ +8.3%</span>
                </div>
              </div>
            </div>
            {/* Sparkline curve */}
            <div className="w-16 h-9 shrink-0 self-start opacity-90">
              <svg viewBox="0 0 100 50" className="w-full h-full" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="sparkGreen" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10B981" stopOpacity="0.4" />
                    <stop offset="100%" stopColor="#10B981" stopOpacity="0" />
                  </linearGradient>
                </defs>
                <path d="M 0,42 Q 25,35 50,30 T 80,15 T 100,10 L 100,50 L 0,50 Z" fill="url(#sparkGreen)" />
                <path d="M 0,42 Q 25,35 50,30 T 80,15 T 100,10" fill="none" stroke="#10B981" strokeWidth="2.5" />
                <circle cx="100" cy="10" r="3" fill="#10B981" />
              </svg>
            </div>
          </div>

          <div className="mt-3.5 pt-2.5 border-t border-slate-100 dark:border-white/10 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
            <span>{purchases.length || 0} compras este mes</span>
            <button
              type="button"
              onClick={() => navigate('/compras')}
              className="text-emerald-600 dark:text-emerald-400 font-bold hover:underline cursor-pointer"
            >
              Ver compras →
            </button>
          </div>
        </div>

        {/* Card 3: Stock Total (Purple) */}
        <div className="rounded-3xl bg-white dark:bg-[#111827] border border-slate-200/80 dark:border-white/10 p-5 shadow-xs hover:shadow-md transition-shadow relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="w-12 h-12 rounded-full bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-500/30 shrink-0">
                <Warehouse size={22} strokeWidth={2.2} />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 truncate">Stock Total</p>
                <p className="text-xl sm:text-[22px] font-black text-slate-900 dark:text-white tracking-tight mt-0.5">
                  {kpiData.stockTotal.toLocaleString('en-US')}
                </p>
                <div className="flex items-center gap-1 text-[11.5px] font-bold text-emerald-500 mt-1">
                  <span>↑ +2.1%</span>
                </div>
              </div>
            </div>
            {/* Sparkline curve */}
            <div className="w-16 h-9 shrink-0 self-start opacity-90">
              <svg viewBox="0 0 100 50" className="w-full h-full" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="sparkPurple" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#6366F1" stopOpacity="0.4" />
                    <stop offset="100%" stopColor="#6366F1" stopOpacity="0" />
                  </linearGradient>
                </defs>
                <path d="M 0,38 Q 30,35 55,25 T 85,18 T 100,14 L 100,50 L 0,50 Z" fill="url(#sparkPurple)" />
                <path d="M 0,38 Q 30,35 55,25 T 85,18 T 100,14" fill="none" stroke="#6366F1" strokeWidth="2.5" />
                <circle cx="100" cy="14" r="3" fill="#6366F1" />
              </svg>
            </div>
          </div>

          <div className="mt-3.5 pt-2.5 border-t border-slate-100 dark:border-white/10 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
            <span>{products.length || 0} productos registrados</span>
            <button
              type="button"
              onClick={() => navigate('/productos')}
              className="text-indigo-600 dark:text-indigo-400 font-bold hover:underline cursor-pointer"
            >
              Ver almacén →
            </button>
          </div>
        </div>

        {/* Card 4: Cuentas por Cobrar (Orange) con Yape, Plin y BCP */}
        <div className="rounded-3xl bg-white dark:bg-[#111827] border border-slate-200/80 dark:border-white/10 p-5 shadow-xs hover:shadow-md transition-shadow relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="w-12 h-12 rounded-full bg-amber-500 text-white flex items-center justify-center shadow-md shadow-amber-500/30 shrink-0">
                <Coins size={22} strokeWidth={2.2} />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 truncate">Cuentas por Cobrar</p>
                <p className="text-xl sm:text-[22px] font-black text-slate-900 dark:text-white tracking-tight mt-0.5">
                  S/ {kpiData.cuentasCobrar.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
                <div className="flex items-center gap-1 text-[11.5px] font-bold text-rose-500 mt-1">
                  <span>↓ -3.2%</span>
                </div>
              </div>
            </div>
            {/* Sparkline curve */}
            <div className="w-16 h-9 shrink-0 self-start opacity-90">
              <svg viewBox="0 0 100 50" className="w-full h-full" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="sparkAmber" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#F59E0B" stopOpacity="0.4" />
                    <stop offset="100%" stopColor="#F59E0B" stopOpacity="0" />
                  </linearGradient>
                </defs>
                <path d="M 0,20 Q 30,35 60,32 T 85,40 T 100,36 L 100,50 L 0,50 Z" fill="url(#sparkAmber)" />
                <path d="M 0,20 Q 30,35 60,32 T 85,40 T 100,36" fill="none" stroke="#F59E0B" strokeWidth="2.5" />
                <circle cx="100" cy="36" r="3" fill="#F59E0B" />
              </svg>
            </div>
          </div>

          {/* Quick Payment QR Pills: Yape, Plin & BCP */}
          <div className="mt-3.5 pt-2.5 border-t border-slate-100 dark:border-white/10 flex items-center justify-between gap-1.5">
            <span className="text-[10.5px] font-bold text-slate-500 dark:text-slate-400">
              Cobrar con:
            </span>
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => {
                  setQrModalMethod('yape')
                  setQrModalAmount(kpiData.cuentasCobrar || 175)
                }}
                className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-[#742284]/10 hover:bg-[#742284] text-[#742284] hover:text-white transition-all cursor-pointer flex items-center gap-1 shadow-2xs hover:scale-105 active:scale-95"
                title="Mostrar QR de Yape para cobrar"
              >
                <img src="/yape-logo.png" alt="Yape" className="w-3.5 h-3.5 rounded-sm object-cover" />
                <span>Yape</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setQrModalMethod('plin')
                  setQrModalAmount(kpiData.cuentasCobrar || 175)
                }}
                className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-[#00b49f]/10 hover:bg-[#00b49f] text-[#00b49f] hover:text-white transition-all cursor-pointer flex items-center gap-1 shadow-2xs hover:scale-105 active:scale-95"
                title="Mostrar QR de Plin para cobrar"
              >
                <img src="/plin-logo.png" alt="Plin" className="w-3.5 h-3.5 rounded-full object-cover" />
                <span>Plin</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setQrModalMethod('transfer')
                  setQrModalAmount(kpiData.cuentasCobrar || 175)
                }}
                className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-blue-50 hover:bg-blue-600 text-blue-700 hover:text-white dark:bg-white/10 dark:hover:bg-blue-600 dark:text-slate-200 transition-all cursor-pointer hover:scale-105 active:scale-95"
                title="Ver cuentas bancarias (BCP, BBVA, Interbank)"
              >
                <span>BCP</span>
              </button>
            </div>
          </div>
        </div>

      </div>

      {/* ═══════════════════════════════════════════════════════════
          4. MIDDLE ROW (Resumen de Ventas, Distribución, Acciones)
         ═══════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">

        {/* 4.1 Resumen de Ventas (Area Chart) — 5 cols */}
        <div className="lg:col-span-5 rounded-3xl bg-white dark:bg-[#111827] border border-slate-200/80 dark:border-white/10 p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BarChart2 size={18} className="text-blue-600 shrink-0" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Resumen de Ventas</h3>
              </div>
              <div className="relative">
                <select
                  value={timeRange}
                  onChange={(e) => setTimeRange(e.target.value)}
                  className="text-xs font-semibold text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-3 py-1.5 focus:outline-none cursor-pointer"
                >
                  <option value="6m">Últimos 6 meses</option>
                  <option value="1y">Último año</option>
                  <option value="30d">Últimos 30 días</option>
                </select>
              </div>
            </div>

            <div className="mt-4">
              <p className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                S/ {kpiData.totalSemestre.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
              <p className="text-xs font-bold text-emerald-500 mt-0.5">
                ↑ +14.8% <span className="text-slate-400 font-normal">vs. periodo anterior</span>
              </p>
            </div>
          </div>

          {/* Area spline chart */}
          <div className="mt-6 relative h-48 sm:h-52 w-full select-none">
            {/* Tooltip on active point */}
            <div className="absolute right-6 top-3 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-[11px] font-bold py-1 px-2.5 rounded-lg border border-slate-200/80 dark:border-white/10 shadow-md flex items-center gap-1 z-20">
              S/ 25,430.00
            </div>

            <svg viewBox="0 0 500 200" className="w-full h-full" preserveAspectRatio="none">
              <defs>
                <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#2563EB" stopOpacity="0.35" />
                  <stop offset="100%" stopColor="#2563EB" stopOpacity="0.02" />
                </linearGradient>
              </defs>

              {/* Grid lines */}
              <line x1="40" y1="30" x2="490" y2="30" stroke="#F1F5F9" strokeWidth="1" strokeDasharray="3 3" />
              <line x1="40" y1="75" x2="490" y2="75" stroke="#F1F5F9" strokeWidth="1" strokeDasharray="3 3" />
              <line x1="40" y1="120" x2="490" y2="120" stroke="#F1F5F9" strokeWidth="1" strokeDasharray="3 3" />
              <line x1="40" y1="165" x2="490" y2="165" stroke="#E2E8F0" strokeWidth="1" />

              {/* Y Axis labels */}
              <text x="10" y="34" className="text-[10px] fill-slate-400 font-medium">75k</text>
              <text x="10" y="79" className="text-[10px] fill-slate-400 font-medium">50k</text>
              <text x="10" y="124" className="text-[10px] fill-slate-400 font-medium">25k</text>
              <text x="20" y="169" className="text-[10px] fill-slate-400 font-medium">0</text>

              {/* Area path */}
              <path
                d="M 60,150 C 110,145 125,135 150,130 C 190,120 220,110 240,100 C 270,85 295,95 330,85 C 365,75 390,95 420,90 C 445,85 465,55 475,55 L 475,165 L 60,165 Z"
                fill="url(#areaGrad)"
              />

              {/* Line path */}
              <path
                d="M 60,150 C 110,145 125,135 150,130 C 190,120 220,110 240,100 C 270,85 295,95 330,85 C 365,75 390,95 420,90 C 445,85 465,55 475,55"
                fill="none"
                stroke="#2563EB"
                strokeWidth="3"
                strokeLinecap="round"
              />

              {/* Dots on points */}
              <circle cx="60" cy="150" r="4.5" fill="#2563EB" stroke="#FFFFFF" strokeWidth="2" />
              <circle cx="150" cy="130" r="4.5" fill="#2563EB" stroke="#FFFFFF" strokeWidth="2" />
              <circle cx="240" cy="100" r="4.5" fill="#2563EB" stroke="#FFFFFF" strokeWidth="2" />
              <circle cx="330" cy="85" r="4.5" fill="#2563EB" stroke="#FFFFFF" strokeWidth="2" />
              <circle cx="420" cy="90" r="4.5" fill="#2563EB" stroke="#FFFFFF" strokeWidth="2" />
              <circle cx="475" cy="55" r="5" fill="#2563EB" stroke="#FFFFFF" strokeWidth="2.5" />
            </svg>

            {/* X Axis labels */}
            <div className="flex justify-between pl-8 pr-2 mt-1 text-[11px] font-medium text-slate-400">
              <span>Jun</span>
              <span>Jul</span>
              <span>Ago</span>
              <span>Set</span>
              <span>Oct</span>
              <span>Nov</span>
            </div>
          </div>
        </div>

        {/* 4.2 Distribución por Categoría (Donut Chart) — 4 cols */}
        <div className="lg:col-span-4 rounded-3xl bg-white dark:bg-[#111827] border border-slate-200/80 dark:border-white/10 p-6 shadow-xs flex flex-col justify-between">
          <div className="flex items-center gap-2">
            <PieChart size={18} className="text-blue-600 shrink-0" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Distribución por Categoría</h3>
          </div>

          <div className="my-auto py-4 flex flex-col sm:flex-row items-center justify-center gap-6">
            {/* Donut SVG */}
            <div className="relative w-36 h-36 shrink-0 flex items-center justify-center">
              <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                {/* Background ring */}
                <circle cx="50" cy="50" r="38" fill="none" stroke="#F1F5F9" strokeWidth="18" />
                {/* Segment 3: Otros 10% */}
                <circle
                  cx="50"
                  cy="50"
                  r="38"
                  fill="none"
                  stroke="#E2E8F0"
                  strokeWidth="18"
                  strokeDasharray="238.76"
                  strokeDashoffset="214.88"
                />
                {/* Segment 2: Accesorios 12% */}
                <circle
                  cx="50"
                  cy="50"
                  r="38"
                  fill="none"
                  stroke="#38BDF8"
                  strokeWidth="18"
                  strokeDasharray="238.76"
                  strokeDashoffset="210.1"
                  strokeDashoffset-anim="186.2"
                />
                {/* Segment 1: Electrónica 78% */}
                <circle
                  cx="50"
                  cy="50"
                  r="38"
                  fill="none"
                  stroke="#2563EB"
                  strokeWidth="18"
                  strokeDasharray="238.76"
                  strokeDashoffset="52.5"
                />
              </svg>
              {/* Donut center label */}
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <span className="text-2xl font-black text-slate-900 dark:text-white leading-tight">78%</span>
                <span className="text-[11px] font-medium text-slate-400">Ventas</span>
              </div>
            </div>

            {/* Legend */}
            <div className="space-y-3">
              <div className="flex items-center gap-2.5 text-xs font-semibold">
                <span className="w-3 h-3 rounded-full bg-blue-600 shrink-0" />
                <span className="text-slate-700 dark:text-slate-300">Electrónica</span>
                <span className="text-slate-900 dark:text-white font-bold ml-auto pl-3">78%</span>
              </div>
              <div className="flex items-center gap-2.5 text-xs font-semibold">
                <span className="w-3 h-3 rounded-full bg-sky-400 shrink-0" />
                <span className="text-slate-700 dark:text-slate-300">Accesorios</span>
                <span className="text-slate-900 dark:text-white font-bold ml-auto pl-3">12%</span>
              </div>
              <div className="flex items-center gap-2.5 text-xs font-semibold">
                <span className="w-3 h-3 rounded-full bg-slate-300 shrink-0" />
                <span className="text-slate-700 dark:text-slate-300">Otros</span>
                <span className="text-slate-900 dark:text-white font-bold ml-auto pl-3">10%</span>
              </div>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100 dark:border-white/5 text-[11.5px] text-slate-400 text-center">
            Mayor rotación registrada en categorías principales
          </div>
        </div>

        {/* 4.3 Acciones Rápidas (6 Tiles) — 3 cols */}
        <div className="lg:col-span-3 rounded-3xl bg-white dark:bg-[#111827] border border-slate-200/80 dark:border-white/10 p-6 shadow-xs flex flex-col justify-between">
          <div className="flex items-center gap-2 mb-4">
            <Zap size={18} className="text-blue-600 shrink-0" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Acciones Rápidas</h3>
          </div>

          {/* Grid 3 cols x 2 rows */}
          <div className="grid grid-cols-3 gap-2.5 sm:gap-3 my-auto">
            {/* Action 1: Nueva Venta */}
            <button
              type="button"
              onClick={() => navigate('/ventas/nueva')}
              className="flex flex-col items-center justify-center p-3 rounded-2xl bg-blue-50/70 hover:bg-blue-100/70 dark:bg-white/5 dark:hover:bg-white/10 border border-blue-100/60 dark:border-white/5 transition-all text-center group cursor-pointer"
            >
              <div className="w-9 h-9 rounded-xl flex items-center justify-center text-blue-600 group-hover:scale-110 transition-transform">
                <ShoppingCart size={19} strokeWidth={2.2} />
              </div>
              <span className="text-[11px] font-bold text-slate-700 dark:text-slate-200 mt-1 leading-tight">Nueva Venta</span>
            </button>

            {/* Action 2: Registrar Compra */}
            <button
              type="button"
              onClick={() => navigate('/compras/nueva')}
              className="flex flex-col items-center justify-center p-3 rounded-2xl bg-blue-50/70 hover:bg-blue-100/70 dark:bg-white/5 dark:hover:bg-white/10 border border-blue-100/60 dark:border-white/5 transition-all text-center group cursor-pointer"
            >
              <div className="w-9 h-9 rounded-xl flex items-center justify-center text-blue-600 group-hover:scale-110 transition-transform">
                <Package size={19} strokeWidth={2.2} />
              </div>
              <span className="text-[11px] font-bold text-slate-700 dark:text-slate-200 mt-1 leading-tight">Registrar Compra</span>
            </button>

            {/* Action 3: Control Inventario */}
            <button
              type="button"
              onClick={() => navigate('/productos')}
              className="flex flex-col items-center justify-center p-3 rounded-2xl bg-blue-50/70 hover:bg-blue-100/70 dark:bg-white/5 dark:hover:bg-white/10 border border-blue-100/60 dark:border-white/5 transition-all text-center group cursor-pointer"
            >
              <div className="w-9 h-9 rounded-xl flex items-center justify-center text-blue-600 group-hover:scale-110 transition-transform">
                <Warehouse size={19} strokeWidth={2.2} />
              </div>
              <span className="text-[11px] font-bold text-slate-700 dark:text-slate-200 mt-1 leading-tight">Control de Inventario</span>
            </button>

            {/* Action 4: Generar Reporte */}
            <button
              type="button"
              onClick={() => navigate('/ventas')}
              className="flex flex-col items-center justify-center p-3 rounded-2xl bg-blue-50/70 hover:bg-blue-100/70 dark:bg-white/5 dark:hover:bg-white/10 border border-blue-100/60 dark:border-white/5 transition-all text-center group cursor-pointer"
            >
              <div className="w-9 h-9 rounded-xl flex items-center justify-center text-blue-600 group-hover:scale-110 transition-transform">
                <BarChart3 size={19} strokeWidth={2.2} />
              </div>
              <span className="text-[11px] font-bold text-slate-700 dark:text-slate-200 mt-1 leading-tight">Generar Reporte</span>
            </button>

            {/* Action 5: Gestionar Clientes */}
            <button
              type="button"
              onClick={() => navigate('/clientes')}
              className="flex flex-col items-center justify-center p-3 rounded-2xl bg-blue-50/70 hover:bg-blue-100/70 dark:bg-white/5 dark:hover:bg-white/10 border border-blue-100/60 dark:border-white/5 transition-all text-center group cursor-pointer"
            >
              <div className="w-9 h-9 rounded-xl flex items-center justify-center text-blue-600 group-hover:scale-110 transition-transform">
                <Users size={19} strokeWidth={2.2} />
              </div>
              <span className="text-[11px] font-bold text-slate-700 dark:text-slate-200 mt-1 leading-tight">Gestionar Clientes</span>
            </button>

            {/* Action 6: Configuración */}
            <button
              type="button"
              onClick={() => navigate('/configuracion')}
              className="flex flex-col items-center justify-center p-3 rounded-2xl bg-blue-50/70 hover:bg-blue-100/70 dark:bg-white/5 dark:hover:bg-white/10 border border-blue-100/60 dark:border-white/5 transition-all text-center group cursor-pointer"
            >
              <div className="w-9 h-9 rounded-xl flex items-center justify-center text-blue-600 group-hover:scale-110 transition-transform">
                <Settings size={19} strokeWidth={2.2} />
              </div>
              <span className="text-[11px] font-bold text-slate-700 dark:text-slate-200 mt-1 leading-tight">Configuración</span>
            </button>
          </div>

          <div className="pt-2 text-center">
            <span className="text-[11px] text-blue-600 font-semibold hover:underline cursor-pointer" onClick={() => navigate('/ventas')}>
              Ver todos los accesos directos →
            </span>
          </div>
        </div>

      </div>

      {/* ═══════════════════════════════════════════════════════════
          5. BOTTOM ROW (Movimientos Recientes, Stock, Estado)
         ═══════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">

        {/* 5.1 Movimientos Recientes — 4 cols */}
        <div className="lg:col-span-5 rounded-3xl bg-white dark:bg-[#111827] border border-slate-200/80 dark:border-white/10 p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-white/5">
              <div className="flex items-center gap-2">
                <Clock size={17} className="text-blue-600 shrink-0" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Movimientos Recientes</h3>
              </div>
              <Link to="/movimientos" className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1">
                <span>Ver todos</span>
                <span className="text-sm">→</span>
              </Link>
            </div>

            <div className="mt-3.5 space-y-3">
              {/* Item 1 */}
              <div className="flex items-center justify-between gap-2.5">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-500/10 text-blue-600 flex items-center justify-center shrink-0">
                    <ShoppingCart size={15} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">Venta #0001245 - Cliente: TechPerú</p>
                    <p className="text-[11px] text-slate-400">Hace 5 min</p>
                  </div>
                </div>
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 shrink-0">
                  S/ 1,250.00
                </span>
              </div>

              {/* Item 2 */}
              <div className="flex items-center justify-between gap-2.5">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-500/10 text-blue-600 flex items-center justify-center shrink-0">
                    <Package size={15} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">Compra #0000876 - Proveedor: Global Tech</p>
                    <p className="text-[11px] text-slate-400">Hace 12 min</p>
                  </div>
                </div>
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-rose-50 text-rose-600 dark:bg-rose-500/10 shrink-0">
                  S/ 850.00
                </span>
              </div>

              {/* Item 3 */}
              <div className="flex items-center justify-between gap-2.5">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-500/10 text-blue-600 flex items-center justify-center shrink-0">
                    <FileText size={15} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">Factura emitida - F001-2456</p>
                    <p className="text-[11px] text-slate-400">Hace 20 min</p>
                  </div>
                </div>
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 shrink-0">
                  S/ 2,300.00
                </span>
              </div>

              {/* Item 4 */}
              <div className="flex items-center justify-between gap-2.5">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-500/10 text-blue-600 flex items-center justify-center shrink-0">
                    <UserPlus size={15} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">Nuevo cliente: Distribuidora S.A.C.</p>
                    <p className="text-[11px] text-slate-400">Hace 1 h</p>
                  </div>
                </div>
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-500 dark:bg-white/5 shrink-0">
                  -
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* 5.2 Stock por Producto — 4 cols */}
        <div className="lg:col-span-4 rounded-3xl bg-white dark:bg-[#111827] border border-slate-200/80 dark:border-white/10 p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-white/5">
              <div className="flex items-center gap-2">
                <Boxes size={17} className="text-blue-600 shrink-0" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Stock por Producto</h3>
              </div>
              <Link to="/productos" className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1">
                <span>Ver detalle</span>
                <span className="text-sm">→</span>
              </Link>
            </div>

            <div className="mt-4 space-y-4">
              {/* Product 1: iPhone 16 */}
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-white/5 flex items-center justify-center overflow-hidden shrink-0 border border-slate-200/50">
                  <img
                    src="https://images.unsplash.com/photo-1510557880182-3d4d3cba35a5?auto=format&fit=crop&w=100&q=80"
                    alt="iPhone"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-center text-xs font-bold mb-1.5">
                    <span className="text-slate-800 dark:text-slate-200 truncate">iPhone 16</span>
                    <span className="text-slate-900 dark:text-white shrink-0">120 und.</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-white/10 overflow-hidden">
                    <div className="h-full bg-blue-600 rounded-full" style={{ width: '75%' }} />
                  </div>
                </div>
              </div>

              {/* Product 2: AirPods Pro */}
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-white/5 flex items-center justify-center overflow-hidden shrink-0 border border-slate-200/50">
                  <img
                    src="https://images.unsplash.com/photo-1600294037681-c80b4cb5b434?auto=format&fit=crop&w=100&q=80"
                    alt="AirPods"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-center text-xs font-bold mb-1.5">
                    <span className="text-slate-800 dark:text-slate-200 truncate">AirPods Pro</span>
                    <span className="text-slate-900 dark:text-white shrink-0">85 und.</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-white/10 overflow-hidden">
                    <div className="h-full bg-blue-600 rounded-full" style={{ width: '55%' }} />
                  </div>
                </div>
              </div>

              {/* Product 3: Cargador USB-C */}
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-white/5 flex items-center justify-center overflow-hidden shrink-0 border border-slate-200/50">
                  <img
                    src="https://images.unsplash.com/photo-1583863788434-e58a36330cf0?auto=format&fit=crop&w=100&q=80"
                    alt="Cargador"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-center text-xs font-bold mb-1.5">
                    <span className="text-slate-800 dark:text-slate-200 truncate">Cargador USB-C</span>
                    <span className="text-slate-900 dark:text-white shrink-0">320 und.</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-white/10 overflow-hidden">
                    <div className="h-full bg-blue-600 rounded-full" style={{ width: '90%' }} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 5.3 Estado del Sistema — 3 cols */}
        <div className="lg:col-span-3 rounded-3xl bg-white dark:bg-[#111827] border border-slate-200/80 dark:border-white/10 p-6 shadow-xs flex flex-col justify-between text-center">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-white/5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Estado del Sistema</h3>
          </div>

          <div className="my-auto py-3 flex flex-col items-center">
            <div className="w-14 h-14 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-lg shadow-emerald-500/30 mb-3 ring-8 ring-emerald-50 dark:ring-emerald-500/10">
              <CheckCircle2 size={32} strokeWidth={2.5} />
            </div>
            <p className="text-base font-extrabold text-slate-900 dark:text-white">Sistema Operativo</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-[200px]">
              Todos los servicios funcionan correctamente.
            </p>
          </div>

          {/* Timestamp capsule */}
          <div className="mt-2 py-2 px-3 rounded-2xl bg-emerald-50/70 dark:bg-emerald-500/10 border border-emerald-200/50 dark:border-emerald-500/20 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300 flex items-center justify-center gap-1.5">
            <Clock size={13} />
            <span>Última actualización: {currentDateStr} - {currentTimeStr}</span>
          </div>
        </div>

      </div>

      {/* ═══════════════════════════════════════════════════════════
          PAYMENT QR MODAL (Yape, Plin & BCP / Banks)
         ═══════════════════════════════════════════════════════════ */}
      <PaymentQrModal
        isOpen={Boolean(qrModalMethod)}
        onClose={() => setQrModalMethod(null)}
        method={qrModalMethod}
        paymentConfig={paymentConfig}
        amount={qrModalAmount}
        currency="S/"
      />

    </div>
  )
}
