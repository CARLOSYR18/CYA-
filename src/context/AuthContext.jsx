import { createContext, useContext, useEffect, useState } from 'react'
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient'
import { localDb } from '../lib/localDb'
import { clearCompanyCache, setCompanyCache } from '../lib/companyContext'
import AuthOverlay from '../components/ui/AuthOverlay'
import LogoutConfirmModal from '../components/ui/LogoutConfirmModal'

const AuthContext = createContext(null)
const SESSION_KEY = 'inventory_erp_session'

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [authTransition, setAuthTransition] = useState(null)
  const [confirmLogoutOpen, setConfirmLogoutOpen] = useState(false)

  useEffect(() => {
    let isMounted = true

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
          const meta = session.user.user_metadata || {}
          setUser({
            id: session.user.id,
            email: session.user.email,
            role: meta.role || 'empleado',
            company_id: meta.company_id || null,
            avatar_url: meta.avatar_url || null
          })
          // Cargar perfil en segundo plano sin bloquear
          loadProfile(session.user).catch(() => {})
        }
        setLoading(false)
        clearTimeout(fallbackTimer)
      }).catch((e) => {
        console.warn('Aviso getSession:', e)
        if (isMounted) setLoading(false)
        clearTimeout(fallbackTimer)
      })

      // 3. onAuthStateChange: SÍNCRONO (NUNCA async) para evitar deadlock interno en @supabase/auth-js
      const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
        if (!isMounted) return

        if (event === 'SIGNED_OUT' || !session) {
          setUser(null)
          clearCompanyCache()
          setLoading(false)
          return
        }

        if (session?.user) {
          const meta = session.user.user_metadata || {}
          setUser((prev) => {
            if (prev?.id === session.user.id && prev?.company_id) return prev
            return {
              id: session.user.id,
              email: session.user.email,
              role: meta.role || prev?.role || 'empleado',
              company_id: meta.company_id || prev?.company_id || null,
              avatar_url: meta.avatar_url || prev?.avatar_url || null,
              ...(prev || {})
            }
          })
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
    if (raw) setUser(JSON.parse(raw))
    setLoading(false)
  }, [])

  async function loadProfile(authUser) {
    if (!authUser?.id) return null
    try {
      // Usar maybeSingle() para no arrojar error si aún no existe registro en profiles
      const { data, error } = await supabase.from('profiles').select('*').eq('id', authUser.id).maybeSingle()
      if (error) {
        console.warn('Aviso profiles query:', error.message)
      }
      const metadata = authUser?.user_metadata || {}
      const profile = data
        ? {
            ...data,
            email: authUser.email,
            avatar_url: data.avatar_url || metadata.avatar_url || null,
            role: data.role || metadata.role || 'empleado'
          }
        : {
            id: authUser.id,
            email: authUser.email,
            role: metadata.role || 'empleado',
            company_id: metadata.company_id || null,
            avatar_url: metadata.avatar_url || null
          }

      setUser(profile)
      if (profile.company_id) setCompanyCache(profile.company_id)

      // Precarga silenciosa en segundo plano
      setTimeout(() => {
        import('../services/productsService').then(m => m.productsService.list().catch(() => {})).catch(() => {})
        import('../services/salesService').then(m => m.salesService.list().catch(() => {})).catch(() => {})
        import('../services/categoriesService').then(m => m.categoriesService.list().catch(() => {})).catch(() => {})
        import('../services/clientsService').then(m => m.clientsService.list().catch(() => {})).catch(() => {})
        import('../services/companySettingsService').then(m => m.companySettingsService.get().catch(() => {})).catch(() => {})
      }, 300)

      return profile
    } catch (err) {
      console.warn('Aviso cargando perfil:', err)
      const metadata = authUser?.user_metadata || {}
      const fallback = {
        id: authUser.id,
        email: authUser.email,
        role: metadata.role || 'empleado',
        company_id: metadata.company_id || null,
        avatar_url: metadata.avatar_url || null
      }
      setUser(fallback)
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
        const initialUser = {
          id: data.user.id,
          email: data.user.email,
          role: meta.role || 'empleado',
          company_id: meta.company_id || null,
          avatar_url: meta.avatar_url || null
        }
        setUser(initialUser)
        if (initialUser.company_id) setCompanyCache(initialUser.company_id)

        // Cargar perfil con timeout de 1.2s para navegación ágil e inmediata
        await Promise.race([
          loadProfile(data.user),
          new Promise((r) => setTimeout(r, 1200))
        ]).catch(() => {})
      }

      await new Promise((r) => setTimeout(r, 350))
      setAuthTransition(null)
      return
    }

    const profiles = localDb.getTable('profiles')
    const match = profiles.find((p) => p.email.toLowerCase() === email.toLowerCase() && p.password === password)
    if (!match) throw new Error('Credenciales incorrectas')
    if (match.active === false) throw new Error('Este usuario está desactivado')

    setAuthTransition({
      type: 'login',
      title: 'Iniciando sesión…',
      subtitle: 'Cargando tu espacio de trabajo…'
    })

    const session = { ...match }
    delete session.password
    localStorage.setItem(SESSION_KEY, JSON.stringify(session))
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

  const needsOnboarding = isSupabaseConfigured && !!user && !user.company_id && !user.is_platform_admin

  const requestLogout = () => setConfirmLogoutOpen(true)

  return (
    <AuthContext.Provider value={{ user, loading, authTransition, setAuthTransition, login, logout, requestLogout, signUp, completeOnboarding, needsOnboarding, loginWithGoogle, loginWithMagicLink, updateProfile, updatePassword, isAdmin: user?.role === 'admin', isPlatformAdmin: user?.is_platform_admin === true }}>
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
