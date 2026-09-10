import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard, Boxes, Tags, ArrowLeftRight, ShoppingCart,
  Truck, Users, UserCog, Warehouse,
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

export default function Sidebar() {
  const { isAdmin } = useAuth()

  return (
    <aside className="w-60 shrink-0 bg-base-surface border-r border-base-border flex flex-col h-screen sticky top-0">
      <div className="h-16 flex items-center gap-2.5 px-5 border-b border-base-border">
        <div className="w-8 h-8 rounded-md bg-brand flex items-center justify-center">
          <Warehouse size={18} className="text-white" />
        </div>
        <div>
          <p className="font-display font-semibold text-ink-primary leading-tight">Almacén</p>
          <p className="text-[11px] text-ink-muted leading-tight">Gestión de inventario</p>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-0.5">
        {navItems.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${
                isActive
                  ? 'bg-brand-dim text-brand-hover font-medium'
                  : 'text-ink-secondary hover:bg-base-raised hover:text-ink-primary'
              }`
            }
          >
            <Icon size={17} strokeWidth={2} />
            {label}
          </NavLink>
        ))}

        {isAdmin && (
          <>
            <p className="px-3 pt-4 pb-1 text-[11px] font-medium text-ink-muted uppercase tracking-wide">
              Administración
            </p>
            <NavLink
              to="/usuarios"
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${
                  isActive
                    ? 'bg-brand-dim text-brand-hover font-medium'
                    : 'text-ink-secondary hover:bg-base-raised hover:text-ink-primary'
                }`
              }
            >
              <UserCog size={17} strokeWidth={2} />
              Usuarios y roles
            </NavLink>
          </>
        )}
      </nav>
    </aside>
  )
}
