import { supabase, isSupabaseConfigured } from './supabaseClient'

const STORAGE_KEY = 'cya_cached_company_id'

// Función auxiliar para leer inmediatamente en 0ms de cualquier almacenamiento local
export function getSynchronousCompanyId() {
  try {
    const direct = sessionStorage.getItem(STORAGE_KEY) || localStorage.getItem(STORAGE_KEY)
    if (direct) return direct

    // Fallback 1: desde el caché de configuración de la empresa guardada
    const compRaw = localStorage.getItem('cya_company_cache')
    if (compRaw) {
      const parsed = JSON.parse(compRaw)
      if (parsed?.id) {
        sessionStorage.setItem(STORAGE_KEY, parsed.id)
        localStorage.setItem(STORAGE_KEY, parsed.id)
        return parsed.id
      }
    }

    // Fallback 2: desde el perfil cacheado
    const profRaw = localStorage.getItem('cya_cached_profile')
    if (profRaw) {
      const parsed = JSON.parse(profRaw)
      if (parsed?.company_id) {
        sessionStorage.setItem(STORAGE_KEY, parsed.company_id)
        localStorage.setItem(STORAGE_KEY, parsed.company_id)
        return parsed.company_id
      }
    }
  } catch {}
  return null
}

let cachedCompanyId = getSynchronousCompanyId()
let inFlightPromise = null

export async function getCurrentCompanyId() {
  if (!isSupabaseConfigured || !supabase) return null

  // Lectura directa síncrona en 0ms
  const stored = cachedCompanyId || getSynchronousCompanyId()
  if (stored) {
    cachedCompanyId = stored
    return stored
  }

  // Deduplicación de peticiones concurrentes
  if (inFlightPromise) return inFlightPromise

  inFlightPromise = (async () => {
    try {
      const fetchPromise = (async () => {
        try {
          const { data: sessionData } = await supabase.auth.getSession()
          const user = sessionData?.session?.user
          if (!user) return null
          const { data, error } = await supabase
            .from('profiles')
            .select('company_id')
            .eq('id', user.id)
            .maybeSingle()
          if (!error && data?.company_id) {
            setCompanyCache(data.company_id)
            return data.company_id
          }

          // Fallback: empresa activa en companies
          try {
            const { data: comp } = await supabase.from('companies').select('id').order('created_at', { ascending: false }).limit(1).maybeSingle()
            if (comp?.id) {
              setCompanyCache(comp.id)
              return comp.id
            }
          } catch {}

          return getSynchronousCompanyId()
        } catch {
          return getSynchronousCompanyId()
        }
      })()

      // Timeout ágil de 4s para no bloquear la interfaz
      const timeoutPromise = new Promise((resolve) => setTimeout(() => resolve(null), 4000))
      const result = await Promise.race([fetchPromise, timeoutPromise])
      return result || getSynchronousCompanyId() || cachedCompanyId || null
    } catch {
      return getSynchronousCompanyId() || cachedCompanyId || null
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
