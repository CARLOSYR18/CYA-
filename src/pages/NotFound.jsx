import { Link } from 'react-router-dom'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-base-bg flex flex-col items-center justify-center text-center px-6">
      <p className="text-8xl sm:text-[120px] font-display font-black text-base-border select-none leading-none">404</p>
      <h1 className="font-display font-bold text-2xl text-ink-primary mt-4 mb-2">Página no encontrada</h1>
      <p className="text-sm text-ink-muted max-w-xs leading-relaxed mb-8">La ruta que buscas no existe o fue eliminada.</p>
      <Link to="/" className="btn-primary px-6 py-3">← Volver al Panel</Link>
    </div>
  )
}
