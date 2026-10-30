import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeft, Plus, Trash2, ShoppingCart, User, Phone,
  Calendar, Clock, Package, Check, AlertCircle, FileText,
  Building2, DollarSign, Sparkles, CheckCircle2, ShieldCheck,
  QrCode, Smartphone, CreditCard, Banknote, Copy, Upload, Maximize2, ExternalLink
} from 'lucide-react'
import AppLayout from '../components/layout/AppLayout'
import PaymentQrModal from '../components/PaymentQrModal'
import { salesService } from '../services/salesService'
import { productsService } from '../services/productsService'
import { clientsService } from '../services/clientsService'
import { usersService } from '../services/usersService'
import { paymentMethodsService } from '../services/paymentMethodsService'
import { useAuth } from '../context/AuthContext'

const fmt = (n) =>
  `S/ ${(Number(n) || 0).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

export default function NewSale() {
  const navigate = useNavigate()
  const { user } = useAuth()

  // Data states
  const [products, setProducts] = useState([])
  const [clients, setClients] = useState([])
  const [sellers, setSellers] = useState([])
  const [loadingData, setLoadingData] = useState(true)

  // Sale form states
  const [clientName, setClientName] = useState('')
  const [clientPhone, setClientPhone] = useState('')
  const [selectedClientId, setSelectedClientId] = useState('')
  const [orderType, setOrderType] = useState('COMPRA VENTA')
  const [purchaseOrder, setPurchaseOrder] = useState('')
  const [sellerName, setSellerName] = useState(user?.full_name || 'LUCA LORENTZ')
  const [serie, setSerie] = useState('001')

  const [paymentStatus, setPaymentStatus] = useState('pagado') // 'pagado' | 'pendiente'
  const [paymentMethod, setPaymentMethod] = useState('efectivo') // 'efectivo' | 'yape' | 'plin' | 'transferencia' | 'tarjeta'
  const [paymentConfig, setPaymentConfig] = useState(null)
  const [showQrModal, setShowQrModal] = useState(false)
  const [cashReceived, setCashReceived] = useState('')
  const [copiedText, setCopiedText] = useState('')

  const [dueDate, setDueDate] = useState('')
  const [notes, setNotes] = useState('')
  const [discount, setDiscount] = useState('')

  // Line items
  const [items, setItems] = useState([
    { product_id: '', quantity: 1, unit_price: '' }
  ])

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // Load initial catalog data
  useEffect(() => {
    async function init() {
      setLoadingData(true)
      try {
        const [p, c, u] = await Promise.all([
          productsService.list().catch(() => []),
          clientsService.list().catch(() => []),
          usersService.list().catch(() => [])
        ])
        setProducts(p || [])
        setClients(c || [])
        setSellers(u || [])
      } finally {
        setLoadingData(false)
      }
    }
    init()

    // Load company payment configuration & subscribe to changes
    setPaymentConfig(paymentMethodsService.get())
    const handleUpdate = (e) => setPaymentConfig(e.detail)
    window.addEventListener('cya-payment-methods-updated', handleUpdate)
    return () => window.removeEventListener('cya-payment-methods-updated', handleUpdate)
  }, [])

  const handleCopy = (text) => {
    if (!text) return
    navigator.clipboard.writeText(text)
    setCopiedText(text)
    setTimeout(() => setCopiedText(''), 2500)
  }

  const handleQuickUploadQr = async (methodKey, file) => {
    if (!file) return
    try {
      const dataUrl = await paymentMethodsService.processImageFile(file, methodKey)
      const updated = await paymentMethodsService.save({
        [methodKey]: {
          ...paymentConfig?.[methodKey],
          qr_image: dataUrl
        }
      })
      setPaymentConfig(updated)
    } catch (err) {
      setError(err.message || 'Error al procesar la imagen del QR')
    }
  }

  // Auto-fill when selecting an existing client
  const handleClientSelect = (clientId) => {
    setSelectedClientId(clientId)
    if (!clientId) return
    const found = clients.find(c => c.id === clientId)
    if (found) {
      setClientName(found.name || '')
      setClientPhone(found.phone || found.ruc || '')
    }
  }

  // Seller options
  const sellerOptions = useMemo(() => {
    const list = new Set(['LUCA LORENTZ', 'JOHN L.', 'PAMELA KIM'])
    if (user?.full_name) list.add(user.full_name)
    sellers.forEach(s => { if (s.full_name) list.add(s.full_name) })
    return Array.from(list)
  }, [user, sellers])

  // Item row operations
  const addItemRow = () => {
    setItems([...items, { product_id: '', quantity: 1, unit_price: '' }])
  }

  const removeItemRow = (idx) => {
    if (items.length <= 1) return
    setItems(items.filter((_, i) => i !== idx))
  }

  const updateItem = (idx, patch) => {
    setItems(items.map((it, i) => {
      if (i !== idx) return it
      const updated = { ...it, ...patch }
      // If product_id changed, set default unit price
      if (patch.product_id !== undefined && patch.product_id !== it.product_id) {
        const prod = products.find(p => p.id === patch.product_id)
        if (prod) {
          updated.unit_price = Number(prod.sale_price) || 0
        }
      }
      return updated
    }))
  }

  // Calculations
  const subtotal = useMemo(() => {
    return items.reduce((sum, it) => {
      const price = Number(it.unit_price) || 0
      const qty = Number(it.quantity) || 0
      return sum + (price * qty)
    }, 0)
  }, [items])

  const total = useMemo(() => {
    return Math.max(subtotal - (Number(discount) || 0), 0)
  }, [subtotal, discount])

  // Submit sale creation
  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (!clientName.trim()) {
      setError('Por favor ingresa o selecciona la Razón Social o Nombre del Cliente')
      return
    }

    const validItems = items.filter(it => it.product_id && Number(it.quantity) > 0)
    if (!validItems.length) {
      setError('Debes agregar al menos un artículo a la orden con cantidad mayor a cero')
      return
    }

    // Validate inventory stock
    for (const it of validItems) {
      const prod = products.find(p => p.id === it.product_id)
      if (prod && Number(it.quantity) > Number(prod.stock)) {
        setError(`Stock insuficiente para "${prod.name}". Stock actual disponible: ${prod.stock} ${prod.unit || 'uds.'}`)
        return
      }
    }

    setSaving(true)
    try {
      const saleItems = validItems.map(it => {
        const prod = products.find(p => p.id === it.product_id)
        return {
          product_id: it.product_id,
          quantity: Number(it.quantity),
          unit_price: Number(it.unit_price) || Number(prod?.sale_price) || 0
        }
      })

      const methodTag = paymentStatus === 'pagado'
        ? `[Medio: ${paymentMethod.toUpperCase()}]`
        : '[A Crédito]'

      const finalNotes = [
        methodTag,
        purchaseOrder ? `OC: ${purchaseOrder}` : '',
        notes
      ].filter(Boolean).join(' - ')

      await salesService.create({
        client_name: clientName.trim(),
        client_phone: clientPhone.trim() || undefined,
        user_id: user?.id,
        status: paymentStatus,
        items: saleItems,
        discount: Number(discount) || 0,
        due_date: paymentStatus === 'pendiente' ? (dueDate || null) : null,
        notes: finalNotes || null,
        serie: serie || '001',
        order_type: orderType || 'COMPRA VENTA',
        seller_name: sellerName
      })

      // Return to Ventas table
      navigate('/ventas', { state: { created: true, clientName } })
    } catch (err) {
      setError(err.message || 'No se pudo registrar la venta')
    } finally {
      setSaving(false)
    }
  }

  return (
    <AppLayout title="Nueva Venta">
      <div className="space-y-5 max-w-6xl mx-auto pb-16">

        {/* ═════════════════════════════════════════════════════════
            TOP BAR WITH BREADCRUMB & BACK ACTION
           ═════════════════════════════════════════════════════════ */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-[#131627] p-5 rounded-2xl border border-slate-200/80 dark:border-white/10 shadow-xs">
          <div className="flex items-center gap-3.5">
            <button
              type="button"
              onClick={() => navigate('/ventas')}
              className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-white/10 transition-all cursor-pointer"
              title="Regresar a Ventas"
            >
              <ArrowLeft size={18} />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-400">Ventas</span>
                <span className="text-xs text-slate-300">/</span>
                <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">Nueva Venta</span>
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight mt-0.5">
                Emitir Nueva Venta
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-500/30">
              <Sparkles size={13} /> Borrador en preparación
            </span>
          </div>
        </div>

        {/* ═════════════════════════════════════════════════════════
            MAIN FORM: 2 COLUMNS (ITEMS & DETAILS | ORDER TOTALS)
           ═════════════════════════════════════════════════════════ */}
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">

            {/* LEFT COLUMN: Customer Data + Items Table (8 Cols) */}
            <div className="lg:col-span-8 space-y-5">

              {/* CARD 1: CLIENT & ORDER ATTRIBUTES */}
              <div className="bg-white dark:bg-[#131627] rounded-2xl border border-slate-200/80 dark:border-white/10 p-5 shadow-xs space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-white/10">
                  <div className="flex items-center gap-2">
                    <User size={16} className="text-indigo-600 dark:text-indigo-400" />
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                      1. Información del Cliente & Orden
                    </h3>
                  </div>
                  {clients.length > 0 && (
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-slate-400">Cliente guardado:</span>
                      <select
                        value={selectedClientId}
                        onChange={(e) => handleClientSelect(e.target.value)}
                        className="bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg px-2.5 py-1 text-xs text-slate-800 dark:text-white outline-none focus:border-indigo-500 cursor-pointer max-w-[200px]"
                      >
                        <option value="">Seleccionar del catálogo…</option>
                        {clients.map(c => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Cliente / Razón Social *
                    </label>
                    <input
                      type="text"
                      value={clientName}
                      onChange={(e) => { setClientName(e.target.value); setSelectedClientId('') }}
                      placeholder="Ej. EMPRESA 1 SA / Juan Pérez"
                      required
                      className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-3.5 py-2 text-xs sm:text-sm text-slate-800 dark:text-white outline-none focus:border-indigo-500 focus:bg-white dark:focus:bg-[#1A1D30] transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      RUC / DNI / Teléfono de Contacto
                    </label>
                    <input
                      type="text"
                      value={clientPhone}
                      onChange={(e) => setClientPhone(e.target.value)}
                      placeholder="Ej. 20601234567 / 987 654 321"
                      className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-3.5 py-2 text-xs sm:text-sm text-slate-800 dark:text-white outline-none focus:border-indigo-500 focus:bg-white dark:focus:bg-[#1A1D30] font-mono transition-all"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-1">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                      Serie
                    </label>
                    <select
                      value={serie}
                      onChange={(e) => setSerie(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-white outline-none focus:border-indigo-500 cursor-pointer font-mono font-bold"
                    >
                      <option value="001">001 (Principal)</option>
                      <option value="002">002 (Sucursal)</option>
                      <option value="B001">B001 (Boleta)</option>
                      <option value="F001">F001 (Factura)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                      Tipo de Pedido
                    </label>
                    <select
                      value={orderType}
                      onChange={(e) => setOrderType(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-white outline-none focus:border-indigo-500 cursor-pointer font-semibold"
                    >
                      <option value="COMPRA VENTA">COMPRA VENTA</option>
                      <option value="REPUESTOS">REPUESTOS</option>
                      <option value="SERVICIOS">SERVICIOS</option>
                      <option value="ESTRUCTURAS">ESTRUCTURAS</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                      Orden Compra (O.C.)
                    </label>
                    <input
                      type="text"
                      value={purchaseOrder}
                      onChange={(e) => setPurchaseOrder(e.target.value)}
                      placeholder="Ej. COS3127C0-401814"
                      className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-white outline-none focus:border-indigo-500 font-mono uppercase"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                      Vendedor Asignado
                    </label>
                    <select
                      value={sellerName}
                      onChange={(e) => setSellerName(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-white outline-none focus:border-indigo-500 cursor-pointer font-semibold"
                    >
                      {sellerOptions.map((s, idx) => (
                        <option key={idx} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* CARD 2: PRODUCTS & LINE ITEMS TABLE */}
              <div className="bg-white dark:bg-[#131627] rounded-2xl border border-slate-200/80 dark:border-white/10 p-5 shadow-xs space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-white/10">
                  <div className="flex items-center gap-2">
                    <Package size={16} className="text-indigo-600 dark:text-indigo-400" />
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                      2. Artículos del Pedido / Venta
                    </h3>
                  </div>

                  <button
                    type="button"
                    onClick={addItemRow}
                    className="px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-500/15 dark:hover:bg-indigo-500/25 text-indigo-700 dark:text-indigo-300 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Plus size={14} />
                    <span>Agregar Artículo</span>
                  </button>
                </div>

                {/* Line Items List */}
                <div className="space-y-3">
                  {items.map((it, idx) => {
                    const prod = products.find(p => p.id === it.product_id)
                    const lineTotal = (Number(it.unit_price) || 0) * (Number(it.quantity) || 0)
                    const isOverStock = prod && Number(prod.stock) < Number(it.quantity || 1)

                    return (
                      <div
                        key={idx}
                        className="bg-slate-50/70 dark:bg-white/5 border border-slate-200/80 dark:border-white/10 p-3.5 rounded-xl flex flex-col sm:flex-row sm:items-center gap-3 transition-all"
                      >
                        {/* Row Index */}
                        <span className="w-6 h-6 rounded-full bg-slate-200/70 dark:bg-white/10 text-slate-600 dark:text-slate-300 text-[11px] font-bold flex items-center justify-center shrink-0">
                          {idx + 1}
                        </span>

                        {/* Product Selection */}
                        <div className="flex-1 min-w-0">
                          <select
                            value={it.product_id}
                            onChange={(e) => updateItem(idx, { product_id: e.target.value })}
                            required
                            className="w-full bg-white dark:bg-[#1A1D30] border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-white font-medium focus:outline-none focus:border-indigo-500"
                          >
                            <option value="">Selecciona un producto del catálogo…</option>
                            {products.map(p => (
                              <option key={p.id} value={p.id}>
                                {p.sku} — {p.name} ({fmt(p.sale_price)} | Stock: {p.stock} {p.unit || 'uds.'})
                              </option>
                            ))}
                          </select>

                          {prod && (
                            <div className="flex items-center justify-between text-[11px] text-slate-400 mt-1 px-1">
                              <span>
                                Precio sugerido: <strong className="text-slate-700 dark:text-slate-300 font-mono">{fmt(prod.sale_price)}</strong>
                              </span>
                              <span className={isOverStock ? 'text-red-500 font-bold' : 'text-slate-500'}>
                                Stock disponible: {prod.stock} {prod.unit || 'uds.'}
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Quantity */}
                        <div className="flex items-center gap-2 shrink-0">
                          <div className="w-20">
                            <label className="block text-[10px] uppercase font-bold text-slate-400 mb-0.5">
                              Cant.
                            </label>
                            <input
                              type="number"
                              min="1"
                              value={it.quantity}
                              onChange={(e) => updateItem(idx, { quantity: e.target.value })}
                              required
                              className="w-full bg-white dark:bg-[#1A1D30] border border-slate-200 dark:border-white/10 rounded-xl py-1.5 text-center text-xs font-mono font-bold text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
                            />
                          </div>

                          {/* Unit Price */}
                          <div className="w-28">
                            <label className="block text-[10px] uppercase font-bold text-slate-400 mb-0.5">
                              P. Unitario (S/)
                            </label>
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              value={it.unit_price}
                              onChange={(e) => updateItem(idx, { unit_price: e.target.value })}
                              placeholder="0.00"
                              required
                              className="w-full bg-white dark:bg-[#1A1D30] border border-slate-200 dark:border-white/10 rounded-xl px-2 py-1.5 text-right text-xs font-mono font-bold text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
                            />
                          </div>

                          {/* Line Total */}
                          <div className="w-24 text-right">
                            <label className="block text-[10px] uppercase font-bold text-slate-400 mb-0.5">
                              Subtotal
                            </label>
                            <span className="font-mono font-extrabold text-xs text-slate-900 dark:text-white block py-1.5">
                              {fmt(lineTotal)}
                            </span>
                          </div>

                          {/* Delete button */}
                          <button
                            type="button"
                            onClick={() => removeItemRow(idx)}
                            disabled={items.length <= 1}
                            className="p-1.5 text-slate-400 hover:text-red-600 disabled:opacity-20 disabled:hover:text-slate-400 rounded-lg hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors cursor-pointer mt-4"
                            title="Eliminar artículo"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>

                <div className="pt-2">
                  <button
                    type="button"
                    onClick={addItemRow}
                    className="w-full py-2.5 rounded-xl border-2 border-dashed border-slate-200 dark:border-white/10 hover:border-indigo-400 hover:bg-indigo-50/40 dark:hover:bg-white/5 text-slate-500 dark:text-slate-400 hover:text-indigo-600 text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                  >
                    <Plus size={15} />
                    <span>Agregar otra línea de producto</span>
                  </button>
                </div>
              </div>

            </div>

            {/* RIGHT COLUMN: Payment Condition, Discount, & Financial Summary (4 Cols) */}
            <div className="lg:col-span-4 space-y-5">

              {/* CARD 3: PAYMENT CONDITION & NOTES */}
              <div className="bg-white dark:bg-[#131627] rounded-2xl border border-slate-200/80 dark:border-white/10 p-5 shadow-xs space-y-4">
                <div className="pb-3 border-b border-slate-100 dark:border-white/10">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Clock size={16} className="text-indigo-600 dark:text-indigo-400" />
                    3. Condición de Pago
                  </h3>
                </div>

                {/* Segmented selector */}
                <div className="grid grid-cols-2 gap-2 bg-slate-100 dark:bg-white/5 p-1 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setPaymentStatus('pagado')}
                    className={`py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      paymentStatus === 'pagado'
                        ? 'bg-white dark:bg-[#1E2038] text-slate-900 dark:text-white shadow-xs'
                        : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
                    }`}
                  >
                    Al Contado (Pagado)
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentStatus('pendiente')}
                    className={`py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      paymentStatus === 'pendiente'
                        ? 'bg-amber-500 text-white shadow-xs'
                        : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
                    }`}
                  >
                    A Crédito (Pendiente)
                  </button>
                </div>

                {/* PAYMENT METHOD SELECTOR (When Al Contado) */}
                {paymentStatus === 'pagado' && (
                  <div className="space-y-3 pt-1 border-t border-slate-100 dark:border-white/5">
                    <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                      Medio de Pago
                    </label>

                    {/* Method Selector Pills */}
                    <div className="grid grid-cols-3 gap-1.5">
                      {/* Efectivo */}
                      <button
                        type="button"
                        onClick={() => setPaymentMethod('efectivo')}
                        className={`p-2 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-1 ${
                          paymentMethod === 'efectivo'
                            ? 'bg-emerald-50 dark:bg-emerald-500/15 border-emerald-500 text-emerald-800 dark:text-emerald-300 font-bold shadow-xs'
                            : 'bg-slate-50 dark:bg-white/5 border-slate-200/80 dark:border-white/10 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/10'
                        }`}
                      >
                        <Banknote size={16} className={paymentMethod === 'efectivo' ? 'text-emerald-600 dark:text-emerald-400' : ''} />
                        <span className="text-[11px] leading-none">Efectivo</span>
                      </button>

                      {/* Yape */}
                      <button
                        type="button"
                        onClick={() => setPaymentMethod('yape')}
                        className={`p-2 rounded-xl border text-center transition-all cursor-pointer relative flex flex-col items-center justify-center gap-1.5 ${
                          paymentMethod === 'yape'
                            ? 'bg-[#742284] border-[#742284] text-white font-bold shadow-md shadow-purple-900/25 ring-2 ring-purple-400/40'
                            : 'bg-slate-50 dark:bg-white/5 border-slate-200/80 dark:border-white/10 text-slate-700 dark:text-slate-300 hover:bg-purple-50 dark:hover:bg-purple-950/20'
                        }`}
                      >
                        <div className="flex items-center gap-1.5">
                          <img
                            src="/yape-logo.png"
                            alt="Yape"
                            className="w-5 h-5 rounded-md object-cover shrink-0 shadow-2xs"
                          />
                          <span className="text-[11px] leading-none font-black">Yape</span>
                        </div>
                        <span className={`text-[8.5px] font-bold px-1.5 py-0.2 rounded-full uppercase ${
                          paymentMethod === 'yape'
                            ? 'bg-white/20 text-white'
                            : 'bg-purple-100 text-[#742284] dark:bg-purple-900/40 dark:text-purple-300'
                        }`}>
                          QR
                        </span>
                      </button>

                      {/* Plin */}
                      <button
                        type="button"
                        onClick={() => setPaymentMethod('plin')}
                        className={`p-2 rounded-xl border text-center transition-all cursor-pointer relative flex flex-col items-center justify-center gap-1.5 ${
                          paymentMethod === 'plin'
                            ? 'bg-[#00b49f] border-[#00b49f] text-white font-bold shadow-md shadow-teal-900/25 ring-2 ring-teal-400/40'
                            : 'bg-slate-50 dark:bg-white/5 border-slate-200/80 dark:border-white/10 text-slate-700 dark:text-slate-300 hover:bg-teal-50 dark:hover:bg-teal-950/20'
                        }`}
                      >
                        <div className="flex items-center gap-1.5">
                          <img
                            src="/plin-logo.png"
                            alt="Plin"
                            className="w-5 h-5 rounded-full object-cover shrink-0 shadow-2xs"
                          />
                          <span className="text-[11px] leading-none font-black">Plin</span>
                        </div>
                        <span className={`text-[8.5px] font-bold px-1.5 py-0.2 rounded-full uppercase ${
                          paymentMethod === 'plin'
                            ? 'bg-white/20 text-white'
                            : 'bg-teal-100 text-[#00b49f] dark:bg-teal-900/40 dark:text-teal-300'
                        }`}>
                          QR
                        </span>
                      </button>

                      {/* Transferencia */}
                      <button
                        type="button"
                        onClick={() => setPaymentMethod('transferencia')}
                        className={`p-2 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-1 col-span-2 ${
                          paymentMethod === 'transferencia'
                            ? 'bg-blue-600 border-blue-600 text-white font-bold shadow-xs'
                            : 'bg-slate-50 dark:bg-white/5 border-slate-200/80 dark:border-white/10 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/10'
                        }`}
                      >
                        <div className="flex items-center gap-1">
                          <Building2 size={13} />
                          <span className="text-[11px] leading-none">Transferencia / BCP / BBVA</span>
                        </div>
                      </button>

                      {/* Tarjeta / POS */}
                      <button
                        type="button"
                        onClick={() => setPaymentMethod('tarjeta')}
                        className={`p-2 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-1 ${
                          paymentMethod === 'tarjeta'
                            ? 'bg-indigo-600 border-indigo-600 text-white font-bold shadow-xs'
                            : 'bg-slate-50 dark:bg-white/5 border-slate-200/80 dark:border-white/10 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/10'
                        }`}
                      >
                        <div className="flex items-center gap-1">
                          <CreditCard size={13} />
                          <span className="text-[11px] leading-none">Tarjeta POS</span>
                        </div>
                      </button>
                    </div>

                    {/* DYNAMIC DETAILS CARD BY PAYMENT METHOD */}

                    {/* 1. YAPE CARD */}
                    {paymentMethod === 'yape' && (
                      <div className="p-3.5 rounded-2xl bg-purple-50/70 dark:bg-purple-950/20 border border-purple-200/80 dark:border-purple-800/40 space-y-3 animate-fade-in">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <img
                              src="/yape-logo.png"
                              alt="Yape"
                              className="w-7 h-7 rounded-lg object-cover shadow-xs shrink-0"
                            />
                            <span className="text-xs font-bold text-purple-950 dark:text-purple-200">
                              Cobro con Yape
                            </span>
                          </div>
                          <span className="font-mono font-black text-xs text-[#742284] dark:text-purple-300">
                            {fmt(total)}
                          </span>
                        </div>

                        {paymentConfig?.yape?.qr_image ? (
                          <div className="space-y-2.5">
                            <div className="flex items-center gap-3 bg-white dark:bg-[#1A1D30] p-2.5 rounded-xl border border-purple-200/60 dark:border-purple-800/40 shadow-xs">
                              {/* QR Preview Thumbnail */}
                              <div className="relative w-20 h-20 bg-white p-1 rounded-lg border border-slate-200 shrink-0 flex items-center justify-center overflow-hidden">
                                <img
                                  src={paymentConfig.yape.qr_image}
                                  alt="QR Yape"
                                  className="w-full h-full object-contain"
                                />
                              </div>

                              <div className="min-w-0 flex-1 space-y-1">
                                {paymentConfig.yape.phone && (
                                  <div>
                                    <span className="text-[9.5px] uppercase font-bold text-slate-400 block leading-tight">
                                      Celular
                                    </span>
                                    <div className="flex items-center gap-1.5">
                                      <span className="font-mono font-black text-xs text-slate-900 dark:text-white">
                                        {paymentConfig.yape.phone}
                                      </span>
                                      <button
                                        type="button"
                                        onClick={() => handleCopy(paymentConfig.yape.phone)}
                                        className="p-1 text-slate-400 hover:text-purple-700 transition-colors cursor-pointer"
                                        title="Copiar número"
                                      >
                                        {copiedText === paymentConfig.yape.phone ? (
                                          <Check size={12} className="text-emerald-500" />
                                        ) : (
                                          <Copy size={12} />
                                        )}
                                      </button>
                                    </div>
                                  </div>
                                )}

                                {paymentConfig.yape.holder && (
                                  <div>
                                    <span className="text-[9.5px] uppercase font-bold text-slate-400 block leading-tight">
                                      Titular
                                    </span>
                                    <p className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 truncate">
                                      {paymentConfig.yape.holder}
                                    </p>
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Fullscreen QR Button */}
                            <button
                              type="button"
                              onClick={() => setShowQrModal(true)}
                              className="w-full py-2 px-3 rounded-xl bg-[#742284] hover:bg-[#621b70] text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer"
                            >
                              <Maximize2 size={13} />
                              <span>Mostrar QR Grande al Cliente</span>
                            </button>
                          </div>
                        ) : (
                          <div className="space-y-2.5 bg-white/70 dark:bg-white/5 p-3 rounded-xl border border-purple-200/50 dark:border-purple-800/30 text-center">
                            <p className="text-xs text-slate-600 dark:text-slate-300 font-medium">
                              No has subido tu QR de Yape todavía.
                            </p>
                            {paymentConfig?.yape?.phone && (
                              <div className="flex items-center justify-center gap-2 font-mono font-bold text-xs text-purple-900 dark:text-purple-200">
                                <span>Yapear al: {paymentConfig.yape.phone}</span>
                                <button
                                  type="button"
                                  onClick={() => handleCopy(paymentConfig.yape.phone)}
                                  className="text-purple-600 hover:underline cursor-pointer"
                                >
                                  {copiedText === paymentConfig.yape.phone ? '¡Copiado!' : 'Copiar'}
                                </button>
                              </div>
                            )}

                            <div className="pt-1 flex flex-col sm:flex-row items-center justify-center gap-2">
                              <label className="px-3 py-1.5 rounded-lg bg-[#742284] hover:bg-[#621b70] text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-xs">
                                <Upload size={13} />
                                <span>Subir captura de QR ahora</span>
                                <input
                                  type="file"
                                  accept="image/*"
                                  className="hidden"
                                  onChange={(e) => handleQuickUploadQr('yape', e.target.files?.[0])}
                                />
                              </label>

                              <button
                                type="button"
                                onClick={() => navigate('/configuracion')}
                                className="text-[11px] text-purple-700 dark:text-purple-300 hover:underline flex items-center gap-1"
                              >
                                <span>Ir a Configuración</span>
                                <ExternalLink size={11} />
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* 2. PLIN CARD */}
                    {paymentMethod === 'plin' && (
                      <div className="p-3.5 rounded-2xl bg-teal-50/70 dark:bg-teal-950/20 border border-teal-200/80 dark:border-teal-800/40 space-y-3 animate-fade-in">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <img
                              src="/plin-logo.png"
                              alt="Plin"
                              className="w-7 h-7 rounded-full object-cover shadow-xs shrink-0"
                            />
                            <span className="text-xs font-bold text-teal-950 dark:text-teal-200">
                              Cobro con Plin
                            </span>
                          </div>
                          <span className="font-mono font-black text-xs text-[#00b49f] dark:text-teal-300">
                            {fmt(total)}
                          </span>
                        </div>

                        {paymentConfig?.plin?.qr_image ? (
                          <div className="space-y-2.5">
                            <div className="flex items-center gap-3 bg-white dark:bg-[#1A1D30] p-2.5 rounded-xl border border-teal-200/60 dark:border-teal-800/40 shadow-xs">
                              {/* QR Preview Thumbnail */}
                              <div className="relative w-20 h-20 bg-white p-1 rounded-lg border border-slate-200 shrink-0 flex items-center justify-center overflow-hidden">
                                <img
                                  src={paymentConfig.plin.qr_image}
                                  alt="QR Plin"
                                  className="w-full h-full object-contain"
                                />
                              </div>

                              <div className="min-w-0 flex-1 space-y-1">
                                {paymentConfig.plin.phone && (
                                  <div>
                                    <span className="text-[9.5px] uppercase font-bold text-slate-400 block leading-tight">
                                      Celular Plin
                                    </span>
                                    <div className="flex items-center gap-1.5">
                                      <span className="font-mono font-black text-xs text-slate-900 dark:text-white">
                                        {paymentConfig.plin.phone}
                                      </span>
                                      <button
                                        type="button"
                                        onClick={() => handleCopy(paymentConfig.plin.phone)}
                                        className="p-1 text-slate-400 hover:text-teal-700 transition-colors cursor-pointer"
                                        title="Copiar número"
                                      >
                                        {copiedText === paymentConfig.plin.phone ? (
                                          <Check size={12} className="text-emerald-500" />
                                        ) : (
                                          <Copy size={12} />
                                        )}
                                      </button>
                                    </div>
                                  </div>
                                )}

                                {paymentConfig.plin.holder && (
                                  <div>
                                    <span className="text-[9.5px] uppercase font-bold text-slate-400 block leading-tight">
                                      Titular
                                    </span>
                                    <p className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 truncate">
                                      {paymentConfig.plin.holder}
                                    </p>
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Fullscreen QR Button */}
                            <button
                              type="button"
                              onClick={() => setShowQrModal(true)}
                              className="w-full py-2 px-3 rounded-xl bg-[#00b49f] hover:bg-[#009c89] text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer"
                            >
                              <Maximize2 size={13} />
                              <span>Mostrar QR Grande al Cliente</span>
                            </button>
                          </div>
                        ) : (
                          <div className="space-y-2.5 bg-white/70 dark:bg-white/5 p-3 rounded-xl border border-teal-200/50 dark:border-teal-800/30 text-center">
                            <p className="text-xs text-slate-600 dark:text-slate-300 font-medium">
                              No has subido tu QR de Plin todavía.
                            </p>
                            {paymentConfig?.plin?.phone && (
                              <div className="flex items-center justify-center gap-2 font-mono font-bold text-xs text-teal-900 dark:text-teal-200">
                                <span>Transferir a: {paymentConfig.plin.phone}</span>
                                <button
                                  type="button"
                                  onClick={() => handleCopy(paymentConfig.plin.phone)}
                                  className="text-teal-600 hover:underline cursor-pointer"
                                >
                                  {copiedText === paymentConfig.plin.phone ? '¡Copiado!' : 'Copiar'}
                                </button>
                              </div>
                            )}

                            <div className="pt-1 flex flex-col sm:flex-row items-center justify-center gap-2">
                              <label className="px-3 py-1.5 rounded-lg bg-[#00b49f] hover:bg-[#009c89] text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-xs">
                                <Upload size={13} />
                                <span>Subir captura de QR ahora</span>
                                <input
                                  type="file"
                                  accept="image/*"
                                  className="hidden"
                                  onChange={(e) => handleQuickUploadQr('plin', e.target.files?.[0])}
                                />
                              </label>

                              <button
                                type="button"
                                onClick={() => navigate('/configuracion')}
                                className="text-[11px] text-teal-700 dark:text-teal-300 hover:underline flex items-center gap-1"
                              >
                                <span>Ir a Configuración</span>
                                <ExternalLink size={11} />
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* 3. TRANSFERENCIA CARD */}
                    {paymentMethod === 'transferencia' && (
                      <div className="p-3.5 rounded-2xl bg-blue-50/70 dark:bg-blue-950/20 border border-blue-200/80 dark:border-blue-800/40 space-y-2.5 animate-fade-in text-xs">
                        <div className="flex items-center justify-between font-bold text-blue-950 dark:text-blue-200">
                          <span className="flex items-center gap-1.5">
                            <Building2 size={14} className="text-blue-600" />
                            {paymentConfig?.transfer?.bank || 'BCP'}
                          </span>
                          <span className="font-mono">{fmt(total)}</span>
                        </div>

                        {paymentConfig?.transfer?.account_number && (
                          <div className="flex items-center justify-between p-2 rounded-xl bg-white dark:bg-[#1A1D30] border border-blue-200/60 dark:border-blue-800/40">
                            <div>
                              <span className="text-[9.5px] uppercase font-bold text-slate-400 block leading-tight">
                                N° Cuenta
                              </span>
                              <span className="font-mono font-bold text-slate-900 dark:text-white">
                                {paymentConfig.transfer.account_number}
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleCopy(paymentConfig.transfer.account_number)}
                              className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200 cursor-pointer"
                            >
                              {copiedText === paymentConfig.transfer.account_number ? 'Copiado' : 'Copiar'}
                            </button>
                          </div>
                        )}

                        {paymentConfig?.transfer?.cci && (
                          <div className="flex items-center justify-between p-2 rounded-xl bg-white dark:bg-[#1A1D30] border border-blue-200/60 dark:border-blue-800/40">
                            <div>
                              <span className="text-[9.5px] uppercase font-bold text-slate-400 block leading-tight">
                                CCI Interbancario
                              </span>
                              <span className="font-mono font-bold text-slate-900 dark:text-white">
                                {paymentConfig.transfer.cci}
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleCopy(paymentConfig.transfer.cci)}
                              className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200 cursor-pointer"
                            >
                              {copiedText === paymentConfig.transfer.cci ? 'Copiado' : 'Copiar'}
                            </button>
                          </div>
                        )}

                        {paymentConfig?.transfer?.holder && (
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 pt-1">
                            Titular: <strong>{paymentConfig.transfer.holder}</strong>
                          </p>
                        )}
                      </div>
                    )}

                    {/* 4. EFECTIVO CARD */}
                    {paymentMethod === 'efectivo' && (
                      <div className="p-3.5 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/20 border border-emerald-200/80 dark:border-emerald-800/40 space-y-3 animate-fade-in">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-emerald-950 dark:text-emerald-200 flex items-center gap-1.5">
                            <Banknote size={14} className="text-emerald-600" />
                            Pago en Efectivo
                          </span>
                          <span className="font-mono font-bold text-xs text-emerald-700 dark:text-emerald-300">
                            A cobrar: {fmt(total)}
                          </span>
                        </div>

                        <div>
                          <label className="block text-[10.5px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                            Monto recibido del cliente (S/)
                          </label>
                          <input
                            type="number"
                            step="0.10"
                            placeholder={total > 0 ? total.toFixed(2) : '0.00'}
                            value={cashReceived}
                            onChange={(e) => setCashReceived(e.target.value)}
                            className="w-full bg-white dark:bg-[#1A1D30] border border-emerald-200 dark:border-emerald-800/60 rounded-xl px-3 py-1.5 text-xs font-mono font-bold text-slate-900 dark:text-white outline-none focus:border-emerald-500"
                          />
                        </div>

                        {Number(cashReceived) > 0 && (
                          <div className="p-2 rounded-xl bg-white dark:bg-[#1A1D30] border border-emerald-200/70 dark:border-emerald-800/40 flex items-center justify-between text-xs">
                            <span className="font-semibold text-slate-600 dark:text-slate-300">Vuelto a entregar:</span>
                            <span className={`font-mono font-black text-sm ${Number(cashReceived) >= total ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500'}`}>
                              {Number(cashReceived) >= total
                                ? fmt(Number(cashReceived) - total)
                                : 'Falta dinero'}
                            </span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* 5. TARJETA CARD */}
                    {paymentMethod === 'tarjeta' && (
                      <div className="p-3 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/20 border border-indigo-200/80 dark:border-indigo-800/40 text-xs text-indigo-950 dark:text-indigo-200 flex items-center gap-2">
                        <CreditCard size={16} className="text-indigo-600 shrink-0" />
                        <span>Procesa la transacción en tu POS (Visa, Mastercard, Diners o Amex).</span>
                      </div>
                    )}
                  </div>
                )}

                {paymentStatus === 'pendiente' && (
                  <div className="space-y-3 pt-1">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                        Fecha límite de cobro
                      </label>
                      <input
                        type="date"
                        value={dueDate}
                        onChange={(e) => setDueDate(e.target.value)}
                        className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 text-xs font-mono text-slate-800 dark:text-white outline-none focus:border-indigo-500"
                      />
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                    Notas / Observaciones
                  </label>
                  <textarea
                    rows={2}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Instrucciones de entrega, adelanto recibido, etc."
                    className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl p-2.5 text-xs text-slate-800 dark:text-white outline-none focus:border-indigo-500 resize-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                    Descuento Global (S/)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={discount}
                    onChange={(e) => setDiscount(e.target.value)}
                    placeholder="0.00"
                    className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 text-xs font-mono text-slate-800 dark:text-white outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* CARD 4: FINANCIAL SUMMARY & SUBMISSION */}
              <div className="bg-white dark:bg-[#131627] rounded-2xl border border-slate-200/80 dark:border-white/10 p-5 shadow-xs space-y-4">
                <div className="pb-3 border-b border-slate-100 dark:border-white/10">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <DollarSign size={16} className="text-indigo-600 dark:text-indigo-400" />
                    Resumen de Liquidación
                  </h3>
                </div>

                <div className="space-y-2 text-xs">
                  <div className="flex justify-between items-center text-slate-500 dark:text-slate-400">
                    <span>Subtotal Artículos:</span>
                    <span className="font-mono font-bold text-slate-800 dark:text-white">{fmt(subtotal)}</span>
                  </div>

                  {Number(discount) > 0 && (
                    <div className="flex justify-between items-center text-amber-600 font-semibold">
                      <span>Descuento aplicado:</span>
                      <span className="font-mono">-{fmt(Number(discount))}</span>
                    </div>
                  )}

                  <div className="flex justify-between items-center text-slate-500 dark:text-slate-400">
                    <span>IGV (Incluido):</span>
                    <span className="font-mono">18%</span>
                  </div>

                  <div className="pt-3 border-t border-slate-200 dark:border-white/10 flex justify-between items-center">
                    <div>
                      <p className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                        Total a Liquidar:
                      </p>
                      <span className="text-[10px] text-slate-400">Moneda nacional (PEN)</span>
                    </div>
                    <span className="text-2xl font-black font-mono text-[#5550F2] tracking-tight">
                      {fmt(total)}
                    </span>
                  </div>
                </div>

                {error && (
                  <div className="p-3 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400 text-xs flex items-center gap-2">
                    <AlertCircle size={15} className="shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                <div className="space-y-2 pt-2">
                  <button
                    type="submit"
                    disabled={saving}
                    className="w-full py-3 rounded-xl bg-[#5550F2] hover:bg-[#4742E8] text-white font-extrabold text-xs shadow-md shadow-indigo-600/30 active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                  >
                    {saving ? (
                      <span>Registrando pedido…</span>
                    ) : (
                      <>
                        <Check size={16} strokeWidth={3} />
                        <span>Emitir y Generar Venta</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => navigate('/ventas')}
                    className="w-full py-2.5 rounded-xl border border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/5 text-slate-600 dark:text-slate-400 font-semibold text-xs transition-colors cursor-pointer"
                  >
                    Cancelar y Regresar
                  </button>
                </div>

                <div className="pt-2 text-center text-[10.5px] text-slate-400 flex items-center justify-center gap-1">
                  <ShieldCheck size={13} className="text-emerald-500" />
                  <span>Descuenta automáticamente existencias del inventario</span>
                </div>
              </div>

            </div>

          </div>
        </form>

        {/* FULLSCREEN QR CODE MODAL FOR CUSTOMER SCANNING */}
        <PaymentQrModal
          isOpen={showQrModal}
          onClose={() => setShowQrModal(false)}
          method={paymentMethod}
          paymentConfig={paymentConfig}
          amount={total}
          currency="S/"
        />

      </div>
    </AppLayout>
  )
}
