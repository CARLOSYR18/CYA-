import { useEffect, useMemo, useState, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  ArrowLeft, SlidersHorizontal, Plus, AlertTriangle, Calendar, Clock,
  Wallet, ArrowUpRight, ArrowDownRight, Search, ChevronDown, MoreVertical,
  LayoutGrid, Paperclip, CheckCircle2, Eye, RefreshCw, FileText,
  Receipt, ShoppingBag, Bell, Settings, DollarSign, X, Check, ExternalLink,
  ChevronRight, Sun, Moon, LogOut, Menu, User, Boxes, TrendingUp, QrCode
} from 'lucide-react'
import AppLayout, { useLayout } from '../components/layout/AppLayout'
import ReceiptModal from '../components/Receipt'
import PaymentQrModal from '../components/PaymentQrModal'
import { DashboardKpiSkeleton, DashboardSalesMasterSkeleton, Skeleton } from '../components/ui/Skeleton'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import { productsService } from '../services/productsService'
import { salesService } from '../services/salesService'
import { categoriesService } from '../services/categoriesService'
import { clientsService } from '../services/clientsService'
import { purchasesService } from '../services/purchasesService'
import { companySettingsService } from '../services/companySettingsService'
import { paymentMethodsService } from '../services/paymentMethodsService'
import { getNotifications } from '../lib/notifications'

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
  const { user, logout, isPlatformAdmin } = useAuth()
  const { isDark, toggleTheme } = useTheme()
  const { openSidebar } = useLayout()

  // ERP Backend States
  const [products, setProducts] = useState([])
  const [sales, setSales] = useState([])
  const [categories, setCategories] = useState([])
  const [clients, setClients] = useState([])
  const [company, setCompany] = useState(null)
  const [loading, setLoading] = useState(true)

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
  const [activeTab, setActiveTab] = useState('unpaid') // 'all' | 'draft' | 'unpaid'
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

  // Fetch notifications
  useEffect(() => {
    getNotifications().then(list => setNotifications(list || [])).catch(() => {})
  }, [])

  // Close menus on outside click
  useEffect(() => {
    const handleOutside = (e) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) setUserDropdownOpen(false)
      if (notifMenuRef.current && !notifMenuRef.current.contains(e.target)) setNotifDropdownOpen(false)
    }
    document.addEventListener('mousedown', handleOutside)
    return () => document.removeEventListener('mousedown', handleOutside)
  }, [])

  // Fetch real ERP data
  const loadData = async () => {
    setLoading(true)
    try {
      const [p, s, c, cl, co] = await Promise.all([
        productsService.list(),
        salesService.list(),
        categoriesService.list(),
        clientsService.list(),
        companySettingsService.get()
      ])
      setProducts(p || [])
      setSales(s || [])
      setCategories(c || [])
      setClients(cl || [])
      setCompany(co || null)

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

          const isPaid = sale.status === 'pagado'

          return {
            id: String(sale.id),
            code: codeFormatted,
            client_name: clientName,
            client_role: clientObj?.phone || clientObj?.email || 'Cliente Registrado',
            due_text: isPaid ? 'Cobrado / Pagado' : (sale.due_date ? `Vence: ${sale.due_date}` : 'Pendiente de cobro'),
            status: isPaid ? 'Pagada' : 'Pendiente',
            amount: total,
            avatar: avatars[idx % avatars.length],
            company: co?.name || 'CYA Store',
            items,
            subtotal: total,
            total,
            balance: isPaid ? 0 : total,
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
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
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

    // Ventas del mes
    const monthSales = sales.filter(s => s.created_at && s.created_at.startsWith(currentMonthStr))
    const facturacionMes = monthSales.reduce((acc, s) => acc + salesService.saleTotal(s), 0)
    const ventasMesCount = monthSales.length
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

      const daySales = sales.filter(s => s.created_at && s.created_at.slice(0, 10) === dateStr)
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
        const cat = categories.find(c => c.id === p.category_id)?.name || 'General'
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
      const cat = categories.find(c => c.id === prod?.category_id)?.name || 'General'
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

  return (
    <>
      <div className="finnova-root space-y-4 sm:space-y-6 max-w-[1400px] mx-auto pb-24 sm:pb-16">
        {/* ─── Custom CSS for FINNOVA Design System (Robust Light & Dark Mode) ─── */}
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=IBM+Plex+Mono:wght@500;600;700&display=swap');

          .finnova-root {
            font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif;
          }

          /* Metric Cards (Responsive for mobile, tablet, and desktop) */
          .fn-card {
            background: #ffffff;
            border-radius: 18px;
            border: 1px solid #ECEEF3;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.02);
            padding: 16px;
            min-height: 180px;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            transition: transform 0.2s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.2s, background 0.2s, border-color 0.2s;
          }
          @media (min-width: 640px) {
            .fn-card {
              border-radius: 22px;
              padding: 22px;
              min-height: 195px;
            }
          }
          .fn-card:hover {
            transform: translateY(-2px);
            box-shadow: 0 10px 26px rgba(0, 0, 0, 0.05);
          }
          html.dark .fn-card,
          .dark .fn-card {
            background: #131627 !important;
            border-color: rgba(255, 255, 255, 0.08) !important;
            box-shadow: 0 4px 24px rgba(0, 0, 0, 0.45) !important;
          }
          html.dark .fn-card:hover,
          .dark .fn-card:hover {
            border-color: rgba(99, 102, 241, 0.35) !important;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.6) !important;
          }

          /* Filter Pills */
          .fn-filter-pill {
            background: #ffffff;
            border: 1px solid #E2E8F0;
            border-radius: 999px;
            padding: 6px 13px;
            font-size: 12px;
            font-weight: 500;
            color: #475569;
            display: inline-flex;
            align-items: center;
            gap: 7px;
            cursor: pointer;
            transition: all 0.15s;
            white-space: nowrap;
          }
          @media (min-width: 640px) {
            .fn-filter-pill {
              padding: 7px 16px;
              font-size: 13px;
              gap: 8px;
            }
          }
          .fn-filter-pill:hover {
            border-color: #CBD5E1;
            color: #1E293B;
            background: #F8FAFC;
          }
          html.dark .fn-filter-pill,
          .dark .fn-filter-pill {
            background: #131627 !important;
            border-color: rgba(255, 255, 255, 0.08) !important;
            color: #94A3B8 !important;
          }
          html.dark .fn-filter-pill:hover,
          .dark .fn-filter-pill:hover {
            border-color: rgba(255, 255, 255, 0.22) !important;
            color: #ffffff !important;
            background: #1A1E36 !important;
          }
          .fn-filter-pill input {
            background: transparent !important;
          }

          /* The Master Sales & Billing Container (Light & Dark Mode) */
          .fn-dark-container {
            background: #ffffff;
            border-radius: 22px;
            padding: 18px 14px;
            box-shadow: 0 10px 30px -5px rgba(0, 0, 0, 0.04), 0 2px 6px -2px rgba(0, 0, 0, 0.02);
            border: 1px solid #ECEEF3;
            transition: background 0.25s, border-color 0.25s, box-shadow 0.25s;
          }
          @media (min-width: 640px) {
            .fn-dark-container {
              border-radius: 30px;
              padding: 26px 28px;
            }
          }
          html.dark .fn-dark-container,
          .dark .fn-dark-container {
            background: #111424 !important;
            border-color: rgba(255, 255, 255, 0.08) !important;
            box-shadow: 0 24px 60px -15px rgba(8, 10, 24, 0.65) !important;
          }

          /* Left Invoices List */
          .fn-invoice-row {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 11px 12px;
            border-radius: 16px;
            cursor: pointer;
            transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
            color: #1E293B;
            background: #F8FAFC;
            gap: 10px;
            border: 1px solid #EEF2F6;
          }
          @media (min-width: 640px) {
            .fn-invoice-row {
              padding: 12px 16px;
              border-radius: 18px;
              gap: 12px;
            }
          }
          .fn-invoice-row:hover:not(.active) {
            background: #F1F5F9;
            border-color: #CBD5E1;
          }
          html.dark .fn-invoice-row,
          .dark .fn-invoice-row {
            color: #ffffff !important;
            background: transparent !important;
            border-color: transparent !important;
          }
          html.dark .fn-invoice-row:hover:not(.active),
          .dark .fn-invoice-row:hover:not(.active) {
            background: rgba(255, 255, 255, 0.05) !important;
            border-color: rgba(255, 255, 255, 0.08) !important;
          }
          .fn-invoice-row.active {
            background: linear-gradient(90deg, #4F46E5 0%, #6366F1 100%) !important;
            box-shadow: 0 10px 25px -4px rgba(79, 70, 229, 0.45), inset 0 1px 1px rgba(255, 255, 255, 0.35) !important;
            border-color: rgba(199, 210, 254, 0.4) !important;
            color: #ffffff !important;
          }

          /* Right Detail Card (Light Mode Soft Violet Gradient / Dark Mode Deep Navy) */
          .fn-detail-card {
            background: linear-gradient(145deg, #F5F7FF 0%, #EDF0FE 50%, #E9EDFD 100%);
            border-radius: 22px;
            padding: 20px 18px;
            border: 1px solid rgba(99, 102, 241, 0.22);
            box-shadow: 0 14px 34px -10px rgba(79, 70, 229, 0.12), inset 0 1px 2px rgba(255, 255, 255, 0.9);
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            min-height: 380px;
            position: relative;
            transition: background 0.25s, border-color 0.25s, box-shadow 0.25s;
          }
          @media (min-width: 640px) {
            .fn-detail-card {
              border-radius: 26px;
              padding: 26px 28px;
              min-height: 410px;
            }
          }
          html.dark .fn-detail-card,
          .dark .fn-detail-card {
            background: linear-gradient(145deg, #2A2561 0%, #352F7A 45%, #201C4E 100%) !important;
            border-color: rgba(165, 180, 252, 0.25) !important;
            box-shadow: 0 20px 50px -10px rgba(10, 8, 30, 0.6), inset 0 1px 1.5px rgba(255, 255, 255, 0.3) !important;
          }

          /* Detail Service Cards */
          .fn-service-card {
            background: rgba(255, 255, 255, 0.9);
            border: 1px solid rgba(99, 102, 241, 0.16);
            border-radius: 16px;
            padding: 13px 15px;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            min-height: 84px;
            box-shadow: 0 2px 8px rgba(79, 70, 229, 0.05);
            transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
          }
          @media (min-width: 640px) {
            .fn-service-card {
              padding: 14px 16px;
              min-height: 88px;
            }
          }
          .fn-service-card:hover {
            background: #ffffff;
            border-color: rgba(99, 102, 241, 0.35);
            transform: translateY(-2px);
            box-shadow: 0 6px 16px rgba(79, 70, 229, 0.1);
          }
          html.dark .fn-service-card,
          .dark .fn-service-card {
            background: rgba(255, 255, 255, 0.09) !important;
            border-color: rgba(255, 255, 255, 0.16) !important;
            box-shadow: none !important;
            backdrop-filter: blur(10px);
          }
          html.dark .fn-service-card:hover,
          .dark .fn-service-card:hover {
            background: rgba(255, 255, 255, 0.15) !important;
            border-color: rgba(255, 255, 255, 0.28) !important;
          }

          /* Custom Scrollbar */
          .fn-scroll::-webkit-scrollbar {
            width: 5px;
          }
          .fn-scroll::-webkit-scrollbar-track {
            background: rgba(255, 255, 255, 0.02);
          }
          .fn-scroll::-webkit-scrollbar-thumb {
            background: rgba(255, 255, 255, 0.15);
            border-radius: 999px;
          }
        `}</style>

        {/* ═══════════════════════════════════════════════════════════
            1. THE UNIFIED FINNOVA TOP NAVIGATION BAR (En Español)
           ═══════════════════════════════════════════════════════════ */}
        <div className="flex items-center justify-between bg-white dark:bg-[#131627] rounded-2xl sm:rounded-3xl px-3 sm:px-6 py-2.5 sm:py-3 border border-slate-200/80 dark:border-white/10 shadow-xs transition-all">
          {/* Left: Hamburger (mobile/tablet) + FINNOVA Brand */}
          <div className="flex items-center gap-2.5 sm:gap-3.5 min-w-0">
            <button
              type="button"
              onClick={openSidebar}
              className="lg:hidden p-1.5 rounded-xl text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition-colors shrink-0 cursor-pointer"
              title="Abrir menú lateral"
              aria-label="Abrir menú lateral"
            >
              <Menu size={19} />
            </button>

            <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-[#5550F2] to-[#7974FF] flex items-center justify-center shadow-md shadow-indigo-500/25 shrink-0">
              <svg width="19" height="19" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M4 6C4 4.89543 4.89543 4 6 4H10C11.1046 4 12 4.89543 12 6V18C12 19.1046 11.1046 20 10 20H6C4.89543 20 4 19.1046 4 18V6Z" fill="white" fillOpacity="0.95"/>
                <path d="M14 10C14 8.89543 14.8954 8 16 8H18C19.1046 8 20 8.89543 20 10V18C20 19.1046 19.1046 20 18 20H16C14.8954 20 14 19.1046 14 18V10Z" fill="white" fillOpacity="0.65"/>
              </svg>
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <span className="font-black text-sm sm:text-[16px] text-slate-900 dark:text-white tracking-tight">CYA STORE</span>
                <span className="text-[9.5px] font-black px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-600 dark:bg-white/10 dark:text-slate-200 border border-indigo-200/50 dark:border-white/10">ERP</span>
              </div>
              <p className="hidden sm:block text-[10.5px] text-slate-400 font-medium leading-none mt-0.5">Control de Inventario & Ventas</p>
            </div>
          </div>

          {/* Center: Segmented Navigation Capsule (Light & Dark Responsive) */}
          <div className="hidden xl:flex items-center gap-1 bg-slate-100/90 dark:bg-[#0A0C16] p-1.5 rounded-full border border-slate-200/80 dark:border-white/5 shadow-inner">
            <button
              onClick={() => navigate('/')}
              className="px-4 py-1.5 rounded-full text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/60 dark:hover:bg-white/5 transition-all cursor-pointer"
            >
              + Resumen
            </button>
            <button
              onClick={() => navigate('/productos')}
              className="px-4 py-1.5 rounded-full text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/60 dark:hover:bg-white/5 transition-all cursor-pointer"
            >
              Catálogo
            </button>
            <button
              onClick={() => navigate('/ventas')}
              className="px-4 py-1.5 rounded-full text-xs font-bold text-white bg-[#5550F2] shadow-md shadow-indigo-600/35 transition-all cursor-pointer"
            >
              + Ventas & POS
            </button>
            <button
              onClick={() => navigate('/movimientos')}
              className="px-4 py-1.5 rounded-full text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/60 dark:hover:bg-white/5 transition-all cursor-pointer"
            >
              Movimientos
            </button>
            <button
              onClick={() => navigate('/compras')}
              className="px-4 py-1.5 rounded-full text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/60 dark:hover:bg-white/5 transition-all cursor-pointer"
            >
              Compras
            </button>
            <button
              onClick={() => navigate('/ventas/nueva')}
              className="px-4 py-1.5 rounded-full text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/60 dark:hover:bg-white/5 transition-all cursor-pointer"
            >
              Punto de Venta
            </button>
          </div>

          {/* Right: Currency Toggle, Theme, Reload, Notifications & User Dropdown */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* Currency Selector Pill */}
            <button
              onClick={toggleCurrency}
              className="hidden sm:flex px-3 py-1.5 text-xs font-bold rounded-full border border-slate-200/80 dark:border-white/10 bg-slate-50 dark:bg-white/10 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/15 transition-all cursor-pointer shadow-2xs"
              title="Cambiar Moneda (S/ / $)"
            >
              {currency === 'S/' ? 'PEN (S/)' : 'USD ($)'}
            </button>

            {/* Theme Toggle Button (Circular Pill) */}
            <button
              onClick={toggleTheme}
              className="hidden sm:flex w-8 h-8 rounded-full border border-slate-200/80 dark:border-white/10 bg-slate-50 dark:bg-white/10 items-center justify-center text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/15 transition-all cursor-pointer shadow-2xs"
              title="Cambiar Modo Claro / Oscuro"
            >
              {isDark ? <Sun size={14} className="text-amber-400" /> : <Moon size={14} />}
            </button>

            {/* Reload Button (Circular Pill) */}
            <button
              onClick={loadData}
              className="hidden sm:flex w-8 h-8 rounded-full border border-slate-200/80 dark:border-white/10 bg-slate-50 dark:bg-white/10 items-center justify-center text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/15 transition-all cursor-pointer shadow-2xs"
              title="Actualizar Datos"
            >
              <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
            </button>

            {/* Notification Bell with Badge (Circular Pill) */}
            <div className="relative" ref={notifMenuRef}>
              <button
                onClick={() => setNotifDropdownOpen(o => !o)}
                className="w-8 h-8 rounded-full border border-slate-200/80 dark:border-white/10 bg-slate-50 dark:bg-white/10 flex items-center justify-center text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/15 relative transition-all cursor-pointer shadow-2xs"
              >
                <Bell size={14} />
                {notifications.length > 0 && (
                  <span className="w-4 h-4 rounded-full bg-rose-500 text-white text-[9px] font-black flex items-center justify-center absolute -top-1 -right-1 ring-2 ring-white dark:ring-[#131627]">
                    {notifications.length}
                  </span>
                )}
              </button>
              {notifDropdownOpen && (
                <div className="absolute right-0 mt-2 w-[min(calc(100vw-32px),288px)] bg-white dark:bg-[#1E2038] rounded-2xl shadow-2xl border border-slate-200 dark:border-white/10 p-3 z-40">
                  <p className="text-xs font-bold text-slate-900 dark:text-white mb-2">Notificaciones</p>
                  {notifications.length === 0 ? (
                    <p className="text-xs text-slate-400 py-3 text-center">No hay notificaciones pendientes</p>
                  ) : (
                    <div className="space-y-1.5 max-h-48 overflow-y-auto">
                      {notifications.slice(0, 4).map((n, i) => (
                        <div key={i} className="p-2 rounded-xl bg-slate-50 dark:bg-white/5 text-[11px]">
                          <p className="font-semibold text-slate-800 dark:text-slate-200">{n.title || n.message}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* User Profile Dropdown */}
            <div className="relative ml-1" ref={userMenuRef}>
              <button
                onClick={() => setUserDropdownOpen(o => !o)}
                className="flex items-center cursor-pointer focus:outline-none"
              >
                <div className="w-8 h-8 rounded-full overflow-hidden ring-2 ring-indigo-500/25 hover:ring-indigo-500 transition-all shadow-xs bg-slate-800">
                  <img
                    src="/avatar-3.jpg"
                    alt="Usuario"
                    className="w-full h-full object-cover"
                    onError={(e) => { e.currentTarget.src = '/hero-worker.jpg' }}
                  />
                </div>
              </button>
              {userDropdownOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-[#1E2038] rounded-2xl shadow-2xl border border-slate-200 dark:border-white/10 p-2 z-40">
                  <div className="px-3 py-2 border-b border-slate-100 dark:border-white/10">
                    <p className="text-xs font-bold text-slate-900 dark:text-white truncate">{user?.full_name || 'Carlos Admin'}</p>
                    <p className="text-[11px] text-slate-400 truncate">{user?.email || 'cya@gmail.com'}</p>
                    <span className="inline-block mt-1 text-[9px] font-extrabold uppercase px-1.5 py-0.2 rounded-md bg-indigo-50 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400">
                      {isPlatformAdmin ? 'SUPER ADMIN' : 'ADMINISTRADOR'}
                    </span>
                  </div>
                  <div className="pt-1">
                    <button
                      onClick={() => navigate('/configuracion')}
                      className="w-full text-left px-3 py-1.5 text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5 rounded-lg flex items-center gap-2 cursor-pointer"
                    >
                      <Settings size={13} /> Configuración
                    </button>
                    <button
                      onClick={logout}
                      className="w-full text-left px-3 py-1.5 text-xs text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg flex items-center gap-2 font-semibold cursor-pointer"
                    >
                      <LogOut size={13} /> Cerrar Sesión
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════
            2. PAGE TITLE BAR — Invoices & Action Button (En Español)
           ═══════════════════════════════════════════════════════════ */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(-1)}
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-white dark:bg-[#131627] border border-slate-200 dark:border-white/10 shadow-xs flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors cursor-pointer shrink-0"
              title="Regresar"
            >
              <ArrowLeft size={17} />
            </button>
            <div className="min-w-0">
              <h1 className="text-xl sm:text-[26px] font-extrabold text-slate-900 dark:text-white tracking-tight leading-tight truncate">
                Control de Ventas & Facturación
              </h1>
              <p className="text-xs sm:text-[13px] text-slate-500 dark:text-slate-400 font-medium mt-0.5 line-clamp-1 sm:line-clamp-none">
                Monitorea pedidos emitidos, cobros a clientes y rotación comercial de tu inventario.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
            <button
              onClick={toggleCurrency}
              className="px-3 py-2 rounded-xl bg-white dark:bg-[#131627] border border-slate-200 dark:border-white/10 shadow-xs flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors cursor-pointer"
              title="Cambiar Moneda"
            >
              <span>{currency === 'S/' ? 'S/ (PEN)' : '$ (USD)'}</span>
            </button>

            <button
              onClick={() => navigate('/ventas/nueva')}
              className="inline-flex items-center gap-1.5 sm:gap-2 px-3.5 sm:px-5 py-2 sm:py-2.5 rounded-xl bg-[#5550F2] text-white text-xs sm:text-sm font-bold shadow-lg shadow-indigo-600/30 hover:bg-[#4742E8] active:scale-[0.98] transition-all cursor-pointer whitespace-nowrap"
            >
              <Plus size={16} strokeWidth={2.5} />
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">

          {/* Card 1: Facturación del Mes (con Banner Visual Estilo Finnova) */}
          <div className="fn-card bg-white dark:bg-[#131627] border border-slate-200/90 dark:border-white/10">
            <div>
              <div className="flex items-start justify-between">
                <span className="text-[13px] font-semibold text-slate-600 dark:text-slate-300">Facturación del Mes</span>
                <div className="w-7 h-7 rounded-full bg-emerald-50 dark:bg-emerald-500/15 border border-emerald-200 dark:border-emerald-500/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                  <TrendingUp size={14} />
                </div>
              </div>
              <div className="text-[25px] font-black text-slate-900 dark:text-white tracking-tight mt-1">
                {formatMoney(currentMonthMetrics.facturacionMes)}
              </div>
              <div className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 mt-0.5">
                <ArrowUpRight size={13} />
                <span>{currentMonthMetrics.ventasMesCount} venta{currentMonthMetrics.ventasMesCount !== 1 ? 's' : ''} este mes</span>
              </div>
            </div>

            {/* Visual Photo / Gradient Banner from Finnova */}
            <div className="mt-3.5 h-[62px] rounded-xl overflow-hidden relative shadow-xs border border-slate-100 dark:border-white/5 bg-slate-900 group">
              <img
                src="https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=600&q=80"
                alt="Finnova Desk"
                className="w-full h-full object-cover opacity-85 group-hover:scale-105 transition-transform duration-500"
                onError={(e) => {
                  e.currentTarget.style.display = 'none'
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-900/85 via-slate-900/30 to-transparent flex items-end p-2.5">
                <div className="flex items-center justify-between w-full text-white text-[11px]">
                  <span className="font-semibold text-white/90">Ticket Promedio</span>
                  <span className="font-black font-mono tracking-tight">{formatMoney(currentMonthMetrics.ticketPromedio)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Card 2: Capital en Inventario con las 7 Barras Estilo Finnova */}
          <div className="fn-card bg-white dark:bg-[#131627] border border-slate-200/90 dark:border-white/10">
            <div>
              <div className="flex items-start justify-between">
                <span className="text-[13px] font-semibold text-slate-600 dark:text-slate-300">Capital en Inventario</span>
                <div className="w-7 h-7 rounded-full bg-indigo-50 dark:bg-indigo-500/15 border border-indigo-200 dark:border-indigo-500/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                  <Wallet size={14} />
                </div>
              </div>
              <div className="text-[25px] font-black text-slate-900 dark:text-white tracking-tight mt-1">
                {formatMoney(currentMonthMetrics.capitalInventario)}
              </div>
              <div className="flex items-center gap-1 text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 mt-0.5">
                <ArrowUpRight size={13} />
                <span>Total físico: {currentMonthMetrics.totalFisicoUds} uds.</span>
              </div>
            </div>

            {/* 7 Vertical Gradient Bars with Track Background (Finnova Style) */}
            <div className="mt-3 pt-1 flex items-end justify-between gap-1.5 h-[64px]">
              {last7DaysSales.map((bar, i) => (
                <div key={i} className="flex-1 flex flex-col items-center h-full justify-end group cursor-pointer" title={`${bar.label}: ${formatMoney(bar.total)} (${bar.count} ventas)`}>
                  <div className="w-full max-w-[20px] h-[46px] bg-slate-100 dark:bg-white/5 rounded-t-md flex items-end overflow-hidden p-0.5">
                    <div
                      style={{ height: `${bar.val}%` }}
                      className="w-full rounded-t-sm bg-gradient-to-t from-[#4F46E5] to-[#818CF8] group-hover:to-[#A5B4FC] transition-all shadow-xs"
                    />
                  </div>
                  <span className="text-[8.5px] font-bold text-slate-400 dark:text-slate-400 mt-1 uppercase">
                    {bar.month}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Card 3: Tiempo de Rotación con Sparkline SVG Curve (Finnova Exact Match) */}
          <div className="fn-card bg-white dark:bg-[#131627] border border-slate-200/90 dark:border-white/10">
            <div>
              <div className="flex items-start justify-between">
                <span className="text-[13px] font-semibold text-slate-600 dark:text-slate-300">Rotación & Catálogo</span>
                <div className="w-7 h-7 rounded-full bg-cyan-50 dark:bg-cyan-500/15 border border-cyan-200 dark:border-cyan-500/30 flex items-center justify-center text-cyan-600 dark:text-cyan-400">
                  <Clock size={14} />
                </div>
              </div>
              <div className="text-[25px] font-black text-slate-900 dark:text-white tracking-tight mt-1">
                {currentMonthMetrics.totalSkus} SKUs
              </div>
              <div className="flex items-center gap-1 text-[11px] font-semibold text-cyan-600 dark:text-cyan-400 mt-0.5">
                <span>{currentMonthMetrics.totalCategories} Categorías · {currentMonthMetrics.disponibilidadPct}% disponible</span>
              </div>
            </div>

            {/* Finnova Signature Smooth Sparkline SVG Curve */}
            <div className="mt-2.5 h-[50px] flex items-center px-1">
              <svg className="w-full h-full overflow-visible" viewBox="0 0 220 50">
                <defs>
                  <linearGradient id="fnSparkCurve" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#818CF8" />
                    <stop offset="50%" stopColor="#6366F1" />
                    <stop offset="100%" stopColor="#4F46E5" />
                  </linearGradient>
                </defs>
                <path
                  d="M 5 38 Q 45 32, 75 25 T 130 20 T 175 14 T 215 8"
                  fill="none"
                  stroke="url(#fnSparkCurve)"
                  strokeWidth="3"
                  strokeLinecap="round"
                />
                <circle cx="5" cy="38" r="3.5" className="fill-[#818CF8] stroke-white stroke-2" />
                <circle cx="75" cy="25" r="3.5" className="fill-[#6366F1] stroke-white stroke-2" />
                <circle cx="130" cy="20" r="3.5" className="fill-[#6366F1] stroke-white stroke-2" />
                <circle cx="175" cy="14" r="3.5" className="fill-[#4F46E5] stroke-white stroke-2" />
                <circle cx="215" cy="8" r="4.5" className="fill-[#4338CA] stroke-white stroke-2" />
              </svg>
            </div>

            <div className="pt-2 border-t border-slate-100 dark:border-white/5 mt-auto flex items-center justify-between">
              <span className="text-[11px] font-medium text-slate-400">{currentMonthMetrics.totalClients} clientes</span>
              <button
                onClick={() => navigate('/productos')}
                className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <span>Explorar</span>
                <ChevronRight size={13} />
              </button>
            </div>
          </div>

          {/* Card 4: Disponible para Cobro Inmediato (Finnova Exact Layout) */}
          <div className="fn-card bg-white dark:bg-[#131627] border border-slate-200/90 dark:border-white/10">
            <div>
              <div className="flex items-start justify-between">
                <span className="text-[13px] font-semibold text-slate-600 dark:text-slate-300">Disponible para Cobro</span>
                <div className="w-7 h-7 rounded-full bg-emerald-50 dark:bg-emerald-500/15 border border-emerald-200 dark:border-emerald-500/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                  <ArrowUpRight size={14} />
                </div>
              </div>
              <div className="flex items-baseline gap-1.5 mt-1">
                <span className="text-[25px] font-black text-slate-900 dark:text-white tracking-tight">
                  {formatMoney(currentMonthMetrics.facturacionMes)}
                </span>
                <span className="text-[11px] font-medium text-slate-400">Estimado</span>
              </div>
              <div className="text-[11px] font-semibold text-slate-400 mt-0.5 truncate">
                {currentMonthMetrics.criticos === 0 ? 'Sin alertas críticas' : `${currentMonthMetrics.criticos} productos críticos`}
              </div>
            </div>

            {/* Finnova Payment Methods Pills & Cobrar ahora Action */}
            <div className="mt-3 pt-2 border-t border-slate-100 dark:border-white/5 flex items-center justify-between gap-1.5">
              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setQrModalMethod('yape')
                    setQrModalAmount(currentMonthMetrics.facturacionMes || 150)
                  }}
                  className="text-[9.5px] font-bold px-2 py-0.5 rounded-md bg-[#742284]/10 hover:bg-[#742284] text-[#742284] hover:text-white transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs"
                  title="Ver QR de Yape"
                >
                  <img src="/yape-logo.png" alt="Yape" className="w-3.5 h-3.5 rounded-sm object-cover shadow-2xs" />
                  <span>Yape QR</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setQrModalMethod('plin')
                    setQrModalAmount(currentMonthMetrics.facturacionMes || 150)
                  }}
                  className="text-[9.5px] font-bold px-2 py-0.5 rounded-md bg-[#00b49f]/10 hover:bg-[#00b49f] text-[#00b49f] hover:text-white transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs"
                  title="Ver QR de Plin"
                >
                  <img src="/plin-logo.png" alt="Plin" className="w-3.5 h-3.5 rounded-full object-cover shadow-2xs" />
                  <span>Plin QR</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setQrModalMethod('transfer')
                    setQrModalAmount(currentMonthMetrics.facturacionMes || 150)
                  }}
                  className="text-[9.5px] font-bold px-2 py-0.5 rounded-md bg-blue-50 hover:bg-blue-600 text-blue-700 hover:text-white dark:bg-white/10 dark:hover:bg-blue-600 dark:text-slate-200 transition-all cursor-pointer"
                  title="Ver Cuentas Bancarias"
                >
                  BCP
                </button>
              </div>

              <button
                onClick={() => navigate('/ventas/nueva')}
                className="px-3 py-1.5 rounded-full bg-slate-900 hover:bg-black text-white dark:bg-white dark:hover:bg-slate-100 dark:text-slate-900 text-[11px] font-extrabold shadow-md transition-all cursor-pointer whitespace-nowrap"
              >
                Cobrar ahora
              </button>
            </div>
          </div>

        </div>
        )}

        {/* ═══════════════════════════════════════════════════════════
            4. FILTER BAR (Row 2, En Español y Modo Oscuro)
           ═══════════════════════════════════════════════════════════ */}
        <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
          {/* Active filters badge */}
          <div className="fn-filter-pill bg-white dark:bg-[#131627] border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-200 font-bold">
            <span>Filtros activos</span>
            <span className="w-5 h-5 rounded-full bg-[#111827] dark:bg-[#5550F2] text-white text-[11px] font-bold flex items-center justify-center">
              {filteredInvoices.length}
            </span>
          </div>

          {/* All customers dropdown */}
          <div className="relative">
            <button
              onClick={() => setCustomerDropdownOpen(o => !o)}
              className="fn-filter-pill bg-white dark:bg-[#131627] border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-200"
            >
              <span>{selectedCustomerFilter === 'ALL' ? 'Todos los clientes' : selectedCustomerFilter}</span>
              <ChevronDown size={14} className="text-slate-400" />
            </button>
            {customerDropdownOpen && (
              <div className="absolute top-full left-0 mt-2 w-56 max-h-60 overflow-y-auto bg-white dark:bg-[#1A1D30] rounded-xl shadow-xl border border-slate-200 dark:border-white/10 py-1.5 z-30">
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
              className="fn-filter-pill bg-white dark:bg-[#131627] border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-200"
            >
              <span>
                {selectedStatusFilter === 'ALL'
                  ? 'Todos los estados'
                  : selectedStatusFilter === 'Pendiente'
                  ? 'Pendientes'
                  : 'Pagadas'}
              </span>
              <ChevronDown size={14} className="text-slate-400" />
            </button>
            {statusDropdownOpen && (
              <div className="absolute top-full left-0 mt-2 w-44 bg-white dark:bg-[#1A1D30] rounded-xl shadow-xl border border-slate-200 dark:border-white/10 py-1.5 z-30">
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

          {/* Date pill from Finnova */}
          <div className="hidden md:inline-flex fn-filter-pill bg-white dark:bg-[#131627] border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-200">
            <span>Octubre 2026</span>
            <Calendar size={13} className="text-slate-400" />
          </div>

          {/* Search Bar on Right */}
          <div className="fn-filter-pill bg-white dark:bg-[#131627] border border-slate-200 dark:border-white/10 ml-auto w-full sm:w-auto min-w-[260px] px-3.5 py-1.5">
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
            5. THE MASTER CONTAINER: LIGHT & DARK MODE RESPONSIVE
           ═══════════════════════════════════════════════════════════ */}
        <div className="fn-dark-container">

          {/* Top Header inside Container */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
            <div>
              <h2 className="text-[19px] font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                <span>{activeTab === 'unpaid' ? 'Ventas Pendientes de Cobro' : activeTab === 'paid' ? 'Ventas Pagadas / Cobradas' : 'Registro de Ventas & Comprobantes'}</span>
                <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></span>
              </h2>
              <p className="text-[11.5px] text-slate-500 dark:text-slate-400 mt-0.5">Operaciones comerciales y comprobantes registrados en tu ERP</p>
            </div>

            {/* Segmented Floating Pill Tabs + Table shortcut */}
            <div className="flex items-center gap-2">
              <div className="inline-flex items-center gap-1 bg-slate-100 dark:bg-[#0A0C16] p-1 rounded-full border border-slate-200 dark:border-white/10 shadow-inner">
                <button
                  onClick={() => setActiveTab('all')}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                    activeTab === 'all'
                      ? 'bg-white dark:bg-white/15 text-slate-900 dark:text-white shadow-xs font-bold'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  Todas ({invoiceList.length})
                </button>
                <button
                  onClick={() => setActiveTab('unpaid')}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                    activeTab === 'unpaid'
                      ? 'bg-[#5550F2] text-white shadow-md shadow-indigo-600/40'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <span>Pendientes</span>
                  <span className="w-4 h-4 rounded-full bg-amber-400 text-[#1E1B4B] text-[9.5px] font-black flex items-center justify-center">
                    {invoiceList.filter(i => i.status === 'Pendiente').length}
                  </span>
                </button>
                <button
                  onClick={() => setActiveTab('paid')}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                    activeTab === 'paid'
                      ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/40'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <span>Pagadas</span>
                  <span className="w-4 h-4 rounded-full bg-white text-emerald-900 text-[9.5px] font-black flex items-center justify-center">
                    {invoiceList.filter(i => i.status === 'Pagada').length}
                  </span>
                </button>
              </div>

              <button
                onClick={() => navigate('/ventas')}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-white/10 dark:hover:bg-white/15 border border-slate-200 dark:border-white/10 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer shrink-0"
                title="Ver todas las ventas en tabla"
              >
                <LayoutGrid size={14} />
              </button>
            </div>
          </div>

          {/* ═══════════════════════════════════════════════════════════
              SPLIT CONTENT: LEFT INVOICES LIST + RIGHT GLOWING CARD
             ═══════════════════════════════════════════════════════════ */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">

            {/* LEFT COLUMN: Invoices List */}
            <div className="lg:col-span-5 flex flex-col gap-2 max-h-[460px] overflow-y-auto fn-scroll pr-1.5">
              {filteredInvoices.length === 0 ? (
                <div className="py-16 text-center text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-white/[0.02] rounded-2xl border border-slate-200/80 dark:border-white/5">
                  <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-white/5 text-slate-600 dark:text-slate-400 flex items-center justify-center mx-auto mb-2">
                    <Receipt size={18} />
                  </div>
                  <p className="text-sm font-bold text-slate-900 dark:text-white">No hay ventas en esta sección</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Ajusta los filtros o registra una nueva venta en el POS.</p>
                  <button
                    onClick={() => navigate('/ventas/nueva')}
                    className="mt-3.5 px-4 py-2 rounded-xl bg-[#5550F2] text-white text-xs font-bold hover:bg-[#4742E8] shadow-md shadow-indigo-600/30 cursor-pointer"
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
                        {/* Vibrant Avatar with initials */}
                        <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full shrink-0 flex items-center justify-center text-white font-extrabold text-xs shadow-sm bg-gradient-to-tr ${getClientAvatarGradient(inv.client_name)} ${isSelected ? 'ring-2 ring-white/70' : 'ring-1 ring-slate-200 dark:ring-white/20'}`}>
                          {inv.client_name ? inv.client_name.charAt(0).toUpperCase() : 'C'}
                        </div>

                        {/* Client & Code info */}
                        <div className="min-w-0 flex-1">
                          <p className={`text-xs sm:text-[13px] font-extrabold truncate leading-tight ${isSelected ? 'text-white' : 'text-slate-900 dark:text-slate-100'}`}>
                            {inv.client_name}
                          </p>
                          <p className={`text-[10px] sm:text-[11px] mt-0.5 truncate font-medium ${isSelected ? 'text-indigo-100' : 'text-slate-500 dark:text-slate-400'}`}>
                            #{inv.code} · {inv.due_text}
                          </p>
                        </div>
                      </div>

                      {/* Status Pill & Amount */}
                      <div className="flex flex-col sm:flex-row items-end sm:items-center gap-1 sm:gap-2.5 shrink-0 ml-2">
                        <span className={`text-xs sm:text-[14px] font-black tracking-tight font-mono whitespace-nowrap ${isSelected ? 'text-white' : 'text-slate-900 dark:text-slate-100'}`}>
                          {formatMoney(inv.amount)}
                        </span>

                        <span
                          className={`text-[9.5px] sm:text-[10.5px] font-black px-2.5 py-0.5 rounded-full transition-all whitespace-nowrap ${
                            isSelected
                              ? 'bg-white/25 text-white border border-white/40 backdrop-blur-md shadow-xs'
                              : isPaid
                              ? 'bg-emerald-50 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/30'
                              : 'bg-amber-50 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-500/30'
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

            {/* RIGHT COLUMN: The Glowing Detail Card (Light & Dark responsive) */}
            <div className="lg:col-span-7 flex flex-col">
              {currentInvoice ? (
                <div className="fn-detail-card flex-1">

                  {/* Header Row: Detalle de Venta | Emisor | Cliente */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {/* Detalle de Comprobante */}
                    <div>
                      <p className="text-[11px] font-bold text-indigo-900/70 dark:text-indigo-200/80 uppercase tracking-wider">Comprobante</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[21px] font-black text-slate-900 dark:text-white tracking-tight">
                          #{currentInvoice.code}
                        </span>
                        <span className={`text-[10.5px] font-black px-2.5 py-0.5 rounded-full border ${
                          currentInvoice.status === 'Pagada'
                            ? 'bg-emerald-100 dark:bg-emerald-500/25 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-500/40'
                            : 'bg-amber-100 dark:bg-amber-400/25 text-amber-800 dark:text-amber-200 border-amber-300 dark:border-amber-400/40'
                        }`}>
                          {currentInvoice.status}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-500 dark:text-indigo-200/70 mt-0.5 font-medium">
                        Fecha: {currentInvoice.due_text || 'Comprobante registrado'}
                      </p>
                    </div>

                    {/* Emisor Comercial */}
                    <div>
                      <p className="text-[11px] font-bold text-indigo-900/70 dark:text-indigo-200/80 uppercase tracking-wider">Empresa Emisora</p>
                      <div className="flex items-center gap-1.5 mt-1">
                        <span className="text-[18px] font-black text-slate-900 dark:text-white tracking-tight truncate">
                          {currentInvoice.company || 'CYA Store'}
                        </span>
                        <span className="text-indigo-600 dark:text-indigo-300 text-sm font-bold">~</span>
                      </div>
                      <p className="text-[10px] text-slate-500 dark:text-indigo-200/70 mt-0.5 font-medium">Sede Principal · Sistema ERP</p>
                    </div>

                    {/* Cliente */}
                    <div>
                      <p className="text-[11px] font-bold text-indigo-900/70 dark:text-indigo-200/80 uppercase tracking-wider">Cliente</p>
                      <div className="flex items-center gap-2.5 mt-1">
                        <div className={`w-9 h-9 rounded-full shrink-0 flex items-center justify-center text-white font-extrabold text-xs shadow-sm bg-gradient-to-tr ${getClientAvatarGradient(currentInvoice.client_name)} ring-2 ring-indigo-200 dark:ring-white/30`}>
                          {currentInvoice.client_name ? currentInvoice.client_name.charAt(0).toUpperCase() : 'C'}
                        </div>
                        <div className="min-w-0">
                          <p className="text-[13px] font-extrabold text-slate-900 dark:text-white truncate leading-tight">
                            {currentInvoice.client_name}
                          </p>
                          <p className="text-[10.5px] text-slate-500 dark:text-indigo-200/75 truncate mt-0.5 font-medium">
                            {currentInvoice.client_role || 'Cliente Registrado'}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Middle Row: Ítems reales vendidos estilo Finnova */}
                  <div className="my-5">
                    <div className="flex items-center justify-between mb-2.5">
                      <p className="text-xs font-bold text-indigo-950 dark:text-indigo-200 uppercase tracking-wider">
                        Productos del Comprobante ({currentInvoice.items?.length || 0})
                      </p>
                      <span className="text-[11px] text-slate-500 dark:text-indigo-200/70 font-medium">Líneas de producto facturadas</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 max-h-[170px] overflow-y-auto fn-scroll pr-1.5">
                      {currentInvoice.items?.map((item, idx) => (
                        <div key={idx} className="fn-service-card group">
                          <div className="flex items-center justify-between">
                            <span className="text-[15px] font-black text-slate-900 dark:text-white font-mono tracking-tight">
                              {formatMoney(item.price)}
                            </span>
                            <span className="text-[10.5px] font-extrabold text-indigo-700 dark:text-indigo-200 bg-indigo-50 dark:bg-white/10 group-hover:bg-indigo-100 dark:group-hover:bg-white/20 px-2 py-0.5 rounded-full transition-colors">
                              x{item.qty || 1}
                            </span>
                          </div>
                          <div className="mt-2">
                            <p className="text-xs font-bold text-slate-800 dark:text-white/95 line-clamp-1 group-hover:text-indigo-600 dark:group-hover:text-white transition-colors" title={item.name}>
                              {item.name}
                            </p>
                            <div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-indigo-200/75 mt-1 font-medium">
                              <span>P. Unit: {formatMoney(item.price / (item.qty || 1))}</span>
                              <ArrowUpRight size={12} className="text-indigo-600 dark:text-white opacity-70 group-hover:opacity-100 transition-opacity" />
                            </div>
                          </div>
                        </div>
                      ))}

                      {/* Quick Action Card: Nueva Venta en POS */}
                      <div
                        onClick={() => navigate('/ventas/nueva')}
                        className="border-2 border-dashed border-indigo-200 dark:border-white/20 hover:border-indigo-400 dark:hover:border-white/40 bg-white/50 dark:bg-white/10 hover:bg-white/80 dark:hover:bg-white/15 rounded-2xl p-3 flex flex-col items-center justify-center text-center cursor-pointer transition-all min-h-[84px] group"
                        title="Registrar una nueva venta en el sistema"
                      >
                        <div className="w-6 h-6 rounded-full bg-indigo-50 dark:bg-white/10 group-hover:bg-indigo-100 dark:group-hover:bg-white/20 flex items-center justify-center text-indigo-600 dark:text-white mb-1 transition-colors">
                          <Plus size={13} strokeWidth={2.5} />
                        </div>
                        <span className="text-[11.5px] font-bold text-indigo-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-100 transition-colors">+ Nueva Venta</span>
                        <span className="text-[9.5px] text-indigo-600/70 dark:text-indigo-200/70">Abrir punto de venta</span>
                      </div>
                    </div>
                  </div>

                  {/* Bottom Row: Totals & Luxury Action Buttons */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-4 border-t border-indigo-200/70 dark:border-white/15 mt-auto">
                    {/* Totals */}
                    <div className="grid grid-cols-3 gap-3 sm:flex sm:items-center sm:gap-8 w-full sm:w-auto">
                      <div>
                        <p className="text-[10px] sm:text-[11px] font-semibold text-indigo-900/70 dark:text-indigo-200/80 uppercase tracking-wider">Sub Total</p>
                        <p className="text-xs sm:text-[16px] font-black text-slate-900 dark:text-white font-mono mt-0.5 truncate">
                          {formatMoney(currentInvoice.subtotal)}
                        </p>
                      </div>

                      <div>
                        <p className="text-[10px] sm:text-[11px] font-semibold text-indigo-900/70 dark:text-indigo-200/80 uppercase tracking-wider">Total Venta</p>
                        <p className="text-xs sm:text-[16px] font-black text-slate-900 dark:text-white font-mono mt-0.5 truncate">
                          {formatMoney(currentInvoice.total)}
                        </p>
                      </div>

                      <div>
                        <p className="text-[10px] sm:text-[11px] font-semibold text-indigo-900/70 dark:text-indigo-200/80 uppercase tracking-wider">Saldo Pendiente</p>
                        <p className={`text-xs sm:text-[16px] font-black font-mono mt-0.5 truncate ${
                          currentInvoice.balance > 0 ? 'text-amber-700 dark:text-amber-300' : 'text-emerald-700 dark:text-emerald-300'
                        }`}>
                          {formatMoney(currentInvoice.balance)}
                        </p>
                      </div>
                    </div>

                    {/* Actions on right */}
                    <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end shrink-0">
                      <button
                        onClick={() => setReceiptOpen(true)}
                        className="px-4 py-2.5 rounded-full bg-white dark:bg-white/10 hover:bg-indigo-50/80 dark:hover:bg-white/20 border border-indigo-200 dark:border-white/15 flex items-center gap-1.5 text-slate-800 dark:text-white transition-all cursor-pointer text-xs font-bold shadow-xs"
                        title="Ver e imprimir boleta de venta"
                      >
                        <Receipt size={14} />
                        <span>Ver Boleta</span>
                      </button>

                      <button
                        onClick={() => navigate('/ventas')}
                        className="w-10 h-10 rounded-full bg-white dark:bg-white/10 hover:bg-indigo-50/80 dark:hover:bg-white/20 border border-indigo-200 dark:border-white/15 flex items-center justify-center text-slate-800 dark:text-white transition-all cursor-pointer shrink-0 shadow-xs"
                        title="Ir al módulo de ventas"
                      >
                        <ExternalLink size={15} />
                      </button>

                      {currentInvoice.status === 'Pendiente' && (
                        <button
                          type="button"
                          onClick={() => {
                            setQrModalMethod('yape')
                            setQrModalAmount(currentInvoice.balance || 0)
                          }}
                          className="px-3.5 py-2.5 rounded-full bg-[#742284]/10 hover:bg-[#742284] text-[#742284] hover:text-white dark:bg-purple-900/40 dark:hover:bg-[#742284] dark:text-purple-300 dark:hover:text-white border border-purple-200 dark:border-purple-800/40 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs whitespace-nowrap"
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
                          className="px-6 py-2.5 rounded-full bg-slate-900 hover:bg-black text-white dark:bg-white dark:hover:bg-slate-100 dark:text-slate-900 text-xs sm:text-sm font-black shadow-xl shadow-slate-900/20 dark:shadow-black/30 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer disabled:opacity-75 flex items-center gap-2 whitespace-nowrap"
                        >
                          {payoutSuccess ? (
                            <>
                              <Check size={16} strokeWidth={3} className="text-emerald-400 dark:text-emerald-600" />
                              <span>¡Cobrado!</span>
                            </>
                          ) : (
                            <>
                              <DollarSign size={16} strokeWidth={2.5} className="text-indigo-400 dark:text-indigo-600" />
                              <span>Cobrar venta</span>
                            </>
                          )}
                        </button>
                      ) : (
                        <div className="px-5 py-2.5 rounded-full bg-emerald-100 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-500/40 text-xs sm:text-sm font-black flex items-center gap-2 backdrop-blur-sm shadow-xs">
                          <CheckCircle2 size={16} />
                          <span>Pagada</span>
                        </div>
                      )}
                    </div>
                  </div>

                </div>
              ) : (
                <div className="fn-detail-card items-center justify-center text-center py-20">
                  <div className="w-12 h-12 rounded-full bg-indigo-50 dark:bg-white/10 flex items-center justify-center text-indigo-600 dark:text-indigo-200 mx-auto mb-3">
                    <Receipt size={22} />
                  </div>
                  <p className="text-slate-900 dark:text-white font-bold text-sm">Selecciona una venta de la lista</p>
                  <p className="text-slate-500 dark:text-indigo-200/70 text-xs mt-1">Podrás ver los productos facturados, boletas y registrar cobros.</p>
                </div>
              )}
            </div>

          </div>

        </div>

        {/* ═══════════════════════════════════════════════════════════
            6. LOWER ERP METRICS: STOCK ALERTS | TOP PRODUCTS | CATEGORIES
           ═══════════════════════════════════════════════════════════ */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 pt-2">

          {/* ── CARD 1: ALERTAS DE STOCK ── */}
          <div className="bg-white dark:bg-[#131627] rounded-2xl sm:rounded-3xl p-4 sm:p-6 border border-slate-200/80 dark:border-white/10 shadow-xs hover:shadow-md transition-all flex flex-col justify-between">
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
          <div className="bg-white dark:bg-[#131627] rounded-2xl sm:rounded-3xl p-4 sm:p-6 border border-slate-200/80 dark:border-white/10 shadow-xs hover:shadow-md transition-all flex flex-col justify-between">
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

          {/* ── CARD 3: DISTRIBUCIÓN POR CATEGORÍA ── */}
          <div className="bg-white dark:bg-[#131627] rounded-2xl sm:rounded-3xl p-4 sm:p-6 border border-slate-200/80 dark:border-white/10 shadow-xs hover:shadow-md transition-all flex flex-col justify-between">
            <div>
              {/* Header */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/20 flex items-center justify-center text-indigo-600">
                    <Boxes size={18} />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-[16px] text-slate-900 dark:text-white tracking-tight leading-tight">
                      Stock por Categoría
                    </h3>
                    <p className="text-[11.5px] text-slate-400 font-medium">Proporción de inventario</p>
                  </div>
                </div>
                <span className="text-[11px] font-extrabold px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-500/30 font-mono">
                  {totalInventoryUnits} uds.
                </span>
              </div>

              {/* Stacked Multi-Color Progress Bar */}
              <div className="my-4">
                <div className="h-3 rounded-full bg-slate-100 dark:bg-white/10 overflow-hidden flex gap-0.5 p-0.5">
                  {categoryDistribution.map((cat, i) => (
                    <div
                      key={i}
                      style={{ width: `${Math.max(cat.pct, 4)}%`, backgroundColor: cat.color }}
                      className="h-full rounded-full transition-all"
                      title={`${cat.name}: ${cat.units} uds. (${cat.pct}%)`}
                    />
                  ))}
                </div>
              </div>

              {/* Category Breakdown List */}
              <div className="space-y-2.5 my-3">
                {categoryDistribution.length === 0 ? (
                  <div className="py-8 text-center">
                    <p className="text-xs font-bold text-slate-800 dark:text-slate-200">Sin datos de inventario</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">Crea productos para ver la distribución de existencias.</p>
                  </div>
                ) : (
                  categoryDistribution.slice(0, 5).map((cat, idx) => (
                    <div key={idx} className="flex items-center justify-between p-2 rounded-xl hover:bg-slate-50 dark:hover:bg-white/5 transition-all">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: cat.color }}
                        />
                        <div className="min-w-0">
                          <p className="text-[12.5px] font-bold text-slate-800 dark:text-slate-200 truncate leading-tight">
                            {cat.name}
                          </p>
                          <p className="text-[10.5px] text-slate-400 mt-0.5">
                            {cat.skuCount} SKU{cat.skuCount !== 1 ? 's' : ''} registrados
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-[12.5px] font-bold font-mono text-slate-900 dark:text-white">
                          {cat.units} uds.
                        </span>
                        <span
                          className="text-[10px] font-extrabold px-2 py-0.5 rounded-full"
                          style={{ backgroundColor: `${cat.color}20`, color: cat.color }}
                        >
                          {cat.pct}%
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
                to="/categorias"
                className="w-full py-2.5 px-4 rounded-xl bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-700 dark:text-slate-200 text-xs font-bold transition-all flex items-center justify-between text-decoration-none"
              >
                <span>Administrar categorías</span>
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
