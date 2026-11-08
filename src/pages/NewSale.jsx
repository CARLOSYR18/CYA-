import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeft, Plus, Trash2, ShoppingCart, User, Phone,
  Calendar, Clock, Package, Check, AlertCircle, FileText,
  Building2, DollarSign, Sparkles, CheckCircle2, ShieldCheck,
  QrCode, Smartphone, CreditCard, Banknote, Copy, Upload, Maximize2,
  Home, ChevronDown, Minus, Search, AlertTriangle, X
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

  // Backend Data
  const [products, setProducts] = useState([])
  const [clients, setClients] = useState([])
  const [sellers, setSellers] = useState([])
  const [loadingData, setLoadingData] = useState(true)

  // Document Type & Series
  const [docType, setDocType] = useState('BOLETA') // 'BOLETA' | 'FACTURA' | 'NOTA'
  const [serie, setSerie] = useState('B001')
  const [orderType, setOrderType] = useState('COMPRA VENTA')
  const [purchaseOrder, setPurchaseOrder] = useState('')
  const [sellerName, setSellerName] = useState(user?.full_name || user?.email || '')

  // Customer Data
  const [clientName, setClientName] = useState('')
  const [clientPhone, setClientPhone] = useState('')
  const [selectedClientId, setSelectedClientId] = useState('')

  // Line items
  const [items, setItems] = useState([
    { product_id: '', quantity: 1, unit_price: '' }
  ])

  // Payment & Terms
  const [paymentStatus, setPaymentStatus] = useState('pagado') // 'pagado' | 'pendiente'
  const [paymentMethod, setPaymentMethod] = useState('efectivo') // 'efectivo' | 'yape' | 'plin' | 'transferencia' | 'tarjeta'
  const [paymentConfig, setPaymentConfig] = useState(null)
  const [showQrModal, setShowQrModal] = useState(false)
  const [cashReceived, setCashReceived] = useState('')
  const [copiedText, setCopiedText] = useState('')

  const [dueDate, setDueDate] = useState('')
  const [notes, setNotes] = useState('')
  const [discount, setDiscount] = useState('')

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // Sync serie with docType
  const handleDocTypeChange = (type) => {
    setDocType(type)
    if (type === 'FACTURA') setSerie('F001')
    else if (type === 'BOLETA') setSerie('B001')
    else setSerie('001')
  }

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

  // Auto-fill when selecting an existing client
  const handleClientSelect = (clientId) => {
    setSelectedClientId(clientId)
    if (!clientId) return
    const found = clients.find((c) => c.id === clientId)
    if (found) {
      setClientName(found.name || '')
      setClientPhone(found.phone || found.ruc || '')
    }
  }

  // Seller list
  const sellerOptions = useMemo(() => {
    const list = new Set()
    if (user?.full_name) list.add(user.full_name)
    if (user?.email) list.add(user.email)
    sellers.forEach((s) => {
      const name = s.full_name || s.email
      if (name) list.add(name)
    })
    return Array.from(list)
  }, [user, sellers])

  useEffect(() => {
    if (user && !sellerName) {
      setSellerName(user.full_name || user.email || '')
    }
  }, [user, sellerName])

  // Line item helpers
  const addItemRow = () => {
    setItems([...items, { product_id: '', quantity: 1, unit_price: '' }])
  }

  const removeItemRow = (idx) => {
    if (items.length <= 1) return
    setItems(items.filter((_, i) => i !== idx))
  }

  const updateItem = (idx, patch) => {
    setItems(
      items.map((it, i) => {
        if (i !== idx) return it
        const updated = { ...it, ...patch }
        if (patch.product_id !== undefined && patch.product_id !== it.product_id) {
          const prod = products.find((p) => p.id === patch.product_id)
          if (prod) {
            updated.unit_price = Number(prod.sale_price) || 0
          }
        }
        return updated
      })
    )
  }

  // Financial calculations
  const subtotal = useMemo(() => {
    return items.reduce((sum, it) => {
      const price = Number(it.unit_price) || 0
      const qty = Number(it.quantity) || 0
      return sum + price * qty
    }, 0)
  }, [items])

  const discountVal = Number(discount) || 0
  const total = useMemo(() => {
    return Math.max(subtotal - discountVal, 0)
  }, [subtotal, discountVal])

  const igvAmount = useMemo(() => {
    return total > 0 ? (total * 0.18) / 1.18 : 0
  }, [total])

  const netAmount = useMemo(() => {
    return total - igvAmount
  }, [total, igvAmount])

  // Submit sale creation
  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (!clientName.trim()) {
      setError('Por favor ingresa o selecciona el nombre o Razón Social del cliente')
      return
    }

    const validItems = items.filter((it) => it.product_id && Number(it.quantity) > 0)
    if (!validItems.length) {
      setError('Debes agregar al menos un artículo a la orden con cantidad mayor a cero')
      return
    }

    // Check inventory stock
    for (const it of validItems) {
      const prod = products.find((p) => p.id === it.product_id)
      if (prod && Number(it.quantity) > Number(prod.stock)) {
        setError(
          `Stock insuficiente para "${prod.name}". Stock actual disponible: ${prod.stock} ${
            prod.unit || 'uds.'
          }`
        )
        return
      }
    }

    setSaving(true)
    try {
      const saleItems = validItems.map((it) => {
        const prod = products.find((p) => p.id === it.product_id)
        return {
          product_id: it.product_id,
          quantity: Number(it.quantity),
          unit_price: Number(it.unit_price) || Number(prod?.sale_price) || 0
        }
      })

      const methodTag =
        paymentStatus === 'pagado'
          ? `[Medio: ${paymentMethod.toUpperCase()}]`
          : '[A Crédito]'

      const sellerTag = sellerName
        ? `[Vendedor: ${sellerName}]`
        : user?.full_name
        ? `[Vendedor: ${user.full_name}]`
        : ''

      const finalNotes = [
        methodTag,
        purchaseOrder ? `OC: ${purchaseOrder}` : '',
        sellerTag,
        notes
      ]
        .filter(Boolean)
        .join(' - ')

      await salesService.create({
        client_name: clientName.trim(),
        client_phone: clientPhone.trim() || undefined,
        user_id: user?.id,
        status: paymentStatus,
        receipt_type: docType.toLowerCase(),
        items: saleItems,
        discount: discountVal,
        due_date: paymentStatus === 'pendiente' ? dueDate || null : null,
        notes: finalNotes || null,
        serie: serie || 'B001',
        order_type: orderType || 'COMPRA VENTA',
        seller_name: sellerName || user?.full_name || user?.email || 'Admin'
      })

      navigate('/ventas', { state: { created: true, clientName } })
    } catch (err) {
      setError(err.message || 'No se pudo registrar la venta')
    } finally {
      setSaving(false)
    }
  }

  return (
    <AppLayout title="Nueva Venta">
      <div className="max-w-[1280px] mx-auto pb-16 space-y-5">

        {/* ═════════════════════════════════════════════════════════
            1. DOCUMENT HEADER & BREADCRUMB (UNIFIED STRIP)
           ═════════════════════════════════════════════════════════ */}
        <div className="bg-white dark:bg-[#141417] rounded-2xl border border-slate-200/80 dark:border-zinc-800 p-4 sm:p-5 shadow-xs">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">

            {/* Left: Back button + Title */}
            <div className="flex items-center gap-3.5">
              <button
                type="button"
                onClick={() => navigate('/ventas')}
                className="w-9 h-9 rounded-xl bg-slate-50 hover:bg-slate-100 dark:bg-zinc-800 dark:hover:bg-zinc-700 border border-slate-200/80 dark:border-zinc-700 flex items-center justify-center text-slate-600 dark:text-zinc-200 transition-colors cursor-pointer shrink-0"
                title="Volver a Ventas"
              >
                <ArrowLeft size={16} />
              </button>

              <div>
                <div className="flex items-center gap-1.5 text-xs text-slate-400 dark:text-zinc-500">
                  <span>Ventas</span>
                  <span>›</span>
                  <span className="font-semibold text-slate-700 dark:text-zinc-300">
                    Emitir Comprobante
                  </span>
                </div>
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                  Nueva Venta & Facturación
                </h1>
              </div>
            </div>

            {/* Right: Document Type Capsule Switcher */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="inline-flex items-center p-1 bg-slate-100 dark:bg-zinc-800 rounded-xl border border-slate-200/80 dark:border-zinc-700 text-xs font-bold">
                <button
                  type="button"
                  onClick={() => handleDocTypeChange('BOLETA')}
                  className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                    docType === 'BOLETA'
                      ? 'bg-white dark:bg-zinc-900 text-blue-600 dark:text-blue-400 shadow-xs'
                      : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  Boleta (B001)
                </button>
                <button
                  type="button"
                  onClick={() => handleDocTypeChange('FACTURA')}
                  className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                    docType === 'FACTURA'
                      ? 'bg-white dark:bg-zinc-900 text-blue-600 dark:text-blue-400 shadow-xs'
                      : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  Factura (F001)
                </button>
                <button
                  type="button"
                  onClick={() => handleDocTypeChange('NOTA')}
                  className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                    docType === 'NOTA'
                      ? 'bg-white dark:bg-zinc-900 text-blue-600 dark:text-blue-400 shadow-xs'
                      : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  Nota de Venta
                </button>
              </div>

              <span className="px-3 py-1.5 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 font-mono font-bold text-xs border border-blue-200/60 dark:border-blue-800/40">
                Serie: {serie}
              </span>
            </div>

          </div>
        </div>

        {/* ═════════════════════════════════════════════════════════
            2. MAIN INVOICE FORM (STRUCTURED ENTERPRISE DOCUMENT)
           ═════════════════════════════════════════════════════════ */}
        <form onSubmit={handleSubmit} className="space-y-5">

          {/* ─── SECTION 1: CUSTOMER & ORDER ATTRIBUTES ─── */}
          <div className="bg-white dark:bg-[#141417] rounded-2xl border border-slate-200/80 dark:border-zinc-800 p-5 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100 dark:border-zinc-800">
              <div className="flex items-center gap-2">
                <User size={16} className="text-blue-600 dark:text-blue-400" />
                <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                  Datos del Cliente & Comprobante
                </h2>
              </div>

              {clients.length > 0 && (
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-slate-400 font-medium">Autocompletar cliente:</span>
                  <select
                    value={selectedClientId}
                    onChange={(e) => handleClientSelect(e.target.value)}
                    className="bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-lg px-2.5 py-1 text-xs text-slate-800 dark:text-zinc-200 font-semibold outline-none focus:border-blue-600 cursor-pointer max-w-[220px]"
                  >
                    <option value="">Seleccionar del catálogo…</option>
                    {clients.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-3.5">
              {/* Cliente / Razón Social */}
              <div className="md:col-span-5">
                <label className="block text-[11px] font-bold text-slate-600 dark:text-zinc-300 mb-1">
                  Cliente / Razón Social <span className="text-blue-600">*</span>
                </label>
                <div className="relative">
                  <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={clientName}
                    onChange={(e) => {
                      setClientName(e.target.value)
                      setSelectedClientId('')
                    }}
                    placeholder="Ej. DISTRIBUIDORA LIMA S.A.C. / Juan Pérez"
                    required
                    className="w-full bg-slate-50 dark:bg-zinc-800/80 border border-slate-200/90 dark:border-zinc-700 rounded-xl pl-8 pr-3 py-2 text-xs sm:text-sm text-slate-900 dark:text-white outline-none focus:border-blue-600 focus:bg-white dark:focus:bg-zinc-900 transition-all font-medium"
                  />
                </div>
              </div>

              {/* RUC / DNI / Teléfono */}
              <div className="md:col-span-3">
                <label className="block text-[11px] font-bold text-slate-600 dark:text-zinc-300 mb-1">
                  RUC / DNI / Teléfono
                </label>
                <div className="relative">
                  <FileText size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={clientPhone}
                    onChange={(e) => setClientPhone(e.target.value)}
                    placeholder="20601234567 / 987654321"
                    className="w-full bg-slate-50 dark:bg-zinc-800/80 border border-slate-200/90 dark:border-zinc-700 rounded-xl pl-8 pr-3 py-2 text-xs sm:text-sm text-slate-900 dark:text-white outline-none focus:border-blue-600 font-mono"
                  />
                </div>
              </div>

              {/* Vendedor Asignado */}
              <div className="md:col-span-2">
                <label className="block text-[11px] font-bold text-slate-600 dark:text-zinc-300 mb-1">
                  Vendedor
                </label>
                <select
                  value={sellerName}
                  onChange={(e) => setSellerName(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-zinc-800/80 border border-slate-200/90 dark:border-zinc-700 rounded-xl px-2.5 py-2 text-xs text-slate-900 dark:text-white outline-none focus:border-blue-600 font-semibold cursor-pointer"
                >
                  {sellerOptions.map((s, idx) => (
                    <option key={idx} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>

              {/* O.C. / Referencia */}
              <div className="md:col-span-2">
                <label className="block text-[11px] font-bold text-slate-600 dark:text-zinc-300 mb-1">
                  O.C. / Referencia
                </label>
                <input
                  type="text"
                  value={purchaseOrder}
                  onChange={(e) => setPurchaseOrder(e.target.value)}
                  placeholder="Ej. OC-1029"
                  className="w-full bg-slate-50 dark:bg-zinc-800/80 border border-slate-200/90 dark:border-zinc-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white outline-none focus:border-blue-600 font-mono uppercase"
                />
              </div>
            </div>
          </div>

          {/* ─── SECTION 2: PRODUCTS TABLE (FULL WIDTH, CLEAN ENTERPRISE GRID) ─── */}
          <div className="bg-white dark:bg-[#141417] rounded-2xl border border-slate-200/80 dark:border-zinc-800 overflow-hidden shadow-xs">
            <div className="p-4 sm:p-5 pb-3 flex items-center justify-between border-b border-slate-100 dark:border-zinc-800">
              <div className="flex items-center gap-2">
                <Package size={16} className="text-blue-600 dark:text-blue-400" />
                <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                  Detalle de Artículos Facturados
                </h2>
                <span className="text-xs text-slate-400 font-medium">({items.length} líneas)</span>
              </div>

              <button
                type="button"
                onClick={addItemRow}
                className="px-3 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/40 dark:hover:bg-blue-900/40 text-blue-600 dark:text-blue-400 text-xs font-bold flex items-center gap-1.5 border border-blue-200/70 dark:border-blue-800/50 transition-colors cursor-pointer"
              >
                <Plus size={14} />
                <span>Agregar Artículo</span>
              </button>
            </div>

            {/* Desktop Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50/70 dark:bg-zinc-800/50 border-b border-slate-200/80 dark:border-zinc-800 text-[11px] font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider">
                    <th className="py-2.5 px-3 w-10 text-center">#</th>
                    <th className="py-2.5 px-3 min-w-[280px]">Artículo / Producto</th>
                    <th className="py-2.5 px-3 w-32 text-center">Stock Disp.</th>
                    <th className="py-2.5 px-3 w-28 text-center">Cantidad</th>
                    <th className="py-2.5 px-3 w-36 text-right">P. Unitario (S/)</th>
                    <th className="py-2.5 px-3 w-32 text-right">Subtotal</th>
                    <th className="py-2.5 px-3 w-12 text-center"></th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100 dark:divide-zinc-800">
                  {items.map((it, idx) => {
                    const prod = products.find((p) => p.id === it.product_id)
                    const lineTotal = (Number(it.unit_price) || 0) * (Number(it.quantity) || 0)
                    const isOverStock = prod && Number(prod.stock) < Number(it.quantity || 1)

                    return (
                      <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-zinc-800/30 transition-colors">
                        {/* Number */}
                        <td className="py-3 px-3 text-center font-bold text-slate-400">
                          {idx + 1}
                        </td>

                        {/* Product Select */}
                        <td className="py-3 px-3">
                          <select
                            value={it.product_id}
                            onChange={(e) => updateItem(idx, { product_id: e.target.value })}
                            required
                            className="w-full bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white font-medium outline-none focus:border-blue-600 focus:bg-white dark:focus:bg-zinc-900"
                          >
                            <option value="">Selecciona un producto del catálogo…</option>
                            {products.map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.sku ? `[${p.sku}] ` : ''}{p.name} — {fmt(p.sale_price)}
                              </option>
                            ))}
                          </select>
                        </td>

                        {/* Stock */}
                        <td className="py-3 px-3 text-center whitespace-nowrap">
                          {prod ? (
                            <span
                              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold ${
                                isOverStock
                                  ? 'bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300'
                                  : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                              }`}
                            >
                              <span className={`w-1.5 h-1.5 rounded-full ${isOverStock ? 'bg-red-500' : 'bg-emerald-500'}`} />
                              <span>{prod.stock} {prod.unit || 'uds.'}</span>
                            </span>
                          ) : (
                            <span className="text-slate-300 dark:text-zinc-600">—</span>
                          )}
                        </td>

                        {/* Cantidad with Stepper */}
                        <td className="py-3 px-3">
                          <div className="flex items-center justify-center border border-slate-200 dark:border-zinc-700 rounded-xl bg-slate-50 dark:bg-zinc-800 overflow-hidden w-28 mx-auto">
                            <button
                              type="button"
                              onClick={() => updateItem(idx, { quantity: Math.max(1, Number(it.quantity || 1) - 1) })}
                              className="px-2 py-1.5 text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors"
                            >
                              <Minus size={12} />
                            </button>
                            <input
                              type="number"
                              min="1"
                              value={it.quantity}
                              onChange={(e) => updateItem(idx, { quantity: e.target.value })}
                              required
                              className="w-12 bg-transparent text-center font-mono font-bold text-xs text-slate-900 dark:text-white outline-none"
                            />
                            <button
                              type="button"
                              onClick={() => updateItem(idx, { quantity: Number(it.quantity || 1) + 1 })}
                              className="px-2 py-1.5 text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors"
                            >
                              <Plus size={12} />
                            </button>
                          </div>
                        </td>

                        {/* P. Unitario */}
                        <td className="py-3 px-3 text-right">
                          <div className="relative inline-block w-32">
                            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 font-mono text-[11px]">
                              S/
                            </span>
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              value={it.unit_price}
                              onChange={(e) => updateItem(idx, { unit_price: e.target.value })}
                              placeholder="0.00"
                              required
                              className="w-full bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-xl pl-7 pr-2.5 py-1.5 text-right font-mono font-bold text-xs text-slate-900 dark:text-white outline-none focus:border-blue-600"
                            />
                          </div>
                        </td>

                        {/* Line Total */}
                        <td className="py-3 px-3 text-right font-mono font-black text-slate-900 dark:text-white text-xs">
                          {fmt(lineTotal)}
                        </td>

                        {/* Delete Row */}
                        <td className="py-3 px-3 text-center">
                          <button
                            type="button"
                            onClick={() => removeItemRow(idx)}
                            disabled={items.length <= 1}
                            className="p-1.5 text-slate-300 hover:text-red-600 disabled:opacity-20 disabled:hover:text-slate-300 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors cursor-pointer"
                            title="Quitar artículo"
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

            {/* Bottom Add Line Button */}
            <div className="p-3 bg-slate-50/50 dark:bg-zinc-800/30 border-t border-slate-100 dark:border-zinc-800 flex items-center justify-between">
              <button
                type="button"
                onClick={addItemRow}
                className="text-xs font-bold text-blue-600 hover:text-blue-700 dark:text-blue-400 flex items-center gap-1.5 px-3 py-1.5 rounded-xl hover:bg-blue-50 dark:hover:bg-blue-950/40 transition-colors cursor-pointer"
              >
                <Plus size={14} />
                <span>Agregar otra línea de artículo</span>
              </button>

              <span className="text-xs font-semibold text-slate-500 font-mono">
                {items.reduce((acc, it) => acc + (Number(it.quantity) || 0), 0)} unidades en total
              </span>
            </div>
          </div>

          {/* ─── SECTION 3: BALANCED 2-COLUMN FOOTER (PAYMENT ON LEFT | TOTALS ON RIGHT) ─── */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">

            {/* LEFT FOOTER: CONDICIÓN & MÉTODO DE PAGO (COL 7) */}
            <div className="lg:col-span-7 bg-white dark:bg-[#141417] rounded-2xl border border-slate-200/80 dark:border-zinc-800 p-5 shadow-xs flex flex-col justify-between space-y-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-zinc-800">
                  <div className="flex items-center gap-2">
                    <Clock size={16} className="text-blue-600 dark:text-blue-400" />
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                      Condición & Medio de Pago
                    </h3>
                  </div>

                  {/* Segmented Contado / Crédito */}
                  <div className="inline-flex items-center p-1 bg-slate-100 dark:bg-zinc-800 rounded-xl text-xs font-bold">
                    <button
                      type="button"
                      onClick={() => setPaymentStatus('pagado')}
                      className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                        paymentStatus === 'pagado'
                          ? 'bg-white dark:bg-zinc-900 text-emerald-600 dark:text-emerald-400 shadow-xs'
                          : 'text-slate-500 hover:text-slate-900'
                      }`}
                    >
                      Al Contado
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaymentStatus('pendiente')}
                      className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                        paymentStatus === 'pendiente'
                          ? 'bg-amber-500 text-white shadow-xs'
                          : 'text-slate-500 hover:text-slate-900'
                      }`}
                    >
                      A Crédito
                    </button>
                  </div>
                </div>

                {/* When Al Contado: Horizontal compact method pills */}
                {paymentStatus === 'pagado' ? (
                  <div className="space-y-3">
                    <div className="grid grid-cols-5 gap-1.5">
                      {/* Efectivo */}
                      <button
                        type="button"
                        onClick={() => setPaymentMethod('efectivo')}
                        className={`p-2 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-1 ${
                          paymentMethod === 'efectivo'
                            ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500 text-emerald-700 dark:text-emerald-300 font-bold shadow-xs ring-1 ring-emerald-400'
                            : 'bg-slate-50 dark:bg-zinc-800 border-slate-200/80 dark:border-zinc-700 text-slate-600 dark:text-zinc-400 hover:bg-slate-100'
                        }`}
                      >
                        <Banknote size={15} />
                        <span className="text-[11px] leading-tight">Efectivo</span>
                      </button>

                      {/* Yape */}
                      <button
                        type="button"
                        onClick={() => setPaymentMethod('yape')}
                        className={`p-2 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-1 ${
                          paymentMethod === 'yape'
                            ? 'bg-[#742284] border-[#742284] text-white font-bold shadow-xs ring-1 ring-purple-400'
                            : 'bg-slate-50 dark:bg-zinc-800 border-slate-200/80 dark:border-zinc-700 text-slate-700 dark:text-zinc-300 hover:bg-purple-50'
                        }`}
                      >
                        <img src="/yape-logo.png" alt="Yape" className="w-4 h-4 rounded-md object-cover" />
                        <span className="text-[11px] leading-tight font-black">Yape</span>
                      </button>

                      {/* Plin */}
                      <button
                        type="button"
                        onClick={() => setPaymentMethod('plin')}
                        className={`p-2 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-1 ${
                          paymentMethod === 'plin'
                            ? 'bg-[#00b49f] border-[#00b49f] text-white font-bold shadow-xs ring-1 ring-teal-400'
                            : 'bg-slate-50 dark:bg-zinc-800 border-slate-200/80 dark:border-zinc-700 text-slate-700 dark:text-zinc-300 hover:bg-teal-50'
                        }`}
                      >
                        <img src="/plin-logo.png" alt="Plin" className="w-4 h-4 rounded-full object-cover" />
                        <span className="text-[11px] leading-tight font-black">Plin</span>
                      </button>

                      {/* Transferencia */}
                      <button
                        type="button"
                        onClick={() => setPaymentMethod('transferencia')}
                        className={`p-2 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-1 ${
                          paymentMethod === 'transferencia'
                            ? 'bg-blue-600 border-blue-600 text-white font-bold shadow-xs ring-1 ring-blue-400'
                            : 'bg-slate-50 dark:bg-zinc-800 border-slate-200/80 dark:border-zinc-700 text-slate-600 dark:text-zinc-400 hover:bg-slate-100'
                        }`}
                      >
                        <Building2 size={15} />
                        <span className="text-[11px] leading-tight">Transf.</span>
                      </button>

                      {/* Tarjeta */}
                      <button
                        type="button"
                        onClick={() => setPaymentMethod('tarjeta')}
                        className={`p-2 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-1 ${
                          paymentMethod === 'tarjeta'
                            ? 'bg-indigo-600 border-indigo-600 text-white font-bold shadow-xs ring-1 ring-indigo-400'
                            : 'bg-slate-50 dark:bg-zinc-800 border-slate-200/80 dark:border-zinc-700 text-slate-600 dark:text-zinc-400 hover:bg-slate-100'
                        }`}
                      >
                        <CreditCard size={15} />
                        <span className="text-[11px] leading-tight">Tarjeta</span>
                      </button>
                    </div>

                    {/* Compact Interactive Panel according to selected method */}
                    {paymentMethod === 'efectivo' && (
                      <div className="p-3 rounded-xl bg-slate-50 dark:bg-zinc-800/60 border border-slate-200/80 dark:border-zinc-700 flex flex-wrap items-center justify-between gap-3 text-xs">
                        <div className="flex items-center gap-2">
                          <span className="text-slate-500 font-medium">Monto recibido:</span>
                          <div className="relative w-28">
                            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 font-mono">S/</span>
                            <input
                              type="number"
                              step="0.50"
                              value={cashReceived}
                              onChange={(e) => setCashReceived(e.target.value)}
                              placeholder={total > 0 ? total.toFixed(2) : '0.00'}
                              className="w-full bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-lg pl-6 pr-2 py-1 text-xs font-mono font-bold text-slate-900 dark:text-white outline-none focus:border-blue-600"
                            />
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="text-slate-500 font-medium">Vuelto:</span>
                          <span
                            className={`font-mono font-black text-sm ${
                              Number(cashReceived) >= total ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'
                            }`}
                          >
                            {Number(cashReceived) >= total ? fmt(Number(cashReceived) - total) : 'S/ 0.00'}
                          </span>
                        </div>
                      </div>
                    )}

                    {(paymentMethod === 'yape' || paymentMethod === 'plin') && (
                      <div className="p-3 rounded-xl bg-slate-50 dark:bg-zinc-800/60 border border-slate-200/80 dark:border-zinc-700 flex items-center justify-between gap-2 text-xs">
                        <div className="flex items-center gap-2.5">
                          <img
                            src={paymentMethod === 'yape' ? '/yape-logo.png' : '/plin-logo.png'}
                            alt={paymentMethod}
                            className="w-6 h-6 rounded-md object-cover"
                          />
                          <div>
                            <span className="font-bold text-slate-800 dark:text-zinc-200">
                              {paymentMethod === 'yape' ? 'Pago móvil Yape' : 'Pago móvil Plin'}
                            </span>
                            {paymentConfig?.[paymentMethod]?.phone && (
                              <div className="flex items-center gap-1.5 font-mono text-[11px] text-slate-500">
                                <span>{paymentConfig[paymentMethod].phone}</span>
                                <button
                                  type="button"
                                  onClick={() => handleCopy(paymentConfig[paymentMethod].phone)}
                                  className="text-slate-400 hover:text-blue-600"
                                >
                                  {copiedText === paymentConfig[paymentMethod].phone ? (
                                    <Check size={11} className="text-emerald-500" />
                                  ) : (
                                    <Copy size={11} />
                                  )}
                                </button>
                              </div>
                            )}
                          </div>
                        </div>

                        {paymentConfig?.[paymentMethod]?.qr_image && (
                          <button
                            type="button"
                            onClick={() => setShowQrModal(true)}
                            className="px-3 py-1.5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold text-xs flex items-center gap-1.5 hover:opacity-90 transition-opacity cursor-pointer"
                          >
                            <QrCode size={13} />
                            <span>Mostrar QR</span>
                          </button>
                        )}
                      </div>
                    )}

                    {paymentMethod === 'transferencia' && (
                      <div className="p-3 rounded-xl bg-slate-50 dark:bg-zinc-800/60 border border-slate-200/80 dark:border-zinc-700 text-xs text-slate-600 dark:text-zinc-300 flex items-center justify-between">
                        <span>Transferencia bancaria / BCP / BBVA habilitada para la orden.</span>
                        <span className="font-mono font-bold text-blue-600 dark:text-blue-400">
                          {fmt(total)}
                        </span>
                      </div>
                    )}

                    {paymentMethod === 'tarjeta' && (
                      <div className="p-3 rounded-xl bg-slate-50 dark:bg-zinc-800/60 border border-slate-200/80 dark:border-zinc-700 text-xs text-slate-600 dark:text-zinc-300 flex items-center gap-2">
                        <CreditCard size={15} className="text-indigo-600 shrink-0" />
                        <span>Cobro con tarjeta de débito o crédito en terminal POS físico.</span>
                      </div>
                    )}
                  </div>
                ) : (
                  /* When A Crédito */
                  <div className="p-3 rounded-xl bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200/80 dark:border-amber-800/40 space-y-2 text-xs">
                    <label className="block text-[11px] font-bold text-amber-900 dark:text-amber-200">
                      Fecha límite de cobro / Vencimiento
                    </label>
                    <input
                      type="date"
                      value={dueDate}
                      onChange={(e) => setDueDate(e.target.value)}
                      className="w-full bg-white dark:bg-zinc-900 border border-amber-300 dark:border-amber-700 rounded-xl px-3 py-2 text-xs font-mono text-slate-900 dark:text-white outline-none focus:border-amber-500"
                    />
                  </div>
                )}
              </div>

              {/* Compact Notes Field */}
              <div>
                <label className="block text-[11px] font-bold text-slate-500 dark:text-zinc-400 mb-1">
                  Observaciones / Instrucciones de entrega (opcional)
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Ej. Entregar en sede central / contactar a almacén..."
                  className="w-full bg-slate-50 dark:bg-zinc-800/80 border border-slate-200/80 dark:border-zinc-700 rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-white outline-none focus:border-blue-600"
                />
              </div>
            </div>

            {/* RIGHT FOOTER: RESUMEN FINANCIERO & EMISIÓN (COL 5) */}
            <div className="lg:col-span-5 bg-white dark:bg-[#141417] rounded-2xl border border-slate-200/80 dark:border-zinc-800 p-5 shadow-xs flex flex-col justify-between space-y-4">
              <div>
                <div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-zinc-800">
                  <DollarSign size={16} className="text-blue-600 dark:text-blue-400" />
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Resumen Financiero
                  </h3>
                </div>

                <div className="space-y-2.5 pt-3 text-xs">
                  {/* Subtotal */}
                  <div className="flex justify-between items-center text-slate-600 dark:text-zinc-400">
                    <span>Op. Gravada / Subtotal:</span>
                    <span className="font-mono font-bold text-slate-900 dark:text-white">{fmt(netAmount)}</span>
                  </div>

                  {/* IGV */}
                  <div className="flex justify-between items-center text-slate-600 dark:text-zinc-400">
                    <span>I.G.V. (18%):</span>
                    <span className="font-mono font-semibold">{fmt(igvAmount)}</span>
                  </div>

                  {/* Descuento Global */}
                  <div className="flex justify-between items-center">
                    <span className="text-slate-600 dark:text-zinc-400">Descuento Global (S/):</span>
                    <div className="relative w-24">
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={discount}
                        onChange={(e) => setDiscount(e.target.value)}
                        placeholder="0.00"
                        className="w-full bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-lg px-2 py-1 text-right text-xs font-mono font-bold text-amber-600 outline-none focus:border-blue-600"
                      />
                    </div>
                  </div>

                  {/* Grand Total */}
                  <div className="pt-3 border-t border-slate-200 dark:border-zinc-800 flex justify-between items-baseline">
                    <div>
                      <span className="text-xs font-black uppercase text-slate-700 dark:text-zinc-300 tracking-wider">
                        Total a Pagar:
                      </span>
                      <span className="block text-[10px] text-slate-400">Moneda nacional (PEN)</span>
                    </div>
                    <span className="text-2xl sm:text-3xl font-black font-mono text-blue-600 dark:text-blue-400 tracking-tight">
                      {fmt(total)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Error feedback */}
              {error && (
                <div className="p-3 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400 text-xs flex items-center gap-2">
                  <AlertCircle size={15} className="shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* Action Buttons */}
              <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-zinc-800">
                <button
                  type="submit"
                  disabled={saving}
                  className="w-full py-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-98 text-white font-bold text-xs sm:text-sm shadow-md shadow-blue-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                >
                  {saving ? (
                    <span>Emitiendo comprobante…</span>
                  ) : (
                    <>
                      <Check size={16} strokeWidth={3} />
                      <span>Emitir y Generar Comprobante</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => navigate('/ventas')}
                  className="w-full py-2.5 rounded-xl border border-slate-200 dark:border-zinc-700 hover:bg-slate-50 dark:hover:bg-zinc-800 text-slate-600 dark:text-zinc-300 font-semibold text-xs transition-colors cursor-pointer"
                >
                  Cancelar y Volver
                </button>
              </div>

              <div className="text-center text-[10.5px] text-slate-400 flex items-center justify-center gap-1">
                <ShieldCheck size={13} className="text-emerald-500" />
                <span>Descuenta existencias del inventario automáticamente</span>
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
