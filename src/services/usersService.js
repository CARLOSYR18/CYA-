import { createCrudService } from './crudFactory'
// Table name is "profiles" to match Supabase's convention of a profiles
// table linked 1-to-1 with auth.users (see supabase/schema.sql).
export const usersService = createCrudService('profiles', { orderBy: 'full_name', ascending: true })
