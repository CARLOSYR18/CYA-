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
    { id: 'u-admin', created_at: iso(400), full_name: 'MR PINGON', email: 'admin@demo.com', password: 'admin123', role: 'admin', active: true },
    { id: 'u-emp1', created_at: iso(300), full_name: 'Jorge Ramos', email: 'empleado@demo.com', password: 'empleado123', role: 'empleado', active: true },
    { id: 'u-emp2', created_at: iso(120), full_name: 'Lucía Fernández', email: 'vendedor@demo.com', password: 'empleado123', role: 'vendedor', active: true },
  ],

  categories: [
    { id: 'c-1', created_at: iso(400), name: 'AirPods 3 PRO', description: 'Auriculares inalámbricos Apple 3ra Gen' },
    { id: 'c-2', created_at: iso(400), name: 'AirPods Gen 4 PRO', description: 'Auriculares Apple con cancelación activa' },
    { id: 'c-3', created_at: iso(400), name: 'Combos / Kits', description: 'Packs promocionales y accesorios' },
    { id: 'c-4', created_at: iso(400), name: 'Audio & Accesorios', description: 'Cables, estuches y cargadores' },
  ],

  suppliers: [
    { id: 's-1', created_at: iso(390), name: 'MR IMPORT', contact_name: 'Carlos Vega', email: 'importaciones@mrimport.pe', phone: '+51 987 111 222', address: 'Av. Argentina 450, Lima' },
    { id: 's-2', created_at: iso(380), name: 'TechMayorista SAC', contact_name: 'Patricia Luna', email: 'ventas@techmayorista.pe', phone: '+51 987 333 444', address: 'Jr. Comercio 120, Lima' },
  ],

  clients: [
    { id: 'cl-1', created_at: iso(350), name: 'Cliente General / Mostrador', contact_name: 'Juan Pérez', email: 'cliente@gmail.com', phone: '+51 976 111 222', address: 'Av. Javier Prado 2200, Lima', ruc: '20601122334' },
    { id: 'cl-2', created_at: iso(300), name: 'Distribuidora Lima Norte', contact_name: 'Fernando Ibáñez', email: 'distribuidora@gmail.com', phone: '+51 976 333 444', address: 'Calle Los Álamos 340, Lima', ruc: '20558833441' },
    { id: 'cl-3', created_at: iso(90), name: 'Bodega Digital Perú', contact_name: 'Ana Quispe', email: 'contacto@bodegadigital.pe', phone: '+51 976 555 666', address: 'Av. Brasil 1800, Lima', ruc: '20487733221' },
  ],

  products: [
    {
      id: 'p-1',
      created_at: iso(30),
      sku: 'PROD-0001',
      name: 'airpods 3 Pro',
      category_id: 'c-1',
      supplier_id: 's-1',
      brand: 'MR IMPORT',
      unit: 'unidad',
      cost_price: 180,
      sale_price: 350,
      stock: 400,
      min_stock: 50,
      image_url: 'https://images.unsplash.com/photo-1600294037681-c80b4cb5b434?w=500&auto=format&fit=crop&q=80',
      status: 'disponible'
    },
    {
      id: 'p-3',
      created_at: iso(25),
      sku: 'PROD-0003',
      name: 'AirPods 4 Pro (mas combo)',
      category_id: 'c-2',
      supplier_id: 's-1',
      brand: 'MR IMPORT',
      unit: 'unidad',
      cost_price: 250,
      sale_price: 480,
      stock: 350,
      min_stock: 50,
      image_url: 'https://images.unsplash.com/photo-1572569511254-d8f925fe2cbb?w=500&auto=format&fit=crop&q=80',
      status: 'disponible'
    },
    {
      id: 'p-2',
      created_at: iso(20),
      sku: 'PROD-0002',
      name: 'Combo airpods 3 Pro',
      category_id: 'c-3',
      supplier_id: 's-1',
      brand: 'MR IMPORT',
      unit: 'unidad',
      cost_price: 290,
      sale_price: 560,
      stock: 240,
      min_stock: 30,
      is_kit: true,
      image_url: 'https://images.unsplash.com/photo-1588423771073-b8903fbb85b5?w=500&auto=format&fit=crop&q=80',
      status: 'disponible'
    },
    {
      id: 'p-4',
      created_at: iso(10),
      sku: 'PROD-0004',
      name: 'airpods 3 Pro',
      category_id: 'c-1',
      supplier_id: 's-1',
      brand: 'MR IMPORT',
      unit: 'unidad',
      cost_price: 180,
      sale_price: 350,
      stock: 300,
      min_stock: 40,
      image_url: 'https://images.unsplash.com/photo-1600294037681-c80b4cb5b434?w=500&auto=format&fit=crop&q=80',
      status: 'disponible'
    }
  ],

  inventory_movements: [
    { id: 'm-1', created_at: iso(60), product_id: 'p-1', type: 'entrada', quantity: 400, reason: 'Lote Importación Inicial', reference: 'IMP-2026-01' },
    { id: 'm-2', created_at: iso(45), product_id: 'p-3', type: 'entrada', quantity: 350, reason: 'Ingreso Almacén Central', reference: 'IMP-2026-02' },
    { id: 'm-3', created_at: iso(30), product_id: 'p-2', type: 'entrada', quantity: 240, reason: 'Armado de Kits Promocionales', reference: 'KIT-001' },
    { id: 'm-4', created_at: iso(20), product_id: 'p-4', type: 'entrada', quantity: 300, reason: 'Ingreso Aduanas', reference: 'IMP-2026-03' },
    { id: 'm-5', created_at: iso(5), product_id: 'p-1', type: 'salida', quantity: 2, reason: 'Venta Mostrador', reference: 'B001-0021' },
  ],

  sales: [
    {
      id: 'v-1', created_at: iso(1), client_id: 'cl-1', client_name: 'Juan Pérez', user_id: 'u-admin', status: 'pagado',
      series: 'B001', correlative: '0021',
      items: [
        { product_id: 'p-1', quantity: 2, unit_price: 350 },
      ],
      total: 700
    },
    {
      id: 'v-2', created_at: iso(2), client_id: 'cl-2', client_name: 'Distribuidora Lima Norte', user_id: 'u-admin', status: 'pagado',
      series: 'F001', correlative: '0045',
      items: [
        { product_id: 'p-2', quantity: 3, unit_price: 560 },
      ],
      total: 1680
    },
    {
      id: 'v-3', created_at: iso(3), client_id: 'cl-3', client_name: 'Bodega Digital Perú', user_id: 'u-admin', status: 'pendiente',
      due_date: new Date(Date.now() + 5 * 86400000).toISOString().slice(0, 10),
      series: 'NV01', correlative: '0102',
      items: [
        { product_id: 'p-3', quantity: 1, unit_price: 480 },
      ],
      total: 480
    },
  ],

  purchases: [
    {
      id: 'oc-1', created_at: iso(60), supplier_id: 's-1', user_id: 'u-admin', status: 'recibido',
      items: [{ product_id: 'p-1', quantity: 400, unit_cost: 180 }],
    },
    {
      id: 'oc-2', created_at: iso(30), supplier_id: 's-1', user_id: 'u-admin', status: 'recibido',
      items: [{ product_id: 'p-3', quantity: 350, unit_cost: 250 }],
    },
  ],

  company_settings: [
    {
      id: '87ed7164-594a-45f9-8730-a73e91bee6af',
      created_at: iso(1),
      updated_at: iso(1),
      name: 'Cleanig Service',
      ruc: '82181289381',
      address: 'Avenida Pucusana AV345',
      phone: '+51 940 557 521',
      logo_url: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTqJl6LO0_XJY2VlFZwrbMP0tq1d37eoSD6XCt4qnvpOJpk6lPDQbv_4Wk&s=10',
      plan: 'pro',
      currency: 'S/'
    },
  ],
}
