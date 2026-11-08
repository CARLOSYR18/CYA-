import { useEffect } from 'react'
import { AlertTriangle, X, ArrowLeft, Trash2 } from 'lucide-react'

export default function DiscardChangesModal({
  open,
  onClose,
  onConfirm,
  title = '¿Descartar cambios no guardados?',
  description = 'Tienes información escrita en este formulario. Si sales ahora o recargas la página, todos los datos ingresados se perderán permanentemente.',
  confirmText = 'Descartar y Salir',
  cancelText = 'Continuar Editando',
}) {
  useEffect(() => {
    if (!open) return
    const handler = (e) => {
      if (e.key === 'Escape') onClose()
    }
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
      className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-slate-900/60 dark:bg-black/75 backdrop-blur-xs animate-fade-in select-none"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="w-full max-w-md bg-white dark:bg-[#141417] rounded-2xl border border-slate-200/80 dark:border-zinc-800 shadow-2xl overflow-hidden animate-scale-in"
        style={{ boxShadow: '0 24px 50px -12px rgba(0, 0, 0, 0.28)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-zinc-800/80 bg-amber-50/50 dark:bg-amber-950/20">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-500/30 flex items-center justify-center shrink-0 shadow-2xs">
              <AlertTriangle size={18} className="animate-pulse" />
            </div>
            <div>
              <h3 className="font-display font-bold text-slate-900 dark:text-zinc-100 text-base tracking-tight leading-tight">
                {title}
              </h3>
              <p className="text-[11px] font-semibold text-amber-700 dark:text-amber-400">
                Cambios pendientes sin guardar
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
            aria-label="Cerrar modal"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 sm:p-6 space-y-4">
          <p className="text-xs sm:text-sm text-slate-600 dark:text-zinc-300 leading-relaxed">
            {description}
          </p>

          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-zinc-900/60 border border-slate-200/80 dark:border-zinc-800 flex items-start gap-3">
            <div className="w-2 h-2 rounded-full bg-amber-500 mt-1.5 shrink-0" />
            <div className="text-xs text-slate-600 dark:text-zinc-400">
              <span className="font-bold text-slate-800 dark:text-zinc-200 block mb-0.5">
                Recomendación de seguridad:
              </span>
              Si aún necesitas registrar esta operación, haz clic en <strong className="text-blue-600 dark:text-blue-400">"{cancelText}"</strong> y completa el guardado antes de navegar.
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="px-5 py-3.5 bg-slate-50/80 dark:bg-zinc-800/50 border-t border-slate-100 dark:border-zinc-800 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-slate-700 dark:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-700 text-xs sm:text-sm font-semibold transition-colors cursor-pointer shadow-2xs"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs sm:text-sm font-bold flex items-center gap-1.5 shadow-sm active:scale-95 transition-all cursor-pointer"
          >
            <Trash2 size={15} />
            <span>{confirmText}</span>
          </button>
        </div>
      </div>
    </div>
  )
}

