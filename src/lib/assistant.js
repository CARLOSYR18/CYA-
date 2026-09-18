import { salesService } from '../services/salesService'
import { productsService } from '../services/productsService'
import { purchasesService } from '../services/purchasesService'
import { clientsService } from '../services/clientsService'
import { categoriesService } from '../services/categoriesService'
import { suppliersService } from '../services/suppliersService'
import { inventoryMovementsService } from '../services/inventoryMovementsService'
import { companySettingsService } from '../services/companySettingsService'
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

// ─── REGLAS DE INTENCIÓN (INTENT RULES) ───
// Cada regla evalúa si el texto normalizado contiene alguno de sus disparadores (triggers)
// o cumple una condición regex.
const intentRules = [
  // ─── 1. SALUDOS & CONVERSACIÓN BÁSICA ───
  {
    name: 'greeting',
    triggers: [
      'hola', 'buenas', 'buenos dias', 'buenas tardes', 'buenas noches', 'buen dia',
      'hey', 'hello', 'hi', 'holis', 'que tal', 'saludos', 'que hubo', 'que hay',
      'alo', 'oe', 'habla', 'buenas noches asistente', 'hola asistente', 'buenas asistente',
    ],
    handler: async () => {
      const greeting = getTimeGreeting()
      return `¡Hola! ${greeting} 👋\n\nSoy tu Asistente Virtual inteligente de CYA STORE. Estoy conectado en tiempo real con tu sistema.\n\nPuedes preguntarme por:\n• 📊 Ventas de hoy, ayer, la semana o el mes\n• 📦 Stock de productos, agotados o stock bajo\n• 💰 Cuentas por cobrar y deudas vencidas\n• 👥 Mejor cliente o compras de alguien específico\n• 📈 Valor monetario total de tu inventario\n• 🚚 Compras y pedidos a proveedores\n• ❓ Guías de uso (cómo vender, crear combo, etc.)\n\n¿En qué te puedo colaborar hoy?`
    },
  },
  {
    name: 'how_are_you',
    triggers: [
      'como estas', 'como te va', 'como andas', 'que tal todo', 'como vas',
      'todo bien', 'que haces', 'que haces hoy',
    ],
    handler: async () => {
      return '¡Excelente y con toda la energía! 🚀 Monitoreando tus ventas, stock y operaciones en tiempo real para que tu negocio funcione sobre ruedas. ¿Qué te gustaría consultar?'
    },
  },
  {
    name: 'gratitude',
    triggers: [
      'gracias', 'muchas gracias', 'mil gracias', 'te agradezco', 'muy amable',
      'vale gracias', 'ok gracias', 'perfecto gracias', 'buena voz', 'thanks', 'genial gracias',
    ],
    handler: async () => {
      return '¡De nada! Ha sido un gusto ayudarte. 😊 Si necesitas consultar algo más sobre ventas, inventario o finanzas, aquí estaré listo.'
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
    triggers: ['ok', 'vale', 'listo', 'entendido', 'perfecto', 'genial', 'excelente', 'de acuerdo', 'dale', 'chevere'],
    handler: async () => {
      return '¡Perfecto! Quedo a tu disposición si deseas revisar otro reporte o hacer cualquier consulta. 👍'
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
    name: 'guide_receipt',
    triggers: [
      'como compartir recibo', 'enviar por whatsapp', 'como enviar recibo',
      'boleta', 'ticket', 'voucher', 'compartir voucher',
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
]

// ─── EVALUADOR DINÁMICO DE PRODUCTOS Y CLIENTES ───
// Si no hay un intent genérico que coincida exactamente, busca de forma inteligente:
// 1. ¿El usuario está preguntando por un producto específico (ej: "tienes airpods", "precio del case", "stock de polo")?
// 2. ¿El usuario está preguntando por un cliente específico (ej: "cuanto compro juan", "historial de maria")?
// 3. ¿El usuario escribió directamente el nombre de un producto o cliente?
async function dynamicSearch(normalizedQuery) {
  // Palabras comunes a ignorar al extraer el término de búsqueda
  const stopWords = new Set([
    'tienes', 'hay', 'precio', 'de', 'del', 'la', 'el', 'los', 'las', 'un', 'una',
    'stock', 'cuanto', 'cuesta', 'vale', 'informacion', 'info', 'dame', 'sobre',
    'buscar', 'consultar', 'tendra', 'tendras', 'queda', 'quedan', 'historial',
    'compras', 'compro', 'cliente', 'producto', 'cuantos', 'cuantas', 'unidades',
    'existe', 'esta', 'disponible', 'disponibles', 'por', 'favor',
  ])

  const tokens = normalizedQuery.split(' ').filter((w) => w.length > 1 && !stopWords.has(w))

  // Búsqueda en PRODUCTOS
  const products = await productsService.list()
  let matchedProduct = null

  // 1. Intento por coincidencia de SKU exacto o normalizado
  matchedProduct = products.find((p) => p.sku && normalize(p.sku) === normalizedQuery)

  // 2. Intento por nombre exacto normalizado
  if (!matchedProduct) {
    matchedProduct = products.find((p) => normalize(p.name) === normalizedQuery)
  }

  // 3. Intento si la query contiene el nombre completo del producto
  if (!matchedProduct) {
    matchedProduct = products.find((p) => {
      const pNorm = normalize(p.name)
      return pNorm.length >= 3 && normalizedQuery.includes(pNorm)
    })
  }

  // 4. Intento con tokens significativos (si coinciden la mayoría de palabras clave del producto)
  if (!matchedProduct && tokens.length > 0) {
    const candidates = products
      .map((p) => {
        const pNorm = normalize(p.name)
        const matchCount = tokens.filter((t) => pNorm.includes(t)).length
        return { product: p, score: matchCount }
      })
      .filter((c) => c.score > 0)
      .sort((a, b) => b.score - a.score)

    if (candidates.length > 0 && candidates[0].score >= Math.min(tokens.length, 1)) {
      matchedProduct = candidates[0].product
    }
  }

  if (matchedProduct) {
    const isOutOfStock = matchedProduct.stock <= 0
    const isLow = !matchedProduct.is_kit && matchedProduct.stock <= matchedProduct.min_stock && !isOutOfStock

    let stockText = `✅ **Stock disponible: ${matchedProduct.stock} unidad(es)**`
    if (isOutOfStock) {
      stockText = `🚨 **Totalmente AGOTADO (0 unidades)**`
    } else if (isLow) {
      stockText = `⚠️ **Stock bajo: solo quedan ${matchedProduct.stock} unidad(es)**`
    }

    let extra = ''
    if (matchedProduct.is_kit) {
      const comp = products.find((p) => p.id === matchedProduct.kit_component_id)
      extra = `\n• Tipo: **Combo / Kit** (usa ${matchedProduct.kit_quantity}x ${comp?.name || 'producto base'})`
    }

    return `📦 **Información de Producto:**\n` +
      `• Nombre: **${matchedProduct.name}**\n` +
      `• SKU: \`${matchedProduct.sku || 'N/A'}\`\n` +
      `• Precio de venta: **${money(matchedProduct.price)}**\n` +
      `• Costo: ${money(matchedProduct.cost)}\n` +
      `• Estado: ${stockText}${extra}`
  }

  // Búsqueda en CLIENTES
  const clientsHistory = await getClientsHistory()
  let matchedClient = null

  // Coincidencia con nombre de cliente
  if (tokens.length > 0) {
    matchedClient = clientsHistory.find((c) => {
      const cNorm = normalize(c.name)
      return normalizedQuery.includes(cNorm) || tokens.some((t) => t.length >= 3 && cNorm.includes(t))
    })
  }

  if (matchedClient) {
    return `👤 **Ficha Comercial del Cliente:**\n` +
      `• Nombre: **${matchedClient.name}**\n` +
      `• Teléfono: ${matchedClient.phone || 'No registrado'}\n` +
      `• Total de compras: **${matchedClient.salesCount} pedido(s)**\n` +
      `• Total gastado: **${money(matchedClient.totalSpent)}**\n` +
      `• Última compra: ${formatDate(matchedClient.lastPurchase)}`
  }

  return null
}

// ─── PUNTO DE ENTRADA PRINCIPAL ───
export async function askAssistant(question) {
  if (!question || !question.trim()) {
    return 'Por favor escribe tu consulta para poder ayudarte.'
  }

  const normalized = normalize(question)

  // 1. Probar reglas de intención predefinidas
  for (const rule of intentRules) {
    const match = rule.triggers.some((t) => {
      const normT = normalize(t)
      // Coincidencia exacta o contiene como frase
      return normalized === normT || normalized.includes(normT)
    })
    if (match) {
      return rule.handler()
    }
  }

  // 2. Probar búsqueda dinámica (si pregunta por un producto o cliente en la base de datos)
  const dynamicAnswer = await dynamicSearch(normalized)
  if (dynamicAnswer) {
    return dynamicAnswer
  }

  // 3. Fallback inteligente y contextual con sugerencias interactivas
  return `🤔 No encontré una respuesta exacta para "${question}".\n\n` +
    `Sin embargo, puedo darte datos en tiempo real sobre:\n` +
    `• 💵 **Ventas:** "ventas de hoy", "ventas de ayer", "este mes" o "ticket promedio"\n` +
    `• 📦 **Stock:** "¿Qué productos tienen stock bajo?", "agotados" o busca un producto por su nombre\n` +
    `• 💰 **Finanzas:** "¿Cuánto me deben?" o "ventas vencidas"\n` +
    `• 👥 **Clientes:** "mejor cliente" o el nombre de una persona\n` +
    `• 🛠️ **Guías:** "¿Cómo hacer una venta?", "¿Cómo compartir recibo?", etc.\n\n` +
    `¿Sobre qué tema te gustaría consultar?`
}

// Sugerencias rápidas para mostrar como botones en el chat.
export const suggestedQuestions = [
  '¿Cuánto vendí hoy?',
  '¿Qué productos tienen stock bajo?',
  '¿Cuánto me deben?',
  '¿Cuál es mi mejor cliente?',
]
