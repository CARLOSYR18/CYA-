// Servicio para gestionar el plan y suscripción del ERP CYA STORE
const PLAN_STORAGE_KEY = 'cya_erp_active_plan'

export const PLANS_DATA = {
  free: {
    id: 'free',
    name: 'Plan Free',
    badge: 'GRATIS',
    tagline: 'Ideal para emprendedores y pequeños negocios que recién comienzan a digitalizarse.',
    price: 0,
    pricePeriod: 'Gratis para siempre',
    priceEquiv: 'Sin costo mensual',
    billingCycle: 'Acceso básico continuo',
    buttonText: 'Plan actual',
    popular: false,
    durationMonths: null,
    limits: {
      products: 'Hasta 50 productos',
      users: '1 usuario',
      aiQuestions: '10 consultas / día',
      history: '30 días de historial',
      support: 'Soporte comunitario',
    },
    features: [
      { text: 'Hasta 50 productos en inventario', included: true },
      { text: '1 usuario con acceso al sistema', included: true },
      { text: 'Asistente IA limitado (10 preguntas por día)', included: true, highlight: true },
      { text: 'Registro básico de ventas y compras', included: true },
      { text: 'Historial de movimientos de stock (30 días)', included: true },
      { text: 'Panel de control con métricas del día', included: true },
      { text: 'Boletas con logotipo de empresa', included: false },
      { text: 'Asistente IA Ilimitado 24/7', included: false },
      { text: 'Exportaciones masivas a Excel y PDF', included: false },
      { text: 'Atención y soporte prioritario 24/7', included: false },
      { text: 'Actualizaciones y mantenimiento garantizado', included: false },
      { text: 'Copias de seguridad automáticas en la nube', included: false },
    ],
  },
  pro_mensual: {
    id: 'pro_mensual',
    name: 'Plan Pro Mensual',
    badge: 'FLEXIBLE',
    tagline: 'Acceso total a todas las funciones del ERP mes a mes sin compromisos.',
    price: 30,
    pricePeriod: 'S/ 30 al mes',
    priceEquiv: 'Facturación mensual estándar',
    billingCycle: 'Facturación cada mes (1 mes)',
    buttonText: 'Elegir Plan Mensual',
    popular: false,
    durationMonths: 1,
    features: [
      { text: 'Productos y categorías ilimitados', included: true },
      { text: 'Múltiples usuarios y roles (Admin, Vendedores)', included: true },
      { text: 'Asistente IA Ilimitado 24/7 (Ventas, stock y finanzas)', included: true, highlight: true },
      { text: 'Emisión de boletas y recibos PDF con logo propio', included: true },
      { text: 'Historial histórico de movimientos sin límites de tiempo', included: true },
      { text: 'Envío directo de comprobantes por WhatsApp', included: true },
      { text: 'Exportación completa a Excel y reportes ejecutivos', included: true },
      { text: 'Atención y soporte técnico 24 horas', included: true, highlight: true },
      { text: 'Actualizaciones continuas del sistema garantizadas', included: true, highlight: true },
      { text: 'Mantenimiento preventivo y copias en la nube', included: true, highlight: true },
    ],
  },
  pro_trimestral: {
    id: 'pro_trimestral',
    name: 'Plan Pro Trimestral',
    badge: 'MÁS POPULAR',
    tagline: 'Todo el poder del ERP para negocios en crecimiento que necesitan control total sin límites.',
    price: 60,
    pricePeriod: 'S/ 60 cada 3 meses',
    priceEquiv: 'Equivale a solo S/ 20 al mes (¡Ahorra S/ 10/mes!)',
    billingCycle: 'Facturación trimestral (3 meses)',
    buttonText: 'Elegir Plan Trimestral',
    popular: true,
    durationMonths: 3,
    features: [
      { text: 'Productos y categorías ilimitados', included: true },
      { text: 'Múltiples usuarios y roles (Admin, Vendedores)', included: true },
      { text: 'Asistente IA Ilimitado 24/7 (Ventas, stock y finanzas)', included: true, highlight: true },
      { text: 'Emisión de boletas y recibos PDF con logo propio', included: true },
      { text: 'Historial histórico de movimientos sin límites de tiempo', included: true },
      { text: 'Envío directo de comprobantes por WhatsApp', included: true },
      { text: 'Exportación completa a Excel y reportes ejecutivos', included: true },
      { text: 'Atención y soporte técnico 24 horas', included: true, highlight: true },
      { text: 'Actualizaciones continuas del sistema garantizadas', included: true, highlight: true },
      { text: 'Mantenimiento preventivo y copias en la nube', included: true, highlight: true },
    ],
  },
  pro_semestral: {
    id: 'pro_semestral',
    name: 'Plan Pro Semestral',
    badge: 'RECOMENDADO',
    tagline: 'Estabilidad y tranquilidad operativa por medio año completo con todas las ventajas Pro.',
    price: 120,
    pricePeriod: 'S/ 120 cada 6 meses',
    priceEquiv: 'Equivale a S/ 20 al mes',
    billingCycle: 'Facturación semestral (6 meses)',
    buttonText: 'Elegir Plan Semestral',
    popular: false,
    durationMonths: 6,
    features: [
      { text: 'Todo lo incluido en el Plan Pro Trimestral', included: true, highlight: true },
      { text: 'Asistente IA Ilimitado con máxima velocidad de respuesta', included: true },
      { text: 'Atención y soporte prioritario 24/7 vía WhatsApp', included: true, highlight: true },
      { text: 'Sesión de capacitación e inducción para tu personal', included: true },
      { text: 'Mantenimiento preventivo y optimización de base de datos', included: true, highlight: true },
      { text: 'Actualizaciones continuas y acceso previo a nuevas funciones', included: true, highlight: true },
      { text: 'Copias de seguridad diarias automatizadas', included: true },
      { text: 'Soporte en configuración de comprobantes y catálogo inicial', included: true },
    ],
  },
  pro_anual: {
    id: 'pro_anual',
    name: 'Plan Pro Anual',
    badge: 'MEJOR VALOR • AHORRO MÁXIMO',
    tagline: 'La inversión más rentable para empresas consolidadas. Máximo ahorro y atención VIP exclusiva.',
    price: 230,
    pricePeriod: 'S/ 230 al año',
    priceEquiv: 'Equivale a S/ 19.16 al mes • ¡Ahorras S/ 10 frente a 2 semestres!',
    billingCycle: 'Facturación anual única (12 meses)',
    buttonText: 'Elegir Plan Anual',
    popular: true,
    highlightDiscount: 'AHORRA S/ 10 + 1 MES GRATIS',
    durationMonths: 12,
    features: [
      { text: 'Todo lo incluido en el Plan Semestral', included: true, highlight: true },
      { text: 'Mayor ahorro garantizado (Solo S/ 230 al año completo)', included: true, highlight: true },
      { text: 'Asistente IA Ilimitado 24/7 sin ninguna restricción', included: true },
      { text: 'Atención y soporte dedicado 24 horas con asesor exclusivo', included: true, highlight: true },
      { text: 'Migración e importación masiva de productos desde Excel gratis', included: true, highlight: true },
      { text: 'Mantenimiento continuo y monitoreo de servidor en tiempo real', included: true, highlight: true },
      { text: 'Actualizaciones de por vida durante todo el periodo anual', included: true },
      { text: 'Garantía de alta disponibilidad (99.9% uptime SLA)', included: true },
    ],
  },
}

export const planService = {
  // Obtener plan actual almacenado
  getActivePlan() {
    try {
      const stored = localStorage.getItem(PLAN_STORAGE_KEY)
      if (stored && PLANS_DATA[stored]) return stored
    } catch {
      // fallback
    }
    return 'free'
  },

  // Obtener detalles del plan activo
  getActivePlanData() {
    const id = this.getActivePlan()
    return PLANS_DATA[id] || PLANS_DATA.free
  },

  // Cambiar el plan (simulación / activación)
  setActivePlan(planId) {
    if (!PLANS_DATA[planId]) throw new Error('Plan inválido')
    localStorage.setItem(PLAN_STORAGE_KEY, planId)
    // Disparar evento para que todos los componentes se enteren en tiempo real
    window.dispatchEvent(new CustomEvent('cya_plan_changed', { detail: { planId } }))
    return PLANS_DATA[planId]
  },

  // Comprobar si el plan actual es Pro
  isPro() {
    const id = this.getActivePlan()
    return id !== 'free'
  },
}
