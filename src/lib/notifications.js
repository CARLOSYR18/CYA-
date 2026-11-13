import { productsService } from '../services/productsService'
import { salesService } from '../services/salesService'
import { purchasesService } from '../services/purchasesService'
import { inventoryMovementsService } from '../services/inventoryMovementsService'
import { usersService } from '../services/usersService'
import { companySettingsService } from '../services/companySettingsService'

const READ_STORAGE_PREFIX = 'cya_read_notifications_'

export function getReadNotificationIds(companyId = 'default') {
  try {
    const raw = localStorage.getItem(`${READ_STORAGE_PREFIX}${companyId}`)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

export function markNotificationAsRead(id, companyId = 'default') {
  try {
    const current = getReadNotificationIds(companyId)
    if (!current.includes(id)) {
      const updated = [...current, id]
      localStorage.setItem(`${READ_STORAGE_PREFIX}${companyId}`, JSON.stringify(updated))
    }
  } catch (err) {
    console.error('Error al guardar notificación leída:', err)
  }
}

export function markAllNotificationsAsRead(ids, companyId = 'default') {
  try {
    const current = new Set(getReadNotificationIds(companyId))
    ids.forEach((id) => current.add(id))
    localStorage.setItem(`${READ_STORAGE_PREFIX}${companyId}`, JSON.stringify(Array.from(current)))
  } catch (err) {
    console.error('Error al marcar todas las notificaciones como leídas:', err)
  }
}

export function clearReadNotifications(companyId = 'default') {
  try {
    localStorage.removeItem(`${READ_STORAGE_PREFIX}${companyId}`)
  } catch {}
}

/**
 * Alertas compactas para el Topbar y Asistente Virtual
 */
export async function getNotifications() {
  const [products, sales, purchases] = await Promise.all([
    productsService.list().catch(() => []),
    salesService.list().catch(() => []),
    purchasesService.list().catch(() => []),
  ])

  const notifications = []

  // Stock bajo o agotado (ignora combos: su stock ya viene del producto base)
  products
    .filter((p) => !p.is_kit && p.stock <= p.min_stock)
    .forEach((p) => {
      notifications.push({
        id: `stock-${p.id}`,
        type: p.stock <= 0 ? 'danger' : 'warning',
        category: 'inventario',
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
        category: 'ventas',
        title: 'Venta vencida',
        message: `Venta #${s.id.toString().slice(0, 8).toUpperCase()} vencida hace ${days} día(s)`,
        date: new Date(s.due_date || s.created_at || Date.now()),
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
        category: 'compras',
        title: 'Compra pendiente de recibir',
        message: `Orden a proveedor lleva ${days} día(s) sin marcarse como recibida`,
        date: new Date(p.created_at),
        link: '/compras',
      })
    })

  return notifications.sort((a, b) => b.date - a.date)
}

/**
 * Registro completo, conectado y detallado para el Centro de Notificaciones (/notificaciones)
 * Cruza existencias, kardex, ventas, compras, colaboradores y estado de plan.
 */
export async function getDetailedNotifications() {
  const [products, sales, purchases, movements, users, company] = await Promise.all([
    productsService.list().catch(() => []),
    salesService.list().catch(() => []),
    purchasesService.list().catch(() => []),
    inventoryMovementsService.list().catch(() => []),
    usersService.list().catch(() => []),
    companySettingsService.get().catch(() => null),
  ])

  const notifications = []
  const now = Date.now()

  // 1. Alertas de Inventario: Stock Agotado (Crítico)
  products
    .filter((p) => !p.is_kit && p.stock <= 0)
    .forEach((p) => {
      notifications.push({
        id: `stock-out-${p.id}`,
        category: 'inventario',
        priority: 'critico',
        type: 'danger',
        title: 'Producto Agotado en Catálogo',
        message: `El producto "${p.name}" (SKU: ${p.sku || 'S/N'}) tiene 0 unidades en almacén. Se requiere reposición urgente.`,
        itemReference: p.sku || p.name,
        actionLabel: 'Ver Producto en Catálogo',
        link: '/productos',
        date: new Date(),
        isLiveAlert: true,
      })
    })

  // 2. Alertas de Inventario: Stock Bajo (Advertencia)
  products
    .filter((p) => !p.is_kit && p.stock > 0 && p.stock <= p.min_stock)
    .forEach((p) => {
      notifications.push({
        id: `stock-low-${p.id}`,
        category: 'inventario',
        priority: 'atencion',
        type: 'warning',
        title: 'Stock Mínimo Alcanzado',
        message: `"${p.name}" cuenta con solo ${p.stock} unidad(es) (Mínimo establecido: ${p.min_stock}).`,
        itemReference: p.sku || p.name,
        actionLabel: 'Abastecer Stock',
        link: '/productos',
        date: new Date(),
        isLiveAlert: true,
      })
    })

  // 3. Ventas: Créditos Vencidos (Crítico)
  sales
    .filter((s) => salesService.isOverdue(s))
    .forEach((s) => {
      const days = Math.abs(salesService.daysUntilDue(s))
      const code = s.id ? s.id.toString().slice(0, 8).toUpperCase() : 'S/N'
      const clientName = s.client_name || 'Cliente sin nombre'
      notifications.push({
        id: `sale-overdue-${s.id}`,
        category: 'ventas',
        priority: 'critico',
        type: 'danger',
        title: 'Venta al Crédito Vencida',
        message: `Venta #${code} a "${clientName}" por S/ ${Number(s.total || 0).toFixed(2)} venció hace ${days} día(s).`,
        itemReference: `#${code}`,
        actionLabel: 'Ver Cobranza / Comprobante',
        link: '/ventas',
        date: new Date(s.due_date || s.created_at || now),
        isLiveAlert: true,
      })
    })

  // 4. Compras: Pedidos a Proveedor Pendientes de Recepción
  purchases
    .filter((p) => p.status === 'pendiente')
    .forEach((p) => {
      const elapsedDays = Math.floor((now - new Date(p.created_at).getTime()) / (24 * 60 * 60 * 1000))
      const isUrgent = elapsedDays >= 3
      const supplierName = p.supplier_name || 'Proveedor'
      notifications.push({
        id: `purchase-pending-${p.id}`,
        category: 'compras',
        priority: isUrgent ? 'atencion' : 'info',
        type: isUrgent ? 'warning' : 'info',
        title: isUrgent ? 'Compra con Recepción Retrasada' : 'Orden de Compra Pendiente',
        message: `Orden de compra a "${supplierName}" por S/ ${Number(p.total || 0).toFixed(2)} lleva ${elapsedDays} día(s) sin recepción en almacén.`,
        itemReference: p.id.toString().slice(0, 8).toUpperCase(),
        actionLabel: 'Revisar Orden de Compra',
        link: '/compras',
        date: new Date(p.created_at),
        isLiveAlert: isUrgent,
      })
    })

  // 5. Registro de Movimientos de Inventario Recientes (Últimos 10)
  const recentMovements = movements
    .filter((m) => m.created_at && now - new Date(m.created_at).getTime() < 7 * 24 * 60 * 60 * 1000)
    .slice(0, 10)

  recentMovements.forEach((m) => {
    const isEntry = m.type === 'entrada'
    notifications.push({
      id: `mov-${m.id}`,
      category: 'inventario',
      priority: 'registro',
      type: isEntry ? 'success' : 'info',
      title: isEntry ? 'Ingreso de Mercadería Registrado' : 'Salida de Inventario Registrada',
      message: `${isEntry ? '+' : '-'}${m.quantity} unidad(es) — Motivo: ${m.reason || 'Movimiento de stock'}.`,
      itemReference: m.reference || m.id.toString().slice(0, 8).toUpperCase(),
      actionLabel: 'Ver en Libro Kardex',
      link: '/movimientos',
      date: new Date(m.created_at),
      isLiveAlert: false,
    })
  })

  // 6. Colaboradores: Altas recientes en el equipo
  const recentUsers = users
    .filter((u) => u.created_at && now - new Date(u.created_at).getTime() < 14 * 24 * 60 * 60 * 1000)
    .slice(0, 5)

  recentUsers.forEach((u) => {
    notifications.push({
      id: `user-joined-${u.id}`,
      category: 'usuarios',
      priority: 'registro',
      type: 'info',
      title: 'Colaborador Vinculado a la Empresa',
      message: `${u.full_name || u.email} se incorporó como ${u.role === 'admin' ? 'Administrador' : 'Empleado'}.`,
      itemReference: u.email,
      actionLabel: 'Gestionar Permisos',
      link: '/usuarios',
      date: new Date(u.created_at),
      isLiveAlert: false,
    })
  })

  // 7. Estado del Plan & Suscripción
  if (company?.plan_expires_at) {
    const expDate = new Date(company.plan_expires_at)
    const daysLeft = Math.ceil((expDate.getTime() - now) / (24 * 60 * 60 * 1000))

    if (daysLeft <= 0) {
      notifications.push({
        id: 'plan-expired',
        category: 'sistema',
        priority: 'critico',
        type: 'danger',
        title: 'Plan Pro Vencido',
        message: 'Tu suscripción Pro ha concluido. Renueva para continuar con usuarios e inventario ilimitados.',
        itemReference: 'Suscripción ERP',
        actionLabel: 'Renovar Plan Pro',
        link: '/planes',
        date: expDate,
        isLiveAlert: true,
      })
    } else if (daysLeft <= 5) {
      notifications.push({
        id: 'plan-expiring-soon',
        category: 'sistema',
        priority: 'atencion',
        type: 'warning',
        title: 'Vencimiento Próximo de Plan Pro',
        message: `Tu suscripción Pro vence en ${daysLeft} día(s) (${expDate.toLocaleDateString('es-PE')}).`,
        itemReference: 'Suscripción ERP',
        actionLabel: 'Extender Plan Pro',
        link: '/planes',
        date: new Date(),
        isLiveAlert: true,
      })
    }
  }

  // Ordenar cronológicamente (más recientes y alertas prioritarias primero)
  return notifications.sort((a, b) => {
    // Alertas críticas vivas primero
    if (a.isLiveAlert && !b.isLiveAlert) return -1
    if (!a.isLiveAlert && b.isLiveAlert) return 1
    return new Date(b.date).getTime() - new Date(a.date).getTime()
  })
}
