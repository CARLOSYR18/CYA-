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
  sku: '', name: '', category_id: '', unit: 'unidad',
  cost_price: '', sale_price: '', stock: '', min_stock: '',
  supplier_id: '', image_url: '',
  is_kit: false, kit_component_id: '', kit_quantity: '1',
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
  const [imageFile, setImageFile] = useState(null)   // File | null — pending upload
  const [imagePreview, setImagePreview] = useState('') // local object URL for preview
  const [error, setError] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(null)
  const fileInputRef = useRef(null)

  async function loadAll() {
    setLoading(true)
    const [p, c, s] = await Promise.all([productsService.list(), categoriesService.list(), suppliersService.list()])
    setProducts(p)
    setCategories(c)
    setSuppliers(s)
    setLoading(false)
  }

  useEffect(() => { loadAll() }, [])

  // Revoke object URL when imageFile changes to avoid memory leaks
  useEffect(() => {
    if (!imageFile) { setImagePreview(''); return }
    const url = URL.createObjectURL(imageFile)
    setImagePreview(url)
    return () => URL.revokeObjectURL(url)
  }, [imageFile])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return products
    return products.filter((p) => p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q))
  }, [products, search])

  function resetImageState() {
    setImageFile(null)
    setImagePreview('')
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  async function openCreate() {
    setEditing(null)
    setError('')
    resetImageState()
    const sku = await productsService.generateSku()
    setForm({ ...emptyForm, sku })
    setModalOpen(true)
  }

  function openEdit(product) {
    setEditing(product)
    setForm({
      sku: product.sku,
      name: product.name,
      category_id: product.category_id || '',
      unit: product.unit,
      cost_price: product.cost_price,
      sale_price: product.sale_price,
      stock: product.stock,
      min_stock: product.min_stock,
      supplier_id: product.supplier_id || '',
      image_url: product.image_url || '',
      is_kit: product.is_kit || false,
      kit_component_id: product.kit_component_id || '',
      kit_quantity: String(product.kit_quantity || '1'),
    })
    setError('')
    resetImageState()
    setModalOpen(true)
  }

  function closeModal() {
    setModalOpen(false)
    resetImageState()
  }

  function handleFileChange(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setImageFile(file)
  }

  function removeImage() {
    resetImageState()
    setForm((f) => ({ ...f, image_url: '' }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (!form.name.trim()) {
      setError('El nombre del producto es obligatorio')
      return
    }

    let image_url = form.image_url || ''

    // Upload if a new file was chosen
    if (imageFile) {
      try {
        image_url = await productsService.uploadImage(imageFile)
      } catch (err) {
        setError(err.message || 'No se pudo subir la imagen')
        return
      }
    }

    const payload = {
      sku: form.sku.trim(),
      name: form.name.trim(),
      category_id: form.category_id || null,
      unit: form.unit,
      cost_price: Number(form.cost_price) || 0,
      sale_price: Number(form.sale_price) || 0,
      min_stock: Number(form.min_stock) || 0,
      supplier_id: form.supplier_id || null,
      image_url: image_url || null,
      is_kit: form.is_kit,
      kit_component_id: form.is_kit ? (form.kit_component_id || null) : null,
      kit_quantity: form.is_kit ? (Number(form.kit_quantity) || 1) : 1,
      // Stock: only include for non-kit products being created
      ...(!form.is_kit && !editing ? { stock: Number(form.stock) || 0 } : {}),
    }

    try {
      if (editing) await productsService.update(editing.id, payload)
      else await productsService.create(payload)
      closeModal()
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

  // The image to show in the modal preview: local blob > saved URL > nothing
  const previewSrc = imagePreview || form.image_url || ''

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
        <button onClick={openCreate} className="btn-primary w-full sm:w-auto justify-center">
          <Plus size={16} /> Nuevo producto
        </button>
      </div>

      <div className="card overflow-hidden">
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
          <>
            {/* Mobile Cards View */}
            <div className="block sm:hidden divide-y divide-base-border">
              {filtered.map((p) => (
                <div key={p.id} className="p-4 space-y-3">
                  <div className="flex items-start gap-3">
                    {/* Thumbnail */}
                    <div className="shrink-0">
                      {p.image_url ? (
                        <img
                          src={p.image_url}
                          alt={p.name}
                          className="w-14 h-14 rounded-xl object-cover border border-base-border shadow-xs"
                        />
                      ) : (
                        <div className="w-14 h-14 rounded-xl bg-slate-100 border border-base-border flex items-center justify-center">
                          <ImageOff size={18} className="text-ink-muted" />
                        </div>
                      )}
                    </div>

                    {/* Name & SKU & Category */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-1">
                        <p className="font-semibold text-ink-primary text-sm leading-snug">
                          {p.name}
                        </p>
                        {p.is_kit && (
                          <span className="shrink-0 inline-flex items-center text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-brand/10 text-brand border border-brand/20">
                            Combo
                          </span>
                        )}
                      </div>
                      <p className="font-mono text-xs text-ink-muted mt-0.5">{p.sku}</p>
                      <p className="text-xs text-ink-secondary mt-0.5">{categoryName(p.category_id)}</p>
                    </div>
                  </div>

                  {/* Bottom row: Stock, Price, Actions */}
                  <div className="flex items-center justify-between pt-2 border-t border-base-border/50">
                    <div className="flex items-center gap-2">
                      <StockBadge stock={p.stock} minStock={p.min_stock} />
                      <span className="font-mono text-xs text-ink-secondary">{p.stock} {p.unit}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-mono font-bold text-sm text-ink-primary">
                        S/ {Number(p.sale_price).toFixed(2)}
                      </span>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => openEdit(p)}
                          className="p-1.5 rounded-lg text-ink-muted hover:text-brand hover:bg-brand-dim transition-colors"
                          title="Editar"
                        >
                          <Pencil size={15} />
                        </button>
                        <button
                          onClick={() => setConfirmDelete(p)}
                          className="p-1.5 rounded-lg text-ink-muted hover:text-bad hover:bg-bad-dim transition-colors"
                          title="Eliminar"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop Table View */}
            <div className="overflow-x-auto hidden sm:block">
              <table className="w-full">
                <thead>
                  <tr>
                    <th className="th w-12">Foto</th>
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
                      {/* ── Thumbnail ── */}
                      <td className="td">
                        {p.image_url ? (
                          <img
                            src={p.image_url}
                            alt={p.name}
                            className="w-9 h-9 rounded-lg object-cover border border-base-border shadow-xs"
                          />
                        ) : (
                          <div className="w-9 h-9 rounded-lg bg-slate-100 border border-base-border flex items-center justify-center">
                            <ImageOff size={14} className="text-ink-muted" />
                          </div>
                        )}
                      </td>
                      <td className="td font-mono text-xs text-ink-secondary">{p.sku}</td>
                      <td className="td font-medium">
                        <span>{p.name}</span>
                        {p.is_kit && (
                          <span className="ml-2 inline-flex items-center text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-brand/10 text-brand border border-brand/20">
                            Combo
                          </span>
                        )}
                      </td>
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
            </div>
          </>
        )}
      </div>

      {/* ── Create / Edit modal ── */}
      <Modal open={modalOpen} onClose={closeModal} title={editing ? 'Editar producto' : 'Nuevo producto'}>
        <form onSubmit={handleSubmit} className="space-y-4">

          {/* SKU + Unit */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">SKU</label>
              <input
                className="field font-mono bg-slate-50 text-ink-secondary cursor-not-allowed"
                value={form.sku}
                readOnly
              />
              {!editing && (
                <p className="text-[10px] text-ink-muted mt-1">Código generado automáticamente</p>
              )}
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

          {/* Name */}
          <div>
            <label className="label">Nombre del producto</label>
            <input className="field" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>

          {/* ── Image picker ── */}
          <div>
            <label className="label flex items-center gap-1.5"><Camera size={12} /> Foto del producto</label>
            <div className="flex items-start gap-4">
              {/* Preview square */}
              <div className="relative shrink-0 w-24 h-24 rounded-xl border-2 border-dashed border-base-border bg-slate-50 flex items-center justify-center overflow-hidden group">
                {previewSrc ? (
                  <>
                    <img src={previewSrc} alt="Preview" className="w-full h-full object-cover" />
                    {/* Remove overlay */}
                    <button
                      type="button"
                      onClick={removeImage}
                      className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-xl"
                      title="Quitar imagen"
                    >
                      <X size={20} className="text-white" />
                    </button>
                  </>
                ) : (
                  <ImageOff size={28} className="text-slate-300" />
                )}
              </div>

              {/* Upload controls */}
              <div className="flex flex-col gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="btn-secondary text-xs px-3 py-1.5"
                >
                  <Camera size={13} />
                  {previewSrc ? 'Cambiar foto' : 'Subir foto'}
                </button>
                {imageFile && (
                  <p className="text-[11px] text-ink-muted max-w-[160px] truncate">{imageFile.name}</p>
                )}
                {!imageFile && form.image_url && (
                  <p className="text-[11px] text-emerald-600">✓ Imagen guardada</p>
                )}
                <p className="text-[10px] text-ink-muted">PNG, JPG o WEBP. Max 5 MB.</p>
              </div>
            </div>

            {/* Hidden file input */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>

          {/* Category + Supplier */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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

          {/* ── Kit / Combo toggle ── */}
          <div className="border border-base-border rounded-xl p-4 space-y-3 bg-slate-50/50">
            <label className="flex items-center gap-3 cursor-pointer select-none">
              <div
                onClick={() => setForm({ ...form, is_kit: !form.is_kit, kit_component_id: '', kit_quantity: '1' })}
                className={`relative w-10 h-5 rounded-full transition-colors ${
                  form.is_kit ? 'bg-brand' : 'bg-slate-300'
                }`}
              >
                <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                  form.is_kit ? 'translate-x-5' : 'translate-x-0'
                }`} />
              </div>
              <span className="text-sm font-medium text-ink-primary">Es un combo (usa stock de otro producto)</span>
            </label>

            {form.is_kit && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="label">Producto base</label>
                  <select
                    className="field"
                    value={form.kit_component_id}
                    onChange={(e) => setForm({ ...form, kit_component_id: e.target.value })}
                  >
                    <option value="">Selecciona el producto base</option>
                    {products
                      .filter((p) => !p.is_kit && (!editing || p.id !== editing.id))
                      .map((p) => (
                        <option key={p.id} value={p.id}>{p.sku} — {p.name} (stock: {p.stock})</option>
                      ))}
                  </select>
                </div>
                <div>
                  <label className="label">Uds. base por combo</label>
                  <input
                    type="number"
                    min="1"
                    className="field"
                    placeholder="1"
                    value={form.kit_quantity}
                    onChange={(e) => setForm({ ...form, kit_quantity: e.target.value })}
                  />
                  <p className="text-[10px] text-ink-muted mt-1">Piezas del base que consume 1 combo</p>
                </div>
              </div>
            )}
          </div>

          {/* Prices */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="label">Precio de costo (S/)</label>
              <input type="number" step="0.01" min="0" className="field" value={form.cost_price} onChange={(e) => setForm({ ...form, cost_price: e.target.value })} />
            </div>
            <div>
              <label className="label">Precio de venta (S/)</label>
              <input type="number" step="0.01" min="0" className="field" value={form.sale_price} onChange={(e) => setForm({ ...form, sale_price: e.target.value })} />
            </div>
          </div>

          {/* Stock */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="label">Stock inicial</label>
              {form.is_kit ? (
                <div className="field bg-slate-50 text-ink-muted text-xs flex items-center cursor-not-allowed">
                  El stock se calcula automáticamente a partir del producto base
                </div>
              ) : (
                <>
                  <input
                    type="number" min="0" className="field"
                    value={form.stock}
                    onChange={(e) => setForm({ ...form, stock: e.target.value })}
                    disabled={!!editing}
                  />
                  {editing && <p className="text-xs text-ink-muted mt-1">Usa "Movimientos" para ajustar el stock.</p>}
                </>
              )}
            </div>
            <div>
              <label className="label">Stock mínimo</label>
              <input type="number" min="0" className="field" value={form.min_stock} onChange={(e) => setForm({ ...form, min_stock: e.target.value })} />
            </div>
          </div>

          {error && <p className="text-sm text-bad bg-bad-dim border border-bad/20 rounded-md px-3 py-2">{error}</p>}

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={closeModal} className="btn-secondary">Cancelar</button>
            <button type="submit" className="btn-primary">{editing ? 'Guardar cambios' : 'Crear producto'}</button>
          </div>
        </form>
      </Modal>

      {/* ── Confirm delete modal ── */}
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
