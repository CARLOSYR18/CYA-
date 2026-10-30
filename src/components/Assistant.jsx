import { useState, useRef, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { X, Send, Sparkles, ArrowRight, Mic, MicOff, Receipt as ReceiptIcon, ExternalLink, Bot } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { askAssistant, suggestedQuestions, getStoredUserName } from '../lib/assistant'
import { companySettingsService } from '../services/companySettingsService'
import { productsService } from '../services/productsService'
import { clientsService } from '../services/clientsService'
import { salesService } from '../services/salesService'
import { getEffectivePlan } from '../lib/planLimits'
import { isSaleTrigger, isSaleConfirmation, newSaleFlowState, startSaleFlow, processSaleFlowInput } from '../lib/saleFlow'
import { isStockTrigger, processStockCommand } from '../lib/stockFlow'
import { planService } from '../services/planService'
import Receipt from './Receipt'

function FormattedMessage({ text, isUser }) {
  if (!text) return null
  const lines = text.split('\n')
  return (
    <div className="space-y-1">
      {lines.map((line, lIdx) => {
        if (!line.trim()) {
          return <div key={lIdx} className="h-1.5" />
        }
        const parts = line.split(/(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g)
        const isBullet = line.trim().startsWith('•') || line.trim().startsWith('-') || line.trim().startsWith('👉')
        return (
          <p key={lIdx} className={`leading-relaxed ${isBullet ? 'pl-1' : ''}`}>
            {parts.map((part, pIdx) => {
              if (part.startsWith('**') && part.endsWith('**')) {
                return (
                  <strong key={pIdx} className={isUser ? 'font-bold' : 'font-bold text-slate-900'}>
                    {part.slice(2, -2)}
                  </strong>
                )
              }
              if (part.startsWith('*') && part.endsWith('*')) {
                return (
                  <em key={pIdx} className={isUser ? 'italic opacity-90' : 'italic text-slate-500'}>
                    {part.slice(1, -1)}
                  </em>
                )
              }
              if (part.startsWith('`') && part.endsWith('`')) {
                return (
                  <code key={pIdx} className="px-1 py-0.5 rounded bg-slate-100 text-slate-800 text-[10px] font-mono font-semibold">
                    {part.slice(1, -1)}
                  </code>
                )
              }
              const clean = part.replace(/\*\*/g, '')
              return <span key={pIdx}>{clean}</span>
            })}
          </p>
        )
      })}
    </div>
  )
}

export default function Assistant() {
  const { user } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()

  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [listening, setListening] = useState(false)
  const [voiceError, setVoiceError] = useState('')
  const recognitionRef = useRef(null)
  const handleSendRef = useRef(null)
  const voiceSupported =
    typeof window !== 'undefined' && !!(window.SpeechRecognition || window.webkitSpeechRecognition)
  const [generatingReceipt, setGeneratingReceipt] = useState(false)
  const [receiptModalData, setReceiptModalData] = useState(null)
  const [company, setCompany] = useState(null)
  const [products, setProducts] = useState([])
  const [clients, setClients] = useState([])
  const [saleFlow, setSaleFlow] = useState(newSaleFlowState())
  const [stockFlowState, setStockFlowState] = useState(null)

  const companyDisplayName = (company?.name && company.name !== 'CYA') ? company.name : 'CYA STORE'
  const assistantName = company?.name && company.name !== 'CYA'
    ? `Asistente ${company.name}`
    : 'Asistente CYA'

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

  // Cargar configuración de la empresa, productos y clientes para boletas
  useEffect(() => {
    if (!user || location.pathname === '/login') return
    companySettingsService.get().then(setCompany).catch(() => { })
    productsService.list().then(setProducts).catch(() => { })
    clientsService.list().then(setClients).catch(() => { })
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
      const storedName = getStoredUserName(user)
      const greetingName = storedName ? ` ${storedName}` : ''
      setMessages([
        {
          role: 'assistant',
          text: `¡Hola${greetingName}! 👋 Bienvenido a ${companyDisplayName}.\n\nSoy tu empleado virtual: respondo sobre ventas, stock, clientes y finanzas, y también puedo hacer ventas por ti y generar la boleta. Prueba escribiendo "haz una venta".`,
        },
      ])
    }
  }, [open, messages.length, user, companyDisplayName])

  // Auto-scroll al final del chat
  useEffect(() => {
    if (open) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, loading, open])

  // Detener el micrófono al cerrar el chat o desmontar
  useEffect(() => {
    if (!open) recognitionRef.current?.stop()
    return () => recognitionRef.current?.abort()
  }, [open])

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

  async function handleSend(questionText) {
    const q = (questionText || input).trim()
    if (!q || loading) return

    setInput('')
    setMessages((prev) => [...prev, { role: 'user', text: q }])
    setLoading(true)

    try {
      // 0. Flujo para AÑADIR o REPONER STOCK (Empleado virtual)
      if (isStockTrigger(q) || stockFlowState) {
        if (saleFlow.active) {
          setSaleFlow(newSaleFlowState())
        }
        const stockRes = await processStockCommand(q, stockFlowState)
        setStockFlowState(stockRes.state || null)
        if (stockRes.completed) {
          productsService.list().then(setProducts).catch(() => {})
        }
        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            text: stockRes.message,
            options: stockRes.options || [],
          },
        ])
        return
      }

      // 1. Si saleFlow.active es true, procesamos el flujo de venta
      if (saleFlow.active) {
        const confirming = saleFlow.step === 'confirm' && isSaleConfirmation(q)
        if (confirming) {
          setGeneratingReceipt(true)
          setReceiptModalData({ status: 'generating', sale: null })
        }
        const [result] = await Promise.all([
          processSaleFlowInput(saleFlow, q, user?.id),
          confirming ? new Promise((r) => setTimeout(r, 2200)) : Promise.resolve(),
        ])
        setGeneratingReceipt(false)
        setSaleFlow(result.state)

        if (result.completed) {
          setReceiptModalData({ status: 'ready', sale: result.completed })
          productsService.list().then(setProducts).catch(() => { })
          clientsService.list().then(setClients).catch(() => { })
        } else if (confirming) {
          setReceiptModalData(null)
        }

        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            text: result.completed
              ? '✅ ¡Boleta realizada con éxito por el asistente! Te la he abierto en el centro de la pantalla para que puedas imprimirla, descargarla como PDF o enviarla por WhatsApp.'
              : result.message,
            options: result.options || [],
            completed: result.completed || null,
          },
        ])
        return
      }

      // 2. Si no está activo pero dispara una venta
      if (isSaleTrigger(q)) {
        let currentCompany = company
        try {
          const fresh = await companySettingsService.get()
          if (fresh) {
            currentCompany = fresh
            setCompany(fresh)
          }
        } catch (e) { }

        const isPro = getEffectivePlan(currentCompany) === 'pro' || planService.isPro()
        if (!isPro) {
          setMessages((prev) => [
            ...prev,
            {
              role: 'assistant',
              text: 'Hacer ventas desde el chat es una función del Plan Pro. Actualiza tu plan para desbloquearla.',
              showPlanUpgrade: true,
            },
          ])
          return
        }

        const result = await startSaleFlow(q)
        setSaleFlow(result.state)
        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            text: result.message,
            options: result.options || [],
            completed: null,
          },
        ])
        return
      }

      // 3. Flujo conversacional normal con askAssistant
      const answer = await askAssistant(q, {
        user,
        companyName: companyDisplayName,
      })
      if (typeof answer === 'object' && answer !== null) {
        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            text: answer.text || '',
            options: answer.options || [],
          },
        ])
      } else {
        setMessages((prev) => [...prev, { role: 'assistant', text: answer }])
      }
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
      setGeneratingReceipt(false)
      setLoading(false)
    }
  }

  handleSendRef.current = handleSend

  // Reconocimiento de voz (Web Speech API) en español
  function toggleVoice() {
    if (listening) {
      recognitionRef.current?.stop()
      return
    }
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SR) {
      setVoiceError('Tu navegador no soporta voz. Usa Google Chrome o Edge.')
      return
    }
    setVoiceError('')
    const rec = new SR()
    rec.lang = 'es-PE'
    rec.interimResults = true
    rec.continuous = false
    rec.maxAlternatives = 1
    let finalText = ''

    rec.onstart = () => setListening(true)
    rec.onresult = (e) => {
      let interim = ''
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript
        if (e.results[i].isFinal) finalText += t
        else interim += t
      }
      setInput((finalText + interim).trim())
    }
    rec.onerror = (e) => {
      const map = {
        'not-allowed': 'Permite el acceso al micrófono en tu navegador.',
        'service-not-allowed': 'Permite el acceso al micrófono en tu navegador.',
        'no-speech': 'No te escuché. Intenta de nuevo.',
        'audio-capture': 'No se detectó ningún micrófono.',
        network: 'No se pudo conectar al servicio de voz de Google. Revisa tu internet, desactiva VPN/bloqueadores y usa Google Chrome o Edge (no Brave/Opera).',
      }
      setVoiceError(map[e.error] || 'No pude reconocer la voz.')
    }
    rec.onend = () => {
      setListening(false)
      recognitionRef.current = null
      const text = finalText.trim()
      if (text) {
        setInput('')
        handleSendRef.current?.(text)
      }
    }
    recognitionRef.current = rec
    try {
      rec.start()
    } catch {
      setListening(false)
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
        className={`fixed z-50 flex flex-col items-end transition-all duration-700 ease-[cubic-bezier(0.34,1.3,0.64,1)] ${isLarge
            ? 'bottom-4 right-4 sm:bottom-8 sm:right-8'
            : 'bottom-4 right-4 sm:bottom-6 sm:right-6'
          }`}
      >
        {/* Globo de bienvenida durante el tamaño real */}
        {isLarge && (
          <div
            onClick={startMinimize}
            className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-200/90 dark:border-white/10 rounded-2xl p-3 sm:p-3.5 shadow-2xl max-w-[240px] sm:max-w-[280px] mb-2 sm:mb-3 animate-pop-in cursor-pointer hover:border-brand/40 transition-all select-none"
            style={{ animationDuration: '0.45s' }}
          >
            <div className="flex items-center gap-1.5 text-brand dark:text-blue-400 font-bold text-xs mb-1">
              <Sparkles size={13} className="text-amber-500 animate-pulse" />
              <span>{assistantName}</span>
            </div>
            <p className="text-xs font-semibold text-slate-800 dark:text-slate-100 leading-snug">
              ¡Hola! 👋 Bienvenido a {companyDisplayName}.
            </p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-tight">
              Estoy aquí para asistirte con ventas, inventario y más.
            </p>
            <span className="text-[10px] text-brand dark:text-blue-400 font-bold block mt-1.5">
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
          className={`relative overflow-hidden bg-gradient-to-tr from-[#1B4FD8] via-indigo-700 to-violet-600 border-2 border-white/95 shadow-2xl cursor-pointer transition-all duration-700 ease-[cubic-bezier(0.34,1.3,0.64,1)] ${isLarge
              ? 'w-36 h-36 sm:w-56 sm:h-56 rounded-3xl hover:scale-[1.02] shadow-[0_25px_60px_-15px_rgba(0,0,0,0.4)] ring-4 ring-brand/20 animate-pop-in'
              : 'w-12 h-12 sm:w-14 sm:h-14 rounded-full hover:scale-105 active:scale-95 animate-float-assistant'
            }`}
          title={isLarge ? 'Minimizar asistente' : open ? 'Cerrar chat' : 'Abrir asistente virtual'}
        >
          <img
            src="/logo-cya-badge.png"
            alt=""
            className="w-full h-full object-cover object-top transition-transform duration-700"
            onError={(e) => {
              e.currentTarget.style.display = 'none'
              const fallback = e.currentTarget.parentElement?.querySelector('.assistant-icon-fallback')
              if (fallback) fallback.classList.remove('hidden')
            }}
          />
          <div className="assistant-icon-fallback hidden w-full h-full absolute inset-0 items-center justify-center text-white">
            <Bot size={isLarge ? 48 : 22} />
          </div>

          {/* Badge "En línea" */}
          <span
            className={`absolute bg-emerald-500 border-2 border-white rounded-full transition-all duration-700 ${isLarge
                ? 'bottom-2.5 right-2.5 w-4 h-4'
                : 'bottom-0.5 right-0.5 w-3 h-3 sm:w-3.5 sm:h-3.5'
              }`}
          />
        </button>
      </div>

      {/* ─── Chat Panel (Fully responsive on mobile & tablet) ─── */}
      {open && (
        <div
          ref={panelRef}
          className="fixed inset-x-3 bottom-3 sm:inset-x-auto sm:bottom-20 sm:right-6 z-50 w-auto sm:w-96 max-h-[85vh] h-[480px] sm:h-[500px] flex flex-col bg-white dark:bg-[#131627] rounded-3xl border border-slate-200 dark:border-white/10 shadow-2xl overflow-hidden animate-slide-up"
          style={{ boxShadow: '0 20px 45px -10px rgba(15, 23, 42, 0.25)' }}
        >
          {/* Header */}
          <div className="px-4 py-3 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white flex items-center justify-between shadow-xs shrink-0">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-full overflow-hidden bg-slate-700 border border-white/30 shrink-0 relative flex items-center justify-center">
                <img
                  src="/logo-cya-badge.png"
                  alt=""
                  className="w-full h-full object-cover object-top"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none'
                  }}
                />
                <Bot size={16} className="text-white absolute" />
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
              const isLimitReached =
                !isUser &&
                msg.text &&
                (msg.text.includes('Ya usaste tus') ||
                  msg.showPlanUpgrade ||
                  msg.text.includes('Hacer ventas desde el chat es una función del Plan Pro'))
              return (
                <div
                  key={idx}
                  className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} w-full`}
                >
                  <div
                    className={`px-3.5 py-2.5 ${msg.completed ? 'w-full max-w-[96%]' : 'max-w-[85%]'
                      } whitespace-pre-wrap leading-relaxed shadow-xs ${isUser
                        ? 'bg-brand text-white rounded-2xl rounded-tr-xs font-medium'
                        : 'bg-white border border-slate-200/80 text-slate-800 rounded-2xl rounded-tl-xs'
                      }`}
                  >
                    <FormattedMessage text={msg.text} isUser={isUser} />

                    {/* Botón para ver la boleta oficial en pantalla grande */}
                    {msg.completed && (
                      <div className="mt-3 pt-3 border-t border-slate-200/80 w-full space-y-2">
                        <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between">
                          <div>
                            <p className="font-bold text-slate-800 text-[11px]">
                              Boleta B001-{(msg.completed.id || '').toString().slice(-6).toUpperCase()}
                            </p>
                            <p className="text-[10px] text-slate-500">
                              Cliente: {msg.completed.client?.name || msg.completed.client_name || 'Particular'}
                            </p>
                          </div>
                          <span className="font-black font-mono text-xs text-brand">
                            S/ {Number(salesService.saleTotal(msg.completed)).toFixed(2)}
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={() => setReceiptModalData({ status: 'ready', sale: msg.completed })}
                          className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 active:scale-95 text-white text-xs font-bold shadow-md transition-all cursor-pointer"
                        >
                          <ReceiptIcon size={14} className="text-amber-400" />
                          <span>Ver boleta al medio (WhatsApp / PDF)</span>
                          <ExternalLink size={13} className="text-slate-400" />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Opciones interactivas de respuesta (chips) */}
                  {!isUser && idx === messages.length - 1 && msg.options && msg.options.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5 animate-fade-in w-full max-w-[96%] max-h-52 overflow-y-auto pr-1">
                      {msg.options.map((opt, optIdx) => (
                        <button
                          key={optIdx}
                          type="button"
                          disabled={loading}
                          onClick={() => handleSend(opt)}
                          className="text-left bg-white hover:bg-brand hover:text-white text-slate-700 font-medium px-2.5 py-1.5 rounded-xl text-[11px] border border-slate-200/90 shadow-2xs hover:border-brand transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
                        >
                          {opt}
                        </button>
                      ))}
                    </div>
                  )}

                  {isLimitReached && (
                    <button
                      type="button"
                      onClick={() => {
                        setOpen(false)
                        navigate('/planes')
                      }}
                      className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-[11px] font-bold shadow-md shadow-blue-500/20 transition-all cursor-pointer animate-fade-in"
                    >
                      <Sparkles size={12} className="text-amber-300" />
                      <span>Ver planes</span>
                      <ArrowRight size={12} />
                    </button>
                  )}
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
            {loading && generatingReceipt && (
              <div className="flex justify-start animate-fade-in">
                <div className="bg-white border border-brand/30 px-4 py-3 rounded-2xl rounded-tl-xs shadow-xs flex items-center gap-3">
                  <span className="w-6 h-6 rounded-full border-[3px] border-slate-200 border-t-brand animate-spin shrink-0" />
                  <div className="leading-tight">
                    <p className="text-xs font-bold text-slate-800">Generando boleta…</p>
                    <p className="text-[10px] text-slate-500">Registrando venta y descontando stock</p>
                  </div>
                </div>
              </div>
            )}
            {loading && !generatingReceipt && (
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
          {voiceError && (
            <div className="px-3 py-1.5 bg-rose-50 text-rose-600 text-[11px] border-t border-rose-100 shrink-0">{voiceError}</div>
          )}
          <form
            onSubmit={handleSubmit}
            className="p-2.5 bg-white border-t border-slate-100 flex items-center gap-2 shrink-0"
          >
            <input
              ref={inputRef}
              type="text"
              className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-brand focus:bg-white transition-colors"
              placeholder={listening ? 'Escuchando… habla ahora 🎙️' : 'Escribe o usa el micrófono…'}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={loading}
            />
            {voiceSupported && (
              <button
                type="button"
                onClick={toggleVoice}
                disabled={loading}
                className={`relative p-2.5 rounded-xl active:scale-95 transition-all shrink-0 disabled:opacity-40 disabled:cursor-not-allowed ${listening
                    ? 'bg-rose-500 text-white shadow-md shadow-rose-500/40'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                title={listening ? 'Detener micrófono' : 'Hablar con el asistente'}
                aria-label={listening ? 'Detener micrófono' : 'Hablar con el asistente'}
              >
                {listening && <span className="absolute inset-0 rounded-xl bg-rose-400 animate-ping opacity-60" />}
                {listening ? <MicOff size={14} className="relative" /> : <Mic size={14} />}
              </button>
            )}
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
