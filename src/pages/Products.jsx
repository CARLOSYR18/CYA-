import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Plus, Pencil, Trash2, Search, Boxes, ImageOff, Camera, X,
  Filter, LayoutGrid, List, AlertTriangle, ArrowUpDown,
  CheckCircle2, DollarSign, Package, Layers, Sparkles,
  ExternalLink, ChevronRight, Eye
} from 'lucide-react'
import AppLayout from '../components/layout/AppLayout'
import Modal from '../components/ui/Modal'
import EmptyState from '../components/ui/EmptyState'
import StockBadge from '../components/ui/StockBadge'
import { productsService } from '../services/productsService'
import { categoriesService } from '../services/categoriesService'
import { suppliersService } from '../services/suppliersService'
import { inventoryMovementsService } from '../services/inventoryMovementsService'

const fmt = (n) =>
  `S/ ${(Number(n) || 0).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
const fmtN = (n) => (Number(n) || 0).toLocaleString('es-PE')

const emptyForm = {
  sku: '',
  name: '',
  category_id: '',
  unit: 'unidad',
  cost_price: '',
  sale_price: '',
  stock: '',
  min_stock: '',
  supplier_id: '',
  image_url: '',
  is_kit: false,
  kit_component_id: '',
  kit_quantity: '1',
}

export default function Products() {
  const [products, setProducts] = useState([])
  const [categories, setCategories] = useState([])
  const [suppliers, setSuppliers] = useState([])
  const [loading, setLoading] = useState(true)

  // Filters & Views
  const [search, setSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('ALL')
  const [stockFilter, setStockFilter] = useState('ALL') // 'ALL' | 'AVAILABLE' | 'LOW' | 'OUT' | 'KITS'
  const [viewMode, setViewMode] = useState('table') // 'table' | 'grid'

  // Modals & Form State
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [imageFile, setImageFile] = useState(null)
  const [imagePreview, setImagePreview] = useState('')
  const [error, setError] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [previewModalProd, setPreviewModalProd] = useState(null)
  const fileInputRef = useRef(null)

  async function loadAll() {
    setLoading(true)
    try {
      const [p, c, s] = await Promise.all([
        productsService.list(),
        categoriesService.list(),
        suppliersService.list()
      ])
      setProducts(p || [])
      setCategories(c || [])
      setSuppliers(s || [])
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadAll()
  }, [])

  useEffect(() => {
    if (!imageFile) {
      setImagePreview('')
      return
    }
    const url = URL.createObjectURL(imageFile)
    setImagePreview(url)
    return () => URL.revokeObjectURL(url)
  }, [imageFile])

  /* ─── Computed Statistics ─── */
  const stats = useMemo(() => {
    const totalSkus = products.length
    const totalUnits = products.reduce((acc, p) => acc + (Number(p.stock) || 0), 0)
    const inventoryValuation = products.reduce((acc, p) => {
      const cost = Number(p.cost_price) || Number(p.sale_price) || 0
      return acc + (cost * (Number(p.stock) || 0))
    }, 0)
    const lowStockCount = products.filter(
      (p) => (Number(p.stock) || 0) <= (Number(p.min_stock) || 0) && (Number(p.stock) || 0) > 0
    ).length
    const outOfStockCount = products.filter((p) => (Number(p.stock) || 0) <= 0).length

    return {
      totalSkus,
      totalUnits,
      inventoryValuation,
      lowStockCount,
      outOfStockCount,
      alertsCount: lowStockCount + outOfStockCount
    }
  }, [products])

  /* ─── Filtered Products ─── */
  const filtered = useMemo(() => {
    let result = products

    // Text search
    const q = search.trim().toLowerCase()
    if (q) {
      result = result.filter(
        (p) => p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q)
      )
    }

    // Category filter
    if (selectedCategory !== 'ALL') {
      result = result.filter((p) => p.category_id === selectedCategory)
    }

    // Stock condition filter
    if (stockFilter === 'AVAILABLE') {
      result = result.filter((p) => (Number(p.stock) || 0) > (Number(p.min_stock) || 0))
    } else if (stockFilter === 'LOW') {
      result = result.filter(
        (p) => (Number(p.stock) || 0) <= (Number(p.min_stock) || 0) && (Number(p.stock) || 0) > 0
      )
    } else if (stockFilter === 'OUT') {
      result = result.filter((p) => (Number(p.stock) || 0) <= 0)
    } else if (stockFilter === 'KITS') {
      result = result.filter((p) => p.is_kit)
    }

    return result
  }, [products, search, selectedCategory, stockFilter])

  function resetImg() {
    setImageFile(null)
    setImagePreview('')
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  async function openCreate() {
    setEditing(null)
    setError('')
    resetImg()
    const sku = await productsService.generateSku()
    setForm({ ...emptyForm, sku })
    setModalOpen(true)
  }

  function openEdit(p) {
    setEditing(p)
    setForm({
      sku: p.sku,
      name: p.name,
      category_id: p.category_id || '',
      unit: p.unit,
      cost_price: p.cost_price,
      sale_price: p.sale_price,
      stock: p.stock,
      min_stock: p.min_stock,
      supplier_id: p.supplier_id || '',
      image_url: p.image_url || '',
      is_kit: p.is_kit || false,
      kit_component_id: p.kit_component_id || '',
      kit_quantity: String(p.kit_quantity || '1')
    })
    setError('')
    resetImg()
    setModalOpen(true)
  }

  function closeModal() {
    setModalOpen(false)
    resetImg()
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (!form.name.trim()) {
      setError('El nombre del producto es obligatorio')
      return
    }

    let image_url = form.image_url || ''
    if (imageFile) {
      try {
        image_url = await productsService.uploadImage(imageFile)
      } catch (err) {
        setError(err.message || 'No se pudo subir la imagen')
        return
      }
    }

    const payload = {
      sku: form.sku.trim(),
      name: form.name.trim(),
      category_id: form.category_id || null,
      unit: form.unit,
      cost_price: Number(form.cost_price) || 0,
      sale_price: Number(form.sale_price) || 0,
      min_stock: Number(form.min_stock) || 0,
      supplier_id: form.supplier_id || null,
      image_url: image_url || null,
      is_kit: form.is_kit,
      kit_component_id: form.is_kit ? form.kit_component_id || null : null,
      kit_quantity: form.is_kit ? Number(form.kit_quantity) || 1 : 1,
      ...(!form.is_kit && !editing ? { stock: Number(form.stock) || 0 } : {})
    }

    try {
      if (editing) {
        await productsService.update(editing.id, payload)
        if (!form.is_kit) {
          const delta = Number(form.stock) - Number(editing.stock)
          if (delta !== 0) {
            await inventoryMovementsService.register({
              product_id: editing.id,
              type: delta > 0 ? 'entrada' : 'salida',
              quantity: Math.abs(delta),
              reason: 'Ajuste manual desde edición de producto',
            })
          }
        }
      } else {
        await productsService.create(payload)
      }
      closeModal()
      loadAll()
    } catch (err) {
      setError(err.message || 'No se pudo guardar')
    }
  }

  async function handleDelete() {
    if (!confirmDelete) return
    await productsService.remove(confirmDelete.id)
    setConfirmDelete(null)
    loadAll()
  }

  const catName = (id) => categories.find((c) => c.id === id)?.name || 'Sin categoría'
  const previewSrc = imagePreview || form.image_url || ''

  return (
    <AppLayout title="Catálogo de Productos">
      <div className="space-y-5 max-w-7xl mx-auto pb-12">

        {/* ═════════════════════════════════════════════════════════
            1. EXECUTIVE METRICS BAR (4 ELEGANT WHITE PILLS)
           ═════════════════════════════════════════════════════════ */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
          
          {/* Card 1: Total SKUs */}
          <div
            className="bg-white rounded-2xl border border-slate-200/80 p-3 sm:p-4.5 shadow-xs flex flex-col justify-between card-mobile-active active:scale-[0.98] transition-all hover:border-slate-300"
            style={{ animation: 'slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) 40ms both' }}
          >
            <div className="flex items-center justify-between gap-1.5 mb-1.5 sm:mb-2">
              <p className="text-[10px] sm:text-[11px] font-bold text-slate-500 uppercase tracking-wider truncate">
                Total Catálogo
              </p>
              <div className="w-7 h-7 sm:w-9 sm:h-9 rounded-lg sm:rounded-xl bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-600 shrink-0">
                <Boxes size={14} className="sm:hidden" />
                <Boxes size={18} className="hidden sm:block" />
              </div>
            </div>
            <div>
              <h4 className="text-base sm:text-2xl font-extrabold text-slate-900 tracking-tight font-sans whitespace-nowrap overflow-hidden text-ellipsis">
                {loading ? '…' : `${stats.totalSkus} SKUs`}
              </h4>
              <p className="text-[10px] sm:text-xs text-slate-400 mt-0.5 truncate">
                {categories.length} categorías activas
              </p>
            </div>
          </div>

          {/* Card 2: Unidades Físicas */}
          <div
            className="bg-white rounded-2xl border border-slate-200/80 p-3 sm:p-4.5 shadow-xs flex flex-col justify-between card-mobile-active active:scale-[0.98] transition-all hover:border-slate-300"
            style={{ animation: 'slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) 100ms both' }}
          >
            <div className="flex items-center justify-between gap-1.5 mb-1.5 sm:mb-2">
              <p className="text-[10px] sm:text-[11px] font-bold text-slate-500 uppercase tracking-wider truncate">
                Stock Total Físico
              </p>
              <div className="w-7 h-7 sm:w-9 sm:h-9 rounded-lg sm:rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-brand shrink-0">
                <Package size={14} className="sm:hidden" />
                <Package size={18} className="hidden sm:block" />
              </div>
            </div>
            <div>
              <h4 className="text-base sm:text-2xl font-extrabold text-slate-900 tracking-tight font-sans whitespace-nowrap overflow-hidden text-ellipsis">
                {loading ? '…' : `${fmtN(stats.totalUnits)} uds.`}
              </h4>
              <p className="text-[10px] sm:text-xs text-slate-400 mt-0.5 truncate">En almacén central</p>
            </div>
          </div>

          {/* Card 3: Valorización Estimada */}
          <div
            className="bg-white rounded-2xl border border-slate-200/80 p-3 sm:p-4.5 shadow-xs flex flex-col justify-between card-mobile-active active:scale-[0.98] transition-all hover:border-slate-300"
            style={{ animation: 'slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) 160ms both' }}
          >
            <div className="flex items-center justify-between gap-1.5 mb-1.5 sm:mb-2">
              <p className="text-[10px] sm:text-[11px] font-bold text-slate-500 uppercase tracking-wider truncate">
                Valorización Stock
              </p>
              <div className="w-7 h-7 sm:w-9 sm:h-9 rounded-lg sm:rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
                <DollarSign size={14} className="sm:hidden" />
                <DollarSign size={18} className="hidden sm:block" />
              </div>
            </div>
            <div>
              <h4 className="text-base sm:text-2xl font-extrabold text-slate-900 tracking-tight font-sans whitespace-nowrap overflow-hidden text-ellipsis">
                {loading ? '…' : fmt(stats.inventoryValuation)}
              </h4>
              <p className="text-[10px] sm:text-xs text-slate-400 mt-0.5 truncate">Costo base estimado</p>
            </div>
          </div>

          {/* Card 4: Alertas de Reposición */}
          <div
            className="bg-white rounded-2xl border border-slate-200/80 p-3 sm:p-4.5 shadow-xs flex flex-col justify-between card-mobile-active active:scale-[0.98] transition-all hover:border-slate-300"
            style={{ animation: 'slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) 220ms both' }}
          >
            <div className="flex items-center justify-between gap-1.5 mb-1.5 sm:mb-2">
              <p className="text-[10px] sm:text-[11px] font-bold text-slate-500 uppercase tracking-wider truncate">
                Control de Quiebres
              </p>
              <div
                className={`w-7 h-7 sm:w-9 sm:h-9 rounded-lg sm:rounded-xl border flex items-center justify-center shrink-0 ${
                  stats.alertsCount > 0
                    ? 'bg-amber-50 border-amber-200 text-amber-600'
                    : 'bg-emerald-50 border-emerald-100 text-emerald-600'
                }`}
              >
                {stats.alertsCount > 0 ? (
                  <>
                    <AlertTriangle size={14} className="sm:hidden" />
                    <AlertTriangle size={18} className="hidden sm:block" />
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={14} className="sm:hidden" />
                    <CheckCircle2 size={18} className="hidden sm:block" />
                  </>
                )}
              </div>
            </div>
            <div>
              <h4 className="text-base sm:text-2xl font-extrabold text-slate-900 tracking-tight font-sans whitespace-nowrap overflow-hidden text-ellipsis">
                {loading ? '…' : stats.alertsCount > 0 ? `${stats.alertsCount} en alerta` : '100% Óptimo'}
              </h4>
              <p className="text-[10px] sm:text-xs text-slate-400 mt-0.5 truncate">
                {stats.outOfStockCount > 0 ? `${stats.outOfStockCount} agotados` : 'Sin faltantes críticos'}
              </p>
            </div>
          </div>

        </div>

        {/* ═════════════════════════════════════════════════════════
            2. INTERACTIVE FILTER & ACTION BAR
           ═════════════════════════════════════════════════════════ */}
        <div
          className="bg-white rounded-2xl border border-slate-200/80 p-3.5 sm:p-5 shadow-xs space-y-3"
          style={{ animation: 'slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) 280ms both' }}
        >
          {/* Top Row: Search + Category + View Mode + Primary Action */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3">
            
            {/* Search Input with quick clear */}
            <div className="relative flex-1 w-full sm:max-w-md">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                className="w-full bg-slate-50/70 border border-slate-200 rounded-xl pl-10 pr-9 py-2 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-brand focus:ring-2 focus:ring-brand/10 transition-all outline-none"
                placeholder="Buscar por nombre de producto o SKU…"
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

            {/* Right side controls: Category Select + View Mode + New Product */}
            <div className="flex items-center justify-between sm:justify-start gap-2 w-full sm:w-auto">
              {/* Category Dropdown */}
              <div className="relative flex-1 sm:w-44">
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full bg-slate-50/70 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs text-slate-700 font-medium focus:bg-white focus:border-brand transition-all outline-none cursor-pointer"
                >
                  <option value="ALL">Todas las categorías</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* View Mode Toggle: Table / Grid */}
              <div className="inline-flex items-center p-1 bg-slate-100 rounded-xl border border-slate-200/80 shrink-0">
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
              </div>

              {/* Primary Action Button */}
              <button
                onClick={openCreate}
                className="inline-flex items-center justify-center gap-1.5 bg-brand hover:bg-brand-hover active:scale-95 text-white font-semibold text-xs sm:text-sm px-3.5 py-2 sm:px-4 sm:py-2.5 rounded-xl transition-all shadow-sm shrink-0"
              >
                <Plus size={15} />
                <span>Nuevo Producto</span>
              </button>
            </div>
          </div>

          {/* Bottom Filter Chips: Quick Status Filter */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs pt-1 border-t border-slate-100 no-scrollbar -mx-1 px-1">
            <span className="text-[11px] font-semibold uppercase text-slate-400 mr-1 shrink-0 flex items-center gap-1">
              <Filter size={12} /> Estado:
            </span>

            {[
              { id: 'ALL', label: `Todos (${products.length})` },
              { id: 'AVAILABLE', label: 'Disponibles', color: 'text-emerald-700' },
              { id: 'LOW', label: `Stock Bajo (${stats.lowStockCount})`, color: 'text-amber-700' },
              { id: 'OUT', label: `Agotados (${stats.outOfStockCount})`, color: 'text-red-700' },
              { id: 'KITS', label: 'Combos / Kits' },
            ].map((tab) => {
              const active = stockFilter === tab.id
              return (
                <button
                  key={tab.id}
                  onClick={() => setStockFilter(tab.id)}
                  className={`px-3 py-1.5 rounded-xl font-medium transition-all whitespace-nowrap shrink-0 ${
                    active
                      ? 'bg-brand text-white shadow-xs font-semibold'
                      : 'bg-slate-100/70 text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  {tab.label}
                </button>
              )
            })}
          </div>
        </div>

        {/* ═════════════════════════════════════════════════════════
            3. PRODUCT LISTINGS (TABLE VIEW & GRID VIEW)
           ═════════════════════════════════════════════════════════ */}
        {loading ? (
          <div className="bg-white rounded-2xl border border-slate-200/80 p-16 flex flex-col items-center justify-center text-center shadow-xs">
            <div className="w-10 h-10 rounded-full border-2 border-brand border-t-transparent animate-spin mb-3" />
            <p className="text-xs font-semibold text-slate-600">Cargando catálogo de productos…</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200/80 p-8 shadow-xs">
            <EmptyState
              icon={Boxes}
              title="No se encontraron productos"
              description={
                search || selectedCategory !== 'ALL' || stockFilter !== 'ALL'
                  ? 'No hay productos que coincidan con los filtros seleccionados.'
                  : 'Registra tu primer producto para comenzar a controlar inventario y registrar ventas.'
              }
              action={
                search || selectedCategory !== 'ALL' || stockFilter !== 'ALL' ? (
                  <button
                    onClick={() => {
                      setSearch('')
                      setSelectedCategory('ALL')
                      setStockFilter('ALL')
                    }}
                    className="btn-secondary text-xs"
                  >
                    Restablecer filtros
                  </button>
                ) : (
                  <button onClick={openCreate} className="btn-primary text-xs">
                    <Plus size={15} /> Nuevo producto
                  </button>
                )
              }
            />
          </div>
        ) : viewMode === 'grid' ? (
          /* ─── GRID / CARD VIEW ─── */
          <div
            className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4"
            style={{ animation: 'slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) 320ms both' }}
          >
            {filtered.map((p) => {
              const stock = Number(p.stock) || 0
              const minStock = Number(p.min_stock) || 0
              const isZero = stock <= 0
              const pct = minStock > 0 ? Math.min(Math.round((stock / minStock) * 100), 100) : 100
              const marginPct =
                p.cost_price > 0 && p.sale_price > p.cost_price
                  ? Math.round(((p.sale_price - p.cost_price) / p.cost_price) * 100)
                  : null

              return (
                <div
                  key={p.id}
                  className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-xs hover:shadow-md hover:border-slate-300 transition-all flex flex-col justify-between group card-mobile-active active:scale-[0.99]"
                >
                  <div>
                    {/* Image Header with Badge Overlay */}
                    <div className="relative h-44 bg-slate-100 flex items-center justify-center overflow-hidden border-b border-slate-100">
                      {p.image_url ? (
                        <img
                          src={p.image_url}
                          alt={p.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="flex flex-col items-center justify-center text-slate-300">
                          <ImageOff size={32} strokeWidth={1.5} />
                          <span className="text-[10px] font-medium text-slate-400 mt-1">Sin fotografía</span>
                        </div>
                      )}

                      {/* Top Badges */}
                      <div className="absolute top-2.5 left-2.5 flex flex-col gap-1.5 items-start">
                        <span className="font-mono text-[10px] font-bold bg-white/90 backdrop-blur-sm text-slate-700 px-2 py-0.5 rounded-lg border border-slate-200/80 shadow-xs">
                          {p.sku}
                        </span>
                        {p.is_kit && (
                          <span className="text-[10px] font-bold bg-blue-600 text-white px-2 py-0.5 rounded-lg shadow-xs">
                            Combo / Kit
                          </span>
                        )}
                      </div>

                      {/* Stock Status Badge */}
                      <div className="absolute top-2.5 right-2.5">
                        <StockBadge stock={p.stock} minStock={p.min_stock} />
                      </div>
                    </div>

                    {/* Card Content */}
                    <div className="p-4">
                      <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                        {catName(p.category_id)}
                      </p>
                      <h4 className="font-bold text-slate-900 text-sm leading-snug line-clamp-2 group-hover:text-brand transition-colors">
                        {p.name}
                      </h4>

                      {/* Stock Level Bar */}
                      <div className="mt-3.5 pt-3 border-t border-slate-100">
                        <div className="flex items-center justify-between text-xs mb-1.5">
                          <span className="text-slate-500 font-medium">Existencias:</span>
                          <span className="font-mono font-bold text-slate-900">
                            {stock} {p.unit}
                          </span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              isZero ? 'bg-red-500' : pct < 50 ? 'bg-amber-500' : 'bg-emerald-500'
                            }`}
                            style={{ width: `${Math.max(pct, 5)}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Price & Actions Footer */}
                  <div className="px-4 py-3 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between">
                    <div>
                      <p className="font-mono font-extrabold text-base text-slate-900">
                        {fmt(p.sale_price)}
                      </p>
                      {marginPct !== null && (
                        <p className="text-[10px] font-semibold text-emerald-600">
                          +{marginPct}% margen
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => openEdit(p)}
                        title="Editar producto"
                        className="p-1.5 rounded-lg text-slate-400 hover:text-brand hover:bg-blue-50 transition-all"
                      >
                        <Pencil size={15} />
                      </button>
                      <button
                        onClick={() => setConfirmDelete(p)}
                        title="Eliminar producto"
                        className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-all"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          /* ─── ENTERPRISE TABLE VIEW ─── */
          <div
            className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-xs"
            style={{ animation: 'slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) 320ms both' }}
          >
            {/* Mobile View */}
            <div className="block sm:hidden divide-y divide-slate-100">
              {filtered.map((p) => (
                <div key={p.id} className="p-4 space-y-3 hover:bg-slate-50/70 transition-colors">
                  <div className="flex items-start gap-3">
                    <div className="shrink-0">
                      {p.image_url ? (
                        <img
                          src={p.image_url}
                          alt={p.name}
                          className="w-14 h-14 rounded-xl object-cover border border-slate-200"
                        />
                      ) : (
                        <div className="w-14 h-14 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center">
                          <ImageOff size={18} className="text-slate-400" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-1">
                        <p className="font-semibold text-slate-900 text-sm leading-snug truncate">
                          {p.name}
                        </p>
                        {p.is_kit && (
                          <span className="shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-brand border border-blue-100">
                            Combo
                          </span>
                        )}
                      </div>
                      <p className="font-mono text-xs text-slate-500 mt-0.5">{p.sku}</p>
                      <p className="text-xs text-slate-400 mt-0.5">{catName(p.category_id)}</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2.5 border-t border-slate-100">
                    <div className="flex items-center gap-2">
                      <StockBadge stock={p.stock} minStock={p.min_stock} />
                      <span className="font-mono text-xs font-medium text-slate-700">
                        {p.stock} {p.unit}
                      </span>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="font-mono font-bold text-sm text-slate-900">
                        {fmt(p.sale_price)}
                      </span>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => openEdit(p)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-brand hover:bg-blue-50 transition-all"
                        >
                          <Pencil size={15} />
                        </button>
                        <button
                          onClick={() => setConfirmDelete(p)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-all"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop View */}
            <div className="overflow-x-auto hidden sm:block">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200/80 bg-slate-50/70 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    <th className="py-3 px-4 w-14">Foto</th>
                    <th className="py-3 px-4">Código SKU</th>
                    <th className="py-3 px-4">Producto</th>
                    <th className="py-3 px-4">Categoría</th>
                    <th className="py-3 px-4 text-right">Existencias</th>
                    <th className="py-3 px-4 text-right">Precio Venta</th>
                    <th className="py-3 px-4 text-center">Estado</th>
                    <th className="py-3 px-4 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {filtered.map((p) => {
                    const stock = Number(p.stock) || 0
                    const minStock = Number(p.min_stock) || 0
                    const pct = minStock > 0 ? Math.min(Math.round((stock / minStock) * 100), 100) : 100
                    const isZero = stock <= 0

                    return (
                      <tr
                        key={p.id}
                        className="hover:bg-slate-50/80 transition-colors group"
                      >
                        {/* Photo */}
                        <td className="py-3 px-4">
                          {p.image_url ? (
                            <img
                              src={p.image_url}
                              alt={p.name}
                              className="w-10 h-10 rounded-xl object-cover border border-slate-200 shrink-0 shadow-xs"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0 text-slate-400">
                              <ImageOff size={16} />
                            </div>
                          )}
                        </td>

                        {/* SKU */}
                        <td className="py-3 px-4 font-mono font-bold text-slate-700">
                          <span className="bg-slate-100 px-2 py-0.5 rounded-lg border border-slate-200/70">
                            {p.sku}
                          </span>
                        </td>

                        {/* Name + Combo tag */}
                        <td className="py-3 px-4 font-semibold text-slate-900 text-sm">
                          <div className="flex items-center gap-2">
                            <span>{p.name}</span>
                            {p.is_kit && (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-brand border border-blue-200">
                                Combo
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Category */}
                        <td className="py-3 px-4 text-slate-600 font-medium">
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 text-xs">
                            <Layers size={12} className="text-slate-400" />
                            {catName(p.category_id)}
                          </span>
                        </td>

                        {/* Stock Quantity + Gauge */}
                        <td className="py-3 px-4 text-right">
                          <div className="inline-flex flex-col items-end">
                            <span className="font-mono font-bold text-slate-900 text-sm">
                              {stock} {p.unit}
                            </span>
                            <div className="w-20 bg-slate-100 rounded-full h-1 mt-1 overflow-hidden">
                              <div
                                className={`h-full rounded-full ${
                                  isZero ? 'bg-red-500' : pct < 50 ? 'bg-amber-500' : 'bg-emerald-500'
                                }`}
                                style={{ width: `${Math.max(pct, 5)}%` }}
                              />
                            </div>
                          </div>
                        </td>

                        {/* Price */}
                        <td className="py-3 px-4 text-right font-mono font-bold text-sm text-slate-900">
                          {fmt(p.sale_price)}
                        </td>

                        {/* Status */}
                        <td className="py-3 px-4 text-center">
                          <StockBadge stock={p.stock} minStock={p.min_stock} />
                        </td>

                        {/* Actions */}
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => openEdit(p)}
                              title="Editar producto"
                              className="p-1.5 rounded-lg text-slate-400 hover:text-brand hover:bg-blue-50 transition-colors"
                            >
                              <Pencil size={15} />
                            </button>
                            <button
                              onClick={() => setConfirmDelete(p)}
                              title="Eliminar producto"
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

            {/* Table Footer Summary */}
            <div className="p-3 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <span>
                Mostrando <strong>{filtered.length}</strong> de <strong>{products.length}</strong> productos
              </span>
              <span>Catálogo Central CYA Store</span>
            </div>
          </div>
        )}

      </div>

      {/* ═════════════════════════════════════════════════════════
          4. CREATE & EDIT PRODUCT MODAL
         ═════════════════════════════════════════════════════════ */}
      <Modal
        open={modalOpen}
        onClose={closeModal}
        title={editing ? 'Editar Producto' : 'Registrar Nuevo Producto'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Código SKU</label>
              <input className="field font-mono font-bold text-slate-700 bg-slate-50" value={form.sku} readOnly />
            </div>
            <div>
              <label className="label">Unidad de Medida</label>
              <select
                className="field"
                value={form.unit}
                onChange={(e) => setForm({ ...form, unit: e.target.value })}
              >
                {['unidad', 'caja', 'paquete', 'rollo', 'kg', 'litro'].map((u) => (
                  <option key={u} value={u}>
                    {u}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="label">Nombre Comercial del Producto *</label>
            <input
              className="field"
              placeholder="Ej: AirPods Pro Gen 4 (con estuche de carga)"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
          </div>

          {/* Photo Uploader */}
          <div>
            <label className="label flex items-center gap-1.5">
              <Camera size={13} /> Fotografía del Producto
            </label>
            <div className="flex items-start gap-4">
              <div
                className="relative shrink-0 w-24 h-24 rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 flex items-center justify-center overflow-hidden group cursor-pointer hover:border-brand transition-colors"
                onClick={() => fileInputRef.current?.click()}
              >
                {previewSrc ? (
                  <>
                    <img src={previewSrc} alt="" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        resetImg()
                        setForm((f) => ({ ...f, image_url: '' }))
                      }}
                      className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-2xl"
                    >
                      <X size={20} className="text-white" />
                    </button>
                  </>
                ) : (
                  <ImageOff size={24} className="text-slate-400" />
                )}
              </div>
              <div className="flex flex-col gap-1.5 pt-1">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="btn-secondary text-xs px-3 py-1.5 self-start"
                >
                  <Camera size={13} />
                  {previewSrc ? 'Cambiar fotografía' : 'Subir fotografía'}
                </button>
                {imageFile && (
                  <p className="text-[11px] text-brand font-medium max-w-[200px] truncate">
                    {imageFile.name}
                  </p>
                )}
                {!imageFile && form.image_url && (
                  <p className="text-[11px] text-emerald-600 font-medium">✓ Imagen guardada</p>
                )}
                <p className="text-[11px] text-slate-400">PNG, JPG o WEBP. Máx 5 MB.</p>
              </div>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (f) setImageFile(f)
              }}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="label">Categoría</label>
              <select
                className="field"
                value={form.category_id}
                onChange={(e) => setForm({ ...form, category_id: e.target.value })}
              >
                <option value="">Sin categoría</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Proveedor Asociado</label>
              <select
                className="field"
                value={form.supplier_id}
                onChange={(e) => setForm({ ...form, supplier_id: e.target.value })}
              >
                <option value="">Sin proveedor</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Combo / Kit Option */}
          <div className="border border-slate-200 rounded-2xl p-4 space-y-3 bg-slate-50/60">
            <label className="flex items-center gap-3 cursor-pointer select-none">
              <div
                onClick={() =>
                  setForm({
                    ...form,
                    is_kit: !form.is_kit,
                    kit_component_id: '',
                    kit_quantity: '1'
                  })
                }
                className={`relative w-10 h-5 rounded-full transition-colors duration-200 ${
                  form.is_kit ? 'bg-brand' : 'bg-slate-300'
                }`}
              >
                <span
                  className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform duration-200 ${
                    form.is_kit ? 'translate-x-5' : ''
                  }`}
                />
              </div>
              <span className="text-sm font-semibold text-slate-800">
                Es un combo / kit (descuenta stock de otro producto)
              </span>
            </label>

            {form.is_kit && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="label">Producto base origen</label>
                  <select
                    className="field"
                    value={form.kit_component_id}
                    onChange={(e) => setForm({ ...form, kit_component_id: e.target.value })}
                  >
                    <option value="">Selecciona el producto base</option>
                    {products
                      .filter((p) => !p.is_kit && (!editing || p.id !== editing.id))
                      .map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.sku} — {p.name} (stock: {p.stock})
                        </option>
                      ))}
                  </select>
                </div>
                <div>
                  <label className="label">Unidades base por combo</label>
                  <input
                    type="number"
                    min="1"
                    className="field"
                    value={form.kit_quantity}
                    onChange={(e) => setForm({ ...form, kit_quantity: e.target.value })}
                  />
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="label">Precio de Costo (S/)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                className="field font-mono"
                placeholder="0.00"
                value={form.cost_price}
                onChange={(e) => setForm({ ...form, cost_price: e.target.value })}
              />
            </div>
            <div>
              <label className="label">Precio de Venta (S/) *</label>
              <input
                type="number"
                step="0.01"
                min="0"
                className="field font-mono font-bold text-brand"
                placeholder="0.00"
                value={form.sale_price}
                onChange={(e) => setForm({ ...form, sale_price: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="label">
                {editing ? 'Stock Actual en Almacén' : 'Stock Inicial en Almacén'}
              </label>
              {form.is_kit ? (
                <div className="field bg-slate-100 text-slate-500 text-xs flex items-center">
                  Calculado automáticamente según producto base
                </div>
              ) : (
                <>
                  <input
                    type="number"
                    min="0"
                    className="field font-mono"
                    value={form.stock}
                    onChange={(e) => setForm({ ...form, stock: e.target.value })}
                  />
                  {editing && (
                    <p className="text-[11px] text-slate-400 mt-1">
                      Al modificar el stock se registrará un ajuste manual en movimientos.
                    </p>
                  )}
                </>
              )}
            </div>
            <div>
              <label className="label">Stock Mínimo (Alerta de Quiebre)</label>
              <input
                type="number"
                min="0"
                className="field font-mono"
                value={form.min_stock}
                onChange={(e) => setForm({ ...form, min_stock: e.target.value })}
              />
            </div>
          </div>

          {error && (
            <p className="text-xs font-semibold text-red-700 bg-red-50 border border-red-200 rounded-xl px-4 py-2.5">
              {error}
            </p>
          )}

          <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
            <button type="button" onClick={closeModal} className="btn-secondary">
              Cancelar
            </button>
            <button type="submit" className="btn-primary">
              {editing ? 'Guardar Cambios' : 'Crear Producto'}
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
        title="Eliminar Producto del Catálogo"
        width="max-w-sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            ¿Estás seguro de que deseas eliminar permanentemente{' '}
            <strong className="text-slate-900">{confirmDelete?.name}</strong> (SKU:{' '}
            <span className="font-mono">{confirmDelete?.sku}</span>)?
          </p>
          <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-xl p-3">
            ⚠️ Esta acción es irreversible y eliminará el registro del producto.
          </p>
          <div className="flex justify-end gap-2.5 pt-2">
            <button onClick={() => setConfirmDelete(null)} className="btn-secondary">
              Cancelar
            </button>
            <button onClick={handleDelete} className="btn-danger">
              Eliminar
            </button>
          </div>
        </div>
      </Modal>

    </AppLayout>
  )
}
