import { createContext, useContext, useEffect, useState } from 'react'
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient'
import { localDb } from '../lib/localDb'
import { clearCompanyCache, setCompanyCache } from '../lib/companyContext'

const AuthContext = createContext(null)
const SESSION_KEY = 'inventory_erp_session'

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (isSupabaseConfigured) {
      supabase.auth.getSession().then(async ({ data }) => {
        if (data.session) await loadProfile(data.session.user)
        setLoading(false)
      })
      const { data: sub } = supabase.auth.onAuthStateChange(async (_event, session) => {
        if (session) await loadProfile(session.user)
        else { setUser(null); clearCompanyCache() }
      })
      return () => sub.subscription.unsubscribe()
    }
    const raw = localStorage.getItem(SESSION_KEY)
    if (raw) setUser(JSON.parse(raw))
    setLoading(false)
  }, [])

  async function loadProfile(authUser) {
    const { data } = await supabase.from('profiles').select('*').eq('id', authUser.id).single()
    const profile = data
      ? { ...data, email: authUser.email }
      : { id: authUser.id, email: authUser.email, role: 'empleado', company_id: null }
    setUser(profile)
    if (profile.company_id) setCompanyCache(profile.company_id)
  }

  async function login(email, password) {
    if (isSupabaseConfigured) {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) throw new Error('Credenciales incorrectas')
      return
    }
    const profiles = localDb.getTable('profiles')
    const match = profiles.find((p) => p.email.toLowerCase() === email.toLowerCase() && p.password === password)
    if (!match) throw new Error('Credenciales incorrectas')
    if (match.active === false) throw new Error('Este usuario está desactivado')
    const session = { ...match }
    delete session.password
    localStorage.setItem(SESSION_KEY, JSON.stringify(session))
    setUser(session)
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
    if (isSupabaseConfigured) await supabase.auth.signOut()
    else localStorage.removeItem(SESSION_KEY)
    setUser(null)
    clearCompanyCache()
  }

  async function loginWithGoogle() {
    if (!isSupabaseConfigured) throw new Error('Requiere Supabase conectado.')
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    })
    if (error) throw error
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

  const needsOnboarding = isSupabaseConfigured && !!user && !user.company_id

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, signUp, completeOnboarding, needsOnboarding, loginWithGoogle, loginWithMagicLink, isAdmin: user?.role === 'admin', isPlatformAdmin: user?.is_platform_admin === true }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>')
  return ctx
}
