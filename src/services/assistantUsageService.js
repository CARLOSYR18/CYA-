import { supabase, isSupabaseConfigured } from '../lib/supabaseClient'
import { getCurrentCompanyId } from '../lib/companyContext'

const todayStr = () => new Date().toISOString().slice(0, 10)

export const assistantUsageService = {
  async getTodayCount() {
    if (!isSupabaseConfigured) return 0
    const companyId = await getCurrentCompanyId()
    if (!companyId) return 0
    try {
      const { data, error } = await supabase
        .from('assistant_usage')
        .select('count')
        .eq('company_id', companyId)
        .eq('usage_date', todayStr())
        .maybeSingle()
      if (error) {
        console.warn('assistant_usage query warning:', error)
        return 0
      }
      return data?.count || 0
    } catch (err) {
      console.warn('assistant_usage getTodayCount error:', err)
      return 0
    }
  },
  async increment() {
    if (!isSupabaseConfigured) return
    const companyId = await getCurrentCompanyId()
    if (!companyId) return
    try {
      const current = await this.getTodayCount()
      const { error } = await supabase.from('assistant_usage').upsert(
        { company_id: companyId, usage_date: todayStr(), count: current + 1 },
        { onConflict: 'company_id,usage_date' }
      )
      if (error) {
        console.warn('assistant_usage increment error:', error)
      }
    } catch (err) {
      console.warn('assistant_usage increment error:', err)
    }
  },
}
