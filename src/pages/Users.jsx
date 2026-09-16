import { useEffect, useState } from 'react'
import { Plus, Pencil, UserCog, ShieldCheck, ToggleLeft, ToggleRight } from 'lucide-react'
import AppLayout from '../components/layout/AppLayout'
import Modal from '../components/ui/Modal'
import EmptyState from '../components/ui/EmptyState'
import { usersService } from '../services/usersService'
import { isSupabaseConfigured } from '../lib/supabaseClient'

const emptyForm = { full_name: '', email: '', password: '', role: 'empleado' }

export default function Users() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [error, setError] = useState('')

  async function loadAll() { setLoading(true); setUsers(await usersService.list()); setLoading(false) }
  useEffect(() => { loadAll() }, [])

  function openCreate() { setEditing(null); setForm(emptyForm); setError(''); setModalOpen(true) }
  function openEdit(u) { setEditing(u); setForm({ full_name: u.full_name, email: u.email, password: '', role: u.role }); setError(''); setModalOpen(true) }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (!form.full_name.trim() || !form.email.trim()) { setError('Nombre y correo son obligatorios'); return }
    if (!editing && !isSupabaseConfigured && !form.password.trim()) { setError('La contraseña es obligatoria'); return }

    try {
      if (editing) {
        const patch = { full_name: form.full_name, email: form.email, role: form.role }
        if (form.password.trim()) patch.password = form.password
        await usersService.update(editing.id, patch)
      } else {
        if (isSupabaseConfigured) {
          setError('Con Supabase conectado, crea usuarios desde Authentication → Users y luego asígnales un rol aquí.')
          return
        }
        await usersService.create({ full_name: form.full_name, email: form.email, password: form.password, role: form.role, active: true })
      }
      setModalOpen(false)
      loadAll()
    } catch (err) {
      setError(err.message)
    }
  }

  async function toggleActive(u) {
    await usersService.update(u.id, { active: !u.active })
    loadAll()
  }

  return (
    <AppLayout title="Usuarios y roles">
      <div className="flex justify-end mb-5">
        <button onClick={openCreate} className="btn-primary w-full sm:w-auto justify-center">
          <Plus size={16} /> Nuevo usuario
        </button>
      </div>

      <div className="card overflow-hidden">
        {loading ? (
          <p className="text-sm text-ink-muted p-8 text-center">Cargando…</p>
        ) : users.length === 0 ? (
          <EmptyState icon={UserCog} title="Sin usuarios" />
        ) : (
          <>
            {/* Mobile Cards View */}
            <div className="block sm:hidden divide-y divide-base-border">
              {users.map((u) => (
                <div key={u.id} className="p-4 space-y-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold text-ink-primary text-sm">{u.full_name}</p>
                      <p className="text-xs text-ink-secondary">{u.email}</p>
                    </div>
                    <button
                      onClick={() => openEdit(u)}
                      className="p-1.5 rounded-lg text-ink-muted hover:text-brand hover:bg-brand-dim transition-colors"
                      title="Editar usuario"
                    >
                      <Pencil size={15} />
                    </button>
                  </div>
                  <div className="flex items-center justify-between pt-1 border-t border-base-border/50 text-xs">
                    <span className={`inline-flex items-center gap-1.5 font-medium ${u.role === 'admin' ? 'text-brand' : 'text-ink-secondary'}`}>
                      {u.role === 'admin' && <ShieldCheck size={13} />}
                      {u.role === 'admin' ? 'Administrador' : 'Empleado'}
                    </span>
                    <button onClick={() => toggleActive(u)} className="inline-flex items-center gap-1.5 py-1 px-2 rounded-md hover:bg-slate-100 transition-colors">
                      {u.active !== false ? (
                        <><ToggleRight size={18} className="text-good" /> <span className="text-good font-medium">Activo</span></>
                      ) : (
                        <><ToggleLeft size={18} className="text-ink-muted" /> <span className="text-ink-muted font-medium">Inactivo</span></>
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop Table View */}
            <div className="overflow-x-auto hidden sm:block">
              <table className="w-full">
                <thead>
                  <tr>
                    <th className="th">Nombre</th>
                    <th className="th">Correo</th>
                    <th className="th">Rol</th>
                    <th className="th">Estado</th>
                    <th className="th"></th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id} className="hover:bg-base-raised/50">
                      <td className="td font-medium">{u.full_name}</td>
                      <td className="td text-ink-secondary">{u.email}</td>
                      <td className="td">
                        <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${u.role === 'admin' ? 'text-brand-hover' : 'text-ink-secondary'}`}>
                          {u.role === 'admin' && <ShieldCheck size={13} />}
                          {u.role === 'admin' ? 'Administrador' : 'Empleado'}
                        </span>
                      </td>
                      <td className="td">
                        <button onClick={() => toggleActive(u)} className="inline-flex items-center gap-1.5 text-xs">
                          {u.active !== false ? (
                            <><ToggleRight size={18} className="text-good" /> <span className="text-good">Activo</span></>
                          ) : (
                            <><ToggleLeft size={18} className="text-ink-muted" /> <span className="text-ink-muted">Inactivo</span></>
                          )}
                        </button>
                      </td>
                      <td className="td">
                        <button onClick={() => openEdit(u)} className="p-1.5 rounded-md text-ink-muted hover:text-brand hover:bg-brand-dim transition-colors"><Pencil size={15} /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Editar usuario' : 'Nuevo usuario'} width="max-w-sm">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">Nombre completo</label>
            <input className="field" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} autoFocus />
          </div>
          <div>
            <label className="label">Correo electrónico</label>
            <input type="email" className="field" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} disabled={isSupabaseConfigured && !!editing} />
          </div>
          {!isSupabaseConfigured && (
            <div>
              <label className="label">{editing ? 'Nueva contraseña (opcional)' : 'Contraseña'}</label>
              <input type="password" className="field" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
            </div>
          )}
          <div>
            <label className="label">Rol</label>
            <select className="field" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
              <option value="empleado">Empleado</option>
              <option value="admin">Administrador</option>
            </select>
          </div>
          {error && <p className="text-sm text-bad bg-bad-dim border border-bad/20 rounded-md px-3 py-2">{error}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setModalOpen(false)} className="btn-secondary">Cancelar</button>
            <button type="submit" className="btn-primary">{editing ? 'Guardar cambios' : 'Crear usuario'}</button>
          </div>
        </form>
      </Modal>
    </AppLayout>
  )
}
