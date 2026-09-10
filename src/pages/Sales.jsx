import { useEffect, useMemo, useState } from 'react'
import { Plus, Trash2, ShoppingCart } from 'lucide-react'
import AppLayout from '../components/layout/AppLayout'
import Modal from '../components/ui/Modal'
import EmptyState from '../components/ui/EmptyState'
import StatusBadge from '../components/ui/StatusBadge'
import { salesService } from '../services/salesService'
import { clientsService } from '../services/clientsService'
import { productsService } from '../services/productsService'
import { useAuth } from '../context/AuthContext'

const money = (n) => `S/ ${Number(n).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

export default function Sales() {
  const { user } = useAuth()
  const [sales, setSales] = useState([])
  const [clients, setClients] = useState([])
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [clientId, setClientId] = useState('')
  const [status, setStatus] = useState('pagado')
  const [items, setItems] = useState([])
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [viewing, setViewing] = useState(null)

  async function loadAll() {
    setLoading(true)
    const [s, c, p] = await Promise.all([salesService.list(), clientsService.list(), productsService.list()])
    setSales(s)
    setClients(c)
    setProducts(p)
    setLoading(false)
  }
  useEffect(() => { loadAll() }, [])

  function openCreate() {
    setClientId('')
    setStatus('pagado')
    setItems([{ product_id: '', quantity: 1 }])
    setError('')
    setModalOpen(true)
  }

  function addItemRow() { setItems([...items, { product_id: '', quantity: 1 }]) }
  function removeItemRow(idx) { setItems(items.filter((_, i) => i !== idx)) }
  function updateItem(idx, patch) { setItems(items.map((it, i) => (i === idx ? { ...it, ...patch } : it))) }

  const total = useMemo(() => {
    return items.reduce((sum, it) => {
      const product = products.find((p) => p.id === it.product_id)
      return sum + (product ? product.sale_price * Number(it.quantity || 0) : 0)
    }, 0)
  }, [items, products])

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (!clientId) { setError('Selecciona un cliente'); return }
    const validItems = items.filter((it) => it.product_id && Number(it.quantity) > 0)
    if (validItems.length === 0) { setError('Agrega al menos un producto'); return }

    for (const it of validItems) {
      const product = products.find((p) => p.id === it.product_id)
      if (product && Number(it.quantity) > product.stock) {
        setError(`Stock insuficiente para "${product.name}" (disponible: ${product.stock})`)
        return
      }
    }

    setSaving(true)
    try {
      const saleItems = validItems.map((it) => {
        const product = products.find((p) => p.id === it.product_id)
        return { product_id: it.product_id, quantity: Number(it.quantity), unit_price: product.sale_price }
      })
      await salesService.create({ client_id: clientId, user_id: user.id, status, items: saleItems })
      setModalOpen(false)
      loadAll()
    } catch (err) {
      setError(err.message || 'No se pudo registrar la venta')
    } finally {
      setSaving(false)
    }
  }

  const clientName = (id) => clients.find((c) => c.id === id)?.name || '—'
  const productName = (id) => products.find((p) => p.id === id)?.name || id

  const sorted = useMemo(() => [...sales].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)), [sales])

  return (
    <AppLayout title="Ventas">
      <div className="flex justify-end mb-5">
        <button onClick={openCreate} className="btn-primary"><Plus size={16} /> Nueva venta</button>
      </div>

      <div className="card overflow-x-auto">
        {loading ? (
          <p className="text-sm text-ink-muted p-8 text-center">Cargando…</p>
        ) : sorted.length === 0 ? (
          <EmptyState icon={ShoppingCart} title="Sin ventas" description="Registra tu primera venta para verla aquí." />
        ) : (
          <table className="w-full">
            <thead>
              <tr>
                <th className="th">Fecha</th>
                <th className="th">Cliente</th>
                <th className="th">Items</th>
                <th className="th">Total</th>
                <th className="th">Estado</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((s) => (
                <tr key={s.id} className="hover:bg-base-raised/50 cursor-pointer" onClick={() => setViewing(s)}>
                  <td className="td text-ink-secondary text-xs">{new Date(s.created_at).toLocaleString('es-PE')}</td>
                  <td className="td font-medium">{clientName(s.client_id)}</td>
                  <td className="td text-ink-secondary">{s.items.length} producto(s)</td>
                  <td className="td font-mono">{money(salesService.saleTotal(s))}</td>
                  <td className="td"><StatusBadge status={s.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Nueva venta" width="max-w-2xl">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Cliente</label>
              <select className="field" value={clientId} onChange={(e) => setClientId(e.target.value)}>
                <option value="">Selecciona un cliente</option>
                {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Estado</label>
              <select className="field" value={status} onChange={(e) => setStatus(e.target.value)}>
                <option value="pagado">Pagado</option>
                <option value="pendiente">Pendiente</option>
              </select>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="label mb-0">Productos</label>
              <button type="button" onClick={addItemRow} className="text-xs text-brand hover:text-brand-hover font-medium flex items-center gap-1">
                <Plus size={13} /> Agregar producto
              </button>
            </div>
            <div className="space-y-2">
              {items.map((it, idx) => {
                const product = products.find((p) => p.id === it.product_id)
                return (
                  <div key={idx} className="flex items-center gap-2">
                    <select className="field flex-1" value={it.product_id} onChange={(e) => updateItem(idx, { product_id: e.target.value })}>
                      <option value="">Selecciona un producto</option>
                      {products.map((p) => <option key={p.id} value={p.id}>{p.sku} — {p.name} (stock: {p.stock})</option>)}
                    </select>
                    <input type="number" min="1" className="field w-24" value={it.quantity} onChange={(e) => updateItem(idx, { quantity: e.target.value })} />
                    <span className="w-24 text-sm font-mono text-ink-secondary text-right">
                      {product ? money(product.sale_price * (it.quantity || 0)) : '—'}
                    </span>
                    <button type="button" onClick={() => removeItemRow(idx)} className="p-1.5 text-ink-muted hover:text-bad">
                      <Trash2 size={15} />
                    </button>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="flex justify-end items-center gap-2 border-t border-base-border pt-4">
            <span className="text-sm text-ink-secondary">Total:</span>
            <span className="text-lg font-display font-semibold text-ink-primary">{money(total)}</span>
          </div>

          {error && <p className="text-sm text-bad bg-bad-dim border border-bad/20 rounded-md px-3 py-2">{error}</p>}

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setModalOpen(false)} className="btn-secondary">Cancelar</button>
            <button type="submit" disabled={saving} className="btn-primary">Registrar venta</button>
          </div>
        </form>
      </Modal>

      <Modal open={!!viewing} onClose={() => setViewing(null)} title="Detalle de venta" width="max-w-lg">
        {viewing && (
          <div className="space-y-4">
            <div className="flex justify-between text-sm">
              <div>
                <p className="text-ink-muted">Cliente</p>
                <p className="text-ink-primary font-medium">{clientName(viewing.client_id)}</p>
              </div>
              <div className="text-right">
                <p className="text-ink-muted">Fecha</p>
                <p className="text-ink-primary">{new Date(viewing.created_at).toLocaleString('es-PE')}</p>
              </div>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr><th className="th">Producto</th><th className="th">Cant.</th><th className="th">Precio</th><th className="th">Subtotal</th></tr>
              </thead>
              <tbody>
                {viewing.items.map((it, i) => (
                  <tr key={i}>
                    <td className="td">{productName(it.product_id)}</td>
                    <td className="td font-mono">{it.quantity}</td>
                    <td className="td font-mono">{money(it.unit_price)}</td>
                    <td className="td font-mono">{money(it.unit_price * it.quantity)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="flex justify-between items-center">
              <StatusBadge status={viewing.status} />
              <p className="font-display font-semibold text-lg">{money(salesService.saleTotal(viewing))}</p>
            </div>
          </div>
        )}
      </Modal>
    </AppLayout>
  )
}
