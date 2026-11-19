import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import {
  UserCog, Plus, Pencil, Trash2, Search, X, ShieldCheck, User,
  Mail, Lock, ToggleLeft, ToggleRight, Check, FileSpreadsheet,
  ArrowUpDown, LayoutGrid, List, AlertCircle, CheckCircle2,
  Sparkles, Crown, ArrowRight, ShieldAlert, Key, Home, TrendingUp,
  BarChart2, PieChart, Shield, RefreshCw, Copy, Award, CheckCircle, Users as UsersIcon,
  FileText, CheckSquare, XCircle, Eye
} from 'lucide-react'
import AppLayout from '../components/layout/AppLayout'
import Modal from '../components/ui/Modal'
import EmptyState from '../components/ui/EmptyState'
import { usersService } from '../services/usersService'
import { companySettingsService } from '../services/companySettingsService'
import { getLimits } from '../lib/planLimits'
import { useAuth } from '../context/AuthContext'
import { getDisplayUserName } from '../lib/userDisplay'

const AVATAR_PALETTES = [
  { bg: 'from-blue-600 to-indigo-700', text: 'text-white' },
  { bg: 'from-emerald-600 to-teal-700', text: 'text-white' },
  { bg: 'from-violet-600 to-purple-700', text: 'text-white' },
  { bg: 'from-amber-500 to-orange-600', text: 'text-white' },
  { bg: 'from-rose-500 to-pink-600', text: 'text-white' },
  { bg: 'from-cyan-600 to-blue-600', text: 'text-white' },
]

const RBAC_MODULES = [
  {
    module: 'Plataforma SaaS & Planes',
    description: 'Gestión global de planes Free / Pro / Enterprise, vencimientos y cobros',
    superAdmin: { access: 'Control Total', type: 'full', detail: 'Aprobar, cambiar planes y vigencias de todas las empresas' },
    admin: { access: 'Solo Solicitud', type: 'partial', detail: 'Solicitar cambio a Plan Pro y adjuntar comprobante' },
    empleado: { access: 'Bloqueado', type: 'none', detail: 'Sin visibilidad ni acceso a planes de suscripción' }
  },
  {
    module: 'Gestión de Empresas & RUC',
    description: 'Alta de empresas, identidad comercial, datos tributarios SUNAT y logotipo',
    superAdmin: { access: 'Control Global', type: 'full', detail: 'Supervisar, activar o suspender cualquier empresa' },
    admin: { access: 'Gestión Propia', type: 'full', detail: 'Configurar RUC, logo, dirección fiscal y datos de su empresa' },
    empleado: { access: 'Bloqueado', type: 'none', detail: 'Solo visualización informativa en boletas de venta' }
  },
  {
    module: 'Usuarios & Colaboradores',
    description: 'Creación de cuentas, asignación de roles, activación y desvinculación',
    superAdmin: { access: 'Auditoría Maestra', type: 'full', detail: 'Auditoría global de accesos y seguridad multiempresa' },
    admin: { access: 'Gestión de Equipo', type: 'full', detail: 'Crear colaboradores, activar/inactivar y desvincular de su empresa' },
    empleado: { access: 'Bloqueado', type: 'none', detail: 'No puede ver configuración de usuarios ni cambiar roles' }
  },
  {
    module: 'Punto de Venta (POS) & Ventas',
    description: 'Caja diaria, emisión de boletas/facturas, cobranzas y clientes',
    superAdmin: { access: 'Auditoría Global', type: 'view', detail: 'Lectura de transacciones de plataforma' },
    admin: { access: 'Control Total', type: 'full', detail: 'Emisión, anulaciones, ventas a crédito y arqueos de caja' },
    empleado: { access: 'Operativo POS', type: 'full', detail: 'Registro de ventas, consulta de catálogo y emisión rápida' }
  },
  {
    module: 'Compras & Proveedores',
    description: 'Órdenes de compra a proveedores, costos de adquisición y abastecimiento',
    superAdmin: { access: 'Auditoría Global', type: 'view', detail: 'Inspección de abastecimiento global' },
    admin: { access: 'Control Total', type: 'full', detail: 'Registrar compras, recibir stock y administrar proveedores' },
    empleado: { access: 'Bloqueado', type: 'none', detail: 'Oculto: no puede ver precios de compra ni proveedores' }
  },
  {
    module: 'Inventario & Libro Kardex',
    description: 'Control de existencias, ajustes de stock (+/-), mermas y alertas',
    superAdmin: { access: 'Auditoría Global', type: 'view', detail: 'Supervisión de almacenes y kardex' },
    admin: { access: 'Control Total', type: 'full', detail: 'Ajustes de stock (+/-), mermas, edición de costos y alertas mínimas' },
    empleado: { access: 'Solo Consulta', type: 'view', detail: 'Consulta de existencias disponibles al realizar ventas' }
  },
  {
    module: 'Finanzas, Márgenes & Reportes',
    description: 'Utilidad neta, margen comercial, reportes ejecutivos e ingresos',
    superAdmin: { access: 'Métricas SaaS', type: 'full', detail: 'Ingresos globales y analítica de empresas activas' },
    admin: { access: 'Control Total', type: 'full', detail: 'Reportes de utilidad neta, costos, balance y auditoría' },
    empleado: { access: 'Bloqueado', type: 'none', detail: 'Oculto: sin acceso a márgenes ni reportes financieros' }
  },
  {
    module: 'Configuración Fiscal & Pagos',
    description: 'Cuentas bancarias, QR Yape / Plin y formato de boleta térmica',
    superAdmin: { access: 'Administración Central', type: 'full', detail: 'Configuración de pasarelas del sistema' },
    admin: { access: 'Configuración Propia', type: 'full', detail: 'Carga de QR de cobro, números Yape/Plin y pie de boleta' },
    empleado: { access: 'Bloqueado', type: 'none', detail: 'Sin permisos de modificación de datos de cobro' }
  }
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
  const [segmentFilter, setSegmentFilter] = useState('ALL') // 'ALL' | 'SUPERADMIN' | 'ADMIN' | 'EMPLEADO' | 'ACTIVE' | 'INACTIVE'
  const [sortBy, setSortBy] = useState('name') // 'name' | 'role' | 'status'
  const [viewMode, setViewMode] = useState('table') // 'table' | 'grid'
  const [showMetrics, setShowMetrics] = useState(true)
  const [chartPeriod, setChartPeriod] = useState('6MONTHS')
  const [copiedEmail, setCopiedEmail] = useState(null)
  const [rbacModalOpen, setRbacModalOpen] = useState(false)

  // Limits Modal
  const [limitModalOpen, setLimitModalOpen] = useState(false)
  const [limitMessage, setLimitMessage] = useState('')

  // Delete modal & error banners
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState('')
  const [actionError, setActionError] = useState('')

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

  async function loadAll(options = {}) {
    if (!usersService.hasCache?.() && !options?.silent) setLoading(true)
    const safetyTimer = setTimeout(() => {
      setLoading(false)
    }, 2500)

    try {
      const [usersList, comp] = await Promise.all([
        usersService.list(options).catch(() => []),
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
    const superAdminCount = users.filter((u) => u.role === 'superadmin' || u.is_platform_admin).length
    const adminCount = users.filter((u) => u.role === 'admin' && !u.is_platform_admin).length
    const employeeCount = users.filter((u) => u.role !== 'admin' && u.role !== 'superadmin' && !u.is_platform_admin).length
    const activeCount = users.filter((u) => u.active !== false).length
    const inactiveCount = totalUsers - activeCount

    const limits = getLimits(company)
    const maxUsers = limits.maxUsers

    return {
      totalUsers,
      superAdminCount,
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
    const pctSuperAdmin = Math.round((stats.superAdminCount / total) * 100)
    const pctAdmin = Math.round((stats.adminCount / total) * 100)
    const pctEmployee = Math.round((stats.employeeCount / total) * 100)
    const pctInactive = Math.max(0, 100 - pctSuperAdmin - pctAdmin - pctEmployee)

    const C = 2 * Math.PI * 40 // ~251.32
    const superStroke = (pctSuperAdmin / 100) * C
    const adminStroke = (pctAdmin / 100) * C
    const empStroke = (pctEmployee / 100) * C
    const inactStroke = (pctInactive / 100) * C

    return {
      pctSuperAdmin,
      pctAdmin,
      pctEmployee,
      pctInactive,
      C,
      superStroke,
      adminStroke,
      empStroke,
      inactStroke
    }
  }, [stats])

  /* ─── Monthly Access & Team Growth Chart (Spline Curve) ─── */
  const monthlyChartData = useMemo(() => {
    const months = ['Ago', 'Set', 'Oct', 'Nov', 'Dic', 'Ene']
    const totals = [0, 0, 0, 0, 0, 0]

    users.forEach((u) => {
      if (u.created_at) {
        const d = new Date(u.created_at)
        const mIdx = d.getMonth()
        const mappedIdx = (mIdx + 6) % 6
        if (mappedIdx >= 0 && mappedIdx < totals.length) {
          totals[mappedIdx] += 1
        }
      } else {
        totals[totals.length - 1] += 1
      }
    })

    let cumulative = 0
    return months.map((m, i) => {
      cumulative += totals[i] || (i === months.length - 1 ? users.length : Math.max(1, Math.floor((users.length * (i + 1)) / months.length)))
      return { month: m, amount: Math.min(cumulative, Math.max(users.length, 1)) }
    })
  }, [users])

  const maxChartVal = useMemo(() => {
    const max = Math.max(...monthlyChartData.map((d) => d.amount), 0)
    return max > 0 ? Math.ceil(max / 5) * 5 : 10
  }, [monthlyChartData])

  const chartSVG = useMemo(() => {
    const width = 460
    const height = 150
    const paddingLeft = 14
    const paddingRight = 14
    const paddingTop = 20
    const paddingBottom = 25
    const innerW = width - paddingLeft - paddingRight
    const innerH = height - paddingTop - paddingBottom

    const coords = monthlyChartData.map((d, i) => {
      const x = paddingLeft + (i / (monthlyChartData.length - 1)) * innerW
      const y = paddingTop + innerH - (d.amount / maxChartVal) * innerH
      return { x, y, ...d }
    })

    let pathD = ''
    coords.forEach((pt, i) => {
      if (i === 0) {
        pathD += `M ${pt.x} ${pt.y}`
      } else {
        const prev = coords[i - 1]
        const cp1x = prev.x + (pt.x - prev.x) / 2
        const cp1y = prev.y
        const cp2x = prev.x + (pt.x - prev.x) / 2
        const cp2y = pt.y
        pathD += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${pt.x} ${pt.y}`
      }
    })

    const last = coords[coords.length - 1]
    const first = coords[0]
    const areaD = `${pathD} L ${last.x} ${paddingTop + innerH} L ${first.x} ${paddingTop + innerH} Z`

    return { coords, pathD, areaD, width, height, innerH, innerW, paddingTop }
  }, [monthlyChartData, maxChartVal])

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
    setActionError('')
    try {
      const nextActive = u.active === false ? true : false
      await usersService.update(u.id, { active: nextActive })
      setUsers((prev) =>
        prev.map((item) => (item.id === u.id ? { ...item, active: nextActive } : item))
      )
    } catch (err) {
      console.error('Error al alternar estado del usuario:', err)
      setActionError(err?.message || 'No se pudo actualizar el estado del usuario.')
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
    if (segmentFilter === 'SUPERADMIN') {
      result = result.filter((u) => u.role === 'superadmin' || u.is_platform_admin)
    } else if (segmentFilter === 'ADMIN') {
      result = result.filter((u) => u.role === 'admin' && !u.is_platform_admin)
    } else if (segmentFilter === 'EMPLEADO') {
      result = result.filter((u) => u.role !== 'admin' && u.role !== 'superadmin' && !u.is_platform_admin)
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
      u.role === 'superadmin' || u.is_platform_admin ? 'Super Admin' : u.role === 'admin' ? 'Administrador' : 'Empleado',
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
    setDeleteError('')
    setActionError('')
    const removedName = getDisplayUserName(confirmDelete)
    try {
      await usersService.remove(confirmDelete.id)
      setConfirmDelete(null)
      setSuccessToast(`Usuario "${removedName}" desvinculado y eliminado de tu empresa.`)
      await loadAll({ forceRefresh: true })
    } catch (err) {
      console.error(err)
      setDeleteError(err?.message || 'No se pudo quitar al usuario de tu empresa.')
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

        {actionError && (
          <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-900 dark:text-rose-200 text-xs sm:text-sm font-semibold flex items-center justify-between gap-3 shadow-xs animate-slide-up">
            <div className="flex items-center gap-2.5">
              <AlertCircle size={18} className="text-rose-600 dark:text-rose-400 shrink-0" />
              <span>{actionError}</span>
            </div>
            <button
              onClick={() => setActionError('')}
              className="text-rose-600 dark:text-rose-400 hover:text-rose-800 p-1 cursor-pointer"
            >
              <X size={15} />
            </button>
          </div>
        )}

        {/* ═════════════════════════════════════════════════════════
            0. TOP EXECUTIVE HEADER TOOLBAR & BREADCRUMB
           ═════════════════════════════════════════════════════════ */}
        <div className="space-y-3">
          {/* Breadcrumb */}
          <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider">
            <Home size={12} className="text-slate-400" />
            <span>/</span>
            <span>MÓDULO DE ADMINISTRACIÓN</span>
            <span>/</span>
            <span>CONTROL DE ACCESO</span>
            <span>/</span>
            <span className="text-[#1B4FD8] dark:text-blue-400">EQUIPO & USUARIOS</span>
          </div>

          {/* Title & Actions Row */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-2xl sm:text-[26px] font-black text-slate-900 dark:text-white tracking-tight">
                  Equipo y Permisos de Acceso
                </h1>
                <span className="hidden sm:inline-flex items-center gap-1.5 text-[11px] font-mono font-bold px-2.5 py-0.5 rounded-full bg-blue-50 text-[#1B4FD8] dark:bg-blue-950/40 dark:text-blue-300 border border-blue-200/80 dark:border-blue-900/40">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#1B4FD8] animate-pulse" />
                  {users.length} CUENTAS AUDITADAS
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-zinc-400 mt-0.5">
                Controla los colaboradores de tu empresa, asigna roles de administración o ventas y audita cuentas activas.
              </p>
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
                className="px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:bg-slate-50 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-200 text-xs sm:text-sm font-semibold flex items-center gap-2 transition-colors cursor-pointer shadow-xs"
                title="Descargar directorio de usuarios en Excel / CSV"
              >
                <FileSpreadsheet size={16} className="text-emerald-600 dark:text-emerald-400" />
                <span>Exportar Excel</span>
              </button>

              {/* Primary New User Button */}
              <button
                onClick={handleOpenCreate}
                className="px-4 py-2.5 rounded-xl bg-[#1B4FD8] hover:bg-[#163FBF] active:scale-95 text-white text-xs sm:text-sm font-bold flex items-center gap-2 shadow-md shadow-blue-500/25 transition-all cursor-pointer"
              >
                <Plus size={16} strokeWidth={2.5} />
                <span>+ Nuevo Usuario</span>
              </button>
            </div>
          </div>
        </div>

        {/* ═════════════════════════════════════════════════════════
            1. 4 EXECUTIVE KPIS (SENIOR ENTERPRISE EXACT STANDARD)
           ═════════════════════════════════════════════════════════ */}
        {showMetrics && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-fade-in">

            {/* Card 1: Colaboradores Registrados */}
            <div className="bg-white dark:bg-[#141417] rounded-xl border border-slate-200/90 dark:border-zinc-800/90 p-4 shadow-2xs hover:border-slate-300 dark:hover:border-zinc-700 transition-all flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                    <UsersIcon size={13} className="text-[#1B4FD8]" />
                    COLABORADORES REGISTRADOS
                  </span>
                  <span className="text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded bg-blue-50 text-[#1B4FD8] dark:bg-blue-950/40 dark:text-blue-300 border border-blue-200/60 dark:border-blue-900/40">
                    DIRECTORIO RBAC
                  </span>
                </div>
                <div className="text-2xl font-bold font-mono text-slate-900 dark:text-white tracking-tight mt-1">
                  {loading ? '…' : `${stats.totalUsers}`}
                </div>
              </div>

              <div>
                <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-zinc-800 flex items-center justify-between text-[11px] text-slate-500 dark:text-zinc-400">
                  <span className="text-[#1B4FD8] dark:text-blue-400 font-semibold">
                    {stats.maxUsers === Infinity ? 'Plan Pro Ilimitado' : `Límite: ${stats.maxUsers} usuario(s)`}
                  </span>
                  <span className="font-mono text-slate-400">Capacidad equipo</span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-slate-100 dark:bg-zinc-800 overflow-hidden mt-1.5">
                  <div className="h-full rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 w-full" />
                </div>
              </div>
            </div>

            {/* Card 2: Administradores */}
            <div className="bg-white dark:bg-[#141417] rounded-xl border border-slate-200/90 dark:border-zinc-800/90 p-4 shadow-2xs hover:border-slate-300 dark:hover:border-zinc-700 transition-all flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                    <ShieldCheck size={13} className="text-purple-600" />
                    ADMINISTRADORES
                  </span>
                  <span className="text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 border border-purple-200/60 dark:border-purple-900/40">
                    ACCESO SUPREMO
                  </span>
                </div>
                <div className="text-2xl font-bold font-mono text-purple-600 dark:text-purple-400 tracking-tight mt-1">
                  {loading ? '…' : `${stats.adminCount}`}
                </div>
              </div>

              <div>
                <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-zinc-800 flex items-center justify-between text-[11px] text-slate-500 dark:text-zinc-400">
                  <span className="text-purple-600 dark:text-purple-400 font-semibold">
                    Control total del negocio
                  </span>
                  <span className="font-mono text-slate-400">Dueño / Gerencia</span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-slate-100 dark:bg-zinc-800 overflow-hidden mt-1.5">
                  <div className="h-full rounded-full bg-gradient-to-r from-purple-500 to-indigo-500 w-full" />
                </div>
              </div>
            </div>

            {/* Card 3: Vendedores / Empleados */}
            <div className="bg-white dark:bg-[#141417] rounded-xl border border-slate-200/90 dark:border-zinc-800/90 p-4 shadow-2xs hover:border-slate-300 dark:hover:border-zinc-700 transition-all flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                    <User size={13} className="text-emerald-600" />
                    VENDEDORES / EMPLEADOS
                  </span>
                  <span className="text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-900/40">
                    PUNTO DE VENTA
                  </span>
                </div>
                <div className="text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400 tracking-tight mt-1">
                  {loading ? '…' : `${stats.employeeCount}`}
                </div>
              </div>

              <div>
                <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-zinc-800 flex items-center justify-between text-[11px] text-slate-500 dark:text-zinc-400">
                  <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                    Punto de venta y caja
                  </span>
                  <span className="font-mono text-slate-400">Operación diaria</span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-slate-100 dark:bg-zinc-800 overflow-hidden mt-1.5">
                  <div className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 w-full" />
                </div>
              </div>
            </div>

            {/* Card 4: Cuentas Habilitadas */}
            <div className="bg-white dark:bg-[#141417] rounded-xl border border-slate-200/90 dark:border-zinc-800/90 p-4 shadow-2xs hover:border-slate-300 dark:hover:border-zinc-700 transition-all flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                    <Key size={13} className="text-amber-500" />
                    CUENTAS HABILITADAS
                  </span>
                  <span className="text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200/60 dark:border-amber-900/40">
                    ESTADO ACTIVO
                  </span>
                </div>
                <div className="text-2xl font-bold font-mono text-slate-900 dark:text-white tracking-tight mt-1">
                  {loading ? '…' : `${stats.activeCount}`}
                </div>
              </div>

              <div>
                <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-zinc-800 flex items-center justify-between text-[11px] text-slate-500 dark:text-zinc-400">
                  <span className="text-amber-600 dark:text-amber-400 font-semibold">
                    {stats.inactiveCount > 0 ? `${stats.inactiveCount} inactivos` : '100% habilitadas'}
                  </span>
                  <span className="font-mono text-slate-400">Operativo</span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-slate-100 dark:bg-zinc-800 overflow-hidden mt-1.5">
                  <div className="h-full rounded-full bg-gradient-to-r from-amber-500 to-orange-500 w-full" />
                </div>
              </div>
            </div>

          </div>
        )}

        {/* ═════════════════════════════════════════════════════════
            2. MIDDLE SECTION: 3 CARDS (AREA CHART, DONUT, ACCIONES RÁPIDAS)
           ═════════════════════════════════════════════════════════ */}
        {showMetrics && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 animate-fade-in">

            {/* Card 1: Flujo de Acceso & Crecimiento de Equipo (Area Spline Chart) */}
            <div className="lg:col-span-6 xl:col-span-5 bg-white dark:bg-[#141417] rounded-xl border border-slate-200/90 dark:border-zinc-800/90 p-4 shadow-2xs flex flex-col justify-between">
              <div className="flex items-center justify-between gap-3 mb-2">
                <div className="flex items-center gap-2">
                  <BarChart2 size={16} className="text-[#1B4FD8] shrink-0" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-zinc-200">
                    Trazabilidad de Cuentas & Accesos
                  </h3>
                </div>
                <div className="inline-flex items-center bg-slate-50 dark:bg-zinc-800/80 border border-slate-200/80 dark:border-zinc-700 rounded-lg px-2 py-0.5 text-xs">
                  <select
                    value={chartPeriod}
                    onChange={(e) => setChartPeriod(e.target.value)}
                    className="bg-transparent text-[11px] text-slate-600 dark:text-zinc-300 font-semibold outline-none cursor-pointer"
                  >
                    <option value="6MONTHS" className="dark:bg-zinc-900">Últimos 6 meses</option>
                    <option value="30DAYS" className="dark:bg-zinc-900">Últimos 30 días</option>
                    <option value="WEEK" className="dark:bg-zinc-900">Esta semana</option>
                  </select>
                </div>
              </div>

              <div className="relative pt-6 pb-2 w-full">
                <div className="absolute top-0 right-4 flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800/60 text-blue-700 dark:text-blue-300 text-[10.5px] font-bold">
                  <span>Pico: {Math.max(...monthlyChartData.map((d) => d.amount), 0)} cuentas</span>
                  <span className="text-emerald-500 font-extrabold">↑</span>
                </div>

                <svg
                  viewBox={`0 0 ${chartSVG.width} ${chartSVG.height}`}
                  className="w-full h-auto overflow-visible"
                >
                  <defs>
                    <linearGradient id="areaGradientUsers" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#1B4FD8" stopOpacity="0.25" />
                      <stop offset="100%" stopColor="#1B4FD8" stopOpacity="0.0" />
                    </linearGradient>
                  </defs>

                  {[0.25, 0.5, 0.75, 1].map((ratio, idx) => {
                    const y = chartSVG.paddingTop + chartSVG.innerH * (1 - ratio)
                    return (
                      <g key={idx}>
                        <line
                          x1={10}
                          y1={y}
                          x2={chartSVG.width - 10}
                          y2={y}
                          stroke="currentColor"
                          strokeDasharray="4 4"
                          className="text-slate-100 dark:text-zinc-800/80"
                          strokeWidth="1"
                        />
                      </g>
                    )
                  })}

                  <path d={chartSVG.areaD} fill="url(#areaGradientUsers)" />

                  <path
                    d={chartSVG.pathD}
                    fill="none"
                    stroke="#1B4FD8"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                  />

                  {chartSVG.coords.map((pt, idx) => (
                    <g key={idx} className="group cursor-pointer">
                      <circle
                        cx={pt.x}
                        cy={pt.y}
                        r="3.5"
                        fill="#FFFFFF"
                        stroke="#1B4FD8"
                        strokeWidth="2.5"
                        className="transition-all duration-200 group-hover:r-5"
                      />
                      <text
                        x={pt.x}
                        y={chartSVG.height - 4}
                        textAnchor="middle"
                        className="text-[10px] font-bold fill-slate-400 dark:fill-zinc-500"
                      >
                        {pt.month}
                      </text>
                    </g>
                  ))}
                </svg>
              </div>

              <div className="pt-2.5 border-t border-slate-100 dark:border-zinc-800 flex items-center justify-between text-[11px] text-slate-500 dark:text-zinc-400">
                <span>
                  Equipo activo: <strong className="text-slate-700 dark:text-zinc-200 font-mono">{stats.activeCount} colaboradores</strong>
                </span>
                <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Auditoría activa
                </span>
              </div>
            </div>

            {/* Card 2: Distribución de Roles y Accesos (Donut Chart SVG) */}
            <div className="lg:col-span-6 xl:col-span-4 bg-white dark:bg-[#141417] rounded-xl border border-slate-200/90 dark:border-zinc-800/90 p-4 shadow-2xs flex flex-col justify-between">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <PieChart size={16} className="text-[#5550F2] shrink-0" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-zinc-200">
                    Distribución de Roles
                  </h3>
                </div>
                <span className="text-[11px] font-mono text-slate-400">
                  {stats.totalUsers} cuentas registradas
                </span>
              </div>

              <div className="flex items-center justify-center py-2">
                <div className="relative w-36 h-36">
                  <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                    <circle
                      cx="50"
                      cy="50"
                      r="40"
                      fill="transparent"
                      stroke="currentColor"
                      strokeWidth="11"
                      className="text-slate-100 dark:text-zinc-800"
                    />
                    {/* Admins (Purple) */}
                    <circle
                      cx="50"
                      cy="50"
                      r="40"
                      fill="transparent"
                      stroke="#8B5CF6"
                      strokeWidth="11"
                      strokeDasharray={`${donutData.adminStroke} ${donutData.C}`}
                      strokeDashoffset="0"
                      strokeLinecap="round"
                    />
                    {/* Empleados (Emerald) */}
                    <circle
                      cx="50"
                      cy="50"
                      r="40"
                      fill="transparent"
                      stroke="#10B981"
                      strokeWidth="11"
                      strokeDasharray={`${donutData.empStroke} ${donutData.C}`}
                      strokeDashoffset={-donutData.adminStroke}
                      strokeLinecap="round"
                    />
                    {/* Super Admin / Inactivos (Amber/Rose) */}
                    {(donutData.pctSuperAdmin > 0 || donutData.pctInactive > 0) && (
                      <circle
                        cx="50"
                        cy="50"
                        r="40"
                        fill="transparent"
                        stroke="#F59E0B"
                        strokeWidth="11"
                        strokeDasharray={`${(donutData.superStroke + donutData.inactStroke)} ${donutData.C}`}
                        strokeDashoffset={-(donutData.adminStroke + donutData.empStroke)}
                        strokeLinecap="round"
                      />
                    )}
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                    <span className="text-2xl font-black font-mono text-slate-900 dark:text-white leading-none">
                      {stats.totalUsers}
                    </span>
                    <span className="text-[10px] font-bold text-[#1B4FD8] dark:text-blue-400 uppercase tracking-wider mt-0.5">
                      CUENTAS
                    </span>
                  </div>
                </div>
              </div>

              <div className="space-y-1.5 pt-2 border-t border-slate-100 dark:border-zinc-800 text-[11px]">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-purple-500 shrink-0" />
                    <span className="text-slate-600 dark:text-zinc-300 font-medium">Administradores</span>
                  </div>
                  <span className="font-mono font-bold text-slate-800 dark:text-white">
                    {stats.adminCount} ({donutData.pctAdmin}%)
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                    <span className="text-slate-600 dark:text-zinc-300 font-medium">Vendedores / Empleados</span>
                  </div>
                  <span className="font-mono font-bold text-slate-800 dark:text-white">
                    {stats.employeeCount} ({donutData.pctEmployee}%)
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
                    <span className="text-slate-600 dark:text-zinc-300 font-medium">Super Admin / Otros</span>
                  </div>
                  <span className="font-mono font-bold text-slate-800 dark:text-white">
                    {stats.superAdminCount + stats.inactiveCount} ({donutData.pctSuperAdmin + donutData.pctInactive}%)
                  </span>
                </div>
              </div>
            </div>

            {/* Card 3: Acciones Rápidas (Matriz 2x2) */}
            <div className="lg:col-span-12 xl:col-span-3 bg-white dark:bg-[#141417] rounded-xl border border-slate-200/90 dark:border-zinc-800/90 p-4 shadow-2xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Sparkles size={16} className="text-amber-500 shrink-0" />
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-zinc-200">
                      Acciones Rápidas
                    </h3>
                  </div>
                </div>
                <p className="text-[11px] text-slate-400 mb-3">
                  Accesos directos de control de equipo y seguridad.
                </p>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={handleOpenCreate}
                    className="p-2.5 rounded-xl border border-slate-200/80 dark:border-zinc-700 hover:border-blue-500 hover:bg-blue-50/50 dark:hover:bg-blue-950/20 text-left transition-all group cursor-pointer"
                  >
                    <div className="w-6 h-6 rounded-lg bg-blue-50 dark:bg-blue-900/40 text-[#1B4FD8] flex items-center justify-center mb-1 group-hover:scale-110 transition-transform">
                      <Plus size={14} />
                    </div>
                    <p className="text-xs font-bold text-slate-800 dark:text-zinc-200">Nuevo Usuario</p>
                    <p className="text-[10px] text-slate-400">Crear cuenta</p>
                  </button>

                  <button
                    onClick={() => setRbacModalOpen(true)}
                    className="p-2.5 rounded-xl border border-slate-200/80 dark:border-zinc-700 hover:border-purple-500 hover:bg-purple-50/50 dark:hover:bg-purple-950/20 text-left transition-all group cursor-pointer"
                  >
                    <div className="w-6 h-6 rounded-lg bg-purple-50 dark:bg-purple-900/40 text-purple-600 flex items-center justify-center mb-1 group-hover:scale-110 transition-transform">
                      <ShieldCheck size={14} />
                    </div>
                    <p className="text-xs font-bold text-slate-800 dark:text-zinc-200">Matriz RBAC</p>
                    <p className="text-[10px] text-slate-400">Ver permisos</p>
                  </button>

                  <button
                    onClick={handleExportExcel}
                    className="p-2.5 rounded-xl border border-slate-200/80 dark:border-zinc-700 hover:border-emerald-500 hover:bg-emerald-50/50 dark:hover:bg-emerald-950/20 text-left transition-all group cursor-pointer"
                  >
                    <div className="w-6 h-6 rounded-lg bg-emerald-50 dark:bg-emerald-900/40 text-emerald-600 flex items-center justify-center mb-1 group-hover:scale-110 transition-transform">
                      <FileSpreadsheet size={14} />
                    </div>
                    <p className="text-xs font-bold text-slate-800 dark:text-zinc-200">Exportar CSV</p>
                    <p className="text-[10px] text-slate-400">Directorio</p>
                  </button>

                  <button
                    onClick={() => navigate('/actividad-empleados')}
                    className="p-2.5 rounded-xl border border-slate-200/80 dark:border-zinc-700 hover:border-amber-500 hover:bg-amber-50/50 dark:hover:bg-amber-950/20 text-left transition-all group cursor-pointer"
                  >
                    <div className="w-6 h-6 rounded-lg bg-amber-50 dark:bg-amber-900/40 text-amber-600 flex items-center justify-center mb-1 group-hover:scale-110 transition-transform">
                      <UsersIcon size={14} />
                    </div>
                    <p className="text-xs font-bold text-slate-800 dark:text-zinc-200">Auditoría</p>
                    <p className="text-[10px] text-slate-400">Ver actividad</p>
                  </button>
                </div>
              </div>

              <div className="pt-2.5 border-t border-slate-100 dark:border-zinc-800 flex items-center justify-between text-[11px] text-slate-400">
                <span>Políticas RBAC activas</span>
                <span className="font-mono font-bold text-slate-500 dark:text-zinc-400">ERP v2.4</span>
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
                className="w-full bg-slate-50 dark:bg-zinc-800/80 border border-slate-200 dark:border-zinc-700 rounded-xl pl-10 pr-9 py-2.5 text-xs sm:text-sm text-slate-900 dark:text-zinc-100 placeholder:text-slate-400 dark:placeholder:text-zinc-500 focus:bg-white dark:focus:bg-zinc-900 focus:border-[#1B4FD8] focus:ring-2 focus:ring-blue-500/10 transition-all outline-none font-medium"
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
                    ? 'bg-[#1B4FD8] text-white shadow-xs'
                    : 'bg-slate-50 dark:bg-zinc-800 text-slate-600 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-700'
                }`}
              >
                Todos ({users.length})
              </button>
              {stats.superAdminCount > 0 && (
                <button
                  type="button"
                  onClick={() => setSegmentFilter('SUPERADMIN')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                    segmentFilter === 'SUPERADMIN'
                      ? 'bg-amber-600 text-white shadow-xs'
                      : 'bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/40'
                  }`}
                >
                  Super Admin ({stats.superAdminCount})
                </button>
              )}
              <button
                type="button"
                onClick={() => setSegmentFilter('ADMIN')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                  segmentFilter === 'ADMIN'
                    ? 'bg-[#1B4FD8] text-white shadow-xs'
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
                    ? 'bg-[#1B4FD8] text-white shadow-xs'
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
                    ? 'bg-[#1B4FD8] text-white shadow-xs'
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
                      ? 'bg-white dark:bg-zinc-700 text-[#1B4FD8] dark:text-white shadow-xs font-bold'
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
                      ? 'bg-white dark:bg-zinc-700 text-[#1B4FD8] dark:text-white shadow-xs font-bold'
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
                                <span>{getDisplayUserName(u)}</span>
                                {isSelf && (
                                  <span className="text-[10px] font-extrabold px-1.5 py-0.5 bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 rounded-md">
                                    Tú
                                  </span>
                                )}
                                {u.is_platform_admin && (
                                  <span className="text-[10px] font-extrabold px-1.5 py-0.5 bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 rounded-md">
                                    Super Admin
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
                          {u.role === 'superadmin' || u.is_platform_admin ? (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-black bg-amber-50 text-amber-800 border border-amber-300 dark:bg-amber-950/40 dark:text-amber-200 dark:border-amber-700 shadow-xs">
                              <Crown size={13} className="text-amber-600 dark:text-amber-400" /> Super Admin
                            </span>
                          ) : u.role === 'admin' ? (
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
                              onClick={() => { setDeleteError(''); setConfirmDelete(u) }}
                              disabled={isSelf}
                              title={isSelf ? 'No puedes eliminar tu propia cuenta' : 'Quitar usuario de esta empresa'}
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
                            {getDisplayUserName(u)}
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
                          onClick={() => { setDeleteError(''); setConfirmDelete(u) }}
                          disabled={isSelf}
                          title={isSelf ? 'No puedes eliminar tu propia cuenta' : 'Quitar usuario de esta empresa'}
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
                      {u.role === 'superadmin' || u.is_platform_admin ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-black bg-amber-50 text-amber-800 border border-amber-300 dark:bg-amber-950/40 dark:text-amber-200 dark:border-amber-700">
                          <Crown size={13} className="text-amber-600 dark:text-amber-400" /> Super Admin
                        </span>
                      ) : u.role === 'admin' ? (
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
        onClose={() => { setDeleteError(''); setConfirmDelete(null) }}
        title="Quitar / Eliminar Usuario"
        width="max-w-md"
      >
        {confirmDelete && (
          <div className="space-y-4">
            <p className="text-sm text-slate-600 dark:text-zinc-300 break-words">
              ¿Estás seguro de que deseas quitar de tu empresa a{' '}
              <strong className="text-slate-900 dark:text-zinc-100">{getDisplayUserName(confirmDelete)}</strong>{' '}
              <span className="text-xs font-mono text-slate-400 break-all">({confirmDelete.email})</span>?
            </p>

            <div className="flex items-start gap-2 text-xs text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-xl p-3">
              <ShieldAlert size={16} className="shrink-0 mt-0.5" />
              <span className="min-w-0 break-words">
                Esta acción desvinculará de inmediato a este usuario y revocará su acceso a tu empresa.
              </span>
            </div>

            {deleteError && (
              <div className="flex items-start gap-2 text-xs text-rose-800 dark:text-rose-300 bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 rounded-xl p-3">
                <AlertCircle size={16} className="shrink-0 mt-0.5 text-rose-600 dark:text-rose-400" />
                <span className="min-w-0 flex-1 font-semibold leading-relaxed break-words">{deleteError}</span>
              </div>
            )}

            <div className="flex justify-end gap-2.5 pt-2">
              <button
                onClick={() => { setDeleteError(''); setConfirmDelete(null) }}
                className="btn-secondary"
              >
                Cancelar
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="btn-danger"
              >
                {deleting ? 'Quitando…' : 'Quitar Usuario'}
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* ═════════════════════════════════════════════════════════
          7. FULL RBAC MATRIX BREAKDOWN MODAL (3 ROLES)
         ═════════════════════════════════════════════════════════ */}
      <Modal
        open={rbacModalOpen}
        onClose={() => setRbacModalOpen(false)}
        title="Matriz Completa de Seguridad & Privilegios RBAC"
        width="max-w-4xl"
      >
        <div className="space-y-4">
          {/* Header Explanatory Banner */}
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-zinc-800/60 border border-slate-200/80 dark:border-zinc-700/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                <Shield size={20} />
              </div>
              <div>
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white">
                  Jerarquía de Roles de Seguridad (3 Niveles)
                </h4>
                <p className="text-[11.5px] text-slate-500 dark:text-zinc-400 mt-0.5">
                  Separación estricta de responsabilidades protegida con Row-Level Security (RLS) en base de datos.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 border border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-700">
                Super Admin
              </span>
              <span className="text-slate-300 dark:text-zinc-600">&gt;</span>
              <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-purple-100 text-purple-900 border border-purple-300 dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-700">
                Administrador
              </span>
              <span className="text-slate-300 dark:text-zinc-600">&gt;</span>
              <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-900 border border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-700">
                Empleado
              </span>
            </div>
          </div>

          {/* Matrix Table */}
          <div className="border border-slate-200 dark:border-zinc-800 rounded-2xl overflow-hidden max-h-[60vh] overflow-y-auto no-scrollbar shadow-xs">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="sticky top-0 z-10 bg-slate-100/95 dark:bg-zinc-800/95 backdrop-blur-sm border-b border-slate-200 dark:border-zinc-700">
                <tr className="text-[11px] font-extrabold uppercase tracking-wider text-slate-600 dark:text-zinc-300">
                  <th className="py-3 px-3.5 sm:w-1/4">Módulo ERP</th>
                  <th className="py-3 px-3.5 sm:w-1/4 text-amber-700 dark:text-amber-400">
                    <span className="inline-flex items-center gap-1">
                      <Crown size={12} /> Super Admin
                    </span>
                  </th>
                  <th className="py-3 px-3.5 sm:w-1/4 text-purple-700 dark:text-purple-400">
                    <span className="inline-flex items-center gap-1">
                      <ShieldCheck size={12} /> Administrador
                    </span>
                  </th>
                  <th className="py-3 px-3.5 sm:w-1/4 text-emerald-700 dark:text-emerald-400">
                    <span className="inline-flex items-center gap-1">
                      <User size={12} /> Empleado / Ventas
                    </span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-zinc-800 bg-white dark:bg-[#141417]">
                {RBAC_MODULES.map((item, idx) => {
                  const renderBadge = (roleData) => {
                    const isFull = roleData.type === 'full'
                    const isPartial = roleData.type === 'partial'
                    const isView = roleData.type === 'view'
                    const isNone = roleData.type === 'none'

                    let badgeClasses = 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-zinc-800 dark:text-zinc-300'
                    let IconComponent = CheckCircle2

                    if (isFull) {
                      badgeClasses = 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
                      IconComponent = CheckCircle2
                    } else if (isPartial || isView) {
                      badgeClasses = 'bg-blue-50 text-blue-800 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800'
                      IconComponent = Eye
                    } else if (isNone) {
                      badgeClasses = 'bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800'
                      IconComponent = XCircle
                    }

                    return (
                      <div className="space-y-1">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10.5px] font-extrabold border ${badgeClasses}`}>
                          <IconComponent size={11} />
                          <span>{roleData.access}</span>
                        </span>
                        <p className="text-[11px] text-slate-600 dark:text-zinc-400 leading-snug">
                          {roleData.detail}
                        </p>
                      </div>
                    )
                  }

                  return (
                    <tr
                      key={item.module}
                      className={idx % 2 === 0 ? 'bg-transparent' : 'bg-slate-50/40 dark:bg-zinc-900/30'}
                    >
                      <td className="py-3 px-3.5 align-top font-bold text-slate-900 dark:text-white">
                        <div className="font-extrabold">{item.module}</div>
                        <div className="text-[10.5px] font-normal text-slate-400 dark:text-zinc-500 mt-0.5 leading-tight">
                          {item.description}
                        </div>
                      </td>
                      <td className="py-3 px-3.5 align-top">
                        {renderBadge(item.superAdmin)}
                      </td>
                      <td className="py-3 px-3.5 align-top">
                        {renderBadge(item.admin)}
                      </td>
                      <td className="py-3 px-3.5 align-top">
                        {renderBadge(item.empleado)}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Footer Controls */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-2.5 pt-2 border-t border-slate-100 dark:border-zinc-800 text-xs">
            <span className="text-slate-400 dark:text-zinc-500 text-[11px]">
              Los roles solo pueden ser modificados por un Administrador de la empresa o Superadmin.
            </span>
            <button
              type="button"
              onClick={() => setRbacModalOpen(false)}
              className="px-4 py-2 rounded-xl bg-slate-900 dark:bg-zinc-100 hover:bg-slate-800 dark:hover:bg-zinc-200 text-white dark:text-zinc-900 text-xs font-bold transition cursor-pointer shrink-0"
            >
              Entendido / Cerrar
            </button>
          </div>
        </div>
      </Modal>

    </AppLayout>
  )
}
