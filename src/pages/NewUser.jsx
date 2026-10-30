import { useState, useEffect, useMemo } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import {
  ArrowLeft, UserCog, ShieldCheck, User, Mail, Lock, Key,
  Eye, EyeOff, Check, AlertCircle, Sparkles, Crown, ArrowRight,
  ShieldAlert, CheckCircle2, Building2, ToggleLeft, ToggleRight
} from 'lucide-react'
import AppLayout from '../components/layout/AppLayout'
import { usersService } from '../services/usersService'
import { companySettingsService } from '../services/companySettingsService'
import { getLimits } from '../lib/planLimits'
import { isSupabaseConfigured } from '../lib/supabaseClient'

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

export default function NewUser() {
  const navigate = useNavigate()
  const { id } = useParams()
  const isEditing = Boolean(id)

  const [form, setForm] = useState({
    full_name: '',
    email: '',
    password: '',
    role: 'empleado',
    active: true
  })

  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [originalUser, setOriginalUser] = useState(null)

  // Plan limits
  const [limitReached, setLimitReached] = useState(false)
  const [limitMsg, setLimitMsg] = useState('')
  const [companyInfo, setCompanyInfo] = useState(null)
  const [allUsersCount, setAllUsersCount] = useState(0)

  useEffect(() => {
    async function initData() {
      setLoading(true)
      try {
        const [usersList, company] = await Promise.all([
          usersService.list().catch(() => []),
          companySettingsService.get().catch(() => null)
        ])

        setAllUsersCount((usersList || []).length)
        setCompanyInfo(company)

        if (!isEditing) {
          const limits = getLimits(company)
          if ((usersList || []).length >= limits.maxUsers) {
            setLimitReached(true)
            setLimitMsg(`Has alcanzado el límite de tu plan (${limits.maxUsers} usuario). Actualiza a Pro para registrar a tu equipo completo.`)
          }
        } else {
          const current = (usersList || []).find((u) => String(u.id) === String(id))
          if (current) {
            setOriginalUser(current)
            setForm({
              full_name: current.full_name || '',
              email: current.email || '',
              password: '',
              role: current.role || 'empleado',
              active: current.active !== false
            })
          } else {
            setError('No se encontró el usuario solicitado.')
          }
        }
      } catch (err) {
        console.error('Error cargando datos de usuario:', err)
        setError('Error al conectar con la base de datos.')
      } finally {
        setLoading(false)
      }
    }

    initData()
  }, [id, isEditing])

  const avatarStyle = useMemo(() => {
    const hash = (form.full_name || 'U').split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
    return AVATAR_PALETTES[hash % AVATAR_PALETTES.length]
  }, [form.full_name])

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    const cleanName = form.full_name.trim()
    const cleanEmail = form.email.trim()

    if (!cleanName) {
      setError('El nombre completo es obligatorio.')
      return
    }

    if (!cleanEmail) {
      setError('El correo electrónico es obligatorio.')
      return
    }

    if (!isEditing && !isSupabaseConfigured && !form.password.trim()) {
      setError('La contraseña de acceso es obligatoria para nuevos usuarios.')
      return
    }

    setSaving(true)
    try {
      if (isEditing) {
        const patch = {
          full_name: cleanName,
          email: cleanEmail,
          role: form.role,
          active: form.active
        }
        if (form.password.trim()) {
          patch.password = form.password.trim()
        }
        await usersService.update(id, patch)
      } else {
        if (isSupabaseConfigured) {
          setError('Con Supabase conectado, crea usuarios desde Authentication → Users en la consola de Supabase.')
          setSaving(false)
          return
        }

        await usersService.create({
          full_name: cleanName,
          email: cleanEmail,
          password: form.password.trim(),
          role: form.role,
          active: form.active
        })
      }

      navigate('/usuarios', {
        state: {
          created: !isEditing,
          updated: isEditing,
          userName: cleanName
        }
      })
    } catch (err) {
      console.error(err)
      setError(err.message || 'No se pudo guardar la información del usuario.')
      setSaving(false)
    }
  }

  return (
    <AppLayout title={isEditing ? 'Modificar Usuario' : 'Nuevo Usuario'}>
      <div className="space-y-6 max-w-6xl mx-auto pb-16">

        {/* ═════════════════════════════════════════════════════════
            0. EXECUTIVE BREADCRUMB & TOP HEADER BAR
           ═════════════════════════════════════════════════════════ */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-[#141417] p-5 rounded-2xl border border-slate-200/80 dark:border-zinc-800 shadow-xs">
          <div className="flex items-center gap-3.5">
            <button
              type="button"
              onClick={() => navigate('/usuarios')}
              className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 flex items-center justify-center text-slate-600 dark:text-zinc-300 hover:bg-slate-200 dark:hover:bg-zinc-700 transition-all cursor-pointer shadow-xs active:scale-95"
              title="Regresar a Usuarios"
            >
              <ArrowLeft size={18} />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <Link to="/usuarios" className="text-xs font-semibold text-slate-400 hover:text-brand transition-colors">
                  Usuarios y Roles
                </Link>
                <span className="text-xs text-slate-300 dark:text-zinc-600">/</span>
                <span className="text-xs font-bold text-brand dark:text-blue-400">
                  {isEditing ? 'Ficha de Colaborador' : 'Nuevo Registro'}
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-zinc-100 tracking-tight mt-0.5 font-display">
                {isEditing ? `Editar: ${originalUser?.full_name || form.full_name}` : 'Registrar Nuevo Usuario'}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-purple-50 text-purple-700 dark:bg-purple-500/15 dark:text-purple-300 border border-purple-200 dark:border-purple-500/30">
              <UserCog size={14} /> Control de Acceso y Roles
            </span>
          </div>
        </div>

        {/* ═════════════════════════════════════════════════════════
            PLAN LIMIT NOTICE (IF LIMIT REACHED ON FREE PLAN)
           ═════════════════════════════════════════════════════════ */}
        {limitReached && (
          <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 text-amber-900 dark:text-amber-300 text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
            <div className="flex items-center gap-2.5">
              <Crown size={18} className="text-amber-600 dark:text-amber-400 shrink-0" />
              <span className="font-semibold">{limitMsg}</span>
            </div>
            <Link
              to="/planes"
              className="px-3.5 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition-colors shrink-0"
            >
              <Sparkles size={13} />
              <span>Ver Planes Pro</span>
              <ArrowRight size={13} />
            </Link>
          </div>
        )}

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
            MAIN FORM: 2 COLUMNS (USER DATA & ROLES | LIVE PREVIEW)
           ═════════════════════════════════════════════════════════ */}
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">

            {/* ─── LEFT COLUMN: CREDENTIALS & PERMISSIONS (7 COLS) ─── */}
            <div className="lg:col-span-7 space-y-5">

              {/* CARD 1: PERSONAL & LOGIN CREDENTIALS */}
              <div className="bg-white dark:bg-[#141417] rounded-2xl border border-slate-200/80 dark:border-zinc-800 p-5 sm:p-6 shadow-xs space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-zinc-800">
                  <div className="flex items-center gap-2">
                    <User size={16} className="text-brand dark:text-blue-400" />
                    <h3 className="text-sm font-bold text-slate-900 dark:text-zinc-100">
                      1. Datos Personales y Acceso al Sistema
                    </h3>
                  </div>
                  <span className="text-[11px] text-slate-400 dark:text-zinc-500 font-medium">Campos requeridos *</span>
                </div>

                <div className="space-y-4">
                  {/* Full Name */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1.5 uppercase tracking-wider">
                      Nombre Completo del Colaborador *
                    </label>
                    <input
                      type="text"
                      value={form.full_name}
                      onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                      placeholder="Ej: Lucía Fernández Ramos"
                      required
                      autoFocus
                      className="w-full bg-slate-50 dark:bg-zinc-800/80 border border-slate-200 dark:border-zinc-700 rounded-xl px-4 py-2.5 text-xs sm:text-sm text-slate-900 dark:text-zinc-100 font-semibold outline-none focus:bg-white dark:focus:bg-zinc-900 focus:border-brand focus:ring-2 focus:ring-brand/10 transition-all placeholder:text-slate-400 dark:placeholder:text-zinc-500"
                    />
                  </div>

                  {/* Email */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1.5 uppercase tracking-wider">
                      Correo Electrónico (Usuario de Inicio de Sesión) *
                    </label>
                    <input
                      type="email"
                      value={form.email}
                      disabled={isSupabaseConfigured && isEditing}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      placeholder="Ej: [email protected]"
                      required
                      className="w-full bg-slate-50 dark:bg-zinc-800/80 border border-slate-200 dark:border-zinc-700 rounded-xl px-4 py-2.5 text-xs sm:text-sm text-slate-900 dark:text-zinc-100 font-medium outline-none focus:bg-white dark:focus:bg-zinc-900 focus:border-brand focus:ring-2 focus:ring-brand/10 transition-all placeholder:text-slate-400 dark:placeholder:text-zinc-500 disabled:opacity-50"
                    />
                  </div>

                  {/* Password */}
                  {!isSupabaseConfigured && (
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1.5 uppercase tracking-wider">
                        {isEditing ? 'Nueva Contraseña (Dejar vacío para no modificar)' : 'Contraseña de Acceso *'}
                      </label>
                      <div className="relative">
                        <input
                          type={showPassword ? 'text' : 'password'}
                          value={form.password}
                          onChange={(e) => setForm({ ...form, password: e.target.value })}
                          placeholder={isEditing ? '••••••••' : 'Mínimo 6 caracteres'}
                          required={!isEditing}
                          className="w-full bg-slate-50 dark:bg-zinc-800/80 border border-slate-200 dark:border-zinc-700 rounded-xl pl-4 pr-10 py-2.5 text-xs sm:text-sm text-slate-900 dark:text-zinc-100 font-mono outline-none focus:bg-white dark:focus:bg-zinc-900 focus:border-brand focus:ring-2 focus:ring-brand/10 transition-all placeholder:text-slate-400 dark:placeholder:text-zinc-500"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword((p) => !p)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-zinc-300 cursor-pointer"
                        >
                          {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* CARD 2: ROLES & PERMISSION TIERS */}
              <div className="bg-white dark:bg-[#141417] rounded-2xl border border-slate-200/80 dark:border-zinc-800 p-5 sm:p-6 shadow-xs space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-zinc-800">
                  <div className="flex items-center gap-2">
                    <ShieldCheck size={16} className="text-brand dark:text-blue-400" />
                    <h3 className="text-sm font-bold text-slate-900 dark:text-zinc-100">
                      2. Nivel de Acceso y Privilegios
                    </h3>
                  </div>
                  <span className="text-[11px] font-bold text-brand dark:text-blue-400">
                    {form.role === 'admin' ? 'Acceso Total' : 'Operativo / Ventas'}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {/* ADMIN ROLE CARD */}
                  <div
                    onClick={() => setForm({ ...form, role: 'admin' })}
                    className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between ${
                      form.role === 'admin'
                        ? 'border-brand bg-brand/5 dark:bg-brand/10 shadow-xs ring-2 ring-brand/10'
                        : 'border-slate-200 dark:border-zinc-700 bg-slate-50/60 dark:bg-zinc-800/40 hover:border-slate-300'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="p-2 rounded-xl bg-blue-100 dark:bg-blue-500/20 text-brand dark:text-blue-400">
                          <ShieldCheck size={20} />
                        </span>
                        <input
                          type="radio"
                          name="role"
                          checked={form.role === 'admin'}
                          onChange={() => setForm({ ...form, role: 'admin' })}
                          className="w-4 h-4 text-brand cursor-pointer"
                        />
                      </div>
                      <h4 className="font-bold text-slate-900 dark:text-zinc-100 text-sm">
                        Administrador
                      </h4>
                      <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1 leading-relaxed">
                        Control total: gestión de inventario, finanzas, ventas, usuarios, reportes y configuración de empresa.
                      </p>
                    </div>
                  </div>

                  {/* EMPLEADO ROLE CARD */}
                  <div
                    onClick={() => setForm({ ...form, role: 'empleado' })}
                    className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between ${
                      form.role === 'empleado'
                        ? 'border-brand bg-brand/5 dark:bg-brand/10 shadow-xs ring-2 ring-brand/10'
                        : 'border-slate-200 dark:border-zinc-700 bg-slate-50/60 dark:bg-zinc-800/40 hover:border-slate-300'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="p-2 rounded-xl bg-purple-100 dark:bg-purple-500/20 text-purple-600 dark:text-purple-400">
                          <User size={20} />
                        </span>
                        <input
                          type="radio"
                          name="role"
                          checked={form.role === 'empleado'}
                          onChange={() => setForm({ ...form, role: 'empleado' })}
                          className="w-4 h-4 text-brand cursor-pointer"
                        />
                      </div>
                      <h4 className="font-bold text-slate-900 dark:text-zinc-100 text-sm">
                        Empleado / Vendedor
                      </h4>
                      <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1 leading-relaxed">
                        Acceso operativo: emisión de ventas, cobro en Punto de Venta (POS) y consulta de stock disponible.
                      </p>
                    </div>
                  </div>
                </div>

                {/* ACCOUNT ACTIVE SWITCH */}
                <div className="pt-3 border-t border-slate-100 dark:border-zinc-800 flex items-center justify-between">
                  <div>
                    <p className="font-bold text-xs text-slate-800 dark:text-zinc-200">
                      Estado de la Cuenta
                    </p>
                    <p className="text-[11px] text-slate-400 dark:text-zinc-500">
                      Los usuarios inactivos no pueden ingresar al ERP ni registrar movimientos.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => setForm({ ...form, active: !form.active })}
                    className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                      form.active
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20'
                        : 'bg-slate-100 text-slate-500 border-slate-200 dark:bg-zinc-800 dark:text-zinc-400 dark:border-zinc-700'
                    }`}
                  >
                    {form.active ? <ToggleRight size={18} className="text-emerald-600" /> : <ToggleLeft size={18} className="text-slate-400" />}
                    <span>{form.active ? 'Activo' : 'Inactivo'}</span>
                  </button>
                </div>
              </div>

            </div>

            {/* ─── RIGHT COLUMN: LIVE PREVIEW & ACTIONS (5 COLS) ─── */}
            <div className="lg:col-span-5 space-y-5">

              {/* CARD: LIVE USER BADGE PREVIEW */}
              <div className="bg-white dark:bg-[#141417] rounded-2xl border border-slate-200/80 dark:border-zinc-800 p-5 sm:p-6 shadow-xs space-y-3.5">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-zinc-800">
                  <div className="flex items-center gap-2">
                    <Eye size={16} className="text-brand dark:text-blue-400" />
                    <h3 className="text-sm font-bold text-slate-900 dark:text-zinc-100">
                      Ficha de Usuario en Vivo
                    </h3>
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-500/20">
                    En vivo
                  </span>
                </div>

                <p className="text-xs text-slate-400 dark:text-zinc-500">
                  Así se visualizará la tarjeta del colaborador en tu equipo:
                </p>

                {/* THE MOCK CARD */}
                <div className="bg-white dark:bg-[#18181c] rounded-2xl border border-slate-200 dark:border-zinc-700 p-5 shadow-sm space-y-4">
                  <div className="flex items-center gap-3.5">
                    <div
                      className={`w-13 h-13 rounded-2xl bg-gradient-to-br ${avatarStyle.bg} flex items-center justify-center font-black text-lg text-white shrink-0 shadow-xs`}
                    >
                      {getInitials(form.full_name || 'US')}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h4 className="font-bold text-slate-900 dark:text-zinc-100 text-base leading-snug truncate">
                        {form.full_name.trim() || 'Nombre del Colaborador'}
                      </h4>
                      <p className="text-xs text-slate-400 dark:text-zinc-400 truncate">
                        {form.email.trim() || '[email protected]'}
                      </p>
                    </div>
                  </div>

                  {/* Role and Status pill */}
                  <div className="pt-3 border-t border-slate-100 dark:border-zinc-800 flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      {form.role === 'admin' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-blue-50 text-brand border border-blue-200 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20">
                          <ShieldCheck size={13} /> Administrador
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-purple-50 text-purple-700 border border-purple-200 dark:bg-purple-500/10 dark:text-purple-300 dark:border-purple-500/20">
                          <User size={13} /> Empleado
                        </span>
                      )}
                    </div>

                    <div>
                      {form.active ? (
                        <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                          Activo
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-400">
                          <span className="w-2 h-2 rounded-full bg-slate-400" />
                          Inactivo
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* CARD: PLAN CAPACITY */}
              <div className="bg-white dark:bg-[#141417] rounded-2xl border border-slate-200/80 dark:border-zinc-800 p-5 shadow-xs space-y-3">
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="text-slate-700 dark:text-zinc-300 flex items-center gap-1.5">
                    <Building2 size={14} className="text-brand dark:text-blue-400" />
                    Capacidad de Usuarios en Plan
                  </span>
                  <span className="text-brand dark:text-blue-400">
                    {allUsersCount} {allUsersCount === 1 ? 'usuario registrado' : 'usuarios registrados'}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 dark:text-zinc-500 leading-relaxed">
                  Los administradores tienen acceso a la configuración del negocio, mientras que los empleados solo acceden a las funciones de ventas e inventario.
                </p>
              </div>

              {/* CARD: SUBMIT & CANCEL BUTTONS */}
              <div className="bg-white dark:bg-[#141417] rounded-2xl border border-slate-200/80 dark:border-zinc-800 p-5 shadow-xs space-y-3">
                <button
                  type="submit"
                  disabled={saving || !form.full_name.trim() || !form.email.trim() || limitReached}
                  className="w-full py-3 px-4 rounded-xl bg-brand hover:bg-brand-hover text-white font-bold text-sm flex items-center justify-center gap-2 shadow-sm hover:shadow-card active:scale-[0.98] transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? (
                    <>
                      <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                      <span>Guardando usuario…</span>
                    </>
                  ) : (
                    <>
                      <Check size={16} />
                      <span>{isEditing ? 'Guardar Modificaciones' : 'Registrar Usuario'}</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => navigate('/usuarios')}
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

