import { useState, useRef, useEffect } from 'react'
import { LogOut, Menu, ChevronDown, User } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { isSupabaseConfigured } from '../../lib/supabaseClient'

const AVATAR_COLORS = [
  'from-blue-500 to-blue-700',
  'from-violet-500 to-purple-700',
  'from-emerald-500 to-teal-700',
  'from-rose-500 to-pink-700',
  'from-amber-500 to-orange-600',
]

function getAvatarColor(name = '') {
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length]
}

export default function Topbar({ title, onOpenSidebar }) {
  const { user, logout } = useAuth()
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef(null)

  const initials = user?.full_name
    ? user.full_name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()
    : 'US'

  const avatarColor = getAvatarColor(user?.full_name || '')

  useEffect(() => {
    function handler(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <header className="h-16 bg-white border-b border-base-border sticky top-0 z-30 flex items-center justify-between px-4 sm:px-6 shadow-xs">

      {/* Left */}
      <div className="flex items-center gap-3">
        <button
          onClick={onOpenSidebar}
          className="lg:hidden p-2 rounded-xl text-ink-muted hover:text-ink-primary hover:bg-base-raised transition-all"
          aria-label="Abrir menú"
        >
          <Menu size={19} />
        </button>

        <div className="flex items-center gap-2.5">
          <span className="hidden sm:block w-[3px] h-4 rounded-full bg-brand" />
          <h1 className="font-display font-bold text-lg text-ink-primary tracking-tight">
            {title}
          </h1>
        </div>
      </div>

      {/* Right */}
      <div className="flex items-center gap-2 sm:gap-3">

        {/* Demo badge */}
        {!isSupabaseConfigured && (
          <span className="hidden sm:inline-flex items-center gap-1.5 text-2xs font-bold text-warn bg-warn-dim border border-amber-200 rounded-full px-2.5 py-1">
            <span className="w-1.5 h-1.5 rounded-full bg-warn animate-pulse2" />
            Demo local
          </span>
        )}

        {/* User menu */}
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setMenuOpen(v => !v)}
            className={`flex items-center gap-2 pl-3 pr-2.5 py-1.5 rounded-xl border transition-all duration-150 ${
              menuOpen
                ? 'bg-brand-dim border-brand-dimBorder shadow-glow'
                : 'border-base-border hover:bg-base-raised hover:border-base-borderLight'
            }`}
          >
            <div className={`w-7 h-7 rounded-lg bg-gradient-to-br ${avatarColor} text-white flex items-center justify-center text-2xs font-bold font-display shadow-xs shrink-0 select-none`}>
              {initials}
            </div>
            <div className="hidden sm:flex flex-col leading-tight text-left">
              <span className="text-xs text-ink-primary font-semibold truncate max-w-[110px]">
                {user?.full_name}
              </span>
              <span className="text-2xs font-semibold text-ink-muted uppercase tracking-wider">
                {user?.role === 'admin' ? 'Admin' : 'Colaborador'}
              </span>
            </div>
            <ChevronDown
              size={13}
              className={`text-ink-muted transition-transform duration-200 ${menuOpen ? 'rotate-180' : ''}`}
            />
          </button>

          {/* Dropdown */}
          {menuOpen && (
            <div className="absolute right-0 top-[calc(100%+8px)] w-52 bg-white border border-base-border rounded-2xl shadow-card animate-scale-in z-50 overflow-hidden">
              {/* Header */}
              <div className="px-4 py-3 border-b border-base-border bg-base-raised">
                <p className="text-sm font-semibold text-ink-primary truncate">{user?.full_name}</p>
                <p className="text-xs text-ink-muted truncate">{user?.email}</p>
              </div>
              {/* Actions */}
              <div className="p-1.5">
                <button
                  disabled
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-ink-secondary hover:bg-base-raised transition-colors opacity-50"
                >
                  <User size={14} className="text-ink-muted" />
                  Mi perfil
                </button>
                <button
                  onClick={() => { setMenuOpen(false); logout() }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-bad hover:bg-bad-dim transition-colors"
                >
                  <LogOut size={14} />
                  Cerrar sesión
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
