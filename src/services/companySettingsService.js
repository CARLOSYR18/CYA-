import { createCrudService } from './crudFactory'

const base = createCrudService('company_settings', { orderBy: 'updated_at', ascending: false })

export const companySettingsService = {
  async get() {
    const rows = await base.list()
    return rows[0] || { name: 'Mi Empresa', ruc: '', address: '', phone: '', logo_url: '' }
  },
  async save(data) {
    const rows = await base.list()
    if (rows[0]) return base.update(rows[0].id, { ...data, updated_at: new Date().toISOString() })
    return base.create({ ...data, updated_at: new Date().toISOString() })
  },
}
