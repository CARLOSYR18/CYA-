import { useState, useRef, useEffect } from 'react'
import {
  User, Mail, ShieldCheck, Camera, Trash2, KeyRound, Check,
  AlertCircle, Building2, Eye, EyeOff, Save, CheckCircle2,
  Lock, Sparkles, UserCheck, Shield
} from 'lucide-react'
import AppLayout from '../components/layout/AppLayout'
import { useAuth } from '../context/AuthContext'
import { companySettingsService } from '../services/companySettingsService'

const COLORS = ['#3B82F6', '#8B5CF6', '#10B981', '#F59E0B', '#EF4444', '#06B6D4']
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
  const isPasswordValid = passwordCriteria.every(c => c.valid)

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
        // Redimensionar a tamaño avatar cuadrado máximo 400x400 para optimizar almacenamiento
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
    e.preventDefault()
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

    if (!newPassword) {
      setPasswordError('Ingresa una nueva contraseña.')
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
      await updatePassword(newPassword)
      setPasswordSuccess('¡Contraseña actualizada con éxito!')
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
      <div className="max-w-5xl mx-auto space-y-6 pb-12 animate-fade-in">
        
        {/* Header Banner */}
        <div className="bg-white dark:bg-[#141417] rounded-3xl border border-slate-200/80 dark:border-zinc-800 p-6 sm:p-8 shadow-xs relative overflow-hidden">
          <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-blue-500/10 via-purple-500/5 to-transparent rounded-full blur-3xl pointer-events-none" />
          
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 relative z-10">
            <div className="flex items-center gap-5">
              {/* Avatar con botón de cámara */}
              <div className="relative group shrink-0">
                <div
                  className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl overflow-hidden flex items-center justify-center text-white text-2xl font-bold font-display shadow-md border-2 border-white dark:border-zinc-700 select-none bg-slate-100 dark:bg-zinc-800"
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
                  className="absolute -bottom-2 -right-2 w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-lg hover:bg-blue-700 hover:scale-105 active:scale-95 transition-all cursor-pointer border-2 border-white dark:border-zinc-800"
                  title="Subir o cambiar foto de perfil"
                >
                  <Camera size={16} />
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
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-zinc-100 font-display">
                    {fullName || 'Colaborador'}
                  </h1>
                  <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-xs font-bold ${
                    isAdmin
                      ? 'bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20'
                      : 'bg-purple-50 text-purple-700 border border-purple-200 dark:bg-purple-500/10 dark:text-purple-400 dark:border-purple-500/20'
                  }`}>
                    {isAdmin ? <ShieldCheck size={13} /> : <UserCheck size={13} />}
                    {isAdmin ? 'Administrador' : 'Empleado / Vendedor'}
                  </span>
                </div>

                <p className="text-xs sm:text-sm text-slate-500 dark:text-zinc-400 font-mono mt-1">
                  {user?.email}
                </p>

                {company?.name && (
                  <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-zinc-400 mt-2 font-medium">
                    <Building2 size={13} className="text-slate-400" />
                    <span>Empresa activa: <strong className="text-slate-700 dark:text-zinc-300">{company.name}</strong></span>
                  </div>
                )}
              </div>
            </div>

            {avatarUrl && (
              <button
                type="button"
                onClick={handleRemovePhoto}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-500/10 px-3 py-2 rounded-xl hover:bg-rose-100 transition-colors cursor-pointer border border-rose-200 dark:border-rose-500/20"
              >
                <Trash2 size={14} /> Quitar foto
              </button>
            )}
          </div>
        </div>

        {/* Dos Columnas: Datos Personales & Seguridad */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Columna Izquierda: Información Personal (7 cols) */}
          <div className="lg:col-span-7 space-y-6">
            <div className="bg-white dark:bg-[#141417] rounded-3xl border border-slate-200/80 dark:border-zinc-800 p-6 sm:p-7 shadow-xs">
              <div className="flex items-center gap-2.5 pb-4 border-b border-slate-100 dark:border-zinc-800 mb-6">
                <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                  <User size={16} />
                </div>
                <div>
                  <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-zinc-100 font-display">
                    Información de Mi Cuenta
                  </h2>
                  <p className="text-xs text-slate-400 dark:text-zinc-500">
                    Actualiza tu nombre visible y mantén tu perfil al día.
                  </p>
                </div>
              </div>

              {profileSuccess && (
                <div className="mb-5 p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 text-emerald-800 dark:text-emerald-300 text-xs flex items-center gap-2.5 animate-slide-up">
                  <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                  <span>{profileSuccess}</span>
                </div>
              )}

              {profileError && (
                <div className="mb-5 p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 text-rose-800 dark:text-rose-300 text-xs flex items-center gap-2.5 animate-slide-up">
                  <AlertCircle size={16} className="text-rose-600 shrink-0" />
                  <span>{profileError}</span>
                </div>
              )}

              <form onSubmit={handleSaveProfile} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1.5 uppercase tracking-wider">
                    Nombre Completo
                  </label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Tu nombre completo"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-50/50 dark:bg-zinc-800/50 text-sm font-medium focus:ring-2 focus:ring-blue-500 focus:bg-white dark:focus:bg-zinc-800 transition-all outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1.5 uppercase tracking-wider">
                    Correo Electrónico (Acceso al Sistema)
                  </label>
                  <div className="relative">
                    <input
                      type="email"
                      value={user?.email || ''}
                      disabled
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-100 dark:bg-zinc-900/60 text-slate-500 dark:text-zinc-500 text-sm font-mono cursor-not-allowed outline-none"
                    />
                    <Lock size={15} className="absolute right-3.5 top-3 text-slate-400" />
                  </div>
                  <p className="text-[11px] text-slate-400 dark:text-zinc-500 mt-1">
                    Tu correo es tu identificador exclusivo de sesión en {company?.name || 'CYA STORE'}.
                  </p>
                </div>

                {/* Resumen de permisos del rol */}
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-zinc-800/40 border border-slate-200/60 dark:border-zinc-800 space-y-2 mt-4">
                  <p className="text-xs font-bold text-slate-700 dark:text-zinc-300 flex items-center gap-1.5">
                    <Shield size={14} className="text-blue-600 dark:text-blue-400" />
                    Permisos asignados: {isAdmin ? 'Control Total (Administrador)' : 'Operativo (Ventas e Inventario)'}
                  </p>
                  <ul className="text-xs text-slate-500 dark:text-zinc-400 space-y-1 list-disc list-inside">
                    <li>Emisión y registro de ventas & facturas</li>
                    <li>Consulta de productos, stock y categorías del catálogo</li>
                    <li>Registro de clientes y órdenes comerciales</li>
                    {isAdmin && <li>Gestión de colaboradores, empresa y configuración global</li>}
                  </ul>
                </div>

                <div className="pt-3 flex justify-end">
                  <button
                    type="submit"
                    disabled={savingProfile}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-semibold text-xs shadow-md shadow-blue-500/20 transition-all cursor-pointer disabled:opacity-50"
                  >
                    <Save size={14} />
                    {savingProfile ? 'Guardando...' : 'Guardar Información'}
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* Columna Derecha: Cambio de Contraseña (5 cols) */}
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-white dark:bg-[#141417] rounded-3xl border border-slate-200/80 dark:border-zinc-800 p-6 sm:p-7 shadow-xs">
              <div className="flex items-center gap-2.5 pb-4 border-b border-slate-100 dark:border-zinc-800 mb-6">
                <div className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                  <KeyRound size={16} />
                </div>
                <div>
                  <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-zinc-100 font-display">
                    Seguridad y Clave
                  </h2>
                  <p className="text-xs text-slate-400 dark:text-zinc-500">
                    Cambia tu contraseña de inicio de sesión.
                  </p>
                </div>
              </div>

              {passwordSuccess && (
                <div className="mb-5 p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 text-emerald-800 dark:text-emerald-300 text-xs flex items-center gap-2.5 animate-slide-up">
                  <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                  <span>{passwordSuccess}</span>
                </div>
              )}

              {passwordError && (
                <div className="mb-5 p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 text-rose-800 dark:text-rose-300 text-xs flex items-center gap-2.5 animate-slide-up">
                  <AlertCircle size={16} className="text-rose-600 shrink-0" />
                  <span>{passwordError}</span>
                </div>
              )}

              <form onSubmit={handleSavePassword} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1.5 uppercase tracking-wider">
                    Nueva Contraseña
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Mínimo 6 caracteres"
                      className="w-full pl-4 pr-10 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-50/50 dark:bg-zinc-800/50 text-sm font-medium focus:ring-2 focus:ring-blue-500 focus:bg-white dark:focus:bg-zinc-800 transition-all outline-none"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(v => !v)}
                      className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1.5 uppercase tracking-wider">
                    Confirmar Nueva Contraseña
                  </label>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repite tu contraseña"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-50/50 dark:bg-zinc-800/50 text-sm font-medium focus:ring-2 focus:ring-blue-500 focus:bg-white dark:focus:bg-zinc-800 transition-all outline-none"
                    required
                  />
                </div>

                {/* Checklist de Requisitos de Contraseña */}
                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-zinc-800/40 border border-slate-200/60 dark:border-zinc-800 space-y-1.5">
                  <p className="text-[11px] font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider mb-1">
                    Requisitos de seguridad:
                  </p>
                  {passwordCriteria.map((c, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-xs">
                      <span className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 ${
                        c.valid ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300' : 'bg-slate-200 text-slate-400 dark:bg-zinc-700 dark:text-zinc-500'
                      }`}>
                        <Check size={11} strokeWidth={3} />
                      </span>
                      <span className={c.valid ? 'text-slate-700 dark:text-zinc-300 font-medium' : 'text-slate-400 dark:text-zinc-500'}>
                        {c.label}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="pt-2 flex justify-end">
                  <button
                    type="submit"
                    disabled={savingPassword || !newPassword || !isPasswordValid || newPassword !== confirmPassword}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 active:scale-95 text-white font-semibold text-xs shadow-md shadow-amber-500/20 transition-all cursor-pointer disabled:opacity-50"
                  >
                    <KeyRound size={14} />
                    {savingPassword ? 'Actualizando...' : 'Actualizar Contraseña'}
                  </button>
                </div>
              </form>
            </div>
          </div>

        </div>

      </div>
    </AppLayout>
  )
}

