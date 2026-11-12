const isEmailLike = (value) => typeof value === 'string' && value.includes('@')

export function getDisplayUserName(userObj, fallbackName) {
  if (!userObj) return fallbackName || 'Administrador'
  if (userObj.isAi || userObj.role === 'bot') return 'Asistente IA'

  const rawName = (userObj.full_name || userObj.name || '').trim()
  if (rawName && !isEmailLike(rawName)) {
    return rawName
  }

  if (fallbackName && !isEmailLike(fallbackName)) {
    return String(fallbackName).trim()
  }

  if (userObj.role === 'admin') {
    return 'Administrador'
  }

  const emailSource = userObj.email || (isEmailLike(rawName) ? rawName : '') || (isEmailLike(fallbackName) ? fallbackName : '')
  if (emailSource) {
    const localPart = emailSource.split('@')[0]?.trim()
    if (localPart) return localPart
  }

  return 'Colaborador'
}

export function getInitials(name, isAi = false) {
  if (isAi) return 'IA'
  const clean = String(name || 'AD').trim()
  const parts = clean.split(/\s+/).filter(Boolean)
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
  }
  return clean.slice(0, 2).toUpperCase() || 'AD'
}

export function getRoleLabel(role, isAi = false) {
  if (isAi || role === 'bot') return 'IA Bot'
  if (role === 'admin') return 'Administrador (Dueño)'
  if (role === 'vendedor') return 'Vendedor'
  return 'Empleado'
}

export function resolveCompanyOwner(collaborators = [], currentAuthUser = null) {
  const adminFromList = collaborators.find((u) => u.role === 'admin')
  if (adminFromList) {
    const name = getDisplayUserName(adminFromList)
    return {
      id: adminFromList.id || null,
      name,
      email: adminFromList.email || '',
      role: 'admin',
      initials: getInitials(name),
    }
  }

  if (currentAuthUser?.role === 'admin') {
    const name = getDisplayUserName(currentAuthUser)
    return {
      id: currentAuthUser.id || null,
      name,
      email: currentAuthUser.email || '',
      role: 'admin',
      initials: getInitials(name),
    }
  }

  if (currentAuthUser) {
    const name = getDisplayUserName({ ...currentAuthUser, role: currentAuthUser.role || 'admin' })
    return {
      id: currentAuthUser.id || null,
      name,
      email: currentAuthUser.email || '',
      role: currentAuthUser.role || 'admin',
      initials: getInitials(name),
    }
  }

  return {
    id: null,
    name: 'Administrador',
    email: '',
    role: 'admin',
    initials: 'AD',
  }
}

