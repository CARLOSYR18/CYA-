import { useEffect, useState } from 'react'
import { Plus, Pencil, Trash2, Tags } from 'lucide-react'
import AppLayout from '../components/layout/AppLayout'
import Modal from '../components/ui/Modal'
import EmptyState from '../components/ui/EmptyState'
import { categoriesService } from '../services/categoriesService'
import { productsService } from '../services/productsService'

const emptyForm = { name: '', description: '' }

export default function Categories() {
  const [categories, setCategories] = useState([])
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [error, setError] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(null)

  async function loadAll() {
    setLoading(true)
    const [c, p] = await Promise.all([categoriesService.list(), productsService.list()])
    setCategories(c)
    setProducts(p)
    setLoading(false)
  }
  useEffect(() => { loadAll() }, [])

  function openCreate() { setEditing(null); setForm(emptyForm); setError(''); setModalOpen(true) }
  function openEdit(c) { setEditing(c); setForm({ name: c.name, description: c.description || '' }); setError(''); setModalOpen(true) }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.name.trim()) { setError('El nombre es obligatorio'); return }
    try {
      if (editing) await categoriesService.update(editing.id, form)
      else await categoriesService.create(form)
      setModalOpen(false)
      loadAll()
    } catch (err) { setError(err.message) }
  }

  async function handleDelete() {
    await categoriesService.remove(confirmDelete.id)
    setConfirmDelete(null)
    loadAll()
  }

  const productCount = (categoryId) => products.filter((p) => p.category_id === categoryId).length

  return (
    <AppLayout title="Categorías">
      <div className="flex justify-end mb-5">
        <button onClick={openCreate} className="btn-primary"><Plus size={16} /> Nueva categoría</button>
      </div>

      <div className="card overflow-x-auto">
        {loading ? (
          <p className="text-sm text-ink-muted p-8 text-center">Cargando…</p>
        ) : categories.length === 0 ? (
          <EmptyState icon={Tags} title="Sin categorías" description="Crea categorías para organizar tus productos." />
        ) : (
          <table className="w-full">
            <thead>
              <tr>
                <th className="th">Nombre</th>
                <th className="th">Descripción</th>
                <th className="th">Productos</th>
                <th className="th"></th>
              </tr>
            </thead>
            <tbody>
              {categories.map((c) => (
                <tr key={c.id} className="hover:bg-base-raised/50">
                  <td className="td font-medium">{c.name}</td>
                  <td className="td text-ink-secondary">{c.description || '—'}</td>
                  <td className="td font-mono">{productCount(c.id)}</td>
                  <td className="td">
                    <div className="flex items-center gap-1 justify-end">
                      <button onClick={() => openEdit(c)} className="p-1.5 rounded-md text-ink-muted hover:text-brand hover:bg-brand-dim transition-colors"><Pencil size={15} /></button>
                      <button onClick={() => setConfirmDelete(c)} className="p-1.5 rounded-md text-ink-muted hover:text-bad hover:bg-bad-dim transition-colors"><Trash2 size={15} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Editar categoría' : 'Nueva categoría'} width="max-w-sm">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">Nombre</label>
            <input className="field" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} autoFocus />
          </div>
          <div>
            <label className="label">Descripción</label>
            <textarea className="field" rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          {error && <p className="text-sm text-bad bg-bad-dim border border-bad/20 rounded-md px-3 py-2">{error}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setModalOpen(false)} className="btn-secondary">Cancelar</button>
            <button type="submit" className="btn-primary">{editing ? 'Guardar cambios' : 'Crear'}</button>
          </div>
        </form>
      </Modal>

      <Modal open={!!confirmDelete} onClose={() => setConfirmDelete(null)} title="Eliminar categoría" width="max-w-sm">
        <p className="text-sm text-ink-secondary mb-4">¿Eliminar <span className="text-ink-primary font-medium">{confirmDelete?.name}</span>?</p>
        <div className="flex justify-end gap-2">
          <button onClick={() => setConfirmDelete(null)} className="btn-secondary">Cancelar</button>
          <button onClick={handleDelete} className="btn-danger">Eliminar</button>
        </div>
      </Modal>
    </AppLayout>
  )
}
