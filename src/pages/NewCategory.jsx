import { useState, useEffect, useMemo } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import {
  ArrowLeft, FolderTree, Layers, Tag, Sparkles, Check, AlertCircle, X,
  Boxes, DollarSign, CheckCircle2, Package, TrendingUp, Laptop,
  Briefcase, Network, Printer, Headphones, Smartphone, Shirt,
  Coffee, Wrench, ShieldCheck, Eye, Palette
} from 'lucide-react'
import AppLayout from '../components/layout/AppLayout'
import { categoriesService } from '../services/categoriesService'
import { productsService } from '../services/productsService'

const fmt = (n) =>
  `S/ ${(Number(n) || 0).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

const fmtN = (n) => (Number(n) || 0).toLocaleString('es-PE')

/* ─── 7 Finnova Color Themes (Dark & Light Native) ─── */
const COLOR_THEMES = [
  {
    id: 'blue',
    label: 'Azul Finnova',
    bg: 'bg-blue-50 dark:bg-blue-500/10',
    border: 'border-blue-200 dark:border-blue-500/20',
    text: 'text-brand dark:text-blue-400',
    ring: 'ring-blue-600',
    dot: 'bg-blue-600',
    bar: 'from-blue-600 to-indigo-600',
    badge: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/15 dark:text-blue-300 dark:border-blue-500/30'
  },
  {
    id: 'purple',
    label: 'Púrpura Imperial',
    bg: 'bg-purple-50 dark:bg-purple-500/10',
    border: 'border-purple-200 dark:border-purple-500/20',
    text: 'text-purple-600 dark:text-purple-400',
    ring: 'ring-purple-600',
    dot: 'bg-purple-600',
    bar: 'from-purple-600 to-violet-600',
    badge: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-500/15 dark:text-purple-300 dark:border-purple-500/30'
  },
  {
    id: 'emerald',
    label: 'Esmeralda',
    bg: 'bg-emerald-50 dark:bg-emerald-500/10',
    border: 'border-emerald-200 dark:border-emerald-500/20',
    text: 'text-emerald-600 dark:text-emerald-400',
    ring: 'ring-emerald-600',
    dot: 'bg-emerald-600',
    bar: 'from-emerald-500 to-teal-600',
    badge: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-300 dark:border-emerald-500/30'
  },
  {
    id: 'amber',
    label: 'Ámbar Dorado',
    bg: 'bg-amber-50 dark:bg-amber-500/10',
    border: 'border-amber-200 dark:border-amber-500/20',
    text: 'text-amber-600 dark:text-amber-400',
    ring: 'ring-amber-600',
    dot: 'bg-amber-600',
    bar: 'from-amber-500 to-orange-500',
    badge: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/15 dark:text-amber-300 dark:border-amber-500/30'
  },
  {
    id: 'rose',
    label: 'Rosa Rubí',
    bg: 'bg-rose-50 dark:bg-rose-500/10',
    border: 'border-rose-200 dark:border-rose-500/20',
    text: 'text-rose-600 dark:text-rose-400',
    ring: 'ring-rose-600',
    dot: 'bg-rose-600',
    bar: 'from-rose-500 to-pink-600',
    badge: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-500/15 dark:text-rose-300 dark:border-rose-500/30'
  },
  {
    id: 'cyan',
    label: 'Cian Océano',
    bg: 'bg-cyan-50 dark:bg-cyan-500/10',
    border: 'border-cyan-200 dark:border-cyan-500/20',
    text: 'text-cyan-600 dark:text-cyan-400',
    ring: 'ring-cyan-600',
    dot: 'bg-cyan-600',
    bar: 'from-cyan-500 to-blue-500',
    badge: 'bg-cyan-50 text-cyan-700 border-cyan-200 dark:bg-cyan-500/15 dark:text-cyan-300 dark:border-cyan-500/30'
  },
  {
    id: 'indigo',
    label: 'Índigo Real',
    bg: 'bg-indigo-50 dark:bg-indigo-500/10',
    border: 'border-indigo-200 dark:border-indigo-500/20',
    text: 'text-indigo-600 dark:text-indigo-400',
    ring: 'ring-indigo-600',
    dot: 'bg-indigo-600',
    bar: 'from-indigo-600 to-purple-600',
    badge: 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-500/15 dark:text-indigo-300 dark:border-indigo-500/30'
  }
]

/* ─── Available Visual Category Icons ─── */
const AVAILABLE_ICONS = [
  { id: 'layers', label: 'General / Familias', component: Layers },
  { id: 'laptop', label: 'Cómputo & PCs', component: Laptop },
  { id: 'smartphone', label: 'Móviles & Telefonía', component: Smartphone },
  { id: 'headphones', label: 'Audio & Sonido', component: Headphones },
  { id: 'briefcase', label: 'Oficina & Insumos', component: Briefcase },
  { id: 'network', label: 'Redes & Conectividad', component: Network },
  { id: 'printer', label: 'Impresión & Tintas', component: Printer },
  { id: 'boxes', label: 'Almacén & Kits', component: Boxes },
  { id: 'package', label: 'Paquetes & Stock', component: Package },
  { id: 'wrench', label: 'Ferretería & Repuestos', component: Wrench },
  { id: 'shirt', label: 'Ropa & Moda', component: Shirt },
  { id: 'coffee', label: 'Alimentos & Bebidas', component: Coffee },
]

export default function NewCategory() {
  const navigate = useNavigate()
  const { id } = useParams()
  const isEditing = Boolean(id)

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [colorIndex, setColorIndex] = useState(0)
  const [iconId, setIconId] = useState('layers')

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // Contextual stats for editing mode
  const [categoryProducts, setCategoryProducts] = useState([])
  const [originalCategory, setOriginalCategory] = useState(null)

  useEffect(() => {
    async function loadData() {
      setLoading(true)
      try {
        const [cats, prods] = await Promise.all([
          categoriesService.list().catch(() => []),
          productsService.list().catch(() => [])
        ])

        if (isEditing) {
          const current = (cats || []).find((c) => String(c.id) === String(id))
          if (current) {
            setOriginalCategory(current)
            setName(current.name || '')
            setDescription(current.description || '')

            // Match color index
            const catIndex = (cats || []).findIndex((c) => String(c.id) === String(id))
            if (catIndex >= 0) {
              setColorIndex(catIndex % COLOR_THEMES.length)
            }

            // Products assigned to this category
            const assigned = (prods || []).filter((p) => String(p.category_id) === String(id))
            setCategoryProducts(assigned)

            // Auto select icon if name matches
            const n = (current.name || '').toLowerCase()
            if (n.includes('comp') || n.includes('laptop') || n.includes('pc')) setIconId('laptop')
            else if (n.includes('smart') || n.includes('cel') || n.includes('tel')) setIconId('smartphone')
            else if (n.includes('audio') || n.includes('sonido') || n.includes('auricular')) setIconId('headphones')
            else if (n.includes('oficina') || n.includes('papel')) setIconId('briefcase')
            else if (n.includes('red') || n.includes('cable') || n.includes('switch')) setIconId('network')
            else if (n.includes('impres') || n.includes('toner') || n.includes('tinta')) setIconId('printer')
            else if (n.includes('ropa') || n.includes('moda')) setIconId('shirt')
            else if (n.includes('cafe') || n.includes('bebida')) setIconId('coffee')
            else if (n.includes('ferr') || n.includes('herram')) setIconId('wrench')
          } else {
            setError('No se encontró la categoría solicitada.')
          }
        }
      } catch (err) {
        console.error('Error cargando datos de categoría:', err)
        setError('Error al conectar con la base de datos.')
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [id, isEditing])

  // Smart auto-icon detection on name typing if user hasn't explicitly set a custom one
  const handleNameChange = (val) => {
    setName(val)
    const n = val.toLowerCase()
    if (n.includes('comp') || n.includes('laptop') || n.includes('pc')) setIconId('laptop')
    else if (n.includes('smart') || n.includes('cel') || n.includes('tel')) setIconId('smartphone')
    else if (n.includes('audio') || n.includes('sonido') || n.includes('auricular')) setIconId('headphones')
    else if (n.includes('oficina') || n.includes('papel')) setIconId('briefcase')
    else if (n.includes('red') || n.includes('cable') || n.includes('switch')) setIconId('network')
    else if (n.includes('impres') || n.includes('toner') || n.includes('tinta')) setIconId('printer')
    else if (n.includes('ropa') || n.includes('moda')) setIconId('shirt')
    else if (n.includes('cafe') || n.includes('bebida')) setIconId('coffee')
    else if (n.includes('ferr') || n.includes('herram')) setIconId('wrench')
  }

  // Selected icon component
  const CurrentIconComponent = useMemo(() => {
    const found = AVAILABLE_ICONS.find((i) => i.id === iconId)
    return found ? found.component : Layers
  }, [iconId])

  const selectedTheme = COLOR_THEMES[colorIndex % COLOR_THEMES.length]

  // Financial metrics for current category when editing
  const editingStats = useMemo(() => {
    const skuCount = categoryProducts.length
    const totalUnits = categoryProducts.reduce((sum, p) => sum + (Number(p.stock) || 0), 0)
    const totalValuation = categoryProducts.reduce((sum, p) => {
      const cost = Number(p.cost_price) || Number(p.sale_price) || 0
      return sum + cost * (Number(p.stock) || 0)
    }, 0)
    return { skuCount, totalUnits, totalValuation }
  }, [categoryProducts])

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    const cleanName = name.trim()
    if (!cleanName) {
      setError('El nombre de la categoría es obligatorio.')
      return
    }

    setSaving(true)
    try {
      const payload = {
        name: cleanName,
        description: description.trim()
      }

      if (isEditing) {
        await categoriesService.update(id, payload)
      } else {
        await categoriesService.create(payload)
      }

      navigate('/categorias', {
        state: {
          created: !isEditing,
          updated: isEditing,
          categoryName: cleanName
        }
      })
    } catch (err) {
      console.error(err)
      setError(err.message || 'No se pudo guardar la categoría.')
      setSaving(false)
    }
  }

  return (
    <AppLayout title={isEditing ? 'Modificar Categoría' : 'Nueva Categoría'}>
      <div className="space-y-6 max-w-6xl mx-auto pb-16">

        {/* ═════════════════════════════════════════════════════════
            0. EXECUTIVE BREADCRUMB & TOP HEADER BAR
           ═════════════════════════════════════════════════════════ */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-[#141417] p-5 rounded-2xl border border-slate-200/80 dark:border-zinc-800 shadow-xs">
          <div className="flex items-center gap-3.5">
            <button
              type="button"
              onClick={() => navigate('/categorias')}
              className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 flex items-center justify-center text-slate-600 dark:text-zinc-300 hover:bg-slate-200 dark:hover:bg-zinc-700 transition-all cursor-pointer shadow-xs active:scale-95"
              title="Regresar a Categorías"
            >
              <ArrowLeft size={18} />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <Link to="/categorias" className="text-xs font-semibold text-slate-400 hover:text-brand transition-colors">
                  Categorías
                </Link>
                <span className="text-xs text-slate-300 dark:text-zinc-600">/</span>
                <span className="text-xs font-bold text-brand dark:text-blue-400">
                  {isEditing ? 'Modificar Familia' : 'Nueva Familia'}
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-zinc-100 tracking-tight mt-0.5 font-display">
                {isEditing ? `Editar: ${originalCategory?.name || name}` : 'Registrar Nueva Categoría'}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-blue-50 text-brand dark:bg-blue-500/15 dark:text-blue-300 border border-blue-200 dark:border-blue-500/30">
              <FolderTree size={14} /> Clasificación de Catálogo
            </span>
          </div>
        </div>

        {/* ═════════════════════════════════════════════════════════
            ERROR NOTIFICATION
           ═════════════════════════════════════════════════════════ */}
        {error && (
          <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 text-rose-800 dark:text-rose-300 text-xs flex items-center gap-2.5 shadow-xs animate-slide-up">
            <AlertCircle size={18} className="shrink-0 text-rose-600 dark:text-rose-400" />
            <span className="font-semibold">{error}</span>
          </div>
        )}

        {/* ═════════════════════════════════════════════════════════
            MAIN FORM: 2-COLUMN BALANCED DESKTOP LAYOUT
           ═════════════════════════════════════════════════════════ */}
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">

            {/* ─── LEFT COLUMN: CONFIGURATION & IDENTITY (7 COLS) ─── */}
            <div className="lg:col-span-7 space-y-5">

              {/* CARD 1: GENERAL INFO */}
              <div className="bg-white dark:bg-[#141417] rounded-2xl border border-slate-200/80 dark:border-zinc-800 p-5 sm:p-6 shadow-xs space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-zinc-800">
                  <div className="flex items-center gap-2">
                    <Tag size={16} className="text-brand dark:text-blue-400" />
                    <h3 className="text-sm font-bold text-slate-900 dark:text-zinc-100">
                      1. Identificación y Nomenclatura
                    </h3>
                  </div>
                  <span className="text-[11px] text-slate-400 dark:text-zinc-500 font-medium">Campos obligatorios *</span>
                </div>

                <div className="space-y-4">
                  {/* Category Name */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1.5 uppercase tracking-wider">
                      Nombre de la Categoría *
                    </label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => handleNameChange(e.target.value)}
                      placeholder="Ej: Cómputo, Laptops, Audio & Video, Accesorios…"
                      required
                      autoFocus
                      className="w-full bg-slate-50 dark:bg-zinc-800/80 border border-slate-200 dark:border-zinc-700 rounded-xl px-4 py-2.5 text-xs sm:text-sm text-slate-900 dark:text-zinc-100 font-semibold outline-none focus:bg-white dark:focus:bg-zinc-900 focus:border-brand focus:ring-2 focus:ring-brand/10 transition-all placeholder:text-slate-400 dark:placeholder:text-zinc-500"
                    />
                    <p className="text-[11px] text-slate-400 dark:text-zinc-500 mt-1">
                      Usa un término claro y reconocible para agrupar artículos similares en inventario y ventas.
                    </p>
                  </div>

                  {/* Category Description */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 uppercase tracking-wider">
                        Descripción Detallada (Opcional)
                      </label>
                      <span className="text-[11px] text-slate-400 dark:text-zinc-500">
                        {description.length}/200 caracteres
                      </span>
                    </div>
                    <textarea
                      rows={3}
                      value={description}
                      maxLength={200}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Especifica los tipos de productos que pertenecen a esta categoría, materiales o líneas comerciales…"
                      className="w-full bg-slate-50 dark:bg-zinc-800/80 border border-slate-200 dark:border-zinc-700 rounded-xl px-4 py-2.5 text-xs sm:text-sm text-slate-900 dark:text-zinc-100 outline-none focus:bg-white dark:focus:bg-zinc-900 focus:border-brand focus:ring-2 focus:ring-brand/10 transition-all placeholder:text-slate-400 dark:placeholder:text-zinc-500 leading-relaxed"
                    />
                  </div>
                </div>
              </div>

              {/* CARD 2: VISUAL BRANDING & ICON SELECTION */}
              <div className="bg-white dark:bg-[#141417] rounded-2xl border border-slate-200/80 dark:border-zinc-800 p-5 sm:p-6 shadow-xs space-y-5">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-zinc-800">
                  <div className="flex items-center gap-2">
                    <Palette size={16} className="text-brand dark:text-blue-400" />
                    <h3 className="text-sm font-bold text-slate-900 dark:text-zinc-100">
                      2. Identidad Visual y Color
                    </h3>
                  </div>
                  <span className="text-[11px] font-bold text-brand dark:text-blue-400">
                    {selectedTheme.label}
                  </span>
                </div>

                {/* Color Palette Selector */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-2 uppercase tracking-wider">
                    Paleta Cromática
                  </label>
                  <div className="flex flex-wrap items-center gap-3">
                    {COLOR_THEMES.map((th, idx) => {
                      const isSelected = colorIndex === idx
                      return (
                        <button
                          key={th.id}
                          type="button"
                          onClick={() => setColorIndex(idx)}
                          className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                            isSelected
                              ? `${th.bg} ${th.border} ${th.text} ring-2 ${th.ring} shadow-xs scale-105`
                              : 'bg-slate-50 dark:bg-zinc-800/60 border-slate-200 dark:border-zinc-700 text-slate-600 dark:text-zinc-400 hover:border-slate-300'
                          }`}
                        >
                          <span className={`w-3 h-3 rounded-full ${th.dot}`} />
                          <span>{th.label}</span>
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Icon Selection Gallery */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-2 uppercase tracking-wider">
                    Icono Representativo
                  </label>
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5">
                    {AVAILABLE_ICONS.map((ic) => {
                      const IconComp = ic.component
                      const isSelected = iconId === ic.id

                      return (
                        <button
                          key={ic.id}
                          type="button"
                          onClick={() => setIconId(ic.id)}
                          className={`flex flex-col items-center justify-center p-3 rounded-xl border text-center transition-all cursor-pointer ${
                            isSelected
                              ? `${selectedTheme.bg} ${selectedTheme.border} ${selectedTheme.text} ring-2 ${selectedTheme.ring} shadow-xs`
                              : 'bg-slate-50 dark:bg-zinc-800/60 border-slate-200 dark:border-zinc-700 text-slate-500 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-800'
                          }`}
                        >
                          <IconComp size={20} className="mb-1" />
                          <span className="text-[10px] font-semibold leading-tight line-clamp-1">
                            {ic.label}
                          </span>
                        </button>
                      )
                    })}
                  </div>
                </div>
              </div>

              {/* CARD 3: BEST PRACTICES TIP */}
              <div className="bg-slate-50 dark:bg-zinc-800/40 rounded-2xl border border-slate-200/80 dark:border-zinc-800 p-4.5 flex items-start gap-3">
                <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-500/10 text-brand dark:text-blue-400 shrink-0">
                  <ShieldCheck size={18} />
                </div>
                <div className="text-xs text-slate-600 dark:text-zinc-300 leading-relaxed">
                  <p className="font-bold text-slate-900 dark:text-zinc-100 mb-0.5">
                    Consejo para el control de inventario
                  </p>
                  Mantener entre 4 y 15 categorías principales permite agrupar tus SKUs de manera eficiente en el Punto de Venta, filtros de catálogo y reportes tributarios sin saturar al equipo.
                </div>
              </div>

            </div>

            {/* ─── RIGHT COLUMN: LIVE PREVIEW & ACTIONS (5 COLS) ─── */}
            <div className="lg:col-span-5 space-y-5">

              {/* CARD: LIVE FINNOVA CARD PREVIEW */}
              <div className="bg-white dark:bg-[#141417] rounded-2xl border border-slate-200/80 dark:border-zinc-800 p-5 sm:p-6 shadow-xs space-y-3.5">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-zinc-800">
                  <div className="flex items-center gap-2">
                    <Eye size={16} className="text-brand dark:text-blue-400" />
                    <h3 className="text-sm font-bold text-slate-900 dark:text-zinc-100">
                      Vista Previa en Tiempo Real
                    </h3>
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-500/20">
                    En vivo
                  </span>
                </div>

                <p className="text-xs text-slate-400 dark:text-zinc-500">
                  Así se visualizará la tarjeta de esta categoría en tu catálogo:
                </p>

                {/* THE MOCK CARD */}
                <div className="bg-white dark:bg-[#18181c] rounded-2xl border border-slate-200 dark:border-zinc-700 p-5 shadow-sm space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`w-12 h-12 rounded-2xl ${selectedTheme.bg} ${selectedTheme.border} ${selectedTheme.text} border flex items-center justify-center shrink-0 shadow-xs`}
                      >
                        <CurrentIconComponent size={24} />
                      </div>
                      <div className="min-w-0">
                        <h4 className="font-bold text-slate-900 dark:text-zinc-100 text-base leading-snug truncate">
                          {name.trim() || 'Nombre de la Categoría'}
                        </h4>
                        <span className="text-[11px] font-semibold text-slate-400 dark:text-zinc-400">
                          {isEditing ? `${editingStats.skuCount} SKUs registrados` : 'Familia nueva'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <p className="text-xs text-slate-500 dark:text-zinc-400 line-clamp-2 min-h-[32px] leading-relaxed">
                    {description.trim() || (
                      <span className="text-slate-300 dark:text-zinc-600 italic">
                        Sin descripción registrada. Puedes detallar los productos asociados.
                      </span>
                    )}
                  </p>

                  {/* Micro stats mockup */}
                  <div className="pt-3 border-t border-slate-100 dark:border-zinc-800 grid grid-cols-3 gap-2 text-center">
                    <div className="bg-slate-50 dark:bg-zinc-800/50 rounded-xl p-2 border border-slate-100 dark:border-zinc-800">
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">SKUs</p>
                      <p className="font-extrabold text-slate-900 dark:text-zinc-100 text-sm font-display">
                        {isEditing ? editingStats.skuCount : 0}
                      </p>
                    </div>
                    <div className="bg-slate-50 dark:bg-zinc-800/50 rounded-xl p-2 border border-slate-100 dark:border-zinc-800">
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Stock</p>
                      <p className="font-extrabold text-emerald-600 dark:text-emerald-400 text-sm font-display">
                        {isEditing ? `${fmtN(editingStats.totalUnits)}` : '0 uds.'}
                      </p>
                    </div>
                    <div className="bg-slate-50 dark:bg-zinc-800/50 rounded-xl p-2 border border-slate-100 dark:border-zinc-800">
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Valor</p>
                      <p className="font-extrabold text-slate-900 dark:text-zinc-100 text-xs font-display truncate">
                        {isEditing ? fmt(editingStats.totalValuation) : 'S/ 0.00'}
                      </p>
                    </div>
                  </div>

                  <div className="w-full bg-slate-100 dark:bg-zinc-800 rounded-full h-1.5 overflow-hidden">
                    <div
                      className={`bg-gradient-to-r ${selectedTheme.bar} h-full rounded-full`}
                      style={{ width: '45%' }}
                    />
                  </div>
                </div>
              </div>

              {/* CARD: CONTEXTUAL STATS (IF EDITING) */}
              {isEditing && (
                <div className="bg-white dark:bg-[#141417] rounded-2xl border border-slate-200/80 dark:border-zinc-800 p-5 shadow-xs space-y-3">
                  <div className="flex items-center gap-2 text-slate-900 dark:text-zinc-100 font-bold text-sm">
                    <Package size={16} className="text-brand dark:text-blue-400" />
                    <span>Productos Vinculados Actualmente</span>
                  </div>

                  <div className="space-y-2 text-xs text-slate-600 dark:text-zinc-400">
                    <div className="flex justify-between py-1 border-b border-slate-100 dark:border-zinc-800">
                      <span>Total de SKUs asignados:</span>
                      <strong className="text-slate-900 dark:text-zinc-100">{editingStats.skuCount}</strong>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-100 dark:border-zinc-800">
                      <span>Unidades totales en almacén:</span>
                      <strong className="text-emerald-600 dark:text-emerald-400">{fmtN(editingStats.totalUnits)}</strong>
                    </div>
                    <div className="flex justify-between py-1">
                      <span>Capital invertido estimado:</span>
                      <strong className="text-slate-900 dark:text-zinc-100">{fmt(editingStats.totalValuation)}</strong>
                    </div>
                  </div>
                </div>
              )}

              {/* CARD: STICKY SUBMIT & CANCEL BUTTONS */}
              <div className="bg-white dark:bg-[#141417] rounded-2xl border border-slate-200/80 dark:border-zinc-800 p-5 shadow-xs space-y-3">
                <button
                  type="submit"
                  disabled={saving || !name.trim()}
                  className="w-full py-3 px-4 rounded-xl bg-brand hover:bg-brand-hover text-white font-bold text-sm flex items-center justify-center gap-2 shadow-sm hover:shadow-card active:scale-[0.98] transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? (
                    <>
                      <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                      <span>Guardando datos…</span>
                    </>
                  ) : (
                    <>
                      <Check size={16} />
                      <span>{isEditing ? 'Guardar Modificaciones' : 'Crear y Publicar Categoría'}</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => navigate('/categorias')}
                  className="w-full py-2.5 px-4 rounded-xl bg-slate-50 dark:bg-zinc-800/80 hover:bg-slate-100 dark:hover:bg-zinc-700 text-slate-600 dark:text-zinc-300 text-xs font-semibold flex items-center justify-center transition-colors cursor-pointer border border-slate-200 dark:border-zinc-700"
                >
                  Cancelar y Regresar
                </button>
              </div>

            </div>

          </div>
        </form>

      </div>
    </AppLayout>
  )
}

