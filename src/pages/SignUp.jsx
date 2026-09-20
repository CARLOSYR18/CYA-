import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  User,
  Mail,
  Lock,
  Eye,
  EyeOff,
  Loader2,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'

export default function SignUp() {
  const { signUp } = useAuth()
  const navigate = useNavigate()

  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [emailConfirmationRequired, setEmailConfirmationRequired] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const { needsEmailConfirmation } = await signUp(email, password, fullName)
      if (needsEmailConfirmation) {
        setEmailConfirmationRequired(true)
      } else {
        navigate('/onboarding')
      }
    } catch (err) {
      setError(err.message || 'Error al registrar la cuenta. Intente nuevamente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen w-full relative flex flex-col items-center justify-center p-4 sm:p-6 font-sans select-none overflow-x-hidden">
      {/* ─── Crisp Corporate Office Background ─── */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: "url('/login-bg.jpg')" }}
      />
      {/* Subtle daylight ambient overlay */}
      <div className="absolute inset-0 bg-slate-900/15" />

      {/* ─── Top Left Company Logo ─── */}
      <div className="absolute top-5 left-5 sm:top-8 sm:left-10 z-20 flex items-center gap-3.5">
        <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full overflow-hidden shadow-md bg-black shrink-0 flex items-center justify-center ring-2 ring-white/90 border border-slate-300/80">
          <img
            src="/logo.png"
            alt="CYA STORE Logo"
            className="w-full h-full object-cover"
          />
        </div>
        <div className="flex flex-col justify-center select-none">
          <div className="flex items-baseline gap-1.5">
            <span className="font-outfit text-2xl sm:text-[29px] font-extrabold tracking-tight text-slate-900 leading-none">
              CYA
            </span>
            <span className="font-outfit text-2xl sm:text-[29px] font-black tracking-tight text-blue-600 leading-none">
              STORE
            </span>
          </div>
          <span className="font-jakarta text-[10px] sm:text-[10.5px] font-bold text-slate-500 tracking-[0.2em] mt-1.5 uppercase leading-none">
            SOLUCIONES ERP PROFESIONALES
          </span>
        </div>
      </div>

      {/* ─── Central Floating Authentication Card ─── */}
      <div className="relative z-20 w-full max-w-[420px] bg-white rounded-2xl shadow-[0_20px_60px_-10px_rgba(11,32,62,0.35)] border border-slate-200/90 p-7 sm:p-9 my-auto">
        <h1 className="font-outfit text-2xl sm:text-[26px] font-bold text-slate-900 text-center tracking-tight mb-2">
          Crear Cuenta
        </h1>
        <p className="text-xs text-slate-500 text-center mb-6">
          Comienza a gestionar tu negocio de manera inteligente
        </p>

        {emailConfirmationRequired ? (
          <div className="space-y-5 text-center py-2">
            <div className="w-14 h-14 bg-emerald-50 rounded-full flex items-center justify-center mx-auto text-emerald-600 ring-8 ring-emerald-50/50">
              <CheckCircle2 size={32} />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">¡Registro exitoso!</h2>
              <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                Revisa tu correo para confirmar tu cuenta, luego inicia sesión.
              </p>
            </div>
            <Link
              to="/login"
              className="w-full h-11 bg-[#0B203E] hover:bg-[#143258] text-white font-bold rounded-lg text-xs sm:text-sm tracking-wider uppercase transition-all duration-150 flex items-center justify-center gap-2 shadow-md shadow-[#0B203E]/25"
            >
              Ir a Iniciar Sesión
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Full Name field */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Nombre Completo
              </label>
              <div className="relative">
                <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                  <User size={17} />
                </div>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Ej. Juan Pérez"
                  className="w-full h-11 bg-white border border-slate-300 focus:border-[#0B203E] rounded-lg pl-10 pr-3 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0B203E]/10 transition"
                  autoFocus
                />
              </div>
            </div>

            {/* Email field */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Correo Electrónico
              </label>
              <div className="relative">
                <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                  <Mail size={17} />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="correo@empresa.com"
                  className="w-full h-11 bg-white border border-slate-300 focus:border-[#0B203E] rounded-lg pl-10 pr-3 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0B203E]/10 transition"
                />
              </div>
            </div>

            {/* Password field */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Contraseña
              </label>
              <div className="relative">
                <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                  <Lock size={17} />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  className="w-full h-11 bg-white border border-slate-300 focus:border-[#0B203E] rounded-lg pl-10 pr-10 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0B203E]/10 transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 transition p-1 cursor-pointer"
                  title={showPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
                >
                  {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>
            </div>

            {/* Error Banner */}
            {error && (
              <div className="flex items-center gap-2 text-xs text-rose-600 bg-rose-50 border border-rose-200 rounded-lg p-2.5">
                <AlertCircle size={15} className="shrink-0 text-rose-600" />
                <span>{error}</span>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full h-11 bg-[#0B203E] hover:bg-[#143258] active:scale-[0.99] text-white font-bold rounded-lg text-xs sm:text-sm tracking-wider uppercase transition-all duration-150 flex items-center justify-center gap-2 shadow-md shadow-[#0B203E]/25 cursor-pointer disabled:opacity-60 mt-2"
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="animate-spin text-white" />
                  <span>REGISTRANDO…</span>
                </>
              ) : (
                <span>REGISTRARSE</span>
              )}
            </button>

            {/* Back to Login Link */}
            <p className="text-center text-[11px] text-slate-500 pt-2">
              ¿Ya tiene una cuenta?{' '}
              <Link
                to="/login"
                className="text-[#0B203E] hover:underline font-bold cursor-pointer"
              >
                Iniciar sesión
              </Link>
            </p>
          </form>
        )}
      </div>
    </div>
  )
}
