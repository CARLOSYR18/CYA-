import { useEffect, useState } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { companySettingsService } from '../../services/companySettingsService'

export default function ProtectedRoute({ children, adminOnly = false }) {
  const { user, loading, isAdmin, needsOnboarding, isPlatformAdmin } = useAuth()
  const location = useLocation()
  const [companyActive, setCompanyActive] = useState(true)
  const [safetyTimeoutReached, setSafetyTimeoutReached] = useState(false)

  // En caso de latencia de red móvil, nunca mantener la pantalla de carga más de 2.2s
  useEffect(() => {
    let t
    if (loading) {
      t = setTimeout(() => {
        setSafetyTimeoutReached(true)
      }, 2200)
    } else {
      setSafetyTimeoutReached(false)
    }
    return () => clearTimeout(t)
  }, [loading])

  useEffect(() => {
    if (user?.company_id) {
      companySettingsService.get().then((c) => setCompanyActive(c?.active !== false)).catch(() => {})
    }
  }, [user])

  if (loading && !safetyTimeoutReached) {
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
  if (isPlatformAdmin && location.pathname === '/') {
    return <Navigate to="/admin-plataforma" replace />
  }
  if (needsOnboarding && location.pathname !== '/onboarding') {
    return <Navigate to="/onboarding" replace />
  }
  if (adminOnly && !isAdmin) return <Navigate to="/" replace />

  if (!companyActive && !isPlatformAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-base-bg text-center px-4">
        <div>
          <p className="text-ink-primary font-display text-xl mb-2">Cuenta desactivada</p>
          <p className="text-ink-muted text-sm">Contacta al soporte para reactivar tu cuenta.</p>
        </div>
      </div>
    )
  }

  return children
}
