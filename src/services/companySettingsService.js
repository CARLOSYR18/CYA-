import { supabase, isSupabaseConfigured } from '../lib/supabaseClient'
import { localDb } from '../lib/localDb'
import { getCurrentCompanyId } from '../lib/companyContext'
import { paymentMethodsService } from './paymentMethodsService'

const EXTRA_SETTINGS_KEY = 'cya_company_extra_settings'

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

export const companySettingsService = {
  async get() {
    const extra = getCachedExtraSettings()

    if (isSupabaseConfigured) {
      const companyId = await getCurrentCompanyId()
      if (!companyId) return { name: 'Mi Empresa', ruc: '', address: '', phone: '', logo_url: '', ...extra }
      const { data, error } = await supabase.from('companies').select('*').eq('id', companyId).single()
      if (error) throw error
      if (data) {
        paymentMethodsService.hydrateFromCompany({ ...data, ...extra })
      }
      return { ...extra, ...data }
    }
    const rows = localDb.getTable('company_settings')
    const current = rows[0] || { name: 'Mi Empresa', ruc: '', address: '', phone: '', logo_url: '' }
    paymentMethodsService.hydrateFromCompany({ ...current, ...extra })
    return { ...extra, ...current }
  },

  async save(data) {
    // Guardar siempre copia de seguridad de campos personalizados (currency, footer_message, etc.)
    saveCachedExtraSettings({
      currency: data.currency || 'S/',
      footer_message: data.footer_message || '',
    })

    if (isSupabaseConfigured) {
      const companyId = await getCurrentCompanyId()
      if (!companyId) return data

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
          return { ...data, ...updated }
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
      return { ...data, ...fallbackUpdated }
    }

    const rows = localDb.getTable('company_settings')
    if (rows[0]) return localDb.update('company_settings', rows[0].id, data)
    return localDb.insert('company_settings', data)
  },
}
