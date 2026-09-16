import { useEffect, useMemo, useState } from 'react'
import { Plus, Trash2, Truck, CheckCircle2 } from 'lucide-react'
import AppLayout from '../components/layout/AppLayout'
import Modal from '../components/ui/Modal'
import EmptyState from '../components/ui/EmptyState'
import StatusBadge from '../components/ui/StatusBadge'
import { purchasesService } from '../services/purchasesService'
import { suppliersService } from '../services/suppliersService'
import { productsService } from '../services/productsService'
import { useAuth } from '../context/AuthContext'

const money = (n) => `S/ ${Number(n).toLocaleString('es-PE',{minimumFractionDigits:2,maximumFractionDigits:2})}`

export default function Purchases() {
  const { user } = useAuth()
  const [purchases,setPurchases] = useState([])
  const [suppliers,setSuppliers] = useState([])
  const [products,setProducts]   = useState([])
  const [loading,setLoading]     = useState(true)
  const [modalOpen,setModalOpen] = useState(false)
  const [supplierId,setSupplierId] = useState('')
  const [status,setStatus]       = useState('pendiente')
  const [items,setItems]         = useState([])
  const [error,setError]         = useState('')
  const [saving,setSaving]       = useState(false)
  const [viewing,setViewing]     = useState(null)

  async function loadAll(){setLoading(true);const[pu,su,pr]=await Promise.all([purchasesService.list(),suppliersService.list(),productsService.list()]);setPurchases(pu);setSuppliers(su);setProducts(pr);setLoading(false)}
  useEffect(()=>{loadAll()},[])

  function openCreate(){setSupplierId('');setStatus('pendiente');setItems([{product_id:'',quantity:1}]);setError('');setModalOpen(true)}
  function addItemRow(){setItems([...items,{product_id:'',quantity:1}])}
  function removeItemRow(idx){setItems(items.filter((_,i)=>i!==idx))}
  function updateItem(idx,patch){setItems(items.map((it,i)=>i===idx?{...it,...patch}:it))}

  const total=useMemo(()=>items.reduce((sum,it)=>{const p=products.find(p=>p.id===it.product_id);return sum+(p?p.cost_price*Number(it.quantity||0):0)},0),[items,products])

  async function handleSubmit(e){
    e.preventDefault();setError('')
    if(!supplierId){setError('Selecciona un proveedor');return}
    const validItems=items.filter(it=>it.product_id&&Number(it.quantity)>0)
    if(!validItems.length){setError('Agrega al menos un producto');return}
    setSaving(true)
    try{
      const pi=validItems.map(it=>{const p=products.find(p=>p.id===it.product_id);return{product_id:it.product_id,quantity:Number(it.quantity),unit_cost:p.cost_price}})
      await purchasesService.create({supplier_id:supplierId,user_id:user.id,status,items:pi})
      setModalOpen(false);loadAll()
    }catch(err){setError(err.message||'No se pudo registrar')}
    finally{setSaving(false)}
  }
  async function handleReceive(p){await purchasesService.markReceived(p);loadAll()}
  const supplierName=(id)=>suppliers.find(s=>s.id===id)?.name||'—'
  const productName=(id)=>products.find(p=>p.id===id)?.name||id
  const sorted=useMemo(()=>[...purchases].sort((a,b)=>new Date(b.created_at)-new Date(a.created_at)),[purchases])

  return (
    <AppLayout title="Compras">
      <div className="flex justify-end mb-5">
        <button onClick={openCreate} className="btn-primary w-full sm:w-auto justify-center"><Plus size={15}/> Nueva orden de compra</button>
      </div>
      <div className="card overflow-hidden">
        {loading
          ?<div className="flex items-center justify-center py-20"><div className="w-6 h-6 rounded-full border-2 border-brand border-t-transparent animate-spin"/></div>
          :sorted.length===0
          ?<EmptyState icon={Truck} title="Sin compras" description="Registra tu primera orden de compra a un proveedor."/>
          :(
          <>
            <div className="block sm:hidden divide-y divide-base-border/60">
              {sorted.map(p=>(
                <div key={p.id} className="p-4 space-y-2.5">
                  <div className="flex items-center justify-between gap-2"><span className="text-[11px] text-ink-muted">{new Date(p.created_at).toLocaleString('es-PE',{dateStyle:'short',timeStyle:'short'})}</span><StatusBadge status={p.status}/></div>
                  <div className="flex items-start justify-between gap-2">
                    <div onClick={()=>setViewing(p)} className="cursor-pointer flex-1">
                      <p className="font-semibold text-[13px]">{supplierName(p.supplier_id)}</p>
                      <p className="text-[11px] text-ink-secondary mt-0.5">{p.items.length} producto(s)</p>
                      <span className="text-[10px] text-brand font-bold">Ver detalle →</span>
                    </div>
                    <span className="font-mono font-bold text-[15px]">{money(purchasesService.purchaseTotal(p))}</span>
                  </div>
                  {p.status==='pendiente'&&<div className="pt-2 border-t border-base-border/40 flex justify-end"><button onClick={()=>handleReceive(p)} className="inline-flex items-center gap-1.5 text-xs text-emerald-600 font-bold bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-xl hover:bg-emerald-100 transition-all"><CheckCircle2 size={13}/> Marcar como recibido</button></div>}
                </div>
              ))}
            </div>
            <div className="overflow-x-auto hidden sm:block">
              <table className="w-full">
                <thead><tr><th className="th">Fecha</th><th className="th">Proveedor</th><th className="th">Items</th><th className="th">Total</th><th className="th">Estado</th><th className="th"/></tr></thead>
                <tbody>
                  {sorted.map(p=>(
                    <tr key={p.id} className="hover:bg-blue-50/30 transition-colors group">
                      <td className="td text-ink-secondary text-[12px] cursor-pointer" onClick={()=>setViewing(p)}>{new Date(p.created_at).toLocaleString('es-PE')}</td>
                      <td className="td font-medium text-[13px] cursor-pointer" onClick={()=>setViewing(p)}>{supplierName(p.supplier_id)}</td>
                      <td className="td text-ink-secondary text-[13px] cursor-pointer" onClick={()=>setViewing(p)}>{p.items.length} producto(s)</td>
                      <td className="td font-mono font-semibold text-[13px] cursor-pointer" onClick={()=>setViewing(p)}>{money(purchasesService.purchaseTotal(p))}</td>
                      <td className="td"><StatusBadge status={p.status}/></td>
                      <td className="td">{p.status==='pendiente'&&<button onClick={()=>handleReceive(p)} className="inline-flex items-center gap-1.5 text-xs text-emerald-600 font-semibold hover:underline bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200 hover:bg-emerald-100 transition-all"><CheckCircle2 size={13}/> Recibido</button>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      <Modal open={modalOpen} onClose={()=>setModalOpen(false)} title="Nueva orden de compra" width="max-w-2xl">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div><label className="label">Proveedor</label>
              <select className="field" value={supplierId} onChange={e=>setSupplierId(e.target.value)}>
                <option value="">Selecciona un proveedor</option>
                {suppliers.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div><label className="label">Estado</label>
              <select className="field" value={status} onChange={e=>setStatus(e.target.value)}>
                <option value="pendiente">Pendiente</option><option value="recibido">Recibido (ingresa stock ahora)</option>
              </select>
            </div>
          </div>
          <div>
            <div className="flex items-center justify-between mb-2"><label className="label mb-0">Productos</label><button type="button" onClick={addItemRow} className="text-xs text-brand hover:underline font-bold flex items-center gap-1"><Plus size={13}/>Agregar</button></div>
            <div className="space-y-2">
              {items.map((it,idx)=>{const p=products.find(p=>p.id===it.product_id);return(
                <div key={idx} className="flex flex-col sm:flex-row sm:items-center gap-2 bg-base-raised p-3 sm:p-0 rounded-xl sm:rounded-none border sm:border-0 border-base-border">
                  <select className="field flex-1" value={it.product_id} onChange={e=>updateItem(idx,{product_id:e.target.value})}>
                    <option value="">Selecciona un producto</option>
                    {products.map(p=><option key={p.id} value={p.id}>{p.sku} — {p.name}</option>)}
                  </select>
                  <div className="flex items-center gap-2">
                    <input type="number" min="1" className="field w-24 text-center" value={it.quantity} onChange={e=>updateItem(idx,{quantity:e.target.value})}/>
                    <span className="w-24 text-sm font-mono text-ink-secondary text-right">{p?money(p.cost_price*(it.quantity||0)):'—'}</span>
                    <button type="button" onClick={()=>removeItemRow(idx)} className="p-1.5 text-ink-muted hover:text-bad rounded-lg hover:bg-red-50 transition-all"><Trash2 size={15}/></button>
                  </div>
                </div>
              )})}
            </div>
          </div>
          <div className="flex justify-end items-center gap-2 border-t border-base-border pt-4"><span className="text-sm text-ink-secondary">Total:</span><span className="text-lg font-display font-bold">{money(total)}</span></div>
          {error&&<p className="text-sm text-bad bg-red-50 border border-red-200 rounded-xl px-4 py-2.5">{error}</p>}
          <div className="flex justify-end gap-2.5 pt-2"><button type="button" onClick={()=>setModalOpen(false)} className="btn-secondary">Cancelar</button><button type="submit" disabled={saving} className="btn-primary">Registrar orden</button></div>
        </form>
      </Modal>

      <Modal open={!!viewing} onClose={()=>setViewing(null)} title="Detalle de compra" width="max-w-lg">
        {viewing&&(
          <div className="space-y-4">
            <div className="flex justify-between text-sm">
              <div><p className="text-ink-muted text-[11px] uppercase font-bold tracking-wider">Proveedor</p><p className="font-semibold mt-0.5">{supplierName(viewing.supplier_id)}</p></div>
              <div className="text-right"><p className="text-ink-muted text-[11px] uppercase font-bold tracking-wider">Fecha</p><p className="mt-0.5">{new Date(viewing.created_at).toLocaleString('es-PE')}</p></div>
            </div>
            <table className="w-full text-sm">
              <thead><tr><th className="th">Producto</th><th className="th">Cant.</th><th className="th">Costo</th><th className="th">Subtotal</th></tr></thead>
              <tbody>{viewing.items.map((it,i)=><tr key={i} className="hover:bg-blue-50/30 transition-colors"><td className="td text-[13px]">{productName(it.product_id)}</td><td className="td font-mono text-[13px]">{it.quantity}</td><td className="td font-mono text-[13px]">{money(it.unit_cost)}</td><td className="td font-mono font-bold text-[13px]">{money(it.unit_cost*it.quantity)}</td></tr>)}</tbody>
            </table>
            <div className="flex justify-between items-center pt-1"><StatusBadge status={viewing.status}/><p className="font-display font-bold text-xl">{money(purchasesService.purchaseTotal(viewing))}</p></div>
          </div>
        )}
      </Modal>
    </AppLayout>
  )
}
