import { createCrudService } from './crudFactory'
export const categoriesService = createCrudService('categories', { orderBy: 'name', ascending: true })
