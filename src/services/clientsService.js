import { createCrudService } from './crudFactory'

const base = createCrudService('clients', { orderBy: 'name', ascending: true })

export const clientsService = {
  ...base,

  async create(payload) {
    const cleanPayload = {
      name: payload.name?.trim(),
      ruc: payload.ruc || payload.document_number || null,
      phone: payload.phone || null,
      email: payload.email || null,
      address: payload.address || null,
      contact_name: payload.contact_name || null,
    }

    try {
      if (payload.notes) {
        return await base.create({ ...cleanPayload, notes: payload.notes })
      }
      return await base.create(cleanPayload)
    } catch (err) {
      if (err.message && (err.message.includes("'notes'") || err.message.includes('column "notes"'))) {
        return await base.create(cleanPayload)
      }
      throw err
    }
  },

  async update(id, payload) {
    const cleanPayload = {}
    if (payload.name !== undefined) cleanPayload.name = payload.name?.trim()
    if (payload.ruc !== undefined || payload.document_number !== undefined) {
      cleanPayload.ruc = payload.ruc || payload.document_number || null
    }
    if (payload.phone !== undefined) cleanPayload.phone = payload.phone || null
    if (payload.email !== undefined) cleanPayload.email = payload.email || null
    if (payload.address !== undefined) cleanPayload.address = payload.address || null
    if (payload.contact_name !== undefined) cleanPayload.contact_name = payload.contact_name || null

    try {
      if (payload.notes !== undefined) {
        return await base.update(id, { ...cleanPayload, notes: payload.notes })
      }
      return await base.update(id, cleanPayload)
    } catch (err) {
      if (err.message && (err.message.includes("'notes'") || err.message.includes('column "notes"'))) {
        return await base.update(id, cleanPayload)
      }
      throw err
    }
  },

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
