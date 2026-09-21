import { useState, useEffect } from 'react'
import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard, Boxes, Tags, ArrowLeftRight, ShoppingCart,
  Truck, Users, UserCog, Warehouse, X, Settings2, Sparkles, ShieldAlert
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { planService } from '../../services/planService'

const NAV_MAIN = [
  { to: '/', label: 'Panel', icon: LayoutDashboard, end: true },
  { to: '/ventas', label: 'Ventas', icon: ShoppingCart },
  { to: '/compras', label: 'Compras', icon: Truck },
  { to: '/productos', label: 'Productos', icon: Boxes },
  { to: '/clientes', label: 'Clientes', icon: Users },
  { to: '/movimientos', label: 'Movimientos', icon: ArrowLeftRight },
]
const NAV_CAT = [
  { to: '/categorias', label: 'Categorías', icon: Tags },
  { to: '/proveedores', label: 'Proveedores', icon: Warehouse },
]
const NAV_ADM = [
  { to: '/planes', label: 'Tu Plan', icon: Sparkles },
  { to: '/usuarios', label: 'Usuarios', icon: UserCog },
  { to: '/configuracion', label: 'Empresa', icon: Settings2 },
]
const NAV_PLATFORM = [
  { to: '/admin-plataforma', label: 'Panel Plataforma', icon: ShieldAlert },
]

function Label({ children }) {
  return <p className="px-3 pt-5 pb-1.5 text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400">{children}</p>
}

function Item({ to, label, icon: Icon, end, onClick }) {
  return (
    <NavLink to={to} end={end} onClick={onClick}
      className={({ isActive }) =>
        `relative flex items-center gap-2.5 mx-2 px-3 py-2.5 rounded-xl text-[13.5px] font-medium transition-all duration-150 ${isActive
          ? 'bg-blue-50 text-blue-700 font-semibold'
          : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800'
        }`
      }>
      {({ isActive }) => (
        <>
          {isActive && <span className="absolute left-0 top-[20%] bottom-[20%] w-[3px] bg-blue-600 rounded-r-full" />}
          <Icon size={16} strokeWidth={isActive ? 2.2 : 1.8}
            className={isActive ? 'text-blue-600 shrink-0' : 'text-slate-400 shrink-0'} />
          <span className="truncate">{label}</span>
        </>
      )}
    </NavLink>
  )
}

export default function Sidebar({ isOpen, onClose }) {
  const { isAdmin, isPlatformAdmin } = useAuth()
  const [activePlan, setActivePlan] = useState(planService.getActivePlanData())

  useEffect(() => {
    const handlePlanChange = () => {
      setActivePlan(planService.getActivePlanData())
    }
    window.addEventListener('cya_plan_changed', handlePlanChange)
    return () => window.removeEventListener('cya_plan_changed', handlePlanChange)
  }, [])

  const isPro = activePlan.id !== 'free'

  return (
    <>
      {isOpen && (
        <div className="fixed inset-0 bg-black/40 z-40 lg:hidden animate-fade-in" onClick={onClose} />
      )}
      <aside className={`fixed lg:sticky top-0 inset-y-0 left-0 z-50 flex flex-col h-screen w-64 shrink-0 bg-white border-r border-slate-200 transition-transform duration-300 ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>

        {/* Logo */}
        <div className="h-[64px] flex items-center justify-between px-4 border-b border-slate-200 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-full overflow-hidden bg-black shrink-0 flex items-center justify-center">
              <img src="/logo.png" alt="CYA" className="w-full h-full object-contain"
                onError={e => { e.currentTarget.src = '/logo-cya-badge.png' }} />
            </div>
            <div className="min-w-0">
              <p className="font-display font-bold text-slate-900 text-[14.5px] leading-tight truncate">CYA STORE</p>
              <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider mt-0.5">
                {isPlatformAdmin ? 'Super Administrador' : 'Gestión Empresarial'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100">
            <X size={16} />
          </button>
        </div>

        {/* Nav: menú diferenciado para platform admin vs empresa normal */}
        <nav className="flex-1 overflow-y-auto py-2 space-y-0.5">
          {!isPlatformAdmin ? (
            <>
              <Label>Principal</Label>
              {NAV_MAIN.map(i => <Item key={i.to} {...i} onClick={onClose} />)}
              <Label>Catálogo</Label>
              {NAV_CAT.map(i => <Item key={i.to} {...i} onClick={onClose} />)}
              {isAdmin && (<>
                <Label>Administración</Label>
                {NAV_ADM.map(i => <Item key={i.to} {...i} onClick={onClose} />)}
              </>)}
            </>
          ) : (
            <>
              <Label>Plataforma</Label>
              {NAV_PLATFORM.map(i => <Item key={i.to} {...i} onClick={onClose} />)}
            </>
          )}
        </nav>

        {/* Mini Plan Upgrade Card (solo para cuentas normales de empresa) */}
        {!isPlatformAdmin && (
          <div className="px-3 pt-2 pb-1 border-t border-slate-100 shrink-0">
            <NavLink
              to="/planes"
              onClick={onClose}
              className="group flex flex-col p-3 rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white shadow-md border border-slate-700/60 hover:border-blue-400/60 hover:shadow-lg transition-all"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Sparkles size={13} className={isPro ? 'text-amber-400 animate-pulse' : 'text-blue-400'} />
                  <span className="text-xs font-bold text-white tracking-tight">
                    {activePlan.name}
                  </span>
                </div>
                {isPro ? (
                  <span className="text-[9px] font-extrabold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-1.5 py-0.5 rounded-md">
                    ACTIVO
                  </span>
                ) : (
                  <span className="text-[10px] font-bold text-amber-300 group-hover:underline flex items-center gap-0.5">
                    Mejorar ↗
                  </span>
                )}
              </div>
              <p className="text-[10.5px] text-slate-400 mt-1.5 leading-tight">
                {isPro
                  ? 'Acceso completo • Soporte 24/7'
                  : '10 consultas IA • 50 productos'}
              </p>
            </NavLink>
          </div>
        )}

        {/* Footer */}
        <div className="p-3 border-t border-slate-200 shrink-0">
          <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200">
            <span className="relative flex h-2 w-2 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            <span className="text-xs font-medium text-slate-500 flex-1">
              {isPlatformAdmin ? 'Plataforma activa' : 'Sistema activo'}
            </span>
            <span className="text-[10px] text-slate-400 font-mono">v1.2</span>
          </div>
        </div>
      </aside>
    </>
  )
}
