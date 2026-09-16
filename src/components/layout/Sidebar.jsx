import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard, Boxes, Tags, ArrowLeftRight, ShoppingCart,
  Truck, Users, UserCog, Warehouse, X, Settings2
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'

const navItems = [
  { to: '/', label: 'Panel', icon: LayoutDashboard, end: true },
  { to: '/productos', label: 'Productos', icon: Boxes },
  { to: '/categorias', label: 'Categorías', icon: Tags },
  { to: '/movimientos', label: 'Movimientos', icon: ArrowLeftRight },
  { to: '/ventas', label: 'Ventas', icon: ShoppingCart },
  { to: '/compras', label: 'Compras', icon: Truck },
  { to: '/clientes', label: 'Clientes', icon: Users },
  { to: '/proveedores', label: 'Proveedores', icon: Warehouse },
]

export default function Sidebar({ isOpen, onClose }) {
  const { isAdmin } = useAuth()

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-xs z-40 lg:hidden transition-opacity"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Sidebar Drawer */}
      <aside
        className={`fixed lg:sticky top-0 inset-y-0 left-0 z-50 w-64 shrink-0 bg-white border-r border-base-border flex flex-col h-screen transition-transform duration-200 ease-in-out shadow-xs ${
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Header with CYA Logo */}
        <div className="h-16 flex items-center justify-between px-5 border-b border-base-border shrink-0 bg-white">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl ring-1 ring-amber-500/30 overflow-hidden bg-slate-900 flex items-center justify-center shrink-0 shadow-xs">
              <img src="/logo-cya-badge.png" alt="CYA" className="w-full h-full object-cover" />
            </div>
            <div>
              <p className="font-display font-bold text-ink-primary text-base leading-tight tracking-wide">CYA</p>
              <p className="text-[10px] font-semibold text-amber-600 uppercase tracking-wider leading-tight">Gestión Empresarial</p>
            </div>
          </div>

          {/* Close button for mobile */}
          <button
            onClick={onClose}
            className="lg:hidden p-1.5 rounded-lg text-ink-muted hover:text-ink-primary hover:bg-slate-100 transition-colors"
            title="Cerrar menú"
          >
            <X size={18} />
          </button>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
          <div className="px-3 pb-2">
            <p className="text-[10.5px] font-semibold text-ink-muted uppercase tracking-wider">
              Menú Principal
            </p>
          </div>
          {navItems.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all ${
                  isActive
                    ? 'bg-brand/10 text-brand font-semibold shadow-xs'
                    : 'text-ink-secondary hover:bg-slate-100/70 hover:text-ink-primary font-medium'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <Icon size={18} strokeWidth={isActive ? 2.2 : 1.8} className={isActive ? 'text-brand' : 'text-ink-muted'} />
                  <span className="flex-1">{label}</span>
                  {isActive && <div className="w-1.5 h-1.5 rounded-full bg-brand" />}
                </>
              )}
            </NavLink>
          ))}

          {isAdmin && (
            <>
              <div className="pt-5 pb-2 px-3">
                <p className="text-[10.5px] font-semibold text-ink-muted uppercase tracking-wider">
                  Administración
                </p>
              </div>
              <NavLink
                to="/usuarios"
                onClick={onClose}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all ${
                    isActive
                      ? 'bg-brand/10 text-brand font-semibold shadow-xs'
                      : 'text-ink-secondary hover:bg-slate-100/70 hover:text-ink-primary font-medium'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <UserCog size={18} strokeWidth={isActive ? 2.2 : 1.8} className={isActive ? 'text-brand' : 'text-ink-muted'} />
                    <span className="flex-1">Usuarios y roles</span>
                    {isActive && <div className="w-1.5 h-1.5 rounded-full bg-brand" />}
                  </>
                )}
              </NavLink>
              <NavLink
                to="/configuracion"
                onClick={onClose}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all ${
                    isActive
                      ? 'bg-brand/10 text-brand font-semibold shadow-xs'
                      : 'text-ink-secondary hover:bg-slate-100/70 hover:text-ink-primary font-medium'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <Settings2 size={18} strokeWidth={isActive ? 2.2 : 1.8} className={isActive ? 'text-brand' : 'text-ink-muted'} />
                    <span className="flex-1">Conf. empresa</span>
                    {isActive && <div className="w-1.5 h-1.5 rounded-full bg-brand" />}
                  </>
                )}
              </NavLink>
            </>
          )}
        </nav>

        {/* Footer info pill */}
        <div className="p-3 border-t border-base-border bg-slate-50/50">
          <div className="flex items-center gap-2.5 px-2.5 py-2 rounded-xl bg-white border border-base-border shadow-xs text-xs text-ink-secondary">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="font-medium text-[11px] text-ink-primary">CYA ERP Activo</span>
            <span className="ml-auto text-[10px] text-ink-muted">v1.2</span>
          </div>
        </div>
      </aside>
    </>
  )
}
