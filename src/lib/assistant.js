import { salesService } from '../services/salesService'
import { productsService } from '../services/productsService'
import { purchasesService } from '../services/purchasesService'
import { clientsService } from '../services/clientsService'
import { categoriesService } from '../services/categoriesService'
import { suppliersService } from '../services/suppliersService'
import { inventoryMovementsService } from '../services/inventoryMovementsService'
import { companySettingsService } from '../services/companySettingsService'
import { planService } from '../services/planService'
import { assistantUsageService } from '../services/assistantUsageService'
import { getLimits } from './planLimits'
import { getNotifications } from './notifications'
import { getClientsHistory } from './clientHistory'

const money = (n) =>
  `S/ ${Number(n || 0).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

function normalize(text) {
  if (!text) return ''
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // quita tildes
    .replace(/[¿?¡!.,:;()_#+*~^$[\]{}"'`\\/<>@=-]/g, ' ') // limpia puntuación
    .replace(/\s+/g, ' ') // colapsa espacios
    .trim()
}

function getTimeGreeting() {
  const hour = new Date().getHours()
  if (hour >= 5 && hour < 12) return 'Buenos días'
  if (hour >= 12 && hour < 19) return 'Buenas tardes'
  return 'Buenas noches'
}

function isToday(dateStr) {
  if (!dateStr) return false
  const d = new Date(dateStr)
  const now = new Date()
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  )
}

function isYesterday(dateStr) {
  if (!dateStr) return false
  const d = new Date(dateStr)
  const y = new Date()
  y.setDate(y.getDate() - 1)
  return (
    d.getFullYear() === y.getFullYear() &&
    d.getMonth() === y.getMonth() &&
    d.getDate() === y.getDate()
  )
}

function isThisWeek(dateStr) {
  if (!dateStr) return false
  const d = new Date(dateStr)
  const now = new Date()
  const diffDays = (now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24)
  return diffDays >= 0 && diffDays <= 7
}

function isThisMonth(dateStr) {
  if (!dateStr) return false
  const d = new Date(dateStr)
  const now = new Date()
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()
}

function isLastMonth(dateStr) {
  if (!dateStr) return false
  const d = new Date(dateStr)
  const now = new Date()
  const prevMonth = now.getMonth() === 0 ? 11 : now.getMonth() - 1
  const prevYear = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear()
  return d.getFullYear() === prevYear && d.getMonth() === prevMonth
}

function isThisYear(dateStr) {
  if (!dateStr) return false
  const d = new Date(dateStr)
  const now = new Date()
  return d.getFullYear() === now.getFullYear()
}

function formatDate(dateStr) {
  if (!dateStr) return 'N/D'
  try {
    const d = new Date(dateStr)
    return d.toLocaleDateString('es-PE', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return dateStr
  }
}

// ─── GESTIÓN DE MEMORIA CONVERSACIONAL (NOMBRE DE USUARIO Y EMPRESA) ───
const USER_NAME_KEY = 'cya_assistant_userName'

export function getStoredUserName(user) {
  try {
    const saved = localStorage.getItem(USER_NAME_KEY)
    if (saved && saved.trim() && !saved.includes('@')) return saved.trim()
  } catch {}
  if (user?.full_name) {
    const first = user.full_name.trim().split(/\s+/)[0]
    if (first && first.length >= 2 && !first.includes('@')) return first
  }
  return ''
}

export function setStoredUserName(name) {
  if (!name) return ''
  const clean = name.trim().charAt(0).toUpperCase() + name.trim().slice(1)
  try {
    localStorage.setItem(USER_NAME_KEY, clean)
  } catch {}
  return clean
}

function extractSelfIntroduction(text) {
  if (!text) return null
  const cleaned = text.trim()
  const patterns = [
    /\b(?:me\s+llamo)\s+([a-zA-ZáéíóúÁÉÍÓÚñÑ]{2,20})\b/i,
    /\b(?:mi\s+nombre\s+es)\s+([a-zA-ZáéíóúÁÉÍÓÚñÑ]{2,20})\b/i,
    /\b(?:soy)\s+([a-zA-ZáéíóúÁÉÍÓÚñÑ]{2,20})\b/i,
    /\b(?:llamame|dime)\s+([a-zA-ZáéíóúÁÉÍÓÚñÑ]{2,20})\b/i,
  ]
  for (const regex of patterns) {
    const match = cleaned.match(regex)
    if (match && match[1]) {
      const candidate = match[1].toLowerCase()
      const forbidden = new Set(['el', 'la', 'un', 'una', 'nuevo', 'bien', 'bueno', 'asistente', 'bot', 'admin', 'usuario', 'empleado', 'cliente'])
      if (!forbidden.has(candidate)) {
        return candidate.charAt(0).toUpperCase() + candidate.slice(1)
      }
    }
  }
  return null
}

// ─── REGLAS DE INTENCIÓN (INTENT RULES) ───
// Cada regla evalúa si el texto normalizado contiene alguno de sus disparadores (triggers)
// y recibe el contexto (userName, companyName, user)
const intentRules = [
  // ─── 1. SALUDOS & CONVERSACIÓN BÁSICA ───
  {
    name: 'greeting',
    triggers: [
      'hola', 'buenas', 'buenos dias', 'buenas tardes', 'buenas noches', 'buen dia',
      'hey', 'hello', 'hi', 'holis', 'que tal', 'saludos', 'que hubo', 'que hay',
      'alo', 'oe', 'habla', 'buenas noches asistente', 'hola asistente', 'buenas asistente',
    ],
    handler: async (ctx) => {
      const greeting = getTimeGreeting()
      const company = ctx?.companyName || 'CYA STORE'
      const userGreeting = ctx?.userName ? `, ${ctx.userName}` : ''
      return `¡Hola${userGreeting}! ${greeting} 👋\n\nSoy tu Asistente Virtual inteligente de **${company}**. Estoy conectado en tiempo real con todas las operaciones de tu negocio.\n\nPuedes consultarme sobre:\n• 📊 Ventas de hoy, ayer, la semana o el mes en ${company}\n• 🏆 ¿Cuál es el producto más vendido? o ¿cuál se vende menos?\n• 📦 Stock de productos, agotados o stock bajo\n• 💰 Cuentas por cobrar y deudas vencidas\n• 👥 Mejor cliente o historial comercial\n• 📈 Valor monetario total de tu inventario\n• 💎 Planes y suscripciones de ${company}\n• 💡 Estrategias para aumentar ventas y ganancias\n\n¿En qué te puedo colaborar hoy${userGreeting}?`
    },
  },
  {
    name: 'how_are_you',
    triggers: [
      'como estas', 'como te va', 'como andas', 'que tal todo', 'como vas',
      'todo bien', 'que haces', 'que haces hoy',
    ],
    handler: async (ctx) => {
      const company = ctx?.companyName || 'CYA STORE'
      const userGreeting = ctx?.userName ? ` ${ctx.userName}` : ''
      return `¡Excelente y con toda la energía${userGreeting}! 🚀 Monitoreando las ventas, inventario y operaciones de **${company}** en tiempo real para que tu negocio crezca con fuerza. ¿Qué te gustaría revisar hoy?`
    },
  },
  {
    name: 'gratitude',
    triggers: [
      'gracias', 'muchas gracias', 'mil gracias', 'te agradezco', 'muy amable',
      'vale gracias', 'ok gracias', 'perfecto gracias', 'buena voz', 'thanks', 'genial gracias',
    ],
    handler: async (ctx) => {
      const company = ctx?.companyName || 'CYA STORE'
      const userGreeting = ctx?.userName ? ` ${ctx.userName}` : ''
      return `¡De nada${userGreeting}! Ha sido un placer apoyarte en **${company}**. 😊 Si necesitas consultar cualquier otro dato o métrica comercial, aquí estaré listo 24/7.`
    },
  },
  {
    name: 'farewell',
    triggers: [
      'adios', 'chao', 'chau', 'hasta luego', 'nos vemos', 'bye', 'hasta pronto',
      'cuidate', 'hasta manana', 'me voy', 'cerrar',
    ],
    handler: async () => {
      return '¡Hasta luego! 👋 Que tengas un día muy productivo y lleno de ventas. Recuerda que puedes abrir el chat en cualquier momento si necesitas apoyo.'
    },
  },
  {
    name: 'affirmation',
    exactOnly: true,
    triggers: [
      'ok', 'vale', 'listo', 'entendido', 'perfecto', 'genial', 'excelente',
      'de acuerdo', 'dale', 'chevere', 'ya', 'ok listo', 'ok gracias', 'ok entendido',
      'todo ok', 'ok perfecto', 'ok chevere', 'ok dale', 'esta bien', 'ta bien',
    ],
    handler: async (ctx) => {
      const company = ctx?.companyName || 'CYA STORE'
      const userGreeting = ctx?.userName ? ` ${ctx.userName}` : ''
      return `¡Perfecto${userGreeting}! Quedo a tu disposición en **${company}** si deseas revisar otro reporte o hacer cualquier consulta comercial. 👍`
    },
  },
  {
    name: 'compliment',
    triggers: [
      'eres inteligente', 'buen bot', 'buen asistente', 'crack', 'bien hecho',
      'buen trabajo', 'capo', 'gran trabajo', 'felicidades', 'me gusta', 'lo haces bien',
    ],
    handler: async () => {
      return '¡Muchas gracias por tus palabras! 🌟 Trabajo continuamente con los datos de tu ERP para darte respuestas precisas y ayudarte a tomar mejores decisiones comerciales.'
    },
  },
  {
    name: 'identity',
    triggers: [
      'quien eres', 'como te llamas', 'cual es tu nombre', 'que eres', 'presentate',
      'quien te creo', 'de donde eres', 'eres humano', 'eres una ia', 'eres bot',
    ],
    handler: async () => {
      return `Soy el Asistente Virtual Inteligente de CYA STORE 🤖.\n\nFui diseñado para ayudarte a supervisar y controlar tu negocio en segundos, leyendo tus ventas, productos, clientes, movimientos de inventario y compras en tiempo real.\n\n¡No tienes que navegar por menús complejos cuando puedes simplemente preguntarme!`
    },
  },
  {
    name: 'help_menu',
    triggers: [
      'ayuda', 'comandos', 'menu', 'opciones', 'que puedes hacer', 'que sabes hacer',
      'como me ayudas', 'que te puedo preguntar', 'que funciones tienes', 'help', 'instrucciones',
    ],
    handler: async () => {
      return `📋 **¿Qué me puedes preguntar? Aquí tienes ejemplos reales:**\n\n` +
        `💼 **Ventas:**\n` +
        `• "¿Cuánto vendí hoy?" o "¿Ventas de ayer?"\n` +
        `• "¿Cuánto llevo este mes?" o "¿Ventas de esta semana?"\n` +
        `• "¿Cuál es mi producto más vendido?"\n` +
        `• "¿Cuál fue la última venta?"\n` +
        `• "¿Cuál es el ticket promedio?"\n\n` +
        `📦 **Inventario:**\n` +
        `• "¿Qué productos tienen stock bajo?"\n` +
        `• "¿Qué productos están agotados?"\n` +
        `• "¿Cuánto vale mi inventario?" (valorización en S/)\n` +
        `• "¿Tienes [nombre del producto]?" o "¿Precio de [producto]?"\n` +
        `• "¿Qué combos o kits tengo?"\n\n` +
        `💰 **Cobranzas y Deudas:**\n` +
        `• "¿Cuánto me deben?" o "¿Ventas pendientes?"\n` +
        `• "¿Qué ventas están vencidas?"\n\n` +
        `👥 **Clientes y Proveedores:**\n` +
        `• "¿Quién es mi mejor cliente?"\n` +
        `• "¿Cuánto ha comprado [nombre de cliente]?"\n` +
        `• "¿Qué compras tengo pendientes de recibir?"\n` +
        `• "¿Lista de proveedores?"\n\n` +
        `📖 **Guías ERP:**\n` +
        `• "¿Cómo hacer una venta?", "¿Cómo compartir recibo por WhatsApp?", etc.`
    },
  },

  // ─── 2. VENTAS (SALES METRICS) ───
  {
    name: 'sales_today',
    triggers: [
      'vendi hoy', 'venta de hoy', 'ventas de hoy', 'genere hoy', 'facture hoy',
      'cuanto vendi hoy', 'cuanto he vendido hoy', 'cierre de hoy', 'lo de hoy', 'hoy vendi', 'ventas del dia',
    ],
    handler: async () => {
      const sales = await salesService.list()
      const todaySales = sales.filter((s) => isToday(s.created_at))
      if (todaySales.length === 0) {
        return '📅 **Ventas de hoy:**\nTodavía no has registrado ninguna venta el día de hoy.'
      }
      const total = todaySales.reduce((sum, s) => sum + salesService.saleTotal(s), 0)
      const pagadas = todaySales.filter((s) => s.status === 'pagado')
      const pendientes = todaySales.filter((s) => s.status === 'pendiente')
      const totalPagado = pagadas.reduce((sum, s) => sum + salesService.saleTotal(s), 0)
      const totalPendiente = pendientes.reduce((sum, s) => sum + salesService.saleTotal(s), 0)

      let res = `📅 **Ventas de hoy:**\nHas generado **${money(total)}** en **${todaySales.length}** venta(s).\n\n`
      res += `• Pagado / Cobrado: ${money(totalPagado)} (${pagadas.length} ventas)\n`
      if (pendientes.length > 0) {
        res += `• Pendiente de cobro: ${money(totalPendiente)} (${pendientes.length} ventas)`
      }
      return res
    },
  },
  {
    name: 'sales_yesterday',
    triggers: [
      'vendi ayer', 'venta de ayer', 'ventas de ayer', 'facture ayer',
      'cuanto vendi ayer', 'lo de ayer', 'ayer vendi', 'cierre de ayer',
    ],
    handler: async () => {
      const sales = await salesService.list()
      const yesterdaySales = sales.filter((s) => isYesterday(s.created_at))
      if (yesterdaySales.length === 0) {
        return '📅 **Ventas de ayer:**\nAyer no se registraron ventas en el sistema.'
      }
      const total = yesterdaySales.reduce((sum, s) => sum + salesService.saleTotal(s), 0)
      return `📅 **Ventas de ayer:**\nAyer generaste **${money(total)}** en **${yesterdaySales.length}** venta(s).`
    },
  },
  {
    name: 'sales_this_week',
    triggers: [
      'esta semana', 'ventas de la semana', 'cuanto vendi esta semana',
      'en la semana', 'ultimos 7 dias', 'ventas de los ultimos 7 dias',
    ],
    handler: async () => {
      const sales = await salesService.list()
      const weekSales = sales.filter((s) => isThisWeek(s.created_at))
      if (weekSales.length === 0) {
        return '📆 **Ventas de los últimos 7 días:**\nNo se han registrado ventas en esta semana.'
      }
      const total = weekSales.reduce((sum, s) => sum + salesService.saleTotal(s), 0)
      return `📆 **Ventas de los últimos 7 días:**\nHas acumulado **${money(total)}** en **${weekSales.length}** venta(s).`
    },
  },
  {
    name: 'sales_this_month',
    triggers: [
      'este mes', 'del mes', 'ventas del mes', 'cuanto llevo este mes',
      'mes actual', 'cierre de mes', 'facturacion del mes', 'ventas en el mes',
    ],
    handler: async () => {
      const sales = await salesService.list()
      const monthSales = sales.filter((s) => isThisMonth(s.created_at))
      if (monthSales.length === 0) {
        return '📊 **Ventas de este mes:**\nTodavía no hay ventas registradas en el mes en curso.'
      }
      const total = monthSales.reduce((sum, s) => sum + salesService.saleTotal(s), 0)
      const pagadas = monthSales.filter((s) => s.status === 'pagado')
      const totalPagado = pagadas.reduce((sum, s) => sum + salesService.saleTotal(s), 0)
      const pendientes = monthSales.filter((s) => s.status === 'pendiente')
      const totalPendiente = pendientes.reduce((sum, s) => sum + salesService.saleTotal(s), 0)

      let res = `📊 **Ventas de este mes:**\nLlevas acumulado **${money(total)}** en **${monthSales.length}** venta(s).\n\n`
      res += `• Cobrado: ${money(totalPagado)}\n`
      if (pendientes.length > 0) {
        res += `• Pendiente de cobro: ${money(totalPendiente)} (${pendientes.length} ventas)`
      }
      return res
    },
  },
  {
    name: 'sales_last_month',
    triggers: [
      'mes pasado', 'ventas del mes pasado', 'mes anterior', 'el mes pasado',
      'ventas de mes anterior',
    ],
    handler: async () => {
      const sales = await salesService.list()
      const pastSales = sales.filter((s) => isLastMonth(s.created_at))
      if (pastSales.length === 0) {
        return '📊 **Ventas del mes pasado:**\nNo se encontraron ventas registradas en el mes anterior.'
      }
      const total = pastSales.reduce((sum, s) => sum + salesService.saleTotal(s), 0)
      return `📊 **Ventas del mes pasado:**\nEl mes pasado generaste **${money(total)}** en **${pastSales.length}** venta(s).`
    },
  },
  {
    name: 'sales_this_year',
    triggers: [
      'este ano', 'este anio', 'ventas del ano', 'ventas anuales', 'en el ano',
      'anual', 'todo el ano',
    ],
    handler: async () => {
      const sales = await salesService.list()
      const yearSales = sales.filter((s) => isThisYear(s.created_at))
      if (yearSales.length === 0) {
        return '📈 **Ventas de este año:**\nNo hay ventas registradas en este año.'
      }
      const total = yearSales.reduce((sum, s) => sum + salesService.saleTotal(s), 0)
      return `📈 **Ventas de este año:**\nLlevas acumulado **${money(total)}** en **${yearSales.length}** venta(s) este año.`
    },
  },
  {
    name: 'sales_total_all_time',
    triggers: [
      'ventas totales', 'total de ventas', 'cuanto he vendido en total',
      'historico de ventas', 'todas las ventas', 'acumulado de ventas',
      'cuantas ventas tengo', 'total facturado', 'ventas historicas',
    ],
    handler: async () => {
      const sales = await salesService.list()
      if (sales.length === 0) {
        return 'Aún no tienes ninguna venta registrada en el sistema.'
      }
      const total = sales.reduce((sum, s) => sum + salesService.saleTotal(s), 0)
      const pagadas = sales.filter((s) => s.status === 'pagado')
      const pendientes = sales.filter((s) => s.status === 'pendiente')
      const totalCobrado = pagadas.reduce((sum, s) => sum + salesService.saleTotal(s), 0)
      const totalPendiente = pendientes.reduce((sum, s) => sum + salesService.saleTotal(s), 0)

      return `💼 **Histórico Total de Ventas:**\n` +
        `• Ventas totales registradas: **${sales.length}**\n` +
        `• Importe total: **${money(total)}**\n` +
        `• Total efectivamente cobrado: **${money(totalCobrado)}**\n` +
        `• Total pendiente de cobro: **${money(totalPendiente)}** (${pendientes.length} ventas)`
    },
  },
  {
    name: 'average_ticket',
    triggers: [
      'ticket promedio', 'promedio por venta', 'gasto promedio', 'promedio de ventas',
      'cuanto gasta en promedio', 'valor promedio de venta',
    ],
    handler: async () => {
      const sales = await salesService.list()
      if (sales.length === 0) {
        return 'No hay ventas suficientes para calcular el ticket promedio.'
      }
      const total = sales.reduce((sum, s) => sum + salesService.saleTotal(s), 0)
      const avg = total / sales.length
      return `🏷️ **Ticket Promedio:**\nEl promedio por venta es de **${money(avg)}** (calculado sobre ${sales.length} ventas registradas).`
    },
  },
  {
    name: 'latest_sale',
    triggers: [
      'ultima venta', 'venta mas reciente', 'quien compro al ultimo', 'ultimo cliente que compro',
      'cual fue la ultima venta', 'ultima transaccion', 'reciente venta',
    ],
    handler: async () => {
      const [sales, clients] = await Promise.all([salesService.list(), clientsService.list()])
      if (sales.length === 0) {
        return 'Aún no se ha registrado ninguna venta.'
      }
      // Ordenadas desc por created_at
      const last = sales[0]
      const client = clients.find((c) => c.id === last.client_id)
      const total = salesService.saleTotal(last)
      const itemsCount = (last.items || []).reduce((acc, it) => acc + (Number(it.quantity) || 1), 0)

      return `🧾 **Última venta registrada:**\n` +
        `• Cliente: **${client?.name || 'Cliente sin nombre'}**\n` +
        `• Monto: **${money(total)}** (${itemsCount} unidades)\n` +
        `• Estado: **${last.status === 'pagado' ? '✅ Pagado' : '⏳ Pendiente'}**\n` +
        `• Fecha: ${formatDate(last.created_at)}`
    },
  },
  {
    name: 'top_product',
    triggers: [
      'producto mas vendido', 'que se vende mas', 'top productos', 'mas vendido',
      'ranking de productos', 'lo mas vendido', 'productos mas vendidos', 'cual es el mas vendido',
    ],
    handler: async () => {
      const [sales, products] = await Promise.all([salesService.list(), productsService.list()])
      const qtyByProduct = {}
      sales.forEach((s) =>
        (s.items || []).forEach((it) => {
          qtyByProduct[it.product_id] = (qtyByProduct[it.product_id] || 0) + (Number(it.quantity) || 0)
        })
      )
      const entries = Object.entries(qtyByProduct).sort((a, b) => b[1] - a[1])
      if (entries.length === 0) {
        return 'Aún no hay suficientes ventas registradas para determinar los productos más vendidos.'
      }

      const top5 = entries.slice(0, 5).map(([id, qty], idx) => {
        const prod = products.find((p) => p.id === id)
        return `${idx + 1}. **${prod?.name || 'Producto #' + id.slice(0, 6)}** — ${qty} unidad(es) vendidas`
      })

      return `🏆 **Ranking de productos más vendidos:**\n${top5.join('\n')}`
    },
  },

  // ─── 3. INVENTARIO & STOCK ───
  {
    name: 'low_stock',
    triggers: [
      'stock bajo', 'se estan acabando', 'por agotarse', 'poco stock',
      'alerta de inventario', 'quiebre', 'reponer', 'escasez', 'alertas de stock',
    ],
    handler: async () => {
      const products = await productsService.list()
      const low = products.filter((p) => !p.is_kit && p.stock <= p.min_stock && p.stock > 0)
      if (low.length === 0) {
        return '✅ **Nivel de Stock:**\n¡Todo en orden! No tienes productos en stock bajo por el momento.'
      }
      const list = low
        .slice(0, 6)
        .map((p) => `• **${p.name}**: quedan ${p.stock} ud(s) (Mínimo deseado: ${p.min_stock})`)
        .join('\n')

      return `⚠️ **Tienes ${low.length} producto(s) con stock bajo:**\n${list}\n\n💡 *Te sugiero emitir una orden de compra a tus proveedores.*`
    },
  },
  {
    name: 'out_of_stock',
    triggers: [
      'agotados', 'sin stock', 'que se agoto', 'cuales tienen 0 stock',
      'productos en 0', 'productos en cero', 'cero stock', 'no hay stock', 'sin unidades',
    ],
    handler: async () => {
      const products = await productsService.list()
      const out = products.filter((p) => !p.is_kit && p.stock <= 0)
      if (out.length === 0) {
        return '🎉 ¡Excelente noticia! No tienes ningún producto agotado actualmente en tu inventario.'
      }
      const list = out
        .slice(0, 7)
        .map((p) => `• **${p.name}** (SKU: ${p.sku || 'N/A'})`)
        .join('\n')

      return `🚨 **Hay ${out.length} producto(s) totalmente agotados (Stock 0):**\n${list}`
    },
  },
  {
    name: 'inventory_value',
    triggers: [
      'valor del inventario', 'cuanto vale mi stock', 'valor de la mercaderia',
      'dinero en inventario', 'capital invertido en stock', 'cuanto dinero tengo en inventario',
      'cuanto dinero tengo en productos', 'valorizacion', 'valor total inventario',
    ],
    handler: async () => {
      const products = await productsService.list()
      // Filtramos productos base (evitamos duplicar combos)
      const baseProducts = products.filter((p) => !p.is_kit)
      const totalUnits = baseProducts.reduce((sum, p) => sum + Math.max(0, p.stock || 0), 0)
      const costValue = baseProducts.reduce(
        (sum, p) => sum + Math.max(0, p.stock || 0) * (Number(p.cost) || 0),
        0
      )
      const saleValue = baseProducts.reduce(
        (sum, p) => sum + Math.max(0, p.stock || 0) * (Number(p.price) || 0),
        0
      )
      const potentialProfit = Math.max(0, saleValue - costValue)

      return `💰 **Valorización de tu Inventario:**\n` +
        `• Total unidades físicas: **${totalUnits} uds.** (${baseProducts.length} productos diferentes)\n` +
        `• Inversión en almacén (a costo): **${money(costValue)}**\n` +
        `• Valor potencial de venta: **${money(saleValue)}**\n` +
        `• Margen de ganancia estimado: **${money(potentialProfit)}**`
    },
  },
  {
    name: 'catalog_summary',
    triggers: [
      'catalogo', 'que productos tienes', 'lista de productos', 'que vendemos',
      'cuales son los productos', 'mostrar productos', 'cuantos productos hay',
      'total de productos', 'que vendes', 'resumen de inventario',
    ],
    handler: async () => {
      const [products, categories] = await Promise.all([
        productsService.list(),
        categoriesService.list(),
      ])
      if (products.length === 0) {
        return 'Tu catálogo está vacío por ahora. Puedes agregar productos desde la sección "Productos".'
      }
      const totalStock = products
        .filter((p) => !p.is_kit)
        .reduce((sum, p) => sum + Math.max(0, p.stock || 0), 0)
      const sample = products
        .slice(0, 5)
        .map((p) => `• **${p.name}** — ${money(p.price)} (Stock: ${p.stock})`)
        .join('\n')

      return `📦 **Catálogo de CYA STORE:**\n` +
        `• Total productos registrados: **${products.length}**\n` +
        `• Total stock físico: **${totalStock} unidades**\n` +
        `• Categorías activas: **${categories.length}**\n\n` +
        `**Muestra de productos:**\n${sample}\n\n` +
        `💡 *Pregúntame por el precio o stock de un producto específico, por ejemplo: "¿Tienes audífonos?"*`
    },
  },
  {
    name: 'combos_kits',
    triggers: [
      'combos', 'kits', 'promociones', 'que combos hay', 'packs', 'paquetes', 'combo', 'kit',
    ],
    handler: async () => {
      const products = await productsService.list()
      const kits = products.filter((p) => p.is_kit)
      if (kits.length === 0) {
        return 'Actualmente no tienes combos o kits configurados en el sistema.'
      }
      const list = kits
        .map((k) => {
          const comp = products.find((p) => p.id === k.kit_component_id)
          return `• 🎁 **${k.name}** — ${money(k.price)} | Stock virtual: **${k.stock}** (usa ${k.kit_quantity}x ${comp?.name || 'producto'})`
        })
        .join('\n')

      return `🎁 **Combos y Kits activos (${kits.length}):**\n${list}\n\n*Nota: El stock de los combos se calcula automáticamente a partir de los componentes base.*`
    },
  },
  {
    name: 'price_extremes',
    triggers: [
      'producto mas caro', 'mayor precio', 'mas costoso', 'producto mas barato',
      'menor precio', 'mas economico', 'mas accesible',
    ],
    handler: async () => {
      const products = await productsService.list()
      if (products.length === 0) return 'No hay productos registrados.'
      const sorted = [...products].sort((a, b) => Number(b.price) - Number(a.price))
      const mostExpensive = sorted[0]
      const cheapest = sorted[sorted.length - 1]

      return `🏷️ **Precios destacados:**\n` +
        `• Más caro: **${mostExpensive.name}** a **${money(mostExpensive.price)}** (Stock: ${mostExpensive.stock})\n` +
        `• Más económico: **${cheapest.name}** a **${money(cheapest.price)}** (Stock: ${cheapest.stock})`
    },
  },
  {
    name: 'categories_list',
    triggers: ['categorias', 'que categorias hay', 'cuales categorias', 'rubros', 'lineas de productos'],
    handler: async () => {
      const [categories, products] = await Promise.all([
        categoriesService.list(),
        productsService.list(),
      ])
      if (categories.length === 0) {
        return 'No tienes categorías creadas en el sistema todavía.'
      }
      const list = categories
        .map((c) => {
          const count = products.filter((p) => p.category_id === c.id).length
          return `• **${c.name}** (${count} productos)`
        })
        .join('\n')

      return `📂 **Categorías registradas (${categories.length}):**\n${list}`
    },
  },

  // ─── 4. FINANZAS, CRÉDITOS & CUENTAS POR COBRAR ───
  {
    name: 'accounts_receivable',
    triggers: [
      'por cobrar', 'pendiente de pago', 'deben', 'ventas pendientes',
      'cuanto me deben', 'deudas', 'clientes deudores', 'quienes deben',
      'cuentas por cobrar', 'credito', 'creditos', 'cobranzas',
    ],
    handler: async () => {
      const [sales, clients] = await Promise.all([salesService.list(), clientsService.list()])
      const pending = sales.filter((s) => s.status === 'pendiente')
      if (pending.length === 0) {
        return '🎉 ¡Excelente! No tienes ninguna venta pendiente de cobro. Toda tu cartera está al día.'
      }
      const total = pending.reduce((sum, s) => sum + salesService.saleTotal(s), 0)
      const overdue = pending.filter((s) => salesService.isOverdue(s))

      const detail = pending.slice(0, 5).map((s) => {
        const client = clients.find((c) => c.id === s.client_id)
        const amt = salesService.saleTotal(s)
        const isOver = salesService.isOverdue(s)
        const overdueBadge = isOver ? ' ⚠️ *(Vencida)*' : ''
        return `• **${client?.name || 'Cliente sin nombre'}**: ${money(amt)}${overdueBadge} (Venta #${s.id.toString().slice(0, 6).toUpperCase()})`
      }).join('\n')

      let res = `💰 **Cuentas por Cobrar:**\nTienes un total de **${money(total)}** por cobrar en **${pending.length}** venta(s) pendiente(s).\n\n${detail}`
      if (overdue.length > 0) {
        res += `\n\n🚨 **Atención:** ${overdue.length} de estas ventas ya están vencidas.`
      }
      return res
    },
  },
  {
    name: 'overdue_sales',
    triggers: [
      'ventas vencidas', 'quien esta vencido', 'deudas vencidas', 'plazo vencido',
      'morosos', 'vencidos', 'vencidas', 'cuentas vencidas',
    ],
    handler: async () => {
      const [sales, clients] = await Promise.all([salesService.list(), clientsService.list()])
      const overdue = sales.filter((s) => salesService.isOverdue(s))
      if (overdue.length === 0) {
        return '✅ No tienes ninguna venta pendiente con plazo vencido.'
      }
      const totalOverdue = overdue.reduce((sum, s) => sum + salesService.saleTotal(s), 0)
      const list = overdue.slice(0, 6).map((s) => {
        const client = clients.find((c) => c.id === s.client_id)
        const amt = salesService.saleTotal(s)
        const days = Math.abs(salesService.daysUntilDue(s))
        return `• **${client?.name || 'Cliente'}**: ${money(amt)} — vencida hace ${days} día(s)`
      }).join('\n')

      return `🚨 **Ventas Vencidas (${overdue.length}):**\nTotal en mora: **${money(totalOverdue)}**\n\n${list}\n\n💡 *Puedes contactar a los clientes o enviarles su comprobante por WhatsApp.*`
    },
  },

  // ─── 5. CLIENTES ───
  {
    name: 'best_client',
    triggers: [
      'mejor cliente', 'cliente top', 'quien me compra mas', 'cliente que mas compra',
      'cliente estrella', 'cliente fiel', 'mas fiel', 'mayor comprador',
    ],
    handler: async () => {
      const history = await getClientsHistory()
      if (history.length === 0) {
        return 'Aún no tienes clientes con compras registradas en el sistema.'
      }
      const top = [...history].sort((a, b) => b.totalSpent - a.totalSpent)[0]
      return `🌟 **Tu Cliente Estrella es:**\n` +
        `• Nombre: **${top.name}**\n` +
        `• Teléfono: ${top.phone || 'No registrado'}\n` +
        `• Total acumulado gastado: **${money(top.totalSpent)}**\n` +
        `• Cantidad de compras: **${top.salesCount}**\n` +
        `• Última visita: ${formatDate(top.lastPurchase)}`
    },
  },
  {
    name: 'top_clients',
    triggers: [
      'top clientes', 'mejores clientes', 'ranking de clientes', 'top 5 clientes',
      'principales clientes', 'ranking clientes',
    ],
    handler: async () => {
      const history = await getClientsHistory()
      if (history.length === 0) {
        return 'Aún no tienes ventas registradas para generar el ranking de clientes.'
      }
      const topList = [...history]
        .sort((a, b) => b.totalSpent - a.totalSpent)
        .slice(0, 5)
        .map((c, i) => `${i + 1}. **${c.name}** — ${money(c.totalSpent)} (${c.salesCount} compras)`)
        .join('\n')

      return `👥 **Top 5 Clientes con Mayor Facturación:**\n${topList}`
    },
  },
  {
    name: 'clients_count',
    triggers: [
      'cuantos clientes', 'total de clientes', 'base de clientes', 'lista de clientes',
      'cartera de clientes', 'numero de clientes',
    ],
    handler: async () => {
      const clients = await clientsService.list()
      return `👥 Tienes una base registrada de **${clients.length} cliente(s)** en CYA STORE.`
    },
  },

  // ─── 6. COMPRAS & PROVEEDORES ───
  {
    name: 'purchases_total',
    triggers: [
      'invertido', 'compras totales', 'cuanto he comprado', 'gastado en compras',
      'total de compras', 'gastos en mercaderia', 'inversion en compras', 'inversion a proveedores',
    ],
    handler: async () => {
      const purchases = await purchasesService.list()
      const received = purchases.filter((p) => p.status === 'recibido')
      const total = received.reduce((sum, p) => sum + purchasesService.purchaseTotal(p), 0)
      const pending = purchases.filter((p) => p.status === 'pendiente')

      let res = `🛒 **Compras a Proveedores:**\nLlevas invertido **${money(total)}** en **${received.length}** compra(s) recibidas en almacén.`
      if (pending.length > 0) {
        const totalPending = pending.reduce((sum, p) => sum + purchasesService.purchaseTotal(p), 0)
        res += `\n• Tienes **${pending.length}** compra(s) en camino por un valor de ${money(totalPending)}.`
      }
      return res
    },
  },
  {
    name: 'pending_purchases',
    triggers: [
      'compras pendientes', 'pedidos pendientes', 'mercaderia por recibir',
      'pedidos a proveedores', 'compras por recibir', 'en camino',
    ],
    handler: async () => {
      const [purchases, suppliers] = await Promise.all([
        purchasesService.list(),
        suppliersService.list(),
      ])
      const pending = purchases.filter((p) => p.status === 'pendiente')
      if (pending.length === 0) {
        return '✅ No tienes pedidos de compra pendientes por recibir. Todas las órdenes están al día.'
      }
      const list = pending.slice(0, 5).map((p) => {
        const supp = suppliers.find((s) => s.id === p.supplier_id)
        const total = purchasesService.purchaseTotal(p)
        return `• Proveedor: **${supp?.name || 'N/A'}** — ${money(total)} (Creada: ${formatDate(p.created_at)})`
      }).join('\n')

      return `🚚 **Compras Pendientes de Recepción (${pending.length}):**\n${list}\n\n💡 *Recuerda marcar la compra como "Recibida" en el módulo de Compras para que sume al stock automáticamente.*`
    },
  },
  {
    name: 'suppliers_list',
    triggers: ['proveedores', 'que proveedores tengo', 'lista de proveedores', 'cuantos proveedores'],
    handler: async () => {
      const suppliers = await suppliersService.list()
      if (suppliers.length === 0) {
        return 'No tienes proveedores registrados todavía.'
      }
      const list = suppliers
        .slice(0, 8)
        .map((s) => `• **${s.name}** ${s.phone ? '📞 ' + s.phone : ''} ${s.ruc ? '(RUC: ' + s.ruc + ')' : ''}`)
        .join('\n')

      return `🏭 **Proveedores registrados (${suppliers.length}):**\n${list}`
    },
  },

  // ─── 7. MOVIMIENTOS DE INVENTARIO (KARDEX) ───
  {
    name: 'inventory_movements',
    triggers: [
      'movimientos de inventario', 'ultimos movimientos', 'entradas y salidas',
      'kardex', 'ajustes de inventario', 'historial de inventario', 'movimientos recientes',
    ],
    handler: async () => {
      const [movements, products] = await Promise.all([
        inventoryMovementsService.list(),
        productsService.list(),
      ])
      if (movements.length === 0) {
        return 'No hay movimientos de inventario registrados en el historial.'
      }
      const list = movements.slice(0, 5).map((m) => {
        const prod = products.find((p) => p.id === m.product_id)
        const icon = m.type === 'entrada' ? '📥 (+)' : '📤 (-)'
        return `• ${icon} **${prod?.name || 'Producto'}**: ${m.quantity} uds. (${m.reason || m.type}) — ${formatDate(m.created_at)}`
      }).join('\n')

      return `📦 **Últimos 5 Movimientos de Inventario:**\n${list}`
    },
  },

  // ─── 8. NOTIFICACIONES & ALERTAS ───
  {
    name: 'system_notifications',
    triggers: [
      'notificacion', 'notificaciones', 'alertas', 'que tengo pendiente',
      'avisos', 'campana', 'recordatorios', 'pendientes del sistema',
    ],
    handler: async () => {
      const notifications = await getNotifications()
      if (notifications.length === 0) {
        return '✅ ¡Todo en orden! No tienes alertas ni notificaciones pendientes en este momento.'
      }
      const list = notifications
        .slice(0, 6)
        .map((n) => `• ${n.type === 'danger' ? '🔴' : '🟠'} **${n.title}**: ${n.message}`)
        .join('\n')

      return `🔔 **Tienes ${notifications.length} notificación(es) activa(s):**\n${list}`
    },
  },

  // ─── 9. DATOS DE LA EMPRESA ───
  {
    name: 'company_info',
    triggers: [
      'datos de la empresa', 'ruc', 'telefono de la empresa', 'direccion de la empresa',
      'datos de la tienda', 'informacion del negocio', 'donde estamos', 'sobre cya store',
    ],
    handler: async () => {
      const company = await companySettingsService.get()
      return `🏢 **Información de la Empresa:**\n` +
        `• Nombre comercial: **${company.name || 'CYA STORE'}**\n` +
        `• RUC: **${company.ruc || 'No configurado'}**\n` +
        `• Dirección: ${company.address || 'No configurada'}\n` +
        `• Teléfono: ${company.phone || 'No configurado'}`
    },
  },

  // ─── 10. GUÍAS OPERATIVAS PASO A PASO (TUTORIALES) ───
  {
    name: 'guide_sale',
    triggers: [
      'como hacer una venta', 'como registrar venta', 'como vender', 'nueva venta',
      'pasos para vender', 'como crear venta',
    ],
    handler: async () => {
      return `🛒 **Cómo registrar una venta paso a paso:**\n\n` +
        `1. Ve al menú lateral y haz clic en **"Nueva venta"**.\n` +
        `2. Selecciona o escribe el **nombre del cliente** (si no existe, se creará solo).\n` +
        `3. Agrega los productos haciendo clic en el catálogo o buscándolos por nombre/SKU.\n` +
        `4. Elige si es **Pagado** o **Pendiente** (si es pendiente, puedes fijar fecha de vencimiento).\n` +
        `5. Haz clic en **"Registrar venta"**.\n` +
        `6. ¡Listo! Podrás descargar el recibo o compartirlo directamente por **WhatsApp**.`
    },
  },
  {
    name: 'guide_correct_sale',
    triggers: [
      'como corregir venta', 'como editar venta', 'corregir cliente',
      'cambiar fecha de venta', 'editar venta registrada', 'corregir venta',
    ],
    handler: async () => {
      return `✏️ **Cómo corregir el cliente o la fecha de una venta:**\n\n` +
        `1. Dirígete a la sección **"Ventas"** en el menú.\n` +
        `2. En la tabla de ventas, busca la venta que deseas arreglar.\n` +
        `3. En la columna de acciones (a la derecha), haz clic en el botón con ícono de **Lápiz**.\n` +
        `4. Se abrirá la ventana *"Corregir venta"*: puedes cambiar el nombre del cliente, teléfono o la fecha y hora.\n` +
        `5. Haz clic en **"Guardar corrección"** y se actualizará de inmediato sin alterar productos ni montos.`
    },
  },
  {
    name: 'can_make_boletas',
    triggers: [
      'puedes hacer boletas', 'puedes hacer boleta', 'haces boletas', 'haces boleta',
      'se puede hacer boletas', 'se pueden hacer boletas', 'como hacer boletas', 'como hago boletas',
      'como emitir boletas', 'emitir boleta', 'emitir boletas', 'hacer boletas', 'generar boleta',
      'generar boletas', 'puedes emitir boletas', 'puedes generar boletas', 'haces facturas',
      'puedes hacer facturas', 'emite boletas', 'emites boletas', 'hacer comprobante', 'hacer comprobantes',
    ],
    handler: async (ctx) => {
      const company = ctx?.companyName || 'CYA STORE'
      const userGreeting = ctx?.userName ? ` ${ctx.userName}` : ''
      return `🧾 **¡Por supuesto${userGreeting}! En ${company} puedes generar y emitir boletas y comprobantes de venta oficiales con tu logotipo:**\n\n` +
        `1. **Generación automática al vender:** Cada vez que registras una venta en el módulo de **Ventas** (*"+ Nueva venta"*), el sistema crea su comprobante oficial numerado con el logo de **${company}**.\n` +
        `2. **Vista previa y detalle:** En la tabla de **Ventas**, haz clic en el ícono de **Ojo / Recibo** de cualquier venta para ver la boleta con el desglose de productos, cantidades, precios y total.\n` +
        `3. **Envío instantáneo por WhatsApp:** Con el botón verde *"Compartir por WhatsApp"*, se genera la imagen del recibo oficial y se abre el chat del cliente listo para enviar.\n` +
        `4. **Impresión / PDF:** Puedes imprimir el comprobante en formato ticket térmico o guardarlo en PDF.\n\n` +
        `💡 *Como tu Asistente Virtual puedo informarte sobre tus ventas, totales y clientes en tiempo real, mientras que la emisión física o digital de la boleta se realiza desde el módulo de Ventas de ${company}.*`
    },
  },
  {
    name: 'guide_receipt',
    triggers: [
      'como compartir recibo', 'enviar recibo por whatsapp', 'como enviar recibo',
      'como compartir boleta', 'enviar boleta por whatsapp', 'compartir voucher',
      'compartir ticket', 'como mandar el comprobante', 'enviar comprobante',
    ],
    handler: async () => {
      return `📲 **Cómo enviar el comprobante por WhatsApp:**\n\n` +
        `1. En el listado de **Ventas**, haz clic en el ícono de **Ojo / Recibo** de la venta deseada.\n` +
        `2. Se abrirá la vista previa del comprobante oficial con el logo de **CYA STORE**.\n` +
        `3. Haz clic en el botón verde **"Compartir por WhatsApp"**.\n` +
        `4. Se generará la imagen del recibo automáticamente y se abrirá el chat del cliente con el mensaje listo.`
    },
  },
  {
    name: 'guide_purchase',
    triggers: [
      'como registrar compra', 'como comprar mercaderia', 'nueva compra',
      'pedir a proveedor', 'como crear compra',
    ],
    handler: async () => {
      return `🚚 **Cómo registrar compras a proveedores:**\n\n` +
        `1. Ve a la sección **"Compras"** del menú.\n` +
        `2. Haz clic en el botón **"+ Nueva compra"**.\n` +
        `3. Selecciona el proveedor y añade los productos con su costo unitario y cantidad.\n` +
        `4. Guárdala como *Pendiente* si está en camino, o como *Recibido* si ya llegó.\n` +
        `5. Al marcarla como *Recibido*, el stock de tus productos aumentará automáticamente en almacén.`
    },
  },
  {
    name: 'guide_product',
    triggers: [
      'como crear producto', 'como agregar producto', 'nuevo producto',
      'registrar producto', 'como subir producto',
    ],
    handler: async () => {
      return `📦 **Cómo agregar un nuevo producto:**\n\n` +
        `1. Ve a la sección **"Productos"**.\n` +
        `2. Haz clic en **"+ Nuevo producto"**.\n` +
        `3. Ingresa nombre, precio de venta, costo, stock inicial y stock mínimo de alerta.\n` +
        `4. Opcionalmente sube una fotografía del producto o asigna una categoría.\n` +
        `5. Haz clic en **"Guardar"** y ya estará disponible para vender.`
    },
  },
  {
    name: 'guide_combo',
    triggers: [
      'como crear combo', 'como hacer kit', 'como funciona combo',
      'crear kit', 'hacer promocion pack',
    ],
    handler: async () => {
      return `🎁 **Cómo crear un Combo o Kit (Pack):**\n\n` +
        `1. Ve a **"Productos"** y presiona **"+ Nuevo producto"**.\n` +
        `2. Marca la casilla **"Es un Combo / Kit"**.\n` +
        `3. Elige el **producto base** que contiene y la **cantidad** que incluye el combo.\n` +
        `4. Asigna el precio especial de venta del combo.\n` +
        `5. ¡Listo! El sistema calculará el stock del combo en base al producto base sin descuadrar inventario.`
    },
  },
  {
    name: 'guide_cobrar',
    triggers: [
      'como cobrar', 'marcar pagado', 'como pagar venta pendiente',
      'cobrar venta', 'cancelar deuda',
    ],
    handler: async () => {
      return `💵 **Cómo cobrar una venta pendiente:**\n\n` +
        `1. En la lista de **Ventas**, ubica la venta con etiqueta amarilla *"Pendiente"*.\n` +
        `2. Haz clic en el botón **"Marcar como pagado"** en las acciones.\n` +
        `3. El estado cambiará a verde *"Pagado"* y la deuda quedará saldada en el balance.`
    },
  },

  // ─── 8. PRODUCTOS MÁS VENDIDOS (TOP SALES RANKING) ───
  {
    name: 'top_selling_products',
    triggers: [
      'producto se vende mas', 'productos se venden mas', 'productos mas vendidos', 'producto mas vendido',
      'mas vendido', 'mas vendidos', 'mas vendida', 'mas vendidas', 'cual se vende mas', 'que se vende mas',
      'k se vende mas', 'cual es el mas vendido', 'cual es el que mas se vende', 'cual es el que se vende mas',
      'cual es el k se vende mas', 'top ventas', 'top productos', 'lo que mas sale', 'mayor venta',
      'mas exitoso', 'que mas compran', 'producto estrella', 'mejor producto', 'mas pedidos',
      'ranking de productos', 'ranking de ventas',
    ],
    handler: async (ctx) => {
      const company = ctx?.companyName || 'CYA STORE'
      const [sales, products] = await Promise.all([salesService.list(), productsService.list()])
      if (!sales.length) {
        return `📦 **Productos más vendidos en ${company}:**\nTodavía no se han registrado ventas en el sistema para calcular el ranking comercial.`
      }

      // Agrupar unidades y monto vendido por producto
      const productStats = {}
      for (const sale of sales) {
        if (!sale.items || !Array.isArray(sale.items)) continue
        for (const item of sale.items) {
          const pid = item.product_id
          if (!productStats[pid]) {
            const prod = products.find((p) => p.id === pid)
            productStats[pid] = {
              name: prod?.name || item.product_name || `Producto #${pid}`,
              sku: prod?.sku || '',
              stock: prod?.stock ?? 0,
              qty: 0,
              totalAmount: 0,
            }
          }
          productStats[pid].qty += Number(item.quantity || 0)
          productStats[pid].totalAmount += Number(item.quantity || 0) * Number(item.unit_price || 0)
        }
      }

      const ranked = Object.values(productStats).sort((a, b) => b.qty - a.qty)
      if (!ranked.length) {
        return `📦 **Productos más vendidos en ${company}:**\nNo se encontraron líneas de productos en las ventas registradas.`
      }

      const top = ranked.slice(0, 5)
      const medals = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣']

      let res = `🏆 **Top Productos Más Vendidos en ${company}:**\n\n`
      top.forEach((p, idx) => {
        const medal = medals[idx] || '•'
        res += `${medal} **${p.name}**\n`
        res += `   • Unidades vendidas: **${p.qty} uds.**\n`
        res += `   • Facturación total: **${money(p.totalAmount)}**\n`
        res += `   • Stock restante en almacén: ${p.stock <= 0 ? '🚨 Agotado' : `${p.stock} uds.`}\n\n`
      })

      const leader = top[0]
      const userPref = ctx?.userName ? `${ctx.userName}, ` : ''
      res += `💡 **Diagnóstico comercial:** ${userPref}tu producto estrella en **${company}** con mayor demanda es **${leader.name}** con **${leader.qty} unidades vendidas**.`
      return res
    },
  },

  // ─── 9. PRODUCTOS MENOS VENDIDOS (BAJA ROTACIÓN / SIN VENTAS) ───
  {
    name: 'least_selling_products',
    triggers: [
      'producto se vende menos', 'productos se venden menos', 'productos menos vendidos', 'producto menos vendido',
      'menos vendido', 'menos vendidos', 'menos vendida', 'menos vendidas', 'cual se vende menos',
      'que se vende menos', 'k se vende menos', 'cual es el que se vende menos', 'cual es el k se vende menos',
      'lo que menos sale', 'baja rotacion', 'peores ventas', 'sin ventas', 'cero ventas',
      'productos estancados', 'menos popular', 'que producto no se vende', 'productos sin salida',
    ],
    handler: async (ctx) => {
      const company = ctx?.companyName || 'CYA STORE'
      const [sales, products] = await Promise.all([salesService.list(), productsService.list()])
      if (!products.length) {
        return `📦 No hay productos registrados en el inventario de **${company}**.`
      }

      // Contabilizar ventas por producto
      const productSales = {}
      products.forEach((p) => {
        productSales[p.id] = { product: p, qty: 0, totalAmount: 0 }
      })

      for (const sale of sales) {
        if (!sale.items || !Array.isArray(sale.items)) continue
        for (const item of sale.items) {
          if (productSales[item.product_id]) {
            productSales[item.product_id].qty += Number(item.quantity || 0)
            productSales[item.product_id].totalAmount += Number(item.quantity || 0) * Number(item.unit_price || 0)
          }
        }
      }

      const allStats = Object.values(productSales)
      const zeroSales = allStats.filter((s) => s.qty === 0)
      const withSales = allStats.filter((s) => s.qty > 0).sort((a, b) => a.qty - b.qty)

      let res = `📉 **Productos Menos Vendidos / Baja Rotación en ${company}:**\n\n`

      if (zeroSales.length > 0) {
        res += `⚠️ **Productos con 0 ventas registradas:**\n`
        zeroSales.slice(0, 4).forEach((s) => {
          res += `• **${s.product.name}** (Stock en almacén: **${s.product.stock} uds.** — Capital inmovilizado: ${money(s.product.stock * s.product.price)})\n`
        })
        if (zeroSales.length > 4) {
          res += `  *(y otros ${zeroSales.length - 4} productos sin ventas)*\n`
        }
        res += `\n`
      }

      if (withSales.length > 0) {
        res += `📊 **Productos con menor volumen de salida:**\n`
        withSales.slice(0, 3).forEach((s, idx) => {
          res += `${idx + 1}. **${s.product.name}**: solo **${s.qty} uds.** vendidas (${money(s.totalAmount)})\n`
        })
        res += `\n`
      }

      const userPref = ctx?.userName ? `${ctx.userName}, te recomiendo ` : 'Te recomendamos '
      res += `💡 **Estrategia para ${company}:** ${userPref}armar promociones tipo "Pack / Combo" o aplicar descuentos especiales para acelerar la rotación de este inventario.`
      return res
    },
  },

  // ─── 10. DUDAS, VACILACIONES Y MULETILLAS (UMM, EHH, DADA, ETC.) ───
  {
    name: 'hesitation_and_doubts',
    triggers: [
      'umm', 'um', 'ummm', 'ehh', 'eh', 'ehhh', 'mmm', 'mm', 'este', 'a ver',
      'dada', 'duda', 'dudas', 'pregunta', 'preguntas', 'tengo una duda', 'tengo una pregunta',
      'tengo dudas', 'tengo una dada', 'ayuda con una duda', 'consulta', 'tengo una consulta',
    ],
    handler: async (ctx) => {
      const company = ctx?.companyName || 'CYA STORE'
      const userGreeting = ctx?.userName ? `, ${ctx.userName}` : ''
      return `¡Hola${userGreeting}! Aquí estoy listo para escucharte 😊\n\n` +
        `Dime con total confianza qué duda o consulta tienes sobre **${company}**. Puedo responderte de inmediato sobre:\n` +
        `• 📊 **Ventas:** "¿Cuál es el producto más vendido?", "¿Cuál se vende menos?" o "¿Cuánto vendí hoy?"\n` +
        `• 📦 **Inventario:** "¿Qué productos están por agotarse?" o "¿Cuánto stock me queda de X producto?"\n` +
        `• 💰 **Finanzas:** "¿Quiénes me deben dinero?" o "¿Cuánto tengo por cobrar en ${company}?"\n` +
        `• 💡 **Consejos:** "¿Cómo puedo aumentar mis ventas?" o "¿Cómo mejorar el margen de ganancia?"\n` +
        `• 💎 **Planes:** "¿Cuánto cuesta el Plan Pro y qué incluye?"\n\n` +
        `¿Qué te gustaría averiguar hoy${userGreeting}?`
    },
  },

  // ─── 11. PLANES Y SUSCRIPCIÓN ───
  {
    name: 'current_user_plan',
    triggers: [
      'en que plan estoy', 'en k plan estoy', 'que plan tengo', 'cual es mi plan',
      'mi plan actual', 'mi plan', 'plan actual', 'plan activo', 'saber mi plan',
      'sabes en que plan estoy', 'sabes en k plan estoy', 'que plan estoy usando',
      'mi suscripcion actual', 'estado de mi plan', 'cual es mi suscripcion',
      'en que plan me encuentro', 'que plan tiene mi cuenta', 'en que plan estoy en este sistema',
      'sabes que plan tengo', 'que plan tengo en este sistema',
    ],
    handler: async (ctx) => {
      const company = ctx?.companyName || 'CYA STORE'
      const userGreeting = ctx?.userName ? `${ctx.userName}, ` : ''
      const activePlan = planService.getActivePlanData()

      if (activePlan.id === 'free') {
        return `📋 **${userGreeting}actualmente tu cuenta en ${company} se encuentra en el ${activePlan.name}:**\n\n` +
          `• **Estado:** Activo (${activePlan.badge})\n` +
          `• **Costo:** ${activePlan.pricePeriod}\n` +
          `• **Límites de tu plan:**\n` +
          `  - 📦 Productos: Hasta 50 productos en inventario\n` +
          `  - 👤 Usuarios: 1 usuario de acceso\n` +
          `  - 🤖 Asistente IA: 10 consultas por día\n` +
          `  - 🕒 Historial: 30 días de movimientos\n\n` +
          `🚀 **¿Deseas desbloquear todas las funciones sin límites?**\n` +
          `Puedes mejorar al **Plan Pro** en cualquier momento para tener productos ilimitados, boletas con logo de ${company}, Asistente IA ilimitado 24/7 y soporte 24 horas.\n\n` +
          `👉 *Ingresa al menú lateral en la sección **"Tu Plan"** o pregúntame "cuáles son los planes" para ver todas las tarifas disponibles (Mensual S/ 30, Trimestral S/ 60, Semestral S/ 120 o Anual S/ 230).*`
      }

      return `💎 **¡${userGreeting}cuentas con el ${activePlan.name} activo en ${company}!**\n\n` +
        `• **Estado:** Suscripción Pro Activa (${activePlan.badge})\n` +
        `• **Tarifa:** ${activePlan.pricePeriod} (${activePlan.priceEquiv})\n` +
        `• **Beneficios ilimitados incluidos:**\n` +
        `  - ✅ Productos y categorías 100% ilimitados\n` +
        `  - 🤖 Asistente IA Ilimitado 24/7 en ${company}\n` +
        `  - 🧾 Boletas y recibos oficiales con logo propio\n` +
        `  - 📲 Compartir comprobantes directos por WhatsApp\n` +
        `  - 📊 Exportaciones completas a Excel y reportes ejecutivos\n` +
        `  - 🛡️ Atención y soporte técnico prioritario 24 horas\n` +
        `  - 🔄 Actualizaciones y copias de seguridad automáticas\n\n` +
        `Puedes revisar la vigencia o cambiar la modalidad en la sección **"Tu Plan"** en el menú de ${company}.`
    },
  },
  {
    name: 'plans_and_pricing',
    triggers: [
      'planes', 'precio de planes', 'cuanto cuesta el erp', 'precios del erp',
      'cuanto vale el sistema', 'costo del sistema', 'plan mensual', 'plan trimestral',
      'plan semestral', 'plan anual', 'plan pro', 'plan free', 'suscripcion', 'tarifas',
      'como pagar', 'mejorar plan', 'planes y precios', 'cuales son los planes',
      'que planes hay', 'que planes tienen', 'ver planes', 'costo de planes',
    ],
    handler: async (ctx) => {
      const company = ctx?.companyName || 'CYA STORE'
      return `💎 **Planes y Tarifas Oficiales para ${company}:**\n\n` +
        `• 🆓 **Plan Free (S/ 0):** Para iniciar. Hasta 50 productos, 1 usuario y 10 consultas IA/día.\n` +
        `• ⚡ **Plan Pro Mensual (S/ 30 / mes):** Flexibilidad total mes a mes sin contratos. Todo ilimitado.\n` +
        `• 🔥 **Plan Pro Trimestral (S/ 60 / 3 meses):** Equivale a solo S/ 20/mes (¡Ahorras S/ 10 al mes!).\n` +
        `• 🚀 **Plan Pro Semestral (S/ 120 / 6 meses):** Equivale a S/ 20/mes con soporte VIP y mantenimiento.\n` +
        `• 👑 **Plan Pro Anual (S/ 230 / año):** Máximo ahorro (S/ 19.16/mes), más de 1 mes gratis, soporte 24 horas y migración desde Excel.\n\n` +
        `👉 Puedes ver los detalles y activar tu suscripción en la sección **"Tu Plan"** en el menú de **${company}**.`
    },
  },

  // ─── 12. ESTRATEGIAS Y CONSEJOS COMERCIALES (SUPER IA) ───
  {
    name: 'how_to_sell_more',
    triggers: [
      'como vender mas', 'como aumento las ventas', 'ideas para vender mas', 'estrategia de ventas',
      'como hacer crecer el negocio', 'como vender', 'consejos de ventas', 'tips para vender',
      'como tener mas ventas', 'como vendo mas', 'crecer ventas', 'aumentar ingresos',
    ],
    handler: async (ctx) => {
      const company = ctx?.companyName || 'CYA STORE'
      const userGreeting = ctx?.userName ? `${ctx.userName}, ` : ''
      return `🚀 **Estrategias Prácticas para Aumentar Ventas en ${company}:**\n\n` +
        `1. 📦 **Cero Quiebres de Stock:** ${userGreeting}revisa a diario los *"productos con stock bajo"*. Nunca pierdas una venta por no tener inventario disponible.\n` +
        `2. 🎁 **Crea Packs y Combos Promocionales:** Junta tu producto más vendido con uno de baja rotación en un Combo con precio atractivo. Así liberas capital inmovilizado.\n` +
        `3. 📲 **Fidelización por WhatsApp:** Cada vez que registres una venta, haz clic en *"Boleta"* y compártela de inmediato por WhatsApp con tu cliente. Un cliente que recibe comprobante digital formal compra con más confianza.\n` +
        `4. ⏰ **Cobra a Tiempo tus Cuentas por Cobrar:** Revisa las ventas con estatus *"Pendiente"* antes de que venzan para tener liquidez y comprar más mercadería.\n` +
        `5. ⭐ **Consiente a tus Mejores Clientes:** Pregúntame *"¿quién es mi mejor cliente?"* y ofrécele una atención preferencial o descuentos por volumen.\n\n` +
        `¡Pon en práctica estos consejos hoy mismo en **${company}**!`
    },
  },

  // ─── 13. MÁRGENES Y CÁLCULO DE PRECIOS ───
  {
    name: 'profit_margins_advice',
    triggers: [
      'como calcular margen', 'margen de ganancia', 'como poner precios', 'como fijar precios',
      'calcular ganancia', 'que margen poner', 'como gano mas', 'margen comercial',
    ],
    handler: async (ctx) => {
      const company = ctx?.companyName || 'CYA STORE'
      return `📈 **Guía de Margen de Ganancia para ${company}:**\n\n` +
        `• **Fórmula de Margen %:**\n` +
        `  \`Margen % = ((Precio Venta - Costo) / Precio Venta) * 100\`\n\n` +
        `• **Fórmula de Multiplicador sobre Costo:**\n` +
        `  \`Precio Venta = Costo / (1 - (Margen Deseado % / 100))\`\n\n` +
        `💡 **Recomendación para ${company}:**\n` +
        `• En productos de alta rotación (los que se venden todos los días), un margen del 20% al 35% suele ser muy competitivo.\n` +
        `• En productos exclusivos o de menor rotación, apunta a márgenes del 40% al 60% para compensar el tiempo que permanecen en almacén.`
    },
  },

  // ─── 14. CONTROL DE INVENTARIO Y MERMAS ───
  {
    name: 'inventory_loss_advice',
    triggers: [
      'evitar perdidas', 'evitar robos', 'controlar inventario', 'mermas', 'auditoria de stock',
      'como cuidar el stock', 'descuadre de inventario', 'perdidas de stock',
    ],
    handler: async (ctx) => {
      const company = ctx?.companyName || 'CYA STORE'
      return `🛡️ **Control de Inventario y Prevención de Pérdidas en ${company}:**\n\n` +
        `1. 🔄 **Auditorías Rápidas Periódicas:** Cada semana escoge una categoría diferente y compara el conteo físico con el stock registrado en el sistema.\n` +
        `2. 📝 **Usa el Módulo de "Movimientos":** Si un producto se dañó o venció, regístralo como salida con motivo *"Ajuste"* o *"Merma"*. Nunca lo dejes sin registrar.\n` +
        `3. 👥 **Roles de Usuarios:** Asegúrate de que los vendedores solo registren ventas y compras, mientras tú como Administrador controlas la edición de precios y costos.\n\n` +
        `El sistema de **${company}** mantiene una bitácora estricta de cada entrada y salida para tu tranquilidad.`
    },
  },

  // ─── 15. HORA, PEQUEÑA CHARLA Y MOTIVACIÓN ───
  {
    name: 'time_and_date',
    triggers: [
      'que hora es', 'que fecha es', 'que dia es hoy', 'hora actual', 'fecha actual',
    ],
    handler: async (ctx) => {
      const company = ctx?.companyName || 'CYA STORE'
      const now = new Date()
      const timeStr = now.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })
      const dateStr = now.toLocaleDateString('es-PE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
      return `🕒 En **${company}** son las **${timeStr}** del **${dateStr}**.\n\n¡Un momento perfecto para seguir impulsando las ventas y operaciones de tu empresa!`
    },
  },
  {
    name: 'small_talk_and_fun',
    triggers: [
      'chiste', 'cuenta un chiste', 'cuentame un chiste', 'dime un chiste', 'hazme reir',
      'cuentame algo', 'algo divertido',
    ],
    handler: async (ctx) => {
      const company = ctx?.companyName || 'CYA STORE'
      const jokes = [
        `😄 ¿Por qué los libros de contabilidad nunca van al gimnasio? ¡Porque ya están llenos de balances! 📊\n\nAquí en **${company}** nos aseguramos de que todos tus números cuadren a la perfección.`,
        `😂 ¿Qué le dice un producto agotado a otro en **${company}**? "¡Tranquilo amigo, con este ritmo de ventas pronto nos reponen!" 📦🚀`,
      ]
      return jokes[Math.floor(Math.random() * jokes.length)]
    },
  },
  {
    name: 'apology_or_critique',
    triggers: [
      'sigue siendo tonto', 'sigues siendo tonto', 'eres tonto', 'tonto', 'no seas tonto',
      'eres bruto', 'no entiendes', 'no sabes nada', 'no sirves', 'muy tonto',
      'no me entendiste', 'te equivocas', 'te equivocaste', 'mal asistente', 'que tonto',
      'estas tonto', 'medio tonto', 'muy basico',
    ],
    handler: async (ctx) => {
      const company = ctx?.companyName || 'CYA STORE'
      const userGreeting = ctx?.userName ? `${ctx.userName}, ` : ''
      return `Lamento mucho la confusión, ${userGreeting}te pido sinceras disculpas 🙏. Estoy en constante optimización para brindarte la mejor asistencia en **${company}**.\n\n` +
        `Por favor, cuéntame exactamente qué necesitas consultar (por ejemplo: *"¿en qué plan estoy?"*, *"¿cuánto vendí hoy?"*, *"¿cuál es el producto más vendido?"* o *"¿cómo emitir boletas?"*) y con gusto te daré la respuesta precisa de **${company}**.`
    },
  },
]

// ─── LIMPIADOR INTELIGENTE DE CONSULTAS (NLP & SLANG NORMALIZER) ───
function cleanQuery(rawText) {
  if (!rawText) return ''
  let t = normalize(rawText)

  // 1. Normalización de abreviaciones y jergas coloquiales (Perú / Latinoamérica)
  t = t
    .replace(/\b(k|q)\b/g, 'que')
    .replace(/\bkiero\b/g, 'quiero')
    .replace(/\bkual\b/g, 'cual')
    .replace(/\bkuales\b/g, 'cuales')
    .replace(/\bps\b/g, 'pues')
    .replace(/\bpe\b/g, 'pues')
    .replace(/\bns\b/g, 'no se')
    .replace(/\btmb\b|\btmbn\b/g, 'tambien')
    .replace(/\bdada\b/g, 'duda')
    .replace(/\bdadas\b/g, 'dudas')
    .replace(/\bpq\b|\bxq\b/g, 'porque')
    .replace(/\bmas\b/g, 'mas')

  // 2. Limpieza recursiva de muletillas y conectores de inicio ("ok", "bueno", "a ver", "dime", "sabes", "mira", etc.)
  let prev = ''
  while (prev !== t) {
    prev = t
    t = t
      .replace(/^(ok|bueno|a ver|dime|sabes|sabrias decirme|puedes decirme|porfa|por favor|mira|oye|eh+|um+|mm+|este|hola|alo|asistente)\b\s*/i, '')
      .trim()
  }

  return t
}

// ─── FINALIZADOR DE RESPUESTA: GARANTIZA MENCIÓN DE EMPRESA ───
function finalizeResponse(text, companyName, userName) {
  const comp = companyName || 'CYA STORE'
  let res = text ? text.trim() : ''

  // Si la respuesta no contiene el nombre de la empresa, anexamos la firma oficial
  if (!res.toLowerCase().includes(comp.toLowerCase())) {
    res += `\n\n🏢 *Sistema ERP • ${comp}*`
  }

  return res
}

// ─── EVALUADOR DINÁMICO DE PRODUCTOS Y CLIENTES ───
async function dynamicSearch(queryText, companyName) {
  if (!queryText) return null
  const company = companyName || 'CYA STORE'

  // Stopwords estrictos para evitar falsos positivos
  const stopWords = new Set([
    'tienes', 'hay', 'precio', 'de', 'del', 'la', 'el', 'los', 'las', 'un', 'una', 'unos', 'unas',
    'stock', 'cuanto', 'cuesta', 'vale', 'informacion', 'info', 'dame', 'sobre',
    'buscar', 'consultar', 'tendra', 'tendras', 'queda', 'quedan', 'historial',
    'compras', 'compro', 'cliente', 'producto', 'productos', 'cuantos', 'cuantas', 'unidades',
    'existe', 'esta', 'disponible', 'disponibles', 'por', 'favor',
    'mas', 'menos', 'vende', 'venden', 'vendido', 'vendidos', 'vendida', 'vendidas',
    'que', 'cual', 'cuales', 'k', 'q', 'quiero', 'saber', 'dime', 'ver', 'mostrar',
    'eh', 'ehh', 'ehhh', 'um', 'umm', 'ummm', 'mm', 'mmm', 'este', 'oye', 'mira',
    'duda', 'dudas', 'dada', 'pregunta', 'preguntas', 'combo', 'kit', 'y', 'o',
  ])

  const tokens = queryText.split(' ').filter((w) => w.length >= 3 && !stopWords.has(w))

  // Búsqueda en PRODUCTOS
  const products = await productsService.list()
  let matchedProduct = null

  // 1. Intento por coincidencia de SKU exacto o normalizado
  matchedProduct = products.find((p) => p.sku && normalize(p.sku) === queryText)

  // 2. Intento por nombre exacto normalizado
  if (!matchedProduct) {
    matchedProduct = products.find((p) => normalize(p.name) === queryText)
  }

  // 3. Intento si la query contiene el nombre completo del producto
  if (!matchedProduct) {
    matchedProduct = products.find((p) => {
      const pNorm = normalize(p.name)
      return pNorm.length >= 4 && queryText.includes(pNorm)
    })
  }

  // 4. Intento con tokens significativos (excluyendo stopwords)
  if (!matchedProduct && tokens.length > 0) {
    const candidates = products
      .map((p) => {
        const pNorm = normalize(p.name)
        const matchCount = tokens.filter((t) => pNorm.includes(t)).length
        return { product: p, score: matchCount }
      })
      .filter((c) => c.score > 0)
      .sort((a, b) => b.score - a.score)

    if (
      candidates.length > 0 &&
      (candidates[0].score >= 2 || (tokens.length === 1 && candidates[0].score === 1 && tokens[0].length >= 4))
    ) {
      matchedProduct = candidates[0].product
    }
  }

  if (matchedProduct) {
    const isOutOfStock = matchedProduct.stock <= 0
    const isLow = !matchedProduct.is_kit && matchedProduct.stock <= matchedProduct.min_stock && !isOutOfStock

    let stockText = `✅ **Stock disponible en ${company}: ${matchedProduct.stock} unidad(es)**`
    if (isOutOfStock) {
      stockText = `🚨 **Totalmente AGOTADO en ${company} (0 unidades)**`
    } else if (isLow) {
      stockText = `⚠️ **Stock bajo en ${company}: solo quedan ${matchedProduct.stock} unidad(es)**`
    }

    let extra = ''
    if (matchedProduct.is_kit) {
      const comp = products.find((p) => p.id === matchedProduct.kit_component_id)
      extra = `\n• Tipo: **Combo / Kit** (usa ${matchedProduct.kit_quantity}x ${comp?.name || 'producto base'})`
    }

    return `📦 **Información de Producto • ${company}:**\n` +
      `• Nombre: **${matchedProduct.name}**\n` +
      `• SKU: \`${matchedProduct.sku || 'N/A'}\`\n` +
      `• Precio de venta: **${money(matchedProduct.price)}**\n` +
      `• Costo: ${money(matchedProduct.cost)}\n` +
      `• Estado: ${stockText}${extra}`
  }

  // Búsqueda en CLIENTES
  const clientsHistory = await getClientsHistory()
  let matchedClient = null

  if (tokens.length > 0) {
    matchedClient = clientsHistory.find((c) => {
      const cNorm = normalize(c.name)
      return queryText.includes(cNorm) || tokens.some((t) => t.length >= 3 && cNorm.includes(t))
    })
  }

  if (matchedClient) {
    return `👤 **Ficha Comercial del Cliente • ${company}:**\n` +
      `• Nombre: **${matchedClient.name}**\n` +
      `• Teléfono: ${matchedClient.phone || 'No registrado'}\n` +
      `• Total de compras: **${matchedClient.salesCount} pedido(s)**\n` +
      `• Total gastado en ${company}: **${money(matchedClient.totalSpent)}**\n` +
      `• Última compra: ${formatDate(matchedClient.lastPurchase)}`
  }

  return null
}

// ─── PUNTO DE ENTRADA PRINCIPAL CON PIPELINE NLP Y MEMORIA ───
export async function askAssistant(question, context = {}) {
  if (!question || !question.trim()) {
    return 'Por favor escribe tu consulta para poder ayudarte.'
  }

  const company = await companySettingsService.get()
  const limits = getLimits(company)
  const used = await assistantUsageService.getTodayCount()

  if (used >= limits.assistantDailyMessages) {
    return `Ya usaste tus ${limits.assistantDailyMessages} preguntas gratis de hoy. Actualiza a Pro en la sección "Planes" para preguntas ilimitadas.`
  }
  await assistantUsageService.increment()

  const companyName = context.companyName || company?.name || 'CYA STORE'
  let userName = getStoredUserName(context.user)

  // 1. Detección prioritaria: ¿El usuario se está presentando? ("me llamo carlos hola", "soy Carlos", etc.)
  const introducedName = extractSelfIntroduction(question)
  if (introducedName) {
    userName = setStoredUserName(introducedName)
    const greeting = getTimeGreeting()
    const welcome = `¡Hola, ${userName}! ${greeting} 👋 ¡Mucho gusto! Qué gran placer saludarte.\n\n` +
      `Ya memoricé tu nombre en el sistema para atenderte siempre de manera personalizada en **${companyName}**.\n\n` +
      `Como tu Asistente Inteligente en **${companyName}**, tengo acceso en tiempo real a tus ventas, inventario, productos más vendidos, cuentas por cobrar y compras.\n\n` +
      `¿En qué te puedo colaborar hoy, ${userName}?`
    return finalizeResponse(welcome, companyName, userName)
  }

  // 2. Detección prioritaria: ¿El usuario pregunta cómo se llama o si me acuerdo de él?
  const nameQueryTriggers = [
    'como me llamo', 'sabes mi nombre', 'te acuerdas de mi', 'te acuerdas de mi nombre',
    'cual es mi nombre', 'quien soy', 'te sabes mi nombre', 'sabes quien soy',
  ]
  const rawNormalized = normalize(question)
  const cleaned = cleanQuery(question)

  if (nameQueryTriggers.some((t) => rawNormalized.includes(t) || cleaned.includes(t))) {
    if (userName) {
      const resp = `¡Por supuesto que sí! Tu nombre es **${userName}** y estás al mando de **${companyName}** 💼.\n\n` +
        `Recuerdo perfectamente quién eres y todos tus datos comerciales están sincronizados en tiempo real. ¿Qué te gustaría consultar hoy, ${userName}?`
      return finalizeResponse(resp, companyName, userName)
    } else {
      const resp = `Aún no me has dicho tu nombre. Puedes escribirme por ejemplo: *"me llamo Carlos"* y con gusto lo memorizaré para saludarte siempre de forma personalizada en **${companyName}**.`
      return finalizeResponse(resp, companyName, userName)
    }
  }

  // Objeto de contexto que viaja a todos los handlers
  const ctx = {
    userName,
    companyName,
    user: context.user,
  }

  // Variantes para probar disparadores en orden de especificidad
  const variants = Array.from(new Set([cleaned, rawNormalized])).filter(Boolean)

  // 3. Probar reglas de intención predefinidas
  for (const q of variants) {
    for (const rule of intentRules) {
      const match = rule.triggers.some((t) => {
        const normT = normalize(t)
        const isSingleShortWord = !normT.includes(' ') && normT.length <= 5
        // Si la regla requiere coincidencia exacta o es una palabra solitaria corta (ej: "ok", "vale", "ya", "si")
        if (rule.exactOnly || isSingleShortWord) {
          return q === normT
        }
        // Para frases multi-palabra o disparadores específicos
        if (q === normT) return true
        if (normT.includes(' ')) {
          return q.includes(normT)
        }
        // Para palabras mayores a 5 caracteres, usar límite de palabra para evitar subcadenas espurias
        const wordRegex = new RegExp(`(^|\\s)${normT}(\\s|$)`, 'i')
        return wordRegex.test(q)
      })
      if (match) {
        const rawRes = await rule.handler(ctx)
        return finalizeResponse(rawRes, companyName, userName)
      }
    }
  }

  // 4. Probar búsqueda dinámica (productos o clientes por SKU, nombre o palabras clave)
  const dynamicAnswer = (await dynamicSearch(cleaned, companyName)) || (await dynamicSearch(rawNormalized, companyName))
  if (dynamicAnswer) {
    return finalizeResponse(dynamicAnswer, companyName, userName)
  }

  // 5. Fallback inteligente y contextual que reconoce el tema general
  const userPrefix = userName ? `${userName}, ` : ''
  const fallback = `🤔 ${userPrefix}no encontré una coincidencia exacta para "${question}".\n\n` +
    `Sin embargo, aquí en **${companyName}** puedo responderte en tiempo real sobre:\n` +
    `• 🏆 **Productos:** "¿Cuál es el producto más vendido?" o "¿Cuál se vende menos?"\n` +
    `• 📊 **Ventas:** "ventas de hoy", "ventas de ayer", "este mes" o "ticket promedio"\n` +
    `• 📦 **Stock:** "¿Qué productos tienen stock bajo?", "agotados" o busca un producto por su nombre\n` +
    `• 💰 **Finanzas:** "¿Cuánto me deben?" o "ventas vencidas"\n` +
    `• 💡 **Estrategias:** "¿Cómo vender más?" o "¿Cómo calcular el margen de ganancia?"\n` +
    `• 💎 **Planes:** "¿Cuánto cuesta el Plan Pro en ${companyName}?"\n` +
    `• 👥 **Clientes:** "mejor cliente" o el nombre de una persona\n\n` +
    `¿Sobre qué tema de **${companyName}** te gustaría consultar?`

  return finalizeResponse(fallback, companyName, userName)
}

// Sugerencias rápidas para mostrar como botones en el chat
export const suggestedQuestions = [
  '¿Cuál es el producto más vendido?',
  '¿Cuál se vende menos?',
  '¿Cuánto vendí hoy?',
  '¿Qué productos tienen stock bajo?',
]

