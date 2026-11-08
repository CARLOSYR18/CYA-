import { useState, useEffect, useMemo } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import {
  ArrowLeft, Building2, User, Phone, Mail, MapPin, FileText,
  Check, AlertCircle, Sparkles, ShoppingBag, DollarSign,
  ShieldCheck, Eye, MessageCircle, Copy, ExternalLink,
  CreditCard, Truck, Clock, CheckCircle2, Home, X
} from 'lucide-react'
import AppLayout from '../components/layout/AppLayout'
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
  const [notes, setNotes] = useState('')

  // UI States
  const [loadingInitial, setLoadingInitial] = useState(isEditing)
  const [isProcessing, setIsProcessing] = useState(false)
  const [processingStep, setProcessingStep] = useState(0) // 1: 35%, 2: 75%, 3: 100%
  const [error, setError] = useState('')

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
  const handleSubmit = async (e) => {
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
  }

  return (
    <AppLayout title={isEditing ? 'Editar Proveedor' : 'Nuevo Proveedor'}>
      <div className="max-w-6xl mx-auto space-y-3.5 pb-8 animate-fade-in">

        {/* ═════════════════════════════════════════════════════════
            0. TOP BAR (COMPACT EXECUTIVE HEADER & BREADCRUMB)
           ═════════════════════════════════════════════════════════ */}
        <div className="bg-white dark:bg-[#141417] rounded-2xl border border-slate-200/80 dark:border-zinc-800 p-3.5 sm:p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate('/proveedores')}
              className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-600 dark:text-zinc-200 flex items-center justify-center transition-colors cursor-pointer"
              title="Volver a Directorio de Proveedores"
            >
              <ArrowLeft size={16} />
            </button>
            <div>
              <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium">
                <span className="hover:text-blue-600 cursor-pointer" onClick={() => navigate('/proveedores')}>
                  Proveedores
                </span>
                <span>/</span>
                <span className="text-blue-600 dark:text-blue-400 font-semibold">
                  {isEditing ? 'Editar Registro' : 'Nuevo Proveedor'}
                </span>
              </div>
              <h1 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white tracking-tight">
                {isEditing ? 'Editar Datos del Proveedor' : 'Registrar Nuevo Proveedor Comercial'}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <button
              type="button"
              onClick={() => navigate('/proveedores')}
              className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-zinc-700 text-slate-600 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-800 text-xs font-semibold transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isProcessing}
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-95 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm shadow-blue-500/25 transition-all cursor-pointer disabled:opacity-60"
            >
              <Check size={15} strokeWidth={2.5} />
              <span>{isEditing ? 'Guardar Cambios' : 'Guardar y Registrar Proveedor'}</span>
            </button>
          </div>
        </div>

        {/* ═════════════════════════════════════════════════════════
            1. MAIN FORM GRID: LEFT FORM (7 COLS) + RIGHT PREVIEW (5 COLS)
           ═════════════════════════════════════════════════════════ */}
        {loadingInitial ? (
          <div className="bg-white dark:bg-[#141417] rounded-2xl border border-slate-200/80 dark:border-zinc-800 p-16 flex flex-col items-center justify-center text-center">
            <div className="w-10 h-10 rounded-full border-3 border-blue-600 border-t-transparent animate-spin mb-3" />
            <p className="text-xs text-slate-500">Cargando datos del proveedor…</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 items-start">

            {/* ─── LEFT COLUMN: COMPACT FORM CARDS (7 COLS) ─── */}
            <div className="lg:col-span-7 space-y-3.5">

              {/* CARD 1: IDENTIFICACIÓN FISCAL & COMERCIAL */}
              <div className="bg-white dark:bg-[#141417] rounded-2xl border border-slate-200/80 dark:border-zinc-800 p-4 shadow-xs space-y-3">
                <div className="flex items-center gap-2 pb-2.5 border-b border-slate-100 dark:border-zinc-800">
                  <div className="w-7 h-7 rounded-lg bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                    <Building2 size={15} />
                  </div>
                  <div>
                    <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                      1. Identificación Fiscal & Comercial
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
                        placeholder="Ej. Distribuidora Tecnológica S.A.C."
                        className="w-full bg-slate-50 dark:bg-zinc-800/80 border border-slate-200/80 dark:border-zinc-700 rounded-xl pl-9 pr-3 py-2 text-xs sm:text-sm text-slate-900 dark:text-white outline-none focus:border-blue-600 font-medium"
                      />
                    </div>
                  </div>

                  {/* RUC & Contacto en 2 columnas */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1">
                        R.U.C. (11 dígitos)
                      </label>
                      <div className="relative">
                        <FileText size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                          type="text"
                          value={ruc}
                          onChange={(e) => setRuc(e.target.value)}
                          placeholder="20601234567"
                          maxLength={11}
                          className="w-full bg-slate-50 dark:bg-zinc-800/80 border border-slate-200/80 dark:border-zinc-700 rounded-xl pl-9 pr-3 py-2 text-xs sm:text-sm text-slate-900 dark:text-white outline-none focus:border-blue-600 font-mono"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1">
                        Persona de Contacto
                      </label>
                      <div className="relative">
                        <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                          type="text"
                          value={contactName}
                          onChange={(e) => setContactName(e.target.value)}
                          placeholder="Ej. Ing. Carlos Mendoza"
                          className="w-full bg-slate-50 dark:bg-zinc-800/80 border border-slate-200/80 dark:border-zinc-700 rounded-xl pl-9 pr-3 py-2 text-xs sm:text-sm text-slate-900 dark:text-white outline-none focus:border-blue-600 font-medium"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* CARD 2: CANALES DE CONTACTO & UBICACIÓN */}
              <div className="bg-white dark:bg-[#141417] rounded-2xl border border-slate-200/80 dark:border-zinc-800 p-4 shadow-xs space-y-3">
                <div className="flex items-center gap-2 pb-2.5 border-b border-slate-100 dark:border-zinc-800">
                  <div className="w-7 h-7 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                    <Phone size={15} />
                  </div>
                  <div>
                    <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                      2. Vías de Contacto & Dirección Fiscal
                    </h3>
                  </div>
                </div>

                <div className="space-y-3 text-xs sm:text-sm">
                  {/* Teléfono & Correo en 2 columnas */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1">
                        Teléfono / WhatsApp
                      </label>
                      <div className="relative">
                        <Phone size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                          type="tel"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          placeholder="Ej. 987 654 321"
                          className="w-full bg-slate-50 dark:bg-zinc-800/80 border border-slate-200/80 dark:border-zinc-700 rounded-xl pl-9 pr-3 py-2 text-xs sm:text-sm text-slate-900 dark:text-white outline-none focus:border-blue-600 font-mono"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1">
                        Correo Electrónico
                      </label>
                      <div className="relative">
                        <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="ventas@proveedor.com"
                          className="w-full bg-slate-50 dark:bg-zinc-800/80 border border-slate-200/80 dark:border-zinc-700 rounded-xl pl-9 pr-3 py-2 text-xs sm:text-sm text-slate-900 dark:text-white outline-none focus:border-blue-600 font-medium"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Dirección Fiscal */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1">
                      Dirección Fiscal / Almacén Central
                    </label>
                    <div className="relative">
                      <MapPin size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        placeholder="Ej. Av. Argentina 1450, Lima"
                        className="w-full bg-slate-50 dark:bg-zinc-800/80 border border-slate-200/80 dark:border-zinc-700 rounded-xl pl-9 pr-3 py-2 text-xs sm:text-sm text-slate-900 dark:text-white outline-none focus:border-blue-600 font-medium"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* CARD 3: TÉRMINOS COMERCIALES & NOTAS */}
              <div className="bg-white dark:bg-[#141417] rounded-2xl border border-slate-200/80 dark:border-zinc-800 p-4 shadow-xs space-y-3">
                <div className="flex items-center gap-2 pb-2.5 border-b border-slate-100 dark:border-zinc-800">
                  <div className="w-7 h-7 rounded-lg bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
                    <CreditCard size={15} />
                  </div>
                  <div>
                    <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                      3. Condiciones Comerciales & Notas Internas
                    </h3>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs sm:text-sm">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1">
                      Condición de Pago Habitual
                    </label>
                    <select
                      value={creditTerms}
                      onChange={(e) => setCreditTerms(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-zinc-800/80 border border-slate-200/80 dark:border-zinc-700 rounded-xl px-3 py-2 text-xs sm:text-sm text-slate-900 dark:text-white outline-none focus:border-blue-600 font-medium cursor-pointer"
                    >
                      <option value="CONTADO">Pago al Contado</option>
                      <option value="15_DIAS">Crédito a 15 días</option>
                      <option value="30_DIAS">Crédito a 30 días</option>
                      <option value="60_DIAS">Crédito a 60 días</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1">
                      Notas Internas / Observaciones
                    </label>
                    <input
                      type="text"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Ej. Descuento por compras mayores a 100 uds."
                      className="w-full bg-slate-50 dark:bg-zinc-800/80 border border-slate-200/80 dark:border-zinc-700 rounded-xl px-3 py-2 text-xs sm:text-sm text-slate-900 dark:text-white outline-none focus:border-blue-600 font-medium"
                    />
                  </div>
                </div>
              </div>

            </div>

            {/* ─── RIGHT COLUMN: LIVE CARD PREVIEW & ACTIONS (5 COLS) ─── */}
            <div className="lg:col-span-5 space-y-3.5">

              {/* CARD PREVIEW IN REAL TIME */}
              <div className="bg-white dark:bg-[#141417] rounded-2xl border border-slate-200/80 dark:border-zinc-800 p-4 shadow-xs space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-zinc-800">
                  <div className="flex items-center gap-1.5">
                    <Sparkles size={14} className="text-amber-500" />
                    <span className="text-xs font-bold text-slate-700 dark:text-zinc-300">
                      Vista Previa de Ficha
                    </span>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300">
                    En Tiempo Real
                  </span>
                </div>

                {/* The Supplier Card Replica */}
                <div className="bg-slate-50/70 dark:bg-zinc-800/40 rounded-2xl border border-slate-200/80 dark:border-zinc-700 p-4 space-y-3">
                  <div className="flex items-start gap-3">
                    <div
                      className={`w-11 h-11 rounded-2xl bg-gradient-to-br ${avatarStyle.bg} flex items-center justify-center font-black text-sm text-white shrink-0 shadow-xs`}
                    >
                      {getInitials(name)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h4 className="font-bold text-slate-900 dark:text-white text-sm leading-snug truncate">
                        {name || 'Razón Social del Proveedor'}
                      </h4>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="inline-block px-2 py-0.5 rounded-md font-mono text-[10.5px] font-bold bg-white dark:bg-zinc-800 text-slate-600 dark:text-zinc-300 border border-slate-200 dark:border-zinc-700">
                          {ruc ? `RUC ${ruc}` : 'RUC Pendiente'}
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

                  {/* Metrics footer preview */}
                  <div className="pt-2 border-t border-slate-200/60 dark:border-zinc-700/60 grid grid-cols-2 gap-2 text-center text-xs">
                    <div className="bg-white dark:bg-zinc-800 p-2 rounded-xl border border-slate-200/80 dark:border-zinc-700">
                      <p className="text-[10px] uppercase font-bold text-slate-400">Compras</p>
                      <p className="font-mono font-bold text-slate-900 dark:text-white">
                        {isEditing ? `${editingMetrics.totalOrders} órdenes` : '0 órdenes'}
                      </p>
                    </div>

                    <div className="bg-white dark:bg-zinc-800 p-2 rounded-xl border border-slate-200/80 dark:border-zinc-700">
                      <p className="text-[10px] uppercase font-bold text-slate-400">Total Invertido</p>
                      <p className="font-mono font-bold text-blue-600 dark:text-blue-400">
                        {isEditing ? fmt(editingMetrics.totalSpent) : 'S/ 0.00'}
                      </p>
                    </div>
                  </div>
                </div>

                {error && (
                  <div className="p-2.5 rounded-xl bg-red-50 text-red-600 text-xs flex items-center gap-1.5">
                    <AlertCircle size={15} className="shrink-0" />
                    <span className="truncate">{error}</span>
                  </div>
                )}

                {/* Main Action Button */}
                <div className="space-y-2 pt-2">
                  <button
                    type="button"
                    disabled={isProcessing}
                    onClick={handleSubmit}
                    className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-98 text-white font-bold text-xs sm:text-sm shadow-md shadow-blue-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                  >
                    {isProcessing ? (
                      <span>Guardando proveedor…</span>
                    ) : (
                      <>
                        <Check size={16} strokeWidth={3} />
                        <span>{isEditing ? 'Guardar Cambios' : 'Registrar Proveedor'}</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => navigate('/proveedores')}
                    className="w-full py-2.5 rounded-xl border border-slate-200 dark:border-zinc-700 text-slate-600 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-800 text-xs font-semibold transition-colors cursor-pointer text-center"
                  >
                    Cancelar y Regresar
                  </button>
                </div>

                <div className="pt-2 text-center text-[10.5px] text-slate-400 flex items-center justify-center gap-1">
                  <ShieldCheck size={13} className="text-emerald-500" />
                  <span>Vinculación instantánea al catálogo de abastecimiento</span>
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
              <div className="w-14 h-14 rounded-full border-3 border-blue-600 border-t-transparent animate-spin mx-auto flex items-center justify-center">
                <Building2 size={22} className="text-blue-600 animate-pulse" />
              </div>

              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-white">
                  {isEditing ? 'Actualizando Proveedor' : 'Registrando Nuevo Proveedor'}
                </h3>
                <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">
                  {processingStep === 1 && 'Validando razón social y formato tributario…'}
                  {processingStep === 2 && 'Guardando expediente en base de datos protegida…'}
                  {processingStep === 3 && '¡Proveedor guardado con éxito! Redirigiendo…'}
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
