import { useEffect, useMemo, useState } from 'react'
import {
  Plus, Pencil, Trash2, Tags, Search, X, Layers,
  Boxes, Package, ArrowUpDown, LayoutGrid, List,
  ChevronRight, AlertCircle, Sparkles, FolderTree
} from 'lucide-react'
import AppLayout from '../components/layout/AppLayout'
import Modal from '../components/ui/Modal'
import EmptyState from '../components/ui/EmptyState'
import { categoriesService } from '../services/categoriesService'
import { productsService } from '../services/productsService'

const emptyForm = { name: '', description: '' }

const CATEGORY_COLORS = [
  { bg: 'bg-blue-50', text: 'text-brand', border: 'border-blue-200' },
  { bg: 'bg-purple-50', text: 'text-purple-600', border: 'border-purple-200' },
  { bg: 'bg-emerald-50', text: 'text-emerald-600', border: 'border-emerald-200' },
  { bg: 'bg-amber-50', text: 'text-amber-600', border: 'border-amber-200' },
  { bg: 'bg-rose-50', text: 'text-rose-600', border: 'border-rose-200' },
  { bg: 'bg-cyan-50', text: 'text-cyan-600', border: 'border-cyan-200' },
]

export default function Categories() {
  const [categories, setCategories] = useState([])
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)

  // Filters & State
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState('products') // 'products' | 'stock' | 'name'
  const [viewMode, setViewMode] = useState('grid') // 'grid' | 'table'

  // Modal State
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(null)

  async function loadAll() {
    setLoading(true)
    try {
      const [c, p] = await Promise.all([
        categoriesService.list(),
        productsService.list()
      ])
      setCategories(c || [])
      setProducts(p || [])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadAll()
  }, [])

  /* ─── Metric Computations ─── */
  const stats = useMemo(() => {
    const totalCategories = categories.length
    const classifiedProducts = products.filter((p) => p.category_id).length
    const totalStock = products.reduce((sum, p) => sum + (Number(p.stock) || 0), 0)

    // Find top category by products count
    const countMap = {}
    products.forEach((p) => {
      if (p.category_id) {
        countMap[p.category_id] = (countMap[p.category_id] || 0) + 1
      }
    })
    const topCatId = Object.entries(countMap).sort((a, b) => b[1] - a[1])[0]?.[0]
    const topCategory = categories.find((c) => c.id === topCatId)

    return {
      totalCategories,
      classifiedProducts,
      totalStock,
      topCategoryName: topCategory?.name || 'Ninguna',
      topCategoryCount: countMap[topCatId] || 0
    }
  }, [categories, products])

  const productCount = (cid) => products.filter((p) => p.category_id === cid).length
  const stockCount = (cid) =>
    products.filter((p) => p.category_id === cid).reduce((sum, p) => sum + (Number(p.stock) || 0), 0)

  /* ─── Filtered & Sorted Categories ─── */
  const filtered = useMemo(() => {
    let result = [...categories]

    const q = search.trim().toLowerCase()
    if (q) {
      result = result.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          (c.description && c.description.toLowerCase().includes(q))
      )
    }

    if (sortBy === 'products') {
      result.sort((a, b) => productCount(b.id) - productCount(a.id))
    } else if (sortBy === 'stock') {
      result.sort((a, b) => stockCount(b.id) - stockCount(a.id))
    } else if (sortBy === 'name') {
      result.sort((a, b) => a.name.localeCompare(b.name))
    }

    return result
  }, [categories, products, search, sortBy])

  function openCreate() {
    setEditing(null)
    setForm(emptyForm)
    setError('')
    setModalOpen(true)
  }

  function openEdit(c) {
    setEditing(c)
    setForm({ name: c.name, description: c.description || '' })
    setError('')
    setModalOpen(true)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (!form.name.trim()) {
      setError('El nombre de la categoría es obligatorio')
      return
    }

    setSaving(true)
    try {
      if (editing) await categoriesService.update(editing.id, form)
      else await categoriesService.create(form)
      setModalOpen(false)
      loadAll()
    } catch (err) {
      setError(err.message || 'No se pudo guardar la categoría')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!confirmDelete) return
    try {
      await categoriesService.remove(confirmDelete.id)
    } catch (err) {
      console.error(err)
    }
    setConfirmDelete(null)
    loadAll()
  }

  return (
    <AppLayout title="Clasificación de Categorías">
      <div className="space-y-6 max-w-7xl mx-auto pb-12">

        {/* ═════════════════════════════════════════════════════════
            1. EXECUTIVE METRICS BAR (4 CRISP WHITE CARDS)
           ═════════════════════════════════════════════════════════ */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
          
          {/* Card 1: Total Categorías */}
          <div
            className="bg-white rounded-2xl border border-slate-200/80 p-3 sm:p-4.5 shadow-xs flex flex-col justify-between card-mobile-active active:scale-[0.98] transition-all hover:border-slate-300"
            style={{ animation: 'slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) 40ms both' }}
          >
            <div className="flex items-center justify-between gap-1.5 mb-1.5 sm:mb-2">
              <p className="text-[10px] sm:text-[11px] font-bold text-slate-500 uppercase tracking-wider truncate">
                Total Categorías
              </p>
              <div className="w-7 h-7 sm:w-9 sm:h-9 rounded-lg sm:rounded-xl bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-600 shrink-0">
                <FolderTree size={14} className="sm:hidden" />
                <FolderTree size={18} className="hidden sm:block" />
              </div>
            </div>
            <div>
              <h4 className="text-base sm:text-2xl font-extrabold text-slate-900 tracking-tight font-sans whitespace-nowrap overflow-hidden text-ellipsis">
                {loading ? '…' : `${stats.totalCategories}`}
              </h4>
              <p className="text-[10px] sm:text-xs text-slate-400 mt-0.5 truncate">Familias activas</p>
            </div>
          </div>

          {/* Card 2: SKUs Clasificados */}
          <div
            className="bg-white rounded-2xl border border-slate-200/80 p-3 sm:p-4.5 shadow-xs flex flex-col justify-between card-mobile-active active:scale-[0.98] transition-all hover:border-slate-300"
            style={{ animation: 'slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) 100ms both' }}
          >
            <div className="flex items-center justify-between gap-1.5 mb-1.5 sm:mb-2">
              <p className="text-[10px] sm:text-[11px] font-bold text-slate-500 uppercase tracking-wider truncate">
                SKUs Catalogados
              </p>
              <div className="w-7 h-7 sm:w-9 sm:h-9 rounded-lg sm:rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-brand shrink-0">
                <Boxes size={14} className="sm:hidden" />
                <Boxes size={18} className="hidden sm:block" />
              </div>
            </div>
            <div>
              <h4 className="text-base sm:text-2xl font-extrabold text-slate-900 tracking-tight font-sans whitespace-nowrap overflow-hidden text-ellipsis">
                {loading ? '…' : `${stats.classifiedProducts} SKUs`}
              </h4>
              <p className="text-[10px] sm:text-xs text-slate-400 mt-0.5 truncate">
                de {products.length} prods. totales
              </p>
            </div>
          </div>

          {/* Card 3: Stock Físico Almacenado */}
          <div
            className="bg-white rounded-2xl border border-slate-200/80 p-3 sm:p-4.5 shadow-xs flex flex-col justify-between card-mobile-active active:scale-[0.98] transition-all hover:border-slate-300"
            style={{ animation: 'slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) 160ms both' }}
          >
            <div className="flex items-center justify-between gap-1.5 mb-1.5 sm:mb-2">
              <p className="text-[10px] sm:text-[11px] font-bold text-slate-500 uppercase tracking-wider truncate">
                Unidades en Stock
              </p>
              <div className="w-7 h-7 sm:w-9 sm:h-9 rounded-lg sm:rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
                <Package size={14} className="sm:hidden" />
                <Package size={18} className="hidden sm:block" />
              </div>
            </div>
            <div>
              <h4 className="text-base sm:text-2xl font-extrabold text-slate-900 tracking-tight font-sans whitespace-nowrap overflow-hidden text-ellipsis">
                {loading ? '…' : `${stats.totalStock} uds.`}
              </h4>
              <p className="text-[10px] sm:text-xs text-slate-400 mt-0.5 truncate">En todas las categorías</p>
            </div>
          </div>

          {/* Card 4: Categoría Líder */}
          <div
            className="bg-white rounded-2xl border border-slate-200/80 p-3 sm:p-4.5 shadow-xs flex flex-col justify-between card-mobile-active active:scale-[0.98] transition-all hover:border-slate-300"
            style={{ animation: 'slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) 220ms both' }}
          >
            <div className="flex items-center justify-between gap-1.5 mb-1.5 sm:mb-2">
              <p className="text-[10px] sm:text-[11px] font-bold text-slate-500 uppercase tracking-wider truncate">
                Categoría Mayoritaria
              </p>
              <div className="w-7 h-7 sm:w-9 sm:h-9 rounded-lg sm:rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 shrink-0">
                <Layers size={14} className="sm:hidden" />
                <Layers size={18} className="hidden sm:block" />
              </div>
            </div>
            <div>
              <h4 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight truncate">
                {loading ? '…' : stats.topCategoryName}
              </h4>
              <p className="text-[10px] sm:text-xs text-emerald-600 font-semibold mt-0.5 truncate">
                {stats.topCategoryCount} producto{stats.topCategoryCount !== 1 ? 's' : ''}
              </p>
            </div>
          </div>

        </div>

        {/* ═════════════════════════════════════════════════════════
            2. CONTROL BAR (SEARCH, SORT, VIEW TOGGLE, ACTION)
           ═════════════════════════════════════════════════════════ */}
        <div
          className="bg-white rounded-2xl border border-slate-200/80 p-3.5 sm:p-5 shadow-xs space-y-3"
          style={{ animation: 'slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) 280ms both' }}
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3">
            
            {/* Search Input */}
            <div className="relative flex-1 w-full sm:max-w-md">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                className="w-full bg-slate-50/70 border border-slate-200 rounded-xl pl-10 pr-9 py-2 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-brand focus:ring-2 focus:ring-brand/10 transition-all outline-none"
                placeholder="Buscar por categoría o descripción…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Controls: Sorting + View Toggle + New Category */}
            <div className="flex items-center justify-between sm:justify-start gap-2 w-full sm:w-auto">
              <div className="flex items-center gap-1.5 bg-slate-50/70 border border-slate-200 rounded-xl px-2.5 py-1.5 flex-1 sm:flex-initial">
                <ArrowUpDown size={13} className="text-slate-400 shrink-0" />
                <span className="text-[11px] text-slate-400 font-medium shrink-0">Ordenar:</span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="bg-transparent text-xs text-slate-700 font-semibold outline-none cursor-pointer w-full"
                >
                  <option value="products">Más productos</option>
                  <option value="stock">Mayor stock</option>
                  <option value="name">Nombre A-Z</option>
                </select>
              </div>

              {/* View Toggle */}
              <div className="inline-flex items-center p-1 bg-slate-100 rounded-xl border border-slate-200/80 shrink-0">
                <button
                  type="button"
                  onClick={() => setViewMode('grid')}
                  title="Vista en tarjetas"
                  className={`p-1.5 rounded-lg transition-all ${
                    viewMode === 'grid'
                      ? 'bg-white text-brand shadow-xs font-semibold'
                      : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  <LayoutGrid size={15} />
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('table')}
                  title="Vista en tabla"
                  className={`p-1.5 rounded-lg transition-all ${
                    viewMode === 'table'
                      ? 'bg-white text-brand shadow-xs font-semibold'
                      : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  <List size={15} />
                </button>
              </div>

              {/* New Category Action */}
              <button
                onClick={openCreate}
                className="inline-flex items-center justify-center gap-1.5 bg-brand hover:bg-brand-hover active:scale-95 text-white font-semibold text-xs sm:text-sm px-3.5 py-2 sm:px-4 sm:py-2.5 rounded-xl transition-all shadow-sm shrink-0"
              >
                <Plus size={15} />
                <span className="hidden xs:inline sm:inline">Nueva Categoría</span>
                <span className="xs:hidden sm:hidden">Nueva</span>
              </button>
            </div>
          </div>
        </div>

        {/* ═════════════════════════════════════════════════════════
            3. CATEGORIES LISTINGS (GRID CARDS & TABLE VIEW)
           ═════════════════════════════════════════════════════════ */}
        {loading ? (
          <div className="bg-white rounded-2xl border border-slate-200/80 p-16 flex flex-col items-center justify-center text-center shadow-xs">
            <div className="w-10 h-10 rounded-full border-2 border-brand border-t-transparent animate-spin mb-3" />
            <p className="text-xs font-semibold text-slate-600">Cargando categorías…</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200/80 p-8 shadow-xs">
            <EmptyState
              icon={Tags}
              title="Sin categorías encontradas"
              description={
                search
                  ? 'No hay categorías que coincidan con los términos de búsqueda.'
                  : 'Crea categorías para organizar tus productos por familias y controlar inventarios.'
              }
              action={
                search ? (
                  <button onClick={() => setSearch('')} className="btn-secondary text-xs">
                    Limpiar búsqueda
                  </button>
                ) : (
                  <button onClick={openCreate} className="btn-primary text-xs">
                    <Plus size={15} /> Nueva categoría
                  </button>
                )
              }
            />
          </div>
        ) : viewMode === 'grid' ? (
          /* ─── GRID CARDS VIEW ─── */
          <div
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
            style={{ animation: 'slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) 320ms both' }}
          >
            {filtered.map((c, idx) => {
              const pCount = productCount(c.id)
              const sCount = stockCount(c.id)
              const color = CATEGORY_COLORS[idx % CATEGORY_COLORS.length]
              const share = products.length > 0 ? Math.round((pCount / products.length) * 100) : 0

              return (
                <div
                  key={c.id}
                  className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs hover:shadow-md hover:border-slate-300 card-mobile-active active:scale-[0.99] transition-all flex flex-col justify-between group"
                >
                  <div>
                    {/* Header: Icon + Category Name + Actions */}
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={`w-11 h-11 rounded-2xl ${color.bg} ${color.border} ${color.text} border flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform`}
                        >
                          <Layers size={20} />
                        </div>
                        <div className="min-w-0">
                          <h4 className="font-bold text-slate-900 text-base leading-snug truncate group-hover:text-brand transition-colors">
                            {c.name}
                          </h4>
                          <span className="text-[11px] font-semibold text-slate-400">
                            {share}% del catálogo
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => openEdit(c)}
                          title="Editar categoría"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-brand hover:bg-blue-50 transition-colors"
                        >
                          <Pencil size={15} />
                        </button>
                        <button
                          onClick={() => setConfirmDelete(c)}
                          title="Eliminar categoría"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>

                    {/* Description */}
                    <p className="text-xs text-slate-500 line-clamp-2 min-h-[32px] mb-4">
                      {c.description || (
                        <span className="text-slate-400 italic">Sin descripción registrada.</span>
                      )}
                    </p>
                  </div>

                  {/* Stock & Products Breakdown Footer */}
                  <div className="pt-3.5 border-t border-slate-100">
                    <div className="grid grid-cols-2 gap-2 text-center mb-2.5">
                      <div className="bg-slate-50/70 rounded-xl p-2 border border-slate-100">
                        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-0.5">
                          Productos
                        </p>
                        <p className="font-bold text-slate-900 text-sm font-mono">
                          {pCount} SKUs
                        </p>
                      </div>
                      <div className="bg-slate-50/70 rounded-xl p-2 border border-slate-100">
                        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-0.5">
                          Stock Físico
                        </p>
                        <p className="font-bold text-brand text-sm font-mono">
                          {sCount} uds.
                        </p>
                      </div>
                    </div>

                    {/* Distribution Bar */}
                    <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                      <div
                        className="bg-brand h-full rounded-full transition-all duration-700"
                        style={{ width: `${Math.max(share, 4)}%` }}
                      />
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          /* ─── TABLE VIEW ─── */
          <div
            className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-xs"
            style={{ animation: 'slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) 320ms both' }}
          >
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200/80 bg-slate-50/70 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    <th className="py-3 px-4">Familia / Categoría</th>
                    <th className="py-3 px-4">Descripción</th>
                    <th className="py-3 px-4 text-center">Productos Asociados</th>
                    <th className="py-3 px-4 text-right">Existencias Físicas</th>
                    <th className="py-3 px-4 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {filtered.map((c, idx) => {
                    const pCount = productCount(c.id)
                    const sCount = stockCount(c.id)
                    const color = CATEGORY_COLORS[idx % CATEGORY_COLORS.length]

                    return (
                      <tr key={c.id} className="hover:bg-slate-50/80 transition-colors group">
                        {/* Name + Icon */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-3">
                            <div
                              className={`w-9 h-9 rounded-xl ${color.bg} ${color.border} ${color.text} border flex items-center justify-center shrink-0 shadow-xs`}
                            >
                              <Layers size={16} />
                            </div>
                            <span className="font-semibold text-slate-900 text-sm group-hover:text-brand transition-colors">
                              {c.name}
                            </span>
                          </div>
                        </td>

                        {/* Description */}
                        <td className="py-3.5 px-4 text-slate-600 max-w-xs truncate">
                          {c.description || <span className="text-slate-300 italic">—</span>}
                        </td>

                        {/* Product count */}
                        <td className="py-3.5 px-4 text-center font-mono">
                          <span className="bg-slate-100 text-slate-700 px-2.5 py-1 rounded-lg font-bold">
                            {pCount} SKUs
                          </span>
                        </td>

                        {/* Stock count */}
                        <td className="py-3.5 px-4 text-right font-mono font-extrabold text-sm text-brand">
                          {sCount} uds.
                        </td>

                        {/* Actions */}
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => openEdit(c)}
                              title="Editar categoría"
                              className="p-1.5 rounded-lg text-slate-400 hover:text-brand hover:bg-blue-50 transition-colors"
                            >
                              <Pencil size={15} />
                            </button>
                            <button
                              onClick={() => setConfirmDelete(c)}
                              title="Eliminar categoría"
                              className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Table Footer */}
            <div className="p-3 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <span>
                Mostrando <strong>{filtered.length}</strong> de <strong>{categories.length}</strong> categorías
              </span>
              <span>Árbol de Categorías CYA Store</span>
            </div>
          </div>
        )}

      </div>

      {/* ═════════════════════════════════════════════════════════
          4. CREATE / EDIT CATEGORY MODAL
         ═════════════════════════════════════════════════════════ */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Editar Categoría' : 'Nueva Categoría de Catálogo'}
        width="max-w-md"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">Nombre de la Categoría *</label>
            <input
              className="field"
              placeholder="Ej. Audio & Accesorios, Pantallas, Relojes…"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              autoFocus
              required
            />
          </div>

          <div>
            <label className="label">Descripción Detallada (Opcional)</label>
            <textarea
              className="field"
              rows={3}
              placeholder="Breve descripción para clasificar los productos de esta categoría…"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>

          {error && (
            <p className="text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-200 rounded-xl p-3">
              {error}
            </p>
          )}

          <div className="flex justify-end gap-2.5 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="btn-secondary"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="btn-primary"
            >
              {saving ? 'Guardando…' : editing ? 'Guardar Cambios' : 'Crear Categoría'}
            </button>
          </div>
        </form>
      </Modal>

      {/* ═════════════════════════════════════════════════════════
          5. CONFIRM DELETE MODAL
         ═════════════════════════════════════════════════════════ */}
      <Modal
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        title="Eliminar Categoría"
        width="max-w-sm"
      >
        {confirmDelete && (
          <div className="space-y-4">
            <p className="text-sm text-slate-600">
              ¿Estás seguro de que deseas eliminar la categoría{' '}
              <strong className="text-slate-900">{confirmDelete.name}</strong>?
            </p>

            {productCount(confirmDelete.id) > 0 && (
              <div className="flex items-start gap-2 text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-xl p-3">
                <AlertCircle size={16} className="shrink-0 mt-0.5" />
                <span>
                  Hay <strong>{productCount(confirmDelete.id)}</strong> productos asociados a esta categoría. Quedarán como "Sin categoría".
                </span>
              </div>
            )}

            <div className="flex justify-end gap-2.5 pt-2">
              <button
                onClick={() => setConfirmDelete(null)}
                className="btn-secondary"
              >
                Cancelar
              </button>
              <button
                onClick={handleDelete}
                className="btn-danger"
              >
                Eliminar
              </button>
            </div>
          </div>
        )}
      </Modal>

    </AppLayout>
  )
}
