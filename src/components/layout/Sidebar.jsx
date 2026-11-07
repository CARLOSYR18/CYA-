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
    return <div className="border-t border-white/10 my-2.5 mx-3" />
  }
  return (
    <p className="px-3 pt-4 pb-1.5 text-[10px] font-extrabold uppercase tracking-[0.16em] text-blue-300/60 truncate">
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
            ? 'justify-center mx-1.5 px-0 py-2.5 rounded-xl'
            : 'gap-2.5 mx-1.5 px-3 py-2.5 rounded-xl text-[13px]'
        } font-medium ${
          isActive
            ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold shadow-md shadow-blue-600/30'
            : 'text-slate-300/85 hover:text-white hover:bg-white/[0.08] active:scale-[0.98]'
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
                : 'text-slate-400 group-hover:text-blue-300 group-hover:scale-105'
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
        className={`fixed top-0 bottom-0 left-0 z-50 flex flex-col h-screen shrink-0 bg-gradient-to-b from-[#0A182E] via-[#091527] to-[#060E1B] border-r border-[#14233D] text-slate-200 shadow-2xl transition-[width,transform] duration-300 ease-in-out ${
          isOpen ? 'translate-x-0 w-64' : '-translate-x-full lg:translate-x-0'
        } ${isCollapsed ? 'lg:w-[72px]' : 'lg:w-64'}`}
      >

        {/* Floating Circular Toggle Button on the sidebar border — desktop only */}
        {onToggleCollapse && (
          <button
            type="button"
            onClick={onToggleCollapse}
            className="hidden lg:flex absolute -right-3 top-5 z-50 w-6 h-6 rounded-full bg-[#0E1F3B] border border-blue-400/40 shadow-lg items-center justify-center text-blue-300 hover:text-white hover:bg-blue-600 hover:border-blue-400 hover:scale-110 transition-all cursor-pointer"
            title={isCollapsed ? 'Expandir menú lateral' : 'Contraer menú lateral'}
            aria-label={isCollapsed ? 'Expandir menú lateral' : 'Contraer menú lateral'}
          >
            {isCollapsed ? <ChevronsRight size={13} strokeWidth={2.5} /> : <ChevronsLeft size={13} strokeWidth={2.5} />}
          </button>
        )}

        {/* Logo Header */}
        <div className={`h-[64px] flex items-center ${effectiveCollapsed ? 'justify-center px-2' : 'justify-between px-4'} border-b border-[#14233D] shrink-0 bg-[#0A182E]/60 backdrop-blur-sm`}>
          <div className="flex items-center gap-3 min-w-0">
            <div
              className={`h-10 ${effectiveCollapsed ? 'w-10' : 'min-w-[40px] max-w-[60px]'} rounded-xl overflow-hidden bg-white/95 shrink-0 flex items-center justify-center border border-white/20 shadow-md p-1`}
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
                <p className="font-display font-bold text-white text-[14.5px] leading-tight truncate">
                  {company?.name || 'CYA STORE'}
                </p>
                <p className="text-[10px] text-blue-300/70 font-semibold uppercase tracking-wider mt-0.5 truncate">
                  {isPlatformAdmin ? 'Super Administrador' : (company?.ruc ? `RUC: ${company.ruc}` : 'Gestión Empresarial')}
                </p>
              </div>
            )}
          </div>

          <button onClick={onClose} className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors">
            <X size={16} />
          </button>
        </div>

        {/* Navigation list with hidden native scrollbar */}
        <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-0.5 no-scrollbar overscroll-contain">
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

        {/* Mini Plan Upgrade Card for Admin / Profile Card for Employee */}
        {!isPlatformAdmin && (
          <div className={`${effectiveCollapsed ? 'p-2 flex justify-center' : 'p-3'} border-t border-[#14233D] shrink-0 bg-[#081222]/80 backdrop-blur-sm`}>
            {isAdmin ? (
              effectiveCollapsed ? (
                <NavLink
                  to="/planes"
                  onClick={onClose}
                  className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#0F223D] to-[#0A182E] text-amber-400 flex items-center justify-center border border-blue-500/30 hover:scale-105 hover:border-blue-400 transition-all shadow-md"
                  title={`${activePlan.name} ${isPro ? '(ACTIVO)' : ''}`}
                >
                  <Sparkles size={16} className={isPro ? 'animate-pulse' : ''} />
                </NavLink>
              ) : (
                <NavLink
                  to="/planes"
                  onClick={onClose}
                  className="relative overflow-hidden group flex flex-col p-3 rounded-2xl bg-gradient-to-br from-[#0F223D] via-[#0C1B32] to-[#081324] text-white shadow-lg border border-blue-500/25 hover:border-blue-400/60 hover:shadow-blue-900/20 transition-all"
                >
                  <div className="absolute -top-12 -right-12 w-28 h-28 bg-blue-500/10 rounded-full blur-xl pointer-events-none group-hover:bg-blue-400/20 transition-all" />
                  <div className="flex items-center justify-between relative z-10">
                    <div className="flex items-center gap-1.5">
                      <Sparkles size={13} className={isPro ? 'text-amber-400 animate-pulse' : 'text-blue-400'} />
                      <span className="text-xs font-bold text-white tracking-tight truncate">
                        {activePlan.name}
                      </span>
                    </div>
                    {isPro ? (
                      <span className="text-[9px] font-extrabold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 px-2 py-0.5 rounded-full shadow-xs tracking-wide">
                        ACTIVO
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold text-amber-300 group-hover:text-amber-200 flex items-center gap-0.5 shrink-0">
                        Mejorar ↗
                      </span>
                    )}
                  </div>
                  <p className="text-[10.5px] text-blue-200/65 mt-1.5 leading-tight relative z-10">
                    {isPro
                      ? 'Acceso completo • Soporte 24/7'
                      : '10 consultas IA • 50 productos'}
                  </p>
                </NavLink>
              )
            ) : (
              <NavLink
                to="/perfil"
                onClick={onClose}
                className={`group flex items-center ${effectiveCollapsed ? 'justify-center p-1.5' : 'gap-2.5 p-2.5'} rounded-2xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] hover:border-blue-400/40 transition-all`}
                title={effectiveCollapsed ? 'Mi Perfil' : undefined}
              >
                <div className="w-8 h-8 rounded-xl bg-blue-500/20 text-blue-300 flex items-center justify-center font-bold text-xs shrink-0 border border-blue-400/30">
                  <UserCircle size={18} />
                </div>
                {!effectiveCollapsed && (
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-slate-200 truncate group-hover:text-blue-300">
                      Mi Perfil
                    </p>
                    <p className="text-[10px] text-slate-400 truncate">
                      Colaborador Activo
                    </p>
                  </div>
                )}
              </NavLink>
            )}
          </div>
        )}

        {/* System Active Footer */}
        <div className={`${effectiveCollapsed ? 'p-2 flex justify-center' : 'p-3'} border-t border-[#14233D] shrink-0 bg-[#060D18]/90`}>
          {effectiveCollapsed ? (
            <div
              className="w-10 h-10 rounded-xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center"
              title="Sistema activo v1.2"
            >
              <span className="relative flex h-2.5 w-2.5 shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.9)]" />
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-white/[0.04] border border-white/[0.08]">
              <span className="relative flex h-2 w-2 shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.9)]" />
              </span>
              <span className="text-[11.5px] font-medium text-slate-300 flex-1 truncate">
                {isPlatformAdmin ? 'Plataforma activa' : 'Sistema activo'}
              </span>
              <span className="text-[10px] text-blue-300/60 font-mono font-semibold">v1.2</span>
            </div>
          )}
        </div>

      </aside>
    </>
  )
}
