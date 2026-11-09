/**
 * Control y Autoridad Maestra de Super Administrador (Platform Admin)
 *
 * La autoridad real proviene de la columna protegida `profiles.is_platform_admin`
 * en la base de datos Supabase (custodiada por RLS y Triggers).
 * Opcionalmente se puede configurar VITE_PLATFORM_ADMIN_EMAIL en el archivo .env.
 */

const envAdmin = (import.meta.env.VITE_PLATFORM_ADMIN_EMAIL || '').toLowerCase().trim()

export const SUPER_ADMIN_EMAILS = envAdmin ? [envAdmin] : []

/**
 * Verifica si un correo electrónico coincide exactamente con la variable de entorno de Super Admin.
 * No utiliza coincidencias por prefijo para evitar falsos positivos o accesos no deseados.
 */
export function isPlatformAdminEmail(email) {
  if (!email || SUPER_ADMIN_EMAILS.length === 0) return false
  const clean = String(email).toLowerCase().trim()
  return SUPER_ADMIN_EMAILS.includes(clean)
}

/**
 * Limpia cualquier residuo de Super Administrador que haya sido erróneamente
 * registrado como colaborador en el almacenamiento local.
 */
export function purgeSuperAdminFromLocalCollaborators() {
  try {
    const collabKey = 'cya_registered_collaborators_v1'
    const raw = localStorage.getItem(collabKey)
    if (raw) {
      const list = JSON.parse(raw)
      if (Array.isArray(list)) {
        const cleaned = list.filter((u) => !isPlatformAdminEmail(u?.email) && !u?.is_platform_admin)
        localStorage.setItem(collabKey, JSON.stringify(cleaned))
      }
    }

    const dbRaw = localStorage.getItem('inventory_erp_db_v1')
    if (dbRaw) {
      const db = JSON.parse(dbRaw)
      if (db?.profiles && Array.isArray(db.profiles)) {
        db.profiles = db.profiles.map((p) => {
          if (isPlatformAdminEmail(p.email) || p.is_platform_admin) {
            return { ...p, role: 'admin', is_platform_admin: true, company_id: null }
          }
          return p
        })
        localStorage.setItem('inventory_erp_db_v1', JSON.stringify(db))
      }
    }
  } catch (e) {
    console.error('Error al depurar colaboradores locales:', e)
  }
}
