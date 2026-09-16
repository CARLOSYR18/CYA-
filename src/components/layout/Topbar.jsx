import { useState, useRef, useEffect } from 'react'
import { LogOut, Menu, ChevronDown, Bell } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { isSupabaseConfigured } from '../../lib/supabaseClient'

const COLORS = ['#3B82F6','#8B5CF6','#10B981','#F59E0B','#EF4444','#06B6D4']
function avatarColor(name = '') {
  let h = 0; for (const c of name) h = c.charCodeAt(0) + ((h << 5) - h)
  return COLORS[Math.abs(h) % COLORS.length]
}

export default function Topbar({ title, onOpenSidebar }) {
  const { user, logout } = useAuth()
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  const initials = user?.full_name
    ? user.full_name.split(' ').map(n => n[0]).slice(0,2).join('').toUpperCase()
    : 'US'
  const color = avatarColor(user?.full_name || '')

  useEffect(() => {
    const h = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
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

        {/* Notification bell (decorative) */}
        <button className="relative p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all">
          <Bell size={18} />
        </button>

        {/* Separator */}
        <div className="w-px h-6 bg-slate-200 mx-1" />

        {/* User */}
        <div className="relative" ref={ref}>
          <button onClick={() => setOpen(v => !v)}
            className={`flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl border transition-all ${
              open ? 'border-blue-200 bg-blue-50' : 'border-slate-200 hover:bg-slate-50'
            }`}>
            <div className="w-8 h-8 rounded-xl flex items-center justify-center text-white text-[12px] font-bold font-display shadow-sm shrink-0 select-none"
              style={{ background: color }}>
              {initials}
            </div>
            <div className="hidden sm:flex flex-col leading-tight text-left">
              <span className="text-[13px] text-slate-800 font-semibold truncate max-w-[110px]">{user?.full_name}</span>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{user?.role === 'admin' ? 'Admin' : 'Empleado'}</span>
            </div>
            <ChevronDown size={13} className={`text-slate-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
          </button>

          {open && (
            <div className="absolute right-0 top-[calc(100%+8px)] w-56 bg-white border border-slate-200 rounded-2xl animate-scale-in z-50 overflow-hidden"
              style={{ boxShadow: '0 10px 30px rgba(0,0,0,0.12)' }}>
              <div className="px-4 py-3 bg-slate-50 border-b border-slate-100">
                <p className="text-[13px] font-bold text-slate-800 truncate">{user?.full_name}</p>
                <p className="text-[11px] text-slate-400 truncate">{user?.email}</p>
              </div>
              <div className="p-1.5">
                <button onClick={() => { setOpen(false); logout() }}
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
