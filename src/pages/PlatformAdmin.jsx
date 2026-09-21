import { useState, useEffect, useMemo } from 'react'
import { Navigate } from 'react-router-dom'
import {
  ShieldAlert,
  Search,
  CheckCircle2,
  XCircle,
  Building2,
  Calendar,
  Clock,
  Sparkles,
  ToggleLeft,
  ToggleRight,
  Edit3,
  RefreshCw,
  Crown,
  AlertCircle,
  Check,
  X,
} from 'lucide-react'
import AppLayout from '../components/layout/AppLayout'
import Modal from '../components/ui/Modal'
import { useAuth } from '../context/AuthContext'
import { platformAdminService } from '../services/platformAdminService'
import { PLAN_PRICING } from '../lib/planLimits'

const fmtMoney = (n) =>
  `S/ ${(Number(n) || 0).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

const fmtDate = (d) => {
  if (!d) return '—'
  try {
    return new Date(d).toLocaleDateString('es-PE', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    })
  } catch {
    return d
  }
}

export default function PlatformAdmin() {
  const { isPlatformAdmin, loading: authLoading } = useAuth()

  const [requests, setRequests] = useState([])
  const [companies, setCompanies] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [actionLoadingId, setActionLoadingId] = useState(null)
  const [toastMessage, setToastMessage] = useState(null)

  // Modal para editar plan de empresa
  const [editingCompany, setEditingCompany] = useState(null)
  const [editPlan, setEditPlan] = useState('free')
  const [editPeriod, setEditPeriod] = useState('trimestral')
  const [editMonths, setEditMonths] = useState(3)
  const [savingPlan, setSavingPlan] = useState(false)

  // Protección por rol de super-administrador
  if (!authLoading && !isPlatformAdmin) {
    return <Navigate to="/" replace />
  }

  function showToast(msg, isSuccess = true) {
    setToastMessage({ text: msg, isSuccess })
    setTimeout(() => setToastMessage(null), 4000)
  }

  async function loadData() {
    setLoading(true)
    try {
      const [reqData, compData] = await Promise.all([
        platformAdminService.listPlanRequests('pendiente'),
        platformAdminService.listCompanies(),
      ])
      setRequests(reqData || [])
      setCompanies(compData || [])
    } catch (err) {
      console.error('Error cargando datos de plataforma:', err)
      showToast('Error al cargar información de la plataforma.', false)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (isPlatformAdmin) {
      loadData()
    }
  }, [isPlatformAdmin])

  // Aprobar solicitud
  async function handleApprove(request) {
    setActionLoadingId(request.id)
    try {
      await platformAdminService.approveRequest(request)
      showToast(`Solicitud de ${request.companies?.name || 'la empresa'} aprobada con éxito.`)
      await loadData()
    } catch (err) {
      console.error('Error al aprobar solicitud:', err)
      showToast('No se pudo aprobar la solicitud.', false)
    } finally {
      setActionLoadingId(null)
    }
  }

  // Rechazar solicitud
  async function handleReject(requestId) {
    setActionLoadingId(requestId)
    try {
      await platformAdminService.rejectRequest(requestId)
      showToast('Solicitud rechazada.')
      await loadData()
    } catch (err) {
      console.error('Error al rechazar solicitud:', err)
      showToast('No se pudo rechazar la solicitud.', false)
    } finally {
      setActionLoadingId(null)
    }
  }

  // Toggle Activar / Desactivar empresa
  async function handleToggleActive(company) {
    const nextState = !company.active
    setActionLoadingId(company.id)
    try {
      await platformAdminService.toggleActive(company.id, nextState)
      showToast(`Empresa "${company.name}" ${nextState ? 'activada' : 'desactivada'}.`)
      await loadData()
    } catch (err) {
      console.error('Error al cambiar estado de empresa:', err)
      showToast('No se pudo cambiar el estado de la empresa.', false)
    } finally {
      setActionLoadingId(null)
    }
  }

  // Abrir modal para editar plan
  function openEditPlanModal(company) {
    setEditingCompany(company)
    const currentPlan = company.plan === 'pro' ? 'pro' : 'free'
    setEditPlan(currentPlan)
    const currentPeriod = company.plan_period || 'trimestral'
    setEditPeriod(currentPeriod)
    const defaultMonths =
      currentPeriod === 'anual' ? 12 : currentPeriod === 'semestral' ? 6 : 3
    setEditMonths(defaultMonths)
  }

  // Guardar cambio de plan
  async function handleSavePlan(e) {
    e.preventDefault()
    if (!editingCompany) return

    setSavingPlan(true)
    try {
      const price =
        editPlan === 'pro'
          ? PLAN_PRICING[editPeriod]?.price || (editMonths * 20)
          : null

      await platformAdminService.setCompanyPlan(editingCompany.id, {
        plan: editPlan,
        plan_period: editPlan === 'pro' ? editPeriod : null,
        plan_price: price,
        months: editPlan === 'pro' ? Number(editMonths) || 3 : null,
      })

      showToast(`Plan de "${editingCompany.name}" actualizado correctamente.`)
      setEditingCompany(null)
      await loadData()
    } catch (err) {
      console.error('Error actualizando plan:', err)
      showToast('No se pudo actualizar el plan.', false)
    } finally {
      setSavingPlan(false)
    }
  }

  // Filtrar empresas por búsqueda
  const filteredCompanies = useMemo(() => {
    if (!searchTerm.trim()) return companies
    const query = searchTerm.toLowerCase()
    return companies.filter(
      (c) =>
        c.name?.toLowerCase().includes(query) ||
        c.ruc?.includes(query) ||
        c.phone?.includes(query)
    )
  }, [companies, searchTerm])

  return (
    <AppLayout title="Panel de Plataforma">
      <div className="max-w-7xl mx-auto space-y-8 pb-12">

        {/* ─── Toast Feedback ─── */}
        {toastMessage && (
          <div className="fixed top-6 right-6 z-50 flex items-center gap-3 bg-slate-900 text-white px-4 py-3 rounded-2xl shadow-2xl border border-slate-700 animate-bounce">
            {toastMessage.isSuccess ? (
              <CheckCircle2 size={18} className="text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle size={18} className="text-rose-400 shrink-0" />
            )}
            <span className="text-xs font-semibold">{toastMessage.text}</span>
          </div>
        )}

        {/* ─── Header Principal ─── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 p-6 sm:p-8 rounded-3xl text-white shadow-xl border border-slate-800">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 text-xs font-bold uppercase tracking-wider">
              <ShieldAlert size={14} className="text-amber-400" />
              <span>Super Administrador</span>
            </div>
            <h1 className="font-display font-black text-2xl sm:text-3xl text-white tracking-tight">
              Panel de Plataforma
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 max-w-xl leading-relaxed">
              Supervisión global de empresas suscritas, autorizaciones de planes y control centralizado del ERP CYA STORE.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={loadData}
              disabled={loading}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs uppercase tracking-wider transition cursor-pointer border border-white/10"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
              <span>Actualizar</span>
            </button>
          </div>
        </div>

        {/* ═════════════════════════════════════════════════════════
            1. SECCIÓN: SOLICITUDES PENDIENTES
           ═════════════════════════════════════════════════════════ */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-200">
                <Clock size={16} />
              </div>
              <div>
                <h2 className="font-display font-bold text-lg text-slate-900">
                  Solicitudes Pendientes
                </h2>
                <p className="text-xs text-slate-500">
                  Comprobantes de pago de planes Pro en espera de validación
                </p>
              </div>
            </div>
            <span className="px-3 py-1 rounded-full bg-amber-100 text-amber-800 text-xs font-bold border border-amber-200">
              {requests.length} pendiente(s)
            </span>
          </div>

          <div className="card overflow-hidden shadow-sm">
            {requests.length === 0 ? (
              <div className="p-8 text-center space-y-2">
                <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
                  <CheckCircle2 size={24} />
                </div>
                <p className="font-bold text-slate-800 text-sm">
                  ¡Al día! No hay solicitudes pendientes
                </p>
                <p className="text-xs text-slate-500">
                  Todas las solicitudes de planes han sido procesadas.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-slate-200/80 bg-slate-50/70 text-slate-600">
                      <th className="th py-3">Empresa</th>
                      <th className="th py-3">Periodo</th>
                      <th className="th py-3">Precio</th>
                      <th className="th py-3">Fecha de Solicitud</th>
                      <th className="th py-3 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {requests.map((req) => {
                      const companyName =
                        req.companies?.name ||
                        (Array.isArray(req.companies) ? req.companies[0]?.name : null) ||
                        `Empresa #${req.company_id?.slice(0, 6)}`
                      const isActing = actionLoadingId === req.id

                      return (
                        <tr key={req.id} className="hover:bg-slate-50/60 transition-colors">
                          <td className="td py-3 font-semibold text-slate-900">
                            <div className="flex items-center gap-2">
                              <Building2 size={16} className="text-slate-400 shrink-0" />
                              <span>{companyName}</span>
                            </div>
                          </td>
                          <td className="td py-3">
                            <span className="inline-flex items-center gap-1 font-bold px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-100 uppercase text-[10.5px]">
                              <Sparkles size={11} className="text-amber-500" />
                              {req.plan_period}
                            </span>
                          </td>
                          <td className="td py-3 font-bold text-slate-900 font-mono">
                            {fmtMoney(req.price)}
                          </td>
                          <td className="td py-3 text-slate-500">
                            <div className="flex items-center gap-1.5">
                              <Calendar size={13} className="text-slate-400" />
                              <span>{fmtDate(req.created_at)}</span>
                            </div>
                          </td>
                          <td className="td py-3 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                type="button"
                                disabled={isActing}
                                onClick={() => handleApprove(req)}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition cursor-pointer disabled:opacity-50"
                              >
                                <Check size={14} strokeWidth={2.5} />
                                <span>Aprobar</span>
                              </button>
                              <button
                                type="button"
                                disabled={isActing}
                                onClick={() => handleReject(req.id)}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs border border-rose-200 transition cursor-pointer disabled:opacity-50"
                              >
                                <X size={14} strokeWidth={2.5} />
                                <span>Rechazar</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* ═════════════════════════════════════════════════════════
            2. SECCIÓN: TODAS LAS EMPRESAS
           ═════════════════════════════════════════════════════════ */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-200">
                <Building2 size={16} />
              </div>
              <div>
                <h2 className="font-display font-bold text-lg text-slate-900">
                  Todas las Empresas
                </h2>
                <p className="text-xs text-slate-500">
                  Gestión integral de empresas registradas y sus suscripciones
                </p>
              </div>
            </div>

            {/* Buscador simple por nombre de empresa */}
            <div className="relative w-full sm:w-72">
              <Search
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar empresa por nombre o RUC…"
                className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 shadow-2xs"
              />
            </div>
          </div>

          <div className="card overflow-hidden shadow-sm">
            {filteredCompanies.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500">
                No se encontraron empresas con el término de búsqueda.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-slate-200/80 bg-slate-50/70 text-slate-600">
                      <th className="th py-3">Empresa</th>
                      <th className="th py-3">Plan</th>
                      <th className="th py-3">Vencimiento Plan</th>
                      <th className="th py-3">Estado</th>
                      <th className="th py-3 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredCompanies.map((c) => {
                      const isCompanyPro = c.plan === 'pro'
                      const isExpired =
                        isCompanyPro && c.plan_expires_at && new Date(c.plan_expires_at) < new Date()
                      const isActing = actionLoadingId === c.id

                      return (
                        <tr key={c.id} className="hover:bg-slate-50/60 transition-colors">
                          <td className="td py-3">
                            <div>
                              <p className="font-bold text-slate-900 text-sm">{c.name}</p>
                              <p className="text-[11px] text-slate-500">
                                {c.ruc ? `RUC: ${c.ruc}` : 'Sin RUC'}
                                {c.phone ? ` • Tel: ${c.phone}` : ''}
                              </p>
                            </div>
                          </td>

                          <td className="td py-3">
                            {isCompanyPro ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold text-[11px]">
                                <Crown size={12} className="text-amber-500 fill-amber-500" />
                                Pro {c.plan_period ? `(${c.plan_period})` : ''}
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 font-semibold text-[11px]">
                                Free
                              </span>
                            )}
                          </td>

                          <td className="td py-3 text-slate-600">
                            {isCompanyPro ? (
                              <div>
                                <span
                                  className={`font-semibold ${
                                    isExpired ? 'text-rose-600' : 'text-slate-800'
                                  }`}
                                >
                                  {fmtDate(c.plan_expires_at)}
                                </span>
                                {isExpired && (
                                  <span className="block text-[10px] text-rose-600 font-bold">
                                    Vencido
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="text-slate-400">—</span>
                            )}
                          </td>

                          <td className="td py-3">
                            {c.active !== false ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold text-[11px]">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                Activa
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 font-bold text-[11px]">
                                <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                                Desactivada
                              </span>
                            )}
                          </td>

                          <td className="td py-3 text-right">
                            <div className="flex items-center justify-end gap-2">
                              {/* a) Toggle Activar / Desactivar */}
                              <button
                                type="button"
                                disabled={isActing}
                                onClick={() => handleToggleActive(c)}
                                title={c.active !== false ? 'Desactivar empresa' : 'Activar empresa'}
                                className={`p-1.5 rounded-xl border transition cursor-pointer disabled:opacity-50 ${
                                  c.active !== false
                                    ? 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                                    : 'border-slate-200 bg-slate-100 text-slate-400 hover:bg-slate-200'
                                }`}
                              >
                                {c.active !== false ? (
                                  <ToggleRight size={20} className="text-emerald-600" />
                                ) : (
                                  <ToggleLeft size={20} className="text-slate-400" />
                                )}
                              </button>

                              {/* b) Botón Editar plan */}
                              <button
                                type="button"
                                onClick={() => openEditPlanModal(c)}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-xs transition cursor-pointer"
                              >
                                <Edit3 size={13} />
                                <span>Editar plan</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* ═════════════════════════════════════════════════════════
            MODAL: EDITAR PLAN DE EMPRESA
           ═════════════════════════════════════════════════════════ */}
        {editingCompany && (
          <Modal
            open={!!editingCompany}
            onClose={() => setEditingCompany(null)}
            title={`Editar Plan: ${editingCompany.name}`}
            width="max-w-md"
          >
            <form onSubmit={handleSavePlan} className="space-y-4 pt-2">
              <div>
                <label className="label">Plan asignado</label>
                <select
                  value={editPlan}
                  onChange={(e) => setEditPlan(e.target.value)}
                  className="field"
                >
                  <option value="free">Free (Gratuito)</option>
                  <option value="pro">Pro (Ilimitado)</option>
                </select>
              </div>

              {editPlan === 'pro' && (
                <div className="space-y-4 p-4 rounded-2xl bg-slate-50 border border-slate-200/80 animate-fade-in">
                  <div>
                    <label className="label">Periodo del Plan</label>
                    <select
                      value={editPeriod}
                      onChange={(e) => {
                        const p = e.target.value
                        setEditPeriod(p)
                        setEditMonths(p === 'anual' ? 12 : p === 'semestral' ? 6 : 3)
                      }}
                      className="field"
                    >
                      <option value="trimestral">Trimestral (S/ {PLAN_PRICING.trimestral.price})</option>
                      <option value="semestral">Semestral (S/ {PLAN_PRICING.semestral.price})</option>
                      <option value="anual">Anual (S/ {PLAN_PRICING.anual.price})</option>
                    </select>
                  </div>

                  <div>
                    <label className="label">Meses a extender / vigencia</label>
                    <input
                      type="number"
                      min="1"
                      max="36"
                      value={editMonths}
                      onChange={(e) => setEditMonths(Number(e.target.value) || 1)}
                      className="field font-mono"
                    />
                    <p className="text-[11px] text-slate-500 mt-1">
                      El plan comenzará hoy y vencerá en {editMonths} mes(es).
                    </p>
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingCompany(null)}
                  className="btn-secondary"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingPlan}
                  className="btn-primary"
                >
                  {savingPlan ? 'Guardando…' : 'Guardar Cambios'}
                </button>
              </div>
            </form>
          </Modal>
        )}

      </div>
    </AppLayout>
  )
}
