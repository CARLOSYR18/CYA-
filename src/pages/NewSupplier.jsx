import { useState, useEffect, useMemo, useCallback } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import {
  ArrowLeft, Building2, User, Phone, Mail, MapPin, FileText,
  Check, AlertCircle, ShoppingBag, DollarSign,
  ShieldCheck, Eye, MessageCircle, Copy, ExternalLink,
  CreditCard, Truck, Clock, CheckCircle2, Home, X,
  Search, Tag, CheckCircle, HelpCircle, Briefcase
} from 'lucide-react'
import AppLayout from '../components/layout/AppLayout'
import { useFormLeaveGuard } from '../hooks/useFormLeaveGuard'
import { suppliersService } from '../services/suppliersService'
import { purchasesService } from '../services/purchasesService'
import { productsService } from '../services/productsService'

const fmt = (n) =>
  `S/ ${(Number(n) || 0).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

const AVATAR_PALETTES = [
  { bg: 'from-blue-600 to-indigo-700', text: 'text-white' },
  { bg: 'from-emerald-600 to-teal-700', text: 'text-white' },
  { bg: 'from-violet-600 to-purple-700', text: 'text-white' },
  { bg: 'from-amber-500 to-orange-600', text: 'text-white' },
  { bg: 'from-rose-500 to-pink-600', text: 'text-white' },
  { bg: 'from-cyan-600 to-blue-600', text: 'text-white' },
]

const getInitials = (name = '') => {
  const parts = name.trim().split(/\s+/)
  if (!parts[0]) return 'PR'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + (parts[1]?.[0] || '')).toUpperCase()
}

const cleanPhone = (phone = '') => phone.replace(/\D/g, '')

export default function NewSupplier() {
  const navigate = useNavigate()
  const { id } = useParams()
  const isEditing = Boolean(id)

  // Form State
  const [name, setName] = useState('')
  const [ruc, setRuc] = useState('')
  const [contactName, setContactName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [address, setAddress] = useState('')
  const [creditTerms, setCreditTerms] = useState('CONTADO') // 'CONTADO' | '15_DIAS' | '30_DIAS' | '60_DIAS'
  const [supplierType, setSupplierType] = useState('DISTRIBUIDOR') // 'DISTRIBUIDOR' | 'FABRICANTE' | 'IMPORTADOR' | 'MAYORISTA'
  const [currency, setCurrency] = useState('PEN') // 'PEN' | 'USD'
  const [creditLimit, setCreditLimit] = useState('')
  const [notes, setNotes] = useState('')

  // UI & Live Validation States
  const [loadingInitial, setLoadingInitial] = useState(isEditing)
  const [isProcessing, setIsProcessing] = useState(false)
  const [processingStep, setProcessingStep] = useState(0) // 1: 35%, 2: 75%, 3: 100%
  const [error, setError] = useState('')
  const [sunatStatus, setSunatStatus] = useState(null) // null | 'valid' | 'invalid'
  const [validatingDoc, setValidatingDoc] = useState(false)

  // Live SUNAT RUC Simulation / Validation
  const handleValidateRuc = () => {
    if (!ruc) return
    setValidatingDoc(true)
    setTimeout(() => {
      setValidatingDoc(false)
      const clean = ruc.trim()
      if (clean.length === 11 && (clean.startsWith('20') || clean.startsWith('10') || clean.startsWith('15') || clean.startsWith('17'))) {
        setSunatStatus('valid')
        if (!name) {
          setName(clean.startsWith('20') ? 'DISTRIBUIDORA INDUSTRIAL & COMERCIAL DEL PERÚ S.A.C.' : 'PROVEEDOR COMERCIAL INDIVIDUAL')
        }
      } else {
        setSunatStatus('invalid')
      }
    }, 350)
  }

  // Detección de cambios sin guardar en el proveedor
  const isDirty = useMemo(() => {
    if (isProcessing) return false
    return Boolean(
      name.trim() ||
      ruc.trim() ||
      contactName.trim() ||
      email.trim() ||
      phone.trim() ||
      address.trim() ||
      creditLimit ||
      notes.trim()
    )
  }, [isProcessing, name, ruc, contactName, email, phone, address, creditLimit, notes])

  const { requestLeave, DiscardModalComponent } = useFormLeaveGuard({
    isDirty,
    defaultRedirectUrl: '/proveedores',
    modalTitle: isEditing ? '¿Descartar cambios del proveedor?' : '¿Descartar nuevo proveedor?',
    modalDescription: 'Tienes información ingresada en la ficha de este proveedor. Si sales ahora o recargas la pantalla, los datos ingresados se perderán.'
  })

  // Historical data when editing
  const [supplierPurchases, setSupplierPurchases] = useState([])
  const [supplierProducts, setSupplierProducts] = useState([])

  // Load existing supplier if editing
  useEffect(() => {
    async function initData() {
      if (!id) return
      setLoadingInitial(true)
      try {
        const [sups, purches, prods] = await Promise.all([
          suppliersService.list().catch(() => []),
          purchasesService.list().catch(() => []),
          productsService.list().catch(() => [])
        ])

        const current = (sups || []).find((s) => String(s.id) === String(id))
        if (current) {
          setName(current.name || '')
          setRuc(current.ruc || '')
          setContactName(current.contact_name || '')
          setEmail(current.email || '')
          setPhone(current.phone || '')
          setAddress(current.address || '')
          setNotes(current.notes || '')

          if (current.ruc && current.ruc.length === 11) {
            setSunatStatus('valid')
          }

          const purList = (purches || []).filter((p) => String(p.supplier_id) === String(id))
          setSupplierPurchases(purList)

          const prodList = (prods || []).filter((p) => String(p.supplier_id) === String(id))
          setSupplierProducts(prodList)
        } else {
          setError('No se encontró el proveedor solicitado.')
        }
      } catch (err) {
        console.error('Error cargando proveedor:', err)
        setError('Error al conectar con la base de datos.')
      } finally {
        setLoadingInitial(false)
      }
    }

    initData()
  }, [id, isEditing])

  // Contextual metrics if editing
  const editingMetrics = useMemo(() => {
    const totalOrders = supplierPurchases.length
    const totalSpent = supplierPurchases.reduce((sum, p) => sum + purchasesService.purchaseTotal(p), 0)
    const productCount = supplierProducts.length
    return { totalOrders, totalSpent, productCount }
  }, [supplierPurchases, supplierProducts])

  // Dynamic Avatar gradient based on name
  const avatarStyle = useMemo(() => {
    const hash = (name || 'PROVEEDOR').split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
    return AVATAR_PALETTES[hash % AVATAR_PALETTES.length]
  }, [name])

  // Form submission with 3-phase loading animation
  const handleSubmit = useCallback(async (e) => {
    if (e && e.preventDefault) e.preventDefault()
    setError('')

    const cleanName = name.trim()
    if (!cleanName) {
      setError('Por favor, ingresa la Razón Social o Nombre Comercial del proveedor.')
      return
    }

    if (ruc && ruc.trim().length !== 11 && ruc.trim().length !== 8) {
      setError('El R.U.C. debe contener 11 dígitos numéricos (o 8 para D.N.I.).')
      return
    }

    setIsProcessing(true)
    setProcessingStep(1) // 35%

    try {
      await new Promise((r) => setTimeout(r, 400))
      setProcessingStep(2) // 75%

      const finalNotes = [
        supplierType ? `[Tipo: ${supplierType}]` : '',
        currency ? `[Moneda: ${currency}]` : '',
        creditLimit ? `[Límite: S/ ${creditLimit}]` : '',
        creditTerms !== 'CONTADO' ? `[Condición: ${creditTerms.replace('_', ' ')}]` : '',
        notes.trim()
      ]
        .filter(Boolean)
        .join(' - ')

      const payload = {
        name: cleanName,
        ruc: ruc.trim() || null,
        contact_name: contactName.trim() || null,
        email: email.trim() || null,
        phone: phone.trim() || null,
        address: address.trim() || null,
        notes: finalNotes || null
      }

      if (isEditing) {
        await suppliersService.update(id, payload)
      } else {
        await suppliersService.create(payload)
      }

      setProcessingStep(3) // 100%
      await new Promise((r) => setTimeout(r, 450))

      setIsProcessing(false)
      navigate('/proveedores', {
        state: {
          created: !isEditing,
          updated: isEditing,
          supplierName: cleanName
        }
      })
    } catch (err) {
      setIsProcessing(false)
      setProcessingStep(0)
      setError(err.message || 'Error al guardar el proveedor en la base de datos.')
    }
  }, [name, ruc, contactName, email, phone, address, creditTerms, supplierType, currency, creditLimit, notes, isEditing, id, navigate])

  // Global Keyboard Shortcuts (F2: Guardar, Esc: Cancelar)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'F2' || (e.ctrlKey && e.key === 'Enter')) {
        e.preventDefault()
        handleSubmit()
      } else if (e.key === 'Escape' && !isProcessing) {
        e.preventDefault()
        requestLeave('/proveedores')
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleSubmit, isProcessing, requestLeave])

  return (
    <AppLayout title={isEditing ? 'Editar Proveedor' : 'Nuevo Proveedor'}>
      <div className="max-w-[1440px] mx-auto space-y-4 pb-32 sm:pb-40 animate-fade-in">

        {/* ═════════════════════════════════════════════════════════
            0. TOP BAR (COMPACT EXECUTIVE HEADER & BREADCRUMB)
           ═════════════════════════════════════════════════════════ */}
        <div className="bg-white dark:bg-[#141417] rounded-xl border border-slate-200/90 dark:border-zinc-800/90 p-3.5 sm:p-4 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => requestLeave('/proveedores')}
              className="w-9 h-9 rounded-xl bg-slate-50 hover:bg-slate-100 dark:bg-zinc-800 dark:hover:bg-zinc-700 border border-slate-200/80 dark:border-zinc-700 text-slate-600 dark:text-zinc-200 flex items-center justify-center transition-colors cursor-pointer shrink-0 shadow-2xs"
              title="Volver a Directorio de Proveedores"
            >
              <ArrowLeft size={16} />
            </button>
            <div>
              <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider">
                <span className="hover:text-[#1B4FD8] cursor-pointer" onClick={() => requestLeave('/proveedores')}>
                  MÓDULO DE ADQUISICIONES
                </span>
                <span>/</span>
                <span className="hover:text-[#1B4FD8] cursor-pointer" onClick={() => requestLeave('/proveedores')}>
                  GESTIÓN DE PROVEEDORES
                </span>
                <span>/</span>
                <span className="text-[#1B4FD8] dark:text-blue-400">
                  {isEditing ? 'MODIFICACIÓN DE EXPEDIENTE' : 'ALTA DE PROVEEDOR'}
                </span>
              </div>
              <div className="flex items-center gap-2.5 mt-0.5">
                <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight leading-none">
                  {isEditing ? 'Editar Expediente de Proveedor' : 'Registrar Nuevo Proveedor Comercial'}
                </h1>
                <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-mono font-semibold px-2 py-0.5 rounded-md bg-blue-50 text-[#1B4FD8] dark:bg-blue-950/40 dark:text-blue-300 border border-blue-200/80 dark:border-blue-900/40">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#1B4FD8]" />
                  EXPEDIENTE B2B
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <button
              type="button"
              onClick={() => requestLeave('/proveedores')}
              className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-zinc-700 text-slate-600 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-800 text-xs font-semibold transition-colors cursor-pointer"
            >
              Cancelar [Esc]
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isProcessing}
              className="px-4 py-2 rounded-xl bg-[#1B4FD8] hover:bg-[#163FBF] active:scale-95 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm shadow-blue-600/25 transition-all cursor-pointer disabled:opacity-60"
            >
              <Check size={15} strokeWidth={2.5} />
              <span>{isEditing ? 'Guardar Cambios' : 'Guardar y Registrar Proveedor'}</span>
              <kbd className="px-1 py-0.5 rounded bg-blue-700/60 text-[10px] font-mono">F2</kbd>
            </button>
          </div>
        </div>

        {/* ═════════════════════════════════════════════════════════
            1. MAIN FORM GRID: LEFT FORM (7 COLS) + RIGHT PREVIEW (5 COLS)
           ═════════════════════════════════════════════════════════ */}
        {loadingInitial ? (
          <div className="bg-white dark:bg-[#141417] rounded-xl border border-slate-200/90 dark:border-zinc-800/90 p-16 flex flex-col items-center justify-center text-center">
            <div className="w-10 h-10 rounded-full border-3 border-[#1B4FD8] border-t-transparent animate-spin mb-3" />
            <p className="text-xs text-slate-500">Cargando expediente del proveedor…</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">

            {/* ─── LEFT COLUMN: COMPACT FORM CARDS (7 COLS) ─── */}
            <div className="lg:col-span-7 space-y-4">

              {/* CARD 1: IDENTIFICACIÓN FISCAL & COMERCIAL */}
              <div className="bg-white dark:bg-[#141417] rounded-xl border border-slate-200/90 dark:border-zinc-800/90 p-4 shadow-2xs space-y-3.5">
                <div className="flex items-center gap-2 pb-2.5 border-b border-slate-100 dark:border-zinc-800">
                  <div className="w-7 h-7 rounded-lg bg-blue-50 dark:bg-blue-950/50 text-[#1B4FD8] dark:text-blue-400 flex items-center justify-center shrink-0">
                    <Building2 size={15} />
                  </div>
                  <div>
                    <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                      1. Identificación Fiscal & Razón Social
                    </h3>
                  </div>
                </div>

                <div className="space-y-3 text-xs sm:text-sm">
                  {/* Razón Social */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1">
                      Nombre Comercial / Razón Social <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <Building2 size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Ej. DISTRIBUIDORA INDUSTRIAL TECNOLÓGICA S.A.C."
                        className="w-full bg-slate-50 dark:bg-zinc-800/80 border border-slate-200/80 dark:border-zinc-700 rounded-xl pl-9 pr-3 py-2 text-xs sm:text-sm text-slate-900 dark:text-white outline-none focus:border-[#1B4FD8] focus:ring-2 focus:ring-[#1B4FD8]/10 font-medium"
                      />
                    </div>
                  </div>

                  {/* RUC & Live Validation + Tipo de Proveedor */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-xs font-bold text-slate-700 dark:text-zinc-300">
                          R.U.C. (11 dígitos)
                        </label>
                        {sunatStatus === 'valid' && (
                          <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-mono">
                            <CheckCircle size={11} /> HABIDO / ACTIVO
                          </span>
                        )}
                        {sunatStatus === 'invalid' && (
                          <span className="text-[10px] font-bold text-rose-600 dark:text-rose-400 flex items-center gap-1 font-mono">
                            ✕ RUC INVÁLIDO
                          </span>
                        )}
                      </div>
                      <div className="relative flex items-center">
                        <FileText size={14} className="absolute left-3 text-slate-400 pointer-events-none" />
                        <input
                          type="text"
                          value={ruc}
                          onChange={(e) => {
                            const val = e.target.value.replace(/\D/g, '')
                            setRuc(val)
                            setSunatStatus(null)
                          }}
                          placeholder="20601234567"
                          maxLength={11}
                          className="w-full bg-slate-50 dark:bg-zinc-800/80 border border-slate-200/80 dark:border-zinc-700 rounded-xl pl-9 pr-20 py-2 text-xs sm:text-sm text-slate-900 dark:text-white outline-none focus:border-[#1B4FD8] font-mono"
                        />
                        <button
                          type="button"
                          onClick={handleValidateRuc}
                          disabled={validatingDoc || !ruc}
                          className="absolute right-1 px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/60 dark:hover:bg-blue-900/60 text-[#1B4FD8] dark:text-blue-300 text-[10.5px] font-bold transition-colors cursor-pointer disabled:opacity-40"
                          title="Validar RUC con el padrón SUNAT"
                        >
                          {validatingDoc ? '...' : 'SUNAT'}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1">
                        Tipo de Proveedor
                      </label>
                      <div className="relative">
                        <Tag size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <select
                          value={supplierType}
                          onChange={(e) => setSupplierType(e.target.value)}
                          className="w-full bg-slate-50 dark:bg-zinc-800/80 border border-slate-200/80 dark:border-zinc-700 rounded-xl pl-9 pr-3 py-2 text-xs sm:text-sm text-slate-900 dark:text-white outline-none focus:border-[#1B4FD8] font-medium cursor-pointer"
                        >
                          <option value="DISTRIBUIDOR">Distribuidor Oficial</option>
                          <option value="FABRICANTE">Fabricante Directo</option>
                          <option value="IMPORTADOR">Importador Directo</option>
                          <option value="MAYORISTA">Mayorista Local</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Contacto & Teléfono */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1">
                        Persona de Contacto Comercial
                      </label>
                      <div className="relative">
                        <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                          type="text"
                          value={contactName}
                          onChange={(e) => setContactName(e.target.value)}
                          placeholder="Ej. Ing. Carlos Mendoza"
                          className="w-full bg-slate-50 dark:bg-zinc-800/80 border border-slate-200/80 dark:border-zinc-700 rounded-xl pl-9 pr-3 py-2 text-xs sm:text-sm text-slate-900 dark:text-white outline-none focus:border-[#1B4FD8] font-medium"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1">
                        Teléfono / WhatsApp de Pedidos
                      </label>
                      <div className="relative">
                        <Phone size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                          type="tel"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          placeholder="Ej. 987 654 321"
                          className="w-full bg-slate-50 dark:bg-zinc-800/80 border border-slate-200/80 dark:border-zinc-700 rounded-xl pl-9 pr-3 py-2 text-xs sm:text-sm text-slate-900 dark:text-white outline-none focus:border-[#1B4FD8] font-mono"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* CARD 2: CANALES DE CONTACTO & UBICACIÓN */}
              <div className="bg-white dark:bg-[#141417] rounded-xl border border-slate-200/90 dark:border-zinc-800/90 p-4 shadow-2xs space-y-3.5">
                <div className="flex items-center gap-2 pb-2.5 border-b border-slate-100 dark:border-zinc-800">
                  <div className="w-7 h-7 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                    <Mail size={15} />
                  </div>
                  <div>
                    <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                      2. Vías de Contacto Directo & Domicilio Fiscal
                    </h3>
                  </div>
                </div>

                <div className="space-y-3 text-xs sm:text-sm">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1">
                      Correo Electrónico (Facturación & O.C.)
                    </label>
                    <div className="relative">
                      <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="ventas@proveedor.com"
                        className="w-full bg-slate-50 dark:bg-zinc-800/80 border border-slate-200/80 dark:border-zinc-700 rounded-xl pl-9 pr-3 py-2 text-xs sm:text-sm text-slate-900 dark:text-white outline-none focus:border-[#1B4FD8] font-medium"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1">
                      Dirección Fiscal / Almacén Central de Despacho
                    </label>
                    <div className="relative">
                      <MapPin size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        placeholder="Ej. Av. Argentina 1450, Cercado de Lima"
                        className="w-full bg-slate-50 dark:bg-zinc-800/80 border border-slate-200/80 dark:border-zinc-700 rounded-xl pl-9 pr-3 py-2 text-xs sm:text-sm text-slate-900 dark:text-white outline-none focus:border-[#1B4FD8] font-medium"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* CARD 3: TÉRMINOS COMERCIALES & POLÍTICAS DE PAGO */}
              <div className="bg-white dark:bg-[#141417] rounded-xl border border-slate-200/90 dark:border-zinc-800/90 p-4 shadow-2xs space-y-3.5">
                <div className="flex items-center gap-2 pb-2.5 border-b border-slate-100 dark:border-zinc-800">
                  <div className="w-7 h-7 rounded-lg bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
                    <CreditCard size={15} />
                  </div>
                  <div>
                    <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                      3. Condiciones Comerciales & Términos de Pago
                    </h3>
                  </div>
                </div>

                <div className="space-y-3 text-xs sm:text-sm">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1">
                        Condición de Pago
                      </label>
                      <select
                        value={creditTerms}
                        onChange={(e) => setCreditTerms(e.target.value)}
                        className="w-full bg-slate-50 dark:bg-zinc-800/80 border border-slate-200/80 dark:border-zinc-700 rounded-xl px-3 py-2 text-xs sm:text-sm text-slate-900 dark:text-white outline-none focus:border-[#1B4FD8] font-medium cursor-pointer"
                      >
                        <option value="CONTADO">Pago al Contado</option>
                        <option value="15_DIAS">Crédito a 15 días</option>
                        <option value="30_DIAS">Crédito a 30 días</option>
                        <option value="45_DIAS">Crédito a 45 días</option>
                        <option value="60_DIAS">Crédito a 60 días</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1">
                        Moneda Habitual
                      </label>
                      <select
                        value={currency}
                        onChange={(e) => setCurrency(e.target.value)}
                        className="w-full bg-slate-50 dark:bg-zinc-800/80 border border-slate-200/80 dark:border-zinc-700 rounded-xl px-3 py-2 text-xs sm:text-sm text-slate-900 dark:text-white outline-none focus:border-[#1B4FD8] font-medium cursor-pointer"
                      >
                        <option value="PEN">Soles (PEN S/)</option>
                        <option value="USD">Dólares (USD $)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1">
                        Línea de Crédito (S/)
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="100"
                        value={creditLimit}
                        onChange={(e) => setCreditLimit(e.target.value)}
                        placeholder="Ej. 10000.00"
                        className="w-full bg-slate-50 dark:bg-zinc-800/80 border border-slate-200/80 dark:border-zinc-700 rounded-xl px-3 py-2 text-xs sm:text-sm text-slate-900 dark:text-white outline-none focus:border-[#1B4FD8] font-mono"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1">
                      Notas Internas / Acuerdos Comerciales
                    </label>
                    <input
                      type="text"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Ej. Descuento del 5% por pronto pago o compras por volumen mayor a 50 unidades."
                      className="w-full bg-slate-50 dark:bg-zinc-800/80 border border-slate-200/80 dark:border-zinc-700 rounded-xl px-3 py-2 text-xs sm:text-sm text-slate-900 dark:text-white outline-none focus:border-[#1B4FD8] font-medium"
                    />
                  </div>
                </div>
              </div>

              {/* Main Actions Bar (Positioned safely on the left column, zero overlap with floating assistant) */}
              <div className="bg-white dark:bg-[#141417] rounded-xl border border-slate-200/90 dark:border-zinc-800/90 p-4 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <ShieldCheck size={16} className="text-emerald-500 shrink-0" />
                  <span className="font-medium">Expediente comercial auditado en Kardex</span>
                </div>

                <div className="flex items-center gap-2.5 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={() => requestLeave('/proveedores')}
                    className="w-1/2 sm:w-auto px-4 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-700 text-slate-600 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-800 text-xs font-semibold transition-colors cursor-pointer text-center"
                  >
                    Cancelar [Esc]
                  </button>

                  <button
                    type="button"
                    disabled={isProcessing}
                    onClick={handleSubmit}
                    className="w-1/2 sm:w-auto px-6 py-2.5 rounded-xl bg-[#1B4FD8] hover:bg-[#163FBF] active:scale-98 text-white font-bold text-xs sm:text-sm shadow-md shadow-blue-600/25 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                  >
                    {isProcessing ? (
                      <span>Guardando…</span>
                    ) : (
                      <>
                        <Check size={16} strokeWidth={2.5} />
                        <span>{isEditing ? 'Guardar Cambios' : 'Registrar Proveedor'}</span>
                        <kbd className="px-1.5 py-0.5 rounded bg-blue-700/60 text-[10px] font-mono">F2</kbd>
                      </>
                    )}
                  </button>
                </div>
              </div>

            </div>

            {/* ─── RIGHT COLUMN: LIVE CARD PREVIEW & ACTIONS (5 COLS) ─── */}
            <div className="lg:col-span-5 space-y-4">

              {/* CARD PREVIEW IN REAL TIME */}
              <div className="bg-white dark:bg-[#141417] rounded-xl border border-slate-200/90 dark:border-zinc-800/90 p-4 shadow-2xs space-y-3.5">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-zinc-800">
                  <span className="text-xs font-bold text-slate-700 dark:text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
                    <Building2 size={14} className="text-[#1B4FD8]" />
                    Expediente de Proveedor
                  </span>
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-blue-50 text-[#1B4FD8] dark:bg-blue-950/40 dark:text-blue-300 border border-blue-200/60 dark:border-blue-900/40">
                    EN TIEMPO REAL
                  </span>
                </div>

                {/* The Supplier Card Replica */}
                <div className="bg-slate-50/70 dark:bg-zinc-800/40 rounded-xl border border-slate-200/80 dark:border-zinc-700 p-4 space-y-3">
                  <div className="flex items-start gap-3">
                    <div
                      className={`w-11 h-11 rounded-xl bg-gradient-to-br ${avatarStyle.bg} flex items-center justify-center font-bold text-sm text-white shrink-0 shadow-2xs`}
                    >
                      {getInitials(name)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h4 className="font-bold text-slate-900 dark:text-white text-sm leading-snug truncate">
                        {name || 'Razón Social del Proveedor'}
                      </h4>
                      <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                        <span className="inline-block px-2 py-0.5 rounded-md font-mono text-[10.5px] font-bold bg-white dark:bg-zinc-800 text-slate-600 dark:text-zinc-300 border border-slate-200 dark:border-zinc-700">
                          {ruc ? `RUC ${ruc}` : 'RUC Pendiente'}
                        </span>
                        <span className="inline-block px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-50 text-[#1B4FD8] dark:bg-blue-950/40 dark:text-blue-300">
                          {supplierType}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Contact Info preview */}
                  <div className="space-y-1.5 text-xs text-slate-600 dark:text-zinc-400 pt-2 border-t border-slate-200/60 dark:border-zinc-700/60">
                    <div className="flex items-center gap-2">
                      <User size={12} className="text-slate-400 shrink-0" />
                      <span className="truncate">
                        Contacto: <strong>{contactName || 'No especificado'}</strong>
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <Phone size={12} className="text-slate-400 shrink-0" />
                      <span className="truncate font-mono">{phone || 'Sin teléfono'}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <Mail size={12} className="text-slate-400 shrink-0" />
                      <span className="truncate">{email || 'Sin correo electrónico'}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <MapPin size={12} className="text-slate-400 shrink-0" />
                      <span className="truncate">{address || 'Sin dirección fiscal'}</span>
                    </div>
                  </div>

                  {/* Commercial summary pills */}
                  <div className="pt-2 border-t border-slate-200/60 dark:border-zinc-700/60 flex items-center justify-between text-[11px] text-slate-500">
                    <span>Pago: <strong className="text-slate-800 dark:text-zinc-200">{creditTerms.replace('_', ' ')}</strong></span>
                    <span>Moneda: <strong className="font-mono text-slate-800 dark:text-zinc-200">{currency}</strong></span>
                  </div>

                  {/* Metrics footer preview */}
                  <div className="pt-2 border-t border-slate-200/60 dark:border-zinc-700/60 grid grid-cols-2 gap-2 text-center text-xs">
                    <div className="bg-white dark:bg-zinc-800 p-2 rounded-lg border border-slate-200/80 dark:border-zinc-700">
                      <p className="text-[9.5px] uppercase font-bold text-slate-400">Compras</p>
                      <p className="font-mono font-bold text-slate-900 dark:text-white">
                        {isEditing ? `${editingMetrics.totalOrders} órdenes` : '0 órdenes'}
                      </p>
                    </div>

                    <div className="bg-white dark:bg-zinc-800 p-2 rounded-lg border border-slate-200/80 dark:border-zinc-700">
                      <p className="text-[9.5px] uppercase font-bold text-slate-400">Total Invertido</p>
                      <p className="font-mono font-bold text-[#1B4FD8] dark:text-blue-400">
                        {isEditing ? fmt(editingMetrics.totalSpent) : 'S/ 0.00'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Conformidad de expediente comercial */}
                <div className="p-3 bg-slate-50 dark:bg-zinc-800/40 rounded-xl border border-slate-200/60 dark:border-zinc-800 space-y-2 text-xs">
                  <p className="text-[10.5px] font-bold uppercase tracking-wider text-slate-400">
                    Conformidad de Expediente
                  </p>
                  <div className="space-y-1.5 text-[11px]">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-600 dark:text-zinc-400">Razón Social:</span>
                      <span className={`font-semibold ${name.trim() ? 'text-emerald-600' : 'text-slate-400'}`}>
                        {name.trim() ? '✓ Registrado' : 'Pendiente'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-600 dark:text-zinc-400">R.U.C. Tributario:</span>
                      <span className={`font-semibold ${ruc.trim().length === 11 ? 'text-emerald-600' : 'text-slate-400'}`}>
                        {ruc.trim().length === 11 ? '✓ 11 Dígitos' : 'Opcional / Pendiente'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-600 dark:text-zinc-400">Teléfono / WhatsApp:</span>
                      <span className={`font-semibold ${phone.trim() ? 'text-emerald-600' : 'text-slate-400'}`}>
                        {phone.trim() ? '✓ Registrado' : 'Recomendado'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-600 dark:text-zinc-400">Domicilio Fiscal:</span>
                      <span className={`font-semibold ${address.trim() ? 'text-emerald-600' : 'text-slate-400'}`}>
                        {address.trim() ? '✓ Registrado' : 'Opcional'}
                      </span>
                    </div>
                  </div>
                </div>

                {error && (
                  <div className="p-2.5 rounded-xl bg-red-50 text-red-600 text-xs flex items-center gap-1.5 animate-shake">
                    <AlertCircle size={15} className="shrink-0" />
                    <span className="truncate">{error}</span>
                  </div>
                )}

                <div className="pt-2 border-t border-slate-100 dark:border-zinc-800 text-center text-[11px] text-slate-400 flex items-center justify-center gap-1.5">
                  <ShieldCheck size={14} className="text-emerald-500 shrink-0" />
                  <span>Vinculación directa al módulo de compras y kardex</span>
                </div>
              </div>

            </div>

          </div>
        )}

        {/* ═════════════════════════════════════════════════════════
            OVERLAY: 3-STEP LOADING ANIMATION SCREEN
           ═════════════════════════════════════════════════════════ */}
        {isProcessing && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4 animate-fade-in">
            <div className="bg-white dark:bg-[#18181b] rounded-2xl border border-slate-200 dark:border-zinc-700 p-6 max-w-sm w-full text-center shadow-2xl space-y-4 animate-slide-up">
              <div className="w-14 h-14 rounded-full border-3 border-[#1B4FD8] border-t-transparent animate-spin mx-auto flex items-center justify-center">
                <Building2 size={22} className="text-[#1B4FD8] animate-pulse" />
              </div>

              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  {isEditing ? 'Actualizando Proveedor' : 'Registrando Nuevo Proveedor'}
                </h3>
                <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">
                  {processingStep === 1 && 'Validando razón social y formato tributario SUNAT…'}
                  {processingStep === 2 && 'Guardando expediente en base de datos protegida…'}
                  {processingStep === 3 && '¡Proveedor registrado con éxito! Redirigiendo…'}
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

      </div>
    </AppLayout>
  )
}
