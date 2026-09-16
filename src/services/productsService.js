import { supabase, isSupabaseConfigured } from '../lib/supabaseClient'
import { localDb } from '../lib/localDb'
import { createCrudService } from './crudFactory'

const base = createCrudService('products', { orderBy: 'name', ascending: true })

async function fetchRaw(productId) {
  if (isSupabaseConfigured) {
    const { data, error } = await supabase.from('products').select('*').eq('id', productId).single()
    if (error) throw error
    return data
  }
  const rows = localDb.getTable('products')
  const product = rows.find((p) => p.id === productId)
  if (!product) throw new Error('Producto no encontrado')
  return product
}

export const productsService = {
  ...base,

  // Igual que antes, pero ahora calcula el stock real de los productos
  // "combo": en vez de leer un stock guardado, lo calcula a partir del
  // stock del producto BASE dividido entre cuántas unidades base usa
  // cada combo. Así nunca se desincroniza.
  async list() {
    const raw = await base.list()
    return raw.map((p) => {
      if (p.is_kit && p.kit_component_id) {
        const component = raw.find((c) => c.id === p.kit_component_id)
        const kitQty = Number(p.kit_quantity) || 1
        const computedStock = component ? Math.floor(component.stock / kitQty) : 0
        return { ...p, stock: computedStock }
      }
      return p
    })
  },

  // Si el producto es un combo, en realidad ajusta el stock del producto
  // BASE (multiplicado por kit_quantity) — el combo no tiene stock propio,
  // "consume" piezas del producto base al venderse o moverse.
  async adjustStock(productId, delta) {
    const product = await fetchRaw(productId)

    if (product.is_kit && product.kit_component_id) {
      const kitQty = Number(product.kit_quantity) || 1
      return this.adjustStock(product.kit_component_id, delta * kitQty)
    }

    if (isSupabaseConfigured) {
      const { data, error } = await supabase
        .from('products')
        .update({ stock: product.stock + delta })
        .eq('id', productId)
        .select()
        .single()
      if (error) throw error
      return data
    }
    return localDb.update('products', productId, { stock: product.stock + delta })
  },

  async generateSku() {
    const products = await base.list()
    const numbers = products
      .map((p) => p.sku)
      .filter(Boolean)
      .map((sku) => parseInt(String(sku).replace(/\D/g, ''), 10))
      .filter((n) => !isNaN(n))
    const next = (numbers.length ? Math.max(...numbers) : 0) + 1
    return `PROD-${String(next).padStart(4, '0')}`
  },

  async uploadImage(file) {
    if (!file) return null
    if (isSupabaseConfigured) {
      const ext = file.name.split('.').pop()
      const path = `${crypto.randomUUID()}.${ext}`
      const { error } = await supabase.storage.from('product-images').upload(path, file, { cacheControl: '3600', upsert: false })
      if (error) throw error
      const { data } = supabase.storage.from('product-images').getPublicUrl(path)
      return data.publicUrl
    }
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result)
      reader.onerror = reject
      reader.readAsDataURL(file)
    })
  },
}
