import { useEffect } from 'react'
import { LogOut, X, AlertTriangle, ShieldCheck } from 'lucide-react'

export default function LogoutConfirmModal({ open, onClose, onConfirm, user }) {
  useEffect(() => {
    if (!open) return
    const handler = (e) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handler)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', handler)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  if (!open) return null

  const initials = user?.full_name
    ? user.full_name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase()
    : (user?.email ? user.email.charAt(0).toUpperCase() : 'US')

  return (
    <div
      className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-slate-900/60 dark:bg-black/75 backdrop-blur-xs animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="w-full max-w-md bg-white dark:bg-[#141417] rounded-2xl border border-slate-200/80 dark:border-zinc-800 shadow-2xl overflow-hidden animate-scale-in"
        style={{ boxShadow: '0 20px 45px -10px rgba(0, 0, 0, 0.25)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-zinc-800/80 bg-slate-50/60 dark:bg-zinc-800/40">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-500/20 flex items-center justify-center shrink-0">
              <LogOut size={16} />
            </div>
            <h3 className="font-display font-bold text-slate-900 dark:text-zinc-100 text-base tracking-tight">
              ¿Cerrar sesión?
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
            aria-label="Cerrar modal"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 sm:p-6 space-y-4">
          <p className="text-xs sm:text-sm text-slate-600 dark:text-zinc-300 leading-relaxed">
            ¿Estás seguro de que deseas salir de tu cuenta? Se cerrará tu sesión activa en este dispositivo y tendrás que volver a ingresar tus credenciales para acceder al sistema.
          </p>

          {/* User Account Info Card */}
          {user && (
            <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-zinc-800/60 border border-slate-200/80 dark:border-zinc-700/80">
              <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white font-bold font-display flex items-center justify-center shrink-0 overflow-hidden text-sm">
                {user.avatar_url ? (
                  <img src={user.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  initials
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs sm:text-sm font-bold text-slate-900 dark:text-zinc-100 truncate">
                  {user.full_name || user.email?.split('@')[0] || 'Usuario'}
                </p>
                <p className="text-[11px] text-slate-400 dark:text-zinc-400 truncate">
                  {user.email}
                </p>
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 text-slate-600 dark:text-zinc-300 shrink-0">
                {user.role === 'superadmin' || user.is_platform_admin ? 'Super Admin' : user.role === 'admin' ? 'Administrador' : 'Empleado'}
              </span>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="px-5 py-3.5 bg-slate-50/80 dark:bg-zinc-800/50 border-t border-slate-100 dark:border-zinc-800 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-slate-700 dark:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-700 text-xs sm:text-sm font-semibold transition-colors cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs sm:text-sm font-bold flex items-center gap-1.5 shadow-sm active:scale-95 transition-all cursor-pointer"
          >
            <LogOut size={15} />
            <span>Sí, cerrar sesión</span>
          </button>
        </div>
      </div>
    </div>
  )
}

