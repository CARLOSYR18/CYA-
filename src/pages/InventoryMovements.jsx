import { useEffect, useMemo, useState } from 'react'
import { Plus, ArrowDownCircle, ArrowUpCircle, ArrowLeftRight } from 'lucide-react'
import AppLayout from '../components/layout/AppLayout'
import Modal from '../components/ui/Modal'
import EmptyState from '../components/ui/EmptyState'
import { inventoryMovementsService } from '../services/inventoryMovementsService'
import { productsService } from '../services/productsService'

const emptyForm = { product_id: '', type: 'entrada', quantity: '', reason: '', reference: '' }

export default function InventoryMovements() {
  const [movements, setMovements] = useState([])
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  async function loadAll() {
    setLoading(true)
    const [m, p] = await Promise.all([inventoryMovementsService.list(), productsService.list()])
    setMovements(m)
    setProducts(p)
    setLoading(false)
  }
  useEffect(() => { loadAll() }, [])

  function openCreate() { setForm(emptyForm); setError(''); setModalOpen(true) }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (!form.product_id) { setError('Selecciona un producto'); return }
    const qty = Number(form.quantity)
    if (!qty || qty <= 0) { setError('La cantidad debe ser mayor a 0'); return }
    setSaving(true)
    try {
      await inventoryMovementsService.register({
        product_id: form.product_id,
        type: form.type,
        quantity: qty,
        reason: form.reason || (form.type === 'entrada' ? 'Ingreso manual' : 'Salida manual'),
        reference: form.reference,
      })
      setModalOpen(false)
      loadAll()
    } catch (err) {
      setError(err.message || 'No se pudo registrar el movimiento')
    } finally {
      setSaving(false)
    }
  }

  const productName = (id) => products.find((p) => p.id === id)?.name || '—'
  const productSku = (id) => products.find((p) => p.id === id)?.sku || ''

  const sorted = useMemo(
    () => [...movements].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)),
    [movements]
  )

  return (
    <AppLayout title="Movimientos de inventario">
      <div className="flex justify-end mb-5">
        <button onClick={openCreate} className="btn-primary"><Plus size={16} /> Registrar movimiento</button>
      </div>

      <div className="card overflow-x-auto">
        {loading ? (
          <p className="text-sm text-ink-muted p-8 text-center">Cargando…</p>
        ) : sorted.length === 0 ? (
          <EmptyState icon={ArrowLeftRight} title="Sin movimientos" description="Los ingresos y salidas de stock aparecerán aquí." />
        ) : (
          <table className="w-full">
            <thead>
              <tr>
                <th className="th">Fecha</th>
                <th className="th">Producto</th>
                <th className="th">Tipo</th>
                <th className="th">Cantidad</th>
                <th className="th">Motivo</th>
                <th className="th">Referencia</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((m) => (
                <tr key={m.id} className="hover:bg-base-raised/50">
                  <td className="td text-ink-secondary text-xs">{new Date(m.created_at).toLocaleString('es-PE')}</td>
                  <td className="td">
                    <span className="font-medium">{productName(m.product_id)}</span>
                    <span className="block font-mono text-xs text-ink-muted">{productSku(m.product_id)}</span>
                  </td>
                  <td className="td">
                    {m.type === 'entrada' ? (
                      <span className="inline-flex items-center gap-1.5 text-good text-xs font-medium"><ArrowDownCircle size={14} /> Entrada</span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 text-bad text-xs font-medium"><ArrowUpCircle size={14} /> Salida</span>
                    )}
                  </td>
                  <td className="td font-mono">{m.quantity}</td>
                  <td className="td text-ink-secondary">{m.reason}</td>
                  <td className="td font-mono text-xs text-ink-muted">{m.reference || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Registrar movimiento">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">Producto</label>
            <select className="field" value={form.product_id} onChange={(e) => setForm({ ...form, product_id: e.target.value })}>
              <option value="">Selecciona un producto</option>
              {products.map((p) => <option key={p.id} value={p.id}>{p.sku} — {p.name} (stock: {p.stock})</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Tipo</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setForm({ ...form, type: 'entrada' })}
                  className={`px-3 py-2 rounded-md text-sm font-medium border transition-colors ${form.type === 'entrada' ? 'bg-good-dim text-good border-good/30' : 'bg-base-raised text-ink-secondary border-base-border'}`}
                >
                  Entrada
                </button>
                <button
                  type="button"
                  onClick={() => setForm({ ...form, type: 'salida' })}
                  className={`px-3 py-2 rounded-md text-sm font-medium border transition-colors ${form.type === 'salida' ? 'bg-bad-dim text-bad border-bad/30' : 'bg-base-raised text-ink-secondary border-base-border'}`}
                >
                  Salida
                </button>
              </div>
            </div>
            <div>
              <label className="label">Cantidad</label>
              <input type="number" min="1" className="field" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} />
            </div>
          </div>
          <div>
            <label className="label">Motivo</label>
            <input className="field" placeholder="Ej. Ajuste de inventario, merma, devolución…" value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} />
          </div>
          <div>
            <label className="label">Referencia (opcional)</label>
            <input className="field" placeholder="N° de documento" value={form.reference} onChange={(e) => setForm({ ...form, reference: e.target.value })} />
          </div>

          {error && <p className="text-sm text-bad bg-bad-dim border border-bad/20 rounded-md px-3 py-2">{error}</p>}

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setModalOpen(false)} className="btn-secondary">Cancelar</button>
            <button type="submit" disabled={saving} className="btn-primary">Registrar</button>
          </div>
        </form>
      </Modal>
    </AppLayout>
  )
}
