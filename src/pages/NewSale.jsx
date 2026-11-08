import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeft, Plus, Trash2, ShoppingCart, User, Phone,
  Calendar, Clock, Package, Check, AlertCircle, FileText,
  Building2, DollarSign, Sparkles, CheckCircle2, ShieldCheck,
  QrCode, Smartphone, CreditCard, Banknote, Copy, Upload, Maximize2,
  Home, ChevronDown, Minus, Search, AlertTriangle, X, Printer,
  RotateCcw, Zap, CheckCircle
} from 'lucide-react'
import AppLayout from '../components/layout/AppLayout'
import PaymentQrModal from '../components/PaymentQrModal'
import ReceiptModal from '../components/Receipt'
import { salesService } from '../services/salesService'
import { productsService } from '../services/productsService'
import { clientsService } from '../services/clientsService'
import { usersService } from '../services/usersService'
import { companySettingsService } from '../services/companySettingsService'
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
  const [company, setCompany] = useState(null)
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

  // Processing Animation & Modal States
  const [isProcessing, setIsProcessing] = useState(false)
  const [processingStep, setProcessingStep] = useState(0) // 0: idle, 1: stock check, 2: creating, 3: completed
  const [createdSale, setCreatedSale] = useState(null)
  const [error, setError] = useState('')

  // Sync serie and labels with docType
  const handleDocTypeChange = (type) => {
    setDocType(type)
    if (type === 'FACTURA') {
      setSerie('F001')
      if (clientName === 'Cliente General') setClientName('')
      if (clientPhone === '00000000') setClientPhone('')
    } else if (type === 'BOLETA') {
      setSerie('B001')
    } else {
      setSerie('001')
    }
  }

  // Quick Customer Autofill (Cliente General)
  const handleQuickClient = () => {
    if (docType === 'FACTURA') {
      setClientName('INVERSIONES & SERVICIOS S.A.C.')
      setClientPhone('20608912345')
    } else {
      setClientName('Cliente General')
      setClientPhone('00000000')
    }
    setSelectedClientId('')
  }

  // Load initial catalog data
  useEffect(() => {
    async function init() {
      setLoadingData(true)
      try {
        const [p, c, u, comp] = await Promise.all([
          productsService.list().catch(() => []),
          clientsService.list().catch(() => []),
          usersService.list().catch(() => []),
          companySettingsService.get().catch(() => null)
        ])
        setProducts(p || [])
        setClients(c || [])
        setSellers(u || [])
        setCompany(comp || null)
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

  // Submit sale creation with visual animation and instant boleta modal
  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (!clientName.trim()) {
      setError(
        docType === 'FACTURA'
          ? 'Por favor ingresa la Razón Social de la empresa'
          : 'Por favor ingresa o selecciona el nombre del cliente'
      )
      return
    }

    if (docType === 'FACTURA' && (!clientPhone.trim() || clientPhone.trim().length < 11)) {
      setError('Para emitir una Factura es obligatorio ingresar un R.U.C. válido de 11 dígitos')
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

    setIsProcessing(true)
    setProcessingStep(1)

    try {
      await new Promise((r) => setTimeout(r, 450))
      setProcessingStep(2)

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

      const created = await salesService.create({
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

      setProcessingStep(3)
      await new Promise((r) => setTimeout(r, 550))

      setIsProcessing(false)
      setCreatedSale(created)
    } catch (err) {
      setIsProcessing(false)
      setError(err.message || 'No se pudo registrar la venta')
    }
  }

  return (
    <AppLayout title="Nueva Venta">
      <div className="max-w-[1440px] mx-auto space-y-3.5 pb-4 animate-fade-in">

        {/* ═════════════════════════════════════════════════════════
            0. HEADER BAR (MATCHING 110% SIZING & PROPORTIONS)
           ═════════════════════════════════════════════════════════ */}
        <div className="bg-white dark:bg-[#141417] rounded-2xl border border-slate-200/80 dark:border-zinc-800 px-5 py-3.5 shadow-xs flex flex-wrap items-center justify-between gap-3.5">
          {/* Back button & Title */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate('/ventas')}
              className="w-10 h-10 rounded-xl bg-slate-50 hover:bg-slate-100 dark:bg-zinc-800 dark:hover:bg-zinc-700 border border-slate-200/80 dark:border-zinc-700 flex items-center justify-center text-slate-600 dark:text-zinc-200 transition-colors cursor-pointer shrink-0 shadow-2xs"
              title="Volver a Ventas"
            >
              <ArrowLeft size={17} />
            </button>

            <div>
              <div className="flex items-center gap-1.5 text-xs text-slate-400 dark:text-zinc-500 font-medium">
                <span>Ventas</span>
                <span>›</span>
                <span className="font-semibold text-slate-700 dark:text-zinc-300">
                  Emitir Comprobante
                </span>
              </div>
              <h1 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white tracking-tight leading-none mt-0.5">
                Nueva Venta & Facturación
              </h1>
            </div>
          </div>

          {/* Document Type Selector (Boleta / Factura / Nota) */}
          <div className="flex items-center gap-2.5">
            <div className="inline-flex items-center p-1 bg-slate-100 dark:bg-zinc-800 rounded-xl border border-slate-200/80 dark:border-zinc-700 text-xs sm:text-sm font-bold">
              <button
                type="button"
                onClick={() => handleDocTypeChange('BOLETA')}
                className={`px-3.5 py-1.5 rounded-lg transition-all cursor-pointer ${
                  docType === 'BOLETA'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Boleta (B001)
              </button>
              <button
                type="button"
                onClick={() => handleDocTypeChange('FACTURA')}
                className={`px-3.5 py-1.5 rounded-lg transition-all cursor-pointer ${
                  docType === 'FACTURA'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Factura (F001)
              </button>
              <button
                type="button"
                onClick={() => handleDocTypeChange('NOTA')}
                className={`px-3.5 py-1.5 rounded-lg transition-all cursor-pointer ${
                  docType === 'NOTA'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Nota de Venta
              </button>
            </div>

            {/* Quick general customer shortcut button */}
            <button
              type="button"
              onClick={handleQuickClient}
              className="px-3 py-2 rounded-xl bg-slate-50 hover:bg-slate-100 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-slate-700 dark:text-zinc-200 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Llenar automáticamente con datos de cliente mostrador"
            >
              <Zap size={14} className="text-amber-500" />
              <span className="hidden sm:inline">Cliente Rápido</span>
            </button>
          </div>
        </div>

        {/* ═════════════════════════════════════════════════════════
            1. CUSTOMER & ORDER ATTRIBUTES BAR (COMFORTABLE SIZING)
           ═════════════════════════════════════════════════════════ */}
        <div className="bg-white dark:bg-[#141417] rounded-2xl border border-slate-200/80 dark:border-zinc-800 p-4 sm:p-4.5 shadow-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3.5 items-end text-xs sm:text-sm">

            {/* Client Name / Razón Social */}
            <div className="lg:col-span-4">
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-zinc-300 flex items-center gap-1.5">
                  <User size={13} className="text-blue-600" />
                  <span>
                    {docType === 'FACTURA' ? 'Razón Social (Empresa) *' : 'Nombre del Cliente *'}
                  </span>
                </label>
                {clients.length > 0 && (
                  <select
                    value={selectedClientId}
                    onChange={(e) => handleClientSelect(e.target.value)}
                    className="text-xs bg-transparent text-blue-600 dark:text-blue-400 font-semibold outline-none cursor-pointer"
                  >
                    <option value="">Buscar en catálogo…</option>
                    {clients.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                )}
              </div>
              <input
                type="text"
                value={clientName}
                onChange={(e) => {
                  setClientName(e.target.value)
                  setSelectedClientId('')
                }}
                placeholder={
                  docType === 'FACTURA'
                    ? 'Ej. DISTRIBUIDORA INDUSTRIAL S.A.C.'
                    : 'Ej. Juan Pérez / Cliente General'
                }
                required
                className="w-full bg-slate-50 dark:bg-zinc-800/80 border border-slate-200/80 dark:border-zinc-700 rounded-xl px-3 py-2 text-xs sm:text-sm text-slate-900 dark:text-white outline-none focus:border-blue-600 focus:bg-white dark:focus:bg-zinc-900 font-medium"
              />
            </div>

            {/* RUC / DNI */}
            <div className="lg:col-span-3">
              <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1.5">
                {docType === 'FACTURA' ? 'R.U.C. (11 dígitos) *' : 'D.N.I. / Celular'}
              </label>
              <div className="relative">
                <FileText size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={clientPhone}
                  onChange={(e) => setClientPhone(e.target.value)}
                  placeholder={docType === 'FACTURA' ? '20601234567' : '72345678 / 987654321'}
                  className="w-full bg-slate-50 dark:bg-zinc-800/80 border border-slate-200/80 dark:border-zinc-700 rounded-xl pl-8 pr-3 py-2 text-xs sm:text-sm text-slate-900 dark:text-white outline-none focus:border-blue-600 font-mono"
                />
              </div>
            </div>

            {/* Vendedor Asignado */}
            <div className="lg:col-span-3">
              <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1.5">
                Vendedor Asignado
              </label>
              <select
                value={sellerName}
                onChange={(e) => setSellerName(e.target.value)}
                className="w-full bg-slate-50 dark:bg-zinc-800/80 border border-slate-200/80 dark:border-zinc-700 rounded-xl px-3 py-2 text-xs sm:text-sm text-slate-900 dark:text-white outline-none focus:border-blue-600 font-medium cursor-pointer"
              >
                {sellerOptions.map((s, idx) => (
                  <option key={idx} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>

            {/* O.C. / Referencia */}
            <div className="lg:col-span-2">
              <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1.5">
                O.C. / Referencia
              </label>
              <input
                type="text"
                value={purchaseOrder}
                onChange={(e) => setPurchaseOrder(e.target.value)}
                placeholder="Ej. OC-1029"
                className="w-full bg-slate-50 dark:bg-zinc-800/80 border border-slate-200/80 dark:border-zinc-700 rounded-xl px-3 py-2 text-xs sm:text-sm text-slate-900 dark:text-white outline-none focus:border-blue-600 font-mono uppercase"
              />
            </div>

          </div>
        </div>

        {/* ═════════════════════════════════════════════════════════
            2. PRODUCTS TABLE (CLEAN, SPACIOUS ROWS, INTERNAL SCROLL)
           ═════════════════════════════════════════════════════════ */}
        <div className="bg-white dark:bg-[#141417] rounded-2xl border border-slate-200/80 dark:border-zinc-800 overflow-hidden shadow-xs">
          <div className="py-2.5 px-4 bg-slate-50/80 dark:bg-zinc-800/60 border-b border-slate-200/80 dark:border-zinc-800 flex items-center justify-between text-xs sm:text-sm">
            <div className="flex items-center gap-2">
              <Package size={15} className="text-blue-600" />
              <span className="font-bold text-slate-800 dark:text-zinc-200">
                Artículos Facturados
              </span>
              <span className="text-xs text-slate-400 font-mono">({items.length} ítems)</span>
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

          <div className="max-h-[200px] overflow-y-auto">
            <table className="w-full text-left border-collapse text-xs sm:text-sm">
              <thead className="sticky top-0 z-10 bg-white dark:bg-[#141417] border-b border-slate-200 dark:border-zinc-800 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                <tr>
                  <th className="py-2.5 px-3.5 w-10 text-center">#</th>
                  <th className="py-2.5 px-3 min-w-[320px]">Producto / Descripción</th>
                  <th className="py-2.5 px-3 w-36 text-center">Stock</th>
                  <th className="py-2.5 px-3 w-32 text-center">Cant.</th>
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
                          className="w-full bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-xs sm:text-sm text-slate-900 dark:text-white font-medium outline-none focus:border-blue-600"
                        >
                          <option value="">Selecciona un producto del catálogo…</option>
                          {products.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.sku ? `[${p.sku}] ` : ''}{p.name} — {fmt(p.sale_price)} (Stock: {p.stock})
                            </option>
                          ))}
                        </select>
                      </td>

                      {/* Stock badge */}
                      <td className="py-2.5 px-3 text-center whitespace-nowrap">
                        {prod ? (
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${
                              isOverStock
                                ? 'bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300'
                                : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                            }`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${isOverStock ? 'bg-red-500' : 'bg-emerald-500'}`} />
                            <span>{prod.stock} {prod.unit || 'uds.'}</span>
                          </span>
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                      </td>

                      {/* Cantidad Stepper */}
                      <td className="py-2.5 px-3">
                        <div className="flex items-center justify-center border border-slate-200 dark:border-zinc-700 rounded-xl bg-slate-50 dark:bg-zinc-800 overflow-hidden w-28 mx-auto">
                          <button
                            type="button"
                            onClick={() => updateItem(idx, { quantity: Math.max(1, Number(it.quantity || 1) - 1) })}
                            className="px-2 py-1.5 text-slate-400 hover:text-slate-900 dark:hover:text-white"
                          >
                            <Minus size={12} />
                          </button>
                          <input
                            type="number"
                            min="1"
                            value={it.quantity}
                            onChange={(e) => updateItem(idx, { quantity: e.target.value })}
                            required
                            className="w-12 bg-transparent text-center font-mono font-bold text-xs sm:text-sm text-slate-900 dark:text-white outline-none"
                          />
                          <button
                            type="button"
                            onClick={() => updateItem(idx, { quantity: Number(it.quantity || 1) + 1 })}
                            className="px-2 py-1.5 text-slate-400 hover:text-slate-900 dark:hover:text-white"
                          >
                            <Plus size={12} />
                          </button>
                        </div>
                      </td>

                      {/* Unit Price */}
                      <td className="py-2.5 px-3 text-right">
                        <div className="relative inline-block w-32">
                          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 font-mono text-xs">
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
                            className="w-full bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-xl pl-7 pr-2.5 py-1.5 text-right font-mono font-bold text-xs sm:text-sm text-slate-900 dark:text-white outline-none focus:border-blue-600"
                          />
                        </div>
                      </td>

                      {/* Subtotal */}
                      <td className="py-2.5 px-3 text-right font-mono font-black text-slate-900 dark:text-white text-xs sm:text-sm">
                        {fmt(lineTotal)}
                      </td>

                      {/* Delete */}
                      <td className="py-2.5 px-3 text-center">
                        <button
                          type="button"
                          onClick={() => removeItemRow(idx)}
                          disabled={items.length <= 1}
                          className="p-1.5 text-slate-300 hover:text-red-600 disabled:opacity-20 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                          title="Quitar"
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
            3. BALANCED BOTTOM SECTION (PAYMENT ON LEFT | TOTALS ON RIGHT)
           ═════════════════════════════════════════════════════════ */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 items-stretch">

          {/* LEFT: CONDICIÓN & MÉTODO DE PAGO (COL 7) */}
          <div className="lg:col-span-7 bg-white dark:bg-[#141417] rounded-2xl border border-slate-200/80 dark:border-zinc-800 p-4 sm:p-4.5 shadow-xs flex flex-col justify-between space-y-3.5">
            <div className="space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-zinc-800">
                <span className="text-xs sm:text-sm font-bold text-slate-800 dark:text-zinc-200 flex items-center gap-1.5">
                  <Clock size={14} className="text-blue-600" />
                  Forma & Condición de Pago
                </span>

                {/* Contado / Crédito switch */}
                <div className="inline-flex items-center p-0.5 bg-slate-100 dark:bg-zinc-800 rounded-lg text-xs font-bold">
                  <button
                    type="button"
                    onClick={() => setPaymentStatus('pagado')}
                    className={`px-3 py-1 rounded-md transition-all cursor-pointer ${
                      paymentStatus === 'pagado'
                        ? 'bg-white dark:bg-zinc-900 text-emerald-600 dark:text-emerald-400 shadow-xs'
                        : 'text-slate-500'
                    }`}
                  >
                    Al Contado
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentStatus('pendiente')}
                    className={`px-3 py-1 rounded-md transition-all cursor-pointer ${
                      paymentStatus === 'pendiente'
                        ? 'bg-amber-500 text-white shadow-xs'
                        : 'text-slate-500'
                    }`}
                  >
                    A Crédito
                  </button>
                </div>
              </div>

              {/* Payment Methods (5 compact horizontal pills) */}
              {paymentStatus === 'pagado' ? (
                <div className="space-y-2.5">
                  <div className="grid grid-cols-5 gap-2">
                    {/* Efectivo */}
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('efectivo')}
                      className={`p-2 rounded-xl border text-center transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                        paymentMethod === 'efectivo'
                          ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500 text-emerald-700 dark:text-emerald-300 font-bold shadow-xs'
                          : 'bg-slate-50 dark:bg-zinc-800 border-slate-200/80 dark:border-zinc-700 text-slate-600 dark:text-zinc-400 hover:bg-slate-100'
                      }`}
                    >
                      <Banknote size={15} />
                      <span className="text-xs font-semibold">Efectivo</span>
                    </button>

                    {/* Yape */}
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('yape')}
                      className={`p-2 rounded-xl border text-center transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                        paymentMethod === 'yape'
                          ? 'bg-[#742284] border-[#742284] text-white font-bold shadow-xs'
                          : 'bg-slate-50 dark:bg-zinc-800 border-slate-200/80 dark:border-zinc-700 text-slate-700 dark:text-zinc-300 hover:bg-purple-50'
                      }`}
                    >
                      <img src="/yape-logo.png" alt="Yape" className="w-4 h-4 rounded-md object-cover" />
                      <span className="text-xs font-black">Yape</span>
                    </button>

                    {/* Plin */}
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('plin')}
                      className={`p-2 rounded-xl border text-center transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                        paymentMethod === 'plin'
                          ? 'bg-[#00b49f] border-[#00b49f] text-white font-bold shadow-xs'
                          : 'bg-slate-50 dark:bg-zinc-800 border-slate-200/80 dark:border-zinc-700 text-slate-700 dark:text-zinc-300 hover:bg-teal-50'
                      }`}
                    >
                      <img src="/plin-logo.png" alt="Plin" className="w-4 h-4 rounded-full object-cover" />
                      <span className="text-xs font-black">Plin</span>
                    </button>

                    {/* Transferencia */}
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('transferencia')}
                      className={`p-2 rounded-xl border text-center transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                        paymentMethod === 'transferencia'
                          ? 'bg-blue-600 border-blue-600 text-white font-bold shadow-xs'
                          : 'bg-slate-50 dark:bg-zinc-800 border-slate-200/80 dark:border-zinc-700 text-slate-600 dark:text-zinc-400 hover:bg-slate-100'
                      }`}
                    >
                      <Building2 size={14} />
                      <span className="text-xs font-semibold">Transf.</span>
                    </button>

                    {/* Tarjeta */}
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('tarjeta')}
                      className={`p-2 rounded-xl border text-center transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                        paymentMethod === 'tarjeta'
                          ? 'bg-indigo-600 border-indigo-600 text-white font-bold shadow-xs'
                          : 'bg-slate-50 dark:bg-zinc-800 border-slate-200/80 dark:border-zinc-700 text-slate-600 dark:text-zinc-400 hover:bg-slate-100'
                      }`}
                    >
                      <CreditCard size={14} />
                      <span className="text-xs font-semibold">POS</span>
                    </button>
                  </div>

                  {/* Compact payment interactive feedback row */}
                  {paymentMethod === 'efectivo' && (
                    <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-zinc-800/60 border border-slate-200/80 dark:border-zinc-700 flex items-center justify-between text-xs sm:text-sm">
                      <div className="flex items-center gap-2.5">
                        <span className="text-slate-500 font-medium">Monto recibido:</span>
                        <div className="relative w-28">
                          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 font-mono text-xs">S/</span>
                          <input
                            type="number"
                            step="0.50"
                            value={cashReceived}
                            onChange={(e) => setCashReceived(e.target.value)}
                            placeholder={total > 0 ? total.toFixed(2) : '0.00'}
                            className="w-full bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-lg pl-6 pr-2 py-1 text-xs sm:text-sm font-mono font-bold text-slate-900 dark:text-white outline-none focus:border-blue-600"
                          />
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-slate-500 font-medium">Vuelto:</span>
                        <span
                          className={`font-mono font-black text-xs sm:text-sm ${
                            Number(cashReceived) >= total ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'
                          }`}
                        >
                          {Number(cashReceived) >= total ? fmt(Number(cashReceived) - total) : 'S/ 0.00'}
                        </span>
                      </div>
                    </div>
                  )}

                  {(paymentMethod === 'yape' || paymentMethod === 'plin') && (
                    <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-zinc-800/60 border border-slate-200/80 dark:border-zinc-700 flex items-center justify-between text-xs sm:text-sm">
                      <span className="text-slate-700 dark:text-zinc-200 font-medium">
                        {paymentMethod === 'yape' ? 'Pago móvil con Yape' : 'Pago móvil con Plin'}
                      </span>
                      {paymentConfig?.[paymentMethod]?.qr_image && (
                        <button
                          type="button"
                          onClick={() => setShowQrModal(true)}
                          className="px-3 py-1.5 rounded-lg bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold text-xs flex items-center gap-1.5 cursor-pointer"
                        >
                          <QrCode size={13} />
                          <span>Ver QR</span>
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-2 p-2.5 rounded-xl bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200/80 text-xs sm:text-sm">
                  <span className="text-amber-800 dark:text-amber-300 font-semibold">Vencimiento:</span>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="bg-white dark:bg-zinc-900 border border-amber-300 rounded-lg px-2.5 py-1 text-xs font-mono outline-none"
                  />
                </div>
              )}
            </div>

            {/* Notes in 1 slim input */}
            <div className="pt-1.5 border-t border-slate-100 dark:border-zinc-800">
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Observaciones / Instrucciones de entrega (opcional)…"
                className="w-full bg-slate-50 dark:bg-zinc-800/80 border border-slate-200/80 dark:border-zinc-700 rounded-xl px-3 py-1.5 text-xs sm:text-sm text-slate-800 dark:text-white outline-none focus:border-blue-600"
              />
            </div>
          </div>

          {/* RIGHT: RESUMEN FINANCIERO & EMISIÓN (COL 5) */}
          <div className="lg:col-span-5 bg-white dark:bg-[#141417] rounded-2xl border border-slate-200/80 dark:border-zinc-800 p-4 sm:p-4.5 shadow-xs flex flex-col justify-between space-y-3.5">
            <div>
              <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-zinc-800 text-xs sm:text-sm">
                <span className="font-bold text-slate-800 dark:text-zinc-200 flex items-center gap-1.5">
                  <DollarSign size={15} className="text-blue-600" />
                  Liquidación de Venta
                </span>
                <span className="font-mono text-xs text-slate-400">PEN (S/)</span>
              </div>

              <div className="space-y-2 pt-2.5 text-xs sm:text-sm">
                <div className="flex justify-between items-center text-slate-500">
                  <span>Subtotal / Op. Gravada:</span>
                  <span className="font-mono font-bold text-slate-800 dark:text-white">{fmt(netAmount)}</span>
                </div>
                <div className="flex justify-between items-center text-slate-500">
                  <span>I.G.V. (18% Incluido):</span>
                  <span className="font-mono font-semibold">{fmt(igvAmount)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Descuento Global (S/):</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={discount}
                    onChange={(e) => setDiscount(e.target.value)}
                    placeholder="0.00"
                    className="w-24 bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-lg px-2 py-1 text-right font-mono font-bold text-xs sm:text-sm text-amber-600 outline-none focus:border-blue-600"
                  />
                </div>

                <div className="pt-2.5 border-t border-slate-200 dark:border-zinc-800 flex justify-between items-baseline">
                  <span className="font-black text-xs uppercase text-slate-700 dark:text-zinc-300 tracking-wider">
                    TOTAL A PAGAR:
                  </span>
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

            {/* Action Buttons */}
            <div className="space-y-2 pt-1.5 border-t border-slate-100 dark:border-zinc-800">
              <button
                type="submit"
                disabled={isProcessing}
                onClick={handleSubmit}
                className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-98 text-white font-bold text-xs sm:text-sm shadow-md shadow-blue-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
              >
                {isProcessing ? (
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
                className="w-full py-2 rounded-xl border border-slate-200 dark:border-zinc-700 text-slate-500 hover:text-slate-800 dark:hover:text-white text-xs font-semibold transition-colors cursor-pointer"
              >
                Cancelar y Volver
              </button>
            </div>
          </div>

        </div>

        {/* ═════════════════════════════════════════════════════════
            OVERLAY: SLEEK EMISSION ANIMATION SCREEN
           ═════════════════════════════════════════════════════════ */}
        {isProcessing && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4 animate-fade-in">
            <div className="bg-white dark:bg-[#18181b] rounded-2xl border border-slate-200 dark:border-zinc-700 p-6 max-w-sm w-full text-center shadow-2xl space-y-4 animate-slide-up">
              <div className="w-14 h-14 rounded-full border-3 border-blue-600 border-t-transparent animate-spin mx-auto flex items-center justify-center">
                <ShoppingCart size={22} className="text-blue-600 animate-pulse" />
              </div>

              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-white">
                  Emitiendo Comprobante Electrónico
                </h3>
                <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">
                  {processingStep === 1 && 'Validando stock en tiempo real…'}
                  {processingStep === 2 && 'Generando serie y registrando venta en base de datos…'}
                  {processingStep === 3 && '¡Comprobante emitido con éxito! Cargando boleta…'}
                </p>
              </div>

              <div className="w-full bg-slate-100 dark:bg-zinc-800 h-1.5 rounded-full overflow-hidden">
                <div
                  className="bg-blue-600 h-full transition-all duration-300"
                  style={{
                    width:
                      processingStep === 1 ? '35%' : processingStep === 2 ? '75%' : '100%'
                  }}
                />
              </div>
            </div>
          </div>
        )}

        {/* ═════════════════════════════════════════════════════════
            MODAL: BOLETA / FACTURA EMITIDA (CENTERED DIALOG OVERLAY)
           ═════════════════════════════════════════════════════════ */}
        {createdSale && (
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
                      ¡Comprobante Emitido con Éxito!
                    </h3>
                    <p className="text-[11px] text-slate-500 dark:text-zinc-400 font-mono">
                      {createdSale.serie || serie || 'B001'}-{String(createdSale.id).slice(-6).toUpperCase()}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setCreatedSale(null)
                    navigate('/ventas', { state: { created: true, clientName } })
                  }}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors"
                  title="Cerrar"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Ticket Body (Scrollable in the middle) */}
              <div className="overflow-y-auto p-4 flex-1">
                <ReceiptModal
                  sale={createdSale}
                  client={createdSale.client || clients.find((c) => c.name === createdSale.client_name)}
                  products={products}
                  company={company}
                />
              </div>

              {/* Footer Actions: Ir a Ventas o Emitir Otra Venta */}
              <div className="p-3.5 bg-slate-50 dark:bg-zinc-800/60 border-t border-slate-100 dark:border-zinc-800 flex items-center justify-between gap-2.5 text-xs">
                <button
                  type="button"
                  onClick={() => {
                    setCreatedSale(null)
                    navigate('/ventas', { state: { created: true, clientName } })
                  }}
                  className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-slate-700 dark:text-zinc-200 font-semibold hover:bg-slate-100 dark:hover:bg-zinc-700 transition-colors cursor-pointer"
                >
                  Ir a Lista de Ventas
                </button>

                <button
                  type="button"
                  onClick={handleResetForm}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                >
                  <Plus size={14} strokeWidth={2.5} />
                  <span>Emitir Otra Venta</span>
                </button>
              </div>
            </div>
          </div>
        )}

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
