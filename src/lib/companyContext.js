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
  if (!isSupabaseConfigured || !supabase) return null

  // Lectura directa síncrona en 0ms desde memoria o almacenamiento local
  const stored = cachedCompanyId || (() => {
    try {
      return sessionStorage.getItem(STORAGE_KEY) || localStorage.getItem(STORAGE_KEY) || null
    } catch {
      return null
    }
  })()

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
          if (error) {
            console.warn('Aviso profile company_id:', error.message)
            return null
          }
          if (data && data.company_id) {
            setCompanyCache(data.company_id)
            return data.company_id
          }

          // Si el perfil aún no tiene empresa asignada, auto-vincular a la empresa activa
          try {
            const { data: comp } = await supabase.from('companies').select('id').order('created_at', { ascending: false }).limit(1).maybeSingle()
            if (comp?.id) {
              setCompanyCache(comp.id)
              await supabase.from('profiles').update({ company_id: comp.id }).eq('id', user.id).catch(() => {})
              return comp.id
            }
          } catch {}

          return cachedCompanyId || null
        } catch {
          return null
        }
      })()

      // Timeout generoso de 10s para redes móviles 3G/4G
      const timeoutPromise = new Promise((resolve) => setTimeout(() => resolve(null), 10000))
      const result = await Promise.race([fetchPromise, timeoutPromise])
      return result || cachedCompanyId || null
    } catch {
      return cachedCompanyId || null
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
