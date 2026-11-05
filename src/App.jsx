import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { ThemeProvider } from './context/ThemeContext'
import ProtectedRoute from './components/layout/ProtectedRoute'
import Assistant from './components/Assistant'

// Core pages (loaded synchronously for instant startup)
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'

// Lazy-loaded pages (loaded on demand for maximum mobile speed & fluid transitions)
const SignUp = lazy(() => import('./pages/SignUp'))
const Onboarding = lazy(() => import('./pages/Onboarding'))
const Products = lazy(() => import('./pages/Products'))
const NewProduct = lazy(() => import('./pages/NewProduct'))
const Categories = lazy(() => import('./pages/Categories'))
const NewCategory = lazy(() => import('./pages/NewCategory'))
const InventoryMovements = lazy(() => import('./pages/InventoryMovements'))
const Sales = lazy(() => import('./pages/Sales'))
const NewSale = lazy(() => import('./pages/NewSale'))
const Purchases = lazy(() => import('./pages/Purchases'))
const NewPurchase = lazy(() => import('./pages/NewPurchase'))
const Clients = lazy(() => import('./pages/Clients'))
const Suppliers = lazy(() => import('./pages/Suppliers'))
const NewSupplier = lazy(() => import('./pages/NewSupplier'))
const Users = lazy(() => import('./pages/Users'))
const NewUser = lazy(() => import('./pages/NewUser'))
const EmployeeActivity = lazy(() => import('./pages/EmployeeActivity'))
const CompanySettings = lazy(() => import('./pages/CompanySettings'))
const Plans = lazy(() => import('./pages/Plans'))
const PlatformAdmin = lazy(() => import('./pages/PlatformAdmin'))
const Profile = lazy(() => import('./pages/Profile'))
const NotFound = lazy(() => import('./pages/NotFound'))

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
