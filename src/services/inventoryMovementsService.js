import { createCrudService } from './crudFactory'
import { productsService } from './productsService'

const base = createCrudService('inventory_movements', { orderBy: 'created_at', ascending: false })

export const inventoryMovementsService = {
  list: base.list,

  // type: 'entrada' | 'salida'
  async register({ product_id, type, quantity, reason, reference }) {
    if (quantity <= 0) throw new Error('La cantidad debe ser mayor a 0')
    const delta = type === 'entrada' ? quantity : -quantity
    const movement = await base.create({ product_id, type, quantity, reason, reference: reference || null })
    await productsService.adjustStock(product_id, delta)
    return movement
  },

  // Borra el movimiento Y revierte su efecto sobre el stock.
  async remove(movement) {
    const delta = movement.type === 'entrada' ? -movement.quantity : movement.quantity
    await productsService.adjustStock(movement.product_id, delta)
    await base.remove(movement.id)
  },

  // Edita un movimiento existente. Revierte el efecto viejo (en el producto
  // viejo) y aplica el efecto nuevo (en el producto nuevo, que puede ser el
  // mismo u otro), para que el stock quede siempre correcto.
  async update(original, changes) {
    const updated = { ...original, ...changes }
    if (updated.quantity <= 0) throw new Error('La cantidad debe ser mayor a 0')

    const oldDelta = original.type === 'entrada' ? -original.quantity : original.quantity
    await productsService.adjustStock(original.product_id, oldDelta) // revierte lo viejo

    const newDelta = updated.type === 'entrada' ? updated.quantity : -updated.quantity
    await productsService.adjustStock(updated.product_id, newDelta) // aplica lo nuevo

    return base.update(original.id, {
      product_id: updated.product_id,
      type: updated.type,
      quantity: updated.quantity,
      reason: updated.reason,
      reference: updated.reference || null,
    })
  },
}
