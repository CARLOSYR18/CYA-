import { useEffect, useMemo, useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell } from 'recharts'
import { Boxes, TrendingUp, AlertTriangle, DollarSign } from 'lucide-react'
import AppLayout from '../components/layout/AppLayout'
import { productsService } from '../services/productsService'
import { salesService } from '../services/salesService'
import { categoriesService } from '../services/categoriesService'

const money = (n) => `S/ ${n.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

const PIE_COLORS = ['#4F7CFF', '#3DBD82', '#E8A33D', '#E5484D', '#8B5CF6', '#22D3EE']

export default function Dashboard() {
  const [products, setProducts] = useState([])
  const [sales, setSales] = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([productsService.list(), salesService.list(), categoriesService.list()]).then(
      ([p, s, c]) => {
        setProducts(p)
        setSales(s)
        setCategories(c)
        setLoading(false)
      }
    )
  }, [])

  const stats = useMemo(() => {
    const stockValue = products.reduce((sum, p) => sum + p.stock * p.cost_price, 0)
    const lowStock = products.filter((p) => p.stock <= p.min_stock)
    const thisMonth = new Date()
    const monthSales = sales.filter((s) => {
      const d = new Date(s.created_at)
      return d.getMonth() === thisMonth.getMonth() && d.getFullYear() === thisMonth.getFullYear()
    })
    const monthRevenue = monthSales.reduce((sum, s) => sum + salesService.saleTotal(s), 0)
    return { stockValue, lowStock, monthRevenue, totalProducts: products.length }
  }, [products, sales])

  const topProducts = useMemo(() => {
    const qtyByProduct = {}
    sales.forEach((s) =>
      s.items.forEach((it) => {
        qtyByProduct[it.product_id] = (qtyByProduct[it.product_id] || 0) + it.quantity
      })
    )
    return Object.entries(qtyByProduct)
      .map(([productId, qty]) => {
        const product = products.find((p) => p.id === productId)
        return { name: product?.name?.slice(0, 16) || productId, cantidad: qty }
      })
      .sort((a, b) => b.cantidad - a.cantidad)
      .slice(0, 6)
  }, [sales, products])

  const stockByCategory = useMemo(() => {
    return categories
      .map((c) => ({
        name: c.name,
        value: products.filter((p) => p.category_id === c.id).reduce((sum, p) => sum + p.stock, 0),
      }))
      .filter((c) => c.value > 0)
  }, [categories, products])

  if (loading) {
    return (
      <AppLayout title="Panel">
        <div className="flex items-center justify-center py-20 text-ink-muted text-sm">
          Cargando métricas…
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout title="Panel">
      {/* 1. Stat Cards Grid: 1 col on mobile, 2 on tablet, 4 on desktop */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-5">
        <StatCard icon={DollarSign} label="Valor de inventario" value={money(stats.stockValue)} tone="brand" />
        <StatCard icon={TrendingUp} label="Ventas este mes" value={money(stats.monthRevenue)} tone="good" />
        <StatCard icon={Boxes} label="Productos activos" value={stats.totalProducts} tone="brand" />
        <StatCard
          icon={AlertTriangle}
          label="Alertas stock bajo"
          value={stats.lowStock.length}
          tone={stats.lowStock.length ? 'amber' : 'good'}
        />
      </div>

      {/* 2. Charts Grid: 1 col on mobile/tablet, 3 cols on desktop */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-5">
        {/* Bar Chart: Productos más vendidos */}
        <div className="card p-4 sm:p-5 lg:col-span-2">
          <p className="font-display font-semibold text-ink-primary text-sm sm:text-base mb-3 sm:mb-4">
            Productos más vendidos
          </p>
          {topProducts.length === 0 ? (
            <p className="text-sm text-ink-muted py-10 text-center">Aún no hay ventas registradas.</p>
          ) : (
            <div className="w-full h-[240px] sm:h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topProducts} layout="vertical" margin={{ left: -10, right: 15, top: 5, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2A3140" horizontal={false} />
                  <XAxis type="number" stroke="#5F6B7E" fontSize={11} />
                  <YAxis type="category" dataKey="name" stroke="#98A2B3" fontSize={11} width={105} tickLine={false} />
                  <Tooltip
                    contentStyle={{ background: '#1A2029', border: '1px solid #2A3140', borderRadius: 8, fontSize: 12 }}
                    labelStyle={{ color: '#E9ECF1' }}
                    cursor={{ fill: '#212836' }}
                  />
                  <Bar dataKey="cantidad" fill="#4F7CFF" radius={[0, 4, 4, 0]} barSize={16} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Pie Chart: Stock por categoría */}
        <div className="card p-4 sm:p-5">
          <p className="font-display font-semibold text-ink-primary text-sm sm:text-base mb-3 sm:mb-4">
            Stock por categoría
          </p>
          {stockByCategory.length === 0 ? (
            <p className="text-sm text-ink-muted py-10 text-center">Sin datos de categorías.</p>
          ) : (
            <div className="w-full h-[220px] sm:h-[240px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={stockByCategory} dataKey="value" nameKey="name" innerRadius={48} outerRadius={78} paddingAngle={2}>
                    {stockByCategory.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} stroke="none" />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ background: '#1A2029', border: '1px solid #2A3140', borderRadius: 8, fontSize: 12 }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
          <div className="flex flex-wrap gap-x-3 gap-y-1.5 mt-2 justify-center">
            {stockByCategory.map((c, i) => (
              <div key={c.name} className="flex items-center gap-1.5 text-[11px] text-ink-secondary">
                <span className="w-2 h-2 rounded-full shrink-0" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                <span className="truncate max-w-[90px]">{c.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 3. Low Stock Table: with horizontal scroll wrapper to avoid mobile viewport breakage */}
      <div className="card overflow-hidden">
        <div className="px-4 sm:px-5 py-3.5 border-b border-base-border flex items-center justify-between">
          <p className="font-display font-semibold text-ink-primary text-sm sm:text-base">
            Productos con stock bajo
          </p>
          <span className="text-xs text-ink-muted">
            {stats.lowStock.length} de {products.length}
          </span>
        </div>
        {stats.lowStock.length === 0 ? (
          <p className="text-sm text-ink-muted py-8 text-center">Todo el inventario está en niveles saludables.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[460px] text-left">
              <thead>
                <tr>
                  <th className="th">SKU</th>
                  <th className="th">Producto</th>
                  <th className="th">Stock actual</th>
                  <th className="th">Stock mínimo</th>
                </tr>
              </thead>
              <tbody>
                {stats.lowStock.map((p) => (
                  <tr key={p.id} className="hover:bg-base-raised/50 transition-colors">
                    <td className="td font-mono text-xs text-ink-secondary">{p.sku}</td>
                    <td className="td font-medium">{p.name}</td>
                    <td className="td text-amber font-semibold">{p.stock}</td>
                    <td className="td text-ink-muted">{p.min_stock}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AppLayout>
  )
}

function StatCard({ icon: Icon, label, value, tone }) {
  const toneStyles = {
    brand: 'bg-brand-dim text-brand-hover',
    good: 'bg-good-dim text-good',
    amber: 'bg-amber-dim text-amber',
  }
  return (
    <div className="card p-4 sm:p-5">
      <div className={`w-8 h-8 sm:w-9 sm:h-9 rounded-lg flex items-center justify-center mb-2.5 sm:mb-3 ${toneStyles[tone]}`}>
        <Icon size={16} />
      </div>
      <p className="text-xl sm:text-2xl font-display font-bold text-ink-primary tracking-tight">{value}</p>
      <p className="text-xs text-ink-muted mt-0.5">{label}</p>
    </div>
  )
}
