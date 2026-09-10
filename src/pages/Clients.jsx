import { useEffect, useState } from 'react'
import { Plus, Pencil, Trash2, Users, Mail, Phone } from 'lucide-react'
import AppLayout from '../components/layout/AppLayout'
import Modal from '../components/ui/Modal'
import EmptyState from '../components/ui/EmptyState'
import { clientsService } from '../services/clientsService'

const emptyForm = { name: '', ruc: '', contact_name: '', email: '', phone: '', address: '' }

export default function Clients() {
  const [clients, setClients] = useState([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [error, setError] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(null)

  async function loadAll() { setLoading(true); setClients(await clientsService.list()); setLoading(false) }
  useEffect(() => { loadAll() }, [])

  function openCreate() { setEditing(null); setForm(emptyForm); setError(''); setModalOpen(true) }
  function openEdit(c) { setEditing(c); setForm({ name: c.name, ruc: c.ruc || '', contact_name: c.contact_name || '', email: c.email || '', phone: c.phone || '', address: c.address || '' }); setError(''); setModalOpen(true) }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.name.trim()) { setError('El nombre / razón social es obligatorio'); return }
    try {
      if (editing) await clientsService.update(editing.id, form)
      else await clientsService.create(form)
      setModalOpen(false)
      loadAll()
    } catch (err) { setError(err.message) }
  }

  async function handleDelete() {
    await clientsService.remove(confirmDelete.id)
    setConfirmDelete(null)
    loadAll()
  }

  return (
    <AppLayout title="Clientes">
      <div className="flex justify-end mb-5">
        <button onClick={openCreate} className="btn-primary"><Plus size={16} /> Nuevo cliente</button>
      </div>

      {loading ? (
        <p className="text-sm text-ink-muted p-8 text-center">Cargando…</p>
      ) : clients.length === 0 ? (
        <div className="card"><EmptyState icon={Users} title="Sin clientes" description="Registra tu primer cliente para empezar a facturar." /></div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {clients.map((c) => (
            <div key={c.id} className="card p-5">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="font-medium text-ink-primary">{c.name}</p>
                  {c.ruc && <p className="text-xs font-mono text-ink-muted mt-0.5">RUC {c.ruc}</p>}
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => openEdit(c)} className="p-1.5 rounded-md text-ink-muted hover:text-brand hover:bg-brand-dim transition-colors"><Pencil size={14} /></button>
                  <button onClick={() => setConfirmDelete(c)} className="p-1.5 rounded-md text-ink-muted hover:text-bad hover:bg-bad-dim transition-colors"><Trash2 size={14} /></button>
                </div>
              </div>
              <div className="space-y-1.5 text-sm text-ink-secondary">
                {c.contact_name && <p>Contacto: {c.contact_name}</p>}
                {c.email && <p className="flex items-center gap-1.5"><Mail size={13} className="text-ink-muted" />{c.email}</p>}
                {c.phone && <p className="flex items-center gap-1.5"><Phone size={13} className="text-ink-muted" />{c.phone}</p>}
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Editar cliente' : 'Nuevo cliente'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="label">Nombre / Razón social</label>
              <input className="field" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} autoFocus />
            </div>
            <div>
              <label className="label">RUC / DNI</label>
              <input className="field font-mono" value={form.ruc} onChange={(e) => setForm({ ...form, ruc: e.target.value })} />
            </div>
            <div>
              <label className="label">Persona de contacto</label>
              <input className="field" value={form.contact_name} onChange={(e) => setForm({ ...form, contact_name: e.target.value })} />
            </div>
            <div>
              <label className="label">Correo</label>
              <input type="email" className="field" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
            <div>
              <label className="label">Teléfono</label>
              <input className="field" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </div>
            <div className="col-span-2">
              <label className="label">Dirección</label>
              <input className="field" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
            </div>
          </div>
          {error && <p className="text-sm text-bad bg-bad-dim border border-bad/20 rounded-md px-3 py-2">{error}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setModalOpen(false)} className="btn-secondary">Cancelar</button>
            <button type="submit" className="btn-primary">{editing ? 'Guardar cambios' : 'Crear cliente'}</button>
          </div>
        </form>
      </Modal>

      <Modal open={!!confirmDelete} onClose={() => setConfirmDelete(null)} title="Eliminar cliente" width="max-w-sm">
        <p className="text-sm text-ink-secondary mb-4">¿Eliminar <span className="text-ink-primary font-medium">{confirmDelete?.name}</span>?</p>
        <div className="flex justify-end gap-2">
          <button onClick={() => setConfirmDelete(null)} className="btn-secondary">Cancelar</button>
          <button onClick={handleDelete} className="btn-danger">Eliminar</button>
        </div>
      </Modal>
    </AppLayout>
  )
}
