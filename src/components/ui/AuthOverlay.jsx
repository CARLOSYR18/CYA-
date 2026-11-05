import { LogOut, Sparkles, CheckCircle2 } from 'lucide-react'

export default function AuthOverlay({ transition }) {
  if (!transition) return null

  const isLogout = transition.type === 'logout'

  return (
    <div
      className="fixed inset-0 z-[999999] flex flex-col items-center justify-center bg-white/90 dark:bg-[#0c0d12]/92 backdrop-blur-md select-none transition-all duration-300 animate-fade-in p-4"
      role="status"
      aria-live="polite"
    >
      <div className="flex flex-col items-center text-center p-6 sm:p-8 max-w-sm mx-auto">
        
        {/* Animated Circle Spinner */}
        <div className="relative mb-5 flex items-center justify-center">
          {/* Subtle outer pulsing ring */}
          <div
            className={`absolute w-20 h-20 rounded-full animate-ping opacity-25 ${
              isLogout ? 'bg-red-500' : 'bg-indigo-500'
            }`}
          />
          {/* Outer track */}
          <div className="w-16 h-16 rounded-full border-4 border-slate-200/90 dark:border-zinc-800" />
          {/* Active spinning ring */}
          <div
            className={`absolute w-16 h-16 rounded-full border-4 border-t-transparent animate-spin ${
              isLogout
                ? 'border-red-600 dark:border-red-400'
                : 'border-indigo-600 dark:border-indigo-400'
            }`}
          />
          {/* Center icon */}
          <div className="absolute inset-0 flex items-center justify-center">
            {isLogout ? (
              <LogOut size={22} className="text-red-500 dark:text-red-400 animate-pulse" />
            ) : (
              <Sparkles size={22} className="text-indigo-600 dark:text-indigo-400 animate-pulse" />
            )}
          </div>
        </div>

        {/* Title */}
        <h3 className="text-lg sm:text-xl font-black text-slate-900 dark:text-zinc-100 font-display tracking-tight">
          {transition.title || (isLogout ? 'Cerrando sesión…' : 'Iniciando sesión…')}
        </h3>

        {/* Subtitle */}
        <p className="text-xs sm:text-sm text-slate-500 dark:text-zinc-400 mt-1.5 leading-relaxed font-medium max-w-xs">
          {transition.subtitle || (isLogout ? 'Cerrando tu sesión de forma segura…' : 'Cargando tu espacio de trabajo…')}
        </p>

        {/* Loading Bouncing Dots */}
        <div className="flex items-center gap-1.5 mt-5">
          <span
            className={`w-2 h-2 rounded-full animate-bounce ${
              isLogout ? 'bg-red-500' : 'bg-indigo-600 dark:bg-indigo-400'
            }`}
            style={{ animationDelay: '0ms' }}
          />
          <span
            className={`w-2 h-2 rounded-full animate-bounce ${
              isLogout ? 'bg-red-500' : 'bg-indigo-600 dark:bg-indigo-400'
            }`}
            style={{ animationDelay: '150ms' }}
          />
          <span
            className={`w-2 h-2 rounded-full animate-bounce ${
              isLogout ? 'bg-red-500' : 'bg-indigo-600 dark:bg-indigo-400'
            }`}
            style={{ animationDelay: '300ms' }}
          />
        </div>

      </div>
    </div>
  )
}

