import { useState, useEffect, useMemo } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import {
  ArrowLeft, Building2, User, Phone, Mail, MapPin, FileText,
  Check, AlertCircle, Sparkles, ShoppingBag, DollarSign,
  ShieldCheck, Eye, MessageCircle, Copy, ExternalLink,
  CreditCard, Truck, Clock, CheckCircle2
} from 'lucide-react'
import AppLayout from '../components/layout/AppLayout'
import { suppliersService } from '../services/suppliersService'
import { purchasesService } from '../services/purchasesService'
import { productsService } from '../services/productsService'

const fmt = (n) =>
  `S/ ${(Number(n) || 0).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

const fmtN = (n) => (Number(n) || 0).toLocaleString('es-PE')

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
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + (parts[1]?.[0] || '')).toUpperCase()
}

const cleanPhone = (phone = '') => phone.replace(/\D/g, '')

export default function NewSupplier() {
  const navigate = useNavigate()
  const { id } = useParams()
  const isEditing = Boolean(id)

  const [form, setForm] = useState({
    name: '',
    ruc: '',
    contact_name: '',
    email: '',
    phone: '',
    address: '',
    notes: ''
  })

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [originalSupplier, setOriginalSupplier] = useState(null)

  // Contextual stats for editing mode
  const [supplierPurchases, setSupplierPurchases] = useState([])
  const [supplierProducts, setSupplierProducts] = useState([])

  useEffect(() => {
    async function initData() {
      setLoading(true)
      try {
        const [sups, purches, prods] = await Promise.all([
          suppliersService.list().catch(() => []),
          purchasesService.list().catch(() => []),
          productsService.list().catch(() => [])
        ])

        if (isEditing) {
          const current = (sups || []).find((s) => String(s.id) === String(id))
          if (current) {
            setOriginalSupplier(current)
            setForm({
              name: current.name || '',
              ruc: current.ruc || '',
              contact_name: current.contact_name || '',
              email: current.email || '',
              phone: current.phone || '',
              address: current.address || '',
              notes: current.notes || ''
            })

            const purList = (purches || []).filter((p) => String(p.supplier_id) === String(id))
            setSupplierPurchases(purList)

            const prodList = (prods || []).filter((p) => String(p.supplier_id) === String(id))
            setSupplierProducts(prodList)
          } else {
            setError('No se encontró el proveedor solicitado.')
          }
        }
      } catch (err) {
        console.error('Error cargando proveedor:', err)
        setError('Error al conectar con la base de datos.')
      } finally {
        setLoading(false)
      }
    }

    initData()
  }, [id, isEditing])

  // Computed summary metrics if editing
  const editingMetrics = useMemo(() => {
    const totalOrders = supplierPurchases.length
    const totalSpent = supplierPurchases.reduce((sum, p) => sum + purchasesService.purchaseTotal(p), 0)
    const productCount = supplierProducts.length
    return { totalOrders, totalSpent, productCount }
  }, [supplierPurchases, supplierProducts])

  // Avatar gradient based on name
  const avatarStyle = useMemo(() => {
    const hash = (form.name || 'P').split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
    return AVATAR_PALETTES[hash % AVATAR_PALETTES.length]
  }, [form.name])

  // Form submission
  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    const cleanName = form.name.trim()
    if (!cleanName) {
      setError('El nombre o razón social del proveedor es obligatorio.')
      return
    }

    setSaving(true)
    try {
      const payload = {
        name: cleanName,
        ruc: form.ruc.trim(),
        contact_name: form.contact_name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        address: form.address.trim(),
        notes: form.notes ? form.notes.trim() : ''
      }

      if (isEditing) {
        await suppliersService.update(id, payload)
      } else {
        await suppliersService.create(payload)
      }

      navigate('/proveedores', {
        state: {
          created: !isEditing,
          updated: isEditing,
          supplierName: cleanName
        }
      })
    } catch (err) {
      console.error(err)
      setError(err.message || 'No se pudo guardar la información del proveedor.')
      setSaving(false)
    }
  }

  return (
    <AppLayout title={isEditing ? 'Modificar Proveedor' : 'Nuevo Proveedor'}>
      <div className="space-y-6 max-w-6xl mx-auto pb-16">

        {/* ═════════════════════════════════════════════════════════
            0. EXECUTIVE BREADCRUMB & TOP HEADER BAR
           ═════════════════════════════════════════════════════════ */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-[#141417] p-5 rounded-2xl border border-slate-200/80 dark:border-zinc-800 shadow-xs">
          <div className="flex items-center gap-3.5">
            <button
              type="button"
              onClick={() => navigate('/proveedores')}
              className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 flex items-center justify-center text-slate-600 dark:text-zinc-300 hover:bg-slate-200 dark:hover:bg-zinc-700 transition-all cursor-pointer shadow-xs active:scale-95"
              title="Regresar a Proveedores"
            >
              <ArrowLeft size={18} />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <Link to="/proveedores" className="text-xs font-semibold text-slate-400 hover:text-brand transition-colors">
                  Proveedores
                </Link>
                <span className="text-xs text-slate-300 dark:text-zinc-600">/</span>
                <span className="text-xs font-bold text-brand dark:text-blue-400">
                  {isEditing ? 'Ficha de Proveedor' : 'Nuevo Registro'}
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-zinc-100 tracking-tight mt-0.5 font-display">
                {isEditing ? `Editar: ${originalSupplier?.name || form.name}` : 'Registrar Nuevo Proveedor'}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-blue-50 text-brand dark:bg-blue-500/15 dark:text-blue-300 border border-blue-200 dark:border-blue-500/30">
              <Building2 size={14} /> Cadena de Suministro
            </span>
          </div>
        </div>

        {/* ═════════════════════════════════════════════════════════
            ERROR NOTIFICATION
           ═════════════════════════════════════════════════════════ */}
        {error && (
          <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 text-rose-800 dark:text-rose-300 text-xs flex items-center gap-2.5 shadow-xs animate-slide-up">
            <AlertCircle size={18} className="shrink-0 text-rose-600 dark:text-rose-400" />
            <span className="font-semibold">{error}</span>
          </div>
        )}

        {/* ═════════════════════════════════════════════════════════
            MAIN FORM: 2 COLUMNS (FISCAL & CONTACT | LIVE PREVIEW)
           ═════════════════════════════════════════════════════════ */}
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">

            {/* ─── LEFT COLUMN: SUPPLIER DATA & TERMS (7 COLS) ─── */}
            <div className="lg:col-span-7 space-y-5">

              {/* CARD 1: FISCAL & IDENTIFICATION DATA */}
              <div className="bg-white dark:bg-[#141417] rounded-2xl border border-slate-200/80 dark:border-zinc-800 p-5 sm:p-6 shadow-xs space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-zinc-800">
                  <div className="flex items-center gap-2">
                    <Building2 size={16} className="text-brand dark:text-blue-400" />
                    <h3 className="text-sm font-bold text-slate-900 dark:text-zinc-100">
                      1. Identificación Fiscal y Comercial
                    </h3>
                  </div>
                  <span className="text-[11px] text-slate-400 dark:text-zinc-500 font-medium">Campos obligatorios *</span>
                </div>

                <div className="space-y-4">
                  {/* Company Name */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1.5 uppercase tracking-wider">
                      Nombre Comercial / Razón Social *
                    </label>
                    <input
                      type="text"
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      placeholder="Ej: Distribuidora Tech SAC, Importaciones Lima EIRL…"
                      required
                      autoFocus
                      className="w-full bg-slate-50 dark:bg-zinc-800/80 border border-slate-200 dark:border-zinc-700 rounded-xl px-4 py-2.5 text-xs sm:text-sm text-slate-900 dark:text-zinc-100 font-semibold outline-none focus:bg-white dark:focus:bg-zinc-900 focus:border-brand focus:ring-2 focus:ring-brand/10 transition-all placeholder:text-slate-400 dark:placeholder:text-zinc-500"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* RUC / Tax ID */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1.5 uppercase tracking-wider">
                        RUC / Documento Tributario
                      </label>
                      <input
                        type="text"
                        value={form.ruc}
                        maxLength={11}
                        onChange={(e) => setForm({ ...form, ruc: e.target.value.replace(/\D/g, '') })}
                        placeholder="Ej: 20601234567"
                        className="w-full bg-slate-50 dark:bg-zinc-800/80 border border-slate-200 dark:border-zinc-700 rounded-xl px-4 py-2.5 text-xs sm:text-sm font-mono font-bold text-slate-900 dark:text-zinc-100 outline-none focus:bg-white dark:focus:bg-zinc-900 focus:border-brand focus:ring-2 focus:ring-brand/10 transition-all placeholder:text-slate-400 dark:placeholder:text-zinc-500"
                      />
                      <p className="text-[10.5px] text-slate-400 dark:text-zinc-500 mt-1">
                        {form.ruc.length === 11 ? (
                          <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                            <CheckCircle2 size={12} /> Formato RUC válido (11 dígitos)
                          </span>
                        ) : (
                          'RUC válido en SUNAT (11 dígitos)'
                        )}
                      </p>
                    </div>

                    {/* Contact Person */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1.5 uppercase tracking-wider">
                        Persona de Contacto
                      </label>
                      <input
                        type="text"
                        value={form.contact_name}
                        onChange={(e) => setForm({ ...form, contact_name: e.target.value })}
                        placeholder="Ej: Carlos Vega (Ejecutivo de Ventas)"
                        className="w-full bg-slate-50 dark:bg-zinc-800/80 border border-slate-200 dark:border-zinc-700 rounded-xl px-4 py-2.5 text-xs sm:text-sm text-slate-900 dark:text-zinc-100 outline-none focus:bg-white dark:focus:bg-zinc-900 focus:border-brand focus:ring-2 focus:ring-brand/10 transition-all placeholder:text-slate-400 dark:placeholder:text-zinc-500"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* CARD 2: CONTACT CHANNELS & LOCATION */}
              <div className="bg-white dark:bg-[#141417] rounded-2xl border border-slate-200/80 dark:border-zinc-800 p-5 sm:p-6 shadow-xs space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-zinc-800">
                  <div className="flex items-center gap-2">
                    <Phone size={16} className="text-brand dark:text-blue-400" />
                    <h3 className="text-sm font-bold text-slate-900 dark:text-zinc-100">
                      2. Canales de Contacto y Ubicación
                    </h3>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Phone / WhatsApp */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1.5 uppercase tracking-wider">
                      Teléfono / WhatsApp
                    </label>
                    <input
                      type="text"
                      value={form.phone}
                      onChange={(e) => setForm({ ...form, phone: e.target.value })}
                      placeholder="Ej: +51 987 654 321"
                      className="w-full bg-slate-50 dark:bg-zinc-800/80 border border-slate-200 dark:border-zinc-700 rounded-xl px-4 py-2.5 text-xs sm:text-sm text-slate-900 dark:text-zinc-100 outline-none focus:bg-white dark:focus:bg-zinc-900 focus:border-brand focus:ring-2 focus:ring-brand/10 transition-all placeholder:text-slate-400 dark:placeholder:text-zinc-500"
                    />
                  </div>

                  {/* Email */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1.5 uppercase tracking-wider">
                      Correo Electrónico
                    </label>
                    <input
                      type="email"
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      placeholder="Ej: [email protected]"
                      className="w-full bg-slate-50 dark:bg-zinc-800/80 border border-slate-200 dark:border-zinc-700 rounded-xl px-4 py-2.5 text-xs sm:text-sm text-slate-900 dark:text-zinc-100 outline-none focus:bg-white dark:focus:bg-zinc-900 focus:border-brand focus:ring-2 focus:ring-brand/10 transition-all placeholder:text-slate-400 dark:placeholder:text-zinc-500"
                    />
                  </div>

                  {/* Fiscal Address */}
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1.5 uppercase tracking-wider">
                      Dirección Fiscal / Almacén Central
                    </label>
                    <input
                      type="text"
                      value={form.address}
                      onChange={(e) => setForm({ ...form, address: e.target.value })}
                      placeholder="Ej: Av. Argentina 450, Cercado de Lima, Lima"
                      className="w-full bg-slate-50 dark:bg-zinc-800/80 border border-slate-200 dark:border-zinc-700 rounded-xl px-4 py-2.5 text-xs sm:text-sm text-slate-900 dark:text-zinc-100 outline-none focus:bg-white dark:focus:bg-zinc-900 focus:border-brand focus:ring-2 focus:ring-brand/10 transition-all placeholder:text-slate-400 dark:placeholder:text-zinc-500"
                    />
                  </div>
                </div>
              </div>

              {/* CARD 3: COMMERCIAL TERMS & NOTES (OPTIONAL) */}
              <div className="bg-white dark:bg-[#141417] rounded-2xl border border-slate-200/80 dark:border-zinc-800 p-5 sm:p-6 shadow-xs space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-zinc-800">
                  <div className="flex items-center gap-2">
                    <FileText size={16} className="text-brand dark:text-blue-400" />
                    <h3 className="text-sm font-bold text-slate-900 dark:text-zinc-100">
                      3. Términos Comerciales y Notas Internas
                    </h3>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1.5 uppercase tracking-wider">
                    Condiciones de Pago y Entrega (Opcional)
                  </label>
                  <textarea
                    rows={3}
                    value={form.notes}
                    onChange={(e) => setForm({ ...form, notes: e.target.value })}
                    placeholder="Ej: Crédito a 15 días, entrega en almacén central, cuenta corriente BCP soles…"
                    className="w-full bg-slate-50 dark:bg-zinc-800/80 border border-slate-200 dark:border-zinc-700 rounded-xl px-4 py-2.5 text-xs sm:text-sm text-slate-900 dark:text-zinc-100 outline-none focus:bg-white dark:focus:bg-zinc-900 focus:border-brand focus:ring-2 focus:ring-brand/10 transition-all placeholder:text-slate-400 dark:placeholder:text-zinc-500 leading-relaxed"
                  />
                </div>
              </div>

            </div>

            {/* ─── RIGHT COLUMN: LIVE PREVIEW & ACTIONS (5 COLS) ─── */}
            <div className="lg:col-span-5 space-y-5">

              {/* CARD: LIVE SUPPLIER CARD PREVIEW */}
              <div className="bg-white dark:bg-[#141417] rounded-2xl border border-slate-200/80 dark:border-zinc-800 p-5 sm:p-6 shadow-xs space-y-3.5">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-zinc-800">
                  <div className="flex items-center gap-2">
                    <Eye size={16} className="text-brand dark:text-blue-400" />
                    <h3 className="text-sm font-bold text-slate-900 dark:text-zinc-100">
                      Ficha Comercial en Tiempo Real
                    </h3>
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-500/20">
                    En vivo
                  </span>
                </div>

                <p className="text-xs text-slate-400 dark:text-zinc-500">
                  Así se presentará la tarjeta en el directorio de compras:
                </p>

                {/* THE MOCK CARD */}
                <div className="bg-white dark:bg-[#18181c] rounded-2xl border border-slate-200 dark:border-zinc-700 p-5 shadow-sm space-y-4">
                  <div className="flex items-start gap-3">
                    <div
                      className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${avatarStyle.bg} flex items-center justify-center font-black text-base text-white shrink-0 shadow-xs`}
                    >
                      {getInitials(form.name || 'PR')}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h4 className="font-bold text-slate-900 dark:text-zinc-100 text-base leading-snug truncate">
                        {form.name.trim() || 'Razón Social del Proveedor'}
                      </h4>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs font-mono font-bold text-slate-500 dark:text-zinc-400 bg-slate-100 dark:bg-zinc-800 px-2 py-0.5 rounded-md">
                          {form.ruc ? `RUC ${form.ruc}` : 'RUC Pendiente'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Contact details */}
                  <div className="space-y-2 text-xs pt-3 border-t border-slate-100 dark:border-zinc-800 text-slate-600 dark:text-zinc-400">
                    <div className="flex items-center gap-2">
                      <User size={13} className="text-slate-400 shrink-0" />
                      <span className="truncate">
                        Contacto: <strong className="text-slate-800 dark:text-zinc-200">{form.contact_name || 'No especificado'}</strong>
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <Phone size={13} className="text-slate-400 shrink-0" />
                      <span className="truncate font-mono">{form.phone || 'Sin teléfono'}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <Mail size={13} className="text-slate-400 shrink-0" />
                      <span className="truncate">{form.email || 'Sin correo electrónico'}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <MapPin size={13} className="text-slate-400 shrink-0" />
                      <span className="truncate">{form.address || 'Sin dirección fiscal'}</span>
                    </div>
                  </div>

                  {/* Micro stats preview */}
                  <div className="grid grid-cols-2 gap-2 text-center pt-2">
                    <div className="bg-slate-50 dark:bg-zinc-800/50 rounded-xl p-2 border border-slate-100 dark:border-zinc-800">
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Órdenes</p>
                      <p className="font-extrabold text-slate-900 dark:text-zinc-100 text-sm font-display">
                        {isEditing ? editingMetrics.totalOrders : 0} compras
                      </p>
                    </div>

                    <div className="bg-slate-50 dark:bg-zinc-800/50 rounded-xl p-2 border border-slate-100 dark:border-zinc-800">
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Total Invertido</p>
                      <p className="font-extrabold text-brand dark:text-blue-400 text-sm font-display truncate">
                        {isEditing ? fmt(editingMetrics.totalSpent) : 'S/ 0.00'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* CARD: CONTEXTUAL STATS (IF EDITING) */}
              {isEditing && (
                <div className="bg-white dark:bg-[#141417] rounded-2xl border border-slate-200/80 dark:border-zinc-800 p-5 shadow-xs space-y-3">
                  <div className="flex items-center gap-2 text-slate-900 dark:text-zinc-100 font-bold text-sm">
                    <ShoppingBag size={16} className="text-brand dark:text-blue-400" />
                    <span>Relación Comercial y Compras</span>
                  </div>

                  <div className="space-y-2 text-xs text-slate-600 dark:text-zinc-400">
                    <div className="flex justify-between py-1 border-b border-slate-100 dark:border-zinc-800">
                      <span>Órdenes de compra registradas:</span>
                      <strong className="text-slate-900 dark:text-zinc-100">{editingMetrics.totalOrders}</strong>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-100 dark:border-zinc-800">
                      <span>Inversión total acumulada:</span>
                      <strong className="text-brand dark:text-blue-400 font-bold">{fmt(editingMetrics.totalSpent)}</strong>
                    </div>
                    <div className="flex justify-between py-1">
                      <span>SKUs provistos en catálogo:</span>
                      <strong className="text-slate-900 dark:text-zinc-100">{editingMetrics.productCount} artículos</strong>
                    </div>
                  </div>
                </div>
              )}

              {/* CARD: SUBMIT & CANCEL BUTTONS */}
              <div className="bg-white dark:bg-[#141417] rounded-2xl border border-slate-200/80 dark:border-zinc-800 p-5 shadow-xs space-y-3">
                <button
                  type="submit"
                  disabled={saving || !form.name.trim()}
                  className="w-full py-3 px-4 rounded-xl bg-brand hover:bg-brand-hover text-white font-bold text-sm flex items-center justify-center gap-2 shadow-sm hover:shadow-card active:scale-[0.98] transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? (
                    <>
                      <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                      <span>Guardando proveedor…</span>
                    </>
                  ) : (
                    <>
                      <Check size={16} />
                      <span>{isEditing ? 'Guardar Cambios' : 'Registrar Proveedor'}</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => navigate('/proveedores')}
                  className="w-full py-2.5 px-4 rounded-xl bg-slate-50 dark:bg-zinc-800/80 hover:bg-slate-100 dark:hover:bg-zinc-700 text-slate-600 dark:text-zinc-300 text-xs font-semibold flex items-center justify-center transition-colors cursor-pointer border border-slate-200 dark:border-zinc-700"
                >
                  Cancelar y Regresar
                </button>
              </div>

            </div>

          </div>
        </form>

      </div>
    </AppLayout>
  )
}

