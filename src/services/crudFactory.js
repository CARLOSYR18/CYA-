import { supabase, isSupabaseConfigured } from '../lib/supabaseClient'
import { localDb } from '../lib/localDb'
import { getCurrentCompanyId } from '../lib/companyContext'

export function createCrudService(table, { orderBy = 'created_at', ascending = false } = {}) {
  return {
    async list() {
      if (isSupabaseConfigured) {
        const { data, error } = await supabase.from(table).select('*').order(orderBy, { ascending })
        if (error) throw error
        return data
      }
      const rows = localDb.getTable(table)
      return [...rows].sort((a, b) =>
        ascending ? new Date(a[orderBy]) - new Date(b[orderBy]) : new Date(b[orderBy]) - new Date(a[orderBy])
      )
    },
    async create(payload) {
      if (isSupabaseConfigured) {
        const company_id = await getCurrentCompanyId()
        const { data, error } = await supabase.from(table).insert({ ...payload, company_id }).select().single()
        if (error) throw error
        return data
      }
      return localDb.insert(table, payload)
    },
    async update(id, patch) {
      if (isSupabaseConfigured) {
        const { data, error } = await supabase.from(table).update(patch).eq('id', id).select().single()
        if (error) throw error
        return data
      }
      return localDb.update(table, id, patch)
    },
    async remove(id) {
      if (isSupabaseConfigured) {
        const { error } = await supabase.from(table).delete().eq('id', id)
        if (error) throw error
        return
      }
      localDb.remove(table, id)
    },
  }
}
