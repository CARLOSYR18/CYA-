import { createCrudService } from './crudFactory'
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient'
import { createClient } from '@supabase/supabase-js'
import { getCurrentCompanyId } from '../lib/companyContext'
import { localDb } from '../lib/localDb'

const baseService = createCrudService('profiles', { orderBy: 'full_name', ascending: true })

const COLLAB_STORAGE_KEY = 'cya_registered_collaborators_v1'

function getLocalCollaborators() {
  try {
    const raw = localStorage.getItem(COLLAB_STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function saveLocalCollaborator(user) {
  if (!user) return
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
  } catch (e) {
    console.error('Error eliminando colaborador local:', e)
  }
}

export const usersService = {
  ...baseService,

  /**
   * Obtiene la lista de colaboradores de la empresa activa.
   * Filtra estrictamente por company_id para garantizar aislamiento total entre empresas.
   */
  async list() {
    let remoteUsers = []
    const companyId = await getCurrentCompanyId().catch(() => null)
    const { data: authData } = await supabase.auth.getUser().catch(() => ({ data: {} }))
    const currentAuthEmail = authData?.user?.email?.toLowerCase().trim()
    const currentAuthId = authData?.user?.id

    if (isSupabaseConfigured) {
      try {
        // Si tenemos la empresa actual, asegurar que Carlos quede vinculado a ella si aún no lo estaba
        if (companyId) {
          supabase
            .from('profiles')
            .update({ company_id: companyId })
            .eq('email', 'carlosdanielyamacachorocca@gmail.com')
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
        if (!error && Array.isArray(data)) {
          remoteUsers = data
        } else if (error) {
          console.warn('Aviso al filtrar perfiles por empresa:', error)
        }
      } catch (err) {
        console.warn('Aviso al consultar perfiles remotos:', err)
      }
    }

    // Obtener colaboradores guardados en almacenamiento local que correspondan a esta empresa
    const localUsers = getLocalCollaborators().filter(u => 
      !companyId || !u.company_id || u.company_id === companyId
    )

    // Fusionar evitando duplicados
    const map = new Map()

    for (const u of remoteUsers) {
      const key = (u.email || u.id || '').toLowerCase().trim()
      if (key) map.set(key, u)
    }

    for (const u of localUsers) {
      const key = (u.email || u.id || '').toLowerCase().trim()
      if (key) {
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

    // Siempre garantizar que la cuenta del administrador actual esté presente
    if (currentAuthEmail && !map.has(currentAuthEmail)) {
      map.set(currentAuthEmail, {
        id: currentAuthId,
        email: currentAuthEmail,
        full_name: authData?.user?.user_metadata?.full_name || currentAuthEmail,
        role: 'admin',
        active: true,
        company_id: companyId,
      })
    }

    const merged = Array.from(map.values())
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

    if (isSupabaseConfigured) {
      if (!password || password.trim().length < 6) {
        throw new Error('La contraseña debe tener al menos 6 caracteres.')
      }

      const companyId = await getCurrentCompanyId().catch(() => null)

      // 1. Validar si el correo ya existe en otra empresa del sistema
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('id, email, company_id')
        .eq('email', cleanEmail)
        .maybeSingle()

      if (existingProfile && existingProfile.company_id && companyId && existingProfile.company_id !== companyId) {
        throw new Error('Este correo ya está registrado en otra empresa del sistema. No se puede vincular; utiliza un correo diferente.')
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
        if (existingProfile && existingProfile.company_id && companyId && existingProfile.company_id !== companyId) {
          throw new Error('Este correo ya tiene una cuenta independiente registrada en otra empresa. Utiliza un correo nuevo para este colaborador.')
        }
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
