import { useState, useEffect, useMemo } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import {
  ArrowLeft, UserCog, ShieldCheck, User, Mail, Lock, Key,
  Eye, EyeOff, Check, AlertCircle, Sparkles, Crown, ArrowRight,
  ShieldAlert, CheckCircle2, Building2, ToggleLeft, ToggleRight, X,
  Shield, CheckCircle, RefreshCw, Smartphone, Layers
} from 'lucide-react'
import AppLayout from '../components/layout/AppLayout'
import { useFormLeaveGuard } from '../hooks/useFormLeaveGuard'
import { usersService } from '../services/usersService'
import { companySettingsService } from '../services/companySettingsService'
import { getLimits } from '../lib/planLimits'
import { isSupabaseConfigured } from '../lib/supabaseClient'
import { isPlatformAdminEmail } from '../lib/superAdmin'

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
  const [error, setError] = useState('')
  const [originalUser, setOriginalUser] = useState(null)

  // 3-Step processing overlay
  const [isProcessing, setIsProcessing] = useState(false)
  const [processingStep, setProcessingStep] = useState(0) // 1: 35%, 2: 75%, 3: 100%

  // Plan limits
  const [limitReached, setLimitReached] = useState(false)
  const [limitMsg, setLimitMsg] = useState('')
  const [companyInfo, setCompanyInfo] = useState(null)
  const [allUsersCount, setAllUsersCount] = useState(0)

  // Detección de cambios sin guardar en el usuario
  const isDirty = useMemo(() => {
    if (isProcessing) return false
    if (!isEditing) {
      return Boolean(form.full_name.trim() || form.email.trim() || form.password.trim())
    }
    if (!originalUser) return false
    return (
      form.full_name !== (originalUser.full_name || '') ||
      form.email !== (originalUser.email || '') ||
      form.role !== (originalUser.role || 'empleado') ||
      Boolean(form.password.trim())
    )
  }, [isProcessing, isEditing, form, originalUser])

  const { requestLeave, DiscardModalComponent } = useFormLeaveGuard({
    isDirty,
    defaultRedirectUrl: '/usuarios',
    modalTitle: isEditing ? '¿Descartar cambios del usuario?' : '¿Descartar nuevo usuario?',
    modalDescription: 'Tienes datos ingresados para este colaborador. Si sales ahora o recargas la pantalla, la cuenta o cambios no se guardarán.'
  })

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

  const pwd = form.password || ''
  const hasMinLength = pwd.length >= 6
  const hasLower = /[a-z]/.test(pwd)
  const hasUpper = /[A-Z]/.test(pwd)
  const hasNumber = /[0-9]/.test(pwd)
  const isPwdValid = hasMinLength && hasLower && hasUpper && hasNumber

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

    if (isPlatformAdminEmail(cleanEmail)) {
      setError('PROTECCIÓN DE SEGURIDAD: El correo ingresado pertenece a la Administración General de la Plataforma (Super Admin). No se puede registrar ni asignar como colaborador de ninguna empresa.')
      return
    }

    if (!isEditing) {
      const pwd = form.password?.trim() || ''
      if (pwd.length < 6) {
        setError('La contraseña debe tener mínimo 6 caracteres.')
        return
      }
      if (!/[a-z]/.test(pwd) || !/[A-Z]/.test(pwd) || !/[0-9]/.test(pwd)) {
        setError('La contraseña debe incluir al menos una letra minúscula, una mayúscula y un número (ejemplo: Carlos123).')
        return
      }
    }

    setIsProcessing(true)
    setProcessingStep(1) // 35%

    try {
      await new Promise((r) => setTimeout(r, 380))
      setProcessingStep(2) // 75%

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
        await usersService.create({
          full_name: cleanName,
          email: cleanEmail,
          password: form.password.trim(),
          role: form.role,
          active: form.active
        })
      }

      setProcessingStep(3) // 100%
      await new Promise((r) => setTimeout(r, 450))

      setIsProcessing(false)
      navigate('/usuarios', {
        state: {
          created: !isEditing,
          updated: isEditing,
          userName: cleanName
        }
      })
    } catch (err) {
      setIsProcessing(false)
      setProcessingStep(0)
      console.error(err)
      setError(err.message || 'No se pudo guardar la información del usuario.')
    }
  }

  return (
    <AppLayout title={isEditing ? 'Modificar Usuario' : 'Nuevo Usuario'}>
      <div className="space-y-4 max-w-6xl mx-auto pb-8 animate-fade-in">

        {/* ═════════════════════════════════════════════════════════
            0. COMPACT BREADCRUMB & TOP HEADER BAR
           ═════════════════════════════════════════════════════════ */}
        <div className="bg-white dark:bg-[#141417] p-3.5 sm:p-4 rounded-2xl border border-slate-200/80 dark:border-zinc-800 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => requestLeave('/usuarios')}
              className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-600 dark:text-zinc-200 flex items-center justify-center transition-colors cursor-pointer active:scale-95 shadow-xs"
              title="Regresar a Usuarios"
            >
              <ArrowLeft size={16} />
            </button>
            <div>
              <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium">
                <span className="hover:text-blue-600 cursor-pointer" onClick={() => requestLeave('/usuarios')}>
                  Usuarios y Roles
                </span>
                <span>/</span>
                <span className="text-blue-600 dark:text-blue-400 font-semibold">
                  {isEditing ? 'Ficha de Colaborador' : 'Nuevo Registro'}
                </span>
              </div>
              <h1 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white tracking-tight">
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
          <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 text-amber-900 dark:text-amber-300 text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
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
          <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 text-rose-800 dark:text-rose-300 text-xs flex items-center justify-between gap-2.5 shadow-xs animate-slide-up">
            <div className="flex items-center gap-2.5">
              <AlertCircle size={16} className="shrink-0 text-rose-600 dark:text-rose-400" />
              <span className="font-semibold">{error}</span>
            </div>
            <button
              type="button"
              onClick={() => setError('')}
              className="text-rose-400 hover:text-rose-700 p-1 cursor-pointer"
            >
              <X size={14} />
            </button>
          </div>
        )}

        {/* ═════════════════════════════════════════════════════════
            MAIN FORM: COMPACT 2-COLUMN SINGLE-SCREEN LAYOUT
           ═════════════════════════════════════════════════════════ */}
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">

            {/* ─── LEFT COLUMN: CREDENTIALS & PERMISSIONS (7 COLS) ─── */}
            <div className="lg:col-span-7 space-y-4">

              {/* CARD 1: PERSONAL & LOGIN CREDENTIALS */}
              <div className="bg-white dark:bg-[#141417] rounded-2xl border border-slate-200/80 dark:border-zinc-800 p-4 sm:p-5 shadow-xs space-y-3.5">
                <div className="flex items-center justify-between pb-2.5 border-b border-slate-100 dark:border-zinc-800">
                  <div className="flex items-center gap-2">
                    <User size={15} className="text-blue-600 dark:text-blue-400" />
                    <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-zinc-100">
                      1. Datos Personales y Credenciales
                    </h3>
                  </div>
                  <span className="text-[10px] sm:text-[11px] text-slate-400 dark:text-zinc-500 font-medium">Campos requeridos *</span>
                </div>

                <div className="space-y-3">
                  {/* Full Name */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-zinc-300 mb-1 uppercase tracking-wider">
                      Nombre Completo del Colaborador *
                    </label>
                    <input
                      type="text"
                      value={form.full_name}
                      onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                      placeholder="Ej: Lucía Fernández Ramos"
                      required
                      autoFocus
                      className="w-full text-xs sm:text-sm px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-semibold"
                    />
                  </div>

                  {/* Email */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-zinc-300 mb-1 uppercase tracking-wider">
                      Correo Electrónico (Usuario de Inicio de Sesión) *
                    </label>
                    <input
                      type="email"
                      value={form.email}
                      disabled={isSupabaseConfigured && isEditing}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      placeholder="Ej: lucia.fernandez@empresa.com"
                      required
                      className="w-full text-xs sm:text-sm px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-slate-900 dark:text-white placeholder:text-slate-400 font-mono font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 disabled:opacity-50"
                    />
                    {isPlatformAdminEmail(form.email) && (
                      <div className="mt-2 p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/60 rounded-xl text-red-700 dark:text-red-300 text-xs flex items-start gap-2.5 animate-fade-in">
                        <ShieldAlert size={16} className="shrink-0 text-red-600 dark:text-red-400 mt-0.5" />
                        <div>
                          <p className="font-bold">Cuenta de Super Administrador de la Plataforma</p>
                          <p className="text-[11px] mt-0.5 text-red-600/90 dark:text-red-300/80">
                            Este correo administra el sistema global SaaS y maneja los planes de todas las empresas. No puede ser registrado como colaborador ni pertenecer a una empresa individual.
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Password */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-zinc-300 mb-1 uppercase tracking-wider">
                      {isEditing ? 'Nueva Contraseña (Dejar vacío para no modificar)' : 'Contraseña de Acceso *'}
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={form.password}
                        onChange={(e) => setForm({ ...form, password: e.target.value })}
                        placeholder={isEditing ? '••••••••' : 'Mínimo 6 caracteres'}
                        required={!isEditing}
                        minLength={6}
                        className="w-full text-xs sm:text-sm pl-3.5 pr-10 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-slate-900 dark:text-white placeholder:text-slate-400 font-mono focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((p) => !p)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-zinc-300 cursor-pointer"
                      >
                        {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    </div>

                    {!isEditing && (
                      <div className="mt-2 p-2.5 rounded-xl bg-slate-50 dark:bg-zinc-800/60 border border-slate-200/80 dark:border-zinc-700/60 space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-[10.5px] font-bold text-slate-700 dark:text-zinc-200 uppercase tracking-wider">
                            Requisitos de Contraseña
                          </span>
                          <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                            isPwdValid
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300'
                              : 'bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300'
                          }`}>
                            {isPwdValid ? '✓ Contraseña segura' : 'Faltan requisitos'}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-1.5 text-[10.5px]">
                          <div className={`flex items-center gap-1.5 ${hasMinLength ? 'text-emerald-600 dark:text-emerald-400 font-bold' : 'text-slate-400 dark:text-zinc-500'}`}>
                            <span className="font-mono">{hasMinLength ? '✓' : '○'}</span>
                            <span>Mínimo 6 caracteres</span>
                          </div>
                          <div className={`flex items-center gap-1.5 ${hasUpper ? 'text-emerald-600 dark:text-emerald-400 font-bold' : 'text-slate-400 dark:text-zinc-500'}`}>
                            <span className="font-mono">{hasUpper ? '✓' : '○'}</span>
                            <span>1 Mayúscula (A-Z)</span>
                          </div>
                          <div className={`flex items-center gap-1.5 ${hasLower ? 'text-emerald-600 dark:text-emerald-400 font-bold' : 'text-slate-400 dark:text-zinc-500'}`}>
                            <span className="font-mono">{hasLower ? '✓' : '○'}</span>
                            <span>1 Minúscula (a-z)</span>
                          </div>
                          <div className={`flex items-center gap-1.5 ${hasNumber ? 'text-emerald-600 dark:text-emerald-400 font-bold' : 'text-slate-400 dark:text-zinc-500'}`}>
                            <span className="font-mono">{hasNumber ? '✓' : '○'}</span>
                            <span>1 Número (0-9)</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* CARD 2: ROLES & PRIVILEGES */}
              <div className="bg-white dark:bg-[#141417] rounded-2xl border border-slate-200/80 dark:border-zinc-800 p-4 sm:p-5 shadow-xs space-y-3.5">
                <div className="flex items-center justify-between pb-2.5 border-b border-slate-100 dark:border-zinc-800">
                  <div className="flex items-center gap-2">
                    <ShieldCheck size={15} className="text-blue-600 dark:text-blue-400" />
                    <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-zinc-100">
                      2. Nivel de Acceso y Privilegios
                    </h3>
                  </div>
                  <span className="text-[11px] font-bold text-blue-600 dark:text-blue-400">
                    {form.role === 'admin' ? 'Acceso Total' : 'Operativo / Ventas'}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* ADMIN ROLE CARD */}
                  <div
                    onClick={() => setForm({ ...form, role: 'admin' })}
                    className={`p-3.5 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between ${
                      form.role === 'admin'
                        ? 'border-blue-600 bg-blue-50/50 dark:bg-blue-950/20 shadow-xs ring-1 ring-blue-600'
                        : 'border-slate-200/80 dark:border-zinc-700 bg-slate-50/60 dark:bg-zinc-800/40 hover:border-slate-300'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="w-8 h-8 rounded-xl bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                          <ShieldCheck size={18} />
                        </div>
                        <input
                          type="radio"
                          name="role"
                          checked={form.role === 'admin'}
                          onChange={() => setForm({ ...form, role: 'admin' })}
                          className="w-4 h-4 text-blue-600 cursor-pointer"
                        />
                      </div>
                      <h4 className="font-extrabold text-slate-900 dark:text-zinc-100 text-xs sm:text-sm">
                        Administrador
                      </h4>
                      <p className="text-[11px] text-slate-500 dark:text-zinc-400 mt-0.5 leading-snug">
                        Control total: ventas, compras, kardex, edición de catálogo, finanzas y usuarios.
                      </p>
                    </div>
                  </div>

                  {/* EMPLEADO ROLE CARD */}
                  <div
                    onClick={() => setForm({ ...form, role: 'empleado' })}
                    className={`p-3.5 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between ${
                      form.role === 'empleado'
                        ? 'border-purple-600 bg-purple-50/50 dark:bg-purple-950/20 shadow-xs ring-1 ring-purple-600'
                        : 'border-slate-200/80 dark:border-zinc-700 bg-slate-50/60 dark:bg-zinc-800/40 hover:border-slate-300'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="w-8 h-8 rounded-xl bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                          <User size={18} />
                        </div>
                        <input
                          type="radio"
                          name="role"
                          checked={form.role === 'empleado'}
                          onChange={() => setForm({ ...form, role: 'empleado' })}
                          className="w-4 h-4 text-purple-600 cursor-pointer"
                        />
                      </div>
                      <h4 className="font-extrabold text-slate-900 dark:text-zinc-100 text-xs sm:text-sm">
                        Empleado / Vendedor
                      </h4>
                      <p className="text-[11px] text-slate-500 dark:text-zinc-400 mt-0.5 leading-snug">
                        Operación diaria: ventas, caja POS, clientes y consulta de inventario.
                      </p>
                    </div>
                  </div>
                </div>

                {/* ACCOUNT ACTIVE SWITCH */}
                <div className="pt-2.5 border-t border-slate-100 dark:border-zinc-800 flex items-center justify-between">
                  <div>
                    <p className="font-bold text-xs text-slate-800 dark:text-zinc-200">
                      Estado de Habilitación
                    </p>
                    <p className="text-[10.5px] text-slate-400">
                      Los usuarios inactivos no pueden ingresar al ERP.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => setForm({ ...form, active: !form.active })}
                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                      form.active
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
                        : 'bg-slate-100 text-slate-500 border-slate-200 dark:bg-zinc-800 dark:text-zinc-400 dark:border-zinc-700'
                    }`}
                  >
                    {form.active ? <ToggleRight size={17} className="text-emerald-600" /> : <ToggleLeft size={17} className="text-slate-400" />}
                    <span>{form.active ? 'Activo' : 'Inactivo'}</span>
                  </button>
                </div>
              </div>

            </div>

            {/* ─── RIGHT COLUMN: LIVE REPLICA CARD & ACTIONS (5 COLS) ─── */}
            <div className="lg:col-span-5 space-y-4 lg:sticky lg:top-4">

              {/* CARD: LIVE USER BADGE PREVIEW */}
              <div className="bg-white dark:bg-[#141417] rounded-2xl border border-slate-200/80 dark:border-zinc-800 p-4 sm:p-5 shadow-xs space-y-3.5">
                <div className="flex items-center justify-between pb-2.5 border-b border-slate-100 dark:border-zinc-800">
                  <div className="flex items-center gap-2">
                    <Sparkles size={15} className="text-blue-600 dark:text-blue-400" />
                    <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-zinc-100">
                      Ficha de Usuario en Vivo
                    </h3>
                  </div>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> EN VIVO
                  </span>
                </div>

                <p className="text-[11px] text-slate-400 leading-snug">
                  Así se visualizará la tarjeta del colaborador en tu equipo:
                </p>

                {/* THE MOCK CARD */}
                <div className="bg-gradient-to-b from-white to-slate-50/60 dark:from-[#18181c] dark:to-[#121215] rounded-2xl border border-slate-200/80 dark:border-zinc-700 p-4 shadow-sm space-y-3.5">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-12 h-12 min-w-[48px] min-h-[48px] max-w-[48px] max-h-[48px] rounded-2xl bg-gradient-to-br ${avatarStyle.bg} flex items-center justify-center font-black text-base text-white shrink-0 shadow-xs`}
                    >
                      {getInitials(form.full_name || 'US')}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h4 className="font-black text-slate-900 dark:text-white text-sm sm:text-base leading-snug truncate">
                        {form.full_name.trim() || 'Nombre del Colaborador'}
                      </h4>
                      <p className="text-xs text-slate-400 font-mono truncate">
                        {form.email.trim() || 'correo@ejemplo.com'}
                      </p>
                    </div>
                  </div>

                  {/* Role and Status pill */}
                  <div className="pt-2.5 border-t border-slate-100 dark:border-zinc-800 flex items-center justify-between">
                    <div>
                      {form.role === 'admin' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-xs font-black bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800">
                          <ShieldCheck size={13} /> Administrador
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-xs font-black bg-purple-50 text-purple-700 border border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800">
                          <User size={13} /> Empleado
                        </span>
                      )}
                    </div>

                    <div>
                      {form.active ? (
                        <span className="inline-flex items-center gap-1.5 text-xs font-black text-emerald-600 dark:text-emerald-400">
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

                {/* PLAN CAPACITY STRIP */}
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-zinc-800/40 border border-slate-200/60 dark:border-zinc-700/60 flex items-center justify-between text-xs">
                  <span className="text-slate-600 dark:text-zinc-300 font-bold flex items-center gap-1.5">
                    <Building2 size={14} className="text-blue-600 dark:text-blue-400" /> Capacidad en Plan
                  </span>
                  <span className="font-mono font-black text-blue-600 dark:text-blue-400">
                    {allUsersCount} {allUsersCount === 1 ? 'registrado' : 'registrados'}
                  </span>
                </div>

                {/* PRIMARY SUBMIT BUTTON */}
                <button
                  type="submit"
                  disabled={isProcessing || !form.full_name.trim() || !form.email.trim() || limitReached || isPlatformAdminEmail(form.email)}
                  className="w-full py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md shadow-blue-500/25 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isProcessing ? (
                    <>
                      <RefreshCw size={16} className="animate-spin" />
                      <span>Sincronizando cuenta...</span>
                    </>
                  ) : (
                    <>
                      <Check size={16} strokeWidth={2.5} />
                      <span>{isEditing ? 'Guardar Modificaciones' : 'Registrar Usuario'}</span>
                    </>
                  )}
                </button>

                {/* SECONDARY CANCEL BUTTON */}
                <button
                  type="button"
                  onClick={() => requestLeave('/usuarios')}
                  className="w-full py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-600 dark:text-zinc-300 text-xs font-bold flex items-center justify-center transition-colors cursor-pointer"
                >
                  Cancelar y Regresar
                </button>

                <p className="text-[10px] text-center text-slate-400 flex items-center justify-center gap-1.5 font-medium">
                  <ShieldCheck size={12} className="text-emerald-500" />
                  Sincronización instantánea con catálogo y accesos ERP
                </p>
              </div>

            </div>

          </div>
        </form>

      </div>

      {/* ═════════════════════════════════════════════════════════
          OVERLAY DE PROCESAMIENTO ELEGANTE (3 PASOS)
         ═════════════════════════════════════════════════════════ */}
      {isProcessing && (
        <div className="fixed inset-0 z-50 bg-slate-950/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#18181b] rounded-3xl p-6 max-w-sm w-full border border-slate-200 dark:border-zinc-800 shadow-2xl space-y-4 animate-scale-up text-center">
            <div className="w-14 h-14 rounded-2xl bg-blue-50 dark:bg-blue-900/30 text-blue-600 mx-auto flex items-center justify-center shadow-inner">
              <RefreshCw size={26} className="animate-spin" />
            </div>

            <div className="space-y-1">
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                {isEditing ? 'Actualizando Colaborador...' : 'Registrando Colaborador...'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-zinc-400">
                {processingStep === 1 && 'Validando credenciales y reglas de seguridad...'}
                {processingStep === 2 && 'Creando cuenta y asignando privilegios RBAC...'}
                {processingStep === 3 && '¡Usuario habilitado y listo para operar!'}
              </p>
            </div>

            {/* Barra de progreso interactiva */}
            <div className="w-full bg-slate-100 dark:bg-zinc-800 h-2 rounded-full overflow-hidden">
              <div
                className="bg-blue-600 h-full transition-all duration-300 rounded-full"
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

    </AppLayout>
  )
}
