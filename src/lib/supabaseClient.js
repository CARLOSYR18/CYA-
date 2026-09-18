import { createClient } from '@supabase/supabase-js'
import { cookieStorage } from './cookieStorage'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const isSupabaseConfigured = Boolean(url && anonKey && !url.includes('TU_PROYECTO'))

export const supabase = isSupabaseConfigured
  ? createClient(url, anonKey, {
      auth: {
        storage: cookieStorage,
        persistSession: true,
        autoRefreshToken: true,
      },
    })
  : null
