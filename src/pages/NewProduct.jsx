import { useState, useEffect, useRef, useMemo } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import {
  ArrowLeft, Boxes, Camera, Check, AlertCircle, X,
  DollarSign, Package, Layers, Sparkles, Crown, ArrowRight,
  ShieldCheck, RotateCcw, Building2, Tag, Percent
} from 'lucide-react'
import AppLayout from '../components/layout/AppLayout'
import { productsService } from '../services/productsService'
import { categoriesService } from '../services/categoriesService'
import { suppliersService } from '../services/suppliersService'
import { inventoryMovementsService } from '../services/inventoryMovementsService'
import { companySettingsService } from '../services/companySettingsService'
import { getLimits } from '../lib/planLimits'

const fmt = (n) =>
  `S/ ${(Number(n) || 0).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

const initialForm = {
  sku: '',
  name: '',
  category_id: '',
  unit: 'unidad',
  cost_price: '',
  sale_price: '',
  stock: '0',
  min_stock: '5',
  supplier_id: '',
  image_url: '',
  is_kit: false,
  kit_component_id: '',
  kit_quantity: '1',
}

export default function NewProduct() {
  const navigate = useNavigate()
  const { id } = useParams()
  const isEditing = Boolean(id)

  const [form, setForm] = useState(initialForm)
  const [categories, setCategories] = useState([])
  const [suppliers, setSuppliers] = useState([])
  const [allProducts, setAllProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [originalProduct, setOriginalProduct] = useState(null)

  // Image handling
  const [imageFile, setImageFile] = useState(null)
  const [imagePreview, setImagePreview] = useState('')
  const fileInputRef = useRef(null)

  // Plan limits
  const [limitReached, setLimitReached] = useState(false)
  const [limitMsg, setLimitMsg] = useState('')

  useEffect(() => {
    async function initData() {
      setLoading(true)
      try {
        const [cats, sups, prods, company] = await Promise.all([
          categoriesService.list().catch(() => []),
          suppliersService.list().catch(() => []),
          productsService.list().catch(() => []),
          companySettingsService.get().catch(() => null)
        ])
        setCategories(cats || [])
        setSuppliers(sups || [])
        setAllProducts(prods || [])

        if (!isEditing) {
          // Check plan limits
          const limits = getLimits(company)
          if ((prods || []).length >= limits.maxProducts) {
            setLimitReached(true)
            setLimitMsg(`Has alcanzado el límite de tu plan (${limits.maxProducts} productos). Actualiza a Pro para agregar más artículos.`)
          }
          // Auto generate SKU
          const newSku = await productsService.generateSku()
          setForm(prev => ({ ...prev, sku: newSku }))
        } else {
          // Editing mode: find product by ID
          const currentProd = (prods || []).find(p => String(p.id) === String(id))
          if (currentProd) {
            setOriginalProduct(currentProd)
            setForm({
              sku: currentProd.sku || '',
              name: currentProd.name || '',
              category_id: currentProd.category_id || '',
              unit: currentProd.unit || 'unidad',
              cost_price: currentProd.cost_price !== undefined ? String(currentProd.cost_price) : '',
              sale_price: currentProd.sale_price !== undefined ? String(currentProd.sale_price) : '',
              stock: currentProd.stock !== undefined ? String(currentProd.stock) : '0',
              min_stock: currentProd.min_stock !== undefined ? String(currentProd.min_stock) : '5',
              supplier_id: currentProd.supplier_id || '',
              image_url: currentProd.image_url || '',
              is_kit: Boolean(currentProd.is_kit),
              kit_component_id: currentProd.kit_component_id || '',
              kit_quantity: currentProd.kit_quantity !== undefined ? String(currentProd.kit_quantity) : '1',
            })
          } else {
            setError('No se encontró el producto solicitado')
          }
        }
      } catch (err) {
        console.error('Error cargando formulario de producto:', err)
        setError('Error al conectar con la base de datos')
      } finally {
        setLoading(false)
      }
    }

    initData()
  }, [id, isEditing])

  // Handle image file selection
  useEffect(() => {
    if (!imageFile) {
      setImagePreview('')
      return
    }
    const url = URL.createObjectURL(imageFile)
    setImagePreview(url)
    return () => URL.revokeObjectURL(url)
  }, [imageFile])

  const previewSrc = imagePreview || form.image_url || ''

  const handleResetImage = () => {
    setImageFile(null)
    setImagePreview('')
    setForm(f => ({ ...f, image_url: '' }))
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  // Margin calculation
  const marginStats = useMemo(() => {
    const cost = Number(form.cost_price) || 0
    const sale = Number(form.sale_price) || 0
    const profit = sale - cost
    const percent = cost > 0 ? (profit / cost) * 100 : 0
    return {
      profit,
      percent: percent.toFixed(1),
      isPositive: profit >= 0
    }
  }, [form.cost_price, form.sale_price])

  // Re-generate SKU
  const handleRegenerateSku = async () => {
    const newSku = await productsService.generateSku()
    setForm(f => ({ ...f, sku: newSku }))
  }

  // Submission
  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (!form.name.trim()) {
      setError('Por favor indica el nombre comercial del producto')
      return
    }
    if (!form.sku.trim()) {
      setError('El código SKU es obligatorio')
      return
    }

    setSaving(true)
    try {
      let finalImageUrl = form.image_url || ''
      if (imageFile) {
        try {
          finalImageUrl = await productsService.uploadImage(imageFile)
        } catch (uploadErr) {
          setError(uploadErr.message || 'No se pudo subir la fotografía del producto')
          setSaving(false)
          return
        }
      }

      const payload = {
        sku: form.sku.trim(),
        name: form.name.trim(),
        category_id: form.category_id || null,
        unit: form.unit || 'unidad',
        cost_price: Number(form.cost_price) || 0,
        sale_price: Number(form.sale_price) || 0,
        min_stock: Number(form.min_stock) || 0,
        supplier_id: form.supplier_id || null,
        image_url: finalImageUrl || null,
        is_kit: Boolean(form.is_kit),
        kit_component_id: form.is_kit ? form.kit_component_id || null : null,
        kit_quantity: form.is_kit ? Number(form.kit_quantity) || 1 : 1,
        ...(!form.is_kit && !isEditing ? { stock: Number(form.stock) || 0 } : {})
      }

      if (isEditing && originalProduct) {
        await productsService.update(originalProduct.id, payload)
        // If stock changed manually, register inventory movement
        if (!form.is_kit) {
          const oldStock = Number(originalProduct.stock) || 0
          const newStock = Number(form.stock) || 0
          const delta = newStock - oldStock
          if (delta !== 0) {
            await inventoryMovementsService.register({
              product_id: originalProduct.id,
              type: delta > 0 ? 'entrada' : 'salida',
              quantity: Math.abs(delta),
              reason: 'Ajuste manual desde edición de producto',
            })
          }
        }
        navigate('/productos', {
          state: { updated: true, productName: form.name }
        })
      } else {
        await productsService.create(payload)
        navigate('/productos', {
          state: { created: true, productName: form.name }
        })
      }
    } catch (err) {
      console.error(err)
      setError(err.message || 'Error al guardar el producto en la base de datos')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <AppLayout title={isEditing ? 'Editar Producto' : 'Nuevo Producto'}>
        <div className="max-w-5xl mx-auto p-16 flex flex-col items-center justify-center text-center">
          <div className="w-10 h-10 rounded-full border-2 border-[#5550F2] border-t-transparent animate-spin mb-3" />
          <p className="text-xs font-semibold text-slate-500">Cargando datos del producto…</p>
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout title={isEditing ? 'Editar Producto' : 'Nuevo Producto'}>
      <div className="space-y-5 max-w-6xl mx-auto pb-16">

        {/* ═════════════════════════════════════════════════════════
            TOP BAR WITH BREADCRUMB & BACK ACTION
           ═════════════════════════════════════════════════════════ */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-[#131627] p-5 rounded-2xl border border-slate-200/80 dark:border-white/10 shadow-xs">
          <div className="flex items-center gap-3.5">
            <button
              type="button"
              onClick={() => navigate('/productos')}
              className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-white/10 transition-all cursor-pointer"
              title="Regresar al catálogo"
            >
              <ArrowLeft size={18} />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-400">Catálogo</span>
                <span className="text-xs text-slate-300">/</span>
                <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">
                  {isEditing ? 'Modificar Artículo' : 'Nuevo Artículo'}
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight mt-0.5">
                {isEditing ? `Editar: ${originalProduct?.name || form.name}` : 'Registrar Nuevo Producto'}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-500/30">
              <Boxes size={13} /> {isEditing ? `SKU: ${form.sku}` : 'Gestión de Inventario'}
            </span>
          </div>
        </div>

        {/* ═════════════════════════════════════════════════════════
            PLAN LIMIT NOTICE (IF LIMIT REACHED ON FREE PLAN)
           ═════════════════════════════════════════════════════════ */}
        {limitReached && (
          <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 text-amber-900 dark:text-amber-300 text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
            <div className="flex items-center gap-2.5">
              <Crown size={18} className="text-amber-600 dark:text-amber-400 shrink-0" />
              <span>{limitMsg}</span>
            </div>
            <Link
              to="/planes"
              className="px-3.5 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition-colors shrink-0"
            >
              <Sparkles size={13} />
              <span>Actualizar a Pro</span>
              <ArrowRight size={13} />
            </Link>
          </div>
        )}

        {/* ═════════════════════════════════════════════════════════
            MAIN FORM: 2 COLUMNS (PRODUCT INFO | FINANCIALS & STOCK)
           ═════════════════════════════════════════════════════════ */}
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">

            {/* LEFT COLUMN: Data, Photo, Combo Options (8 cols) */}
            <div className="lg:col-span-8 space-y-5">

              {/* CARD 1: GENERAL INFO & SKU */}
              <div className="bg-white dark:bg-[#131627] rounded-2xl border border-slate-200/80 dark:border-white/10 p-5 shadow-xs space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-white/10">
                  <div className="flex items-center gap-2">
                    <Tag size={16} className="text-indigo-600 dark:text-indigo-400" />
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                      1. Identificación y Descripción
                    </h3>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Nombre Comercial del Producto *
                    </label>
                    <input
                      type="text"
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      placeholder="Ej: AirPods 3 Pro (con estuche de carga MagSafe)"
                      required
                      className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-slate-800 dark:text-white font-semibold outline-none focus:border-indigo-500 focus:bg-white dark:focus:bg-[#1A1D30] transition-all"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* SKU Code */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                          Código SKU *
                        </label>
                        {!isEditing && (
                          <button
                            type="button"
                            onClick={handleRegenerateSku}
                            className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 cursor-pointer"
                            title="Regenerar correlativo automático"
                          >
                            <RotateCcw size={11} /> Regenerar
                          </button>
                        )}
                      </div>
                      <input
                        type="text"
                        value={form.sku}
                        onChange={(e) => setForm({ ...form, sku: e.target.value.toUpperCase() })}
                        placeholder="PROD-0001"
                        required
                        className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm font-mono font-bold text-slate-800 dark:text-white outline-none focus:border-indigo-500 uppercase"
                      />
                    </div>

                    {/* Unit */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Unidad de Medida
                      </label>
                      <select
                        value={form.unit}
                        onChange={(e) => setForm({ ...form, unit: e.target.value })}
                        className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-slate-800 dark:text-white outline-none focus:border-indigo-500 cursor-pointer font-medium"
                      >
                        {['unidad', 'caja', 'paquete', 'rollo', 'kg', 'litro', 'metro', 'par', 'set'].map((u) => (
                          <option key={u} value={u}>
                            {u.charAt(0).toUpperCase() + u.slice(1)}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Category */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Categoría
                      </label>
                      <select
                        value={form.category_id}
                        onChange={(e) => setForm({ ...form, category_id: e.target.value })}
                        className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 dark:text-white outline-none focus:border-indigo-500 cursor-pointer"
                      >
                        <option value="">Sin categoría asignada</option>
                        {categories.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Supplier */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Proveedor Principal
                      </label>
                      <select
                        value={form.supplier_id}
                        onChange={(e) => setForm({ ...form, supplier_id: e.target.value })}
                        className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 dark:text-white outline-none focus:border-indigo-500 cursor-pointer"
                      >
                        <option value="">Sin proveedor específico</option>
                        {suppliers.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name} {s.phone ? `(${s.phone})` : ''}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              {/* CARD 2: PHOTO UPLOADER */}
              <div className="bg-white dark:bg-[#131627] rounded-2xl border border-slate-200/80 dark:border-white/10 p-5 shadow-xs space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-white/10">
                  <div className="flex items-center gap-2">
                    <Camera size={16} className="text-indigo-600 dark:text-indigo-400" />
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                      2. Fotografía del Producto
                    </h3>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-5">
                  {/* Photo Preview Container - CLEAN WHITE BACKGROUND */}
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="relative w-36 h-36 rounded-2xl border-2 border-dashed border-slate-300 dark:border-white/20 bg-white dark:bg-white/5 flex items-center justify-center overflow-hidden cursor-pointer hover:border-indigo-500 transition-colors shrink-0 shadow-xs group"
                  >
                    {previewSrc ? (
                      <>
                        <img
                          src={previewSrc}
                          alt="Previsualización"
                          className="w-full h-full object-contain p-2"
                        />
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleResetImage()
                          }}
                          className="absolute top-2 right-2 p-1.5 rounded-full bg-black/70 hover:bg-red-600 text-white transition-colors cursor-pointer"
                          title="Eliminar imagen"
                        >
                          <X size={14} />
                        </button>
                      </>
                    ) : (
                      <div className="flex flex-col items-center justify-center text-slate-400 p-2 text-center">
                        <Camera size={28} className="mb-1 text-slate-300 dark:text-slate-600" />
                        <span className="text-[11px] font-semibold text-slate-500">Seleccionar foto</span>
                      </div>
                    )}
                  </div>

                  <div className="flex-1 space-y-2.5 text-center sm:text-left">
                    <div>
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-white/10 dark:hover:bg-white/15 text-slate-700 dark:text-slate-200 text-xs font-bold transition-colors cursor-pointer inline-flex items-center gap-1.5"
                      >
                        <Camera size={14} />
                        <span>{previewSrc ? 'Reemplazar fotografía' : 'Subir fotografía del producto'}</span>
                      </button>
                    </div>
                    {imageFile && (
                      <p className="text-xs text-indigo-600 dark:text-indigo-400 font-bold truncate">
                        Archivo listo: {imageFile.name}
                      </p>
                    )}
                    <p className="text-[11.5px] text-slate-400 leading-relaxed">
                      Formatos compatibles: <strong>PNG, JPG, JPEG o WEBP</strong>. Recomendamos fondo blanco o transparente para un acabado profesional en el catálogo.
                    </p>
                  </div>

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) setImageFile(file)
                    }}
                  />
                </div>
              </div>

              {/* CARD 3: COMBO / KIT CONFIGURATION */}
              <div className="bg-white dark:bg-[#131627] rounded-2xl border border-slate-200/80 dark:border-white/10 p-5 shadow-xs space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-white/10">
                  <div className="flex items-center gap-2">
                    <Layers size={16} className="text-indigo-600 dark:text-indigo-400" />
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                      3. Producto Tipo Combo / Kit
                    </h3>
                  </div>

                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={form.is_kit}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          is_kit: e.target.checked,
                          kit_component_id: '',
                          kit_quantity: '1'
                        })
                      }
                      className="sr-only"
                    />
                    <div
                      className={`relative w-11 h-6 rounded-full transition-colors duration-200 cursor-pointer ${
                        form.is_kit ? 'bg-[#5550F2]' : 'bg-slate-300 dark:bg-white/20'
                      }`}
                    >
                      <span
                        className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${
                          form.is_kit ? 'translate-x-5' : ''
                        }`}
                      />
                    </div>
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      {form.is_kit ? 'Activado' : 'Desactivado'}
                    </span>
                  </label>
                </div>

                {form.is_kit ? (
                  <div className="p-4 rounded-xl bg-indigo-50/60 dark:bg-indigo-500/10 border border-indigo-100 dark:border-indigo-500/20 space-y-3">
                    <p className="text-[11.5px] text-slate-600 dark:text-slate-300">
                      Al vender este combo, el stock se descontará automáticamente del producto base vinculado:
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                          Producto base origen *
                        </label>
                        <select
                          value={form.kit_component_id}
                          onChange={(e) => setForm({ ...form, kit_component_id: e.target.value })}
                          required={form.is_kit}
                          className="w-full bg-white dark:bg-[#1A1D30] border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-white outline-none focus:border-indigo-500 cursor-pointer"
                        >
                          <option value="">Selecciona el producto individual…</option>
                          {allProducts
                            .filter((p) => !p.is_kit && (!isEditing || p.id !== originalProduct?.id))
                            .map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.sku} — {p.name} (stock: {p.stock})
                              </option>
                            ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                          Unidades del producto base por combo *
                        </label>
                        <input
                          type="number"
                          min="1"
                          value={form.kit_quantity}
                          onChange={(e) => setForm({ ...form, kit_quantity: e.target.value })}
                          required={form.is_kit}
                          className="w-full bg-white dark:bg-[#1A1D30] border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-800 dark:text-white outline-none focus:border-indigo-500 text-center"
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-slate-400">
                    Habilita esta opción si este producto es un paquete o promoción compuesta por existencias de otro producto del inventario.
                  </p>
                )}
              </div>

            </div>

            {/* RIGHT COLUMN: Prices, Stock & Save Button (4 cols) */}
            <div className="lg:col-span-4 space-y-5">

              {/* CARD 4: COMMERCIAL PRICING */}
              <div className="bg-white dark:bg-[#131627] rounded-2xl border border-slate-200/80 dark:border-white/10 p-5 shadow-xs space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-white/10">
                  <div className="flex items-center gap-2">
                    <DollarSign size={16} className="text-indigo-600 dark:text-indigo-400" />
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                      Precios y Márgenes
                    </h3>
                  </div>
                </div>

                <div className="space-y-3.5">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Precio de Costo (S/)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={form.cost_price}
                      onChange={(e) => setForm({ ...form, cost_price: e.target.value })}
                      placeholder="0.00"
                      className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 text-xs sm:text-sm font-mono font-bold text-slate-800 dark:text-white outline-none focus:border-indigo-500 text-right"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Precio de Venta al Público (S/) *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={form.sale_price}
                      onChange={(e) => setForm({ ...form, sale_price: e.target.value })}
                      placeholder="0.00"
                      required
                      className="w-full bg-slate-50 dark:bg-white/5 border border-indigo-200 dark:border-indigo-500/30 rounded-xl px-3 py-2 text-sm sm:text-base font-mono font-extrabold text-[#5550F2] dark:text-indigo-400 outline-none focus:border-indigo-500 text-right"
                    />
                  </div>

                  {/* Profit Margin Widget */}
                  {Number(form.cost_price) > 0 && Number(form.sale_price) > 0 && (
                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/10 text-xs space-y-1.5">
                      <div className="flex justify-between items-center text-slate-500 dark:text-slate-400">
                        <span>Margen comercial:</span>
                        <span className={`font-mono font-bold ${marginStats.isPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500'}`}>
                          {marginStats.isPositive ? `+${marginStats.percent}%` : `${marginStats.percent}%`}
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-slate-500 dark:text-slate-400">
                        <span>Utilidad bruta estimada:</span>
                        <span className="font-mono font-bold text-slate-900 dark:text-white">
                          {fmt(marginStats.profit)}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* CARD 5: STOCK CONTROL */}
              <div className="bg-white dark:bg-[#131627] rounded-2xl border border-slate-200/80 dark:border-white/10 p-5 shadow-xs space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-white/10">
                  <div className="flex items-center gap-2">
                    <Package size={16} className="text-indigo-600 dark:text-indigo-400" />
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                      Control de Almacén
                    </h3>
                  </div>
                </div>

                <div className="space-y-3.5">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      {isEditing ? 'Stock Actual en Almacén' : 'Stock Inicial en Almacén'}
                    </label>
                    {form.is_kit ? (
                      <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-white/5 text-slate-400 text-xs font-medium">
                        Calculado dinámicamente según el producto base
                      </div>
                    ) : (
                      <>
                        <input
                          type="number"
                          min="0"
                          value={form.stock}
                          onChange={(e) => setForm({ ...form, stock: e.target.value })}
                          className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 text-xs sm:text-sm font-mono font-bold text-slate-900 dark:text-white outline-none focus:border-indigo-500 text-center"
                        />
                        {isEditing && (
                          <p className="text-[11px] text-slate-400 mt-1">
                            Al modificar el stock se registrará un ajuste manual en movimientos de almacén.
                          </p>
                        )}
                      </>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Stock Mínimo (Alerta de Quiebre)
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={form.min_stock}
                      onChange={(e) => setForm({ ...form, min_stock: e.target.value })}
                      className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 text-xs sm:text-sm font-mono font-bold text-slate-900 dark:text-white outline-none focus:border-indigo-500 text-center"
                    />
                    <p className="text-[11px] text-slate-400 mt-1">
                      Se mostrará alerta amarilla si las existencias caen a este nivel.
                    </p>
                  </div>
                </div>
              </div>

              {/* CARD 6: SAVE & SUBMIT */}
              <div className="bg-white dark:bg-[#131627] rounded-2xl border border-slate-200/80 dark:border-white/10 p-5 shadow-xs space-y-3">
                {error && (
                  <div className="p-3 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400 text-xs flex items-center gap-2">
                    <AlertCircle size={15} className="shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={saving || limitReached}
                  className="w-full py-3 rounded-xl bg-[#5550F2] hover:bg-[#4742E8] text-white font-extrabold text-xs shadow-md shadow-indigo-600/30 active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                >
                  {saving ? (
                    <span>Guardando producto…</span>
                  ) : (
                    <>
                      <Check size={16} strokeWidth={3} />
                      <span>{isEditing ? 'Guardar Cambios' : 'Crear Producto'}</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => navigate('/productos')}
                  className="w-full py-2.5 rounded-xl border border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/5 text-slate-600 dark:text-slate-400 font-semibold text-xs transition-colors cursor-pointer"
                >
                  Cancelar y Regresar
                </button>

                <div className="pt-2 text-center text-[10.5px] text-slate-400 flex items-center justify-center gap-1">
                  <ShieldCheck size={13} className="text-emerald-500" />
                  <span>Sincronización instantánea con catálogo y kardex</span>
                </div>
              </div>

            </div>

          </div>
        </form>

      </div>
    </AppLayout>
  )
}
