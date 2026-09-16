import { X } from 'lucide-react'
import { useEffect } from 'react'

export default function Modal({ open, onClose, title, children, width = 'max-w-lg' }) {
  useEffect(() => {
    if (!open) return
    const handler = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', handler)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in"
      style={{ background: 'rgba(10,15,30,0.45)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className={`
        w-full ${width} bg-white
        rounded-t-3xl sm:rounded-2xl
        shadow-card-hover border border-base-border
        max-h-[92dvh] sm:max-h-[88dvh] flex flex-col
        animate-scale-in origin-bottom sm:origin-center
      `}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-base-border shrink-0">
          <h2 className="font-display font-bold text-ink-primary text-base tracking-tight">
            {title}
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-ink-muted hover:text-ink-primary hover:bg-base-raised transition-all ml-4 shrink-0"
            aria-label="Cerrar"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 px-5 sm:px-6 py-5">
          {children}
        </div>
      </div>
    </div>
  )
}
