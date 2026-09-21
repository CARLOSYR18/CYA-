import { supabase } from '../lib/supabaseClient'

export const platformAdminService = {
  async listCompanies() {
    const { data, error } = await supabase.from('companies').select('*').order('created_at', { ascending: false })
    if (error) throw error
    return data
  },

  async listPlanRequests(status = 'pendiente') {
    const { data, error } = await supabase
      .from('plan_requests')
      .select('*, companies(name)')
      .eq('status', status)
      .order('created_at', { ascending: false })
    if (error) throw error
    return data
  },

  async setCompanyPlan(companyId, { plan, plan_period, plan_price, months }) {
    const patch = { plan, plan_period: plan_period || null, plan_price: plan_price || null }
    if (plan === 'pro' && months) {
      patch.plan_started_at = new Date().toISOString()
      patch.plan_expires_at = new Date(Date.now() + months * 30 * 24 * 60 * 60 * 1000).toISOString()
    }
    if (plan === 'free') {
      patch.plan_started_at = null
      patch.plan_expires_at = null
    }
    const { data, error } = await supabase.from('companies').update(patch).eq('id', companyId).select().single()
    if (error) throw error
    return data
  },

  async toggleActive(companyId, active) {
    const { data, error } = await supabase.from('companies').update({ active }).eq('id', companyId).select().single()
    if (error) throw error
    return data
  },

  async approveRequest(request) {
    const months = { trimestral: 3, semestral: 6, anual: 12 }[request.plan_period]
    await this.setCompanyPlan(request.company_id, {
      plan: 'pro', plan_period: request.plan_period, plan_price: request.price, months,
    })
    const { error } = await supabase.from('plan_requests').update({ status: 'aprobado' }).eq('id', request.id)
    if (error) throw error
  },

  async rejectRequest(requestId) {
    const { error } = await supabase.from('plan_requests').update({ status: 'rechazado' }).eq('id', requestId)
    if (error) throw error
  },
}
