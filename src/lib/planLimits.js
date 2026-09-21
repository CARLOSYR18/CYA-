export const PLAN_PRICING = {
  trimestral: { months: 3, price: 60, label: 'Trimestral' },
  semestral: { months: 6, price: 120, label: 'Semestral' },
  anual: { months: 12, price: 230, label: 'Anual' },
}

export const PLAN_LIMITS = {
  free: { maxProducts: 20, maxUsers: 1, assistantDailyMessages: 5 },
  pro: { maxProducts: Infinity, maxUsers: Infinity, assistantDailyMessages: Infinity },
}

// El plan "efectivo": si dice pro pero ya venció, se trata como free en
// toda la app (sin borrar el historial de lo que pagó antes).
export function getEffectivePlan(company) {
  if (!company) return 'free'
  if (company.plan === 'pro') {
    if (!company.plan_expires_at) return 'pro'
    return new Date(company.plan_expires_at) > new Date() ? 'pro' : 'free'
  }
  return 'free'
}

export function getLimits(company) {
  return PLAN_LIMITS[getEffectivePlan(company)]
}
