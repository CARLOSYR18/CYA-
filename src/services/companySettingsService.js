import { supabase, isSupabaseConfigured } from '../lib/supabaseClient'
import { localDb } from '../lib/localDb'
import { getCurrentCompanyId } from '../lib/companyContext'

export const companySettingsService = {
  async get() {
    if (isSupabaseConfigured) {
      const companyId = await getCurrentCompanyId()
      if (!companyId) return { name: 'Mi Empresa', ruc: '', address: '', phone: '', logo_url: '' }
      const { data, error } = await supabase.from('companies').select('*').eq('id', companyId).single()
      if (error) throw error
      return data
    }
    const rows = localDb.getTable('company_settings')
    return rows[0] || { name: 'Mi Empresa', ruc: '', address: '', phone: '', logo_url: '' }
  },
  async save(data) {
    if (isSupabaseConfigured) {
      const companyId = await getCurrentCompanyId()
      const { data: updated, error } = await supabase.from('companies').update(data).eq('id', companyId).select().single()
      if (error) throw error
      return updated
    }
    const rows = localDb.getTable('company_settings')
    if (rows[0]) return localDb.update('company_settings', rows[0].id, data)
    return localDb.insert('company_settings', data)
  },
}
