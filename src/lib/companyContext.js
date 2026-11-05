import { supabase, isSupabaseConfigured } from './supabaseClient'

const STORAGE_KEY = 'cya_cached_company_id'

// Inicializar desde almacenamiento local o de sesión para respuesta en 0ms
let cachedCompanyId = (() => {
  try {
    return sessionStorage.getItem(STORAGE_KEY) || localStorage.getItem(STORAGE_KEY) || null
  } catch {
    return null
  }
})()

let inFlightPromise = null

export async function getCurrentCompanyId() {
  if (!isSupabaseConfigured) return null
  if (cachedCompanyId) return cachedCompanyId

  // Deduplicación de peticiones concurrentes
  if (inFlightPromise) return inFlightPromise

  inFlightPromise = (async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return null
      const { data, error } = await supabase.from('profiles').select('company_id').eq('id', user.id).single()
      if (error) throw error
      if (data?.company_id) {
        setCompanyCache(data.company_id)
      }
      return cachedCompanyId
    } finally {
      inFlightPromise = null
    }
  })()

  return inFlightPromise
}

export function setCompanyCache(companyId) {
  cachedCompanyId = companyId || null
  try {
    if (companyId) {
      sessionStorage.setItem(STORAGE_KEY, companyId)
      localStorage.setItem(STORAGE_KEY, companyId)
    } else {
      sessionStorage.removeItem(STORAGE_KEY)
      localStorage.removeItem(STORAGE_KEY)
    }
  } catch {}
}

export function clearCompanyCache() {
  cachedCompanyId = null
  try {
    sessionStorage.removeItem(STORAGE_KEY)
    localStorage.removeItem(STORAGE_KEY)
  } catch {}
}
