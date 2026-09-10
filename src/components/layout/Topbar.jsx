import { LogOut } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { isSupabaseConfigured } from '../../lib/supabaseClient'

export default function Topbar({ title }) {
  const { user, logout } = useAuth()

  return (
    <header className="h-16 border-b border-base-border bg-base-bg/95 backdrop-blur sticky top-0 z-10 flex items-center justify-between px-6">
      <h1 className="font-display text-lg font-semibold text-ink-primary">{title}</h1>

      <div className="flex items-center gap-4">
        {!isSupabaseConfigured && (
          <span className="hidden sm:inline-flex items-center gap-1.5 text-xs text-amber bg-amber-dim border border-amber/20 rounded-full px-2.5 py-1">
            Modo demo — datos locales
          </span>
        )}

        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-base-raised border border-base-border flex items-center justify-center text-xs font-medium text-ink-primary font-display">
            {user?.full_name?.slice(0, 2).toUpperCase() || 'US'}
          </div>
          <div className="hidden md:block leading-tight">
            <p className="text-sm text-ink-primary font-medium">{user?.full_name}</p>
            <p className="text-xs text-ink-muted capitalize">{user?.role}</p>
          </div>
        </div>

        <button
          onClick={logout}
          className="p-2 rounded-md text-ink-secondary hover:text-bad hover:bg-bad-dim transition-colors"
          title="Cerrar sesión"
        >
          <LogOut size={18} />
        </button>
      </div>
    </header>
  )
}
