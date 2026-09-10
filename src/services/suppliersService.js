import { createCrudService } from './crudFactory'
export const suppliersService = createCrudService('suppliers', { orderBy: 'name', ascending: true })
