import { useEffect, useMemo, useState } from 'react'
import { Plus, Pencil, Trash2, Search, Boxes } from 'lucide-react'
import AppLayout from '../components/layout/AppLayout'
import Modal from '../components/ui/Modal'
import EmptyState from '../components/ui/EmptyState'
import StockBadge from '../components/ui/StockBadge'
import { productsService } from '../services/productsService'
import { categoriesService } from '../services/categoriesService'
import { suppliersService } from '../services/suppliersService'

const emptyForm = {
  sku: '', name: '', category_id: '', unit: 'unidad', cost_price: '', sale_price: '', stock: '', min_stock: '', supplier_id: '',
}

export default function Products() {
  const [products, setProducts] = useState([])
  const [categories, setCategories] = useState([])
  const [suppliers, setSuppliers] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [error, setError] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(null)

  async function loadAll() {
    setLoading(true)
    const [p, c, s] = await Promise.all([productsService.list(), categoriesService.list(), suppliersService.list()])
    setProducts(p)
    setCategories(c)
    setSuppliers(s)
    setLoading(false)
  }

  useEffect(() => { loadAll() }, [])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return products
    return products.filter((p) => p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q))
  }, [products, search])

  function openCreate() {
    setEditing(null)
    setForm(emptyForm)
    setError('')
    setModalOpen(true)
  }

  function openEdit(product) {
    setEditing(product)
    setForm({
      sku: product.sku, name: product.name, category_id: product.category_id || '', unit: product.unit,
      cost_price: product.cost_price, sale_price: product.sale_price, stock: product.stock,
      min_stock: product.min_stock, supplier_id: product.supplier_id || '',
    })
    setError('')
    setModalOpen(true)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (!form.sku.trim() || !form.name.trim()) {
      setError('SKU y nombre son obligatorios')
      return
    }
    const payload = {
      sku: form.sku.trim(),
      name: form.name.trim(),
      category_id: form.category_id || null,
      unit: form.unit,
      cost_price: Number(form.cost_price) || 0,
      sale_price: Number(form.sale_price) || 0,
      stock: Number(form.stock) || 0,
      min_stock: Number(form.min_stock) || 0,
      supplier_id: form.supplier_id || null,
    }
    try {
      if (editing) await productsService.update(editing.id, payload)
      else await productsService.create(payload)
      setModalOpen(false)
      loadAll()
    } catch (err) {
      setError(err.message || 'No se pudo guardar el producto')
    }
  }

  async function handleDelete() {
    await productsService.remove(confirmDelete.id)
    setConfirmDelete(null)
    loadAll()
  }

  const categoryName = (id) => categories.find((c) => c.id === id)?.name || '—'

  return (
    <AppLayout title="Productos">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <div className="relative w-full sm:w-72">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
          <input
            className="field pl-9"
            placeholder="Buscar por nombre o SKU…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <button onClick={openCreate} className="btn-primary">
          <Plus size={16} /> Nuevo producto
        </button>
      </div>

      <div className="card overflow-x-auto">
        {loading ? (
          <p className="text-sm text-ink-muted p-8 text-center">Cargando…</p>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={Boxes}
            title="Sin productos"
            description="Registra tu primer producto para empezar a llevar el control del inventario."
            action={<button onClick={openCreate} className="btn-primary"><Plus size={16} />Nuevo producto</button>}
          />
        ) : (
          <table className="w-full">
            <thead>
              <tr>
                <th className="th">SKU</th>
                <th className="th">Producto</th>
                <th className="th">Categoría</th>
                <th className="th">Stock</th>
                <th className="th">Precio venta</th>
                <th className="th">Estado</th>
                <th className="th"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => (
                <tr key={p.id} className="hover:bg-base-raised/50">
                  <td className="td font-mono text-xs text-ink-secondary">{p.sku}</td>
                  <td className="td font-medium">{p.name}</td>
                  <td className="td text-ink-secondary">{categoryName(p.category_id)}</td>
                  <td className="td font-mono">{p.stock} {p.unit}</td>
                  <td className="td font-mono">S/ {Number(p.sale_price).toFixed(2)}</td>
                  <td className="td"><StockBadge stock={p.stock} minStock={p.min_stock} /></td>
                  <td className="td">
                    <div className="flex items-center gap-1 justify-end">
                      <button onClick={() => openEdit(p)} className="p-1.5 rounded-md text-ink-muted hover:text-brand hover:bg-brand-dim transition-colors">
                        <Pencil size={15} />
                      </button>
                      <button onClick={() => setConfirmDelete(p)} className="p-1.5 rounded-md text-ink-muted hover:text-bad hover:bg-bad-dim transition-colors">
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Editar producto' : 'Nuevo producto'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">SKU</label>
              <input className="field font-mono" value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} />
            </div>
            <div>
              <label className="label">Unidad</label>
              <select className="field" value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })}>
                <option value="unidad">unidad</option>
                <option value="caja">caja</option>
                <option value="paquete">paquete</option>
                <option value="rollo">rollo</option>
                <option value="kg">kg</option>
                <option value="litro">litro</option>
              </select>
            </div>
          </div>
          <div>
            <label className="label">Nombre del producto</label>
            <input className="field" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Categoría</label>
              <select className="field" value={form.category_id} onChange={(e) => setForm({ ...form, category_id: e.target.value })}>
                <option value="">Sin categoría</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Proveedor</label>
              <select className="field" value={form.supplier_id} onChange={(e) => setForm({ ...form, supplier_id: e.target.value })}>
                <option value="">Sin proveedor</option>
                {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Precio de costo (S/)</label>
              <input type="number" step="0.01" min="0" className="field" value={form.cost_price} onChange={(e) => setForm({ ...form, cost_price: e.target.value })} />
            </div>
            <div>
              <label className="label">Precio de venta (S/)</label>
              <input type="number" step="0.01" min="0" className="field" value={form.sale_price} onChange={(e) => setForm({ ...form, sale_price: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Stock inicial</label>
              <input type="number" min="0" className="field" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} disabled={!!editing} />
              {editing && <p className="text-xs text-ink-muted mt-1">Usa "Movimientos" para ajustar el stock.</p>}
            </div>
            <div>
              <label className="label">Stock mínimo</label>
              <input type="number" min="0" className="field" value={form.min_stock} onChange={(e) => setForm({ ...form, min_stock: e.target.value })} />
            </div>
          </div>

          {error && <p className="text-sm text-bad bg-bad-dim border border-bad/20 rounded-md px-3 py-2">{error}</p>}

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setModalOpen(false)} className="btn-secondary">Cancelar</button>
            <button type="submit" className="btn-primary">{editing ? 'Guardar cambios' : 'Crear producto'}</button>
          </div>
        </form>
      </Modal>

      <Modal open={!!confirmDelete} onClose={() => setConfirmDelete(null)} title="Eliminar producto" width="max-w-sm">
        <p className="text-sm text-ink-secondary mb-4">
          ¿Eliminar <span className="text-ink-primary font-medium">{confirmDelete?.name}</span>? Esta acción no se puede deshacer.
        </p>
        <div className="flex justify-end gap-2">
          <button onClick={() => setConfirmDelete(null)} className="btn-secondary">Cancelar</button>
          <button onClick={handleDelete} className="btn-danger">Eliminar</button>
        </div>
      </Modal>
    </AppLayout>
  )
}
