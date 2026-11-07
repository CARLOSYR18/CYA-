import { useState, useEffect } from 'react'
import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard, Boxes, Tags, ArrowLeftRight, ShoppingCart,
  Truck, Users, UserCog, Warehouse, X, Settings2, Sparkles, ShieldAlert,
  ChevronsLeft, ChevronsRight, UserCircle, Activity
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { planService } from '../../services/planService'
import { companySettingsService } from '../../services/companySettingsService'

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
const NAV_USER = [
  { to: '/perfil', label: 'Mi Perfil', icon: UserCircle },
]
const NAV_ADM = [
  { to: '/actividad-empleados', label: 'Movimientos Empleados', icon: Activity },
  { to: '/usuarios', label: 'Usuarios y Roles', icon: UserCog },
  { to: '/planes', label: 'Tu Plan', icon: Sparkles },
  { to: '/configuracion', label: 'Empresa', icon: Settings2 },
]
const NAV_PLATFORM = [
  { to: '/admin-plataforma', label: 'Panel Plataforma', icon: ShieldAlert },
]

function Label({ children, isCollapsed }) {
  if (isCollapsed) {
    return <div className="border-t border-slate-200/80 dark:border-slate-800 my-2.5 mx-3" />
  }
  return (
    <p className="px-3 pt-4 pb-1.5 text-[10px] font-extrabold uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500 truncate">
      {children}
    </p>
  )
}

function Item({ to, label, icon: Icon, end, onClick, isCollapsed }) {
  return (
    <NavLink
      to={to}
      end={end}
      onClick={onClick}
      title={isCollapsed ? label : undefined}
      className={({ isActive }) =>
        `group relative flex items-center transition-all duration-150 ${
          isCollapsed
            ? 'justify-center mx-1 px-0 py-2.5 rounded-xl'
            : 'gap-2.5 mx-1 px-3 py-2.5 rounded-xl text-[13.5px]'
        } font-medium ${
          isActive
            ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold shadow-md shadow-blue-500/25'
            : 'text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50/80 dark:hover:bg-blue-950/40 active:scale-[0.98]'
        }`
      }
    >
      {({ isActive }) => (
        <>
          <Icon
            size={18}
            strokeWidth={isActive ? 2.2 : 1.9}
            className={`shrink-0 transition-transform duration-150 ${
              isActive
                ? 'text-white'
                : 'text-slate-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 group-hover:scale-105'
            }`}
          />
          {!isCollapsed && (
            <>
              <span className="truncate flex-1">{label}</span>
              {isActive && (
                <span className="w-1.5 h-1.5 rounded-full bg-white shadow-[0_0_8px_rgba(255,255,255,0.9)] shrink-0" />
              )}
            </>
          )}
        </>
      )}
    </NavLink>
  )
}

export default function Sidebar({ isOpen, onClose, isCollapsed = false, onToggleCollapse }) {
  const { isAdmin, isPlatformAdmin } = useAuth()
  const [activePlan, setActivePlan] = useState(planService.getActivePlanData())
  const [company, setCompany] = useState(() => companySettingsService.getCached())

  useEffect(() => {
    companySettingsService.get().then(c => { if (c) setCompany(c) }).catch(() => {})
    const handleCompanyChange = (e) => {
      if (e.detail) setCompany(e.detail)
      else companySettingsService.get().then(c => { if (c) setCompany(c) }).catch(() => {})
    }
    window.addEventListener('cya_company_updated', handleCompanyChange)
    return () => window.removeEventListener('cya_company_updated', handleCompanyChange)
  }, [])

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
        className={`fixed top-0 bottom-0 left-0 z-50 flex flex-col h-screen shrink-0 bg-white dark:bg-[#101726] border-r border-slate-200/90 dark:border-slate-800 text-slate-800 dark:text-slate-200 shadow-sm transition-[width,transform] duration-300 ease-in-out ${
          isOpen ? 'translate-x-0 w-64' : '-translate-x-full lg:translate-x-0'
        } ${isCollapsed ? 'lg:w-[72px]' : 'lg:w-64'}`}
      >

        {/* Floating Circular Toggle Button on the sidebar border — desktop only */}
        {onToggleCollapse && (
          <button
            type="button"
            onClick={onToggleCollapse}
            className="hidden lg:flex absolute -right-3 top-5 z-50 w-6 h-6 rounded-full bg-white dark:bg-[#182234] border border-slate-200 dark:border-slate-700 shadow-md items-center justify-center text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:border-blue-400 hover:scale-110 transition-all cursor-pointer"
            title={isCollapsed ? 'Expandir menú lateral' : 'Contraer menú lateral'}
            aria-label={isCollapsed ? 'Expandir menú lateral' : 'Contraer menú lateral'}
          >
            {isCollapsed ? <ChevronsRight size={13} strokeWidth={2.5} /> : <ChevronsLeft size={13} strokeWidth={2.5} />}
          </button>
        )}

        {/* Logo Header */}
        <div className={`h-[64px] flex items-center ${effectiveCollapsed ? 'justify-center px-2' : 'justify-between px-4'} border-b border-slate-100 dark:border-slate-800/90 shrink-0 bg-white/80 dark:bg-[#101726]/80 backdrop-blur-sm`}>
          <div className="flex items-center gap-3 min-w-0">
            <div
              className={`h-10 ${effectiveCollapsed ? 'w-10' : 'min-w-[40px] max-w-[60px]'} rounded-xl overflow-hidden bg-slate-50 dark:bg-slate-800 shrink-0 flex items-center justify-center border border-slate-200/80 dark:border-slate-700 shadow-2xs p-1`}
              title={effectiveCollapsed ? (company?.name || 'CYA STORE') : undefined}
            >
              <img
                src={company?.logo_url || '/logo.png'}
                alt={company?.name || 'CYA'}
                className="max-h-full max-w-full w-auto h-auto object-contain"
                onError={(e) => {
                  e.currentTarget.src = '/logo-cya-badge.png'
                }}
              />
            </div>
            {!effectiveCollapsed && (
              <div className="min-w-0">
                <p className="font-display font-bold text-slate-900 dark:text-white text-[14px] leading-tight truncate">
                  {company?.name || 'CYA STORE'}
                </p>
                <p className="text-[10.5px] text-blue-600 dark:text-blue-400 font-semibold uppercase tracking-wider mt-0.5 truncate">
                  {isPlatformAdmin ? 'Super Administrador' : (company?.ruc ? `RUC: ${company.ruc}` : 'Gestión Empresarial')}
                </p>
              </div>
            )}
          </div>

          <button onClick={onClose} className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
            <X size={16} />
          </button>
        </div>

        {/* Navigation list with hidden native scrollbar and ample bottom padding */}
        <nav className="flex-1 min-h-0 overflow-y-auto px-2 py-3 space-y-0.5 no-scrollbar overscroll-contain pb-8">
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
              <Label isCollapsed={effectiveCollapsed}>Mi Cuenta</Label>
              {NAV_USER.map((i) => (
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

        {/* Upgrade Card ONLY for Free Plan Admins (disappears on Pro/Paid plans) */}
        {!isPlatformAdmin && isAdmin && !isPro && (
          <div className={`${effectiveCollapsed ? 'p-2 flex justify-center' : 'p-3'} border-t border-slate-100 dark:border-slate-800 shrink-0 bg-slate-50/60 dark:bg-slate-900/40`}>
            {effectiveCollapsed ? (
              <NavLink
                to="/planes"
                onClick={onClose}
                className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 text-amber-300 flex items-center justify-center border border-blue-400/40 hover:scale-105 transition-all shadow-md"
                title="Mejorar a Plan Pro"
              >
                <Sparkles size={16} className="animate-pulse" />
              </NavLink>
            ) : (
              <NavLink
                to="/planes"
                onClick={onClose}
                className="relative overflow-hidden group flex flex-col p-3 rounded-2xl bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-700 text-white shadow-md shadow-blue-500/20 border border-blue-400/40 hover:shadow-lg hover:border-blue-300 transition-all"
              >
                <div className="absolute -top-10 -right-10 w-24 h-24 bg-white/10 rounded-full blur-lg pointer-events-none group-hover:bg-white/20 transition-all" />
                <div className="flex items-center justify-between relative z-10">
                  <div className="flex items-center gap-1.5">
                    <Sparkles size={14} className="text-amber-300 animate-pulse" />
                    <span className="text-xs font-bold text-white tracking-tight">
                      Actualizar a Pro
                    </span>
                  </div>
                  <span className="text-[10px] font-bold bg-amber-400 text-slate-950 px-2 py-0.5 rounded-full shadow-xs shrink-0 flex items-center gap-0.5 group-hover:scale-105 transition-transform">
                    Mejorar ↗
                  </span>
                </div>
                <p className="text-[10.5px] text-blue-100/90 mt-1.5 leading-tight relative z-10">
                  Desbloquea IA y productos ilimitados
                </p>
              </NavLink>
            )}
          </div>
        )}

        {/* System Active Footer */}
        <div className={`${effectiveCollapsed ? 'p-2 flex justify-center' : 'p-3'} border-t border-slate-100 dark:border-slate-800 shrink-0 bg-slate-50/50 dark:bg-[#0B101B]/80`}>
          {effectiveCollapsed ? (
            <div
              className="w-10 h-10 rounded-xl bg-white dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 flex items-center justify-center shadow-2xs"
              title="Sistema activo v1.2"
            >
              <span className="relative flex h-2.5 w-2.5 shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.7)]" />
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-white dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 shadow-2xs">
              <span className="relative flex h-2 w-2 shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.7)]" />
              </span>
              <span className="text-[11.5px] font-medium text-slate-600 dark:text-slate-300 flex-1 truncate">
                {isPlatformAdmin ? 'Plataforma activa' : 'Sistema activo'}
              </span>
              <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono font-semibold">v1.2</span>
            </div>
          )}
        </div>

      </aside>
    </>
  )
}
