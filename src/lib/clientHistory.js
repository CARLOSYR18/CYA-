import { clientsService } from '../services/clientsService'
import { salesService } from '../services/salesService'

// El historial de clientes nace solo de las ventas, no de un CRUD manual.
export async function getClientsHistory() {
  const [clients, sales] = await Promise.all([clientsService.list(), salesService.list()])
  return clients
    .map((c) => {
      const clientSales = sales
        .filter((s) => s.client_id === c.id)
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      return {
        ...c,
        salesCount: clientSales.length,
        totalSpent: clientSales.reduce((sum, s) => sum + salesService.saleTotal(s), 0),
        lastPurchase: clientSales[0]?.created_at || null,
        sales: clientSales,
      }
    })
    .filter((c) => c.salesCount > 0)
    .sort((a, b) => new Date(b.lastPurchase) - new Date(a.lastPurchase))
}
