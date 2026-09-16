import { useEffect, useMemo, useState } from 'react'
import { Plus, Pencil, ArrowDownCircle, ArrowUpCircle, ArrowLeftRight, Trash2 } from 'lucide-react'
import AppLayout from '../components/layout/AppLayout'
import Modal from '../components/ui/Modal'
import EmptyState from '../components/ui/EmptyState'
import { inventoryMovementsService } from '../services/inventoryMovementsService'
import { productsService } from '../services/productsService'

const emptyForm = {product_id:'',type:'entrada',quantity:'',reason:'',reference:''}

const TypeBadge = ({type}) => type==='entrada'
  ?<span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200"><ArrowDownCircle size={11}/> Entrada</span>
  :<span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-red-50 text-red-700 border border-red-200"><ArrowUpCircle size={11}/> Salida</span>

export default function InventoryMovements() {
  const [movements,setMovements] = useState([])
  const [products,setProducts]   = useState([])
  const [loading,setLoading]     = useState(true)
  const [modalOpen,setModalOpen] = useState(false)
  const [form,setForm]           = useState(emptyForm)
  const [error,setError]         = useState('')
  const [saving,setSaving]       = useState(false)
  const [editing,setEditing]     = useState(null)
  const [confirmDelete,setConfirmDelete] = useState(null)

  async function loadAll(){setLoading(true);const[m,p]=await Promise.all([inventoryMovementsService.list(),productsService.list()]);setMovements(m);setProducts(p);setLoading(false)}
  useEffect(()=>{loadAll()},[])

  function openCreate(){setEditing(null);setForm(emptyForm);setError('');setModalOpen(true)}
  function openEdit(m){setEditing(m);setForm({product_id:m.product_id,type:m.type,quantity:String(m.quantity),reason:m.reason||'',reference:m.reference||''});setError('');setModalOpen(true)}

  async function handleSubmit(e){
    e.preventDefault();setError('')
    if(!form.product_id){setError('Selecciona un producto');return}
    const qty=Number(form.quantity);if(!qty||qty<=0){setError('La cantidad debe ser mayor a 0');return}
    setSaving(true)
    try{
      const payload={product_id:form.product_id,type:form.type,quantity:qty,reason:form.reason||(form.type==='entrada'?'Ingreso manual':'Salida manual'),reference:form.reference}
      if(editing)await inventoryMovementsService.update(editing,payload)
      else await inventoryMovementsService.register(payload)
      setModalOpen(false);loadAll()
    }catch(err){setError(err.message||'No se pudo guardar')}
    finally{setSaving(false)}
  }

  async function handleDelete(){try{await inventoryMovementsService.remove(confirmDelete)}catch{}setConfirmDelete(null);loadAll()}
  const productName=(id)=>products.find(p=>p.id===id)?.name||'—'
  const productSku=(id)=>products.find(p=>p.id===id)?.sku||''
  const sorted=useMemo(()=>[...movements].sort((a,b)=>new Date(b.created_at)-new Date(a.created_at)),[movements])

  return (
    <AppLayout title="Movimientos de inventario">
      <div className="flex justify-end mb-5">
        <button onClick={openCreate} className="btn-primary w-full sm:w-auto justify-center"><Plus size={15}/> Registrar movimiento</button>
      </div>
      <div className="card overflow-hidden">
        {loading
          ?<div className="flex items-center justify-center py-20"><div className="w-6 h-6 rounded-full border-2 border-brand border-t-transparent animate-spin"/></div>
          :sorted.length===0
          ?<EmptyState icon={ArrowLeftRight} title="Sin movimientos" description="Los ingresos y salidas de stock aparecerán aquí."/>
          :(
          <>
            <div className="block sm:hidden divide-y divide-base-border/60">
              {sorted.map(m=>(
                <div key={m.id} className="p-4 space-y-2.5">
                  <div className="flex items-center justify-between gap-2"><TypeBadge type={m.type}/><span className="text-[11px] text-ink-muted">{new Date(m.created_at).toLocaleString('es-PE',{dateStyle:'short',timeStyle:'short'})}</span></div>
                  <div className="flex items-start justify-between gap-2">
                    <div><p className="font-semibold text-[13px] leading-snug">{productName(m.product_id)}</p><p className="font-mono text-[11px] text-ink-muted">{productSku(m.product_id)}</p></div>
                    <span className={`font-mono font-bold text-[15px] ${m.type==='entrada'?'text-emerald-600':'text-red-600'}`}>{m.type==='entrada'?`+${m.quantity}`:`-${m.quantity}`}</span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] pt-1 border-t border-base-border/40 text-ink-secondary">
                    <span className="truncate max-w-[180px]">{m.reason||'Sin motivo'}</span>
                    <div className="flex items-center gap-1 shrink-0">
                      {m.reference&&<span className="font-mono text-ink-muted mr-1">#{m.reference}</span>}
                      <button onClick={()=>openEdit(m)} className="p-1.5 rounded-lg text-ink-muted hover:text-brand hover:bg-blue-50 transition-all"><Pencil size={13}/></button>
                      <button onClick={()=>setConfirmDelete(m)} className="p-1.5 rounded-lg text-ink-muted hover:text-bad hover:bg-red-50 transition-all"><Trash2 size={13}/></button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="overflow-x-auto hidden sm:block">
              <table className="w-full">
                <thead><tr><th className="th">Fecha</th><th className="th">Producto</th><th className="th">Tipo</th><th className="th">Cantidad</th><th className="th">Motivo</th><th className="th">Referencia</th><th className="th"/></tr></thead>
                <tbody>
                  {sorted.map(m=>(
                    <tr key={m.id} className="hover:bg-blue-50/30 transition-colors group">
                      <td className="td text-ink-secondary text-[12px]">{new Date(m.created_at).toLocaleString('es-PE')}</td>
                      <td className="td"><span className="font-medium text-[13px]">{productName(m.product_id)}</span><span className="block font-mono text-[11px] text-ink-muted">{productSku(m.product_id)}</span></td>
                      <td className="td"><TypeBadge type={m.type}/></td>
                      <td className={`td font-mono font-bold text-[13px] ${m.type==='entrada'?'text-emerald-600':'text-red-600'}`}>{m.type==='entrada'?`+${m.quantity}`:`-${m.quantity}`}</td>
                      <td className="td text-ink-secondary text-[13px]">{m.reason}</td>
                      <td className="td font-mono text-[11px] text-ink-muted">{m.reference||'—'}</td>
                      <td className="td"><div className="flex items-center gap-1 justify-end opacity-0 group-hover:opacity-100 transition-opacity"><button onClick={()=>openEdit(m)} className="p-1.5 rounded-lg text-ink-muted hover:text-brand hover:bg-blue-50 transition-all"><Pencil size={14}/></button><button onClick={()=>setConfirmDelete(m)} className="p-1.5 rounded-lg text-ink-muted hover:text-bad hover:bg-red-50 transition-all"><Trash2 size={14}/></button></div></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      <Modal open={modalOpen} onClose={()=>setModalOpen(false)} title={editing?'Editar movimiento':'Registrar movimiento'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div><label className="label">Producto</label>
            <select className="field" value={form.product_id} onChange={e=>setForm({...form,product_id:e.target.value})}>
              <option value="">Selecciona un producto</option>
              {products.filter(p=>!p.is_kit).map(p=><option key={p.id} value={p.id}>{p.sku} — {p.name} (stock: {p.stock})</option>)}
            </select>
            <p className="text-[11px] text-ink-muted mt-1">Los combos no se ajustan aquí — ajusta el producto base directamente.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div><label className="label">Tipo</label>
              <div className="grid grid-cols-2 gap-2">
                <button type="button" onClick={()=>setForm({...form,type:'entrada'})}
                  className={`px-3 py-2.5 rounded-xl text-sm font-semibold border transition-all ${form.type==='entrada'?'bg-emerald-50 text-emerald-700 border-emerald-300':'bg-white text-ink-secondary border-base-border hover:border-base-borderLight'}`}>Entrada</button>
                <button type="button" onClick={()=>setForm({...form,type:'salida'})}
                  className={`px-3 py-2.5 rounded-xl text-sm font-semibold border transition-all ${form.type==='salida'?'bg-red-50 text-red-700 border-red-300':'bg-white text-ink-secondary border-base-border hover:border-base-borderLight'}`}>Salida</button>
              </div>
            </div>
            <div><label className="label">Cantidad</label><input type="number" min="1" className="field" value={form.quantity} onChange={e=>setForm({...form,quantity:e.target.value})}/></div>
          </div>
          <div><label className="label">Motivo</label><input className="field" placeholder="Ej. Ajuste de inventario, merma…" value={form.reason} onChange={e=>setForm({...form,reason:e.target.value})}/></div>
          <div><label className="label">Referencia (opcional)</label><input className="field" placeholder="N° de documento" value={form.reference} onChange={e=>setForm({...form,reference:e.target.value})}/></div>
          {error&&<p className="text-sm text-bad bg-red-50 border border-red-200 rounded-xl px-4 py-2.5">{error}</p>}
          <div className="flex justify-end gap-2.5 pt-2"><button type="button" onClick={()=>setModalOpen(false)} className="btn-secondary">Cancelar</button><button type="submit" disabled={saving} className="btn-primary">{saving?'Guardando…':editing?'Guardar cambios':'Registrar'}</button></div>
        </form>
      </Modal>

      <Modal open={!!confirmDelete} onClose={()=>setConfirmDelete(null)} title="Eliminar movimiento" width="max-w-sm">
        {confirmDelete&&(
          <div className="space-y-4">
            <div className="bg-base-raised rounded-xl px-4 py-3 space-y-2 text-sm border border-base-border">
              <div className="flex justify-between"><span className="text-ink-muted">Producto</span><span className="font-medium">{productName(confirmDelete.product_id)}</span></div>
              <div className="flex justify-between"><span className="text-ink-muted">Tipo</span><TypeBadge type={confirmDelete.type}/></div>
              <div className="flex justify-between"><span className="text-ink-muted">Cantidad</span><span className="font-mono font-bold">{confirmDelete.quantity}</span></div>
            </div>
            <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-4 py-2.5">⚠️ Esta acción también <strong>revertirá el stock</strong> del producto.</p>
            <div className="flex justify-end gap-2.5"><button onClick={()=>setConfirmDelete(null)} className="btn-secondary">Cancelar</button><button onClick={handleDelete} className="btn-danger">Eliminar y revertir</button></div>
          </div>
        )}
      </Modal>
    </AppLayout>
  )
}
