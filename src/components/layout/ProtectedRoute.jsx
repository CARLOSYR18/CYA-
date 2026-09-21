import { useEffect, useState } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { companySettingsService } from '../../services/companySettingsService'

export default function ProtectedRoute({ children, adminOnly = false }) {
  const { user, loading, isAdmin, needsOnboarding, isPlatformAdmin } = useAuth()
  const location = useLocation()
  const [companyActive, setCompanyActive] = useState(true)

  useEffect(() => {
    if (user?.company_id) {
      companySettingsService.get().then((c) => setCompanyActive(c?.active !== false)).catch(() => {})
    }
  }, [user])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-base-bg">
        <p className="text-ink-muted text-sm">Cargando…</p>
      </div>
    )
  }

  if (!user) return <Navigate to="/login" replace />
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
