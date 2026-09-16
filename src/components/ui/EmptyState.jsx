export default function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
      {Icon && (
        <div className="w-14 h-14 rounded-2xl bg-base-raised border border-base-border flex items-center justify-center mb-4 shadow-inner-sm">
          <Icon size={24} strokeWidth={1.5} className="text-ink-muted" />
        </div>
      )}
      <p className="font-display font-semibold text-ink-primary text-base">{title}</p>
      {description && (
        <p className="text-sm text-ink-muted mt-1.5 max-w-xs leading-relaxed">{description}</p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}
