import { supabase, isSupabaseConfigured } from '../lib/supabaseClient'
import { localDb } from '../lib/localDb'
import { createCrudService } from './crudFactory'

const base = createCrudService('products', { orderBy: 'name', ascending: true })
let storageUploadAvailable = null

function fileToOptimizedDataUrl(file, maxDim = 800, quality = 0.85) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('No se pudo leer el archivo de imagen'))
    reader.onload = (e) => {
      const img = new Image()
      img.onerror = () => resolve({ blob: file, dataUrl: e.target.result, mime: file.type || 'image/jpeg' })
      img.onload = () => {
        let { width, height } = img
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width)
            width = maxDim
          } else {
            width = Math.round((width * maxDim) / height)
            height = maxDim
          }
        }
        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')
        ctx.drawImage(img, 0, 0, width, height)
        const isTransparentType = file.type === 'image/png' || file.type === 'image/webp'
        const mime = isTransparentType ? 'image/webp' : 'image/jpeg'
        const dataUrl = canvas.toDataURL(mime, quality)
        canvas.toBlob(
          (blob) => resolve({ blob: blob || file, dataUrl, mime }),
          mime,
          quality
        )
      }
      img.src = e.target.result
    }
    reader.readAsDataURL(file)
  })
}

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

  // Obtener productos cacheados de inmediato (0ms) con combos calculados
  getCached() {
    const raw = base.getCached()
    if (!raw) return null
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

  // Igual que antes, pero ahora calcula el stock real de los productos
  // "combo": en vez de leer un stock guardado, lo calcula a partir del
  // stock del producto BASE dividido entre cuántas unidades base usa
  // cada combo. Así nunca se desincroniza.
  async list(options) {
    const raw = await base.list(options)
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
      base.invalidate()
      return data
    }
    const updated = localDb.update('products', productId, { stock: product.stock + delta })
    base.invalidate()
    return updated
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
    if (!file.type?.startsWith('image/')) {
      throw new Error('El archivo seleccionado no es una imagen válida')
    }

    const { blob, dataUrl, mime } = await fileToOptimizedDataUrl(file)

    if (isSupabaseConfigured && storageUploadAvailable !== false) {
      try {
        const ext = mime === 'image/webp' ? 'webp' : 'jpg'
        const path = `${crypto.randomUUID()}.${ext}`
        const { error } = await supabase.storage
          .from('product-images')
          .upload(path, blob, { cacheControl: '3600', upsert: false, contentType: mime })
        if (!error) {
          storageUploadAvailable = true
          const { data } = supabase.storage.from('product-images').getPublicUrl(path)
          if (data?.publicUrl) return data.publicUrl
        } else {
          storageUploadAvailable = false
          console.warn('Bucket product-images no disponible, usando imagen optimizada:', error.message)
        }
      } catch (err) {
        storageUploadAvailable = false
        console.warn('Fallback de imagen de producto a DataURL:', err?.message || err)
      }
    }

    return dataUrl
  },
}
