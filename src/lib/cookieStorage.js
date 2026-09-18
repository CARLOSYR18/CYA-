// Adaptador de almacenamiento para Supabase que usa cookies (además de
// localStorage) para guardar la sesión, con expiración larga. Sirve como
// respaldo cuando el navegador borra localStorage pero conserva cookies.
function setCookie(name, value, days) {
  const expires = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toUTCString()
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Lax; Secure`
}

function getCookie(name) {
  const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'))
  return match ? decodeURIComponent(match[2]) : null
}

function deleteCookie(name) {
  document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`
}

export const cookieStorage = {
  getItem: (key) => {
    const value = getCookie(key)
    return value !== null ? value : null
  },
  setItem: (key, value) => {
    setCookie(key, value, 30) // 30 días
  },
  removeItem: (key) => {
    deleteCookie(key)
  },
}
