import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { LogOut, Menu, ChevronDown, Bell, CheckCircle2, Sparkles, ShieldAlert, Sun, Moon, PanelLeftClose, PanelLeftOpen, UserCircle } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useTheme } from '../../context/ThemeContext'
import { isSupabaseConfigured } from '../../lib/supabaseClient'
import { getNotifications } from '../../lib/notifications'
import { companySettingsService } from '../../services/companySettingsService'

const COLORS = ['#3B82F6','#8B5CF6','#10B981','#F59E0B','#EF4444','#06B6D4']
function avatarColor(name = '') {
  let h = 0; for (const c of name) h = c.charCodeAt(0) + ((h << 5) - h)
  return COLORS[Math.abs(h) % COLORS.length]
}

export default function Topbar({ title, onOpenSidebar, isCollapsed = false, onToggleCollapse }) {
  const navigate = useNavigate()
  const { user, logout, requestLogout, isPlatformAdmin } = useAuth()
  const { isDark, toggleTheme } = useTheme()
  
  // Company settings & logo
  const [company, setCompany] = useState(() => companySettingsService.getCached(user?.company_id))
  const [imgError, setImgError] = useState(false)

  // User menu state
  const [userOpen, setUserOpen] = useState(false)
  const userRef = useRef(null)

  // Notification state
  const [notifications, setNotifications] = useState([])
  const [notifOpen, setNotifOpen] = useState(false)
  const [loadingNotifs, setLoadingNotifs] = useState(false)
  const notifRef = useRef(null)

  const avatarUrl = isPlatformAdmin
    ? (user?.avatar_url || '/logo-cya-badge.png')
    : (user?.avatar_url || company?.logo_url || '')

  const displayName = isPlatformAdmin
    ? (user?.full_name || 'Carlos Yamacacho')
    : (user?.full_name || company?.name || 'Usuario')

  const initials = isPlatformAdmin
    ? 'CY'
    : (user?.full_name
        ? user.full_name.split(' ').map(n => n[0]).slice(0,2).join('').toUpperCase()
        : (user?.email ? user.email.charAt(0).toUpperCase() : 'US'))
  const color = avatarColor(displayName || user?.email || '')

  useEffect(() => {
    setImgError(false)
  }, [avatarUrl])

  useEffect(() => {
    const cached = companySettingsService.getCached(user?.company_id)
    if (cached) {
      setCompany(cached)
      setImgError(false)
    } else if (!user?.company_id) {
      setCompany(null)
    }
    companySettingsService.get().then(c => {
      if (c) {
        setCompany(c)
        setImgError(false)
      }
    }).catch(() => {})

    const handleCompanyUpdate = (e) => {
      if (e.detail) {
        setCompany(e.detail)
        setImgError(false)
      } else if (e.detail === null) {
        setCompany(null)
      } else {
        companySettingsService.get().then(c => {
          if (c) {
            setCompany(c)
            setImgError(false)
          }
        }).catch(() => {})
      }
    }

    window.addEventListener('cya_company_updated', handleCompanyUpdate)
    return () => window.removeEventListener('cya_company_updated', handleCompanyUpdate)
  }, [user?.company_id])

  const loadNotifs = async () => {
    try {
      setLoadingNotifs(true)
      const list = await getNotifications()
      setNotifications(list || [])
    } catch (err) {
      console.error('Error al cargar notificaciones:', err)
    } finally {
      setLoadingNotifs(false)
    }
  }

  useEffect(() => {
    loadNotifs()
  }, [])

  useEffect(() => {
    const handleOutside = (e) => {
      if (userRef.current && !userRef.current.contains(e.target)) {
        setUserOpen(false)
      }
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setNotifOpen(false)
      }
    }
    document.addEventListener('click', handleOutside)
    return () => {
      document.removeEventListener('click', handleOutside)
    }
  }, [])

  return (
    <header className="h-16 bg-white dark:bg-[#121215] border-b border-slate-200 dark:border-[#27272a] sticky top-0 z-30 flex items-center justify-between px-4 sm:px-6 shadow-xs transition-colors duration-200">

      {/* Left */}
      <div className="flex items-center gap-3">
        {/* Mobile menu trigger */}
        <button
          onClick={onOpenSidebar}
          className="lg:hidden p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-all cursor-pointer"
          title="Abrir menú"
        >
          <Menu size={20} />
        </button>

        {/* Desktop sidebar collapse/expand trigger */}
        {onToggleCollapse && (
          <button
            type="button"
            onClick={onToggleCollapse}
            className="hidden lg:flex p-2 rounded-xl text-slate-400 hover:text-brand dark:hover:text-blue-400 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
            title={isCollapsed ? 'Expandir barra lateral' : 'Contraer barra lateral'}
          >
            {isCollapsed ? <PanelLeftOpen size={19} /> : <PanelLeftClose size={19} />}
          </button>
        )}

        <div className="flex items-center gap-2.5">
          <div className="hidden sm:block w-[3px] h-5 rounded-full bg-blue-600" />
          <h1 className="font-display font-bold text-[17px] text-slate-800 dark:text-slate-100 tracking-tight">{title}</h1>
        </div>
      </div>

      {/* Right */}
      <div className="flex items-center gap-2">
        {!isSupabaseConfigured && (
          <span className="hidden sm:inline-flex items-center gap-1.5 text-[11px] font-bold text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-2.5 py-1">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" /> Demo local
          </span>
        )}

        {/* Notification bell dropdown */}
        <div className="relative" ref={notifRef}>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              setUserOpen(false)
              const next = !notifOpen
              setNotifOpen(next)
              if (next) loadNotifs()
            }}
            className={`relative p-2 rounded-xl transition-all cursor-pointer ${
              notifOpen ? 'bg-blue-50 text-blue-700 dark:bg-blue-600/20 dark:text-blue-400' : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/60'
            }`}
            title="Notificaciones y alertas"
            aria-label="Notificaciones"
          >
            <Bell size={18} className="pointer-events-none" />
            {notifications.length > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 bg-bad text-white text-[10px] font-extrabold rounded-full flex items-center justify-center ring-2 ring-white dark:ring-slate-900 shadow-xs pointer-events-none">
                {notifications.length > 9 ? '9+' : notifications.length}
              </span>
            )}
          </button>

          {notifOpen && (
            <div
              className="absolute right-0 top-full mt-2 w-[calc(100vw-24px)] max-w-sm sm:w-84 bg-white dark:bg-[#141417] border border-slate-200 dark:border-[#27272a] rounded-2xl animate-scale-in z-50 overflow-hidden shadow-2xl"
              style={{ boxShadow: '0 10px 30px rgba(0,0,0,0.12)' }}
            >
              <div className="px-4 py-3 bg-slate-50 dark:bg-[#18181c] border-b border-slate-100 dark:border-[#27272a] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-[13px] font-bold text-slate-800 dark:text-slate-100">Notificaciones</span>
                  {notifications.length > 0 && (
                    <span className="text-[10px] font-extrabold px-2 py-0.5 bg-slate-200 dark:bg-[#27272a] text-slate-700 dark:text-slate-300 rounded-full font-mono">
                      {notifications.length}
                    </span>
                  )}
                </div>
                {loadingNotifs && (
                  <span className="text-[10px] text-slate-400 font-medium animate-pulse">Actualizando…</span>
                )}
              </div>

              <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
                {notifications.length === 0 ? (
                  <div className="p-6 text-center">
                    <div className="w-10 h-10 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto mb-2">
                      <CheckCircle2 size={20} />
                    </div>
                    <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">No tienes notificaciones pendientes</p>
                    <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">El inventario y las transacciones están al día</p>
                  </div>
                ) : (
                  notifications.map((n) => {
                    const isDanger = n.type === 'danger'
                    return (
                      <button
                        key={n.id}
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          setNotifOpen(false)
                          if (n.link) navigate(n.link)
                        }}
                        className="w-full text-left p-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 active:bg-slate-100 dark:active:bg-slate-800 transition-colors flex items-start gap-2.5 group cursor-pointer"
                      >
                        <span
                          className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${
                            isDanger ? 'bg-bad animate-pulse' : 'bg-amber-500'
                          }`}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-1">
                            <p className={`text-xs font-bold truncate ${isDanger ? 'text-bad' : 'text-slate-900 dark:text-slate-100'}`}>
                              {n.title}
                            </p>
                            <span className={`text-[10px] font-medium px-1.5 py-0.2 rounded shrink-0 ${
                              isDanger ? 'bg-bad-dim text-bad' : 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300'
                            }`}>
                              {isDanger ? 'Urgente' : 'Alerta'}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-2 leading-tight">
                            {n.message}
                          </p>
                        </div>
                      </button>
                    )
                  })
                )}
              </div>
            </div>
          )}
        </div>

        {/* Dark Mode Toggle */}
        <button
          type="button"
          onClick={toggleTheme}
          className={`p-2 rounded-xl border transition-all flex items-center justify-center ${
            isDark
              ? 'bg-slate-800 text-amber-300 border-slate-700 hover:bg-slate-700 hover:text-amber-200'
              : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100 border-transparent hover:border-slate-200'
          }`}
          title={isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
          aria-label={isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
        >
          {isDark ? (
            <Sun size={18} className="text-amber-400 transition-transform duration-300 hover:rotate-45" />
          ) : (
            <Moon size={18} className="text-slate-500 transition-transform duration-300 hover:-rotate-12" />
          )}
        </button>

        {/* Separator */}
        <div className="w-px h-6 bg-slate-200 dark:bg-slate-700 mx-1" />

        {/* User */}
        <div className="relative" ref={userRef}>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              setNotifOpen(false)
              setUserOpen(v => !v)
            }}
            className={`flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl border transition-all cursor-pointer ${
              userOpen ? 'border-blue-200 bg-blue-50 dark:border-blue-500/40 dark:bg-blue-500/10' : 'border-slate-200 dark:border-slate-700/60 hover:bg-slate-50 dark:hover:bg-slate-800/60'
            }`}>
            <div
              className={`h-8 ${avatarUrl && !imgError ? (user?.avatar_url ? 'w-8' : 'min-w-[32px] max-w-[48px] px-1 bg-white dark:bg-zinc-800 border border-slate-200/80 dark:border-white/10') : 'w-8' } rounded-xl flex items-center justify-center text-white text-[12px] font-bold font-display shadow-2xs shrink-0 select-none overflow-hidden`}
              style={(!avatarUrl || imgError) ? { background: color } : undefined}
            >
              {avatarUrl && !imgError ? (
                <img
                  src={avatarUrl}
                  alt={user?.full_name || company?.name || 'Avatar'}
                  className={user?.avatar_url ? 'w-full h-full object-cover' : 'max-h-full max-w-full w-auto h-auto object-contain'}
                  onError={() => setImgError(true)}
                />
              ) : (
                initials
              )}
            </div>
            <div className="hidden sm:flex flex-col leading-tight text-left">
              <span className="text-[13px] text-slate-800 dark:text-slate-200 font-semibold truncate max-w-[130px]">
                {displayName}
              </span>
              {isPlatformAdmin ? (
                <span className="text-[9px] font-extrabold text-purple-700 bg-purple-100 dark:bg-purple-950/40 dark:text-purple-300 px-1.5 py-0.5 rounded uppercase tracking-wider w-fit">
                  SUPER ADMIN
                </span>
              ) : (
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{user?.role === 'admin' ? 'Admin' : 'Empleado'}</span>
              )}
            </div>
            <ChevronDown size={13} className={`text-slate-400 transition-transform duration-200 ${userOpen ? 'rotate-180' : ''}`} />
          </button>

          {userOpen && (
            <div className="absolute right-0 top-[calc(100%+8px)] w-56 bg-white dark:bg-[#141417] border border-slate-200 dark:border-[#27272a] rounded-2xl animate-scale-in z-50 overflow-hidden shadow-2xl"
              style={{ boxShadow: '0 10px 30px rgba(0,0,0,0.12)' }}>
              <div className="px-4 py-3 bg-slate-50 dark:bg-[#18181c] border-b border-slate-100 dark:border-[#27272a] flex items-center gap-2.5">
                {avatarUrl && !imgError && (
                  <div className={`h-8 ${user?.avatar_url ? 'w-8' : 'min-w-[32px] max-w-[48px] p-0.5'} rounded-lg overflow-hidden bg-white dark:bg-zinc-800 border border-slate-200/80 dark:border-white/10 shrink-0 flex items-center justify-center`}>
                    <img src={avatarUrl} alt="Avatar" className={user?.avatar_url ? 'w-full h-full object-cover' : 'max-h-full max-w-full w-auto h-auto object-contain'} />
                  </div>
                )}
                <div className="min-w-0">
                  <p className="text-[13px] font-bold text-slate-800 dark:text-slate-100 truncate">
                    {displayName}
                  </p>
                  <p className="text-[11px] text-slate-400 dark:text-slate-500 truncate">{user?.email}</p>
                </div>
              </div>
              <div className="p-1.5 space-y-0.5">
                {/* Opción directa a Mi Perfil */}
                <button
                  onClick={() => {
                    setUserOpen(false)
                    navigate('/perfil')
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-[13px] text-blue-600 dark:text-blue-400 font-semibold hover:bg-blue-50 dark:hover:bg-blue-950/30 transition-colors cursor-pointer"
                >
                  <UserCircle size={15} /> Mi Perfil y Cuenta
                </button>

                {isPlatformAdmin ? (
                  <button
                    onClick={() => {
                      setUserOpen(false)
                      navigate('/admin-plataforma')
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-[13px] text-purple-700 dark:text-purple-300 font-semibold hover:bg-purple-50 dark:hover:bg-purple-950/30 transition-colors cursor-pointer"
                  >
                    <ShieldAlert size={14} className="text-purple-600 dark:text-purple-400" /> Panel Plataforma
                  </button>
                ) : user?.role === 'admin' ? (
                  <button
                    onClick={() => {
                      setUserOpen(false)
                      navigate('/planes')
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-[13px] text-slate-700 dark:text-slate-200 font-medium hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors cursor-pointer"
                  >
                    <Sparkles size={14} className="text-amber-500" /> Tu Plan y Suscripción
                  </button>
                ) : null}
                
                <button
                  onClick={() => {
                    toggleTheme()
                  }}
                  className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-[13px] text-slate-700 dark:text-slate-200 font-medium hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2.5">
                    {isDark ? (
                      <Sun size={14} className="text-amber-400" />
                    ) : (
                      <Moon size={14} className="text-slate-500" />
                    )}
                    <span>{isDark ? 'Modo Claro' : 'Modo Oscuro'}</span>
                  </div>
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                    isDark ? 'bg-amber-400/20 text-amber-300 border border-amber-400/30' : 'bg-slate-100 text-slate-600'
                  }`}>
                    {isDark ? 'ACTIVO' : 'INACTIVO'}
                  </span>
                </button>

                <div className="border-t border-slate-100 dark:border-slate-800 my-1" />
                <button onClick={() => { setUserOpen(false); if (requestLogout) requestLogout(); else logout() }}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-[13px] text-red-600 dark:text-red-400 font-medium hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors cursor-pointer">
                  <LogOut size={14} /> Cerrar sesión
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
