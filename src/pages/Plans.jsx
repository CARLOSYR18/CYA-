import { useState, useEffect } from 'react'
import {
  Check,
  X as CloseIcon,
  Sparkles,
  Zap,
  Crown,
  ShieldCheck,
  Headphones,
  RefreshCw,
  Server,
  HelpCircle,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  MessageSquare,
  CreditCard,
} from 'lucide-react'
import AppLayout from '../components/layout/AppLayout'
import { companySettingsService } from '../services/companySettingsService'
import { planRequestsService } from '../services/planRequestsService'
import { PLAN_PRICING, getEffectivePlan } from '../lib/planLimits'

export default function Plans() {
  const [billingMode, setBillingMode] = useState('todos') // 'todos' | 'mensual' | 'trimestral' | 'semestral' | 'anual'
  const [company, setCompany] = useState(null)
  const [loadingCompany, setLoadingCompany] = useState(true)
  const [submittingPeriod, setSubmittingPeriod] = useState(null)
  const [confirmationModal, setConfirmationModal] = useState(null)
  const [toastMessage, setToastMessage] = useState(null)

  useEffect(() => {
    loadCompany()
  }, [])

  async function loadCompany() {
    setLoadingCompany(true)
    try {
      const data = await companySettingsService.get()
      setCompany(data)
    } catch (err) {
      console.error('Error cargando empresa:', err)
    } finally {
      setLoadingCompany(false)
    }
  }

  function showToast(msg) {
    setToastMessage(msg)
    setTimeout(() => setToastMessage(null), 4000)
  }

  const effectivePlan = getEffectivePlan(company)
  const isPro = effectivePlan === 'pro'

  // Datos dinámicos de los planes basados en PLAN_PRICING
  const plansData = {
    free: {
      id: 'free',
      periodKey: 'free',
      name: 'Plan Free',
      tagline: 'Ideal para emprendedores y pequeños negocios que recién comienzan.',
      price: 0,
      pricePeriod: 'Gratis para siempre',
      priceEquiv: 'Sin costo mensual',
      billingCycle: 'Acceso básico continuo',
      features: [
        { text: 'Hasta 20 productos en inventario', included: true, highlight: true },
        { text: '1 usuario con acceso al sistema', included: true },
        { text: 'Asistente IA limitado (5 preguntas/día)', included: true, highlight: true },
        { text: 'Registro básico de ventas y compras', included: true },
        { text: 'Historial de movimientos de stock', included: true },
        { text: 'Panel de control con métricas del día', included: true },
        { text: 'Boletas con logotipo de empresa', included: false },
        { text: 'Asistente IA Ilimitado 24/7', included: false },
        { text: 'Exportaciones masivas a Excel y PDF', included: false },
        { text: 'Atención y soporte prioritario 24/7', included: false },
      ],
    },
    mensual: {
      id: 'pro_mensual',
      periodKey: 'mensual',
      name: `Pro ${PLAN_PRICING.mensual?.label || 'Mensual'}`,
      tagline: 'Acceso total a todas las funciones del ERP mes a mes sin ataduras.',
      price: PLAN_PRICING.mensual?.price || 30,
      months: PLAN_PRICING.mensual?.months || 1,
      pricePeriod: `S/ ${PLAN_PRICING.mensual?.price || 30} al mes`,
      priceEquiv: 'Facturación mensual estándar',
      billingCycle: `Facturación cada mes (${PLAN_PRICING.mensual?.months || 1} mes)`,
      badge: 'Flexible',
      features: [
        { text: 'Productos y categorías ilimitados', included: true, highlight: true },
        { text: 'Múltiples usuarios y roles', included: true, highlight: true },
        { text: 'Asistente IA Ilimitado 24/7', included: true, highlight: true },
        { text: 'Emisión de boletas con logo propio', included: true },
        { text: 'Historial de movimientos ilimitado', included: true },
        { text: 'Envío de comprobantes por WhatsApp', included: true },
        { text: 'Exportación completa a Excel', included: true },
        { text: 'Atención técnica 24 horas', included: true, highlight: true },
        { text: 'Actualizaciones continuas incluidas', included: true },
        { text: 'Copias de seguridad en la nube', included: true },
      ],
    },
    trimestral: {
      id: 'pro_trimestral',
      periodKey: 'trimestral',
      name: `Pro ${PLAN_PRICING.trimestral.label}`,
      tagline: 'Control total para negocios en crecimiento con ahorro garantizado.',
      price: PLAN_PRICING.trimestral.price,
      months: PLAN_PRICING.trimestral.months,
      pricePeriod: `S/ ${PLAN_PRICING.trimestral.price} cada ${PLAN_PRICING.trimestral.months} meses`,
      priceEquiv: `S/ ${(PLAN_PRICING.trimestral.price / PLAN_PRICING.trimestral.months).toFixed(0)}/mes (Ahorra 33%)`,
      billingCycle: `Facturación trimestral (${PLAN_PRICING.trimestral.months} meses)`,
      badge: 'Más Popular',
      highlightDiscount: 'AHORRA 33% VS MENSUAL',
      features: [
        { text: 'Productos y categorías ilimitados', included: true, highlight: true },
        { text: 'Múltiples usuarios y roles', included: true, highlight: true },
        { text: 'Asistente IA Ilimitado 24/7', included: true, highlight: true },
        { text: 'Emisión de boletas con logo propio', included: true },
        { text: 'Historial de movimientos ilimitado', included: true },
        { text: 'Envío de comprobantes por WhatsApp', included: true },
        { text: 'Exportación completa a Excel', included: true },
        { text: 'Atención técnica 24 horas', included: true, highlight: true },
        { text: 'Actualizaciones continuas incluidas', included: true },
        { text: 'Copias de seguridad en la nube', included: true },
      ],
    },
    semestral: {
      id: 'pro_semestral',
      periodKey: 'semestral',
      name: `Pro ${PLAN_PRICING.semestral.label}`,
      tagline: 'Estabilidad y tranquilidad operativa por medio año completo.',
      price: PLAN_PRICING.semestral.price,
      months: PLAN_PRICING.semestral.months,
      pricePeriod: `S/ ${PLAN_PRICING.semestral.price} cada ${PLAN_PRICING.semestral.months} meses`,
      priceEquiv: `S/ ${(PLAN_PRICING.semestral.price / PLAN_PRICING.semestral.months).toFixed(0)}/mes (Ahorra S/ 60)`,
      billingCycle: `Facturación semestral (${PLAN_PRICING.semestral.months} meses)`,
      badge: 'Recomendado',
      highlightDiscount: 'AHORRA S/ 60 AL SEMESTRE',
      features: [
        { text: 'Todo lo incluido en Pro Trimestral', included: true, highlight: true },
        { text: 'Productos y usuarios ilimitados', included: true },
        { text: 'Asistente IA Ilimitado ultrarrápido', included: true, highlight: true },
        { text: 'Soporte prioritario 24/7 WhatsApp', included: true, highlight: true },
        { text: 'Sesión de capacitación de personal', included: true },
        { text: 'Mantenimiento preventivo de BD', included: true },
        { text: 'Actualizaciones y novedades continuas', included: true },
        { text: 'Copias de seguridad diarias', included: true },
      ],
    },
    anual: {
      id: 'pro_anual',
      periodKey: 'anual',
      name: `Pro ${PLAN_PRICING.anual.label}`,
      tagline: 'La inversión más rentable: costo mensual más bajo y máxima atención VIP.',
      price: PLAN_PRICING.anual.price,
      months: PLAN_PRICING.anual.months,
      pricePeriod: `S/ ${PLAN_PRICING.anual.price} al año`,
      priceEquiv: `S/ ${(PLAN_PRICING.anual.price / PLAN_PRICING.anual.months).toFixed(2)}/mes (Ahorra S/ 130)`,
      billingCycle: `Facturación anual única (${PLAN_PRICING.anual.months} meses)`,
      badge: 'Mejor Valor • Máximo Ahorro',
      highlightDiscount: 'AHORRA S/ 130 VS MENSUAL',
      features: [
        { text: 'Todo lo incluido en Pro Semestral', included: true, highlight: true },
        { text: `Solo S/ ${PLAN_PRICING.anual.price} al año completo`, included: true, highlight: true },
        { text: 'Asistente IA Ilimitado sin límites', included: true, highlight: true },
        { text: 'Soporte dedicado 24 horas exclusivo', included: true, highlight: true },
        { text: 'Migración gratis desde Excel', included: true },
        { text: 'Monitoreo de servidor en tiempo real', included: true },
        { text: 'Actualizaciones de por vida', included: true },
        { text: 'Alta disponibilidad 99.9% uptime', included: true },
      ],
    },
  }

  // Filtrado según selector
  let displayedPlans = []
  if (billingMode === 'mensual') {
    displayedPlans = [plansData.free, plansData.mensual]
  } else if (billingMode === 'trimestral') {
    displayedPlans = [plansData.free, plansData.trimestral]
  } else if (billingMode === 'semestral') {
    displayedPlans = [plansData.free, plansData.semestral]
  } else if (billingMode === 'anual') {
    displayedPlans = [plansData.free, plansData.anual]
  } else {
    // 'todos': muestra solo los 4 planes Pro (sin Free) para mantener el formato y tamaño ideal de 4 columnas
    displayedPlans = [
      plansData.mensual,
      plansData.trimestral,
      plansData.semestral,
      plansData.anual,
    ]
  }

  // Manejador de solicitud de suscripción
  async function handleSubscribe(plan) {
    if (isPro) {
      showToast('Ya cuentas con el Plan Pro activo.')
      return
    }

    const period = plan.periodKey
    const pricing = PLAN_PRICING[period]
    if (!pricing) return

    setSubmittingPeriod(period)
    try {
      await planRequestsService.create({
        plan_period: period,
        price: pricing.price,
        status: 'pendiente',
      })

      setConfirmationModal({
        period,
        label: pricing.label,
        months: pricing.months,
        price: pricing.price,
      })
    } catch (err) {
      console.error('Error creando solicitud de plan:', err)
      showToast('No se pudo enviar la solicitud. Por favor intenta de nuevo.')
    } finally {
      setSubmittingPeriod(null)
    }
  }

  const companyPhone = company?.phone || '+51987654321'
  const cleanPhone = companyPhone.replace(/\D/g, '')

  return (
    <AppLayout title="Planes y Suscripción">
      <div className="max-w-7xl mx-auto space-y-10 pb-16 px-2 sm:px-4">

        {/* ─── Toast Notification ─── */}
        {toastMessage && (
          <div className="fixed top-6 right-6 z-50 flex items-center gap-3 bg-slate-900 text-white px-4 py-3 rounded-2xl shadow-2xl border border-slate-700 animate-bounce">
            <CheckCircle2 size={18} className="text-emerald-400 shrink-0" />
            <span className="text-xs font-semibold">{toastMessage}</span>
          </div>
        )}

        {/* ─── Hero Header ─── */}
        <div className="text-center max-w-3xl mx-auto pt-4 space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-bold uppercase tracking-wider shadow-2xs">
            <Sparkles size={13} className="text-amber-500 animate-pulse" />
            <span>Planes para Cada Etapa de tu Empresa</span>
          </div>

          <h1 className="font-display font-extrabold text-3xl sm:text-4xl text-slate-900 tracking-tight leading-tight">
            Potencia tu negocio con el plan que necesitas
          </h1>

          <p className="text-slate-600 text-sm sm:text-base leading-relaxed">
            Comienza gratis con lo esencial o desbloquea el <strong className="text-slate-800">Plan Pro</strong> con Asistente IA ilimitado, atención técnica 24 horas, actualizaciones continuas y mantenimiento garantizado.
          </p>

          {/* ─── Pill Selector (ChatGPT style: Todos / Mensual / Trimestral / Semestral / Anual) ─── */}
          <div className="pt-5 flex flex-col items-center gap-2">
            <div className="relative inline-flex flex-wrap items-center justify-center p-1 rounded-full bg-slate-900 shadow-xl border border-slate-800 gap-1">
              {/* Ver Todos */}
              <button
                type="button"
                onClick={() => setBillingMode('todos')}
                className={`relative z-10 px-3.5 sm:px-4 py-2 rounded-full text-xs sm:text-sm font-bold transition-all duration-200 cursor-pointer ${
                  billingMode === 'todos'
                    ? 'bg-[#2E3646] text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Ver todos
              </button>

              {/* Mensual */}
              <button
                type="button"
                onClick={() => setBillingMode('mensual')}
                className={`relative z-10 px-3.5 sm:px-4 py-2 rounded-full text-xs sm:text-sm font-bold transition-all duration-200 cursor-pointer ${
                  billingMode === 'mensual'
                    ? 'bg-[#2E3646] text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Mensual (S/ {PLAN_PRICING.mensual?.price || 30})
              </button>

              {/* Trimestral */}
              <button
                type="button"
                onClick={() => setBillingMode('trimestral')}
                className={`relative z-10 px-3.5 sm:px-4 py-2 rounded-full text-xs sm:text-sm font-bold transition-all duration-200 cursor-pointer ${
                  billingMode === 'trimestral'
                    ? 'bg-[#2E3646] text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Trimestral (S/ {PLAN_PRICING.trimestral.price})
              </button>

              {/* Semestral */}
              <button
                type="button"
                onClick={() => setBillingMode('semestral')}
                className={`relative z-10 px-3.5 sm:px-4 py-2 rounded-full text-xs sm:text-sm font-bold transition-all duration-200 cursor-pointer ${
                  billingMode === 'semestral'
                    ? 'bg-[#2E3646] text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Semestral (S/ {PLAN_PRICING.semestral.price})
              </button>

              {/* Anual */}
              <button
                type="button"
                onClick={() => setBillingMode('anual')}
                className={`relative z-10 px-3.5 sm:px-4 py-2 rounded-full text-xs sm:text-sm font-bold transition-all duration-200 flex items-center gap-1.5 cursor-pointer ${
                  billingMode === 'anual'
                    ? 'bg-[#2E3646] text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <span>Anual (S/ {PLAN_PRICING.anual.price})</span>
                <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-extrabold px-1.5 py-0.5 rounded-full uppercase tracking-wider animate-pulse">
                  Ahorro 🔥
                </span>
              </button>
            </div>

            <p className="text-xs text-slate-500">
              {billingMode === 'todos' && 'Visualizando todos los planes en cuadrícula comparativa unificada'}
              {billingMode === 'mensual' && `Visualizando Plan Mensual (S/ ${PLAN_PRICING.mensual?.price || 30} al mes sin compromisos)`}
              {billingMode === 'trimestral' && `Visualizando Plan Trimestral (S/ ${PLAN_PRICING.trimestral.price} por ${PLAN_PRICING.trimestral.months} meses • S/ 20/mes • ¡Ahorras 33%!)`}
              {billingMode === 'semestral' && `Visualizando Plan Semestral (S/ ${PLAN_PRICING.semestral.price} por ${PLAN_PRICING.semestral.months} meses • S/ 20/mes • ¡Ahorras S/ 60!)`}
              {billingMode === 'anual' && `Visualizando Plan Anual (S/ ${PLAN_PRICING.anual.price} por ${PLAN_PRICING.anual.months} meses • S/ 19.16/mes • ¡Ahorras S/ 130!)`}
            </p>
          </div>
        </div>

        {/* ─── Indicador de Plan Actual ─── */}
        <div className="flex items-center justify-center">
          <div
            className={`inline-flex items-center gap-2.5 px-5 py-2.5 rounded-2xl border text-xs sm:text-sm font-semibold shadow-xs transition-all ${
              isPro
                ? 'bg-emerald-50 border-emerald-300 text-emerald-900 ring-4 ring-emerald-500/10'
                : 'bg-slate-100 border-slate-200 text-slate-700'
            }`}
          >
            {isPro ? (
              <>
                <Crown size={18} className="text-emerald-600 shrink-0 fill-emerald-600" />
                <span>
                  Tu plan actual: <strong className="font-bold text-emerald-950">Pro</strong>
                  {company?.plan_expires_at && (
                    <span className="font-normal text-emerald-800 ml-1">
                      (vence el{' '}
                      {new Date(company.plan_expires_at).toLocaleDateString('es-PE', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      })}
                      )
                    </span>
                  )}
                </span>
              </>
            ) : (
              <>
                <Sparkles size={18} className="text-slate-500 shrink-0" />
                <span>
                  Tu plan actual: <strong className="font-bold text-slate-900">Free</strong>
                </span>
              </>
            )}
          </div>
        </div>

        {/* ─── Pricing Cards Grid Unificado ─── */}
        <div
          className={`grid gap-6 items-stretch transition-all duration-300 w-full pt-4 ${
            displayedPlans.length === 2
              ? 'grid-cols-1 md:grid-cols-2 max-w-3xl mx-auto'
              : displayedPlans.length === 3
              ? 'grid-cols-1 md:grid-cols-3 max-w-5xl mx-auto'
              : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4'
          }`}
        >
          {displayedPlans.map((plan) => {
            const isPlanFree = plan.id === 'free'
            const isPlanAnual = plan.periodKey === 'anual'
            const isPlanTrimestral = plan.periodKey === 'trimestral'
            const isPlanSemestral = plan.periodKey === 'semestral'
            const isPlanMensual = plan.periodKey === 'mensual'
            const isSubmitting = submittingPeriod === plan.periodKey

            // Estado del botón según el plan actual
            const isButtonActive = isPlanFree ? !isPro : isPro

            return (
              <div
                key={plan.id}
                className={`relative flex flex-col rounded-3xl bg-white transition-all duration-200 h-full ${
                  isPlanAnual
                    ? 'border-2 border-blue-600 shadow-[0_20px_45px_-10px_rgba(27,79,216,0.25)] ring-4 ring-blue-500/10'
                    : isButtonActive
                    ? 'border-2 border-emerald-500 shadow-lg'
                    : 'border border-slate-200 shadow-sm hover:shadow-md'
                }`}
              >
                {/* Top Badge */}
                {isPlanAnual ? (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-[10.5px] font-extrabold uppercase tracking-widest px-3 py-1 rounded-full shadow-md flex items-center gap-1.5 whitespace-nowrap z-10">
                    <Crown size={11} className="text-amber-300 fill-amber-300" />
                    <span>Ahorro Máximo</span>
                  </div>
                ) : isPlanTrimestral ? (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[10px] font-extrabold uppercase tracking-widest px-3 py-0.5 rounded-full shadow-md flex items-center gap-1 whitespace-nowrap z-10">
                    <Zap size={11} className="text-amber-400 fill-amber-400" />
                    <span>Más Popular</span>
                  </div>
                ) : isPlanSemestral ? (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-indigo-900 text-white text-[10px] font-extrabold uppercase tracking-widest px-3 py-0.5 rounded-full shadow-md flex items-center gap-1 whitespace-nowrap z-10">
                    <Sparkles size={11} className="text-blue-300" />
                    <span>Recomendado</span>
                  </div>
                ) : isPlanMensual ? (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[10px] font-extrabold uppercase tracking-widest px-3 py-0.5 rounded-full shadow-md flex items-center gap-1 whitespace-nowrap z-10">
                    <span>Flexible</span>
                  </div>
                ) : isButtonActive ? (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-emerald-600 text-white text-[10px] font-extrabold uppercase tracking-widest px-2.5 py-0.5 rounded-full shadow-md flex items-center gap-1 whitespace-nowrap z-10">
                    <Check size={11} strokeWidth={3} />
                    <span>Tu Plan</span>
                  </div>
                ) : null}

                {/* Card Header & Pricing */}
                <div className="p-5 border-b border-slate-100 flex flex-col pt-6">
                  <div className="flex items-start justify-between gap-1.5 min-h-[42px]">
                    <h2 className="font-display font-bold text-base text-slate-900 leading-tight">
                      {plan.name}
                    </h2>
                    {!isPlanFree ? (
                      <span className="p-1 rounded-lg bg-blue-50 text-blue-600 border border-blue-100 shrink-0">
                        <Sparkles size={14} />
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider bg-slate-100 px-1.5 py-0.5 rounded shrink-0">
                        Básico
                      </span>
                    )}
                  </div>

                  <p className="text-[11.5px] text-slate-500 mt-1 min-h-[38px] leading-relaxed">
                    {plan.tagline}
                  </p>

                  {/* Pricing Display */}
                  <div className="mt-3 pt-3 border-t border-slate-100">
                    <div className="flex items-baseline gap-1">
                      <span className="font-display text-3xl font-black text-slate-900 tracking-tight">
                        {plan.price === 0 ? 'S/ 0' : `S/ ${plan.price}`}
                      </span>
                      <span className="text-xs font-semibold text-slate-500">
                        {plan.price === 0
                          ? 'gratis'
                          : isPlanMensual
                          ? '/mes'
                          : isPlanTrimestral
                          ? `/${plan.months}m`
                          : isPlanSemestral
                          ? `/${plan.months}m`
                          : '/año'}
                      </span>
                    </div>

                    <div className="mt-1 min-h-[22px] flex items-center">
                      <span className="text-[10.5px] font-medium text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md leading-tight">
                        {plan.priceEquiv}
                      </span>
                    </div>

                    <div className="min-h-[20px] mt-1 flex items-center">
                      {plan.highlightDiscount ? (
                        <span className="text-[9.5px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded-md leading-tight">
                          🎁 {plan.highlightDiscount}
                        </span>
                      ) : null}
                    </div>
                  </div>
                </div>

                {/* Features List & CTA Button (Pushed to bottom) */}
                <div className="p-5 bg-slate-50/40 rounded-b-3xl flex-1 flex flex-col justify-between space-y-5">
                  <div className="space-y-2">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      Incluye:
                    </p>

                    <ul className="space-y-2 text-xs text-slate-700">
                      {plan.features.map((feat, idx) => (
                        <li
                          key={idx}
                          className={`flex items-start gap-2 ${
                            !feat.included ? 'text-slate-400 line-through opacity-70' : ''
                          }`}
                        >
                          {feat.included ? (
                            <div
                              className={`w-3.5 h-3.5 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                                feat.highlight
                                  ? 'bg-blue-600 text-white'
                                  : 'bg-emerald-100 text-emerald-700'
                              }`}
                            >
                              <Check size={9} strokeWidth={3} />
                            </div>
                          ) : (
                            <div className="w-3.5 h-3.5 rounded-full bg-slate-200 text-slate-500 flex items-center justify-center shrink-0 mt-0.5">
                              <CloseIcon size={9} strokeWidth={2.5} />
                            </div>
                          )}
                          <span
                            className={`text-[11px] leading-snug ${
                              feat.highlight ? 'font-semibold text-slate-900' : ''
                            }`}
                          >
                            {feat.text}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* CTA Button siempre al fondo */}
                  <div className="pt-3 border-t border-slate-200/60 mt-auto">
                    {isPlanFree ? (
                      !isPro ? (
                        <button
                          type="button"
                          disabled
                          className="w-full py-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-default"
                        >
                          <CheckCircle2 size={15} />
                          Plan Activo
                        </button>
                      ) : (
                        <button
                          type="button"
                          disabled
                          className="w-full py-2.5 rounded-xl bg-slate-100 text-slate-400 font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-default"
                        >
                          Plan Básico
                        </button>
                      )
                    ) : isPro ? (
                      <button
                        type="button"
                        disabled
                        className="w-full py-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-not-allowed opacity-90"
                      >
                        <CheckCircle2 size={15} />
                        Plan activo
                      </button>
                    ) : (
                      <button
                        type="button"
                        disabled={isSubmitting}
                        onClick={() => handleSubscribe(plan)}
                        className={`w-full py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all duration-150 flex items-center justify-center gap-1.5 cursor-pointer shadow-sm ${
                          isPlanAnual
                            ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-600/30 hover:shadow-md'
                            : 'bg-slate-900 hover:bg-slate-800 text-white'
                        } ${isSubmitting ? 'opacity-60 cursor-wait' : ''}`}
                      >
                        {isSubmitting ? (
                          <span>Enviando…</span>
                        ) : (
                          <>
                            <span>Suscribirme</span>
                            <ArrowRight size={13} />
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* ─── Highlights & Guarantees Section ─── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-4">
          <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <Headphones size={20} />
            </div>
            <div>
              <h3 className="font-bold text-xs text-slate-900">Atención Técnica 24 Horas</h3>
              <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                Canal prioritario vía WhatsApp para resolver dudas y emergencias operativas.
              </p>
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
              <RefreshCw size={20} />
            </div>
            <div>
              <h3 className="font-bold text-xs text-slate-900">Actualizaciones Continuas</h3>
              <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                Nuevas funciones, mejoras de rendimiento y parches de seguridad incluidos.
              </p>
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <Server size={20} />
            </div>
            <div>
              <h3 className="font-bold text-xs text-slate-900">Mantenimiento y Respaldo</h3>
              <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                Copias de seguridad diarias en la nube y mantenimiento preventivo continuo.
              </p>
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
              <Sparkles size={20} />
            </div>
            <div>
              <h3 className="font-bold text-xs text-slate-900">Asistente IA Ilimitado</h3>
              <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                Pregunta sobre tus ventas, stock bajo, clientes frecuentes y finanzas al instante.
              </p>
            </div>
          </div>
        </div>

        {/* ─── FAQ Section ─── */}
        <div className="rounded-3xl bg-white border border-slate-200 p-6 sm:p-9 shadow-sm">
          <div className="text-center max-w-xl mx-auto mb-8">
            <div className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 uppercase tracking-wider mb-2">
              <HelpCircle size={14} />
              <span>Preguntas Frecuentes</span>
            </div>
            <h2 className="font-display font-bold text-xl sm:text-2xl text-slate-900">
              ¿Tienes dudas sobre los planes?
            </h2>
            <p className="text-xs text-slate-500 mt-1.5">
              Aquí respondemos las dudas más comunes sobre la suscripción de CYA STORE.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs leading-relaxed">
            <div className="space-y-1.5 p-4 rounded-xl bg-slate-50 border border-slate-100">
              <h4 className="font-bold text-slate-900 text-sm">
                ¿Qué límites tiene el Plan Free (Gratuito)?
              </h4>
              <p className="text-slate-600">
                El Plan Free te permite registrar hasta 20 productos, 1 solo usuario y realizar hasta 5 consultas por día al Asistente IA. Actualiza a Pro para disfrutar de inventario y preguntas ilimitadas.
              </p>
            </div>

            <div className="space-y-1.5 p-4 rounded-xl bg-slate-50 border border-slate-100">
              <h4 className="font-bold text-slate-900 text-sm">
                ¿Cómo se activan los pagos?
              </h4>
              <p className="text-slate-600">
                Al hacer clic en "Suscribirme", se registrará tu solicitud. Puedes enviarnos tu comprobante de Yape o transferencia bancaria y activaremos tu plan Pro en pocos minutos.
              </p>
            </div>

            <div className="space-y-1.5 p-4 rounded-xl bg-slate-50 border border-slate-100">
              <h4 className="font-bold text-slate-900 text-sm">
                ¿En qué consiste el Asistente IA del Plan Pro?
              </h4>
              <p className="text-slate-600">
                En el Plan Pro, el Asistente Virtual no tiene límites diarios. Puede auditar tu inventario, decirte cuáles productos están por agotarse, reportarte las ventas del día y darte recomendaciones estratégicas 24/7.
              </p>
            </div>

            <div className="space-y-1.5 p-4 rounded-xl bg-slate-50 border border-slate-100">
              <h4 className="font-bold text-slate-900 text-sm">
                ¿Por qué elegir el Plan Anual (S/ {PLAN_PRICING.anual.price})?
              </h4>
              <p className="text-slate-600">
                El Plan Anual te ofrece el costo mensual más bajo (S/ {(PLAN_PRICING.anual.price / 12).toFixed(2)}/mes), ahorrando frente al pago mensual, trimestral o semestral, e incluye soporte dedicado 24 horas y asistencia en la migración de tu catálogo.
              </p>
            </div>
          </div>
        </div>

      </div>

      {/* ─── Modal de Confirmación de Solicitud de Plan ─── */}
      {confirmationModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
          <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden animate-scale-up">
            {/* Header */}
            <div className="p-6 bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 text-white relative">
              <button
                type="button"
                onClick={() => setConfirmationModal(null)}
                className="absolute top-4 right-4 p-1 rounded-lg text-emerald-100 hover:text-white hover:bg-white/10 transition cursor-pointer"
              >
                <CloseIcon size={18} />
              </button>
              <div className="inline-flex items-center gap-1.5 bg-white/20 text-white text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider mb-2">
                <CheckCircle2 size={12} />
                <span>Solicitud Registrada</span>
              </div>
              <h3 className="font-display font-bold text-xl">
                ¡Solicitud registrada con éxito!
              </h3>
              <p className="text-xs text-emerald-100 mt-1">
                Plan Pro {confirmationModal.label} ({confirmationModal.months} mes{confirmationModal.months > 1 ? 'es' : ''}) • S/ {confirmationModal.price}.00
              </p>
            </div>

            {/* Content */}
            <div className="p-6 space-y-4 text-xs text-slate-700">
              <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 font-semibold leading-relaxed text-center sm:text-left">
                Solicitud enviada. Escríbenos por WhatsApp/Yape para confirmar tu pago y activaremos tu plan Pro en minutos.
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2.5">
                <p className="font-bold text-slate-800 text-[11px] uppercase tracking-wider">
                  Canales de pago disponibles:
                </p>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2.5 bg-white rounded-xl border border-slate-200">
                    <span className="font-bold text-purple-700 block">Yape / Plin</span>
                    <span className="font-mono font-bold text-slate-900 text-sm">987 654 321</span>
                  </div>
                  <div className="p-2.5 bg-white rounded-xl border border-slate-200">
                    <span className="font-bold text-blue-700 block">BCP Soles</span>
                    <span className="font-mono text-[11px] text-slate-900">191-98765432-0-11</span>
                  </div>
                </div>
                <p className="text-[11px] text-slate-500">
                  Titular: CYA STORE • Adjunta tu captura de pantalla tras realizar el abono.
                </p>
              </div>

              <div className="space-y-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    const text = encodeURIComponent(
                      `¡Hola CYA STORE! Acabo de enviar mi solicitud para el Plan Pro ${confirmationModal.label} (S/ ${confirmationModal.price}) para mi empresa "${company?.name || 'CYA'}". Adjunto el comprobante para la activación de mi plan.`
                    )
                    window.open(`https://wa.me/${cleanPhone || '51987654321'}?text=${text}`, '_blank')
                  }}
                  className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-md shadow-emerald-600/20 cursor-pointer transition"
                >
                  <MessageSquare size={16} />
                  Confirmar pago por WhatsApp
                </button>

                <button
                  type="button"
                  onClick={() => setConfirmationModal(null)}
                  className="w-full py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-semibold cursor-pointer transition"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  )
}
