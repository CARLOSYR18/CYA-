import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeft, Plus, Trash2, Truck, Building2, Package,
  DollarSign, CheckCircle2, Clock, AlertCircle, Sparkles,
  ShieldCheck, Check, Calendar, Phone, Mail, User, Minus,
  Zap, X, Printer, FileText, CheckCircle, ExternalLink, HelpCircle
} from 'lucide-react'
import AppLayout from '../components/layout/AppLayout'
import { useFormLeaveGuard } from '../hooks/useFormLeaveGuard'
import { purchasesService } from '../services/purchasesService'
import { suppliersService } from '../services/suppliersService'
import { productsService } from '../services/productsService'
import { companySettingsService } from '../services/companySettingsService'
import { useAuth } from '../context/AuthContext'

const fmt = (n) =>
  `S/ ${(Number(n) || 0).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

export default function NewPurchase() {
  const navigate = useNavigate()
  const { user } = useAuth()

  // Master Data
  const [suppliers, setSuppliers] = useState([])
  const [products, setProducts] = useState([])
  const [company, setCompany] = useState(null)
  const [loadingData, setLoadingData] = useState(true)

  // Order Details
  const [supplierId, setSupplierId] = useState('')
  const [status, setStatus] = useState('recibido') // 'recibido' | 'pendiente'
  const [invoiceRef, setInvoiceRef] = useState('')
  const [orderType, setOrderType] = useState('ESTANDAR') // 'ESTANDAR' | 'URGENTE' | 'REPOSICION'
  const [destinationWarehouse, setDestinationWarehouse] = useState('Almacén Central')
  const [notes, setNotes] = useState('')

  // Line items
  const [items, setItems] = useState([
    { product_id: '', quantity: 1, unit_cost: '' }
  ])

  // Processing Animation & Modal States
  const [isProcessing, setIsProcessing] = useState(false)
  const [processingStep, setProcessingStep] = useState(0) // 1: 35%, 2: 75%, 3: 100%
  const [createdPurchase, setCreatedPurchase] = useState(null)
  const [error, setError] = useState('')

  // Detección de cambios sin guardar en la orden de compra
  const isDirty = useMemo(() => {
    if (isProcessing || createdPurchase) return false
    const hasSupplier = Boolean(supplierId)
    const hasItems = items.some(
      (it) => it.product_id || (it.unit_cost !== '' && Number(it.unit_cost) > 0) || Number(it.quantity) > 1
    )
    const hasExtra = Boolean(invoiceRef.trim() || notes.trim())
    return hasSupplier || hasItems || hasExtra
  }, [isProcessing, createdPurchase, supplierId, items, invoiceRef, notes])

  const { requestLeave, DiscardModalComponent } = useFormLeaveGuard({
    isDirty,
    defaultRedirectUrl: '/compras',
    modalTitle: '¿Descartar orden de compra?',
    modalDescription: 'Tienes productos o detalles agregados a esta orden de compra. Si sales ahora o recargas la pantalla, la compra no se registrará en el almacén.'
  })

  // Quick Supplier Modal State
  const [showQuickSupplierModal, setShowQuickSupplierModal] = useState(false)
  const [quickSupplierName, setQuickSupplierName] = useState('')
  const [quickSupplierRuc, setQuickSupplierRuc] = useState('')
  const [quickSupplierPhone, setQuickSupplierPhone] = useState('')
  const [quickSupplierContact, setQuickSupplierContact] = useState('')
  const [savingQuickSupplier, setSavingQuickSupplier] = useState(false)
  const [quickSupplierError, setQuickSupplierError] = useState('')

  // Load Data
  useEffect(() => {
    async function loadData() {
      setLoadingData(true)
      try {
        const [su, pr, comp] = await Promise.all([
          suppliersService.list().catch(() => []),
          productsService.list().catch(() => []),
          companySettingsService.get().catch(() => null)
        ])
        setSuppliers(su || [])
        setProducts(pr || [])
        setCompany(comp || null)
      } finally {
        setLoadingData(false)
      }
    }
    loadData()
  }, [])

  // Selected supplier details
  const selectedSupplier = useMemo(() => {
    return suppliers.find(s => s.id === supplierId)
  }, [suppliers, supplierId])

  // Quick supplier pre-fill shortcut
  const handleQuickSupplierFill = () => {
    if (suppliers.length > 0) {
      setSupplierId(suppliers[0].id)
    } else {
      setShowQuickSupplierModal(true)
    }
  }

  // Row operations
  const addItemRow = () => {
    setItems(prev => [...prev, { product_id: '', quantity: 1, unit_cost: '' }])
  }

  const removeItemRow = (idx) => {
    if (items.length <= 1) return
    setItems(prev => prev.filter((_, i) => i !== idx))
  }

  const updateItem = (idx, patch) => {
    setItems(prev => prev.map((it, i) => {
      if (i !== idx) return it
      const updated = { ...it, ...patch }
      // If product_id changed, default unit_cost to product's cost_price
      if (patch.product_id !== undefined && patch.product_id !== it.product_id) {
        const prod = products.find(p => p.id === patch.product_id)
        if (prod) {
          updated.unit_cost = Number(prod.cost_price) || 0
        }
      }
      return updated
    }))
  }

  // Quantity Steppers
  const stepQuantity = (idx, delta) => {
    setItems(prev => prev.map((it, i) => {
      if (i !== idx) return it
      const cur = Math.max(1, (Number(it.quantity) || 1) + delta)
      return { ...it, quantity: cur }
    }))
  }

  // Financial calculations
  const totalUnits = useMemo(() => {
    return items.reduce((acc, it) => acc + (Number(it.quantity) || 0), 0)
  }, [items])

  const subtotal = useMemo(() => {
    return items.reduce((sum, it) => {
      const cost = Number(it.unit_cost) || 0
      const qty = Number(it.quantity) || 0
      return sum + (cost * qty)
    }, 0)
  }, [items])

  const igvEstimado = subtotal * 0.18
  const total = subtotal

  // Form submission with smooth multi-step loader
  const handleSubmit = async (e) => {
    if (e && e.preventDefault) e.preventDefault()
    setError('')

    if (!supplierId) {
      setError('Por favor selecciona el proveedor de la orden de compra')
      return
    }

    const validItems = items.filter(it => it.product_id && Number(it.quantity) > 0)
    if (!validItems.length) {
      setError('Debes agregar al menos un artículo a la compra con cantidad mayor a 0')
      return
    }

    setIsProcessing(true)
    setProcessingStep(1) // 35%

    try {
      await new Promise(r => setTimeout(r, 400))
      setProcessingStep(2) // 75%

      const purchaseItems = validItems.map(it => {
        const prod = products.find(p => p.id === it.product_id)
        return {
          product_id: it.product_id,
          quantity: Number(it.quantity),
          unit_cost: Number(it.unit_cost) || Number(prod?.cost_price) || 0
        }
      })

      const payload = {
        supplier_id: supplierId,
        user_id: user?.id,
        status,
        items: purchaseItems
      }

      const res = await purchasesService.create(payload)

      setProcessingStep(3) // 100%
      await new Promise(r => setTimeout(r, 450))

      // Attach supplier and items details for summary modal
      const purchaseDetails = {
        ...(res || payload),
        id: res?.id || ('OC-' + Date.now().toString().slice(-6)),
        created_at: new Date().toISOString(),
        supplier: selectedSupplier,
        invoice_ref: invoiceRef,
        notes: notes,
        status: status,
        items: validItems.map(it => {
          const prod = products.find(p => p.id === it.product_id)
          return {
            ...it,
            product_name: prod?.name || 'Artículo',
            sku: prod?.sku || 'SKU'
          }
        }),
        total: total
      }

      setIsProcessing(false)
      setCreatedPurchase(purchaseDetails)

    } catch (err) {
      setIsProcessing(false)
      setError(err.message || 'No se pudo registrar la orden de compra')
    }
  }

  // Quick Supplier Creation
  const handleCreateQuickSupplier = async (e) => {
    e.preventDefault()
    setQuickSupplierError('')
    if (!quickSupplierName.trim()) {
      setQuickSupplierError('Ingresa la Razón Social o Nombre del Proveedor')
      return
    }

    setSavingQuickSupplier(true)
    try {
      const created = await suppliersService.create({
        name: quickSupplierName.trim(),
        ruc: quickSupplierRuc.trim() || null,
        phone: quickSupplierPhone.trim() || null,
        contact_name: quickSupplierContact.trim() || null
      })

      setSuppliers(prev => [created, ...prev])
      setSupplierId(created.id)
      setShowQuickSupplierModal(false)
      setQuickSupplierName('')
      setQuickSupplierRuc('')
      setQuickSupplierPhone('')
      setQuickSupplierContact('')
    } catch (err) {
      setQuickSupplierError(err.message || 'Error al registrar proveedor')
    } finally {
      setSavingQuickSupplier(false)
    }
  }

  // Reset form
  const handleResetForm = () => {
    setSupplierId('')
    setInvoiceRef('')
    setNotes('')
    setStatus('recibido')
    setItems([{ product_id: '', quantity: 1, unit_cost: '' }])
    setCreatedPurchase(null)
  }

  return (
    <AppLayout title="Nueva Compra">
      <div className="max-w-6xl mx-auto space-y-3.5 pb-8">

        {/* ═════════════════════════════════════════════════════════
            TOP BAR: COMPACT EXECUTIVE BREADCRUMB & TYPE PILLS
           ═════════════════════════════════════════════════════════ */}
        <div className="bg-white dark:bg-[#141417] rounded-2xl border border-slate-200/80 dark:border-zinc-800 p-3.5 sm:p-4 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => requestLeave('/compras')}
              className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-600 dark:text-zinc-200 flex items-center justify-center transition-colors cursor-pointer"
              title="Volver al listado de compras"
            >
              <ArrowLeft size={16} />
            </button>
            <div>
              <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium">
                <span className="hover:text-blue-600 cursor-pointer" onClick={() => requestLeave('/compras')}>Compras</span>
                <span>/</span>
                <span className="text-blue-600 dark:text-blue-400 font-semibold">Nueva Orden</span>
              </div>
              <h1 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white tracking-tight">
                Registrar Orden de Compra & Abastecimiento
              </h1>
            </div>
          </div>

          {/* Quick pills & supplier shortcut */}
          <div className="flex items-center gap-2 self-start md:self-auto flex-wrap">
            <div className="inline-flex items-center p-0.5 bg-slate-100 dark:bg-zinc-800 rounded-xl text-xs font-bold">
              {[
                { id: 'ESTANDAR', label: 'Estándar' },
                { id: 'URGENTE', label: 'Urgente' },
                { id: 'REPOSICION', label: 'Reposición' }
              ].map(opt => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setOrderType(opt.id)}
                  className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                    orderType === opt.id
                      ? 'bg-blue-600 text-white shadow-xs font-extrabold'
                      : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            {/* + Proveedor Rápido button */}
            <button
              type="button"
              onClick={() => setShowQuickSupplierModal(true)}
              className="px-3 py-1.5 rounded-xl bg-slate-50 hover:bg-slate-100 dark:bg-zinc-800 dark:hover:bg-zinc-700 border border-slate-200 dark:border-zinc-700 text-slate-700 dark:text-zinc-200 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Registrar nuevo proveedor al instante"
            >
              <Zap size={14} className="text-amber-500" />
              <span>+ Proveedor Rápido</span>
            </button>
          </div>
        </div>

        {/* ═════════════════════════════════════════════════════════
            1. PROVIDER & INVOICE ATTRIBUTES (COMPACT EXECUTIVE ROW)
           ═════════════════════════════════════════════════════════ */}
        <div className="bg-white dark:bg-[#141417] rounded-2xl border border-slate-200/80 dark:border-zinc-800 p-3.5 sm:p-4 shadow-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3.5 items-end text-xs sm:text-sm">

            {/* Proveedor / Razón Social */}
            <div className="lg:col-span-5">
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-zinc-300 flex items-center gap-1.5">
                  <Building2 size={13} className="text-blue-600 dark:text-blue-400" />
                  <span>Proveedor Comercial *</span>
                </label>
                {selectedSupplier?.ruc && (
                  <span className="text-[11px] font-mono font-bold text-slate-400">
                    RUC: {selectedSupplier.ruc}
                  </span>
                )}
              </div>
              <div className="relative">
                <select
                  value={supplierId}
                  onChange={(e) => setSupplierId(e.target.value)}
                  required
                  className="w-full bg-slate-50 dark:bg-zinc-800/80 border border-slate-200/80 dark:border-zinc-700 rounded-xl px-3 py-2 text-xs sm:text-sm text-slate-900 dark:text-white outline-none focus:border-blue-600 focus:bg-white dark:focus:bg-zinc-900 font-medium cursor-pointer"
                >
                  <option value="">Selecciona un proveedor registrado del catálogo…</option>
                  {suppliers.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.name} {s.ruc ? `— RUC: ${s.ruc}` : ''} {s.phone ? `(${s.phone})` : ''}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* N° Factura / Guía de Remisión Proveedor */}
            <div className="lg:col-span-3">
              <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1.5">
                N° Factura / Guía de Remisión
              </label>
              <div className="relative">
                <FileText size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={invoiceRef}
                  onChange={(e) => setInvoiceRef(e.target.value)}
                  placeholder="Ej. F001-0004523 / GR-1092"
                  className="w-full bg-slate-50 dark:bg-zinc-800/80 border border-slate-200/80 dark:border-zinc-700 rounded-xl pl-8 pr-3 py-2 text-xs sm:text-sm text-slate-900 dark:text-white outline-none focus:border-blue-600 font-mono uppercase"
                />
              </div>
            </div>

            {/* Almacén de Destino */}
            <div className="lg:col-span-2">
              <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1.5">
                Almacén Destino
              </label>
              <select
                value={destinationWarehouse}
                onChange={(e) => setDestinationWarehouse(e.target.value)}
                className="w-full bg-slate-50 dark:bg-zinc-800/80 border border-slate-200/80 dark:border-zinc-700 rounded-xl px-3 py-2 text-xs sm:text-sm text-slate-900 dark:text-white outline-none focus:border-blue-600 font-medium cursor-pointer"
              >
                <option value="Almacén Central">Almacén Central</option>
                <option value="Tienda Principal">Tienda Principal</option>
                <option value="Almacén de Tránsito">Almacén de Tránsito</option>
              </select>
            </div>

            {/* Observaciones / Notas */}
            <div className="lg:col-span-2">
              <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1.5">
                O.C. / Notas
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Ej. Pago a 30 días..."
                className="w-full bg-slate-50 dark:bg-zinc-800/80 border border-slate-200/80 dark:border-zinc-700 rounded-xl px-3 py-2 text-xs sm:text-sm text-slate-900 dark:text-white outline-none focus:border-blue-600 font-medium"
              />
            </div>

          </div>
        </div>

        {/* ═════════════════════════════════════════════════════════
            2. PRODUCTS TABLE (CLEAN, COMPACT ROWS, INTERNAL SCROLL)
           ═════════════════════════════════════════════════════════ */}
        <div className="bg-white dark:bg-[#141417] rounded-2xl border border-slate-200/80 dark:border-zinc-800 overflow-hidden shadow-xs">
          <div className="py-2.5 px-4 bg-slate-50/80 dark:bg-zinc-800/60 border-b border-slate-200/80 dark:border-zinc-800 flex items-center justify-between text-xs sm:text-sm">
            <div className="flex items-center gap-2">
              <Package size={15} className="text-blue-600 dark:text-blue-400" />
              <span className="font-bold text-slate-800 dark:text-zinc-200">
                Artículos a Abastecer
              </span>
              <span className="text-xs text-slate-400 font-mono">({items.length} líneas / {totalUnits} unidades)</span>
            </div>

            <button
              type="button"
              onClick={addItemRow}
              className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
            >
              <Plus size={14} strokeWidth={2.5} />
              <span>Agregar Fila</span>
            </button>
          </div>

          <div className="max-h-[190px] overflow-y-auto">
            <table className="w-full text-left border-collapse text-xs sm:text-sm">
              <thead className="sticky top-0 z-10 bg-white dark:bg-[#141417] border-b border-slate-200 dark:border-zinc-800 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                <tr>
                  <th className="py-2.5 px-3.5 w-10 text-center">#</th>
                  <th className="py-2.5 px-3 min-w-[320px]">Producto / Descripción</th>
                  <th className="py-2.5 px-3 w-32 text-center">Stock Actual</th>
                  <th className="py-2.5 px-3 w-36 text-center">Cantidad</th>
                  <th className="py-2.5 px-3 w-36 text-right">Costo Unit. (S/)</th>
                  <th className="py-2.5 px-3 w-32 text-right">Subtotal</th>
                  <th className="py-2.5 px-3 w-12 text-center"></th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100 dark:divide-zinc-800">
                {items.map((it, idx) => {
                  const prod = products.find(p => p.id === it.product_id)
                  const lineTotal = (Number(it.unit_cost) || 0) * (Number(it.quantity) || 0)

                  return (
                    <tr key={idx} className="hover:bg-slate-50/60 dark:hover:bg-zinc-800/40 transition-colors">
                      {/* # */}
                      <td className="py-2.5 px-3.5 text-center font-bold text-slate-400">
                        {idx + 1}
                      </td>

                      {/* Product select */}
                      <td className="py-2.5 px-3">
                        <select
                          value={it.product_id}
                          onChange={(e) => updateItem(idx, { product_id: e.target.value })}
                          required
                          className="w-full bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-xl px-3 py-1.5 text-xs sm:text-sm text-slate-900 dark:text-white font-medium outline-none focus:border-blue-600"
                        >
                          <option value="">Selecciona un producto del catálogo…</option>
                          {products.map(p => (
                            <option key={p.id} value={p.id}>
                              {p.sku ? `[${p.sku}] ` : ''}{p.name} — Costo ref: {fmt(p.cost_price)}
                            </option>
                          ))}
                        </select>
                      </td>

                      {/* Stock Actual */}
                      <td className="py-2.5 px-3 text-center">
                        {prod ? (
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold font-mono ${
                            Number(prod.stock) > 10
                              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                              : Number(prod.stock) > 0
                              ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300'
                              : 'bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300'
                          }`}>
                            {prod.stock} {prod.unit || 'uds.'}
                          </span>
                        ) : (
                          <span className="text-slate-300 text-xs">—</span>
                        )}
                      </td>

                      {/* Quantity with +/- stepper */}
                      <td className="py-2.5 px-3">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={() => stepQuantity(idx, -1)}
                            className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 text-slate-600 dark:text-zinc-200 flex items-center justify-center transition-colors cursor-pointer"
                          >
                            <Minus size={12} />
                          </button>
                          <input
                            type="number"
                            min="1"
                            value={it.quantity}
                            onChange={(e) => updateItem(idx, { quantity: e.target.value })}
                            required
                            className="w-14 bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-lg py-1 text-center text-xs sm:text-sm font-bold font-mono text-slate-900 dark:text-white outline-none focus:border-blue-600"
                          />
                          <button
                            type="button"
                            onClick={() => stepQuantity(idx, 1)}
                            className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 text-slate-600 dark:text-zinc-200 flex items-center justify-center transition-colors cursor-pointer"
                          >
                            <Plus size={12} />
                          </button>
                        </div>
                      </td>

                      {/* Unit Cost */}
                      <td className="py-2.5 px-3 text-right">
                        <div className="relative inline-block w-28">
                          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 font-mono text-xs">S/</span>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={it.unit_cost}
                            onChange={(e) => updateItem(idx, { unit_cost: e.target.value })}
                            placeholder="0.00"
                            required
                            className="w-full bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-xl pl-7 pr-2.5 py-1 text-right text-xs sm:text-sm font-mono font-bold text-slate-900 dark:text-white outline-none focus:border-blue-600"
                          />
                        </div>
                      </td>

                      {/* Subtotal */}
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900 dark:text-white text-xs sm:text-sm">
                        {fmt(lineTotal)}
                      </td>

                      {/* Delete */}
                      <td className="py-2.5 px-3 text-center">
                        <button
                          type="button"
                          onClick={() => removeItemRow(idx)}
                          disabled={items.length <= 1}
                          className="p-1 text-slate-300 hover:text-red-500 disabled:opacity-20 disabled:hover:text-slate-300 rounded-lg transition-colors cursor-pointer"
                          title="Eliminar fila"
                        >
                          <Trash2 size={15} />
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* ═════════════════════════════════════════════════════════
            3. BOTTOM ROW: RECEPTION STATUS & FINANCIAL SUMMARY
           ═════════════════════════════════════════════════════════ */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 items-stretch">

          {/* LEFT: Reception & Warehouse Policy (7 Cols) */}
          <div className="lg:col-span-7 bg-white dark:bg-[#141417] rounded-2xl border border-slate-200/80 dark:border-zinc-800 p-4 shadow-xs flex flex-col justify-between space-y-3">
            <div>
              <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-zinc-800">
                <span className="text-xs font-bold text-slate-700 dark:text-zinc-300 flex items-center gap-1.5">
                  <Truck size={14} className="text-blue-600 dark:text-blue-400" />
                  Estado de Recepción & Almacén
                </span>
                <span className="text-[11px] text-slate-400 font-medium">Control de Kardex</span>
              </div>

              {/* Status Segmented Buttons */}
              <div className="grid grid-cols-2 gap-2 mt-3">
                <button
                  type="button"
                  onClick={() => setStatus('recibido')}
                  className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer flex items-center justify-center gap-2 ${
                    status === 'recibido'
                      ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500 text-emerald-700 dark:text-emerald-300 font-extrabold shadow-xs'
                      : 'bg-slate-50 dark:bg-zinc-800/80 border-slate-200/80 dark:border-zinc-700 text-slate-600 dark:text-zinc-400 hover:bg-slate-100'
                  }`}
                >
                  <CheckCircle2 size={16} className={status === 'recibido' ? 'text-emerald-600' : 'text-slate-400'} />
                  <div className="text-left">
                    <p className="text-xs font-bold leading-tight">Recibido en Almacén</p>
                    <p className="text-[10px] opacity-80">Ingresa stock de inmediato</p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setStatus('pendiente')}
                  className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer flex items-center justify-center gap-2 ${
                    status === 'pendiente'
                      ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-500 text-amber-700 dark:text-amber-300 font-extrabold shadow-xs'
                      : 'bg-slate-50 dark:bg-zinc-800/80 border-slate-200/80 dark:border-zinc-700 text-slate-600 dark:text-zinc-400 hover:bg-slate-100'
                  }`}
                >
                  <Clock size={16} className={status === 'pendiente' ? 'text-amber-600' : 'text-slate-400'} />
                  <div className="text-left">
                    <p className="text-xs font-bold leading-tight">Pendiente / Por Recibir</p>
                    <p className="text-[10px] opacity-80">Mercancía en tránsito</p>
                  </div>
                </button>
              </div>

              {/* Informative Alert Banner */}
              <div className="mt-3 p-3 rounded-xl bg-slate-50 dark:bg-zinc-800/70 border border-slate-200/70 dark:border-zinc-700/80 text-xs">
                {status === 'recibido' ? (
                  <div className="flex items-start gap-2 text-emerald-700 dark:text-emerald-400">
                    <CheckCircle size={15} className="shrink-0 mt-0.5" />
                    <p className="leading-relaxed text-[11.5px]">
                      <strong>Impacto inmediato:</strong> Las {totalUnits} unidades se sumarán al inventario del <strong>{destinationWarehouse}</strong> y se generarán los movimientos de entrada en el Kardex.
                    </p>
                  </div>
                ) : (
                  <div className="flex items-start gap-2 text-amber-700 dark:text-amber-400">
                    <Clock size={15} className="shrink-0 mt-0.5" />
                    <p className="leading-relaxed text-[11.5px]">
                      <strong>Orden en tránsito:</strong> La orden se guardará con estado pendiente sin alterar las existencias. Podrás marcarla como recibida con un clic cuando arribe el cargamento.
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="text-[11px] text-slate-400 flex items-center justify-between pt-1">
              <span className="flex items-center gap-1">
                <ShieldCheck size={13} className="text-blue-500" />
                Auditoría trazable por usuario: {user?.email || 'admin'}
              </span>
              <span>Moneda: Soles (PEN)</span>
            </div>
          </div>

          {/* RIGHT: Financial Liquidation & Actions (5 Cols) */}
          <div className="lg:col-span-5 bg-white dark:bg-[#141417] rounded-2xl border border-slate-200/80 dark:border-zinc-800 p-4 shadow-xs flex flex-col justify-between space-y-3">
            <div>
              <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-zinc-800">
                <span className="text-xs font-bold text-slate-700 dark:text-zinc-300 flex items-center gap-1.5">
                  <DollarSign size={14} className="text-blue-600 dark:text-blue-400" />
                  Liquidación de Compra
                </span>
                <span className="text-xs font-mono font-bold text-slate-400">PEN (S/)</span>
              </div>

              {/* Breakdown */}
              <div className="space-y-1.5 pt-2 text-xs">
                <div className="flex justify-between items-center text-slate-500 dark:text-zinc-400">
                  <span>Subtotal / Base Imponible:</span>
                  <span className="font-mono font-bold text-slate-800 dark:text-white">
                    {fmt(total)}
                  </span>
                </div>

                <div className="flex justify-between items-center text-slate-500 dark:text-zinc-400">
                  <span>I.G.V. (18% referencial):</span>
                  <span className="font-mono font-bold text-slate-600 dark:text-zinc-300">
                    {fmt(igvEstimado)}
                  </span>
                </div>

                {/* Total */}
                <div className="pt-2 border-t border-slate-100 dark:border-zinc-800 flex justify-between items-center">
                  <div>
                    <span className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider block">
                      TOTAL A PAGAR:
                    </span>
                    <span className="text-[10px] text-slate-400">Inversión neta en compra</span>
                  </div>
                  <span className="text-2xl sm:text-3xl font-black font-mono text-blue-600 dark:text-blue-400 tracking-tight">
                    {fmt(total)}
                  </span>
                </div>
              </div>
            </div>

            {error && (
              <div className="p-2.5 rounded-xl bg-red-50 text-red-600 text-xs flex items-center gap-1.5">
                <AlertCircle size={15} className="shrink-0" />
                <span className="truncate">{error}</span>
              </div>
            )}

            {/* Actions */}
            <div className="space-y-2 pt-1 border-t border-slate-100 dark:border-zinc-800">
              <button
                type="button"
                disabled={isProcessing}
                onClick={handleSubmit}
                className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-98 text-white font-bold text-xs sm:text-sm shadow-md shadow-blue-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
              >
                {isProcessing ? (
                  <span>Registrando orden de compra…</span>
                ) : (
                  <>
                    <Check size={16} strokeWidth={3} />
                    <span>Registrar y Procesar Compra</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => requestLeave('/compras')}
                className="w-full py-2 rounded-xl border border-slate-200 dark:border-zinc-700 text-slate-500 hover:text-slate-800 dark:hover:text-white text-xs font-semibold transition-colors cursor-pointer"
              >
                Cancelar y Volver
              </button>
            </div>
          </div>

        </div>

        {/* ═════════════════════════════════════════════════════════
            OVERLAY: SLEEK EMISSION ANIMATION SCREEN (LIKE NEWSALE)
           ═════════════════════════════════════════════════════════ */}
        {isProcessing && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4 animate-fade-in">
            <div className="bg-white dark:bg-[#18181b] rounded-2xl border border-slate-200 dark:border-zinc-700 p-6 max-w-sm w-full text-center shadow-2xl space-y-4 animate-slide-up">
              <div className="w-14 h-14 rounded-full border-3 border-blue-600 border-t-transparent animate-spin mx-auto flex items-center justify-center">
                <Truck size={22} className="text-blue-600 animate-pulse" />
              </div>

              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-white">
                  Procesando Orden de Compra
                </h3>
                <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">
                  {processingStep === 1 && 'Validando proveedor y catálogo de productos…'}
                  {processingStep === 2 && 'Actualizando almacén, costos e inventario en Kardex…'}
                  {processingStep === 3 && '¡Orden registrada con éxito! Generando comprobante…'}
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

        {/* ═════════════════════════════════════════════════════════
            MODAL: ORDEN DE COMPRA REGISTRADA (CENTERED SUMMARY MODAL)
           ═════════════════════════════════════════════════════════ */}
        {createdPurchase && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-fade-in">
            <div className="relative w-full max-w-md bg-white dark:bg-[#141417] rounded-3xl shadow-2xl border border-slate-200 dark:border-zinc-800 overflow-hidden flex flex-col max-h-[92vh] animate-scale-in">
              {/* Header */}
              <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 dark:border-zinc-800 bg-slate-50/80 dark:bg-zinc-800/50">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                    <Check size={16} strokeWidth={3} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white leading-tight">
                      ¡Orden de Compra Registrada!
                    </h3>
                    <p className="text-[11px] text-slate-500 dark:text-zinc-400 font-mono">
                      {String(createdPurchase.id).toUpperCase()}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setCreatedPurchase(null)
                    navigate('/compras', { state: { created: true } })
                  }}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors"
                  title="Cerrar"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Purchase Receipt Card */}
              <div className="overflow-y-auto p-5 flex-1 space-y-4">
                <div className="text-center pb-3 border-b border-slate-100 dark:border-zinc-800">
                  <h4 className="font-extrabold text-sm text-slate-900 dark:text-white uppercase tracking-wider">
                    {company?.name || 'CLEANIG SERVICE'}
                  </h4>
                  <p className="text-xs text-slate-500 font-mono">
                    RUC: {company?.ruc || '82181289381'}
                  </p>
                  <span className={`inline-block mt-2 px-2.5 py-0.5 rounded-full text-xs font-bold ${
                    createdPurchase.status === 'recibido'
                      ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                      : 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300'
                  }`}>
                    {createdPurchase.status === 'recibido' ? '✓ Recibido en Almacén' : '⏳ Pendiente de Recepción'}
                  </span>
                </div>

                {/* Details */}
                <div className="bg-slate-50 dark:bg-zinc-800/60 p-3.5 rounded-2xl space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Proveedor:</span>
                    <span className="font-bold text-slate-800 dark:text-white">{createdPurchase.supplier?.name || 'Proveedor'}</span>
                  </div>
                  {createdPurchase.supplier?.ruc && (
                    <div className="flex justify-between">
                      <span className="text-slate-500">RUC Proveedor:</span>
                      <span className="font-mono font-bold text-slate-700 dark:text-zinc-300">{createdPurchase.supplier.ruc}</span>
                    </div>
                  )}
                  {createdPurchase.invoice_ref && (
                    <div className="flex justify-between">
                      <span className="text-slate-500">Factura / Guía:</span>
                      <span className="font-mono font-bold text-blue-600">{createdPurchase.invoice_ref}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-slate-500">Fecha de Registro:</span>
                    <span className="text-slate-700 dark:text-zinc-300">
                      {new Date().toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </span>
                  </div>
                </div>

                {/* Items */}
                <div className="space-y-2">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Artículos Abastecidos</p>
                  <div className="border border-slate-100 dark:border-zinc-800 rounded-xl overflow-hidden text-xs">
                    <table className="w-full text-left">
                      <thead className="bg-slate-50 dark:bg-zinc-800 text-[10.5px] text-slate-400 font-bold uppercase">
                        <tr>
                          <th className="py-2 px-3">Item</th>
                          <th className="py-2 px-2 text-center">Cant.</th>
                          <th className="py-2 px-3 text-right">Costo</th>
                          <th className="py-2 px-3 text-right">Subtotal</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-zinc-800">
                        {createdPurchase.items.map((it, idx) => (
                          <tr key={idx}>
                            <td className="py-2 px-3 font-medium text-slate-800 dark:text-zinc-200">
                              {it.product_name}
                            </td>
                            <td className="py-2 px-2 text-center font-bold font-mono">
                              {it.quantity}
                            </td>
                            <td className="py-2 px-3 text-right font-mono text-slate-500">
                              {fmt(it.unit_cost)}
                            </td>
                            <td className="py-2 px-3 text-right font-mono font-bold text-slate-900 dark:text-white">
                              {fmt(it.quantity * it.unit_cost)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Total */}
                <div className="p-3 bg-blue-50/70 dark:bg-blue-950/30 rounded-2xl flex justify-between items-center border border-blue-100 dark:border-blue-900/40">
                  <span className="text-xs font-bold text-blue-950 dark:text-blue-200 uppercase tracking-wide">
                    Total Invertido:
                  </span>
                  <span className="text-xl font-black font-mono text-blue-600 dark:text-blue-400">
                    {fmt(createdPurchase.total)}
                  </span>
                </div>
              </div>

              {/* Footer Actions */}
              <div className="p-3.5 bg-slate-50 dark:bg-zinc-800/60 border-t border-slate-100 dark:border-zinc-800 flex items-center justify-between gap-2.5 text-xs">
                <button
                  type="button"
                  onClick={() => {
                    setCreatedPurchase(null)
                    navigate('/compras', { state: { created: true } })
                  }}
                  className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-slate-700 dark:text-zinc-200 font-semibold hover:bg-slate-100 dark:hover:bg-zinc-700 transition-colors cursor-pointer"
                >
                  Ir a Lista de Compras
                </button>

                <button
                  type="button"
                  onClick={handleResetForm}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold transition-colors cursor-pointer"
                >
                  Nueva Orden
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ═════════════════════════════════════════════════════════
            MODAL: REGISTRO RÁPIDO DE PROVEEDOR (+ PROVEEDOR RÁPIDO)
           ═════════════════════════════════════════════════════════ */}
        {showQuickSupplierModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-fade-in">
            <div className="relative w-full max-w-md bg-white dark:bg-[#141417] rounded-3xl shadow-2xl border border-slate-200 dark:border-zinc-800 overflow-hidden flex flex-col animate-scale-in">
              <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 dark:border-zinc-800 bg-slate-50/80 dark:bg-zinc-800/50">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
                    <Building2 size={16} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                      Registrar Proveedor Rápido
                    </h3>
                    <p className="text-[11px] text-slate-500">Se agregará de inmediato a tu catálogo</p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setShowQuickSupplierModal(false)}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleCreateQuickSupplier} className="p-5 space-y-3.5 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-zinc-300 mb-1">
                    Razón Social / Nombre Comercial *
                  </label>
                  <input
                    type="text"
                    value={quickSupplierName}
                    onChange={(e) => setQuickSupplierName(e.target.value)}
                    placeholder="Ej. DISTRIBUIDORA TECNOLÓGICA S.A.C."
                    required
                    autoFocus
                    className="w-full bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white outline-none focus:border-blue-600 font-medium"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 dark:text-zinc-300 mb-1">
                      R.U.C. (11 dígitos)
                    </label>
                    <input
                      type="text"
                      value={quickSupplierRuc}
                      onChange={(e) => setQuickSupplierRuc(e.target.value)}
                      placeholder="20601234567"
                      maxLength={11}
                      className="w-full bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white outline-none focus:border-blue-600 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 dark:text-zinc-300 mb-1">
                      Teléfono / WhatsApp
                    </label>
                    <input
                      type="text"
                      value={quickSupplierPhone}
                      onChange={(e) => setQuickSupplierPhone(e.target.value)}
                      placeholder="987654321"
                      className="w-full bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white outline-none focus:border-blue-600 font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-zinc-300 mb-1">
                    Persona de Contacto (Opcional)
                  </label>
                  <input
                    type="text"
                    value={quickSupplierContact}
                    onChange={(e) => setQuickSupplierContact(e.target.value)}
                    placeholder="Ej. Ing. Carlos Mendoza"
                    className="w-full bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white outline-none focus:border-blue-600 font-medium"
                  />
                </div>

                {quickSupplierError && (
                  <div className="p-2.5 rounded-xl bg-red-50 text-red-600 text-xs flex items-center gap-1.5">
                    <AlertCircle size={14} className="shrink-0" />
                    <span>{quickSupplierError}</span>
                  </div>
                )}

                <div className="pt-2 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowQuickSupplierModal(false)}
                    className="px-4 py-2 rounded-xl border border-slate-200 dark:border-zinc-700 text-slate-600 dark:text-zinc-300 font-semibold hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={savingQuickSupplier}
                    className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-md shadow-blue-500/20 transition-all cursor-pointer disabled:opacity-50"
                  >
                    {savingQuickSupplier ? 'Guardando…' : 'Guardar y Seleccionar'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal de confirmación para descartar cambios */}
        {DiscardModalComponent}

      </div>
    </AppLayout>
  )
}
