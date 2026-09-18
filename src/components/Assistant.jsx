import { useState, useRef, useEffect } from 'react'
import { X, Send, Sparkles } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { askAssistant, suggestedQuestions } from '../lib/assistant'
import { companySettingsService } from '../services/companySettingsService'

export default function Assistant() {
  const { user } = useAuth()
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [company, setCompany] = useState(null)

  const panelRef = useRef(null)
  const buttonRef = useRef(null)
  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)

  // Cargar configuración de la empresa para el nombre del asistente
  useEffect(() => {
    companySettingsService.get().then(setCompany).catch(() => {})
  }, [])

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

  // Solo mostrar cuando el usuario tiene sesión activa
  if (!user) return null

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
      `}</style>

      {/* ─── Floating Button ─── */}
      <div className="fixed bottom-6 right-6 z-50">
        <button
          ref={buttonRef}
          type="button"
          onClick={() => setOpen((prev) => !prev)}
          className="relative w-16 h-16 rounded-full shadow-2xl border-2 border-white/90 overflow-hidden bg-slate-900 cursor-pointer hover:scale-105 active:scale-95 transition-transform duration-200 group animate-float-assistant"
          title={open ? 'Cerrar asistente' : 'Abrir asistente virtual'}
        >
          <img
            src="/assistant.png"
            alt={assistantName}
            className="w-full h-full object-cover object-top"
          />
          {/* Subtle online badge */}
          <span className="absolute bottom-1 right-1 w-3.5 h-3.5 bg-emerald-500 border-2 border-white rounded-full" />
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
