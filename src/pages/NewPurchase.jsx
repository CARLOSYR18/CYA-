import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeft, Plus, Trash2, Truck, Building2, Package,
  DollarSign, CheckCircle2, Clock, AlertCircle, Sparkles,
  ShieldCheck, Check, Calendar, Phone, Mail, User
} from 'lucide-react'
import AppLayout from '../components/layout/AppLayout'
import { purchasesService } from '../services/purchasesService'
import { suppliersService } from '../services/suppliersService'
import { productsService } from '../services/productsService'
import { useAuth } from '../context/AuthContext'

const fmt = (n) =>
  `S/ ${(Number(n) || 0).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

export default function NewPurchase() {
  const navigate = useNavigate()
  const { user } = useAuth()

  // Data sources
  const [suppliers, setSuppliers] = useState([])
  const [products, setProducts] = useState([])
  const [loadingData, setLoadingData] = useState(true)

  // Form states
  const [supplierId, setSupplierId] = useState('')
  const [status, setStatus] = useState('recibido') // 'recibido' | 'pendiente'
  const [invoiceRef, setInvoiceRef] = useState('')
  const [notes, setNotes] = useState('')

  // Line items
  const [items, setItems] = useState([
    { product_id: '', quantity: 1, unit_cost: '' }
  ])

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    async function loadData() {
      setLoadingData(true)
      try {
        const [su, pr] = await Promise.all([
          suppliersService.list().catch(() => []),
          productsService.list().catch(() => [])
        ])
        setSuppliers(su || [])
        setProducts(pr || [])
      } finally {
        setLoadingData(false)
      }
    }
    loadData()
  }, [])

  // Selected supplier details
  const selectedSupplier = useMemo(() => {
    return suppliers.find(s => s.id === supplierId)
  }, [suppliers, supplierId])

  // Row operations
  const addItemRow = () => {
    setItems([...items, { product_id: '', quantity: 1, unit_cost: '' }])
  }

  const removeItemRow = (idx) => {
    if (items.length <= 1) return
    setItems(items.filter((_, i) => i !== idx))
  }

  const updateItem = (idx, patch) => {
    setItems(items.map((it, i) => {
      if (i !== idx) return it
      const updated = { ...it, ...patch }
      // If product_id changed, default unit_cost to product's cost_price
      if (patch.product_id !== undefined && patch.product_id !== it.product_id) {
        const prod = products.find(p => p.id === patch.product_id)
        if (prod) {
          updated.unit_cost = Number(prod.cost_price) || 0
        }
      }
      return updated
    }))
  }

  // Calculations
  const subtotal = useMemo(() => {
    return items.reduce((sum, it) => {
      const cost = Number(it.unit_cost) || 0
      const qty = Number(it.quantity) || 0
      return sum + (cost * qty)
    }, 0)
  }, [items])

  const total = subtotal

  // Form submission
  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (!supplierId) {
      setError('Por favor selecciona el proveedor de la orden')
      return
    }

    const validItems = items.filter(it => it.product_id && Number(it.quantity) > 0)
    if (!validItems.length) {
      setError('Debes agregar al menos un producto a la compra con cantidad mayor a cero')
      return
    }

    setSaving(true)
    try {
      const purchaseItems = validItems.map(it => {
        const prod = products.find(p => p.id === it.product_id)
        return {
          product_id: it.product_id,
          quantity: Number(it.quantity),
          unit_cost: Number(it.unit_cost) || Number(prod?.cost_price) || 0
        }
      })

      await purchasesService.create({
        supplier_id: supplierId,
        user_id: user?.id,
        status,
        items: purchaseItems,
        notes: invoiceRef ? `Factura/Guía: ${invoiceRef}${notes ? ' - ' + notes : ''}` : notes
      })

      navigate('/compras', {
        state: {
          created: true,
          supplierName: selectedSupplier?.name || 'Proveedor'
        }
      })
    } catch (err) {
      setError(err.message || 'No se pudo registrar la orden de compra')
    } finally {
      setSaving(false)
    }
  }

  return (
    <AppLayout title="Nueva Compra">
      <div className="space-y-5 max-w-6xl mx-auto pb-16">

        {/* ═════════════════════════════════════════════════════════
            TOP BAR WITH BREADCRUMB & BACK ACTION
           ═════════════════════════════════════════════════════════ */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-[#131627] p-5 rounded-2xl border border-slate-200/80 dark:border-white/10 shadow-xs">
          <div className="flex items-center gap-3.5">
            <button
              type="button"
              onClick={() => navigate('/compras')}
              className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-white/10 transition-all cursor-pointer"
              title="Regresar a Compras"
            >
              <ArrowLeft size={18} />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-400">Compras</span>
                <span className="text-xs text-slate-300">/</span>
                <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">Nueva Orden</span>
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight mt-0.5">
                Registrar Orden de Compra
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-500/30">
              <Sparkles size={13} /> Abastecimiento de Inventario
            </span>
          </div>
        </div>

        {/* ═════════════════════════════════════════════════════════
            MAIN FORM: 2 COLUMNS (DATA & ITEMS | SUMMARY)
           ═════════════════════════════════════════════════════════ */}
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">

            {/* LEFT COLUMN: Supplier & Items Table (8 Cols) */}
            <div className="lg:col-span-8 space-y-5">

              {/* CARD 1: SUPPLIER DETAILS */}
              <div className="bg-white dark:bg-[#131627] rounded-2xl border border-slate-200/80 dark:border-white/10 p-5 shadow-xs space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-white/10">
                  <div className="flex items-center gap-2">
                    <Building2 size={16} className="text-indigo-600 dark:text-indigo-400" />
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                      1. Datos del Proveedor y Comprobante
                    </h3>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Proveedor *
                    </label>
                    <select
                      value={supplierId}
                      onChange={(e) => setSupplierId(e.target.value)}
                      required
                      className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-slate-800 dark:text-white outline-none focus:border-indigo-500 focus:bg-white dark:focus:bg-[#1A1D30] cursor-pointer"
                    >
                      <option value="">Selecciona un proveedor registrado…</option>
                      {suppliers.map(s => (
                        <option key={s.id} value={s.id}>
                          {s.name} {s.phone ? `(${s.phone})` : ''}
                        </option>
                      ))}
                    </select>

                    {selectedSupplier && (
                      <div className="mt-2 p-2.5 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/10 text-[11.5px] space-y-1">
                        <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                          <User size={12} className="text-slate-400" />
                          <span>Contacto: <strong>{selectedSupplier.contact_name || 'No especificado'}</strong></span>
                        </div>
                        {selectedSupplier.phone && (
                          <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                            <Phone size={12} className="text-slate-400" />
                            <span>Teléfono: <strong className="font-mono">{selectedSupplier.phone}</strong></span>
                          </div>
                        )}
                        {selectedSupplier.address && (
                          <p className="text-slate-400 text-[11px] truncate">{selectedSupplier.address}</p>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        N° Factura / Guía de Remisión Proveedor
                      </label>
                      <input
                        type="text"
                        value={invoiceRef}
                        onChange={(e) => setInvoiceRef(e.target.value)}
                        placeholder="Ej. F001-0004523 / GR-1092"
                        className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-3.5 py-2 text-xs sm:text-sm text-slate-800 dark:text-white outline-none focus:border-indigo-500 font-mono uppercase"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Observaciones / Notas de Compra
                      </label>
                      <input
                        type="text"
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Ej. Entrega en sede central, pago a 30 días..."
                        className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-3.5 py-2 text-xs text-slate-800 dark:text-white outline-none focus:border-indigo-500"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* CARD 2: PRODUCTS TABLE */}
              <div className="bg-white dark:bg-[#131627] rounded-2xl border border-slate-200/80 dark:border-white/10 p-5 shadow-xs space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-white/10">
                  <div className="flex items-center gap-2">
                    <Package size={16} className="text-indigo-600 dark:text-indigo-400" />
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                      2. Artículos a Abastecer
                    </h3>
                  </div>

                  <button
                    type="button"
                    onClick={addItemRow}
                    className="px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-500/15 dark:hover:bg-indigo-500/25 text-indigo-700 dark:text-indigo-300 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Plus size={14} />
                    <span>Agregar Artículo</span>
                  </button>
                </div>

                {/* Line Items List */}
                <div className="space-y-3">
                  {items.map((it, idx) => {
                    const prod = products.find(p => p.id === it.product_id)
                    const lineTotal = (Number(it.unit_cost) || 0) * (Number(it.quantity) || 0)

                    return (
                      <div
                        key={idx}
                        className="bg-slate-50/70 dark:bg-white/5 border border-slate-200/80 dark:border-white/10 p-3.5 rounded-xl flex flex-col sm:flex-row sm:items-center gap-3 transition-all"
                      >
                        {/* Row Index */}
                        <span className="w-6 h-6 rounded-full bg-slate-200/70 dark:bg-white/10 text-slate-600 dark:text-slate-300 text-[11px] font-bold flex items-center justify-center shrink-0">
                          {idx + 1}
                        </span>

                        {/* Product Select */}
                        <div className="flex-1 min-w-0">
                          <select
                            value={it.product_id}
                            onChange={(e) => updateItem(idx, { product_id: e.target.value })}
                            required
                            className="w-full bg-white dark:bg-[#1A1D30] border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-white font-medium focus:outline-none focus:border-indigo-500"
                          >
                            <option value="">Selecciona un producto del catálogo…</option>
                            {products.map(p => (
                              <option key={p.id} value={p.id}>
                                {p.sku} — {p.name} (Stock actual: {p.stock} {p.unit || 'uds.'})
                              </option>
                            ))}
                          </select>

                          {prod && (
                            <div className="flex items-center justify-between text-[11px] text-slate-400 mt-1 px-1">
                              <span>
                                Costo sugerido: <strong className="text-slate-700 dark:text-slate-300 font-mono">{fmt(prod.cost_price)}</strong>
                              </span>
                              <span>
                                Existencias en almacén: <strong className="text-slate-700 dark:text-slate-300">{prod.stock} {prod.unit || 'uds.'}</strong>
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Quantity */}
                        <div className="flex items-center gap-2 shrink-0">
                          <div className="w-20">
                            <label className="block text-[10px] uppercase font-bold text-slate-400 mb-0.5">
                              Cant.
                            </label>
                            <input
                              type="number"
                              min="1"
                              value={it.quantity}
                              onChange={(e) => updateItem(idx, { quantity: e.target.value })}
                              required
                              className="w-full bg-white dark:bg-[#1A1D30] border border-slate-200 dark:border-white/10 rounded-xl py-1.5 text-center text-xs font-mono font-bold text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
                            />
                          </div>

                          {/* Unit Cost */}
                          <div className="w-28">
                            <label className="block text-[10px] uppercase font-bold text-slate-400 mb-0.5">
                              Costo Unit. (S/)
                            </label>
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              value={it.unit_cost}
                              onChange={(e) => updateItem(idx, { unit_cost: e.target.value })}
                              placeholder="0.00"
                              required
                              className="w-full bg-white dark:bg-[#1A1D30] border border-slate-200 dark:border-white/10 rounded-xl px-2 py-1.5 text-right text-xs font-mono font-bold text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
                            />
                          </div>

                          {/* Subtotal */}
                          <div className="w-24 text-right">
                            <label className="block text-[10px] uppercase font-bold text-slate-400 mb-0.5">
                              Subtotal
                            </label>
                            <span className="font-mono font-extrabold text-xs text-slate-900 dark:text-white block py-1.5">
                              {fmt(lineTotal)}
                            </span>
                          </div>

                          {/* Delete */}
                          <button
                            type="button"
                            onClick={() => removeItemRow(idx)}
                            disabled={items.length <= 1}
                            className="p-1.5 text-slate-400 hover:text-red-600 disabled:opacity-20 disabled:hover:text-slate-400 rounded-lg hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors cursor-pointer mt-4"
                            title="Eliminar artículo"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>

                <div className="pt-2">
                  <button
                    type="button"
                    onClick={addItemRow}
                    className="w-full py-2.5 rounded-xl border-2 border-dashed border-slate-200 dark:border-white/10 hover:border-indigo-400 hover:bg-indigo-50/40 dark:hover:bg-white/5 text-slate-500 dark:text-slate-400 hover:text-indigo-600 text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                  >
                    <Plus size={15} />
                    <span>Agregar otro artículo a la orden</span>
                  </button>
                </div>
              </div>

            </div>

            {/* RIGHT COLUMN: Reception Status & Financial Summary (4 Cols) */}
            <div className="lg:col-span-4 space-y-5">

              {/* CARD 3: STATUS & RECEPTION MODE */}
              <div className="bg-white dark:bg-[#131627] rounded-2xl border border-slate-200/80 dark:border-white/10 p-5 shadow-xs space-y-4">
                <div className="pb-3 border-b border-slate-100 dark:border-white/10">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Truck size={16} className="text-indigo-600 dark:text-indigo-400" />
                    3. Estado de Recepción
                  </h3>
                </div>

                {/* Segmented status selector */}
                <div className="grid grid-cols-2 gap-2 bg-slate-100 dark:bg-white/5 p-1 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setStatus('recibido')}
                    className={`py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      status === 'recibido'
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
                    }`}
                  >
                    Recibido (Ingresa stock)
                  </button>
                  <button
                    type="button"
                    onClick={() => setStatus('pendiente')}
                    className={`py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      status === 'pendiente'
                        ? 'bg-amber-500 text-white shadow-xs'
                        : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
                    }`}
                  >
                    Pendiente (Por recibir)
                  </button>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/10 text-[11.5px] text-slate-500 dark:text-slate-400 leading-relaxed">
                  {status === 'recibido' ? (
                    <span className="flex items-start gap-1.5 text-emerald-700 dark:text-emerald-400">
                      <CheckCircle2 size={14} className="shrink-0 mt-0.5" />
                      <span>Las unidades se sumarán de inmediato al stock disponible de tu inventario.</span>
                    </span>
                  ) : (
                    <span className="flex items-start gap-1.5 text-amber-700 dark:text-amber-400">
                      <Clock size={14} className="shrink-0 mt-0.5" />
                      <span>La orden quedará en espera. Podrás marcarla como recibida cuando llegue la mercancía.</span>
                    </span>
                  )}
                </div>
              </div>

              {/* CARD 4: FINANCIAL SUMMARY & ACTIONS */}
              <div className="bg-white dark:bg-[#131627] rounded-2xl border border-slate-200/80 dark:border-white/10 p-5 shadow-xs space-y-4">
                <div className="pb-3 border-b border-slate-100 dark:border-white/10">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <DollarSign size={16} className="text-indigo-600 dark:text-indigo-400" />
                    Resumen de Compra
                  </h3>
                </div>

                <div className="space-y-2 text-xs">
                  <div className="flex justify-between items-center text-slate-500 dark:text-slate-400">
                    <span>Líneas de producto:</span>
                    <span className="font-mono font-bold text-slate-800 dark:text-white">{items.length}</span>
                  </div>

                  <div className="flex justify-between items-center text-slate-500 dark:text-slate-400">
                    <span>Unidades totales:</span>
                    <span className="font-mono font-bold text-slate-800 dark:text-white">
                      {items.reduce((s, it) => s + (Number(it.quantity) || 0), 0)} uds.
                    </span>
                  </div>

                  <div className="pt-3 border-t border-slate-200 dark:border-white/10 flex justify-between items-center">
                    <div>
                      <p className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                        Total de la Orden:
                      </p>
                      <span className="text-[10px] text-slate-400">Moneda nacional (PEN)</span>
                    </div>
                    <span className="text-2xl font-black font-mono text-[#5550F2] tracking-tight">
                      {fmt(total)}
                    </span>
                  </div>
                </div>

                {error && (
                  <div className="p-3 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400 text-xs flex items-center gap-2">
                    <AlertCircle size={15} className="shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                <div className="space-y-2 pt-2">
                  <button
                    type="submit"
                    disabled={saving}
                    className="w-full py-3 rounded-xl bg-[#5550F2] hover:bg-[#4742E8] text-white font-extrabold text-xs shadow-md shadow-indigo-600/30 active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                  >
                    {saving ? (
                      <span>Registrando orden…</span>
                    ) : (
                      <>
                        <Check size={16} strokeWidth={3} />
                        <span>Registrar Orden de Compra</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => navigate('/compras')}
                    className="w-full py-2.5 rounded-xl border border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/5 text-slate-600 dark:text-slate-400 font-semibold text-xs transition-colors cursor-pointer"
                  >
                    Cancelar y Regresar
                  </button>
                </div>

                <div className="pt-2 text-center text-[10.5px] text-slate-400 flex items-center justify-center gap-1">
                  <ShieldCheck size={13} className="text-emerald-500" />
                  <span>Actualización automática en kardex y movimientos de almacén</span>
                </div>
              </div>

            </div>

          </div>
        </form>

      </div>
    </AppLayout>
  )
}
