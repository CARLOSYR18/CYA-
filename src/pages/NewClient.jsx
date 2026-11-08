import { useState, useEffect, useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft, Users, User, Phone, Mail, MapPin, Building2,
  FileText, Check, AlertCircle, Sparkles, MessageCircle,
  Crown, UserCheck, UserPlus, ShieldCheck, X, ChevronRight,
  Home, CheckCircle2, AlertTriangle
} from 'lucide-react'
import AppLayout from '../components/layout/AppLayout'
import { useFormLeaveGuard } from '../hooks/useFormLeaveGuard'
import { clientsService } from '../services/clientsService'

const getInitials = (name = '') => {
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[1][0]).toUpperCase()
}

export default function NewClient() {
  const navigate = useNavigate()
  const { id } = useParams()
  const isEditing = Boolean(id)

  // Form State
  const [name, setName] = useState('')
  const [docType, setDocType] = useState('DNI') // 'DNI' | 'RUC' | 'CE' | 'OTRO'
  const [docNumber, setDocNumber] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [address, setAddress] = useState('')
  const [reference, setReference] = useState('')
  const [suggestedSegment, setSuggestedSegment] = useState('NUEVO') // 'LEAD' | 'NUEVO' | 'RECURRENTE' | 'VIP'
  const [notes, setNotes] = useState('')

  // UI States
  const [loadingInitial, setLoadingInitial] = useState(isEditing)
  const [isProcessing, setIsProcessing] = useState(false)
  const [processingStep, setProcessingStep] = useState(0) // 0: idle, 1: validation, 2: saving, 3: completed
  const [error, setError] = useState('')

  // Detección de cambios sin guardar en el cliente
  const isDirty = useMemo(() => {
    if (isProcessing) return false
    return Boolean(
      name.trim() ||
      docNumber.trim() ||
      phone.trim() ||
      email.trim() ||
      address.trim() ||
      reference.trim() ||
      notes.trim()
    )
  }, [isProcessing, name, docNumber, phone, email, address, reference, notes])

  const { requestLeave, DiscardModalComponent } = useFormLeaveGuard({
    isDirty,
    defaultRedirectUrl: '/clientes',
    modalTitle: isEditing ? '¿Descartar cambios del cliente?' : '¿Descartar nuevo cliente?',
    modalDescription: 'Tienes información ingresada en la ficha del cliente. Si sales ahora o recargas la pantalla, los datos ingresados se perderán.'
  })

  // Load existing client if editing
  useEffect(() => {
    if (!id) return
    async function fetchClient() {
      try {
        setLoadingInitial(true)
        const data = await clientsService.get(id)
        if (data) {
          setName(data.name || '')
          setPhone(data.phone || '')
          const doc = data.ruc || data.document_number || ''
          setDocNumber(doc)
          if (doc?.length === 11) setDocType('RUC')
          else if (doc?.length === 8) setDocType('DNI')
          setEmail(data.email || '')
          setAddress(data.address || '')
          setNotes(data.notes || '')
        }
      } catch (err) {
        setError('No se pudo cargar la información del cliente')
      } finally {
        setLoadingInitial(false)
      }
    }
    fetchClient()
  }, [id])

  // Handle Form Submission with Phase Animation
  const handleSubmit = async (e) => {
    e?.preventDefault()
    setError('')

    const trimmedName = name.trim()
    if (!trimmedName) {
      setError('Por favor, ingresa el nombre o razón social del cliente.')
      return
    }

    if (phone && phone.replace(/\D/g, '').length < 6) {
      setError('El número telefónico debe tener al menos 6 dígitos válidos.')
      return
    }

    // Begin multi-step loading animation
    setIsProcessing(true)
    setProcessingStep(1)

    try {
      // Step 1: Validating contact & formats
      await new Promise((r) => setTimeout(r, 450))
      setProcessingStep(2)

      const fullAddress = [address.trim(), reference.trim() ? `(Ref: ${reference.trim()})` : '']
        .filter(Boolean)
        .join(' ')

      const finalNotes = [
        suggestedSegment !== 'NUEVO' ? `[Segmento: ${suggestedSegment}]` : '',
        notes.trim()
      ]
        .filter(Boolean)
        .join(' - ')

      const payload = {
        name: trimmedName,
        phone: phone.trim() || null,
        ruc: docNumber.trim() || null,
        email: email.trim() || null,
        address: fullAddress || null,
        notes: finalNotes || null
      }

      if (isEditing) {
        await clientsService.update(id, payload)
      } else {
        await clientsService.create(payload)
      }

      // Step 3: Success state
      setProcessingStep(3)
      await new Promise((r) => setTimeout(r, 600))

      setIsProcessing(false)
      navigate('/clientes', {
        state: {
          created: true,
          clientName: trimmedName,
          isEditing
        }
      })
    } catch (err) {
      setIsProcessing(false)
      setProcessingStep(0)
      setError(err.message || 'Error al guardar la información del cliente')
    }
  }

  return (
    <AppLayout title={isEditing ? 'Editar Cliente' : 'Nuevo Cliente'}>
      <div className="max-w-[1440px] mx-auto space-y-4 pb-12 animate-fade-in">

        {/* ═════════════════════════════════════════════════════════
            0. TOP HEADER BAR (BREADCRUMB & TITLE)
           ═════════════════════════════════════════════════════════ */}
        <div className="bg-white dark:bg-[#141417] rounded-2xl border border-slate-200/80 dark:border-zinc-800 px-5 py-3.5 shadow-xs flex flex-wrap items-center justify-between gap-3.5">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => requestLeave('/clientes')}
              className="w-10 h-10 rounded-xl bg-slate-50 hover:bg-slate-100 dark:bg-zinc-800 dark:hover:bg-zinc-700 border border-slate-200/80 dark:border-zinc-700 flex items-center justify-center text-slate-600 dark:text-zinc-200 transition-colors cursor-pointer shrink-0 shadow-2xs"
              title="Volver a Cartera de Clientes"
            >
              <ArrowLeft size={17} />
            </button>

            <div>
              <div className="flex items-center gap-1.5 text-xs text-slate-400 dark:text-zinc-500 font-medium">
                <Home size={12} />
                <span>›</span>
                <span className="cursor-pointer hover:underline" onClick={() => requestLeave('/clientes')}>
                  Cartera de Clientes
                </span>
                <span>›</span>
                <span className="font-semibold text-slate-700 dark:text-zinc-300">
                  {isEditing ? 'Editar Cliente' : 'Registrar Nuevo Cliente'}
                </span>
              </div>
              <h1 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white tracking-tight leading-none mt-0.5">
                {isEditing ? 'Editar Datos del Cliente' : 'Registrar Nuevo Cliente en Cartera'}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => requestLeave('/clientes')}
              className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-slate-700 dark:text-zinc-200 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-zinc-700 transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isProcessing}
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-95 text-white text-xs font-bold flex items-center gap-2 shadow-sm shadow-blue-500/25 transition-all cursor-pointer disabled:opacity-60"
            >
              <Check size={15} strokeWidth={2.5} />
              <span>{isEditing ? 'Guardar Cambios' : 'Guardar y Registrar Cliente'}</span>
            </button>
          </div>
        </div>

        {/* ═════════════════════════════════════════════════════════
            1. MAIN FORM GRID: LEFT (8 COLS) + RIGHT PREVIEW (4 COLS)
           ═════════════════════════════════════════════════════════ */}
        {loadingInitial ? (
          <div className="bg-white dark:bg-[#141417] rounded-2xl border border-slate-200/80 dark:border-zinc-800 p-16 flex flex-col items-center justify-center text-center">
            <div className="w-10 h-10 rounded-full border-2 border-blue-600 border-t-transparent animate-spin mb-3" />
            <p className="text-xs text-slate-500">Cargando expediente comercial…</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            
            {/* ─── LEFT COLUMN: FORM SECTIONS (8 COLS) ─── */}
            <div className="lg:col-span-8 space-y-4">
              
              {/* SECTION 1: Identificación & Datos de Contacto */}
              <div className="bg-white dark:bg-[#141417] rounded-2xl border border-slate-200/80 dark:border-zinc-800 p-5 shadow-xs space-y-4">
                <div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-zinc-800">
                  <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                    <User size={16} />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                      1. Identificación y Contacto Directo
                    </h2>
                    <p className="text-[11px] text-slate-400 dark:text-zinc-500">
                      Datos personales, razón social y vías de comunicación oficial.
                    </p>
                  </div>
                </div>

                <div className="space-y-3.5">
                  {/* Nombre Completo */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1">
                      Nombre Completo o Razón Social <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <User size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        required
                        type="text"
                        placeholder="Ej. Distribuidora Lima S.A.C. / Juan Pérez Morales"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200/90 dark:border-zinc-700 bg-slate-50/60 dark:bg-zinc-800/60 text-xs sm:text-sm font-medium text-slate-900 dark:text-white placeholder:text-slate-400 focus:bg-white dark:focus:bg-zinc-800 focus:border-blue-600 focus:ring-2 focus:ring-blue-500/10 outline-none transition-all"
                      />
                    </div>
                  </div>

                  {/* Documento (Tipo + Número) y Teléfono */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    {/* Documento */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-xs font-bold text-slate-700 dark:text-zinc-300">
                          Identificación Fiscal
                        </label>
                        {/* Selector de tipo */}
                        <div className="flex items-center gap-1 text-[10px] font-bold">
                          {['DNI', 'RUC', 'CE'].map((t) => (
                            <button
                              key={t}
                              type="button"
                              onClick={() => setDocType(t)}
                              className={`px-1.5 py-0.5 rounded cursor-pointer transition-colors ${
                                docType === t
                                  ? 'bg-blue-600 text-white'
                                  : 'text-slate-400 hover:text-slate-700 dark:hover:text-zinc-200'
                              }`}
                            >
                              {t}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="relative">
                        <Building2 size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                          type="text"
                          placeholder={docType === 'RUC' ? 'Ej. 20601234567 (11 dígitos)' : 'Ej. 72345678 (8 dígitos)'}
                          value={docNumber}
                          onChange={(e) => setDocNumber(e.target.value)}
                          className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200/90 dark:border-zinc-700 bg-slate-50/60 dark:bg-zinc-800/60 text-xs sm:text-sm font-mono font-medium text-slate-900 dark:text-white placeholder:text-slate-400 focus:bg-white dark:focus:bg-zinc-800 focus:border-blue-600 focus:ring-2 focus:ring-blue-500/10 outline-none transition-all"
                        />
                      </div>
                    </div>

                    {/* Teléfono / WhatsApp */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1">
                        Teléfono / WhatsApp de Contacto
                      </label>
                      <div className="relative">
                        <Phone size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                          type="tel"
                          placeholder="Ej. 987 654 321"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200/90 dark:border-zinc-700 bg-slate-50/60 dark:bg-zinc-800/60 text-xs sm:text-sm font-mono font-medium text-slate-900 dark:text-white placeholder:text-slate-400 focus:bg-white dark:focus:bg-zinc-800 focus:border-blue-600 focus:ring-2 focus:ring-blue-500/10 outline-none transition-all"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Correo Electrónico */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1">
                      Correo Electrónico (Facturación / Cotizaciones)
                    </label>
                    <div className="relative">
                      <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="email"
                        placeholder="Ej. contacto@empresa.com / cliente@gmail.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200/90 dark:border-zinc-700 bg-slate-50/60 dark:bg-zinc-800/60 text-xs sm:text-sm font-medium text-slate-900 dark:text-white placeholder:text-slate-400 focus:bg-white dark:focus:bg-zinc-800 focus:border-blue-600 focus:ring-2 focus:ring-blue-500/10 outline-none transition-all"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* SECTION 2: Despacho & Domicilio Fiscal */}
              <div className="bg-white dark:bg-[#141417] rounded-2xl border border-slate-200/80 dark:border-zinc-800 p-5 shadow-xs space-y-4">
                <div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-zinc-800">
                  <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                    <MapPin size={16} />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                      2. Dirección de Entrega & Despacho
                    </h2>
                    <p className="text-[11px] text-slate-400 dark:text-zinc-500">
                      Ubicación para envío de pedidos, facturas físicas y entregas a domicilio.
                    </p>
                  </div>
                </div>

                <div className="space-y-3.5">
                  {/* Dirección */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1">
                      Dirección Completa (Calle, Avenida, Jr., Número)
                    </label>
                    <div className="relative">
                      <MapPin size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Ej. Av. Javier Prado Este 2450, Urb. Santa Catalina, Lima"
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200/90 dark:border-zinc-700 bg-slate-50/60 dark:bg-zinc-800/60 text-xs sm:text-sm font-medium text-slate-900 dark:text-white placeholder:text-slate-400 focus:bg-white dark:focus:bg-zinc-800 focus:border-blue-600 focus:ring-2 focus:ring-blue-500/10 outline-none transition-all"
                      />
                    </div>
                  </div>

                  {/* Referencia */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1">
                      Referencia de Entrega (Opcional)
                    </label>
                    <input
                      type="text"
                      placeholder="Ej. Frente a la estación del tren, portón negro, timbre 2B"
                      value={reference}
                      onChange={(e) => setReference(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200/90 dark:border-zinc-700 bg-slate-50/60 dark:bg-zinc-800/60 text-xs sm:text-sm font-medium text-slate-900 dark:text-white placeholder:text-slate-400 focus:bg-white dark:focus:bg-zinc-800 focus:border-blue-600 focus:ring-2 focus:ring-blue-500/10 outline-none transition-all"
                    />
                  </div>
                </div>
              </div>

              {/* SECTION 3: Segmentación & Preferencias Comerciales */}
              <div className="bg-white dark:bg-[#141417] rounded-2xl border border-slate-200/80 dark:border-zinc-800 p-5 shadow-xs space-y-4">
                <div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-zinc-800">
                  <div className="w-8 h-8 rounded-xl bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
                    <FileText size={16} />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                      3. Segmento CRM & Notas Comerciales
                    </h2>
                    <p className="text-[11px] text-slate-400 dark:text-zinc-500">
                      Clasificación inicial del cliente y preferencias para atención comercial.
                    </p>
                  </div>
                </div>

                <div className="space-y-3.5">
                  {/* Selector de Segmento Inicial */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-2">
                      Clasificación Comercial Sugerida
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                      {[
                        { id: 'LEAD', label: 'Prospecto', desc: 'Sin compras aún', icon: User, color: 'text-slate-500' },
                        { id: 'NUEVO', label: 'Nuevo', desc: 'Primera compra', icon: UserPlus, color: 'text-emerald-500' },
                        { id: 'RECURRENTE', label: 'Recurrente', desc: 'Cliente habitual', icon: UserCheck, color: 'text-blue-500' },
                        { id: 'VIP', label: 'VIP Mayorista', desc: 'Alto volumen', icon: Crown, color: 'text-amber-500' },
                      ].map((seg) => {
                        const isSelected = suggestedSegment === seg.id
                        const SegIcon = seg.icon
                        return (
                          <button
                            key={seg.id}
                            type="button"
                            onClick={() => setSuggestedSegment(seg.id)}
                            className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                              isSelected
                                ? 'bg-blue-50/70 dark:bg-blue-950/30 border-blue-500 text-blue-700 dark:text-blue-300 shadow-2xs ring-1 ring-blue-500/30'
                                : 'bg-slate-50/50 dark:bg-zinc-800/40 border-slate-200/80 dark:border-zinc-700 text-slate-600 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800'
                            }`}
                          >
                            <div className="flex items-center gap-1.5 mb-1">
                              <SegIcon size={14} className={isSelected ? 'text-blue-600 dark:text-blue-400' : seg.color} />
                              <span className="text-xs font-bold">{seg.label}</span>
                            </div>
                            <p className="text-[10px] text-slate-400 dark:text-zinc-400 leading-tight">
                              {seg.desc}
                            </p>
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  {/* Notas Comerciales */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1">
                      Instrucciones & Preferencias Comerciales
                    </label>
                    <textarea
                      rows={3}
                      placeholder="Ej. Solicita factura obligatoria, prefiere pagos por transferencia BCP, atiende llamadas solo de 9 a 1 pm..."
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      className="w-full p-3.5 rounded-xl border border-slate-200/90 dark:border-zinc-700 bg-slate-50/60 dark:bg-zinc-800/60 text-xs sm:text-sm font-medium text-slate-900 dark:text-white placeholder:text-slate-400 focus:bg-white dark:focus:bg-zinc-800 focus:border-blue-600 focus:ring-2 focus:ring-blue-500/10 outline-none transition-all resize-none"
                    />
                  </div>
                </div>
              </div>

            </div>

            {/* ─── RIGHT COLUMN: LIVE CARD PREVIEW & ACTIONS (4 COLS) ─── */}
            <div className="lg:col-span-4 space-y-4">
              
              {/* Live Preview Card */}
              <div className="bg-white dark:bg-[#141417] rounded-2xl border border-slate-200/80 dark:border-zinc-800 p-5 shadow-xs space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-zinc-800">
                  <div className="flex items-center gap-2">
                    <Sparkles size={16} className="text-amber-500" />
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-zinc-300">
                      Vista Previa de Tarjeta
                    </h3>
                  </div>
                  <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 rounded-full">
                    En Tiempo Real
                  </span>
                </div>

                {/* Simulated Customer Directory Card */}
                <div className="p-4 rounded-2xl border border-slate-200/80 dark:border-zinc-700 bg-slate-50/70 dark:bg-zinc-800/40 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white font-black text-base flex items-center justify-center shrink-0 shadow-sm font-display">
                        {getInitials(name || 'Nuevo Cliente')}
                      </div>
                      <div className="min-w-0">
                        <h4 className="font-bold text-slate-900 dark:text-white text-sm sm:text-base truncate">
                          {name.trim() || 'Nombre del Cliente'}
                        </h4>
                        <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                          {docNumber ? `${docType}: ${docNumber}` : 'Sin documento fiscal'}
                        </p>
                      </div>
                    </div>

                    {/* Segment Badge Preview */}
                    <span className="shrink-0 text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300">
                      {suggestedSegment}
                    </span>
                  </div>

                  <div className="pt-2 border-t border-slate-200/50 dark:border-zinc-700/50 space-y-1.5 text-xs text-slate-600 dark:text-zinc-300">
                    <div className="flex items-center gap-2">
                      <Phone size={13} className="text-slate-400 shrink-0" />
                      <span className="font-mono text-slate-700 dark:text-zinc-300">
                        {phone || 'Sin número registrado'}
                      </span>
                    </div>

                    {email && (
                      <div className="flex items-center gap-2 truncate">
                        <Mail size={13} className="text-slate-400 shrink-0" />
                        <span className="truncate">{email}</span>
                      </div>
                    )}

                    {address && (
                      <div className="flex items-center gap-2 truncate">
                        <MapPin size={13} className="text-slate-400 shrink-0" />
                        <span className="truncate">{address}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Error Banner */}
                {error && (
                  <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/40 text-rose-700 dark:text-rose-400 text-xs flex items-center gap-2 animate-shake">
                    <AlertTriangle size={15} className="shrink-0 text-rose-600" />
                    <span>{error}</span>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="pt-2 space-y-2">
                  <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={isProcessing}
                    className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-98 text-white font-bold text-xs sm:text-sm shadow-md shadow-blue-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                  >
                    <Check size={16} strokeWidth={2.5} />
                    <span>{isEditing ? 'Guardar Cambios' : 'Registrar Cliente'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => requestLeave('/clientes')}
                    className="w-full py-2.5 rounded-xl border border-slate-200 dark:border-zinc-700 text-slate-600 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-800 text-xs font-semibold transition-colors cursor-pointer"
                  >
                    Cancelar y Volver
                  </button>
                </div>

              </div>

              {/* Fast Tips Card */}
              <div className="bg-gradient-to-br from-blue-50/70 to-indigo-50/40 dark:from-zinc-900 dark:to-zinc-800/60 rounded-2xl border border-blue-100 dark:border-zinc-800 p-4 space-y-2 text-xs text-slate-600 dark:text-zinc-400">
                <p className="font-bold text-blue-900 dark:text-blue-300 flex items-center gap-1.5">
                  <ShieldCheck size={15} />
                  <span>Beneficios del CRM Integrado:</span>
                </p>
                <ul className="space-y-1.5 list-disc list-inside text-[11px] text-slate-500 dark:text-zinc-400">
                  <li>Historial completo de compras por cliente.</li>
                  <li>Envío automático de boletas y comprobantes por WhatsApp.</li>
                  <li>Detección inteligente de clientes VIP y recurrentes.</li>
                </ul>
              </div>

            </div>

          </div>
        )}

        {/* ═════════════════════════════════════════════════════════
            OVERLAY: SLEEK CLIENT REGISTRATION ANIMATION SCREEN
           ═════════════════════════════════════════════════════════ */}
        {isProcessing && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4 animate-fade-in">
            <div className="bg-white dark:bg-[#18181b] rounded-3xl border border-slate-200 dark:border-zinc-700 p-6 max-w-sm w-full text-center shadow-2xl space-y-4 animate-scale-in">
              {/* Spinner with Pulse Icon */}
              <div className="w-14 h-14 rounded-full border-3 border-blue-600 border-t-transparent animate-spin mx-auto flex items-center justify-center">
                <UserPlus size={22} className="text-blue-600 animate-pulse" />
              </div>

              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-white">
                  {isEditing ? 'Actualizando Expediente' : 'Registrando Cliente en Cartera'}
                </h3>
                <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">
                  {processingStep === 1 && 'Validando formato de contacto e identificación fiscal…'}
                  {processingStep === 2 && 'Creando expediente comercial y guardando en base de datos…'}
                  {processingStep === 3 && '¡Cliente registrado con éxito! Redirigiendo a cartera…'}
                </p>
              </div>

              {/* Progress Bar */}
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

        {/* Modal de confirmación para descartar cambios */}
        {DiscardModalComponent}

      </div>
    </AppLayout>
  )
}

