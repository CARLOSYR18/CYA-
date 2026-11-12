import { createCrudService } from './crudFactory'
import { inventoryMovementsService } from './inventoryMovementsService'
import { clientsService } from './clientsService'

const base = createCrudService('sales', { orderBy: 'created_at', ascending: false })

export const salesService = {
  ...base,

  subtotal(sale) {
    if (!sale?.items || !Array.isArray(sale.items)) return Number(sale?.subtotal) || 0
    return sale.items.reduce(
      (sum, it) => sum + (Number(it.quantity) || 1) * (Number(it.unit_price ?? it.price) || 0),
      0
    )
  },

  saleTotal(sale) {
    const subtotal = this.subtotal(sale)
    const discount = Number(sale?.discount || 0)
    const computed = Math.max(subtotal - discount, 0)
    const stored = sale?.total != null && !isNaN(Number(sale.total)) ? Number(sale.total) : null
    if (stored != null && (stored > 0 || computed === 0)) return stored
    return computed
  },

  normalizeSale(s) {
    if (!s) return s
    const sub = this.subtotal(s)
    const tot = this.saleTotal(s)
    return {
      ...s,
      subtotal: sub,
      total: tot,
      items: Array.isArray(s.items) ? s.items : []
    }
  },

  getCached(companyId = null) {
    const raw = base.getCached(companyId)
    if (!raw) return null
    return raw.map((s) => this.normalizeSale(s))
  },

  async list(options) {
    const raw = await base.list(options)
    return (raw || []).map((s) => this.normalizeSale(s))
  },

  // Una venta "pendiente" está vencida si tiene fecha límite y ya pasó.
  isOverdue(sale) {
    if (sale.status !== 'pendiente' || !sale.due_date) return false
    const today = new Date().toISOString().slice(0, 10)
    return sale.due_date < today
  },

  // Días de diferencia respecto a hoy (negativo = vencido hace N días,
  // positivo = faltan N días, null = sin fecha límite).
  daysUntilDue(sale) {
    if (!sale.due_date) return null
    const due = new Date(sale.due_date + 'T00:00:00')
    const today = new Date(new Date().toISOString().slice(0, 10) + 'T00:00:00')
    return Math.round((due - today) / (1000 * 60 * 60 * 24))
  },

  // client_name / client_phone se resuelven a un cliente automáticamente.
  // due_date (string 'YYYY-MM-DD' u null) y notes son opcionales, pensados
  // para ventas con status 'pendiente'.
  async create({ client_name, client_phone, user_id, status, items, discount, due_date, notes }) {
    if (!items?.length) throw new Error('La venta necesita al menos un producto')
    const client = await clientsService.findOrCreateByName(client_name, client_phone)
    const normalizedDiscount = Number(discount) || 0
    const computedTotal = Math.max(
      items.reduce((acc, i) => acc + Number(i.quantity || 0) * Number(i.unit_price ?? i.price ?? 0), 0) - normalizedDiscount,
      0
    )
    const sale = await base.create({
      client_id: client.id,
      user_id,
      status: status || 'pagado',
      items,
      discount: normalizedDiscount,
      total: computedTotal,
      due_date: due_date || null,
      notes: notes || null,
    })
    for (const item of items) {
      await inventoryMovementsService.register({
        product_id: item.product_id,
        type: 'salida',
        quantity: item.quantity,
        reason: 'Venta',
        reference: sale.id,
        user_id: user_id || null,
      })
    }
    return { ...sale, client }
  },

  // Corrige el cliente y/o la fecha de una venta ya creada (para arreglar
  // errores de captura). No toca los productos ni el total.
  // client_name/client_phone: si se pasan, se resuelve (o crea) el cliente
  // correcto y se reasigna la venta a él. created_at: string ISO opcional.
  async correct(saleId, { client_name, client_phone, created_at }) {
    const patch = {}
    if (client_name && client_name.trim()) {
      const client = await clientsService.findOrCreateByName(client_name, client_phone)
      patch.client_id = client.id
    }
    if (created_at) {
      patch.created_at = created_at
    }
    if (Object.keys(patch).length === 0) return null
    return base.update(saleId, patch)
  },
}
