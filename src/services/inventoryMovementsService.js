import { createCrudService } from './crudFactory'
import { productsService } from './productsService'

const base = createCrudService('inventory_movements', { orderBy: 'created_at', ascending: false })

export const inventoryMovementsService = {
  list: base.list,
  remove: base.remove,

  // type: 'entrada' | 'salida'
  async register({ product_id, type, quantity, reason, reference }) {
    if (quantity <= 0) throw new Error('La cantidad debe ser mayor a 0')
    const delta = type === 'entrada' ? quantity : -quantity
    const movement = await base.create({ product_id, type, quantity, reason, reference: reference || null })
    await productsService.adjustStock(product_id, delta)
    return movement
  },
}
