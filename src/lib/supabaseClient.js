import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// isSupabaseConfigured is true only once you paste real values into .env
// (see .env.example). Until then, every service in src/services/ falls
// back to the local mock database in src/lib/localDb.js automatically,
// so the app is fully usable before Supabase exists.
export const isSupabaseConfigured = Boolean(url && anonKey && !url.includes('TU_PROYECTO'))

export const supabase = isSupabaseConfigured ? createClient(url, anonKey) : null
