import { createCrudService } from './crudFactory'
import { inventoryMovementsService } from './inventoryMovementsService'
import { clientsService } from './clientsService'

const base = createCrudService('sales', { orderBy: 'created_at', ascending: false })

export const salesService = {
  list: base.list,
  update: base.update,
  remove: base.remove,

  // Suma de los productos, sin descuento.
  subtotal(sale) {
    return sale.items.reduce((sum, it) => sum + it.quantity * it.unit_price, 0)
  },

  // Total final ya con el descuento aplicado (nunca menor a 0).
  saleTotal(sale) {
    const subtotal = this.subtotal(sale)
    const discount = Number(sale.discount || 0)
    return Math.max(subtotal - discount, 0)
  },

  // client_name / client_phone se resuelven a un cliente automáticamente.
  // discount es opcional, en soles (no porcentaje).
  async create({ client_name, client_phone, user_id, status, items, discount }) {
    if (!items?.length) throw new Error('La venta necesita al menos un producto')
    const client = await clientsService.findOrCreateByName(client_name, client_phone)
    const sale = await base.create({
      client_id: client.id,
      user_id,
      status: status || 'pagado',
      items,
      discount: Number(discount) || 0,
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
