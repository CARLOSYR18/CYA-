import { supabase, isSupabaseConfigured } from './supabaseClient'

let cachedCompanyId = null

export async function getCurrentCompanyId() {
  if (!isSupabaseConfigured) return null
  if (cachedCompanyId) return cachedCompanyId
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data, error } = await supabase.from('profiles').select('company_id').eq('id', user.id).single()
  if (error) throw error
  cachedCompanyId = data.company_id
  return cachedCompanyId
}

export function setCompanyCache(companyId) {
  cachedCompanyId = companyId
}

export function clearCompanyCache() {
  cachedCompanyId = null
}
