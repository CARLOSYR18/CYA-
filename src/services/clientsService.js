import { createCrudService } from './crudFactory'

const base = createCrudService('clients', { orderBy: 'name', ascending: true })
let clientsSupportsNotes = null

function isMissingNotesColumnError(err) {
  const msg = (err?.message || '').toLowerCase()
  return (
    msg.includes('notes') &&
    (msg.includes('schema cache') || msg.includes('does not exist') || msg.includes('could not find') || msg.includes('column'))
  )
}

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

    if (payload.notes && clientsSupportsNotes !== false) {
      try {
        return await base.create({ ...cleanPayload, notes: payload.notes })
      } catch (err) {
        if (isMissingNotesColumnError(err)) {
          clientsSupportsNotes = false
          return await base.create(cleanPayload)
        }
        throw err
      }
    }
    return await base.create(cleanPayload)
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

    if (payload.notes !== undefined && clientsSupportsNotes !== false) {
      try {
        return await base.update(id, { ...cleanPayload, notes: payload.notes })
      } catch (err) {
        if (isMissingNotesColumnError(err)) {
          clientsSupportsNotes = false
          return await base.update(id, cleanPayload)
        }
        throw err
      }
    }
    return await base.update(id, cleanPayload)
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
