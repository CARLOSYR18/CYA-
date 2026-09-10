import { supabase, isSupabaseConfigured } from '../lib/supabaseClient'
import { localDb } from '../lib/localDb'
import { createCrudService } from './crudFactory'

const base = createCrudService('products', { orderBy: 'name', ascending: true })

export const productsService = {
  ...base,

  // Adds (positive) or removes (negative) stock for a product.
  async adjustStock(productId, delta) {
    if (isSupabaseConfigured) {
      const { data: product, error: readErr } = await supabase
        .from('products')
        .select('stock')
        .eq('id', productId)
        .single()
      if (readErr) throw readErr
      const { data, error } = await supabase
        .from('products')
        .update({ stock: product.stock + delta })
        .eq('id', productId)
        .select()
        .single()
      if (error) throw error
      return data
    }
    const rows = localDb.getTable('products')
    const product = rows.find((p) => p.id === productId)
    if (!product) throw new Error('Producto no encontrado')
    return localDb.update('products', productId, { stock: product.stock + delta })
  },
}
