// Mock "database" backed by localStorage. Table shapes mirror supabase/schema.sql
// exactly, so switching a service from localDb to supabase later is a
// mechanical swap, not a rewrite. See src/services/*.js.

import { seedData } from '../data/seed'

const STORAGE_KEY = 'inventory_erp_db_v1'

function loadAll() {
  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(seedData))
    return structuredClone(seedData)
  }
  try {
    const parsed = JSON.parse(raw)
    // Si la base de datos local no tiene productos, está vacía, o conserva las laptops viejas del demo inicial
    // actualizar inmediatamente al catálogo real de AirPods (1,290 unidades, S/ 569,520) y Cleanig Service
    if (
      !parsed.products ||
      parsed.products.length === 0 ||
      parsed.products.some((p) => p.sku === 'LAP-001' || p.name?.toLowerCase().includes('laptop'))
    ) {
      parsed.products = seedData.products
      parsed.categories = seedData.categories
      parsed.suppliers = seedData.suppliers
      parsed.clients = seedData.clients
      parsed.inventory_movements = seedData.inventory_movements
      parsed.sales = seedData.sales
      parsed.company_settings = seedData.company_settings
      localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed))
    }
    return parsed
  } catch {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(seedData))
    return structuredClone(seedData)
  }
}

function saveAll(db) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(db))
}

function uid() {
  return crypto.randomUUID ? crypto.randomUUID() : `id_${Date.now()}_${Math.random().toString(16).slice(2)}`
}

export const localDb = {
  getTable(table) {
    const db = loadAll()
    return db[table] || []
  },
  insert(table, row) {
    const db = loadAll()
    const record = { id: uid(), created_at: new Date().toISOString(), ...row }
    db[table] = [...(db[table] || []), record]
    saveAll(db)
    return record
  },
  update(table, id, patch) {
    const db = loadAll()
    db[table] = (db[table] || []).map((r) => (r.id === id ? { ...r, ...patch } : r))
    saveAll(db)
    return db[table].find((r) => r.id === id)
  },
  remove(table, id) {
    const db = loadAll()
    db[table] = (db[table] || []).filter((r) => r.id !== id)
    saveAll(db)
  },
  reset() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(seedData))
  },
}
