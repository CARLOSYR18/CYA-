import { useEffect, useMemo, useState, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  ArrowLeft, ArrowRight, SlidersHorizontal, Plus, AlertTriangle, Calendar, Clock,
  Wallet, ArrowUpRight, ArrowDownRight, Search, ChevronDown, MoreVertical,
  LayoutGrid, Paperclip, CheckCircle2, Eye, RefreshCw, FileText,
  Receipt, ShoppingBag, Bell, Settings, DollarSign, X, Check, CheckCheck, ExternalLink,
  ChevronRight, Sun, Moon, LogOut, Menu, User, Users, Boxes, TrendingUp, QrCode, Package
} from 'lucide-react'
import AppLayout, { useLayout } from '../components/layout/AppLayout'
import ReceiptModal from '../components/Receipt'
import PaymentQrModal from '../components/PaymentQrModal'
import { DashboardKpiSkeleton, DashboardSalesMasterSkeleton, DashboardAnalyticsSkeleton, Skeleton } from '../components/ui/Skeleton'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import { productsService } from '../services/productsService'
import { salesService } from '../services/salesService'
import { categoriesService } from '../services/categoriesService'
import { clientsService } from '../services/clientsService'
import { purchasesService } from '../services/purchasesService'
import { companySettingsService } from '../services/companySettingsService'
import { paymentMethodsService } from '../services/paymentMethodsService'
import { inventoryMovementsService } from '../services/inventoryMovementsService'
import { getNotifications, markNotificationAsRead, markAllNotificationsAsRead, unmarkNotificationAsRead } from '../lib/notifications'
import DashboardAnalytics from '../components/DashboardAnalytics'

/* ═════════════════════════════════════════════════════════════
   CYA STORE ERP — DASHBOARD CON DATOS Y LÓGICA 100% REALES
   ═════════════════════════════════════════════════════════════ */

// ─── Wrapper: renderiza AppLayout → luego DashboardContent ya DENTRO del Provider ───
export default function Dashboard() {
  return (
    <AppLayout title="Control de Ventas & Facturación" noTopbar={true}>
      <DashboardContent />
    </AppLayout>
  )
}

// ─── Contenido real del Dashboard (usa useLayout() YA dentro del LayoutContext.Provider) ───
function DashboardContent() {
  const navigate = useNavigate()
  const { user, logout, requestLogout, isPlatformAdmin } = useAuth()
  const { isDark, toggleTheme } = useTheme()
  const { openSidebar } = useLayout()

  // ERP Backend States
  const [products, setProducts] = useState(() => productsService.getCached?.() || [])
  const [sales, setSales] = useState(() => salesService.getCached?.() || [])
  const [categories, setCategories] = useState(() => categoriesService.getCached?.() || [])
  const [clients, setClients] = useState(() => clientsService.getCached?.() || [])
  const [movements, setMovements] = useState(() => inventoryMovementsService.getCached?.() || [])
  const [company, setCompany] = useState(() => companySettingsService.getCached?.(user?.company_id))
  const [logoError, setLogoError] = useState(false)
  const [loading, setLoading] = useState(() => !salesService.hasCache?.() && !productsService.hasCache?.())

  useEffect(() => {
    setLogoError(false)
  }, [company?.logo_url])

  useEffect(() => {
    const cached = companySettingsService.getCached?.(user?.company_id)
    if (cached) setCompany(cached)
    else if (!user?.company_id) setCompany(null)
    companySettingsService.get().then(c => {
      if (c) setCompany(c)
    }).catch(() => {})
    const handleCompanyUpdate = (e) => {
      if (e.detail) setCompany(e.detail)
      else if (e.detail === null) setCompany(null)
    }
    window.addEventListener('cya_company_updated', handleCompanyUpdate)
    return () => window.removeEventListener('cya_company_updated', handleCompanyUpdate)
  }, [user?.company_id])

  // Interactive UI States (Default: Sol Peruano 'S/')
  const [currency, setCurrency] = useState(() => {
    try {
      return localStorage.getItem('dashboard_currency') || 'S/'
    } catch {
      return 'S/'
    }
  })

  const toggleCurrency = () => {
    setCurrency(prev => {
      const next = prev === 'S/' ? '$' : 'S/'
      try {
        localStorage.setItem('dashboard_currency', next)
      } catch {}
      return next
    })
  }
  const [selectedInvoiceId, setSelectedInvoiceId] = useState('1003')
  const [activeTab, setActiveTab] = useState('all') // 'all' | 'draft' | 'unpaid' | 'paid'
  const [activePaymentMethod, setActivePaymentMethod] = useState('stripe') // 'visa' | 'stripe' | 'paypal'
  const [searchInvoice, setSearchInvoice] = useState('')
  const [selectedCustomerFilter, setSelectedCustomerFilter] = useState('ALL')
  const [customerDropdownOpen, setCustomerDropdownOpen] = useState(false)
  const [statusDropdownOpen, setStatusDropdownOpen] = useState(false)
  const [selectedStatusFilter, setSelectedStatusFilter] = useState('ALL')

  // Topbar Dropdowns
  const [userDropdownOpen, setUserDropdownOpen] = useState(false)
  const [notifDropdownOpen, setNotifDropdownOpen] = useState(false)
  const [notifications, setNotifications] = useState([])
  const userMenuRef = useRef(null)
  const notifMenuRef = useRef(null)
  const userMenuRefMobile = useRef(null)
  const notifMenuRefMobile = useRef(null)

  // Modals & Action States
  const [receiptOpen, setReceiptOpen] = useState(false)
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [addItemModalOpen, setAddItemModalOpen] = useState(false)
  const [payoutSuccess, setPayoutSuccess] = useState(false)

  // QR Modal States
  const [qrModalMethod, setQrModalMethod] = useState(null)
  const [qrModalAmount, setQrModalAmount] = useState(0)
  const [paymentConfig, setPaymentConfig] = useState(() => paymentMethodsService.get())

  useEffect(() => {
    const handlePayUpdate = (e) => setPaymentConfig(e.detail)
    window.addEventListener('cya-payment-methods-updated', handlePayUpdate)
    return () => window.removeEventListener('cya-payment-methods-updated', handlePayUpdate)
  }, [])

  // New Item Input State
  const [newItemName, setNewItemName] = useState('')
  const [newItemPrice, setNewItemPrice] = useState('')

  // New Invoice State
  const [newInvClient, setNewInvClient] = useState('')
  const [newInvAmount, setNewInvAmount] = useState('')
  const [newInvService, setNewInvService] = useState('')

  // Local state copy of invoices — solo ventas reales del ERP
  const [invoiceList, setInvoiceList] = useState([])

  const companyId = user?.company_id || 'default'

  // Fetch notifications with real-time sync across components
  const refreshNotifs = () => {
    getNotifications(companyId).then(list => setNotifications(list || [])).catch(() => {})
  }

  useEffect(() => {
    refreshNotifs()
    const handleUpdate = () => refreshNotifs()
    window.addEventListener('cya_notifications_updated', handleUpdate)
    return () => window.removeEventListener('cya_notifications_updated', handleUpdate)
  }, [companyId])

  const unreadCount = useMemo(() => {
    return notifications.filter(n => !n.isRead).length
  }, [notifications])

  const handleMarkAllRead = (e) => {
    e?.stopPropagation()
    const allIds = notifications.map(n => n.id)
    markAllNotificationsAsRead(allIds, companyId)
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })))
  }

  const handleToggleRead = (id, currentIsRead) => {
    if (currentIsRead) {
      unmarkNotificationAsRead(id, companyId)
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: false } : n))
    } else {
      markNotificationAsRead(id, companyId)
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n))
    }
  }

  const handleItemClick = (n) => {
    markNotificationAsRead(n.id, companyId)
    setNotifications(prev => prev.map(item => item.id === n.id ? { ...item, isRead: true } : item))
    setNotifDropdownOpen(false)
    if (n.link) navigate(n.link)
  }

  // Close menus on outside click or touch
  useEffect(() => {
    const handleOutside = (e) => {
      const clickedUser = (userMenuRef.current && userMenuRef.current.contains(e.target)) ||
                          (userMenuRefMobile.current && userMenuRefMobile.current.contains(e.target))
      if (!clickedUser) {
        setUserDropdownOpen(false)
      }
      const clickedNotif = (notifMenuRef.current && notifMenuRef.current.contains(e.target)) ||
                           (notifMenuRefMobile.current && notifMenuRefMobile.current.contains(e.target))
      if (!clickedNotif) {
        setNotifDropdownOpen(false)
      }
    }
    document.addEventListener('click', handleOutside)
    return () => {
      document.removeEventListener('click', handleOutside)
    }
  }, [])

  // Fetch real ERP data
  const [refreshing, setRefreshing] = useState(false)

  const handleRefresh = async () => {
    setRefreshing(true)
    try {
      await loadData(true)
      const notifs = await getNotifications(companyId).catch(() => [])
      setNotifications(notifs || [])
    } finally {
      setTimeout(() => setRefreshing(false), 550)
    }
  }

  const loadData = async (force = false) => {
    if (force || (!salesService.hasCache?.() && !productsService.hasCache?.())) {
      setLoading(true)
    }
    const safetyTimer = setTimeout(() => {
      setLoading(false)
    }, 12000)
    try {
      const opts = force ? { forceRefresh: true } : {}
      const [p, s, c, cl, co, m] = await Promise.all([
        productsService.list(opts).catch(() => []),
        salesService.list(opts).catch(() => []),
        categoriesService.list(opts).catch(() => []),
        clientsService.list(opts).catch(() => []),
        companySettingsService.get(opts).catch(() => null),
        inventoryMovementsService.list(opts).catch(() => [])
      ])
      setProducts(p || [])
      setSales(s || [])
      setCategories(c || [])
      setClients(cl || [])
      setCompany(co || null)
      setMovements(m || [])

      // Mapear ventas 100% REALES del proyecto
      if (s && s.length > 0) {
        const mapped = s.map((sale, idx) => {
          const clientObj = cl?.find(client => client.id === sale.client_id)
          const clientName = clientObj?.name || sale.client_name || `Cliente #${idx + 1}`
          const total = salesService.saleTotal(sale)
          const items = sale.items && sale.items.length > 0
            ? sale.items.map(it => {
                const prod = p?.find(pr => pr.id === it.product_id)
                const price = (Number(it.unit_price) || 0) * (Number(it.quantity) || 1)
                return {
                  name: prod?.name || 'Producto del Catálogo',
                  price,
                  unit_price: Number(it.unit_price) || 0,
                  qty: Number(it.quantity) || 1
                }
              })
            : [
                { name: 'Venta de Productos / Catálogo', price: total, unit_price: total, qty: 1 }
              ]

          const avatars = ['/avatar-1.jpg', '/avatar-2.jpg', '/avatar-3.jpg', '/avatar-4.jpg', '/avatar-5.jpg']
          const codeFormatted = sale.series && sale.correlative 
            ? `${sale.series}-${sale.correlative}` 
            : `VTA-${String(sale.id).slice(-4).toUpperCase()}`

          const isAnulado = sale.status === 'anulado'
          const isPaid = sale.status === 'pagado'

          return {
            id: String(sale.id),
            code: codeFormatted,
            client_name: clientName,
            client_role: clientObj?.phone || clientObj?.email || 'Cliente Registrado',
            due_text: isAnulado
              ? 'Anulada (Stock devuelto)'
              : isPaid
              ? 'Cobrado / Pagado'
              : (sale.due_date ? `Vence: ${sale.due_date}` : 'Pendiente de cobro'),
            status: isAnulado ? 'Anulada' : isPaid ? 'Pagada' : 'Pendiente',
            amount: total,
            avatar: avatars[idx % avatars.length],
            company: co?.name || 'CYA Store',
            items,
            subtotal: total,
            total,
            balance: isAnulado || isPaid ? 0 : total,
            isReal: true,
            rawSale: sale
          }
        })

        setInvoiceList(mapped)
        setSelectedInvoiceId(prev => mapped.some(m => m.id === prev) ? prev : mapped[0].id)
      } else {
        setInvoiceList([])
      }
    } catch (e) {
      console.error('Error cargando datos del dashboard:', e)
    } finally {
      clearTimeout(safetyTimer)
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [user?.id, user?.company_id])

  // Auto-reintento resiliente para conexiones móviles lentas si los datos iniciales llegaron vacíos
  const [retriedOnce, setRetriedOnce] = useState(false)
  useEffect(() => {
    if (user?.id && !loading && !retriedOnce && products.length === 0 && sales.length === 0) {
      const retryTimer = setTimeout(() => {
        setRetriedOnce(true)
        loadData(true)
      }, 1500)
      return () => clearTimeout(retryTimer)
    }
  }, [user?.id, loading, retriedOnce, products.length, sales.length])

  // Escuchar invalidación de caché para recargar datos de inmediato si el perfil o empresa se actualizó
  useEffect(() => {
    const handleInvalidated = () => {
      loadData(true)
    }
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        loadData(true)
      }
    }
    window.addEventListener('cya_cache_invalidated', handleInvalidated)
    document.addEventListener('visibilitychange', handleVisibility)
    return () => {
      window.removeEventListener('cya_cache_invalidated', handleInvalidated)
      document.removeEventListener('visibilitychange', handleVisibility)
    }
  }, [])

  // Currency Formatter
  const formatMoney = (val) => {
    const num = Number(val) || 0
    const str = num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    return `${currency} ${str}`
  }

  /* ═══════════════════════════════════════════════════════════
     CÁLCULO DE MÉTRICAS REALES SEGÚN CAPTURA 3 DEL PROYECTO
     ═══════════════════════════════════════════════════════════ */

  // 1. Métricas del Mes y Capital en Inventario (100% reales)
  const currentMonthMetrics = useMemo(() => {
    const now = new Date()
    const currentMonthStr = now.toISOString().slice(0, 7) // 'YYYY-MM'

    // Ventas del mes actual (excluyendo ventas anuladas)
    const monthSales = sales.filter(s => s.status !== 'anulado' && s.created_at && s.created_at.startsWith(currentMonthStr))
    const allActiveSales = sales.filter(s => s.status !== 'anulado')

    // Si aún no hay ventas en este mes calendario pero sí existen ventas registradas,
    // usamos el acumulado para reflejar la facturación real
    const activeList = monthSales.length > 0 ? monthSales : allActiveSales
    const facturacionMes = activeList.reduce((acc, s) => acc + salesService.saleTotal(s), 0)
    const ventasMesCount = activeList.length
    const ticketPromedio = ventasMesCount > 0 ? facturacionMes / ventasMesCount : 0

    // Capital en Inventario = sum(cost_price || sale_price * stock)
    const capitalInventario = products.reduce((acc, p) => {
      if (p.is_kit) return acc
      const cost = Number(p.cost_price) || Number(p.sale_price) || 0
      const stock = Number(p.stock) || 0
      return acc + (cost * stock)
    }, 0)

    const totalFisicoUds = products.reduce((acc, p) => {
      if (p.is_kit) return acc
      return acc + (Number(p.stock) || 0)
    }, 0)

    // Control de almacén
    const agotados = products.filter(p => !p.is_kit && (Number(p.stock) || 0) <= 0).length
    const criticos = products.filter(p => !p.is_kit && (Number(p.stock) || 0) > 0 && (Number(p.stock) || 0) <= (Number(p.min_stock) || 5)).length
    const enAlerta = agotados + criticos
    const totalNoKit = products.filter(p => !p.is_kit).length
    const disponibilidadPct = totalNoKit > 0 ? Math.round(((totalNoKit - agotados) / totalNoKit) * 100) : 100

    return {
      facturacionMes,
      ventasMesCount,
      ticketPromedio,
      capitalInventario,
      totalFisicoUds,
      totalSkus: products.length,
      totalCategories: categories.length,
      totalClients: clients.length,
      criticos,
      agotados,
      enAlerta,
      disponibilidadPct
    }
  }, [sales, products, categories, clients])

  // 2. Ventas reales de los últimos 7 días (para las barras y curvas)
  const last7DaysSales = useMemo(() => {
    const days = []
    const today = new Date()
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today)
      d.setDate(today.getDate() - i)
      const dateStr = d.toISOString().slice(0, 10)
      const dayName = d.toLocaleDateString('es-PE', { weekday: 'short' })
      const dayCapitalized = dayName.charAt(0).toUpperCase() + dayName.slice(1, 3)
      const dayNum = d.getDate()

      const daySales = sales.filter(s => s.status !== 'anulado' && s.created_at && s.created_at.slice(0, 10) === dateStr)
      const total = daySales.reduce((acc, s) => acc + salesService.saleTotal(s), 0)

      days.push({
        dateStr,
        label: `${dayCapitalized} ${dayNum}`,
        month: dayCapitalized,
        total,
        count: daySales.length
      })
    }

    // Calcular porcentaje de altura relativa para las 7 barras (máx 100%, mín 12%)
    const maxTotal = Math.max(...days.map(d => d.total), 1)
    return days.map(d => ({
      ...d,
      val: Math.max(Math.round((d.total / maxTotal) * 90), d.total > 0 ? 20 : 8)
    }))
  }, [sales])

  // Filtered invoices according to tab & search
  const filteredInvoices = useMemo(() => {
    let list = [...invoiceList]
    if (activeTab === 'unpaid') {
      list = list.filter(inv => inv.status === 'Pendiente' || (inv.status !== 'Paid' && inv.status !== 'Pagado' && inv.status !== 'Pagada'))
    } else if (activeTab === 'paid') {
      list = list.filter(inv => inv.status === 'Pagada' || inv.status === 'Paid' || inv.status === 'Pagado')
    }
    if (selectedCustomerFilter !== 'ALL') {
      list = list.filter(inv => inv.client_name === selectedCustomerFilter)
    }
    if (selectedStatusFilter !== 'ALL') {
      list = list.filter(inv => {
        const s = (inv.status || '').toLowerCase()
        const f = selectedStatusFilter.toLowerCase()
        if (f === 'pendiente') return s === 'pendiente' || s === 'unsent'
        if (f === 'pagada') return s === 'pagada' || s === 'paid' || s === 'pagado'
        return s === f
      })
    }
    if (searchInvoice.trim()) {
      const q = searchInvoice.toLowerCase().trim()
      list = list.filter(inv =>
        (inv.code && inv.code.toLowerCase().includes(q)) ||
        (inv.client_name && inv.client_name.toLowerCase().includes(q)) ||
        inv.amount.toString().includes(q)
      )
    }
    return list
  }, [invoiceList, activeTab, selectedCustomerFilter, selectedStatusFilter, searchInvoice])

  // Active selected invoice (always synchronized with the filtered list so the active row glows!)
  const currentInvoice = useMemo(() => {
    const foundInFiltered = filteredInvoices.find(inv => String(inv.id) === String(selectedInvoiceId))
    if (foundInFiltered) return foundInFiltered
    return filteredInvoices[0] || invoiceList[0] || null
  }, [selectedInvoiceId, filteredInvoices, invoiceList])

  // 1. Alertas de Stock Reales
  const stockAlerts = useMemo(() => {
    return products
      .filter(p => !p.is_kit)
      .map(p => {
        const stock = Number(p.stock) || 0
        const min = Number(p.min_stock) || 5
        const isOut = stock <= 0
        const isLow = stock <= min
        const cat = categories.find(c => c.id === p.category_id)?.name || 'Sin categoría'
        const pct = Math.min(Math.round((stock / Math.max(min, 1)) * 100), 100)
        return { ...p, stock, min, isOut, isLow, cat, pct }
      })
      .filter(p => p.isLow)
      .sort((a, b) => a.stock - b.stock)
  }, [products, categories])

  // 2. Top Productos Vendidos Reales
  const topProducts = useMemo(() => {
    const map = {}
    sales.forEach(s => {
      s.items?.forEach(it => {
        const pid = it.product_id
        const q = Number(it.quantity) || 1
        const p = Number(it.unit_price) || 0
        if (!map[pid]) map[pid] = { qty: 0, rev: 0 }
        map[pid].qty += q
        map[pid].rev += q * p
      })
    })

    const list = Object.entries(map).map(([pid, data]) => {
      const prod = products.find(pr => pr.id === pid)
      const cat = categories.find(c => c.id === prod?.category_id)?.name || 'Sin categoría'
      return {
        id: pid,
        name: prod?.name || `Producto #${pid}`,
        category: cat,
        qty: data.qty,
        revenue: data.rev
      }
    }).sort((a, b) => b.qty - a.qty)

    return list.slice(0, 5)
  }, [sales, products, categories])

  // 3. Distribución de Stock por Categoría Real
  const categoryDistribution = useMemo(() => {
    const catMap = {}
    let totalUnits = 0

    categories.forEach(c => {
      catMap[c.id] = { id: c.id, name: c.name, units: 0, skuCount: 0 }
    })

    products.forEach(p => {
      const u = Number(p.stock) || 0
      totalUnits += u
      const cid = p.category_id || 'other'
      if (!catMap[cid]) {
        catMap[cid] = { id: cid, name: 'Otros', units: 0, skuCount: 0 }
      }
      catMap[cid].units += u
      catMap[cid].skuCount += 1
    })

    const colors = ['#5550F2', '#818CF8', '#A855F7', '#3B82F6', '#10B981', '#F59E0B']

    return Object.values(catMap)
      .filter(c => c.units > 0 || c.skuCount > 0)
      .sort((a, b) => b.units - a.units)
      .map((c, i) => ({
        ...c,
        color: colors[i % colors.length],
        pct: totalUnits > 0 ? Math.round((c.units / totalUnits) * 100) : 0
      }))
  }, [categories, products])

  const totalInventoryUnits = useMemo(() => {
    return products.reduce((acc, p) => acc + (Number(p.stock) || 0), 0)
  }, [products])

  // Métricas y rendimiento de cartera de clientes (100% real)
  const clientPerformance = useMemo(() => {
    const totalCount = clients.length || 0
    const clientSalesMap = new Map()

    sales.forEach(s => {
      const name = s.client_name || s.client?.name || 'Cliente Ocasional'
      const total = salesService.saleTotal(s)
      if (!clientSalesMap.has(name)) {
        clientSalesMap.set(name, { name, total: 0, orders: 0, lastDate: s.created_at })
      }
      const entry = clientSalesMap.get(name)
      entry.total += total
      entry.orders += 1
    })

    const topList = Array.from(clientSalesMap.values())
      .filter(c => c.name !== 'Cliente Ocasional' && c.name !== 'Venta Directa')
      .sort((a, b) => b.total - a.total)
      .slice(0, 4)

    return {
      totalCount,
      activeBuyers: clientSalesMap.size,
      topList
    }
  }, [clients, sales])

  // Helper para generar gradientes vibrantes estilo Finnova para avatares
  const getClientAvatarGradient = (name = '') => {
    const gradients = [
      'from-indigo-500 to-purple-600',
      'from-blue-600 to-cyan-500',
      'from-violet-600 to-fuchsia-500',
      'from-rose-500 to-pink-600',
      'from-amber-500 to-orange-600',
      'from-emerald-500 to-teal-600',
    ]
    let sum = 0
    for (let i = 0; i < name.length; i++) sum += name.charCodeAt(i)
    return gradients[sum % gradients.length]
  }

  // Action: Marcar como pagada una venta real en la base de datos
  const handleMarkAsPaid = async () => {
    if (!currentInvoice) return
    try {
      if (currentInvoice.rawSale?.id) {
        await salesService.update(currentInvoice.rawSale.id, { status: 'pagado' })
      }
      setPayoutSuccess(true)
      setInvoiceList(prev => prev.map(inv => {
        if (inv.id === currentInvoice.id) {
          return {
            ...inv,
            status: 'Pagada',
            balance: 0,
            due_text: 'Cobrado / Pagado',
            rawSale: { ...(inv.rawSale || {}), status: 'pagado' }
          }
        }
        return inv
      }))
      await loadData()
      setTimeout(() => {
        setPayoutSuccess(false)
      }, 1500)
    } catch (err) {
      console.error('Error al actualizar venta:', err)
    }
  }

  // Action: Add Item to Current Invoice
  const handleAddItem = (e) => {
    e.preventDefault()
    if (!newItemName || !newItemPrice) return
    const price = parseFloat(newItemPrice) || 0
    const newItem = { name: newItemName, price, qty: 1 }

    setInvoiceList(prev => prev.map(inv => {
      if (inv.id === currentInvoice.id) {
        const items = [...(inv.items || []), newItem]
        const subtotal = items.reduce((s, it) => s + (it.price * (it.qty || 1)), 0)
        return {
          ...inv,
          items,
          subtotal,
          total: subtotal,
          balance: inv.status === 'Paid' ? 0 : subtotal,
          amount: subtotal
        }
      }
      return inv
    }))

    setNewItemName('')
    setNewItemPrice('')
    setAddItemModalOpen(false)
  }

  // Action: Create New Invoice
  const handleCreateInvoice = (e) => {
    e.preventDefault()
    if (!newInvClient || !newInvAmount) return
    const num = Math.floor(1000 + Math.random() * 9000)
    const amount = parseFloat(newInvAmount) || 0
    const newInv = {
      id: String(num),
      code: `INV-${num}`,
      client_name: newInvClient,
      client_role: 'Cliente Directo',
      due_text: 'En 7 días',
      status: 'Pendiente',
      amount,
      avatar: '/avatar-1.jpg',
      company: company?.name || 'CYA Store',
      items: [
        { name: newInvService || 'Venta de Productos / Catálogo', price: amount, qty: 1 }
      ],
      subtotal: amount,
      total: amount,
      balance: amount,
    }
    setInvoiceList(prev => [newInv, ...prev])
    setSelectedInvoiceId(newInv.id)
    setNewInvClient('')
    setNewInvAmount('')
    setNewInvService('')
    setCreateModalOpen(false)
  }

  // Helper renderer for Notification Menu (Used for clean desktop & mobile layouts)
  const renderNotifMenu = (isMobile = false) => (
    <div className="relative" ref={isMobile ? notifMenuRefMobile : notifMenuRef}>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          setUserDropdownOpen(false)
          setNotifDropdownOpen(o => !o)
        }}
        className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl border border-slate-200/80 dark:border-white/10 bg-slate-50 dark:bg-white/5 flex items-center justify-center text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 relative transition-all cursor-pointer shadow-2xs"
        title="Notificaciones y alertas"
        aria-label="Notificaciones"
      >
        <Bell size={15} className="shrink-0 pointer-events-none" />
        {unreadCount > 0 && (
          <span className="w-4 h-4 rounded-full bg-rose-500 text-white text-[9px] font-black flex items-center justify-center absolute -top-1 -right-1 ring-2 ring-white dark:ring-[#121420] pointer-events-none">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>
      {notifDropdownOpen && (
        <>
          <div
            className="fixed inset-0 bg-slate-900/30 dark:bg-black/50 backdrop-blur-[2px] z-40 sm:hidden"
            onClick={(e) => {
              e.stopPropagation()
              setNotifDropdownOpen(false)
            }}
          />

          <div
            className="fixed inset-x-3 top-[68px] sm:absolute sm:inset-x-auto sm:right-0 sm:top-full sm:mt-2 w-auto sm:w-88 max-w-sm mx-auto sm:mx-0 bg-white dark:bg-[#1E2038] rounded-2xl shadow-2xl border border-slate-200 dark:border-white/10 p-3 z-50 animate-scale-in"
            style={{ boxShadow: '0 10px 30px rgba(0,0,0,0.12)' }}
          >
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100 dark:border-white/10">
              <div className="flex items-center gap-1.5">
                <p className="text-xs font-bold text-slate-900 dark:text-white">Notificaciones</p>
                {unreadCount > 0 ? (
                  <span className="text-[10px] font-extrabold px-1.5 py-0.2 bg-rose-50 text-rose-600 dark:bg-rose-500/20 dark:text-rose-300 rounded-full font-mono">
                    {unreadCount}
                  </span>
                ) : (
                  <span className="text-[10px] font-bold px-1.5 py-0.2 bg-emerald-50 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-300 rounded-full font-mono">
                    0
                  </span>
                )}
              </div>
              {unreadCount > 0 ? (
                <button
                  type="button"
                  onClick={handleMarkAllRead}
                  className="text-[10.5px] font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:underline flex items-center gap-1 cursor-pointer transition-colors"
                  title="Marcar todas como leídas"
                >
                  <CheckCheck size={13} />
                  <span>Marcar todas leídas</span>
                </button>
              ) : (
                <span className="text-[10px] text-emerald-500 dark:text-emerald-400 font-medium flex items-center gap-1">
                  <Check size={11} strokeWidth={2.5} />
                  <span>Todas leídas</span>
                </span>
              )}
            </div>

            {notifications.length === 0 ? (
              <div className="p-4 text-center">
                <CheckCircle2 size={24} className="text-emerald-500 mx-auto mb-1.5 opacity-80" />
                <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">No hay alertas pendientes</p>
                <p className="text-[10px] text-slate-400 mt-0.5">Inventario y cobros al día</p>
              </div>
            ) : (
              <div className="space-y-1.5 max-h-64 overflow-y-auto">
                {notifications.slice(0, 8).map((n, i) => {
                  const isDanger = n.type === 'danger'
                  const isRead = !!n.isRead
                  return (
                    <div
                      key={n.id || i}
                      onClick={() => handleItemClick(n)}
                      className={`w-full text-left p-2.5 rounded-xl transition-all cursor-pointer group flex items-start gap-2.5 border ${
                        isRead
                          ? 'bg-slate-50/60 dark:bg-white/[0.02] border-slate-100 dark:border-white/5 opacity-70 hover:opacity-100'
                          : 'bg-slate-50 dark:bg-white/5 border-transparent hover:border-blue-200 dark:hover:border-blue-500/30 hover:bg-blue-50/50 dark:hover:bg-blue-900/20'
                      }`}
                    >
                      <span
                        className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${
                          isRead
                            ? 'bg-slate-300 dark:bg-zinc-600'
                            : isDanger
                            ? 'bg-rose-500 animate-pulse'
                            : 'bg-amber-500'
                        }`}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <p className={`text-xs font-bold truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors ${
                            isRead
                              ? 'text-slate-500 dark:text-slate-400 font-medium'
                              : isDanger
                              ? 'text-rose-600 dark:text-rose-400'
                              : 'text-slate-800 dark:text-slate-200'
                          }`}>
                            {n.title}
                          </p>
                          <div className="flex items-center gap-1 shrink-0">
                            <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded ${
                              isRead
                                ? 'bg-slate-100 dark:bg-zinc-800 text-slate-500 dark:text-zinc-400'
                                : isDanger
                                ? 'bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300'
                                : 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300'
                            }`}>
                              {isRead ? 'Leída' : isDanger ? 'Crítico' : 'Atención'}
                            </span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleToggleRead(n.id, isRead)
                              }}
                              title={isRead ? 'Marcar como no leída' : 'Marcar como leída'}
                              className={`p-1 rounded-md transition-colors cursor-pointer ${
                                isRead
                                  ? 'text-slate-400 hover:text-blue-600 hover:bg-slate-200 dark:hover:bg-zinc-700'
                                  : 'text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40'
                              }`}
                            >
                              <Check size={13} strokeWidth={isRead ? 2.5 : 2} className={isRead ? 'text-emerald-500' : 'text-slate-400'} />
                            </button>
                          </div>
                        </div>
                        <p className={`text-[11px] mt-0.5 line-clamp-2 leading-tight ${isRead ? 'text-slate-400 dark:text-zinc-500' : 'text-slate-600 dark:text-slate-300'}`}>
                          {n.message}
                        </p>
                        <span className={`text-[10px] font-medium inline-flex items-center gap-0.5 mt-1 group-hover:underline ${isRead ? 'text-slate-400 dark:text-zinc-500' : 'text-blue-500'}`}>
                          Ir al producto / detalle →
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            <div className="pt-2 mt-2 border-t border-slate-100 dark:border-white/10">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  setNotifDropdownOpen(false)
                  navigate('/notificaciones')
                }}
                className="w-full text-center py-2 text-xs font-bold text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-1.5"
              >
                <span>Ver todas las notificaciones y registro</span>
                <ArrowRight size={13} />
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )

  // Helper renderer for User Profile Dropdown
  const renderUserMenu = (isMobile = false) => (
    <div className="relative" ref={isMobile ? userMenuRefMobile : userMenuRef}>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          setNotifDropdownOpen(false)
          setUserDropdownOpen(o => !o)
        }}
        className="flex items-center cursor-pointer focus:outline-none"
        title="Perfil de usuario"
      >
        <div
          className="company-logo-badge h-8 w-8 sm:h-9 sm:w-9 rounded-xl overflow-hidden ring-2 ring-indigo-500/25 dark:ring-indigo-400/30 hover:ring-indigo-500 transition-all shadow-2xs border border-slate-200/80 dark:border-white/10 flex items-center justify-center p-0.5"
          style={{ backgroundColor: '#ffffff' }}
        >
          {((company?.logo_url && !logoError) || user?.avatar_url) ? (
            <img
              src={(company?.logo_url && !logoError) ? company.logo_url : user.avatar_url}
              alt={company?.name || 'Usuario'}
              className="max-h-full max-w-full w-auto h-auto object-contain"
              onError={(e) => {
                if (company?.logo_url && !logoError) setLogoError(true)
                else e.currentTarget.style.display = 'none'
              }}
            />
          ) : (
            <span className="text-[11px] font-bold text-slate-800 dark:text-white uppercase font-display">
              {company?.name?.charAt(0) || user?.full_name?.charAt(0) || user?.email?.charAt(0).toUpperCase() || 'E'}
            </span>
          )}
        </div>
      </button>
      {userDropdownOpen && (
        <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-[#1E2038] rounded-2xl shadow-2xl border border-slate-200 dark:border-white/10 p-2 z-40">
          <div className="px-3 py-2 border-b border-slate-100 dark:border-white/10 flex items-center gap-2.5">
            {(company?.logo_url || user?.avatar_url) && (
              <div
                className="company-logo-badge h-8 w-8 rounded-xl overflow-hidden ring-1 ring-indigo-500/20 border border-slate-200/80 dark:border-white/10 shrink-0 flex items-center justify-center p-0.5"
                style={{ backgroundColor: '#ffffff' }}
              >
                <img src={company?.logo_url || user?.avatar_url} alt="Logo" className="max-h-full max-w-full w-auto h-auto object-contain" />
              </div>
            )}
            <div className="min-w-0">
              <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                {user?.full_name || company?.name || 'Administrador'}
              </p>
              <p className="text-[11px] text-slate-400 truncate">{user?.email || ''}</p>
            </div>
          </div>
          <div className="pt-1 space-y-0.5">
            <button
              onClick={() => {
                setUserDropdownOpen(false)
                navigate('/perfil')
              }}
              className="w-full text-left px-3 py-1.5 text-xs text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-500/10 rounded-lg flex items-center gap-2 font-medium cursor-pointer"
            >
              <User size={13} /> Mi Perfil y Cuenta
            </button>
            {(user?.role === 'admin' || user?.role === 'superadmin' || isPlatformAdmin) && (
              <button
                onClick={() => {
                  setUserDropdownOpen(false)
                  navigate('/configuracion')
                }}
                className="w-full text-left px-3 py-1.5 text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5 rounded-lg flex items-center gap-2 cursor-pointer"
              >
                <Settings size={13} /> Configuración de Empresa
              </button>
            )}
            <button
              onClick={() => {
                setUserDropdownOpen(false)
                if (requestLogout) requestLogout()
                else logout()
              }}
              className="w-full text-left px-3 py-1.5 text-xs text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg flex items-center gap-2 font-semibold cursor-pointer"
            >
              <LogOut size={13} /> Cerrar Sesión
            </button>
          </div>
        </div>
      )}
    </div>
  )

  return (
    <>
      <div className="finnova-root space-y-4 sm:space-y-6 max-w-[1440px] mx-auto pb-24 sm:pb-16">
        {/* ─── Custom Styles for Executive ERP Design System (Clean Light & Dark Mode) ─── */}
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=IBM+Plex+Mono:wght@500;600;700&display=swap');

          .finnova-root {
            font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif;
          }

          /* Metric KPI Cards (Enterprise Grade) */
          .fn-card {
            background: #ffffff;
            border-radius: 16px;
            border: 1px solid rgba(226, 232, 240, 0.9);
            box-shadow: 0 1px 3px 0 rgba(15, 23, 42, 0.04), 0 4px 16px -2px rgba(15, 23, 42, 0.06);
            padding: 12px;
            min-height: 125px;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
            position: relative;
            overflow: hidden;
          }
          @media (min-width: 640px) {
            .fn-card {
              border-radius: 22px;
              padding: 20px;
              min-height: 195px;
            }
          }
          .fn-card:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 6px -1px rgba(15, 23, 42, 0.06), 0 12px 28px -4px rgba(15, 23, 42, 0.1);
            border-color: #CBD5E1;
          }
          html.dark .fn-card,
          .dark .fn-card {
            background: #121420 !important;
            border: 1px solid rgba(255, 255, 255, 0.08) !important;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.35) !important;
          }
          html.dark .fn-card:hover,
          .dark .fn-card:hover {
            border-color: rgba(255, 255, 255, 0.18) !important;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5) !important;
          }

          /* Filter Pills */
          .fn-filter-pill {
            background: #ffffff;
            border: 1px solid rgba(226, 232, 240, 0.9);
            box-shadow: 0 1px 2px 0 rgba(15, 23, 42, 0.05);
            border-radius: 12px;
            padding: 7px 14px;
            font-size: 12px;
            font-weight: 600;
            color: #334155;
            display: inline-flex;
            align-items: center;
            gap: 8px;
            cursor: pointer;
            transition: all 0.15s;
            white-space: nowrap;
          }
          .fn-filter-pill:hover {
            border-color: #94A3B8;
            color: #0F172A;
            background: #F8FAFC;
            box-shadow: 0 2px 5px 0 rgba(15, 23, 42, 0.08);
          }
          html.dark .fn-filter-pill,
          .dark .fn-filter-pill {
            background: #121420 !important;
            border: 1px solid rgba(255, 255, 255, 0.10) !important;
            color: #E2E8F0 !important;
            box-shadow: none !important;
          }
          html.dark .fn-filter-pill:hover,
          .dark .fn-filter-pill:hover {
            border-color: rgba(255, 255, 255, 0.25) !important;
            color: #ffffff !important;
            background: #181B2E !important;
          }

          /* Operations & Invoicing Master Container (Adaptive Light & Dark) */
          .fn-dark-container {
            background: #ffffff;
            border-radius: 24px;
            padding: 18px 14px;
            box-shadow: 0 1px 3px 0 rgba(15, 23, 42, 0.04), 0 8px 24px -4px rgba(15, 23, 42, 0.06);
            border: 1px solid rgba(226, 232, 240, 0.9);
            transition: all 0.25s;
            color: #0F172A;
          }
          @media (min-width: 640px) {
            .fn-dark-container {
              border-radius: 28px;
              padding: 24px;
            }
          }
          html.dark .fn-dark-container,
          .dark .fn-dark-container {
            background: #121420 !important;
            border: 1px solid rgba(255, 255, 255, 0.08) !important;
            box-shadow: 0 20px 50px -15px rgba(0, 0, 0, 0.5) !important;
            color: #ffffff !important;
          }

          /* Left Invoices List Row */
          .fn-invoice-row {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 12px 14px;
            border-radius: 14px;
            cursor: pointer;
            transition: all 0.15s cubic-bezier(0.16, 1, 0.3, 1);
            color: #1E293B;
            background: #ffffff;
            gap: 10px;
            border: 1px solid #E2E8F0;
          }
          .fn-invoice-row:hover:not(.active) {
            background: #F8FAFC;
            border-color: #CBD5E1;
            transform: translateX(2px);
          }
          .fn-invoice-row.active {
            background: #EEF2FF !important;
            border-color: #818CF8 !important;
            border-left: 4px solid #4F46E5 !important;
            box-shadow: 0 2px 8px 0 rgba(79, 70, 229, 0.12) !important;
          }
          html.dark .fn-invoice-row,
          .dark .fn-invoice-row {
            background: rgba(255, 255, 255, 0.02) !important;
            border: 1px solid rgba(255, 255, 255, 0.06) !important;
            color: #E2E8F0 !important;
          }
          html.dark .fn-invoice-row:hover:not(.active),
          .dark .fn-invoice-row:hover:not(.active) {
            background: rgba(255, 255, 255, 0.05) !important;
            border-color: rgba(255, 255, 255, 0.12) !important;
          }
          html.dark .fn-invoice-row.active,
          .dark .fn-invoice-row.active {
            background: rgba(79, 70, 229, 0.15) !important;
            border-color: rgba(129, 140, 248, 0.5) !important;
            border-left: 4px solid #6366F1 !important;
            box-shadow: 0 4px 18px 0 rgba(0, 0, 0, 0.35) !important;
          }

          /* Right Workspace Detail Card */
          .fn-detail-card {
            background: #F1F5F9;
            border-radius: 20px;
            padding: 20px 18px;
            border: 1px solid #CBD5E1;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            min-height: 380px;
            position: relative;
            overflow: hidden;
            max-width: 100%;
            transition: all 0.25s;
            color: #0F172A;
          }
          @media (min-width: 640px) {
            .fn-detail-card {
              border-radius: 24px;
              padding: 24px;
              min-height: 410px;
            }
          }
          html.dark .fn-detail-card,
          .dark .fn-detail-card {
            background: #181B2E !important;
            border: 1px solid rgba(255, 255, 255, 0.08) !important;
            color: #ffffff !important;
            box-shadow: inset 0 1px 1px rgba(255, 255, 255, 0.05);
          }

          /* Service Item Cards */
          .fn-service-card {
            background: #ffffff;
            border: 1px solid #E2E8F0;
            border-radius: 14px;
            padding: 12px 14px;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            min-height: 80px;
            color: #0F172A;
            transition: all 0.15s cubic-bezier(0.16, 1, 0.3, 1);
          }
          .fn-service-card:hover {
            border-color: #CBD5E1;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.04);
            transform: translateY(-1px);
          }
          html.dark .fn-service-card,
          .dark .fn-service-card {
            background: rgba(255, 255, 255, 0.04) !important;
            border: 1px solid rgba(255, 255, 255, 0.08) !important;
            color: #ffffff !important;
          }
          html.dark .fn-service-card:hover,
          .dark .fn-service-card:hover {
            background: rgba(255, 255, 255, 0.08) !important;
            border-color: rgba(255, 255, 255, 0.20) !important;
          }

          /* Custom Scrollbar */
          .fn-scroll::-webkit-scrollbar {
            width: 5px;
          }
          .fn-scroll::-webkit-scrollbar-track {
            background: transparent;
          }
          .fn-scroll::-webkit-scrollbar-thumb {
            background: rgba(148, 163, 184, 0.3);
            border-radius: 999px;
          }
          html.dark .fn-scroll::-webkit-scrollbar-thumb,
          .dark .fn-scroll::-webkit-scrollbar-thumb {
            background: rgba(255, 255, 255, 0.15);
          }
        `}</style>

        {/* ═══════════════════════════════════════════════════════════
            1. EXECUTIVE COMMAND BAR CARD (Spacious & Commanding)
           ═══════════════════════════════════════════════════════════ */}
        <div className="bg-white dark:bg-[#121420] rounded-2xl sm:rounded-3xl p-3.5 sm:p-6 border border-slate-200/90 dark:border-white/10 shadow-[0_1px_3px_0_rgba(15,23,42,0.04),0_6px_20px_-3px_rgba(15,23,42,0.06)] transition-all">
          {/* Main Top Row: Left has hamburger + logo + identity; Right has bell + avatar on mobile, full control bar on desktop */}
          <div className="flex items-center justify-between gap-3 sm:gap-6">
            
            {/* Left: Hamburger + Logo + Company identity */}
            <div className="flex items-center gap-2.5 sm:gap-4 min-w-0">
              <button
                type="button"
                onClick={openSidebar}
                className="lg:hidden p-2 rounded-xl text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition-colors shrink-0 cursor-pointer"
                title="Abrir menú lateral"
                aria-label="Abrir menú lateral"
              >
                <Menu size={20} />
              </button>

              <div
                className={`h-10 w-10 sm:h-14 sm:w-14 rounded-xl sm:rounded-2xl overflow-hidden ring-2 ring-indigo-500/25 dark:ring-indigo-400/30 border border-slate-200/80 dark:border-white/10 flex items-center justify-center shadow-2xs shrink-0 ${
                  !company ? 'bg-slate-200/70 dark:bg-zinc-800 animate-pulse' : (company?.logo_url && !logoError ? 'company-logo-badge p-1 sm:p-1.5' : '')
                }`}
                style={company?.logo_url && !logoError ? { backgroundColor: '#ffffff' } : undefined}
              >
                {!company ? (
                  <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-md bg-slate-300/60 dark:bg-zinc-700" />
                ) : company.logo_url && !logoError ? (
                  <img
                    src={company.logo_url}
                    alt={company.name || 'Logo'}
                    className="max-h-full max-w-full w-auto h-auto object-contain"
                    onError={() => setLogoError(true)}
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-tr from-[#5550F2] to-[#7974FF] flex items-center justify-center rounded-lg sm:rounded-xl">
                    <span className="text-xs sm:text-sm font-black text-white tracking-tight">
                      {(company.name || 'E').trim().split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase()}
                    </span>
                  </div>
                )}
              </div>

              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-base sm:text-xl lg:text-2xl font-black text-slate-900 dark:text-white tracking-tight leading-tight truncate">
                    {company?.name || 'Cleanig Service'}
                  </h1>
                  <span className="text-[10px] sm:text-[10.5px] font-black px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-600 dark:bg-white/10 dark:text-indigo-300 border border-indigo-200/50 dark:border-white/10 shrink-0">
                    ERP PRO
                  </span>
                  <span className="hidden sm:inline-flex items-center gap-1.5 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-200/50 dark:border-emerald-500/20">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Operativo
                  </span>
                </div>
                <p className="text-[11px] sm:text-[13px] text-slate-500 dark:text-slate-400 font-medium mt-0.5 sm:mt-1 truncate hidden sm:block">
                  Control de Ventas & Facturación · Monitoreo y rotación comercial
                </p>
              </div>
            </div>

            {/* Mobile Header Right: Notification Bell & Profile Avatar */}
            <div className="flex lg:hidden items-center gap-1.5 shrink-0">
              {renderNotifMenu(true)}
              {renderUserMenu(true)}
            </div>

            {/* Desktop Header Right: Full tool suite and CTA */}
            <div className="hidden lg:flex items-center gap-2 sm:gap-2.5">
              {/* Currency Selector */}
              <button
                onClick={toggleCurrency}
                className="px-3 py-1.5 sm:py-2 text-xs font-bold rounded-xl border border-slate-200/80 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/10 transition-all cursor-pointer shadow-2xs flex items-center gap-1"
                title="Cambiar Moneda (S/ / $)"
              >
                <span className="text-slate-400 text-[11px] hidden sm:inline">Moneda:</span>
                <span className="font-extrabold text-indigo-600 dark:text-indigo-400">{currency === 'S/' ? 'PEN (S/)' : 'USD ($)'}</span>
              </button>

              {/* Theme Toggle */}
              <button
                onClick={toggleTheme}
                className="w-9 h-9 rounded-xl border border-slate-200/80 dark:border-white/10 bg-slate-50 dark:bg-white/5 items-center justify-center text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition-all cursor-pointer shadow-2xs flex"
                title="Cambiar Modo Claro / Oscuro"
              >
                {isDark ? <Sun size={15} className="text-amber-400" /> : <Moon size={15} />}
              </button>

              {/* Reload Button */}
              <button
                type="button"
                onClick={handleRefresh}
                disabled={refreshing}
                className="w-9 h-9 rounded-xl border border-slate-200/80 dark:border-white/10 bg-slate-50 dark:bg-white/5 items-center justify-center text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition-all cursor-pointer shadow-2xs active:scale-95 disabled:opacity-60 flex"
                title="Actualizar Datos del ERP"
                aria-label="Actualizar Datos"
              >
                <RefreshCw size={14} className={refreshing ? 'animate-spin text-indigo-600 dark:text-indigo-400' : ''} />
              </button>

              {/* Notification Bell */}
              {renderNotifMenu(false)}

              {/* User Profile Avatar */}
              {renderUserMenu(false)}

              {/* POS Shortcut */}
              <button
                onClick={() => navigate('/ventas/nueva')}
                className="hidden xl:inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 bg-slate-50 dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 border border-slate-200/80 dark:border-white/10 transition-all cursor-pointer shadow-2xs"
                title="Abrir Punto de Venta"
              >
                <ShoppingBag size={14} className="text-indigo-600 dark:text-indigo-400" />
                <span>Punto de Venta</span>
              </button>

              {/* Primary Action: + Nueva Venta */}
              <button
                onClick={() => navigate('/ventas/nueva')}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#5550F2] text-white text-sm font-bold shadow-md shadow-indigo-600/30 hover:bg-[#4742E8] active:scale-[0.98] transition-all cursor-pointer whitespace-nowrap"
              >
                <Plus size={16} strokeWidth={2.5} />
                <span>Nueva Venta</span>
              </button>
            </div>
          </div>

          {/* Mobile Bottom Action Bar (Row 2 on mobile: Left has currency, theme, refresh; Right has + Nueva Venta) */}
          <div className="flex lg:hidden items-center justify-between gap-2 pt-2.5 mt-2.5 border-t border-slate-100 dark:border-white/5">
            <div className="flex items-center gap-1.5">
              {/* Currency Selector */}
              <button
                onClick={toggleCurrency}
                className="px-2.5 py-1.5 text-xs font-bold rounded-xl border border-slate-200/80 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/10 transition-all cursor-pointer shadow-2xs flex items-center gap-1"
                title="Cambiar Moneda"
              >
                <span className="font-extrabold text-indigo-600 dark:text-indigo-400">{currency === 'S/' ? 'S/' : '$'}</span>
                <span className="text-[11px] font-semibold text-slate-500">{currency === 'S/' ? 'PEN' : 'USD'}</span>
              </button>

              {/* Theme Toggle */}
              <button
                onClick={toggleTheme}
                className="w-8 h-8 rounded-xl border border-slate-200/80 dark:border-white/10 bg-slate-50 dark:bg-white/5 items-center justify-center text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition-all cursor-pointer shadow-2xs flex"
                title="Modo Claro/Oscuro"
              >
                {isDark ? <Sun size={14} className="text-amber-400" /> : <Moon size={14} />}
              </button>

              {/* Reload Button */}
              <button
                type="button"
                onClick={handleRefresh}
                disabled={refreshing}
                className="w-8 h-8 rounded-xl border border-slate-200/80 dark:border-white/10 bg-slate-50 dark:bg-white/5 items-center justify-center text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition-all cursor-pointer shadow-2xs active:scale-95 disabled:opacity-60 flex"
                title="Actualizar"
              >
                <RefreshCw size={13} className={refreshing ? 'animate-spin text-indigo-600 dark:text-indigo-400' : ''} />
              </button>
            </div>

            {/* Primary Action Button: + Nueva Venta */}
            <button
              onClick={() => navigate('/ventas/nueva')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#5550F2] text-white text-xs font-bold shadow-md shadow-indigo-600/25 hover:bg-[#4742E8] active:scale-95 transition-all cursor-pointer whitespace-nowrap"
            >
              <Plus size={15} strokeWidth={2.5} />
              <span>Nueva Venta</span>
            </button>
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════
            3. 4 METRIC CARDS — MÉTRICAS REALES CYA STORE (Estilo Finnova Pro)
           ═══════════════════════════════════════════════════════════ */}
        {loading ? (
          <DashboardKpiSkeleton />
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-5">

            {/* Card 1: Facturación del Mes */}
            <div className="fn-card border-t-[3px] border-t-emerald-500">
              <div>
                <div className="flex items-start justify-between gap-1">
                  <span className="text-[11px] sm:text-[13px] font-semibold text-slate-500 dark:text-slate-400 truncate">
                    Facturación
                  </span>
                  <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200/80 dark:border-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shadow-2xs shrink-0">
                    <TrendingUp size={14} />
                  </div>
                </div>
                <div className="text-base xs:text-lg sm:text-[26px] font-black text-slate-900 dark:text-white tracking-tight mt-1 sm:mt-1.5 font-sans truncate">
                  {formatMoney(currentMonthMetrics.facturacionMes)}
                </div>
                <div className="flex items-center gap-1 text-[10px] sm:text-[11px] font-bold text-emerald-600 dark:text-emerald-400 mt-0.5 sm:mt-1 truncate">
                  <ArrowUpRight size={12} strokeWidth={2.5} className="shrink-0" />
                  <span className="truncate">{currentMonthMetrics.ventasMesCount} venta{currentMonthMetrics.ventasMesCount !== 1 ? 's' : ''}</span>
                </div>
              </div>

              {/* Mobile Ticket Compact Pill */}
              <div className="sm:hidden mt-2 pt-1.5 border-t border-slate-100 dark:border-white/5 flex items-center justify-between text-[10px]">
                <span className="text-slate-400 font-semibold truncate">Ticket:</span>
                <span className="font-extrabold text-slate-700 dark:text-slate-200 font-mono truncate">
                  {formatMoney(currentMonthMetrics.ticketPromedio)}
                </span>
              </div>

              {/* Desktop Clean Executive Ticket Promedio Bar */}
              <div className="hidden sm:flex mt-4 p-2.5 rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-slate-100 dark:border-white/5 items-center justify-between">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-7 h-7 rounded-lg bg-indigo-50 dark:bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                    <Receipt size={13} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Ticket Promedio</p>
                    <p className="text-xs font-black text-slate-800 dark:text-slate-200 font-mono truncate">
                      {formatMoney(currentMonthMetrics.ticketPromedio)}
                    </p>
                  </div>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-200/70 dark:bg-white/10 text-slate-700 dark:text-slate-300">
                  Por venta
                </span>
              </div>
            </div>

            {/* Card 2: Capital en Inventario */}
            <div className="fn-card border-t-[3px] border-t-indigo-500">
              <div>
                <div className="flex items-start justify-between gap-1">
                  <span className="text-[11px] sm:text-[13px] font-semibold text-slate-500 dark:text-slate-400 truncate">
                    Capital Inv.
                  </span>
                  <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200/80 dark:border-indigo-500/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shadow-2xs shrink-0">
                    <Wallet size={14} />
                  </div>
                </div>
                <div className="text-base xs:text-lg sm:text-[26px] font-black text-slate-900 dark:text-white tracking-tight mt-1 sm:mt-1.5 font-sans truncate">
                  {formatMoney(currentMonthMetrics.capitalInventario)}
                </div>
                <div className="flex items-center gap-1 text-[10px] sm:text-[11px] font-bold text-indigo-600 dark:text-indigo-400 mt-0.5 sm:mt-1 truncate">
                  <ArrowUpRight size={12} strokeWidth={2.5} className="shrink-0" />
                  <span className="truncate">{currentMonthMetrics.totalFisicoUds} uds.</span>
                </div>
              </div>

              {/* Mobile Rotation Pill */}
              <div className="sm:hidden mt-2 pt-1.5 border-t border-slate-100 dark:border-white/5 flex items-center justify-between text-[10px]">
                <span className="text-slate-400 font-semibold truncate">Rotación:</span>
                <span className="font-extrabold text-indigo-600 dark:text-indigo-400 font-mono">
                  7d activo
                </span>
              </div>

              {/* Desktop 7 Vertical Gradient Bars */}
              <div className="hidden sm:flex mt-4 pt-1 items-end justify-between gap-1.5 h-[56px]">
                {last7DaysSales.map((bar, i) => (
                  <div key={i} className="flex-1 flex flex-col items-center h-full justify-end group cursor-pointer" title={`${bar.label}: ${formatMoney(bar.total)} (${bar.count} ventas)`}>
                    <div className="w-full max-w-[20px] h-[40px] bg-slate-100 dark:bg-white/5 rounded-t-md flex items-end overflow-hidden p-0.5">
                      <div
                        style={{ height: `${Math.max(bar.val, 12)}%` }}
                        className="w-full rounded-t-sm bg-indigo-500 group-hover:bg-indigo-600 dark:bg-indigo-500/80 dark:group-hover:bg-indigo-400 transition-all shadow-2xs"
                      />
                    </div>
                    <span className="text-[8.5px] font-bold text-slate-400 dark:text-slate-500 mt-1 uppercase">
                      {bar.month}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Card 3: Rotación & Catálogo */}
            <div className="fn-card border-t-[3px] border-t-cyan-500">
              <div>
                <div className="flex items-start justify-between gap-1">
                  <span className="text-[11px] sm:text-[13px] font-semibold text-slate-500 dark:text-slate-400 truncate">
                    Catálogo
                  </span>
                  <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl bg-cyan-50 dark:bg-cyan-500/10 border border-cyan-200/80 dark:border-cyan-500/20 flex items-center justify-center text-cyan-600 dark:text-cyan-400 shadow-2xs shrink-0">
                    <Boxes size={14} />
                  </div>
                </div>
                <div className="text-base xs:text-lg sm:text-[26px] font-black text-slate-900 dark:text-white tracking-tight mt-1 sm:mt-1.5 font-sans truncate">
                  {currentMonthMetrics.totalSkus} SKUs
                </div>
                <div className="flex items-center gap-1 text-[10px] sm:text-[11px] font-bold text-cyan-600 dark:text-cyan-400 mt-0.5 sm:mt-1 truncate">
                  <span className="truncate">{currentMonthMetrics.totalCategories} categorías</span>
                </div>
              </div>

              {/* Mobile Availability Mini Bar */}
              <div className="sm:hidden mt-2 pt-1.5 border-t border-slate-100 dark:border-white/5 space-y-1">
                <div className="flex items-center justify-between text-[10px]">
                  <span className="text-slate-400 font-semibold truncate">Stock:</span>
                  <span className="font-black text-emerald-600 dark:text-emerald-400 font-mono">
                    {currentMonthMetrics.disponibilidadPct}%
                  </span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-slate-100 dark:bg-white/10 overflow-hidden">
                  <div
                    style={{ width: `${currentMonthMetrics.disponibilidadPct}%` }}
                    className="h-full bg-gradient-to-r from-cyan-500 to-emerald-500 rounded-full"
                  />
                </div>
              </div>

              {/* Desktop Availability & Quick Explore Box */}
              <div className="hidden sm:flex mt-4 p-2.5 rounded-xl bg-cyan-50/60 dark:bg-cyan-500/5 border border-cyan-200/70 dark:border-cyan-500/20 flex-col gap-2">
                <div className="flex items-center justify-between text-[10.5px]">
                  <span className="font-bold uppercase tracking-wider text-cyan-900 dark:text-cyan-300">
                    Disponibilidad en almacén
                  </span>
                  <span className="font-black text-emerald-600 dark:text-emerald-400 font-mono">
                    {currentMonthMetrics.disponibilidadPct}%
                  </span>
                </div>

                <div className="w-full h-2 rounded-full bg-white dark:bg-white/10 overflow-hidden shadow-inner flex border border-cyan-100 dark:border-white/5">
                  <div
                    style={{ width: `${currentMonthMetrics.disponibilidadPct}%` }}
                    className="h-full bg-gradient-to-r from-cyan-500 to-emerald-500 rounded-full transition-all"
                    title={`Disponibilidad: ${currentMonthMetrics.disponibilidadPct}%`}
                  />
                </div>

                <div className="flex items-center justify-between pt-0.5 text-[11px]">
                  <span className="font-semibold text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-500" />
                    {currentMonthMetrics.totalClients} clientes
                  </span>
                  <button
                    onClick={() => navigate('/productos')}
                    className="font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-white flex items-center gap-0.5 cursor-pointer text-xs"
                  >
                    <span>Explorar</span>
                    <ChevronRight size={13} />
                  </button>
                </div>
              </div>
            </div>

            {/* Card 4: Disponible para Cobro Inmediato */}
            <div className="fn-card border-t-[3px] border-t-purple-500">
              <div>
                <div className="flex items-start justify-between gap-1">
                  <span className="text-[11px] sm:text-[13px] font-semibold text-slate-500 dark:text-slate-400 truncate">
                    Por Cobrar
                  </span>
                  <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl bg-purple-50 dark:bg-purple-500/10 border border-purple-200/80 dark:border-purple-500/20 flex items-center justify-center text-purple-600 dark:text-purple-400 shadow-2xs shrink-0">
                    <DollarSign size={14} />
                  </div>
                </div>
                <div className="text-base xs:text-lg sm:text-[26px] font-black text-slate-900 dark:text-white tracking-tight mt-1 sm:mt-1.5 font-sans truncate">
                  {formatMoney(currentMonthMetrics.facturacionMes)}
                </div>
                <div className="flex items-center gap-1 text-[10px] sm:text-[11px] font-bold text-purple-600 dark:text-purple-400 mt-0.5 sm:mt-1 truncate">
                  <span className="truncate">
                    {currentMonthMetrics.criticos > 0 ? (
                      <span className="text-amber-600 dark:text-amber-400 font-bold">{currentMonthMetrics.criticos} crítico</span>
                    ) : (
                      'Al día'
                    )}
                  </span>
                </div>
              </div>

              {/* Mobile Quick Action Pill */}
              <div className="sm:hidden mt-2 pt-1.5 border-t border-slate-100 dark:border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => {
                      setQrModalMethod('yape')
                      setQrModalAmount(currentMonthMetrics.facturacionMes || 0)
                    }}
                    className="p-1 rounded-md bg-purple-50 hover:bg-purple-100 dark:bg-white/5 text-[#742284] cursor-pointer"
                    title="Yape"
                  >
                    <img src="/yape-logo.png" alt="Yape" className="w-3.5 h-3.5 rounded-sm object-cover" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setQrModalMethod('plin')
                      setQrModalAmount(currentMonthMetrics.facturacionMes || 0)
                    }}
                    className="p-1 rounded-md bg-teal-50 hover:bg-teal-100 dark:bg-white/5 text-[#00b49f] cursor-pointer"
                    title="Plin"
                  >
                    <img src="/plin-logo.png" alt="Plin" className="w-3.5 h-3.5 rounded-full object-cover" />
                  </button>
                </div>
                <button
                  onClick={() => navigate('/ventas/nueva')}
                  className="px-2 py-0.5 rounded-lg bg-indigo-600 text-white text-[10px] font-black shadow-xs transition-all cursor-pointer active:scale-95"
                >
                  Cobrar
                </button>
              </div>

              {/* Desktop Payment Gateway Box */}
              <div className="hidden sm:flex mt-4 p-2.5 rounded-xl bg-purple-50/50 dark:bg-purple-500/5 border border-purple-200/70 dark:border-purple-500/20 items-center justify-between gap-1.5">
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      setQrModalMethod('yape')
                      setQrModalAmount(currentMonthMetrics.facturacionMes || 0)
                    }}
                    className="text-[9.5px] font-extrabold px-2 py-1 rounded-lg bg-white hover:bg-[#742284] text-[#742284] hover:text-white transition-all cursor-pointer flex items-center gap-1 border border-purple-200/80 shadow-2xs dark:bg-white/5 dark:text-purple-300 dark:hover:bg-[#742284] dark:hover:text-white"
                    title="Ver QR de Yape"
                  >
                    <img src="/yape-logo.png" alt="Yape" className="w-3.5 h-3.5 rounded-sm object-cover" />
                    <span>Yape</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setQrModalMethod('plin')
                      setQrModalAmount(currentMonthMetrics.facturacionMes || 0)
                    }}
                    className="text-[9.5px] font-extrabold px-2 py-1 rounded-lg bg-white hover:bg-[#00b49f] text-[#00b49f] hover:text-white transition-all cursor-pointer flex items-center gap-1 border border-teal-200/80 shadow-2xs dark:bg-white/5 dark:text-teal-300 dark:hover:bg-[#00b49f] dark:hover:text-white"
                    title="Ver QR de Plin"
                  >
                    <img src="/plin-logo.png" alt="Plin" className="w-3.5 h-3.5 rounded-full object-cover" />
                    <span>Plin</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setQrModalMethod('transfer')
                      setQrModalAmount(currentMonthMetrics.facturacionMes || 0)
                    }}
                    className="text-[9.5px] font-extrabold px-2 py-1 rounded-lg bg-white hover:bg-blue-600 text-blue-700 hover:text-white dark:bg-white/5 dark:hover:bg-blue-600 dark:text-blue-300 dark:hover:text-white transition-all cursor-pointer border border-blue-200/80 shadow-2xs"
                    title="Ver Cuentas Bancarias"
                  >
                    BCP
                  </button>
                </div>

                <button
                  onClick={() => navigate('/ventas/nueva')}
                  className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-[10.5px] font-extrabold shadow-sm shadow-indigo-600/30 transition-all cursor-pointer whitespace-nowrap shrink-0 hover:scale-[1.02]"
                >
                  Cobrar ahora
                </button>
              </div>
            </div>

          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════
            3.5. MASTER ANALYTICS CONTAINER (Movimientos & Categorías)
           ═══════════════════════════════════════════════════════════ */}
        {loading ? (
          <DashboardAnalyticsSkeleton />
        ) : (
          <DashboardAnalytics
            products={products}
            categories={categories}
            movements={movements}
            sales={sales}
            currency={currency}
          />
        )}

        {/* ═══════════════════════════════════════════════════════════
            4. FILTER BAR (Responsive & Enterprise Themed)
           ═══════════════════════════════════════════════════════════ */}
        <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
          {/* Active filters badge */}
          <div className="fn-filter-pill">
            <span>Filtros activos</span>
            <span className="w-5 h-5 rounded-full bg-slate-900 dark:bg-indigo-600 text-white text-[10.5px] font-bold flex items-center justify-center font-mono">
              {filteredInvoices.length}
            </span>
          </div>

          {/* All customers dropdown */}
          <div className="relative">
            <button
              onClick={() => setCustomerDropdownOpen(o => !o)}
              className="fn-filter-pill"
            >
              <span className="truncate max-w-[140px] sm:max-w-none">{selectedCustomerFilter === 'ALL' ? 'Todos los clientes' : selectedCustomerFilter}</span>
              <ChevronDown size={14} className="text-slate-400 shrink-0" />
            </button>
            {customerDropdownOpen && (
              <div className="absolute top-full left-0 mt-2 w-56 max-h-60 overflow-y-auto bg-white dark:bg-[#181B2E] rounded-xl shadow-xl border border-slate-200 dark:border-white/10 py-1.5 z-30">
                <button
                  onClick={() => { setSelectedCustomerFilter('ALL'); setCustomerDropdownOpen(false) }}
                  className="w-full text-left px-3.5 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-white/5 cursor-pointer"
                >
                  Todos los clientes
                </button>
                {clients.map(c => (
                  <button
                    key={c.id}
                    onClick={() => { setSelectedCustomerFilter(c.name); setCustomerDropdownOpen(false) }}
                    className="w-full text-left px-3.5 py-1.5 text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5 truncate cursor-pointer"
                  >
                    {c.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* All statuses dropdown */}
          <div className="relative">
            <button
              onClick={() => setStatusDropdownOpen(o => !o)}
              className="fn-filter-pill"
            >
              <span>
                {selectedStatusFilter === 'ALL'
                  ? 'Todos los estados'
                  : selectedStatusFilter === 'Pendiente'
                  ? 'Pendientes'
                  : 'Pagadas'}
              </span>
              <ChevronDown size={14} className="text-slate-400 shrink-0" />
            </button>
            {statusDropdownOpen && (
              <div className="absolute top-full left-0 mt-2 w-44 bg-white dark:bg-[#181B2E] rounded-xl shadow-xl border border-slate-200 dark:border-white/10 py-1.5 z-30">
                {[
                  { key: 'ALL', label: 'Todos los estados' },
                  { key: 'Pendiente', label: 'Pendientes' },
                  { key: 'Pagada', label: 'Pagadas' },
                ].map(st => (
                  <button
                    key={st.key}
                    onClick={() => { setSelectedStatusFilter(st.key); setStatusDropdownOpen(false) }}
                    className="w-full text-left px-3.5 py-1.5 text-xs text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-white/5 cursor-pointer"
                  >
                    {st.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Date pill (Dynamic Month & Year) */}
          <div className="hidden md:inline-flex fn-filter-pill">
            <span className="capitalize">{new Date().toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}</span>
            <Calendar size={13} className="text-slate-400" />
          </div>

          {/* Search Bar on Right */}
          <div className="fn-filter-pill ml-auto w-full sm:w-80 md:w-96 min-w-[280px] px-3.5 py-1.5">
            <input
              type="text"
              placeholder="Buscar por cliente, comprobante o producto..."
              value={searchInvoice}
              onChange={(e) => setSearchInvoice(e.target.value)}
              className="w-full bg-transparent border-none outline-none text-xs text-slate-800 dark:text-white placeholder-slate-400 dark:placeholder-slate-500"
            />
            {searchInvoice ? (
              <button onClick={() => setSearchInvoice('')} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer">
                <X size={14} />
              </button>
            ) : (
              <Search size={14} className="text-slate-400 shrink-0" />
            )}
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════
            5. THE MASTER OPERATIONS & INVOICING SPLIT VIEW
           ═══════════════════════════════════════════════════════════ */}
        {loading ? (
          <DashboardSalesMasterSkeleton />
        ) : (
          <div className="fn-dark-container">

          {/* Top Header inside Container */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
            <div>
              <h2 className="text-base sm:text-lg lg:text-xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                <span>{activeTab === 'unpaid' ? 'Ventas Pendientes de Cobro' : activeTab === 'paid' ? 'Ventas Pagadas / Cobradas' : 'Registro de Ventas & Comprobantes'}</span>
                <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Operaciones comerciales y comprobantes registrados en tu ERP</p>
            </div>

            {/* Segmented Floating Pill Tabs + Table shortcut */}
            <div className="flex items-center gap-2">
              <div className="inline-flex items-center gap-1 bg-slate-100 dark:bg-black/30 p-1 rounded-xl border border-slate-200/80 dark:border-white/10 shadow-2xs">
                <button
                  onClick={() => setActiveTab('all')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    activeTab === 'all'
                      ? 'bg-white dark:bg-white/15 text-slate-900 dark:text-white shadow-xs'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  Todas ({invoiceList.length})
                </button>
                <button
                  onClick={() => setActiveTab('unpaid')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                    activeTab === 'unpaid'
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <span>Pendientes</span>
                  <span className={`w-4 h-4 rounded-full text-[9.5px] font-black flex items-center justify-center ${
                    activeTab === 'unpaid' ? 'bg-white text-indigo-700' : 'bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300'
                  }`}>
                    {invoiceList.filter(i => i.status === 'Pendiente').length}
                  </span>
                </button>
                <button
                  onClick={() => setActiveTab('paid')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                    activeTab === 'paid'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <span>Pagadas</span>
                  <span className={`w-4 h-4 rounded-full text-[9.5px] font-black flex items-center justify-center ${
                    activeTab === 'paid' ? 'bg-white text-emerald-800' : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300'
                  }`}>
                    {invoiceList.filter(i => i.status === 'Pagada').length}
                  </span>
                </button>
              </div>

              <button
                onClick={() => navigate('/ventas')}
                className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/15 border border-slate-200/80 dark:border-white/10 flex items-center justify-center text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white transition-colors cursor-pointer shrink-0 shadow-2xs"
                title="Ver todas las ventas en tabla"
              >
                <LayoutGrid size={14} />
              </button>
            </div>
          </div>

          {/* ═══════════════════════════════════════════════════════════
              SPLIT CONTENT: LEFT INVOICES LIST + RIGHT WORKSPACE CARD
             ═══════════════════════════════════════════════════════════ */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">

            {/* LEFT COLUMN: Invoices List */}
            <div className="lg:col-span-5 flex flex-col">
              <div className="flex items-center justify-between px-1 mb-2">
                <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  {activeTab === 'unpaid' ? 'Comprobantes Pendientes' : activeTab === 'paid' ? 'Comprobantes Cobrados' : 'Historial de Comprobantes'}
                </span>
                <span className="text-[11px] font-semibold text-slate-400">
                  {filteredInvoices.length} {filteredInvoices.length === 1 ? 'registro' : 'registros'}
                </span>
              </div>

              <div className="flex flex-col gap-2 max-h-[440px] overflow-y-auto fn-scroll pr-1.5 flex-1">
                {filteredInvoices.length === 0 ? (
                  <div className="py-16 text-center text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-white/[0.02] rounded-2xl border border-slate-200/80 dark:border-white/5">
                    <div className="w-10 h-10 rounded-full bg-slate-200/70 dark:bg-white/5 text-slate-600 dark:text-slate-400 flex items-center justify-center mx-auto mb-2">
                      <Receipt size={18} />
                    </div>
                    <p className="text-sm font-bold text-slate-900 dark:text-white">No hay ventas en esta sección</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Ajusta los filtros o registra una nueva venta en el POS.</p>
                    <button
                      onClick={() => navigate('/ventas/nueva')}
                      className="mt-3.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-600/30 cursor-pointer transition-all"
                    >
                      + Registrar nueva venta
                    </button>
                  </div>
                ) : (
                  filteredInvoices.map((inv) => {
                    const isSelected = String(inv.id) === String(currentInvoice?.id)
                    const isPaid = inv.status === 'Pagada'
                    return (
                      <div
                        key={inv.id}
                        onClick={() => setSelectedInvoiceId(inv.id)}
                        className={`fn-invoice-row ${isSelected ? 'active' : ''}`}
                      >
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          {/* Avatar with initials */}
                          <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl shrink-0 flex items-center justify-center text-white font-extrabold text-xs shadow-2xs bg-gradient-to-tr ${getClientAvatarGradient(inv.client_name)} ${isSelected ? 'ring-2 ring-indigo-500/40' : 'ring-1 ring-black/5 dark:ring-white/10'}`}>
                            {inv.client_name ? inv.client_name.charAt(0).toUpperCase() : 'C'}
                          </div>

                          {/* Client & Code info */}
                          <div className="min-w-0 flex-1">
                            <p className={`text-xs sm:text-[13px] font-extrabold truncate leading-tight ${isSelected ? 'text-indigo-950 dark:text-white' : 'text-slate-900 dark:text-white'}`}>
                              {inv.client_name}
                            </p>
                            <p className={`text-[10.5px] mt-0.5 truncate font-medium ${isSelected ? 'text-indigo-600 dark:text-indigo-300 font-semibold' : 'text-slate-500 dark:text-slate-400'}`}>
                              #{inv.code} · {inv.due_text}
                            </p>
                          </div>
                        </div>

                        {/* Status Pill & Amount */}
                        <div className="flex flex-col sm:flex-row items-end sm:items-center gap-1 sm:gap-2.5 shrink-0 ml-2">
                          <span className={`text-xs sm:text-[14px] font-black tracking-tight font-mono whitespace-nowrap ${isSelected ? 'text-indigo-950 dark:text-white' : 'text-slate-900 dark:text-white'}`}>
                            {formatMoney(inv.amount)}
                          </span>

                          <span
                            className={`text-[9.5px] sm:text-[10px] font-extrabold px-2 py-0.5 rounded-full transition-all whitespace-nowrap ${
                              isPaid
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-300 dark:border-emerald-500/25'
                                : 'bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-500/15 dark:text-amber-300 dark:border-amber-500/25'
                            }`}
                          >
                            {inv.status}
                          </span>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </div>

            {/* RIGHT COLUMN: Modern Workspace Detail Card */}
            <div className="lg:col-span-7 flex flex-col">
              {currentInvoice ? (
                <div className="fn-detail-card flex-1">

                  {/* Header Row: Detalle de Venta | Emisor | Cliente */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pb-4 border-b border-slate-200/80 dark:border-white/10">
                    {/* Comprobante */}
                    <div className="bg-white/80 dark:bg-white/[0.03] p-3 rounded-xl border border-slate-200/80 dark:border-white/5 shadow-2xs">
                      <p className="text-[10px] font-bold text-slate-400 dark:text-slate-400 uppercase tracking-wider">Comprobante</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight font-mono">
                          #{currentInvoice.code}
                        </span>
                        <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full border ${
                          currentInvoice.status === 'Pagada'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-300 dark:border-emerald-500/30'
                            : 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/15 dark:text-amber-300 dark:border-amber-500/30'
                        }`}>
                          {currentInvoice.status}
                        </span>
                      </div>
                      <p className="text-[10.5px] text-slate-500 dark:text-slate-400 mt-1 font-medium flex items-center gap-1.5">
                        <Calendar size={11} className="text-slate-400 shrink-0" />
                        <span>{currentInvoice.due_text?.startsWith('Vence:') ? currentInvoice.due_text : `Fecha: ${currentInvoice.due_text || 'Registrado'}`}</span>
                      </p>
                    </div>

                    {/* Emisor Comercial */}
                    <div className="bg-white/80 dark:bg-white/[0.03] p-3 rounded-xl border border-slate-200/80 dark:border-white/5 shadow-2xs">
                      <p className="text-[10px] font-bold text-slate-400 dark:text-slate-400 uppercase tracking-wider">Empresa Emisora</p>
                      <div className="flex items-center gap-1.5 mt-1">
                        <span className="text-base sm:text-lg font-black text-slate-900 dark:text-white tracking-tight truncate">
                          {currentInvoice.company || 'CYA Store'}
                        </span>
                        <span className="text-indigo-500 text-sm font-bold">~</span>
                      </div>
                      <p className="text-[10.5px] text-slate-500 dark:text-slate-400 mt-1 font-medium">Sede Principal · Sistema ERP</p>
                    </div>

                    {/* Cliente */}
                    <div className="bg-white/80 dark:bg-white/[0.03] p-3 rounded-xl border border-slate-200/80 dark:border-white/5 shadow-2xs">
                      <p className="text-[10px] font-bold text-slate-400 dark:text-slate-400 uppercase tracking-wider">Cliente</p>
                      <div className="flex items-center gap-2.5 mt-1">
                        <div className={`w-8 h-8 rounded-lg shrink-0 flex items-center justify-center text-white font-extrabold text-xs shadow-2xs bg-gradient-to-tr ${getClientAvatarGradient(currentInvoice.client_name)}`}>
                          {currentInvoice.client_name ? currentInvoice.client_name.charAt(0).toUpperCase() : 'C'}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs sm:text-[13px] font-extrabold text-slate-900 dark:text-white truncate leading-tight">
                            {currentInvoice.client_name}
                          </p>
                          <p className="text-[10.5px] text-slate-500 dark:text-slate-400 truncate mt-0.5 font-medium">
                            {currentInvoice.client_role || 'Cliente Registrado'}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Middle Row: Ítems facturados en Formato Tabla Recibo Profesional */}
                  <div className="my-3.5 flex-1 flex flex-col min-h-0">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-extrabold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                          Detalle de Productos Facturados
                        </span>
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-slate-200/70 text-slate-700 dark:bg-white/10 dark:text-slate-300">
                          {currentInvoice.items?.length || 0} {currentInvoice.items?.length === 1 ? 'ítem' : 'ítems'}
                        </span>
                      </div>
                      <span className="text-[10.5px] text-slate-400 font-medium hidden sm:inline">
                        Líneas registradas en comprobante
                      </span>
                    </div>

                    <div className="rounded-xl border border-slate-200/80 dark:border-white/10 bg-white/70 dark:bg-white/[0.02] overflow-hidden shadow-2xs">
                      <div className="max-h-[160px] overflow-y-auto fn-scroll">
                        <table className="w-full text-left border-collapse text-xs">
                          <thead className="sticky top-0 z-10 bg-slate-50/95 dark:bg-slate-900/95 backdrop-blur-xs text-[10.5px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider border-b border-slate-200/80 dark:border-white/10">
                            <tr>
                              <th className="py-2 px-3">Producto / Concepto</th>
                              <th className="py-2 px-2 text-center w-16">Cant.</th>
                              <th className="py-2 px-3 text-right w-24">P. Unit.</th>
                              <th className="py-2 px-3 text-right w-28">Subtotal</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                            {currentInvoice.items && currentInvoice.items.length > 0 ? (
                              currentInvoice.items.map((item, idx) => (
                                <tr key={idx} className="hover:bg-slate-50/60 dark:hover:bg-white/[0.02] transition-colors">
                                  <td className="py-2.5 px-3">
                                    <div className="flex items-center gap-2">
                                      <div className="w-6 h-6 rounded-md bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                                        <Package size={12} />
                                      </div>
                                      <span className="font-bold text-slate-900 dark:text-white line-clamp-1 text-xs">
                                        {item.name}
                                      </span>
                                    </div>
                                  </td>
                                  <td className="py-2.5 px-2 text-center">
                                    <span className="inline-block px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-white/10 font-bold text-[11px] text-slate-700 dark:text-slate-300 font-mono">
                                      {item.qty || 1}
                                    </span>
                                  </td>
                                  <td className="py-2.5 px-3 text-right font-mono text-slate-600 dark:text-slate-300 text-xs font-semibold">
                                    {formatMoney(item.unit_price || (item.price / (item.qty || 1)))}
                                  </td>
                                  <td className="py-2.5 px-3 text-right font-mono font-extrabold text-slate-900 dark:text-white text-xs">
                                    {formatMoney(item.price)}
                                  </td>
                                </tr>
                              ))
                            ) : (
                              <tr>
                                <td colSpan={4} className="py-4 text-center text-slate-400 text-xs font-medium">
                                  Sin desglose de productos para este comprobante
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>

                  {/* Bottom Row: Totals & Action Buttons */}
                  <div className="flex flex-col 2xl:flex-row 2xl:items-center justify-between gap-4 pt-3.5 border-t border-slate-200/80 dark:border-white/10 mt-auto">
                    {/* Financial Summary Boxes */}
                    <div className="grid grid-cols-3 gap-2.5 sm:gap-3 w-full 2xl:w-auto">
                      <div className="bg-slate-50/80 dark:bg-white/[0.03] border border-slate-200/70 dark:border-white/5 rounded-xl px-3 py-2">
                        <p className="text-[9.5px] font-bold text-slate-400 dark:text-slate-400 uppercase tracking-wider">Subtotal</p>
                        <p className="text-xs sm:text-[14px] font-black text-slate-800 dark:text-white font-mono mt-0.5 truncate">
                          {formatMoney(currentInvoice.subtotal)}
                        </p>
                      </div>

                      <div className="bg-slate-50/80 dark:bg-white/[0.03] border border-slate-200/70 dark:border-white/5 rounded-xl px-3 py-2">
                        <p className="text-[9.5px] font-bold text-slate-400 dark:text-slate-400 uppercase tracking-wider">Total Venta</p>
                        <p className="text-xs sm:text-[14px] font-black text-slate-900 dark:text-white font-mono mt-0.5 truncate">
                          {formatMoney(currentInvoice.total)}
                        </p>
                      </div>

                      <div className={`rounded-xl px-3 py-2 border ${
                        currentInvoice.balance > 0
                          ? 'bg-amber-50/80 dark:bg-amber-500/10 border-amber-200/80 dark:border-amber-500/20 text-amber-700 dark:text-amber-300'
                          : 'bg-emerald-50/80 dark:bg-emerald-500/10 border-emerald-200/80 dark:border-emerald-500/20 text-emerald-700 dark:text-emerald-300'
                      }`}>
                        <p className="text-[9.5px] font-bold uppercase tracking-wider opacity-80">Saldo Pendiente</p>
                        <p className="text-xs sm:text-[14px] font-black font-mono mt-0.5 truncate">
                          {formatMoney(currentInvoice.balance)}
                        </p>
                      </div>
                    </div>

                    {/* Actions on right */}
                    <div className="flex items-center gap-2 flex-wrap w-full 2xl:w-auto justify-start sm:justify-end">
                      <button
                        onClick={() => setReceiptOpen(true)}
                        className="px-3.5 py-2 rounded-xl bg-white dark:bg-white/10 hover:bg-slate-100 dark:hover:bg-white/15 border border-slate-200/80 dark:border-white/10 flex items-center gap-1.5 text-slate-700 dark:text-slate-200 transition-all cursor-pointer text-xs font-bold shadow-2xs shrink-0"
                        title="Ver e imprimir comprobante"
                      >
                        <Receipt size={14} className="text-slate-500 dark:text-slate-400" />
                        <span>Ver Boleta</span>
                      </button>

                      <button
                        onClick={() => navigate('/ventas')}
                        className="w-9 h-9 rounded-xl bg-white dark:bg-white/10 hover:bg-slate-100 dark:hover:bg-white/15 border border-slate-200/80 dark:border-white/10 flex items-center justify-center text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white transition-all cursor-pointer shrink-0 shadow-2xs"
                        title="Ir al módulo de ventas"
                      >
                        <ExternalLink size={14} />
                      </button>

                      {currentInvoice.status === 'Pendiente' && (
                        <button
                          type="button"
                          onClick={() => {
                            setQrModalMethod('yape')
                            setQrModalAmount(currentInvoice.balance || 0)
                          }}
                          className="px-3 py-2 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-700 dark:bg-purple-500/15 dark:hover:bg-purple-500/25 dark:text-purple-300 border border-purple-200 dark:border-purple-500/30 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs shrink-0 whitespace-nowrap"
                          title="Mostrar QR de Yape al cliente para cobrar"
                        >
                          <QrCode size={13} />
                          <span>QR</span>
                        </button>
                      )}

                      {currentInvoice.status === 'Pendiente' ? (
                        <button
                          onClick={handleMarkAsPaid}
                          disabled={payoutSuccess}
                          className="px-4 sm:px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-bold shadow-md shadow-indigo-600/30 hover:scale-[1.01] active:scale-[0.98] transition-all cursor-pointer disabled:opacity-75 flex items-center gap-1.5 shrink-0 whitespace-nowrap"
                        >
                          {payoutSuccess ? (
                            <>
                              <Check size={16} strokeWidth={3} className="text-emerald-200" />
                              <span>¡Cobrado!</span>
                            </>
                          ) : (
                            <>
                              <DollarSign size={16} strokeWidth={2.5} className="text-indigo-200" />
                              <span>Cobrar venta</span>
                            </>
                          )}
                        </button>
                      ) : (
                        <div className="px-4 py-2 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-300 dark:border-emerald-500/30 text-xs sm:text-sm font-bold flex items-center gap-1.5 shadow-2xs shrink-0">
                          <CheckCircle2 size={16} />
                          <span>Pagada</span>
                        </div>
                      )}
                    </div>
                  </div>

                </div>
              ) : (
                <div className="fn-detail-card items-center justify-center text-center py-20">
                  <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-white/10 flex items-center justify-center text-indigo-600 dark:text-indigo-400 mx-auto mb-3">
                    <Receipt size={22} />
                  </div>
                  <p className="text-slate-900 dark:text-white font-bold text-sm">Selecciona una venta de la lista</p>
                  <p className="text-slate-500 dark:text-slate-400 text-xs mt-1">Podrás ver los productos facturados, boletas y registrar cobros.</p>
                </div>
              )}
            </div>

          </div>

        </div>
        )}

        {/* ═══════════════════════════════════════════════════════════
            6. LOWER ERP METRICS: STOCK ALERTS | TOP PRODUCTS | CATEGORIES
           ═══════════════════════════════════════════════════════════ */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 pt-2">

          {/* ── CARD 1: ALERTAS DE STOCK ── */}
          <div className="bg-white dark:bg-[#121420] rounded-2xl sm:rounded-3xl p-4 sm:p-6 border border-slate-200/90 dark:border-white/10 shadow-[0_1px_3px_0_rgba(15,23,42,0.04),0_6px_20px_-3px_rgba(15,23,42,0.06)] hover:shadow-[0_4px_6px_-1px_rgba(15,23,42,0.06),0_12px_28px_-4px_rgba(15,23,42,0.1)] transition-all flex flex-col justify-between">
            <div>
              {/* Header */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 flex items-center justify-center text-amber-500">
                    <AlertTriangle size={18} />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-[16px] text-slate-900 dark:text-white tracking-tight leading-tight">
                      Alertas de Stock
                    </h3>
                    <p className="text-[11.5px] text-slate-400 font-medium">Bajo mínimo sugerido</p>
                  </div>
                </div>
                <span className="text-[11px] font-extrabold px-2.5 py-1 rounded-full bg-red-50 text-red-600 dark:bg-red-500/15 dark:text-red-400 border border-red-200/60 dark:border-red-500/30">
                  {stockAlerts.length} críticas
                </span>
              </div>

              {/* Items List */}
              <div className="space-y-3 my-4">
                {stockAlerts.length === 0 ? (
                  <div className="py-8 text-center">
                    <div className="w-10 h-10 rounded-full bg-emerald-50 dark:bg-emerald-500/10 text-emerald-500 flex items-center justify-center mx-auto mb-2">
                      <CheckCircle2 size={20} />
                    </div>
                    <p className="text-xs font-bold text-slate-800 dark:text-slate-200">¡Almacén saludable!</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">No hay productos por debajo del stock mínimo.</p>
                  </div>
                ) : (
                  stockAlerts.slice(0, 4).map((p, idx) => (
                    <div key={idx} className="p-3 rounded-2xl bg-slate-50/70 dark:bg-white/5 border border-slate-100 dark:border-white/5 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-[13px] font-bold text-slate-900 dark:text-white truncate leading-tight">
                            {p.name}
                          </p>
                          <p className="text-[11px] text-slate-400 font-medium mt-0.5">
                            {p.cat} · <span className="font-mono">{p.sku || `SKU-${idx + 1}`}</span>
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <span className={`text-[12px] font-extrabold font-mono ${p.stock <= 0 ? 'text-red-500' : 'text-amber-600 dark:text-amber-400'}`}>
                            {p.stock} / {p.min} uds.
                          </span>
                          <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">
                            {p.stock <= 0 ? 'Agotado' : 'Crítico'}
                          </p>
                        </div>
                      </div>

                      {/* Progress Bar */}
                      <div className="w-full h-1.5 rounded-full bg-slate-200 dark:bg-white/10 overflow-hidden">
                        <div
                          style={{ width: `${Math.max(p.pct, 4)}%` }}
                          className={`h-full rounded-full transition-all ${
                            p.stock <= 0 ? 'bg-red-500' : 'bg-gradient-to-r from-red-500 to-amber-500'
                          }`}
                        />
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Footer Link */}
            <div className="pt-3 border-t border-slate-100 dark:border-white/10 mt-auto">
              <Link
                to="/compras"
                className="w-full py-2.5 px-4 rounded-xl bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-700 dark:text-slate-200 text-xs font-bold transition-all flex items-center justify-between text-decoration-none"
              >
                <span>Reabastecer almacén</span>
                <ChevronRight size={14} />
              </Link>
            </div>
          </div>

          {/* ── CARD 2: TOP PRODUCTOS ── */}
          <div className="bg-white dark:bg-[#121420] rounded-2xl sm:rounded-3xl p-4 sm:p-6 border border-slate-200/90 dark:border-white/10 shadow-[0_1px_3px_0_rgba(15,23,42,0.04),0_6px_20px_-3px_rgba(15,23,42,0.06)] hover:shadow-[0_4px_6px_-1px_rgba(15,23,42,0.06),0_12px_28px_-4px_rgba(15,23,42,0.1)] transition-all flex flex-col justify-between">
            <div>
              {/* Header */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-violet-50 dark:bg-violet-500/10 border border-violet-200 dark:border-violet-500/20 flex items-center justify-center text-violet-600">
                    <TrendingUp size={18} />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-[16px] text-slate-900 dark:text-white tracking-tight leading-tight">
                      Top Productos
                    </h3>
                    <p className="text-[11.5px] text-slate-400 font-medium">Mayor rotación y volumen</p>
                  </div>
                </div>
                <span className="text-[11px] font-extrabold px-2.5 py-1 rounded-full bg-violet-50 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300 border border-violet-200/60 dark:border-violet-500/30">
                  Más vendidos
                </span>
              </div>

              {/* Ranking List */}
              <div className="space-y-2 my-4">
                {topProducts.length === 0 ? (
                  <div className="py-8 text-center">
                    <p className="text-xs font-bold text-slate-800 dark:text-slate-200">Sin ventas aún</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">El ranking se calculará automáticamente al registrar ventas.</p>
                  </div>
                ) : (
                  topProducts.slice(0, 5).map((tp, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-2.5 rounded-2xl hover:bg-slate-50 dark:hover:bg-white/5 transition-all"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {/* Rank Badge */}
                        <span className={`w-7 h-7 rounded-xl flex items-center justify-center text-xs font-extrabold shrink-0 shadow-xs ${
                          idx === 0
                            ? 'bg-gradient-to-tr from-[#5550F2] to-[#818CF8] text-white shadow-indigo-500/20'
                            : idx === 1
                            ? 'bg-slate-800 text-white dark:bg-white/20'
                            : idx === 2
                            ? 'bg-slate-200 text-slate-700 dark:bg-white/10 dark:text-slate-300'
                            : 'bg-slate-100 text-slate-500 dark:bg-white/5 dark:text-slate-400'
                        }`}>
                          #{idx + 1}
                        </span>

                        {/* Name & Cat */}
                        <div className="min-w-0">
                          <p className="text-[13px] font-bold text-slate-900 dark:text-white truncate leading-tight">
                            {tp.name}
                          </p>
                          <p className="text-[11px] text-slate-400 font-medium mt-0.5 truncate">
                            {tp.category} · <span className="font-semibold text-indigo-600 dark:text-indigo-400">{tp.qty} ventas</span>
                          </p>
                        </div>
                      </div>

                      {/* Revenue */}
                      <div className="text-right shrink-0 pl-2">
                        <span className="text-[13px] font-extrabold font-mono text-slate-900 dark:text-white">
                          {formatMoney(tp.revenue)}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Footer Link */}
            <div className="pt-3 border-t border-slate-100 dark:border-white/10 mt-auto">
              <Link
                to="/productos"
                className="w-full py-2.5 px-4 rounded-xl bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-700 dark:text-slate-200 text-xs font-bold transition-all flex items-center justify-between text-decoration-none"
              >
                <span>Ver catálogo completo</span>
                <ChevronRight size={14} />
              </Link>
            </div>
          </div>

          {/* ── CARD 3: GESTIÓN DE CLIENTES & CARTERA COMERCIAL ── */}
          <div className="bg-white dark:bg-[#121420] rounded-2xl sm:rounded-3xl p-4 sm:p-6 border border-slate-200/90 dark:border-white/10 shadow-[0_1px_3px_0_rgba(15,23,42,0.04),0_6px_20px_-3px_rgba(15,23,42,0.06)] hover:shadow-[0_4px_6px_-1px_rgba(15,23,42,0.06),0_12px_28px_-4px_rgba(15,23,42,0.1)] transition-all flex flex-col justify-between">
            <div>
              {/* Header */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                    <Users size={18} />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-[16px] text-slate-900 dark:text-white tracking-tight leading-tight">
                      Clientes & Cartera
                    </h3>
                    <p className="text-[11.5px] text-slate-400 font-medium">Actividad y rotación comercial</p>
                  </div>
                </div>
                <span className="text-[11px] font-extrabold px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-500/30 font-mono">
                  {clientPerformance.totalCount} clientes
                </span>
              </div>

              {/* Fast Metrics Row */}
              <div className="grid grid-cols-2 gap-2 my-3 p-2.5 rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-slate-100 dark:border-white/5">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400">Compradores</span>
                  <p className="text-sm font-black text-slate-900 dark:text-white font-mono mt-0.5">
                    {clientPerformance.activeBuyers} activos
                  </p>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400">Ticket Promedio</span>
                  <p className="text-sm font-black text-emerald-600 dark:text-emerald-400 font-mono mt-0.5 truncate">
                    {formatMoney(currentMonthMetrics.ticketPromedio)}
                  </p>
                </div>
              </div>

              {/* Top Buyers List */}
              <div className="space-y-2.5 my-3">
                {clientPerformance.topList.length === 0 ? (
                  <div className="py-6 text-center">
                    <p className="text-xs font-bold text-slate-800 dark:text-slate-200">Sin historial de clientes</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">Registra clientes o asócialos a tus ventas para ver el ranking.</p>
                  </div>
                ) : (
                  clientPerformance.topList.map((cl, idx) => (
                    <div key={idx} className="flex items-center justify-between p-2 rounded-xl hover:bg-slate-50 dark:hover:bg-white/5 transition-all">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-7 h-7 rounded-lg bg-indigo-600 text-white font-bold text-[11px] flex items-center justify-center shrink-0">
                          {cl.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="text-[12.5px] font-bold text-slate-800 dark:text-slate-200 truncate leading-tight">
                            {cl.name}
                          </p>
                          <p className="text-[10.5px] text-slate-400 mt-0.5">
                            {cl.orders} pedido{cl.orders !== 1 ? 's' : ''} emitido{cl.orders !== 1 ? 's' : ''}
                          </p>
                        </div>
                      </div>

                      <div className="text-right shrink-0 pl-2">
                        <span className="text-[12px] font-extrabold font-mono text-slate-900 dark:text-white">
                          {formatMoney(cl.total)}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Footer Link */}
            <div className="pt-3 border-t border-slate-100 dark:border-white/10 mt-auto">
              <Link
                to="/clientes"
                className="w-full py-2.5 px-4 rounded-xl bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-700 dark:text-slate-200 text-xs font-bold transition-all flex items-center justify-between text-decoration-none"
              >
                <span>Ver directorio de clientes</span>
                <ChevronRight size={14} />
              </Link>
            </div>
          </div>

        </div>

      {/* ─── Cierre de contenedor principal finnova-root ─── */}
      </div>

      {/* ═══════════════════════════════════════════════════════════
          MODAL: AGREGAR CONCEPTO A LA FACTURA (En Español)
         ═══════════════════════════════════════════════════════════ */}
      {addItemModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#1E2038] rounded-2xl w-full max-w-md p-6 shadow-2xl border border-slate-200 dark:border-white/10">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-white/10">
              <h3 className="font-extrabold text-slate-900 dark:text-white text-base">
                + Agregar producto a #{currentInvoice?.code}
              </h3>
              <button
                onClick={() => setAddItemModalOpen(false)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAddItem} className="space-y-4 mt-4">
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Nombre del producto o ítem
                </label>
                <input
                  type="text"
                  placeholder="Ej. AirPods 3 Pro, Cargador Rápido GaN 65W..."
                  value={newItemName}
                  onChange={(e) => setNewItemName(e.target.value)}
                  required
                  className="w-full mt-1.5 px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 text-sm bg-slate-50 dark:bg-white/5 outline-none focus:border-indigo-500 text-slate-800 dark:text-white"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Precio ({currency})
                </label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="Ej. 520.00"
                  value={newItemPrice}
                  onChange={(e) => setNewItemPrice(e.target.value)}
                  required
                  className="w-full mt-1.5 px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 text-sm bg-slate-50 dark:bg-white/5 outline-none focus:border-indigo-500 text-slate-800 dark:text-white font-mono"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setAddItemModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-[#5550F2] text-white shadow-md shadow-indigo-600/30 hover:bg-[#4742E8] cursor-pointer"
                >
                  Agregar al comprobante
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════
          MODAL: REGISTRAR NUEVA VENTA (En Español)
         ═══════════════════════════════════════════════════════════ */}
      {createModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#1E2038] rounded-2xl w-full max-w-md p-6 shadow-2xl border border-slate-200 dark:border-white/10">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-white/10">
              <h3 className="font-extrabold text-slate-900 dark:text-white text-base">
                + Registrar nueva venta / pedido
              </h3>
              <button
                onClick={() => setCreateModalOpen(false)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateInvoice} className="space-y-4 mt-4">
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Nombre del Cliente o Razón Social
                </label>
                <input
                  type="text"
                  placeholder="Ej. Importaciones Lima SAC, Juan Pérez..."
                  value={newInvClient}
                  onChange={(e) => setNewInvClient(e.target.value)}
                  required
                  className="w-full mt-1.5 px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 text-sm bg-slate-50 dark:bg-white/5 outline-none focus:border-indigo-500 text-slate-800 dark:text-white"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Producto o Detalle de Venta
                </label>
                <input
                  type="text"
                  placeholder="Ej. Lote AirPods 3 Pro / Pedido Mayorista"
                  value={newInvService}
                  onChange={(e) => setNewInvService(e.target.value)}
                  required
                  className="w-full mt-1.5 px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 text-sm bg-slate-50 dark:bg-white/5 outline-none focus:border-indigo-500 text-slate-800 dark:text-white"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Monto Total ({currency})
                </label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="Ej. 14500.00"
                  value={newInvAmount}
                  onChange={(e) => setNewInvAmount(e.target.value)}
                  required
                  className="w-full mt-1.5 px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 text-sm bg-slate-50 dark:bg-white/5 outline-none focus:border-indigo-500 text-slate-800 dark:text-white font-mono"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-[#5550F2] text-white shadow-md shadow-indigo-600/30 hover:bg-[#4742E8] cursor-pointer"
                >
                  Registrar venta
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════
          RECEIPT MODAL (When Payout now or Paperclip is clicked)
         ═══════════════════════════════════════════════════════════ */}
      {receiptOpen && (
        <ReceiptModal
          isOpen={receiptOpen}
          onClose={() => setReceiptOpen(false)}
          sale={currentInvoice?.rawSale || {
            id: currentInvoice?.id,
            created_at: new Date().toISOString(),
            client_name: currentInvoice?.client_name,
            discount: 0,
            items: currentInvoice?.items?.map((it, i) => ({
              id: i,
              product_id: i,
              quantity: it.qty || 1,
              unit_price: it.price
            })) || []
          }}
          client={{
            name: currentInvoice?.client_name,
            phone: '+51 987 654 321'
          }}
          products={products}
          company={company}
        />
      )}
      {/* ═══════════════════════════════════════════════════════════
          PAYMENT QR MODAL (Yape, Plin & Banks)
         ═══════════════════════════════════════════════════════════ */}
      <PaymentQrModal
        isOpen={Boolean(qrModalMethod)}
        onClose={() => setQrModalMethod(null)}
        method={qrModalMethod}
        paymentConfig={paymentConfig}
        amount={qrModalAmount}
        currency={currency}
      />
    </>
  )
}
