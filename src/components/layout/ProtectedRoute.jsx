import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

export default function ProtectedRoute({ children, adminOnly = false }) {
  const { user, loading, isAdmin, needsOnboarding } = useAuth()
  const location = useLocation()

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

  return children
}
