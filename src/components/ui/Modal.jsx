import { X } from 'lucide-react'

export default function Modal({ open, onClose, title, children, width = 'max-w-lg' }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center overflow-y-auto py-0 sm:py-8 px-0 sm:px-4">
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      />
      {/* Panel */}
      <div className={`relative w-full ${width} bg-white border border-base-border rounded-t-2xl sm:rounded-2xl shadow-xl animate-slide-up max-h-[92vh] sm:max-h-[88vh] flex flex-col my-auto sm:my-0`}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-base-border shrink-0">
          <h2 className="font-display font-semibold text-ink-primary text-[15px] tracking-tight">{title}</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-ink-muted hover:text-ink-primary hover:bg-base-raised transition-all duration-150"
          >
            <X size={17} />
          </button>
        </div>
        <div className="p-5 overflow-y-auto flex-1">{children}</div>
      </div>
    </div>
  )
}
