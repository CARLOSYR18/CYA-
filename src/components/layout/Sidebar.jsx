import { useState, useEffect } from 'react'
import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard, Boxes, Tags, ArrowLeftRight, ShoppingCart,
  Truck, Users, UserCog, Warehouse, X, Settings2, Sparkles, ShieldAlert,
  ChevronsLeft, ChevronsRight
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

function Label({ children, isCollapsed }) {
  if (isCollapsed) {
    return <div className="border-t border-slate-200/60 dark:border-zinc-800/80 my-2 mx-3" />
  }
  return <p className="px-3 pt-5 pb-1.5 text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400 truncate">{children}</p>
}

function Item({ to, label, icon: Icon, end, onClick, isCollapsed }) {
  return (
    <NavLink
      to={to}
      end={end}
      onClick={onClick}
      title={isCollapsed ? label : undefined}
      className={({ isActive }) =>
        `relative flex items-center ${
          isCollapsed
            ? 'justify-center mx-2 px-0 py-2.5 rounded-xl'
            : 'gap-2.5 mx-2 px-3 py-2.5 rounded-xl text-[13.5px]'
        } font-medium transition-all duration-150 ${
          isActive
            ? 'bg-blue-50 text-blue-700 dark:bg-blue-600/15 dark:text-blue-400 font-semibold'
            : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60 hover:text-slate-800 dark:hover:text-slate-200'
        }`
      }
    >
      {({ isActive }) => (
        <>
          {isActive && !isCollapsed && (
            <span className="absolute left-0 top-[20%] bottom-[20%] w-[3px] bg-blue-600 rounded-r-full" />
          )}
          <Icon
            size={18}
            strokeWidth={isActive ? 2.2 : 1.8}
            className={isActive ? 'text-blue-600 dark:text-blue-400 shrink-0' : 'text-slate-400 shrink-0'}
          />
          {!isCollapsed && <span className="truncate">{label}</span>}
        </>
      )}
    </NavLink>
  )
}

export default function Sidebar({ isOpen, onClose, isCollapsed = false, onToggleCollapse }) {
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

  // En móvil (cuando el sidebar se abre como drawer), siempre mostrar versión completa
  // isCollapsed solo aplica en desktop (lg+)
  const effectiveCollapsed = isCollapsed && !isOpen

  return (
    <>
      {isOpen && (
        <div className="fixed inset-0 bg-black/40 z-50 lg:hidden animate-fade-in" onClick={onClose} />
      )}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 flex flex-col h-screen shrink-0 bg-white dark:bg-[#121215] border-r border-slate-200 dark:border-[#27272a] transition-[width,transform] duration-300 ease-in-out ${
          isOpen ? 'translate-x-0 w-64' : '-translate-x-full lg:translate-x-0'
        } ${isCollapsed ? 'lg:w-[72px]' : 'lg:w-64'}`}
      >

        {/* Floating Circular Toggle Button on the sidebar border — desktop only */}
        {onToggleCollapse && (
          <button
            type="button"
            onClick={onToggleCollapse}
            className="hidden lg:flex absolute -right-3.5 top-5 z-50 w-7 h-7 rounded-full bg-white dark:bg-[#18181c] border-2 border-blue-500/60 dark:border-blue-400/70 shadow-md ring-2 ring-blue-500/15 items-center justify-center text-blue-600 dark:text-blue-400 hover:scale-110 hover:border-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 hover:shadow-lg transition-all cursor-pointer"
            title={isCollapsed ? 'Expandir menú lateral' : 'Contraer menú lateral'}
            aria-label={isCollapsed ? 'Expandir menú lateral' : 'Contraer menú lateral'}
          >
            {isCollapsed ? <ChevronsRight size={14} strokeWidth={2.5} /> : <ChevronsLeft size={14} strokeWidth={2.5} />}
          </button>
        )}

        {/* Logo Header */}
        <div className={`h-[64px] flex items-center ${effectiveCollapsed ? 'justify-center px-2' : 'justify-between px-4'} border-b border-slate-200 dark:border-[#27272a] shrink-0`}>
          <div className="flex items-center gap-3 min-w-0">
            <div
              className="w-9 h-9 rounded-full overflow-hidden bg-black shrink-0 flex items-center justify-center"
              title={effectiveCollapsed ? 'CYA STORE' : undefined}
            >
              <img
                src="/logo.png"
                alt="CYA"
                className="w-full h-full object-contain"
                onError={(e) => {
                  e.currentTarget.src = '/logo-cya-badge.png'
                }}
              />
            </div>
            {!effectiveCollapsed && (
              <div className="min-w-0">
                <p className="font-display font-bold text-slate-900 dark:text-white text-[14.5px] leading-tight truncate">
                  CYA STORE
                </p>
                <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider mt-0.5 truncate">
                  {isPlatformAdmin ? 'Super Administrador' : 'Gestión Empresarial'}
                </p>
              </div>
            )}
          </div>

          <button onClick={onClose} className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100">
            <X size={16} />
          </button>
        </div>

        {/* Navigation list */}
        <nav className="flex-1 overflow-y-auto py-2.5 pb-14 space-y-0.5 overscroll-contain">
          {!isPlatformAdmin ? (
            <>
              <Label isCollapsed={effectiveCollapsed}>Principal</Label>
              {NAV_MAIN.map((i) => (
                <Item key={i.to} {...i} onClick={onClose} isCollapsed={effectiveCollapsed} />
              ))}
              <Label isCollapsed={effectiveCollapsed}>Catálogo</Label>
              {NAV_CAT.map((i) => (
                <Item key={i.to} {...i} onClick={onClose} isCollapsed={effectiveCollapsed} />
              ))}
              {isAdmin && (
                <>
                  <Label isCollapsed={effectiveCollapsed}>Administración</Label>
                  {NAV_ADM.map((i) => (
                    <Item key={i.to} {...i} onClick={onClose} isCollapsed={effectiveCollapsed} />
                  ))}
                </>
              )}
            </>
          ) : (
            <>
              <Label isCollapsed={effectiveCollapsed}>Plataforma</Label>
              {NAV_PLATFORM.map((i) => (
                <Item key={i.to} {...i} onClick={onClose} isCollapsed={effectiveCollapsed} />
              ))}
            </>
          )}
        </nav>

        {/* Mini Plan Upgrade Card */}
        {!isPlatformAdmin && (
          <div className={`${effectiveCollapsed ? 'p-2 flex justify-center' : 'px-3 py-2'} border-t border-slate-200/80 dark:border-[#27272a] shrink-0 bg-white dark:bg-[#121215]`}>
            {effectiveCollapsed ? (
              <NavLink
                to="/planes"
                onClick={onClose}
                className="w-10 h-10 rounded-xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-amber-400 flex items-center justify-center border border-slate-700/60 hover:scale-105 transition-transform"
                title={`${activePlan.name} ${isPro ? '(ACTIVO)' : ''}`}
              >
                <Sparkles size={16} className={isPro ? 'animate-pulse' : ''} />
              </NavLink>
            ) : (
              <NavLink
                to="/planes"
                onClick={onClose}
                className="group flex flex-col p-3 rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white shadow-sm border border-slate-700/60 hover:border-blue-400/60 hover:shadow-md transition-all"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Sparkles size={13} className={isPro ? 'text-amber-400 animate-pulse' : 'text-blue-400'} />
                    <span className="text-xs font-bold text-white tracking-tight truncate">
                      {activePlan.name}
                    </span>
                  </div>
                  {isPro ? (
                    <span className="text-[9px] font-extrabold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-1.5 py-0.5 rounded-md shrink-0">
                      ACTIVO
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold text-amber-300 group-hover:underline flex items-center gap-0.5 shrink-0">
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
            )}
          </div>
        )}

        {/* System Active Footer */}
        <div className={`${effectiveCollapsed ? 'p-2 flex justify-center' : 'p-3'} border-t border-slate-200/80 dark:border-[#27272a] shrink-0 bg-white dark:bg-[#121215]`}>
          {effectiveCollapsed ? (
            <div
              className="w-10 h-10 rounded-xl bg-slate-50 dark:bg-[#18181c] border border-slate-200 dark:border-[#27272a] flex items-center justify-center"
              title="Sistema activo v1.2"
            >
              <span className="relative flex h-2.5 w-2.5 shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-slate-50 dark:bg-[#18181c] border border-slate-200 dark:border-[#27272a]">
              <span className="relative flex h-2 w-2 shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400 flex-1 truncate">
                {isPlatformAdmin ? 'Plataforma activa' : 'Sistema activo'}
              </span>
              <span className="text-[10px] text-slate-400 font-mono">v1.2</span>
            </div>
          )}
        </div>

      </aside>
    </>
  )
}
