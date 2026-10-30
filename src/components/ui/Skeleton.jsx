export function Skeleton({ className = '', ...props }) {
  return (
    <div
      className={`animate-pulse bg-slate-200/80 dark:bg-white/10 rounded-xl ${className}`}
      {...props}
    />
  )
}

/**
 * Skeleton exacto para las 4 tarjetas KPI del Dashboard
 */
export function DashboardKpiSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
      {/* Card 1 */}
      <div className="bg-white dark:bg-[#131627] rounded-3xl border border-slate-200/90 dark:border-white/10 p-4 sm:p-5 flex flex-col justify-between shadow-xs">
        <div>
          <div className="flex items-center justify-between gap-2 mb-2">
            <Skeleton className="h-3.5 w-28 rounded-md" />
            <Skeleton className="w-8 h-8 rounded-xl" />
          </div>
          <Skeleton className="h-8 w-36 rounded-lg mb-2" />
          <Skeleton className="h-3 w-24 rounded-md mb-3" />
        </div>
        <Skeleton className="h-14 w-full rounded-xl" />
      </div>

      {/* Card 2 */}
      <div className="bg-white dark:bg-[#131627] rounded-3xl border border-slate-200/90 dark:border-white/10 p-4 sm:p-5 flex flex-col justify-between shadow-xs">
        <div>
          <div className="flex items-center justify-between gap-2 mb-2">
            <Skeleton className="h-3.5 w-32 rounded-md" />
            <Skeleton className="w-8 h-8 rounded-xl" />
          </div>
          <Skeleton className="h-8 w-40 rounded-lg mb-2" />
          <Skeleton className="h-3 w-28 rounded-md mb-3" />
        </div>
        <div className="h-14 flex items-end justify-between gap-1.5 pt-2">
          {[40, 65, 45, 80, 55, 90, 70].map((h, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-1">
              <Skeleton className="w-full rounded-md" style={{ height: `${h}%` }} />
              <Skeleton className="w-4 h-2 rounded-xs" />
            </div>
          ))}
        </div>
      </div>

      {/* Card 3 */}
      <div className="bg-white dark:bg-[#131627] rounded-3xl border border-slate-200/90 dark:border-white/10 p-4 sm:p-5 flex flex-col justify-between shadow-xs">
        <div>
          <div className="flex items-center justify-between gap-2 mb-2">
            <Skeleton className="h-3.5 w-32 rounded-md" />
            <Skeleton className="w-8 h-8 rounded-xl" />
          </div>
          <Skeleton className="h-8 w-24 rounded-lg mb-2" />
          <Skeleton className="h-3 w-32 rounded-md mb-3" />
        </div>
        <Skeleton className="h-14 w-full rounded-xl" />
      </div>

      {/* Card 4 */}
      <div className="bg-white dark:bg-[#131627] rounded-3xl border border-slate-200/90 dark:border-white/10 p-4 sm:p-5 flex flex-col justify-between shadow-xs">
        <div>
          <div className="flex items-center justify-between gap-2 mb-2">
            <Skeleton className="h-3.5 w-36 rounded-md" />
            <Skeleton className="w-8 h-8 rounded-xl" />
          </div>
          <Skeleton className="h-8 w-36 rounded-lg mb-2" />
          <Skeleton className="h-3 w-28 rounded-md mb-3" />
        </div>
        <div className="mt-3 pt-2 border-t border-slate-100 dark:border-white/5 flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <Skeleton className="w-14 h-6 rounded-md" />
            <Skeleton className="w-14 h-6 rounded-md" />
            <Skeleton className="w-10 h-6 rounded-md" />
          </div>
          <Skeleton className="w-24 h-7 rounded-full" />
        </div>
      </div>
    </div>
  )
}

/**
 * Skeleton exacto para el contenedor maestro "Ventas Pendientes de Cobro"
 */
export function DashboardSalesMasterSkeleton() {
  return (
    <div className="bg-white dark:bg-[#111424] rounded-3xl p-4 sm:p-6 lg:p-7 border border-[#ECEEF3] dark:border-white/10 shadow-xl transition-all">
      {/* Top Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-100 dark:border-white/10">
        <div className="space-y-1.5">
          <Skeleton className="h-5 w-56 rounded-md" />
          <Skeleton className="h-3.5 w-72 rounded-md" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-20 rounded-full" />
          <Skeleton className="h-8 w-24 rounded-full" />
          <Skeleton className="h-8 w-24 rounded-full" />
        </div>
      </div>

      {/* 2-Column Content Split */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6 mt-6 items-start">
        {/* Left: 4 Invoice Item Skeletons */}
        <div className="lg:col-span-5 space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="p-3.5 sm:p-4 rounded-2xl bg-slate-50/80 dark:bg-white/5 border border-slate-200/70 dark:border-white/10 flex items-center justify-between gap-3"
            >
              <div className="flex items-center gap-3 min-w-0">
                <Skeleton className="w-10 h-10 rounded-full shrink-0" />
                <div className="space-y-1.5 min-w-0">
                  <Skeleton className="h-4 w-28 rounded-md" />
                  <Skeleton className="h-3 w-20 rounded-md" />
                </div>
              </div>
              <div className="text-right space-y-1.5 shrink-0">
                <Skeleton className="h-4 w-20 rounded-md ml-auto" />
                <Skeleton className="h-4 w-16 rounded-full ml-auto" />
              </div>
            </div>
          ))}
        </div>

        {/* Right: Detail Card Skeleton */}
        <div className="lg:col-span-7 bg-slate-100/70 dark:bg-white/5 rounded-3xl p-5 sm:p-6 border border-slate-200/80 dark:border-white/10 space-y-5">
          {/* Voucher Header & Issuer & Client */}
          <div className="grid grid-cols-3 gap-3 pb-4 border-b border-slate-200/60 dark:border-white/10">
            <div className="space-y-1.5">
              <Skeleton className="h-3 w-20 rounded-md" />
              <Skeleton className="h-5 w-28 rounded-md" />
            </div>
            <div className="space-y-1.5">
              <Skeleton className="h-3 w-20 rounded-md" />
              <Skeleton className="h-5 w-24 rounded-md" />
            </div>
            <div className="space-y-1.5">
              <Skeleton className="h-3 w-16 rounded-md" />
              <Skeleton className="h-5 w-32 rounded-md" />
            </div>
          </div>

          {/* Product Cards Row */}
          <div>
            <Skeleton className="h-3.5 w-36 rounded-md mb-3" />
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[1, 2, 3].map((j) => (
                <div
                  key={j}
                  className="p-3.5 rounded-2xl bg-white dark:bg-white/10 border border-slate-200 dark:border-white/10 space-y-2"
                >
                  <Skeleton className="h-4 w-16 rounded-md" />
                  <Skeleton className="h-3.5 w-full rounded-md" />
                  <Skeleton className="h-3 w-14 rounded-md" />
                </div>
              ))}
            </div>
          </div>

          {/* Totals & Buttons */}
          <div className="pt-4 border-t border-slate-200/60 dark:border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-6">
              <div className="space-y-1">
                <Skeleton className="h-3 w-14 rounded-md" />
                <Skeleton className="h-4 w-20 rounded-md" />
              </div>
              <div className="space-y-1">
                <Skeleton className="h-3 w-14 rounded-md" />
                <Skeleton className="h-5 w-24 rounded-md" />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Skeleton className="h-10 w-24 rounded-full" />
              <Skeleton className="h-10 w-32 rounded-full" />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * Skeleton para tablas de módulos (Ventas, Productos, Movimientos, etc.)
 */
export function TableSkeleton({ rows = 6, cols = 5 }) {
  return (
    <div className="w-full space-y-3 p-4 animate-fade-in">
      {/* Table Header Placeholder */}
      <div className="flex items-center justify-between gap-4 pb-3 border-b border-slate-200/80 dark:border-white/10">
        <Skeleton className="h-4 w-32 rounded-md" />
        <Skeleton className="h-4 w-28 rounded-md" />
        <Skeleton className="h-4 w-24 rounded-md" />
        <Skeleton className="h-4 w-20 rounded-md" />
        <Skeleton className="h-4 w-24 rounded-md" />
      </div>

      {/* Rows */}
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="flex items-center justify-between gap-4 py-3 border-b border-slate-100 dark:border-white/5 last:border-0"
        >
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <Skeleton className="w-9 h-9 rounded-xl shrink-0" />
            <div className="space-y-1.5 flex-1 min-w-0">
              <Skeleton className="h-3.5 w-3/4 rounded-md" />
              <Skeleton className="h-2.5 w-1/2 rounded-md" />
            </div>
          </div>
          <Skeleton className="h-4 w-20 rounded-md" />
          <Skeleton className="h-4 w-24 rounded-md font-mono" />
          <Skeleton className="h-6 w-20 rounded-full" />
          <div className="flex items-center gap-2 shrink-0">
            <Skeleton className="w-8 h-8 rounded-lg" />
            <Skeleton className="w-8 h-8 rounded-lg" />
          </div>
        </div>
      ))}
    </div>
  )
}

