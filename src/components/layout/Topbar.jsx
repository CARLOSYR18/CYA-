import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { LogOut, Menu, ChevronDown, Bell, CheckCircle2 } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { isSupabaseConfigured } from '../../lib/supabaseClient'
import { getNotifications } from '../../lib/notifications'

const COLORS = ['#3B82F6','#8B5CF6','#10B981','#F59E0B','#EF4444','#06B6D4']
function avatarColor(name = '') {
  let h = 0; for (const c of name) h = c.charCodeAt(0) + ((h << 5) - h)
  return COLORS[Math.abs(h) % COLORS.length]
}

export default function Topbar({ title, onOpenSidebar }) {
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  
  // User menu state
  const [userOpen, setUserOpen] = useState(false)
  const userRef = useRef(null)

  // Notification state
  const [notifications, setNotifications] = useState([])
  const [notifOpen, setNotifOpen] = useState(false)
  const [loadingNotifs, setLoadingNotifs] = useState(false)
  const notifRef = useRef(null)

  const initials = user?.full_name
    ? user.full_name.split(' ').map(n => n[0]).slice(0,2).join('').toUpperCase()
    : 'US'
  const color = avatarColor(user?.full_name || '')

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
    document.addEventListener('mousedown', handleOutside)
    return () => document.removeEventListener('mousedown', handleOutside)
  }, [])

  return (
    <header className="h-16 bg-white sticky top-0 z-30 flex items-center justify-between px-4 sm:px-6"
      style={{ borderBottom: '1px solid #E8EDF5', boxShadow: '0 1px 3px rgba(10,15,30,0.05)' }}>

      {/* Left */}
      <div className="flex items-center gap-3.5">
        <button onClick={onOpenSidebar}
          className="lg:hidden p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all">
          <Menu size={20} />
        </button>
        <div className="flex items-center gap-2.5">
          <div className="hidden sm:block w-[3px] h-5 rounded-full bg-blue-600" />
          <h1 className="font-display font-bold text-[17px] text-slate-800 tracking-tight">{title}</h1>
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
            onClick={() => {
              const next = !notifOpen
              setNotifOpen(next)
              if (next) loadNotifs()
            }}
            className={`relative p-2 rounded-xl transition-all ${
              notifOpen ? 'bg-blue-50 text-blue-700' : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100'
            }`}
            title="Notificaciones"
          >
            <Bell size={18} />
            {notifications.length > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 bg-bad text-white text-[10px] font-extrabold rounded-full flex items-center justify-center ring-2 ring-white shadow-xs">
                {notifications.length > 9 ? '9+' : notifications.length}
              </span>
            )}
          </button>

          {notifOpen && (
            <div
              className="absolute right-0 sm:-right-12 top-[calc(100%+8px)] w-[300px] sm:w-[360px] bg-white border border-slate-200 rounded-2xl animate-scale-in z-50 overflow-hidden"
              style={{ boxShadow: '0 10px 30px rgba(0,0,0,0.12)' }}
            >
              <div className="px-4 py-3 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-[13px] font-bold text-slate-800">Notificaciones</span>
                  {notifications.length > 0 && (
                    <span className="text-[10px] font-extrabold px-2 py-0.5 bg-slate-200 text-slate-700 rounded-full font-mono">
                      {notifications.length}
                    </span>
                  )}
                </div>
                {loadingNotifs && (
                  <span className="text-[10px] text-slate-400 font-medium animate-pulse">Actualizando…</span>
                )}
              </div>

              <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
                {notifications.length === 0 ? (
                  <div className="p-6 text-center">
                    <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-2">
                      <CheckCircle2 size={20} />
                    </div>
                    <p className="text-xs font-semibold text-slate-700">No tienes notificaciones pendientes</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">El inventario y las transacciones están al día</p>
                  </div>
                ) : (
                  notifications.map((n) => {
                    const isDanger = n.type === 'danger'
                    return (
                      <button
                        key={n.id}
                        type="button"
                        onClick={() => {
                          setNotifOpen(false)
                          if (n.link) navigate(n.link)
                        }}
                        className="w-full text-left p-3 hover:bg-slate-50 active:bg-slate-100 transition-colors flex items-start gap-2.5 group"
                      >
                        <span
                          className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${
                            isDanger ? 'bg-bad animate-pulse' : 'bg-amber-500'
                          }`}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-1">
                            <p className={`text-xs font-bold truncate ${isDanger ? 'text-bad' : 'text-slate-900'}`}>
                              {n.title}
                            </p>
                            <span className={`text-[10px] font-medium px-1.5 py-0.2 rounded shrink-0 ${
                              isDanger ? 'bg-bad-dim text-bad' : 'bg-amber-50 text-amber-700'
                            }`}>
                              {isDanger ? 'Urgente' : 'Alerta'}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-2 leading-tight">
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

        {/* Separator */}
        <div className="w-px h-6 bg-slate-200 mx-1" />

        {/* User */}
        <div className="relative" ref={userRef}>
          <button onClick={() => setUserOpen(v => !v)}
            className={`flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl border transition-all ${
              userOpen ? 'border-blue-200 bg-blue-50' : 'border-slate-200 hover:bg-slate-50'
            }`}>
            <div className="w-8 h-8 rounded-xl flex items-center justify-center text-white text-[12px] font-bold font-display shadow-sm shrink-0 select-none"
              style={{ background: color }}>
              {initials}
            </div>
            <div className="hidden sm:flex flex-col leading-tight text-left">
              <span className="text-[13px] text-slate-800 font-semibold truncate max-w-[110px]">{user?.full_name}</span>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{user?.role === 'admin' ? 'Admin' : 'Empleado'}</span>
            </div>
            <ChevronDown size={13} className={`text-slate-400 transition-transform duration-200 ${userOpen ? 'rotate-180' : ''}`} />
          </button>

          {userOpen && (
            <div className="absolute right-0 top-[calc(100%+8px)] w-56 bg-white border border-slate-200 rounded-2xl animate-scale-in z-50 overflow-hidden"
              style={{ boxShadow: '0 10px 30px rgba(0,0,0,0.12)' }}>
              <div className="px-4 py-3 bg-slate-50 border-b border-slate-100">
                <p className="text-[13px] font-bold text-slate-800 truncate">{user?.full_name}</p>
                <p className="text-[11px] text-slate-400 truncate">{user?.email}</p>
              </div>
              <div className="p-1.5">
                <button onClick={() => { setUserOpen(false); logout() }}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-[13px] text-red-600 font-medium hover:bg-red-50 transition-colors">
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
