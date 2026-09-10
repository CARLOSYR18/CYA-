import { createCrudService } from './crudFactory'
import { inventoryMovementsService } from './inventoryMovementsService'

const base = createCrudService('sales', { orderBy: 'created_at', ascending: false })

export const salesService = {
  list: base.list,
  update: base.update,
  remove: base.remove,

  saleTotal(sale) {
    return sale.items.reduce((sum, it) => sum + it.quantity * it.unit_price, 0)
  },

  // items: [{ product_id, quantity, unit_price }]
  async create({ client_id, user_id, status, items }) {
    if (!items?.length) throw new Error('La venta necesita al menos un producto')
    const sale = await base.create({ client_id, user_id, status: status || 'pagado', items })
    // inventoryMovementsService.register both logs the movement AND adjusts stock
    for (const item of items) {
      await inventoryMovementsService.register({
        product_id: item.product_id,
        type: 'salida',
        quantity: item.quantity,
        reason: 'Venta',
        reference: sale.id,
      })
    }
    return sale
  },
}
