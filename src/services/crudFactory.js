import { supabase, isSupabaseConfigured } from '../lib/supabaseClient'
import { localDb } from '../lib/localDb'
import { getCurrentCompanyId } from '../lib/companyContext'

// Cache ultra-rápido en memoria (0ms / sub-milisegundo)
const memoryCache = new Map() // key -> { data: Array, timestamp: number }
const inFlightRequests = new Map() // key -> Promise
const tableSupportsCompanyId = new Map() // table -> boolean

const unsupportedColumnsByTable = new Map() // table -> Set<string>

// 60 segundos de frescura total en memoria
const CACHE_TTL_MS = 60 * 1000

/**
 * Extrae el nombre de la columna cuando Postgres o PostgREST reporta
 * que una columna no existe en la tabla o en la caché de esquema.
 */
function extractMissingColumnName(err) {
  const msg = err?.message || ''
  const postgrestMatch = msg.match(/could not find the '([^']+)' column/i)
  if (postgrestMatch) return postgrestMatch[1]
  const pgMatch = msg.match(/column (?:"?[a-z0-9_]+"?\.)?"([^"]+)"(?: of relation "[^"]+")? does not exist/i)
  if (pgMatch) return pgMatch[1]
  return null
}

/**
 * Detecta exclusivamente si un error de Postgres/PostgREST indica que la tabla
 * no posee la columna `company_id`, evitando confundir otros errores de esquema o RLS.
 */
function isMissingCompanyIdError(err) {
  return extractMissingColumnName(err) === 'company_id'
}

function markUnsupportedColumn(table, column) {
  if (!column) return
  let set = unsupportedColumnsByTable.get(table)
  if (!set) {
    set = new Set()
    unsupportedColumnsByTable.set(table, set)
  }
  set.add(column)
}

function stripUnsupportedColumns(table, obj) {
  if (!obj || typeof obj !== 'object') return obj
  const unsupported = unsupportedColumnsByTable.get(table)
  if (!unsupported || unsupported.size === 0) return obj
  const cleaned = {}
  for (const [k, v] of Object.entries(obj)) {
    if (!unsupported.has(k)) cleaned[k] = v
  }
  return cleaned
}

async function executeWriteWithSchemaFallback(table, initialData, execFn, allowEmpty = false) {
  let currentData = stripUnsupportedColumns(table, initialData)
  if (allowEmpty && (!currentData || Object.keys(currentData).length === 0)) {
    return { data: null, skipped: true }
  }

  let res = await execFn(currentData)
  for (let attempt = 0; attempt < 8 && res.error; attempt++) {
    const missingCol = extractMissingColumnName(res.error)
    if (!missingCol || !Object.prototype.hasOwnProperty.call(currentData, missingCol)) {
      break
    }
    if (missingCol === 'company_id') {
      tableSupportsCompanyId.set(table, false)
    } else {
      markUnsupportedColumn(table, missingCol)
    }
    const next = { ...currentData }
    delete next[missingCol]
    currentData = next
    if (allowEmpty && Object.keys(currentData).length === 0) {
      return { data: null, skipped: true }
    }
    res = await execFn(currentData)
  }
  if (res.error) throw res.error
  return { data: res.data, skipped: false }
}

function getStorageKey(table, companyId) {
  return `cya_cache_${table}_${companyId || 'global'}`
}

export function invalidateCache(table) {
  if (!table) {
    memoryCache.clear()
    inFlightRequests.clear()
    try {
      if (typeof sessionStorage !== 'undefined') {
        for (let i = sessionStorage.length - 1; i >= 0; i--) {
          const key = sessionStorage.key(i)
          if (key && key.startsWith('cya_cache_')) {
            sessionStorage.removeItem(key)
          }
        }
      }
    } catch {}
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('cya_cache_invalidated', { detail: { table: null } }))
    }
    return
  }
  for (const k of Array.from(memoryCache.keys())) {
    if (k.startsWith(`${table}_`)) memoryCache.delete(k)
  }
  for (const k of Array.from(inFlightRequests.keys())) {
    if (k.startsWith(`${table}_`)) inFlightRequests.delete(k)
  }
  try {
    if (typeof sessionStorage !== 'undefined') {
      for (let i = sessionStorage.length - 1; i >= 0; i--) {
        const key = sessionStorage.key(i)
        if (key && key.startsWith(`cya_cache_${table}_`)) {
          sessionStorage.removeItem(key)
        }
      }
    }
  } catch {}

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('cya_cache_invalidated', { detail: { table } }))
  }
}

export function invalidateRelated(table) {
  invalidateCache(table)
  if (table === 'sales') {
    invalidateCache('inventory_movements')
    invalidateCache('products')
  } else if (table === 'inventory_movements') {
    invalidateCache('products')
  } else if (table === 'purchases') {
    invalidateCache('inventory_movements')
    invalidateCache('products')
  }
}

export function createCrudService(table, { orderBy = 'created_at', ascending = false } = {}) {
  return {
    table,

    /**
     * Retorna de forma síncrona inmediata (0ms) los datos cacheados
     * ya sea de memoria RAM o de sessionStorage.
     */
    getCached(companyId = null) {
      const cId = companyId || (() => {
        try {
          return sessionStorage.getItem('cya_cached_company_id') || localStorage.getItem('cya_cached_company_id') || null
        } catch { return null }
      })()

      const cacheKey = `${table}_${cId || 'global'}`

      const mem = memoryCache.get(cacheKey)
      if (mem && Array.isArray(mem.data) && mem.data.length > 0) return mem.data

      try {
        if (typeof sessionStorage !== 'undefined') {
          const raw = sessionStorage.getItem(getStorageKey(table, cId))
          if (raw) {
            const parsed = JSON.parse(raw)
            if (parsed && Array.isArray(parsed.data) && parsed.data.length > 0) {
              memoryCache.set(cacheKey, parsed)
              return parsed.data
            }
          }
        }
      } catch {}

      // Respaldo inmediato local (0ms) para que móvil y desktop jamás muestren 0 o vacíos
      try {
        const local = localDb.getTable(table)
        if (Array.isArray(local) && local.length > 0) {
          return local
        }
      } catch {}

      return null
    },

    hasCache(companyId = null) {
      return this.getCached(companyId) !== null
    },

    invalidate() {
      invalidateCache(table)
    },

    async list(options = {}) {
      const forceRefresh = options?.forceRefresh === true

      if (!isSupabaseConfigured || !supabase) {
        const rows = localDb.getTable(table)
        return [...rows].sort((a, b) =>
          ascending ? new Date(a[orderBy]) - new Date(b[orderBy]) : new Date(b[orderBy]) - new Date(a[orderBy])
        )
      }

      const company_id = await getCurrentCompanyId().catch(() => null)
      const cacheKey = `${table}_${company_id || 'global'}`
      const storageKey = getStorageKey(table, company_id)
      const now = Date.now()

      // 1. Revisar caché en memoria o almacenamiento de sesión
      let cached = memoryCache.get(cacheKey)
      if (!cached) {
        try {
          if (typeof sessionStorage !== 'undefined') {
            const raw = sessionStorage.getItem(storageKey)
            if (raw) {
              const parsed = JSON.parse(raw)
              if (parsed && Array.isArray(parsed.data)) {
                memoryCache.set(cacheKey, parsed)
                cached = parsed
              }
            }
          }
        } catch {}
      }

      // Si tenemos datos en caché y no se solicitó forzar actualización
      if (cached && !forceRefresh) {
        const age = now - cached.timestamp
        // Si está dentro del tiempo de vida fresco (< CACHE_TTL_MS), retorno inmediato (0ms)
        if (age < CACHE_TTL_MS) {
          return cached.data
        }

        // Si expiró ligeramente, retorno INMEDIATO para no bloquear la pantalla (0ms)
        // y revalidación asíncrona silenciosa en segundo plano (SWR)
        this._fetchRemote(company_id, cacheKey, storageKey).catch(() => {})
        return cached.data
      }

      // 2. Deduplicación de peticiones: si ya hay una petición en curso a Supabase para esta tabla, reutilizarla
      if (inFlightRequests.has(cacheKey)) {
        return inFlightRequests.get(cacheKey)
      }

      // 3. Petición remota a Supabase
      const fetchPromise = this._fetchRemote(company_id, cacheKey, storageKey)
      inFlightRequests.set(cacheKey, fetchPromise)

      try {
        return await fetchPromise
      } finally {
        inFlightRequests.delete(cacheKey)
      }
    },

    async _fetchRemote(company_id, cacheKey, storageKey) {
      if (!supabase) {
        const local = localDb.getTable(table)
        return local || []
      }

      const hasCompId = tableSupportsCompanyId.get(table)

      const executeQuery = async () => {
        let query = supabase.from(table).select('*').order(orderBy, { ascending })
        if (company_id && hasCompId !== false) {
          query = query.eq('company_id', company_id)
        }

        const { data, error } = await query
        if (error) {
          if (company_id && hasCompId !== false && isMissingCompanyIdError(error)) {
            tableSupportsCompanyId.set(table, false)
            const { data: fallbackData, error: fallbackErr } = await supabase
              .from(table)
              .select('*')
              .order(orderBy, { ascending })
            if (fallbackErr) {
              console.warn(`Aviso consulta remota ${table}:`, fallbackErr.message)
              return null
            }
            return fallbackData || []
          }
          console.warn(`Aviso consulta remota ${table}:`, error.message)
          return null
        }

        if (hasCompId === undefined && company_id) {
          tableSupportsCompanyId.set(table, true)
        }
        return data || []
      }

      let data = null
      try {
        // Timeout de 8 segundos para conexiones móviles y celulares
        data = await Promise.race([
          executeQuery(),
          new Promise((resolve) => setTimeout(() => resolve(null), 8000))
        ])
      } catch (err) {
        console.warn(`Error en consulta remota ${table}:`, err)
      }

      // Si la consulta remota falló, agotó el tiempo de espera, o devolvió vacío ([]),
      // recurrir al catálogo y datos locales para asegurar que el usuario jamás vea 0 en su móvil
      if (!data || data.length === 0) {
        try {
          const local = localDb.getTable(table)
          if (Array.isArray(local) && local.length > 0) {
            const payload = { data: local, timestamp: Date.now() }
            memoryCache.set(cacheKey, payload)
            try {
              if (typeof sessionStorage !== 'undefined') {
                sessionStorage.setItem(storageKey, JSON.stringify(payload))
              }
            } catch {}
            return local
          }
        } catch {}

        const cached = memoryCache.get(cacheKey)
        if (cached?.data && cached.data.length > 0) return cached.data
        return []
      }

      // Solo persistir en caché si data trae registros reales (> 0)
      // Un resultado vacío NUNCA debe envenenar la caché persistente
      if (Array.isArray(data) && data.length > 0) {
        const payload = { data, timestamp: Date.now() }
        memoryCache.set(cacheKey, payload)
        try {
          if (typeof sessionStorage !== 'undefined') {
            sessionStorage.setItem(storageKey, JSON.stringify(payload))
          }
        } catch {}
      }

      return data || []
    },

    async create(payload) {
      // 1. Guardar de inmediato en localDb para respuesta instantánea (0ms) y que jamás se congele
      let localCreated = null
      try {
        localCreated = localDb.insert(table, payload)
      } catch (err) {
        console.warn(`Aviso localDb.insert ${table}:`, err)
      }

      if (isSupabaseConfigured && supabase) {
        try {
          const company_id = await getCurrentCompanyId().catch(() => null)
          const initialData = (company_id && tableSupportsCompanyId.get(table) !== false)
            ? { ...payload, company_id }
            : payload

          const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Timeout Supabase create')), 2500)
          )
          const insertPromise = executeWriteWithSchemaFallback(
            table,
            initialData,
            (row) => supabase.from(table).insert(row).select().single()
          )
          const { data } = await Promise.race([insertPromise, timeoutPromise])
          if (data) {
            if (localCreated?.id && data?.id && localCreated.id !== data.id) {
              try { localDb.update(table, localCreated.id, { id: data.id }) } catch {}
            }
            invalidateRelated(table)
            return data
          }
        } catch (err) {
          console.warn(`Aviso creación remota ${table}:`, err?.message || err)
        }
      }

      invalidateRelated(table)
      return localCreated || payload
    },

    async update(id, patch) {
      // 1. Actualizar de inmediato en localDb
      let localUpdated = null
      try {
        localUpdated = localDb.update(table, id, patch)
      } catch (err) {
        console.warn(`Aviso localDb.update ${table}:`, err)
      }

      if (isSupabaseConfigured && supabase) {
        // Solo intentar en Supabase si el ID es un UUID válido (evita error Postgres 22P02 con IDs como 'p-1')
        const isUuid = typeof id === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
        if (isUuid) {
          try {
            const timeoutPromise = new Promise((_, reject) =>
              setTimeout(() => reject(new Error('Timeout Supabase update')), 2500)
            )
            const updatePromise = executeWriteWithSchemaFallback(
              table,
              patch,
              (row) => supabase.from(table).update(row).eq('id', id).select().single(),
              true
            )
            const { data, skipped } = await Promise.race([updatePromise, timeoutPromise])
            if (!skipped && data) {
              invalidateRelated(table)
              return data
            }
          } catch (err) {
            console.warn(`Aviso actualización remota ${table}:`, err?.message || err)
          }
        }
      }

      invalidateRelated(table)
      return localUpdated || { id, ...patch }
    },

    async remove(id) {
      try {
        localDb.remove(table, id)
      } catch {}

      if (isSupabaseConfigured && supabase) {
        const isUuid = typeof id === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
        if (isUuid) {
          try {
            await Promise.race([
              supabase.from(table).delete().eq('id', id),
              new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout remove')), 2500))
            ])
          } catch (err) {
            console.warn(`Aviso eliminación remota ${table}:`, err?.message || err)
          }
        }
      }

      invalidateRelated(table)
    },
  }
}
