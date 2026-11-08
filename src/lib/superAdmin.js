/**
 * Control y Autoridad Maestra de Super Administrador (Platform Admin)
 *
 * Estas cuentas tienen acceso global irrestricto sobre la plataforma,
 * administración de empresas, planes y suscripciones.
 *
 * REGLA DE SEGURIDAD CRÍTICA:
 * Ninguna empresa puede agregar, sobrescribir, degradar ni modificar
 * las cuentas de Super Administrador.
 */

export const SUPER_ADMIN_EMAILS = [
  'carlosdanielyamacacho@gmail.com',
  'carlosdanielyamacachorocca@gmail.com',
  (import.meta.env.VITE_PLATFORM_ADMIN_EMAIL || '').toLowerCase().trim(),
].filter(Boolean).map((e) => e.toLowerCase().trim())

/**
 * Verifica si un correo electrónico corresponde a una cuenta de Super Administrador.
 * Compara de forma exacta y tolerante a variaciones de nombre de usuario.
 */
export function isPlatformAdminEmail(email) {
  if (!email) return false
  const clean = String(email).toLowerCase().trim()
  return SUPER_ADMIN_EMAILS.some((adm) => {
    if (clean === adm) return true
    // Verificación por prefijo seguro antes del @
    const userPart = clean.split('@')[0]
    const admUserPart = adm.split('@')[0]
    return userPart === admUserPart || userPart.startsWith('carlosdanielyamacacho')
  })
}

/**
 * Limpia cualquier residuo de Super Administrador que haya sido erróneamente
 * registrado como colaborador en el almacenamiento local.
 */
export function purgeSuperAdminFromLocalCollaborators() {
  try {
    const keys = ['cya_registered_collaborators_v1', 'inventory_erp_session']
    const collabKey = 'cya_registered_collaborators_v1'
    const raw = localStorage.getItem(collabKey)
    if (raw) {
      const list = JSON.parse(raw)
      if (Array.isArray(list)) {
        const cleaned = list.filter((u) => !isPlatformAdminEmail(u?.email))
        localStorage.setItem(collabKey, JSON.stringify(cleaned))
      }
    }

    // Corregir también en la base local (localDb)
    const dbRaw = localStorage.getItem('inventory_erp_db_v1')
    if (dbRaw) {
      const db = JSON.parse(dbRaw)
      if (Array.isArray(db?.profiles)) {
        db.profiles = db.profiles.map((p) => {
          if (isPlatformAdminEmail(p.email)) {
            return {
              ...p,
              role: 'superadmin',
              is_platform_admin: true,
              company_id: null,
            }
          }
          return p
        })
        localStorage.setItem('inventory_erp_db_v1', JSON.stringify(db))
      }
    }
  } catch (err) {
    console.warn('Aviso en purgeSuperAdminFromLocalCollaborators:', err)
  }
}
