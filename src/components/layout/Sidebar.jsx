import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard, Boxes, Tags, ArrowLeftRight, ShoppingCart,
  Truck, Users, UserCog, Warehouse, X, Settings2, TrendingUp
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'

const NAV_MAIN = [
  { to: '/',           label: 'Panel',        icon: LayoutDashboard, end: true },
  { to: '/productos',  label: 'Productos',    icon: Boxes },
  { to: '/ventas',     label: 'Ventas',       icon: ShoppingCart },
  { to: '/compras',    label: 'Compras',      icon: Truck },
  { to: '/clientes',   label: 'Clientes',     icon: Users },
  { to: '/movimientos',label: 'Movimientos',  icon: ArrowLeftRight },
]
const NAV_CATALOG = [
  { to: '/categorias', label: 'Categorías',   icon: Tags },
  { to: '/proveedores',label: 'Proveedores',  icon: Warehouse },
]
const NAV_ADMIN = [
  { to: '/usuarios',    label: 'Usuarios',     icon: UserCog },
  { to: '/configuracion',label: 'Empresa',     icon: Settings2 },
]

function NavItem({ to, label, icon: Icon, end, onClick }) {
  return (
    <NavLink
      to={to}
      end={end}
      onClick={onClick}
      className={({ isActive }) =>
        `group relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 select-none ${
          isActive
            ? 'bg-brand-dim text-brand font-semibold'
            : 'text-ink-secondary hover:bg-base-raised hover:text-ink-primary'
        }`
      }
    >
      {({ isActive }) => (
        <>
          {isActive && (
            <span className="absolute left-0 top-[20%] bottom-[20%] w-[3px] rounded-r-full bg-brand" />
          )}
          <span className={`flex items-center justify-center w-[30px] h-[30px] rounded-lg shrink-0 transition-all duration-150 ${
            isActive ? 'bg-blue-100 text-brand' : 'text-ink-muted group-hover:text-ink-secondary group-hover:bg-base-raised'
          }`}>
            <Icon size={16} strokeWidth={isActive ? 2.2 : 1.8} />
          </span>
          <span className="flex-1 truncate">{label}</span>
        </>
      )}
    </NavLink>
  )
}

function SectionLabel({ children }) {
  return (
    <p className="text-2xs font-bold text-ink-muted uppercase tracking-widest px-3 pb-1 pt-4">
      {children}
    </p>
  )
}

export default function Sidebar({ isOpen, onClose }) {
  const { isAdmin } = useAuth()

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-[2px] z-40 lg:hidden animate-fade-in"
          onClick={onClose}
        />
      )}

      <aside className={`
        fixed lg:sticky top-0 inset-y-0 left-0 z-50 flex flex-col h-screen
        w-64 shrink-0 bg-white border-r border-base-border
        transition-transform duration-300 ease-in-out
        ${isOpen ? 'translate-x-0 shadow-card' : '-translate-x-full lg:translate-x-0'}
      `}>

        {/* ── Logo ── */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-base-border shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-full overflow-hidden shrink-0 bg-black flex items-center justify-center shadow-sm">
              <img
                src="/logo.png"
                alt="CYA"
                className="w-full h-full object-contain"
                onError={(e) => { e.currentTarget.src = '/logo-cya-badge.png' }}
              />
            </div>
            <div className="min-w-0">
              <p className="font-display font-bold text-ink-primary text-base leading-tight tracking-tight truncate">
                CYA STORE
              </p>
              <p className="text-2xs text-ink-muted font-medium uppercase tracking-wider mt-0.5">
                Gestión Empresarial
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="lg:hidden p-1.5 rounded-lg text-ink-muted hover:text-ink-primary hover:bg-base-raised transition-all"
          >
            <X size={16} />
          </button>
        </div>

        {/* ── Nav ── */}
        <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-0.5">
          <SectionLabel>Principal</SectionLabel>
          {NAV_MAIN.map(item => (
            <NavItem key={item.to} {...item} onClick={onClose} />
          ))}

          <SectionLabel>Catálogo</SectionLabel>
          {NAV_CATALOG.map(item => (
            <NavItem key={item.to} {...item} onClick={onClose} />
          ))}

          {isAdmin && (
            <>
              <SectionLabel>Administración</SectionLabel>
              {NAV_ADMIN.map(item => (
                <NavItem key={item.to} {...item} onClick={onClose} />
              ))}
            </>
          )}
        </nav>

        {/* ── Footer ── */}
        <div className="p-3 border-t border-base-border shrink-0">
          <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-base-raised border border-base-border">
            <span className="relative flex h-2 w-2 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-good opacity-60" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-good" />
            </span>
            <span className="text-xs font-medium text-ink-secondary flex-1">Sistema activo</span>
            <span className="text-2xs text-ink-muted font-mono">v1.2</span>
          </div>
        </div>
      </aside>
    </>
  )
}
