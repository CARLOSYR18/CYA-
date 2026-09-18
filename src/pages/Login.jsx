import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  Loader2,
  AlertCircle,
  Sparkles,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(true)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [activeRole, setActiveRole] = useState(null)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(email, password)
      navigate('/')
    } catch (err) {
      setError(err.message || 'Credenciales incorrectas. Verifique correo y contraseña.')
    } finally {
      setLoading(false)
    }
  }

  function fillCredentials(type) {
    setActiveRole(type)
    setError('')
    if (type === 'admin') {
      setEmail('admin@demo.com')
      setPassword('admin123')
    } else {
      setEmail('empleado@demo.com')
      setPassword('empleado123')
    }
  }

  function handleExternalLogin(provider) {
    setError(`El acceso con ${provider} requiere autorización previa del administrador de CYA STORE.`)
  }

  return (
    <div className="min-h-screen w-full relative flex flex-col items-center justify-center p-4 sm:p-6 font-sans select-none overflow-x-hidden">
      
      {/* ─── Crisp Corporate Office Background (matching reference) ─── */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: "url('/login-bg.jpg')" }}
      />
      {/* Subtle daylight ambient overlay */}
      <div className="absolute inset-0 bg-slate-900/15" />

      {/* ─── Top Left Company Logo (APEX ERP style layout) ─── */}
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
        
        {/* Title */}
        <h1 className="font-outfit text-2xl sm:text-[26px] font-bold text-slate-900 text-center tracking-tight mb-6">
          Iniciar Sesión
        </h1>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
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
                placeholder="Ingrese su correo corporativo"
                className="w-full h-11 bg-white border border-slate-300 focus:border-[#0B203E] rounded-lg pl-10 pr-3 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0B203E]/10 transition"
                autoFocus
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
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Ingrese su contraseña"
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

          {/* Remember Me & Forgot Password row */}
          <div className="flex items-center justify-between text-xs text-slate-600 pt-0.5">
            <label className="flex items-center gap-2 cursor-pointer select-none font-medium">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-4 h-4 rounded text-[#0B203E] border-slate-300 focus:ring-[#0B203E] cursor-pointer accent-[#0B203E]"
              />
              <span>Mantenerme conectado</span>
            </label>
            <button
              type="button"
              onClick={() => alert('Para restablecer su contraseña, contacte al Administrador de CYA STORE.')}
              className="text-[#18528C] hover:underline font-semibold cursor-pointer"
            >
              ¿Olvidó su contraseña?
            </button>
          </div>

          {/* Error Banner */}
          {error && (
            <div className="flex items-center gap-2 text-xs text-rose-600 bg-rose-50 border border-rose-200 rounded-lg p-2.5">
              <AlertCircle size={15} className="shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          {/* Primary Submit Button (Deep navy, matching reference) */}
          <button
            type="submit"
            disabled={loading}
            className="w-full h-11 bg-[#0B203E] hover:bg-[#143258] active:scale-[0.99] text-white font-bold rounded-lg text-xs sm:text-sm tracking-wider uppercase transition-all duration-150 flex items-center justify-center gap-2 shadow-md shadow-[#0B203E]/25 cursor-pointer disabled:opacity-60 mt-2"
          >
            {loading ? (
              <>
                <Loader2 size={16} className="animate-spin text-white" />
                <span>INICIANDO SESIÓN…</span>
              </>
            ) : (
              <span>INICIAR SESIÓN</span>
            )}
          </button>

          {/* Divider */}
          <div className="relative flex items-center justify-center my-4 py-1">
            <div className="border-t border-slate-200 w-full" />
            <span className="bg-white px-3 text-[11px] font-medium text-slate-400 select-none absolute">
              O iniciar sesión con:
            </span>
          </div>

          {/* Dual External Login (Microsoft 365 & Google Workspace) */}
          <div className="grid grid-cols-2 gap-2.5">
            {/* Microsoft 365 */}
            <button
              type="button"
              onClick={() => handleExternalLogin('Microsoft 365')}
              className="h-10.5 bg-white hover:bg-slate-50 active:scale-[0.99] text-slate-700 font-semibold rounded-lg border border-slate-200 text-xs transition flex items-center justify-center gap-2 shadow-2xs cursor-pointer"
            >
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 23 23">
                <path fill="#f35325" d="M1 1h10v10H1z" />
                <path fill="#81bc06" d="M12 1h10v10H12z" />
                <path fill="#05a6f0" d="M1 12h10v10H1z" />
                <path fill="#ffba08" d="M12 12h10v10H12z" />
              </svg>
              <span>Microsoft 365</span>
            </button>

            {/* Google Workspace */}
            <button
              type="button"
              onClick={() => handleExternalLogin('Google Workspace')}
              className="h-10.5 bg-white hover:bg-slate-50 active:scale-[0.99] text-slate-700 font-semibold rounded-lg border border-slate-200 text-xs transition flex items-center justify-center gap-2 shadow-2xs cursor-pointer"
            >
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z" />
                <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.26v3.15C3.25 21.37 7.34 24 12 24z" />
                <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.26C.46 8.16 0 9.97 0 12s.46 3.84 1.26 5.42l4.02-3.15z" />
                <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.34 0 3.25 2.63 1.26 6.58l4.02 3.15c.95-2.83 3.6-4.98 6.72-4.98z" />
              </svg>
              <span>Google Workspace</span>
            </button>
          </div>

          {/* Bottom Card Helper Link */}
          <p className="text-center text-[11px] text-slate-500 pt-2">
            ¿No tiene una cuenta?{' '}
            <button
              type="button"
              onClick={() => alert('Comuníquese con el Administrador de CYA STORE para activar un nuevo usuario corporativo.')}
              className="text-[#0B203E] hover:underline font-bold cursor-pointer"
            >
              Contacte a su administrador.
            </button>
          </p>
        </form>
      </div>

      {/* ─── Floating Demo Access Bar (Discreet & Non-intrusive) ─── */}
      <div className="fixed bottom-4 right-4 z-30 bg-white/95 backdrop-blur-md px-3.5 py-2 rounded-xl shadow-lg border border-slate-200/90 flex items-center gap-2 text-xs">
        <div className="flex items-center gap-1.5 text-slate-500 font-bold text-[11px]">
          <Sparkles size={13} className="text-amber-500" />
          <span>Acceso Rápido:</span>
        </div>
        <button
          type="button"
          onClick={() => fillCredentials('admin')}
          className={`px-2.5 py-1 rounded-lg font-bold text-xs transition cursor-pointer ${
            activeRole === 'admin'
              ? 'bg-[#0B203E] text-white shadow-xs'
              : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
          }`}
        >
          👑 Admin
        </button>
        <button
          type="button"
          onClick={() => fillCredentials('empleado')}
          className={`px-2.5 py-1 rounded-lg font-bold text-xs transition cursor-pointer ${
            activeRole === 'empleado'
              ? 'bg-[#0B203E] text-white shadow-xs'
              : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
          }`}
        >
          💼 Vendedor
        </button>
      </div>

    </div>
  )
}
