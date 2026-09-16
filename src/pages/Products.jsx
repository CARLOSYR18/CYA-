import { useEffect, useMemo, useRef, useState } from 'react'
import { Plus, Pencil, Trash2, Search, Boxes, ImageOff, Camera, X } from 'lucide-react'
import AppLayout from '../components/layout/AppLayout'
import Modal from '../components/ui/Modal'
import EmptyState from '../components/ui/EmptyState'
import StockBadge from '../components/ui/StockBadge'
import { productsService } from '../services/productsService'
import { categoriesService } from '../services/categoriesService'
import { suppliersService } from '../services/suppliersService'

const emptyForm = {
  sku:'',name:'',category_id:'',unit:'unidad',
  cost_price:'',sale_price:'',stock:'',min_stock:'',
  supplier_id:'',image_url:'',
  is_kit:false,kit_component_id:'',kit_quantity:'1',
}

export default function Products() {
  const [products,setProducts]     = useState([])
  const [categories,setCategories] = useState([])
  const [suppliers,setSuppliers]   = useState([])
  const [loading,setLoading]       = useState(true)
  const [search,setSearch]         = useState('')
  const [modalOpen,setModalOpen]   = useState(false)
  const [editing,setEditing]       = useState(null)
  const [form,setForm]             = useState(emptyForm)
  const [imageFile,setImageFile]   = useState(null)
  const [imagePreview,setImagePreview] = useState('')
  const [error,setError]           = useState('')
  const [confirmDelete,setConfirmDelete] = useState(null)
  const fileInputRef = useRef(null)

  async function loadAll() {
    setLoading(true)
    const [p,c,s] = await Promise.all([productsService.list(),categoriesService.list(),suppliersService.list()])
    setProducts(p);setCategories(c);setSuppliers(s);setLoading(false)
  }
  useEffect(()=>{loadAll()},[])

  useEffect(()=>{
    if(!imageFile){setImagePreview('');return}
    const url=URL.createObjectURL(imageFile);setImagePreview(url)
    return ()=>URL.revokeObjectURL(url)
  },[imageFile])

  const filtered = useMemo(()=>{
    const q=search.trim().toLowerCase()
    if(!q)return products
    return products.filter(p=>p.name.toLowerCase().includes(q)||p.sku.toLowerCase().includes(q))
  },[products,search])

  function resetImg(){setImageFile(null);setImagePreview('');if(fileInputRef.current)fileInputRef.current.value=''}
  async function openCreate(){setEditing(null);setError('');resetImg();const sku=await productsService.generateSku();setForm({...emptyForm,sku});setModalOpen(true)}
  function openEdit(p){
    setEditing(p);setForm({sku:p.sku,name:p.name,category_id:p.category_id||'',unit:p.unit,cost_price:p.cost_price,sale_price:p.sale_price,stock:p.stock,min_stock:p.min_stock,supplier_id:p.supplier_id||'',image_url:p.image_url||'',is_kit:p.is_kit||false,kit_component_id:p.kit_component_id||'',kit_quantity:String(p.kit_quantity||'1')})
    setError('');resetImg();setModalOpen(true)
  }
  function closeModal(){setModalOpen(false);resetImg()}

  async function handleSubmit(e){
    e.preventDefault();setError('')
    if(!form.name.trim()){setError('El nombre del producto es obligatorio');return}
    let image_url=form.image_url||''
    if(imageFile){try{image_url=await productsService.uploadImage(imageFile)}catch(err){setError(err.message||'No se pudo subir la imagen');return}}
    const payload={sku:form.sku.trim(),name:form.name.trim(),category_id:form.category_id||null,unit:form.unit,cost_price:Number(form.cost_price)||0,sale_price:Number(form.sale_price)||0,min_stock:Number(form.min_stock)||0,supplier_id:form.supplier_id||null,image_url:image_url||null,is_kit:form.is_kit,kit_component_id:form.is_kit?(form.kit_component_id||null):null,kit_quantity:form.is_kit?(Number(form.kit_quantity)||1):1,...(!form.is_kit&&!editing?{stock:Number(form.stock)||0}:{})}
    try{if(editing)await productsService.update(editing.id,payload);else await productsService.create(payload);closeModal();loadAll()}
    catch(err){setError(err.message||'No se pudo guardar')}
  }
  async function handleDelete(){await productsService.remove(confirmDelete.id);setConfirmDelete(null);loadAll()}
  const catName=(id)=>categories.find(c=>c.id===id)?.name||'—'
  const previewSrc=imagePreview||form.image_url||''

  return (
    <AppLayout title="Productos">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <div className="relative w-full sm:w-72">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-muted"/>
          <input className="field pl-10" placeholder="Buscar por nombre o SKU…" value={search} onChange={e=>setSearch(e.target.value)}/>
        </div>
        <button onClick={openCreate} className="btn-primary w-full sm:w-auto justify-center"><Plus size={15}/> Nuevo producto</button>
      </div>

      <div className="card overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20"><div className="w-6 h-6 rounded-full border-2 border-brand border-t-transparent animate-spin"/></div>
        ) : filtered.length===0 ? (
          <EmptyState icon={Boxes} title="Sin productos" description="Registra tu primer producto para controlar el inventario." action={<button onClick={openCreate} className="btn-primary"><Plus size={15}/>Nuevo producto</button>}/>
        ) : (
          <>
            {/* Mobile */}
            <div className="block sm:hidden divide-y divide-base-border/60">
              {filtered.map(p=>(
                <div key={p.id} className="p-4 space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="shrink-0">
                      {p.image_url
                        ?<img src={p.image_url} alt={p.name} className="w-14 h-14 rounded-xl object-cover border border-base-border"/>
                        :<div className="w-14 h-14 rounded-xl bg-base-raised border border-base-border flex items-center justify-center"><ImageOff size={16} className="text-ink-muted"/></div>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-1">
                        <p className="font-semibold text-ink-primary text-[13px] leading-snug">{p.name}</p>
                        {p.is_kit&&<span className="shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-600 border border-blue-100">Combo</span>}
                      </div>
                      <p className="font-mono text-[11px] text-ink-muted mt-0.5">{p.sku}</p>
                      <p className="text-xs text-ink-secondary mt-0.5">{catName(p.category_id)}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-base-border/40">
                    <div className="flex items-center gap-2">
                      <StockBadge stock={p.stock} minStock={p.min_stock}/>
                      <span className="font-mono text-[11px] text-ink-secondary">{p.stock} {p.unit}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-mono font-bold text-sm">S/ {Number(p.sale_price).toFixed(2)}</span>
                      <div className="flex items-center gap-1">
                        <button onClick={()=>openEdit(p)} className="p-1.5 rounded-lg text-ink-muted hover:text-brand hover:bg-blue-50 transition-all"><Pencil size={14}/></button>
                        <button onClick={()=>setConfirmDelete(p)} className="p-1.5 rounded-lg text-ink-muted hover:text-bad hover:bg-red-50 transition-all"><Trash2 size={14}/></button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {/* Desktop */}
            <div className="overflow-x-auto hidden sm:block">
              <table className="w-full">
                <thead><tr>
                  <th className="th w-12">Foto</th><th className="th">SKU</th><th className="th">Producto</th>
                  <th className="th">Categoría</th><th className="th">Stock</th><th className="th">Precio</th>
                  <th className="th">Estado</th><th className="th"/>
                </tr></thead>
                <tbody>
                  {filtered.map(p=>(
                    <tr key={p.id} className="hover:bg-blue-50/30 transition-colors group">
                      <td className="td">{p.image_url?<img src={p.image_url} alt={p.name} className="w-9 h-9 rounded-lg object-cover border border-base-border"/>:<div className="w-9 h-9 rounded-lg bg-base-raised border border-base-border flex items-center justify-center"><ImageOff size={13} className="text-ink-muted"/></div>}</td>
                      <td className="td font-mono text-[11px] text-ink-muted">{p.sku}</td>
                      <td className="td font-semibold text-[13px]">{p.name}{p.is_kit&&<span className="ml-2 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-600 border border-blue-100">Combo</span>}</td>
                      <td className="td text-ink-secondary text-[13px]">{catName(p.category_id)}</td>
                      <td className="td font-mono text-[13px]">{p.stock} {p.unit}</td>
                      <td className="td font-mono text-[13px] font-semibold">S/ {Number(p.sale_price).toFixed(2)}</td>
                      <td className="td"><StockBadge stock={p.stock} minStock={p.min_stock}/></td>
                      <td className="td">
                        <div className="flex items-center gap-1 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={()=>openEdit(p)} className="p-1.5 rounded-lg text-ink-muted hover:text-brand hover:bg-blue-50 transition-all"><Pencil size={14}/></button>
                          <button onClick={()=>setConfirmDelete(p)} className="p-1.5 rounded-lg text-ink-muted hover:text-bad hover:bg-red-50 transition-all"><Trash2 size={14}/></button>
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

      <Modal open={modalOpen} onClose={closeModal} title={editing?'Editar producto':'Nuevo producto'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">SKU</label><input className="field font-mono" value={form.sku} readOnly/></div>
            <div><label className="label">Unidad</label>
              <select className="field" value={form.unit} onChange={e=>setForm({...form,unit:e.target.value})}>
                {['unidad','caja','paquete','rollo','kg','litro'].map(u=><option key={u} value={u}>{u}</option>)}
              </select>
            </div>
          </div>
          <div><label className="label">Nombre del producto</label><input className="field" value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/></div>
          <div>
            <label className="label flex items-center gap-1.5"><Camera size={12}/> Foto del producto</label>
            <div className="flex items-start gap-4">
              <div className="relative shrink-0 w-24 h-24 rounded-xl border-2 border-dashed border-base-border bg-base-raised flex items-center justify-center overflow-hidden group cursor-pointer" onClick={()=>fileInputRef.current?.click()}>
                {previewSrc?(<><img src={previewSrc} alt="" className="w-full h-full object-cover"/><button type="button" onClick={e=>{e.stopPropagation();resetImg();setForm(f=>({...f,image_url:''}))}} className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-xl"><X size={20} className="text-white"/></button></>):<ImageOff size={26} className="text-ink-muted"/>}
              </div>
              <div className="flex flex-col gap-2 pt-1">
                <button type="button" onClick={()=>fileInputRef.current?.click()} className="btn-secondary text-xs px-3 py-1.5"><Camera size={13}/>{previewSrc?'Cambiar foto':'Subir foto'}</button>
                {imageFile&&<p className="text-[11px] text-ink-muted max-w-[160px] truncate">{imageFile.name}</p>}
                {!imageFile&&form.image_url&&<p className="text-[11px] text-good font-medium">✓ Imagen guardada</p>}
                <p className="text-[10px] text-ink-muted">PNG, JPG o WEBP. Max 5 MB.</p>
              </div>
            </div>
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={e=>{const f=e.target.files?.[0];if(f)setImageFile(f)}}/>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div><label className="label">Categoría</label>
              <select className="field" value={form.category_id} onChange={e=>setForm({...form,category_id:e.target.value})}>
                <option value="">Sin categoría</option>
                {categories.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div><label className="label">Proveedor</label>
              <select className="field" value={form.supplier_id} onChange={e=>setForm({...form,supplier_id:e.target.value})}>
                <option value="">Sin proveedor</option>
                {suppliers.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
          </div>
          <div className="border border-base-border rounded-xl p-4 space-y-3 bg-base-raised/50">
            <label className="flex items-center gap-3 cursor-pointer select-none">
              <div onClick={()=>setForm({...form,is_kit:!form.is_kit,kit_component_id:'',kit_quantity:'1'})}
                className={`relative w-10 h-5 rounded-full transition-colors duration-200 ${form.is_kit?'bg-brand':'bg-slate-200'}`}>
                <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform duration-200 ${form.is_kit?'translate-x-5':''}`}/>
              </div>
              <span className="text-sm font-medium text-ink-primary">Es un combo (usa stock de otro producto)</span>
            </label>
            {form.is_kit&&(
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div><label className="label">Producto base</label>
                  <select className="field" value={form.kit_component_id} onChange={e=>setForm({...form,kit_component_id:e.target.value})}>
                    <option value="">Selecciona el producto base</option>
                    {products.filter(p=>!p.is_kit&&(!editing||p.id!==editing.id)).map(p=><option key={p.id} value={p.id}>{p.sku} — {p.name} (stock: {p.stock})</option>)}
                  </select>
                </div>
                <div><label className="label">Uds. base por combo</label><input type="number" min="1" className="field" value={form.kit_quantity} onChange={e=>setForm({...form,kit_quantity:e.target.value})}/></div>
              </div>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div><label className="label">Precio de costo (S/)</label><input type="number" step="0.01" min="0" className="field" value={form.cost_price} onChange={e=>setForm({...form,cost_price:e.target.value})}/></div>
            <div><label className="label">Precio de venta (S/)</label><input type="number" step="0.01" min="0" className="field" value={form.sale_price} onChange={e=>setForm({...form,sale_price:e.target.value})}/></div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div><label className="label">Stock inicial</label>
              {form.is_kit?<div className="field bg-base-raised text-ink-muted text-xs flex items-center">Calculado automáticamente</div>:<><input type="number" min="0" className="field" value={form.stock} onChange={e=>setForm({...form,stock:e.target.value})} disabled={!!editing}/>{editing&&<p className="text-xs text-ink-muted mt-1">Usa "Movimientos" para ajustar el stock.</p>}</>}
            </div>
            <div><label className="label">Stock mínimo</label><input type="number" min="0" className="field" value={form.min_stock} onChange={e=>setForm({...form,min_stock:e.target.value})}/></div>
          </div>
          {error&&<p className="text-sm text-bad bg-red-50 border border-red-200 rounded-xl px-4 py-2.5">{error}</p>}
          <div className="flex justify-end gap-2.5 pt-2">
            <button type="button" onClick={closeModal} className="btn-secondary">Cancelar</button>
            <button type="submit" className="btn-primary">{editing?'Guardar cambios':'Crear producto'}</button>
          </div>
        </form>
      </Modal>

      <Modal open={!!confirmDelete} onClose={()=>setConfirmDelete(null)} title="Eliminar producto" width="max-w-sm">
        <p className="text-sm text-ink-secondary mb-5">¿Eliminar <span className="text-ink-primary font-semibold">{confirmDelete?.name}</span>? Esta acción no se puede deshacer.</p>
        <div className="flex justify-end gap-2.5">
          <button onClick={()=>setConfirmDelete(null)} className="btn-secondary">Cancelar</button>
          <button onClick={handleDelete} className="btn-danger">Eliminar</button>
        </div>
      </Modal>
    </AppLayout>
  )
}
