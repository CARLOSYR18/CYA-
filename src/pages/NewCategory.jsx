import { useState, useEffect, useMemo } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import {
  ArrowLeft, FolderTree, Layers, Tag, Sparkles, Check, AlertCircle, X,
  Boxes, DollarSign, CheckCircle2, Package, TrendingUp, Laptop,
  Briefcase, Network, Printer, Headphones, Smartphone, Shirt,
  Coffee, Wrench, ShieldCheck, Eye, Palette, Home
} from 'lucide-react'
import AppLayout from '../components/layout/AppLayout'
import { useFormLeaveGuard } from '../hooks/useFormLeaveGuard'
import { categoriesService } from '../services/categoriesService'
import { productsService } from '../services/productsService'

const fmt = (n) =>
  `S/ ${(Number(n) || 0).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

const fmtN = (n) => (Number(n) || 0).toLocaleString('es-PE')

/* ─── 7 Color Themes ─── */
const COLOR_THEMES = [
  {
    id: 'blue',
    label: 'Azul Finnova',
    bg: 'bg-blue-50 dark:bg-blue-500/10',
    border: 'border-blue-200 dark:border-blue-500/20',
    text: 'text-blue-600 dark:text-blue-400',
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
  { id: 'layers', label: 'General', component: Layers },
  { id: 'headphones', label: 'Audio', component: Headphones },
  { id: 'laptop', label: 'Cómputo', component: Laptop },
  { id: 'smartphone', label: 'Móviles', component: Smartphone },
  { id: 'briefcase', label: 'Oficina', component: Briefcase },
  { id: 'network', label: 'Redes', component: Network },
  { id: 'printer', label: 'Impresión', component: Printer },
  { id: 'boxes', label: 'Kits / Combos', component: Boxes },
  { id: 'package', label: 'Paquetes', component: Package },
  { id: 'wrench', label: 'Ferretería', component: Wrench },
  { id: 'shirt', label: 'Ropa', component: Shirt },
  { id: 'coffee', label: 'Alimentos', component: Coffee }
]

export default function NewCategory() {
  const navigate = useNavigate()
  const { id } = useParams()
  const isEditing = Boolean(id)

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [colorIndex, setColorIndex] = useState(0)
  const [iconId, setIconId] = useState('layers')

  // UI & Loading States
  const [loading, setLoading] = useState(isEditing)
  const [isProcessing, setIsProcessing] = useState(false)
  const [processingStep, setProcessingStep] = useState(0) // 1: 35%, 2: 75%, 3: 100%
  const [error, setError] = useState('')

  // Contextual stats for editing mode
  const [categoryProducts, setCategoryProducts] = useState([])
  const [originalCategory, setOriginalCategory] = useState(null)

  // Detección de cambios sin guardar en la categoría
  const isDirty = useMemo(() => {
    if (isProcessing) return false
    if (!isEditing) {
      return Boolean(name.trim() || description.trim() || colorIndex > 0)
    }
    if (!originalCategory) return false
    return (
      name !== originalCategory.name ||
      description !== (originalCategory.description || '')
    )
  }, [isProcessing, isEditing, name, description, colorIndex, originalCategory])

  const { requestLeave, DiscardModalComponent } = useFormLeaveGuard({
    isDirty,
    defaultRedirectUrl: '/categorias',
    modalTitle: isEditing ? '¿Descartar cambios de la categoría?' : '¿Descartar nueva categoría?',
    modalDescription: 'Tienes información ingresada para esta categoría. Si sales ahora o recargas la pantalla, los datos ingresados se perderán.'
  })

  useEffect(() => {
    async function loadData() {
      if (!id) {
        setLoading(false)
        return
      }
      setLoading(true)
      try {
        const [cats, prods] = await Promise.all([
          categoriesService.list().catch(() => []),
          productsService.list().catch(() => [])
        ])

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
          else if (n.includes('audio') || n.includes('sonido') || n.includes('auricular') || n.includes('airpod')) setIconId('headphones')
          else if (n.includes('oficina') || n.includes('papel')) setIconId('briefcase')
          else if (n.includes('red') || n.includes('cable') || n.includes('switch')) setIconId('network')
          else if (n.includes('impres') || n.includes('toner') || n.includes('tinta')) setIconId('printer')
          else if (n.includes('ropa') || n.includes('moda')) setIconId('shirt')
          else if (n.includes('cafe') || n.includes('bebida')) setIconId('coffee')
          else if (n.includes('ferr') || n.includes('herram')) setIconId('wrench')
        } else {
          setError('No se encontró la categoría solicitada.')
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

  // Smart auto-icon detection on typing
  const handleNameChange = (val) => {
    setName(val)
    const n = val.toLowerCase()
    if (n.includes('comp') || n.includes('laptop') || n.includes('pc')) setIconId('laptop')
    else if (n.includes('smart') || n.includes('cel') || n.includes('tel')) setIconId('smartphone')
    else if (n.includes('audio') || n.includes('sonido') || n.includes('auricular') || n.includes('airpod')) setIconId('headphones')
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

  // 3-step animated submit flow
  async function handleSubmit(e) {
    if (e && e.preventDefault) e.preventDefault()
    setError('')

    const cleanName = name.trim()
    if (!cleanName) {
      setError('El nombre de la categoría es obligatorio.')
      return
    }

    setIsProcessing(true)
    setProcessingStep(1) // 35%

    try {
      await new Promise((r) => setTimeout(r, 380))
      setProcessingStep(2) // 75%

      const payload = {
        name: cleanName,
        description: description.trim()
      }

      if (isEditing) {
        await categoriesService.update(id, payload)
      } else {
        await categoriesService.create(payload)
      }

      setProcessingStep(3) // 100%
      await new Promise((r) => setTimeout(r, 450))

      setIsProcessing(false)
      navigate('/categorias', {
        state: {
          created: !isEditing,
          updated: isEditing,
          categoryName: cleanName
        }
      })
    } catch (err) {
      setIsProcessing(false)
      setProcessingStep(0)
      console.error(err)
      setError(err.message || 'No se pudo guardar la categoría.')
    }
  }

  return (
    <AppLayout title={isEditing ? 'Modificar Categoría' : 'Nueva Categoría'}>
      <div className="space-y-4 max-w-6xl mx-auto pb-8 animate-fade-in">

        {/* ═════════════════════════════════════════════════════════
            0. COMPACT BREADCRUMB & TOP HEADER BAR
           ═════════════════════════════════════════════════════════ */}
        <div className="bg-white dark:bg-[#141417] p-3.5 sm:p-4 rounded-2xl border border-slate-200/80 dark:border-zinc-800 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => requestLeave('/categorias')}
              className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-600 dark:text-zinc-200 flex items-center justify-center transition-colors cursor-pointer active:scale-95 shadow-xs"
              title="Regresar a Categorías"
            >
              <ArrowLeft size={16} />
            </button>
            <div>
              <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium">
                <span className="hover:text-blue-600 cursor-pointer" onClick={() => requestLeave('/categorias')}>
                  Categorías
                </span>
                <span>/</span>
                <span className="text-blue-600 dark:text-blue-400 font-semibold">
                  {isEditing ? 'Modificar Familia' : 'Nueva Familia'}
                </span>
              </div>
              <h1 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white tracking-tight">
                {isEditing ? `Editar: ${originalCategory?.name || name}` : 'Registrar Nueva Categoría'}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-blue-50 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300 border border-blue-200 dark:border-blue-500/30">
              <FolderTree size={14} /> Clasificación de Catálogo
            </span>
          </div>
        </div>

        {/* ═════════════════════════════════════════════════════════
            ERROR NOTIFICATION
           ═════════════════════════════════════════════════════════ */}
        {error && (
          <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 text-rose-800 dark:text-rose-300 text-xs flex items-center gap-2.5 shadow-xs animate-slide-up">
            <AlertCircle size={16} className="shrink-0 text-rose-600 dark:text-rose-400" />
            <span className="font-semibold">{error}</span>
          </div>
        )}

        {/* ═════════════════════════════════════════════════════════
            MAIN FORM: COMPACT 2-COLUMN SINGLE-SCREEN LAYOUT
           ═════════════════════════════════════════════════════════ */}
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">

            {/* ─── LEFT COLUMN: CONFIGURATION & IDENTITY (7 COLS) ─── */}
            <div className="lg:col-span-7 space-y-4">

              {/* CARD 1: GENERAL INFO */}
              <div className="bg-white dark:bg-[#141417] rounded-2xl border border-slate-200/80 dark:border-zinc-800 p-4 sm:p-4.5 shadow-xs space-y-3">
                <div className="flex items-center justify-between pb-2.5 border-b border-slate-100 dark:border-zinc-800">
                  <div className="flex items-center gap-2">
                    <Tag size={15} className="text-blue-600 dark:text-blue-400" />
                    <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-zinc-100">
                      1. Identificación y Nomenclatura
                    </h3>
                  </div>
                  <span className="text-[10px] sm:text-[11px] text-slate-400 dark:text-zinc-500 font-medium">Campos obligatorios *</span>
                </div>

                <div className="space-y-3">
                  {/* Category Name */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-zinc-300 mb-1 uppercase tracking-wider">
                      Nombre de la Categoría *
                    </label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => handleNameChange(e.target.value)}
                      placeholder="Ej: Cómputo, Laptops, Audio & Video, Accesorios…"
                      required
                      autoFocus
                      className="w-full bg-slate-50 dark:bg-zinc-800/80 border border-slate-200 dark:border-zinc-700 rounded-xl px-3.5 py-2 text-xs sm:text-sm text-slate-900 dark:text-zinc-100 font-semibold outline-none focus:bg-white dark:focus:bg-zinc-900 focus:border-blue-600 focus:ring-2 focus:ring-blue-600/10 transition-all placeholder:text-slate-400 dark:placeholder:text-zinc-500"
                    />
                    <p className="text-[10.5px] text-slate-400 dark:text-zinc-500 mt-1">
                      Usa un término claro para agrupar artículos similares en inventario y ventas.
                    </p>
                  </div>

                  {/* Category Description */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-[11px] font-bold text-slate-700 dark:text-zinc-300 uppercase tracking-wider">
                        Descripción Detallada (Opcional)
                      </label>
                      <span className="text-[10px] text-slate-400 dark:text-zinc-500">
                        {description.length}/200 caracteres
                      </span>
                    </div>
                    <textarea
                      rows={2}
                      value={description}
                      maxLength={200}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Especifica los tipos de productos que pertenecen a esta categoría, materiales o líneas comerciales…"
                      className="w-full bg-slate-50 dark:bg-zinc-800/80 border border-slate-200 dark:border-zinc-700 rounded-xl px-3.5 py-2 text-xs text-slate-900 dark:text-zinc-100 outline-none focus:bg-white dark:focus:bg-zinc-900 focus:border-blue-600 focus:ring-2 focus:ring-blue-600/10 transition-all placeholder:text-slate-400 dark:placeholder:text-zinc-500 leading-relaxed resize-none"
                    />
                  </div>
                </div>
              </div>

              {/* CARD 2: VISUAL BRANDING & ICON SELECTION */}
              <div className="bg-white dark:bg-[#141417] rounded-2xl border border-slate-200/80 dark:border-zinc-800 p-4 sm:p-4.5 shadow-xs space-y-3.5">
                <div className="flex items-center justify-between pb-2.5 border-b border-slate-100 dark:border-zinc-800">
                  <div className="flex items-center gap-2">
                    <Palette size={15} className="text-blue-600 dark:text-blue-400" />
                    <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-zinc-100">
                      2. Identidad Visual y Color
                    </h3>
                  </div>
                  <span className="text-[11px] font-bold text-blue-600 dark:text-blue-400">
                    {selectedTheme.label}
                  </span>
                </div>

                {/* Color Palette Selector */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-zinc-300 mb-1.5 uppercase tracking-wider">
                    Paleta Cromática
                  </label>
                  <div className="flex flex-wrap items-center gap-2">
                    {COLOR_THEMES.map((th, idx) => {
                      const isSelected = colorIndex === idx
                      return (
                        <button
                          key={th.id}
                          type="button"
                          onClick={() => setColorIndex(idx)}
                          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-[11px] font-bold transition-all cursor-pointer ${
                            isSelected
                              ? `${th.bg} ${th.border} ${th.text} ring-2 ${th.ring} shadow-xs scale-102`
                              : 'bg-slate-50 dark:bg-zinc-800/60 border-slate-200 dark:border-zinc-700 text-slate-600 dark:text-zinc-400 hover:border-slate-300'
                          }`}
                        >
                          <span className={`w-2.5 h-2.5 rounded-full ${th.dot}`} />
                          <span>{th.label}</span>
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Icon Selection Gallery */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-zinc-300 mb-1.5 uppercase tracking-wider">
                    Icono Representativo
                  </label>
                  <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                    {AVAILABLE_ICONS.map((ic) => {
                      const IconComp = ic.component
                      const isSelected = iconId === ic.id

                      return (
                        <button
                          key={ic.id}
                          type="button"
                          onClick={() => setIconId(ic.id)}
                          title={ic.label}
                          className={`flex flex-col items-center justify-center p-2 rounded-xl border text-center transition-all cursor-pointer ${
                            isSelected
                              ? `${selectedTheme.bg} ${selectedTheme.border} ${selectedTheme.text} ring-2 ${selectedTheme.ring} shadow-xs scale-105`
                              : 'bg-slate-50 dark:bg-zinc-800/60 border-slate-200 dark:border-zinc-700 text-slate-500 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-800'
                          }`}
                        >
                          <IconComp size={18} className="mb-0.5" />
                          <span className="text-[9.5px] font-semibold leading-tight line-clamp-1">
                            {ic.label}
                          </span>
                        </button>
                      )
                    })}
                  </div>
                </div>
              </div>

              {/* CARD 3: BEST PRACTICES TIP */}
              <div className="bg-slate-50 dark:bg-zinc-800/40 rounded-2xl border border-slate-200/80 dark:border-zinc-800 p-3.5 flex items-center gap-3">
                <div className="p-1.5 rounded-xl bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 shrink-0">
                  <ShieldCheck size={16} />
                </div>
                <div className="text-[11px] text-slate-600 dark:text-zinc-300 leading-normal">
                  <span className="font-bold text-slate-900 dark:text-zinc-100">Consejo ERP: </span>
                  Mantener entre 4 y 15 categorías principales agiliza las búsquedas en el Punto de Venta y el control de inventario.
                </div>
              </div>

            </div>

            {/* ─── RIGHT COLUMN: LIVE PREVIEW & ACTIONS (5 COLS) ─── */}
            <div className="lg:col-span-5 space-y-4">

              {/* CARD: LIVE FINNOVA CARD PREVIEW */}
              <div className="bg-white dark:bg-[#141417] rounded-2xl border border-slate-200/80 dark:border-zinc-800 p-4 sm:p-5 shadow-xs space-y-3">
                <div className="flex items-center justify-between pb-2.5 border-b border-slate-100 dark:border-zinc-800">
                  <div className="flex items-center gap-2">
                    <Eye size={15} className="text-blue-600 dark:text-blue-400" />
                    <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-zinc-100">
                      Vista Previa en Tiempo Real
                    </h3>
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-500/20">
                    En vivo
                  </span>
                </div>

                <p className="text-[11px] text-slate-400 dark:text-zinc-500">
                  Así se visualizará la tarjeta de esta categoría en tu catálogo:
                </p>

                {/* THE MOCK CARD */}
                <div className="bg-white dark:bg-[#18181c] rounded-2xl border border-slate-200 dark:border-zinc-700 p-4.5 shadow-sm space-y-3.5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`w-11 h-11 rounded-2xl ${selectedTheme.bg} ${selectedTheme.border} ${selectedTheme.text} border flex items-center justify-center shrink-0 shadow-xs`}
                      >
                        <CurrentIconComponent size={22} />
                      </div>
                      <div className="min-w-0">
                        <h4 className="font-bold text-slate-900 dark:text-zinc-100 text-sm sm:text-base leading-snug truncate">
                          {name.trim() || 'Nombre de la Categoría'}
                        </h4>
                        <span className="text-[10.5px] font-semibold text-slate-400 dark:text-zinc-400">
                          {isEditing ? `${editingStats.skuCount} SKUs registrados` : 'Familia nueva'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <p className="text-xs text-slate-500 dark:text-zinc-400 line-clamp-2 min-h-[30px] leading-relaxed">
                    {description.trim() || (
                      <span className="text-slate-300 dark:text-zinc-600 italic">
                        Sin descripción registrada. Puedes detallar los productos asociados.
                      </span>
                    )}
                  </p>

                  {/* Micro stats mockup */}
                  <div className="pt-2.5 border-t border-slate-100 dark:border-zinc-800 grid grid-cols-3 gap-2 text-center">
                    <div className="bg-slate-50 dark:bg-zinc-800/50 rounded-xl p-2 border border-slate-100 dark:border-zinc-800">
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">SKUs</p>
                      <p className="font-extrabold text-slate-900 dark:text-zinc-100 text-xs sm:text-sm font-display">
                        {isEditing ? editingStats.skuCount : 0}
                      </p>
                    </div>
                    <div className="bg-slate-50 dark:bg-zinc-800/50 rounded-xl p-2 border border-slate-100 dark:border-zinc-800">
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Stock</p>
                      <p className="font-extrabold text-emerald-600 dark:text-emerald-400 text-xs sm:text-sm font-display">
                        {isEditing ? `${fmtN(editingStats.totalUnits)}` : '0 uds.'}
                      </p>
                    </div>
                    <div className="bg-slate-50 dark:bg-zinc-800/50 rounded-xl p-2 border border-slate-100 dark:border-zinc-800">
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Valor</p>
                      <p className="font-extrabold text-slate-900 dark:text-zinc-100 text-[11px] font-display truncate">
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
                <div className="bg-white dark:bg-[#141417] rounded-2xl border border-slate-200/80 dark:border-zinc-800 p-4 shadow-xs space-y-2.5">
                  <div className="flex items-center gap-2 text-slate-900 dark:text-zinc-100 font-bold text-xs sm:text-sm">
                    <Package size={15} className="text-blue-600 dark:text-blue-400" />
                    <span>Productos Vinculados Actualmente</span>
                  </div>

                  <div className="space-y-1.5 text-xs text-slate-600 dark:text-zinc-400">
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

              {/* CARD: ACTION BUTTONS */}
              <div className="bg-white dark:bg-[#141417] rounded-2xl border border-slate-200/80 dark:border-zinc-800 p-4 shadow-xs space-y-2.5">
                <button
                  type="submit"
                  disabled={isProcessing || !name.trim()}
                  className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md shadow-blue-500/25 active:scale-[0.98] transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isProcessing ? (
                    <span>Guardando datos…</span>
                  ) : (
                    <>
                      <Check size={16} strokeWidth={2.5} />
                      <span>{isEditing ? 'Guardar Modificaciones' : 'Crear y Publicar Categoría'}</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => requestLeave('/categorias')}
                  className="w-full py-2 px-4 rounded-xl bg-slate-50 dark:bg-zinc-800/80 hover:bg-slate-100 dark:hover:bg-zinc-700 text-slate-600 dark:text-zinc-300 text-xs font-semibold flex items-center justify-center transition-colors cursor-pointer border border-slate-200 dark:border-zinc-700"
                >
                  Cancelar y Regresar
                </button>

                <div className="pt-1 text-center text-[10.5px] text-slate-400 flex items-center justify-center gap-1">
                  <ShieldCheck size={13} className="text-emerald-500" />
                  <span>Sincronización instantánea con catálogo y kardex</span>
                </div>
              </div>

            </div>

          </div>
        </form>

        {/* ═════════════════════════════════════════════════════════
            OVERLAY: 3-STEP ANIMATED LOADING MODAL
           ═════════════════════════════════════════════════════════ */}
        {isProcessing && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4 animate-fade-in">
            <div className="bg-white dark:bg-[#18181b] rounded-2xl border border-slate-200 dark:border-zinc-700 p-6 max-w-sm w-full text-center shadow-2xl space-y-4 animate-slide-up">
              <div className="w-14 h-14 rounded-full border-3 border-blue-600 border-t-transparent animate-spin mx-auto flex items-center justify-center">
                <FolderTree size={22} className="text-blue-600 animate-pulse" />
              </div>

              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-white">
                  {isEditing ? 'Actualizando Categoría' : 'Registrando Nueva Categoría'}
                </h3>
                <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">
                  {processingStep === 1 && 'Validando nomenclatura y familias de catálogo…'}
                  {processingStep === 2 && 'Registrando categoría en base de datos protegida…'}
                  {processingStep === 3 && '¡Categoría guardada con éxito! Redirigiendo…'}
                </p>
              </div>

              <div className="w-full bg-slate-100 dark:bg-zinc-800 h-1.5 rounded-full overflow-hidden">
                <div
                  className="bg-blue-600 h-full transition-all duration-300"
                  style={{
                    width: processingStep === 1 ? '35%' : processingStep === 2 ? '75%' : '100%'
                  }}
                />
              </div>
            </div>
          </div>
        )}

        {/* Modal de confirmación para descartar cambios */}
        {DiscardModalComponent}

      </div>
    </AppLayout>
  )
}
