import { supabase, isSupabaseConfigured } from '../lib/supabaseClient'
import { localDb } from '../lib/localDb'
import { getCurrentCompanyId } from '../lib/companyContext'
import { paymentMethodsService } from './paymentMethodsService'

const EXTRA_SETTINGS_KEY = 'cya_company_extra_settings'
const COMPANY_CACHE_KEY = 'cya_company_cache'

function getCachedExtraSettings() {
  try {
    const raw = localStorage.getItem(EXTRA_SETTINGS_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

function saveCachedExtraSettings(patch) {
  try {
    const current = getCachedExtraSettings()
    localStorage.setItem(EXTRA_SETTINGS_KEY, JSON.stringify({ ...current, ...patch }))
  } catch {}
}

function getStoredCompany() {
  try {
    const raw = localStorage.getItem(COMPANY_CACHE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function saveStoredCompany(data) {
  try {
    if (!data) return
    localStorage.setItem(COMPANY_CACHE_KEY, JSON.stringify(data))
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('cya_company_updated', { detail: data }))
    }
  } catch {}
}

export function clearStoredCompany() {
  try {
    localStorage.removeItem(COMPANY_CACHE_KEY)
    localStorage.removeItem(EXTRA_SETTINGS_KEY)
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('cya_company_updated', { detail: null }))
    }
  } catch {}
}

export const companySettingsService = {
  clearStoredCompany() {
    clearStoredCompany()
  },

  setCached(data) {
    if (!data) return
    saveStoredCompany(data)
  },

  getCached(expectedCompanyId = null) {
    const cached = getStoredCompany()
    if (!cached) return null
    if (isSupabaseConfigured) {
      let activeId = expectedCompanyId
      if (!activeId) {
        try {
          activeId = sessionStorage.getItem('cya_cached_company_id') || localStorage.getItem('cya_cached_company_id') || null
        } catch {
          activeId = null
        }
      }
      if (!activeId || cached.id !== activeId) return null
    }
    return { ...getCachedExtraSettings(), ...cached }
  },

  async get(options = {}) {
    const forceRefresh = options?.forceRefresh === true

    if (isSupabaseConfigured && supabase) {
      try {
        const companyId = await getCurrentCompanyId().catch(() => null)
        if (!companyId) {
          // Si el usuario no tiene company_id, devuelve null (no el caché)
          return null
        }

        const extra = getCachedExtraSettings()
        const cached = getStoredCompany()

        // Solo retornar caché si corresponde exactamente a la empresa activa
        if (cached && cached.id === companyId && !forceRefresh) {
          // Revalidación silenciosa en segundo plano
          supabase.from('companies').select('*').eq('id', companyId).maybeSingle().then(({ data, error }) => {
            if (!error && data) {
              paymentMethodsService.hydrateFromCompany({ ...data, ...extra })
              saveStoredCompany({ ...extra, ...data })
            }
          }).catch(() => {})
          return { ...extra, ...cached }
        }

        const { data, error } = await supabase.from('companies').select('*').eq('id', companyId).maybeSingle()
        if (error) {
          console.warn('Aviso al obtener configuración de empresa:', error.message)
          if (cached && cached.id === companyId) return { ...extra, ...cached }
          return null
        }
        if (data) {
          paymentMethodsService.hydrateFromCompany({ ...data, ...extra })
          const full = { ...extra, ...data }
          saveStoredCompany(full)
          return full
        }
        return null
      } catch (err) {
        console.warn('Error conectando a empresas en Supabase:', err)
        return null
      }
    }

    const extra = getCachedExtraSettings()
    const rows = localDb.getTable('company_settings')
    const current = rows[0] || { name: 'CYA Store', ruc: '20608912345', address: 'Lima, Perú', phone: '+51 987 654 321', logo_url: '' }
    paymentMethodsService.hydrateFromCompany({ ...current, ...extra })
    const full = { ...extra, ...current }
    saveStoredCompany(full)
    return full
  },

  async save(data) {
    // Guardar siempre copia de seguridad de campos personalizados (currency, footer_message, etc.)
    saveCachedExtraSettings({
      currency: data.currency || 'S/',
      footer_message: data.footer_message || '',
    })

    let result = null

    if (isSupabaseConfigured) {
      const companyId = await getCurrentCompanyId()
      if (!companyId) {
        saveStoredCompany(data)
        return data
      }

      let payload = { ...data }
      let lastError = null

      // Reintentar de forma inteligente removiendo automáticamente cualquier columna
      // que no exista en el esquema de Supabase (ej: 'currency', 'footer_message', etc.)
      for (let attempt = 0; attempt < 6; attempt++) {
        const { data: updated, error } = await supabase
          .from('companies')
          .update(payload)
          .eq('id', companyId)
          .select()
          .single()

        if (!error) {
          if (updated) {
            paymentMethodsService.hydrateFromCompany({ ...updated, ...data })
          }
          result = { ...data, ...updated }
          break
        }

        lastError = error
        const match = error.message?.match(/Could not find the '([^']+)' column/)
        if (match && match[1] && payload[match[1]] !== undefined) {
          delete payload[match[1]]
          continue
        } else {
          break
        }
      }

      if (!result) {
        console.warn('Supabase update advertencia, intentando con columnas base:', lastError)
        // Fallback seguro con columnas esenciales garantizadas
        const corePayload = {
          name: data.name,
          ruc: data.ruc,
          address: data.address,
          phone: data.phone,
          email: data.email,
          logo_url: data.logo_url,
        }
        const { data: fallbackUpdated, error: fallbackError } = await supabase
          .from('companies')
          .update(corePayload)
          .eq('id', companyId)
          .select()
          .single()

        if (fallbackError) throw fallbackError
        result = { ...data, ...fallbackUpdated }
      }
    } else {
      const rows = localDb.getTable('company_settings')
      if (rows[0]) {
        result = localDb.update('company_settings', rows[0].id, data)
      } else {
        result = localDb.insert('company_settings', data)
      }
    }

    saveStoredCompany(result)
    return result
  },
}
