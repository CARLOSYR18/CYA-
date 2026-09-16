// Demo data so the app is usable immediately. Replace freely once Supabase
// is connected — this file is only read by src/lib/localDb.js.

const now = new Date()
const iso = (daysAgo = 0) => {
  const d = new Date(now)
  d.setDate(d.getDate() - daysAgo)
  return d.toISOString()
}

export const seedData = {
  profiles: [
    { id: 'u-admin', created_at: iso(400), full_name: 'María Torres', email: '[email protected]', password: 'admin123', role: 'admin', active: true },
    { id: 'u-emp1', created_at: iso(300), full_name: 'Jorge Ramos', email: '[email protected]', password: 'empleado123', role: 'empleado', active: true },
    { id: 'u-emp2', created_at: iso(120), full_name: 'Lucía Fernández', email: '[email protected]', password: 'empleado123', role: 'empleado', active: true },
  ],

  categories: [
    { id: 'c-1', created_at: iso(400), name: 'Cómputo', description: 'Laptops, PCs y periféricos' },
    { id: 'c-2', created_at: iso(400), name: 'Oficina', description: 'Papelería e insumos de oficina' },
    { id: 'c-3', created_at: iso(400), name: 'Redes', description: 'Equipos y cableado de red' },
    { id: 'c-4', created_at: iso(400), name: 'Impresión', description: 'Impresoras, tóners y tintas' },
  ],

  suppliers: [
    { id: 's-1', created_at: iso(390), name: 'TechImport SAC', contact_name: 'Carlos Vega', email: '[email protected]', phone: '+51 987 111 222', address: 'Av. Argentina 450, Lima' },
    { id: 's-2', created_at: iso(380), name: 'OfiMayor EIRL', contact_name: 'Patricia Luna', email: '[email protected]', phone: '+51 987 333 444', address: 'Jr. Comercio 120, Lima' },
    { id: 's-3', created_at: iso(200), name: 'RedNet Distribuciones', contact_name: 'Diego Salas', email: '[email protected]', phone: '+51 987 555 666', address: 'Av. Colonial 980, Lima' },
  ],

  clients: [
    { id: 'cl-1', created_at: iso(350), name: 'Estudio Contable Aráoz', contact_name: 'Rosa Aráoz', email: '[email protected]', phone: '+51 976 111 222', address: 'Av. Javier Prado 2200, Lima', ruc: '20601122334' },
    { id: 'cl-2', created_at: iso(300), name: 'Colegio San Marcos', contact_name: 'Fernando Ibáñez', email: '[email protected]', phone: '+51 976 333 444', address: 'Calle Los Álamos 340, Lima', ruc: '20558833441' },
    { id: 'cl-3', created_at: iso(90), name: 'Bodega Digital Perú', contact_name: 'Ana Quispe', email: '[email protected]', phone: '+51 976 555 666', address: 'Av. Brasil 1800, Lima', ruc: '20487733221' },
  ],

  products: [
    { id: 'p-1', created_at: iso(400), sku: 'LAP-001', name: 'Laptop 14" i5 8GB/256GB', category_id: 'c-1', unit: 'unidad', cost_price: 1450, sale_price: 1899, stock: 12, min_stock: 4, supplier_id: 's-1' },
    { id: 'p-2', created_at: iso(400), sku: 'MOU-002', name: 'Mouse inalámbrico', category_id: 'c-1', unit: 'unidad', cost_price: 18, sale_price: 32, stock: 54, min_stock: 15, supplier_id: 's-1' },
    { id: 'p-3', created_at: iso(400), sku: 'TEC-003', name: 'Teclado USB estándar', category_id: 'c-1', unit: 'unidad', cost_price: 22, sale_price: 39, stock: 8, min_stock: 10, supplier_id: 's-1' },
    { id: 'p-4', created_at: iso(390), sku: 'PAP-010', name: 'Papel bond A4 (paquete x500)', category_id: 'c-2', unit: 'paquete', cost_price: 11, sale_price: 17.5, stock: 130, min_stock: 30, supplier_id: 's-2' },
    { id: 'p-5', created_at: iso(390), sku: 'LAP-011', name: 'Lapicero azul (caja x50)', category_id: 'c-2', unit: 'caja', cost_price: 14, sale_price: 22, stock: 40, min_stock: 10, supplier_id: 's-2' },
    { id: 'p-6', created_at: iso(200), sku: 'CAB-020', name: 'Cable de red Cat6 (rollo 305m)', category_id: 'c-3', unit: 'rollo', cost_price: 165, sale_price: 235, stock: 6, min_stock: 3, supplier_id: 's-3' },
    { id: 'p-7', created_at: iso(200), sku: 'SWI-021', name: 'Switch 8 puertos Gigabit', category_id: 'c-3', unit: 'unidad', cost_price: 78, sale_price: 129, stock: 3, min_stock: 5, supplier_id: 's-3' },
    { id: 'p-8', created_at: iso(150), sku: 'IMP-030', name: 'Impresora multifuncional láser', category_id: 'c-4', unit: 'unidad', cost_price: 520, sale_price: 749, stock: 5, min_stock: 3, supplier_id: 's-1' },
    { id: 'p-9', created_at: iso(150), sku: 'TON-031', name: 'Tóner compatible HesignA4', category_id: 'c-4', unit: 'unidad', cost_price: 45, sale_price: 79, stock: 2, min_stock: 8, supplier_id: 's-1' },
  ],

  inventory_movements: [
    { id: 'm-1', created_at: iso(60), product_id: 'p-1', type: 'entrada', quantity: 10, reason: 'Compra inicial', reference: 'OC-0001' },
    { id: 'm-2', created_at: iso(45), product_id: 'p-9', type: 'salida', quantity: 6, reason: 'Venta', reference: 'V-0004' },
    { id: 'm-3', created_at: iso(30), product_id: 'p-7', type: 'entrada', quantity: 8, reason: 'Compra', reference: 'OC-0007' },
    { id: 'm-4', created_at: iso(20), product_id: 'p-7', type: 'salida', quantity: 5, reason: 'Venta', reference: 'V-0011' },
    { id: 'm-5', created_at: iso(5), product_id: 'p-3', type: 'salida', quantity: 4, reason: 'Venta', reference: 'V-0021' },
  ],

  sales: [
    {
      id: 'v-1', created_at: iso(20), client_id: 'cl-1', user_id: 'u-emp1', status: 'pagado',
      items: [
        { product_id: 'p-1', quantity: 2, unit_price: 1899 },
        { product_id: 'p-2', quantity: 2, unit_price: 32 },
      ],
    },
    {
      id: 'v-2', created_at: iso(10), client_id: 'cl-2', user_id: 'u-emp2', status: 'pagado',
      items: [
        { product_id: 'p-4', quantity: 20, unit_price: 17.5 },
        { product_id: 'p-5', quantity: 10, unit_price: 22 },
      ],
    },
    {
      id: 'v-3', created_at: iso(2), client_id: 'cl-3', user_id: 'u-emp1', status: 'pendiente',
      items: [
        { product_id: 'p-8', quantity: 1, unit_price: 749 },
        { product_id: 'p-9', quantity: 3, unit_price: 79 },
      ],
    },
  ],

  purchases: [
    {
      id: 'oc-1', created_at: iso(60), supplier_id: 's-1', user_id: 'u-admin', status: 'recibido',
      items: [{ product_id: 'p-1', quantity: 10, unit_cost: 1450 }],
    },
    {
      id: 'oc-2', created_at: iso(30), supplier_id: 's-3', user_id: 'u-admin', status: 'recibido',
      items: [{ product_id: 'p-7', quantity: 8, unit_cost: 78 }],
    },
    {
      id: 'oc-3', created_at: iso(4), supplier_id: 's-2', user_id: 'u-admin', status: 'pendiente',
      items: [{ product_id: 'p-4', quantity: 50, unit_cost: 11 }],
    },
  ],

  company_settings: [
    { id: 'cs-1', created_at: iso(1), updated_at: iso(1), name: 'CYA', ruc: '', address: '', phone: '', logo_url: '' },
  ],
}
