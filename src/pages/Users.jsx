import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import {
  UserCog, Plus, Pencil, Trash2, Search, X, ShieldCheck, User,
  Mail, Lock, ToggleLeft, ToggleRight, Check, FileSpreadsheet,
  ArrowUpDown, LayoutGrid, List, AlertCircle, CheckCircle2,
  Sparkles, Crown, ArrowRight, ShieldAlert, Key
} from 'lucide-react'
import AppLayout from '../components/layout/AppLayout'
import Modal from '../components/ui/Modal'
import EmptyState from '../components/ui/EmptyState'
import { usersService } from '../services/usersService'
import { companySettingsService } from '../services/companySettingsService'
import { getLimits } from '../lib/planLimits'
import { useAuth } from '../context/AuthContext'

const AVATAR_PALETTES = [
  { bg: 'from-blue-600 to-indigo-700', text: 'text-white' },
  { bg: 'from-emerald-600 to-teal-700', text: 'text-white' },
  { bg: 'from-violet-600 to-purple-700', text: 'text-white' },
  { bg: 'from-amber-500 to-orange-600', text: 'text-white' },
  { bg: 'from-rose-500 to-pink-600', text: 'text-white' },
  { bg: 'from-cyan-600 to-blue-600', text: 'text-white' },
]

const getInitials = (name = '') => {
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + (parts[1]?.[0] || '')).toUpperCase()
}

export default function Users() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user: currentAuthUser } = useAuth()

  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [company, setCompany] = useState(null)

  // Filters & State
  const [search, setSearch] = useState('')
  const [segmentFilter, setSegmentFilter] = useState('ALL') // 'ALL' | 'ADMIN' | 'EMPLEADO' | 'ACTIVE' | 'INACTIVE'
  const [sortBy, setSortBy] = useState('name') // 'name' | 'role' | 'status'
  const [viewMode, setViewMode] = useState('table') // 'table' | 'grid'
  const [showMetrics, setShowMetrics] = useState(true)

  // Limits Modal
  const [limitModalOpen, setLimitModalOpen] = useState(false)
  const [limitMessage, setLimitMessage] = useState('')

  // Delete modal
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [deleting, setDeleting] = useState(false)

  // Toast / feedback message after creating/updating from /usuarios/nuevo or /usuarios/editar/:id
  const [successToast, setSuccessToast] = useState(
    location.state?.created
      ? `¡Usuario "${location.state?.userName || ''}" registrado exitosamente!`
      : location.state?.updated
      ? `¡Usuario "${location.state?.userName || ''}" actualizado correctamente!`
      : ''
  )

  useEffect(() => {
    if (successToast) {
      const timer = setTimeout(() => setSuccessToast(''), 4500)
      return () => clearTimeout(timer)
    }
  }, [successToast])

  async function loadAll() {
    setLoading(true)
    try {
      const [usersList, comp] = await Promise.all([
        usersService.list().catch(() => []),
        companySettingsService.get().catch(() => null)
      ])
      setUsers(usersList || [])
      setCompany(comp)
    } catch (err) {
      console.error('Error cargando usuarios:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadAll()
  }, [])

  /* ─── Global Executive Stats ─── */
  const stats = useMemo(() => {
    const totalUsers = users.length
    const adminCount = users.filter((u) => u.role === 'admin').length
    const employeeCount = users.filter((u) => u.role !== 'admin').length
    const activeCount = users.filter((u) => u.active !== false).length
    const inactiveCount = totalUsers - activeCount

    const limits = getLimits(company)
    const maxUsers = limits.maxUsers

    return {
      totalUsers,
      adminCount,
      employeeCount,
      activeCount,
      inactiveCount,
      maxUsers
    }
  }, [users, company])

  /* ─── Check Limits and Navigate to /usuarios/nuevo ─── */
  function handleOpenCreate() {
    const limits = getLimits(company)
    if (users.length >= limits.maxUsers) {
      setLimitMessage(`Has alcanzado el límite de tu plan (${limits.maxUsers} usuario). Actualiza a Pro para registrar a todo tu equipo.`)
      setLimitModalOpen(true)
      return
    }
    navigate('/usuarios/nuevo')
  }

  /* ─── Toggle Active State ─── */
  async function toggleActive(u, e) {
    if (e) e.stopPropagation()
    try {
      const nextActive = u.active === false ? true : false
      await usersService.update(u.id, { active: nextActive })
      setUsers((prev) =>
        prev.map((item) => (item.id === u.id ? { ...item, active: nextActive } : item))
      )
    } catch (err) {
      console.error('Error al alternar estado del usuario:', err)
    }
  }

  /* ─── Filtered and Sorted Users ─── */
  const filtered = useMemo(() => {
    let result = users.map((u, idx) => ({
      ...u,
      avatarStyle: AVATAR_PALETTES[idx % AVATAR_PALETTES.length]
    }))

    // 1. Text Search
    const q = search.trim().toLowerCase()
    if (q) {
      result = result.filter(
        (u) =>
          (u.full_name && u.full_name.toLowerCase().includes(q)) ||
          (u.email && u.email.toLowerCase().includes(q)) ||
          (u.role && u.role.toLowerCase().includes(q))
      )
    }

    // 2. Segment Filter
    if (segmentFilter === 'ADMIN') {
      result = result.filter((u) => u.role === 'admin')
    } else if (segmentFilter === 'EMPLEADO') {
      result = result.filter((u) => u.role !== 'admin')
    } else if (segmentFilter === 'ACTIVE') {
      result = result.filter((u) => u.active !== false)
    } else if (segmentFilter === 'INACTIVE') {
      result = result.filter((u) => u.active === false)
    }

    // 3. Sorting
    if (sortBy === 'name') {
      result.sort((a, b) => (a.full_name || '').localeCompare(b.full_name || ''))
    } else if (sortBy === 'role') {
      result.sort((a, b) => (a.role || '').localeCompare(b.role || ''))
    } else if (sortBy === 'status') {
      result.sort((a, b) => (b.active !== false ? 1 : 0) - (a.active !== false ? 1 : 0))
    }

    return result
  }, [users, search, segmentFilter, sortBy])

  /* ─── Export to Excel / CSV ─── */
  const handleExportExcel = () => {
    const headers = ['Nombre Completo', 'Correo Electrónico', 'Rol / Permisos', 'Estado de la Cuenta']

    const rows = filtered.map((u) => [
      `"${(u.full_name || '').replace(/"/g, '""')}"`,
      `"${u.email || ''}"`,
      u.role === 'admin' ? 'Administrador' : 'Empleado',
      u.active !== false ? 'Activo' : 'Inactivo'
    ])

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `directorio-usuarios-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  /* ─── Delete User ─── */
  async function handleDelete() {
    if (!confirmDelete) return
    setDeleting(true)
    try {
      await usersService.remove(confirmDelete.id)
      setConfirmDelete(null)
      loadAll()
    } catch (err) {
      console.error(err)
    } finally {
      setDeleting(false)
    }
  }

  return (
    <AppLayout title="Usuarios y Roles">
      <div className="space-y-5 max-w-[1440px] mx-auto pb-16">

        {/* ═════════════════════════════════════════════════════════
            SUCCESS TOAST NOTIFICATION
           ═════════════════════════════════════════════════════════ */}
        {successToast && (
          <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 text-emerald-800 dark:text-emerald-300 text-xs sm:text-sm font-semibold flex items-center justify-between gap-3 shadow-xs animate-slide-up">
            <div className="flex items-center gap-2.5">
              <CheckCircle2 size={18} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>{successToast}</span>
            </div>
            <button
              onClick={() => setSuccessToast('')}
              className="text-emerald-600 dark:text-emerald-400 hover:text-emerald-800 p-1 cursor-pointer"
            >
              <X size={15} />
            </button>
          </div>
        )}

        {/* ═════════════════════════════════════════════════════════
            0. TOP EXECUTIVE HEADER TOOLBAR
           ═════════════════════════════════════════════════════════ */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-[#141417] p-4 sm:p-5 rounded-2xl border border-slate-200/80 dark:border-zinc-800 shadow-xs">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-brand/10 text-brand dark:text-blue-400">
                <UserCog size={18} />
              </span>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-zinc-100 tracking-tight font-display">
                Equipo y Permisos de Acceso
              </h1>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-zinc-400 mt-1">
              Controla los colaboradores de tu empresa, asigna roles de administración o ventas y audita cuentas activas.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Toggle KPI Metrics */}
            <button
              onClick={() => setShowMetrics((prev) => !prev)}
              className="px-3 py-2 rounded-xl bg-slate-50 dark:bg-zinc-800/80 hover:bg-slate-100 dark:hover:bg-zinc-700/80 text-slate-700 dark:text-zinc-300 text-xs font-semibold flex items-center gap-1.5 border border-slate-200 dark:border-zinc-700 transition-colors cursor-pointer"
              title="Mostrar / ocultar métricas clave"
            >
              <User size={14} className="text-slate-400" />
              <span className="hidden sm:inline">{showMetrics ? 'Ocultar KPIs' : 'Ver KPIs'}</span>
            </button>

            {/* Export Excel */}
            <button
              onClick={handleExportExcel}
              className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer active:scale-95"
              title="Descargar directorio de usuarios en Excel / CSV"
            >
              <FileSpreadsheet size={15} />
              <span>Exportar</span>
            </button>

            {/* Primary New User Button (Navigates to dedicated page) */}
            <button
              onClick={handleOpenCreate}
              className="px-4 py-2 rounded-xl bg-brand hover:bg-brand-hover text-white text-xs sm:text-sm font-bold flex items-center gap-1.5 shadow-sm hover:shadow-card active:scale-95 transition-all cursor-pointer"
            >
              <Plus size={16} />
              <span>+ Nuevo Usuario</span>
            </button>
          </div>
        </div>

        {/* ═════════════════════════════════════════════════════════
            1. EXECUTIVE METRICS BAR (4 FINNOVA CARDS)
           ═════════════════════════════════════════════════════════ */}
        {showMetrics && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4 animate-fade-in">

            {/* Card 1: Total Usuarios */}
            <div
              className="bg-white dark:bg-[#141417] rounded-2xl border border-slate-200/80 dark:border-zinc-800 p-3.5 sm:p-4.5 shadow-xs flex flex-col justify-between card-mobile-active active:scale-[0.98] transition-all hover:border-slate-300 dark:hover:border-zinc-700"
              style={{ animation: 'slideUp 0.35s cubic-bezier(0.16, 1, 0.3, 1) 40ms both' }}
            >
              <div className="flex items-center justify-between gap-1.5 mb-2">
                <p className="text-[10px] sm:text-[11px] font-bold text-slate-400 dark:text-zinc-400 uppercase tracking-wider truncate">
                  Colaboradores Registrados
                </p>
                <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 flex items-center justify-center text-brand dark:text-blue-400 shrink-0">
                  <UserCog size={16} />
                </div>
              </div>
              <div>
                <h4 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-zinc-100 tracking-tight font-display">
                  {loading ? '…' : `${stats.totalUsers}`}
                </h4>
                <p className="text-[11px] text-slate-400 dark:text-zinc-500 mt-0.5 truncate">
                  {stats.maxUsers === Infinity ? 'Plan Pro Ilimitado' : `Límite: ${stats.maxUsers} usuario`}
                </p>
              </div>
            </div>

            {/* Card 2: Administradores */}
            <div
              className="bg-white dark:bg-[#141417] rounded-2xl border border-slate-200/80 dark:border-zinc-800 p-3.5 sm:p-4.5 shadow-xs flex flex-col justify-between card-mobile-active active:scale-[0.98] transition-all hover:border-slate-300 dark:hover:border-zinc-700"
              style={{ animation: 'slideUp 0.35s cubic-bezier(0.16, 1, 0.3, 1) 90ms both' }}
            >
              <div className="flex items-center justify-between gap-1.5 mb-2">
                <p className="text-[10px] sm:text-[11px] font-bold text-slate-400 dark:text-zinc-400 uppercase tracking-wider truncate">
                  Administradores
                </p>
                <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-purple-50 dark:bg-purple-500/10 border border-purple-200 dark:border-purple-500/20 flex items-center justify-center text-purple-600 dark:text-purple-400 shrink-0">
                  <ShieldCheck size={16} />
                </div>
              </div>
              <div>
                <h4 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-zinc-100 tracking-tight font-display">
                  {loading ? '…' : `${stats.adminCount}`}
                </h4>
                <p className="text-[11px] text-purple-600 dark:text-purple-400 font-semibold mt-0.5 truncate">
                  Control total del negocio
                </p>
              </div>
            </div>

            {/* Card 3: Empleados / Operadores */}
            <div
              className="bg-white dark:bg-[#141417] rounded-2xl border border-slate-200/80 dark:border-zinc-800 p-3.5 sm:p-4.5 shadow-xs flex flex-col justify-between card-mobile-active active:scale-[0.98] transition-all hover:border-slate-300 dark:hover:border-zinc-700"
              style={{ animation: 'slideUp 0.35s cubic-bezier(0.16, 1, 0.3, 1) 140ms both' }}
            >
              <div className="flex items-center justify-between gap-1.5 mb-2">
                <p className="text-[10px] sm:text-[11px] font-bold text-slate-400 dark:text-zinc-400 uppercase tracking-wider truncate">
                  Vendedores / Empleados
                </p>
                <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
                  <User size={16} />
                </div>
              </div>
              <div>
                <h4 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-zinc-100 tracking-tight font-display">
                  {loading ? '…' : `${stats.employeeCount}`}
                </h4>
                <p className="text-[11px] text-slate-400 dark:text-zinc-500 mt-0.5 truncate">
                  Punto de venta y caja
                </p>
              </div>
            </div>

            {/* Card 4: Cuentas Activas */}
            <div
              className="bg-white dark:bg-[#141417] rounded-2xl border border-slate-200/80 dark:border-zinc-800 p-3.5 sm:p-4.5 shadow-xs flex flex-col justify-between card-mobile-active active:scale-[0.98] transition-all hover:border-slate-300 dark:hover:border-zinc-700"
              style={{ animation: 'slideUp 0.35s cubic-bezier(0.16, 1, 0.3, 1) 190ms both' }}
            >
              <div className="flex items-center justify-between gap-1.5 mb-2">
                <p className="text-[10px] sm:text-[11px] font-bold text-slate-400 dark:text-zinc-400 uppercase tracking-wider truncate">
                  Cuentas Habilitadas
                </p>
                <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0">
                  <Key size={16} />
                </div>
              </div>
              <div>
                <h4 className="text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400 tracking-tight font-display">
                  {loading ? '…' : `${stats.activeCount}`}
                </h4>
                <p className="text-[11px] text-slate-400 dark:text-zinc-500 mt-0.5 truncate">
                  {stats.inactiveCount > 0 ? `${stats.inactiveCount} inactivos` : '100% de cuentas activas'}
                </p>
              </div>
            </div>

          </div>
        )}

        {/* ═════════════════════════════════════════════════════════
            2. CONTROL BAR (SEARCH, SEGMENT PILLS, SORT, VIEW SWITCH)
           ═════════════════════════════════════════════════════════ */}
        <div
          className="bg-white dark:bg-[#141417] rounded-2xl border border-slate-200/80 dark:border-zinc-800 p-3.5 sm:p-4 shadow-xs space-y-3"
          style={{ animation: 'slideUp 0.35s cubic-bezier(0.16, 1, 0.3, 1) 220ms both' }}
        >
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">

            {/* Search Input */}
            <div className="relative flex-1 w-full lg:max-w-md">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-zinc-500" />
              <input
                className="w-full bg-slate-50 dark:bg-zinc-800/80 border border-slate-200 dark:border-zinc-700 rounded-xl pl-10 pr-9 py-2 text-xs sm:text-sm text-slate-900 dark:text-zinc-100 placeholder:text-slate-400 dark:placeholder:text-zinc-500 focus:bg-white dark:focus:bg-zinc-900 focus:border-brand focus:ring-2 focus:ring-brand/10 transition-all outline-none"
                placeholder="Buscar colaborador por nombre, correo o rol…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 dark:hover:text-zinc-200"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Segment Filter Chips */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0 no-scrollbar">
              <button
                type="button"
                onClick={() => setSegmentFilter('ALL')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                  segmentFilter === 'ALL'
                    ? 'bg-brand text-white shadow-xs'
                    : 'bg-slate-50 dark:bg-zinc-800 text-slate-600 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-700'
                }`}
              >
                Todos ({users.length})
              </button>
              <button
                type="button"
                onClick={() => setSegmentFilter('ADMIN')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                  segmentFilter === 'ADMIN'
                    ? 'bg-brand text-white shadow-xs'
                    : 'bg-slate-50 dark:bg-zinc-800 text-slate-600 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-700'
                }`}
              >
                Administradores ({stats.adminCount})
              </button>
              <button
                type="button"
                onClick={() => setSegmentFilter('EMPLEADO')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                  segmentFilter === 'EMPLEADO'
                    ? 'bg-brand text-white shadow-xs'
                    : 'bg-slate-50 dark:bg-zinc-800 text-slate-600 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-700'
                }`}
              >
                Empleados ({stats.employeeCount})
              </button>
              <button
                type="button"
                onClick={() => setSegmentFilter('ACTIVE')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                  segmentFilter === 'ACTIVE'
                    ? 'bg-brand text-white shadow-xs'
                    : 'bg-slate-50 dark:bg-zinc-800 text-slate-600 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-700'
                }`}
              >
                Activos ({stats.activeCount})
              </button>
            </div>

            {/* Sort & View Mode */}
            <div className="flex items-center justify-between lg:justify-end gap-2 w-full lg:w-auto">
              <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-zinc-800/80 border border-slate-200 dark:border-zinc-700 rounded-xl px-2.5 py-1.5">
                <ArrowUpDown size={13} className="text-slate-400 dark:text-zinc-500 shrink-0" />
                <span className="text-[11px] text-slate-400 dark:text-zinc-500 font-medium shrink-0">Ordenar:</span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="bg-transparent text-xs text-slate-700 dark:text-zinc-200 font-semibold outline-none cursor-pointer"
                >
                  <option value="name" className="dark:bg-zinc-900">Nombre A-Z</option>
                  <option value="role" className="dark:bg-zinc-900">Rol</option>
                  <option value="status" className="dark:bg-zinc-900">Estado de Cuenta</option>
                </select>
              </div>

              {/* View Switch */}
              <div className="inline-flex items-center p-1 bg-slate-100 dark:bg-zinc-800 rounded-xl border border-slate-200/80 dark:border-zinc-700 shrink-0">
                <button
                  type="button"
                  onClick={() => setViewMode('table')}
                  title="Vista en tabla"
                  className={`p-1.5 rounded-lg transition-all ${
                    viewMode === 'table'
                      ? 'bg-white dark:bg-zinc-900 text-brand dark:text-blue-400 shadow-xs font-bold'
                      : 'text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-100'
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
                      ? 'bg-white dark:bg-zinc-900 text-brand dark:text-blue-400 shadow-xs font-bold'
                      : 'text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-100'
                  }`}
                >
                  <LayoutGrid size={15} />
                </button>
              </div>
            </div>

          </div>
        </div>

        {/* ═════════════════════════════════════════════════════════
            3. MAIN CONTENT: TABLE OR GRID
           ═════════════════════════════════════════════════════════ */}
        {loading ? (
          <div className="bg-white dark:bg-[#141417] rounded-2xl border border-slate-200/80 dark:border-zinc-800 p-16 flex flex-col items-center justify-center text-center shadow-xs">
            <div className="w-10 h-10 rounded-full border-2 border-brand border-t-transparent animate-spin mb-3" />
            <p className="text-xs font-semibold text-slate-600 dark:text-zinc-400">
              Cargando colaboradores y accesos…
            </p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white dark:bg-[#141417] rounded-2xl border border-slate-200/80 dark:border-zinc-800 p-8 shadow-xs">
            <EmptyState
              icon={UserCog}
              title="Sin usuarios encontrados"
              description={
                search || segmentFilter !== 'ALL'
                  ? 'No hay colaboradores que coincidan con la búsqueda o filtro aplicado.'
                  : 'Registra a los colaboradores de tu empresa para otorgarles acceso al sistema.'
              }
              action={
                search || segmentFilter !== 'ALL' ? (
                  <button
                    onClick={() => {
                      setSearch('')
                      setSegmentFilter('ALL')
                    }}
                    className="btn-secondary text-xs"
                  >
                    Restablecer filtros
                  </button>
                ) : (
                  <button onClick={handleOpenCreate} className="btn-primary text-xs">
                    <Plus size={15} /> Nuevo Usuario
                  </button>
                )
              }
            />
          </div>
        ) : viewMode === 'table' ? (
          /* ─── TABLE VIEW ─── */
          <div
            className="bg-white dark:bg-[#141417] rounded-2xl border border-slate-200/80 dark:border-zinc-800 overflow-hidden shadow-xs"
            style={{ animation: 'slideUp 0.35s cubic-bezier(0.16, 1, 0.3, 1) 260ms both' }}
          >
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200/80 dark:border-zinc-800 bg-slate-50/70 dark:bg-zinc-800/50 text-[11px] font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider">
                    <th className="py-3.5 px-4">Colaborador / Usuario</th>
                    <th className="py-3.5 px-4">Correo Electrónico</th>
                    <th className="py-3.5 px-4">Rol / Permisos</th>
                    <th className="py-3.5 px-4 text-center">Estado de Cuenta</th>
                    <th className="py-3.5 px-4 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-zinc-800 text-xs">
                  {filtered.map((u) => {
                    const isSelf = currentAuthUser?.email === u.email

                    return (
                      <tr
                        key={u.id}
                        className="hover:bg-slate-50/80 dark:hover:bg-zinc-800/40 transition-colors group cursor-pointer"
                        onClick={() => navigate(`/usuarios/editar/${u.id}`)}
                      >
                        {/* Name + Avatar */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-3">
                            <div
                              className={`w-9 h-9 rounded-xl bg-gradient-to-br ${u.avatarStyle.bg} flex items-center justify-center font-bold text-xs text-white shrink-0 shadow-xs`}
                            >
                              {getInitials(u.full_name || u.email)}
                            </div>
                            <div>
                              <p className="font-bold text-slate-900 dark:text-zinc-100 text-sm group-hover:text-brand dark:group-hover:text-blue-400 transition-colors flex items-center gap-1.5">
                                <span>{u.full_name || 'Sin nombre'}</span>
                                {isSelf && (
                                  <span className="text-[10px] font-bold px-1.5 py-0.2 bg-blue-100 dark:bg-blue-500/20 text-brand dark:text-blue-300 rounded">
                                    Tú
                                  </span>
                                )}
                              </p>
                              <span className="text-[11px] text-slate-400 dark:text-zinc-500 sm:hidden">
                                {u.email}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* Email */}
                        <td className="py-3.5 px-4 text-slate-600 dark:text-zinc-400 font-mono text-[11px]">
                          {u.email}
                        </td>

                        {/* Role */}
                        <td className="py-3.5 px-4">
                          {u.role === 'admin' ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-xs font-bold bg-blue-50 text-brand border border-blue-200 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20">
                              <ShieldCheck size={13} /> Administrador
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-xs font-bold bg-purple-50 text-purple-700 border border-purple-200 dark:bg-purple-500/10 dark:text-purple-300 dark:border-purple-500/20">
                              <User size={13} /> Empleado
                            </span>
                          )}
                        </td>

                        {/* Active status with toggle */}
                        <td className="py-3.5 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            onClick={(e) => toggleActive(u, e)}
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                              u.active !== false
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20 hover:bg-emerald-100'
                                : 'bg-slate-100 text-slate-500 border border-slate-200 dark:bg-zinc-800 dark:text-zinc-400 dark:border-zinc-700 hover:bg-slate-200'
                            }`}
                            title={u.active !== false ? 'Desactivar acceso' : 'Habilitar acceso'}
                          >
                            {u.active !== false ? (
                              <>
                                <ToggleRight size={17} className="text-emerald-600 dark:text-emerald-400" />
                                <span>Activo</span>
                              </>
                            ) : (
                              <>
                                <ToggleLeft size={17} className="text-slate-400" />
                                <span>Inactivo</span>
                              </>
                            )}
                          </button>
                        </td>

                        {/* Actions */}
                        <td className="py-3.5 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => navigate(`/usuarios/editar/${u.id}`)}
                              title="Editar usuario"
                              className="p-1.5 rounded-lg text-slate-400 hover:text-brand hover:bg-blue-50 dark:hover:bg-blue-500/10 dark:hover:text-blue-400 transition-colors cursor-pointer"
                            >
                              <Pencil size={15} />
                            </button>
                            <button
                              onClick={() => setConfirmDelete(u)}
                              disabled={isSelf}
                              title={isSelf ? 'No puedes eliminar tu propia cuenta' : 'Eliminar usuario'}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 dark:hover:text-red-400 transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
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
            <div className="p-3 bg-slate-50/70 dark:bg-zinc-800/40 border-t border-slate-100 dark:border-zinc-800 flex items-center justify-between text-xs text-slate-500 dark:text-zinc-400">
              <span>
                Mostrando <strong>{filtered.length}</strong> de <strong>{users.length}</strong> colaboradores registrados
              </span>
              <span>Control de Acceso y Credenciales ERP</span>
            </div>
          </div>
        ) : (
          /* ─── GRID CARDS VIEW ─── */
          <div
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
            style={{ animation: 'slideUp 0.35s cubic-bezier(0.16, 1, 0.3, 1) 260ms both' }}
          >
            {filtered.map((u) => {
              const isSelf = currentAuthUser?.email === u.email

              return (
                <div
                  key={u.id}
                  className="bg-white dark:bg-[#141417] rounded-2xl border border-slate-200/80 dark:border-zinc-800 p-5 shadow-xs hover:shadow-card hover:border-slate-300 dark:hover:border-zinc-700 card-mobile-active active:scale-[0.99] transition-all flex flex-col justify-between group"
                >
                  <div>
                    {/* Header: Avatar + User Name + Actions */}
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex items-start gap-3 min-w-0">
                        <div
                          className={`w-11 h-11 rounded-2xl bg-gradient-to-br ${u.avatarStyle.bg} flex items-center justify-center font-black text-sm text-white shrink-0 group-hover:scale-105 transition-transform shadow-xs`}
                        >
                          {getInitials(u.full_name || u.email)}
                        </div>
                        <div className="min-w-0">
                          <h3
                            onClick={() => navigate(`/usuarios/editar/${u.id}`)}
                            className="font-bold text-slate-900 dark:text-zinc-100 text-base leading-snug truncate group-hover:text-brand dark:group-hover:text-blue-400 transition-colors cursor-pointer"
                          >
                            {u.full_name || 'Sin nombre'}
                          </h3>
                          <p className="text-xs text-slate-400 dark:text-zinc-500 truncate mt-0.5 font-mono">
                            {u.email}
                          </p>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => navigate(`/usuarios/editar/${u.id}`)}
                          title="Editar usuario"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-brand hover:bg-blue-50 dark:hover:bg-blue-500/10 dark:hover:text-blue-400 transition-colors cursor-pointer"
                        >
                          <Pencil size={15} />
                        </button>
                        <button
                          onClick={() => setConfirmDelete(u)}
                          disabled={isSelf}
                          title={isSelf ? 'No puedes eliminar tu propia cuenta' : 'Eliminar usuario'}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 dark:hover:text-red-400 transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Card Footer: Role and Status */}
                  <div className="pt-3.5 border-t border-slate-100 dark:border-zinc-800 flex items-center justify-between">
                    <div>
                      {u.role === 'admin' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-xs font-bold bg-blue-50 text-brand border border-blue-200 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20">
                          <ShieldCheck size={13} /> Admin
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-xs font-bold bg-purple-50 text-purple-700 border border-purple-200 dark:bg-purple-500/10 dark:text-purple-300 dark:border-purple-500/20">
                          <User size={13} /> Empleado
                        </span>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={(e) => toggleActive(u, e)}
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        u.active !== false
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20 hover:bg-emerald-100'
                          : 'bg-slate-100 text-slate-500 border border-slate-200 dark:bg-zinc-800 dark:text-zinc-400 dark:border-zinc-700 hover:bg-slate-200'
                      }`}
                    >
                      {u.active !== false ? (
                        <>
                          <ToggleRight size={17} className="text-emerald-600 dark:text-emerald-400" />
                          <span>Activo</span>
                        </>
                      ) : (
                        <>
                          <ToggleLeft size={17} className="text-slate-400" />
                          <span>Inactivo</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}

      </div>

      {/* ═════════════════════════════════════════════════════════
          4. PLAN LIMIT MODAL (IF REACHED ON FREE TIER)
         ═════════════════════════════════════════════════════════ */}
      <Modal
        open={limitModalOpen}
        onClose={() => setLimitModalOpen(false)}
        title="Límite del Plan Alcanzado"
        width="max-w-md"
      >
        <div className="space-y-4 p-2 text-center">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto shadow-xs">
            <Crown size={24} />
          </div>
          <div className="space-y-1">
            <h4 className="font-display font-bold text-slate-900 dark:text-zinc-100 text-base">
              Límite de usuarios alcanzado
            </h4>
            <p className="text-xs text-slate-600 dark:text-zinc-400 leading-relaxed">
              {limitMessage || 'Alcanzaste el límite de tu plan actual. Actualiza a Pro para agregar más usuarios y colaboradores.'}
            </p>
          </div>
          <div className="flex items-center justify-center gap-2.5 pt-2">
            <button
              type="button"
              onClick={() => setLimitModalOpen(false)}
              className="px-4 py-2 rounded-xl border border-slate-200 dark:border-zinc-700 text-slate-600 dark:text-zinc-300 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-zinc-800 transition cursor-pointer"
            >
              Cerrar
            </button>
            <Link
              to="/planes"
              className="px-4 py-2 rounded-xl bg-brand hover:bg-brand-hover text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition cursor-pointer"
            >
              <Sparkles size={13} className="text-amber-300" />
              <span>Ver Planes Pro</span>
              <ArrowRight size={13} />
            </Link>
          </div>
        </div>
      </Modal>

      {/* ═════════════════════════════════════════════════════════
          5. CONFIRM DELETE MODAL
         ═════════════════════════════════════════════════════════ */}
      <Modal
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        title="Eliminar Usuario"
        width="max-w-sm"
      >
        {confirmDelete && (
          <div className="space-y-4">
            <p className="text-sm text-slate-600 dark:text-zinc-300">
              ¿Estás seguro de que deseas eliminar la cuenta de{' '}
              <strong className="text-slate-900 dark:text-zinc-100">{confirmDelete.full_name || confirmDelete.email}</strong>?
            </p>

            <div className="flex items-start gap-2 text-xs text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-xl p-3">
              <ShieldAlert size={16} className="shrink-0 mt-0.5" />
              <span>
                Esta acción revocará de inmediato cualquier acceso al ERP para este colaborador.
              </span>
            </div>

            <div className="flex justify-end gap-2.5 pt-2">
              <button
                onClick={() => setConfirmDelete(null)}
                className="btn-secondary"
              >
                Cancelar
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="btn-danger"
              >
                {deleting ? 'Eliminando…' : 'Eliminar Usuario'}
              </button>
            </div>
          </div>
        )}
      </Modal>

    </AppLayout>
  )
}
