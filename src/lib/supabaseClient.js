import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// A8: Protección estricta: en producción se requiere Supabase configurado obligatoriamente
// El modo demo solo es admisible en desarrollo local o si se activa explícitamente VITE_DEMO_MODE=true
const hasValidConfig = Boolean(url && anonKey && !url.includes('TU_PROYECTO'))
const explicitDemoMode = import.meta.env.VITE_DEMO_MODE === 'true'

if (!hasValidConfig && import.meta.env.PROD && !explicitDemoMode) {
  console.error(
    'CRÍTICO: Variables VITE_SUPABASE_URL o VITE_SUPABASE_ANON_KEY no encontradas en producción. Por seguridad se prohíbe caer en modo demo con contraseñas en texto plano.'
  )
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
