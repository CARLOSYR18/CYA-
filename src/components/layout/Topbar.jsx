import { LogOut, Menu } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { isSupabaseConfigured } from '../../lib/supabaseClient'

export default function Topbar({ title, onOpenSidebar }) {
  const { user, logout } = useAuth()

  const initials = user?.full_name
    ? user.full_name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()
    : 'US'

  return (
    <header className="h-16 bg-white/90 backdrop-blur-lg border-b border-base-border sticky top-0 z-30 flex items-center justify-between px-4 sm:px-6 transition-all">

      {/* Left */}
      <div className="flex items-center gap-3.5">
        <button
          onClick={onOpenSidebar}
          className="lg:hidden p-2 rounded-xl text-ink-muted hover:text-ink-primary hover:bg-base-raised transition-all duration-150 cursor-pointer"
          aria-label="Abrir menú"
        >
          <Menu size={20} />
        </button>
        <div className="flex items-center gap-2.5">
          <div className="hidden sm:block w-[3px] h-4 rounded-full bg-brand" />
          <h1 className="font-display font-bold text-[17px] text-ink-primary tracking-tight">
            {title}
          </h1>
        </div>
      </div>

      {/* Right */}
      <div className="flex items-center gap-2 sm:gap-3">
        {!isSupabaseConfigured && (
          <span className="hidden sm:inline-flex items-center gap-1.5 text-[11px] font-semibold text-amber bg-amber-dim border border-amber/20 rounded-full px-2.5 py-1">
            <span className="w-1.5 h-1.5 rounded-full bg-amber animate-pulse" />
            Demo local
          </span>
        )}

        {/* User */}
        <div className="flex items-center gap-2.5 pl-2.5 sm:pl-3.5 border-l border-base-border">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 text-white flex items-center justify-center text-[11px] font-bold font-display shadow-xs shrink-0 select-none">
            {initials}
          </div>
          <div className="hidden sm:flex flex-col leading-tight">
            <span className="text-[13px] text-ink-primary font-semibold truncate max-w-[130px]">
              {user?.full_name}
            </span>
            <span className="text-[10px] font-semibold text-ink-muted uppercase tracking-wider">
              {user?.role === 'admin' ? 'Administrador' : 'Colaborador'}
            </span>
          </div>
        </div>

        <button
          onClick={logout}
          className="p-2 rounded-xl text-ink-muted hover:text-bad hover:bg-bad-dim transition-all duration-150 cursor-pointer"
          title="Cerrar sesión"
        >
          <LogOut size={17} />
        </button>
      </div>
    </header>
  )
}
