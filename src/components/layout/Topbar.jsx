import { LogOut, Menu } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { isSupabaseConfigured } from '../../lib/supabaseClient'

export default function Topbar({ title, onOpenSidebar }) {
  const { user, logout } = useAuth()

  return (
    <header className="h-16 border-b border-base-border bg-white/85 backdrop-blur-md sticky top-0 z-30 flex items-center justify-between px-4 sm:px-6 transition-all">
      {/* Left: Hamburger menu on mobile + Title */}
      <div className="flex items-center gap-3">
        <button
          onClick={onOpenSidebar}
          className="lg:hidden p-2 rounded-xl text-ink-secondary hover:text-ink-primary hover:bg-slate-100 transition-colors cursor-pointer"
          title="Abrir menú"
          aria-label="Abrir menú"
        >
          <Menu size={20} />
        </button>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-brand hidden sm:inline-block" />
          <h1 className="font-display text-base sm:text-lg font-bold text-ink-primary tracking-tight">
            {title}
          </h1>
        </div>
      </div>

      {/* Right: User info & logout */}
      <div className="flex items-center gap-2.5 sm:gap-4">
        {!isSupabaseConfigured && (
          <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-amber-700 bg-amber-50 border border-amber-200/80 rounded-full px-2.5 py-0.5">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
            Modo demo local
          </span>
        )}

        <div className="flex items-center gap-2.5 pl-2 sm:pl-3 border-l border-base-border">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand to-brand-hover text-white flex items-center justify-center text-xs font-bold font-display shadow-xs shrink-0">
            {user?.full_name?.slice(0, 2).toUpperCase() || 'US'}
          </div>
          <div className="hidden sm:block leading-tight text-left">
            <p className="text-xs sm:text-sm text-ink-primary font-semibold truncate max-w-[140px]">
              {user?.full_name}
            </p>
            <span className="inline-block text-[10px] font-medium px-1.5 py-0.2 rounded bg-slate-100 text-ink-muted uppercase tracking-wider">
              {user?.role}
            </span>
          </div>
        </div>

        <button
          onClick={logout}
          className="p-2 rounded-xl text-ink-secondary hover:text-bad hover:bg-bad-dim transition-all cursor-pointer"
          title="Cerrar sesión"
          aria-label="Cerrar sesión"
        >
          <LogOut size={18} />
        </button>
      </div>
    </header>
  )
}
