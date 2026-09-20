import { useState, useRef, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { X, Send, Sparkles } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { askAssistant, suggestedQuestions } from '../lib/assistant'
import { companySettingsService } from '../services/companySettingsService'

export default function Assistant() {
  const { user } = useAuth()
  const location = useLocation()

  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [company, setCompany] = useState(null)

  // Intro animation states: 'showcase' (tamaño grande + bienvenida) -> 'minimizing' -> 'idle' (bolita)
  const [introState, setIntroState] = useState('showcase')

  const panelRef = useRef(null)
  const buttonRef = useRef(null)
  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)

  function startMinimize() {
    setIntroState('minimizing')
    setTimeout(() => {
      setIntroState('idle')
    }, 750)
  }

  // Cargar configuración de la empresa para el nombre del asistente
  useEffect(() => {
    if (!user || location.pathname === '/login') return
    companySettingsService.get().then(setCompany).catch(() => {})
  }, [user, location.pathname])

  // Secuencia de animación de entrada: se muestra en tamaño real y luego se encoge a bolita
  useEffect(() => {
    if (!user || location.pathname === '/login') return
    // Tras 3.2 segundos en tamaño real, inicia la transición a bolita
    const timer = setTimeout(() => {
      startMinimize()
    }, 3200)

    return () => clearTimeout(timer)
  }, [user, location.pathname])

  // Inicializar con mensaje de bienvenida al abrir si no hay mensajes
  useEffect(() => {
    if (open && messages.length === 0) {
      setMessages([
        {
          role: 'assistant',
          text: '¡Hola! Pregúntame sobre tus ventas, stock o clientes.',
        },
      ])
    }
  }, [open, messages.length])

  // Auto-scroll al final del chat
  useEffect(() => {
    if (open) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, loading, open])

  // Focus en el input al abrir el panel
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 150)
    }
  }, [open])

  // Cerrar al hacer clic fuera
  useEffect(() => {
    function handleClickOutside(e) {
      if (
        panelRef.current &&
        !panelRef.current.contains(e.target) &&
        buttonRef.current &&
        !buttonRef.current.contains(e.target)
      ) {
        setOpen(false)
      }
    }

    if (open) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [open])

  // Do not render the assistant bot on the login page or if user is not authenticated
  if (!user || location.pathname === '/login') {
    return null
  }

  const companyDisplayName = (company?.name && company.name !== 'CYA') ? company.name : 'CYA STORE'
  const assistantName = company?.name && company.name !== 'CYA'
    ? `Asistente ${company.name}`
    : 'Asistente CYA'

  async function handleSend(questionText) {
    const q = (questionText || input).trim()
    if (!q || loading) return

    setInput('')
    setMessages((prev) => [...prev, { role: 'user', text: q }])
    setLoading(true)

    try {
      const answer = await askAssistant(q)
      setMessages((prev) => [...prev, { role: 'assistant', text: answer }])
    } catch (err) {
      console.error('Error del asistente:', err)
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          text: 'Ocurrió un error al consultar la información. Por favor, intenta de nuevo.',
        },
      ])
    } finally {
      setLoading(false)
    }
  }

  function handleSubmit(e) {
    e.preventDefault()
    handleSend()
  }

  const isLarge = introState === 'showcase'

  return (
    <>
      <style>{`
        @keyframes floatAssistant {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-7px); }
        }
        .animate-float-assistant {
          animation: floatAssistant 3.5s ease-in-out infinite;
        }
        @keyframes popInAssistant {
          0% { opacity: 0; transform: translateY(30px) scale(0.9); }
          100% { opacity: 1; transform: translateY(0) scale(1); }
        }
        .animate-pop-in {
          animation: popInAssistant 0.5s cubic-bezier(0.16, 1, 0.3, 1) both;
        }
      `}</style>

      {/* ─── Floating Button / Intro Showcase ─── */}
      <div
        className={`fixed z-50 flex flex-col items-end transition-all duration-700 ease-[cubic-bezier(0.34,1.3,0.64,1)] ${
          isLarge
            ? 'bottom-6 right-6 sm:bottom-8 sm:right-8'
            : 'bottom-6 right-6'
        }`}
      >
        {/* Globo de bienvenida durante el tamaño real */}
        {isLarge && (
          <div
            onClick={startMinimize}
            className="bg-white/95 backdrop-blur-md border border-slate-200/90 rounded-2xl p-3.5 shadow-2xl max-w-[260px] sm:max-w-[280px] mb-3 animate-pop-in cursor-pointer hover:border-brand/40 transition-all select-none"
            style={{ animationDuration: '0.45s' }}
          >
            <div className="flex items-center gap-1.5 text-brand font-bold text-xs mb-1">
              <Sparkles size={13} className="text-amber-500 animate-pulse" />
              <span>{assistantName}</span>
            </div>
            <p className="text-xs font-semibold text-slate-800 leading-snug">
              ¡Hola! 👋 Bienvenido a {companyDisplayName}.
            </p>
            <p className="text-[11px] text-slate-500 mt-1 leading-tight">
              Estoy aquí para asistirte con ventas, inventario y más.
            </p>
            <span className="text-[10px] text-brand font-bold block mt-1.5">
              Haz clic para continuar →
            </span>
          </div>
        )}

        {/* Imagen del asistente: Se encoge y morphs de tamaño real a bolita */}
        <button
          ref={buttonRef}
          type="button"
          onClick={() => {
            if (isLarge) {
              startMinimize()
            } else {
              setOpen((prev) => !prev)
            }
          }}
          className={`relative overflow-hidden bg-slate-900 border-2 border-white/95 shadow-2xl cursor-pointer transition-all duration-700 ease-[cubic-bezier(0.34,1.3,0.64,1)] ${
            isLarge
              ? 'w-44 h-44 sm:w-56 sm:h-56 rounded-3xl hover:scale-[1.02] shadow-[0_25px_60px_-15px_rgba(0,0,0,0.4)] ring-4 ring-brand/20 animate-pop-in'
              : 'w-16 h-16 rounded-full hover:scale-105 active:scale-95 animate-float-assistant'
          }`}
          title={isLarge ? 'Minimizar asistente' : open ? 'Cerrar chat' : 'Abrir asistente virtual'}
        >
          <img
            src="/assistant.png"
            alt={assistantName}
            className="w-full h-full object-cover object-top transition-transform duration-700"
          />

          {/* Badge "En línea" */}
          <span
            className={`absolute bg-emerald-500 border-2 border-white rounded-full transition-all duration-700 ${
              isLarge
                ? 'bottom-2.5 right-2.5 w-4 h-4'
                : 'bottom-1 right-1 w-3.5 h-3.5'
            }`}
          />
        </button>
      </div>

      {/* ─── Chat Panel ─── */}
      {open && (
        <div
          ref={panelRef}
          className="fixed bottom-24 right-6 z-50 w-80 sm:w-96 max-h-[520px] h-[490px] flex flex-col bg-white rounded-3xl border border-slate-200 shadow-2xl overflow-hidden animate-slide-up"
          style={{ boxShadow: '0 20px 45px -10px rgba(15, 23, 42, 0.25)' }}
        >
          {/* Header */}
          <div className="px-4 py-3 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white flex items-center justify-between shadow-xs shrink-0">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-full overflow-hidden bg-slate-700 border border-white/30 shrink-0">
                <img
                  src="/assistant.png"
                  alt={assistantName}
                  className="w-full h-full object-cover object-top"
                />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <p className="font-bold text-xs truncate leading-tight">{assistantName}</p>
                  <Sparkles size={11} className="text-amber-400 shrink-0" />
                </div>
                <p className="text-[10px] text-emerald-400 font-medium flex items-center gap-1 mt-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block animate-pulse" />
                  En línea
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="p-1 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
              title="Cerrar chat"
            >
              <X size={17} />
            </button>
          </div>

          {/* Messages Feed */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50/50 text-xs">
            {messages.map((msg, idx) => {
              const isUser = msg.role === 'user'
              return (
                <div
                  key={idx}
                  className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`px-3.5 py-2.5 max-w-[85%] whitespace-pre-wrap leading-relaxed shadow-xs ${
                      isUser
                        ? 'bg-brand text-white rounded-2xl rounded-tr-xs font-medium'
                        : 'bg-white border border-slate-200/80 text-slate-800 rounded-2xl rounded-tl-xs'
                    }`}
                  >
                    {msg.text}
                  </div>
                </div>
              )
            })}

            {/* Suggested questions (shown under first assistant message) */}
            {messages.length === 1 && messages[0].role === 'assistant' && (
              <div className="pt-2 space-y-1.5 animate-fade-in">
                <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider pl-1">
                  Preguntas sugeridas:
                </p>
                <div className="flex flex-col gap-1.5">
                  {suggestedQuestions.map((q, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleSend(q)}
                      className="text-left bg-white hover:bg-brand hover:text-white text-slate-700 font-medium px-3 py-2 rounded-xl text-xs border border-slate-200/90 shadow-2xs hover:border-brand transition-all cursor-pointer"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Typing Indicator */}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-white border border-slate-200/80 px-4 py-3 rounded-2xl rounded-tl-xs shadow-xs flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input Bar */}
          <form
            onSubmit={handleSubmit}
            className="p-2.5 bg-white border-t border-slate-100 flex items-center gap-2 shrink-0"
          >
            <input
              ref={inputRef}
              type="text"
              className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-brand focus:bg-white transition-colors"
              placeholder="Haz una pregunta sobre tu ERP…"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={loading}
            />
            <button
              type="submit"
              disabled={!input.trim() || loading}
              className="p-2.5 rounded-xl bg-brand hover:bg-brand-hover active:scale-95 text-white disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-xs shrink-0"
              title="Enviar mensaje"
            >
              <Send size={14} />
            </button>
          </form>
        </div>
      )}
    </>
  )
}
