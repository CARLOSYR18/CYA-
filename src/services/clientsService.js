import { createCrudService } from './crudFactory'

const base = createCrudService('clients', { orderBy: 'name', ascending: true })

export const clientsService = {
  ...base,

  // Busca un cliente por nombre (y teléfono si se da); si no existe, lo crea.
  // Así en "Nueva venta" solo se escribe el nombre, sin un formulario aparte.
  async findOrCreateByName(name, phone) {
    const trimmed = name.trim()
    if (!trimmed) throw new Error('El nombre del cliente es obligatorio')
    const all = await base.list()
    const match = all.find(
      (c) => c.name.trim().toLowerCase() === trimmed.toLowerCase() &&
        (!phone || !c.phone || c.phone === phone)
    )
    if (match) {
      if (phone && !match.phone) return base.update(match.id, { phone })
      return match
    }
    return base.create({ name: trimmed, phone: phone || null })
  },
}
