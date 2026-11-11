import { useState, useEffect } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, Boxes, Tags, ArrowLeftRight, ShoppingCart,
  Truck, Users, UserCog, Warehouse, X, Settings2, Sparkles, ShieldAlert,
  ChevronsLeft, ChevronsRight, Activity, LogOut, ChevronRight, ChevronDown,
  ChevronUp, Headphones
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

  // Track which modules are open in accordion (persisted so opened modules stay open across navigation)
  const [openModules, setOpenModules] = useState(() => {
    const p = window.location.pathname
    const saved = getSavedModules()
    return {
      ventas: saved?.ventas ?? (p.startsWith('/ventas') || p === '/clientes'),
      compras: saved?.compras ?? (p.startsWith('/compras') || p === '/proveedores'),
      inventario: saved?.inventario ?? (p.startsWith('/productos') || p.startsWith('/categorias') || p.startsWith('/movimientos')),
      administracion: saved?.administracion ?? (p === '/actividad-empleados' || p === '/usuarios' || p === '/planes' || p === '/configuracion'),
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
        administracion: prev.administracion || p === '/actividad-empleados' || p === '/usuarios' || p === '/planes' || p === '/configuracion',
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

  const userRole = isPlatformAdmin
    ? 'Super Administrador'
    : (isAdmin ? 'Administrador' : (user?.role === 'vendedor' ? 'Vendedor' : 'Colaborador'))

  // En móvil (cuando el sidebar se abre como drawer), siempre mostrar versión completa
  const effectiveCollapsed = isCollapsed && !isOpen

  return (
    <>
      {isOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 lg:hidden animate-fade-in" onClick={onClose} />
      )}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 flex flex-col h-screen shrink-0 bg-gradient-to-b from-[#072563] via-[#061d4f] to-[#041338] border-r border-[#0D3075] text-white shadow-2xl transition-[width,transform] duration-300 ease-in-out ${
          isOpen ? 'translate-x-0 w-[270px]' : '-translate-x-full lg:translate-x-0'
        } ${isCollapsed ? 'lg:w-[76px]' : 'lg:w-[270px]'}`}
      >

        {/* Abstract 3D layered curved waves background (positioned softly behind Help Card & Footer) */}
        {!effectiveCollapsed && (
          <div className="absolute bottom-0 left-0 right-0 h-72 pointer-events-none overflow-hidden z-0 select-none opacity-35">
            <svg
              viewBox="0 0 260 290"
              className="w-full h-full"
              preserveAspectRatio="none"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <defs>
                <linearGradient id="waveBackGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#1E3A8A" stopOpacity="0.85" />
                  <stop offset="50%" stopColor="#172554" stopOpacity="0.9" />
                  <stop offset="100%" stopColor="#030712" stopOpacity="0.95" />
                </linearGradient>

                <linearGradient id="waveFrontGrad" x1="0%" y1="0%" x2="80%" y2="100%">
                  <stop offset="0%" stopColor="#2563EB" stopOpacity="0.85" />
                  <stop offset="35%" stopColor="#1D4ED8" stopOpacity="0.8" />
                  <stop offset="70%" stopColor="#1E3A8A" stopOpacity="0.85" />
                  <stop offset="100%" stopColor="#0B1E48" stopOpacity="0.95" />
                </linearGradient>

                <linearGradient id="crestGlowBack" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#60A5FA" stopOpacity="0.1" />
                  <stop offset="30%" stopColor="#93C5FD" stopOpacity="0.6" />
                  <stop offset="70%" stopColor="#3B82F6" stopOpacity="0.4" />
                  <stop offset="100%" stopColor="#1D4ED8" stopOpacity="0" />
                </linearGradient>

                <linearGradient id="crestGlowFront" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#38BDF8" stopOpacity="0.2" />
                  <stop offset="25%" stopColor="#60A5FA" stopOpacity="0.75" />
                  <stop offset="65%" stopColor="#3B82F6" stopOpacity="0.5" />
                  <stop offset="100%" stopColor="#1E40AF" stopOpacity="0" />
                </linearGradient>

                <radialGradient id="waveAmbientGlow" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.2" />
                  <stop offset="100%" stopColor="#1D4ED8" stopOpacity="0" />
                </radialGradient>
              </defs>

              <circle cx="130" cy="150" r="130" fill="url(#waveAmbientGlow)" />

              <path
                d="M -30,290 L -30,130 Q 75,35 290,145 L 290,290 Z"
                fill="url(#waveBackGrad)"
              />
              <path
                d="M -30,130 Q 75,35 290,145"
                stroke="url(#crestGlowBack)"
                strokeWidth="1.5"
              />

              <path
                d="M -30,290 L -30,185 Q 110,75 290,110 L 290,290 Z"
                fill="url(#waveFrontGrad)"
              />
              <path
                d="M -30,185 Q 110,75 290,110"
                stroke="url(#crestGlowFront)"
                strokeWidth="1.8"
              />
            </svg>
          </div>
        )}

        {/* Floating Circular Toggle Button on the sidebar border — fully visible, not cut off */}
        {onToggleCollapse && (
          <button
            type="button"
            onClick={onToggleCollapse}
            className="hidden lg:flex absolute -right-3 top-5 z-[60] w-6 h-6 rounded-full bg-[#08214D] border border-blue-400/50 shadow-xl items-center justify-center text-blue-200 hover:text-white hover:bg-blue-600 hover:border-blue-400 hover:scale-110 transition-all cursor-pointer"
            title={isCollapsed ? 'Expandir menú lateral' : 'Contraer menú lateral'}
            aria-label={isCollapsed ? 'Expandir menú lateral' : 'Contraer menú lateral'}
          >
            {isCollapsed ? <ChevronsRight size={13} strokeWidth={2.5} /> : <ChevronsLeft size={13} strokeWidth={2.5} />}
          </button>
        )}

        {/* Logo Header */}
        <div className={`h-[68px] flex items-center ${effectiveCollapsed ? 'justify-center px-2' : 'justify-between px-4'} border-b border-white/[0.08] shrink-0 bg-[#061838]/80 backdrop-blur-sm z-10`}>
          <div className="flex items-center gap-3 min-w-0">
            <div
              className={`h-10 ${effectiveCollapsed ? 'w-10' : 'min-w-[40px] max-w-[50px]'} rounded-xl overflow-hidden ${!isPlatformAdmin && !company ? 'bg-white/10 animate-pulse' : 'bg-white/95'} shrink-0 flex items-center justify-center border border-white/20 shadow-md p-1`}
              title={isPlatformAdmin ? 'CYA SaaS Platform' : (company?.name || '')}
            >
              {isPlatformAdmin ? (
                <img
                  src="/logo-cya-badge.png"
                  alt="CYA Platform"
                  className="max-h-full max-w-full w-auto h-auto object-contain"
                />
              ) : !company ? (
                <div className="w-5 h-5 rounded-md bg-white/20" />
              ) : company.logo_url && !logoError ? (
                <img
                  src={company.logo_url}
                  alt={company.name || 'Logo'}
                  className="max-h-full max-w-full w-auto h-auto object-contain"
                  onError={() => setLogoError(true)}
                />
              ) : (
                <span className="font-display font-extrabold text-sm text-[#072563] tracking-tight">
                  {(company.name || 'E').trim().split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase()}
                </span>
              )}
            </div>
            {!effectiveCollapsed && (
              <div className="min-w-0">
                {!isPlatformAdmin && !company ? (
                  <div className="space-y-1.5 py-0.5">
                    <div className="h-3.5 w-28 rounded bg-white/15 animate-pulse" />
                    <div className="h-2.5 w-20 rounded bg-white/10 animate-pulse" />
                  </div>
                ) : (
                  <>
                    <p className="font-display font-bold text-white text-[14.5px] leading-tight truncate">
                      {isPlatformAdmin ? 'CYA PLATFORM' : (company?.name || 'Mi Empresa')}
                    </p>
                    <p className="text-[10.5px] text-blue-300 font-semibold uppercase tracking-wider mt-0.5 truncate">
                      {isPlatformAdmin ? 'SUPER ADMIN GLOBAL' : (company?.ruc ? `RUC: ${company.ruc}` : 'ERP')}
                    </p>
                  </>
                )}
              </div>
            )}
          </div>

          <button onClick={onClose} className="lg:hidden p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-colors">
            <X size={16} />
          </button>
        </div>

        {/* Navigation list with hidden native scrollbar */}
        <nav className="flex-1 min-h-0 overflow-y-auto px-2 py-3 space-y-1.5 no-scrollbar overscroll-contain z-10">
          {/* Navegación Exclusiva para Super Administrador de la Plataforma */}
          {isPlatformAdmin ? (
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
                      : 'text-slate-200/90 hover:text-white hover:bg-white/[0.08] active:scale-[0.98]'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <ShieldAlert
                      size={18}
                      strokeWidth={isActive ? 2.4 : 2}
                      className={`shrink-0 ${isActive ? 'text-amber-300' : 'text-amber-400 group-hover:text-white'}`}
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
                      ? 'bg-white text-[#0B4FC5] shadow-md shadow-black/15 font-bold'
                      : 'text-slate-200/90 hover:text-white hover:bg-white/[0.08] active:scale-[0.98]'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <UserCog
                      size={18}
                      strokeWidth={isActive ? 2.4 : 2}
                      className={`shrink-0 ${isActive ? 'text-[#0B4FC5]' : 'text-blue-200/80 group-hover:text-white'}`}
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
                          ? 'bg-white text-[#0B4FC5] shadow-md shadow-black/15 font-bold'
                          : 'text-slate-200/90 hover:text-white hover:bg-white/[0.08] active:scale-[0.98]'
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
                            className={`shrink-0 ${isActive ? 'text-[#0B4FC5]' : 'text-blue-200/80 group-hover:text-white'}`}
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
                return (
                  <button
                    key={mod.id}
                    type="button"
                    onClick={() => {
                      toggleModule(mod.id)
                    }}
                    title={mod.label}
                    className={`w-full flex items-center justify-center py-2.5 rounded-2xl transition-all ${
                      isChildActive
                        ? 'bg-blue-600 text-white shadow-md shadow-blue-600/40'
                        : 'text-slate-300 hover:text-white hover:bg-white/[0.08]'
                    }`}
                  >
                    <Icon size={18} strokeWidth={isChildActive ? 2.3 : 1.9} />
                  </button>
                )
              }

              const Icon = mod.icon
              return (
                <div key={mod.id} className="space-y-0.5">
                  {/* Category Header Row (Exact match to Image 2 & 3: Uppercase small bold + icon + chevron ^/v) */}
                  <button
                    type="button"
                    onClick={() => toggleModule(mod.id)}
                    className={`w-full group flex items-center justify-between mx-1 px-3 py-2 rounded-xl text-left transition-all duration-150 select-none cursor-pointer ${
                      isChildActive
                        ? 'text-white font-bold bg-white/[0.08]'
                        : 'text-blue-100/80 hover:text-white hover:bg-white/[0.05]'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Icon
                        size={16}
                        strokeWidth={2.2}
                        className={`shrink-0 transition-colors ${
                          isChildActive ? 'text-blue-300' : 'text-blue-300/75 group-hover:text-white'
                        }`}
                      />
                      <span className="text-[11.5px] font-bold uppercase tracking-wider truncate">
                        {mod.label}
                      </span>
                    </div>

                    {/* Chevron indicator: Up when open, Down when closed (Image 2 & 3 exact match) */}
                    <span className="p-0.5 text-blue-200/70 group-hover:text-white transition-colors shrink-0">
                      {isOpenModule ? (
                        <ChevronUp size={14} strokeWidth={2.5} />
                      ) : (
                        <ChevronDown size={14} strokeWidth={2.5} />
                      )}
                    </span>
                  </button>

                  {/* Submenu items with vertical hierarchy tree branch line (Image 2 & 3 exact match) */}
                  {isOpenModule && (
                    <div className="relative ml-5 pl-3.5 my-1 space-y-1 border-l-2 border-blue-400/30 animate-fade-in">
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
                                  ? 'bg-blue-600 text-white font-semibold shadow-md shadow-blue-600/40'
                                  : 'text-slate-200/85 hover:text-white hover:bg-white/[0.08]'
                              }`
                            }
                          >
                            {({ isActive }) => (
                              <>
                                <SubIcon
                                  size={16}
                                  strokeWidth={isActive ? 2.3 : 1.9}
                                  className={`shrink-0 transition-colors ${
                                    isActive ? 'text-white' : 'text-blue-300/70 group-hover:text-white'
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

          {/* Help Support Card (exact match to Captura 3) */}
          {!effectiveCollapsed && (
            <div className="mx-2 mt-4 mb-2 p-3.5 rounded-2xl bg-[#09224E]/75 backdrop-blur-md border border-blue-400/25 text-center relative overflow-hidden shadow-xl shadow-black/30 z-10">
              <div className="w-11 h-11 mx-auto rounded-full bg-blue-600 flex items-center justify-center text-white shadow-[0_0_20px_rgba(37,99,235,0.9)] ring-4 ring-blue-500/20">
                <Headphones size={20} strokeWidth={2.3} />
              </div>
              <p className="text-[13px] font-bold text-white mt-2 leading-tight">¿Necesitas ayuda?</p>
              <p className="text-[11px] text-blue-200/80 mt-0.5">Contáctanos en soporte</p>
              <a
                href="https://wa.me/51987654321?text=Hola,%20necesito%20soporte%20con%20el%20sistema%20ERP"
                target="_blank"
                rel="noreferrer"
                className="mt-3 w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 active:scale-[0.98] text-white font-semibold text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-blue-600/40 transition-all cursor-pointer"
              >
                <span>Soporte en línea</span>
                <span className="text-sm">→</span>
              </a>
            </div>
          )}
        </nav>

        {/* Footer - User Profile (exact match to reference image) */}
        <div className={`border-t border-white/[0.08] shrink-0 ${effectiveCollapsed ? 'p-2 flex flex-col items-center gap-2' : 'p-3'} bg-[#05142E]/90 backdrop-blur-sm z-10`}>
          {effectiveCollapsed ? (
            <>
              <NavLink
                to="/perfil"
                onClick={onClose}
                className="relative w-10 h-10 rounded-full flex items-center justify-center bg-white text-slate-900 font-bold text-xs shadow-md hover:scale-105 transition-transform"
                title={`${displayName} (${user?.email || ''})`}
              >
                <span className="text-slate-900 font-bold text-xs">{userInitials}</span>
                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-400 ring-2 ring-[#05142E]" />
              </NavLink>

              <button
                type="button"
                onClick={handleLogout}
                title="Cerrar sesión"
                className="w-10 h-10 rounded-xl bg-white/[0.05] hover:bg-red-500/20 text-slate-300 hover:text-red-400 flex items-center justify-center transition-all cursor-pointer"
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
                <div className="relative w-9 h-9 rounded-full flex items-center justify-center bg-white text-slate-900 font-bold text-xs shrink-0 shadow-md">
                  <span className="text-slate-900 font-bold text-xs">{userInitials}</span>
                  <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-400 ring-2 ring-[#05142E]" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-white truncate group-hover:text-blue-300 transition-colors">
                    {displayName}
                  </p>
                  <p className="text-[11px] text-blue-200/70 truncate">
                    {userRole}
                  </p>
                </div>
              </NavLink>

              <button
                type="button"
                onClick={handleLogout}
                title="Cerrar sesión"
                className="p-1.5 rounded-lg text-slate-300 hover:text-red-400 hover:bg-red-500/20 active:scale-95 transition-all cursor-pointer shrink-0"
              >
                <LogOut size={16} strokeWidth={2.2} />
              </button>
            </div>
          )}
        </div>

      </aside>
    </>
  )
}
