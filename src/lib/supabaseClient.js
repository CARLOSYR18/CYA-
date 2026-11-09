import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

const hasValidConfig = Boolean(url && anonKey && !url.includes('TU_PROYECTO'))
const explicitDemoMode = import.meta.env.VITE_DEMO_MODE === 'true'

// En producción, si faltan las variables y no se especificó VITE_DEMO_MODE=true, bloquear modo demo inseguro
if (!hasValidConfig && import.meta.env.PROD && !explicitDemoMode) {
  const errMsg = 'Error de Configuración: Falta VITE_SUPABASE_URL o VITE_SUPABASE_ANON_KEY en el entorno de producción. Por seguridad, la aplicación no arranca en modo demo.'
  console.error(errMsg)
  if (typeof window !== 'undefined') {
    window.__CYA_CONFIG_ERROR__ = errMsg
  }
}

export const isSupabaseConfigured = hasValidConfig

export const supabase = isSupabaseConfigured
  ? createClient(url, anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null
