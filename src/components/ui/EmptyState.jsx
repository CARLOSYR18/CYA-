export default function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-20 px-6">
      {Icon && (
        <div className="w-14 h-14 rounded-2xl bg-base-raised border border-base-border flex items-center justify-center mb-4 shadow-xs">
          <Icon size={22} className="text-ink-muted" strokeWidth={1.5} />
        </div>
      )}
      <p className="text-ink-primary font-semibold text-[15px] mb-1.5">{title}</p>
      {description && (
        <p className="text-sm text-ink-muted max-w-sm mb-5 leading-relaxed">{description}</p>
      )}
      {action}
    </div>
  )
}
