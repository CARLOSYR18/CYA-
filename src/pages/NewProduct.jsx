// Version: 2.1.0 - Senior Enterprise Master Product Registration
import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import {
  ArrowLeft, Boxes, Camera, Check, AlertCircle, X,
  DollarSign, Package, Layers, Sparkles, Crown, ArrowRight,
  ShieldCheck, RotateCcw, Building2, Tag, Percent, ImageOff,
  Home, Pencil, Trash2, Eye, CheckCircle2, TrendingUp,
  AlertTriangle, Zap, ScanBarcode
} from 'lucide-react'
import AppLayout from '../components/layout/AppLayout'
import BarcodeScannerModal from '../components/ui/BarcodeScannerModal'
import { useBarcodeGun } from '../hooks/useBarcodeGun'
import { playScanSuccess } from '../utils/audioFeedback'
import { useFormLeaveGuard } from '../hooks/useFormLeaveGuard'
import { productsService } from '../services/productsService'
import { categoriesService } from '../services/categoriesService'
import { suppliersService } from '../services/suppliersService'
import { inventoryMovementsService } from '../services/inventoryMovementsService'
import { companySettingsService } from '../services/companySettingsService'
import { useAuth } from '../context/AuthContext'
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
  const { user } = useAuth()
  const isEditing = Boolean(id)

  // Inicialización síncrona instantánea (0ms) desde caché para evitar pantallas blancas
  const cachedProds = useMemo(() => productsService.getCached?.() || [], [])
  const initialCurrentProd = useMemo(() => {
    if (!isEditing || !id) return null
    return (cachedProds || []).find((p) => String(p.id) === String(id)) || null
  }, [isEditing, id, cachedProds])

  const [form, setForm] = useState(() => {
    if (initialCurrentProd) {
      return {
        sku: initialCurrentProd.sku || '',
        name: initialCurrentProd.name || '',
        category_id: initialCurrentProd.category_id || '',
        unit: initialCurrentProd.unit || 'unidad',
        cost_price: initialCurrentProd.cost_price !== undefined ? String(initialCurrentProd.cost_price) : '',
        sale_price: initialCurrentProd.sale_price !== undefined ? String(initialCurrentProd.sale_price) : '',
        stock: initialCurrentProd.stock !== undefined ? String(initialCurrentProd.stock) : '0',
        min_stock: initialCurrentProd.min_stock !== undefined ? String(initialCurrentProd.min_stock) : '5',
        supplier_id: initialCurrentProd.supplier_id || '',
        image_url: initialCurrentProd.image_url || '',
        is_kit: Boolean(initialCurrentProd.is_kit),
        kit_component_id: initialCurrentProd.kit_component_id || '',
        kit_quantity: initialCurrentProd.kit_quantity !== undefined ? String(initialCurrentProd.kit_quantity) : '1',
      }
    }
    return initialForm
  })

  const [categories, setCategories] = useState(() => categoriesService.getCached?.() || [])
  const [suppliers, setSuppliers] = useState(() => suppliersService.getCached?.() || [])
  const [allProducts, setAllProducts] = useState(cachedProds)
  const [loading, setLoading] = useState(() => (isEditing ? !initialCurrentProd : false))
  const [isProcessing, setIsProcessing] = useState(false)
  const [processingStep, setProcessingStep] = useState(0) // 1: 35%, 2: 75%, 3: 100%
  const [error, setError] = useState('')
  const [originalProduct, setOriginalProduct] = useState(initialCurrentProd)
  const [scannerOpen, setScannerOpen] = useState(false)
  const [scanToast, setScanToast] = useState('')

  // Soporte directo para pistolas lectoras de código de barras USB / Bluetooth
  useBarcodeGun((scannedCode) => {
    const clean = (scannedCode || '').trim().toUpperCase()
    if (clean) {
      setForm((prev) => ({ ...prev, sku: clean }))
      playScanSuccess()
      setScanToast(`✓ Código escaneado con pistola: ${clean}`)
      setTimeout(() => setScanToast(''), 4000)
    }
  })

  // Image handling
  const [imageFile, setImageFile] = useState(null)
  const [imagePreview, setImagePreview] = useState('')
  const fileInputRef = useRef(null)

  // Plan limits
  const [limitReached, setLimitReached] = useState(false)
  const [limitMsg, setLimitMsg] = useState('')

  // Detección de cambios sin guardar en el producto
  const isDirty = useMemo(() => {
    if (isProcessing) return false
    if (!isEditing) {
      return Boolean(
        form.name.trim() ||
        form.sku.trim() ||
        form.cost_price ||
        form.sale_price ||
        (form.stock !== '0' && form.stock !== '') ||
        form.category_id ||
        imagePreview
      )
    }
    if (!originalProduct) return false
    return (
      form.name !== (originalProduct.name || '') ||
      form.sku !== (originalProduct.sku || '') ||
      String(form.sale_price) !== String(originalProduct.sale_price || '') ||
      String(form.cost_price) !== String(originalProduct.cost_price || '') ||
      String(form.stock) !== String(originalProduct.stock || '') ||
      form.category_id !== (originalProduct.category_id || '') ||
      Boolean(imageFile)
    )
  }, [isProcessing, isEditing, form, originalProduct, imagePreview, imageFile])

  const { requestLeave, DiscardModalComponent } = useFormLeaveGuard({
    isDirty,
    defaultRedirectUrl: '/productos',
    modalTitle: isEditing ? '¿Descartar cambios del producto?' : '¿Descartar nuevo producto?',
    modalDescription: 'Tienes información ingresada en la ficha de este producto. Si sales ahora o recargas la página, los cambios se perderán definitivamente.'
  })

  useEffect(() => {
    let isMounted = true
    const safetyTimer = setTimeout(() => {
      if (isMounted) setLoading(false)
    }, 1200)

    async function initData() {
      try {
        const [cats, sups, prods, company] = await Promise.all([
          categoriesService.list().catch(() => categoriesService.getCached?.() || []),
          suppliersService.list().catch(() => suppliersService.getCached?.() || []),
          productsService.list().catch(() => productsService.getCached?.() || []),
          companySettingsService.get().catch(() => null)
        ])
        if (!isMounted) return

        if (Array.isArray(cats) && cats.length > 0) setCategories(cats)
        if (Array.isArray(sups) && sups.length > 0) setSuppliers(sups)
        if (Array.isArray(prods) && prods.length > 0) setAllProducts(prods)

        if (!isEditing) {
          // Check plan limits
          const limits = getLimits(company)
          if ((prods || []).length >= limits.maxProducts) {
            setLimitReached(true)
            setLimitMsg(`Has alcanzado el límite de tu plan (${limits.maxProducts} productos). Actualiza a Pro para agregar más artículos.`)
          }
          // Auto generate SKU si no fue generado aún
          if (!form.sku) {
            const newSku = await productsService.generateSku(prods)
            setForm(prev => ({ ...prev, sku: prev.sku || newSku }))
          }
        } else {
          // Editing mode: find product by ID
          const currentProd = (prods || []).find(p => String(p.id) === String(id)) || initialCurrentProd
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
      } finally {
        if (isMounted) {
          clearTimeout(safetyTimer)
          setLoading(false)
        }
      }
    }

    initData()
    return () => {
      isMounted = false
      clearTimeout(safetyTimer)
    }
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

  // Selected supplier name for preview
  const selectedSupplierName = useMemo(() => {
    const sup = suppliers.find(s => s.id === form.supplier_id)
    return sup ? sup.name : 'PROVEEDOR GENERAL'
  }, [suppliers, form.supplier_id])

  // Validation checklist for real-time conformity
  const validations = useMemo(() => {
    return {
      name: Boolean(form.name.trim()),
      sku: Boolean(form.sku.trim()),
      salePrice: Number(form.sale_price) > 0,
      category: Boolean(form.category_id),
      photo: Boolean(previewSrc)
    }
  }, [form.name, form.sku, form.sale_price, form.category_id, previewSrc])

  const readyCount = useMemo(() => {
    return Object.values(validations).filter(Boolean).length
  }, [validations])

  // Submission with 3-phase loading animation
  const handleSubmit = useCallback(async (e) => {
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
        // If stock changed manually, register inventory movement safely
        if (!form.is_kit) {
          const oldStock = Number(originalProduct.stock) || 0
          const newStock = Number(form.stock) || 0
          const delta = newStock - oldStock
          if (delta !== 0) {
            try {
              await inventoryMovementsService.register({
                product_id: originalProduct.id,
                type: delta > 0 ? 'entrada' : 'salida',
                quantity: Math.abs(delta),
                reason: 'Ajuste manual desde edición de producto',
                user_id: user?.id || null,
              })
            } catch (mErr) {
              console.warn('Aviso registrando movimiento de stock:', mErr)
            }
          }
        }
      } else {
        const created = await productsService.create(payload)
        if (!form.is_kit && Number(payload.stock) > 0 && created?.id) {
          try {
            await inventoryMovementsService.recordInitialStock({
              product_id: created.id,
              quantity: Number(payload.stock),
              reason: 'Stock inicial al registrar producto',
              user_id: user?.id || null,
            })
          } catch (mErr) {
            console.warn('Aviso registrando movimiento inicial:', mErr)
          }
        }
      }

      setProcessingStep(3) // 100%
      await new Promise((r) => setTimeout(r, 350))

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
  }, [form, imageFile, isEditing, originalProduct, user, navigate])

  // Global keyboard shortcuts (F2: Guardar, Esc: Cancelar)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'F2') {
        e.preventDefault()
        handleSubmit()
      } else if (e.key === 'Escape') {
        if (!isProcessing) {
          requestLeave('/productos')
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleSubmit, isProcessing, requestLeave])

  if (loading) {
    return (
      <AppLayout title={isEditing ? 'Editar Producto' : 'Nuevo Producto'}>
        <div className="max-w-5xl mx-auto p-16 flex flex-col items-center justify-center text-center">
          <div className="w-10 h-10 rounded-full border-3 border-[#1B4FD8] border-t-transparent animate-spin mb-3" />
          <p className="text-xs font-semibold text-slate-500">Cargando ficha maestra del producto…</p>
        </div>
      </AppLayout>
    )
  }

  const stockNum = Number(form.stock) || 0
  const minStockNum = Number(form.min_stock) || 5
  const isOutOfStock = stockNum <= 0
  const isLowStock = stockNum > 0 && stockNum <= minStockNum
  const stockRatio = stockNum <= 0 ? 0 : Math.min(100, Math.max(15, Math.round((stockNum / Math.max(minStockNum * 2, 20)) * 100)))

  // Formatted price tokens for live preview
  const salePriceNum = Number(form.sale_price) || 0
  const intPart = Math.floor(salePriceNum).toLocaleString('es-PE')
  const decPart = (salePriceNum % 1).toFixed(2).substring(2)

  return (
    <AppLayout title={isEditing ? 'Editar Producto' : 'Nuevo Producto'}>
      <div className="max-w-6xl mx-auto space-y-4 pb-32 sm:pb-40 animate-fade-in">

        {/* ═════════════════════════════════════════════════════════
            0. BREADCRUMB & HEADER ROW (SENIOR ERP ARCHITECTURE)
           ═════════════════════════════════════════════════════════ */}
        <div className="bg-white dark:bg-[#141417] rounded-2xl border border-slate-200/90 dark:border-zinc-800 p-3.5 sm:p-5 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
          <div className="flex items-center gap-2.5 sm:gap-3.5 min-w-0">
            <button
              type="button"
              onClick={() => requestLeave('/productos')}
              className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-600 dark:text-zinc-200 flex items-center justify-center transition-colors cursor-pointer shrink-0"
              title="Volver a Catálogo de Productos [Esc]"
            >
              <ArrowLeft size={16} />
            </button>
            <div className="min-w-0">
              <div className="hidden sm:flex items-center gap-1.5 text-[11px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider">
                <span className="hover:text-[#1B4FD8] cursor-pointer" onClick={() => requestLeave('/productos')}>
                  MÓDULO DE INVENTARIO
                </span>
                <span>/</span>
                <span>CATÁLOGO MAESTRO</span>
                <span>/</span>
                <span className="text-[#1B4FD8] dark:text-blue-400">
                  {isEditing ? 'MODIFICAR ARTÍCULO' : 'REGISTRAR ARTÍCULO'}
                </span>
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <h1 className="text-base sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight truncate">
                  {isEditing ? `Modificar: ${originalProduct?.name || form.name}` : 'Alta de Producto'}
                </h1>
                <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-mono font-semibold px-2 py-0.5 rounded-md bg-blue-50 text-[#1B4FD8] dark:bg-blue-950/40 dark:text-blue-300 border border-blue-200/80 dark:border-blue-900/40 shrink-0">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#1B4FD8] animate-pulse" />
                  {isEditing ? 'EDICIÓN' : 'NUEVO'}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => requestLeave('/productos')}
              className="px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl border border-slate-200 dark:border-zinc-700 text-slate-600 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-800 text-xs font-semibold transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isProcessing || limitReached}
              className="px-4 sm:px-5 py-2 sm:py-2.5 rounded-xl bg-[#1B4FD8] hover:bg-[#163FBF] active:scale-95 text-white text-xs font-bold flex items-center gap-1.5 sm:gap-2 shadow-sm shadow-blue-600/25 transition-all cursor-pointer disabled:opacity-60"
            >
              <Check size={15} strokeWidth={2.5} />
              <span>{isEditing ? 'Guardar' : 'Crear'}</span>
              <span className="hidden sm:inline">{isEditing ? ' Cambios [F2]' : ' Producto [F2]'}</span>
            </button>
          </div>
        </div>

        {/* ═════════════════════════════════════════════════════════
            PLAN LIMIT NOTICE (IF LIMIT REACHED ON FREE PLAN)
           ═════════════════════════════════════════════════════════ */}
        {limitReached && (
          <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/50 text-amber-900 dark:text-amber-300 text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
            <div className="flex items-center gap-2.5">
              <Crown size={16} className="text-amber-600 shrink-0" />
              <span>{limitMsg}</span>
            </div>
            <Link
              to="/planes"
              className="px-3.5 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs flex items-center gap-1.5 transition-colors shrink-0"
            >
              <Sparkles size={13} />
              <span>Actualizar a Pro</span>
            </Link>
          </div>
        )}

        {/* ═════════════════════════════════════════════════════════
            1. MAIN FORM GRID: LEFT (7 COLS) + RIGHT PREVIEW (5 COLS)
           ═════════════════════════════════════════════════════════ */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">

          {/* ─── LEFT COLUMN: COMPACT FORM CARDS (7 COLS) ─── */}
          <div className="lg:col-span-7 space-y-4">

            {/* CARD 1: IDENTIFICACIÓN Y DESCRIPCIÓN */}
            <div className="bg-white dark:bg-[#141417] rounded-2xl border border-slate-200/90 dark:border-zinc-800 p-5 shadow-2xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-zinc-800">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-[#1B4FD8] dark:text-blue-400 flex items-center justify-center shrink-0">
                    <Tag size={16} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                      1. Identificación, Clasificación & Atributos
                    </h3>
                    <p className="text-[11px] text-slate-400">Datos comerciales y clasificación en catálogo</p>
                  </div>
                </div>
              </div>

              <div className="space-y-3.5 text-xs sm:text-sm">
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
                    className="w-full bg-slate-50 dark:bg-zinc-800/80 border border-slate-200/80 dark:border-zinc-700 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-slate-900 dark:text-white outline-none focus:border-[#1B4FD8] focus:bg-white dark:focus:bg-zinc-900 font-medium transition-all"
                  />
                </div>

                {/* SKU + Unidad */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300">
                        Código SKU / Barras <span className="text-rose-500">*</span>
                      </label>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setScannerOpen(true)}
                          className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1 cursor-pointer"
                          title="Escanear código de barras con la cámara"
                        >
                          <ScanBarcode size={12} /> Escanear
                        </button>
                        {!isEditing && (
                          <button
                            type="button"
                            onClick={handleRegenerateSku}
                            className="text-[11px] font-bold text-[#1B4FD8] dark:text-blue-400 hover:underline flex items-center gap-1 cursor-pointer"
                            title="Regenerar correlativo automático"
                          >
                            <RotateCcw size={11} /> Regenerar
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="relative">
                      <input
                        type="text"
                        required
                        value={form.sku}
                        onChange={(e) => setForm({ ...form, sku: e.target.value.toUpperCase() })}
                        placeholder="PROD-0001"
                        className="w-full bg-slate-50 dark:bg-zinc-800/80 border border-slate-200/80 dark:border-zinc-700 rounded-xl pl-3.5 pr-10 py-2.5 text-xs sm:text-sm font-mono font-bold text-slate-900 dark:text-white outline-none focus:border-[#1B4FD8] focus:bg-white dark:focus:bg-zinc-900 uppercase transition-all"
                      />
                      <button
                        type="button"
                        onClick={() => setScannerOpen(true)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 cursor-pointer transition"
                        title="Escanear código con cámara"
                      >
                        <ScanBarcode size={16} />
                      </button>
                    </div>
                    {scanToast && (
                      <p className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400 mt-1 animate-fade-in flex items-center gap-1">
                        {scanToast}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1">
                      Unidad de Medida
                    </label>
                    <select
                      value={form.unit}
                      onChange={(e) => setForm({ ...form, unit: e.target.value })}
                      className="w-full bg-slate-50 dark:bg-zinc-800/80 border border-slate-200/80 dark:border-zinc-700 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-slate-900 dark:text-white outline-none focus:border-[#1B4FD8] focus:bg-white dark:focus:bg-zinc-900 font-medium cursor-pointer transition-all"
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
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1">
                      Categoría / Familia
                    </label>
                    <select
                      value={form.category_id}
                      onChange={(e) => setForm({ ...form, category_id: e.target.value })}
                      className="w-full bg-slate-50 dark:bg-zinc-800/80 border border-slate-200/80 dark:border-zinc-700 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-slate-900 dark:text-white outline-none focus:border-[#1B4FD8] focus:bg-white dark:focus:bg-zinc-900 font-medium cursor-pointer transition-all"
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
                      className="w-full bg-slate-50 dark:bg-zinc-800/80 border border-slate-200/80 dark:border-zinc-700 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-slate-900 dark:text-white outline-none focus:border-[#1B4FD8] focus:bg-white dark:focus:bg-zinc-900 font-medium cursor-pointer transition-all"
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
            <div className="bg-white dark:bg-[#141417] rounded-2xl border border-slate-200/90 dark:border-zinc-800 p-5 shadow-2xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-zinc-800">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                    <DollarSign size={16} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                      2. Estructura Financiera, Margen & Existencias
                    </h3>
                    <p className="text-[11px] text-slate-400">Precios comerciales, costo de reposición y stock físico</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs sm:text-sm">
                {/* Cost Price */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1">
                    Precio de Costo (S/)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-mono text-slate-400 text-xs font-bold">S/</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={form.cost_price}
                      onChange={(e) => setForm({ ...form, cost_price: e.target.value })}
                      placeholder="0.00"
                      className="w-full bg-slate-50 dark:bg-zinc-800/80 border border-slate-200/80 dark:border-zinc-700 rounded-xl pl-9 pr-3.5 py-2.5 text-xs sm:text-sm font-mono font-bold text-slate-900 dark:text-white outline-none focus:border-[#1B4FD8] focus:bg-white dark:focus:bg-zinc-900 text-right transition-all"
                    />
                  </div>
                </div>

                {/* Sale Price */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1">
                    Precio de Venta al Público (S/) <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-mono text-[#1B4FD8] text-xs font-bold">S/</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      required
                      value={form.sale_price}
                      onChange={(e) => setForm({ ...form, sale_price: e.target.value })}
                      placeholder="0.00"
                      className="w-full bg-blue-50/30 dark:bg-blue-950/20 border border-blue-200/90 dark:border-blue-900/60 rounded-xl pl-9 pr-3.5 py-2.5 text-xs sm:text-sm font-mono font-extrabold text-[#1B4FD8] dark:text-blue-400 outline-none focus:border-[#1B4FD8] focus:bg-white dark:focus:bg-zinc-900 text-right transition-all"
                    />
                  </div>
                </div>

                {/* Initial Stock */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1">
                    {isEditing ? 'Stock Físico Actual' : 'Stock Inicial en Almacén'}
                  </label>
                  {form.is_kit ? (
                    <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-zinc-800 text-slate-400 text-xs font-medium text-center">
                      Calculado por componentes del combo
                    </div>
                  ) : (
                    <input
                      type="number"
                      min="0"
                      value={form.stock}
                      onChange={(e) => setForm({ ...form, stock: e.target.value })}
                      className="w-full bg-slate-50 dark:bg-zinc-800/80 border border-slate-200/80 dark:border-zinc-700 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm font-mono font-bold text-slate-900 dark:text-white outline-none focus:border-[#1B4FD8] focus:bg-white dark:focus:bg-zinc-900 text-center transition-all"
                    />
                  )}
                </div>

                {/* Min Stock */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1">
                    Stock Mínimo (Alerta de Reposición)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={form.min_stock}
                    onChange={(e) => setForm({ ...form, min_stock: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-zinc-800/80 border border-slate-200/80 dark:border-zinc-700 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm font-mono font-bold text-slate-900 dark:text-white outline-none focus:border-[#1B4FD8] focus:bg-white dark:focus:bg-zinc-900 text-center transition-all"
                  />
                </div>
              </div>

              {/* Simulador Financiero de Utilidad en Vivo */}
              {Number(form.sale_price) > 0 && (
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-zinc-800/50 border border-slate-100 dark:border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs">
                  <div className="flex items-center gap-2">
                    <TrendingUp size={15} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <span className="text-slate-600 dark:text-zinc-300 font-medium">
                      Ganancia bruta estimada: <strong className="font-mono text-slate-900 dark:text-white font-bold">{fmt(marginStats.profit)}</strong> por unidad
                    </span>
                  </div>
                  {Number(form.cost_price) > 0 && (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-800/50 self-start sm:self-auto">
                      +{marginStats.percent}% margen comercial
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* CARD 3: COMBO / KIT (TOGGLE PROFESIONAL) */}
            <div className="bg-white dark:bg-[#141417] rounded-2xl border border-slate-200/90 dark:border-zinc-800 p-5 shadow-2xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-zinc-800">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-purple-50 dark:bg-purple-950/50 text-[#5550F2] dark:text-purple-400 flex items-center justify-center shrink-0">
                    <Layers size={16} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                      3. Configuración de Combo / Kit de Artículos
                    </h3>
                    <p className="text-[11px] text-slate-400">Paquetes o promociones compuestos por existencias de otro artículo</p>
                  </div>
                </div>

                <label className="flex items-center gap-2.5 cursor-pointer select-none">
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
                      form.is_kit ? 'bg-[#1B4FD8]' : 'bg-slate-300 dark:bg-zinc-700'
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${
                        form.is_kit ? 'translate-x-5' : ''
                      }`}
                    />
                  </div>
                  <span className="text-xs font-bold text-slate-700 dark:text-zinc-300">
                    {form.is_kit ? 'Activado' : 'Desactivado'}
                  </span>
                </label>
              </div>

              {form.is_kit ? (
                <div className="p-3.5 rounded-xl bg-blue-50/60 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/40 space-y-3 text-xs">
                  <p className="text-xs text-slate-600 dark:text-zinc-300">
                    Al facturar este combo, el Kardex descontará automáticamente el stock del artículo base vinculado:
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 dark:text-zinc-300 mb-1">
                        Producto base origen *
                      </label>
                      <select
                        value={form.kit_component_id}
                        onChange={(e) => setForm({ ...form, kit_component_id: e.target.value })}
                        required={form.is_kit}
                        className="w-full bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-white outline-none focus:border-[#1B4FD8] cursor-pointer"
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
                        className="w-full bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-800 dark:text-white outline-none focus:border-[#1B4FD8] text-center"
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-[11.5px] text-slate-400">
                  Habilita esta opción si este producto es un paquete o kit promocional compuesto por existencias físicas de otro artículo registrado.
                </p>
              )}
            </div>

          </div>

          {/* ─── RIGHT COLUMN: MEDIA, SENIOR PREVIEW & CONFORMITY CHECKLIST (5 COLS) ─── */}
          <div className="lg:col-span-5 space-y-4">

            {/* CARD: FOTOGRAFÍA DEL PRODUCTO */}
            <div className="bg-white dark:bg-[#141417] rounded-2xl border border-slate-200/90 dark:border-zinc-800 p-5 shadow-2xs space-y-3.5">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-zinc-800">
                <span className="text-xs font-bold text-slate-700 dark:text-zinc-300 flex items-center gap-1.5">
                  <Camera size={15} className="text-[#1B4FD8]" />
                  Fotografía & Multimedia del Producto
                </span>
                <span className="text-[10px] text-slate-400 font-mono font-medium">PNG, JPG o WEBP</span>
              </div>

              <div className="flex items-center gap-3.5">
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="relative w-24 h-24 rounded-2xl border-2 border-dashed border-slate-300 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800/50 flex items-center justify-center overflow-hidden cursor-pointer hover:border-[#1B4FD8] transition-colors shrink-0 group"
                >
                  {previewSrc ? (
                    <>
                      <img
                        src={previewSrc}
                        alt="Previsualización"
                        className="w-full h-full object-contain p-1.5 transition-transform group-hover:scale-105"
                      />
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleResetImage()
                        }}
                        className="absolute top-1 right-1 p-1 rounded-full bg-black/70 hover:bg-rose-600 text-white transition-colors cursor-pointer"
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
                    className="px-3.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-200 text-xs font-bold transition-colors cursor-pointer inline-flex items-center gap-1.5 shadow-2xs"
                  >
                    <Camera size={13} />
                    <span>{previewSrc ? 'Cambiar fotografía' : 'Seleccionar archivo'}</span>
                  </button>
                  <p className="text-[11px] text-slate-400 leading-tight">
                    Fondo blanco o transparente recomendado para presentación ejecutiva en catálogo.
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

            {/* CARD: VISTA PREVIA DE FICHA EN CATÁLOGO (RÉPLICA SENIOR ENTERPRISE EXACTA) */}
            <div className="bg-white dark:bg-[#141417] rounded-2xl border border-slate-200/90 dark:border-zinc-800 p-5 shadow-2xs space-y-3.5">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-zinc-800">
                <span className="text-xs font-bold text-slate-700 dark:text-zinc-300 flex items-center gap-1.5">
                  <Sparkles size={15} className="text-amber-500" />
                  Vista Previa en Tiempo Real
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-[#1B4FD8] dark:bg-blue-950/40 dark:text-blue-300 border border-blue-200/60">
                  En Catálogo
                </span>
              </div>

              {/* Tarjeta de Producto Réplica Senior Enterprise */}
              <div className="bg-white dark:bg-[#141417] rounded-2xl border border-slate-200/90 dark:border-zinc-800 transition-all duration-200 overflow-hidden shadow-sm flex flex-col justify-between">
                <div>
                  {/* Escenario Fotográfico */}
                  <div className="relative w-full h-44 bg-gradient-to-b from-slate-50/70 via-slate-50/30 to-white dark:from-zinc-900/60 dark:via-zinc-900/30 dark:to-transparent p-3 flex items-center justify-center overflow-hidden border-b border-slate-100/80 dark:border-zinc-800/60">
                    {/* SKU & Kit Tag */}
                    <div className="absolute top-2.5 left-2.5 z-10 flex flex-col gap-1 items-start">
                      <span className="font-mono text-[10.5px] font-bold text-slate-700 dark:text-zinc-300 bg-white/95 dark:bg-zinc-800/95 backdrop-blur-md border border-slate-200/80 dark:border-zinc-700 px-2 py-0.5 rounded-md shadow-2xs">
                        {form.sku || 'PROD-0001'}
                      </span>
                      {form.is_kit && (
                        <span className="px-2 py-0.5 rounded-md text-[9.5px] font-extrabold bg-[#5550F2] text-white shadow-xs">
                          COMBO / KIT
                        </span>
                      )}
                    </div>

                    {/* Stock Status Badge */}
                    <div className="absolute top-2.5 right-2.5 z-10">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10.5px] font-bold backdrop-blur-md shadow-2xs ${
                          isOutOfStock
                            ? 'bg-rose-50/95 text-rose-700 border border-rose-200 dark:bg-rose-950/80 dark:text-rose-400'
                            : isLowStock
                            ? 'bg-amber-50/95 text-amber-700 border border-amber-200 dark:bg-amber-950/80 dark:text-amber-400'
                            : 'bg-emerald-50/95 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/80 dark:text-emerald-400'
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            isOutOfStock ? 'bg-rose-500' : isLowStock ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500'
                          }`}
                        />
                        <span>{isOutOfStock ? 'Agotado' : isLowStock ? 'Stock Bajo' : 'Disponible'}</span>
                      </span>
                    </div>

                    {/* Imagen */}
                    {previewSrc ? (
                      <img
                        src={previewSrc}
                        alt="Preview"
                        className="max-h-full max-w-full object-contain drop-shadow-xs"
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center text-slate-300 dark:text-zinc-600">
                        <ImageOff size={30} strokeWidth={1.5} />
                        <span className="text-[10px] text-slate-400 mt-1">Sin fotografía</span>
                      </div>
                    )}
                  </div>

                  {/* Cuerpo */}
                  <div className="p-4 space-y-2.5">
                    <div className="flex items-center gap-1.5 text-[10.5px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider truncate">
                      <span className="truncate">{selectedCategoryName}</span>
                      <span className="text-slate-300 dark:text-zinc-600">·</span>
                      <span className="truncate text-slate-500 dark:text-zinc-400 font-medium">{selectedSupplierName}</span>
                    </div>

                    <h4 className="font-bold text-slate-900 dark:text-white text-sm line-clamp-2 min-h-[36px]">
                      {form.name || 'Nombre Comercial del Producto'}
                    </h4>

                    {/* Módulo Existencias */}
                    <div className="p-2 rounded-xl bg-slate-50/80 dark:bg-zinc-800/40 border border-slate-100 dark:border-zinc-800/80 space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-500 dark:text-zinc-400 text-[11px] font-medium flex items-center gap-1">
                          <Boxes size={12} className="text-slate-400" /> Existencias:
                        </span>
                        <span className="font-mono font-bold text-xs text-slate-900 dark:text-white">
                          {form.is_kit ? 'Dinámico' : `${form.stock || 0} ${form.unit || 'uds.'}`}
                        </span>
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-slate-200/80 dark:bg-zinc-700/80 overflow-hidden">
                        <div
                          style={{ width: `${stockRatio}%` }}
                          className={`h-full rounded-full ${
                            isOutOfStock ? 'bg-rose-500' : isLowStock ? 'bg-amber-500' : 'bg-emerald-500'
                          }`}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Footer de Tarjeta */}
                <div className="px-4 py-3 bg-slate-50/60 dark:bg-zinc-800/30 border-t border-slate-100 dark:border-zinc-800/80 flex items-center justify-between">
                  <div>
                    <div className="flex items-baseline font-sans text-slate-900 dark:text-white leading-none">
                      <span className="text-xs font-bold mr-1 text-slate-600">S/</span>
                      <span className="text-lg font-black tracking-tight">{intPart}</span>
                      <span className="text-xs font-bold self-start ml-0.5">{decPart}</span>
                    </div>
                    {marginStats.isPositive && Number(form.cost_price) > 0 && (
                      <span className="inline-flex items-center text-[10px] font-extrabold text-emerald-700 bg-emerald-50 border border-emerald-200/80 px-1.5 py-0.5 rounded-md mt-0.5">
                        +{marginStats.percent}% margen
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1">
                    <div className="w-7 h-7 rounded-lg bg-white dark:bg-zinc-800 border border-slate-200/80 dark:border-zinc-700 text-slate-400 flex items-center justify-center">
                      <Pencil size={12} />
                    </div>
                    <div className="w-7 h-7 rounded-lg bg-white dark:bg-zinc-800 border border-slate-200/80 dark:border-zinc-700 text-slate-400 flex items-center justify-center">
                      <Trash2 size={12} />
                    </div>
                  </div>
                </div>
              </div>

              {/* Checklist de Conformidad */}
              <div className="p-3.5 rounded-xl bg-slate-50/80 dark:bg-zinc-800/40 border border-slate-100 dark:border-zinc-800 space-y-2 text-xs">
                <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <span>Conformidad de Ficha</span>
                  <span className={readyCount >= 3 ? 'text-emerald-600 font-extrabold' : 'text-amber-600'}>
                    {readyCount}/5 atributos listos
                  </span>
                </div>
                <div className="space-y-1 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600 dark:text-zinc-300">Nombre comercial</span>
                    <span className={validations.name ? 'text-emerald-600 font-bold' : 'text-slate-400'}>
                      {validations.name ? '✓ Asignado' : 'Pendiente *'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600 dark:text-zinc-300">Código SKU</span>
                    <span className={validations.sku ? 'text-emerald-600 font-bold' : 'text-slate-400'}>
                      {validations.sku ? '✓ Listo' : 'Pendiente *'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600 dark:text-zinc-300">Precio de venta</span>
                    <span className={validations.salePrice ? 'text-emerald-600 font-bold' : 'text-slate-400'}>
                      {validations.salePrice ? '✓ Fijado' : 'Pendiente *'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600 dark:text-zinc-300">Familia / Categoría</span>
                    <span className={validations.category ? 'text-emerald-600 font-bold' : 'text-slate-400'}>
                      {validations.category ? '✓ Asignada' : 'Opcional'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600 dark:text-zinc-300">Fotografía del artículo</span>
                    <span className={validations.photo ? 'text-emerald-600 font-bold' : 'text-slate-400'}>
                      {validations.photo ? '✓ Adjunta' : 'Opcional'}
                    </span>
                  </div>
                </div>
              </div>

              {error && (
                <div className="p-3 rounded-xl bg-red-50 text-red-600 text-xs flex items-center gap-2 border border-red-200">
                  <AlertCircle size={15} className="shrink-0" />
                  <span className="truncate">{error}</span>
                </div>
              )}

              {/* Botón Principal & Cancelar */}
              <div className="space-y-2 pt-1">
                <button
                  type="button"
                  disabled={isProcessing || limitReached}
                  onClick={handleSubmit}
                  className="w-full py-3 rounded-xl bg-[#1B4FD8] hover:bg-[#163FBF] active:scale-98 text-white font-bold text-xs sm:text-sm shadow-sm shadow-blue-600/25 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                >
                  {isProcessing ? (
                    <span>Guardando en base de datos…</span>
                  ) : (
                    <>
                      <Check size={16} strokeWidth={3} />
                      <span>{isEditing ? 'Guardar y Actualizar Producto' : 'Guardar y Registrar Producto'}</span>
                      <span className="text-[10px] bg-white/20 px-1.5 py-0.5 rounded ml-1 font-mono">F2</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => requestLeave('/productos')}
                  className="w-full py-2.5 rounded-xl border border-slate-200 dark:border-zinc-700 text-slate-600 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-800 text-xs font-semibold transition-colors cursor-pointer text-center"
                >
                  Descartar y Volver a Catálogo [Esc]
                </button>
              </div>

              <div className="pt-1 text-center text-[10.5px] text-slate-400 flex items-center justify-center gap-1.5">
                <ShieldCheck size={13} className="text-emerald-500" />
                <span>Base de datos protegida con Row Level Security & Kardex inmutable</span>
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
              <div className="w-14 h-14 rounded-full border-3 border-[#1B4FD8] border-t-transparent animate-spin mx-auto flex items-center justify-center">
                <Boxes size={22} className="text-[#1B4FD8] animate-pulse" />
              </div>

              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-white">
                  {isEditing ? 'Actualizando Ficha Maestra' : 'Registrando en Catálogo'}
                </h3>
                <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">
                  {processingStep === 1 && 'Validando correlativo SKU y reglas comerciales…'}
                  {processingStep === 2 && 'Sincronizando existencias físicas y Kardex contable…'}
                  {processingStep === 3 && '¡Producto registrado con éxito! Redirigiendo…'}
                </p>
              </div>

              <div className="w-full bg-slate-100 dark:bg-zinc-800 h-1.5 rounded-full overflow-hidden">
                <div
                  className="bg-[#1B4FD8] h-full transition-all duration-300"
                  style={{
                    width: processingStep === 1 ? '35%' : processingStep === 2 ? '75%' : '100%'
                  }}
                />
              </div>
            </div>
          </div>
        )}

        {/* Modal de confirmación para descartar cambios */}
        {DiscardModalComponent}

        {/* Lector de Código de Barras con Cámara */}
        <BarcodeScannerModal
          isOpen={scannerOpen}
          onClose={() => setScannerOpen(false)}
          onScan={(code) => {
            const clean = (code || '').trim().toUpperCase()
            if (clean) {
              setForm((prev) => ({ ...prev, sku: clean }))
              setScanToast(`✓ Código escaneado: ${clean}`)
              setTimeout(() => setScanToast(''), 4000)
            }
          }}
          title="Escanear Código de Barras / SKU"
          subtitle="Apunta la cámara al código de barras del producto para asignarlo al SKU"
        />

      </div>
    </AppLayout>
  )
}
