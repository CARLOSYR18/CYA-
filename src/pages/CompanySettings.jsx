import { useEffect, useState, useMemo } from 'react'
import {
  Building2, Save, CheckCircle2, ImageIcon, Phone, Mail, MapPin,
  FileText, ShieldCheck, Sparkles, Crown, ArrowRight, Printer,
  ExternalLink, Copy, Check, AlertCircle, RefreshCw, Layers, DollarSign,
  QrCode, Smartphone, CreditCard, Upload, Trash2
} from 'lucide-react'
import AppLayout from '../components/layout/AppLayout'
import { companySettingsService } from '../services/companySettingsService'
import { paymentMethodsService, DEFAULT_PAYMENT_CONFIG } from '../services/paymentMethodsService'
import { getLimits, getEffectivePlan } from '../lib/planLimits'

const emptyForm = {
  name: '',
  ruc: '',
  address: '',
  phone: '',
  email: '',
  logo_url: '',
  footer_message: '¡Gracias por su compra! Conserve su comprobante para cualquier cambio o garantía.',
  currency: 'S/'
}

export default function CompanySettings() {
  const [form, setForm] = useState(emptyForm)
  const [companyRaw, setCompanyRaw] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const [logoPreviewError, setLogoPreviewError] = useState(false)
  const [logoUploading, setLogoUploading] = useState(false)
  const [showLogoUrlInput, setShowLogoUrlInput] = useState(false)

  // Payment methods state (Yape, Plin, Transferencia)
  const [payments, setPayments] = useState(DEFAULT_PAYMENT_CONFIG)
  const [activePaymentTab, setActivePaymentTab] = useState('yape')
  const [qrProcessing, setQrProcessing] = useState(false)

  useEffect(() => {
    async function loadCompanyData() {
      setLoading(true)
      try {
        const [data, payData] = await Promise.all([
          companySettingsService.get().catch(() => null),
          Promise.resolve(paymentMethodsService.get()).catch(() => null)
        ])
        setCompanyRaw(data)
        setForm({
          name: data?.name || '',
          ruc: data?.ruc || '',
          address: data?.address || '',
          phone: data?.phone || '',
          email: data?.email || '',
          logo_url: data?.logo_url || '',
          footer_message: data?.footer_message || emptyForm.footer_message,
          currency: data?.currency || 'S/'
        })
        if (payData) {
          setPayments({
            ...payData,
            yape: {
              ...payData.yape,
              phone: payData.yape.phone || data?.phone || '',
              holder: payData.yape.holder || data?.name || ''
            },
            plin: {
              ...payData.plin,
              phone: payData.plin.phone || data?.phone || '',
              holder: payData.plin.holder || data?.name || ''
            },
            transfer: {
              ...payData.transfer,
              holder: payData.transfer.holder || data?.name || ''
            }
          })
        }
      } catch (err) {
        console.error('Error cargando configuración de empresa:', err)
      } finally {
        setLoading(false)
      }
    }

    loadCompanyData()
  }, [])

  const field = (key) => ({
    value: form[key] || '',
    onChange: (e) => {
      setForm((prev) => ({ ...prev, [key]: e.target.value }))
      setSaved(false)
      if (key === 'logo_url') setLogoPreviewError(false)
    }
  })

  // Helpers for company logo upload
  const handleLogoUpload = async (file) => {
    if (!file) return
    setError('')
    try {
      setLogoUploading(true)
      const urlOrDataUrl = await paymentMethodsService.processImageFile(file, 'logo')
      setForm((prev) => ({ ...prev, logo_url: urlOrDataUrl }))
      setLogoPreviewError(false)
      setSaved(false)
    } catch (err) {
      setError(err.message || 'Error al procesar la imagen del logotipo.')
    } finally {
      setLogoUploading(false)
    }
  }

  const handleRemoveLogo = () => {
    setForm((prev) => ({ ...prev, logo_url: '' }))
    setLogoPreviewError(false)
    setSaved(false)
  }

  // Helpers for payment configuration
  const handleQrUpload = async (methodKey, file) => {
    if (!file) return
    setError('')
    try {
      setQrProcessing(true)
      const dataUrl = await paymentMethodsService.processImageFile(file, methodKey)
      setPayments((prev) => ({
        ...prev,
        [methodKey]: {
          ...prev[methodKey],
          qr_image: dataUrl
        }
      }))
      setSaved(false)
    } catch (err) {
      setError(err.message || 'Error al procesar la imagen del código QR.')
    } finally {
      setQrProcessing(false)
    }
  }

  const handleRemoveQr = (methodKey) => {
    setPayments((prev) => ({
      ...prev,
      [methodKey]: {
        ...prev[methodKey],
        qr_image: ''
      }
    }))
    setSaved(false)
  }

  const updatePaymentField = (methodKey, fieldKey, val) => {
    setPayments((prev) => ({
      ...prev,
      [methodKey]: {
        ...prev[methodKey],
        [fieldKey]: val
      }
    }))
    setSaved(false)
  }

  const effectivePlan = useMemo(() => getEffectivePlan(companyRaw), [companyRaw])
  const limits = useMemo(() => getLimits(companyRaw), [companyRaw])

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    const cleanName = form.name.trim()

    if (!cleanName) {
      setError('El nombre o razón social de la empresa es obligatorio.')
      return
    }

    setSaving(true)
    try {
      // 1. Guardar datos principales y medios de pago en Supabase
      await companySettingsService.save({
        ...form,
        name: cleanName,
        ruc: form.ruc.trim(),
        phone: form.phone.trim(),
        email: form.email.trim(),
        address: form.address.trim(),
        logo_url: form.logo_url.trim(),
        footer_message: form.footer_message.trim(),
        yape_qr: payments?.yape?.qr_image || null,
        yape_phone: payments?.yape?.phone || null,
        yape_holder: payments?.yape?.holder || null,
        plin_qr: payments?.plin?.qr_image || null,
        plin_phone: payments?.plin?.phone || null,
        plin_holder: payments?.plin?.holder || null,
        payment_methods: payments
      })

      // 2. Sincronizar en caché local y eventos
      await paymentMethodsService.save(payments)

      setSaved(true)
      setTimeout(() => setSaved(false), 5000)
    } catch (err) {
      console.error(err)
      setError(err.message || 'No se pudo guardar la configuración de la empresa.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <AppLayout title="Configuración de Empresa">
      <div className="space-y-6 max-w-6xl mx-auto pb-16">

        {/* ═════════════════════════════════════════════════════════
            0. EXECUTIVE TOP HEADER BAR
           ═════════════════════════════════════════════════════════ */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-[#141417] p-5 rounded-2xl border border-slate-200/80 dark:border-zinc-800 shadow-xs">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-brand/10 text-brand dark:text-blue-400">
                <Building2 size={18} />
              </span>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-zinc-100 tracking-tight font-display">
                Perfil e Identidad de Empresa
              </h1>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-zinc-400 mt-1">
              Configura los datos fiscales para SUNAT, logotipo comercial y personaliza el formato de las boletas de venta.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border ${
                effectivePlan === 'pro'
                  ? 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-500/15 dark:text-amber-300 dark:border-amber-500/30'
                  : 'bg-blue-50 text-brand border-blue-200 dark:bg-blue-500/15 dark:text-blue-300 dark:border-blue-500/30'
              }`}
            >
              {effectivePlan === 'pro' ? <Crown size={14} className="text-amber-600" /> : <Sparkles size={14} />}
              <span>Plan {effectivePlan === 'pro' ? 'Pro Corporativo' : 'Free Activo'}</span>
            </span>
          </div>
        </div>

        {/* ═════════════════════════════════════════════════════════
            FEEDBACK BANNERS (SAVED & ERROR)
           ═════════════════════════════════════════════════════════ */}
        {saved && (
          <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 text-emerald-800 dark:text-emerald-300 text-xs sm:text-sm font-semibold flex items-center justify-between gap-3 shadow-xs animate-slide-up">
            <div className="flex items-center gap-2.5">
              <CheckCircle2 size={18} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>¡La configuración y perfil de la empresa han sido guardados correctamente!</span>
            </div>
            <button
              onClick={() => setSaved(false)}
              className="text-emerald-600 dark:text-emerald-400 hover:text-emerald-800 p-1 cursor-pointer"
            >
              <Check size={16} />
            </button>
          </div>
        )}

        {error && (
          <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 text-rose-800 dark:text-rose-300 text-xs sm:text-sm font-semibold flex items-center gap-2.5 shadow-xs animate-slide-up">
            <AlertCircle size={18} className="text-rose-600 dark:text-rose-400 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* ═════════════════════════════════════════════════════════
            MAIN FORM: 2-COLUMN BALANCED DESKTOP LAYOUT
           ═════════════════════════════════════════════════════════ */}
        {loading ? (
          <div className="bg-white dark:bg-[#141417] rounded-2xl border border-slate-200/80 dark:border-zinc-800 p-16 flex flex-col items-center justify-center text-center shadow-xs">
            <div className="w-10 h-10 rounded-full border-2 border-brand border-t-transparent animate-spin mb-3" />
            <p className="text-xs font-semibold text-slate-600 dark:text-zinc-400">
              Cargando perfil comercial de la empresa…
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">

              {/* ─── LEFT COLUMN: COMPANY DETAILS & TICKET CONFIG (7 COLS) ─── */}
              <div className="lg:col-span-7 space-y-5">

                {/* CARD 1: CORPORATE IDENTITY & LOGO */}
                <div className="bg-white dark:bg-[#141417] rounded-2xl border border-slate-200/80 dark:border-zinc-800 p-5 sm:p-6 shadow-xs space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-zinc-800">
                    <div className="flex items-center gap-2">
                      <Building2 size={16} className="text-brand dark:text-blue-400" />
                      <h3 className="text-sm font-bold text-slate-900 dark:text-zinc-100">
                        1. Identidad de Marca y Razón Social
                      </h3>
                    </div>
                    <span className="text-[11px] text-slate-400 dark:text-zinc-500 font-medium">Principal *</span>
                  </div>

                  <div className="space-y-4">
                    {/* Company Name */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1.5 uppercase tracking-wider">
                        Nombre Comercial / Razón Social *
                      </label>
                      <input
                        type="text"
                        placeholder="Ej: CYA Store, Inversiones Perú SAC…"
                        className="w-full bg-slate-50 dark:bg-zinc-800/80 border border-slate-200 dark:border-zinc-700 rounded-xl px-4 py-2.5 text-xs sm:text-sm text-slate-900 dark:text-zinc-100 font-bold outline-none focus:bg-white dark:focus:bg-zinc-900 focus:border-brand focus:ring-2 focus:ring-brand/10 transition-all placeholder:text-slate-400 dark:placeholder:text-zinc-500"
                        {...field('name')}
                        autoFocus
                        required
                      />
                      <p className="text-[11px] text-slate-400 dark:text-zinc-500 mt-1">
                        Este nombre encabezará los comprobantes impresos, reportes y cotizaciones.
                      </p>
                    </div>

                    {/* Logo Section with Direct Upload & URL fallback */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-2 uppercase tracking-wider flex items-center justify-between">
                        <span>Logotipo Oficial de la Empresa</span>
                        <span className="text-[10px] text-slate-400 normal-case font-normal">PNG transparente recomendado</span>
                      </label>

                      <div className="flex flex-col sm:flex-row sm:items-center gap-4 p-4 rounded-2xl bg-slate-50 dark:bg-zinc-800/50 border border-slate-200 dark:border-zinc-700">
                        {/* Logo Preview Avatar */}
                        <div className="w-20 h-20 rounded-2xl border-2 border-slate-200 dark:border-zinc-700 flex items-center justify-center shrink-0 overflow-hidden bg-white dark:bg-zinc-800 shadow-xs">
                          {form.logo_url && !logoPreviewError ? (
                            <img
                              src={form.logo_url}
                              alt="Logo Empresa"
                              className="w-full h-full object-contain p-1.5"
                              onError={() => setLogoPreviewError(true)}
                            />
                          ) : (
                            <Building2 size={32} className="text-slate-400" />
                          )}
                        </div>

                        {/* Upload Controls & Actions */}
                        <div className="flex-1 space-y-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <label className="px-4 py-2.5 rounded-xl bg-brand hover:bg-brand-hover text-white text-xs font-bold flex items-center gap-2 cursor-pointer shadow-sm active:scale-98 transition-all disabled:opacity-50">
                              <Upload size={14} />
                              <span>{logoUploading ? 'Subiendo imagen…' : 'Subir Imagen de Logotipo'}</span>
                              <input
                                type="file"
                                accept="image/*"
                                disabled={logoUploading}
                                className="hidden"
                                onChange={(e) => handleLogoUpload(e.target.files?.[0])}
                              />
                            </label>

                            {form.logo_url && (
                              <button
                                type="button"
                                onClick={handleRemoveLogo}
                                className="px-3 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 dark:bg-rose-500/10 dark:hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors"
                              >
                                <Trash2 size={13} />
                                <span>Quitar</span>
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() => setShowLogoUrlInput(prev => !prev)}
                              className="text-[11px] text-slate-500 hover:text-slate-800 dark:text-zinc-400 dark:hover:text-zinc-200 underline cursor-pointer ml-auto"
                            >
                              {showLogoUrlInput ? 'Ocultar URL' : 'O pegar URL directa'}
                            </button>
                          </div>

                          {showLogoUrlInput && (
                            <div className="pt-1 animate-fade-in">
                              <input
                                type="url"
                                placeholder="https://ejemplo.com/logo.png"
                                className="w-full bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-xl px-3.5 py-2 text-xs font-mono text-slate-900 dark:text-zinc-100 outline-none focus:border-brand focus:ring-2 focus:ring-brand/10 transition-all placeholder:text-slate-400"
                                {...field('logo_url')}
                              />
                            </div>
                          )}

                          <p className="text-[11px] text-slate-400 dark:text-zinc-500 leading-tight">
                            Esta imagen se guardará en Supabase y aparecerá en el encabezado de todas tus boletas impresas y comprobantes digitales.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* CARD 2: FISCAL & TAX DATA (SUNAT) */}
                <div className="bg-white dark:bg-[#141417] rounded-2xl border border-slate-200/80 dark:border-zinc-800 p-5 sm:p-6 shadow-xs space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-zinc-800">
                    <div className="flex items-center gap-2">
                      <FileText size={16} className="text-brand dark:text-blue-400" />
                      <h3 className="text-sm font-bold text-slate-900 dark:text-zinc-100">
                        2. Datos Tributarios y Contacto
                      </h3>
                    </div>
                    <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                      <ShieldCheck size={13} /> Régimen Tributario
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* RUC */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1.5 uppercase tracking-wider">
                        RUC (Registro Único de Contribuyente)
                      </label>
                      <input
                        type="text"
                        placeholder="20601234567"
                        maxLength={11}
                        className="w-full bg-slate-50 dark:bg-zinc-800/80 border border-slate-200 dark:border-zinc-700 rounded-xl px-4 py-2.5 text-xs sm:text-sm font-mono font-bold text-slate-900 dark:text-zinc-100 outline-none focus:bg-white dark:focus:bg-zinc-900 focus:border-brand focus:ring-2 focus:ring-brand/10 transition-all placeholder:text-slate-400"
                        {...field('ruc')}
                      />
                      <p className="text-[10.5px] text-slate-400 dark:text-zinc-500 mt-1">
                        {form.ruc && form.ruc.length === 11 ? (
                          <span className="text-emerald-600 font-semibold flex items-center gap-1">
                            <CheckCircle2 size={12} /> 11 dígitos verificados
                          </span>
                        ) : (
                          'RUC válido para comprobantes (11 dígitos)'
                        )}
                      </p>
                    </div>

                    {/* Phone */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1.5 uppercase tracking-wider">
                        Teléfono / WhatsApp de Atención
                      </label>
                      <input
                        type="text"
                        placeholder="+51 987 654 321"
                        className="w-full bg-slate-50 dark:bg-zinc-800/80 border border-slate-200 dark:border-zinc-700 rounded-xl px-4 py-2.5 text-xs sm:text-sm font-mono text-slate-900 dark:text-zinc-100 outline-none focus:bg-white dark:focus:bg-zinc-900 focus:border-brand focus:ring-2 focus:ring-brand/10 transition-all placeholder:text-slate-400"
                        {...field('phone')}
                      />
                      <p className="text-[10.5px] text-slate-400 dark:text-zinc-500 mt-1">
                        Aparecerá en el encabezado de las boletas.
                      </p>
                    </div>

                    {/* Email */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1.5 uppercase tracking-wider">
                        Correo Electrónico de Ventas / Soporte
                      </label>
                      <input
                        type="email"
                        placeholder="[email protected]"
                        className="w-full bg-slate-50 dark:bg-zinc-800/80 border border-slate-200 dark:border-zinc-700 rounded-xl px-4 py-2.5 text-xs sm:text-sm text-slate-900 dark:text-zinc-100 outline-none focus:bg-white dark:focus:bg-zinc-900 focus:border-brand focus:ring-2 focus:ring-brand/10 transition-all placeholder:text-slate-400"
                        {...field('email')}
                      />
                    </div>

                    {/* Currency */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1.5 uppercase tracking-wider">
                        Moneda Base de Facturación
                      </label>
                      <select
                        className="w-full bg-slate-50 dark:bg-zinc-800/80 border border-slate-200 dark:border-zinc-700 rounded-xl px-4 py-2.5 text-xs sm:text-sm font-semibold text-slate-900 dark:text-zinc-100 outline-none cursor-pointer focus:bg-white dark:focus:bg-zinc-900 focus:border-brand"
                        {...field('currency')}
                      >
                        <option value="S/">Soles Peruanos (S/)</option>
                        <option value="$">Dólares Americanos ($)</option>
                      </select>
                    </div>

                    {/* Address */}
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1.5 uppercase tracking-wider">
                        Dirección Fiscal / Establecimiento Comercial
                      </label>
                      <input
                        type="text"
                        placeholder="Ej: Av. Javier Prado 2200, San Isidro, Lima"
                        className="w-full bg-slate-50 dark:bg-zinc-800/80 border border-slate-200 dark:border-zinc-700 rounded-xl px-4 py-2.5 text-xs sm:text-sm text-slate-900 dark:text-zinc-100 outline-none focus:bg-white dark:focus:bg-zinc-900 focus:border-brand focus:ring-2 focus:ring-brand/10 transition-all placeholder:text-slate-400"
                        {...field('address')}
                      />
                    </div>
                  </div>
                </div>

                {/* CARD 3: TICKET CUSTOMIZATION */}
                <div className="bg-white dark:bg-[#141417] rounded-2xl border border-slate-200/80 dark:border-zinc-800 p-5 sm:p-6 shadow-xs space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-zinc-800">
                    <div className="flex items-center gap-2">
                      <Printer size={16} className="text-brand dark:text-blue-400" />
                      <h3 className="text-sm font-bold text-slate-900 dark:text-zinc-100">
                        3. Personalización de Boletas y Comprobantes
                      </h3>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1.5 uppercase tracking-wider">
                      Mensaje de Pie de Página (Garantías o Agradecimiento)
                    </label>
                    <textarea
                      rows={3}
                      placeholder="Ej: ¡Gracias por su preferencia! Conserve su comprobante para cualquier cambio o reclamo de garantía."
                      className="w-full bg-slate-50 dark:bg-zinc-800/80 border border-slate-200 dark:border-zinc-700 rounded-xl px-4 py-2.5 text-xs sm:text-sm text-slate-900 dark:text-zinc-100 outline-none focus:bg-white dark:focus:bg-zinc-900 focus:border-brand focus:ring-2 focus:ring-brand/10 transition-all placeholder:text-slate-400 leading-relaxed"
                      {...field('footer_message')}
                    />
                    <p className="text-[11px] text-slate-400 dark:text-zinc-500 mt-1">
                      Este texto se imprimirá al final de cada ticket térmico o comprobante digital enviado por WhatsApp.
                    </p>
                  </div>
                </div>

                {/* CARD 4: DIGITAL PAYMENT METHODS & QR CODES (Yape, Plin & Banks) */}
                <div className="bg-white dark:bg-[#141417] rounded-2xl border border-slate-200/80 dark:border-zinc-800 p-5 sm:p-6 shadow-xs space-y-5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 dark:border-zinc-800 gap-2">
                    <div className="flex items-center gap-2">
                      <QrCode size={18} className="text-[#5550F2] dark:text-indigo-400" />
                      <div>
                        <h3 className="text-sm font-bold text-slate-900 dark:text-zinc-100">
                          4. Medios de Pago Digital & Códigos QR
                        </h3>
                        <p className="text-[11px] text-slate-400 dark:text-zinc-500">
                          Configura y sube las capturas de tus QR de Yape, Plin y cuentas bancarias.
                        </p>
                      </div>
                    </div>
                    <span className="text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300 border border-indigo-200/50 self-start sm:self-auto">
                      Cobro Rápido POS
                    </span>
                  </div>

                  {/* Payment Method Switcher Tabs */}
                  <div className="grid grid-cols-3 gap-2 bg-slate-100 dark:bg-zinc-800/80 p-1 rounded-xl">
                    <button
                      type="button"
                      onClick={() => setActivePaymentTab('yape')}
                      className={`py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                        activePaymentTab === 'yape'
                          ? 'bg-[#742284] text-white shadow-sm'
                          : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      <img src="/yape-logo.png" alt="Yape" className="w-4 h-4 rounded-sm object-cover shadow-2xs" />
                      <span>Yape</span>
                      {payments?.yape?.qr_image && <Check size={12} strokeWidth={3} className="text-emerald-300" />}
                    </button>

                    <button
                      type="button"
                      onClick={() => setActivePaymentTab('plin')}
                      className={`py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                        activePaymentTab === 'plin'
                          ? 'bg-[#00b49f] text-white shadow-sm'
                          : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      <img src="/plin-logo.png" alt="Plin" className="w-4 h-4 rounded-full object-cover shadow-2xs" />
                      <span>Plin</span>
                      {payments?.plin?.qr_image && <Check size={12} strokeWidth={3} className="text-white" />}
                    </button>

                    <button
                      type="button"
                      onClick={() => setActivePaymentTab('transfer')}
                      className={`py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                        activePaymentTab === 'transfer'
                          ? 'bg-blue-600 text-white shadow-sm'
                          : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      <Building2 size={13} />
                      <span className="truncate">Bancos / CCI</span>
                    </button>
                  </div>

                  {/* TAB 1: YAPE CONFIGURATION */}
                  {activePaymentTab === 'yape' && (
                    <div className="space-y-4 animate-fade-in">
                      <div className="flex items-center justify-between p-3 rounded-xl bg-purple-50 dark:bg-purple-950/20 border border-purple-200/70 dark:border-purple-800/30 text-xs">
                        <div className="flex items-center gap-2 text-purple-900 dark:text-purple-300">
                          <Smartphone size={16} className="text-[#742284]" />
                          <span>Tus clientes podrán escanear tu QR de Yape directamente en la pantalla de Nueva Venta.</span>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1.5 uppercase tracking-wider">
                            Número de Celular Yape *
                          </label>
                          <input
                            type="text"
                            placeholder="Ej: 987 654 321"
                            value={payments?.yape?.phone || ''}
                            onChange={(e) => updatePaymentField('yape', 'phone', e.target.value)}
                            className="w-full bg-slate-50 dark:bg-zinc-800/80 border border-slate-200 dark:border-zinc-700 rounded-xl px-4 py-2.5 text-xs sm:text-sm font-mono font-bold text-slate-900 dark:text-zinc-100 outline-none focus:bg-white dark:focus:bg-zinc-900 focus:border-[#742284] focus:ring-2 focus:ring-purple-500/10 transition-all placeholder:text-slate-400"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1.5 uppercase tracking-wider">
                            Titular de la Cuenta Yape
                          </label>
                          <input
                            type="text"
                            placeholder="Ej: CYA STORE / Juan Pérez"
                            value={payments?.yape?.holder || ''}
                            onChange={(e) => updatePaymentField('yape', 'holder', e.target.value)}
                            className="w-full bg-slate-50 dark:bg-zinc-800/80 border border-slate-200 dark:border-zinc-700 rounded-xl px-4 py-2.5 text-xs sm:text-sm font-semibold text-slate-900 dark:text-zinc-100 outline-none focus:bg-white dark:focus:bg-zinc-900 focus:border-[#742284] focus:ring-2 focus:ring-purple-500/10 transition-all placeholder:text-slate-400"
                          />
                        </div>
                      </div>

                      {/* QR Image Upload Section */}
                      <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1.5 uppercase tracking-wider flex items-center justify-between">
                          <span>Captura / Imagen del Código QR de Yape</span>
                          {payments?.yape?.qr_image && (
                            <span className="text-emerald-600 dark:text-emerald-400 font-bold text-[11px] flex items-center gap-1">
                              <CheckCircle2 size={13} /> QR Activo
                            </span>
                          )}
                        </label>

                        {payments?.yape?.qr_image ? (
                          <div className="flex flex-col sm:flex-row items-center gap-4 p-4 rounded-2xl bg-slate-50 dark:bg-zinc-800/50 border border-slate-200 dark:border-zinc-700">
                            <div className="relative w-36 h-36 bg-white p-2 rounded-xl border border-slate-200 dark:border-zinc-600 shadow-xs shrink-0 flex items-center justify-center overflow-hidden">
                              <img
                                src={payments.yape.qr_image}
                                alt="QR Yape"
                                className="w-full h-full object-contain"
                              />
                            </div>
                            <div className="space-y-2 text-center sm:text-left flex-1 min-w-0">
                              <p className="text-xs font-bold text-slate-800 dark:text-zinc-200">
                                Captura de QR cargada correctamente
                              </p>
                              <p className="text-[11px] text-slate-400 dark:text-zinc-500">
                                Tus clientes verán este QR al presionar &quot;Yape&quot; en Nueva Venta.
                              </p>
                              <div className="flex flex-wrap items-center gap-2 pt-1 justify-center sm:justify-start">
                                <label className="px-3 py-1.5 rounded-lg bg-white dark:bg-zinc-700 hover:bg-slate-100 dark:hover:bg-zinc-600 border border-slate-200 dark:border-zinc-600 text-xs font-bold text-slate-700 dark:text-zinc-200 cursor-pointer transition-all flex items-center gap-1.5 shadow-2xs">
                                  <Upload size={13} />
                                  <span>Cambiar imagen</span>
                                  <input
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={(e) => handleQrUpload('yape', e.target.files?.[0])}
                                  />
                                </label>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveQr('yape')}
                                  className="px-3 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 dark:bg-rose-500/10 dark:hover:bg-rose-500/20 text-xs font-bold text-rose-600 dark:text-rose-400 cursor-pointer transition-all flex items-center gap-1.5"
                                >
                                  <Trash2 size={13} />
                                  <span>Quitar QR</span>
                                </button>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <label className="border-2 border-dashed border-purple-300 dark:border-purple-800/60 hover:border-[#742284] bg-purple-50/40 dark:bg-purple-950/10 hover:bg-purple-50/80 rounded-2xl p-6 flex flex-col items-center justify-center text-center cursor-pointer transition-all group">
                            <div className="w-12 h-12 rounded-2xl bg-[#742284]/10 text-[#742284] flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">
                              <Upload size={22} />
                            </div>
                            <span className="text-xs sm:text-sm font-bold text-slate-800 dark:text-zinc-200 group-hover:text-[#742284] transition-colors">
                              {qrProcessing ? 'Procesando imagen del QR…' : 'Subir captura del Código QR de Yape'}
                            </span>
                            <span className="text-[11px] text-slate-400 dark:text-zinc-500 mt-1 max-w-sm">
                              Toma una captura de pantalla a tu QR en tu app Yape y súbela aquí (PNG, JPG o WebP).
                            </span>
                            <input
                              type="file"
                              accept="image/*"
                              disabled={qrProcessing}
                              className="hidden"
                              onChange={(e) => handleQrUpload('yape', e.target.files?.[0])}
                            />
                          </label>
                        )}
                      </div>
                    </div>
                  )}

                  {/* TAB 2: PLIN CONFIGURATION */}
                  {activePaymentTab === 'plin' && (
                    <div className="space-y-4 animate-fade-in">
                      <div className="flex items-center justify-between p-3 rounded-xl bg-cyan-50 dark:bg-cyan-950/20 border border-cyan-200/70 dark:border-cyan-800/30 text-xs">
                        <div className="flex items-center gap-2 text-cyan-900 dark:text-cyan-300">
                          <Smartphone size={16} className="text-[#00b49f]" />
                          <span>Muestra tu código QR de Plin para cobros rápidos con Interbank, BBVA, Scotiabank y BanBif.</span>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1.5 uppercase tracking-wider">
                            Número de Celular Plin *
                          </label>
                          <input
                            type="text"
                            placeholder="Ej: 987 654 321"
                            value={payments?.plin?.phone || ''}
                            onChange={(e) => updatePaymentField('plin', 'phone', e.target.value)}
                            className="w-full bg-slate-50 dark:bg-zinc-800/80 border border-slate-200 dark:border-zinc-700 rounded-xl px-4 py-2.5 text-xs sm:text-sm font-mono font-bold text-slate-900 dark:text-zinc-100 outline-none focus:bg-white dark:focus:bg-zinc-900 focus:border-[#00b49f] focus:ring-2 focus:ring-cyan-500/10 transition-all placeholder:text-slate-400"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1.5 uppercase tracking-wider">
                            Titular de la Cuenta Plin
                          </label>
                          <input
                            type="text"
                            placeholder="Ej: CYA STORE / Juan Pérez"
                            value={payments?.plin?.holder || ''}
                            onChange={(e) => updatePaymentField('plin', 'holder', e.target.value)}
                            className="w-full bg-slate-50 dark:bg-zinc-800/80 border border-slate-200 dark:border-zinc-700 rounded-xl px-4 py-2.5 text-xs sm:text-sm font-semibold text-slate-900 dark:text-zinc-100 outline-none focus:bg-white dark:focus:bg-zinc-900 focus:border-[#00b49f] focus:ring-2 focus:ring-cyan-500/10 transition-all placeholder:text-slate-400"
                          />
                        </div>
                      </div>

                      {/* QR Image Upload Section */}
                      <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1.5 uppercase tracking-wider flex items-center justify-between">
                          <span>Captura / Imagen del Código QR de Plin</span>
                          {payments?.plin?.qr_image && (
                            <span className="text-emerald-600 dark:text-emerald-400 font-bold text-[11px] flex items-center gap-1">
                              <CheckCircle2 size={13} /> QR Activo
                            </span>
                          )}
                        </label>

                        {payments?.plin?.qr_image ? (
                          <div className="flex flex-col sm:flex-row items-center gap-4 p-4 rounded-2xl bg-slate-50 dark:bg-zinc-800/50 border border-slate-200 dark:border-zinc-700">
                            <div className="relative w-36 h-36 bg-white p-2 rounded-xl border border-slate-200 dark:border-zinc-600 shadow-xs shrink-0 flex items-center justify-center overflow-hidden">
                              <img
                                src={payments.plin.qr_image}
                                alt="QR Plin"
                                className="w-full h-full object-contain"
                              />
                            </div>
                            <div className="space-y-2 text-center sm:text-left flex-1 min-w-0">
                              <p className="text-xs font-bold text-slate-800 dark:text-zinc-200">
                                Captura de QR de Plin cargada correctamente
                              </p>
                              <p className="text-[11px] text-slate-400 dark:text-zinc-500">
                                Tus clientes verán este QR al presionar &quot;Plin&quot; en Nueva Venta.
                              </p>
                              <div className="flex flex-wrap items-center gap-2 pt-1 justify-center sm:justify-start">
                                <label className="px-3 py-1.5 rounded-lg bg-white dark:bg-zinc-700 hover:bg-slate-100 dark:hover:bg-zinc-600 border border-slate-200 dark:border-zinc-600 text-xs font-bold text-slate-700 dark:text-zinc-200 cursor-pointer transition-all flex items-center gap-1.5 shadow-2xs">
                                  <Upload size={13} />
                                  <span>Cambiar imagen</span>
                                  <input
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={(e) => handleQrUpload('plin', e.target.files?.[0])}
                                  />
                                </label>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveQr('plin')}
                                  className="px-3 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 dark:bg-rose-500/10 dark:hover:bg-rose-500/20 text-xs font-bold text-rose-600 dark:text-rose-400 cursor-pointer transition-all flex items-center gap-1.5"
                                >
                                  <Trash2 size={13} />
                                  <span>Quitar QR</span>
                                </button>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <label className="border-2 border-dashed border-cyan-300 dark:border-cyan-800/60 hover:border-[#00b49f] bg-cyan-50/40 dark:bg-cyan-950/10 hover:bg-cyan-50/80 rounded-2xl p-6 flex flex-col items-center justify-center text-center cursor-pointer transition-all group">
                            <div className="w-12 h-12 rounded-2xl bg-[#00b49f]/10 text-[#00b49f] flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">
                              <Upload size={22} />
                            </div>
                            <span className="text-xs sm:text-sm font-bold text-slate-800 dark:text-zinc-200 group-hover:text-[#00b49f] transition-colors">
                              {qrProcessing ? 'Procesando imagen del QR…' : 'Subir captura del Código QR de Plin'}
                            </span>
                            <span className="text-[11px] text-slate-400 dark:text-zinc-500 mt-1 max-w-sm">
                              Toma una captura de pantalla a tu QR en Plin / Interbank / BBVA y súbela aquí.
                            </span>
                            <input
                              type="file"
                              accept="image/*"
                              disabled={qrProcessing}
                              className="hidden"
                              onChange={(e) => handleQrUpload('plin', e.target.files?.[0])}
                            />
                          </label>
                        )}
                      </div>
                    </div>
                  )}

                  {/* TAB 3: BANK TRANSFER / CCI CONFIGURATION */}
                  {activePaymentTab === 'transfer' && (
                    <div className="space-y-4 animate-fade-in">
                      <div className="flex items-center justify-between p-3 rounded-xl bg-blue-50 dark:bg-blue-950/20 border border-blue-200/70 dark:border-blue-800/30 text-xs">
                        <div className="flex items-center gap-2 text-blue-900 dark:text-blue-300">
                          <Building2 size={16} className="text-blue-600" />
                          <span>Datos bancarios para depósitos directos y transferencias interbancarias (CCI).</span>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1.5 uppercase tracking-wider">
                            Entidad Bancaria
                          </label>
                          <select
                            value={payments?.transfer?.bank || 'BCP'}
                            onChange={(e) => updatePaymentField('transfer', 'bank', e.target.value)}
                            className="w-full bg-slate-50 dark:bg-zinc-800/80 border border-slate-200 dark:border-zinc-700 rounded-xl px-4 py-2.5 text-xs sm:text-sm font-semibold text-slate-900 dark:text-zinc-100 outline-none focus:bg-white dark:focus:bg-zinc-900 focus:border-blue-600 cursor-pointer"
                          >
                            <option value="BCP">Banco de Crédito (BCP)</option>
                            <option value="BBVA">BBVA Perú</option>
                            <option value="Interbank">Interbank</option>
                            <option value="Scotiabank">Scotiabank</option>
                            <option value="Banco de la Nación">Banco de la Nación</option>
                            <option value="BanBif">BanBif</option>
                            <option value="Pichincha">Banco Pichincha</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1.5 uppercase tracking-wider">
                            Titular de la Cuenta
                          </label>
                          <input
                            type="text"
                            placeholder="Ej: CYA STORE SAC"
                            value={payments?.transfer?.holder || ''}
                            onChange={(e) => updatePaymentField('transfer', 'holder', e.target.value)}
                            className="w-full bg-slate-50 dark:bg-zinc-800/80 border border-slate-200 dark:border-zinc-700 rounded-xl px-4 py-2.5 text-xs sm:text-sm font-semibold text-slate-900 dark:text-zinc-100 outline-none focus:bg-white dark:focus:bg-zinc-900 focus:border-blue-600 transition-all placeholder:text-slate-400"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1.5 uppercase tracking-wider">
                            Número de Cuenta
                          </label>
                          <input
                            type="text"
                            placeholder="Ej: 193-12345678-0-99"
                            value={payments?.transfer?.account_number || ''}
                            onChange={(e) => updatePaymentField('transfer', 'account_number', e.target.value)}
                            className="w-full bg-slate-50 dark:bg-zinc-800/80 border border-slate-200 dark:border-zinc-700 rounded-xl px-4 py-2.5 text-xs sm:text-sm font-mono font-bold text-slate-900 dark:text-zinc-100 outline-none focus:bg-white dark:focus:bg-zinc-900 focus:border-blue-600 transition-all placeholder:text-slate-400"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1.5 uppercase tracking-wider">
                            Código de Cuenta Interbancario (CCI)
                          </label>
                          <input
                            type="text"
                            placeholder="Ej: 002-193-001234567899-12"
                            value={payments?.transfer?.cci || ''}
                            onChange={(e) => updatePaymentField('transfer', 'cci', e.target.value)}
                            className="w-full bg-slate-50 dark:bg-zinc-800/80 border border-slate-200 dark:border-zinc-700 rounded-xl px-4 py-2.5 text-xs sm:text-sm font-mono font-bold text-slate-900 dark:text-zinc-100 outline-none focus:bg-white dark:focus:bg-zinc-900 focus:border-blue-600 transition-all placeholder:text-slate-400"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>

              </div>

              {/* ─── RIGHT COLUMN: LIVE THERMAL TICKET MOCKUP & ACTIONS (5 COLS) ─── */}
              <div className="lg:col-span-5 space-y-5">

                {/* CARD: LIVE THERMAL RECEIPT MOCKUP */}
                <div className="bg-white dark:bg-[#141417] rounded-2xl border border-slate-200/80 dark:border-zinc-800 p-5 sm:p-6 shadow-xs space-y-3.5">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-zinc-800">
                    <div className="flex items-center gap-2">
                      <Printer size={16} className="text-brand dark:text-blue-400" />
                      <h3 className="text-sm font-bold text-slate-900 dark:text-zinc-100">
                        Vista Previa de Boleta en Vivo
                      </h3>
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-500/20">
                      En vivo
                    </span>
                  </div>

                  <p className="text-xs text-slate-400 dark:text-zinc-500">
                    Simulación del ticket térmico que recibirán tus clientes al finalizar una venta:
                  </p>

                  {/* REALISTIC THERMAL RECEIPT CONTAINER */}
                  <div className="bg-white text-slate-900 p-5 rounded-2xl border-2 border-dashed border-slate-300 shadow-md font-sans text-xs leading-relaxed max-w-[320px] mx-auto select-none">
                    
                    {/* Header */}
                    <div className="text-center pb-3 border-b border-dashed border-slate-300 space-y-1">
                      <div className="w-12 h-12 mx-auto rounded-full overflow-hidden bg-slate-900 flex items-center justify-center shadow-xs">
                        {form.logo_url && !logoPreviewError ? (
                          <img
                            src={form.logo_url}
                            alt="Logo"
                            className="w-full h-full object-contain p-1"
                            onError={() => setLogoPreviewError(true)}
                          />
                        ) : (
                          <Building2 size={22} className="text-white" />
                        )}
                      </div>

                      <h4 className="font-extrabold text-sm tracking-tight text-slate-900 uppercase mt-1">
                        {form.name.trim() || 'NOMBRE DE EMPRESA'}
                      </h4>

                      {form.ruc ? (
                        <p className="font-mono text-[11px] font-bold text-slate-700">
                          R.U.C. {form.ruc}
                        </p>
                      ) : (
                        <p className="font-mono text-[10px] text-slate-400 italic">
                          R.U.C. 20XXXXXXXXX
                        </p>
                      )}

                      {form.address && (
                        <p className="text-[10px] text-slate-500 leading-tight">
                          {form.address}
                        </p>
                      )}

                      {form.phone && (
                        <p className="text-[10px] text-slate-500 font-mono">
                          Telf: {form.phone}
                        </p>
                      )}
                    </div>

                    {/* Correlative */}
                    <div className="my-2.5 p-2 rounded-lg bg-slate-50 border border-slate-200 text-center">
                      <p className="text-[9px] font-extrabold uppercase tracking-widest text-slate-400">
                        Boleta de Venta Electrónica
                      </p>
                      <p className="font-mono font-extrabold text-xs text-slate-900 mt-0.5 tracking-wider">
                        B001-000428
                      </p>
                    </div>

                    {/* Sample Client & Date */}
                    <div className="space-y-0.5 text-[10.5px] pb-2 border-b border-dashed border-slate-200">
                      <div className="flex justify-between">
                        <span className="text-slate-400">Fecha:</span>
                        <span className="font-mono">{new Date().toLocaleDateString('es-PE')}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Cliente:</span>
                        <span className="font-bold truncate max-w-[150px]">Cliente Mostrador</span>
                      </div>
                    </div>

                    {/* Sample Items */}
                    <div className="py-2.5 space-y-1.5 text-[11px] border-b border-dashed border-slate-200 font-mono">
                      <div className="flex justify-between items-start">
                        <span>1x AirPods 3 Pro</span>
                        <span className="font-bold">{form.currency || 'S/'} 120.00</span>
                      </div>
                      <div className="flex justify-between items-start text-slate-500">
                        <span>1x Case Silicona MagSafe</span>
                        <span>{form.currency || 'S/'} 29.00</span>
                      </div>
                    </div>

                    {/* Total */}
                    <div className="py-2.5 flex items-center justify-between text-xs font-bold border-b border-dashed border-slate-300">
                      <span className="uppercase tracking-wider">Total a Pagar</span>
                      <span className="text-base font-extrabold text-brand font-mono">
                        {form.currency || 'S/'} 149.00
                      </span>
                    </div>

                    {/* Footer Message */}
                    <div className="pt-3 text-center">
                      <p className="text-[9.5px] text-slate-500 leading-relaxed italic">
                        {form.footer_message || '¡Gracias por su preferencia!'}
                      </p>
                    </div>

                  </div>
                </div>

                {/* CARD: ACTIONS & PERSISTENCE */}
                <div className="bg-white dark:bg-[#141417] rounded-2xl border border-slate-200/80 dark:border-zinc-800 p-5 shadow-xs space-y-3">
                  <button
                    type="submit"
                    disabled={saving || !form.name.trim()}
                    className="w-full py-3 px-4 rounded-xl bg-brand hover:bg-brand-hover text-white font-bold text-sm flex items-center justify-center gap-2 shadow-sm hover:shadow-card active:scale-[0.98] transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {saving ? (
                      <>
                        <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                        <span>Guardando cambios…</span>
                      </>
                    ) : (
                      <>
                        <Save size={16} />
                        <span>Guardar Perfil de Empresa</span>
                      </>
                    )}
                  </button>

                  <div className="text-center">
                    <p className="text-[11px] text-slate-400 dark:text-zinc-500">
                      Los cambios se aplicarán inmediatamente a todas las boletas y ventas de tu negocio.
                    </p>
                  </div>
                </div>

              </div>

            </div>
          </form>
        )}

      </div>
    </AppLayout>
  )
}
