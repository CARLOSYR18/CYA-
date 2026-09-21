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
  const [billingMode, setBillingMode] = useState('trimestral') // 'trimestral' | 'semestral' | 'anual' | 'todos'
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
      tagline: 'Ideal para emprendedores y pequeños negocios que recién comienzan a digitalizarse.',
      price: 0,
      pricePeriod: 'Gratis para siempre',
      priceEquiv: 'Sin costo mensual',
      billingCycle: 'Acceso básico continuo',
      features: [
        { text: 'Hasta 20 productos en inventario', included: true, highlight: true },
        { text: '1 usuario con acceso al sistema', included: true },
        { text: 'Asistente IA limitado (5 preguntas por día)', included: true, highlight: true },
        { text: 'Registro básico de ventas y compras', included: true },
        { text: 'Historial de movimientos de stock', included: true },
        { text: 'Panel de control con métricas del día', included: true },
        { text: 'Boletas con logotipo de empresa', included: false },
        { text: 'Asistente IA Ilimitado 24/7', included: false },
        { text: 'Exportaciones masivas a Excel y PDF', included: false },
        { text: 'Atención y soporte prioritario 24/7', included: false },
      ],
    },
    trimestral: {
      id: 'pro_trimestral',
      periodKey: 'trimestral',
      name: `Plan Pro ${PLAN_PRICING.trimestral.label}`,
      tagline: 'Todo el poder del ERP para negocios en crecimiento que necesitan control total sin límites.',
      price: PLAN_PRICING.trimestral.price,
      months: PLAN_PRICING.trimestral.months,
      pricePeriod: `S/ ${PLAN_PRICING.trimestral.price} cada ${PLAN_PRICING.trimestral.months} meses`,
      priceEquiv: `Equivale a S/ ${(PLAN_PRICING.trimestral.price / PLAN_PRICING.trimestral.months).toFixed(0)} al mes`,
      billingCycle: `Facturación trimestral (${PLAN_PRICING.trimestral.months} meses)`,
      badge: 'Más Popular',
      features: [
        { text: 'Productos y categorías ilimitados', included: true, highlight: true },
        { text: 'Múltiples usuarios y roles (Admin, Vendedores)', included: true, highlight: true },
        { text: 'Asistente IA Ilimitado 24/7 (Ventas, stock y finanzas)', included: true, highlight: true },
        { text: 'Emisión de boletas y recibos PDF con logo propio', included: true },
        { text: 'Historial histórico de movimientos sin límites de tiempo', included: true },
        { text: 'Envío directo de comprobantes por WhatsApp', included: true },
        { text: 'Exportación completa a Excel y reportes ejecutivos', included: true },
        { text: 'Atención y soporte técnico 24 horas', included: true, highlight: true },
        { text: 'Actualizaciones continuas del sistema garantizadas', included: true },
        { text: 'Mantenimiento preventivo y copias en la nube', included: true },
      ],
    },
    semestral: {
      id: 'pro_semestral',
      periodKey: 'semestral',
      name: `Plan Pro ${PLAN_PRICING.semestral.label}`,
      tagline: 'Estabilidad y tranquilidad operativa por medio año completo con todas las ventajas Pro.',
      price: PLAN_PRICING.semestral.price,
      months: PLAN_PRICING.semestral.months,
      pricePeriod: `S/ ${PLAN_PRICING.semestral.price} cada ${PLAN_PRICING.semestral.months} meses`,
      priceEquiv: `Equivale a S/ ${(PLAN_PRICING.semestral.price / PLAN_PRICING.semestral.months).toFixed(0)} al mes`,
      billingCycle: `Facturación semestral (${PLAN_PRICING.semestral.months} meses)`,
      badge: 'Recomendado',
      features: [
        { text: 'Todo lo incluido en el Plan Pro Trimestral', included: true, highlight: true },
        { text: 'Productos y usuarios ilimitados', included: true },
        { text: 'Asistente IA Ilimitado con máxima velocidad', included: true, highlight: true },
        { text: 'Atención y soporte prioritario 24/7 vía WhatsApp', included: true, highlight: true },
        { text: 'Sesión de capacitación e inducción para tu personal', included: true },
        { text: 'Mantenimiento preventivo y optimización de base de datos', included: true },
        { text: 'Actualizaciones continuas y acceso prioritario', included: true },
        { text: 'Copias de seguridad diarias automatizadas', included: true },
      ],
    },
    anual: {
      id: 'pro_anual',
      periodKey: 'anual',
      name: `Plan Pro ${PLAN_PRICING.anual.label}`,
      tagline: 'La inversión más rentable para empresas consolidadas. Máximo ahorro y atención VIP exclusiva.',
      price: PLAN_PRICING.anual.price,
      months: PLAN_PRICING.anual.months,
      pricePeriod: `S/ ${PLAN_PRICING.anual.price} al año`,
      priceEquiv: `Equivale a solo S/ ${(PLAN_PRICING.anual.price / PLAN_PRICING.anual.months).toFixed(2)} al mes`,
      billingCycle: `Facturación anual única (${PLAN_PRICING.anual.months} meses)`,
      badge: 'Mejor Valor • Máximo Ahorro',
      highlightDiscount: 'AHORRA S/ 10 + 1 MES GRATIS',
      features: [
        { text: 'Todo lo incluido en el Plan Semestral', included: true, highlight: true },
        { text: `Mayor ahorro garantizado (Solo S/ ${PLAN_PRICING.anual.price} al año completo)`, included: true, highlight: true },
        { text: 'Asistente IA Ilimitado 24/7 sin ninguna restricción', included: true, highlight: true },
        { text: 'Atención y soporte dedicado 24 horas con asesor exclusivo', included: true, highlight: true },
        { text: 'Migración e importación masiva de productos desde Excel gratis', included: true },
        { text: 'Mantenimiento continuo y monitoreo de servidor en tiempo real', included: true },
        { text: 'Actualizaciones de por vida durante todo el periodo anual', included: true },
        { text: 'Garantía de alta disponibilidad (99.9% uptime SLA)', included: true },
      ],
    },
  }

  // Filtrado según selector
  let displayedPlans = []
  if (billingMode === 'trimestral') {
    displayedPlans = [plansData.free, plansData.trimestral]
  } else if (billingMode === 'semestral') {
    displayedPlans = [plansData.free, plansData.semestral]
  } else if (billingMode === 'anual') {
    displayedPlans = [plansData.free, plansData.anual]
  } else {
    // 'todos'
    displayedPlans = [plansData.free, plansData.trimestral, plansData.semestral, plansData.anual]
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
      <div className="max-w-6xl mx-auto space-y-10 pb-16">

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

          {/* ─── Pill Selector (ChatGPT style: Trimestral / Semestral / Anual) ─── */}
          <div className="pt-5 flex flex-col items-center gap-2">
            <div className="relative inline-flex flex-wrap items-center justify-center p-1 rounded-full bg-slate-900 shadow-xl border border-slate-800 gap-1">
              {/* Trimestral */}
              <button
                type="button"
                onClick={() => setBillingMode('trimestral')}
                className={`relative z-10 px-4 sm:px-5 py-2 rounded-full text-xs sm:text-sm font-bold transition-all duration-200 cursor-pointer ${
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
                className={`relative z-10 px-4 sm:px-5 py-2 rounded-full text-xs sm:text-sm font-bold transition-all duration-200 cursor-pointer ${
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
                className={`relative z-10 px-4 sm:px-5 py-2 rounded-full text-xs sm:text-sm font-bold transition-all duration-200 flex items-center gap-1.5 cursor-pointer ${
                  billingMode === 'anual'
                    ? 'bg-[#2E3646] text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <span>Anual (S/ {PLAN_PRICING.anual.price})</span>
                <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider animate-pulse">
                  Ahorro 🔥
                </span>
              </button>

              {/* Ver Todos */}
              <button
                type="button"
                onClick={() => setBillingMode('todos')}
                className={`relative z-10 px-3 sm:px-4 py-2 rounded-full text-xs sm:text-sm font-bold transition-all duration-200 cursor-pointer ${
                  billingMode === 'todos'
                    ? 'bg-[#2E3646] text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Ver todos
              </button>
            </div>

            <p className="text-xs text-slate-500">
              {billingMode === 'trimestral' && `Visualizando Plan Trimestral (S/ ${PLAN_PRICING.trimestral.price} por ${PLAN_PRICING.trimestral.months} meses)`}
              {billingMode === 'semestral' && `Visualizando Plan Semestral (S/ ${PLAN_PRICING.semestral.price} por ${PLAN_PRICING.semestral.months} meses)`}
              {billingMode === 'anual' && `Visualizando Plan Anual (S/ ${PLAN_PRICING.anual.price} por ${PLAN_PRICING.anual.months} meses con máximo ahorro)`}
              {billingMode === 'todos' && 'Visualizando comparación completa de todas las opciones de suscripción'}
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

        {/* ─── Pricing Cards Grid ─── */}
        <div
          className={`grid gap-6 items-stretch transition-all duration-300 ${
            displayedPlans.length === 2
              ? 'grid-cols-1 md:grid-cols-2 max-w-3xl mx-auto'
              : displayedPlans.length === 3
              ? 'grid-cols-1 md:grid-cols-3'
              : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4'
          }`}
        >
          {displayedPlans.map((plan) => {
            const isPlanFree = plan.id === 'free'
            const isPlanAnual = plan.periodKey === 'anual'
            const isPlanTrimestral = plan.periodKey === 'trimestral'
            const isPlanSemestral = plan.periodKey === 'semestral'
            const isSubmitting = submittingPeriod === plan.periodKey

            // Estado del botón según el plan actual
            const isButtonActive = isPlanFree ? !isPro : isPro

            return (
              <div
                key={plan.id}
                className={`relative flex flex-col rounded-3xl bg-white transition-all duration-200 ${
                  isPlanAnual
                    ? 'border-2 border-blue-600 shadow-[0_20px_50px_-10px_rgba(27,79,216,0.25)] ring-4 ring-blue-500/10'
                    : isButtonActive
                    ? 'border-2 border-emerald-500 shadow-lg'
                    : 'border border-slate-200 shadow-sm hover:shadow-md'
                }`}
              >
                {/* Top Badge */}
                {isPlanAnual ? (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-[11px] font-extrabold uppercase tracking-widest px-4 py-1 rounded-full shadow-md flex items-center gap-1.5 whitespace-nowrap">
                    <Crown size={12} className="text-amber-300 fill-amber-300" />
                    <span>Mejor Valor • Máximo Ahorro</span>
                  </div>
                ) : isPlanTrimestral ? (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[10.5px] font-extrabold uppercase tracking-widest px-3.5 py-0.5 rounded-full shadow-md flex items-center gap-1 whitespace-nowrap">
                    <Zap size={12} className="text-amber-400 fill-amber-400" />
                    <span>Más Popular</span>
                  </div>
                ) : isPlanSemestral ? (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-indigo-900 text-white text-[10.5px] font-extrabold uppercase tracking-widest px-3.5 py-0.5 rounded-full shadow-md flex items-center gap-1 whitespace-nowrap">
                    <Sparkles size={12} className="text-blue-300" />
                    <span>Recomendado</span>
                  </div>
                ) : isButtonActive ? (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-emerald-600 text-white text-[10.5px] font-extrabold uppercase tracking-widest px-3 py-0.5 rounded-full shadow-md flex items-center gap-1 whitespace-nowrap">
                    <Check size={12} strokeWidth={3} />
                    <span>Tu Plan Actual</span>
                  </div>
                ) : null}

                {/* Card Header */}
                <div className="p-6 sm:p-7 border-b border-slate-100 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <h2 className="font-display font-bold text-xl text-slate-900">
                      {plan.name}
                    </h2>
                    {!isPlanFree ? (
                      <span className="p-1.5 rounded-xl bg-blue-50 text-blue-600 border border-blue-100">
                        <Sparkles size={16} />
                      </span>
                    ) : (
                      <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider bg-slate-100 px-2.5 py-1 rounded-lg">
                        Básico
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-slate-500 mt-2 min-h-[36px] leading-relaxed">
                    {plan.tagline}
                  </p>

                  {/* Pricing Display */}
                  <div className="mt-5 pt-4 border-t border-slate-100">
                    <div className="flex items-baseline gap-1.5">
                      <span className="font-display text-4xl sm:text-5xl font-black text-slate-900 tracking-tight">
                        {plan.price === 0 ? 'S/ 0' : `S/ ${plan.price}`}
                      </span>
                      <span className="text-xs font-semibold text-slate-500">
                        {plan.price === 0
                          ? 'gratis'
                          : isPlanTrimestral
                          ? `/${plan.months} meses`
                          : isPlanSemestral
                          ? `/${plan.months} meses`
                          : '/año'}
                      </span>
                    </div>

                    <div className="mt-2 flex items-center gap-2">
                      <span className="text-xs font-medium text-blue-700 bg-blue-50 px-2.5 py-1 rounded-md">
                        {plan.priceEquiv}
                      </span>
                    </div>

                    {plan.highlightDiscount && (
                      <div className="mt-2 text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md inline-block">
                        🎁 {plan.highlightDiscount}
                      </div>
                    )}
                  </div>

                  {/* CTA Button */}
                  <div className="mt-6">
                    {isPlanFree ? (
                      !isPro ? (
                        <button
                          type="button"
                          disabled
                          className="w-full py-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-default"
                        >
                          <CheckCircle2 size={16} />
                          Plan Activo
                        </button>
                      ) : (
                        <button
                          type="button"
                          disabled
                          className="w-full py-3 rounded-xl bg-slate-100 text-slate-400 font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-default"
                        >
                          Plan Básico Gratuito
                        </button>
                      )
                    ) : isPro ? (
                      /* Si el usuario ya está en Pro, cambia el botón de su plan actual a "Plan activo" (deshabilitado) */
                      <button
                        type="button"
                        disabled
                        className="w-full py-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-not-allowed opacity-90"
                      >
                        <CheckCircle2 size={16} />
                        Plan activo
                      </button>
                    ) : (
                      <button
                        type="button"
                        disabled={isSubmitting}
                        onClick={() => handleSubscribe(plan)}
                        className={`w-full py-3 rounded-xl font-bold text-xs uppercase tracking-wider transition-all duration-150 flex items-center justify-center gap-2 cursor-pointer shadow-sm ${
                          isPlanAnual
                            ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-600/30 hover:shadow-md'
                            : 'bg-slate-900 hover:bg-slate-800 text-white'
                        } ${isSubmitting ? 'opacity-60 cursor-wait' : ''}`}
                      >
                        {isSubmitting ? (
                          <span>Enviando solicitud...</span>
                        ) : (
                          <>
                            <span>Suscribirme</span>
                            <ArrowRight size={14} />
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>

                {/* Features List */}
                <div className="p-6 sm:p-7 bg-slate-50/50 rounded-b-3xl space-y-3">
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-3">
                    Incluye:
                  </p>

                  <ul className="space-y-2.5 text-xs text-slate-700">
                    {plan.features.map((feat, idx) => (
                      <li
                        key={idx}
                        className={`flex items-start gap-2.5 ${
                          !feat.included ? 'text-slate-400 line-through opacity-75' : ''
                        }`}
                      >
                        {feat.included ? (
                          <div
                            className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                              feat.highlight
                                ? 'bg-blue-600 text-white'
                                : 'bg-emerald-100 text-emerald-700'
                            }`}
                          >
                            <Check size={10} strokeWidth={3} />
                          </div>
                        ) : (
                          <div className="w-4 h-4 rounded-full bg-slate-200 text-slate-500 flex items-center justify-center shrink-0 mt-0.5">
                            <CloseIcon size={10} strokeWidth={2.5} />
                          </div>
                        )}
                        <span className={feat.highlight ? 'font-semibold text-slate-900' : ''}>
                          {feat.text}
                        </span>
                      </li>
                    ))}
                  </ul>
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
                El Plan Anual te ofrece el costo mensual más bajo (S/ {(PLAN_PRICING.anual.price / 12).toFixed(2)}/mes), ahorrando frente al pago trimestral o semestral, e incluye soporte dedicado 24 horas y asistencia en la migración de tu catálogo.
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
                <span>Solicitud Enviada</span>
              </div>
              <h3 className="font-display font-bold text-xl">
                ¡Solicitud registrada con éxito!
              </h3>
              <p className="text-xs text-emerald-100 mt-1">
                Plan Pro {confirmationModal.label} ({confirmationModal.months} meses) • S/ {confirmationModal.price}.00
              </p>
            </div>

            {/* Content */}
            <div className="p-6 space-y-4 text-xs text-slate-700">
              {/* Mensaje de confirmación solicitado */}
              <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 font-semibold leading-relaxed text-center sm:text-left">
                Solicitud enviada. Escríbenos por WhatsApp/Yape para confirmar tu pago y activaremos tu plan Pro en minutos.
              </div>

              {/* Box de pago y contacto */}
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

              {/* Botón WhatsApp */}
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
