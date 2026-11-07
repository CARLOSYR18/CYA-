import { useState, useEffect } from 'react'
import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard, Boxes, Tags, ArrowLeftRight, ShoppingCart,
  Truck, Users, UserCog, Warehouse, X, Settings2, Sparkles, ShieldAlert,
  ChevronsLeft, ChevronsRight, UserCircle, Activity, LogOut
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { planService } from '../../services/planService'
import { companySettingsService } from '../../services/companySettingsService'

const COLORS = ['#3B82F6', '#8B5CF6', '#10B981', '#F59E0B', '#EF4444', '#06B6D4']
function avatarColor(name = '') {
  let h = 0
  for (const c of name) h = c.charCodeAt(0) + ((h << 5) - h)
  return COLORS[Math.abs(h) % COLORS.length]
}

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
    return <div className="border-t border-slate-200 dark:border-slate-800 my-2.5 mx-3" />
  }
  return (
    <p className="px-3 pt-4 pb-1.5 text-[10.5px] font-bold uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500 truncate">
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
            : 'gap-2.5 mx-1.5 px-3 py-2.5 rounded-xl text-[13.5px]'
        } font-medium ${
          isActive
            ? 'bg-blue-600 text-white font-semibold shadow-xs'
            : 'text-slate-600 dark:text-slate-300 hover:text-blue-700 dark:hover:text-white hover:bg-white/80 dark:hover:bg-slate-800/60 active:scale-[0.98]'
        }`
      }
    >
      {({ isActive }) => (
        <>
          <Icon
            size={18}
            strokeWidth={isActive ? 2.2 : 1.9}
            className={`shrink-0 transition-colors ${
              isActive
                ? 'text-white'
                : 'text-slate-400 group-hover:text-blue-600 dark:group-hover:text-blue-400'
            }`}
          />
          {!isCollapsed && <span className="truncate flex-1">{label}</span>}
        </>
      )}
    </NavLink>
  )
}

export default function Sidebar({ isOpen, onClose, isCollapsed = false, onToggleCollapse }) {
  const { user, logout, requestLogout, isAdmin, isPlatformAdmin } = useAuth()
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

  const handleLogout = (e) => {
    e?.stopPropagation?.()
    if (onClose) onClose()
    if (requestLogout) requestLogout()
    else if (logout) logout()
  }

  const isPro = activePlan?.id !== 'free'

  // User initials & avatar background color
  const userInitial = user?.full_name
    ? user.full_name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()
    : (user?.email ? user.email.charAt(0).toUpperCase() : 'U')
  const userBgColor = avatarColor(user?.full_name || user?.email || '')

  // En móvil (cuando el sidebar se abre como drawer), siempre mostrar versión completa
  const effectiveCollapsed = isCollapsed && !isOpen

  return (
    <>
      {isOpen && (
        <div className="fixed inset-0 bg-black/40 z-50 lg:hidden animate-fade-in" onClick={onClose} />
      )}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 flex flex-col h-screen shrink-0 bg-[#EEF3F9] dark:bg-[#0D1525] border-r border-slate-200/90 dark:border-slate-800 text-slate-800 dark:text-slate-200 shadow-sm transition-[width,transform] duration-300 ease-in-out ${
          isOpen ? 'translate-x-0 w-64' : '-translate-x-full lg:translate-x-0'
        } ${isCollapsed ? 'lg:w-[72px]' : 'lg:w-64'}`}
      >

        {/* Floating Circular Toggle Button on the sidebar border — desktop only */}
        {onToggleCollapse && (
          <button
            type="button"
            onClick={onToggleCollapse}
            className="hidden lg:flex absolute -right-3 top-5 z-50 w-6 h-6 rounded-full bg-white dark:bg-[#182234] border border-slate-200 dark:border-slate-700 shadow-sm items-center justify-center text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:border-blue-400 hover:scale-110 transition-all cursor-pointer"
            title={isCollapsed ? 'Expandir menú lateral' : 'Contraer menú lateral'}
            aria-label={isCollapsed ? 'Expandir menú lateral' : 'Contraer menú lateral'}
          >
            {isCollapsed ? <ChevronsRight size={13} strokeWidth={2.5} /> : <ChevronsLeft size={13} strokeWidth={2.5} />}
          </button>
        )}

        {/* Logo Header */}
        <div className={`h-[64px] flex items-center ${effectiveCollapsed ? 'justify-center px-2' : 'justify-between px-4'} border-b border-slate-200/80 dark:border-slate-800 shrink-0 bg-[#EEF3F9]/90 dark:bg-[#0D1525]/90 backdrop-blur-sm`}>
          <div className="flex items-center gap-3 min-w-0">
            <div
              className={`h-10 ${effectiveCollapsed ? 'w-10' : 'min-w-[40px] max-w-[60px]'} rounded-xl overflow-hidden bg-white shrink-0 flex items-center justify-center border border-slate-200 dark:border-slate-700 shadow-2xs p-1`}
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

          <button onClick={onClose} className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-white/60 dark:hover:bg-slate-800 transition-colors">
            <X size={16} />
          </button>
        </div>

        {/* Navigation list with hidden native scrollbar */}
        <nav className="flex-1 min-h-0 overflow-y-auto px-2 py-3 space-y-0.5 no-scrollbar overscroll-contain pb-6">
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
          <div className={`${effectiveCollapsed ? 'p-2 flex justify-center' : 'p-3'} border-t border-slate-200/80 dark:border-slate-800 shrink-0 bg-white/40 dark:bg-slate-900/40`}>
            {effectiveCollapsed ? (
              <NavLink
                to="/planes"
                onClick={onClose}
                className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center hover:scale-105 transition-all shadow-xs"
                title="Mejorar a Plan Pro"
              >
                <Sparkles size={16} />
              </NavLink>
            ) : (
              <NavLink
                to="/planes"
                onClick={onClose}
                className="group flex flex-col p-3 rounded-2xl bg-white dark:bg-[#152033] border border-blue-200/80 dark:border-blue-900/50 shadow-xs hover:border-blue-400 transition-all"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Sparkles size={13} className="text-blue-600 dark:text-blue-400" />
                    <span className="text-xs font-bold text-slate-800 dark:text-white tracking-tight">
                      Plan Free
                    </span>
                  </div>
                  <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 group-hover:underline flex items-center gap-0.5 shrink-0">
                    Mejorar a Pro ↗
                  </span>
                </div>
                <p className="text-[10.5px] text-slate-500 dark:text-slate-400 mt-1 leading-tight">
                  Desbloquea IA y productos ilimitados
                </p>
              </NavLink>
            )}
          </div>
        )}

        {/* User Account & Logout Footer */}
        <div className={`border-t border-slate-200/80 dark:border-slate-800 shrink-0 ${effectiveCollapsed ? 'p-2 flex flex-col items-center gap-2' : 'p-3'} bg-[#EEF3F9] dark:bg-[#0D1525]`}>
          {effectiveCollapsed ? (
            <>
              <NavLink
                to="/perfil"
                onClick={onClose}
                className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-xs shadow-xs hover:scale-105 transition-transform overflow-hidden border border-white dark:border-slate-700"
                style={{ backgroundColor: userBgColor }}
                title={`${user?.full_name || 'Mi Perfil'} (${user?.email || ''})`}
              >
                {user?.avatar_url ? (
                  <img src={user.avatar_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  userInitial
                )}
              </NavLink>

              <button
                type="button"
                onClick={handleLogout}
                title="Cerrar sesión"
                className="w-10 h-10 rounded-xl bg-white dark:bg-slate-800 hover:bg-red-50 dark:hover:bg-red-950/30 text-slate-400 hover:text-red-600 border border-slate-200 dark:border-slate-700 flex items-center justify-center transition-all cursor-pointer"
              >
                <LogOut size={16} />
              </button>

              <div className="pt-1 flex items-center justify-center" title="Sistema activo v1.2">
                <span className="relative flex h-2 w-2 shrink-0">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-70" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                </span>
              </div>
            </>
          ) : (
            <div className="space-y-2">
              {/* User Card with Email and Logout */}
              <div className="group flex items-center gap-2.5 p-2 rounded-2xl bg-white dark:bg-[#152033] border border-slate-200/80 dark:border-slate-800 shadow-2xs hover:border-slate-300 dark:hover:border-slate-700 transition-all">
                <NavLink
                  to="/perfil"
                  onClick={onClose}
                  className="flex items-center gap-2.5 min-w-0 flex-1 cursor-pointer"
                  title="Ver Mi Perfil"
                >
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-bold text-xs shrink-0 shadow-2xs overflow-hidden border border-white dark:border-slate-700"
                    style={{ backgroundColor: userBgColor }}
                  >
                    {user?.avatar_url ? (
                      <img src={user.avatar_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      userInitial
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-slate-800 dark:text-white truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                      {user?.full_name || 'Usuario'}
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium truncate">
                      {user?.email || 'Sin correo'}
                    </p>
                  </div>
                </NavLink>

                <button
                  type="button"
                  onClick={handleLogout}
                  title="Cerrar sesión"
                  className="p-2 rounded-xl text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 active:scale-95 transition-all cursor-pointer shrink-0"
                >
                  <LogOut size={16} strokeWidth={2} />
                </button>
              </div>

              {/* Status and Version Bar */}
              <div className="flex items-center justify-between px-2 text-[10.5px] text-slate-400 dark:text-slate-500 font-medium">
                <div className="flex items-center gap-2">
                  <span className="relative flex h-2 w-2 shrink-0">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-70" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                  </span>
                  <span>{isPlatformAdmin ? 'Plataforma activa' : 'Sistema activo'}</span>
                </div>
                <span className="font-mono text-[10px] font-semibold">v1.2</span>
              </div>
            </div>
          )}
        </div>

      </aside>
    </>
  )
}
