import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { ThemeProvider } from './context/ThemeContext'
import ProtectedRoute from './components/layout/ProtectedRoute'
import Assistant from './components/Assistant'
import Login from './pages/Login'
import SignUp from './pages/SignUp'
import Onboarding from './pages/Onboarding'
import Dashboard from './pages/Dashboard'
import Products from './pages/Products'
import Categories from './pages/Categories'
import InventoryMovements from './pages/InventoryMovements'
import Sales from './pages/Sales'
import Purchases from './pages/Purchases'
import Clients from './pages/Clients'
import Suppliers from './pages/Suppliers'
import Users from './pages/Users'
import CompanySettings from './pages/CompanySettings'
import Plans from './pages/Plans'
import PlatformAdmin from './pages/PlatformAdmin'
import NotFound from './pages/NotFound'

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<SignUp />} />
            <Route path="/onboarding" element={<ProtectedRoute><Onboarding /></ProtectedRoute>} />
            <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/productos" element={<ProtectedRoute><Products /></ProtectedRoute>} />
            <Route path="/categorias" element={<ProtectedRoute><Categories /></ProtectedRoute>} />
            <Route path="/movimientos" element={<ProtectedRoute><InventoryMovements /></ProtectedRoute>} />
            <Route path="/ventas" element={<ProtectedRoute><Sales /></ProtectedRoute>} />
            <Route path="/compras" element={<ProtectedRoute><Purchases /></ProtectedRoute>} />
            <Route path="/clientes" element={<ProtectedRoute><Clients /></ProtectedRoute>} />
            <Route path="/proveedores" element={<ProtectedRoute><Suppliers /></ProtectedRoute>} />
            <Route path="/usuarios" element={<ProtectedRoute adminOnly><Users /></ProtectedRoute>} />
            <Route path="/configuracion" element={<ProtectedRoute adminOnly><CompanySettings /></ProtectedRoute>} />
            <Route path="/planes" element={<ProtectedRoute><Plans /></ProtectedRoute>} />
            <Route path="/admin-plataforma" element={<ProtectedRoute><PlatformAdmin /></ProtectedRoute>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
          <Assistant />
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  )
}
