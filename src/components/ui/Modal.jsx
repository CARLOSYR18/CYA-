import { X } from 'lucide-react'

export default function Modal({ open, onClose, title, children, width = 'max-w-lg' }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center sm:items-start justify-center overflow-y-auto py-3 sm:py-10 px-2 sm:px-4">
      <div className="fixed inset-0 bg-black/60 backdrop-blur-xs" onClick={onClose} />
      <div className={`relative w-full ${width} card shadow-2xl max-h-[92vh] flex flex-col my-auto sm:my-0`}>
        <div className="flex items-center justify-between px-4 sm:px-5 py-3.5 sm:py-4 border-b border-base-border shrink-0">
          <h2 className="font-display font-semibold text-ink-primary text-base sm:text-lg">{title}</h2>
          <button onClick={onClose} className="p-1 rounded-lg text-ink-muted hover:text-ink-primary hover:bg-slate-100 transition-colors">
            <X size={18} />
          </button>
        </div>
        <div className="p-4 sm:p-5 overflow-y-auto flex-1">{children}</div>
      </div>
    </div>
  )
}
