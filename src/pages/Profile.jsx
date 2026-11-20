import { useState, useRef, useEffect } from 'react'
import {
  User, Mail, ShieldCheck, Camera, Trash2, KeyRound, Check,
  AlertCircle, Building2, Eye, EyeOff, Save, CheckCircle2,
  Lock, Sparkles, UserCheck, Shield, Key
} from 'lucide-react'
import AppLayout from '../components/layout/AppLayout'
import { useAuth } from '../context/AuthContext'
import { companySettingsService } from '../services/companySettingsService'

const COLORS = ['#1B4FD8', '#8B5CF6', '#10B981', '#F59E0B', '#EF4444', '#06B6D4']
function avatarColor(name = '') {
  let h = 0
  for (const c of name) h = c.charCodeAt(0) + ((h << 5) - h)
  return COLORS[Math.abs(h) % COLORS.length]
}

export default function Profile() {
  const { user, updateProfile, updatePassword, isAdmin } = useAuth()
  const [company, setCompany] = useState(null)

  // Profile data state
  const [fullName, setFullName] = useState(user?.full_name || '')
  const [avatarUrl, setAvatarUrl] = useState(user?.avatar_url || '')
  const [savingProfile, setSavingProfile] = useState(false)
  const [profileSuccess, setProfileSuccess] = useState('')
  const [profileError, setProfileError] = useState('')

  // Password state
  const [currentPassword, setCurrentPassword] = useState('')
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [savingPassword, setSavingPassword] = useState(false)
  const [passwordSuccess, setPasswordSuccess] = useState('')
  const [passwordError, setPasswordError] = useState('')

  const fileInputRef = useRef(null)

  useEffect(() => {
    if (user?.full_name) setFullName(user.full_name)
    if (user?.avatar_url) setAvatarUrl(user.avatar_url)
    companySettingsService.get().then(setCompany).catch(() => {})
  }, [user])

  const initials = (fullName || user?.email || 'US')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(n => n[0])
    .join('')
    .toUpperCase()

  const color = avatarColor(fullName || user?.email || '')

  // Password complexity live checks
  const passwordCriteria = [
    { label: 'Mínimo 6 caracteres', valid: newPassword.length >= 6 },
    { label: 'Al menos 1 letra mayúscula (A-Z)', valid: /[A-Z]/.test(newPassword) },
    { label: 'Al menos 1 letra minúscula (a-z)', valid: /[a-z]/.test(newPassword) },
    { label: 'Al menos 1 número (0-9)', valid: /[0-9]/.test(newPassword) },
  ]
  const validCriteriaCount = passwordCriteria.filter(c => c.valid).length
  const isPasswordValid = passwordCriteria.every(c => c.valid)

  // Global F2 shortcut listener to save profile
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'F2') {
        e.preventDefault()
        if (!savingProfile && fullName.trim()) {
          handleSaveProfile(e)
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [fullName, savingProfile, avatarUrl])

  // Image Upload Handler (Compressed Base64 Data URL)
  function handleImageUpload(e) {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      setProfileError('Por favor selecciona un archivo de imagen válido (JPG, PNG o WEBP).')
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      setProfileError('La imagen es demasiado pesada (máximo 5MB).')
      return
    }

    const reader = new FileReader()
    reader.onload = (event) => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        const MAX_DIM = 400
        let w = img.width
        let h = img.height

        if (w > h) {
          if (w > MAX_DIM) {
            h = Math.round((h * MAX_DIM) / w)
            w = MAX_DIM
          }
        } else {
          if (h > MAX_DIM) {
            w = Math.round((w * MAX_DIM) / h)
            h = MAX_DIM
          }
        }

        canvas.width = w
        canvas.height = h
        const ctx = canvas.getContext('2d')
        ctx.drawImage(img, 0, 0, w, h)
        const compressedBase64 = canvas.toDataURL('image/jpeg', 0.88)
        setAvatarUrl(compressedBase64)
        setProfileError('')
      }
      img.src = event.target.result
    }
    reader.readAsDataURL(file)
  }

  function handleRemovePhoto() {
    setAvatarUrl('')
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  async function handleSaveProfile(e) {
    if (e && e.preventDefault) e.preventDefault()
    setProfileError('')
    setProfileSuccess('')

    if (!fullName.trim()) {
      setProfileError('El nombre no puede estar vacío.')
      return
    }

    setSavingProfile(true)
    try {
      await updateProfile({
        full_name: fullName.trim(),
        avatar_url: avatarUrl || null,
      })
      setProfileSuccess('¡Tu perfil y foto han sido actualizados exitosamente!')
      setTimeout(() => setProfileSuccess(''), 4000)
    } catch (err) {
      setProfileError(err.message || 'Error al guardar los cambios de perfil.')
    } finally {
      setSavingProfile(false)
    }
  }

  async function handleSavePassword(e) {
    e.preventDefault()
    setPasswordError('')
    setPasswordSuccess('')

    if (!currentPassword) {
      setPasswordError('Debes ingresar tu contraseña actual para confirmar tu identidad.')
      return
    }

    if (!newPassword) {
      setPasswordError('Ingresa una nueva contraseña.')
      return
    }

    if (newPassword === currentPassword) {
      setPasswordError('La nueva contraseña debe ser diferente a la contraseña actual.')
      return
    }

    if (!isPasswordValid) {
      setPasswordError('La contraseña no cumple con los requisitos de seguridad requeridos.')
      return
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('Las contraseñas no coinciden. Por favor verifícalas.')
      return
    }

    setSavingPassword(true)
    try {
      await updatePassword(newPassword, currentPassword)
      setPasswordSuccess('¡Contraseña actualizada con éxito!')
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      setTimeout(() => setPasswordSuccess(''), 4000)
    } catch (err) {
      setPasswordError(err.message || 'Error al actualizar la contraseña.')
    } finally {
      setSavingPassword(false)
    }
  }

  return (
    <AppLayout title="Mi Perfil y Cuenta">
      <div className="max-w-6xl mx-auto space-y-5 pb-16 animate-fade-in">
        
        {/* ═════════════════════════════════════════════════════════
            0. EXECUTIVE TOP HEADER BAR (SENIOR ENTERPRISE)
           ═════════════════════════════════════════════════════════ */}
        <div className="bg-white dark:bg-[#141417] p-4 sm:p-5 rounded-xl border border-slate-200/90 dark:border-zinc-800/90 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider mb-1">
              <span>MI CUENTA</span>
              <span>/</span>
              <span>PERFIL DE USUARIO</span>
              <span>/</span>
              <span className="text-[#1B4FD8] dark:text-blue-400">SEGURIDAD & PREFERENCIAS</span>
            </div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight leading-none">
                Mi Perfil y Credenciales
              </h1>
              <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[10px] font-mono font-bold border ${
                isAdmin
                  ? 'bg-blue-50 text-[#1B4FD8] border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-900/60'
                  : 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-900/60'
              }`}>
                {isAdmin ? <ShieldCheck size={11} /> : <UserCheck size={11} />}
                <span>{isAdmin ? 'Administrador del Sistema' : 'Colaborador / Vendedor'}</span>
              </span>
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-mono font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800/50">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Sesión Activa
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-zinc-400 mt-1">
              Administra tu información personal, avatar comercial y actualiza tus credenciales de acceso seguro.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
            <button
              type="button"
              onClick={handleSaveProfile}
              disabled={savingProfile || !fullName.trim()}
              className="px-4 py-2 rounded-xl bg-[#1B4FD8] hover:bg-[#163FBF] active:scale-95 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm shadow-blue-600/25 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save size={15} />
              <span>{savingProfile ? 'Guardando…' : 'Guardar Perfil'}</span>
              <kbd className="px-1 py-0.5 rounded bg-blue-700/60 text-[10px] font-mono">F2</kbd>
            </button>
          </div>
        </div>

        {/* ═════════════════════════════════════════════════════════
            1. EXECUTIVE IDENTITY HERO CARD
           ═════════════════════════════════════════════════════════ */}
        <div className="bg-white dark:bg-[#141417] rounded-xl border border-slate-200/90 dark:border-zinc-800/90 p-4 sm:p-5 shadow-2xs relative overflow-hidden">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5 relative z-10">
            <div className="flex items-center gap-4 sm:gap-5">
              {/* Avatar con botón de cámara */}
              <div className="relative group shrink-0">
                <div
                  className="w-18 h-18 sm:w-20 sm:h-20 rounded-xl overflow-hidden flex items-center justify-center text-white text-xl sm:text-2xl font-bold font-display shadow-2xs border border-slate-200 dark:border-zinc-700 select-none bg-slate-100 dark:bg-zinc-800"
                  style={!avatarUrl ? { background: color } : undefined}
                >
                  {avatarUrl ? (
                    <img
                      src={avatarUrl}
                      alt={fullName || 'Avatar'}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span>{initials}</span>
                  )}
                </div>

                {/* Botón flotante para cambiar foto */}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute -bottom-1 -right-1 w-7 h-7 rounded-lg bg-[#1B4FD8] text-white flex items-center justify-center shadow-md hover:bg-[#163FBF] hover:scale-105 active:scale-95 transition-all cursor-pointer border-2 border-white dark:border-[#141417]"
                  title="Subir o cambiar foto de perfil"
                >
                  <Camera size={13} />
                </button>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleImageUpload}
                  accept="image/png, image/jpeg, image/webp"
                  className="hidden"
                />
              </div>

              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-zinc-100 font-display">
                    {fullName || 'Colaborador'}
                  </h2>
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-mono font-bold border ${
                    isAdmin
                      ? 'bg-blue-50 text-[#1B4FD8] border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-900/60'
                      : 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-900/60'
                  }`}>
                    {isAdmin ? <ShieldCheck size={11} /> : <UserCheck size={11} />}
                    {isAdmin ? 'Administrador' : 'Empleado / Vendedor'}
                  </span>
                </div>

                <p className="text-xs text-slate-500 dark:text-zinc-400 font-mono mt-0.5">
                  {user?.email}
                </p>

                {company?.name && (
                  <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-zinc-400 mt-1.5 font-medium">
                    <Building2 size={13} className="text-[#1B4FD8] dark:text-blue-400" />
                    <span>Empresa activa: <strong className="text-slate-800 dark:text-zinc-200">{company.name}</strong></span>
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-3.5 py-2 rounded-xl bg-slate-50 hover:bg-slate-100 dark:bg-zinc-800 dark:hover:bg-zinc-700 border border-slate-200 dark:border-zinc-700 text-slate-700 dark:text-zinc-300 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Camera size={13} />
                <span>{avatarUrl ? 'Cambiar Foto' : 'Subir Foto'}</span>
              </button>
              {avatarUrl && (
                <button
                  type="button"
                  onClick={handleRemovePhoto}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-500/10 px-3.5 py-2 rounded-xl hover:bg-rose-100 dark:hover:bg-rose-500/20 transition-colors cursor-pointer border border-rose-200 dark:border-rose-500/20"
                >
                  <Trash2 size={13} /> Quitar foto
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ═════════════════════════════════════════════════════════
            2. DOS COLUMNAS: DATOS PERSONALES & SEGURIDAD
           ═════════════════════════════════════════════════════════ */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          
          {/* ─── COLUMNA IZQUIERDA: INFORMACIÓN PERSONAL (7 COLS) ─── */}
          <div className="lg:col-span-7 space-y-4">
            <div className="bg-white dark:bg-[#141417] rounded-xl border border-slate-200/90 dark:border-zinc-800/90 p-4 sm:p-5 shadow-2xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-zinc-800">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-[#1B4FD8] dark:text-blue-400 flex items-center justify-center shrink-0">
                    <User size={16} />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-slate-900 dark:text-zinc-100">
                      1. Información de Mi Cuenta
                    </h2>
                    <p className="text-[11px] text-slate-400 dark:text-zinc-500">
                      Actualiza tu nombre visible y mantén tu perfil al día
                    </p>
                  </div>
                </div>
                <span className="text-[11px] text-slate-400 dark:text-zinc-500 font-medium">Principal *</span>
              </div>

              {profileSuccess && (
                <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 text-emerald-800 dark:text-emerald-300 text-xs font-semibold flex items-center gap-2.5 shadow-2xs animate-slide-up">
                  <CheckCircle2 size={16} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span>{profileSuccess}</span>
                </div>
              )}

              {profileError && (
                <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 text-rose-800 dark:text-rose-300 text-xs font-semibold flex items-center gap-2.5 shadow-2xs animate-slide-up">
                  <AlertCircle size={16} className="text-rose-600 dark:text-rose-400 shrink-0" />
                  <span>{profileError}</span>
                </div>
              )}

              <form onSubmit={handleSaveProfile} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1.5 uppercase tracking-wider">
                    Nombre Completo del Colaborador *
                  </label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Tu nombre completo"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800/80 text-slate-900 dark:text-zinc-100 text-xs sm:text-sm font-bold focus:ring-2 focus:ring-blue-500/10 focus:border-[#1B4FD8] focus:bg-white dark:focus:bg-zinc-900 transition-all outline-none"
                    required
                  />
                  <p className="text-[11px] text-slate-400 dark:text-zinc-500 mt-1">
                    Este nombre identificará tus ventas, compras y registros en el historial del ERP.
                  </p>
                </div>

                <div>
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 uppercase tracking-wider">
                      Correo Electrónico (Acceso al Sistema)
                    </label>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-300 border border-slate-200 dark:border-zinc-700">
                      <Lock size={10} /> Identificador único
                    </span>
                  </div>
                  <div className="relative">
                    <input
                      type="email"
                      value={user?.email || ''}
                      disabled
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-700/80 bg-slate-100/80 dark:bg-zinc-800/50 text-slate-500 dark:text-zinc-400 text-xs sm:text-sm font-mono cursor-not-allowed outline-none select-none"
                    />
                    <Lock size={14} className="absolute right-3.5 top-3 text-slate-400" />
                  </div>
                  <p className="text-[11px] text-slate-400 dark:text-zinc-500 mt-1">
                    Tu correo es tu identificador exclusivo de sesión en {company?.name || 'la empresa'}.
                  </p>
                </div>

                {/* Resumen de permisos del rol (RBAC) */}
                <div className="p-4 rounded-xl bg-slate-50/80 dark:bg-zinc-800/40 border border-slate-200 dark:border-zinc-700/80 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold text-slate-800 dark:text-zinc-200 flex items-center gap-1.5 uppercase tracking-wider">
                      <Shield size={14} className="text-[#1B4FD8] dark:text-blue-400" />
                      Permisos asignados: {isAdmin ? 'Control Total (Administrador)' : 'Punto de Venta y Caja (Empleado)'}
                    </p>
                    <span className="text-[10px] font-mono font-bold text-emerald-600 dark:text-emerald-400">
                      RBAC Activo
                    </span>
                  </div>
                  <ul className="text-xs text-slate-600 dark:text-zinc-400 space-y-1.5 pt-1">
                    <li className="flex items-center gap-2">
                      <Check size={12} strokeWidth={3} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
                      <span>Emisión y registro de ventas & facturas POS</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check size={12} strokeWidth={3} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
                      <span>Consulta de productos, existencias en vivo y catálogo</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check size={12} strokeWidth={3} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
                      <span>Registro y consulta de clientes comerciales</span>
                    </li>
                    {isAdmin && (
                      <>
                        <li className="flex items-center gap-2">
                          <Check size={12} strokeWidth={3} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
                          <span>Control de compras a proveedores y libro kardex de almacén</span>
                        </li>
                        <li className="flex items-center gap-2">
                          <Check size={12} strokeWidth={3} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
                          <span>Gestión de colaboradores, roles y configuración de empresa</span>
                        </li>
                        <li className="flex items-center gap-2">
                          <Check size={12} strokeWidth={3} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
                          <span>Auditoría de movimientos de personal y métricas financieras</span>
                        </li>
                      </>
                    )}
                  </ul>
                </div>

                <div className="pt-2 flex justify-end">
                  <button
                    type="submit"
                    disabled={savingProfile || !fullName.trim()}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#1B4FD8] hover:bg-[#163FBF] active:scale-95 text-white font-bold text-xs shadow-sm shadow-blue-600/25 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Save size={14} />
                    <span>{savingProfile ? 'Guardando…' : 'Guardar Información'}</span>
                    <kbd className="px-1 py-0.5 rounded bg-blue-700/60 text-[10px] font-mono">F2</kbd>
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* ─── COLUMNA DERECHA: CAMBIO DE CONTRASEÑA & SEGURIDAD (5 COLS) ─── */}
          <div className="lg:col-span-5 space-y-4 lg:sticky lg:top-6">
            <div className="bg-white dark:bg-[#141417] rounded-xl border border-slate-200/90 dark:border-zinc-800/90 p-4 sm:p-5 shadow-2xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-zinc-800">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                    <KeyRound size={16} />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-slate-900 dark:text-zinc-100">
                      2. Seguridad y Clave
                    </h2>
                    <p className="text-[11px] text-slate-400 dark:text-zinc-500">
                      Cambia tu contraseña de inicio de sesión
                    </p>
                  </div>
                </div>
              </div>

              {passwordSuccess && (
                <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 text-emerald-800 dark:text-emerald-300 text-xs font-semibold flex items-center gap-2.5 shadow-2xs animate-slide-up">
                  <CheckCircle2 size={16} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span>{passwordSuccess}</span>
                </div>
              )}

              {passwordError && (
                <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 text-rose-800 dark:text-rose-300 text-xs font-semibold flex items-center gap-2.5 shadow-2xs animate-slide-up">
                  <AlertCircle size={16} className="text-rose-600 dark:text-rose-400 shrink-0" />
                  <span>{passwordError}</span>
                </div>
              )}

              <form onSubmit={handleSavePassword} className="space-y-4">
                <div>
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 uppercase tracking-wider">
                      Contraseña Actual *
                    </label>
                    <span className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold flex items-center gap-1">
                      <Lock size={10} /> Verificación de identidad
                    </span>
                  </div>
                  <div className="relative">
                    <input
                      type={showCurrentPassword ? 'text' : 'password'}
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="Ingresa tu contraseña vigente"
                      className="w-full pl-4 pr-10 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800/80 text-slate-900 dark:text-zinc-100 text-xs sm:text-sm font-mono font-bold focus:ring-2 focus:ring-amber-500/10 focus:border-amber-500 focus:bg-white dark:focus:bg-zinc-900 transition-all outline-none placeholder:font-sans placeholder:font-normal placeholder:text-slate-400"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPassword(v => !v)}
                      className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-zinc-300 cursor-pointer"
                    >
                      {showCurrentPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  <p className="text-[10.5px] text-slate-400 dark:text-zinc-500 mt-1">
                    Requerida para confirmar que eres el propietario legítimo de esta cuenta antes de aplicar el cambio.
                  </p>
                </div>

                <div className="pt-1 border-t border-slate-100 dark:border-zinc-800/80">
                  <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1.5 uppercase tracking-wider">
                    Nueva Contraseña *
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Mínimo 6 caracteres"
                      className="w-full pl-4 pr-10 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800/80 text-slate-900 dark:text-zinc-100 text-xs sm:text-sm font-mono font-bold focus:ring-2 focus:ring-blue-500/10 focus:border-[#1B4FD8] focus:bg-white dark:focus:bg-zinc-900 transition-all outline-none placeholder:font-sans placeholder:font-normal placeholder:text-slate-400"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(v => !v)}
                      className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-zinc-300 cursor-pointer"
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1.5 uppercase tracking-wider">
                    Confirmar Nueva Contraseña *
                  </label>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repite tu nueva contraseña"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800/80 text-slate-900 dark:text-zinc-100 text-xs sm:text-sm font-mono font-bold focus:ring-2 focus:ring-blue-500/10 focus:border-[#1B4FD8] focus:bg-white dark:focus:bg-zinc-900 transition-all outline-none placeholder:font-sans placeholder:font-normal placeholder:text-slate-400"
                    required
                  />
                  {confirmPassword && newPassword !== confirmPassword && (
                    <p className="text-[11px] text-rose-500 mt-1 font-semibold">
                      Las contraseñas no coinciden.
                    </p>
                  )}
                </div>

                {/* Checklist de Requisitos de Contraseña */}
                <div className="p-3.5 rounded-xl bg-slate-50/80 dark:bg-zinc-800/40 border border-slate-200 dark:border-zinc-700/80 space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-[11px] font-bold text-slate-700 dark:text-zinc-300 uppercase tracking-wider">
                      Requisitos de seguridad:
                    </p>
                    <span className="text-[10px] font-mono font-bold text-amber-600 dark:text-amber-400">
                      {validCriteriaCount}/4
                    </span>
                  </div>

                  {/* Segmented Progress Bar */}
                  <div className="w-full bg-slate-200 dark:bg-zinc-700 h-1.5 rounded-full overflow-hidden">
                    <div
                      className="bg-amber-500 h-full rounded-full transition-all duration-300"
                      style={{ width: `${(validCriteriaCount / 4) * 100}%` }}
                    />
                  </div>

                  <div className="space-y-1.5 pt-1">
                    {passwordCriteria.map((c, idx) => (
                      <div key={idx} className="flex items-center justify-between text-xs">
                        <span className={`text-[11px] ${c.valid ? 'text-slate-700 dark:text-zinc-300 font-medium' : 'text-slate-400 dark:text-zinc-500'}`}>
                          {c.label}
                        </span>
                        {c.valid ? (
                          <span className="text-emerald-600 dark:text-emerald-400 shrink-0 font-bold flex items-center gap-1 text-[10px]">
                            <Check size={11} strokeWidth={3} /> Cumplido
                          </span>
                        ) : (
                          <span className="text-slate-300 dark:text-zinc-600 shrink-0 text-[10px]">
                            Pendiente
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-2 flex justify-end">
                  <button
                    type="submit"
                    disabled={savingPassword || !currentPassword || !newPassword || !isPasswordValid || newPassword !== confirmPassword}
                    className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 active:scale-95 text-white font-bold text-xs shadow-sm shadow-amber-500/20 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    <KeyRound size={14} />
                    <span>{savingPassword ? 'Verificando y actualizando…' : 'Actualizar Contraseña'}</span>
                  </button>
                </div>
              </form>
            </div>

            {/* Ficha de Seguridad y Auditoría */}
            <div className="bg-white dark:bg-[#141417] rounded-xl border border-slate-200/90 dark:border-zinc-800/90 p-4 shadow-2xs space-y-2.5">
              <div className="flex items-center gap-2">
                <ShieldCheck size={14} className="text-[#1B4FD8] dark:text-blue-400" />
                <h3 className="text-xs font-bold text-slate-800 dark:text-zinc-200 uppercase tracking-wider">
                  Seguridad de Acceso
                </h3>
              </div>
              <p className="text-[11px] text-slate-400 dark:text-zinc-500 leading-relaxed">
                Tus credenciales están protegidas mediante autenticación criptográfica JWT y cifrado en reposo estándar del sector.
              </p>
            </div>
          </div>

        </div>

      </div>
    </AppLayout>
  )
}
