import { useState, useEffect, useMemo, useCallback } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft, User, Phone, Mail, MapPin, Building2,
  FileText, Check, ShieldCheck, CheckCircle2, AlertTriangle,
  CreditCard, Search, Tag, Briefcase, DollarSign,
  Shield, CheckCircle, ExternalLink, HelpCircle
} from 'lucide-react'
import AppLayout from '../components/layout/AppLayout'
import { useFormLeaveGuard } from '../hooks/useFormLeaveGuard'
import { clientsService } from '../services/clientsService'

export default function NewClient() {
  const navigate = useNavigate()
  const { id } = useParams()
  const isEditing = Boolean(id)

  // ─── 1. Form State (Identificación & Fiscal) ───
  const [docType, setDocType] = useState('DNI') // 'DNI' | 'RUC' | 'CE' | 'PASAPORTE'
  const [docNumber, setDocNumber] = useState('')
  const [name, setName] = useState('')
  const [clientType, setClientType] = useState('NATURAL') // 'NATURAL' | 'JURIDICA'
  const [contactName, setContactName] = useState('')

  // ─── 2. Contacto & Facturación ───
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')

  // ─── 3. Domicilio & Logística ───
  const [address, setAddress] = useState('')
  const [district, setDistrict] = useState('')
  const [reference, setReference] = useState('')

  // ─── 4. Condiciones Comerciales & Facturación ───
  const [suggestedSegment, setSuggestedSegment] = useState('NUEVO') // 'MINORISTA' | 'NUEVO' | 'RECURRENTE' | 'VIP'
  const [paymentTerm, setPaymentTerm] = useState('CONTADO') // 'CONTADO' | 'CREDITO_15' | 'CREDITO_30' | 'CONTRAENTREGA'
  const [creditLimit, setCreditLimit] = useState('')
  const [priceList, setPriceList] = useState('ESTANDAR') // 'ESTANDAR' | 'MAYORISTA' | 'DISTRIBUIDOR'
  const [accountStatus, setAccountStatus] = useState('ACTIVO') // 'ACTIVO' | 'OBSERVADO'
  const [notes, setNotes] = useState('')

  // ─── UI & Operational States ───
  const [loadingInitial, setLoadingInitial] = useState(isEditing)
  const [isProcessing, setIsProcessing] = useState(false)
  const [processingStep, setProcessingStep] = useState(0) // 0: idle, 1: validation, 2: saving, 3: completed
  const [error, setError] = useState('')
  const [sunatStatus, setSunatStatus] = useState(null) // null | 'valid' | 'invalid'
  const [validatingDoc, setValidatingDoc] = useState(false)

  // Auto-detect doc type from number length & pattern
  const handleDocNumberChange = (value) => {
    const clean = value.replace(/\D/g, '')
    setDocNumber(clean)
    setSunatStatus(null)

    if (clean.length === 11) {
      setDocType('RUC')
      setClientType(clean.startsWith('20') ? 'JURIDICA' : 'NATURAL')
    } else if (clean.length === 8 && docType === 'RUC') {
      setDocType('DNI')
      setClientType('NATURAL')
    }
  }

  // Live SUNAT / RENIEC Simulation
  const handleValidateDocument = () => {
    if (!docNumber) return
    setValidatingDoc(true)
    setTimeout(() => {
      setValidatingDoc(false)
      if (docType === 'RUC') {
        if (docNumber.length === 11 && (docNumber.startsWith('10') || docNumber.startsWith('20') || docNumber.startsWith('15') || docNumber.startsWith('17'))) {
          setSunatStatus('valid')
          if (!name) {
            setName(docNumber.startsWith('20') ? 'DISTRIBUIDORA & SERVICIOS EMPRESARIALES S.A.C.' : 'CLIENTE COMERCIAL PERÚ')
          }
        } else {
          setSunatStatus('invalid')
        }
      } else if (docType === 'DNI') {
        if (docNumber.length === 8) {
          setSunatStatus('valid')
        } else {
          setSunatStatus('invalid')
        }
      } else {
        setSunatStatus('valid')
      }
    }, 400)
  }

  // Detección de cambios sin guardar
  const isDirty = useMemo(() => {
    if (isProcessing) return false
    return Boolean(
      name.trim() ||
      docNumber.trim() ||
      phone.trim() ||
      email.trim() ||
      address.trim() ||
      reference.trim() ||
      contactName.trim() ||
      creditLimit ||
      notes.trim()
    )
  }, [isProcessing, name, docNumber, phone, email, address, reference, contactName, creditLimit, notes])

  const { requestLeave, DiscardModalComponent } = useFormLeaveGuard({
    isDirty,
    defaultRedirectUrl: '/clientes',
    modalTitle: isEditing ? '¿Descartar modificaciones del cliente?' : '¿Descartar nuevo cliente?',
    modalDescription: 'Tienes información ingresada en la ficha comercial. Si sales ahora o recargas la pantalla, los cambios no guardados se descartarán.'
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
          if (doc?.length === 11) {
            setDocType('RUC')
            setClientType(doc.startsWith('20') ? 'JURIDICA' : 'NATURAL')
          } else if (doc?.length === 8) {
            setDocType('DNI')
            setClientType('NATURAL')
          }
          setEmail(data.email || '')
          setAddress(data.address || '')
          setContactName(data.contact_name || '')
          setNotes(data.notes || '')
        }
      } catch (err) {
        setError('No se pudo cargar la información del expediente del cliente.')
      } finally {
        setLoadingInitial(false)
      }
    }
    fetchClient()
  }, [id])

  // Handle Form Submission
  const handleSubmit = useCallback(async (e) => {
    e?.preventDefault()
    setError('')

    const trimmedName = name.trim()
    if (!trimmedName) {
      setError('Por favor, ingresa el Nombre Completo o Razón Social del cliente.')
      return
    }

    if (docType === 'RUC' && docNumber && docNumber.length !== 11) {
      setError('El R.U.C. debe contener exactamente 11 dígitos numéricos.')
      return
    }

    if (docType === 'DNI' && docNumber && docNumber.length !== 8) {
      setError('El D.N.I. debe contener exactamente 8 dígitos numéricos.')
      return
    }

    if (phone && phone.replace(/\D/g, '').length < 6) {
      setError('El número telefónico debe tener al menos 6 dígitos válidos.')
      return
    }

    setIsProcessing(true)
    setProcessingStep(1)

    try {
      await new Promise((r) => setTimeout(r, 350))
      setProcessingStep(2)

      const fullAddressParts = [
        address.trim(),
        district.trim() ? `Distrito: ${district.trim()}` : '',
        reference.trim() ? `(Ref: ${reference.trim()})` : ''
      ].filter(Boolean)
      const fullAddress = fullAddressParts.join(' — ')

      const finalNotesParts = [
        clientType === 'JURIDICA' ? '[Tipo: Persona Jurídica]' : '[Tipo: Persona Natural]',
        suggestedSegment !== 'NUEVO' ? `[Segmento: ${suggestedSegment}]` : '',
        paymentTerm !== 'CONTADO' ? `[Condición: ${paymentTerm}]` : '',
        priceList !== 'ESTANDAR' ? `[Tarifa: ${priceList}]` : '',
        creditLimit ? `[Límite Crédito: S/ ${creditLimit}]` : '',
        notes.trim()
      ].filter(Boolean)
      const finalNotes = finalNotesParts.join(' | ')

      const payload = {
        name: trimmedName,
        phone: phone.trim() || null,
        ruc: docNumber.trim() || null,
        email: email.trim() || null,
        address: fullAddress || null,
        contact_name: contactName.trim() || null,
        notes: finalNotes || null
      }

      if (isEditing) {
        await clientsService.update(id, payload)
      } else {
        await clientsService.create(payload)
      }

      setProcessingStep(3)
      await new Promise((r) => setTimeout(r, 450))

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
      setError(err.message || 'Error al guardar la información comercial del cliente.')
    }
  }, [name, docType, docNumber, phone, address, district, reference, clientType, suggestedSegment, paymentTerm, priceList, creditLimit, notes, contactName, isEditing, id, navigate])

  // Global Keyboard Shortcuts (F2: Guardar, Esc: Cancelar)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'F2' || (e.ctrlKey && e.key === 'Enter')) {
        e.preventDefault()
        handleSubmit()
      } else if (e.key === 'Escape' && !isProcessing) {
        e.preventDefault()
        requestLeave('/clientes')
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleSubmit, isProcessing, requestLeave])

  // Validation completeness checklist
  const validationChecklist = useMemo(() => {
    return [
      {
        label: 'Identificación Fiscal',
        valid: Boolean(docNumber && (docType === 'RUC' ? docNumber.length === 11 : docType === 'DNI' ? docNumber.length === 8 : true)),
        detail: docNumber ? `${docType}: ${docNumber}` : 'Pendiente'
      },
      {
        label: 'Razón Social / Nombre',
        valid: Boolean(name.trim().length >= 3),
        detail: name.trim() || 'Campo obligatorio'
      },
      {
        label: 'Teléfono / WhatsApp',
        valid: Boolean(phone && phone.replace(/\D/g, '').length >= 6),
        detail: phone || 'Recomendado para envíos'
      },
      {
        label: 'Domicilio de Entrega',
        valid: Boolean(address.trim().length >= 4),
        detail: address.trim() ? 'Dirección registrada' : 'Opcional'
      }
    ]
  }, [docNumber, docType, name, phone, address])

  return (
    <AppLayout title={isEditing ? 'Editar Ficha Comercial' : 'Alta de Cliente'}>
      <div className="max-w-[1440px] mx-auto space-y-3.5 pb-14 animate-fade-in">

        {/* ═════════════════════════════════════════════════════════
            0. INSTITUTIONAL HEADER & AUDIT SCOPE
           ═════════════════════════════════════════════════════════ */}
        <div className="bg-white dark:bg-[#141417] rounded-2xl border border-slate-200/80 dark:border-zinc-800 px-5 py-3.5 shadow-xs flex flex-wrap items-center justify-between gap-3.5">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => requestLeave('/clientes')}
              className="w-9 h-9 rounded-xl bg-slate-50 hover:bg-slate-100 dark:bg-zinc-800 dark:hover:bg-zinc-700 border border-slate-200/80 dark:border-zinc-700 flex items-center justify-center text-slate-600 dark:text-zinc-200 transition-colors cursor-pointer shrink-0 shadow-2xs"
              title="Volver a la Cartera de Clientes"
            >
              <ArrowLeft size={16} />
            </button>

            <div>
              <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider">
                <span>MÓDULO COMERCIAL</span>
                <span>/</span>
                <span className="text-slate-600 dark:text-zinc-400">CARTERA Y DIRECTORIO</span>
                <span>/</span>
                <span className="text-[#1B4FD8] dark:text-blue-400">
                  {isEditing ? 'MODIFICACIÓN DE FICHA' : 'ALTA DE CUENTA COMERCIAL'}
                </span>
              </div>
              <div className="flex items-center gap-2.5 mt-0.5">
                <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight leading-none">
                  {isEditing ? `Modificar Ficha — ${name || 'Cliente'}` : 'Registrar Nuevo Cliente en Cartera'}
                </h1>
                <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-mono font-semibold px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border border-blue-200/80 dark:border-blue-900/40">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-600" />
                  EXPEDIENTE CRM
                </span>
              </div>
            </div>
          </div>

          {/* Action buttons on top bar */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => requestLeave('/clientes')}
              className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-slate-700 dark:text-zinc-200 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-zinc-700 transition-colors cursor-pointer"
            >
              Cancelar [Esc]
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isProcessing}
              className="px-4 py-2 rounded-xl bg-[#1B4FD8] hover:bg-[#163FBF] active:scale-95 text-white text-xs font-bold flex items-center gap-2 shadow-xs transition-all cursor-pointer disabled:opacity-60"
            >
              <Check size={14} strokeWidth={2.5} />
              <span>{isEditing ? 'Guardar Cambios' : 'Guardar y Registrar Cliente'}</span>
              <kbd className="hidden sm:inline-block px-1.5 py-0.2 rounded bg-blue-700/60 text-[10px] font-mono">F2</kbd>
            </button>
          </div>
        </div>

        {/* ═════════════════════════════════════════════════════════
            1. MAIN FORM GRID: LEFT (7 COLS) + RIGHT (5 COLS)
           ═════════════════════════════════════════════════════════ */}
        {loadingInitial ? (
          <div className="bg-white dark:bg-[#141417] rounded-2xl border border-slate-200/80 dark:border-zinc-800 p-16 flex flex-col items-center justify-center text-center">
            <div className="w-9 h-9 rounded-full border-2 border-[#1B4FD8] border-t-transparent animate-spin mb-3" />
            <p className="text-xs font-semibold text-slate-600 dark:text-zinc-400">Cargando expediente comercial…</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            
            {/* ─── LEFT COLUMN: CORE BUSINESS INFORMATION (7 COLS) ─── */}
            <div className="lg:col-span-7 space-y-3.5">
              
              {/* SECTION 1: Identificación Fiscal & Razón Social */}
              <div className="bg-white dark:bg-[#141417] rounded-2xl border border-slate-200/80 dark:border-zinc-800 p-5 shadow-xs space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-zinc-800">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-[#1B4FD8] dark:text-blue-400 flex items-center justify-center shrink-0">
                      <Building2 size={16} />
                    </div>
                    <div>
                      <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                        1. Identificación Fiscal & Razón Social
                      </h2>
                      <p className="text-[11px] text-slate-400 dark:text-zinc-500">
                        Registro oficial de identidad tributaria habilitado para comprobantes electrónicos SUNAT.
                      </p>
                    </div>
                  </div>

                  {/* Persona Natural vs Jurídica Toggle */}
                  <div className="hidden sm:inline-flex items-center p-0.5 bg-slate-100 dark:bg-zinc-800 rounded-lg border border-slate-200/80 dark:border-zinc-700 text-[10.5px] font-bold">
                    <button
                      type="button"
                      onClick={() => setClientType('NATURAL')}
                      className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                        clientType === 'NATURAL'
                          ? 'bg-white dark:bg-zinc-700 text-[#1B4FD8] dark:text-blue-400 shadow-2xs'
                          : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      Persona Natural
                    </button>
                    <button
                      type="button"
                      onClick={() => setClientType('JURIDICA')}
                      className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                        clientType === 'JURIDICA'
                          ? 'bg-white dark:bg-zinc-700 text-[#1B4FD8] dark:text-blue-400 shadow-2xs'
                          : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      Persona Jurídica
                    </button>
                  </div>
                </div>

                <div className="space-y-3.5">
                  {/* Tipo de Documento y Número */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-bold text-slate-700 dark:text-zinc-300">
                        Tipo y Número de Documento Tributario <span className="text-rose-500">*</span>
                      </label>
                      <div className="flex items-center gap-1 text-[10px] font-bold">
                        {[
                          { id: 'DNI', label: 'D.N.I.' },
                          { id: 'RUC', label: 'R.U.C.' },
                          { id: 'CE', label: 'C.E.' },
                          { id: 'PASAPORTE', label: 'Pasaporte' }
                        ].map((t) => (
                          <button
                            key={t.id}
                            type="button"
                            onClick={() => {
                              setDocType(t.id)
                              if (t.id === 'RUC') setClientType('JURIDICA')
                              else setClientType('NATURAL')
                            }}
                            className={`px-2 py-0.5 rounded cursor-pointer transition-colors ${
                              docType === t.id
                                ? 'bg-[#1B4FD8] text-white shadow-2xs'
                                : 'bg-slate-100 dark:bg-zinc-800 text-slate-500 hover:text-slate-800 dark:hover:text-zinc-200'
                            }`}
                          >
                            {t.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <Building2 size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                          type="text"
                          maxLength={docType === 'RUC' ? 11 : docType === 'DNI' ? 8 : 15}
                          placeholder={
                            docType === 'RUC'
                              ? 'Ej. 20601234567 (11 dígitos)'
                              : docType === 'DNI'
                              ? 'Ej. 72345678 (8 dígitos)'
                              : 'Número de documento de identidad'
                          }
                          value={docNumber}
                          onChange={(e) => handleDocNumberChange(e.target.value)}
                          className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200/90 dark:border-zinc-700 bg-slate-50/60 dark:bg-zinc-800/60 text-xs sm:text-sm font-mono font-medium text-slate-900 dark:text-white placeholder:text-slate-400 focus:bg-white dark:focus:bg-zinc-800 focus:border-[#1B4FD8] focus:ring-2 focus:ring-blue-500/10 outline-none transition-all"
                        />
                      </div>

                      {/* Botón de Validación Rápida SUNAT / RENIEC */}
                      <button
                        type="button"
                        onClick={handleValidateDocument}
                        disabled={validatingDoc || !docNumber}
                        className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:bg-slate-50 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-200 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50 shrink-0 shadow-2xs"
                        title={docType === 'RUC' ? 'Consultar padrón SUNAT' : 'Validar documento'}
                      >
                        <Search size={13} className={validatingDoc ? 'animate-spin' : 'text-slate-400'} />
                        <span className="hidden sm:inline">
                          {validatingDoc ? 'Consultando…' : docType === 'RUC' ? 'Consultar SUNAT' : 'Validar RENIEC'}
                        </span>
                      </button>
                    </div>

                    {/* Validación feedback */}
                    {sunatStatus === 'valid' && (
                      <div className="mt-1.5 flex items-center gap-1.5 text-[11px] text-emerald-700 dark:text-emerald-400 font-semibold">
                        <CheckCircle2 size={13} className="text-emerald-600" />
                        <span>Documento verificado — Contribuyente HABIDO y ACTIVO en padrón.</span>
                      </div>
                    )}
                    {sunatStatus === 'invalid' && (
                      <div className="mt-1.5 flex items-center gap-1.5 text-[11px] text-rose-700 dark:text-rose-400 font-semibold">
                        <AlertTriangle size={13} className="text-rose-600" />
                        <span>Formato o longitud inválida para {docType}. Verifica los dígitos ingresados.</span>
                      </div>
                    )}
                  </div>

                  {/* Nombre Completo o Razón Social */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1">
                      {docType === 'RUC' ? 'Razón Social Oficial (según Ficha RUC)' : 'Nombres y Apellidos Completos'}{' '}
                      <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <User size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        required
                        type="text"
                        placeholder={
                          docType === 'RUC'
                            ? 'Ej. DISTRIBUIDORA COMERCIAL LIMA S.A.C.'
                            : 'Ej. Juan Carlos Pérez Morales'
                        }
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200/90 dark:border-zinc-700 bg-slate-50/60 dark:bg-zinc-800/60 text-xs sm:text-sm font-medium text-slate-900 dark:text-white placeholder:text-slate-400 focus:bg-white dark:focus:bg-zinc-800 focus:border-[#1B4FD8] focus:ring-2 focus:ring-blue-500/10 outline-none transition-all"
                      />
                    </div>
                  </div>

                  {/* Persona de Contacto & Cargo (Especial para B2B / Corporativo) */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1">
                      Persona de Contacto / Encargado de Compras (Opcional)
                    </label>
                    <div className="relative">
                      <Briefcase size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Ej. Ing. Marco Aurelio (Jefe de Logística y Abastecimiento)"
                        value={contactName}
                        onChange={(e) => setContactName(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200/90 dark:border-zinc-700 bg-slate-50/60 dark:bg-zinc-800/60 text-xs sm:text-sm font-medium text-slate-900 dark:text-white placeholder:text-slate-400 focus:bg-white dark:focus:bg-zinc-800 focus:border-[#1B4FD8] focus:ring-2 focus:ring-blue-500/10 outline-none transition-all"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* SECTION 2: Vías de Comunicación & Facturación Electrónica */}
              <div className="bg-white dark:bg-[#141417] rounded-2xl border border-slate-200/80 dark:border-zinc-800 p-5 shadow-xs space-y-4">
                <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100 dark:border-zinc-800">
                  <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                    <Phone size={16} />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                      2. Vías de Comunicación & Facturación Electrónica
                    </h2>
                    <p className="text-[11px] text-slate-400 dark:text-zinc-500">
                      Canales autorizados para envío de comprobantes electrónicos (XML/PDF) y notificaciones de entrega.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {/* Teléfono / WhatsApp */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1">
                      Teléfono Móvil / WhatsApp de Notificaciones
                    </label>
                    <div className="relative">
                      <div className="absolute left-3.5 top-1/2 -translate-y-1/2 flex items-center gap-1 text-slate-400 text-xs font-mono font-semibold">
                        <span>🇵🇪 +51</span>
                      </div>
                      <input
                        type="tel"
                        placeholder="987 654 321"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className="w-full pl-18 pr-4 py-2 rounded-xl border border-slate-200/90 dark:border-zinc-700 bg-slate-50/60 dark:bg-zinc-800/60 text-xs sm:text-sm font-mono font-medium text-slate-900 dark:text-white placeholder:text-slate-400 focus:bg-white dark:focus:bg-zinc-800 focus:border-[#1B4FD8] focus:ring-2 focus:ring-blue-500/10 outline-none transition-all"
                      />
                    </div>
                    <span className="text-[10.5px] text-slate-400 mt-1 block">
                      Permite enviar el PDF del ticket directamente por WhatsApp Web.
                    </span>
                  </div>

                  {/* Correo Electrónico */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1">
                      Correo Electrónico para Facturación
                    </label>
                    <div className="relative">
                      <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="email"
                        placeholder="facturacion@empresa.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200/90 dark:border-zinc-700 bg-slate-50/60 dark:bg-zinc-800/60 text-xs sm:text-sm font-medium text-slate-900 dark:text-white placeholder:text-slate-400 focus:bg-white dark:focus:bg-zinc-800 focus:border-[#1B4FD8] focus:ring-2 focus:ring-blue-500/10 outline-none transition-all"
                      />
                    </div>
                    <span className="text-[10.5px] text-slate-400 mt-1 block">
                      Receptor oficial de CDR y comprobante tributario SUNAT.
                    </span>
                  </div>
                </div>
              </div>

              {/* SECTION 3: Domicilio Fiscal & Logística de Despacho */}
              <div className="bg-white dark:bg-[#141417] rounded-2xl border border-slate-200/80 dark:border-zinc-800 p-5 shadow-xs space-y-4">
                <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100 dark:border-zinc-800">
                  <div className="w-8 h-8 rounded-xl bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
                    <MapPin size={16} />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                      3. Domicilio Fiscal & Dirección de Entrega
                    </h2>
                    <p className="text-[11px] text-slate-400 dark:text-zinc-500">
                      Ubicación para consignación en guía de remisión electrónica y despacho a almacén.
                    </p>
                  </div>
                </div>

                <div className="space-y-3.5">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1">
                        Dirección Completa (Calle, Avenida, Jr., Mz., Lote)
                      </label>
                      <div className="relative">
                        <MapPin size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                          type="text"
                          placeholder="Ej. Av. Javier Prado Este 2450, Piso 4"
                          value={address}
                          onChange={(e) => setAddress(e.target.value)}
                          className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200/90 dark:border-zinc-700 bg-slate-50/60 dark:bg-zinc-800/60 text-xs sm:text-sm font-medium text-slate-900 dark:text-white placeholder:text-slate-400 focus:bg-white dark:focus:bg-zinc-800 focus:border-[#1B4FD8] focus:ring-2 focus:ring-blue-500/10 outline-none transition-all"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1">
                        Distrito / Ciudad
                      </label>
                      <input
                        type="text"
                        placeholder="Ej. San Isidro, Lima"
                        value={district}
                        onChange={(e) => setDistrict(e.target.value)}
                        className="w-full px-3.5 py-2 rounded-xl border border-slate-200/90 dark:border-zinc-700 bg-slate-50/60 dark:bg-zinc-800/60 text-xs sm:text-sm font-medium text-slate-900 dark:text-white placeholder:text-slate-400 focus:bg-white dark:focus:bg-zinc-800 focus:border-[#1B4FD8] focus:ring-2 focus:ring-blue-500/10 outline-none transition-all"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1">
                      Referencia de Despacho & Horario de Recepción
                    </label>
                    <input
                      type="text"
                      placeholder="Ej. Frente a almacén central, portón plomo. Recepción de mercadería de 8:00 a 13:00 hrs."
                      value={reference}
                      onChange={(e) => setReference(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-200/90 dark:border-zinc-700 bg-slate-50/60 dark:bg-zinc-800/60 text-xs sm:text-sm font-medium text-slate-900 dark:text-white placeholder:text-slate-400 focus:bg-white dark:focus:bg-zinc-800 focus:border-[#1B4FD8] focus:ring-2 focus:ring-blue-500/10 outline-none transition-all"
                    />
                  </div>
                </div>
              </div>

            </div>

            {/* ─── RIGHT COLUMN: ENTERPRISE COMMERCIAL CONTROLS (5 COLS) ─── */}
            <div className="lg:col-span-5 space-y-3.5">
              
              {/* PANEL 1: Perfil Comercial & Condiciones Financieras */}
              <div className="bg-white dark:bg-[#141417] rounded-2xl border border-slate-200/80 dark:border-zinc-800 p-5 shadow-xs space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-zinc-800">
                  <div className="flex items-center gap-2">
                    <CreditCard size={16} className="text-[#1B4FD8] dark:text-blue-400" />
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-zinc-200">
                      Condiciones Comerciales & Crédito
                    </h3>
                  </div>
                  <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400">
                    POLÍTICA ERP
                  </span>
                </div>

                <div className="space-y-3.5">
                  {/* Clasificación de Segmento Comercial */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1.5">
                      Segmento Comercial de Cartera
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { id: 'NUEVO', label: 'Nuevo / Prospecto', desc: 'Primera compra' },
                        { id: 'MINORISTA', label: 'Minorista / Público', desc: 'Precio catálogo' },
                        { id: 'RECURRENTE', label: 'Cliente Frecuente', desc: 'Alta rotación' },
                        { id: 'VIP', label: 'Corporativo / VIP', desc: 'LTV mayorista' }
                      ].map((seg) => {
                        const active = suggestedSegment === seg.id
                        return (
                          <button
                            key={seg.id}
                            type="button"
                            onClick={() => setSuggestedSegment(seg.id)}
                            className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                              active
                                ? 'bg-blue-50/70 dark:bg-blue-950/30 border-[#1B4FD8] text-[#1B4FD8] dark:text-blue-300 shadow-2xs font-semibold'
                                : 'bg-slate-50/50 dark:bg-zinc-800/40 border-slate-200/80 dark:border-zinc-700 text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-800'
                            }`}
                          >
                            <p className="text-xs font-bold">{seg.label}</p>
                            <p className="text-[10px] text-slate-400 mt-0.5">{seg.desc}</p>
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  {/* Condición de Pago Habitual */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1">
                      Condición de Pago Habitual
                    </label>
                    <select
                      value={paymentTerm}
                      onChange={(e) => setPaymentTerm(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200/90 dark:border-zinc-700 bg-slate-50/60 dark:bg-zinc-800/60 text-xs font-semibold text-slate-800 dark:text-zinc-200 outline-none cursor-pointer focus:border-[#1B4FD8]"
                    >
                      <option value="CONTADO">Contado Inmediato (Efectivo / Transferencia / Tarjeta)</option>
                      <option value="CREDITO_15">Crédito Comercial — 15 días</option>
                      <option value="CREDITO_30">Crédito Comercial — 30 días</option>
                      <option value="CONTRAENTREGA">Pago Contraentrega</option>
                    </select>
                  </div>

                  {/* Límite de Crédito Autorizado */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1">
                        Límite de Crédito (S/)
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-mono text-xs">S/</span>
                        <input
                          type="number"
                          step="0.01"
                          placeholder="0.00"
                          value={creditLimit}
                          onChange={(e) => setCreditLimit(e.target.value)}
                          className="w-full pl-8 pr-3 py-2 rounded-xl border border-slate-200/90 dark:border-zinc-700 bg-slate-50/60 dark:bg-zinc-800/60 text-xs font-mono font-bold text-slate-900 dark:text-white outline-none focus:border-[#1B4FD8]"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1">
                        Lista de Precios
                      </label>
                      <select
                        value={priceList}
                        onChange={(e) => setPriceList(e.target.value)}
                        className="w-full px-2.5 py-2 rounded-xl border border-slate-200/90 dark:border-zinc-700 bg-slate-50/60 dark:bg-zinc-800/60 text-xs font-semibold text-slate-800 dark:text-zinc-200 outline-none cursor-pointer focus:border-[#1B4FD8]"
                      >
                        <option value="ESTANDAR">PVP Estándar</option>
                        <option value="MAYORISTA">Tarifa Mayorista</option>
                        <option value="DISTRIBUIDOR">Distribuidor VIP</option>
                      </select>
                    </div>
                  </div>

                  {/* Observaciones Internas & Acuerdos */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1">
                      Observaciones Internas & Acuerdos de Venta
                    </label>
                    <textarea
                      rows={2}
                      placeholder="Ej. Requiere orden de compra impresa para entregar comprobante..."
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      className="w-full p-2.5 rounded-xl border border-slate-200/90 dark:border-zinc-700 bg-slate-50/60 dark:bg-zinc-800/60 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 outline-none focus:border-[#1B4FD8] resize-none"
                    />
                  </div>
                </div>
              </div>

              {/* PANEL 2: Checklist de Auditoría & Conformidad de Registro */}
              <div className="bg-white dark:bg-[#141417] rounded-2xl border border-slate-200/80 dark:border-zinc-800 p-4.5 shadow-xs space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-zinc-800">
                  <div className="flex items-center gap-2">
                    <ShieldCheck size={16} className="text-emerald-600" />
                    <h4 className="text-xs font-bold text-slate-800 dark:text-zinc-200">
                      Conformidad de Datos Comerciales
                    </h4>
                  </div>
                  <span className="text-[10px] text-slate-400 font-medium">Validación en tiempo real</span>
                </div>

                <div className="space-y-2 text-xs">
                  {validationChecklist.map((item, i) => (
                    <div key={i} className="flex items-center justify-between py-1 border-b border-slate-50 dark:border-zinc-800/50 last:border-none">
                      <div className="flex items-center gap-2">
                        {item.valid ? (
                          <CheckCircle2 size={14} className="text-emerald-500 shrink-0" />
                        ) : (
                          <div className="w-3.5 h-3.5 rounded-full border border-slate-300 dark:border-zinc-600 shrink-0" />
                        )}
                        <span className={item.valid ? 'text-slate-700 dark:text-zinc-300 font-medium' : 'text-slate-400'}>
                          {item.label}
                        </span>
                      </div>
                      <span className="text-[11px] font-mono text-slate-500 truncate max-w-[140px]">
                        {item.detail}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Error Banner */}
                {error && (
                  <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/40 text-rose-700 dark:text-rose-400 text-xs flex items-center gap-2 animate-shake">
                    <AlertTriangle size={15} className="shrink-0 text-rose-600" />
                    <span>{error}</span>
                  </div>
                )}

                {/* Submission Action Buttons */}
                <div className="pt-2 space-y-2">
                  <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={isProcessing}
                    className="w-full py-2.5 rounded-xl bg-[#1B4FD8] hover:bg-[#163FBF] active:scale-98 text-white font-bold text-xs sm:text-sm shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                  >
                    <Check size={16} strokeWidth={2.5} />
                    <span>{isEditing ? 'Guardar Cambios de la Ficha' : 'Guardar y Registrar Cliente'}</span>
                    <kbd className="px-1.5 py-0.2 rounded bg-blue-700/60 text-[10px] font-mono">F2</kbd>
                  </button>

                  <button
                    type="button"
                    onClick={() => requestLeave('/clientes')}
                    className="w-full py-2 rounded-xl border border-slate-200 dark:border-zinc-700 text-slate-600 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-800 text-xs font-semibold transition-colors cursor-pointer"
                  >
                    Descartar y Volver a Cartera [Esc]
                  </button>
                </div>
              </div>

            </div>

          </div>
        )}

        {/* ═════════════════════════════════════════════════════════
            OVERLAY: TELEMETRY SAVE SPINNER
           ═════════════════════════════════════════════════════════ */}
        {isProcessing && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4 animate-fade-in">
            <div className="bg-white dark:bg-[#18181b] rounded-3xl border border-slate-200 dark:border-zinc-700 p-6 max-w-sm w-full text-center shadow-2xl space-y-4 animate-scale-in">
              <div className="w-12 h-12 rounded-full border-3 border-[#1B4FD8] border-t-transparent animate-spin mx-auto flex items-center justify-center">
                <Check size={20} className="text-[#1B4FD8]" />
              </div>

              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  {isEditing ? 'Actualizando Ficha Comercial' : 'Registrando Cliente en Base de Datos'}
                </h3>
                <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">
                  {processingStep === 1 && 'Comprobando consistencia de datos fiscales y tributarios…'}
                  {processingStep === 2 && 'Sincronizando expediente con el servidor…'}
                  {processingStep === 3 && '¡Expediente guardado con éxito! Redirigiendo…'}
                </p>
              </div>

              <div className="w-full bg-slate-100 dark:bg-zinc-800 h-1.5 rounded-full overflow-hidden">
                <div
                  className="bg-[#1B4FD8] h-full transition-all duration-300"
                  style={{
                    width: processingStep === 1 ? '40%' : processingStep === 2 ? '80%' : '100%'
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
