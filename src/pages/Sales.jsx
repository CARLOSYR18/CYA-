import { useEffect, useMemo, useState } from 'react'
import { Plus, Trash2, ShoppingCart } from 'lucide-react'
import AppLayout from '../components/layout/AppLayout'
import Modal from '../components/ui/Modal'
import EmptyState from '../components/ui/EmptyState'
import StatusBadge from '../components/ui/StatusBadge'
import Receipt from '../components/Receipt'
import { salesService } from '../services/salesService'
import { productsService } from '../services/productsService'
import { clientsService } from '../services/clientsService'
import { companySettingsService } from '../services/companySettingsService'
import { useAuth } from '../context/AuthContext'

const money = (n) => `S/ ${Number(n).toLocaleString('es-PE',{minimumFractionDigits:2,maximumFractionDigits:2})}`

export default function Sales() {
  const { user } = useAuth()
  const [sales,setSales]       = useState([])
  const [products,setProducts] = useState([])
  const [clients,setClients]   = useState([])
  const [company,setCompany]   = useState(null)
  const [loading,setLoading]   = useState(true)
  const [modalOpen,setModalOpen] = useState(false)
  const [clientName,setClientName] = useState('')
  const [clientPhone,setClientPhone] = useState('')
  const [status,setStatus]     = useState('pagado')
  const [discount,setDiscount] = useState('')
  const [items,setItems]       = useState([])
  const [error,setError]       = useState('')
  const [saving,setSaving]     = useState(false)
  const [viewing,setViewing]   = useState(null)

  async function loadAll() {
    setLoading(true)
    try {
      const [s,p,c,comp] = await Promise.all([salesService.list(),productsService.list(),clientsService.list(),companySettingsService.get()])
      setSales(s||[]);setProducts(p||[]);setClients(c||[]);setCompany(comp||null)
    } finally { setLoading(false) }
  }
  useEffect(()=>{loadAll()},[])

  function openCreate(){setClientName('');setClientPhone('');setStatus('pagado');setDiscount('');setItems([{product_id:'',quantity:1}]);setError('');setModalOpen(true)}
  function addItemRow(){setItems([...items,{product_id:'',quantity:1}])}
  function removeItemRow(idx){setItems(items.filter((_,i)=>i!==idx))}
  function updateItem(idx,patch){setItems(items.map((it,i)=>i===idx?{...it,...patch}:it))}

  const subtotal=useMemo(()=>items.reduce((sum,it)=>{const p=products.find(p=>p.id===it.product_id);return sum+(p?p.sale_price*Number(it.quantity||0):0)},0),[items,products])
  const total=useMemo(()=>Math.max(subtotal-(Number(discount)||0),0),[subtotal,discount])

  async function handleSubmit(e){
    e.preventDefault();setError('')
    if(!clientName.trim()){setError('El nombre del cliente es obligatorio');return}
    const validItems=items.filter(it=>it.product_id&&Number(it.quantity)>0)
    if(!validItems.length){setError('Agrega al menos un producto');return}
    for(const it of validItems){const p=products.find(p=>p.id===it.product_id);if(p&&Number(it.quantity)>p.stock){setError(`Stock insuficiente para "${p.name}" (disponible: ${p.stock})`);return}}
    setSaving(true)
    try{
      const saleItems=validItems.map(it=>{const p=products.find(p=>p.id===it.product_id);return{product_id:it.product_id,quantity:Number(it.quantity),unit_price:p.sale_price}})
      const result=await salesService.create({client_name:clientName.trim(),client_phone:clientPhone.trim()||undefined,user_id:user.id,status,items:saleItems,discount:Number(discount)||0})
      setModalOpen(false);await loadAll();setViewing(result)
    }catch(err){setError(err.message||'No se pudo registrar la venta')}
    finally{setSaving(false)}
  }

  const getClientLabel=(sale)=>sale.client?.name||sale.client_name||clients.find(c=>c.id===sale.client_id)?.name||'—'
  const sorted=useMemo(()=>[...sales].sort((a,b)=>new Date(b.created_at)-new Date(a.created_at)),[sales])

  return (
    <AppLayout title="Ventas">
      <div className="flex justify-end mb-5">
        <button onClick={openCreate} className="btn-primary w-full sm:w-auto justify-center"><Plus size={15}/> Nueva venta</button>
      </div>
      <div className="card overflow-hidden">
        {loading
          ?<div className="flex items-center justify-center py-20"><div className="w-6 h-6 rounded-full border-2 border-brand border-t-transparent animate-spin"/></div>
          :sorted.length===0
          ?<EmptyState icon={ShoppingCart} title="Sin ventas" description="Registra tu primera venta para verla aquí."/>
          :(
          <>
            <div className="block sm:hidden divide-y divide-base-border/60">
              {sorted.map(s=>(
                <div key={s.id} onClick={()=>setViewing(s)} className="p-4 space-y-2.5 hover:bg-blue-50/30 active:bg-blue-50 cursor-pointer transition-colors">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] text-ink-muted">{new Date(s.created_at).toLocaleString('es-PE',{dateStyle:'short',timeStyle:'short'})}</span>
                    <StatusBadge status={s.status}/>
                  </div>
                  <div className="flex items-start justify-between gap-2">
                    <div><p className="font-semibold text-ink-primary text-[13px]">{getClientLabel(s)}</p><p className="text-[11px] text-ink-secondary mt-0.5">{s.items.length} producto(s)</p></div>
                    <div className="text-right"><span className="font-display font-bold text-[15px]">{money(salesService.saleTotal(s))}</span><span className="block text-[10px] text-brand font-bold mt-0.5">Ver boleta →</span></div>
                  </div>
                </div>
              ))}
            </div>
            <div className="overflow-x-auto hidden sm:block">
              <table className="w-full">
                <thead><tr><th className="th">Fecha</th><th className="th">Cliente</th><th className="th">Items</th><th className="th">Total</th><th className="th">Estado</th></tr></thead>
                <tbody>
                  {sorted.map(s=>(
                    <tr key={s.id} className="hover:bg-blue-50/30 cursor-pointer transition-colors" onClick={()=>setViewing(s)}>
                      <td className="td text-ink-secondary text-[12px]">{new Date(s.created_at).toLocaleString('es-PE')}</td>
                      <td className="td font-medium text-[13px]">{getClientLabel(s)}</td>
                      <td className="td text-ink-secondary text-[13px]">{s.items.length} producto(s)</td>
                      <td className="td font-mono font-semibold text-[13px]">{money(salesService.saleTotal(s))}</td>
                      <td className="td"><StatusBadge status={s.status}/></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      <Modal open={modalOpen} onClose={()=>setModalOpen(false)} title="Nueva venta" width="max-w-2xl">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div><label className="label">Nombre del cliente <span className="text-bad normal-case font-normal">*</span></label><input className="field" placeholder="Ej. Juan Pérez" value={clientName} onChange={e=>setClientName(e.target.value)} autoFocus/></div>
            <div><label className="label">Teléfono / DNI</label><input className="field" placeholder="987 654 321" value={clientPhone} onChange={e=>setClientPhone(e.target.value)}/></div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div><label className="label">Estado</label>
              <select className="field" value={status} onChange={e=>setStatus(e.target.value)}>
                <option value="pagado">Pagado</option><option value="pendiente">Pendiente</option>
              </select>
            </div>
            <div><label className="label">Descuento en S/</label><input type="number" min="0" step="0.01" className="field" placeholder="0.00" value={discount} onChange={e=>setDiscount(e.target.value)}/></div>
          </div>
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="label mb-0">Productos</label>
              <button type="button" onClick={addItemRow} className="text-xs text-brand hover:underline font-bold flex items-center gap-1"><Plus size={13}/>Agregar</button>
            </div>
            <div className="space-y-2">
              {items.map((it,idx)=>{const p=products.find(p=>p.id===it.product_id);return(
                <div key={idx} className="flex flex-col sm:flex-row sm:items-center gap-2 bg-base-raised p-3 sm:p-0 rounded-xl sm:rounded-none border sm:border-0 border-base-border">
                  <select className="field flex-1" value={it.product_id} onChange={e=>updateItem(idx,{product_id:e.target.value})}>
                    <option value="">Selecciona un producto</option>
                    {products.map(p=><option key={p.id} value={p.id}>{p.sku} — {p.name} (stock: {p.stock})</option>)}
                  </select>
                  <div className="flex items-center justify-between sm:justify-start gap-2">
                    <input type="number" min="1" className="field w-20 sm:w-24 text-center" value={it.quantity} onChange={e=>updateItem(idx,{quantity:e.target.value})}/>
                    <span className="w-24 text-sm font-mono text-ink-secondary text-right">{p?money(p.sale_price*(it.quantity||0)):'—'}</span>
                    <button type="button" onClick={()=>removeItemRow(idx)} className="p-1.5 text-ink-muted hover:text-bad rounded-lg hover:bg-red-50 transition-all ml-auto sm:ml-0"><Trash2 size={15}/></button>
                  </div>
                </div>
              )})}
            </div>
          </div>
          <div className="border-t border-base-border pt-4 space-y-1.5">
            <div className="flex justify-end items-center gap-3 text-sm"><span className="text-ink-muted">Subtotal:</span><span className="font-mono text-ink-secondary w-28 text-right">{money(subtotal)}</span></div>
            {Number(discount)>0&&<div className="flex justify-end items-center gap-3 text-sm"><span className="text-amber">Descuento:</span><span className="font-mono text-amber w-28 text-right">-{money(Number(discount))}</span></div>}
            <div className="flex justify-end items-center gap-3"><span className="text-sm text-ink-secondary font-medium">Total:</span><span className="text-lg font-display font-bold w-28 text-right">{money(total)}</span></div>
          </div>
          {error&&<p className="text-sm text-bad bg-red-50 border border-red-200 rounded-xl px-4 py-2.5">{error}</p>}
          <div className="flex justify-end gap-2.5 pt-2">
            <button type="button" onClick={()=>setModalOpen(false)} className="btn-secondary">Cancelar</button>
            <button type="submit" disabled={saving} className="btn-primary">{saving?'Registrando…':'Registrar venta'}</button>
          </div>
        </form>
      </Modal>

      <Modal open={!!viewing} onClose={()=>setViewing(null)} title="Detalle de venta" width="max-w-md">
        {viewing&&<Receipt sale={viewing} client={clients.find(c=>c.id===viewing.client_id)||viewing.client} products={products} company={company}/>}
      </Modal>
    </AppLayout>
  )
}
