# Almacén — Sistema de Gestión de Inventario

Sistema tipo ERP/CRM para una sola empresa: inventario, ventas, compras,
clientes, proveedores y usuarios con roles, con login.

Funciona **ahora mismo en modo demo** (datos guardados en el navegador) y
está preparado para conectarse a **Supabase** sin reescribir código: solo
hay que pegar dos credenciales en un archivo `.env`.

## 1. Instalar y correr en modo demo

```bash
npm install
npm run dev
```

Abre `http://localhost:5173`. Verás un aviso "Modo demo — datos locales"
en la parte superior. Usuarios de prueba:

| Rol          | Correo               | Contraseña     |
|--------------|-----------------------|----------------|
| Administrador| [email protected] | admin123       |
| Empleado     | [email protected] | empleado123    |

En este modo, todo se guarda en `localStorage`: no hay backend real, así
que los datos son solo de este navegador. Es ideal para probar el sistema
o hacer una demo antes de conectar Supabase.

## 2. Conectar Supabase (cuando estés listo)

1. Crea un proyecto en [supabase.com](https://supabase.com).
2. Ve a **SQL Editor** y ejecuta todo el contenido de
   [`supabase/schema.sql`](./supabase/schema.sql). Esto crea todas las
   tablas (`products`, `categories`, `clients`, `suppliers`, `sales`,
   `purchases`, `inventory_movements`, `profiles`), los índices y las
   políticas de seguridad (RLS).
3. Ve a **Authentication → Providers** y confirma que "Email" esté
   habilitado.
4. Ve a **Authentication → Users → Add user** y crea el primer usuario
   (el que usarás como administrador).
5. Vuelve al **SQL Editor** y ejecútalo para convertirlo en admin:
   ```sql
   update public.profiles set role = 'admin' where email = 'tu-correo@empresa.com';
   ```
6. Copia tu **Project URL** y **anon public key** desde
   **Settings → API**.
7. Crea un archivo `.env` en la raíz del proyecto (puedes copiar
   `.env.example`) y pega tus credenciales:
   ```
   VITE_SUPABASE_URL=https://tuproyecto.supabase.co
   VITE_SUPABASE_ANON_KEY=tu-anon-key
   ```
8. Reinicia `npm run dev`. El aviso de "modo demo" desaparecerá y la app
   empezará a leer/escribir directamente en tu base de datos de Supabase,
   con login real (Supabase Auth) en vez del login de prueba.

No necesitas tocar ningún componente ni página: todos los módulos usan
`src/services/*.js`, que detectan automáticamente si Supabase está
configurado (`src/lib/supabaseClient.js`) y cambian de fuente de datos.

## 3. Estructura del proyecto

```
src/
  lib/
    supabaseClient.js     # cliente Supabase + detección de configuración
    localDb.js             # "base de datos" local (localStorage) para el modo demo
  data/seed.js              # datos de ejemplo para el modo demo
  context/AuthContext.jsx   # login/logout, sesión, real (Supabase) o mock
  services/                 # una función por módulo: products, sales, purchases...
  components/
    layout/                 # Sidebar, Topbar, AppLayout, ProtectedRoute
    ui/                     # Modal, badges, estados vacíos
  pages/                    # una página por módulo del menú
supabase/schema.sql         # SQL para crear todo en Supabase
```

## 4. Módulos incluidos

- **Login** con control de acceso por sesión.
- **Panel**: valor de inventario, ventas del mes, alertas de stock bajo,
  productos más vendidos y stock por categoría (gráficas).
- **Productos**: catálogo con SKU, categoría, proveedor, precios y stock.
- **Categorías** de productos.
- **Movimientos de inventario**: entradas y salidas manuales, con
  historial completo.
- **Ventas**: factura con múltiples productos, valida stock disponible y
  descuenta inventario automáticamente.
- **Compras**: órdenes de compra a proveedores; al marcarlas como
  "recibido" se ingresa el stock automáticamente.
- **Clientes** (CRM básico) y **Proveedores**.
- **Usuarios y roles** (solo visible para administradores): alta de
  usuarios, rol admin/empleado, activar o desactivar acceso.

## 5. Notas de seguridad

- En modo demo, las contraseñas se guardan sin cifrar en `localStorage`
  — es solo para pruebas locales, nunca lo uses en producción.
- En cuanto conectas Supabase, la autenticación pasa a usar
  **Supabase Auth** (contraseñas hasheadas, sesiones con JWT), y las
  políticas RLS del `schema.sql` restringen el acceso a usuarios con
  sesión iniciada.
