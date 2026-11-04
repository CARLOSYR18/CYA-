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

export const companySettingsService = {
  getCached() {
    return getStoredCompany()
  },

  async get() {
    const extra = getCachedExtraSettings()
    const cached = getStoredCompany()

    if (isSupabaseConfigured) {
      const companyId = await getCurrentCompanyId()
      if (!companyId) return cached || { name: 'Mi Empresa', ruc: '', address: '', phone: '', logo_url: '', ...extra }
      const { data, error } = await supabase.from('companies').select('*').eq('id', companyId).single()
      if (error) {
        if (cached) return { ...extra, ...cached }
        throw error
      }
      if (data) {
        paymentMethodsService.hydrateFromCompany({ ...data, ...extra })
      }
      const full = { ...extra, ...data }
      saveStoredCompany(full)
      return full
    }
    const rows = localDb.getTable('company_settings')
    const current = rows[0] || { name: 'Mi Empresa', ruc: '', address: '', phone: '', logo_url: '' }
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
