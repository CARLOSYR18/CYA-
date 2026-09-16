import { useEffect, useMemo, useState } from 'react'
import { Plus, Pencil, ArrowDownCircle, ArrowUpCircle, ArrowLeftRight, Trash2 } from 'lucide-react'
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
  const [editing, setEditing] = useState(null)        // movement object being edited | null
  const [confirmDelete, setConfirmDelete] = useState(null) // movement object | null

  async function loadAll() {
    setLoading(true)
    const [m, p] = await Promise.all([inventoryMovementsService.list(), productsService.list()])
    setMovements(m)
    setProducts(p)
    setLoading(false)
  }
  useEffect(() => { loadAll() }, [])

  function openCreate() { setEditing(null); setForm(emptyForm); setError(''); setModalOpen(true) }

  function openEdit(m) {
    setEditing(m)
    setForm({
      product_id: m.product_id,
      type: m.type,
      quantity: String(m.quantity),
      reason: m.reason || '',
      reference: m.reference || '',
    })
    setError('')
    setModalOpen(true)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (!form.product_id) { setError('Selecciona un producto'); return }
    const qty = Number(form.quantity)
    if (!qty || qty <= 0) { setError('La cantidad debe ser mayor a 0'); return }
    setSaving(true)
    try {
      if (editing) {
        await inventoryMovementsService.update(editing, {
          product_id: form.product_id,
          type: form.type,
          quantity: qty,
          reason: form.reason || (form.type === 'entrada' ? 'Ingreso manual' : 'Salida manual'),
          reference: form.reference,
        })
      } else {
        await inventoryMovementsService.register({
          product_id: form.product_id,
          type: form.type,
          quantity: qty,
          reason: form.reason || (form.type === 'entrada' ? 'Ingreso manual' : 'Salida manual'),
          reference: form.reference,
        })
      }
      setModalOpen(false)
      loadAll()
    } catch (err) {
      setError(err.message || 'No se pudo guardar el movimiento')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    try {
      await inventoryMovementsService.remove(confirmDelete)
      setConfirmDelete(null)
      loadAll()
    } catch (err) {
      // Silently reload; in production surface to a toast
      setConfirmDelete(null)
      loadAll()
    }
  }

  const productName = (id) => products.find((p) => p.id === id)?.name || '—'
  const productSku  = (id) => products.find((p) => p.id === id)?.sku  || ''

  const sorted = useMemo(
    () => [...movements].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)),
    [movements]
  )

  return (
    <AppLayout title="Movimientos de inventario">
      <div className="flex justify-end mb-5">
        <button onClick={openCreate} className="btn-primary w-full sm:w-auto justify-center">
          <Plus size={16} /> Registrar movimiento
        </button>
      </div>

      <div className="card overflow-hidden">
        {loading ? (
          <p className="text-sm text-ink-muted p-8 text-center">Cargando…</p>
        ) : sorted.length === 0 ? (
          <EmptyState icon={ArrowLeftRight} title="Sin movimientos" description="Los ingresos y salidas de stock aparecerán aquí." />
        ) : (
          <>
            {/* Mobile Cards View */}
            <div className="block sm:hidden divide-y divide-base-border">
              {sorted.map((m) => (
                <div key={m.id} className="p-4 space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    {m.type === 'entrada' ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-good-dim text-good">
                        <ArrowDownCircle size={13} /> Entrada
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-bad-dim text-bad">
                        <ArrowUpCircle size={13} /> Salida
                      </span>
                    )}
                    <span className="text-xs text-ink-muted">
                      {new Date(m.created_at).toLocaleString('es-PE', { dateStyle: 'short', timeStyle: 'short' })}
                    </span>
                  </div>

                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold text-ink-primary text-sm leading-snug">{productName(m.product_id)}</p>
                      <p className="font-mono text-xs text-ink-muted">{productSku(m.product_id)}</p>
                    </div>
                    <span className={`font-mono font-bold text-base ${m.type === 'entrada' ? 'text-good' : 'text-bad'}`}>
                      {m.type === 'entrada' ? `+${m.quantity}` : `-${m.quantity}`}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs pt-1 border-t border-base-border/50 text-ink-secondary">
                    <span className="truncate max-w-[180px]">{m.reason || 'Sin motivo'}</span>
                    <div className="flex items-center gap-1 shrink-0">
                      {m.reference && <span className="font-mono text-ink-muted mr-1">#{m.reference}</span>}
                      <button
                        onClick={() => openEdit(m)}
                        className="p-1.5 rounded-md text-ink-muted hover:text-brand hover:bg-brand-dim transition-colors"
                        title="Editar"
                      >
                        <Pencil size={15} />
                      </button>
                      <button
                        onClick={() => setConfirmDelete(m)}
                        className="p-1.5 rounded-md text-ink-muted hover:text-bad hover:bg-bad-dim transition-colors"
                        title="Eliminar"
                      >
                        <Trash2 size={15} />
                      </button>
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
                    <th className="th">Producto</th>
                    <th className="th">Tipo</th>
                    <th className="th">Cantidad</th>
                    <th className="th">Motivo</th>
                    <th className="th">Referencia</th>
                    <th className="th"></th>
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
                      <td className="td">
                        <div className="flex items-center gap-1 justify-end">
                          <button
                            onClick={() => openEdit(m)}
                            className="p-1.5 rounded-md text-ink-muted hover:text-brand hover:bg-brand-dim transition-colors"
                            title="Editar movimiento"
                          >
                            <Pencil size={15} />
                          </button>
                          <button
                            onClick={() => setConfirmDelete(m)}
                            className="p-1.5 rounded-md text-ink-muted hover:text-bad hover:bg-bad-dim transition-colors"
                            title="Eliminar movimiento"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Editar movimiento' : 'Registrar movimiento'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">Producto</label>
            <select className="field" value={form.product_id} onChange={(e) => setForm({ ...form, product_id: e.target.value })}>
              <option value="">Selecciona un producto</option>
              {products
                .filter((p) => !p.is_kit)
                .map((p) => <option key={p.id} value={p.id}>{p.sku} — {p.name} (stock: {p.stock})</option>)}
            </select>
            <p className="text-[11px] text-ink-muted mt-1">
              Los combos no se ajustan aquí — su stock depende del producto base. Ajusta el producto base directamente.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? 'Guardando…' : editing ? 'Guardar cambios' : 'Registrar'}
            </button>
          </div>
        </form>
      </Modal>
      {/* ── Confirm delete modal ── */}
      <Modal
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        title="Eliminar movimiento"
        width="max-w-sm"
      >
        {confirmDelete && (
          <div className="space-y-4">
            <div className="bg-slate-50 rounded-xl px-4 py-3 space-y-1.5 text-sm">
              <div className="flex justify-between">
                <span className="text-ink-muted">Producto</span>
                <span className="font-medium text-ink-primary">{productName(confirmDelete.product_id)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-ink-muted">Tipo</span>
                {confirmDelete.type === 'entrada' ? (
                  <span className="inline-flex items-center gap-1 text-good font-medium"><ArrowDownCircle size={13} /> Entrada</span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-bad font-medium"><ArrowUpCircle size={13} /> Salida</span>
                )}
              </div>
              <div className="flex justify-between">
                <span className="text-ink-muted">Cantidad</span>
                <span className="font-mono font-medium text-ink-primary">{confirmDelete.quantity}</span>
              </div>
            </div>

            <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-4 py-2.5">
              ⚠️ Esta acción también <strong>revertirá el stock</strong> del producto.
            </p>

            <div className="flex justify-end gap-2">
              <button onClick={() => setConfirmDelete(null)} className="btn-secondary">Cancelar</button>
              <button onClick={handleDelete} className="btn-danger">Eliminar y revertir stock</button>
            </div>
          </div>
        )}
      </Modal>
    </AppLayout>
  )
}
