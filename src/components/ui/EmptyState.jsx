export default function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-16 px-6">
      {Icon && (
        <div className="w-12 h-12 rounded-full bg-base-raised border border-base-border flex items-center justify-center mb-4">
          <Icon size={20} className="text-ink-muted" />
        </div>
      )}
      <p className="text-ink-primary font-medium mb-1">{title}</p>
      {description && <p className="text-sm text-ink-muted max-w-sm mb-4">{description}</p>}
      {action}
    </div>
  )
}
