import { createCrudService } from './crudFactory'
import { inventoryMovementsService } from './inventoryMovementsService'
import { clientsService } from './clientsService'

const base = createCrudService('sales', { orderBy: 'created_at', ascending: false })

export const salesService = {
  list: base.list,
  update: base.update,
  remove: base.remove,

  subtotal(sale) {
    return sale.items.reduce((sum, it) => sum + it.quantity * it.unit_price, 0)
  },

  saleTotal(sale) {
    const subtotal = this.subtotal(sale)
    const discount = Number(sale.discount || 0)
    return Math.max(subtotal - discount, 0)
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
    const sale = await base.create({
      client_id: client.id,
      user_id,
      status: status || 'pagado',
      items,
      discount: Number(discount) || 0,
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
      })
    }
    return { ...sale, client }
  },
}
