import { useEffect, useState } from 'react'
import { Plus, Pencil, Trash2, Tags } from 'lucide-react'
import AppLayout from '../components/layout/AppLayout'
import Modal from '../components/ui/Modal'
import EmptyState from '../components/ui/EmptyState'
import { categoriesService } from '../services/categoriesService'
import { productsService } from '../services/productsService'

const emptyForm = {name:'',description:''}

export default function Categories() {
  const [categories,setCategories] = useState([])
  const [products,setProducts]     = useState([])
  const [loading,setLoading]       = useState(true)
  const [modalOpen,setModalOpen]   = useState(false)
  const [editing,setEditing]       = useState(null)
  const [form,setForm]             = useState(emptyForm)
  const [error,setError]           = useState('')
  const [confirmDelete,setConfirmDelete] = useState(null)

  async function loadAll(){setLoading(true);const[c,p]=await Promise.all([categoriesService.list(),productsService.list()]);setCategories(c);setProducts(p);setLoading(false)}
  useEffect(()=>{loadAll()},[])
  function openCreate(){setEditing(null);setForm(emptyForm);setError('');setModalOpen(true)}
  function openEdit(c){setEditing(c);setForm({name:c.name,description:c.description||''});setError('');setModalOpen(true)}
  async function handleSubmit(e){e.preventDefault();if(!form.name.trim()){setError('El nombre es obligatorio');return}try{if(editing)await categoriesService.update(editing.id,form);else await categoriesService.create(form);setModalOpen(false);loadAll()}catch(err){setError(err.message)}}
  async function handleDelete(){await categoriesService.remove(confirmDelete.id);setConfirmDelete(null);loadAll()}
  const productCount=(cid)=>products.filter(p=>p.category_id===cid).length

  return (
    <AppLayout title="Categorías">
      <div className="flex justify-end mb-5"><button onClick={openCreate} className="btn-primary w-full sm:w-auto justify-center"><Plus size={15}/> Nueva categoría</button></div>
      <div className="card overflow-hidden">
        {loading
          ?<div className="flex items-center justify-center py-20"><div className="w-6 h-6 rounded-full border-2 border-brand border-t-transparent animate-spin"/></div>
          :categories.length===0
          ?<EmptyState icon={Tags} title="Sin categorías" description="Crea categorías para organizar tus productos."/>
          :(
          <>
            <div className="block sm:hidden divide-y divide-base-border/60">
              {categories.map(c=>(
                <div key={c.id} className="p-4 flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-ink-primary text-[13px]">{c.name}</p>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-base-raised border border-base-border text-ink-secondary">{productCount(c.id)} {productCount(c.id)===1?'prod.':'prods.'}</span>
                    </div>
                    {c.description&&<p className="text-[12px] text-ink-secondary mt-1">{c.description}</p>}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button onClick={()=>openEdit(c)} className="p-1.5 rounded-lg text-ink-muted hover:text-brand hover:bg-blue-50 transition-all"><Pencil size={14}/></button>
                    <button onClick={()=>setConfirmDelete(c)} className="p-1.5 rounded-lg text-ink-muted hover:text-bad hover:bg-red-50 transition-all"><Trash2 size={14}/></button>
                  </div>
                </div>
              ))}
            </div>
            <div className="overflow-x-auto hidden sm:block">
              <table className="w-full">
                <thead><tr><th className="th">Nombre</th><th className="th">Descripción</th><th className="th">Productos</th><th className="th"/></tr></thead>
                <tbody>
                  {categories.map(c=>(
                    <tr key={c.id} className="hover:bg-blue-50/30 transition-colors group">
                      <td className="td font-semibold text-[13px]">{c.name}</td>
                      <td className="td text-ink-secondary text-[13px]">{c.description||'—'}</td>
                      <td className="td"><span className="font-mono text-[12px] bg-base-raised border border-base-border text-ink-secondary px-2 py-0.5 rounded-lg">{productCount(c.id)}</span></td>
                      <td className="td"><div className="flex items-center gap-1 justify-end opacity-0 group-hover:opacity-100 transition-opacity"><button onClick={()=>openEdit(c)} className="p-1.5 rounded-lg text-ink-muted hover:text-brand hover:bg-blue-50 transition-all"><Pencil size={14}/></button><button onClick={()=>setConfirmDelete(c)} className="p-1.5 rounded-lg text-ink-muted hover:text-bad hover:bg-red-50 transition-all"><Trash2 size={14}/></button></div></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      <Modal open={modalOpen} onClose={()=>setModalOpen(false)} title={editing?'Editar categoría':'Nueva categoría'} width="max-w-sm">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div><label className="label">Nombre</label><input className="field" value={form.name} onChange={e=>setForm({...form,name:e.target.value})} autoFocus/></div>
          <div><label className="label">Descripción</label><textarea className="field" rows={2} value={form.description} onChange={e=>setForm({...form,description:e.target.value})}/></div>
          {error&&<p className="text-sm text-bad bg-red-50 border border-red-200 rounded-xl px-4 py-2.5">{error}</p>}
          <div className="flex justify-end gap-2.5 pt-2"><button type="button" onClick={()=>setModalOpen(false)} className="btn-secondary">Cancelar</button><button type="submit" className="btn-primary">{editing?'Guardar cambios':'Crear'}</button></div>
        </form>
      </Modal>

      <Modal open={!!confirmDelete} onClose={()=>setConfirmDelete(null)} title="Eliminar categoría" width="max-w-sm">
        <p className="text-sm text-ink-secondary mb-5">¿Eliminar <span className="font-semibold text-ink-primary">{confirmDelete?.name}</span>?</p>
        <div className="flex justify-end gap-2.5"><button onClick={()=>setConfirmDelete(null)} className="btn-secondary">Cancelar</button><button onClick={handleDelete} className="btn-danger">Eliminar</button></div>
      </Modal>
    </AppLayout>
  )
}
