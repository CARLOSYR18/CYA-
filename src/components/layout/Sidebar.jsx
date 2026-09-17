import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard, Boxes, Tags, ArrowLeftRight, ShoppingCart,
  Truck, Users, UserCog, Warehouse, X, Settings2
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'

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
const NAV_ADM = [
  { to: '/usuarios', label: 'Usuarios', icon: UserCog },
  { to: '/configuracion', label: 'Empresa', icon: Settings2 },
]

function Label({ children }) {
  return <p className="px-3 pt-5 pb-1.5 text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400">{children}</p>
}

function Item({ to, label, icon: Icon, end, onClick }) {
  return (
    <NavLink to={to} end={end} onClick={onClick}
      className={({ isActive }) =>
        `relative flex items-center gap-2.5 mx-2 px-3 py-2.5 rounded-xl text-[13.5px] font-medium transition-all duration-150 ${isActive
          ? 'bg-blue-50 text-blue-700 font-semibold'
          : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800'
        }`
      }>
      {({ isActive }) => (
        <>
          {isActive && <span className="absolute left-0 top-[20%] bottom-[20%] w-[3px] bg-blue-600 rounded-r-full" />}
          <Icon size={16} strokeWidth={isActive ? 2.2 : 1.8}
            className={isActive ? 'text-blue-600 shrink-0' : 'text-slate-400 shrink-0'} />
          <span className="truncate">{label}</span>
        </>
      )}
    </NavLink>
  )
}

export default function Sidebar({ isOpen, onClose }) {
  const { isAdmin } = useAuth()
  return (
    <>
      {isOpen && (
        <div className="fixed inset-0 bg-black/40 z-40 lg:hidden animate-fade-in" onClick={onClose} />
      )}
      <aside className={`fixed lg:sticky top-0 inset-y-0 left-0 z-50 flex flex-col h-screen w-64 shrink-0 bg-white border-r border-slate-200 transition-transform duration-300 ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>

        {/* Logo */}
        <div className="h-[64px] flex items-center justify-between px-4 border-b border-slate-200 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-full overflow-hidden bg-black shrink-0 flex items-center justify-center">
              <img src="/logo.png" alt="CYA" className="w-full h-full object-contain"
                onError={e => { e.currentTarget.src = '/logo-cya-badge.png' }} />
            </div>
            <div className="min-w-0">
              <p className="font-display font-bold text-slate-900 text-[14.5px] leading-tight truncate">CYA STORE</p>
              <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider mt-0.5">Gestión Empresarial</p>
            </div>
          </div>
          <button onClick={onClose} className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100">
            <X size={16} />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-2 space-y-0.5">
          <Label>Principal</Label>
          {NAV_MAIN.map(i => <Item key={i.to} {...i} onClick={onClose} />)}
          <Label>Catálogo</Label>
          {NAV_CAT.map(i => <Item key={i.to} {...i} onClick={onClose} />)}
          {isAdmin && (<>
            <Label>Administración</Label>
            {NAV_ADM.map(i => <Item key={i.to} {...i} onClick={onClose} />)}
          </>)}
        </nav>

        {/* Footer */}
        <div className="p-3 border-t border-slate-200 shrink-0">
          <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200">
            <span className="relative flex h-2 w-2 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            <span className="text-xs font-medium text-slate-500 flex-1">Sistema activo</span>
            <span className="text-[10px] text-slate-400 font-mono">v1.2</span>
          </div>
        </div>
      </aside>
    </>
  )
}
