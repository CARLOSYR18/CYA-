import { useEffect, useMemo, useState } from 'react'
import { Plus, Trash2, ShoppingCart, Printer } from 'lucide-react'
import AppLayout from '../components/layout/AppLayout'
import Modal from '../components/ui/Modal'
import EmptyState from '../components/ui/EmptyState'
import StatusBadge from '../components/ui/StatusBadge'
import Receipt from '../components/Receipt'
import { salesService } from '../services/salesService'
import { productsService } from '../services/productsService'
import { clientsService } from '../services/clientsService'
import { companySettingsService } from '../services/companySettingsService'
import { useAuth } from '../context/AuthContext'

const money = (n) => `S/ ${Number(n).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

export default function Sales() {
  const { user } = useAuth()
  const [sales, setSales] = useState([])
  const [products, setProducts] = useState([])
  const [clients, setClients] = useState([])
  const [company, setCompany] = useState(null)
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)

  // New-sale form state
  const [clientName, setClientName] = useState('')
  const [clientPhone, setClientPhone] = useState('')
  const [status, setStatus] = useState('pagado')
  const [discount, setDiscount] = useState('')
  const [items, setItems] = useState([])
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  // Detail / receipt modal
  const [viewing, setViewing] = useState(null)

  async function loadAll() {
    setLoading(true)
    try {
      const [s, p, c, comp] = await Promise.all([
        salesService.list(),
        productsService.list(),
        clientsService.list(),
        companySettingsService.get(),
      ])
      setSales(s || [])
      setProducts(p || [])
      setClients(c || [])
      setCompany(comp || null)
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => { loadAll() }, [])

  function openCreate() {
    setClientName('')
    setClientPhone('')
    setStatus('pagado')
    setDiscount('')
    setItems([{ product_id: '', quantity: 1 }])
    setError('')
    setModalOpen(true)
  }

  function addItemRow() { setItems([...items, { product_id: '', quantity: 1 }]) }
  function removeItemRow(idx) { setItems(items.filter((_, i) => i !== idx)) }
  function updateItem(idx, patch) { setItems(items.map((it, i) => (i === idx ? { ...it, ...patch } : it))) }

  const subtotal = useMemo(() => {
    return items.reduce((sum, it) => {
      const product = products.find((p) => p.id === it.product_id)
      return sum + (product ? product.sale_price * Number(it.quantity || 0) : 0)
    }, 0)
  }, [items, products])

  const total = useMemo(() => Math.max(subtotal - (Number(discount) || 0), 0), [subtotal, discount])

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (!clientName.trim()) { setError('El nombre del cliente es obligatorio'); return }
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
      const result = await salesService.create({
        client_name: clientName.trim(),
        client_phone: clientPhone.trim() || undefined,
        user_id: user.id,
        status,
        items: saleItems,
        discount: Number(discount) || 0,
      })
      setModalOpen(false)
      await loadAll()
      // Open the receipt modal immediately after creating
      setViewing(result)
    } catch (err) {
      setError(err.message || 'No se pudo registrar la venta')
    } finally {
      setSaving(false)
    }
  }

  const productName = (id) => products.find((p) => p.id === id)?.name || id

  // For existing sales in the list, resolve client from the sale's client_id
  // The sale object may have embedded client data if it came from a recent create
  const getClientLabel = (sale) => sale.client?.name || sale.client_name || clients.find((c) => c.id === sale.client_id)?.name || '—'

  const sorted = useMemo(() => [...sales].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)), [sales])

  function openViewing(sale) {
    setViewing(sale)
  }

  return (
    <AppLayout title="Ventas">
      <div className="flex justify-end mb-5">
        <button onClick={openCreate} className="btn-primary w-full sm:w-auto justify-center">
          <Plus size={16} /> Nueva venta
        </button>
      </div>

      <div className="card overflow-hidden">
        {loading ? (
          <p className="text-sm text-ink-muted p-8 text-center">Cargando…</p>
        ) : sorted.length === 0 ? (
          <EmptyState icon={ShoppingCart} title="Sin ventas" description="Registra tu primera venta para verla aquí." />
        ) : (
          <>
            {/* Mobile Cards View */}
            <div className="block sm:hidden divide-y divide-base-border">
              {sorted.map((s) => (
                <div
                  key={s.id}
                  onClick={() => openViewing(s)}
                  className="p-4 space-y-2 hover:bg-base-raised/50 active:bg-base-raised cursor-pointer transition-colors"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs text-ink-muted">
                      {new Date(s.created_at).toLocaleString('es-PE', { dateStyle: 'short', timeStyle: 'short' })}
                    </span>
                    <StatusBadge status={s.status} />
                  </div>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold text-ink-primary text-sm">{getClientLabel(s)}</p>
                      <p className="text-xs text-ink-secondary mt-0.5">
                        {s.items.length} {s.items.length === 1 ? 'producto' : 'productos'}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="font-display font-bold text-base text-ink-primary">
                        {money(salesService.saleTotal(s))}
                      </span>
                      <span className="block text-[10px] text-brand font-medium">Ver boleta →</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop Table View */}
            <div className="overflow-x-auto hidden sm:block">
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
                    <tr key={s.id} className="hover:bg-base-raised/50 cursor-pointer" onClick={() => openViewing(s)}>
                      <td className="td text-ink-secondary text-xs">{new Date(s.created_at).toLocaleString('es-PE')}</td>
                      <td className="td font-medium">{getClientLabel(s)}</td>
                      <td className="td text-ink-secondary">{s.items.length} producto(s)</td>
                      <td className="td font-mono">{money(salesService.saleTotal(s))}</td>
                      <td className="td"><StatusBadge status={s.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/* ── Nueva venta modal ── */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Nueva venta" width="max-w-2xl">
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Client inputs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="label">Nombre del cliente <span className="text-bad">*</span></label>
              <input
                className="field"
                placeholder="Ej. Juan Pérez"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                autoFocus
              />
            </div>
            <div>
              <label className="label">Teléfono / DNI <span className="text-ink-muted font-normal">(opcional)</span></label>
              <input
                className="field"
                placeholder="Ej. 987 654 321"
                value={clientPhone}
                onChange={(e) => setClientPhone(e.target.value)}
              />
            </div>
          </div>

          {/* Status + Discount */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="label">Estado</label>
              <select className="field" value={status} onChange={(e) => setStatus(e.target.value)}>
                <option value="pagado">Pagado</option>
                <option value="pendiente">Pendiente</option>
              </select>
            </div>
            <div>
              <label className="label">Descuento en S/ <span className="text-ink-muted font-normal">(opcional)</span></label>
              <input
                type="number"
                min="0"
                step="0.01"
                className="field"
                placeholder="0.00"
                value={discount}
                onChange={(e) => setDiscount(e.target.value)}
              />
            </div>
          </div>

          {/* Products */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="label mb-0">Productos</label>
              <button type="button" onClick={addItemRow} className="text-xs text-brand hover:text-brand-hover font-medium flex items-center gap-1">
                <Plus size={13} /> Agregar producto
              </button>
            </div>
            <div className="space-y-3 sm:space-y-2">
              {items.map((it, idx) => {
                const product = products.find((p) => p.id === it.product_id)
                return (
                  <div
                    key={idx}
                    className="flex flex-col sm:flex-row sm:items-center gap-2 bg-slate-50 sm:bg-transparent p-3 sm:p-0 rounded-xl sm:rounded-none border sm:border-0 border-base-border"
                  >
                    <select
                      className="field flex-1"
                      value={it.product_id}
                      onChange={(e) => updateItem(idx, { product_id: e.target.value })}
                    >
                      <option value="">Selecciona un producto</option>
                      {products.map((p) => <option key={p.id} value={p.id}>{p.sku} — {p.name} (stock: {p.stock})</option>)}
                    </select>
                    <div className="flex items-center justify-between sm:justify-start gap-2">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs text-ink-muted sm:hidden">Cant:</span>
                        <input
                          type="number"
                          min="1"
                          className="field w-20 sm:w-24 text-center"
                          value={it.quantity}
                          onChange={(e) => updateItem(idx, { quantity: e.target.value })}
                        />
                      </div>
                      <span className="w-24 text-xs sm:text-sm font-mono text-ink-secondary text-right">
                        {product ? money(product.sale_price * (it.quantity || 0)) : '—'}
                      </span>
                      <button
                        type="button"
                        onClick={() => removeItemRow(idx)}
                        className="p-1.5 text-ink-muted hover:text-bad rounded-lg hover:bg-bad-dim transition-colors ml-auto sm:ml-0"
                        title="Eliminar producto"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Totals desglose */}
          <div className="border-t border-base-border pt-4 space-y-1.5">
            <div className="flex justify-end items-center gap-3 text-sm">
              <span className="text-ink-muted">Subtotal:</span>
              <span className="font-mono text-ink-secondary w-28 text-right">{money(subtotal)}</span>
            </div>
            {Number(discount) > 0 && (
              <div className="flex justify-end items-center gap-3 text-sm">
                <span className="text-amber-600">Descuento:</span>
                <span className="font-mono text-amber-600 w-28 text-right">-{money(Number(discount))}</span>
              </div>
            )}
            <div className="flex justify-end items-center gap-3">
              <span className="text-sm text-ink-secondary font-medium">Total:</span>
              <span className="text-lg font-display font-semibold text-ink-primary w-28 text-right">{money(total)}</span>
            </div>
          </div>

          {error && <p className="text-sm text-bad bg-bad-dim border border-bad/20 rounded-md px-3 py-2">{error}</p>}

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setModalOpen(false)} className="btn-secondary">Cancelar</button>
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? 'Registrando…' : 'Registrar venta'}
            </button>
          </div>
        </form>
      </Modal>

      {/* ── Detalle / Boleta modal ── */}
      <Modal open={!!viewing} onClose={() => setViewing(null)} title="Detalle de venta" width="max-w-md">
        {viewing && (
          <div className="space-y-4">
            <Receipt
              sale={viewing}
              client={clients.find((c) => c.id === viewing.client_id) || viewing.client}
              products={products}
              company={company}
            />
          </div>
        )}
      </Modal>
    </AppLayout>
  )
}
