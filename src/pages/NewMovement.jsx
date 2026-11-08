import { useState, useEffect, useMemo, useRef } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import {
  ArrowLeft, ArrowDownLeft, ArrowUpRight, ArrowLeftRight, Package,
  Boxes, Check, AlertCircle, RefreshCw, Hash, Calendar, Clock,
  User, FileText, CheckCircle2, Sparkles, AlertTriangle, ShieldCheck,
  Search, Plus, Minus, Info, ChevronDown, CheckCircle, Tag, ShoppingCart, Truck
} from 'lucide-react'
import AppLayout from '../components/layout/AppLayout'
import { inventoryMovementsService } from '../services/inventoryMovementsService'
import { productsService } from '../services/productsService'
import { useAuth } from '../context/AuthContext'

const fmt = (n) =>
  `S/ ${(Number(n) || 0).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

const fmtN = (n) => (Number(n) || 0).toLocaleString('es-PE')

/* Generador de código de referencia hexadecimal aleatorio (# + 6 caracteres) */
function generateRandomReference() {
  const chars = '0123456789ABCDEF'
  let result = '#'
  for (let i = 0; i < 6; i++) {
    result += chars[Math.floor(Math.random() * chars.length)]
  }
  return result
}

/* Sugerencias rápidas de motivos según tipo */
const QUICK_REASONS = {
  entrada: [
    'Compra a proveedor',
    'Ajuste por inventario físico',
    'Devolución de cliente',
    'Recepción de mercadería',
    'Producción interna',
    'Regalo / Bonificación'
  ],
  salida: [
    'Venta manual',
    'Merma / Producto dañado',
    'Muestra comercial',
    'Uso interno de tienda',
    'Ajuste por pérdida',
    'Devolución a proveedor'
  ]
}

export default function NewMovement() {
  const navigate = useNavigate()
  const { id } = useParams()
  const isEditing = Boolean(id)
  const { user } = useAuth()

  // Lista de productos cargados
  const [products, setProducts] = useState(() => productsService.getCached?.() || [])
  const [loadingProducts, setLoadingProducts] = useState(!products.length)

  // Form State
  const [type, setType] = useState('entrada') // 'entrada' | 'salida'
  const [productId, setProductId] = useState('')
  const [quantity, setQuantity] = useState(1)
  const [reason, setReason] = useState('Compra a proveedor')
  const [reference, setReference] = useState(() => generateRandomReference())
  const [notes, setNotes] = useState('')

  // UI State
  const [productSearch, setProductSearch] = useState('')
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [originalMovement, setOriginalMovement] = useState(null)
  const [error, setError] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [processingStep, setProcessingStep] = useState(0) // 1: 35%, 2: 75%, 3: 100%

  const searchBoxRef = useRef(null)

  // Cargar productos
  useEffect(() => {
    let isMounted = true
    async function loadData() {
      try {
        const prodList = await productsService.list()
        if (isMounted) {
          setProducts(prodList || [])
          setLoadingProducts(false)
        }
      } catch (err) {
        console.error('Error cargando productos:', err)
        if (isMounted) setLoadingProducts(false)
      }
    }
    loadData()
    return () => { isMounted = false }
  }, [])

  // Si está editando, cargar el movimiento original
  useEffect(() => {
    if (!isEditing || !id) return
    async function loadMovement() {
      try {
        const movList = await inventoryMovementsService.list()
        const current = movList.find((m) => String(m.id) === String(id))
        if (current) {
          setOriginalMovement(current)
          setType(current.type || 'entrada')
          setProductId(current.product_id || '')
          setQuantity(Number(current.quantity) || 1)
          setReason(current.reason || '')
          setReference(current.reference || '')
        } else {
          setError('No se encontró el movimiento solicitado.')
        }
      } catch (err) {
        console.error(err)
        setError('Error al cargar datos del movimiento.')
      }
    }
    loadMovement()
  }, [id, isEditing])

  // Cerrar buscador al hacer clic fuera
  useEffect(() => {
    function handleClickOutside(e) {
      if (searchBoxRef.current && !searchBoxRef.current.contains(e.target)) {
        setIsSearchOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Producto seleccionado actual
  const selectedProduct = useMemo(() => {
    return products.find((p) => p.id === productId) || null
  }, [products, productId])

  // Filtrar productos para selector
  const filteredProducts = useMemo(() => {
    if (!productSearch.trim()) return products.slice(0, 10)
    const term = productSearch.toLowerCase()
    return products.filter((p) =>
      p.name?.toLowerCase().includes(term) ||
      p.sku?.toLowerCase().includes(term) ||
      p.category?.toLowerCase().includes(term)
    ).slice(0, 15)
  }, [products, productSearch])

  // Cálculos matemáticos de stock
  const currentStock = Number(selectedProduct?.stock) || 0
  const opQty = Math.max(1, Number(quantity) || 1)
  const isEntry = type === 'entrada'

  // Proyección de stock
  const projectedStock = useMemo(() => {
    if (!selectedProduct) return 0
    if (isEditing && originalMovement && originalMovement.product_id === selectedProduct.id) {
      // Revertir efecto anterior y calcular nuevo
      const reverted = originalMovement.type === 'entrada'
        ? currentStock - originalMovement.quantity
        : currentStock + originalMovement.quantity
      return isEntry ? reverted + opQty : reverted - opQty
    }
    return isEntry ? currentStock + opQty : currentStock - opQty
  }, [selectedProduct, isEditing, originalMovement, currentStock, isEntry, opQty])

  // Validación de stock insuficiente
  const isInsufficientStock = !isEntry && opQty > currentStock && !isEditing

  // Valorización estimada
  const estimatedValue = useMemo(() => {
    if (!selectedProduct) return 0
    const unitPrice = Number(selectedProduct.price) || Number(selectedProduct.cost) || 0
    return opQty * unitPrice
  }, [selectedProduct, opQty])

  // Fecha y hora formateada en tiempo real
  const currentTime = useMemo(() => {
    const now = new Date()
    return {
      date: now.toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' }),
      time: now.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', hour12: true })
    }
  }, [])

  // Cambiar tipo de operación y setear motivo sugerido por defecto si el actual era uno rápido
  const handleTypeChange = (newType) => {
    setType(newType)
    if (!reason || QUICK_REASONS[type].includes(reason)) {
      setReason(QUICK_REASONS[newType][0])
    }
  }

  // Generar nueva referencia
  const handleRegenerateRef = () => {
    setReference(generateRandomReference())
  }

  // Submit Handler con animación ejecutiva de 3 pasos
  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (!productId) {
      setError('Por favor selecciona un producto del catálogo.')
      return
    }

    if (!opQty || opQty <= 0) {
      setError('La cantidad a registrar debe ser mayor a 0.')
      return
    }

    if (isInsufficientStock) {
      setError(`Stock insuficiente: Intentas retirar ${opQty} uds., pero solo hay ${currentStock} uds. disponibles en inventario.`)
      return
    }

    setIsProcessing(true)
    setProcessingStep(1) // 35%: Validando reglas de kardex

    try {
      await new Promise((r) => setTimeout(r, 350))
      setProcessingStep(2) // 75%: Registrando movimiento y sincronizando stock

      const payload = {
        product_id: productId,
        type,
        quantity: opQty,
        reason: reason.trim() || (isEntry ? 'Ingreso a bodega' : 'Salida manual'),
        reference: reference.trim() || null
      }

      if (isEditing && originalMovement) {
        await inventoryMovementsService.update(originalMovement, payload)
      } else {
        await inventoryMovementsService.register(payload)
      }

      setProcessingStep(3) // 100%: Kardex actualizado con éxito
      await new Promise((r) => setTimeout(r, 450))

      setIsProcessing(false)
      navigate('/movimientos', {
        state: {
          successNotification: {
            title: isEditing ? 'Movimiento Actualizado' : 'Movimiento Registrado en Kardex',
            description: `${isEntry ? 'Ingreso de' : 'Salida de'} ${opQty} unidad(es) de ${selectedProduct?.name || 'producto'}. Stock actualizado a ${projectedStock} uds.`
          }
        }
      })
    } catch (err) {
      setIsProcessing(false)
      setProcessingStep(0)
      console.error(err)
      setError(err.message || 'No se pudo guardar la operación en el libro de movimientos.')
    }
  }

  return (
    <AppLayout title={isEditing ? 'Modificar Movimiento' : 'Nuevo Movimiento de Inventario'}>
      <div className="space-y-4 max-w-6xl mx-auto pb-8 animate-fade-in">

        {/* ═════════════════════════════════════════════════════════
            0. COMPACT BREADCRUMB & TOP HEADER BAR
           ═════════════════════════════════════════════════════════ */}
        <div className="bg-white dark:bg-[#141417] p-3.5 sm:p-4 rounded-2xl border border-slate-200/80 dark:border-zinc-800 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate('/movimientos')}
              className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-600 dark:text-zinc-200 flex items-center justify-center transition-colors cursor-pointer active:scale-95 shadow-xs"
              title="Regresar a Movimientos"
            >
              <ArrowLeft size={16} />
            </button>
            <div>
              <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium">
                <span className="hover:text-blue-600 cursor-pointer" onClick={() => navigate('/movimientos')}>
                  Inventario
                </span>
                <span>/</span>
                <span className="text-blue-600 dark:text-blue-400 font-semibold">
                  {isEditing ? 'Modificar Operación' : 'Nuevo Movimiento'}
                </span>
              </div>
              <h1 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white tracking-tight">
                {isEditing ? 'Modificar Operación de Kardex' : 'Registrar Nuevo Movimiento'}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-blue-50 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300 border border-blue-200 dark:border-blue-500/30">
              <ArrowLeftRight size={14} /> Libro Kardex Almacén
            </span>
          </div>
        </div>

        {/* ═════════════════════════════════════════════════════════
            ERROR NOTIFICATION
           ═════════════════════════════════════════════════════════ */}
        {error && (
          <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 text-rose-800 dark:text-rose-300 text-xs flex items-center gap-2.5 shadow-xs animate-slide-up">
            <AlertCircle size={16} className="shrink-0 text-rose-600 dark:text-rose-400" />
            <span className="font-semibold">{error}</span>
          </div>
        )}

        {/* ═════════════════════════════════════════════════════════
            MAIN FORM: 2-COLUMN EXECUTIVE LAYOUT
           ═════════════════════════════════════════════════════════ */}
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">

            {/* ─── LEFT COLUMN: OPERATIONAL INPUTS (7 COLS) ─── */}
            <div className="lg:col-span-7 space-y-4">

              {/* CARD 1: TIPO DE OPERACIÓN Y DOCUMENTACIÓN */}
              <div className="bg-white dark:bg-[#141417] rounded-2xl border border-slate-200/80 dark:border-zinc-800 p-4 sm:p-5 shadow-xs space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-zinc-800">
                  <div className="flex items-center gap-2">
                    <ArrowLeftRight size={16} className="text-blue-600 dark:text-blue-400" />
                    <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-zinc-100">
                      1. Naturaleza y Documentación del Movimiento
                    </h3>
                  </div>
                  <span className="text-[10px] sm:text-[11px] text-slate-400 dark:text-zinc-500 font-medium">Campos obligatorios *</span>
                </div>

                {/* SELECTOR DE TIPO (INGRESO VS EGRESO) */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-zinc-300 mb-2 uppercase tracking-wider">
                    Tipo de Operación *
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    {/* INGRESO (+ ENTRADA) */}
                    <button
                      type="button"
                      onClick={() => handleTypeChange('entrada')}
                      className={`p-3.5 rounded-2xl border-2 text-left transition-all cursor-pointer relative overflow-hidden group ${
                        isEntry
                          ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20 shadow-sm'
                          : 'border-slate-200/80 dark:border-zinc-800 hover:border-emerald-300 bg-slate-50/50 dark:bg-zinc-800/40 opacity-70 hover:opacity-100'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="w-8 h-8 rounded-xl bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
                          <ArrowDownLeft size={18} />
                        </div>
                        {isEntry && (
                          <span className="w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-xs">
                            <Check size={12} strokeWidth={3} />
                          </span>
                        )}
                      </div>
                      <p className="text-xs sm:text-sm font-extrabold text-emerald-900 dark:text-emerald-300 leading-tight">
                        Ingreso (+ Entrada)
                      </p>
                      <p className="text-[10.5px] text-emerald-700 dark:text-emerald-400/80 mt-0.5 leading-snug">
                        Suma y abastece stock en bodega
                      </p>
                    </button>

                    {/* EGRESO (- SALIDA) */}
                    <button
                      type="button"
                      onClick={() => handleTypeChange('salida')}
                      className={`p-3.5 rounded-2xl border-2 text-left transition-all cursor-pointer relative overflow-hidden group ${
                        !isEntry
                          ? 'border-rose-500 bg-rose-50/50 dark:bg-rose-950/20 shadow-sm'
                          : 'border-slate-200/80 dark:border-zinc-800 hover:border-rose-300 bg-slate-50/50 dark:bg-zinc-800/40 opacity-70 hover:opacity-100'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="w-8 h-8 rounded-xl bg-rose-100 dark:bg-rose-900/40 text-rose-600 dark:text-rose-400 flex items-center justify-center font-bold">
                          <ArrowUpRight size={18} />
                        </div>
                        {!isEntry && (
                          <span className="w-5 h-5 rounded-full bg-rose-500 text-white flex items-center justify-center shadow-xs">
                            <Check size={12} strokeWidth={3} />
                          </span>
                        )}
                      </div>
                      <p className="text-xs sm:text-sm font-extrabold text-rose-900 dark:text-rose-300 leading-tight">
                        Egreso (- Salida)
                      </p>
                      <p className="text-[10.5px] text-rose-700 dark:text-rose-400/80 mt-0.5 leading-snug">
                        Resta existencias o registra merma
                      </p>
                    </button>
                  </div>
                </div>

                {/* MOTIVO / CONCEPTO */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-zinc-300 uppercase tracking-wider">
                      Motivo / Justificación *
                    </label>
                    <span className="text-[10.5px] text-slate-400">Sugerencias rápidas:</span>
                  </div>

                  {/* Pills de sugerencias */}
                  <div className="flex flex-wrap gap-1.5 pb-1">
                    {QUICK_REASONS[type].map((qr) => (
                      <button
                        key={qr}
                        type="button"
                        onClick={() => setReason(qr)}
                        className={`text-[11px] px-2.5 py-1 rounded-lg font-medium transition-all cursor-pointer ${
                          reason === qr
                            ? isEntry
                              ? 'bg-emerald-600 text-white shadow-xs'
                              : 'bg-rose-600 text-white shadow-xs'
                            : 'bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-300 hover:bg-slate-200 dark:hover:bg-zinc-700'
                        }`}
                      >
                        {qr}
                      </button>
                    ))}
                  </div>

                  <input
                    type="text"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Ej: Compra directa a importadora, rotura en despacho..."
                    className="w-full text-xs sm:text-sm px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-medium"
                    required
                  />
                </div>

                {/* REFERENCIA DOCUMENTARIA */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-zinc-300 uppercase tracking-wider">
                      Documento / Referencia Contable
                    </label>
                    <button
                      type="button"
                      onClick={handleRegenerateRef}
                      className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <RefreshCw size={11} /> Generar Código
                    </button>
                  </div>
                  <div className="relative">
                    <Hash size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={reference}
                      onChange={(e) => setReference(e.target.value)}
                      placeholder="Ej: FAC-0012, OC-9402 o #92E68B"
                      className="w-full text-xs sm:text-sm pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-slate-900 dark:text-white placeholder:text-slate-400 font-mono font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* CARD 2: SELECCIÓN DE PRODUCTO Y CANTIDADES */}
              <div className="bg-white dark:bg-[#141417] rounded-2xl border border-slate-200/80 dark:border-zinc-800 p-4 sm:p-5 shadow-xs space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-zinc-800">
                  <div className="flex items-center gap-2">
                    <Package size={16} className="text-blue-600 dark:text-blue-400" />
                    <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-zinc-100">
                      2. Producto y Variación de Stock
                    </h3>
                  </div>
                  <span className="text-[10px] sm:text-[11px] text-slate-400 dark:text-zinc-500 font-medium">Existencias en vivo</span>
                </div>

                {/* BUSCADOR Y SELECTOR DE PRODUCTO */}
                <div className="relative" ref={searchBoxRef}>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-zinc-300 mb-1 uppercase tracking-wider">
                    Artículo / Producto a Mover *
                  </label>

                  <div className="relative">
                    <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    <input
                      type="text"
                      value={selectedProduct ? `${selectedProduct.name} (${selectedProduct.sku})` : productSearch}
                      onFocus={() => {
                        setIsSearchOpen(true)
                        if (selectedProduct) setProductSearch('')
                      }}
                      onChange={(e) => {
                        setProductSearch(e.target.value)
                        setIsSearchOpen(true)
                        if (productId) setProductId('')
                      }}
                      placeholder="Buscar por nombre, SKU o categoría..."
                      className="w-full text-xs sm:text-sm pl-9 pr-10 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-medium"
                    />
                    <ChevronDown size={15} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  </div>

                  {/* Dropdown de Resultados */}
                  {isSearchOpen && (
                    <div className="absolute z-30 left-0 right-0 mt-1.5 max-h-60 overflow-y-auto bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl shadow-xl p-1.5 space-y-1">
                      {loadingProducts ? (
                        <div className="p-4 text-center text-xs text-slate-400">Cargando catálogo...</div>
                      ) : filteredProducts.length === 0 ? (
                        <div className="p-4 text-center text-xs text-slate-400">No se encontraron productos coincidentes</div>
                      ) : (
                        filteredProducts.map((p) => (
                          <div
                            key={p.id}
                            onClick={() => {
                              setProductId(p.id)
                              setIsSearchOpen(false)
                              setProductSearch('')
                            }}
                            className={`flex items-center justify-between p-2.5 rounded-xl cursor-pointer transition-colors ${
                              productId === p.id
                                ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                                : 'hover:bg-slate-50 dark:hover:bg-zinc-800 text-slate-800 dark:text-zinc-200'
                            }`}
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="w-10 h-10 min-w-[40px] min-h-[40px] max-w-[40px] max-h-[40px] rounded-xl bg-slate-100 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 p-1 flex items-center justify-center shrink-0 overflow-hidden">
                                {p.image_url ? (
                                  <img
                                    src={p.image_url}
                                    alt={p.name}
                                    className="w-full h-full max-w-full max-h-full object-contain"
                                    onError={(e) => { e.currentTarget.style.display = 'none' }}
                                  />
                                ) : (
                                  <Package size={16} className="text-slate-400" />
                                )}
                              </div>
                              <div className="min-w-0">
                                <p className="text-xs font-bold truncate leading-tight">{p.name}</p>
                                <span className="font-mono text-[10px] text-slate-500 dark:text-zinc-400">
                                  {p.sku} {p.category && `· ${p.category}`}
                                </span>
                              </div>
                            </div>

                            <div className="text-right shrink-0 pl-2">
                              <span className={`inline-block text-[11px] font-bold px-2 py-0.5 rounded-md ${
                                Number(p.stock) > 0
                                  ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                                  : 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300'
                              }`}>
                                {p.stock} uds.
                              </span>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>

                {/* FICHA RESUMEN DEL PRODUCTO SELECCIONADO */}
                {selectedProduct && (
                  <div className="p-3.5 rounded-2xl bg-slate-50/80 dark:bg-zinc-800/40 border border-slate-200/80 dark:border-zinc-800 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-12 h-12 min-w-[48px] min-h-[48px] max-w-[48px] max-h-[48px] rounded-2xl bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 p-1 flex items-center justify-center shrink-0 shadow-xs overflow-hidden">
                        {selectedProduct.image_url ? (
                          <img
                            src={selectedProduct.image_url}
                            alt={selectedProduct.name}
                            className="w-full h-full max-w-full max-h-full object-contain"
                            onError={(e) => { e.currentTarget.style.display = 'none' }}
                          />
                        ) : (
                          <Package size={20} className="text-slate-400" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white truncate">
                          {selectedProduct.name}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="font-mono text-[10.5px] font-bold text-slate-600 dark:text-zinc-300 bg-white dark:bg-zinc-800 px-2 py-0.5 rounded-md border border-slate-200/70 dark:border-zinc-700">
                            {selectedProduct.sku}
                          </span>
                          {selectedProduct.price && (
                            <span className="text-[11px] text-slate-500 font-semibold">
                              Precio: {fmt(selectedProduct.price)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Stock Actual</p>
                      <p className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                        {selectedProduct.stock} <span className="text-xs font-semibold text-slate-400">uds.</span>
                      </p>
                    </div>
                  </div>
                )}

                {/* CANTIDAD A MOVER Y STEPPERS */}
                <div className="space-y-2">
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-zinc-300 uppercase tracking-wider">
                    Cantidad de Unidades a {isEntry ? 'Ingresar (+)' : 'Retirar (-)'} *
                  </label>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setQuantity((prev) => Math.max(1, (Number(prev) || 1) - 1))}
                      className="w-11 h-11 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-200 flex items-center justify-center font-bold text-lg active:scale-95 transition-all cursor-pointer shadow-xs shrink-0"
                    >
                      <Minus size={16} />
                    </button>

                    <input
                      type="number"
                      min="1"
                      value={quantity}
                      onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                      className="flex-1 text-center font-black text-lg sm:text-xl py-2 px-3 rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-mono"
                      required
                    />

                    <button
                      type="button"
                      onClick={() => setQuantity((prev) => (Number(prev) || 0) + 1)}
                      className="w-11 h-11 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-200 flex items-center justify-center font-bold text-lg active:scale-95 transition-all cursor-pointer shadow-xs shrink-0"
                    >
                      <Plus size={16} />
                    </button>
                  </div>

                  {/* Botones de incremento rápido */}
                  <div className="flex items-center gap-1.5 pt-1">
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mr-1">Rápido:</span>
                    {[5, 10, 25, 50, 100].map((step) => (
                      <button
                        key={step}
                        type="button"
                        onClick={() => setQuantity((prev) => (Number(prev) || 0) + step)}
                        className="text-[11px] font-bold px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-200 transition-colors cursor-pointer"
                      >
                        +{step}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => setQuantity(1)}
                      className="text-[11px] font-semibold px-2 py-1 rounded-lg text-slate-400 hover:text-slate-600 transition-colors cursor-pointer ml-auto"
                    >
                      Reset (1)
                    </button>
                  </div>
                </div>

                {/* BANNER DE IMPACTO MATEMÁTICO EN STOCK */}
                {selectedProduct && (
                  <div className={`p-4 rounded-2xl border transition-all ${
                    isInsufficientStock
                      ? 'bg-rose-50 dark:bg-rose-950/25 border-rose-200 dark:border-rose-900/40 text-rose-800 dark:text-rose-300'
                      : 'bg-slate-50/80 dark:bg-zinc-800/40 border-slate-200/80 dark:border-zinc-800 text-slate-700 dark:text-zinc-300'
                  }`}>
                    <div className="flex items-center justify-between text-xs mb-2">
                      <span className="font-bold flex items-center gap-1.5">
                        <Boxes size={14} /> Ecuación de Stock en Bodega:
                      </span>
                      <span className="font-mono font-black text-xs">
                        {currentStock} {isEntry ? '+' : '-'} {opQty} = {projectedStock} uds.
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-center pt-2 border-t border-slate-200/60 dark:border-zinc-700/60">
                      <div>
                        <p className="text-[10px] text-slate-400 uppercase font-semibold">Stock Inicial</p>
                        <p className="text-sm font-bold text-slate-800 dark:text-zinc-200">{currentStock} uds.</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-400 uppercase font-semibold">Variación</p>
                        <p className={`text-sm font-black ${isEntry ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                          {isEntry ? `+${opQty}` : `-${opQty}`} uds.
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-400 uppercase font-semibold">Stock Proyectado</p>
                        <p className={`text-sm font-black ${
                          projectedStock <= 0
                            ? 'text-rose-600 dark:text-rose-400'
                            : 'text-blue-600 dark:text-blue-400'
                        }`}>
                          {projectedStock} uds.
                        </p>
                      </div>
                    </div>

                    {isInsufficientStock && (
                      <div className="mt-3 p-2.5 rounded-xl bg-rose-100/80 dark:bg-rose-900/40 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200 text-xs flex items-center gap-2">
                        <AlertTriangle size={15} className="shrink-0 text-rose-600 dark:text-rose-400" />
                        <span className="font-bold">
                          Alerta de quiebre: No puedes retirar más unidades de las disponibles en inventario.
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* CARD 3: AUDITORÍA Y OBSERVACIONES */}
              <div className="bg-white dark:bg-[#141417] rounded-2xl border border-slate-200/80 dark:border-zinc-800 p-4 sm:p-5 shadow-xs space-y-3">
                <div className="flex items-center justify-between pb-2.5 border-b border-slate-100 dark:border-zinc-800">
                  <div className="flex items-center gap-2">
                    <User size={16} className="text-blue-600 dark:text-blue-400" />
                    <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-zinc-100">
                      3. Responsable y Observaciones de Auditoría
                    </h3>
                  </div>
                  <span className="text-[10px] sm:text-[11px] text-slate-400 dark:text-zinc-500 font-medium">Opcional</span>
                </div>

                {/* Responsable de sesión */}
                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-zinc-800/50 border border-slate-200/70 dark:border-zinc-800">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center shadow-xs">
                      {user?.full_name ? user.full_name.slice(0, 2).toUpperCase() : (user?.email ? user.email.slice(0, 2).toUpperCase() : 'CY')}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-900 dark:text-zinc-100">
                        {user?.full_name || user?.email || 'Carlos Yamacacho'}
                      </p>
                      <p className="text-[10.5px] text-slate-400">
                        {user?.role === 'admin' ? 'Administrador del Sistema' : 'Operador de Inventario'}
                      </p>
                    </div>
                  </div>
                  <span className="inline-flex items-center gap-1 text-[10.5px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1 rounded-full border border-emerald-200/70 dark:border-emerald-800">
                    <ShieldCheck size={12} /> Sesión Verificada
                  </span>
                </div>

                {/* Notas / Justificación opcional */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-zinc-300 mb-1 uppercase tracking-wider">
                    Notas u Observaciones Internas (Opcional)
                  </label>
                  <textarea
                    rows="2"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Detalles sobre el transporte, lote de producción, número de guía de remisión..."
                    className="w-full text-xs sm:text-sm p-3 rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 resize-none"
                  />
                </div>
              </div>
            </div>

            {/* ─── RIGHT COLUMN: LIVE REPLICA CARD & ACTIONS (5 COLS) ─── */}
            <div className="lg:col-span-5 space-y-4 lg:sticky lg:top-4">

              {/* CARD: VISTA PREVIA EN TIEMPO REAL */}
              <div className="bg-white dark:bg-[#141417] rounded-2xl border border-slate-200/80 dark:border-zinc-800 p-4 sm:p-5 shadow-xs space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-zinc-800">
                  <div className="flex items-center gap-2">
                    <Sparkles size={16} className="text-blue-600 dark:text-blue-400" />
                    <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-zinc-100">
                      Ficha de Operación en Tiempo Real
                    </h3>
                  </div>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> EN VIVO
                  </span>
                </div>

                <p className="text-[11px] text-slate-400 leading-snug">
                  Así se registrará y auditará este movimiento en el Libro Kardex:
                </p>

                {/* TARJETA REPLICA KARDEX */}
                <div className="p-4 rounded-2xl border border-slate-200/80 dark:border-zinc-800 bg-gradient-to-b from-white to-slate-50/60 dark:from-[#18181b] dark:to-[#121215] shadow-sm space-y-3.5">
                  
                  {/* Header: Tipo Badge + Referencia */}
                  <div className="flex items-center justify-between">
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-black shadow-xs ${
                      isEntry
                        ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                        : 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                    }`}>
                      {isEntry ? <ArrowDownLeft size={14} /> : <ArrowUpRight size={14} />}
                      {isEntry ? 'Ingreso a Bodega' : 'Egreso de Almacén'}
                    </span>

                    <span className="font-mono text-xs font-bold text-slate-500 dark:text-zinc-400 bg-slate-100 dark:bg-zinc-800 px-2 py-0.5 rounded-md">
                      {reference || '#SIN-REF'}
                    </span>
                  </div>

                  {/* Thumbnail + Producto */}
                  <div className="flex items-center gap-3 pt-1">
                    <div className="w-12 h-12 min-w-[48px] min-h-[48px] max-w-[48px] max-h-[48px] rounded-2xl bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 p-1 flex items-center justify-center shrink-0 shadow-xs overflow-hidden">
                      {selectedProduct?.image_url ? (
                        <img
                          src={selectedProduct.image_url}
                          alt={selectedProduct.name}
                          className="w-full h-full max-w-full max-h-full object-contain"
                          onError={(e) => { e.currentTarget.style.display = 'none' }}
                        />
                      ) : (
                        <Package size={22} className="text-slate-400" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <h4 className="font-black text-slate-900 dark:text-white text-sm truncate leading-snug">
                        {selectedProduct?.name || 'Selecciona un producto'}
                      </h4>
                      <p className="font-mono text-[11px] text-slate-500 dark:text-zinc-400">
                        {selectedProduct?.sku || 'SKU PENDIENTE'}
                      </p>
                    </div>
                  </div>

                  {/* Metrics 2x2 Grid */}
                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 dark:border-zinc-800">
                    <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-zinc-800/40 border border-slate-200/50 dark:border-zinc-700/50">
                      <p className="text-[10px] text-slate-400 font-bold uppercase">Variación</p>
                      <p className={`text-base font-black ${isEntry ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                        {isEntry ? `+${opQty}` : `-${opQty}`} <span className="text-xs font-semibold">uds.</span>
                      </p>
                    </div>

                    <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-zinc-800/40 border border-slate-200/50 dark:border-zinc-700/50">
                      <p className="text-[10px] text-slate-400 font-bold uppercase">Stock Final</p>
                      <p className={`text-base font-black ${projectedStock <= 0 ? 'text-rose-600' : 'text-slate-900 dark:text-white'}`}>
                        {projectedStock} <span className="text-xs font-semibold text-slate-400">uds.</span>
                      </p>
                    </div>
                  </div>

                  {/* Resumen de Detalles */}
                  <div className="space-y-1.5 text-xs pt-1 border-t border-slate-100 dark:border-zinc-800 text-slate-600 dark:text-zinc-300">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Motivo:</span>
                      <span className="font-bold truncate max-w-[200px] text-slate-900 dark:text-white">
                        {reason || 'Ajuste manual'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Valorización Estimada:</span>
                      <span className="font-bold text-slate-900 dark:text-white font-mono">
                        {fmt(estimatedValue)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Responsable:</span>
                      <span className="font-semibold text-slate-700 dark:text-zinc-200">
                        {user?.full_name || user?.email?.split('@')[0] || 'Administrador'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Fecha y Hora:</span>
                      <span className="font-medium text-slate-500 dark:text-zinc-400">
                        {currentTime.date} · {currentTime.time}
                      </span>
                    </div>
                  </div>
                </div>

                {/* BOTÓN PRINCIPAL DE ENVÍO */}
                <button
                  type="submit"
                  disabled={isProcessing || isInsufficientStock || !productId}
                  className="w-full py-3 px-4 rounded-xl font-black text-xs sm:text-sm text-white bg-blue-600 hover:bg-blue-700 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md shadow-blue-500/25 flex items-center justify-center gap-2 cursor-pointer"
                >
                  {isProcessing ? (
                    <>
                      <RefreshCw size={16} className="animate-spin" />
                      <span>Sincronizando Kardex...</span>
                    </>
                  ) : (
                    <>
                      <Check size={16} strokeWidth={2.5} />
                      <span>{isEditing ? 'Guardar Cambios de Operación' : 'Registrar Movimiento en Kardex'}</span>
                    </>
                  )}
                </button>

                {/* BOTÓN SECUNDARIO CANCELAR */}
                <button
                  type="button"
                  onClick={() => navigate('/movimientos')}
                  className="w-full py-2.5 px-4 rounded-xl font-bold text-xs text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 transition-colors text-center cursor-pointer"
                >
                  Cancelar y Regresar
                </button>

                <p className="text-[10px] text-center text-slate-400 flex items-center justify-center gap-1.5 font-medium">
                  <ShieldCheck size={12} className="text-emerald-500" />
                  Sincronización instantánea con catálogo y kardex
                </p>
              </div>
            </div>

          </div>
        </form>

      </div>

      {/* ═════════════════════════════════════════════════════════
          OVERLAY DE PROCESAMIENTO ELEGANTE (3 PASOS)
         ═════════════════════════════════════════════════════════ */}
      {isProcessing && (
        <div className="fixed inset-0 z-50 bg-slate-950/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#18181b] rounded-3xl p-6 max-w-sm w-full border border-slate-200 dark:border-zinc-800 shadow-2xl space-y-4 animate-scale-up text-center">
            <div className="w-14 h-14 rounded-2xl bg-blue-50 dark:bg-blue-900/30 text-blue-600 mx-auto flex items-center justify-center shadow-inner">
              <RefreshCw size={26} className="animate-spin" />
            </div>

            <div className="space-y-1">
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                {isEditing ? 'Actualizando Operación...' : 'Asentando en Kardex...'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-zinc-400">
                {processingStep === 1 && 'Validando consistencia de stock en almacén...'}
                {processingStep === 2 && 'Actualizando existencias y catálogo de productos...'}
                {processingStep === 3 && '¡Movimiento auditado y sincronizado con éxito!'}
              </p>
            </div>

            {/* Barra de progreso interactiva */}
            <div className="w-full bg-slate-100 dark:bg-zinc-800 h-2 rounded-full overflow-hidden">
              <div
                className="bg-blue-600 h-full transition-all duration-300 rounded-full"
                style={{
                  width: processingStep === 1 ? '35%' : processingStep === 2 ? '75%' : '100%'
                }}
              />
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  )
}

