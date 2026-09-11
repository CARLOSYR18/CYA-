import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard, Boxes, Tags, ArrowLeftRight, ShoppingCart,
  Truck, Users, UserCog, Warehouse, X
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
        className={`fixed lg:sticky top-0 inset-y-0 left-0 z-50 w-64 shrink-0 bg-base-surface border-r border-base-border flex flex-col h-screen transition-transform duration-200 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Header with CYA Logo */}
        <div className="h-16 flex items-center justify-between px-5 border-b border-base-border shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-full ring-1 ring-amber-500/30 overflow-hidden bg-[#0f1422] flex items-center justify-center shrink-0">
              <img src="/logo-cya-badge.png" alt="CYA" className="w-full h-full object-cover" />
            </div>
            <div>
              <p className="font-display font-bold text-ink-primary leading-tight tracking-wide">CYA</p>
              <p className="text-[10px] font-semibold text-amber-500 uppercase tracking-wider leading-tight">Gestión Empresarial</p>
            </div>
          </div>

          {/* Close button for mobile */}
          <button
            onClick={onClose}
            className="lg:hidden p-1.5 rounded-lg text-ink-muted hover:text-ink-primary hover:bg-base-raised transition-colors"
            title="Cerrar menú"
          >
            <X size={18} />
          </button>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
          {navItems.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                  isActive
                    ? 'bg-brand-dim text-brand-hover font-semibold'
                    : 'text-ink-secondary hover:bg-base-raised hover:text-ink-primary'
                }`
              }
            >
              <Icon size={18} strokeWidth={2} />
              <span>{label}</span>
            </NavLink>
          ))}

          {isAdmin && (
            <>
              <div className="pt-4 pb-1 px-3">
                <p className="text-[10.5px] font-semibold text-ink-muted uppercase tracking-wider">
                  Administración
                </p>
              </div>
              <NavLink
                to="/usuarios"
                onClick={onClose}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                    isActive
                      ? 'bg-brand-dim text-brand-hover font-semibold'
                      : 'text-ink-secondary hover:bg-base-raised hover:text-ink-primary'
                  }`
                }
              >
                <UserCog size={18} strokeWidth={2} />
                <span>Usuarios y roles</span>
              </NavLink>
            </>
          )}
        </nav>
      </aside>
    </>
  )
}
