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

// Saludos / muletillas al inicio que no aportan a la intención
const LEADING_FILLER = /^(?:(?:hola|buenas noches|buenas tardes|buenos dias|buenas|hey|oye|ok|bueno|mira|a ver|porfa|por favor|asistente|bot|ayudame a|ayudame|quiero que|necesito que|puedes|podrias|me puedes|me podrias|k)\b[,\s]*)+/i

const SALE_NOUN = '(?:venta|ventas|benta|bentas|evento|eventos|eventa|boleta|boletas|ticket|factura|recibo|comprobante|pedido|despacho)'
const SALE_VERB = '(?:hac(?:er|e|es)|hag\\w*|haz|has|hazme|realiz\\w*|registr\\w*|cre(?:ar|a|e|ame)\\w*|gener\\w*|emit\\w*|sac\\w*|ingres\\w*|anot\\w*|apunt\\w*|proces\\w*|quiero|necesito|vamos a|vamos con|se vendio|vender|vende\\w*|cobr\\w*|facturar)'

// Intención de iniciar una venta en cualquier parte de la frase (tolera errores como "has una venta" o "quiero hacer un evento")
const FLEX_SALE_INTENT = new RegExp(`\\b${SALE_VERB}\\b[^?]{0,25}\\b${SALE_NOUN}\\b|\\b(?:nueva|nuevo|otra|otro)\\s+${SALE_NOUN}\\b|\\b(?:una|la|un)\\s+${SALE_NOUN}\\b`, 'i')

export function isSaleTrigger(text) {
  let normalized = normalize(text).replace(/[¿?¡!.,;:]+/g, ' ').replace(/\s+/g, ' ').trim()
  if (!normalized) return false

  // Quitar saludos iniciales para que "hola has una venta" sea evaluado como "has una venta"
  normalized = normalized.replace(LEADING_FILLER, '').trim()
  if (!normalized) return false

  if (FLEX_SALE_INTENT.test(normalized) && !EXCLUDE_QUESTIONS.some((re) => re.test(normalized))) {
    return true
  }

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

// Detecta si el mensaje del usuario confirma la venta (para mostrar la animación de generación)
export function isSaleConfirmation(text) {
  const n = normalize(text)
  return /^conf/i.test(n) || /^si\b/i.test(n) || n === 'ok' || n === 'aceptar' || n === 'dale' || n === 'listo'
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

// Pregunta por el cliente solo si aún no se conoce (ej. ya lo dijo en el primer mensaje)
function askClientStep(state, prefix = '') {
  if (state.clientName) {
    return {
      state: { ...state, step: 'client_phone' },
      message: `${prefix}Cliente: ${state.clientName}. ¿Teléfono o DNI? (opcional, escribe "omitir" si no aplica)`,
      options: ['Omitir'],
      completed: null,
    }
  }
  return {
    state: { ...state, step: 'client_name' },
    message: `${prefix}¿A nombre de quién es la venta?`,
    options: [],
    completed: null,
  }
}

// Arranca el flujo de venta (envoltorio que conserva el cliente dicho en el primer mensaje).
export async function startSaleFlow(text) {
  const clientMatch = (text || '').match(/\b(?:a nombre de|para el cliente|al cliente|cliente)\s+([A-Za-záéíóúÁÉÍÓÚñÑ]+(?:\s+[A-Za-záéíóúÁÉÍÓÚñÑ]+)?)\s*$/i)
  const presetClient = clientMatch ? clientMatch[1].trim() : ''
  const cleanText = clientMatch ? text.replace(clientMatch[0], ' ') : text
  const result = await startSaleFlowInner(cleanText)
  if (presetClient && result?.state) {
    result.state = { ...result.state, clientName: presetClient }
    if (result.state.step === 'client_name') {
      const next = askClientStep(result.state, `${result.message}\n\n`)
      return { ...result, ...next }
    }
  }
  return result
}

async function startSaleFlowInner(text) {
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

  // 2. Limpiar la frase disparadora (primero la frase flexible, luego los patrones fijos)
  let query = raw.replace(LEADING_FILLER, '').trim()
  query = query.replace(new RegExp(`\\b${SALE_VERB}\\b[^?]{0,25}?\\b${SALE_NOUN}\\b(?:\\s+(?:de|del|para|por|a))?`, 'i'), ' ').trim()
  for (const re of TRIGGER_PATTERNS) {
    query = query.replace(re, '')
  }
  query = query.replace(/\b(?:genera|generar|haz|hacer|emite|emitir|crea|crear)\s+(?:una?\s+)?(?:boleta|ticket|factura|venta)(?:\s+(?:de\s+venta|de\s+los|de\s+las|del|de\s+la|de|para|a))?\b/gi, '')
  query = query.replace(/\b(?:una|la|nueva|nuevo|otra|un)\s+(?:venta|evento|eventa|benta)\b/gi, ' ')
  // Verbos o muletillas sueltas que no son un producto (ej. "quiero", "hacer", "una", "evento")
  query = query.replace(/^(?:(?:hola|buenas|por favor|porfa|quiero|necesito|vamos a|voy a|hacer|haz|has|hazme|una|un|venta|evento|vender|vende|registrar|realizar|crear|generar|emitir|nueva|nuevo|otra|otro|boleta|ticket|k|que)\b[,\s]*)+/i, '').replace(/\s+/g, ' ').trim()

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
    return catalogStep({ ...emptyState(), active: true, discount: initialDiscount }, products, '¡Vamos a registrar una venta! Elige el producto que deseas vender 👇')
  }

  const matches = searchProducts(products, query)
  if (matches.length === 0) {
    return catalogStep(
      { ...emptyState(), active: true, discount: initialDiscount },
      products,
      `No encontré "${query}". Elige uno de tus productos 👇`
    )
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
    options: matches.map(optLabel),
  }
}

// Etiqueta que se muestra en el botón de cada producto
function optLabel(p) {
  return `${p.name} — ${money(p.sale_price)} · stock: ${p.stock}`
}

// Muestra todos los productos con stock (leídos de la base de datos) como botones
function catalogStep(state, products, message) {
  const available = (products || []).filter((p) => !p.is_kit_hidden && Number(p.stock) > 0)
  if (available.length === 0) {
    return {
      state: emptyState(),
      message: 'No tienes productos con stock disponible para vender en este momento. ¿Deseas que añada stock a algún producto?',
      options: ['Añadir stock', 'Ver inventario'],
    }
  }
  return {
    state: { ...state, step: 'select_product', candidateProducts: available },
    message,
    options: available.map(optLabel),
  }
}

function selectProduct(state, product) {
  if (product.stock <= 0) {
    return {
      state: emptyState(),
      message: `"${product.name}" está agotado (0 unidades). Como tu empleado, puedo reponerlo ahora mismo. ¿Cuánto stock deseas añadir?`,
      options: [
        `Añade 5 de stock a ${product.name}`,
        `Añade 10 de stock a ${product.name}`,
        `Añade 20 de stock a ${product.name}`,
      ],
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
      const exact = (state.candidateProducts || []).filter(
        (p) => normalize(optLabel(p)) === normalized || normalize(p.name) === normalized
      )
      const matches = exact.length ? exact : searchProducts(products, text)

      if (matches.length === 1) return { ...selectProduct(state, matches[0]), completed: null }
      if (matches.length > 1) {
        return {
          state: { ...state, candidateProducts: matches },
          message: '¿Cuál de estos productos?',
          options: matches.map(optLabel),
          completed: null,
        }
      }
      return { ...catalogStep(state, products, `No encontré "${text}". Elige uno de tus productos 👇`), completed: null }
    }

    case 'select_quantity': {
      const WORD_NUMS = { un: 1, uno: 1, una: 1, dos: 2, tres: 3, cuatro: 4, cinco: 5, seis: 6, siete: 7, ocho: 8, nueve: 9, diez: 10 }
      const qty = WORD_NUMS[normalized] || parseInt(text.replace(/\D/g, ''), 10)
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
        return { ...catalogStep(state, await productsService.list(), 'Elige el otro producto 👇'), completed: null }
      }
      // Si ya teníamos un descuento extraído desde el inicio (ej. "con descuento de 10 soles"):
      if (state.discount > 0) {
        return askClientStep(state, `Descuento aplicado: ${money(state.discount)}.\n\n`)
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
      return askClientStep({ ...state, discount })
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
      if (!isSaleConfirmation(text)) {
        return { state: emptyState(), message: 'Venta cancelada. ¿Te ayudo con algo más?', options: [], completed: null }
      }
      let sale
      try {
        sale = await salesService.create({
          client_name: state.clientName,
          client_phone: state.clientPhone || null,
          user_id: userId,
          status: 'pagado',
          items: state.items,
          discount: state.discount,
        })
      } catch (err) {
        return {
          state: emptyState(),
          message: `No pude registrar la venta: ${err?.message || 'error desconocido'}. Intenta de nuevo.`,
          options: [],
          completed: null,
        }
      }
      return {
        state: emptyState(),
        message: '✅ Boleta realizada por el asistente. Aquí la tienes:',
        options: [],
        completed: sale,
      }
    }

    default:
      return { state: emptyState(), message: '¿En qué te ayudo?', options: [], completed: null }
  }
}
