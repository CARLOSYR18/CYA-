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
        return { name: product?.name?.slice(0, 18) || productId, cantidad: qty }
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
        <p className="text-ink-muted text-sm">Cargando…</p>
      </AppLayout>
    )
  }

  return (
    <AppLayout title="Panel">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard icon={DollarSign} label="Valor de inventario" value={money(stats.stockValue)} tone="brand" />
        <StatCard icon={TrendingUp} label="Ventas este mes" value={money(stats.monthRevenue)} tone="good" />
        <StatCard icon={Boxes} label="Productos activos" value={stats.totalProducts} tone="brand" />
        <StatCard
          icon={AlertTriangle}
          label="Alertas de stock bajo"
          value={stats.lowStock.length}
          tone={stats.lowStock.length ? 'amber' : 'good'}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <div className="card p-5 lg:col-span-2">
          <p className="font-display font-semibold text-ink-primary mb-4">Productos más vendidos</p>
          {topProducts.length === 0 ? (
            <p className="text-sm text-ink-muted py-10 text-center">Aún no hay ventas registradas.</p>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={topProducts} layout="vertical" margin={{ left: 10, right: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2A3140" horizontal={false} />
                <XAxis type="number" stroke="#5F6B7E" fontSize={12} />
                <YAxis type="category" dataKey="name" stroke="#5F6B7E" fontSize={12} width={130} />
                <Tooltip
                  contentStyle={{ background: '#1A2029', border: '1px solid #2A3140', borderRadius: 8, fontSize: 13 }}
                  labelStyle={{ color: '#E9ECF1' }}
                  cursor={{ fill: '#212836' }}
                />
                <Bar dataKey="cantidad" fill="#4F7CFF" radius={[0, 4, 4, 0]} barSize={18} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="card p-5">
          <p className="font-display font-semibold text-ink-primary mb-4">Stock por categoría</p>
          {stockByCategory.length === 0 ? (
            <p className="text-sm text-ink-muted py-10 text-center">Sin datos.</p>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={stockByCategory} dataKey="value" nameKey="name" innerRadius={55} outerRadius={85} paddingAngle={2}>
                  {stockByCategory.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} stroke="none" />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ background: '#1A2029', border: '1px solid #2A3140', borderRadius: 8, fontSize: 13 }}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
          <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-2 justify-center">
            {stockByCategory.map((c, i) => (
              <div key={c.name} className="flex items-center gap-1.5 text-xs text-ink-secondary">
                <span className="w-2 h-2 rounded-full" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                {c.name}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="card">
        <div className="px-5 py-4 border-b border-base-border flex items-center justify-between">
          <p className="font-display font-semibold text-ink-primary">Productos con stock bajo</p>
          <span className="text-xs text-ink-muted">{stats.lowStock.length} de {products.length}</span>
        </div>
        {stats.lowStock.length === 0 ? (
          <p className="text-sm text-ink-muted py-10 text-center">Todo el inventario está en niveles saludables.</p>
        ) : (
          <table className="w-full">
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
                <tr key={p.id}>
                  <td className="td font-mono text-xs text-ink-secondary">{p.sku}</td>
                  <td className="td">{p.name}</td>
                  <td className="td text-amber font-medium">{p.stock}</td>
                  <td className="td text-ink-muted">{p.min_stock}</td>
                </tr>
              ))}
            </tbody>
          </table>
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
    <div className="card p-5">
      <div className={`w-9 h-9 rounded-md flex items-center justify-center mb-3 ${toneStyles[tone]}`}>
        <Icon size={17} />
      </div>
      <p className="text-2xl font-display font-semibold text-ink-primary">{value}</p>
      <p className="text-sm text-ink-muted mt-0.5">{label}</p>
    </div>
  )
}
