import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, Boxes, Tags, ArrowLeftRight, ShoppingCart,
  Truck, Users, UserCog, Warehouse, X, Settings2, Sparkles, ShieldAlert,
  ChevronsLeft, ChevronsRight, Activity, LogOut, ChevronRight, ChevronDown,
  ChevronUp, Headphones, Bell
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { companySettingsService } from '../../services/companySettingsService'

const MODULES = [
  {
    type: 'single',
    to: '/',
    label: 'Dashboard',
    icon: LayoutDashboard,
    end: true,
  },
  {
    type: 'accordion',
    id: 'ventas',
    label: 'VENTAS',
    icon: ShoppingCart,
    basePath: '/ventas',
    items: [
      { to: '/ventas', label: 'Ventas', icon: ShoppingCart, end: true },
      { to: '/clientes', label: 'Clientes', icon: Users },
    ],
  },
  {
    type: 'accordion',
    id: 'compras',
    label: 'COMPRAS',
    icon: Truck,
    basePath: '/compras',
    items: [
      { to: '/compras', label: 'Compras', icon: Truck, end: true },
      { to: '/proveedores', label: 'Proveedores', icon: Warehouse },
    ],
  },
  {
    type: 'accordion',
    id: 'inventario',
    label: 'INVENTARIO',
    icon: Boxes,
    basePath: '/productos',
    items: [
      { to: '/productos', label: 'Productos', icon: Boxes, end: true },
      { to: '/categorias', label: 'Categorías', icon: Tags },
      { to: '/movimientos', label: 'Movimientos', icon: ArrowLeftRight },
    ],
  },
  {
    type: 'accordion',
    id: 'administracion',
    label: 'ADMINISTRACIÓN',
    icon: Settings2,
    basePath: '/configuracion',
    adminOnly: true,
    items: [
      { to: '/actividad-empleados', label: 'Movimientos Empleados', icon: Activity },
      { to: '/usuarios', label: 'Usuarios y Roles', icon: UserCog },
      { to: '/notificaciones', label: 'Notificaciones', icon: Bell },
      { to: '/planes', label: 'Tu Plan', icon: Sparkles },
      { to: '/configuracion', label: 'Configuración', icon: Settings2 },
    ],
  },
]

const STORAGE_MODULES_KEY = 'cya_sidebar_open_modules'

function getSavedModules() {
  try {
    const raw = localStorage.getItem(STORAGE_MODULES_KEY)
    if (raw) return JSON.parse(raw)
  } catch {}
  return null
}

function saveModules(modules) {
  try {
    localStorage.setItem(STORAGE_MODULES_KEY, JSON.stringify(modules))
  } catch {}
}

export default function Sidebar({ isOpen, onClose, isCollapsed = false, onToggleCollapse }) {
  const { user, logout, requestLogout, isAdmin, isPlatformAdmin } = useAuth()
  const [company, setCompany] = useState(() => companySettingsService.getCached(user?.company_id))
  const [logoError, setLogoError] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()
  const [activeFlyout, setActiveFlyout] = useState(null)

  // Close flyout on navigation
  useEffect(() => {
    setActiveFlyout(null)
  }, [location.pathname])

  // Close flyout when clicking outside
  useEffect(() => {
    if (!activeFlyout) return
    const handleClickOutside = (e) => {
      if (!e.target.closest('#cya-flyout-container') && !e.target.closest('[data-flyout-trigger]')) {
        setActiveFlyout(null)
      }
    }
    document.addEventListener('pointerdown', handleClickOutside)
    return () => document.removeEventListener('pointerdown', handleClickOutside)
  }, [activeFlyout])

  // Track which modules are open in accordion (persisted so opened modules stay open across navigation)
  const [openModules, setOpenModules] = useState(() => {
    const p = window.location.pathname
    const saved = getSavedModules()
    return {
      ventas: saved?.ventas ?? (p.startsWith('/ventas') || p === '/clientes'),
      compras: saved?.compras ?? (p.startsWith('/compras') || p === '/proveedores'),
      inventario: saved?.inventario ?? (p.startsWith('/productos') || p.startsWith('/categorias') || p.startsWith('/movimientos')),
      administracion: saved?.administracion ?? (p === '/actividad-empleados' || p === '/usuarios' || p === '/notificaciones' || p === '/planes' || p === '/configuracion'),
    }
  })

  // Whenever a module opens due to active route, keep it open and preserve existing open modules
  useEffect(() => {
    const p = location.pathname
    setOpenModules(prev => {
      const next = {
        ...prev,
        ventas: prev.ventas || p.startsWith('/ventas') || p === '/clientes',
        compras: prev.compras || p.startsWith('/compras') || p === '/proveedores',
        inventario: prev.inventario || p.startsWith('/productos') || p.startsWith('/categorias') || p.startsWith('/movimientos'),
        administracion: prev.administracion || p === '/actividad-empleados' || p === '/usuarios' || p === '/notificaciones' || p === '/planes' || p === '/configuracion',
      }
      saveModules(next)
      return next
    })
  }, [location.pathname])

  const toggleModule = (id, e) => {
    e?.stopPropagation?.()
    setOpenModules(prev => {
      const next = { ...prev, [id]: !prev[id] }
      saveModules(next)
      return next
    })
  }

  const handleModuleHeaderClick = (mod, e) => {
    toggleModule(mod.id, e)
  }

  useEffect(() => {
    setLogoError(false)
  }, [company?.logo_url])

  useEffect(() => {
    const cached = companySettingsService.getCached(user?.company_id)
    if (cached) setCompany(cached)
    else if (!user?.company_id) setCompany(null)
    companySettingsService.get().then(c => {
      if (c) setCompany(c)
    }).catch(() => {})
    const handleCompanyChange = (e) => {
      if (e.detail) setCompany(e.detail)
      else if (e.detail === null) setCompany(null)
      else companySettingsService.get().then(c => {
        if (c) setCompany(c)
      }).catch(() => {})
    }
    window.addEventListener('cya_company_updated', handleCompanyChange)
    return () => window.removeEventListener('cya_company_updated', handleCompanyChange)
  }, [user?.company_id])

  const handleLogout = (e) => {
    e?.stopPropagation?.()
    if (onClose) onClose()
    if (requestLogout) requestLogout()
    else if (logout) logout()
  }

  // User display name & role
  const rawName = user?.full_name || ''
  const displayName = rawName && !rawName.includes('@') ? rawName : 'Carlos Yamacacho'

  const userInitials = displayName
    .split(' ')
    .filter(Boolean)
    .map(n => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase() || 'CD'

  const userRole = (user?.role === 'superadmin' || isPlatformAdmin)
    ? 'Super Admin'
    : (isAdmin ? 'Administrador' : (user?.role === 'vendedor' ? 'Vendedor' : 'Colaborador'))

  // En móvil (cuando el sidebar se abre como drawer), siempre mostrar versión completa
  const effectiveCollapsed = isCollapsed && !isOpen

  const sidebarNode = (
    <>
      {isOpen && (
        <div
          id="cya-sidebar-backdrop"
          className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 lg:hidden animate-fade-in"
          onClick={onClose}
        />
      )}
      <aside
        id="cya-main-sidebar"
        className={`fixed inset-y-0 top-0 bottom-0 left-0 z-50 flex flex-col shrink-0 bg-white dark:bg-[#121215] border-r border-slate-200/90 dark:border-[#27272a] text-slate-800 dark:text-zinc-100 shadow-xl lg:shadow-none transition-[width,transform] duration-300 ease-in-out ${
          isOpen ? 'translate-x-0 w-[270px]' : '-translate-x-full lg:translate-x-0'
        } ${isCollapsed ? 'lg:w-[76px]' : 'lg:w-[270px]'}`}
      >

        {/* Floating Circular Toggle Button on the sidebar border */}
        {onToggleCollapse && (
          <button
            type="button"
            onClick={onToggleCollapse}
            className="hidden lg:flex absolute -right-3 top-5 z-[60] w-6 h-6 rounded-full bg-white dark:bg-[#18181b] border border-slate-200 dark:border-[#27272a] shadow-md items-center justify-center text-slate-500 dark:text-zinc-400 hover:text-blue-600 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-zinc-800 hover:border-blue-300 dark:hover:border-zinc-600 hover:scale-110 transition-all cursor-pointer"
            title={isCollapsed ? 'Expandir menú lateral' : 'Contraer menú lateral'}
            aria-label={isCollapsed ? 'Expandir menú lateral' : 'Contraer menú lateral'}
          >
            {isCollapsed ? <ChevronsRight size={13} strokeWidth={2.5} /> : <ChevronsLeft size={13} strokeWidth={2.5} />}
          </button>
        )}

        {/* Logo Header */}
        <div className={`h-[68px] flex items-center ${effectiveCollapsed ? 'justify-center px-2' : 'justify-between px-4'} border-b border-slate-100 dark:border-[#27272a] shrink-0 bg-white/95 dark:bg-[#121215]/95 backdrop-blur-sm z-10`}>
          <div className="flex items-center gap-3 min-w-0">
            <div
              className={`h-10 ${effectiveCollapsed ? 'w-10' : 'min-w-[40px] max-w-[50px]'} rounded-xl overflow-hidden ${!isPlatformAdmin && !company ? 'bg-slate-100 dark:bg-zinc-800 animate-pulse' : 'bg-slate-50 dark:bg-zinc-800'} shrink-0 flex items-center justify-center border border-slate-200/80 dark:border-zinc-700 shadow-xs p-1`}
              title={isPlatformAdmin ? 'CYA SaaS Platform' : (company?.name || '')}
            >
              {isPlatformAdmin ? (
                <img
                  src="/logo-cya-badge.png"
                  alt="CYA Platform"
                  className="max-h-full max-w-full w-auto h-auto object-contain"
                />
              ) : !company ? (
                <div className="w-5 h-5 rounded-md bg-slate-200 dark:bg-zinc-700" />
              ) : company.logo_url && !logoError ? (
                <img
                  src={company.logo_url}
                  alt={company.name || 'Logo'}
                  className="max-h-full max-w-full w-auto h-auto object-contain"
                  onError={() => setLogoError(true)}
                />
              ) : (
                <span className="font-display font-extrabold text-sm text-blue-600 dark:text-blue-400 tracking-tight">
                  {(company.name || 'E').trim().split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase()}
                </span>
              )}
            </div>
            {!effectiveCollapsed && (
              <div className="min-w-0">
                {!isPlatformAdmin && !company ? (
                  <div className="space-y-1.5 py-0.5">
                    <div className="h-3.5 w-28 rounded bg-slate-200 dark:bg-zinc-800 animate-pulse" />
                    <div className="h-2.5 w-20 rounded bg-slate-100 dark:bg-zinc-800/60 animate-pulse" />
                  </div>
                ) : (
                  <>
                    <p className="font-display font-bold text-slate-900 dark:text-zinc-100 text-[14.5px] leading-tight truncate">
                      {isPlatformAdmin ? 'CYA PLATFORM' : (company?.name || 'Mi Empresa')}
                    </p>
                    <p className="text-[10.5px] text-blue-600 dark:text-blue-400 font-bold uppercase tracking-wider mt-0.5 truncate">
                      {isPlatformAdmin ? 'SUPER ADMIN GLOBAL' : (company?.ruc ? `RUC: ${company.ruc}` : 'ERP')}
                    </p>
                  </>
                )}
              </div>
            )}
          </div>

          <button onClick={onClose} className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:text-zinc-400 dark:hover:text-zinc-100 dark:hover:bg-zinc-800 transition-colors">
            <X size={16} />
          </button>
        </div>

        {/* Navigation list with hidden native scrollbar */}
        <nav className={`flex-1 min-h-0 ${effectiveCollapsed ? 'overflow-visible' : 'overflow-y-auto'} px-2 py-3 space-y-1.5 no-scrollbar overscroll-contain z-10`}>
          {/* Navegación Exclusiva para Super Administrador de la Plataforma (sin empresa asignada) */}
          {isPlatformAdmin && !user?.company_id ? (
            <div className="space-y-1.5 animate-fade-in">
              <NavLink
                to="/admin-plataforma"
                onClick={onClose}
                title={effectiveCollapsed ? "Panel Super Admin" : undefined}
                className={({ isActive }) =>
                  `group relative flex items-center transition-all duration-150 ${
                    effectiveCollapsed
                      ? 'justify-center mx-1 px-0 py-2.5 rounded-2xl'
                      : 'gap-3 mx-1 px-3.5 py-2.5 rounded-2xl text-[13.5px]'
                  } font-bold ${
                    isActive
                      ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-600/30 font-bold'
                      : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-100 hover:bg-slate-100 dark:hover:bg-zinc-800/60 active:scale-[0.98]'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <ShieldAlert
                      size={18}
                      strokeWidth={isActive ? 2.4 : 2}
                      className={`shrink-0 ${isActive ? 'text-white' : 'text-amber-500 dark:text-amber-400 group-hover:text-blue-600 dark:group-hover:text-white'}`}
                    />
                    {!effectiveCollapsed && <span className="truncate flex-1">Panel de Plataforma</span>}
                  </>
                )}
              </NavLink>

              <NavLink
                to="/perfil"
                onClick={onClose}
                title={effectiveCollapsed ? "Mi Perfil Master" : undefined}
                className={({ isActive }) =>
                  `group relative flex items-center transition-all duration-150 ${
                    effectiveCollapsed
                      ? 'justify-center mx-1 px-0 py-2.5 rounded-2xl'
                      : 'gap-3 mx-1 px-3.5 py-2.5 rounded-2xl text-[13.5px]'
                  } font-semibold ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-500/30 font-bold'
                      : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-100 hover:bg-slate-100 dark:hover:bg-zinc-800/60 active:scale-[0.98]'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <UserCog
                      size={18}
                      strokeWidth={isActive ? 2.4 : 2}
                      className={`shrink-0 ${isActive ? 'text-white' : 'text-slate-400 dark:text-zinc-400 group-hover:text-blue-600 dark:group-hover:text-zinc-100'}`}
                    />
                    {!effectiveCollapsed && <span className="truncate flex-1">Mi Cuenta Master</span>}
                  </>
                )}
              </NavLink>
            </div>
          ) : (
            MODULES.map((mod) => {
              if (mod.adminOnly && !isAdmin) return null

              // Single item (Dashboard)
              if (mod.type === 'single') {
                return (
                  <NavLink
                    key={mod.to}
                    to={mod.to}
                    end={mod.end}
                    onClick={onClose}
                    title={effectiveCollapsed ? mod.label : undefined}
                    className={({ isActive }) =>
                      `group relative flex items-center transition-all duration-150 ${
                        effectiveCollapsed
                          ? 'justify-center mx-1 px-0 py-2.5 rounded-2xl'
                          : 'gap-3 mx-1 px-3.5 py-2.5 rounded-2xl text-[13.5px]'
                      } font-semibold ${
                        isActive
                          ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs font-bold'
                          : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-100 hover:bg-slate-100 dark:hover:bg-zinc-800/60 active:scale-[0.98]'
                      }`
                    }
                  >
                    {({ isActive }) => {
                      const Icon = mod.icon
                      return (
                        <>
                          <Icon
                            size={18}
                            strokeWidth={isActive ? 2.4 : 2}
                            className={`shrink-0 ${isActive ? 'text-white' : 'text-slate-400 dark:text-zinc-400 group-hover:text-blue-600 dark:group-hover:text-zinc-100'}`}
                          />
                          {!effectiveCollapsed && <span className="truncate flex-1">{mod.label}</span>}
                        </>
                      )
                    }}
                  </NavLink>
                )
              }

              // Accordion module (VENTAS, COMPRAS, INVENTARIO, ADMINISTRACIÓN)
              const isOpenModule = !!openModules[mod.id]
              const isChildActive = mod.items.some(it => location.pathname === it.to || location.pathname.startsWith(it.to + '/'))

              if (effectiveCollapsed) {
                const Icon = mod.icon
                const isOpenFlyout = activeFlyout === mod.id
                const isNearBottom = mod.id === 'administracion'

                return (
                  <div
                    key={mod.id}
                    className="relative"
                    onMouseEnter={() => setActiveFlyout(mod.id)}
                    onMouseLeave={() => setActiveFlyout((curr) => (curr === mod.id ? null : curr))}
                  >
                    <button
                      type="button"
                      data-flyout-trigger={mod.id}
                      onClick={(e) => {
                        e.stopPropagation()
                        setActiveFlyout((curr) => (curr === mod.id ? null : mod.id))
                      }}
                      className={`w-full flex items-center justify-center py-2.5 rounded-2xl transition-all cursor-pointer ${
                        isChildActive
                          ? 'bg-blue-600 text-white shadow-md shadow-blue-600/40 font-bold'
                          : isOpenFlyout
                          ? 'bg-blue-50 text-blue-600 dark:bg-zinc-800 dark:text-white ring-2 ring-blue-500/50'
                          : 'text-slate-400 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-zinc-800/60'
                      }`}
                      title={!isOpenFlyout ? mod.label : undefined}
                      aria-expanded={isOpenFlyout}
                      aria-haspopup="true"
                    >
                      <Icon size={18} strokeWidth={isChildActive || isOpenFlyout ? 2.3 : 1.9} />
                    </button>

                    {/* Flyout Popover with the module's sections */}
                    {isOpenFlyout && (
                      <div
                        id="cya-flyout-container"
                        onClick={(e) => e.stopPropagation()}
                        className={`absolute left-full ${
                          isNearBottom ? 'bottom-0' : 'top-0'
                        } ml-3 w-56 bg-white dark:bg-[#18181b] border border-slate-200 dark:border-[#27272a] rounded-2xl shadow-2xl shadow-slate-900/10 dark:shadow-black/80 p-2 z-[999] animate-fade-in backdrop-blur-xl`}
                        style={{ filter: 'drop-shadow(0 12px 28px rgba(0, 0, 0, 0.15))' }}
                      >
                        {/* Invisible bridge to prevent cursor gap drop */}
                        <div className="absolute -left-3 top-0 bottom-0 w-3" />

                        {/* Triangular pointer arrow */}
                        <div
                          className={`absolute -left-1.5 ${
                            isNearBottom ? 'bottom-4' : 'top-4'
                          } w-3 h-3 bg-white dark:bg-[#18181b] border-l border-b border-slate-200 dark:border-[#27272a] rotate-45 transform`}
                        />

                        {/* Module Header */}
                        <div className="px-3 py-1.5 border-b border-slate-100 dark:border-zinc-800/80 mb-1 flex items-center justify-between">
                          <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-700 dark:text-zinc-300">
                            {mod.label}
                          </span>
                          <span className="text-[10px] text-slate-400 dark:text-zinc-500 font-mono">
                            {mod.items.length} {mod.items.length === 1 ? 'sección' : 'secciones'}
                          </span>
                        </div>

                        {/* List of sections */}
                        <div className="space-y-0.5">
                          {mod.items.map((sub) => {
                            const SubIcon = sub.icon
                            const isSubActive =
                              location.pathname === sub.to ||
                              location.pathname.startsWith(sub.to + '/')

                            return (
                              <NavLink
                                key={sub.to}
                                to={sub.to}
                                end={sub.end}
                                onClick={() => {
                                  setActiveFlyout(null)
                                  onClose?.()
                                }}
                                className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                                  isSubActive
                                    ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 font-bold shadow-xs'
                                    : 'text-slate-700 dark:text-zinc-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-zinc-800'
                                }`}
                              >
                                <SubIcon
                                  size={15}
                                  strokeWidth={isSubActive ? 2.3 : 1.9}
                                  className={`shrink-0 ${
                                    isSubActive ? 'text-white' : 'text-blue-600 dark:text-blue-400'
                                  }`}
                                />
                                <span className="truncate flex-1">{sub.label}</span>
                                {isSubActive && (
                                  <span className="w-1.5 h-1.5 rounded-full bg-white shrink-0" />
                                )}
                              </NavLink>
                            )
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )
              }

              const Icon = mod.icon
              return (
                <div key={mod.id} className="space-y-0.5">
                  {/* Category Header Row */}
                  <button
                    type="button"
                    onClick={() => toggleModule(mod.id)}
                    className={`w-full group flex items-center justify-between mx-1 px-3 py-2 rounded-xl text-left transition-all duration-150 select-none cursor-pointer ${
                      isChildActive
                        ? 'text-blue-600 dark:text-blue-400 font-extrabold bg-blue-50/70 dark:bg-zinc-800/60'
                        : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-100 hover:bg-slate-100/70 dark:hover:bg-zinc-800/40'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Icon
                        size={16}
                        strokeWidth={2.2}
                        className={`shrink-0 transition-colors ${
                          isChildActive
                            ? 'text-blue-600 dark:text-blue-400'
                            : 'text-slate-400 dark:text-zinc-400 group-hover:text-blue-600 dark:group-hover:text-zinc-100'
                        }`}
                      />
                      <span className="text-[11.5px] font-bold uppercase tracking-wider truncate">
                        {mod.label}
                      </span>
                    </div>

                    {/* Chevron indicator: Up when open, Down when closed */}
                    <span className="p-0.5 text-slate-400 group-hover:text-slate-700 dark:text-zinc-500 dark:group-hover:text-zinc-200 transition-colors shrink-0">
                      {isOpenModule ? (
                        <ChevronUp size={14} strokeWidth={2.5} />
                      ) : (
                        <ChevronDown size={14} strokeWidth={2.5} />
                      )}
                    </span>
                  </button>

                  {/* Submenu items with vertical hierarchy tree branch line */}
                  {isOpenModule && (
                    <div className="relative ml-5 pl-3.5 my-1 space-y-1 border-l-2 border-slate-200 dark:border-zinc-800 animate-fade-in">
                      {mod.items.map((sub) => {
                        const SubIcon = sub.icon
                        return (
                          <NavLink
                            key={sub.to}
                            to={sub.to}
                            end={sub.end}
                            onClick={onClose}
                            className={({ isActive }) =>
                              `group flex items-center gap-2.5 px-3 py-2 rounded-xl text-[13px] font-medium transition-all ${
                                isActive
                                  ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 font-semibold shadow-xs'
                                  : 'text-slate-600 dark:text-zinc-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-zinc-800/60'
                              }`
                            }
                          >
                            {({ isActive }) => (
                              <>
                                <SubIcon
                                  size={16}
                                  strokeWidth={isActive ? 2.3 : 1.9}
                                  className={`shrink-0 transition-colors ${
                                    isActive
                                      ? 'text-white'
                                      : 'text-slate-400 dark:text-zinc-400 group-hover:text-blue-600 dark:group-hover:text-white'
                                  }`}
                                />
                                <span className="truncate flex-1">{sub.label}</span>
                              </>
                            )}
                          </NavLink>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })
          )}

          {/* Help Support Card */}
          {!effectiveCollapsed && (
            <div className="mx-2 mt-4 mb-2 p-3.5 rounded-2xl bg-gradient-to-b from-blue-50/80 to-indigo-50/50 dark:from-zinc-900/90 dark:to-zinc-900/50 backdrop-blur-md border border-blue-200/70 dark:border-zinc-800 text-center relative overflow-hidden shadow-xs dark:shadow-xl dark:shadow-black/40 z-10">
              <div className="w-11 h-11 mx-auto rounded-full bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-500/30 ring-4 ring-blue-500/20">
                <Headphones size={20} strokeWidth={2.3} />
              </div>
              <p className="text-[13px] font-bold text-slate-900 dark:text-zinc-100 mt-2 leading-tight">¿Necesitas ayuda?</p>
              <p className="text-[11px] text-slate-500 dark:text-zinc-400 mt-0.5">Contáctanos en soporte</p>
              <a
                href="https://wa.me/51987654321?text=Hola,%20necesito%20soporte%20con%20el%20sistema%20ERP"
                target="_blank"
                rel="noreferrer"
                className="mt-3 w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white font-semibold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-blue-600/30 transition-all cursor-pointer"
              >
                <span>Soporte en línea</span>
                <span className="text-sm">→</span>
              </a>
            </div>
          )}
        </nav>

        {/* Footer - User Profile */}
        <div className={`border-t border-slate-100 dark:border-[#27272a] shrink-0 ${effectiveCollapsed ? 'p-2 flex flex-col items-center gap-2' : 'p-3'} bg-slate-50/80 dark:bg-[#121215] backdrop-blur-sm z-10`}>
          {effectiveCollapsed ? (
            <>
              <NavLink
                to="/perfil"
                onClick={onClose}
                className="relative w-10 h-10 rounded-full flex items-center justify-center bg-blue-600 text-white font-bold text-xs shadow-xs hover:scale-105 transition-transform"
                title={`${displayName} (${user?.email || ''})`}
              >
                <span className="text-white font-bold text-xs">{userInitials}</span>
                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-[#121215]" />
              </NavLink>

              <button
                type="button"
                onClick={handleLogout}
                title="Cerrar sesión"
                className="w-10 h-10 rounded-xl bg-slate-100 hover:bg-red-50 text-slate-500 hover:text-red-600 dark:bg-zinc-800/70 dark:hover:bg-red-500/20 dark:text-zinc-400 dark:hover:text-red-400 flex items-center justify-center transition-all cursor-pointer"
              >
                <LogOut size={16} />
              </button>
            </>
          ) : (
            <div className="flex items-center gap-2.5">
              <NavLink
                to="/perfil"
                onClick={onClose}
                className="flex items-center gap-2.5 min-w-0 flex-1 group cursor-pointer"
                title="Ver Mi Perfil"
              >
                <div className="relative w-9 h-9 rounded-full flex items-center justify-center bg-blue-600 text-white font-bold text-xs shrink-0 shadow-xs">
                  <span className="text-white font-bold text-xs">{userInitials}</span>
                  <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-[#121215]" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-slate-800 dark:text-zinc-100 truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                    {displayName}
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-zinc-400 truncate">
                    {userRole}
                  </p>
                </div>
              </NavLink>

              <button
                type="button"
                onClick={handleLogout}
                title="Cerrar sesión"
                className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 dark:text-zinc-400 dark:hover:text-red-400 dark:hover:bg-red-500/20 active:scale-95 transition-all cursor-pointer shrink-0"
              >
                <LogOut size={16} strokeWidth={2.2} />
              </button>
            </div>
          )}
        </div>

      </aside>
    </>
  )

  if (typeof document !== 'undefined' && document?.body) {
    return createPortal(sidebarNode, document.body)
  }

  return sidebarNode
}
