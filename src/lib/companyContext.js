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
  if (cachedCompanyId) return cachedCompanyId

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
          if (data) {
            if (data.company_id) {
              setCompanyCache(data.company_id)
              return data.company_id
            } else {
              // Jamás borrar el caché si el perfil no tiene company_id aún.
              // Intentar buscar una empresa registrada en la base de datos para auto-vincular
              try {
                const { data: comp } = await supabase.from('companies').select('id').order('created_at', { ascending: false }).limit(1).maybeSingle()
                if (comp?.id) {
                  setCompanyCache(comp.id)
                  await supabase.from('profiles').update({ company_id: comp.id }).eq('id', user.id).catch(() => {})
                  return comp.id
                }
              } catch {}
              return cachedCompanyId || null
            }
          }
          return cachedCompanyId || null
        } catch {
          return null
        }
      })()

      // Timeout estricto de 2.5s para no bloquear la aplicación bajo ninguna circunstancia
      const timeoutPromise = new Promise((resolve) => setTimeout(() => resolve(null), 2500))
      const result = await Promise.race([fetchPromise, timeoutPromise])
      return result !== undefined ? result : null
    } catch {
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
