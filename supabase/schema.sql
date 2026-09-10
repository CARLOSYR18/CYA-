-- ============================================================================
-- Sistema de Gestión de Inventario — esquema para Supabase
-- ============================================================================
-- Cómo usar:
--   1. Ve a tu proyecto en https://app.supabase.com → SQL Editor.
--   2. Pega y ejecuta TODO este archivo (una sola vez).
--   3. Copia tu Project URL y anon key (Settings → API) al archivo .env
--      del proyecto (ver .env.example).
--   4. En Authentication → Providers, deja "Email" habilitado.
--   5. Crea al menos un usuario en Authentication → Users → Add user,
--      y luego ejecuta el UPDATE de más abajo para hacerlo administrador.
-- ============================================================================

-- Extensión para generar UUIDs
create extension if not exists "pgcrypto";

-- ----------------------------------------------------------------------------
-- 1. PERFILES (vinculados 1 a 1 con auth.users)
-- ----------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  email text not null,
  role text not null default 'empleado' check (role in ('admin', 'empleado')),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- Crea automáticamente un perfil "empleado" cuando alguien se registra
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name', new.email), 'empleado');
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ----------------------------------------------------------------------------
-- 2. CATEGORÍAS
-- ----------------------------------------------------------------------------
create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  created_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- 3. PROVEEDORES
-- ----------------------------------------------------------------------------
create table if not exists public.suppliers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  ruc text,
  contact_name text,
  email text,
  phone text,
  address text,
  created_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- 4. CLIENTES
-- ----------------------------------------------------------------------------
create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  ruc text,
  contact_name text,
  email text,
  phone text,
  address text,
  created_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- 5. PRODUCTOS
-- ----------------------------------------------------------------------------
create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  sku text not null unique,
  name text not null,
  category_id uuid references public.categories(id) on delete set null,
  supplier_id uuid references public.suppliers(id) on delete set null,
  unit text not null default 'unidad',
  cost_price numeric(12,2) not null default 0,
  sale_price numeric(12,2) not null default 0,
  stock numeric(12,2) not null default 0,
  min_stock numeric(12,2) not null default 0,
  created_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- 6. MOVIMIENTOS DE INVENTARIO (entradas / salidas)
-- ----------------------------------------------------------------------------
create table if not exists public.inventory_movements (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  type text not null check (type in ('entrada', 'salida')),
  quantity numeric(12,2) not null check (quantity > 0),
  reason text,
  reference text,
  created_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- 7. VENTAS (con items en jsonb para mantener el modelo simple)
--    items: [{ product_id, quantity, unit_price }]
-- ----------------------------------------------------------------------------
create table if not exists public.sales (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references public.clients(id) on delete set null,
  user_id uuid references public.profiles(id) on delete set null,
  status text not null default 'pagado' check (status in ('pagado', 'pendiente', 'cancelado')),
  items jsonb not null default '[]',
  created_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- 8. COMPRAS (órdenes de compra a proveedores)
--    items: [{ product_id, quantity, unit_cost }]
-- ----------------------------------------------------------------------------
create table if not exists public.purchases (
  id uuid primary key default gen_random_uuid(),
  supplier_id uuid references public.suppliers(id) on delete set null,
  user_id uuid references public.profiles(id) on delete set null,
  status text not null default 'pendiente' check (status in ('pendiente', 'recibido', 'cancelado')),
  items jsonb not null default '[]',
  created_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- ÍNDICES ÚTILES
-- ----------------------------------------------------------------------------
create index if not exists idx_products_category on public.products(category_id);
create index if not exists idx_products_supplier on public.products(supplier_id);
create index if not exists idx_movements_product on public.inventory_movements(product_id);
create index if not exists idx_sales_client on public.sales(client_id);
create index if not exists idx_purchases_supplier on public.purchases(supplier_id);

-- ----------------------------------------------------------------------------
-- ROW LEVEL SECURITY
-- Regla simple para una sola empresa: cualquier usuario autenticado (un
-- empleado con sesión iniciada) puede leer y escribir. Solo un admin puede
-- modificar la tabla de perfiles/usuarios. Ajusta estas políticas si más
-- adelante necesitas permisos más finos por rol.
-- ----------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.suppliers enable row level security;
alter table public.clients enable row level security;
alter table public.products enable row level security;
alter table public.inventory_movements enable row level security;
alter table public.sales enable row level security;
alter table public.purchases enable row level security;

create policy "profiles: lectura autenticados" on public.profiles for select using (auth.role() = 'authenticated');
create policy "profiles: solo admin modifica" on public.profiles for all using (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
) with check (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
);

create policy "categorias: acceso autenticados" on public.categories for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "proveedores: acceso autenticados" on public.suppliers for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "clientes: acceso autenticados" on public.clients for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "productos: acceso autenticados" on public.products for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "movimientos: acceso autenticados" on public.inventory_movements for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "ventas: acceso autenticados" on public.sales for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "compras: acceso autenticados" on public.purchases for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

-- ----------------------------------------------------------------------------
-- Para convertir tu primer usuario en administrador, después de crearlo en
-- Authentication → Users, ejecuta (reemplaza el correo):
--
--   update public.profiles set role = 'admin' where email = '[email protected]';
-- ----------------------------------------------------------------------------
