import { createContext, useContext, useEffect, useRef, useState } from 'react'
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient'
import { localDb } from '../lib/localDb'
import { clearCompanyCache, setCompanyCache } from '../lib/companyContext'
import { isPlatformAdminEmail, purgeSuperAdminFromLocalCollaborators } from '../lib/superAdmin'
import { invalidateCache } from '../services/crudFactory'
import { clearStoredCompany, companySettingsService } from '../services/companySettingsService'
import AuthOverlay from '../components/ui/AuthOverlay'
import LogoutConfirmModal from '../components/ui/LogoutConfirmModal'

const AuthContext = createContext(null)
const SESSION_KEY = 'inventory_erp_session'
const LAST_USER_KEY = 'cya_last_user_id'

function getLastUserId() {
  try { return localStorage.getItem(LAST_USER_KEY) || null } catch { return null }
}

function setLastUserId(id) {
  try {
    if (id) localStorage.setItem(LAST_USER_KEY, id)
    else localStorage.removeItem(LAST_USER_KEY)
  } catch {}
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [profileLoaded, setProfileLoaded] = useState(false)
  const [authTransition, setAuthTransition] = useState(null)
  const [confirmLogoutOpen, setConfirmLogoutOpen] = useState(false)
  const currentUserIdRef = useRef(null)
  const inFlightProfileRef = useRef({ userId: null, promise: null })

  useEffect(() => {
    let isMounted = true

    // Purgar inmediatamente cualquier residuo de Super Administrador como colaborador
    purgeSuperAdminFromLocalCollaborators()

    if (isSupabaseConfigured) {
      // 1. Temporizador de seguridad: NUNCA dejar la UI bloqueada en loading más de 2s
      const fallbackTimer = setTimeout(() => {
        if (isMounted) setLoading(false)
      }, 2000)

      // 2. getSession() sin bloquear setLoading por la carga de perfil
      supabase.auth.getSession().then(({ data }) => {
        if (!isMounted) return
        const session = data?.session
        if (session?.user) {
          const prevStoredId = getLastUserId()
          const userChanged = (currentUserIdRef.current && currentUserIdRef.current !== session.user.id)
            || (prevStoredId && prevStoredId !== session.user.id)
          if (userChanged) {
            clearStoredCompany()
            clearCompanyCache()
            invalidateCache()
          }
          if (currentUserIdRef.current !== session.user.id) {
            currentUserIdRef.current = session.user.id
            setProfileLoaded(false)
          }
          setLastUserId(session.user.id)
          const isSuper = isPlatformAdminEmail(session.user.email)
          const meta = session.user.user_metadata || {}
          // El company_id sale estrictamente desde profiles (no del caché)
          // Si onAuthStateChange ya cargó el perfil del mismo usuario, preservarlo para no pisar company_id
          setUser((prev) => {
            if (prev && prev.id === session.user.id) return prev
            return {
              id: session.user.id,
              email: session.user.email,
              role: 'empleado',
              is_platform_admin: isSuper,
              company_id: null,
              avatar_url: meta.avatar_url || null
            }
          })
          if (isSuper) clearCompanyCache()

          // Cargar perfil en segundo plano sin bloquear
          loadProfile(session.user).catch(() => {})
        } else {
          currentUserIdRef.current = null
          setLastUserId(null)
          clearStoredCompany()
          clearCompanyCache()
          setProfileLoaded(true)
        }
        setLoading(false)
        clearTimeout(fallbackTimer)
      }).catch((e) => {
        console.warn('Aviso getSession:', e)
        if (isMounted) {
          setLoading(false)
          setProfileLoaded(true)
        }
        clearTimeout(fallbackTimer)
      })

      // 3. onAuthStateChange: SÍNCRONO (NUNCA async) para evitar deadlock interno en @supabase/auth-js
      const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
        if (!isMounted) return

        if (event === 'SIGNED_OUT' || !session) {
          currentUserIdRef.current = null
          setLastUserId(null)
          setUser(null)
          clearCompanyCache()
          clearStoredCompany()
          setLoading(false)
          setProfileLoaded(false)
          return
        }

        if (session?.user) {
          const prevStoredId = getLastUserId()
          const userChanged = (currentUserIdRef.current && currentUserIdRef.current !== session.user.id)
            || (prevStoredId && prevStoredId !== session.user.id)
          if (userChanged) {
            clearStoredCompany()
            clearCompanyCache()
            invalidateCache()
          }
          if (currentUserIdRef.current !== session.user.id) {
            currentUserIdRef.current = session.user.id
            setProfileLoaded(false)
          }
          setLastUserId(session.user.id)

          const isSuper = isPlatformAdminEmail(session.user.email)
          const meta = session.user.user_metadata || {}

          setUser((prev) => {
            const sameUser = prev?.id === session.user.id
            return {
              id: session.user.id,
              email: session.user.email,
              role: sameUser ? (prev.role || 'empleado') : 'empleado',
              is_platform_admin: sameUser ? (Boolean(prev.is_platform_admin) || isSuper) : isSuper,
              company_id: isSuper ? null : (sameUser ? (prev.company_id || null) : null),
              avatar_url: meta.avatar_url || (sameUser ? prev.avatar_url : null) || null,
              ...(sameUser ? prev : {})
            }
          })
          if (isSuper) clearCompanyCache()
          setLoading(false)

          // Cargar perfil desacoplado para liberar el lock interno de Supabase
          setTimeout(() => {
            if (isMounted) {
              loadProfile(session.user).catch(() => {})
            }
          }, 0)
        }
      })

      return () => {
        isMounted = false
        clearTimeout(fallbackTimer)
        sub?.subscription?.unsubscribe?.()
      }
    }

    const raw = localStorage.getItem(SESSION_KEY)
    if (raw) {
      try {
        let parsed = JSON.parse(raw)
        if (isPlatformAdminEmail(parsed?.email)) {
          parsed = {
            ...parsed,
            role: 'superadmin',
            is_platform_admin: true,
            company_id: null,
            full_name: parsed.full_name || 'Carlos Yamacacho'
          }
          localStorage.setItem(SESSION_KEY, JSON.stringify(parsed))
          clearCompanyCache()
        }
        setUser(parsed)
      } catch {}
    }
    setLoading(false)
    setProfileLoaded(true)
  }, [])

  async function loadProfile(authUser) {
    if (!authUser?.id) {
      setProfileLoaded(true)
      return null
    }

    if (inFlightProfileRef.current.userId === authUser.id && inFlightProfileRef.current.promise) {
      return inFlightProfileRef.current.promise
    }

    const run = (async () => {
      if (currentUserIdRef.current && currentUserIdRef.current !== authUser.id) {
        clearStoredCompany()
        clearCompanyCache()
      }
      currentUserIdRef.current = authUser.id

      const isSuper = isPlatformAdminEmail(authUser.email)

      try {
        // 1. Obtener perfil estrictamente desde la tabla protegida profiles en Supabase
        const { data, error } = await supabase.from('profiles').select('*').eq('id', authUser.id).maybeSingle()
        if (error) {
          console.warn('Aviso profiles query:', error.message)
        }

        // isPlatformAdmin sale exclusivamente de la columna protegida profiles.is_platform_admin o variable de entorno
        const isPlatformAdminUser = Boolean(data?.is_platform_admin) || isSuper
        const companyId = isPlatformAdminUser ? null : (data?.company_id || null)

        // Si el perfil no tiene company_id, limpiar datos y caché residuales
        if (!companyId) {
          clearStoredCompany()
          clearCompanyCache()
        } else {
          setCompanyCache(companyId)
          const cachedComp = companySettingsService.getCached(companyId)
          if (!cachedComp || cachedComp.id !== companyId) {
            clearStoredCompany()
            await Promise.race([
              companySettingsService.get({ forceRefresh: true }).catch(() => null),
              new Promise((r) => setTimeout(r, 4000))
            ])
          }
        }

        // El rol proviene estrictamente de profiles.role
        const userRole = isPlatformAdminUser
          ? 'admin' // Para la UI de plataforma o superadmin según esquema
          : (data?.role || 'empleado')

        const metadata = authUser?.user_metadata || {}
        const profile = {
          id: authUser.id,
          email: authUser.email,
          full_name: isPlatformAdminUser
            ? (data?.full_name || 'Carlos Yamacacho')
            : (data?.full_name || metadata.full_name || authUser.email.split('@')[0]),
          role: userRole,
          is_platform_admin: isPlatformAdminUser,
          company_id: companyId,
          avatar_url: data?.avatar_url || metadata.avatar_url || null,
          active: data?.active !== false
        }

        setUser(profile)

        // Precarga silenciosa en segundo plano solo si pertenece a una empresa
        if (profile.company_id) {
          setTimeout(() => {
            import('../services/productsService').then(m => m.productsService.list().catch(() => {})).catch(() => {})
            import('../services/salesService').then(m => m.salesService.list().catch(() => {})).catch(() => {})
            import('../services/categoriesService').then(m => m.categoriesService.list().catch(() => {})).catch(() => {})
            import('../services/clientsService').then(m => m.clientsService.list().catch(() => {})).catch(() => {})
            companySettingsService.get().catch(() => {})
          }, 300)
        }

        return profile
      } catch (err) {
        console.warn('Aviso cargando perfil:', err)
        clearStoredCompany()
        clearCompanyCache()
        const metadata = authUser?.user_metadata || {}
        const fallback = {
          id: authUser.id,
          email: authUser.email,
          full_name: isSuper ? 'Carlos Yamacacho' : (metadata.full_name || authUser.email.split('@')[0]),
          role: 'empleado',
          is_platform_admin: isSuper,
          company_id: null,
          avatar_url: metadata.avatar_url || null
        }
        setUser(fallback)
        return fallback
      } finally {
        if (inFlightProfileRef.current.userId === authUser.id) {
          inFlightProfileRef.current = { userId: null, promise: null }
        }
        // Asegurar que profileLoaded SIEMPRE termine en true
        setProfileLoaded(true)
      }
    })()

    inFlightProfileRef.current = { userId: authUser.id, promise: run }
    return run
  }

  async function login(email, password) {
    const cleanEmail = (email || '').trim().toLowerCase()
    const cleanPassword = (password || '').trim()

    if (isSupabaseConfigured) {
      // Timeout de 12 segundos para evitar que la interfaz se quede pegada si falla la red móvil
      const loginPromise = supabase.auth.signInWithPassword({
        email: cleanEmail,
        password: cleanPassword
      })
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('La conexión tardó demasiado. Por favor verifica tu señal de internet o intenta nuevamente.')), 12000)
      )

      const { data, error } = await Promise.race([loginPromise, timeoutPromise])

      if (error) {
        const msg = (error.message || '').toLowerCase()
        if (msg.includes('email not confirmed')) {
          throw new Error('El correo electrónico aún no ha sido verificado. Confírmalo en Supabase o desactiva "Confirm email" en Auth Providers.')
        }
        if (msg.includes('invalid login credentials') || msg.includes('invalid credentials')) {
          throw new Error('Credenciales incorrectas. Verifica que el correo y la contraseña estén bien escritos.')
        }
        throw new Error(error.message || 'Credenciales incorrectas. Verifica que el correo y la contraseña estén bien escritos.')
      }

      setAuthTransition({
        type: 'login',
        title: 'Iniciando sesión…',
        subtitle: 'Cargando tu espacio de trabajo…'
      })

      if (data?.user) {
        const prevStoredId = getLastUserId()
        const userChanged = (currentUserIdRef.current && currentUserIdRef.current !== data.user.id)
          || (prevStoredId && prevStoredId !== data.user.id)
        if (userChanged) {
          clearStoredCompany()
          clearCompanyCache()
          invalidateCache()
        }
        currentUserIdRef.current = data.user.id
        setLastUserId(data.user.id)
        setProfileLoaded(false)

        const meta = data.user.user_metadata || {}
        const isSuper = isPlatformAdminEmail(data.user.email)
        const initialUser = {
          id: data.user.id,
          email: data.user.email,
          role: 'empleado',
          is_platform_admin: isSuper,
          company_id: null,
          avatar_url: meta.avatar_url || null
        }
        setUser(initialUser)
        if (isSuper) clearCompanyCache()

        // Cargar perfil completo con timeout de 2.5s para asegurar datos de empresa antes de entrar
        try {
          await Promise.race([
            loadProfile(data.user),
            new Promise((r) => setTimeout(r, 2500))
          ])
        } catch (e) {
          console.warn('Aviso cargando perfil tras login:', e)
        }
      }

      await new Promise((r) => setTimeout(r, 350))
      setAuthTransition(null)
      return
    }

    const profiles = localDb.getTable('profiles')
    let match = profiles.find((p) => p.email.toLowerCase() === email.toLowerCase() && p.password === password)
    const isSuper = isPlatformAdminEmail(cleanEmail)

    // Si es superadmin intentando entrar en modo local, asegurar acceso garantizado
    if (!match && isSuper && cleanPassword.length >= 4) {
      match = {
        id: 'u-superadmin',
        created_at: new Date().toISOString(),
        full_name: 'Carlos Yamacacho',
        email: cleanEmail,
        password: cleanPassword,
        role: 'superadmin',
        is_platform_admin: true,
        active: true,
        company_id: null
      }
      localDb.insert('profiles', match)
    }

    if (!match) throw new Error('Credenciales incorrectas')
    if (match.active === false) throw new Error('Este usuario está desactivado')

    if (isSuper) {
      match.role = 'superadmin'
      match.is_platform_admin = true
      match.company_id = null
    }

    setAuthTransition({
      type: 'login',
      title: 'Iniciando sesión…',
      subtitle: isSuper ? 'Accediendo al Panel de Super Administrador…' : 'Cargando tu espacio de trabajo…'
    })

    const session = { ...match }
    delete session.password
    localStorage.setItem(SESSION_KEY, JSON.stringify(session))
    if (isSuper) clearCompanyCache()
    setUser(session)
    setProfileLoaded(true)
    await new Promise((r) => setTimeout(r, 650))
    setAuthTransition(null)
  }

  // Crea la cuenta de usuario (aún SIN empresa). Si Supabase requiere
  // confirmar el correo, devuelve needsEmailConfirmation: true.
  async function signUp(email, password, fullName) {
    if (!isSupabaseConfigured) throw new Error('El registro requiere Supabase conectado.')
    const { data, error } = await supabase.auth.signUp({
      email, password, options: { data: { full_name: fullName } },
    })
    if (error) {
      const msg = (error.message || '').toLowerCase()
      if (msg.includes('rate limit') || error.status === 429) {
        throw new Error(
          'Límite de correos excedido en Supabase al enviar la confirmación. Para registrarte de inmediato sin esperas ni límites, desactiva "Confirm email" en el panel de Supabase (Authentication > Providers > Email).'
        )
      }
      throw error
    }
    if (Array.isArray(data?.user?.identities) && data.user.identities.length === 0) {
      throw new Error('Este correo ya tiene una cuenta registrada en el sistema. Inicia sesión con tu contraseña o recupera tu acceso.')
    }
    if (!data.session) return { needsEmailConfirmation: true }
    await loadProfile(data.user)
    return { needsEmailConfirmation: false }
  }

  // Crea la empresa y la vincula al usuario actual mediante la RPC segura create_company
  async function completeOnboarding({ name, ruc, address, phone, logo_url }) {
    if (!user) throw new Error('Debes iniciar sesión primero.')

    const { data: rpcComp, error: rpcErr } = await supabase.rpc('create_company', {
      p_name: name.trim(),
      p_ruc: ruc?.trim() || null,
      p_address: address?.trim() || null,
      p_phone: phone?.trim() || null,
      p_logo_url: logo_url || null,
    })

    if (rpcErr) {
      console.error('Error al ejecutar RPC create_company:', rpcErr)
      throw new Error(rpcErr.message || 'Error al crear la empresa en el servidor.')
    }

    if (!rpcComp?.id) {
      throw new Error('No se recibió la confirmación de la empresa creada.')
    }

    setCompanyCache(rpcComp.id)
    companySettingsService.setCached(rpcComp)
    invalidateCache()
    setUser({ ...user, company_id: rpcComp.id, role: 'admin' })
    setProfileLoaded(true)
    return rpcComp
  }

  async function logout() {
    setAuthTransition({
      type: 'logout',
      title: 'Cerrando sesión…',
      subtitle: 'Saliendo de tu cuenta de forma segura… hasta pronto'
    })
    await new Promise((r) => setTimeout(r, 750))
    try {
      if (isSupabaseConfigured) await supabase.auth.signOut()
      else localStorage.removeItem(SESSION_KEY)
    } finally {
      // Limpieza profunda de memoria, caché de sesión, llaves de tenant y datos de empresa
      invalidateCache()
      try {
        sessionStorage.clear()
        localStorage.removeItem(SESSION_KEY)
      } catch {}
      setLastUserId(null)
      clearCompanyCache()
      clearStoredCompany()
      currentUserIdRef.current = null
      setProfileLoaded(false)
      setUser(null)
      setTimeout(() => {
        setAuthTransition(null)
      }, 350)
    }
  }

  async function loginWithGoogle() {
    if (!isSupabaseConfigured) throw new Error('Requiere Supabase conectado.')
    setAuthTransition({
      type: 'login',
      title: 'Conectando con Google…',
      subtitle: 'Redirigiendo al acceso seguro…'
    })
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    })
    if (error) {
      setAuthTransition(null)
      throw error
    }
  }

  // Enlace mágico: el usuario solo pone su correo y le llega un link para
  // entrar sin contraseña. Sirve tanto para iniciar sesión como para
  // registrarse (si el correo no existe, Supabase crea la cuenta sola).
  async function loginWithMagicLink(email) {
    if (!isSupabaseConfigured) throw new Error('Requiere Supabase conectado.')
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.origin },
    })
    if (error) {
      const msg = (error.message || '').toLowerCase()
      if (msg.includes('rate limit') || error.status === 429) {
        throw new Error(
          'Límite de correos excedido: Supabase permite un máximo de 3 o 4 correos por hora con su servidor gratuito predeterminado. Por favor espera unos minutos o inicia sesión con tu contraseña.'
        )
      }
      throw error
    }
  }

  async function updateProfile(patch) {
    if (!user) return
    const updated = { ...user, ...patch }
    setUser(updated)

    if (isSupabaseConfigured) {
      try {
        await supabase.from('profiles').update(patch).eq('id', user.id)
      } catch (e) {
        console.warn('Aviso actualizando profiles:', e)
      }
      try {
        await supabase.auth.updateUser({
          data: {
            ...(patch.full_name ? { full_name: patch.full_name } : {}),
            ...(patch.avatar_url ? { avatar_url: patch.avatar_url } : {})
          }
        })
      } catch (e) {
        console.warn('Aviso actualizando auth metadata:', e)
      }
    } else {
      localStorage.setItem(SESSION_KEY, JSON.stringify(updated))
      localDb.update('profiles', user.id, patch)
    }
    return updated
  }

  async function updatePassword(newPassword) {
    if (!newPassword || newPassword.trim().length < 6) {
      throw new Error('La nueva contraseña debe tener al menos 6 caracteres.')
    }
    if (isSupabaseConfigured) {
      const { error } = await supabase.auth.updateUser({ password: newPassword.trim() })
      if (error) {
        const msg = (error.message || '').toLowerCase()
        if (msg.includes('should contain') || msg.includes('at least one character')) {
          throw new Error('La contraseña debe incluir al menos una letra mayúscula (A-Z), una minúscula (a-z) y un número (0-9).')
        }
        throw new Error(`Error al actualizar contraseña: ${error.message}`)
      }
    } else {
      localDb.update('profiles', user.id, { password: newPassword.trim() })
    }
  }

  const isSuperAdminUser = Boolean(
    user?.is_platform_admin === true ||
    user?.role === 'superadmin' ||
    isPlatformAdminEmail(user?.email)
  )

  // A6: Todo usuario autenticado sin empresa (excepto el Super Admin) debe fundar su empresa en onboarding
  const needsOnboarding = isSupabaseConfigured &&
    !!user &&
    profileLoaded &&
    !user.company_id &&
    !isSuperAdminUser

  const requestLogout = () => setConfirmLogoutOpen(true)

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        profileLoaded,
        authTransition,
        setAuthTransition,
        login,
        logout,
        requestLogout,
        signUp,
        completeOnboarding,
        needsOnboarding,
        loginWithGoogle,
        loginWithMagicLink,
        updateProfile,
        updatePassword,
        isAdmin: user?.role === 'admin' || isSuperAdminUser,
        isPlatformAdmin: isSuperAdminUser,
      }}
    >
      {children}
      <LogoutConfirmModal
        open={confirmLogoutOpen}
        onClose={() => setConfirmLogoutOpen(false)}
        onConfirm={() => {
          setConfirmLogoutOpen(false)
          logout()
        }}
        user={user}
      />
      <AuthOverlay transition={authTransition} />
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>')
  return ctx
}
