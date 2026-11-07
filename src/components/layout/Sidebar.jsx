import { useState, useEffect } from 'react'
import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard, Boxes, Tags, ArrowLeftRight, ShoppingCart,
  Truck, Users, UserCog, Warehouse, X, Settings2, Sparkles, ShieldAlert,
  ChevronsLeft, ChevronsRight, Activity, LogOut, ChevronRight, Headphones, UserCircle
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { companySettingsService } from '../../services/companySettingsService'

const NAV_ITEMS = [
  { to: '/', label: 'Panel', icon: LayoutDashboard, end: true },
  { to: '/ventas', label: 'Ventas', icon: ShoppingCart },
  { to: '/compras', label: 'Compras', icon: Truck },
  { to: '/productos', label: 'Productos', icon: Boxes },
  { to: '/clientes', label: 'Clientes', icon: Users },
  { to: '/movimientos', label: 'Movimientos', icon: ArrowLeftRight },
  { to: '/categorias', label: 'Categorías', icon: Tags },
  { to: '/proveedores', label: 'Proveedores', icon: Warehouse },
  { to: '/actividad-empleados', label: 'Movimientos Empleados', icon: Activity, adminOnly: true },
  { to: '/usuarios', label: 'Usuarios y Roles', icon: UserCog, adminOnly: true },
  { to: '/planes', label: 'Tu Plan', icon: Sparkles, adminOnly: true },
  { to: '/configuracion', label: 'Configuración', icon: Settings2, adminOnly: true },
  { to: '/perfil', label: 'Mi Perfil', icon: UserCircle },
]

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
            : 'gap-3 mx-2 px-3.5 py-2.5 rounded-xl text-[13px]'
        } font-medium ${
          isActive
            ? 'bg-gradient-to-r from-blue-600 to-blue-500 text-white font-semibold shadow-lg shadow-blue-500/35'
            : 'text-slate-200/90 hover:text-white hover:bg-white/[0.08] active:scale-[0.98]'
        }`
      }
    >
      {({ isActive }) => (
        <>
          <Icon
            size={18}
            strokeWidth={isActive ? 2.3 : 1.9}
            className={`shrink-0 transition-transform duration-150 ${
              isActive
                ? 'text-white'
                : 'text-slate-300 group-hover:text-white group-hover:scale-105'
            }`}
          />
          {!isCollapsed && (
            <>
              <span className="truncate flex-1">{label}</span>
              {!isActive && (
                <ChevronRight
                  size={14}
                  strokeWidth={2.2}
                  className="ml-auto text-blue-200/40 group-hover:text-white group-hover:translate-x-0.5 transition-all shrink-0"
                />
              )}
            </>
          )}
        </>
      )}
    </NavLink>
  )
}

export default function Sidebar({ isOpen, onClose, isCollapsed = false, onToggleCollapse }) {
  const { user, logout, requestLogout, isAdmin, isPlatformAdmin } = useAuth()
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
        className={`fixed top-0 bottom-0 left-0 z-50 flex flex-col h-screen shrink-0 bg-gradient-to-b from-[#061838] via-[#08214D] to-[#05142E] border-r border-[#0E2C60] text-white shadow-2xl transition-[width,transform] duration-300 ease-in-out ${
          isOpen ? 'translate-x-0 w-64' : '-translate-x-full lg:translate-x-0'
        } ${isCollapsed ? 'lg:w-[76px]' : 'lg:w-64'}`}
      >

        {/* Ambient background curve glow */}
        <div className="absolute -bottom-10 -left-10 w-72 h-72 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

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
              className={`h-10 ${effectiveCollapsed ? 'w-10' : 'min-w-[40px] max-w-[50px]'} rounded-xl overflow-hidden bg-white/95 shrink-0 flex items-center justify-center border border-white/20 shadow-md p-1`}
              title={effectiveCollapsed ? (company?.name || 'CLEANIG SERVICE') : undefined}
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
                  {company?.name || 'CLEANIG SERVICE'}
                </p>
                <p className="text-[10.5px] text-blue-300 font-semibold uppercase tracking-wider mt-0.5 truncate">
                  {company?.ruc ? `RUC: ${company.ruc}` : 'ERP'}
                </p>
              </div>
            )}
          </div>

          <button onClick={onClose} className="lg:hidden p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-colors">
            <X size={16} />
          </button>
        </div>

        {/* Navigation list with hidden native scrollbar */}
        <nav className="flex-1 min-h-0 overflow-y-auto px-1.5 py-2.5 space-y-0.5 no-scrollbar overscroll-contain z-10">
          {!isPlatformAdmin ? (
            NAV_ITEMS.map((item) => {
              if (item.adminOnly && !isAdmin) return null
              return (
                <Item key={item.to} {...item} onClick={onClose} isCollapsed={effectiveCollapsed} />
              )
            })
          ) : (
            <>
              <Item to="/admin-plataforma" label="Panel Plataforma" icon={ShieldAlert} onClick={onClose} isCollapsed={effectiveCollapsed} />
            </>
          )}

          {/* Help Support Card (exact match to reference image) */}
          {!effectiveCollapsed && (
            <div className="mx-2 my-3 p-3 rounded-2xl bg-gradient-to-b from-white/[0.08] to-white/[0.03] backdrop-blur-md border border-white/[0.12] text-center relative overflow-hidden shadow-lg shadow-black/20">
              <div className="w-10 h-10 mx-auto rounded-full bg-blue-600 flex items-center justify-center text-white shadow-[0_0_15px_rgba(37,99,235,0.8)]">
                <Headphones size={18} strokeWidth={2.2} />
              </div>
              <p className="text-xs font-bold text-white mt-2 leading-tight">¿Necesitas ayuda?</p>
              <p className="text-[10.5px] text-blue-200/70 mt-0.5">Contáctanos en soporte</p>
              <a
                href="https://wa.me/51987654321?text=Hola,%20necesito%20soporte%20con%20el%20sistema%20ERP"
                target="_blank"
                rel="noreferrer"
                className="mt-2.5 w-full py-2 px-3 rounded-xl bg-blue-600 hover:bg-blue-500 active:scale-[0.98] text-white font-semibold text-xs flex items-center justify-center gap-1 shadow-md shadow-blue-600/30 transition-all cursor-pointer"
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
