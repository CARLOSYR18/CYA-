import { Link } from 'react-router-dom'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-base-bg flex flex-col items-center justify-center text-center px-4">
      <p className="font-display text-5xl font-semibold text-ink-primary mb-2">404</p>
      <p className="text-ink-muted mb-6">Esta página no existe.</p>
      <Link to="/" className="btn-primary">Volver al panel</Link>
    </div>
  )
}
