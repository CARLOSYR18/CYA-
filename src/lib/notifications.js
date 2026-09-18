import { productsService } from '../services/productsService'
import { salesService } from '../services/salesService'
import { purchasesService } from '../services/purchasesService'

// Junta alertas reales del sistema (nada inventado): stock bajo/agotado,
// ventas pendientes vencidas, y compras pendientes hace más de 3 días.
export async function getNotifications() {
  const [products, sales, purchases] = await Promise.all([
    productsService.list(),
    salesService.list(),
    purchasesService.list(),
  ])

  const notifications = []

  // Stock bajo o agotado (ignora combos: su stock ya viene del producto base)
  products
    .filter((p) => !p.is_kit && p.stock <= p.min_stock)
    .forEach((p) => {
      notifications.push({
        id: `stock-${p.id}`,
        type: p.stock <= 0 ? 'danger' : 'warning',
        title: p.stock <= 0 ? 'Producto agotado' : 'Stock bajo',
        message: `${p.name} — ${p.stock} unidad(es) disponibles`,
        date: new Date(),
        link: '/productos',
      })
    })

  // Ventas pendientes vencidas
  sales
    .filter((s) => salesService.isOverdue(s))
    .forEach((s) => {
      const days = Math.abs(salesService.daysUntilDue(s))
      notifications.push({
        id: `sale-${s.id}`,
        type: 'danger',
        title: 'Venta vencida',
        message: `Venta #${s.id.toString().slice(0, 8).toUpperCase()} vencida hace ${days} día(s)`,
        date: new Date(s.due_date),
        link: '/ventas',
      })
    })

  // Compras pendientes de recibir hace más de 3 días
  const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000
  purchases
    .filter((p) => p.status === 'pendiente' && Date.now() - new Date(p.created_at).getTime() > THREE_DAYS_MS)
    .forEach((p) => {
      const days = Math.floor((Date.now() - new Date(p.created_at).getTime()) / (24 * 60 * 60 * 1000))
      notifications.push({
        id: `purchase-${p.id}`,
        type: 'warning',
        title: 'Compra pendiente de recibir',
        message: `Orden a proveedor lleva ${days} día(s) sin marcarse como recibida`,
        date: new Date(p.created_at),
        link: '/compras',
      })
    })

  return notifications.sort((a, b) => b.date - a.date)
}
