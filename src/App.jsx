import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import ProtectedRoute from './components/layout/ProtectedRoute'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Products from './pages/Products'
import Categories from './pages/Categories'
import InventoryMovements from './pages/InventoryMovements'
import Sales from './pages/Sales'
import Purchases from './pages/Purchases'
import Clients from './pages/Clients'
import Suppliers from './pages/Suppliers'
import Users from './pages/Users'
import NotFound from './pages/NotFound'

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/productos" element={<ProtectedRoute><Products /></ProtectedRoute>} />
          <Route path="/categorias" element={<ProtectedRoute><Categories /></ProtectedRoute>} />
          <Route path="/movimientos" element={<ProtectedRoute><InventoryMovements /></ProtectedRoute>} />
          <Route path="/ventas" element={<ProtectedRoute><Sales /></ProtectedRoute>} />
          <Route path="/compras" element={<ProtectedRoute><Purchases /></ProtectedRoute>} />
          <Route path="/clientes" element={<ProtectedRoute><Clients /></ProtectedRoute>} />
          <Route path="/proveedores" element={<ProtectedRoute><Suppliers /></ProtectedRoute>} />
          <Route path="/usuarios" element={<ProtectedRoute adminOnly><Users /></ProtectedRoute>} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
