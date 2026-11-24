import { useState, useEffect, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeft, Plus, Trash2, ShoppingCart, User, Phone,
  Calendar, Clock, Package, Check, AlertCircle, FileText,
  Building2, DollarSign, ShieldCheck, QrCode, CreditCard,
  Banknote, ChevronDown, Minus, Search, X, Zap, CornerDownLeft,
  Barcode, CheckCircle2, Info, ScanBarcode
} from 'lucide-react'
import AppLayout from '../components/layout/AppLayout'
import PaymentQrModal from '../components/PaymentQrModal'
import ReceiptModal from '../components/Receipt'
import BarcodeScannerModal from '../components/ui/BarcodeScannerModal'
import { useFormLeaveGuard } from '../hooks/useFormLeaveGuard'
import { useBarcodeGun } from '../hooks/useBarcodeGun'
import { playScanSuccess, playScanError } from '../utils/audioFeedback'
import { salesService } from '../services/salesService'
import { productsService } from '../services/productsService'
import { clientsService } from '../services/clientsService'
import { usersService } from '../services/usersService'
import { companySettingsService } from '../services/companySettingsService'
import { paymentMethodsService } from '../services/paymentMethodsService'
import { useAuth } from '../context/AuthContext'
import { getDisplayUserName } from '../lib/userDisplay'
import { numberToWordsPE } from '../utils/numberToWords'

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

  // Customer Data (Separated cleanly for senior enterprise ERP)
  const [clientName, setClientName] = useState('')
  const [clientDoc, setClientDoc] = useState('')
  const [clientContactPhone, setClientContactPhone] = useState('')
  const [selectedClientId, setSelectedClientId] = useState('')
  const [mobileClientExpanded, setMobileClientExpanded] = useState(false)

  // Line items
  const [items, setItems] = useState([
    { product_id: '', quantity: 1, unit_price: '' }
  ])

  // Mobile Bottom Sheet Picker states
  const [pickerOpen, setPickerOpen] = useState(false)
  const [pickerItemIdx, setPickerItemIdx] = useState(null)
  const [pickerSearch, setPickerSearch] = useState('')

  const [clientPickerOpen, setClientPickerOpen] = useState(false)
  const [clientPickerSearch, setClientPickerSearch] = useState('')

  const [sellerPickerOpen, setSellerPickerOpen] = useState(false)

  // ─── Barcode Scanner States ───
  const [scannerOpen, setScannerOpen] = useState(false)
  const [scanToast, setScanToast] = useState('')

  const handleBarcodeScanned = useCallback((scannedCode) => {
    const raw = (scannedCode || '').trim()
    if (!raw) return
    const clean = raw.toLowerCase()

    const found = products.find(
      (p) =>
        (p.sku && p.sku.toLowerCase() === clean) ||
        (p.barcode && p.barcode.toLowerCase() === clean) ||
        (p.id && p.id.toLowerCase() === clean)
    )

    if (found) {
      playScanSuccess()
      setItems((prevItems) => {
        const existingIdx = prevItems.findIndex((it) => it.product_id === found.id)
        if (existingIdx !== -1) {
          return prevItems.map((it, idx) =>
            idx === existingIdx
              ? { ...it, quantity: (Number(it.quantity) || 0) + 1 }
              : it
          )
        }
        if (prevItems.length === 1 && !prevItems[0].product_id) {
          return [{
            product_id: found.id,
            quantity: 1,
            unit_price: found.sale_price !== undefined ? found.sale_price : ''
          }]
        }
        return [
          ...prevItems,
          {
            product_id: found.id,
            quantity: 1,
            unit_price: found.sale_price !== undefined ? found.sale_price : ''
          }
        ]
      })
      setScanToast(`✓ Agregado: ${found.name} (${found.sku}) · S/ ${(Number(found.sale_price) || 0).toFixed(2)}`)
    } else {
      playScanError()
      setScanToast(`⚠️ Código "${raw}" no encontrado en el catálogo de productos`)
    }
    setTimeout(() => setScanToast(''), 4500)
  }, [products])

  // Soporte directo para pistolas lectoras de código de barras USB / Bluetooth
  useBarcodeGun(handleBarcodeScanned)

  // Payment & Terms
  const [paymentStatus, setPaymentStatus] = useState('pagado') // 'pagado' | 'pendiente'
  const [paymentMethod, setPaymentMethod] = useState('efectivo') // 'efectivo' | 'yape' | 'plin' | 'transferencia' | 'tarjeta'
  const [paymentConfig, setPaymentConfig] = useState(null)
  const [showQrModal, setShowQrModal] = useState(false)
  const [cashReceived, setCashReceived] = useState('')

  const [dueDate, setDueDate] = useState('')
  const [notes, setNotes] = useState('')
  const [discount, setDiscount] = useState('')

  // Processing Animation & Modal States
  const [isProcessing, setIsProcessing] = useState(false)
  const [processingStep, setProcessingStep] = useState(0) // 0: idle, 1: stock check, 2: creating, 3: completed
  const [createdSale, setCreatedSale] = useState(null)
  const [error, setError] = useState('')

  // Detección de cambios sin guardar en el formulario de venta
  const isDirty = useMemo(() => {
    if (isProcessing || createdSale) return false
    const hasClient = Boolean(clientName.trim() || clientDoc.trim() || clientContactPhone.trim() || selectedClientId)
    const hasItems = items.some(
      (it) => it.product_id || (it.unit_price !== '' && Number(it.unit_price) > 0) || Number(it.quantity) > 1
    )
    const hasExtra = Boolean(purchaseOrder.trim() || cashReceived.trim() || notes.trim() || discount)
    return hasClient || hasItems || hasExtra
  }, [isProcessing, createdSale, clientName, clientDoc, clientContactPhone, selectedClientId, items, purchaseOrder, cashReceived, notes, discount])

  const { requestLeave, DiscardModalComponent } = useFormLeaveGuard({
    isDirty,
    defaultRedirectUrl: '/ventas',
    modalTitle: '¿Descartar emisión de comprobante?',
    modalDescription: 'Tienes datos de cliente o productos agregados a este comprobante. Si sales ahora, la información ingresada se perderá.'
  })

  // Sync serie and labels with docType
  const handleDocTypeChange = (type) => {
    setDocType(type)
    if (type === 'FACTURA') {
      setSerie('F001')
      setMobileClientExpanded(true)
      if (clientName === 'CLIENTE GENERAL' || clientName === 'Cliente General') {
        setClientName('')
        setClientDoc('')
      }
    } else if (type === 'BOLETA') {
      setSerie('B001')
    } else {
      setSerie('NV01')
    }
  }

  // Quick Customer Autofill (Consumidor Final / Cliente General)
  const handleQuickClient = () => {
    if (docType === 'FACTURA') {
      setClientName('INVERSIONES & SERVICIOS S.A.C.')
      setClientDoc('20608912345')
      setClientContactPhone('')
    } else {
      setClientName('CLIENTE GENERAL')
      setClientDoc('00000000')
      setClientContactPhone('')
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

  // Auto-fill when selecting an existing client
  const handleClientSelect = (clientId) => {
    setSelectedClientId(clientId)
    if (!clientId) return
    const found = clients.find((c) => c.id === clientId)
    if (found) {
      setClientName(found.name || '')
      setClientDoc(found.ruc || found.dni || '')
      setClientContactPhone(found.phone || '')
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
  const addItemRow = useCallback(() => {
    setItems((prev) => [...prev, { product_id: '', quantity: 1, unit_price: '' }])
  }, [])

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

  // Filtered products for mobile bottom sheet picker
  const filteredPickerProducts = useMemo(() => {
    if (!pickerSearch.trim()) return products
    const q = pickerSearch.toLowerCase().trim()
    return products.filter((p) => {
      const name = (p.name || '').toLowerCase()
      const sku = (p.sku || '').toLowerCase()
      const cat = (p.category || '').toLowerCase()
      return name.includes(q) || sku.includes(q) || cat.includes(q)
    })
  }, [products, pickerSearch])

  // Filtered clients for mobile bottom sheet picker
  const filteredPickerClients = useMemo(() => {
    if (!clientPickerSearch.trim()) return clients
    const q = clientPickerSearch.toLowerCase().trim()
    return clients.filter((c) => {
      const name = (c.name || '').toLowerCase()
      const doc = (c.ruc || c.phone || '').toLowerCase()
      return name.includes(q) || doc.includes(q)
    })
  }, [clients, clientPickerSearch])

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

  const totalUnits = useMemo(() => {
    return items.reduce((acc, it) => acc + (Number(it.quantity) || 0), 0)
  }, [items])

  // Submit sale creation with visual animation and instant boleta modal
  const handleSubmit = useCallback(async (e) => {
    if (e && e.preventDefault) e.preventDefault()
    setError('')

    if (!clientName.trim()) {
      setError(
        docType === 'FACTURA'
          ? 'Por favor ingresa la Razón Social de la empresa'
          : 'Por favor ingresa el nombre del cliente o presiona "Consumidor Final"'
      )
      return
    }

    if (docType === 'FACTURA') {
      const cleanDoc = clientDoc.trim().replace(/\D/g, '')
      if (cleanDoc.length !== 11) {
        setError('Para emitir una Factura Electrónica es obligatorio ingresar un R.U.C. válido de 11 dígitos')
        return
      }
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
          `Stock insuficiente para "${prod.name}". Stock actual en almacén: ${prod.stock} ${
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

      // Format clientPhone cleanly so parseClientInfo in Receipt extracts document & phone cleanly
      const docLabel = docType === 'FACTURA' ? 'RUC: ' : 'DNI: '
      const composedPhone = [
        clientDoc.trim() ? `${docLabel}${clientDoc.trim()}` : '',
        clientContactPhone.trim() ? `Tel: ${clientContactPhone.trim()}` : ''
      ].filter(Boolean).join(' - ')

      const created = await salesService.create({
        client_name: clientName.trim(),
        client_phone: composedPhone || undefined,
        user_id: user?.id,
        status: paymentStatus,
        receipt_type: docType.toLowerCase(),
        items: saleItems,
        discount: discountVal,
        due_date: paymentStatus === 'pendiente' ? dueDate || null : null,
        notes: finalNotes || null,
        serie: serie || (docType === 'FACTURA' ? 'F001' : docType === 'BOLETA' ? 'B001' : 'NV01'),
        order_type: orderType || 'COMPRA VENTA',
        seller_name: sellerName || getDisplayUserName(user, 'Administrador')
      })

      setProcessingStep(3)
      await new Promise((r) => setTimeout(r, 550))

      setIsProcessing(false)
      setCreatedSale({
        ...created,
        items: created?.items?.length ? created.items : saleItems,
        serie: serie || (docType === 'FACTURA' ? 'F001' : docType === 'BOLETA' ? 'B001' : 'NV01'),
        client:
          created?.client ||
          clients.find((c) => c.name === clientName.trim()) || {
            name: clientName.trim(),
            ruc: clientDoc.trim() || undefined,
            phone: clientContactPhone.trim() || undefined
          }
      })
    } catch (err) {
      setIsProcessing(false)
      setError(err.message || 'No se pudo registrar la venta')
    }
  }, [
    clientName, clientDoc, clientContactPhone, docType, items, products, paymentStatus,
    paymentMethod, sellerName, user, purchaseOrder, notes, serie, orderType, dueDate,
    discountVal, clients
  ])

  // Global Keyboard Shortcuts (F2: Emitir, F3: Agregar Fila, Alt+C: Consumidor Final)
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Don't trigger if inside modals
      if (isProcessing || createdSale || showQrModal || pickerOpen || clientPickerOpen || sellerPickerOpen) {
        return
      }

      if (e.key === 'F2') {
        e.preventDefault()
        handleSubmit()
      } else if (e.key === 'F3') {
        e.preventDefault()
        addItemRow()
      } else if (e.key === 'F4') {
        e.preventDefault()
        setScannerOpen(true)
      } else if (e.altKey && (e.key === 'c' || e.key === 'C')) {
        e.preventDefault()
        handleQuickClient()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleSubmit, addItemRow, isProcessing, createdSale, showQrModal, pickerOpen, clientPickerOpen, sellerPickerOpen])

  const handleResetForm = () => {
    setCreatedSale(null)
    setClientName('')
    setClientDoc('')
    setClientContactPhone('')
    setSelectedClientId('')
    setItems([{ product_id: '', quantity: 1, unit_price: '' }])
    setPaymentStatus('pagado')
    setPaymentMethod('efectivo')
    setCashReceived('')
    setNotes('')
    setDiscount('')
    setPurchaseOrder('')
    setError('')
    setProcessingStep(0)
    setIsProcessing(false)
  }

  // Quick cash bill helper
  const handleQuickCash = (amount) => {
    setCashReceived(String(amount))
  }

  return (
    <AppLayout title="Nueva Venta">
      <div className="max-w-[1440px] mx-auto space-y-3 pb-28 lg:pb-6 animate-fade-in">

        {/* ═════════════════════════════════════════════════════════
            0. INSTITUTIONAL HEADER BAR
           ═════════════════════════════════════════════════════════ */}
        <div className="bg-white dark:bg-[#141417] rounded-xl border border-slate-200/90 dark:border-zinc-800/90 p-3 sm:p-4.5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-3.5">
          {/* Left: Back button & Breadcrumbs & Title */}
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <button
              type="button"
              onClick={() => requestLeave('/ventas')}
              className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-slate-50 hover:bg-slate-100 dark:bg-zinc-800/80 dark:hover:bg-zinc-700/80 border border-slate-200 dark:border-zinc-700 flex items-center justify-center text-slate-700 dark:text-zinc-200 transition-all cursor-pointer shrink-0 active:scale-95"
              title="Volver a Ventas (Esc)"
            >
              <ArrowLeft size={16} strokeWidth={2.5} />
            </button>

            <div className="min-w-0">
              <div className="hidden sm:flex items-center gap-1.5 text-[10px] sm:text-[11px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider truncate">
                <span className="hover:underline cursor-pointer" onClick={() => requestLeave('/ventas')}>
                  MÓDULO COMERCIAL
                </span>
                <span>/</span>
                <span className="text-slate-600 dark:text-zinc-400">
                  FACTURACIÓN ELECTRÓNICA
                </span>
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <h1 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white tracking-tight leading-tight truncate">
                  Punto de Venta (POS)
                </h1>
                <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-mono font-semibold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 dark:bg-zinc-800 dark:text-zinc-300 border border-slate-200 dark:border-zinc-700">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  TERMINAL ACTIVO
                </span>
              </div>
            </div>
          </div>

          {/* Right: Document Type Segmented Control + Quick Fill */}
          <div className="flex items-center gap-2 sm:gap-2.5 flex-wrap sm:flex-nowrap">
            {/* Segmented Control */}
            <div className="inline-flex p-1 bg-slate-100 dark:bg-zinc-800/90 rounded-lg border border-slate-200/90 dark:border-zinc-700 text-xs font-semibold gap-1 w-full sm:w-auto justify-between sm:justify-start">
              <button
                type="button"
                onClick={() => handleDocTypeChange('BOLETA')}
                className={`flex-1 sm:flex-initial px-2.5 sm:px-3 py-1.5 rounded-md transition-all cursor-pointer flex items-center justify-center gap-1 sm:gap-1.5 ${
                  docType === 'BOLETA'
                    ? 'bg-[#1B4FD8] text-white shadow-xs font-bold'
                    : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <span>Boleta</span>
                <span className={`text-[10px] font-mono ${docType === 'BOLETA' ? 'opacity-85' : 'text-slate-400'}`}>B001</span>
              </button>

              <button
                type="button"
                onClick={() => handleDocTypeChange('FACTURA')}
                className={`flex-1 sm:flex-initial px-2.5 sm:px-3 py-1.5 rounded-md transition-all cursor-pointer flex items-center justify-center gap-1 sm:gap-1.5 ${
                  docType === 'FACTURA'
                    ? 'bg-[#1B4FD8] text-white shadow-xs font-bold'
                    : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <span>Factura</span>
                <span className={`text-[10px] font-mono ${docType === 'FACTURA' ? 'opacity-85' : 'text-slate-400'}`}>F001</span>
              </button>

              <button
                type="button"
                onClick={() => handleDocTypeChange('NOTA')}
                className={`flex-1 sm:flex-initial px-2.5 sm:px-3 py-1.5 rounded-md transition-all cursor-pointer flex items-center justify-center gap-1 sm:gap-1.5 ${
                  docType === 'NOTA'
                    ? 'bg-[#1B4FD8] text-white shadow-xs font-bold'
                    : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <span>Nota</span>
                <span className={`text-[10px] font-mono ${docType === 'NOTA' ? 'opacity-85' : 'text-slate-400'}`}>NV01</span>
              </button>
            </div>

            {/* Quick Consumer fill button */}
            <button
              type="button"
              onClick={handleQuickClient}
              className="px-2.5 sm:px-3 py-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 dark:bg-zinc-800 dark:hover:bg-zinc-700/80 border border-slate-200 dark:border-zinc-700 text-slate-700 dark:text-zinc-200 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs shrink-0 active:scale-95"
              title="Llenar cliente consumidor final rápido [Alt + C]"
            >
              <Zap size={13} className="text-amber-500 fill-amber-500" />
              <span>Consumidor Final</span>
              <kbd className="hidden lg:inline text-[9px] font-mono text-slate-400 bg-white dark:bg-zinc-900 px-1 py-0.2 rounded border border-slate-200 dark:border-zinc-700">Alt+C</kbd>
            </button>
          </div>
        </div>

        {/* ═════════════════════════════════════════════════════════
            1. RECEPTOR / CLIENT METADATA SECTION
           ═════════════════════════════════════════════════════════ */}
        <div className="bg-white dark:bg-[#141417] rounded-xl border border-slate-200/90 dark:border-zinc-800/90 p-3 sm:p-4 shadow-xs">
          {/* Mobile Collapsed State: 1-line smart client pill */}
          <div className="md:hidden">
            {!mobileClientExpanded ? (
              <div className="flex items-center justify-between gap-2">
                <div
                  onClick={() => setMobileClientExpanded(true)}
                  className="flex items-center gap-2.5 min-w-0 flex-1 cursor-pointer"
                >
                  <div className="w-8 h-8 rounded-full bg-blue-50 dark:bg-blue-950/40 text-[#1B4FD8] dark:text-blue-400 flex items-center justify-center shrink-0">
                    <User size={15} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                        {clientName || 'Consumidor Final'}
                      </span>
                      <span className="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded bg-slate-100 dark:bg-zinc-800 text-slate-500 shrink-0">
                        {serie}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-400 font-mono truncate">
                      {clientDoc ? `${docType}: ${clientDoc}` : 'Cliente General'}
                      {clientContactPhone ? ` · Tel: ${clientContactPhone}` : ''}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  {clients.length > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        setClientPickerSearch('')
                        setClientPickerOpen(true)
                      }}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 dark:hover:text-white bg-slate-100 dark:bg-zinc-800 text-xs font-semibold"
                      title="Buscar en padrón de clientes"
                    >
                      <Search size={14} />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setMobileClientExpanded(true)}
                    className="px-2.5 py-1 rounded-lg text-xs font-bold text-[#1B4FD8] dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40"
                  >
                    Editar
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-zinc-800">
                  <span className="text-xs font-bold text-slate-800 dark:text-zinc-200 uppercase tracking-wider text-[10px]">
                    Datos del Cliente / Adquiriente
                  </span>
                  <button
                    type="button"
                    onClick={() => setMobileClientExpanded(false)}
                    className="text-xs font-bold text-[#1B4FD8] dark:text-blue-400 px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-950/30"
                  >
                    Listo ✓
                  </button>
                </div>

                <div className="space-y-2.5 text-xs">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 dark:text-zinc-400 uppercase mb-1">
                      {docType === 'FACTURA' ? 'R.U.C. (11 DÍGITOS) *' : 'D.N.I. / DOC IDENTIDAD'}
                    </label>
                    <input
                      type="text"
                      maxLength={docType === 'FACTURA' ? 11 : 12}
                      value={clientDoc}
                      onChange={(e) => setClientDoc(e.target.value.replace(/\D/g, ''))}
                      placeholder={docType === 'FACTURA' ? '20601234567' : '72345678'}
                      className="w-full bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs font-mono text-slate-900 dark:text-white outline-none focus:border-[#1B4FD8]"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 dark:text-zinc-400 uppercase mb-1">
                      {docType === 'FACTURA' ? 'RAZÓN SOCIAL *' : 'NOMBRES Y APELLIDOS *'}
                    </label>
                    <input
                      type="text"
                      value={clientName}
                      onChange={(e) => {
                        setClientName(e.target.value)
                        setSelectedClientId('')
                      }}
                      placeholder={docType === 'FACTURA' ? 'Empresa S.A.C.' : 'Juan Pérez'}
                      required
                      className="w-full bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 dark:text-white font-medium outline-none focus:border-[#1B4FD8]"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 dark:text-zinc-400 uppercase mb-1">
                        TELÉFONO
                      </label>
                      <input
                        type="text"
                        maxLength={15}
                        value={clientContactPhone}
                        onChange={(e) => setClientContactPhone(e.target.value)}
                        placeholder="987654321"
                        className="w-full bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs font-mono text-slate-900 dark:text-white outline-none focus:border-[#1B4FD8]"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 dark:text-zinc-400 uppercase mb-1">
                        VENDEDOR
                      </label>
                      <button
                        type="button"
                        onClick={() => setSellerPickerOpen(true)}
                        className="w-full bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 dark:text-white flex items-center justify-between font-medium"
                      >
                        <span className="truncate">{sellerName || 'Vendedor'}</span>
                        <ChevronDown size={13} className="text-slate-400 shrink-0 ml-1" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Desktop Full Grid (>= md: unchanged) */}
          <div className="hidden md:block">
            <div className="flex items-center justify-between pb-2.5 mb-3 border-b border-slate-100 dark:border-zinc-800 text-xs">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider">
                  DATOS DEL ADQUIRIENTE / CLIENTE
                </span>
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400">
                  SERIE {serie}
                </span>
              </div>

              {clients.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setClientPickerSearch('')
                    setClientPickerOpen(true)
                  }}
                  className="text-xs font-semibold text-slate-700 dark:text-zinc-300 hover:text-slate-900 dark:hover:text-white flex items-center gap-1.5 cursor-pointer"
                >
                  <Search size={13} className="text-slate-400" />
                  <span>{selectedClientId ? 'Cambiar cliente registrado' : 'Buscar en directorio…'}</span>
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 text-xs sm:text-sm items-start">
              {/* Field 1: Document (DNI or RUC) */}
              <div className="lg:col-span-3">
                <label className="block text-[11px] font-bold text-slate-700 dark:text-zinc-300 uppercase tracking-wider mb-1">
                  {docType === 'FACTURA' ? 'R.U.C. (11 DÍGITOS) *' : 'D.N.I. / DOC IDENTIDAD'}
                </label>
                <div className="relative">
                  <FileText size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    maxLength={docType === 'FACTURA' ? 11 : 12}
                    value={clientDoc}
                    onChange={(e) => setClientDoc(e.target.value.replace(/\D/g, ''))}
                    placeholder={docType === 'FACTURA' ? '20601234567' : '72345678'}
                    className="w-full bg-slate-50/70 dark:bg-zinc-800/60 border border-slate-200 dark:border-zinc-700 rounded-lg pl-8 pr-2.5 py-1.5 text-xs sm:text-sm font-mono text-slate-900 dark:text-white outline-none focus:border-slate-900 dark:focus:border-white focus:bg-white dark:focus:bg-zinc-900 transition-colors"
                  />
                </div>
              </div>

              {/* Field 2: Name / Razón Social */}
              <div className="lg:col-span-4">
                <label className="block text-[11px] font-bold text-slate-700 dark:text-zinc-300 uppercase tracking-wider mb-1">
                  {docType === 'FACTURA' ? 'RAZÓN SOCIAL (EMPRESA) *' : 'NOMBRES Y APELLIDOS / RAZÓN *'}
                </label>
                <div className="relative">
                  <User size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
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
                        : 'Ej. JUAN PÉREZ / CLIENTE GENERAL'
                    }
                    required
                    className="w-full bg-slate-50/70 dark:bg-zinc-800/60 border border-slate-200 dark:border-zinc-700 rounded-lg pl-8 pr-2.5 py-1.5 text-xs sm:text-sm text-slate-900 dark:text-white font-medium outline-none focus:border-slate-900 dark:focus:border-white focus:bg-white dark:focus:bg-zinc-900 transition-colors"
                  />
                </div>
              </div>

              {/* Field 3: Teléfono / WhatsApp Contacto */}
              <div className="lg:col-span-2">
                <label className="block text-[11px] font-bold text-slate-700 dark:text-zinc-300 uppercase tracking-wider mb-1">
                  TELÉFONO / CELULAR
                </label>
                <div className="relative">
                  <Phone size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    maxLength={15}
                    value={clientContactPhone}
                    onChange={(e) => setClientContactPhone(e.target.value)}
                    placeholder="987654321"
                    className="w-full bg-slate-50/70 dark:bg-zinc-800/60 border border-slate-200 dark:border-zinc-700 rounded-lg pl-8 pr-2.5 py-1.5 text-xs sm:text-sm font-mono text-slate-900 dark:text-white outline-none focus:border-slate-900 dark:focus:border-white focus:bg-white dark:focus:bg-zinc-900 transition-colors"
                  />
                </div>
              </div>

              {/* Field 4: Vendedor Responsable */}
              <div className="lg:col-span-3">
                <label className="block text-[11px] font-bold text-slate-700 dark:text-zinc-300 uppercase tracking-wider mb-1">
                  VENDEDOR / CAJERO
                </label>
                <select
                  value={sellerName}
                  onChange={(e) => setSellerName(e.target.value)}
                  className="w-full bg-slate-50/70 dark:bg-zinc-800/60 border border-slate-200 dark:border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs sm:text-sm text-slate-900 dark:text-white outline-none focus:border-slate-900 dark:focus:border-white font-medium cursor-pointer"
                >
                  {sellerOptions.map((s, idx) => (
                    <option key={idx} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* ═════════════════════════════════════════════════════════
            2. PRODUCTS & ITEMS TABLE (HIGH-DENSITY POS GRID)
           ═════════════════════════════════════════════════════════ */}
        <div className="bg-white dark:bg-[#141417] rounded-xl border border-slate-200/90 dark:border-zinc-800/90 overflow-hidden shadow-xs">
          {/* Table Header Bar */}
          <div className="py-2.5 px-4 bg-slate-50/90 dark:bg-zinc-800/70 border-b border-slate-200/80 dark:border-zinc-800 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider">
                DETALLE DE MERCADERÍA FACTURADA
              </span>
              <span className="text-[11px] text-slate-500 dark:text-zinc-400 font-mono font-medium">
                ({items.length} {items.length === 1 ? 'línea' : 'líneas'} · {totalUnits} {totalUnits === 1 ? 'unidad' : 'unidades'})
              </span>
            </div>

            <div className="flex items-center gap-1.5 sm:gap-2">
              <button
                type="button"
                onClick={() => setScannerOpen(true)}
                className="px-2 sm:px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1 sm:gap-1.5 shadow-xs transition-all cursor-pointer active:scale-95"
                title="Escanear código de barras con cámara o pistola [F4]"
              >
                <ScanBarcode size={13} strokeWidth={2.5} />
                <span>Escanear<span className="hidden sm:inline"> Código</span></span>
                <kbd className="hidden sm:inline text-[9px] font-mono text-emerald-100 bg-emerald-800/60 px-1 py-0.2 rounded">F4</kbd>
              </button>

              <button
                type="button"
                onClick={addItemRow}
                className="px-2 sm:px-3 py-1.5 rounded-lg bg-[#1B4FD8] hover:bg-[#163FBF] text-white font-bold text-xs flex items-center gap-1 sm:gap-1.5 shadow-xs transition-all cursor-pointer active:scale-95"
                title="Agregar fila de producto [F3]"
              >
                <Plus size={13} strokeWidth={2.5} />
                <span>Agregar<span className="hidden sm:inline"> Producto</span></span>
                <kbd className="hidden sm:inline text-[9px] font-mono text-blue-100 bg-blue-800/60 px-1 py-0.2 rounded">F3</kbd>
              </button>
            </div>
          </div>

          {/* Desktop POS Table View (>= 768px) */}
          <div className="hidden md:block overflow-x-auto max-h-[300px]">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="sticky top-0 z-10 bg-white dark:bg-[#141417] border-b border-slate-200 dark:border-zinc-800 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                <tr>
                  <th className="py-2.5 px-3 w-10 text-center">#</th>
                  <th className="py-2.5 px-3 w-28">SKU / CÓDIGO</th>
                  <th className="py-2.5 px-3 min-w-[280px]">DESCRIPCIÓN DE MERCADERÍA</th>
                  <th className="py-2.5 px-3 w-32 text-center">STOCK ALMACÉN</th>
                  <th className="py-2.5 px-3 w-32 text-center">CANTIDAD</th>
                  <th className="py-2.5 px-3 w-36 text-right">P. UNITARIO</th>
                  <th className="py-2.5 px-3 w-32 text-right">SUBTOTAL</th>
                  <th className="py-2.5 px-3 w-10 text-center"></th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100 dark:divide-zinc-800/80">
                {items.map((it, idx) => {
                  const prod = products.find((p) => p.id === it.product_id)
                  const lineTotal = (Number(it.unit_price) || 0) * (Number(it.quantity) || 0)
                  const isOverStock = prod && Number(prod.stock) < Number(it.quantity || 1)

                  return (
                    <tr key={idx} className="hover:bg-slate-50/70 dark:hover:bg-zinc-800/40 transition-colors">
                      {/* # */}
                      <td className="py-2.5 px-3 text-center font-mono font-bold text-slate-400">
                        {idx + 1}
                      </td>

                      {/* SKU */}
                      <td className="py-2.5 px-3">
                        <span className="font-mono text-[11px] font-bold text-slate-500 dark:text-zinc-400 bg-slate-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded">
                          {prod?.sku || (prod ? `SKU-${String(prod.id).slice(-4).toUpperCase()}` : '—')}
                        </span>
                      </td>

                      {/* Product selector */}
                      <td className="py-2.5 px-3">
                        <select
                          value={it.product_id}
                          onChange={(e) => updateItem(idx, { product_id: e.target.value })}
                          required
                          className="w-full bg-slate-50/80 dark:bg-zinc-800/80 border border-slate-200 dark:border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 dark:text-white font-medium outline-none focus:border-slate-900 dark:focus:border-white transition-colors cursor-pointer"
                        >
                          <option value="">Selecciona un producto del catálogo…</option>
                          {products.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.sku ? `[${p.sku}] ` : ''}{p.name} — {fmt(p.sale_price)} ({p.stock} disp.)
                            </option>
                          ))}
                        </select>
                      </td>

                      {/* Stock badge */}
                      <td className="py-2.5 px-3 text-center whitespace-nowrap">
                        {prod ? (
                          <span
                            className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-semibold ${
                              isOverStock
                                ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border border-rose-200 dark:border-rose-900/50'
                                : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900/50'
                            }`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${isOverStock ? 'bg-rose-500' : 'bg-emerald-500'}`} />
                            <span className="font-mono">{prod.stock}</span> {prod.unit || 'uds.'}
                          </span>
                        ) : (
                          <span className="text-slate-300 dark:text-zinc-600">—</span>
                        )}
                      </td>

                      {/* Cantidad Stepper */}
                      <td className="py-2.5 px-3">
                        <div className="flex items-center justify-center border border-slate-200 dark:border-zinc-700 rounded-lg bg-slate-50 dark:bg-zinc-800 overflow-hidden w-26 mx-auto">
                          <button
                            type="button"
                            onClick={() => updateItem(idx, { quantity: Math.max(1, Number(it.quantity || 1) - 1) })}
                            className="w-7 h-7 flex items-center justify-center text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
                          >
                            <Minus size={12} />
                          </button>
                          <input
                            type="number"
                            min="1"
                            value={it.quantity}
                            onChange={(e) => updateItem(idx, { quantity: e.target.value })}
                            required
                            className="w-10 bg-transparent text-center font-mono font-bold text-xs text-slate-900 dark:text-white outline-none"
                          />
                          <button
                            type="button"
                            onClick={() => updateItem(idx, { quantity: Number(it.quantity || 1) + 1 })}
                            className="w-7 h-7 flex items-center justify-center text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
                          >
                            <Plus size={12} />
                          </button>
                        </div>
                      </td>

                      {/* Unit Price */}
                      <td className="py-2.5 px-3 text-right">
                        <div className="relative inline-block w-28">
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
                            className="w-full bg-slate-50/80 dark:bg-zinc-800/80 border border-slate-200 dark:border-zinc-700 rounded-lg pl-7 pr-2 py-1 text-right font-mono font-bold text-xs text-slate-900 dark:text-white outline-none focus:border-slate-900 dark:focus:border-white transition-colors"
                          />
                        </div>
                      </td>

                      {/* Subtotal */}
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900 dark:text-white text-xs">
                        {fmt(lineTotal)}
                      </td>

                      {/* Delete */}
                      <td className="py-2.5 px-3 text-center">
                        <button
                          type="button"
                          onClick={() => removeItemRow(idx)}
                          disabled={items.length <= 1}
                          className="p-1 text-slate-400 hover:text-rose-600 disabled:opacity-20 rounded-md hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer"
                          title="Quitar ítem"
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards View (< 768px) */}
          <div className="md:hidden divide-y divide-slate-100 dark:divide-zinc-800">
            {items.map((it, idx) => {
              const prod = products.find((p) => p.id === it.product_id)
              const lineTotal = (Number(it.unit_price) || 0) * (Number(it.quantity) || 0)
              const isOverStock = prod && Number(prod.stock) < Number(it.quantity || 1)

              return (
                <div key={idx} className="p-3 bg-white dark:bg-[#141417] space-y-2.5">
                  {/* Row 1: Index, Product Name Selector, Trash */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2 min-w-0 flex-1">
                      <span className="w-5 h-5 rounded bg-slate-100 dark:bg-zinc-800 text-slate-500 dark:text-zinc-400 font-mono text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                        #{idx + 1}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setPickerItemIdx(idx)
                          setPickerSearch('')
                          setPickerOpen(true)
                        }}
                        className="text-left w-full group cursor-pointer"
                      >
                        {prod ? (
                          <div className="min-w-0">
                            <span className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white block truncate group-hover:text-[#1B4FD8]">
                              {prod.name}
                            </span>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              {prod.sku && (
                                <span className="text-[9.5px] font-mono font-semibold px-1 py-0.2 bg-slate-100 dark:bg-zinc-800 text-slate-500 rounded">
                                  {prod.sku}
                                </span>
                              )}
                              <span
                                className={`inline-flex items-center gap-1 text-[10px] font-mono font-bold ${
                                  isOverStock
                                    ? 'text-rose-600 dark:text-rose-400'
                                    : 'text-emerald-600 dark:text-emerald-400'
                                }`}
                              >
                                ● {prod.stock} {prod.unit || 'uds.'}
                              </span>
                            </div>
                          </div>
                        ) : (
                          <div className="py-1 px-2.5 rounded-lg border border-dashed border-blue-300 dark:border-blue-900/50 bg-blue-50/50 dark:bg-blue-950/20 text-[#1B4FD8] dark:text-blue-400 text-xs font-semibold flex items-center justify-between">
                            <span>+ Seleccionar producto del catálogo…</span>
                            <ChevronDown size={13} className="text-[#1B4FD8] shrink-0 ml-1" />
                          </div>
                        )}
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => removeItemRow(idx)}
                      disabled={items.length <= 1}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg transition-colors disabled:opacity-20 cursor-pointer shrink-0 mt-0.5"
                      title="Eliminar fila"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>

                  {/* Row 2: Controls & Price Subtotal */}
                  <div className="flex items-center justify-between gap-3 pt-1 border-t border-slate-100 dark:border-zinc-800/80">
                    {/* Cantidad Stepper */}
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">CANT:</span>
                      <div className="flex items-center border border-slate-200 dark:border-zinc-700 rounded-lg bg-slate-50 dark:bg-zinc-800 overflow-hidden shadow-2xs">
                        <button
                          type="button"
                          onClick={() => updateItem(idx, { quantity: Math.max(1, Number(it.quantity || 1) - 1) })}
                          className="w-7 h-7 flex items-center justify-center text-slate-600 dark:text-zinc-300 hover:bg-slate-200 dark:hover:bg-zinc-700 transition-colors"
                        >
                          <Minus size={12} />
                        </button>
                        <input
                          type="number"
                          min="1"
                          value={it.quantity}
                          onChange={(e) => updateItem(idx, { quantity: e.target.value })}
                          required
                          className="w-9 bg-transparent text-center font-mono font-bold text-xs text-slate-900 dark:text-white outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => updateItem(idx, { quantity: Number(it.quantity || 1) + 1 })}
                          className="w-7 h-7 flex items-center justify-center text-slate-600 dark:text-zinc-300 hover:bg-slate-200 dark:hover:bg-zinc-700 transition-colors"
                        >
                          <Plus size={12} />
                        </button>
                      </div>
                    </div>

                    {/* Unit Price & Subtotal */}
                    <div className="text-right">
                      <div className="text-[10px] text-slate-400 font-mono">
                        P. Unit: S/ {(Number(it.unit_price) || 0).toFixed(2)}
                      </div>
                      <div className="text-sm font-black font-mono text-[#1B4FD8] dark:text-blue-400 leading-tight">
                        {fmt(lineTotal)}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* ═════════════════════════════════════════════════════════
            3. SPLIT BOTTOM: PAYMENT COND & CASH REGISTER (LEFT) | TAX LIQUIDATION (RIGHT)
           ═════════════════════════════════════════════════════════ */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-stretch">

          {/* LEFT: PAYMENT CONTROL & CASH CALCULATOR (COL 7) */}
          <div className="lg:col-span-7 bg-white dark:bg-[#141417] rounded-xl border border-slate-200/90 dark:border-zinc-800/90 p-4 shadow-xs flex flex-col justify-between space-y-3.5">
            <div className="space-y-3">
              {/* Header with Contado vs Crédito */}
              <div className="flex items-center justify-between pb-2.5 border-b border-slate-100 dark:border-zinc-800">
                <span className="text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider">
                  CONDICIONES COMERCIALES Y PAGO
                </span>

                <div className="inline-flex p-0.5 bg-slate-100 dark:bg-zinc-800 rounded-lg text-xs font-semibold">
                  <button
                    type="button"
                    onClick={() => setPaymentStatus('pagado')}
                    className={`px-3 py-1 rounded-md transition-all cursor-pointer ${
                      paymentStatus === 'pagado'
                        ? 'bg-[#1B4FD8] text-white shadow-xs font-bold'
                        : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
                    }`}
                  >
                    Al Contado
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentStatus('pendiente')}
                    className={`px-3 py-1 rounded-md transition-all cursor-pointer ${
                      paymentStatus === 'pendiente'
                        ? 'bg-amber-600 text-white shadow-xs font-bold'
                        : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
                    }`}
                  >
                    A Crédito
                  </button>
                </div>
              </div>

              {/* Payment Methods */}
              {paymentStatus === 'pagado' ? (
                <div className="space-y-2.5">
                  {/* MOBILE VIEW: Compact 3 + 2 Modern Keypad (No giant vertical stack) */}
                  <div className="sm:hidden space-y-1.5">
                    {/* Fila 1: Instant Retail Payments (Efectivo, Yape, Plin) */}
                    <div className="grid grid-cols-3 gap-1.5">
                      <button
                        type="button"
                        onClick={() => setPaymentMethod('efectivo')}
                        className={`h-10 px-2 rounded-xl border text-center transition-all cursor-pointer flex items-center justify-center gap-1.5 active:scale-95 ${
                          paymentMethod === 'efectivo'
                            ? 'bg-emerald-600 text-white border-emerald-600 font-bold shadow-xs'
                            : 'bg-slate-50/80 dark:bg-zinc-800/80 border-slate-200 dark:border-zinc-700 text-slate-700 dark:text-zinc-300 hover:bg-slate-100'
                        }`}
                      >
                        <Banknote size={15} className="shrink-0" />
                        <span className="text-xs font-bold">Efectivo</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setPaymentMethod('yape')}
                        className={`h-10 px-2 rounded-xl border text-center transition-all cursor-pointer flex items-center justify-center gap-1.5 active:scale-95 ${
                          paymentMethod === 'yape'
                            ? 'bg-[#742284] border-[#742284] text-white font-bold shadow-xs'
                            : 'bg-slate-50/80 dark:bg-zinc-800/80 border-slate-200 dark:border-zinc-700 text-slate-700 dark:text-zinc-300 hover:bg-purple-50 dark:hover:bg-purple-950/20'
                        }`}
                      >
                        <img src="/yape-logo.png" alt="Yape" className="w-4 h-4 rounded object-cover shrink-0" />
                        <span className="text-xs font-black">Yape</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setPaymentMethod('plin')}
                        className={`h-10 px-2 rounded-xl border text-center transition-all cursor-pointer flex items-center justify-center gap-1.5 active:scale-95 ${
                          paymentMethod === 'plin'
                            ? 'bg-[#00b49f] border-[#00b49f] text-white font-bold shadow-xs'
                            : 'bg-slate-50/80 dark:bg-zinc-800/80 border-slate-200 dark:border-zinc-700 text-slate-700 dark:text-zinc-300 hover:bg-teal-50 dark:hover:bg-teal-950/20'
                        }`}
                      >
                        <img src="/plin-logo.png" alt="Plin" className="w-4 h-4 rounded-full object-cover shrink-0" />
                        <span className="text-xs font-black">Plin</span>
                      </button>
                    </div>

                    {/* Fila 2: Banking & Terminal (Transferencia, Tarjeta / POS) */}
                    <div className="grid grid-cols-2 gap-1.5">
                      <button
                        type="button"
                        onClick={() => setPaymentMethod('transferencia')}
                        className={`h-10 px-3 rounded-xl border text-center transition-all cursor-pointer flex items-center justify-center gap-1.5 active:scale-95 ${
                          paymentMethod === 'transferencia'
                            ? 'bg-[#1B4FD8] text-white border-[#1B4FD8] font-bold shadow-xs'
                            : 'bg-slate-50/80 dark:bg-zinc-800/80 border-slate-200 dark:border-zinc-700 text-slate-700 dark:text-zinc-300 hover:bg-slate-100'
                        }`}
                      >
                        <Building2 size={15} className="shrink-0" />
                        <span className="text-xs font-bold">Transferencia</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setPaymentMethod('tarjeta')}
                        className={`h-10 px-3 rounded-xl border text-center transition-all cursor-pointer flex items-center justify-center gap-1.5 active:scale-95 ${
                          paymentMethod === 'tarjeta'
                            ? 'bg-indigo-600 text-white border-indigo-600 font-bold shadow-xs'
                            : 'bg-slate-50/80 dark:bg-zinc-800/80 border-slate-200 dark:border-zinc-700 text-slate-700 dark:text-zinc-300 hover:bg-slate-100'
                        }`}
                      >
                        <CreditCard size={15} className="shrink-0" />
                        <span className="text-xs font-bold">Tarjeta / POS</span>
                      </button>
                    </div>
                  </div>

                  {/* DESKTOP VIEW (sm+): 5 Columns in 1 Row (Untouched) */}
                  <div className="hidden sm:grid sm:grid-cols-5 gap-1.5">
                    {/* Efectivo */}
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('efectivo')}
                      className={`p-2 rounded-lg border text-center transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                        paymentMethod === 'efectivo'
                          ? 'bg-emerald-600 text-white border-emerald-600 font-bold shadow-xs'
                          : 'bg-slate-50/80 dark:bg-zinc-800/80 border-slate-200 dark:border-zinc-700 text-slate-700 dark:text-zinc-300 hover:bg-slate-100'
                      }`}
                    >
                      <Banknote size={14} className="shrink-0" />
                      <span className="text-xs font-semibold">Efectivo</span>
                    </button>

                    {/* Yape */}
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('yape')}
                      className={`p-2 rounded-lg border text-center transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                        paymentMethod === 'yape'
                          ? 'bg-[#742284] border-[#742284] text-white font-bold shadow-xs'
                          : 'bg-slate-50/80 dark:bg-zinc-800/80 border-slate-200 dark:border-zinc-700 text-slate-700 dark:text-zinc-300 hover:bg-purple-50 dark:hover:bg-purple-950/20'
                      }`}
                    >
                      <img src="/yape-logo.png" alt="Yape" className="w-3.5 h-3.5 rounded object-cover shrink-0" />
                      <span className="text-xs font-bold">Yape</span>
                    </button>

                    {/* Plin */}
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('plin')}
                      className={`p-2 rounded-lg border text-center transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                        paymentMethod === 'plin'
                          ? 'bg-[#00b49f] border-[#00b49f] text-white font-bold shadow-xs'
                          : 'bg-slate-50/80 dark:bg-zinc-800/80 border-slate-200 dark:border-zinc-700 text-slate-700 dark:text-zinc-300 hover:bg-teal-50 dark:hover:bg-teal-950/20'
                      }`}
                    >
                      <img src="/plin-logo.png" alt="Plin" className="w-3.5 h-3.5 rounded-full object-cover shrink-0" />
                      <span className="text-xs font-bold">Plin</span>
                    </button>

                    {/* Transferencia */}
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('transferencia')}
                      className={`p-2 rounded-lg border text-center transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                        paymentMethod === 'transferencia'
                          ? 'bg-[#1B4FD8] text-white border-[#1B4FD8] font-bold shadow-xs'
                          : 'bg-slate-50/80 dark:bg-zinc-800/80 border-slate-200 dark:border-zinc-700 text-slate-700 dark:text-zinc-300 hover:bg-slate-100'
                      }`}
                    >
                      <Building2 size={14} className="shrink-0" />
                      <span className="text-xs font-semibold">Transf.</span>
                    </button>

                    {/* Tarjeta */}
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('tarjeta')}
                      className={`p-2 rounded-lg border text-center transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                        paymentMethod === 'tarjeta'
                          ? 'bg-indigo-600 text-white border-indigo-600 font-bold shadow-xs'
                          : 'bg-slate-50/80 dark:bg-zinc-800/80 border-slate-200 dark:border-zinc-700 text-slate-700 dark:text-zinc-300 hover:bg-slate-100'
                      }`}
                    >
                      <CreditCard size={14} className="shrink-0" />
                      <span className="text-xs font-semibold">POS</span>
                    </button>
                  </div>

                  {/* Cash Register: Bill Presets & Change Calculator */}
                  {paymentMethod === 'efectivo' && (
                    <div className="p-3 rounded-lg bg-slate-50/90 dark:bg-zinc-800/50 border border-slate-200 dark:border-zinc-700/80 space-y-2.5">
                      {/* Fast Bill Denominations */}
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                          BILLETES RÁPIDOS:
                        </span>
                        <div className="flex items-center gap-1 flex-wrap">
                          <button
                            type="button"
                            onClick={() => handleQuickCash(total > 0 ? total.toFixed(2) : 0)}
                            className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-slate-700 dark:text-zinc-300 hover:bg-slate-100 cursor-pointer shadow-2xs"
                          >
                            Exacto
                          </button>
                          {[20, 50, 100, 200].map((b) => (
                            <button
                              key={b}
                              type="button"
                              onClick={() => handleQuickCash(b)}
                              className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-slate-700 dark:text-zinc-300 hover:bg-slate-100 cursor-pointer shadow-2xs"
                            >
                              S/ {b}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Cash Input & Change Output */}
                      <div className="grid grid-cols-2 gap-3 pt-1 border-t border-slate-200/60 dark:border-zinc-700/60 items-center">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                            EFECTIVO RECIBIDO
                          </label>
                          <div className="relative">
                            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 font-mono text-xs">S/</span>
                            <input
                              type="number"
                              step="0.50"
                              value={cashReceived}
                              onChange={(e) => setCashReceived(e.target.value)}
                              placeholder={total > 0 ? total.toFixed(2) : '0.00'}
                              className="w-full bg-white dark:bg-zinc-900 border border-slate-300 dark:border-zinc-700 rounded-lg pl-7 pr-2.5 py-1 text-sm font-mono font-bold text-slate-900 dark:text-white outline-none focus:border-blue-600 transition-colors"
                            />
                          </div>
                        </div>

                        <div className="p-2 rounded-lg bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 text-right">
                          <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                            VUELTO A ENTREGAR
                          </span>
                          <span
                            className={`font-mono font-black text-base sm:text-lg leading-tight ${
                              Number(cashReceived) >= total && total > 0
                                ? 'text-emerald-600 dark:text-emerald-400'
                                : 'text-slate-400'
                            }`}
                          >
                            {Number(cashReceived) >= total && total > 0
                              ? fmt(Number(cashReceived) - total)
                              : 'S/ 0.00'}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {(paymentMethod === 'yape' || paymentMethod === 'plin') && (
                    <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-zinc-800/60 border border-slate-200 dark:border-zinc-700 flex items-center justify-between text-xs">
                      <span className="text-slate-700 dark:text-zinc-200 font-semibold">
                        {paymentMethod === 'yape' ? 'Pago con código QR o número Yape' : 'Pago con código QR o número Plin'}
                      </span>
                      {paymentConfig?.[paymentMethod]?.qr_image && (
                        <button
                          type="button"
                          onClick={() => setShowQrModal(true)}
                          className="px-2.5 py-1 rounded-md bg-[#1B4FD8] hover:bg-[#163FBF] text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-2xs"
                        >
                          <QrCode size={13} />
                          <span>Mostrar QR</span>
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-3 p-3 rounded-lg bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200 text-xs">
                  <div className="text-amber-800 dark:text-amber-300 font-semibold shrink-0">
                    Fecha Límite de Pago:
                  </div>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="bg-white dark:bg-zinc-900 border border-amber-300 rounded-lg px-2.5 py-1 text-xs font-mono outline-none"
                  />
                </div>
              )}
            </div>

            {/* Notes / Order reference input */}
            <div className="pt-2 border-t border-slate-100 dark:border-zinc-800 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <input
                type="text"
                value={purchaseOrder}
                onChange={(e) => setPurchaseOrder(e.target.value)}
                placeholder="N° O.C. / Guía Remisión / Ref. interna…"
                className="w-full bg-slate-50 dark:bg-zinc-800/70 border border-slate-200 dark:border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs font-mono uppercase text-slate-800 dark:text-white outline-none focus:border-slate-900"
              />
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Glosa / Observación impresa en el comprobante…"
                className="w-full bg-slate-50 dark:bg-zinc-800/70 border border-slate-200 dark:border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 dark:text-white outline-none focus:border-slate-900"
              />
            </div>
          </div>

          {/* RIGHT: FINANCIAL LIQUIDATION & EMISSION (COL 5) */}
          <div className="lg:col-span-5 bg-white dark:bg-[#141417] rounded-xl border border-slate-200/90 dark:border-zinc-800/90 p-4 shadow-xs flex flex-col justify-between space-y-3.5">
            <div>
              <div className="flex items-center justify-between pb-2.5 border-b border-slate-100 dark:border-zinc-800 text-xs">
                <span className="text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider">
                  LIQUIDACIÓN TRIBUTARIA
                </span>
                <span className="font-mono text-[11px] font-bold text-slate-500 dark:text-zinc-400">
                  PEN (S/)
                </span>
              </div>

              <div className="space-y-2 pt-2.5 text-xs">
                <div className="flex justify-between items-center text-slate-600 dark:text-zinc-400">
                  <span>Subtotal / Op. Gravada:</span>
                  <span className="font-mono font-bold text-slate-900 dark:text-white">{fmt(netAmount)}</span>
                </div>
                <div className="flex justify-between items-center text-slate-600 dark:text-zinc-400">
                  <span>I.G.V. (18% Incluido):</span>
                  <span className="font-mono font-semibold">{fmt(igvAmount)}</span>
                </div>
                <div className="flex justify-between items-center text-slate-600 dark:text-zinc-400">
                  <span>Descuento Global (S/):</span>
                  <div className="relative w-24">
                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 font-mono text-xs">S/</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={discount}
                      onChange={(e) => setDiscount(e.target.value)}
                      placeholder="0.00"
                      className="w-full bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-lg pl-6 pr-2 py-0.5 text-right font-mono font-bold text-xs text-amber-600 outline-none focus:border-slate-900"
                    />
                  </div>
                </div>

                {/* Financial Total Banner */}
                <div className="mt-3 p-3.5 rounded-xl bg-blue-50/80 dark:bg-blue-950/25 border border-blue-200/90 dark:border-blue-900/40 shadow-xs">
                  <div className="flex justify-between items-baseline">
                    <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-slate-600 dark:text-zinc-300">
                      TOTAL A COBRAR
                    </span>
                    <span className="text-2xl sm:text-3xl font-black font-mono text-[#1B4FD8] dark:text-blue-400 tracking-tight">
                      {fmt(total)}
                    </span>
                  </div>
                  <div className="mt-1.5 pt-1.5 border-t border-blue-200/60 dark:border-blue-900/40 text-[10px] font-mono font-semibold text-slate-500 dark:text-zinc-400 truncate">
                    {numberToWordsPE(total)}
                  </div>
                </div>
              </div>
            </div>

            {error && (
              <div className="p-2.5 rounded-lg bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle size={15} className="shrink-0 text-rose-600" />
                <span className="truncate">{error}</span>
              </div>
            )}

            {/* Action Buttons */}
            <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-zinc-800">
              <button
                type="submit"
                disabled={isProcessing}
                onClick={handleSubmit}
                className="w-full py-3.5 rounded-xl bg-[#1B4FD8] hover:bg-[#163FBF] text-white font-bold text-xs sm:text-sm shadow-md shadow-blue-600/25 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 active:scale-98"
                title="Emitir comprobante [F2]"
              >
                {isProcessing ? (
                  <span>Emitiendo comprobante…</span>
                ) : (
                  <>
                    <Check size={16} strokeWidth={3} />
                    <span>Emitir Comprobante</span>
                    <kbd className="hidden sm:inline text-[10px] font-mono text-blue-100 bg-blue-800/60 px-1.5 py-0.2 rounded">F2</kbd>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => requestLeave('/ventas')}
                className="w-full py-1.5 rounded-lg text-slate-500 hover:text-slate-800 dark:hover:text-white text-xs font-semibold transition-colors cursor-pointer text-center"
              >
                Descartar y volver a ventas
              </button>
            </div>
          </div>

        </div>

        {/* ═════════════════════════════════════════════════════════
            STICKY MOBILE CHECKOUT BAR (< lg)
           ═════════════════════════════════════════════════════════ */}
        <div className="fixed bottom-0 inset-x-0 bg-white/95 dark:bg-[#141417]/95 backdrop-blur-xl border-t border-slate-200 dark:border-zinc-800 px-4 py-2.5 z-40 lg:hidden shadow-[0_-8px_25px_rgba(0,0,0,0.08)] flex items-center justify-between gap-3">
          <div className="min-w-0">
            <span className="block text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider">
              Total a Cobrar
            </span>
            <span className="text-xl sm:text-2xl font-black font-mono text-[#1B4FD8] dark:text-blue-400 leading-tight">
              {fmt(total)}
            </span>
          </div>

          <button
            type="button"
            disabled={isProcessing}
            onClick={handleSubmit}
            className="flex-1 max-w-[210px] h-11 px-4 rounded-xl bg-gradient-to-r from-[#1B4FD8] to-blue-600 hover:from-blue-700 hover:to-blue-800 text-white font-bold text-xs shadow-md shadow-blue-600/30 transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 active:scale-95"
          >
            {isProcessing ? (
              <span>Emitiendo…</span>
            ) : (
              <>
                <Check size={16} strokeWidth={3} />
                <span>Emitir Comprobante</span>
              </>
            )}
          </button>
        </div>

        {/* ═════════════════════════════════════════════════════════
            OVERLAY: EMISSION PROGRESS SCREEN
           ═════════════════════════════════════════════════════════ */}
        {isProcessing && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4 animate-fade-in">
            <div className="bg-white dark:bg-[#18181b] rounded-2xl border border-slate-200 dark:border-zinc-700 p-6 max-w-sm w-full text-center shadow-2xl space-y-4 animate-slide-up">
              <div className="w-12 h-12 rounded-full border-3 border-blue-600 border-t-transparent animate-spin mx-auto flex items-center justify-center">
                <ShoppingCart size={18} className="text-blue-600 animate-pulse" />
              </div>

              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Emitiendo Comprobante Electrónico
                </h3>
                <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">
                  {processingStep === 1 && 'Validando existencias en almacén…'}
                  {processingStep === 2 && 'Registrando comprobante y deduciendo inventario…'}
                  {processingStep === 3 && '¡Comprobante generado con éxito!'}
                </p>
              </div>

              <div className="w-full bg-slate-100 dark:bg-zinc-800 h-1.5 rounded-full overflow-hidden">
                <div
                  className="bg-[#1B4FD8] h-full transition-all duration-300"
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
            MODAL: COMPROBANTE EMITIDO CON ÉXITO
           ═════════════════════════════════════════════════════════ */}
        {createdSale && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-fade-in">
            <div className="relative w-full max-w-md bg-white dark:bg-[#141417] rounded-2xl shadow-2xl border border-slate-200 dark:border-zinc-800 overflow-hidden flex flex-col max-h-[92vh] animate-scale-in">
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-zinc-800 bg-slate-50/80 dark:bg-zinc-800/50">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                    <Check size={14} strokeWidth={3} />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-slate-900 dark:text-white leading-tight">
                      Comprobante Emitido con Éxito
                    </h3>
                    <p className="text-[10px] text-slate-500 dark:text-zinc-400 font-mono">
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
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors"
                  title="Cerrar"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Ticket Body (Scrollable) */}
              <div className="overflow-y-auto p-4 flex-1">
                <ReceiptModal
                  sale={createdSale}
                  client={createdSale.client || clients.find((c) => c.name === createdSale.client_name)}
                  products={products}
                  company={company}
                />
              </div>

              {/* Footer Actions */}
              <div className="p-3 bg-slate-50 dark:bg-zinc-800/60 border-t border-slate-100 dark:border-zinc-800 flex items-center justify-between gap-2.5 text-xs">
                <button
                  type="button"
                  onClick={() => {
                    setCreatedSale(null)
                    navigate('/ventas', { state: { created: true, clientName } })
                  }}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-slate-700 dark:text-zinc-200 font-semibold hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  Ir a Lista de Ventas
                </button>

                <button
                  type="button"
                  onClick={handleResetForm}
                  className="px-3.5 py-1.5 rounded-lg bg-[#1B4FD8] hover:bg-[#163FBF] text-white font-bold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
                >
                  <Plus size={13} strokeWidth={2.5} />
                  <span>Emitir Otra Venta</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* QR MODAL */}
        <PaymentQrModal
          isOpen={showQrModal}
          onClose={() => setShowQrModal(false)}
          method={paymentMethod}
          paymentConfig={paymentConfig}
          amount={total}
          currency="S/"
        />

        {/* MOBILE PRODUCT PICKER */}
        {pickerOpen && (
          <div className="fixed inset-0 z-50 flex flex-col justify-end bg-slate-900/60 dark:bg-black/75 backdrop-blur-[2px] sm:items-center sm:justify-center p-0 sm:p-4 animate-fade-in">
            <div className="absolute inset-0" onClick={() => setPickerOpen(false)} />
            <div className="relative w-full sm:max-w-md bg-white dark:bg-[#181B2E] rounded-t-2xl sm:rounded-xl shadow-2xl border border-slate-200 dark:border-white/10 max-h-[82vh] flex flex-col overflow-hidden animate-slide-up">
              <div className="px-4 py-3 border-b border-slate-100 dark:border-white/10 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Catálogo de Productos
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Fila #{pickerItemIdx !== null ? pickerItemIdx + 1 : 1} · {products.length} productos
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setPickerOpen(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="p-2.5 border-b border-slate-100 dark:border-white/10 bg-slate-50/70 dark:bg-white/[0.02]">
                <div className="relative">
                  <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={pickerSearch}
                    onChange={(e) => setPickerSearch(e.target.value)}
                    placeholder="Buscar por código, nombre o categoría…"
                    autoFocus
                    className="w-full pl-8 pr-7 py-1.5 bg-white dark:bg-[#121420] border border-slate-200 dark:border-white/10 rounded-lg text-xs text-slate-900 dark:text-white placeholder:text-slate-400 outline-none focus:border-slate-900"
                  />
                  {pickerSearch && (
                    <button
                      type="button"
                      onClick={() => setPickerSearch('')}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400"
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>

              <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-white/5 p-2 max-h-[50vh]">
                {filteredPickerProducts.length === 0 ? (
                  <div className="p-6 text-center text-slate-400">
                    <Package size={22} className="mx-auto mb-1 opacity-40" />
                    <p className="text-xs font-bold">No se encontraron productos</p>
                  </div>
                ) : (
                  filteredPickerProducts.map((p) => {
                    const isSelected = pickerItemIdx !== null && items[pickerItemIdx]?.product_id === p.id
                    const isOutOfStock = Number(p.stock) <= 0

                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => {
                          if (pickerItemIdx !== null) {
                            updateItem(pickerItemIdx, { product_id: p.id })
                          }
                          setPickerOpen(false)
                        }}
                        className={`w-full text-left p-2.5 rounded-lg flex items-center justify-between gap-2.5 transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-slate-100 dark:bg-zinc-800'
                            : 'hover:bg-slate-50 dark:hover:bg-white/5'
                        }`}
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            {p.sku && (
                              <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 rounded">
                                {p.sku}
                              </span>
                            )}
                            <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                              {p.name}
                            </p>
                          </div>
                          <div className="flex items-center gap-2 mt-0.5 text-[10px]">
                            <span className={isOutOfStock ? 'text-rose-600 font-bold' : 'text-emerald-600 font-bold'}>
                              {p.stock} {p.unit || 'uds.'}
                            </span>
                            <span className="text-slate-300 dark:text-zinc-600">·</span>
                            <span className="text-slate-400 capitalize">{p.category || 'General'}</span>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <span className="text-xs font-mono font-bold text-slate-900 dark:text-white">
                            {fmt(p.sale_price)}
                          </span>
                        </div>
                      </button>
                    )
                  })
                )}
              </div>
            </div>
          </div>
        )}

        {/* MOBILE CLIENT PICKER */}
        {clientPickerOpen && (
          <div className="fixed inset-0 z-50 flex flex-col justify-end bg-slate-900/60 dark:bg-black/75 backdrop-blur-[2px] sm:items-center sm:justify-center p-0 sm:p-4 animate-fade-in">
            <div className="absolute inset-0" onClick={() => setClientPickerOpen(false)} />
            <div className="relative w-full sm:max-w-md bg-white dark:bg-[#181B2E] rounded-t-2xl sm:rounded-xl shadow-2xl border border-slate-200 dark:border-white/10 max-h-[82vh] flex flex-col overflow-hidden animate-slide-up">
              <div className="px-4 py-3 border-b border-slate-100 dark:border-white/10 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Directorio de Clientes
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    {clients.length} clientes registrados
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setClientPickerOpen(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="p-2.5 border-b border-slate-100 dark:border-white/10 bg-slate-50/70 dark:bg-white/[0.02]">
                <div className="relative">
                  <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={clientPickerSearch}
                    onChange={(e) => setClientPickerSearch(e.target.value)}
                    placeholder="Buscar por nombre, RUC, DNI o teléfono…"
                    autoFocus
                    className="w-full pl-8 pr-7 py-1.5 bg-white dark:bg-[#121420] border border-slate-200 dark:border-white/10 rounded-lg text-xs text-slate-900 dark:text-white placeholder:text-slate-400 outline-none focus:border-slate-900"
                  />
                  {clientPickerSearch && (
                    <button
                      type="button"
                      onClick={() => setClientPickerSearch('')}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400"
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>

              <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-white/5 p-2 max-h-[50vh]">
                {/* Consumidor final shortcut */}
                <button
                  type="button"
                  onClick={() => {
                    handleQuickClient()
                    setClientPickerOpen(false)
                  }}
                  className="w-full text-left p-2.5 rounded-lg flex items-center justify-between gap-2.5 hover:bg-slate-50 dark:hover:bg-zinc-800 cursor-pointer mb-1 border border-dashed border-slate-200 dark:border-zinc-700"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <Zap size={14} className="text-amber-500 fill-amber-500 shrink-0" />
                    <div>
                      <p className="text-xs font-bold text-slate-900 dark:text-white">
                        {docType === 'FACTURA' ? 'INVERSIONES & SERVICIOS S.A.C.' : 'CLIENTE GENERAL'}
                      </p>
                      <p className="text-[10px] text-slate-400">Consumidor final rápido</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold font-mono px-1.5 py-0.5 rounded bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400">
                    RÁPIDO
                  </span>
                </button>

                {filteredPickerClients.length === 0 ? (
                  <div className="p-6 text-center text-slate-400">
                    <User size={22} className="mx-auto mb-1 opacity-40" />
                    <p className="text-xs font-bold">No se encontraron clientes</p>
                  </div>
                ) : (
                  filteredPickerClients.map((c) => {
                    const isSelected = selectedClientId === c.id
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => {
                          handleClientSelect(c.id)
                          setClientPickerOpen(false)
                        }}
                        className={`w-full text-left p-2.5 rounded-lg flex items-center justify-between gap-2.5 transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-slate-100 dark:bg-zinc-800'
                            : 'hover:bg-slate-50 dark:hover:bg-white/5'
                        }`}
                      >
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                            {c.name}
                          </p>
                          <div className="flex items-center gap-2 mt-0.5 text-[10px] text-slate-500 font-mono">
                            {c.ruc && <span>DOC: {c.ruc}</span>}
                            {c.phone && <span>· TEL: {c.phone}</span>}
                          </div>
                        </div>

                        {isSelected && (
                          <div className="flex items-center gap-1 text-[10px] text-slate-900 dark:text-white font-bold shrink-0">
                            <Check size={12} strokeWidth={3} />
                          </div>
                        )}
                      </button>
                    )
                  })
                )}
              </div>
            </div>
          </div>
        )}

        {/* MOBILE SELLER PICKER */}
        {sellerPickerOpen && (
          <div className="fixed inset-0 z-50 flex flex-col justify-end bg-slate-900/60 dark:bg-black/75 backdrop-blur-[2px] sm:items-center sm:justify-center p-0 sm:p-4 animate-fade-in">
            <div className="absolute inset-0" onClick={() => setSellerPickerOpen(false)} />
            <div className="relative w-full sm:max-w-md bg-white dark:bg-[#181B2E] rounded-t-2xl sm:rounded-xl shadow-2xl border border-slate-200 dark:border-white/10 max-h-[70vh] flex flex-col overflow-hidden animate-slide-up">
              <div className="px-4 py-3 border-b border-slate-100 dark:border-white/10 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Vendedor Asignado
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Responsable de la emisión
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setSellerPickerOpen(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-white/5 p-2">
                {sellerOptions.map((s, idx) => {
                  const isSelected = sellerName === s
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setSellerName(s)
                        setSellerPickerOpen(false)
                      }}
                      className={`w-full text-left p-2.5 rounded-lg flex items-center justify-between gap-2.5 transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-slate-100 dark:bg-zinc-800'
                          : 'hover:bg-slate-50 dark:hover:bg-white/5'
                      }`}
                    >
                      <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                        {s}
                      </span>
                      {isSelected && (
                        <Check size={14} className="text-slate-900 dark:text-white shrink-0" strokeWidth={3} />
                      )}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        )}

        {/* Modal de confirmación para descartar cambios si intenta salir */}
        {DiscardModalComponent}

        {/* Notificación flotante de escaneo rápido POS */}
        {scanToast && (
          <div className="fixed bottom-5 right-5 z-40 bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-4 py-2.5 rounded-xl shadow-2xl flex items-center gap-2 text-xs font-bold border border-slate-700 dark:border-slate-200 animate-slide-up">
            <ScanBarcode size={16} className="text-emerald-400 dark:text-emerald-600 shrink-0" />
            <span>{scanToast}</span>
            <button
              type="button"
              onClick={() => setScanToast('')}
              className="ml-2 text-slate-400 hover:text-white dark:hover:text-slate-900 cursor-pointer"
            >
              <X size={14} />
            </button>
          </div>
        )}

        {/* Lector de Código de Barras con Cámara */}
        <BarcodeScannerModal
          isOpen={scannerOpen}
          onClose={() => setScannerOpen(false)}
          onScan={handleBarcodeScanned}
          title="Lector de Códigos de Barras POS"
          subtitle="Apunta la cámara al código de barras para agregarlo de inmediato a la venta"
        />

      </div>
    </AppLayout>
  )
}
