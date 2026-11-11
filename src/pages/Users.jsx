import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import {
  UserCog, Plus, Pencil, Trash2, Search, X, ShieldCheck, User,
  Mail, Lock, ToggleLeft, ToggleRight, Check, FileSpreadsheet,
  ArrowUpDown, LayoutGrid, List, AlertCircle, CheckCircle2,
  Sparkles, Crown, ArrowRight, ShieldAlert, Key, Home, TrendingUp,
  PieChart, Shield, RefreshCw, Copy, Award, CheckCircle, Users as UsersIcon
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

  const [users, setUsers] = useState(() => usersService.getCached?.() || [])
  const [loading, setLoading] = useState(() => !usersService.hasCache?.())
  const [company, setCompany] = useState(() => companySettingsService.getCached?.(currentAuthUser?.company_id) || null)

  // Filters & State
  const [search, setSearch] = useState('')
  const [segmentFilter, setSegmentFilter] = useState('ALL') // 'ALL' | 'ADMIN' | 'EMPLEADO' | 'ACTIVE' | 'INACTIVE'
  const [sortBy, setSortBy] = useState('name') // 'name' | 'role' | 'status'
  const [viewMode, setViewMode] = useState('table') // 'table' | 'grid'
  const [showMetrics, setShowMetrics] = useState(true)
  const [copiedEmail, setCopiedEmail] = useState(null)

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
    if (!usersService.hasCache?.()) setLoading(true)
    const safetyTimer = setTimeout(() => {
      setLoading(false)
    }, 2500)

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
      clearTimeout(safetyTimer)
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

  /* ─── Donut Chart Calculations ─── */
  const donutData = useMemo(() => {
    const total = stats.totalUsers || 1
    const pctAdmin = Math.round((stats.adminCount / total) * 100)
    const pctEmployee = Math.round((stats.employeeCount / total) * 100)
    const pctInactive = Math.max(0, 100 - pctAdmin - pctEmployee)

    const C = 2 * Math.PI * 40 // ~251.32
    const adminStroke = (pctAdmin / 100) * C
    const empStroke = (pctEmployee / 100) * C
    const inactStroke = (pctInactive / 100) * C

    return {
      pctAdmin,
      pctEmployee,
      pctInactive,
      C,
      adminStroke,
      empStroke,
      inactStroke
    }
  }, [stats])

  /* ─── Copy Email with Feedback ─── */
  const handleCopyEmail = (email, e) => {
    e?.stopPropagation()
    if (!email) return
    navigator.clipboard?.writeText(email)
    setCopiedEmail(email)
    setTimeout(() => setCopiedEmail(null), 2000)
  }

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
      <div className="space-y-6 max-w-[1440px] mx-auto pb-16 animate-fade-in">

        {/* ═════════════════════════════════════════════════════════
            SUCCESS TOAST NOTIFICATION
           ═════════════════════════════════════════════════════════ */}
        {successToast && (
          <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200 text-xs sm:text-sm font-semibold flex items-center justify-between gap-3 shadow-xs animate-slide-up">
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
            0. TOP EXECUTIVE HEADER TOOLBAR & BREADCRUMB
           ═════════════════════════════════════════════════════════ */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-zinc-400">
            <Home size={14} className="text-slate-400 dark:text-zinc-500" />
            <span className="text-slate-300 dark:text-zinc-600">›</span>
            <span className="font-semibold text-slate-700 dark:text-zinc-300">Administración › Equipo, Usuarios y Control de Acceso</span>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-[#141417] p-5 rounded-2xl border border-slate-200/80 dark:border-zinc-800 shadow-xs">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-lg shadow-blue-500/25 shrink-0">
                <UserCog size={22} />
              </div>
              <div>
                <div className="flex items-center gap-2.5">
                  <h1 className="text-2xl sm:text-[26px] font-black text-slate-900 dark:text-white tracking-tight">
                    Equipo y Permisos de Acceso
                  </h1>
                  <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 shadow-xs">
                    <ShieldCheck size={13} /> Control RBAC
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-slate-500 dark:text-zinc-400 mt-0.5">
                  Controla los colaboradores de tu empresa, asigna roles de administración o ventas y audita cuentas activas.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2.5 shrink-0">
              {/* Toggle KPI Metrics */}
              <button
                onClick={() => setShowMetrics((prev) => !prev)}
                className="px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:bg-slate-50 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-200 text-xs sm:text-sm font-semibold flex items-center gap-2 transition-colors cursor-pointer shadow-xs"
                title="Mostrar u ocultar métricas clave"
              >
                <TrendingUp size={16} className="text-slate-400 dark:text-zinc-400" />
                <span className="hidden sm:inline">{showMetrics ? 'Ocultar KPIs' : 'Ver KPIs'}</span>
              </button>

              {/* Refresh Button */}
              <button
                onClick={loadAll}
                className="p-2.5 rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:bg-slate-50 dark:hover:bg-zinc-700 text-slate-600 dark:text-zinc-300 transition-colors cursor-pointer shadow-xs"
                title="Actualizar colaboradores"
              >
                <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
              </button>

              {/* Export Excel */}
              <button
                onClick={handleExportExcel}
                className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs sm:text-sm font-bold flex items-center gap-2 shadow-md shadow-emerald-600/20 transition-all cursor-pointer"
                title="Descargar directorio de usuarios en Excel / CSV"
              >
                <FileSpreadsheet size={16} />
                <span>Exportar</span>
              </button>

              {/* Primary New User Button */}
              <button
                onClick={handleOpenCreate}
                className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-95 text-white text-xs sm:text-sm font-bold flex items-center gap-2 shadow-md shadow-blue-500/25 transition-all cursor-pointer"
              >
                <Plus size={16} strokeWidth={2.5} />
                <span>+ Nuevo Usuario</span>
              </button>
            </div>
          </div>
        </div>

        {/* ═════════════════════════════════════════════════════════
            1. 4 EXECUTIVE KPIS WITH SVG SPARKLINE GRADIENTS
           ═════════════════════════════════════════════════════════ */}
        {showMetrics && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-fade-in">

            {/* Card 1: Colaboradores Registrados (Blue) */}
            <div className="bg-white dark:bg-[#141417] rounded-2xl p-4 sm:p-5 border border-slate-200/80 dark:border-zinc-800 shadow-[0_2px_12px_rgba(0,0,0,0.03)] hover:shadow-card transition-all flex flex-col justify-between relative overflow-hidden group">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[11px] font-bold text-slate-400 dark:text-zinc-400 uppercase tracking-wider">
                    Colaboradores Registrados
                  </span>
                  <p className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white mt-1 tracking-tight font-mono">
                    {loading ? '…' : `${stats.totalUsers}`}
                  </p>
                </div>
                <div className="w-10 h-10 rounded-2xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 shadow-xs">
                  <UserCog size={20} />
                </div>
              </div>

              <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100 dark:border-zinc-800/80">
                <span className="text-xs text-blue-600 dark:text-blue-400 font-bold">
                  {stats.maxUsers === Infinity ? 'Plan Pro Ilimitado' : `Límite: ${stats.maxUsers} usuario`}
                </span>
                <div className="w-20 h-8 shrink-0">
                  <svg viewBox="0 0 80 32" className="w-full h-full overflow-visible">
                    <defs>
                      <linearGradient id="spkBlueUsr" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.3" />
                        <stop offset="100%" stopColor="#3B82F6" stopOpacity="0" />
                      </linearGradient>
                    </defs>
                    <path d="M 0 24 Q 20 28, 40 14 T 80 6 L 80 32 L 0 32 Z" fill="url(#spkBlueUsr)" />
                    <path d="M 0 24 Q 20 28, 40 14 T 80 6" fill="none" stroke="#3B82F6" strokeWidth="2.5" strokeLinecap="round" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Card 2: Administradores (Purple) */}
            <div className="bg-white dark:bg-[#141417] rounded-2xl p-4 sm:p-5 border border-slate-200/80 dark:border-zinc-800 shadow-[0_2px_12px_rgba(0,0,0,0.03)] hover:shadow-card transition-all flex flex-col justify-between relative overflow-hidden group">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[11px] font-bold text-slate-400 dark:text-zinc-400 uppercase tracking-wider">
                    Administradores
                  </span>
                  <p className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white mt-1 tracking-tight font-mono">
                    {loading ? '…' : `${stats.adminCount}`}
                  </p>
                </div>
                <div className="w-10 h-10 rounded-2xl bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0 shadow-xs">
                  <ShieldCheck size={20} />
                </div>
              </div>

              <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100 dark:border-zinc-800/80">
                <span className="text-xs text-purple-600 dark:text-purple-400 font-bold">
                  Control total del negocio
                </span>
                <div className="w-20 h-8 shrink-0">
                  <svg viewBox="0 0 80 32" className="w-full h-full overflow-visible">
                    <defs>
                      <linearGradient id="spkPurUsr" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#A855F7" stopOpacity="0.3" />
                        <stop offset="100%" stopColor="#A855F7" stopOpacity="0" />
                      </linearGradient>
                    </defs>
                    <path d="M 0 20 Q 20 16, 40 22 T 80 8 L 80 32 L 0 32 Z" fill="url(#spkPurUsr)" />
                    <path d="M 0 20 Q 20 16, 40 22 T 80 8" fill="none" stroke="#A855F7" strokeWidth="2.5" strokeLinecap="round" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Card 3: Vendedores / Empleados (Emerald) */}
            <div className="bg-white dark:bg-[#141417] rounded-2xl p-4 sm:p-5 border border-slate-200/80 dark:border-zinc-800 shadow-[0_2px_12px_rgba(0,0,0,0.03)] hover:shadow-card transition-all flex flex-col justify-between relative overflow-hidden group">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[11px] font-bold text-slate-400 dark:text-zinc-400 uppercase tracking-wider">
                    Vendedores / Empleados
                  </span>
                  <p className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white mt-1 tracking-tight font-mono">
                    {loading ? '…' : `${stats.employeeCount}`}
                  </p>
                </div>
                <div className="w-10 h-10 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 shadow-xs">
                  <User size={20} />
                </div>
              </div>

              <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100 dark:border-zinc-800/80">
                <span className="text-xs text-emerald-600 dark:text-emerald-400 font-bold">
                  Punto de venta y caja
                </span>
                <div className="w-20 h-8 shrink-0">
                  <svg viewBox="0 0 80 32" className="w-full h-full overflow-visible">
                    <defs>
                      <linearGradient id="spkEmeUsr" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#10B981" stopOpacity="0.3" />
                        <stop offset="100%" stopColor="#10B981" stopOpacity="0" />
                      </linearGradient>
                    </defs>
                    <path d="M 0 28 Q 20 22, 40 18 T 80 10 L 80 32 L 0 32 Z" fill="url(#spkEmeUsr)" />
                    <path d="M 0 28 Q 20 22, 40 18 T 80 10" fill="none" stroke="#10B981" strokeWidth="2.5" strokeLinecap="round" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Card 4: Cuentas Habilitadas (Amber) */}
            <div className="bg-white dark:bg-[#141417] rounded-2xl p-4 sm:p-5 border border-slate-200/80 dark:border-zinc-800 shadow-[0_2px_12px_rgba(0,0,0,0.03)] hover:shadow-card transition-all flex flex-col justify-between relative overflow-hidden group">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[11px] font-bold text-slate-400 dark:text-zinc-400 uppercase tracking-wider">
                    Cuentas Habilitadas
                  </span>
                  <p className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white mt-1 tracking-tight font-mono">
                    {loading ? '…' : `${stats.activeCount}`}
                  </p>
                </div>
                <div className="w-10 h-10 rounded-2xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 shadow-xs">
                  <Key size={20} />
                </div>
              </div>

              <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100 dark:border-zinc-800/80">
                <span className="text-xs text-amber-600 dark:text-amber-400 font-bold">
                  {stats.inactiveCount > 0 ? `${stats.inactiveCount} inactivos` : '100% de cuentas activas'}
                </span>
                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300">
                  Operativo
                </span>
              </div>
            </div>

          </div>
        )}

        {/* ═════════════════════════════════════════════════════════
            2. EXECUTIVE MIDDLE ANALYTICS (ROLES & SECURITY MATRIX)
           ═════════════════════════════════════════════════════════ */}
        {showMetrics && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 animate-fade-in">

            {/* DONUT: DISTRIBUCIÓN DE ROLES Y CUENTAS (5 COLS) */}
            <div className="lg:col-span-5 bg-white dark:bg-[#141417] rounded-2xl border border-slate-200/80 dark:border-zinc-800 p-5 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-zinc-800">
                <div className="flex items-center gap-2">
                  <PieChart size={16} className="text-blue-600 dark:text-blue-400" />
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Distribución de Roles y Accesos
                  </h3>
                </div>
                <span className="text-[11px] font-bold text-slate-400 font-mono">
                  {stats.totalUsers} usuarios
                </span>
              </div>

              <div className="flex items-center justify-center py-4">
                <div className="relative w-36 h-36">
                  <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                    <circle cx="50" cy="50" r="40" fill="transparent" stroke="#E2E8F0" strokeWidth="12" className="dark:stroke-zinc-800" />
                    {/* Admins (Purple) */}
                    <circle
                      cx="50" cy="50" r="40" fill="transparent"
                      stroke="#8B5CF6" strokeWidth="12"
                      strokeDasharray={`${donutData.adminStroke} ${donutData.C}`}
                      strokeDashoffset="0"
                      strokeLinecap="round"
                    />
                    {/* Empleados (Emerald) */}
                    <circle
                      cx="50" cy="50" r="40" fill="transparent"
                      stroke="#10B981" strokeWidth="12"
                      strokeDasharray={`${donutData.empStroke} ${donutData.C}`}
                      strokeDashoffset={-donutData.adminStroke}
                      strokeLinecap="round"
                    />
                    {/* Inactivos (Rose) */}
                    {donutData.pctInactive > 0 && (
                      <circle
                        cx="50" cy="50" r="40" fill="transparent"
                        stroke="#F43F5E" strokeWidth="12"
                        strokeDasharray={`${donutData.inactStroke} ${donutData.C}`}
                        strokeDashoffset={-(donutData.adminStroke + donutData.empStroke)}
                        strokeLinecap="round"
                      />
                    )}
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
                    <span className="text-2xl font-black font-mono text-slate-900 dark:text-white leading-none">
                      {stats.totalUsers}
                    </span>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-1">
                      Cuentas
                    </span>
                  </div>
                </div>
              </div>

              {/* Legend with exact stats */}
              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 dark:border-zinc-800 text-center">
                <div className="p-2.5 rounded-xl bg-purple-50/60 dark:bg-purple-950/20">
                  <span className="text-[10px] font-bold text-purple-700 dark:text-purple-400 uppercase block">Administradores</span>
                  <span className="text-xs font-black font-mono text-slate-900 dark:text-white">
                    {stats.adminCount} ({donutData.pctAdmin}%)
                  </span>
                </div>
                <div className="p-2.5 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/20">
                  <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 uppercase block">Empleados / Caja</span>
                  <span className="text-xs font-black font-mono text-slate-900 dark:text-white">
                    {stats.employeeCount} ({donutData.pctEmployee}%)
                  </span>
                </div>
              </div>
            </div>

            {/* SEGURIDAD & MATRIZ DE PERMISOS ERP (7 COLS) */}
            <div className="lg:col-span-7 bg-white dark:bg-[#141417] rounded-2xl border border-slate-200/80 dark:border-zinc-800 p-5 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-zinc-800">
                <div className="flex items-center gap-2">
                  <Shield size={16} className="text-blue-600 dark:text-blue-400" />
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Matriz de Seguridad & Privilegios RBAC
                  </h3>
                </div>
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                  <CheckCircle size={11} /> Políticas Activas
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 py-2">
                {/* Admin Role Card */}
                <div className="p-3.5 rounded-xl bg-slate-50/80 dark:bg-zinc-800/40 border border-slate-200/70 dark:border-zinc-700 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-black bg-purple-50 text-purple-700 border border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800">
                      <ShieldCheck size={14} /> Administrador
                    </span>
                    <span className="text-[10px] font-bold text-purple-600 uppercase">Acceso Total</span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-zinc-300 leading-snug">
                    Control absoluto de ventas, compras, libro kardex, edición de catálogo, reportes de margen, configuración fiscal y gestión de cuentas.
                  </p>
                </div>

                {/* Empleado Role Card */}
                <div className="p-3.5 rounded-xl bg-slate-50/80 dark:bg-zinc-800/40 border border-slate-200/70 dark:border-zinc-700 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-black bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800">
                      <User size={14} /> Empleado / Ventas
                    </span>
                    <span className="text-[10px] font-bold text-emerald-600 uppercase">Punto de Venta</span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-zinc-300 leading-snug">
                    Operación de caja diaria, registro de comprobantes (boleta/factura), consulta rápida de stock y registro de clientes comerciales.
                  </p>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 dark:border-zinc-800 flex items-center justify-between text-xs text-slate-400">
                <span className="flex items-center gap-1.5">
                  <Key size={13} className="text-amber-500" />
                  Cifrado de credenciales de alta seguridad
                </span>
                <Link to="/planes" className="text-blue-600 dark:text-blue-400 font-bold hover:underline flex items-center gap-1">
                  Gestionar Plan <ArrowRight size={12} />
                </Link>
              </div>
            </div>

          </div>
        )}

        {/* ═════════════════════════════════════════════════════════
            3. CONTROL BAR (SEARCH, SEGMENT PILLS, SORT, VIEW SWITCH)
           ═════════════════════════════════════════════════════════ */}
        <div className="bg-white dark:bg-[#141417] rounded-2xl border border-slate-200/80 dark:border-zinc-800 p-4 sm:p-5 shadow-xs space-y-3.5">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">

            {/* Search Input */}
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-zinc-500" />
              <input
                className="w-full bg-slate-50 dark:bg-zinc-800/80 border border-slate-200 dark:border-zinc-700 rounded-xl pl-10 pr-9 py-2.5 text-xs sm:text-sm text-slate-900 dark:text-zinc-100 placeholder:text-slate-400 dark:placeholder:text-zinc-500 focus:bg-white dark:focus:bg-zinc-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all outline-none font-medium"
                placeholder="Buscar colaborador por nombre, correo o rol…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 dark:hover:text-zinc-200 cursor-pointer"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Segment Filter Chips */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0 no-scrollbar shrink-0">
              <button
                type="button"
                onClick={() => setSegmentFilter('ALL')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                  segmentFilter === 'ALL'
                    ? 'bg-blue-600 text-white shadow-xs'
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
                    ? 'bg-blue-600 text-white shadow-xs'
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
                    ? 'bg-blue-600 text-white shadow-xs'
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
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-slate-50 dark:bg-zinc-800 text-slate-600 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-700'
                }`}
              >
                Activos ({stats.activeCount})
              </button>
            </div>

            {/* Sort & View Mode */}
            <div className="flex items-center justify-between lg:justify-end gap-2 shrink-0">
              <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-zinc-800/80 border border-slate-200 dark:border-zinc-700 rounded-xl px-3 py-2">
                <ArrowUpDown size={13} className="text-slate-400 dark:text-zinc-500 shrink-0" />
                <span className="text-[11px] text-slate-400 dark:text-zinc-500 font-medium shrink-0">Ordenar:</span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="bg-transparent text-xs text-slate-800 dark:text-zinc-200 font-bold outline-none cursor-pointer"
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
                  className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                    viewMode === 'table'
                      ? 'bg-white dark:bg-zinc-700 text-blue-600 dark:text-white shadow-xs font-bold'
                      : 'text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-100'
                  }`}
                >
                  <List size={16} />
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('grid')}
                  title="Vista en tarjetas"
                  className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                    viewMode === 'grid'
                      ? 'bg-white dark:bg-zinc-700 text-blue-600 dark:text-white shadow-xs font-bold'
                      : 'text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-100'
                  }`}
                >
                  <LayoutGrid size={16} />
                </button>
              </div>
            </div>

          </div>
        </div>

        {/* ═════════════════════════════════════════════════════════
            4. MAIN CONTENT: TABLE OR GRID
           ═════════════════════════════════════════════════════════ */}
        {loading ? (
          <div className="bg-white dark:bg-[#141417] rounded-2xl border border-slate-200/80 dark:border-zinc-800 p-16 flex flex-col items-center justify-center text-center shadow-xs">
            <div className="w-10 h-10 rounded-full border-2 border-blue-600 border-t-transparent animate-spin mb-3" />
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
          /* ─── 4A. TABLE VIEW ─── */
          <div className="bg-white dark:bg-[#141417] rounded-2xl border border-slate-200/80 dark:border-zinc-800 overflow-hidden shadow-xs">
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
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-3">
                            <div
                              className={`w-10 h-10 rounded-2xl bg-gradient-to-br ${u.avatarStyle.bg} flex items-center justify-center font-black text-xs text-white shrink-0 shadow-xs group-hover:scale-105 transition-transform`}
                            >
                              {getInitials(u.full_name || u.email)}
                            </div>
                            <div>
                              <p className="font-extrabold text-slate-900 dark:text-white text-sm group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors flex items-center gap-1.5 leading-snug">
                                <span>{u.full_name || 'Sin nombre registrado'}</span>
                                {isSelf && (
                                  <span className="text-[10px] font-extrabold px-1.5 py-0.5 bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 rounded-md">
                                    Tú
                                  </span>
                                )}
                              </p>
                              <span className="text-[11px] text-slate-400 dark:text-zinc-500 font-mono sm:hidden">
                                {u.email}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* Email with copy button */}
                        <td className="py-4 px-4 text-slate-600 dark:text-zinc-400 font-mono text-[11.5px]" onClick={(e) => e.stopPropagation()}>
                          <div className="inline-flex items-center gap-1.5 group/email">
                            <span>{u.email}</span>
                            <button
                              type="button"
                              onClick={(e) => handleCopyEmail(u.email, e)}
                              className="p-1 text-slate-300 hover:text-slate-600 dark:hover:text-zinc-200 transition-colors cursor-pointer"
                              title="Copiar correo"
                            >
                              {copiedEmail === u.email ? (
                                <Check size={12} className="text-emerald-500" />
                              ) : (
                                <Copy size={12} />
                              )}
                            </button>
                          </div>
                        </td>

                        {/* Role */}
                        <td className="py-4 px-4">
                          {u.role === 'admin' ? (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-black bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800 shadow-xs">
                              <ShieldCheck size={13} /> Administrador
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-black bg-purple-50 text-purple-700 border border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800 shadow-xs">
                              <User size={13} /> Empleado
                            </span>
                          )}
                        </td>

                        {/* Active status with toggle */}
                        <td className="py-4 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            onClick={(e) => toggleActive(u, e)}
                            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                              u.active !== false
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800 hover:bg-emerald-100 shadow-xs'
                                : 'bg-slate-100 text-slate-500 border border-slate-200 dark:bg-zinc-800 dark:text-zinc-400 dark:border-zinc-700 hover:bg-slate-200'
                            }`}
                            title={u.active !== false ? 'Desactivar acceso al sistema' : 'Habilitar acceso'}
                          >
                            {u.active !== false ? (
                              <>
                                <ToggleRight size={18} className="text-emerald-600 dark:text-emerald-400" />
                                <span>Activo</span>
                              </>
                            ) : (
                              <>
                                <ToggleLeft size={18} className="text-slate-400" />
                                <span>Inactivo</span>
                              </>
                            )}
                          </button>
                        </td>

                        {/* Actions */}
                        <td className="py-4 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => navigate(`/usuarios/editar/${u.id}`)}
                              title="Editar usuario"
                              className="p-2 rounded-xl text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-zinc-800 dark:hover:text-blue-400 transition-colors cursor-pointer"
                            >
                              <Pencil size={15} />
                            </button>
                            <button
                              onClick={() => setConfirmDelete(u)}
                              disabled={isSelf}
                              title={isSelf ? 'No puedes eliminar tu propia cuenta' : 'Eliminar usuario'}
                              className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-zinc-800 dark:hover:text-rose-400 transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
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
            <div className="p-3.5 bg-slate-50/70 dark:bg-zinc-800/40 border-t border-slate-100 dark:border-zinc-800 flex items-center justify-between text-xs text-slate-500 dark:text-zinc-400">
              <span>
                Mostrando <strong className="text-slate-800 dark:text-white">{filtered.length}</strong> de <strong className="text-slate-800 dark:text-white">{users.length}</strong> colaboradores registrados
              </span>
              <span>Control de Acceso y Credenciales ERP</span>
            </div>
          </div>
        ) : (
          /* ─── 4B. GRID CARDS VIEW ─── */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((u) => {
              const isSelf = currentAuthUser?.email === u.email

              return (
                <div
                  key={u.id}
                  className="bg-white dark:bg-[#141417] rounded-2xl border border-slate-200/80 dark:border-zinc-800 p-5 shadow-xs hover:shadow-card hover:border-slate-300 dark:hover:border-zinc-700 transition-all flex flex-col justify-between group"
                >
                  <div>
                    {/* Header: Avatar + User Name + Actions */}
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex items-start gap-3 min-w-0">
                        <div
                          className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${u.avatarStyle.bg} flex items-center justify-center font-black text-sm text-white shrink-0 group-hover:scale-105 transition-transform shadow-xs`}
                        >
                          {getInitials(u.full_name || u.email)}
                        </div>
                        <div className="min-w-0">
                          <h3
                            onClick={() => navigate(`/usuarios/editar/${u.id}`)}
                            className="font-extrabold text-slate-900 dark:text-white text-base leading-snug truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors cursor-pointer"
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
                          className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                        >
                          <Pencil size={15} />
                        </button>
                        <button
                          onClick={() => setConfirmDelete(u)}
                          disabled={isSelf}
                          title={isSelf ? 'No puedes eliminar tu propia cuenta' : 'Eliminar usuario'}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-zinc-800 transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
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
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-black bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800">
                          <ShieldCheck size={13} /> Admin
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-black bg-purple-50 text-purple-700 border border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800">
                          <User size={13} /> Empleado
                        </span>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={(e) => toggleActive(u, e)}
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        u.active !== false
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800 hover:bg-emerald-100'
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
          5. PLAN LIMIT MODAL (IF REACHED ON FREE TIER)
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
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition cursor-pointer"
            >
              <Sparkles size={13} className="text-amber-300" />
              <span>Ver Planes Pro</span>
              <ArrowRight size={13} />
            </Link>
          </div>
        </div>
      </Modal>

      {/* ═════════════════════════════════════════════════════════
          6. CONFIRM DELETE MODAL
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
