import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Building2,
  FileText,
  MapPin,
  Phone,
  Camera,
  X,
  Loader2,
  AlertCircle,
  Sparkles,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { productsService } from '../services/productsService'

export default function Onboarding() {
  const { completeOnboarding } = useAuth()
  const navigate = useNavigate()

  const [name, setName] = useState('')
  const [ruc, setRuc] = useState('')
  const [address, setAddress] = useState('')
  const [phone, setPhone] = useState('')
  const [logoFile, setLogoFile] = useState(null)
  const [logoPreview, setLogoPreview] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const fileInputRef = useRef(null)

  useEffect(() => {
    if (!logoFile) {
      setLogoPreview('')
      return
    }
    const url = URL.createObjectURL(logoFile)
    setLogoPreview(url)
    return () => URL.revokeObjectURL(url)
  }, [logoFile])

  function resetLogo() {
    setLogoFile(null)
    setLogoPreview('')
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (!name.trim()) {
      setError('El nombre de la empresa es obligatorio')
      return
    }
    setLoading(true)

    try {
      let logo_url = null
      if (logoFile) {
        try {
          logo_url = await productsService.uploadImage(logoFile)
        } catch (imgErr) {
          setError(imgErr.message || 'No se pudo subir el logo')
          setLoading(false)
          return
        }
      }

      await completeOnboarding({
        name: name.trim(),
        ruc: ruc.trim() || null,
        address: address.trim() || null,
        phone: phone.trim() || null,
        logo_url,
      })

      navigate('/')
    } catch (err) {
      setError(err.message || 'Error al configurar la empresa')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen w-full relative flex flex-col items-center justify-center p-4 sm:p-6 font-sans select-none overflow-x-hidden">
      {/* ─── Crisp Corporate Background ─── */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: "url('/login-bg.jpg')" }}
      />
      {/* Subtle daylight ambient overlay */}
      <div className="absolute inset-0 bg-slate-900/20 backdrop-blur-[2px]" />

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

      {/* ─── Central Card ─── */}
      <div className="relative z-20 w-full max-w-[520px] bg-white rounded-2xl shadow-[0_20px_60px_-10px_rgba(11,32,62,0.35)] border border-slate-200/90 p-6 sm:p-8 my-auto">
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-50 text-[#0B203E] rounded-full text-xs font-semibold mb-2">
            <Sparkles size={13} className="text-blue-600" />
            <span>Paso Inicial</span>
          </div>
          <h1 className="font-outfit text-2xl sm:text-[26px] font-bold text-slate-900 tracking-tight">
            ¡Bienvenido a tu ERP!
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Configura los datos de tu empresa para empezar
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Logo Selector */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Logo de la Empresa (Opcional)
            </label>
            <div className="flex items-center gap-4 p-3 bg-slate-50 border border-slate-200 rounded-xl">
              <div className="relative w-16 h-16 rounded-xl bg-white border border-slate-200 flex items-center justify-center overflow-hidden shrink-0 shadow-2xs group">
                {logoPreview ? (
                  <>
                    <img
                      src={logoPreview}
                      alt="Vista previa logo"
                      className="w-full h-full object-contain p-1"
                    />
                    <button
                      type="button"
                      onClick={resetLogo}
                      className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-xl cursor-pointer"
                      title="Quitar logo"
                    >
                      <X size={18} className="text-white" />
                    </button>
                  </>
                ) : (
                  <Building2 size={24} className="text-slate-400" />
                )}
              </div>
              <div className="flex flex-col gap-1">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-lg border border-slate-300 transition flex items-center gap-1.5 self-start cursor-pointer shadow-2xs"
                >
                  <Camera size={13} />
                  <span>{logoPreview ? 'Cambiar logo' : 'Subir logo'}</span>
                </button>
                {logoFile && (
                  <p className="text-[11px] text-blue-600 font-medium max-w-[220px] truncate">
                    {logoFile.name}
                  </p>
                )}
                <p className="text-[10.5px] text-slate-400">PNG, JPG o WEBP. Máx 5 MB.</p>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0]
                  if (f) setLogoFile(f)
                }}
              />
            </div>
          </div>

          {/* Nombre de la empresa */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Nombre de la Empresa <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                <Building2 size={17} />
              </div>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ej. Inversiones & Servicios S.A.C."
                className="w-full h-11 bg-white border border-slate-300 focus:border-[#0B203E] rounded-lg pl-10 pr-3 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0B203E]/10 transition"
                autoFocus
              />
            </div>
          </div>

          {/* RUC y Teléfono */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                RUC / Identificación Fiscal
              </label>
              <div className="relative">
                <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                  <FileText size={17} />
                </div>
                <input
                  type="text"
                  value={ruc}
                  onChange={(e) => setRuc(e.target.value)}
                  placeholder="Ej. 20123456789"
                  className="w-full h-11 bg-white border border-slate-300 focus:border-[#0B203E] rounded-lg pl-10 pr-3 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0B203E]/10 transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Teléfono
              </label>
              <div className="relative">
                <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                  <Phone size={17} />
                </div>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Ej. +51 987 654 321"
                  className="w-full h-11 bg-white border border-slate-300 focus:border-[#0B203E] rounded-lg pl-10 pr-3 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0B203E]/10 transition"
                />
              </div>
            </div>
          </div>

          {/* Dirección */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Dirección
            </label>
            <div className="relative">
              <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                <MapPin size={17} />
              </div>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Ej. Av. Principal 123, Oficina 401"
                className="w-full h-11 bg-white border border-slate-300 focus:border-[#0B203E] rounded-lg pl-10 pr-3 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0B203E]/10 transition"
              />
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
            className="w-full h-11 bg-[#0B203E] hover:bg-[#143258] active:scale-[0.99] text-white font-bold rounded-lg text-xs sm:text-sm tracking-wider uppercase transition-all duration-150 flex items-center justify-center gap-2 shadow-md shadow-[#0B203E]/25 cursor-pointer disabled:opacity-60 mt-4"
          >
            {loading ? (
              <>
                <Loader2 size={16} className="animate-spin text-white" />
                <span>GUARDANDO EMPRESA…</span>
              </>
            ) : (
              <span>COMENZAR AHORA</span>
            )}
          </button>
        </form>
      </div>
    </div>
  )
}
