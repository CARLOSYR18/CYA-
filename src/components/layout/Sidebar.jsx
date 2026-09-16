import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard, Boxes, Tags, ArrowLeftRight, ShoppingCart,
  Truck, Users, UserCog, Warehouse, X, Settings2, Zap
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
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40 lg:hidden animate-fade-in"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed lg:sticky top-0 inset-y-0 left-0 z-50 w-64 shrink-0
          bg-white border-r border-base-border flex flex-col h-screen
          transition-transform duration-300 ease-in-out shadow-sm lg:shadow-none
          ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}
      >
        {/* ── Logo ── */}
        <div className="h-16 flex items-center justify-between px-5 border-b border-base-border shrink-0">
          <div className="flex items-center gap-3">
            <div className="relative w-9 h-9 rounded-xl overflow-hidden shrink-0 shadow-xs">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-600 to-blue-700" />
              <img
                src="/logo-cya-badge.png"
                alt="CYA"
                className="relative w-full h-full object-cover"
                onError={(e) => { e.currentTarget.style.display = 'none' }}
              />
              {/* Fallback */}
              <div className="absolute inset-0 flex items-center justify-center">
                <Zap size={16} className="text-white" />
              </div>
            </div>
            <div>
              <p className="font-display font-bold text-ink-primary text-[15px] leading-tight tracking-wide">CYA</p>
              <p className="text-[10px] font-semibold text-brand uppercase tracking-wider leading-tight">
                Gestión Empresarial
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="lg:hidden p-1.5 rounded-lg text-ink-muted hover:text-ink-primary hover:bg-base-raised transition-all"
          >
            <X size={17} />
          </button>
        </div>

        {/* ── Nav ── */}
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-0.5">
          <div className="px-3 pb-3">
            <p className="text-[10px] font-bold text-ink-muted uppercase tracking-widest">
              Principal
            </p>
          </div>

          {navItems.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              onClick={onClose}
              className={({ isActive }) =>
                `group relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13.5px] font-medium transition-all duration-150 ${
                  isActive
                    ? 'bg-brand/8 text-brand font-semibold'
                    : 'text-ink-secondary hover:bg-slate-50 hover:text-ink-primary'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-r-full bg-brand" />
                  )}
                  <Icon
                    size={17}
                    strokeWidth={isActive ? 2.3 : 1.8}
                    className={`transition-colors shrink-0 ${isActive ? 'text-brand' : 'text-ink-muted group-hover:text-ink-secondary'}`}
                  />
                  <span className="flex-1">{label}</span>
                  {isActive && (
                    <span className="w-1.5 h-1.5 rounded-full bg-brand" />
                  )}
                </>
              )}
            </NavLink>
          ))}

          {isAdmin && (
            <>
              <div className="pt-5 pb-3 px-3">
                <p className="text-[10px] font-bold text-ink-muted uppercase tracking-widest">
                  Administración
                </p>
              </div>
              {[
                { to: '/usuarios', label: 'Usuarios y roles', icon: UserCog },
                { to: '/configuracion', label: 'Conf. empresa', icon: Settings2 },
              ].map(({ to, label, icon: Icon }) => (
                <NavLink
                  key={to}
                  to={to}
                  onClick={onClose}
                  className={({ isActive }) =>
                    `group relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13.5px] font-medium transition-all duration-150 ${
                      isActive
                        ? 'bg-brand/8 text-brand font-semibold'
                        : 'text-ink-secondary hover:bg-slate-50 hover:text-ink-primary'
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      {isActive && (
                        <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-r-full bg-brand" />
                      )}
                      <Icon size={17} strokeWidth={isActive ? 2.3 : 1.8}
                        className={`shrink-0 ${isActive ? 'text-brand' : 'text-ink-muted group-hover:text-ink-secondary'}`}
                      />
                      <span className="flex-1">{label}</span>
                      {isActive && <span className="w-1.5 h-1.5 rounded-full bg-brand" />}
                    </>
                  )}
                </NavLink>
              ))}
            </>
          )}
        </nav>

        {/* ── Footer ── */}
        <div className="p-3 border-t border-base-border">
          <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-base-raised border border-base-border">
            <span className="relative flex h-2 w-2 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-good opacity-60" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-good" />
            </span>
            <span className="text-[12px] font-medium text-ink-secondary">Sistema activo</span>
            <span className="ml-auto text-[10px] text-ink-muted font-mono">v1.2</span>
          </div>
        </div>
      </aside>
    </>
  )
}
