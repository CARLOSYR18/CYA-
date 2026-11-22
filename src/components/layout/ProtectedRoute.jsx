import { useEffect, useState } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { companySettingsService } from '../../services/companySettingsService'
import { isSupabaseConfigured } from '../../lib/supabaseClient'

export default function ProtectedRoute({ children, adminOnly = false, platformAdminOnly = false }) {
  const { user, loading, profileLoaded, isAdmin, needsOnboarding, isPlatformAdmin, logout } = useAuth()
  const location = useLocation()
  const [companyActive, setCompanyActive] = useState(true)
  const [forcedReady, setForcedReady] = useState(false)

  // Temporizador de seguridad: dar tiempo a conexiones móviles celulares para validar sesión
  useEffect(() => {
    const timer = setTimeout(() => {
      setForcedReady(true)
    }, 6000)
    return () => clearTimeout(timer)
  }, [])

  useEffect(() => {
    if (user?.company_id) {
      companySettingsService.get().then((c) => setCompanyActive(c?.active !== false)).catch(() => {})
    } else {
      setCompanyActive(true)
    }
  }, [user?.company_id])

  if (!forcedReady && (loading || (isSupabaseConfigured && user && !profileLoaded))) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-white/90 dark:bg-[#0c0d12]/92 backdrop-blur-md p-4 animate-fade-in select-none">
        <div className="relative mb-4 flex items-center justify-center">
          <div className="w-14 h-14 rounded-full border-4 border-slate-200/90 dark:border-zinc-800" />
          <div className="absolute w-14 h-14 rounded-full border-4 border-indigo-600 dark:border-indigo-400 border-t-transparent animate-spin" />
        </div>
        <p className="text-sm font-bold text-slate-800 dark:text-zinc-200 font-display">
          Cargando espacio de trabajo…
        </p>
        <p className="text-xs text-slate-400 dark:text-zinc-500 mt-1">
          Verificando sesión segura
        </p>
      </div>
    )
  }

  if (!user) return <Navigate to="/login" replace />

  // Acceso restringido exclusivo a Super Administrador
  if (platformAdminOnly && !isPlatformAdmin) return <Navigate to="/" replace />

  // El Super Administrador de la plataforma solo accede a su panel general y a su perfil, no a los módulos de empresas
  if (isPlatformAdmin && location.pathname !== '/admin-plataforma' && location.pathname !== '/perfil') {
    return <Navigate to="/admin-plataforma" replace />
  }

  // Protección estricta contra redirecciones destructivas:
  // Jamás expulsar a un usuario hacia /onboarding si ya está en el Dashboard o si tiene datos en caché
  if (needsOnboarding && location.pathname !== '/onboarding') {
    if (location.pathname === '/' || localStorage.getItem('cya_cached_company_id') || localStorage.getItem('cya_company_cache')) {
      return children
    }
    if (sessionStorage.getItem('cya_is_new_signup') === 'true') {
      return <Navigate to="/onboarding" replace />
    }
    return children
  }

  if (!needsOnboarding && location.pathname === '/onboarding') {
    return <Navigate to="/" replace />
  }

  if (adminOnly && !isAdmin) return <Navigate to="/" replace />

  if (!companyActive && !isPlatformAdmin && location.pathname !== '/onboarding') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-base-bg text-center px-4">
        <div className="max-w-sm w-full bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-6 shadow-xl">
          <p className="text-slate-900 dark:text-zinc-100 font-display text-xl font-bold mb-2">Cuenta desactivada</p>
          <p className="text-slate-500 dark:text-zinc-400 text-sm mb-5">Contacta al soporte para reactivar tu cuenta.</p>
          <button
            type="button"
            onClick={() => logout && logout()}
            className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-xl transition cursor-pointer"
          >
            Cerrar sesión
          </button>
        </div>
      </div>
    )
  }

  return children
}
