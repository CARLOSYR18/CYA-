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

    // Obtener colaboradores guardados en almacenamiento local que correspondan a esta empresa
    let localUsers = getLocalCollaborators()
      .filter(u => !isPlatformAdminEmail(u?.email))
      .filter(u => !companyId || !u.company_id || u.company_id === companyId)

    // Si tanto remotos como locales registrados están vacíos, cargar de localDb (seedData)
    if (remoteUsers.length === 0 && localUsers.length === 0) {
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
        role: 'admin',
        active: true,
        company_id: companyId,
      })
    }

    const merged = Array.from(map.values()).filter(u => !isPlatformAdminEmail(u?.email))
    return merged.sort((a, b) => 
      (a.full_name || a.email || '').localeCompare(b.full_name || b.email || '')
    )
  },

  /**
   * Crea un usuario en el sistema.
   * Con Supabase: crea el usuario en auth.users mediante un cliente aislado
   * (sin sobrescribir la sesión del admin) y sincroniza su perfil con el rol y empresa.
   * Además respalda el registro en almacenamiento local para disponibilidad inmediata.
   */
  async create({ email, password, full_name, role = 'empleado', active = true }) {
    const cleanEmail = email.trim().toLowerCase()
    const cleanName = full_name.trim()

    // 0. BLINDAJE CRÍTICO: Bloquear registro o asignación de Super Admin como colaborador de empresa
    if (isPlatformAdminEmail(cleanEmail)) {
      throw new Error(
        `PROTECCIÓN DE SEGURIDAD: El correo "${cleanEmail}" pertenece a la Administración General de la Plataforma (Super Admin). Está estrictamente prohibido registrarlo como colaborador de una empresa.`
      )
    }

    // Validar en local si ya existe para evitar sobrescrituras no deseadas
    const existingLocalProfiles = localDb.getTable('profiles') || []
    const alreadyExistsInLocal = existingLocalProfiles.some(p => p.email && p.email.toLowerCase().trim() === cleanEmail)
    const alreadyExistsInLocalCollab = getLocalCollaborators().some(p => p.email && p.email.toLowerCase().trim() === cleanEmail)
    if (alreadyExistsInLocal || alreadyExistsInLocalCollab) {
      throw new Error(`El correo "${cleanEmail}" ya se encuentra registrado en el sistema. No se puede sobrescribir una cuenta existente.`)
    }

    if (isSupabaseConfigured) {
      if (!password || password.trim().length < 6) {
        throw new Error('La contraseña debe tener al menos 6 caracteres.')
      }

      const companyId = await getCurrentCompanyId().catch(() => null)

      // 1. Validar si el correo ya existe en cualquier empresa o perfil del sistema
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('id, email, company_id')
        .eq('email', cleanEmail)
        .maybeSingle()

      if (existingProfile) {
        throw new Error('Este correo ya está registrado en el sistema. No se puede registrar un usuario duplicado ni cambiar su cuenta.')
      }

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

      // Si Supabase devuelve identities vacío, el usuario ya existía en Authentication
      if (!authError && authData?.user?.identities && authData.user.identities.length === 0) {
        throw new Error('Este correo ya tiene una cuenta independiente registrada. Utiliza un correo nuevo para este colaborador.')
      }

      if (authError) {
        const raw = authError.message || ''
        const msg = raw.toLowerCase()
        if (msg.includes('already registered') || msg.includes('user already exists')) {
          throw new Error('Este correo electrónico ya está registrado. Por favor utiliza otro correo.')
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

      // Guardar inmediatamente en la persistencia local
      saveLocalCollaborator(localRecord)

      // A6: Vincular al colaborador a la empresa mediante RPC segura en Postgres
      try {
        const { data: rpcProfile, error: rpcErr } = await supabase.rpc('add_user_to_my_company', {
          p_user_id: newUserId,
          p_full_name: cleanName,
          p_role: role,
          p_active: active
        })
        if (!rpcErr && rpcProfile) {
          saveLocalCollaborator(rpcProfile)
          return rpcProfile
        }
      } catch (e) {
        console.warn('RPC add_user_to_my_company fallback a upsert:', e)
      }

      // Actualizar o insertar el perfil con rol y empresa usando la sesión del admin actual
      try {
        let { data: profile, error: profileError } = await supabase
          .from('profiles')
          .upsert({
            id: newUserId,
            email: cleanEmail,
            full_name: cleanName,
            role,
            active,
            ...(companyId ? { company_id: companyId } : {})
          })
          .select()
          .maybeSingle()

        if (profileError) {
          // Reintentar sin company_id si la columna no existe en la tabla profiles
          const { data: retryProfile, error: retryErr } = await supabase
            .from('profiles')
            .upsert({
              id: newUserId,
              email: cleanEmail,
              full_name: cleanName,
              role,
              active,
            })
            .select()
            .maybeSingle()

          if (!retryErr && retryProfile) {
            profile = retryProfile
          } else {
            console.warn('Perfil registrado localmente; sincronización en base de datos pendiente:', profileError)
          }
        }

        if (profile) {
          saveLocalCollaborator(profile)
          return profile
        }
      } catch (err) {
        console.warn('Aviso al guardar perfil remoto:', err)
      }

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
    return createdLocal
  },

  async update(id, patch) {
    if (patch?.email && isPlatformAdminEmail(patch.email)) {
      throw new Error('PROTECCIÓN DE SEGURIDAD: No se puede asignar el correo del Super Admin a un usuario.')
    }
    saveLocalCollaborator({ id, ...patch })
    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .update(patch)
          .eq('id', id)
          .select()
          .maybeSingle()
        if (!error && data) {
          saveLocalCollaborator(data)
          return data
        }
      } catch (err) {
        console.warn('Aviso al actualizar perfil:', err)
      }
    }
    return baseService.update(id, patch)
  },

  async remove(id) {
    removeLocalCollaborator(id)
    if (isSupabaseConfigured) {
      try {
        await supabase.from('profiles').delete().eq('id', id)
      } catch (err) {
        console.warn('Aviso al eliminar perfil:', err)
      }
    }
    return baseService.remove(id)
  },
}
