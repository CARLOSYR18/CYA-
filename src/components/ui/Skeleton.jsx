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
    <div className="bg-[#111424] rounded-3xl p-4 sm:p-6 lg:p-7 border border-white/20 shadow-xl transition-all animate-fade-in">
      {/* Top Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-white/10">
        <div className="space-y-2">
          <Skeleton className="h-5 w-56 rounded-md bg-white/15" />
          <Skeleton className="h-3.5 w-72 rounded-md bg-white/10" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-20 rounded-full bg-white/15" />
          <Skeleton className="h-8 w-24 rounded-full bg-white/15" />
          <Skeleton className="h-8 w-24 rounded-full bg-white/15" />
        </div>
      </div>

      {/* 2-Column Content Split */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6 mt-6 items-start">
        {/* Left: 4 Invoice Item Skeletons */}
        <div className="lg:col-span-5 space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="p-3.5 sm:p-4 rounded-2xl bg-white/[0.04] border border-white/15 flex items-center justify-between gap-3"
            >
              <div className="flex items-center gap-3 min-w-0">
                <Skeleton className="w-10 h-10 rounded-full shrink-0 bg-white/20" />
                <div className="space-y-1.5 min-w-0">
                  <Skeleton className="h-4 w-28 rounded-md bg-white/20" />
                  <Skeleton className="h-3 w-20 rounded-md bg-white/10" />
                </div>
              </div>
              <div className="text-right space-y-1.5 shrink-0">
                <Skeleton className="h-4 w-20 rounded-md ml-auto bg-white/20" />
                <Skeleton className="h-4 w-16 rounded-full ml-auto bg-white/15" />
              </div>
            </div>
          ))}
        </div>

        {/* Right: Detail Card Skeleton */}
        <div className="lg:col-span-7 bg-gradient-to-br from-[#2A2561] via-[#352F7A] to-[#201C4E] rounded-3xl p-5 sm:p-6 border border-indigo-300/30 space-y-5">
          {/* Voucher Header & Issuer & Client */}
          <div className="grid grid-cols-3 gap-3 pb-4 border-b border-white/15">
            <div className="space-y-1.5">
              <Skeleton className="h-3 w-20 rounded-md bg-white/20" />
              <Skeleton className="h-5 w-28 rounded-md bg-white/25" />
            </div>
            <div className="space-y-1.5">
              <Skeleton className="h-3 w-20 rounded-md bg-white/20" />
              <Skeleton className="h-5 w-24 rounded-md bg-white/25" />
            </div>
            <div className="space-y-1.5">
              <Skeleton className="h-3 w-16 rounded-md bg-white/20" />
              <Skeleton className="h-5 w-32 rounded-md bg-white/25" />
            </div>
          </div>

          {/* Product Cards Row */}
          <div>
            <Skeleton className="h-3.5 w-36 rounded-md mb-3 bg-white/20" />
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[1, 2, 3].map((j) => (
                <div
                  key={j}
                  className="p-3.5 rounded-2xl bg-white/10 border border-white/20 space-y-2"
                >
                  <Skeleton className="h-4 w-16 rounded-md bg-white/25" />
                  <Skeleton className="h-3.5 w-full rounded-md bg-white/20" />
                  <Skeleton className="h-3 w-14 rounded-md bg-white/15" />
                </div>
              ))}
            </div>
          </div>

          {/* Totals & Buttons */}
          <div className="pt-4 border-t border-white/15 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-6">
              <div className="space-y-1">
                <Skeleton className="h-3 w-14 rounded-md bg-white/20" />
                <Skeleton className="h-4 w-20 rounded-md bg-white/25" />
              </div>
              <div className="space-y-1">
                <Skeleton className="h-3 w-14 rounded-md bg-white/20" />
                <Skeleton className="h-5 w-24 rounded-md bg-white/25" />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Skeleton className="h-10 w-24 rounded-full bg-white/20" />
              <Skeleton className="h-10 w-32 rounded-full bg-white/20" />
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

/**
 * Skeleton exacto para el contenedor "Análisis Comercial & Movimientos de Inventario"
 */
export function DashboardAnalyticsSkeleton() {
  return (
    <div className="bg-gradient-to-br from-[#F8FAFF] via-[#F4F7FD] to-[#EDF2FE] dark:bg-none dark:bg-[#111424] rounded-3xl border border-indigo-100/90 dark:border-white/10 p-5 sm:p-7 shadow-sm relative overflow-hidden transition-all animate-fade-in">
      {/* Top Header of the Master Container */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-5 mb-6 border-b border-indigo-100/80 dark:border-white/10">
        <div>
          <div className="flex items-center gap-2.5">
            <Skeleton className="w-8 h-8 rounded-xl shrink-0" />
            <Skeleton className="h-5 w-64 rounded-md" />
          </div>
          <Skeleton className="h-3 w-80 rounded-md mt-2" />
        </div>
        <Skeleton className="h-6 w-24 rounded-full self-start sm:self-auto" />
      </div>

      {/* Grid: 2 Charts Side-by-Side */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Card 1: Movimientos de Almacén */}
        <div className="lg:col-span-7 bg-white/95 dark:bg-[#161A2E] rounded-2xl border border-blue-100/90 dark:border-white/10 p-4 sm:p-5 flex flex-col justify-between shadow-xs">
          <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
            <div className="flex items-center gap-2">
              <Skeleton className="w-7 h-7 rounded-lg shrink-0" />
              <Skeleton className="h-4 w-44 rounded-md" />
            </div>
            <Skeleton className="h-7 w-36 rounded-xl" />
          </div>

          {/* 3 Metric Summary Boxes */}
          <div className="grid grid-cols-3 gap-2 sm:gap-3 mb-4">
            <div className="bg-blue-50/60 dark:bg-blue-500/10 rounded-xl border border-blue-200/50 dark:border-blue-500/25 p-2.5 sm:p-3 text-center">
              <Skeleton className="h-2.5 w-14 rounded-md mx-auto mb-1.5" />
              <Skeleton className="h-6 w-10 rounded-md mx-auto" />
            </div>
            <div className="bg-emerald-50/60 dark:bg-emerald-500/10 rounded-xl border border-emerald-200/50 dark:border-emerald-500/25 p-2.5 sm:p-3 text-center">
              <Skeleton className="h-2.5 w-14 rounded-md mx-auto mb-1.5" />
              <Skeleton className="h-6 w-10 rounded-md mx-auto" />
            </div>
            <div className="bg-indigo-50/60 dark:bg-indigo-500/10 rounded-xl border border-indigo-200/50 dark:border-indigo-500/25 p-2.5 sm:p-3 text-center">
              <Skeleton className="h-2.5 w-16 rounded-md mx-auto mb-1.5" />
              <Skeleton className="h-6 w-10 rounded-md mx-auto" />
            </div>
          </div>

          {/* Spline Chart Canvas Placeholder */}
          <div className="bg-gradient-to-b from-white via-blue-50/20 to-slate-50/70 dark:bg-none dark:bg-[#0E101D] rounded-xl border border-blue-100/90 dark:border-white/10 p-4 h-36 sm:h-44 flex flex-col justify-between">
            <div className="flex justify-between items-center opacity-40">
              <Skeleton className="h-2 w-8 rounded-sm" />
              <Skeleton className="h-2 w-full max-w-[380px] rounded-sm" />
            </div>
            <Skeleton className="h-20 w-full rounded-xl" />
            <div className="flex justify-between items-center px-4">
              {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map((d, i) => (
                <Skeleton key={i} className="h-2.5 w-6 rounded-sm" />
              ))}
            </div>
          </div>
        </div>

        {/* Card 2: Productos por Categoría */}
        <div className="lg:col-span-5 bg-white/95 dark:bg-[#161A2E] rounded-2xl border border-purple-100/90 dark:border-white/10 p-4 sm:p-5 flex flex-col justify-between shadow-xs">
          <div className="flex items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-2">
              <Skeleton className="w-7 h-7 rounded-lg shrink-0" />
              <Skeleton className="h-4 w-40 rounded-md" />
            </div>
            <Skeleton className="h-5 w-20 rounded-full" />
          </div>

          {/* Donut Chart + Bars Placeholder */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center bg-gradient-to-br from-white via-purple-50/20 to-indigo-50/30 dark:bg-none dark:bg-[#0E101D] rounded-xl border border-purple-100/90 dark:border-white/10 p-3.5">
            <div className="sm:col-span-5 flex items-center justify-center">
              <Skeleton className="w-28 h-28 rounded-full" />
            </div>
            <div className="sm:col-span-7 space-y-3">
              {[80, 50, 35, 20].map((w, idx) => (
                <div key={idx} className="space-y-1.5">
                  <div className="flex justify-between">
                    <Skeleton className="h-3 w-24 rounded-md" />
                    <Skeleton className="h-3 w-8 rounded-md" />
                  </div>
                  <Skeleton className="h-2 rounded-full" style={{ width: `${w}%` }} />
                </div>
              ))}
            </div>
          </div>

          <div className="pt-2 text-right">
            <Skeleton className="h-2.5 w-48 rounded-md ml-auto" />
          </div>
        </div>
      </div>
    </div>
  )
}

