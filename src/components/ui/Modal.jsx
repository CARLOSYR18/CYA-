import { X } from 'lucide-react'

export default function Modal({ open, onClose, title, children, width = 'max-w-lg' }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto py-10 px-4">
      <div className="fixed inset-0 bg-black/60" onClick={onClose} />
      <div className={`relative w-full ${width} card shadow-2xl`}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-base-border">
          <h2 className="font-display font-semibold text-ink-primary">{title}</h2>
          <button onClick={onClose} className="text-ink-muted hover:text-ink-primary transition-colors">
            <X size={18} />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  )
}
