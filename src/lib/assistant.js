import { salesService } from '../services/salesService'
import { productsService } from '../services/productsService'
import { purchasesService } from '../services/purchasesService'
import { getNotifications } from './notifications'
import { getClientsHistory } from './clientHistory'

const money = (n) => `S/ ${Number(n).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

function normalize(text) {
  return text
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // quita tildes
    .trim()
}

function isToday(dateStr) {
  const d = new Date(dateStr)
  const today = new Date()
  return d.getDate() === today.getDate() && d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear()
}

function isThisMonth(dateStr) {
  const d = new Date(dateStr)
  const today = new Date()
  return d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear()
}

// Reglas, en orden de prioridad. Cada una tiene palabras clave y una función
// que arma la respuesta con datos reales (nada inventado).
const rules = [
  {
    keywords: ['vendi hoy', 'venta de hoy', 'ventas de hoy', 'genere hoy', 'facture hoy', 'cuanto vendi hoy', 'cuanto he vendido hoy'],
    handler: async () => {
      const sales = await salesService.list()
      const todaySales = sales.filter((s) => isToday(s.created_at))
      const total = todaySales.reduce((sum, s) => sum + salesService.saleTotal(s), 0)
      if (todaySales.length === 0) return 'Hoy todavía no has registrado ninguna venta.'
      return `Hoy generaste ${money(total)} en ${todaySales.length} venta(s).`
    },
  },
  {
    keywords: ['este mes', 'del mes', 'ventas del mes', 'cuanto llevo este mes'],
    handler: async () => {
      const sales = await salesService.list()
      const monthSales = sales.filter((s) => isThisMonth(s.created_at))
      const total = monthSales.reduce((sum, s) => sum + salesService.saleTotal(s), 0)
      return `Este mes llevas ${money(total)} en ${monthSales.length} venta(s).`
    },
  },
  {
    keywords: ['stock bajo', 'se estan acabando', 'por agotarse', 'poco stock', 'alerta de inventario', 'quiebre'],
    handler: async () => {
      const products = await productsService.list()
      const low = products.filter((p) => !p.is_kit && p.stock <= p.min_stock)
      if (low.length === 0) return 'No tienes productos en stock bajo por ahora. Todo en niveles saludables.'
      const list = low.slice(0, 5).map((p) => `• ${p.name} (${p.stock} disponibles)`).join('\n')
      return `Tienes ${low.length} producto(s) en stock bajo:\n${list}`
    },
  },
  {
    keywords: ['notificacion', 'alertas', 'que tengo pendiente', 'avisos'],
    handler: async () => {
      const notifications = await getNotifications()
      if (notifications.length === 0) return 'No tienes notificaciones pendientes. Todo en orden.'
      const list = notifications.slice(0, 5).map((n) => `• ${n.title}: ${n.message}`).join('\n')
      return `Tienes ${notifications.length} notificación(es):\n${list}`
    },
  },
  {
    keywords: ['por cobrar', 'pendiente de pago', 'deben', 'ventas pendientes', 'cuanto me deben'],
    handler: async () => {
      const sales = await salesService.list()
      const pending = sales.filter((s) => s.status === 'pendiente')
      const total = pending.reduce((sum, s) => sum + salesService.saleTotal(s), 0)
      const overdue = pending.filter((s) => salesService.isOverdue(s))
      if (pending.length === 0) return 'No tienes ventas pendientes de cobro. Todo pagado.'
      let msg = `Tienes ${money(total)} por cobrar en ${pending.length} venta(s) pendiente(s).`
      if (overdue.length > 0) msg += `\n${overdue.length} de ellas ya están vencidas.`
      return msg
    },
  },
  {
    keywords: ['invertido', 'compras totales', 'cuanto he comprado', 'gastado en compras'],
    handler: async () => {
      const purchases = await purchasesService.list()
      const received = purchases.filter((p) => p.status === 'recibido')
      const total = received.reduce((sum, p) => sum + purchasesService.purchaseTotal(p), 0)
      return `Llevas invertido ${money(total)} en compras recibidas de proveedores.`
    },
  },
  {
    keywords: ['mejor cliente', 'cliente top', 'quien me compra mas', 'cliente que mas compra'],
    handler: async () => {
      const history = await getClientsHistory()
      if (history.length === 0) return 'Aún no tienes clientes con compras registradas.'
      const top = [...history].sort((a, b) => b.totalSpent - a.totalSpent)[0]
      return `Tu mejor cliente es ${top.name}, con ${money(top.totalSpent)} gastados en ${top.salesCount} compra(s).`
    },
  },
  {
    keywords: ['producto mas vendido', 'que se vende mas', 'top productos', 'mas vendido'],
    handler: async () => {
      const [sales, products] = await Promise.all([salesService.list(), productsService.list()])
      const qtyByProduct = {}
      sales.forEach((s) => s.items.forEach((it) => {
        qtyByProduct[it.product_id] = (qtyByProduct[it.product_id] || 0) + it.quantity
      }))
      const entries = Object.entries(qtyByProduct).sort((a, b) => b[1] - a[1])
      if (entries.length === 0) return 'Aún no hay ventas registradas para saber qué se vende más.'
      const [topId, qty] = entries[0]
      const product = products.find((p) => p.id === topId)
      return `Tu producto más vendido es ${product?.name || topId}, con ${qty} unidad(es) vendidas en total.`
    },
  },
]

// Punto de entrada: recibe la pregunta del usuario y devuelve la respuesta.
export async function askAssistant(question) {
  const normalized = normalize(question)
  const rule = rules.find((r) => r.keywords.some((k) => normalized.includes(k)))
  if (rule) return rule.handler()

  return 'No tengo una respuesta para eso todavía. Puedo ayudarte con: ventas de hoy, ventas del mes, stock bajo, notificaciones, por cobrar, compras totales, mejor cliente, o producto más vendido.'
}

// Sugerencias rápidas para mostrar como botones en el chat.
export const suggestedQuestions = [
  '¿Cuánto vendí hoy?',
  '¿Qué productos tienen stock bajo?',
  '¿Cuánto me deben?',
  '¿Cuál es mi mejor cliente?',
]
