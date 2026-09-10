import { createCrudService } from './crudFactory'
export const clientsService = createCrudService('clients', { orderBy: 'name', ascending: true })
