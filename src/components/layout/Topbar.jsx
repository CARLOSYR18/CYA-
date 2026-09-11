import { LogOut, Menu } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { isSupabaseConfigured } from '../../lib/supabaseClient'

export default function Topbar({ title, onOpenSidebar }) {
  const { user, logout } = useAuth()

  return (
    <header className="h-16 border-b border-base-border bg-base-bg/95 backdrop-blur sticky top-0 z-10 flex items-center justify-between px-4 sm:px-6">
      {/* Left: Hamburger menu on mobile + Title */}
      <div className="flex items-center gap-3">
        <button
          onClick={onOpenSidebar}
          className="lg:hidden p-2 rounded-lg text-ink-secondary hover:text-ink-primary hover:bg-base-raised transition-colors cursor-pointer"
          title="Abrir menú"
          aria-label="Abrir menú"
        >
          <Menu size={20} />
        </button>
        <h1 className="font-display text-base sm:text-lg font-semibold text-ink-primary tracking-tight">
          {title}
        </h1>
      </div>

      {/* Right: User info & logout */}
      <div className="flex items-center gap-2 sm:gap-4">
        {!isSupabaseConfigured && (
          <span className="hidden md:inline-flex items-center gap-1.5 text-[11px] text-amber bg-amber-dim border border-amber/20 rounded-full px-2.5 py-0.5">
            Modo demo
          </span>
        )}

        <div className="flex items-center gap-2 sm:gap-2.5">
          <div className="w-8 h-8 rounded-full bg-base-raised border border-base-border flex items-center justify-center text-xs font-semibold text-ink-primary font-display shrink-0">
            {user?.full_name?.slice(0, 2).toUpperCase() || 'US'}
          </div>
          <div className="hidden sm:block leading-tight text-left">
            <p className="text-xs sm:text-sm text-ink-primary font-medium truncate max-w-[130px]">
              {user?.full_name}
            </p>
            <p className="text-[10px] text-ink-muted capitalize">
              {user?.role}
            </p>
          </div>
        </div>

        <button
          onClick={logout}
          className="p-2 rounded-lg text-ink-secondary hover:text-bad hover:bg-bad-dim transition-colors cursor-pointer"
          title="Cerrar sesión"
        >
          <LogOut size={18} />
        </button>
      </div>
    </header>
  )
}
