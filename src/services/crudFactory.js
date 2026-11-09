import { supabase, isSupabaseConfigured } from '../lib/supabaseClient'
import { localDb } from '../lib/localDb'
import { getCurrentCompanyId } from '../lib/companyContext'

// Cache ultra-rápido en memoria (0ms / sub-milisegundo)
const memoryCache = new Map() // key -> { data: Array, timestamp: number }
const inFlightRequests = new Map() // key -> Promise
const tableSupportsCompanyId = new Map() // table -> boolean

// 60 segundos de frescura total en memoria
const CACHE_TTL_MS = 60 * 1000

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

      // Si Supabase está conectado pero no hay empresa activa, no servir datos cacheados
      if (isSupabaseConfigured && !cId) return null

      const cacheKey = `${table}_${cId || 'global'}`

      const mem = memoryCache.get(cacheKey)
      if (mem && mem.data) return mem.data

      try {
        if (typeof sessionStorage !== 'undefined') {
          const raw = sessionStorage.getItem(getStorageKey(table, cId))
          if (raw) {
            const parsed = JSON.parse(raw)
            if (parsed && Array.isArray(parsed.data)) {
              memoryCache.set(cacheKey, parsed)
              return parsed.data
            }
          }
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
          // Si falló por falta de columna company_id, reintentar sin filtro
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

        if (hasCompId === undefined && company_id) {
          tableSupportsCompanyId.set(table, true)
        }
        return data || []
      }

      let data = null
      try {
        // Timeout de seguridad de 3.5 segundos para jamás congelar la pantalla
        data = await Promise.race([
          executeQuery(),
          new Promise((resolve) => setTimeout(() => resolve(null), 3500))
        ])
      } catch (err) {
        console.warn(`Error en consulta remota ${table}:`, err)
      }

      // Si la consulta remota falló o agotó el tiempo de espera, recurrir a caché en memoria de esta empresa
      if (data === null) {
        const cached = memoryCache.get(cacheKey)
        if (cached?.data && cached.data.length > 0) return cached.data
        return []
      }

      const payload = { data: data || [], timestamp: Date.now() }
      memoryCache.set(cacheKey, payload)
      try {
        if (typeof sessionStorage !== 'undefined') {
          sessionStorage.setItem(storageKey, JSON.stringify(payload))
        }
      } catch {}

      return data || []
    },

    async create(payload) {
      if (isSupabaseConfigured) {
        const company_id = await getCurrentCompanyId().catch(() => null)
        const hasCompId = tableSupportsCompanyId.get(table)
        const insertData = (company_id && hasCompId !== false) ? { ...payload, company_id } : payload

        let res = await supabase.from(table).insert(insertData).select().single()
        if (res.error && hasCompId !== false && company_id) {
          tableSupportsCompanyId.set(table, false)
          res = await supabase.from(table).insert(payload).select().single()
        }
        if (res.error) throw res.error

        invalidateRelated(table)
        return res.data
      }
      const data = localDb.insert(table, payload)
      invalidateRelated(table)
      return data
    },

    async update(id, patch) {
      if (isSupabaseConfigured) {
        const { data, error } = await supabase.from(table).update(patch).eq('id', id).select().single()
        if (error) throw error
        invalidateRelated(table)
        return data
      }
      const data = localDb.update(table, id, patch)
      invalidateRelated(table)
      return data
    },

    async remove(id) {
      if (isSupabaseConfigured) {
        const { error } = await supabase.from(table).delete().eq('id', id)
        if (error) throw error
        invalidateRelated(table)
        return
      }
      localDb.remove(table, id)
      invalidateRelated(table)
    },
  }
}
