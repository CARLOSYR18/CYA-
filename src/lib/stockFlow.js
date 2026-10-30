import { productsService } from '../services/productsService'
import { inventoryMovementsService } from '../services/inventoryMovementsService'

function normalize(text) {
  return (text || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
}

const STOCK_VERBS = '(?:anad\\w*|agreg\\w*|aument\\w*|ingres\\w*|sub\\w*|pon\\w*|carg\\w*|sum\\w*|repon\\w*|abastec\\w*)'
const STOCK_NOUNS = '(?:stock|inventario|unidades|unidad|mercaderia|existencias)'

const STOCK_TRIGGER_REGEX = new RegExp(
  `\\b${STOCK_VERBS}\\b[^?]{0,25}?\\b${STOCK_NOUNS}\\b|\\b${STOCK_NOUNS}\\b[^?]{0,15}?\\b${STOCK_VERBS}\\b|\\b(?:reponer|abastecer|sumar al stock|subir el stock)\\b`,
  'i'
)

export function isStockTrigger(text) {
  const norm = normalize(text)
  if (!norm) return false
  return STOCK_TRIGGER_REGEX.test(norm)
}

function searchProducts(products, query) {
  const q = normalize(query)
  if (!q || !products?.length) return []

  const direct = products.filter((p) => normalize(p.name).includes(q) || normalize(p.sku).includes(q))
  if (direct.length > 0) return direct.slice(0, 5)

  const stopWords = ['de', 'los', 'las', 'el', 'la', 'un', 'una', 'unos', 'unas', 'a', 'al', 'para']
  const tokens = q.split(/\s+/).filter((t) => t.length > 1 && !stopWords.includes(t))
  if (!tokens.length) return []

  const scored = []
  for (const p of products) {
    const normName = normalize(p.name)
    let score = 0
    for (const t of tokens) {
      if (normName.includes(t)) score += 2
    }
    if (score > 0) scored.push({ product: p, score })
  }
  scored.sort((a, b) => b.score - a.score)
  return scored.slice(0, 5).map((s) => s.product)
}

const WORD_NUMS = {
  un: 1, uno: 1, una: 1, dos: 2, tres: 3, cuatro: 4, cinco: 5,
  seis: 6, siete: 7, ocho: 8, nueve: 9, diez: 10, quince: 15,
  veinte: 20, cincuenta: 50, cien: 100,
}

// Procesa una orden para añadir o reponer stock
export async function processStockCommand(text, state = null) {
  const products = await productsService.list()
  let raw = text.trim()
  const norm = normalize(raw)
  if (norm === 'cancelar' || norm === 'cancel' || norm === 'salir') {
    return { handled: true, state: null, message: 'Operación cancelada. ¿En qué más te puedo colaborar?', options: [] }
  }

  // Si ya estábamos seleccionando entre varios candidatos
  if (state?.candidates && state.step === 'select_candidate') {
    const selected =
      state.candidates.find(
        (p) =>
          normalize(p.name) === norm ||
          normalize(`${p.name} (stock actual: ${p.stock})`) === norm ||
          norm.includes(normalize(p.name))
      ) || searchProducts(state.candidates, raw)[0]
    if (selected) {
      if (state.pendingQty && state.pendingQty > 0) {
        return executeStockAddition(selected, state.pendingQty)
      }
      return {
        handled: true,
        state: { step: 'awaiting_quantity', pendingProductId: selected.id },
        message: `¿Cuántas unidades deseas agregar a **${selected.name}**? (Stock actual: ${selected.stock} uds.)`,
        options: ['1', '5', '10', '20'],
      }
    }
  }

  // Si ya estábamos esperando cantidad para un producto pendiente
  if (state?.pendingProductId && state.step === 'awaiting_quantity') {
    const targetProduct = products.find((p) => p.id === state.pendingProductId)
    if (!targetProduct) {
      return { handled: true, state: null, message: 'Producto no encontrado.', options: [] }
    }
    const numMatch = norm.match(/\d+/)
    let qty = numMatch ? parseInt(numMatch[0], 10) : WORD_NUMS[norm] || 0
    if (!qty || qty <= 0) {
      return {
        handled: true,
        state,
        message: `Por favor indica un número válido de unidades para **${targetProduct.name}** (ejemplo: 5 o 10):`,
        options: ['1', '5', '10', '20'],
      }
    }
    return executeStockAddition(targetProduct, qty)
  }

  // 1. Extraer cantidad del texto si viene especificada
  // Ej: "añade 5 de stock...", "añade un stock...", "agrega 10 unidades..."
  let qty = null
  const numMatch = raw.match(/\b(\d+)\s*(?:unidades?|uds?|unds?|piezas?|items?|de\s+stock)?\b/i)
  if (numMatch) {
    qty = parseInt(numMatch[1], 10)
    raw = raw.replace(numMatch[0], ' ')
  } else {
    // Buscar palabras como "un stock", "dos unidades", etc.
    const wordMatch = norm.match(/\b(un|uno|una|dos|tres|cuatro|cinco|diez|veinte)\s+(?:stock|unidades?|de\s+stock)\b/i)
    if (wordMatch && WORD_NUMS[wordMatch[1]]) {
      qty = WORD_NUMS[wordMatch[1]]
      raw = raw.replace(new RegExp(wordMatch[0], 'i'), ' ')
    }
  }

  // 2. Limpiar verbos y palabras de stock para dejar solo el nombre del producto
  let query = raw
    .replace(new RegExp(`\\b${STOCK_VERBS}\\b`, 'gi'), ' ')
    .replace(new RegExp(`\\b${STOCK_NOUNS}\\b`, 'gi'), ' ')
    .replace(/\b(?:de|a|al|los|las|el|la|unos|unas|un|una|porfa|por favor|en|para)\b/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  if (!query) {
    return {
      handled: true,
      state: { step: 'select_product' },
      message: '¿A qué producto deseas agregar stock? Elige uno o escribe su nombre:',
      options: products.slice(0, 5).map((p) => p.name),
    }
  }

  const matches = searchProducts(products, query)

  if (matches.length === 0) {
    return {
      handled: true,
      state: null,
      message: `No encontré ningún producto que coincida con "${query}". Revisa el nombre o SKU en tu catálogo.`,
      options: products.slice(0, 4).map((p) => p.name),
    }
  }

  if (matches.length > 1) {
    return {
      handled: true,
      state: { step: 'select_candidate', candidates: matches, pendingQty: qty },
      message: `Encontré varios productos parecidos a "${query}". ¿A cuál deseas agregar stock?`,
      options: matches.map((p) => `${p.name} (stock actual: ${p.stock})`),
    }
  }

  const product = matches[0]

  // Si no tenemos cantidad, preguntamos
  if (!qty || qty <= 0) {
    return {
      handled: true,
      state: { step: 'awaiting_quantity', pendingProductId: product.id },
      message: `¿Cuántas unidades deseas agregar a **${product.name}**? (Stock actual: ${product.stock} uds.)`,
      options: ['1', '5', '10', '20'],
    }
  }

  return executeStockAddition(product, qty)
}

async function executeStockAddition(product, quantity) {
  try {
    await inventoryMovementsService.register({
      product_id: product.id,
      type: 'entrada',
      quantity,
      reason: 'Ajuste de stock por Asistente',
      reference: 'Asistente Virtual',
    })

    const updatedProducts = await productsService.list()
    const fresh = updatedProducts.find((p) => p.id === product.id)
    const newStock = fresh ? fresh.stock : product.stock + quantity

    return {
      handled: true,
      state: null,
      completed: true,
      productId: product.id,
      message:
        `✅ **¡Stock actualizado con éxito!**\n\n` +
        `• Producto: **${product.name}**\n` +
        `• Unidades añadidas: **+${quantity} uds.**\n` +
        `• Stock total disponible ahora: **${newStock} uds.**\n\n` +
        `¿Deseas realizar una venta de este producto ahora?`,
      options: [`Haz una venta de ${product.name}`, 'Consultar stock', 'Ver inventario'],
    }
  } catch (err) {
    console.error('Error al agregar stock:', err)
    return {
      handled: true,
      state: null,
      message: `Ocurrió un error al actualizar el stock: ${err.message || 'Error desconocido'}.`,
      options: [],
    }
  }
}
