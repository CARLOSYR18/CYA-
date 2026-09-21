import { createCrudService } from './crudFactory'

export const planRequestsService = createCrudService('plan_requests', { orderBy: 'created_at', ascending: false })
