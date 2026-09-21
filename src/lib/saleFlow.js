import { productsService } from '../services/productsService'
import { salesService } from '../services/salesService'

const money = (n) => `S/ ${Number(n).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

function normalize(text) {
  return (text || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim()
}

function searchProducts(products, query) {
  const q = normalize(query)
  if (!q || !products?.length) return []

  // 1. Coincidencia directa o por SKU
  const direct = products.filter((p) => normalize(p.name).includes(q) || normalize(p.sku).includes(q))
  if (direct.length > 0) return direct.slice(0, 5)

  // 2. Búsqueda tokenizada inteligente (separa números y sufijos ej. "3gen" -> "3 gen", "3ra")
  const cleanQ = q
    .replace(/(\d+)(gen|ra|da|va|ta|th|st|nd|rd)/g, '$1 $2')
    .replace(/[^a-z0-9\s]/g, ' ')

  const stopWords = ['de', 'los', 'las', 'el', 'la', 'un', 'una', 'unos', 'unas', 'con', 'para', 'en', 'por', 'del']
  const tokens = cleanQ.split(/\s+/).filter((t) => t.length > 0 && !stopWords.includes(t))

  if (tokens.length === 0) return []

  const scored = []
  for (const p of products) {
    const normName = normalize(p.name)
      .replace(/(\d+)(gen|ra|da|va|ta|th|st|nd|rd)/g, '$1 $2')
      .replace(/[^a-z0-9\s]/g, ' ')
    const normSku = normalize(p.sku).replace(/[^a-z0-9\s]/g, ' ')
    let score = 0
    const nameWords = normName.split(/\s+/)

    for (const t of tokens) {
      if (normName.includes(t)) {
        score += 3
      } else if (normSku.includes(t)) {
        score += 3
      } else if (nameWords.some((w) => w.startsWith(t) || t.startsWith(w))) {
        score += 2
      }
    }

    if (score >= Math.min(tokens.length * 2, 2)) {
      scored.push({ product: p, score })
    }
  }

  scored.sort((a, b) => b.score - a.score)
  return scored.slice(0, 5).map((item) => item.product)
}

const EXCLUDE_QUESTIONS = [
  /^(?:cuant[ao]s?|cual(?:es)?|que|como|por que|donde|cuando)\b/i,
  /\b(?:reporte|historial|resumen|estadistica|total de|cuanto fue|cuanto me|ventas de hoy|ventas de ayer|este mes|vencid[ao]s?|pendientes?|buscar|consultar|ver boleta|ver venta)\b/i,
]

const TRIGGER_PATTERNS = [
  // Generar / emitir / sacar / hacer / crear boleta, ticket, factura, recibo, comprobante
  /^(?:por favor\s+)?(?:generar|genera|generame|emitir|emite|emitirme|sacar|saca|sacame|hacer|haz|hazme|crear|crea|creame)\s+(?:una?\s+)?(?:boleta|ticket|factura|recibo|comprobante)(?:\s+de\s+venta)?(?:\s+(?:de|del|para|por|de\s+los|de\s+las|a))?\s*/i,

  // Boleta / ticket / factura de...
  /^(?:boleta|ticket|factura|recibo|comprobante)\s+(?:de|del|para|por|de\s+los|de\s+las)\s*/i,

  // Vender
  /^(?:por favor\s+)?(?:quiero\s+|voy a\s+)?vender(?:le)?(?:\s+(?:a|un|una|el|la|los|las))?\s*/i,
  /^(?:por favor\s+)?vende(?:le|me)?(?:\s+(?:a|un|una|el|la|los|las))?\s*/i,

  // Ventas
  /^(?:por favor\s+)?(?:hacer|haz|hazme|realizar|realiza|crear|crea|creame|registrar|registra|registrame)\s+(?:una\s+)?venta(?:\s+(?:de|del|para|por|de\s+los|de\s+las|a))?\s*/i,
  /^(?:nueva|nuevo)\s+venta(?:\s+(?:de|del|para|por))?\s*/i,

  // Cobrar
  /^(?:por favor\s+)?(?:cobrar|cobra|cobrame)\s*/i,
]

export function isSaleTrigger(text) {
  const normalized = normalize(text)
  if (!normalized) return false

  // Si es una pregunta de reporte o estadística, no es inicio de venta
  if (EXCLUDE_QUESTIONS.some((re) => re.test(normalized))) {
    return false
  }

  // Palabras directas
  if (['vender', 'venta', 'boleta', 'ticket', 'facturar', 'cobrar'].includes(normalized)) {
    return true
  }

  // Comprobar patrones de inicio
  if (TRIGGER_PATTERNS.some((re) => re.test(normalized))) {
    return true
  }

  // Órdenes directas de emisión de boleta o venta en cualquier posición
  if (/\b(?:genera|generar|haz|hacer|emite|emitir|crea|crear)\s+(?:una?\s+)?(?:boleta|ticket|factura|venta)\b/i.test(normalized)) {
    return true
  }

  return false
}

const emptyState = () => ({
  active: false,
  step: null,
  items: [],
  candidateProducts: [],
  pendingProduct: null,
  discount: 0,
  clientName: '',
  clientPhone: '',
})

export function newSaleFlowState() {
  return emptyState()
}

// Arranca el flujo de venta. Analiza descuentos, cantidades y productos desde el mensaje inicial.
export async function startSaleFlow(text) {
  const products = await productsService.list()
  let raw = text.trim()

  // 1. Extraer descuento del mensaje (ej: "con descuento de 10 soles", "con 10 soles de descuento")
  let initialDiscount = 0
  const discountRegexes = [
    /\b(?:con\s+)?(?:un\s+)?descuento\s+(?:de\s+)?(?:s\/?\.?\s*)?(\d+(?:[.,]\d+)?)\s*(?:soles|so|s)?\b/i,
    /\bcon\s+(?:s\/?\.?\s*)?(\d+(?:[.,]\d+)?)\s*(?:soles|so|s)?\s+de\s+descuento\b/i,
    /\bdescuento:?\s*(?:s\/?\.?\s*)?(\d+(?:[.,]\d+)?)\b/i,
  ]
  for (const re of discountRegexes) {
    const match = raw.match(re)
    if (match) {
      initialDiscount = parseFloat(match[1].replace(',', '.')) || 0
      raw = raw.replace(match[0], ' ')
      break
    }
  }

  // 2. Limpiar el prefijo disparador
  let query = raw
  for (const re of TRIGGER_PATTERNS) {
    query = query.replace(re, '')
  }
  query = query.replace(/\b(?:genera|generar|haz|hacer|emite|emitir|crea|crear)\s+(?:una?\s+)?(?:boleta|ticket|factura|venta)(?:\s+(?:de\s+venta|de\s+los|de\s+las|del|de\s+la|de|para|a))?\b/gi, '')
  query = query.trim()

  // Limpiar artículos iniciales
  query = query.replace(/^(?:de\s+los|de\s+las|del|de\s+la|de|los|las|el|la|unos|unas|un|una)\s+/i, '').trim()

  // 3. Extraer cantidad si viene al inicio (ej: "2 airpods")
  let initialQty = null
  const qtyMatch = query.match(/^(\d+)\s*(?:unidades?|unds?|uds?|x)?\s+(?:de\s+)?(.+)$/i)
  if (qtyMatch) {
    initialQty = parseInt(qtyMatch[1], 10)
    query = qtyMatch[2].trim()
  }

  // Limpiar palabras de cortesía
  query = query.replace(/\b(?:por favor|gracias|plz|pls)\b/gi, '').trim()

  if (!query) {
    return {
      state: { ...emptyState(), active: true, step: 'select_product', discount: initialDiscount },
      message: '¡Vamos a registrar una venta! ¿Qué producto deseas vender? Escribe el nombre o el SKU.',
      options: products.filter((p) => p.stock > 0).slice(0, 4).map((p) => `${p.name} (stock: ${p.stock})`),
    }
  }

  const matches = searchProducts(products, query)
  if (matches.length === 0) {
    const available = products.filter((p) => p.stock > 0).slice(0, 4)
    return {
      state: { ...emptyState(), active: true, step: 'select_product', discount: initialDiscount },
      message: `No encontré ningún producto parecido a "${query}". Intenta escribir el nombre exacto o el SKU.${available.length ? '\n\nO elige uno de tus productos en stock:' : ''}`,
      options: available.map((p) => `${p.name} (stock: ${p.stock})`),
    }
  }

  if (matches.length === 1) {
    const prod = matches[0]
    // Si el usuario ya especificó cantidad (ej: "vender 2 airpods")
    if (initialQty && initialQty > 0) {
      if (initialQty > prod.stock) {
        return {
          state: { ...emptyState(), active: true, step: 'select_quantity', pendingProduct: prod, discount: initialDiscount },
          message: `Solo hay ${prod.stock} unidades de "${prod.name}" disponibles. ¿Cuántas deseas registrar?`,
          options: [String(prod.stock)],
        }
      }
      const item = {
        product_id: prod.id,
        name: prod.name,
        quantity: initialQty,
        unit_price: prod.sale_price,
      }
      return {
        state: {
          ...emptyState(),
          active: true,
          items: [item],
          discount: initialDiscount,
          step: initialDiscount > 0 ? 'client_name' : 'more_items',
        },
        message: `Agregado: ${initialQty} x ${item.name} (${money(initialQty * item.unit_price)}).${initialDiscount > 0 ? `\nDescuento registrado: ${money(initialDiscount)}.` : ''}\n\n${initialDiscount > 0 ? '¿A nombre de quién es la venta?' : '¿Deseas agregar otro producto?'}`,
        options: initialDiscount > 0 ? [] : ['Sí, agregar otro', 'No, continuar'],
      }
    }

    return selectProduct({ ...emptyState(), active: true, discount: initialDiscount }, prod)
  }

  return {
    state: { ...emptyState(), active: true, step: 'select_product', candidateProducts: matches, discount: initialDiscount },
    message: `Encontré varios productos parecidos a "${query}". ¿Cuál quieres vender?`,
    options: matches.map((p) => `${p.name} (stock: ${p.stock})`),
  }
}

function selectProduct(state, product) {
  if (product.stock <= 0) {
    return {
      state: { ...state, step: 'select_product', candidateProducts: [] },
      message: `"${product.name}" está agotado (0 unidades). ¿Qué otro producto deseas vender?`,
      options: [],
    }
  }
  const maxQuick = Math.min(product.stock, 3)
  const quickOptions = []
  for (let i = 1; i <= maxQuick; i++) quickOptions.push(String(i))

  return {
    state: { ...state, step: 'select_quantity', pendingProduct: product, candidateProducts: [] },
    message: `${product.name} — S/ ${Number(product.sale_price).toFixed(2)} c/u. ¿Cuántas unidades? (Disponibles: ${product.stock})${state.discount > 0 ? `\n(Descuento registrado: ${money(state.discount)})` : ''}`,
    options: quickOptions,
  }
}

// Procesa cada mensaje del usuario mientras el flujo está activo.
export async function processSaleFlowInput(state, text, userId) {
  const normalized = normalize(text)
  if (normalized === 'cancelar' || normalized === 'cancel' || normalized === 'salir') {
    return { state: emptyState(), message: 'Venta cancelada. ¿Te ayudo con algo más?', options: [], completed: null }
  }

  switch (state.step) {
    case 'select_product': {
      const products = await productsService.list()
      const matches = state.candidateProducts.length
        ? state.candidateProducts.filter((p) => normalize(`${p.name} (stock: ${p.stock})`) === normalized || normalize(p.name) === normalized)
        : searchProducts(products, text)

      if (matches.length === 1) return { ...selectProduct(state, matches[0]), completed: null }
      if (matches.length > 1) {
        return {
          state: { ...state, candidateProducts: matches },
          message: '¿Cuál de estos productos?',
          options: matches.map((p) => `${p.name} (stock: ${p.stock})`),
          completed: null,
        }
      }
      return { state, message: `No encontré "${text}". Intenta con otro nombre o el SKU.`, options: [], completed: null }
    }

    case 'select_quantity': {
      const qty = parseInt(text.replace(/\D/g, ''), 10)
      if (!qty || qty <= 0) {
        return { state, message: 'Escribe solo el número de unidades, por ejemplo: 2', options: ['1', '2', '3'], completed: null }
      }
      if (qty > state.pendingProduct.stock) {
        return {
          state, message: `Solo hay ${state.pendingProduct.stock} unidades disponibles. ¿Cuántas deseas?`,
          options: [String(state.pendingProduct.stock)], completed: null,
        }
      }
      const item = {
        product_id: state.pendingProduct.id,
        name: state.pendingProduct.name,
        quantity: qty,
        unit_price: state.pendingProduct.sale_price,
      }
      const items = [...state.items, item]
      return {
        state: { ...state, items, pendingProduct: null, step: 'more_items' },
        message: `Agregado: ${qty} x ${item.name} (${money(qty * item.unit_price)}). ¿Deseas agregar otro producto?`,
        options: ['Sí, agregar otro', 'No, continuar'],
        completed: null,
      }
    }

    case 'more_items': {
      if (/^s/i.test(normalized)) {
        return { state: { ...state, step: 'select_product' }, message: '¿Qué otro producto deseas vender?', options: [], completed: null }
      }
      // Si ya teníamos un descuento extraído desde el inicio (ej. "con descuento de 10 soles"):
      if (state.discount > 0) {
        return {
          state: { ...state, step: 'client_name' },
          message: `Descuento aplicado: ${money(state.discount)}.\n\n¿A nombre de quién es la venta?`,
          options: [],
          completed: null,
        }
      }
      return {
        state: { ...state, step: 'discount' },
        message: '¿Deseas aplicar algún descuento? Escribe el monto en soles, o "no".',
        options: ['No aplicar descuento'],
        completed: null,
      }
    }

    case 'discount': {
      const discount = /^no/i.test(normalized) ? 0 : (parseFloat(text.replace(',', '.').replace(/[^\d.]/g, '')) || 0)
      return {
        state: { ...state, discount, step: 'client_name' },
        message: '¿A nombre de quién es la venta?',
        options: [],
        completed: null,
      }
    }

    case 'client_name': {
      if (!text.trim()) return { state, message: 'Escribe el nombre del cliente.', options: [], completed: null }
      return {
        state: { ...state, clientName: text.trim(), step: 'client_phone' },
        message: '¿Teléfono o DNI del cliente? (opcional, escribe "omitir" si no aplica)',
        options: ['Omitir'],
        completed: null,
      }
    }

    case 'client_phone': {
      const phone = /^(omitir|no|ninguno|skip)$/i.test(normalized) ? '' : text.trim()
      const subtotal = state.items.reduce((sum, it) => sum + it.quantity * it.unit_price, 0)
      const total = Math.max(subtotal - state.discount, 0)
      const summary = state.items.map((it) => `• ${it.quantity} x ${it.name} — ${money(it.quantity * it.unit_price)}`).join('\n')
      return {
        state: { ...state, clientPhone: phone, step: 'confirm' },
        message: `Resumen de la venta:\n\n${summary}\n\nSubtotal: ${money(subtotal)}${state.discount > 0 ? `\nDescuento: -${money(state.discount)}` : ''}\nTotal: ${money(total)}\nCliente: ${state.clientName}${phone ? `\nContacto: ${phone}` : ''}\n\n¿Confirmo la venta?`,
        options: ['Confirmar venta', 'Cancelar'],
        completed: null,
      }
    }

    case 'confirm': {
      if (!/^conf/i.test(normalized) && !/^s[ií]/i.test(normalized) && normalized !== 'ok' && normalized !== 'aceptar') {
        return { state: emptyState(), message: 'Venta cancelada. ¿Te ayudo con algo más?', options: [], completed: null }
      }
      const sale = await salesService.create({
        client_name: state.clientName,
        client_phone: state.clientPhone || null,
        user_id: userId,
        status: 'pagado',
        items: state.items,
        discount: state.discount,
      })
      return {
        state: emptyState(),
        message: '¡Venta registrada con éxito! Aquí está tu boleta:',
        options: [],
        completed: sale,
      }
    }

    default:
      return { state: emptyState(), message: '¿En qué te ayudo?', options: [], completed: null }
  }
}
