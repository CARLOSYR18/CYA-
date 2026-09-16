import { useEffect, useState } from 'react'
import { Plus, Pencil, Trash2, Warehouse, Mail, Phone } from 'lucide-react'
import AppLayout from '../components/layout/AppLayout'
import Modal from '../components/ui/Modal'
import EmptyState from '../components/ui/EmptyState'
import { suppliersService } from '../services/suppliersService'

const emptyForm = {name:'',ruc:'',contact_name:'',email:'',phone:'',address:''}

export default function Suppliers() {
  const [suppliers,setSuppliers]   = useState([])
  const [loading,setLoading]       = useState(true)
  const [modalOpen,setModalOpen]   = useState(false)
  const [editing,setEditing]       = useState(null)
  const [form,setForm]             = useState(emptyForm)
  const [error,setError]           = useState('')
  const [confirmDelete,setConfirmDelete] = useState(null)

  async function loadAll(){setLoading(true);setSuppliers(await suppliersService.list());setLoading(false)}
  useEffect(()=>{loadAll()},[])
  function openCreate(){setEditing(null);setForm(emptyForm);setError('');setModalOpen(true)}
  function openEdit(c){setEditing(c);setForm({name:c.name,ruc:c.ruc||'',contact_name:c.contact_name||'',email:c.email||'',phone:c.phone||'',address:c.address||''});setError('');setModalOpen(true)}
  async function handleSubmit(e){e.preventDefault();if(!form.name.trim()){setError('El nombre / razón social es obligatorio');return}try{if(editing)await suppliersService.update(editing.id,form);else await suppliersService.create(form);setModalOpen(false);loadAll()}catch(err){setError(err.message)}}
  async function handleDelete(){await suppliersService.remove(confirmDelete.id);setConfirmDelete(null);loadAll()}

  return (
    <AppLayout title="Proveedores">
      <div className="flex justify-end mb-5"><button onClick={openCreate} className="btn-primary w-full sm:w-auto justify-center"><Plus size={15}/> Nuevo proveedor</button></div>
      {loading
        ?<div className="flex items-center justify-center py-20"><div className="w-6 h-6 rounded-full border-2 border-brand border-t-transparent animate-spin"/></div>
        :suppliers.length===0
        ?<div className="card"><EmptyState icon={Warehouse} title="Sin proveedores" description="Registra tu primer proveedor para empezar a hacer pedidos."/></div>
        :(
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {suppliers.map(c=>(
            <div key={c.id} className="card card-hover p-5 group">
              <div className="flex items-start justify-between mb-3">
                <div className="min-w-0">
                  <p className="font-semibold text-ink-primary text-[14px] leading-tight">{c.name}</p>
                  {c.ruc&&<p className="text-[11px] font-mono text-ink-muted mt-0.5">RUC {c.ruc}</p>}
                </div>
                <div className="flex items-center gap-1 shrink-0 ml-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={()=>openEdit(c)} className="p-1.5 rounded-lg text-ink-muted hover:text-brand hover:bg-blue-50 transition-all"><Pencil size={14}/></button>
                  <button onClick={()=>setConfirmDelete(c)} className="p-1.5 rounded-lg text-ink-muted hover:text-bad hover:bg-red-50 transition-all"><Trash2 size={14}/></button>
                </div>
              </div>
              <div className="space-y-1.5 text-[12px] text-ink-secondary pt-3 border-t border-base-border">
                {c.contact_name&&<p>Contacto: <span className="text-ink-primary font-medium">{c.contact_name}</span></p>}
                {c.email&&<p className="flex items-center gap-1.5"><Mail size={11} className="text-ink-muted shrink-0"/><span className="truncate">{c.email}</span></p>}
                {c.phone&&<p className="flex items-center gap-1.5"><Phone size={11} className="text-ink-muted shrink-0"/>{c.phone}</p>}
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={modalOpen} onClose={()=>setModalOpen(false)} title={editing?'Editar proveedor':'Nuevo proveedor'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2"><label className="label">Nombre / Razón social</label><input className="field" value={form.name} onChange={e=>setForm({...form,name:e.target.value})} autoFocus/></div>
            <div><label className="label">RUC</label><input className="field font-mono" value={form.ruc} onChange={e=>setForm({...form,ruc:e.target.value})}/></div>
            <div><label className="label">Persona de contacto</label><input className="field" value={form.contact_name} onChange={e=>setForm({...form,contact_name:e.target.value})}/></div>
            <div><label className="label">Correo</label><input type="email" className="field" value={form.email} onChange={e=>setForm({...form,email:e.target.value})}/></div>
            <div><label className="label">Teléfono</label><input className="field" value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})}/></div>
            <div className="sm:col-span-2"><label className="label">Dirección</label><input className="field" value={form.address} onChange={e=>setForm({...form,address:e.target.value})}/></div>
          </div>
          {error&&<p className="text-sm text-bad bg-red-50 border border-red-200 rounded-xl px-4 py-2.5">{error}</p>}
          <div className="flex justify-end gap-2.5 pt-2"><button type="button" onClick={()=>setModalOpen(false)} className="btn-secondary">Cancelar</button><button type="submit" className="btn-primary">{editing?'Guardar cambios':'Crear proveedor'}</button></div>
        </form>
      </Modal>

      <Modal open={!!confirmDelete} onClose={()=>setConfirmDelete(null)} title="Eliminar proveedor" width="max-w-sm">
        <p className="text-sm text-ink-secondary mb-5">¿Eliminar <span className="font-semibold text-ink-primary">{confirmDelete?.name}</span>?</p>
        <div className="flex justify-end gap-2.5"><button onClick={()=>setConfirmDelete(null)} className="btn-secondary">Cancelar</button><button onClick={handleDelete} className="btn-danger">Eliminar</button></div>
      </Modal>
    </AppLayout>
  )
}
