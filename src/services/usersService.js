import { createCrudService } from './crudFactory'
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient'
import { createClient } from '@supabase/supabase-js'
import { getCurrentCompanyId } from '../lib/companyContext'
import { localDb } from '../lib/localDb'
import { isPlatformAdminEmail, purgeSuperAdminFromLocalCollaborators } from '../lib/superAdmin'

const baseService = createCrudService('profiles', { orderBy: 'full_name', ascending: true })

const COLLAB_STORAGE_KEY = 'cya_registered_collaborators_v1'

function getLocalCollaborators() {
  try {
    const raw = localStorage.getItem(COLLAB_STORAGE_KEY)
    const list = raw ? JSON.parse(raw) : []
    if (!Array.isArray(list)) return []
    // Blindaje de seguridad: ningún Super Admin puede figurar como colaborador de empresa
    return list.filter(u => !isPlatformAdminEmail(u?.email))
  } catch {
    return []
  }
}

let cachedUsers = null
let cachedUsersTime = 0
let inFlightUsers = null

function invalidateUsersCache() {
  cachedUsers = null
  cachedUsersTime = 0
  baseService.invalidate()
}

function saveLocalCollaborator(user) {
  if (!user) return
  // Blindaje de seguridad: jamás guardar al Super Admin como colaborador de una empresa
  if (isPlatformAdminEmail(user?.email)) {
    console.warn('PROTECCIÓN SUPER ADMIN: Intento bloqueado de registrar cuenta de Super Admin como colaborador.')
    return
  }
  try {
    const list = getLocalCollaborators()
    const targetEmail = (user.email || '').toLowerCase().trim()
    const idx = list.findIndex(u => 
      (targetEmail && u.email && u.email.toLowerCase().trim() === targetEmail) || 
      (user.id && u.id && u.id === user.id)
    )
    if (idx >= 0) {
      list[idx] = { ...list[idx], ...user }
    } else {
      list.push(user)
    }
    localStorage.setItem(COLLAB_STORAGE_KEY, JSON.stringify(list))
    invalidateUsersCache()
  } catch (e) {
    console.error('Error guardando colaborador en almacenamiento local:', e)
  }
}

function removeLocalCollaborator(idOrEmail) {
  try {
    const target = (idOrEmail || '').toLowerCase().trim()
    const list = getLocalCollaborators().filter(u => 
      u.id !== idOrEmail && u.email?.toLowerCase().trim() !== target
    )
    localStorage.setItem(COLLAB_STORAGE_KEY, JSON.stringify(list))
    invalidateUsersCache()
  } catch (e) {
    console.error('Error eliminando colaborador local:', e)
  }
}

export const usersService = {
  ...baseService,

  getCached() {
    return cachedUsers
  },

  hasCache() {
    return cachedUsers !== null
  },

  invalidate: invalidateUsersCache,

  async list(options = {}) {
    const forceRefresh = options?.forceRefresh === true
    const now = Date.now()

    if (cachedUsers && !forceRefresh) {
      if (now - cachedUsersTime < 60000) {
        return cachedUsers
      }
      this._fetchUsers().then(res => { cachedUsers = res; cachedUsersTime = Date.now() }).catch(() => {})
      return cachedUsers
    }

    if (inFlightUsers) return inFlightUsers

    inFlightUsers = this._fetchUsers()
      .then(res => {
        cachedUsers = res
        cachedUsersTime = Date.now()
        return res
      })
      .finally(() => {
        inFlightUsers = null
      })

    return inFlightUsers
  },

  /**
   * Obtiene la lista de colaboradores de la empresa activa.
   * Filtra estrictamente por company_id para garantizar aislamiento total entre empresas.
   */
  async _fetchUsers() {
    // Saneamiento proactivo de datos residuales
    purgeSuperAdminFromLocalCollaborators()

    let remoteUsers = []
    const companyId = await getCurrentCompanyId().catch(() => null)
    const authData = (isSupabaseConfigured && supabase?.auth)
      ? await supabase.auth.getUser().catch(() => ({ data: {} }))
      : { data: {} }
    const currentAuthEmail = authData?.data?.user?.email?.toLowerCase().trim()
    const currentAuthId = authData?.data?.user?.id

    if (isSupabaseConfigured && supabase) {
      try {
        // Si tenemos la empresa actual, asegurar que el usuario autenticado quede vinculado a ella si aún no lo estaba
        // (NUNCA vincular a Super Admin a ninguna empresa)
        if (companyId && currentAuthId && !isPlatformAdminEmail(currentAuthEmail)) {
          supabase
            .from('profiles')
            .update({ company_id: companyId })
            .eq('id', currentAuthId)
            .is('company_id', null)
            .then(() => {})
            .catch(() => {})
        }

        let query = supabase.from('profiles').select('*').order('full_name', { ascending: true })
        
        // AISLAMIENTO MULTI-EMPRESA ESTRICTO:
        // Solo colaboradores que pertenezcan a la empresa del administrador actual
        if (companyId) {
          query = query.eq('company_id', companyId)
        }
        
        const { data, error } = await query
        if (!error && Array.isArray(data) && data.length > 0) {
          remoteUsers = data.filter(u => !isPlatformAdminEmail(u?.email))
        } else if (error) {
          console.warn('Aviso al filtrar perfiles por empresa:', error)
        }
      } catch (err) {
        console.warn('Aviso al consultar perfiles remotos:', err)
      }
    }

    // Obtener colaboradores guardados en almacenamiento local solo en modo offline
    let localUsers = isSupabaseConfigured
      ? []
      : getLocalCollaborators()
          .filter(u => !isPlatformAdminEmail(u?.email))
          .filter(u => !companyId || !u.company_id || u.company_id === companyId)

    // Solo en modo local offline (sin Supabase conectado), poblar con perfiles de demostración
    if (!isSupabaseConfigured && remoteUsers.length === 0 && localUsers.length === 0) {
      const seedProfiles = (localDb.getTable('profiles') || []).filter(u => !isPlatformAdminEmail(u?.email))
      localUsers = seedProfiles
    }

    // Fusionar evitando duplicados
    const map = new Map()

    for (const u of remoteUsers) {
      const key = (u.email || u.id || '').toLowerCase().trim()
      if (key && !isPlatformAdminEmail(key)) map.set(key, u)
    }

    for (const u of localUsers) {
      const key = (u.email || u.id || '').toLowerCase().trim()
      if (key && !isPlatformAdminEmail(key)) {
        if (!map.has(key)) {
          map.set(key, u)
        } else {
          const existing = map.get(key)
          if ((!existing.full_name || existing.full_name === existing.email) && u.full_name) {
            map.set(key, { ...existing, full_name: u.full_name })
          }
        }
      }
    }

    // Siempre garantizar que la cuenta del administrador actual de la empresa esté presente
    // (Excepto si es el Super Admin de la plataforma)
    if (currentAuthEmail && !isPlatformAdminEmail(currentAuthEmail) && !map.has(currentAuthEmail)) {
      map.set(currentAuthEmail, {
        id: currentAuthId,
        email: currentAuthEmail,
        full_name: authData?.user?.user_metadata?.full_name || currentAuthEmail,
        role: authData?.user?.role || 'superadmin',
        active: true,
        company_id: companyId,
      })
    }

    const merged = Array.from(map.values()).filter(u => !isPlatformAdminEmail(u?.email))
    return merged.sort((a, b) => 
      (a.full_name || a.email || '').localeCompare(b.full_name || b.email || '')
    )
  },

  async checkEmailAvailability(email, excludeUserId = null) {
    const cleanEmail = String(email || '').trim().toLowerCase()
    if (!cleanEmail) return { available: true }

    if (isPlatformAdminEmail(cleanEmail)) {
      return {
        available: false,
        reason: 'platform_admin',
        message: `El correo "${cleanEmail}" pertenece al Administrador Principal de la plataforma (Super Admin). No puede agregarse como colaborador de ninguna empresa.`
      }
    }

    if (!isSupabaseConfigured) {
      const existingLocalProfiles = localDb.getTable('profiles') || []
      const matchLocal = [...existingLocalProfiles, ...getLocalCollaborators()].find(
        (p) => p?.email && p.email.toLowerCase().trim() === cleanEmail && (!excludeUserId || String(p.id) !== String(excludeUserId))
      )
      if (matchLocal) {
        return {
          available: false,
          reason: matchLocal.is_platform_admin ? 'platform_admin' : 'existing_account',
          message: matchLocal.is_platform_admin
            ? 'Este correo pertenece al Administrador Principal de la plataforma (Super Admin) y no puede registrarse en una empresa.'
            : `El correo "${cleanEmail}" ya tiene una cuenta registrada en el sistema. Usa un correo nuevo para este colaborador.`
        }
      }
      return { available: true }
    }

    try {
      const { data: rpcData, error: rpcErr } = await supabase.rpc('check_email_registered', {
        p_email: cleanEmail
      })

      if (!rpcErr && rpcData) {
        if (rpcData.is_platform_admin) {
          return {
            available: false,
            reason: 'platform_admin',
            message: 'Este correo pertenece al Administrador Principal de la plataforma (Super Admin), quien gestiona planes y empresas. No puede agregarse como colaborador.'
          }
        }
        if (rpcData.in_current_company && !excludeUserId) {
          return {
            available: false,
            reason: 'same_company',
            message: `El correo "${cleanEmail}" ya está registrado como colaborador en tu empresa.`
          }
        }
        if (rpcData.exists && !excludeUserId) {
          return {
            available: false,
            reason: 'existing_account',
            message: `El correo "${cleanEmail}" ya tiene una cuenta creada en el sistema (otra empresa o cuenta principal). No puedes agregar usuarios que ya tienen cuenta; utiliza un correo nuevo.`
          }
        }
        return { available: true }
      }

      // Si la RPC aún no se ejecutó en Supabase, consultar perfiles visibles por RLS
      const errMsg = (rpcErr?.message || '').toLowerCase()
      const rpcMissing = rpcErr?.code === 'PGRST202' || rpcErr?.code === '42883' || errMsg.includes('does not exist') || errMsg.includes('could not find the function')
      if (!rpcMissing && rpcErr) {
        console.warn('Aviso al validar disponibilidad de correo:', rpcErr.message)
      }
    } catch (err) {
      console.warn('Aviso en checkEmailAvailability:', err)
    }

    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('id, email, is_platform_admin')
      .eq('email', cleanEmail)
      .maybeSingle()

    if (existingProfile && (!excludeUserId || String(existingProfile.id) !== String(excludeUserId))) {
      return {
        available: false,
        reason: existingProfile.is_platform_admin ? 'platform_admin' : 'same_company',
        message: existingProfile.is_platform_admin
          ? 'Este correo pertenece al Super Admin de la plataforma y no puede agregarse como colaborador.'
          : 'Este correo ya está registrado en tu empresa. No se puede crear un usuario duplicado.'
      }
    }

    return { available: true, fallbackOnly: true }
  },

  /**
   * Crea un usuario en el sistema.
   * Con Supabase: valida que el correo no pertenezca a ninguna cuenta existente
   * ni al Super Admin, crea el usuario en auth.users mediante un cliente aislado
   * y lo vincula de forma segura a la empresa actual.
   */
  async create({ email, password, full_name, role = 'empleado', active = true }) {
    const cleanEmail = email.trim().toLowerCase()
    const cleanName = full_name.trim()

    // 0. VALIDACIÓN GLOBAL ESTRICTA: Bloquear Super Admin y cualquier cuenta ya creada
    const availability = await this.checkEmailAvailability(cleanEmail)
    if (!availability.available) {
      throw new Error(availability.message)
    }

    if (isSupabaseConfigured) {
      if (!password || password.trim().length < 6) {
        throw new Error('La contraseña debe tener al menos 6 caracteres.')
      }

      const companyId = await getCurrentCompanyId().catch(() => null)

      const url = import.meta.env.VITE_SUPABASE_URL
      const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

      // Cliente temporal aislado para no cerrar ni alterar la sesión del admin en localStorage
      const tempClient = createClient(url, anonKey, {
        auth: {
          storageKey: 'sb-cya-temp-create-user',
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false,
        },
      })

      const { data: authData, error: authError } = await tempClient.auth.signUp({
        email: cleanEmail,
        password: password.trim(),
        options: {
          data: {
            full_name: cleanName,
            role,
          },
        },
      })

      // Si Supabase devuelve identities vacío, o una cuenta antigua (>5 min), el usuario ya existía en Authentication
      const createdAtMs = authData?.user?.created_at ? new Date(authData.user.created_at).getTime() : null
      const isOldAccount = createdAtMs && (Date.now() - createdAtMs > 5 * 60 * 1000)
      if (!authError && authData?.user && ((Array.isArray(authData.user.identities) && authData.user.identities.length === 0) || isOldAccount)) {
        throw new Error('Este correo ya tiene una cuenta registrada en el sistema. No puedes agregar usuarios ya existentes; utiliza un correo nuevo para este colaborador.')
      }

      if (authError) {
        const raw = authError.message || ''
        const msg = raw.toLowerCase()
        if (msg.includes('already registered') || msg.includes('user already exists') || msg.includes('email_exists') || msg.includes('already been registered')) {
          throw new Error('Este correo ya tiene una cuenta registrada en el sistema. No puedes agregar usuarios ya existentes; utiliza un correo nuevo.')
        }
        if (msg.includes('password should contain') || msg.includes('at least one character') || msg.includes('characters')) {
          throw new Error('La contraseña no es válida: debe contener al menos 6 caracteres, incluyendo una letra mayúscula (A-Z), una minúscula (a-z) y un número (0-9). Ejemplo: Carlos123')
        }
        if (msg.includes('invalid email') || msg.includes('valid email')) {
          throw new Error('El formato del correo electrónico ingresado no es válido.')
        }
        throw new Error(`Error de autenticación: ${raw}`)
      }

      const newUserId = authData?.user?.id || `usr_${Date.now()}`

      const localRecord = {
        id: newUserId,
        email: cleanEmail,
        full_name: cleanName,
        role,
        active,
        created_at: new Date().toISOString(),
        ...(companyId ? { company_id: companyId } : {})
      }

      // A6: Vincular al colaborador a la empresa mediante RPC segura en Postgres
      // La RPC valida que el perfil haya sido creado recientemente (< 15 min) y no sea Super Admin ni de otra empresa
      const { data: rpcProfile, error: rpcErr } = await supabase.rpc('add_user_to_my_company', {
        p_user_id: newUserId,
        p_full_name: cleanName,
        p_role: role,
        p_active: active
      })

      if (rpcErr) {
        console.error('Error en add_user_to_my_company:', rpcErr)
        throw new Error(rpcErr.message || 'No se pudo vincular el colaborador a la empresa.')
      }

      if (rpcProfile) {
        saveLocalCollaborator(rpcProfile)
        invalidateUsersCache()
        return rpcProfile
      }

      saveLocalCollaborator(localRecord)
      invalidateUsersCache()
      return localRecord
    }

    // Modo local / demo
    if (isPlatformAdminEmail(cleanEmail)) {
      throw new Error(`PROTECCIÓN DE SEGURIDAD: El correo "${cleanEmail}" pertenece al Super Admin y no puede registrarse como colaborador.`)
    }
    const createdLocal = baseService.create({
      email: cleanEmail,
      password,
      full_name: cleanName,
      role,
      active,
    })
    saveLocalCollaborator(createdLocal)
    invalidateUsersCache()
    return createdLocal
  },

  async update(id, patch) {
    if (patch?.email && isPlatformAdminEmail(patch.email)) {
      throw new Error('PROTECCIÓN DE SEGURIDAD: No se puede asignar el correo del Super Admin a un usuario.')
    }
    if (isSupabaseConfigured) {
      const { data, error } = await supabase
        .from('profiles')
        .update(patch)
        .eq('id', id)
        .select()
        .maybeSingle()
      if (error) {
        throw new Error(error.message || 'No se pudo actualizar el colaborador en Supabase.')
      }
      if (data) {
        saveLocalCollaborator(data)
        invalidateUsersCache()
        return data
      }
    }
    saveLocalCollaborator({ id, ...patch })
    return baseService.update(id, patch)
  },

  async remove(id) {
    if (isSupabaseConfigured) {
      const { data: rpcData, error: rpcErr } = await supabase.rpc('remove_user_from_my_company', {
        p_user_id: id
      })

      if (!rpcErr) {
        removeLocalCollaborator(id)
        invalidateUsersCache()
        baseService.invalidate()
        return rpcData
      }

      const errMsg = (rpcErr.message || '').toLowerCase()
      const rpcMissing =
        rpcErr.code === 'PGRST202' ||
        rpcErr.code === '42883' ||
        errMsg.includes('could not find the function') ||
        errMsg.includes('does not exist')

      if (!rpcMissing) {
        throw new Error(rpcErr.message || 'No se pudo desvincular al usuario de tu empresa.')
      }

      // Fallback si la RPC aún no fue ejecutada en Supabase
      const { data: deletedRows, error: delErr } = await supabase
        .from('profiles')
        .delete()
        .eq('id', id)
        .select('id')

      if (delErr || !deletedRows || deletedRows.length === 0) {
        throw new Error(
          'Supabase bloqueó quitar este usuario por las políticas de seguridad (RLS). Ejecuta la migración "supabase/migrations/20261111_users_unlink_and_email_check.sql" en el SQL Editor de Supabase y vuelve a intentarlo.'
        )
      }

      removeLocalCollaborator(id)
      invalidateUsersCache()
      baseService.invalidate()
      return deletedRows[0]
    }

    removeLocalCollaborator(id)
    return baseService.remove(id)
  },
}
