import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { ThemeProvider } from './context/ThemeContext'
import ProtectedRoute from './components/layout/ProtectedRoute'
import Assistant from './components/Assistant'

// Core ERP pages (loaded synchronously for instant, zero-flicker transitions)
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Products from './pages/Products'
import NewProduct from './pages/NewProduct'
import Categories from './pages/Categories'
import NewCategory from './pages/NewCategory'
import InventoryMovements from './pages/InventoryMovements'
import Sales from './pages/Sales'
import NewSale from './pages/NewSale'
import Purchases from './pages/Purchases'
import NewPurchase from './pages/NewPurchase'
import Clients from './pages/Clients'
import Suppliers from './pages/Suppliers'
import NewSupplier from './pages/NewSupplier'
import Users from './pages/Users'
import NewUser from './pages/NewUser'
import EmployeeActivity from './pages/EmployeeActivity'
import CompanySettings from './pages/CompanySettings'
import Plans from './pages/Plans'
import PlatformAdmin from './pages/PlatformAdmin'
import Profile from './pages/Profile'
import NotFound from './pages/NotFound'

// Infrequent pages loaded on demand
const SignUp = lazy(() => import('./pages/SignUp'))
const Onboarding = lazy(() => import('./pages/Onboarding'))

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <Suspense
            fallback={
              <div className="min-h-screen flex flex-col items-center justify-center bg-base-bg select-none">
                <div className="w-10 h-10 rounded-full border-3 border-brand border-t-transparent animate-spin mb-3" />
                <p className="text-xs font-semibold text-slate-500">Cargando…</p>
              </div>
            }
          >
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<SignUp />} />
              <Route path="/onboarding" element={<ProtectedRoute><Onboarding /></ProtectedRoute>} />
              <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
              <Route path="/productos" element={<ProtectedRoute><Products /></ProtectedRoute>} />
              <Route path="/productos/nuevo" element={<ProtectedRoute><NewProduct /></ProtectedRoute>} />
              <Route path="/productos/editar/:id" element={<ProtectedRoute><NewProduct /></ProtectedRoute>} />
              <Route path="/categorias" element={<ProtectedRoute><Categories /></ProtectedRoute>} />
              <Route path="/categorias/nueva" element={<ProtectedRoute><NewCategory /></ProtectedRoute>} />
              <Route path="/categorias/editar/:id" element={<ProtectedRoute><NewCategory /></ProtectedRoute>} />
              <Route path="/movimientos" element={<ProtectedRoute><InventoryMovements /></ProtectedRoute>} />
              <Route path="/ventas" element={<ProtectedRoute><Sales /></ProtectedRoute>} />
              <Route path="/ventas/nueva" element={<ProtectedRoute><NewSale /></ProtectedRoute>} />
              <Route path="/compras" element={<ProtectedRoute><Purchases /></ProtectedRoute>} />
              <Route path="/compras/nueva" element={<ProtectedRoute><NewPurchase /></ProtectedRoute>} />
              <Route path="/clientes" element={<ProtectedRoute><Clients /></ProtectedRoute>} />
              <Route path="/proveedores" element={<ProtectedRoute><Suppliers /></ProtectedRoute>} />
              <Route path="/proveedores/nuevo" element={<ProtectedRoute><NewSupplier /></ProtectedRoute>} />
              <Route path="/proveedores/editar/:id" element={<ProtectedRoute><NewSupplier /></ProtectedRoute>} />
              <Route path="/usuarios" element={<ProtectedRoute adminOnly><Users /></ProtectedRoute>} />
              <Route path="/usuarios/nuevo" element={<ProtectedRoute adminOnly><NewUser /></ProtectedRoute>} />
              <Route path="/usuarios/editar/:id" element={<ProtectedRoute adminOnly><NewUser /></ProtectedRoute>} />
              <Route path="/actividad-empleados" element={<ProtectedRoute adminOnly><EmployeeActivity /></ProtectedRoute>} />
              <Route path="/configuracion" element={<ProtectedRoute adminOnly><CompanySettings /></ProtectedRoute>} />
              <Route path="/planes" element={<ProtectedRoute><Plans /></ProtectedRoute>} />
              <Route path="/perfil" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
              <Route path="/admin-plataforma" element={<ProtectedRoute><PlatformAdmin /></ProtectedRoute>} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
          <Assistant />
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  )
}
