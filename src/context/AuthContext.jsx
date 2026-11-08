import { createContext, useContext, useEffect, useState } from 'react'
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient'
import { localDb } from '../lib/localDb'
import { clearCompanyCache, setCompanyCache } from '../lib/companyContext'
import { isPlatformAdminEmail, purgeSuperAdminFromLocalCollaborators } from '../lib/superAdmin'
import AuthOverlay from '../components/ui/AuthOverlay'
import LogoutConfirmModal from '../components/ui/LogoutConfirmModal'

const AuthContext = createContext(null)
const SESSION_KEY = 'inventory_erp_session'

function getCachedCompanyId() {
  try {
    return sessionStorage.getItem('cya_cached_company_id') || localStorage.getItem('cya_cached_company_id') || null
  } catch {
    return null
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [profileLoaded, setProfileLoaded] = useState(false)
  const [authTransition, setAuthTransition] = useState(null)
  const [confirmLogoutOpen, setConfirmLogoutOpen] = useState(false)

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
          const isSuper = isPlatformAdminEmail(session.user.email)
          const meta = session.user.user_metadata || {}
          const compId = isSuper ? null : (meta.company_id || getCachedCompanyId() || null)
          setUser({
            id: session.user.id,
            email: session.user.email,
            role: isSuper ? 'superadmin' : (meta.role || 'empleado'),
            is_platform_admin: isSuper,
            company_id: compId,
            avatar_url: meta.avatar_url || null
          })
          if (isSuper) clearCompanyCache()
          else if (compId) setCompanyCache(compId)

          // Cargar perfil en segundo plano sin bloquear
          loadProfile(session.user).catch(() => {})
        } else {
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
          setUser(null)
          clearCompanyCache()
          setLoading(false)
          setProfileLoaded(false)
          return
        }

        if (session?.user) {
          const isSuper = isPlatformAdminEmail(session.user.email)
          const meta = session.user.user_metadata || {}
          const compId = isSuper ? null : (meta.company_id || getCachedCompanyId() || null)

          setUser((prev) => {
            return {
              id: session.user.id,
              email: session.user.email,
              role: isSuper ? 'superadmin' : (meta.role || prev?.role || 'empleado'),
              is_platform_admin: isSuper || prev?.is_platform_admin === true,
              company_id: isSuper ? null : (prev?.company_id || compId),
              avatar_url: meta.avatar_url || prev?.avatar_url || null,
              ...(prev || {})
            }
          })
          if (isSuper) clearCompanyCache()
          else if (compId) setCompanyCache(compId)
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

    const isSuper = isPlatformAdminEmail(authUser.email)

    try {
      // 1. Usar maybeSingle() para obtener perfil de Supabase
      const { data, error } = await supabase.from('profiles').select('*').eq('id', authUser.id).maybeSingle()
      if (error) {
        console.warn('Aviso profiles query:', error.message)
      }

      let companyId = isSuper ? null : (data?.company_id || null)

      // 2. Si es superadmin, garantizar que no pertenezca a una sola empresa ni se degrade
      if (isSuper) {
        companyId = null
        clearCompanyCache()
        supabase
          .from('profiles')
          .update({ company_id: null, role: 'superadmin' })
          .eq('id', authUser.id)
          .catch(() => {})
      } else if (!companyId) {
        // Solo para usuarios convencionales: auto-vincular a la primera empresa si no tiene
        try {
          const { data: existingComp } = await supabase
            .from('companies')
            .select('id')
            .order('created_at', { ascending: true })
            .limit(1)
            .maybeSingle()

          if (existingComp?.id) {
            companyId = existingComp.id
            supabase.from('profiles').update({ company_id: existingComp.id }).eq('id', authUser.id).catch(() => {})
          }
        } catch (e) {
          console.warn('Aviso buscando companies:', e)
        }
      }

      // 3. Fallback de caché de empresa guardado en el navegador (solo si no es superadmin)
      if (!isSuper && !companyId) {
        companyId = getCachedCompanyId()
      }

      const metadata = authUser?.user_metadata || {}
      const profile = {
        id: authUser.id,
        email: authUser.email,
        full_name: isSuper ? (data?.full_name || 'Carlos Yamacacho') : (data?.full_name || metadata.full_name || authUser.email.split('@')[0]),
        role: isSuper ? 'superadmin' : (data?.role || metadata.role || 'empleado'),
        is_platform_admin: isSuper,
        company_id: isSuper ? null : (companyId || null),
        avatar_url: data?.avatar_url || metadata.avatar_url || null,
        active: data?.active !== false
      }

      setUser(profile)
      if (isSuper) clearCompanyCache()
      else if (profile.company_id) setCompanyCache(profile.company_id)

      // Precarga silenciosa en segundo plano
      setTimeout(() => {
        import('../services/productsService').then(m => m.productsService.list().catch(() => {})).catch(() => {})
        import('../services/salesService').then(m => m.salesService.list().catch(() => {})).catch(() => {})
        import('../services/categoriesService').then(m => m.categoriesService.list().catch(() => {})).catch(() => {})
        import('../services/clientsService').then(m => m.clientsService.list().catch(() => {})).catch(() => {})
        import('../services/companySettingsService').then(m => m.companySettingsService.get().catch(() => {})).catch(() => {})
      }, 300)

      setProfileLoaded(true)
      return profile
    } catch (err) {
      console.warn('Aviso cargando perfil:', err)
      const metadata = authUser?.user_metadata || {}
      const compId = isSuper ? null : (getCachedCompanyId() || null)
      const fallback = {
        id: authUser.id,
        email: authUser.email,
        role: isSuper ? 'superadmin' : (metadata.role || 'empleado'),
        is_platform_admin: isSuper,
        company_id: compId,
        avatar_url: metadata.avatar_url || null
      }
      setUser(fallback)
      if (isSuper) clearCompanyCache()
      else if (fallback.company_id) setCompanyCache(fallback.company_id)
      setProfileLoaded(true)
      return fallback
    }
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
        const meta = data.user.user_metadata || {}
        const isSuper = isPlatformAdminEmail(data.user.email)
        const compId = isSuper ? null : (meta.company_id || getCachedCompanyId() || null)
        const initialUser = {
          id: data.user.id,
          email: data.user.email,
          role: isSuper ? 'superadmin' : (meta.role || 'empleado'),
          is_platform_admin: isSuper,
          company_id: compId,
          avatar_url: meta.avatar_url || null
        }
        setUser(initialUser)
        if (isSuper) clearCompanyCache()
        else if (initialUser.company_id) setCompanyCache(initialUser.company_id)

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
    if (error) throw error
    if (!data.session) return { needsEmailConfirmation: true }
    await loadProfile(data.user)
    return { needsEmailConfirmation: false }
  }

  // Crea la empresa y la vincula al usuario actual como admin.
  // Solo funciona una vez por usuario (mientras company_id sea null).
  async function completeOnboarding({ name, ruc, address, phone, logo_url }) {
    if (!user) throw new Error('Debes iniciar sesión primero')
    const { data: company, error: companyError } = await supabase
      .from('companies')
      .insert({ name, ruc: ruc || null, address: address || null, phone: phone || null, logo_url: logo_url || null })
      .select()
      .single()
    if (companyError) throw companyError

    const { error: profileError } = await supabase
      .from('profiles')
      .update({ company_id: company.id, role: 'admin' })
      .eq('id', user.id)
    if (profileError) throw profileError

    setCompanyCache(company.id)
    setUser({ ...user, company_id: company.id, role: 'admin' })
    return company
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
      setUser(null)
      clearCompanyCache()
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
    if (error) throw error
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

  const needsOnboarding = isSupabaseConfigured &&
    !!user &&
    profileLoaded &&
    !user.company_id &&
    user.role === 'admin' &&
    !isSuperAdminUser

  const requestLogout = () => setConfirmLogoutOpen(true)

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
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
