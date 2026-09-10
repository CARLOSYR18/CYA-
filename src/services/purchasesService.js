import { createCrudService } from './crudFactory'
import { inventoryMovementsService } from './inventoryMovementsService'

const base = createCrudService('purchases', { orderBy: 'created_at', ascending: false })

export const purchasesService = {
  list: base.list,
  remove: base.remove,

  purchaseTotal(purchase) {
    return purchase.items.reduce((sum, it) => sum + it.quantity * it.unit_cost, 0)
  },

  // items: [{ product_id, quantity, unit_cost }]
  async create({ supplier_id, user_id, status, items }) {
    if (!items?.length) throw new Error('La compra necesita al menos un producto')
    const purchase = await base.create({ supplier_id, user_id, status: status || 'pendiente', items })
    if (purchase.status === 'recibido') {
      await this._receiveStock(purchase)
    }
    return purchase
  },

  // Moves a pending purchase to "recibido" and enters stock for each item.
  async markReceived(purchase) {
    if (purchase.status === 'recibido') return purchase
    const updated = await base.update(purchase.id, { status: 'recibido' })
    await this._receiveStock(purchase)
    return updated
  },

  async _receiveStock(purchase) {
    for (const item of purchase.items) {
      await inventoryMovementsService.register({
        product_id: item.product_id,
        type: 'entrada',
        quantity: item.quantity,
        reason: 'Compra a proveedor',
        reference: purchase.id,
      })
    }
  },
}
