import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Eye,
  EyeOff,
  Loader2,
  TrendingUp,
  MessageSquare,
  Ticket,
  AlertCircle
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

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(email, password)
      navigate('/')
    } catch (err) {
      setError(err.message || 'No se pudo iniciar sesión')
    } finally {
      setLoading(false)
    }
  }

  function fillCredentials(type) {
    if (type === 'admin') {
      setEmail('admin@demo.com')
      setPassword('admin123')
    } else {
      setEmail('empleado@demo.com')
      setPassword('empleado123')
    }
  }

  function handleGoogleLogin() {
    setError('El inicio con Google está en fase de vinculación empresarial.')
  }

  return (
    <div className="h-screen w-full flex items-center justify-center p-0 lg:p-8 font-sans overflow-hidden select-none bg-white lg:bg-[#f3f4f8] lg:[background-image:radial-gradient(#cbd5e1_1.3px,transparent_1.3px)] lg:[background-size:24px_24px]">
      {/* =========================================================================
          DESKTOP VIEW (Visible on lg screens and up): 2-Column Floating Card
         ========================================================================= */}
      <div className="hidden lg:grid w-full max-w-[1140px] bg-white rounded-[32px] shadow-[0_20px_60px_-15px_rgba(15,23,42,0.08)] border border-slate-200/90 overflow-hidden grid-cols-12 min-h-[640px]">
        
        {/* Left Column: Form */}
        <div className="col-span-5 p-10 xl:p-12 flex flex-col justify-between">
          <div>
            {/* Logo CYA */}
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full shadow-md ring-2 ring-amber-500/20 shrink-0 overflow-hidden bg-[#0f1422] flex items-center justify-center">
                <img
                  src="/logo-cya-badge.png"
                  alt="Logo CYA"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="flex flex-col">
                <span className="text-[26px] font-black tracking-wider text-slate-900 leading-none">
                  CYA
                </span>
                <span className="text-[11px] font-semibold text-amber-700 tracking-wider uppercase mt-1">
                  Gestión Empresarial
                </span>
              </div>
            </div>

            {/* Header Text */}
            <div className="mt-7">
              <h1 className="text-[30px] font-extrabold text-slate-900 tracking-tight leading-tight">
                Bienvenido de nuevo
              </h1>
              <p className="text-slate-500 text-[13.5px] leading-relaxed mt-2">
                Accede a la plataforma CYA para gestionar ventas, finanzas e inventario desde un solo lugar.
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="mt-7 space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Correo electrónico
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="ejemplo@cya.com"
                  className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-800 placeholder:text-slate-300 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Contraseña
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 pr-11 text-sm text-slate-800 placeholder:text-slate-300 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition p-1 cursor-pointer"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between pt-0.5 text-xs">
                <label className="flex items-center gap-2 cursor-pointer select-none text-slate-600 font-medium">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 rounded text-blue-600 border-slate-300 focus:ring-blue-500 cursor-pointer accent-blue-600"
                  />
                  <span>Mantener sesión</span>
                </label>
                <button
                  type="button"
                  onClick={() => alert('Para restablecer tu contraseña, comunícate con el administrador del sistema.')}
                  className="text-blue-600 hover:text-blue-700 hover:underline font-semibold transition cursor-pointer"
                >
                  Recuperar contraseña
                </button>
              </div>

              {error && (
                <div className="flex items-center gap-2 text-xs text-rose-600 bg-rose-50 border border-rose-200/80 rounded-xl px-3.5 py-2.5">
                  <AlertCircle size={15} className="shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-1 bg-[#0f1422] hover:bg-[#1a2133] active:bg-[#090d16] text-white font-medium py-3 px-4 rounded-xl text-sm transition-all duration-150 flex items-center justify-center gap-2 shadow-sm cursor-pointer disabled:opacity-60"
              >
                {loading && <Loader2 size={16} className="animate-spin text-white" />}
                <span>Iniciar sesión</span>
              </button>

              <div className="relative flex items-center justify-center my-2.5 py-0.5">
                <div className="border-t border-slate-200 w-full" />
                <span className="bg-white px-3 text-[11px] font-medium text-slate-400 select-none absolute">
                  o
                </span>
              </div>

              <button
                type="button"
                onClick={handleGoogleLogin}
                className="w-full bg-white hover:bg-slate-50 text-slate-700 font-medium py-2.5 px-4 rounded-xl border border-slate-200 text-sm transition flex items-center justify-center gap-2.5 shadow-sm active:scale-[0.99] cursor-pointer"
              >
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z" />
                  <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.26v3.15C3.25 21.37 7.34 24 12 24z" />
                  <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.26C.46 8.16 0 9.97 0 12s.46 3.84 1.26 5.42l4.02-3.15z" />
                  <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.34 0 3.25 2.63 1.26 6.58l4.02 3.15c.95-2.83 3.6-4.98 6.72-4.98z" />
                </svg>
                <span>Continuar con Google</span>
              </button>

              <p className="text-center text-xs text-slate-500 pt-1">
                ¿No tienes una cuenta?{' '}
                <button
                  type="button"
                  onClick={() => alert('El registro debe ser habilitado por el Administrador del sistema.')}
                  className="text-blue-600 hover:text-blue-700 hover:underline font-semibold cursor-pointer"
                >
                  Registrarse
                </button>
              </p>
            </form>
          </div>

          <div className="mt-6 pt-3.5 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span className="text-[11px] font-medium text-slate-400">Credenciales demo:</span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => fillCredentials('admin')}
                className="px-2.5 py-1 rounded-md bg-blue-50 text-blue-700 hover:bg-blue-100 text-[11px] font-semibold transition cursor-pointer"
              >
                Admin
              </button>
              <button
                type="button"
                onClick={() => fillCredentials('empleado')}
                className="px-2.5 py-1 rounded-md bg-slate-100 text-slate-700 hover:bg-slate-200 text-[11px] font-semibold transition cursor-pointer"
              >
                Empleado
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Illustration & Widgets */}
        <div className="col-span-7 bg-[#f8fafc] border-l border-slate-100 relative flex items-center justify-center p-8 overflow-hidden select-none">
          <div className="absolute w-[440px] h-[440px] rounded-full bg-gradient-to-tr from-sky-100/80 via-blue-50/70 to-emerald-50/40 blur-2xl" />

          <div className="relative w-full max-w-[500px] h-[520px] flex items-center justify-center">
            {/* Center image */}
            <div className="relative w-[380px] h-[380px] rounded-full overflow-hidden shadow-sm border-4 border-white bg-sky-50 flex items-center justify-center">
              <img
                src="/hero-worker.jpg"
                alt="Plataforma CYA"
                className="w-full h-full object-cover transform scale-105"
              />
            </div>

            {/* CRM sales */}
            <div className="absolute top-1 left-4 z-20 animate-float-slow">
              <div className="bg-white/95 backdrop-blur-md rounded-xl p-2.5 shadow-[0_8px_20px_rgba(0,0,0,0.08)] border border-slate-100 w-[112px]">
                <div className="bg-blue-600 rounded text-[9px] font-bold text-white text-center py-0.5 mb-2">
                  CRM sales
                </div>
                <div className="flex flex-col items-center gap-1">
                  <div className="w-full h-3 bg-gradient-to-r from-blue-400 to-blue-500 rounded-xs flex items-center justify-center">
                    <span className="text-[7.5px] text-white font-medium">100% Leads</span>
                  </div>
                  <div className="w-4/5 h-3 bg-gradient-to-r from-blue-500 to-blue-600 rounded-xs flex items-center justify-center">
                    <span className="text-[7.5px] text-white font-medium">65% Negocio</span>
                  </div>
                  <div className="w-3/5 h-3 bg-gradient-to-r from-blue-600 to-blue-700 rounded-xs flex items-center justify-center">
                    <span className="text-[7.5px] text-white font-medium">32% Cierre</span>
                  </div>
                </div>
              </div>
            </div>

            {/* SUNAT invoice */}
            <div className="absolute -top-3 right-20 z-20 animate-float-medium">
              <div className="relative bg-white/95 backdrop-blur-md rounded-xl p-3 shadow-[0_10px_25px_rgba(0,0,0,0.09)] border border-slate-100 w-[118px]">
                <div className="flex items-center justify-between pb-1.5 border-b border-slate-100">
                  <span className="font-extrabold text-[10px] tracking-tight text-red-600">SUNAT</span>
                  <span className="text-[9px] font-semibold text-slate-500">Invoice</span>
                </div>
                <div className="mt-2 space-y-1.5">
                  <div className="h-1.5 bg-slate-200 rounded w-full" />
                  <div className="h-1.5 bg-slate-150 rounded w-5/6 bg-slate-200/70" />
                  <div className="h-1.5 bg-slate-100 rounded w-3/4 bg-slate-200/40" />
                </div>
                <div className="absolute -bottom-2.5 -right-2.5 w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-md border-2 border-white">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              </div>
            </div>

            {/* WhatsApp */}
            <div className="absolute top-12 right-5 z-20 animate-float-reverse">
              <div className="w-11 h-11 rounded-2xl bg-[#25D366] text-white flex items-center justify-center shadow-[0_8px_20px_rgba(37,211,102,0.35)] hover:scale-105 transition cursor-pointer">
                <svg className="w-6 h-6 fill-current" viewBox="0 0 24 24">
                  <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.711 2.598 2.664-.699c.971.53 1.777.822 2.796.822 3.18 0 5.767-2.586 5.767-5.766.001-3.182-2.585-5.769-5.767-5.769zm3.364 8.169c-.144.405-.837.774-1.17.824-.312.045-.698.077-1.127-.061-.264-.085-.604-.207-1.042-.398-1.854-.809-3.053-2.686-3.146-2.81-.093-.124-.755-.999-.755-1.905 0-.907.478-1.353.648-1.528.17-.174.372-.218.496-.218.124 0 .248.002.355.007.114.005.267-.043.418.321.155.372.529 1.29.575 1.384.047.094.078.204.016.328-.062.124-.093.202-.186.311-.093.109-.196.244-.28.327-.094.093-.191.195-.082.382.109.186.485.798 1.041 1.293.716.638 1.319.836 1.506.929.186.093.295.078.404-.047.109-.124.466-.543.59-.73.124-.186.248-.155.418-.093.17.062 1.086.512 1.272.605.186.093.31.14.357.218.046.077.046.45-.098.855z" />
                </svg>
              </div>
            </div>

            {/* Support ticket */}
            <div className="absolute top-36 right-2 z-20 animate-float-slow">
              <div className="bg-white/95 backdrop-blur-md rounded-xl p-2.5 shadow-[0_8px_20px_rgba(0,0,0,0.08)] border border-slate-100 w-[125px]">
                <div className="bg-amber-500 rounded text-[9px] font-bold text-white px-2 py-0.5 mb-1.5 flex items-center justify-between">
                  <span>Support ticket</span>
                  <Ticket size={10} />
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-[9.5px] font-semibold text-slate-700">• Boletos Activos</span>
                </div>
                <span className="text-[8px] text-slate-400 block mt-0.5">Resp. promedio: 2 min</span>
              </div>
            </div>

            {/* ERP finance */}
            <div className="absolute top-[235px] right-5 z-20 animate-float-medium">
              <div className="bg-white/95 backdrop-blur-md rounded-xl p-2.5 shadow-[0_8px_20px_rgba(0,0,0,0.08)] border border-slate-100 w-[122px]">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[9.5px] font-bold text-slate-800">ERP finance</span>
                  <TrendingUp size={11} className="text-blue-600" />
                </div>
                <div className="w-full h-8 flex items-end">
                  <svg className="w-full h-full" viewBox="0 0 100 40" fill="none">
                    <path
                      d="M0 35 Q 20 30, 35 22 T 70 18 T 100 6"
                      stroke="#2563EB"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                    />
                    <path
                      d="M0 35 Q 20 30, 35 22 T 70 18 T 100 6 L 100 40 L 0 40 Z"
                      fill="url(#financeGradientDesktop)"
                      opacity="0.25"
                    />
                    <defs>
                      <linearGradient id="financeGradientDesktop" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#2563EB" />
                        <stop offset="100%" stopColor="#ffffff" />
                      </linearGradient>
                    </defs>
                  </svg>
                </div>
              </div>
            </div>

            {/* Chat bubble */}
            <div className="absolute top-44 left-2 z-20 animate-float-reverse">
              <div className="bg-white/95 backdrop-blur-md rounded-xl px-3 py-2 shadow-[0_8px_20px_rgba(0,0,0,0.08)] border border-slate-100 flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                  <MessageSquare size={13} />
                </div>
                <div className="space-y-1">
                  <div className="h-1.5 w-12 bg-slate-300 rounded" />
                  <div className="h-1.5 w-8 bg-slate-200 rounded" />
                </div>
              </div>
            </div>

            {/* Quote Card */}
            <div className="absolute -bottom-6 right-2 z-30 max-w-[340px] bg-[#181f2a] text-white p-5 rounded-2xl shadow-2xl border border-slate-800/90 animate-float-slow">
              <p className="text-[12.5px] leading-relaxed text-slate-200">
                Plataforma CYA centraliza el trabajo de tu equipo en un solo lugar. Menos fricción, más foco en lo que importa.
              </p>
              <div className="mt-3.5 pt-2.5 border-t border-slate-800/60">
                <h4 className="font-bold text-[13px] text-white tracking-tight">
                  Equipo CYA
                </h4>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Productividad y gestión
                </p>
              </div>
            </div>

          </div>
        </div>

      </div>

      {/* =========================================================================
          MOBILE VIEW (Redesigned: High-End Unified Mobile Experience)
          Fits 100% in a single screen, NO scrolling, elegant visual banner & card!
         ========================================================================= */}
      <div className="lg:hidden w-full h-full bg-white flex flex-col justify-between overflow-hidden">
        
        {/* Top Hero Banner: Gradient with Logo + Illustration + Micro-Widgets */}
        <div className="relative bg-gradient-to-b from-[#0f172a] via-[#1e293b] to-[#0f172a] text-white px-4 pt-3.5 pb-2.5 shrink-0 overflow-hidden">
          {/* Subtle glow background */}
          <div className="absolute top-0 right-0 w-40 h-40 bg-blue-500/20 rounded-full blur-2xl pointer-events-none" />
          <div className="absolute -bottom-10 -left-10 w-36 h-36 bg-amber-500/15 rounded-full blur-xl pointer-events-none" />

          {/* Top Brand Bar */}
          <div className="relative z-10 flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full ring-2 ring-amber-400/40 overflow-hidden bg-slate-900 flex items-center justify-center shrink-0">
                <img src="/logo-cya-badge.png" alt="CYA" className="w-full h-full object-cover" />
              </div>
              <div className="flex flex-col">
                <span className="text-[17px] font-black tracking-wider text-white leading-none">CYA</span>
                <span className="text-[8px] font-semibold text-amber-300 tracking-widest uppercase">Gestión Empresarial</span>
              </div>
            </div>
            <div className="flex items-center gap-1 bg-white/10 backdrop-blur-md px-2 py-0.5 rounded-full border border-white/10 text-[9.5px] font-medium text-slate-200">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>Plataforma 360°</span>
            </div>
          </div>

          {/* Integrated Hero Graphic with surrounding badges */}
          <div className="relative z-10 flex items-center justify-center gap-2 py-1">
            {/* Left micro-widgets stack */}
            <div className="flex flex-col gap-1.5 shrink-0">
              <div className="bg-white/95 backdrop-blur-md rounded-lg px-2 py-1 shadow-md border border-slate-200 text-slate-800 flex items-center gap-1 text-[8.5px] font-bold">
                <div className="w-2 h-2 rounded-xs bg-blue-600 shrink-0" />
                <span>CRM sales</span>
              </div>
              <div className="bg-white/95 backdrop-blur-md rounded-lg px-2 py-1 shadow-md border border-slate-200 text-slate-800 flex items-center gap-1 text-[8.5px] font-bold">
                <TrendingUp size={10} className="text-blue-600 shrink-0" />
                <span>ERP finance</span>
              </div>
            </div>

            {/* Central Round Hero Illustration */}
            <div className="relative w-[88px] h-[88px] sm:w-[98px] sm:h-[98px] rounded-full overflow-hidden border-2 border-amber-400/60 shadow-xl bg-sky-100 shrink-0 ring-4 ring-white/10">
              <img
                src="/hero-worker.jpg"
                alt="CYA"
                className="w-full h-full object-cover transform scale-110"
              />
            </div>

            {/* Right micro-widgets stack */}
            <div className="flex flex-col gap-1.5 shrink-0">
              <div className="bg-white/95 backdrop-blur-md rounded-lg px-2 py-1 shadow-md border border-slate-200 text-slate-800 flex items-center gap-1 text-[8.5px] font-bold">
                <span className="text-red-600 font-black text-[9px]">SUNAT</span>
                <span className="w-3.5 h-3.5 rounded-full bg-emerald-500 text-white flex items-center justify-center text-[7.5px]">✓</span>
              </div>
              <div className="bg-[#25D366] text-white rounded-lg px-2 py-1 shadow-md flex items-center justify-center gap-1 text-[8.5px] font-bold">
                <svg className="w-3 h-3 fill-current" viewBox="0 0 24 24">
                  <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.711 2.598 2.664-.699c.971.53 1.777.822 2.796.822 3.18 0 5.767-2.586 5.767-5.766.001-3.182-2.585-5.769-5.767-5.769zm3.364 8.169c-.144.405-.837.774-1.17.824-.312.045-.698.077-1.127-.061-.264-.085-.604-.207-1.042-.398-1.854-.809-3.053-2.686-3.146-2.81-.093-.124-.755-.999-.755-1.905 0-.907.478-1.353.648-1.528.17-.174.372-.218.496-.218.124 0 .248.002.355.007.114.005.267-.043.418.321.155.372.529 1.29.575 1.384.047.094.078.204.016.328-.062.124-.093.202-.186.311-.093.109-.196.244-.28.327-.094.093-.191.195-.082.382.109.186.485.798 1.041 1.293.716.638 1.319.836 1.506.929.186.093.295.078.404-.047.109-.124.466-.543.59-.73.124-.186.248-.155.418-.093.17.062 1.086.512 1.272.605.186.093.31.14.357.218.046.077.046.45-.098.855z" />
                </svg>
                <span>WhatsApp</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Form Sheet: Balanced spacing with Quote Card & zero dead space */}
        <div className="flex-1 bg-white px-5 py-3 flex flex-col justify-between overflow-hidden">
          <div>
            <div className="mb-2">
              <h2 className="text-[18px] sm:text-[20px] font-extrabold text-slate-900 leading-tight">
                Bienvenido de nuevo
              </h2>
              <p className="text-[11px] sm:text-[12px] text-slate-500 mt-0.5">
                Ingresa tus credenciales para gestionar tu negocio.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-2">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Correo electrónico
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="ejemplo@cya.com"
                  className="w-full h-9 bg-slate-50 border border-slate-200 rounded-xl px-3 text-xs text-slate-900 focus:outline-none focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/10 transition"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Contraseña
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full h-9 bg-slate-50 border border-slate-200 rounded-xl px-3 pr-10 text-xs text-slate-900 focus:outline-none focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/10 transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 p-1"
                  >
                    {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between text-[11px] pt-0.5">
                <label className="flex items-center gap-1.5 cursor-pointer text-slate-600">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-3.5 h-3.5 rounded text-blue-600 border-slate-300 accent-blue-600"
                  />
                  <span>Mantener sesión</span>
                </label>
                <button
                  type="button"
                  onClick={() => alert('Comunícate con el administrador para restablecer tu acceso.')}
                  className="text-blue-600 hover:underline font-semibold"
                >
                  Recuperar clave
                </button>
              </div>

              {error && (
                <div className="text-[11px] text-rose-600 bg-rose-50 border border-rose-200/80 rounded-lg px-2.5 py-1.5 flex items-center gap-1.5">
                  <AlertCircle size={13} className="shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full h-9 bg-[#0f1422] hover:bg-[#1a2133] active:scale-[0.99] text-white font-medium rounded-xl text-xs flex items-center justify-center gap-2 transition shadow-sm cursor-pointer"
              >
                {loading && <Loader2 size={14} className="animate-spin text-white" />}
                <span>Iniciar sesión</span>
              </button>

              <button
                type="button"
                onClick={handleGoogleLogin}
                className="w-full h-8.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-medium rounded-xl text-xs flex items-center justify-center gap-2 transition cursor-pointer"
              >
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z" />
                  <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.26v3.15C3.25 21.37 7.34 24 12 24z" />
                  <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.26C.46 8.16 0 9.97 0 12s.46 3.84 1.26 5.42l4.02-3.15z" />
                  <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.34 0 3.25 2.63 1.26 6.58l4.02 3.15c.95-2.83 3.6-4.98 6.72-4.98z" />
                </svg>
                <span>Continuar con Google</span>
              </button>

              <p className="text-center text-[11px] text-slate-500 pt-0.5">
                ¿No tienes una cuenta?{' '}
                <button
                  type="button"
                  onClick={() => alert('El registro debe ser habilitado por el Administrador.')}
                  className="text-blue-600 hover:underline font-semibold cursor-pointer"
                >
                  Registrarse
                </button>
              </p>
            </form>
          </div>

          {/* Elegant Mobile Platform Quote Card (from the 360/CYA concept) */}
          <div className="my-1.5 bg-[#181f2a] text-white p-2.5 rounded-xl border border-slate-800/90 shadow-sm shrink-0">
            <p className="text-[10.5px] leading-relaxed text-slate-200">
              “Plataforma CYA centraliza ventas, finanzas e inventario en un solo lugar. Menos fricción, más foco en lo que importa.”
            </p>
            <div className="mt-1.5 pt-1.5 border-t border-slate-800/60 flex items-center justify-between text-[9.5px]">
              <span className="font-bold text-white">Equipo CYA</span>
              <span className="text-slate-400">Productividad y gestión</span>
            </div>
          </div>

          {/* Quick Demo Footer */}
          <div className="pt-1.5 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400 shrink-0">
            <span>Acceso demo:</span>
            <div className="flex gap-1.5">
              <button
                type="button"
                onClick={() => fillCredentials('admin')}
                className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 font-bold hover:bg-blue-100 transition cursor-pointer"
              >
                Admin
              </button>
              <button
                type="button"
                onClick={() => fillCredentials('empleado')}
                className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-bold hover:bg-slate-200 transition cursor-pointer"
              >
                Empleado
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}
