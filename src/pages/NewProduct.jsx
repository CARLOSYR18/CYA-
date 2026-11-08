import { useState, useEffect, useRef, useMemo } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import {
  ArrowLeft, Boxes, Camera, Check, AlertCircle, X,
  DollarSign, Package, Layers, Sparkles, Crown, ArrowRight,
  ShieldCheck, RotateCcw, Building2, Tag, Percent, ImageOff,
  Home, Pencil, Trash2
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
  const [isProcessing, setIsProcessing] = useState(false)
  const [processingStep, setProcessingStep] = useState(0) // 1: 35%, 2: 75%, 3: 100%
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
      percent: Math.round(percent),
      isPositive: profit >= 0
    }
  }, [form.cost_price, form.sale_price])

  // Re-generate SKU
  const handleRegenerateSku = async () => {
    const newSku = await productsService.generateSku()
    setForm(f => ({ ...f, sku: newSku }))
  }

  // Selected category name for preview
  const selectedCategoryName = useMemo(() => {
    const cat = categories.find(c => c.id === form.category_id)
    return cat ? cat.name : 'CATÁLOGO GENERAL'
  }, [categories, form.category_id])

  // Submission with 3-phase loading animation
  const handleSubmit = async (e) => {
    if (e && e.preventDefault) e.preventDefault()
    setError('')

    if (!form.name.trim()) {
      setError('Por favor indica el nombre comercial del producto')
      return
    }
    if (!form.sku.trim()) {
      setError('El código SKU es obligatorio')
      return
    }

    setIsProcessing(true)
    setProcessingStep(1) // 35%

    try {
      await new Promise((r) => setTimeout(r, 400))
      setProcessingStep(2) // 75%

      let finalImageUrl = form.image_url || ''
      if (imageFile) {
        try {
          finalImageUrl = await productsService.uploadImage(imageFile)
        } catch (uploadErr) {
          setIsProcessing(false)
          setError(uploadErr.message || 'No se pudo subir la fotografía del producto')
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
      } else {
        await productsService.create(payload)
      }

      setProcessingStep(3) // 100%
      await new Promise((r) => setTimeout(r, 450))

      setIsProcessing(false)
      navigate('/productos', {
        state: {
          created: !isEditing,
          updated: isEditing,
          productName: form.name
        }
      })
    } catch (err) {
      setIsProcessing(false)
      setProcessingStep(0)
      console.error(err)
      setError(err.message || 'Error al guardar el producto en la base de datos')
    }
  }

  if (loading) {
    return (
      <AppLayout title={isEditing ? 'Editar Producto' : 'Nuevo Producto'}>
        <div className="max-w-5xl mx-auto p-16 flex flex-col items-center justify-center text-center">
          <div className="w-10 h-10 rounded-full border-3 border-blue-600 border-t-transparent animate-spin mb-3" />
          <p className="text-xs font-semibold text-slate-500">Cargando datos del producto…</p>
        </div>
      </AppLayout>
    )
  }

  const stockNum = Number(form.stock) || 0
  const isOutOfStock = stockNum <= 0

  return (
    <AppLayout title={isEditing ? 'Editar Producto' : 'Nuevo Producto'}>
      <div className="max-w-6xl mx-auto space-y-3.5 pb-8 animate-fade-in">

        {/* ═════════════════════════════════════════════════════════
            0. TOP BAR (COMPACT EXECUTIVE HEADER & BREADCRUMB)
           ═════════════════════════════════════════════════════════ */}
        <div className="bg-white dark:bg-[#141417] rounded-2xl border border-slate-200/80 dark:border-zinc-800 p-3.5 sm:p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate('/productos')}
              className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-600 dark:text-zinc-200 flex items-center justify-center transition-colors cursor-pointer"
              title="Volver a Catálogo de Productos"
            >
              <ArrowLeft size={16} />
            </button>
            <div>
              <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium">
                <span className="hover:text-blue-600 cursor-pointer" onClick={() => navigate('/productos')}>
                  Catálogo
                </span>
                <span>/</span>
                <span className="text-blue-600 dark:text-blue-400 font-semibold">
                  {isEditing ? 'Modificar Artículo' : 'Nuevo Artículo'}
                </span>
              </div>
              <h1 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white tracking-tight">
                {isEditing ? `Editar: ${originalProduct?.name || form.name}` : 'Registrar Nuevo Producto en Catálogo'}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <button
              type="button"
              onClick={() => navigate('/productos')}
              className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-zinc-700 text-slate-600 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-800 text-xs font-semibold transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isProcessing || limitReached}
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-95 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm shadow-blue-500/25 transition-all cursor-pointer disabled:opacity-60"
            >
              <Check size={15} strokeWidth={2.5} />
              <span>{isEditing ? 'Guardar Cambios' : 'Crear Producto'}</span>
            </button>
          </div>
        </div>

        {/* ═════════════════════════════════════════════════════════
            PLAN LIMIT NOTICE (IF LIMIT REACHED ON FREE PLAN)
           ═════════════════════════════════════════════════════════ */}
        {limitReached && (
          <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/50 text-amber-900 dark:text-amber-300 text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
            <div className="flex items-center gap-2.5">
              <Crown size={16} className="text-amber-600 shrink-0" />
              <span>{limitMsg}</span>
            </div>
            <Link
              to="/planes"
              className="px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs flex items-center gap-1 transition-colors shrink-0"
            >
              <Sparkles size={13} />
              <span>Actualizar a Pro</span>
            </Link>
          </div>
        )}

        {/* ═════════════════════════════════════════════════════════
            1. MAIN FORM GRID: LEFT (7 COLS) + RIGHT PREVIEW (5 COLS)
           ═════════════════════════════════════════════════════════ */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 items-start">

          {/* ─── LEFT COLUMN: COMPACT FORM CARDS (7 COLS) ─── */}
          <div className="lg:col-span-7 space-y-3.5">

            {/* CARD 1: IDENTIFICACIÓN Y DESCRIPCIÓN */}
            <div className="bg-white dark:bg-[#141417] rounded-2xl border border-slate-200/80 dark:border-zinc-800 p-4 shadow-xs space-y-3">
              <div className="flex items-center gap-2 pb-2.5 border-b border-slate-100 dark:border-zinc-800">
                <div className="w-7 h-7 rounded-lg bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                  <Tag size={15} />
                </div>
                <div>
                  <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                    1. Identificación y Descripción del Producto
                  </h3>
                </div>
              </div>

              <div className="space-y-3 text-xs sm:text-sm">
                {/* Nombre Comercial */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1">
                    Nombre Comercial del Producto <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="Ej. AirPods 3 Pro (con estuche de carga MagSafe)"
                    className="w-full bg-slate-50 dark:bg-zinc-800/80 border border-slate-200/80 dark:border-zinc-700 rounded-xl px-3 py-2 text-xs sm:text-sm text-slate-900 dark:text-white outline-none focus:border-blue-600 font-medium"
                  />
                </div>

                {/* SKU + Unidad */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300">
                        Código SKU <span className="text-rose-500">*</span>
                      </label>
                      {!isEditing && (
                        <button
                          type="button"
                          onClick={handleRegenerateSku}
                          className="text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 cursor-pointer"
                          title="Regenerar correlativo automático"
                        >
                          <RotateCcw size={11} /> Regenerar
                        </button>
                      )}
                    </div>
                    <input
                      type="text"
                      required
                      value={form.sku}
                      onChange={(e) => setForm({ ...form, sku: e.target.value.toUpperCase() })}
                      placeholder="PROD-0001"
                      className="w-full bg-slate-50 dark:bg-zinc-800/80 border border-slate-200/80 dark:border-zinc-700 rounded-xl px-3 py-2 text-xs sm:text-sm font-mono font-bold text-slate-900 dark:text-white outline-none focus:border-blue-600 uppercase"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1">
                      Unidad de Medida
                    </label>
                    <select
                      value={form.unit}
                      onChange={(e) => setForm({ ...form, unit: e.target.value })}
                      className="w-full bg-slate-50 dark:bg-zinc-800/80 border border-slate-200/80 dark:border-zinc-700 rounded-xl px-3 py-2 text-xs sm:text-sm text-slate-900 dark:text-white outline-none focus:border-blue-600 font-medium cursor-pointer"
                    >
                      {['unidad', 'caja', 'paquete', 'rollo', 'kg', 'litro', 'metro', 'par', 'set'].map((u) => (
                        <option key={u} value={u}>
                          {u.charAt(0).toUpperCase() + u.slice(1)}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Categoría & Proveedor */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1">
                      Categoría / Familia
                    </label>
                    <select
                      value={form.category_id}
                      onChange={(e) => setForm({ ...form, category_id: e.target.value })}
                      className="w-full bg-slate-50 dark:bg-zinc-800/80 border border-slate-200/80 dark:border-zinc-700 rounded-xl px-3 py-2 text-xs sm:text-sm text-slate-900 dark:text-white outline-none focus:border-blue-600 font-medium cursor-pointer"
                    >
                      <option value="">Sin categoría asignada</option>
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1">
                      Proveedor Principal
                    </label>
                    <select
                      value={form.supplier_id}
                      onChange={(e) => setForm({ ...form, supplier_id: e.target.value })}
                      className="w-full bg-slate-50 dark:bg-zinc-800/80 border border-slate-200/80 dark:border-zinc-700 rounded-xl px-3 py-2 text-xs sm:text-sm text-slate-900 dark:text-white outline-none focus:border-blue-600 font-medium cursor-pointer"
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

            {/* CARD 2: PRECIOS, COSTOS & EXISTENCIAS */}
            <div className="bg-white dark:bg-[#141417] rounded-2xl border border-slate-200/80 dark:border-zinc-800 p-4 shadow-xs space-y-3">
              <div className="flex items-center gap-2 pb-2.5 border-b border-slate-100 dark:border-zinc-800">
                <div className="w-7 h-7 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                  <DollarSign size={15} />
                </div>
                <div>
                  <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                    2. Precios Comerciales & Control de Almacén
                  </h3>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs sm:text-sm">
                {/* Cost Price */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1">
                    Precio de Costo (S/)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 font-mono text-slate-400 text-xs">S/</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={form.cost_price}
                      onChange={(e) => setForm({ ...form, cost_price: e.target.value })}
                      placeholder="0.00"
                      className="w-full bg-slate-50 dark:bg-zinc-800/80 border border-slate-200/80 dark:border-zinc-700 rounded-xl pl-8 pr-3 py-2 text-xs sm:text-sm font-mono font-bold text-slate-900 dark:text-white outline-none focus:border-blue-600 text-right"
                    />
                  </div>
                </div>

                {/* Sale Price */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1">
                    Precio de Venta al Público (S/) <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 font-mono text-blue-600 text-xs font-bold">S/</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      required
                      value={form.sale_price}
                      onChange={(e) => setForm({ ...form, sale_price: e.target.value })}
                      placeholder="0.00"
                      className="w-full bg-slate-50 dark:bg-zinc-800/80 border border-blue-200 dark:border-blue-900/60 rounded-xl pl-8 pr-3 py-2 text-xs sm:text-sm font-mono font-extrabold text-blue-600 dark:text-blue-400 outline-none focus:border-blue-600 text-right"
                    />
                  </div>
                </div>

                {/* Initial Stock */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1">
                    {isEditing ? 'Stock Actual' : 'Stock Inicial en Almacén'}
                  </label>
                  {form.is_kit ? (
                    <div className="p-2 rounded-xl bg-slate-100 dark:bg-zinc-800 text-slate-400 text-xs font-medium text-center">
                      Calculado por combo
                    </div>
                  ) : (
                    <input
                      type="number"
                      min="0"
                      value={form.stock}
                      onChange={(e) => setForm({ ...form, stock: e.target.value })}
                      className="w-full bg-slate-50 dark:bg-zinc-800/80 border border-slate-200/80 dark:border-zinc-700 rounded-xl px-3 py-2 text-xs sm:text-sm font-mono font-bold text-slate-900 dark:text-white outline-none focus:border-blue-600 text-center"
                    />
                  )}
                </div>

                {/* Min Stock */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1">
                    Stock Mínimo (Alerta)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={form.min_stock}
                    onChange={(e) => setForm({ ...form, min_stock: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-zinc-800/80 border border-slate-200/80 dark:border-zinc-700 rounded-xl px-3 py-2 text-xs sm:text-sm font-mono font-bold text-slate-900 dark:text-white outline-none focus:border-blue-600 text-center"
                  />
                </div>
              </div>

              {/* Profit margin pill */}
              {Number(form.cost_price) > 0 && Number(form.sale_price) > 0 && (
                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-zinc-800/50 border border-slate-100 dark:border-zinc-800 flex items-center justify-between text-xs">
                  <span className="text-slate-500 dark:text-zinc-400">
                    Utilidad estimada: <strong className="font-mono text-slate-800 dark:text-white">{fmt(marginStats.profit)}</strong> por unidad
                  </span>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                    +{marginStats.percent}% margen comercial
                  </span>
                </div>
              )}
            </div>

            {/* CARD 3: COMBO / KIT (COMPACT TOGGLE) */}
            <div className="bg-white dark:bg-[#141417] rounded-2xl border border-slate-200/80 dark:border-zinc-800 p-4 shadow-xs space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-zinc-800">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
                    <Layers size={15} />
                  </div>
                  <div>
                    <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                      3. Producto Tipo Combo / Kit
                    </h3>
                  </div>
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
                    className={`relative w-10 h-5.5 rounded-full transition-colors duration-200 cursor-pointer ${
                      form.is_kit ? 'bg-blue-600' : 'bg-slate-300 dark:bg-zinc-700'
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 left-0.5 w-4.5 h-4.5 bg-white rounded-full shadow transition-transform duration-200 ${
                        form.is_kit ? 'translate-x-4.5' : ''
                      }`}
                    />
                  </div>
                  <span className="text-xs font-bold text-slate-700 dark:text-zinc-300">
                    {form.is_kit ? 'Activado' : 'Desactivado'}
                  </span>
                </label>
              </div>

              {form.is_kit ? (
                <div className="p-3 rounded-xl bg-blue-50/60 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/40 space-y-2 text-xs">
                  <p className="text-[11.5px] text-slate-600 dark:text-zinc-300">
                    El stock se descontará automáticamente del artículo base seleccionado:
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 dark:text-zinc-300 mb-1">
                        Producto base origen *
                      </label>
                      <select
                        value={form.kit_component_id}
                        onChange={(e) => setForm({ ...form, kit_component_id: e.target.value })}
                        required={form.is_kit}
                        className="w-full bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-xl px-2.5 py-1.5 text-xs text-slate-800 dark:text-white outline-none focus:border-blue-600 cursor-pointer"
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
                      <label className="block text-[11px] font-bold text-slate-700 dark:text-zinc-300 mb-1">
                        Unidades descontadas por combo *
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={form.kit_quantity}
                        onChange={(e) => setForm({ ...form, kit_quantity: e.target.value })}
                        required={form.is_kit}
                        className="w-full bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-xl px-2.5 py-1.5 text-xs font-mono font-bold text-slate-800 dark:text-white outline-none focus:border-blue-600 text-center"
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-[11.5px] text-slate-400">
                  Habilita esta opción si este producto es un paquete o promoción compuesto por existencias de otro producto.
                </p>
              )}
            </div>

          </div>

          {/* ─── RIGHT COLUMN: PHOTO UPLOAD, LIVE CARD PREVIEW & ACTIONS (5 COLS) ─── */}
          <div className="lg:col-span-5 space-y-3.5">

            {/* CARD: FOTOGRAFÍA DEL PRODUCTO (COMPACT UPLOADER) */}
            <div className="bg-white dark:bg-[#141417] rounded-2xl border border-slate-200/80 dark:border-zinc-800 p-4 shadow-xs space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-zinc-800">
                <span className="text-xs font-bold text-slate-700 dark:text-zinc-300 flex items-center gap-1.5">
                  <Camera size={14} className="text-blue-600" />
                  Fotografía del Producto
                </span>
                <span className="text-[10px] text-slate-400 font-medium">PNG, JPG o WEBP</span>
              </div>

              <div className="flex items-center gap-3">
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="relative w-24 h-24 rounded-2xl border-2 border-dashed border-slate-300 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800/50 flex items-center justify-center overflow-hidden cursor-pointer hover:border-blue-500 transition-colors shrink-0 group"
                >
                  {previewSrc ? (
                    <>
                      <img
                        src={previewSrc}
                        alt="Previsualización"
                        className="w-full h-full object-contain p-1.5"
                      />
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleResetImage()
                        }}
                        className="absolute top-1 right-1 p-1 rounded-full bg-black/70 hover:bg-red-600 text-white transition-colors cursor-pointer"
                        title="Eliminar imagen"
                      >
                        <X size={12} />
                      </button>
                    </>
                  ) : (
                    <div className="flex flex-col items-center justify-center text-slate-400 p-1 text-center">
                      <Camera size={22} className="mb-0.5 text-slate-300 dark:text-zinc-600" />
                      <span className="text-[10px] font-semibold text-slate-500">Subir foto</span>
                    </div>
                  )}
                </div>

                <div className="flex-1 space-y-1.5 text-xs">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-200 text-xs font-bold transition-colors cursor-pointer inline-flex items-center gap-1"
                  >
                    <Camera size={13} />
                    <span>{previewSrc ? 'Cambiar fotografía' : 'Seleccionar archivo'}</span>
                  </button>
                  <p className="text-[11px] text-slate-400 leading-tight">
                    Fondo blanco o transparente recomendado para catálogo profesional.
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

            {/* CARD: LIVE PRODUCT CARD PREVIEW (EXACT REPLICA OF PRODUCTS GRID) */}
            <div className="bg-white dark:bg-[#141417] rounded-2xl border border-slate-200/80 dark:border-zinc-800 p-4 shadow-xs space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-zinc-800">
                <span className="text-xs font-bold text-slate-700 dark:text-zinc-300 flex items-center gap-1.5">
                  <Sparkles size={14} className="text-amber-500" />
                  Vista Previa en Tiempo Real
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300">
                  En Catálogo
                </span>
              </div>

              {/* Exact Card Replica */}
              <div className="bg-white dark:bg-[#141417] rounded-2xl border border-slate-200/90 dark:border-zinc-700 p-4 space-y-3 shadow-sm">
                {/* Top row: SKU on left & Status on right */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex flex-col gap-1 items-start">
                    <span className="font-mono text-xs font-bold text-slate-700 dark:text-zinc-300 bg-slate-100 dark:bg-zinc-800 px-2 py-0.5 rounded-md">
                      {form.sku || 'PROD-0001'}
                    </span>
                    {form.is_kit && (
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-[#5550F2] text-white">
                        Combo / Kit
                      </span>
                    )}
                  </div>

                  <div>
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                        isOutOfStock
                          ? 'bg-rose-50 text-rose-600 border border-rose-200/70 dark:bg-rose-950/40 dark:text-rose-400'
                          : 'bg-emerald-50 text-emerald-600 border border-emerald-200/70 dark:bg-emerald-950/40 dark:text-emerald-400'
                      }`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          isOutOfStock ? 'bg-rose-500' : 'bg-emerald-500'
                        }`}
                      />
                      <span>{isOutOfStock ? 'Agotado' : 'Disponible'}</span>
                    </span>
                  </div>
                </div>

                {/* Centered Image */}
                <div className="w-full h-36 rounded-xl bg-slate-50/60 dark:bg-zinc-900 flex items-center justify-center p-2 overflow-hidden">
                  {previewSrc ? (
                    <img
                      src={previewSrc}
                      alt="Preview"
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center text-slate-300 dark:text-zinc-600">
                      <ImageOff size={28} strokeWidth={1.5} />
                      <span className="text-[10px] text-slate-400 mt-0.5">Sin fotografía</span>
                    </div>
                  )}
                </div>

                {/* Category & Title */}
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">
                    {selectedCategoryName}
                  </p>
                  <h4 className="font-bold text-slate-900 dark:text-white text-sm truncate">
                    {form.name || 'Nombre Comercial del Producto'}
                  </h4>

                  <div className="mt-2 pt-2 border-t border-slate-100 dark:border-zinc-800 flex items-center justify-between text-xs">
                    <span className="text-slate-500 dark:text-zinc-400">Existencias:</span>
                    <span className="font-mono font-bold text-slate-900 dark:text-white">
                      {form.is_kit ? 'Dinámico' : `${form.stock || 0} ${form.unit || 'unidad'}`}
                    </span>
                  </div>
                </div>

                {/* Price & Actions */}
                <div className="pt-2 border-t border-slate-100 dark:border-zinc-800 flex items-center justify-between">
                  <div>
                    <p className="font-mono font-black text-base text-slate-900 dark:text-white leading-tight">
                      {fmt(form.sale_price || 0)}
                    </p>
                    {marginStats.isPositive && Number(form.cost_price) > 0 && (
                      <p className="text-[10px] font-bold text-emerald-600 mt-0.5">
                        +{marginStats.percent}% margen
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-1 text-slate-300">
                    <div className="p-1.5 rounded-lg bg-slate-100 dark:bg-zinc-800 text-slate-400">
                      <Pencil size={13} />
                    </div>
                    <div className="p-1.5 rounded-lg bg-slate-100 dark:bg-zinc-800 text-slate-400">
                      <Trash2 size={13} />
                    </div>
                  </div>
                </div>
              </div>

              {error && (
                <div className="p-2.5 rounded-xl bg-red-50 text-red-600 text-xs flex items-center gap-1.5">
                  <AlertCircle size={15} className="shrink-0" />
                  <span className="truncate">{error}</span>
                </div>
              )}

              {/* Action Buttons */}
              <div className="space-y-2 pt-2">
                <button
                  type="button"
                  disabled={isProcessing || limitReached}
                  onClick={handleSubmit}
                  className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-98 text-white font-bold text-xs sm:text-sm shadow-md shadow-blue-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                >
                  {isProcessing ? (
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
                  className="w-full py-2 rounded-xl border border-slate-200 dark:border-zinc-700 text-slate-600 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-800 text-xs font-semibold transition-colors cursor-pointer text-center"
                >
                  Cancelar y Regresar
                </button>
              </div>

              <div className="pt-1 text-center text-[10.5px] text-slate-400 flex items-center justify-center gap-1">
                <ShieldCheck size={13} className="text-emerald-500" />
                <span>Sincronización instantánea con catálogo y kardex</span>
              </div>
            </div>

          </div>

        </div>

        {/* ═════════════════════════════════════════════════════════
            OVERLAY: 3-STEP LOADING ANIMATION SCREEN
           ═════════════════════════════════════════════════════════ */}
        {isProcessing && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4 animate-fade-in">
            <div className="bg-white dark:bg-[#18181b] rounded-2xl border border-slate-200 dark:border-zinc-700 p-6 max-w-sm w-full text-center shadow-2xl space-y-4 animate-slide-up">
              <div className="w-14 h-14 rounded-full border-3 border-blue-600 border-t-transparent animate-spin mx-auto flex items-center justify-center">
                <Boxes size={22} className="text-blue-600 animate-pulse" />
              </div>

              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-white">
                  {isEditing ? 'Actualizando Producto' : 'Creando Producto'}
                </h3>
                <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">
                  {processingStep === 1 && 'Validando SKU y atributos del artículo…'}
                  {processingStep === 2 && 'Registrando producto en catálogo y kardex de almacén…'}
                  {processingStep === 3 && '¡Producto registrado con éxito! Redirigiendo…'}
                </p>
              </div>

              <div className="w-full bg-slate-100 dark:bg-zinc-800 h-1.5 rounded-full overflow-hidden">
                <div
                  className="bg-blue-600 h-full transition-all duration-300"
                  style={{
                    width: processingStep === 1 ? '35%' : processingStep === 2 ? '75%' : '100%'
                  }}
                />
              </div>
            </div>
          </div>
        )}

      </div>
    </AppLayout>
  )
}
