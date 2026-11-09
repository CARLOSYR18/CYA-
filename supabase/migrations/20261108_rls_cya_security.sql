-- ============================================================================
-- CYA ERP — MIGRACIÓN DE SEGURIDAD, AISLAMIENTO MULTIEMPRESA (RLS) Y RPCs
-- ============================================================================
-- Este script implementa:
-- 1. Estructura multiempresa completa con company_id en todas las tablas
-- 2. Funciones de aislamiento: current_company_id() e is_platform_admin()
-- 3. Políticas RLS estrictas (ninguna empresa puede ver o alterar datos de otra)
-- 4. Triggers de guardia contra escalada de privilegios y autoservicio de planes
-- 5. Funciones RPC seguras (create_company, add_user_to_my_company)
-- 6. SKU único por empresa: unique(company_id, sku)
-- ============================================================================

create extension if not exists "pgcrypto";

-- ----------------------------------------------------------------------------
-- 1. TABLA EMPRESAS (COMPANIES)
-- ----------------------------------------------------------------------------
create table if not exists public.companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  ruc text,
  address text,
  phone text,
  logo_url text,
  plan text not null default 'free' check (plan in ('free', 'pro', 'enterprise')),
  plan_period text default 'mensual',
  plan_price numeric(12,2) default 0,
  plan_started_at timestamptz default now(),
  plan_expires_at timestamptz,
  active boolean not null default true,
  settings jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- 2. TABLA PERFILES (PROFILES)
-- ----------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  email text not null,
  role text not null default 'empleado' check (role in ('admin', 'empleado', 'vendedor', 'superadmin')),
  company_id uuid references public.companies(id) on delete set null,
  is_platform_admin boolean not null default false,
  active boolean not null default true,
  avatar_url text,
  created_at timestamptz not null default now()
);

-- Asegurar columnas si la tabla ya existía previamente
alter table public.profiles add column if not exists company_id uuid references public.companies(id) on delete set null;
alter table public.profiles add column if not exists is_platform_admin boolean not null default false;
alter table public.profiles add column if not exists avatar_url text;

-- ----------------------------------------------------------------------------
-- 3. AGREGAR company_id A TODAS LAS TABLAS DE NEGOCIO SI NO LO TIENEN
-- ----------------------------------------------------------------------------
create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references public.companies(id) on delete cascade,
  name text not null,
  description text,
  created_at timestamptz not null default now()
);
alter table public.categories add column if not exists company_id uuid references public.companies(id) on delete cascade;

create table if not exists public.suppliers (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references public.companies(id) on delete cascade,
  name text not null,
  ruc text,
  contact_name text,
  email text,
  phone text,
  address text,
  created_at timestamptz not null default now()
);
alter table public.suppliers add column if not exists company_id uuid references public.companies(id) on delete cascade;

create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references public.companies(id) on delete cascade,
  name text not null,
  ruc text,
  contact_name text,
  email text,
  phone text,
  address text,
  created_at timestamptz not null default now()
);
alter table public.clients add column if not exists company_id uuid references public.companies(id) on delete cascade;

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references public.companies(id) on delete cascade,
  sku text not null,
  name text not null,
  category_id uuid references public.categories(id) on delete set null,
  supplier_id uuid references public.suppliers(id) on delete set null,
  unit text not null default 'unidad',
  cost_price numeric(12,2) not null default 0,
  sale_price numeric(12,2) not null default 0,
  stock numeric(12,2) not null default 0,
  min_stock numeric(12,2) not null default 0,
  image_url text,
  created_at timestamptz not null default now()
);
alter table public.products add column if not exists company_id uuid references public.companies(id) on delete cascade;
alter table public.products add column if not exists image_url text;

-- B2: Eliminar unicidad global de SKU y aplicar unicidad por empresa
alter table public.products drop constraint if exists products_sku_key;
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'products_company_sku_key') then
    alter table public.products add constraint products_company_sku_key unique (company_id, sku);
  end if;
end $$;

create table if not exists public.inventory_movements (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references public.companies(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  type text not null check (type in ('entrada', 'salida')),
  quantity numeric(12,2) not null check (quantity > 0),
  reason text,
  reference text,
  user_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);
alter table public.inventory_movements add column if not exists company_id uuid references public.companies(id) on delete cascade;
alter table public.inventory_movements add column if not exists user_id uuid references public.profiles(id) on delete set null;

create table if not exists public.sales (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references public.companies(id) on delete cascade,
  client_id uuid references public.clients(id) on delete set null,
  user_id uuid references public.profiles(id) on delete set null,
  status text not null default 'pagado' check (status in ('pagado', 'pendiente', 'cancelado')),
  items jsonb not null default '[]',
  total numeric(12,2) not null default 0,
  payment_method text default 'efectivo',
  notes text,
  created_at timestamptz not null default now()
);
alter table public.sales add column if not exists company_id uuid references public.companies(id) on delete cascade;
alter table public.sales add column if not exists total numeric(12,2) not null default 0;
alter table public.sales add column if not exists payment_method text default 'efectivo';
alter table public.sales add column if not exists notes text;

create table if not exists public.purchases (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references public.companies(id) on delete cascade,
  supplier_id uuid references public.suppliers(id) on delete set null,
  user_id uuid references public.profiles(id) on delete set null,
  status text not null default 'pendiente' check (status in ('pendiente', 'recibido', 'cancelado')),
  items jsonb not null default '[]',
  total numeric(12,2) not null default 0,
  notes text,
  created_at timestamptz not null default now()
);
alter table public.purchases add column if not exists company_id uuid references public.companies(id) on delete cascade;
alter table public.purchases add column if not exists total numeric(12,2) not null default 0;
alter table public.purchases add column if not exists notes text;

create table if not exists public.plan_requests (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete set null,
  requested_plan text not null,
  period text not null default 'trimestral',
  price numeric(12,2) not null default 0,
  voucher_url text,
  status text not null default 'pendiente' check (status in ('pendiente', 'aprobado', 'rechazado')),
  created_at timestamptz not null default now()
);

create table if not exists public.assistant_usage (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  date date not null default current_date,
  message_count integer not null default 1,
  created_at timestamptz not null default now(),
  constraint assistant_usage_company_date_key unique (company_id, date)
);

-- ----------------------------------------------------------------------------
-- 4. FUNCIONES DE SEGURIDAD (SECURITY DEFINER)
-- ----------------------------------------------------------------------------

-- Determina si el usuario autenticado es Super Admin de la plataforma
create or replace function public.is_platform_admin()
returns boolean as $$
declare
  is_admin boolean;
begin
  select coalesce(is_platform_admin, false) into is_admin
  from public.profiles
  where id = auth.uid();

  return coalesce(is_admin, false);
end;
$$ language plpgsql security definer stable;

-- Determina el company_id seguro de la empresa activa del usuario actual
-- Solo retorna company_id si la empresa existe y está activa (A9)
create or replace function public.current_company_id()
returns uuid as $$
declare
  cid uuid;
begin
  select p.company_id into cid
  from public.profiles p
  join public.companies c on c.id = p.company_id
  where p.id = auth.uid()
    and p.active = true
    and c.active = true;

  return cid;
end;
$$ language plpgsql security definer stable;

-- ----------------------------------------------------------------------------
-- 5. TRIGGER: REGISTRO DE NUEVO USUARIO EN AUTH (A2, A6)
-- ----------------------------------------------------------------------------
-- Todo usuario nuevo nace como empleado sin empresa (el onboarding le asigna empresa)
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name, role, active, company_id, is_platform_admin)
  values (
    new.id,
    lower(trim(new.email)),
    coalesce(nullif(trim(new.raw_user_meta_data->>'full_name'), ''), split_part(new.email, '@', 1)),
    'empleado', -- Nace siempre con rol base
    true,
    null,       -- Sin empresa hasta completar onboarding o ser invitado
    false       -- Nunca es platform admin por defecto
  )
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ----------------------------------------------------------------------------
-- 6. TRIGGERS DE GUARDIA CONTRA ESCALADA DE PRIVILEGIOS (A5)
-- ----------------------------------------------------------------------------

-- Guardia en profiles: usuarios normales no pueden cambiarse de rol, empresa ni hacerse superadmin
create or replace function public.guard_profiles_update()
returns trigger as $$
begin
  -- Si quien ejecuta es Super Admin, se permiten todos los cambios
  if public.is_platform_admin() then
    return new;
  end if;

  -- Usuario común o admin de empresa modificando profiles:
  -- 1. Nadie puede otorgarse is_platform_admin
  if new.is_platform_admin is distinct from old.is_platform_admin then
    raise exception 'Seguridad: Solo un Super Administrador puede modificar privilegios de plataforma.';
  end if;

  -- 2. El propio usuario común solo puede modificar su propio nombre y avatar
  if auth.uid() = old.id then
    if new.role is distinct from old.role or new.company_id is distinct from old.company_id or new.active is distinct from old.active then
      raise exception 'Seguridad: No puedes alterar tu propio rol, empresa o estado de cuenta.';
    end if;
  end if;

  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists trg_guard_profiles_update on public.profiles;
create trigger trg_guard_profiles_update
  before update on public.profiles
  for each row execute procedure public.guard_profiles_update();

-- Guardia en companies: empresas no pueden cambiarse de plan ni reactivarse solas
create or replace function public.guard_companies_update()
returns trigger as $$
begin
  if public.is_platform_admin() then
    return new;
  end if;

  if new.plan is distinct from old.plan or
     new.plan_period is distinct from old.plan_period or
     new.plan_price is distinct from old.plan_price or
     new.plan_started_at is distinct from old.plan_started_at or
     new.plan_expires_at is distinct from old.plan_expires_at or
     new.active is distinct from old.active then
    raise exception 'Seguridad: Los planes y el estado de la empresa solo pueden ser autorizados por la Plataforma.';
  end if;

  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists trg_guard_companies_update on public.companies;
create trigger trg_guard_companies_update
  before update on public.companies
  for each row execute procedure public.guard_companies_update();

-- ----------------------------------------------------------------------------
-- 7. FUNCIONES RPC SEGURAS (A6)
-- ----------------------------------------------------------------------------

-- Crea la empresa del usuario y lo nombra administrador legítimo (solo una vez)
create or replace function public.create_company(
  p_name text,
  p_ruc text default null,
  p_address text default null,
  p_phone text default null,
  p_logo_url text default null
)
returns jsonb as $$
declare
  v_user_id uuid := auth.uid();
  v_existing_comp uuid;
  v_new_company public.companies%rowtype;
begin
  if v_user_id is null then
    raise exception 'No autenticado.';
  end if;

  -- Verificar si el usuario ya tiene una empresa vinculada
  select company_id into v_existing_comp from public.profiles where id = v_user_id;
  if v_existing_comp is not null then
    raise exception 'Ya tienes una empresa vinculada a tu cuenta.';
  end if;

  -- Crear la empresa con plan free inicial
  insert into public.companies (name, ruc, address, phone, logo_url, plan, active)
  values (trim(p_name), nullif(trim(p_ruc), ''), nullif(trim(p_address), ''), nullif(trim(p_phone), ''), nullif(trim(p_logo_url), ''), 'free', true)
  returning * into v_new_company;

  -- Asignar la empresa y rol admin al creador
  update public.profiles
  set company_id = v_new_company.id,
      role = 'admin'
  where id = v_user_id;

  return to_jsonb(v_new_company);
end;
$$ language plpgsql security definer;

-- Permite al admin de una empresa vincular un colaborador creado
create or replace function public.add_user_to_my_company(
  p_user_id uuid,
  p_full_name text,
  p_role text default 'empleado',
  p_active boolean default true
)
returns jsonb as $$
declare
  v_caller_comp uuid := public.current_company_id();
  v_caller_role text;
  v_target_profile public.profiles%rowtype;
begin
  if v_caller_comp is null then
    raise exception 'No perteneces a ninguna empresa activa.';
  end if;

  select role into v_caller_role from public.profiles where id = auth.uid();
  if v_caller_role <> 'admin' and not public.is_platform_admin() then
    raise exception 'Solo un administrador puede vincular colaboradores a su empresa.';
  end if;

  -- No permitir que asignen rol superadmin
  if p_role not in ('admin', 'empleado', 'vendedor') then
    raise exception 'Rol no autorizado.';
  end if;

  -- Actualizar el perfil del colaborador con el company_id del llamador
  update public.profiles
  set full_name = trim(p_full_name),
      role = p_role,
      active = p_active,
      company_id = v_caller_comp
  where id = p_user_id
    and (company_id is null or company_id = v_caller_comp)
  returning * into v_target_profile;

  if not found then
    raise exception 'El usuario no existe o ya pertenece a otra empresa independiente.';
  end if;

  return to_jsonb(v_target_profile);
end;
$$ language plpgsql security definer;

-- ----------------------------------------------------------------------------
-- 8. POLÍTICAS RLS ESTRICTAS MULTIEMPRESA (A1)
-- ----------------------------------------------------------------------------

-- Habilitar RLS en todas las tablas
alter table public.companies enable row level security;
alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.suppliers enable row level security;
alter table public.clients enable row level security;
alter table public.products enable row level security;
alter table public.inventory_movements enable row level security;
alter table public.sales enable row level security;
alter table public.purchases enable row level security;
alter table public.plan_requests enable row level security;
alter table public.assistant_usage enable row level security;

-- Limpieza preventiva de políticas anteriores
do $$
declare
  pol record;
begin
  for pol in (
    select schemaname, tablename, policyname
    from pg_policies
    where schemaname = 'public'
  ) loop
    execute format('drop policy if exists %I on %I.%I', pol.policyname, pol.schemaname, pol.tablename);
  end loop;
end $$;

-- 8.1 COMPANIES
-- Super Admin ve y gestiona todas las empresas
create policy "companies_superadmin_all" on public.companies
  for all using (public.is_platform_admin())
  with check (public.is_platform_admin());

-- Miembros ven los datos de su propia empresa
create policy "companies_member_select" on public.companies
  for select using (id = public.current_company_id());

-- Admins de empresa actualizan solo su empresa
create policy "companies_admin_update" on public.companies
  for update using (
    id = public.current_company_id() and
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  )
  with check (id = public.current_company_id());

-- 8.2 PROFILES
-- Super Admin ve todos los perfiles
create policy "profiles_superadmin_all" on public.profiles
  for all using (public.is_platform_admin())
  with check (public.is_platform_admin());

-- Miembros de empresa ven a sus compañeros
create policy "profiles_member_select" on public.profiles
  for select using (
    id = auth.uid() or
    (company_id is not null and company_id = public.current_company_id())
  );

-- Cada usuario actualiza su propio perfil (nombre, avatar)
create policy "profiles_self_update" on public.profiles
  for update using (id = auth.uid())
  with check (id = auth.uid());

-- Admins de empresa pueden actualizar el perfil de sus colaboradores
create policy "profiles_company_admin_update" on public.profiles
  for update using (
    company_id is not null and
    company_id = public.current_company_id() and
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

-- 8.3 CATEGORIES
create policy "categories_isolation" on public.categories
  for all using (company_id = public.current_company_id())
  with check (company_id = public.current_company_id());

-- 8.4 SUPPLIERS
create policy "suppliers_isolation" on public.suppliers
  for all using (company_id = public.current_company_id())
  with check (company_id = public.current_company_id());

-- 8.5 CLIENTS
create policy "clients_isolation" on public.clients
  for all using (company_id = public.current_company_id())
  with check (company_id = public.current_company_id());

-- 8.6 PRODUCTS
create policy "products_isolation" on public.products
  for all using (company_id = public.current_company_id())
  with check (company_id = public.current_company_id());

-- 8.7 INVENTORY_MOVEMENTS
create policy "movements_isolation" on public.inventory_movements
  for all using (company_id = public.current_company_id())
  with check (company_id = public.current_company_id());

-- 8.8 SALES
create policy "sales_isolation" on public.sales
  for all using (company_id = public.current_company_id())
  with check (company_id = public.current_company_id());

-- 8.9 PURCHASES
create policy "purchases_isolation" on public.purchases
  for all using (company_id = public.current_company_id())
  with check (company_id = public.current_company_id());

-- 8.10 ASSISTANT_USAGE
create policy "assistant_usage_isolation" on public.assistant_usage
  for all using (company_id = public.current_company_id())
  with check (company_id = public.current_company_id());

-- 8.11 PLAN_REQUESTS
-- Super Admin gestiona todas las solicitudes
create policy "plan_requests_superadmin" on public.plan_requests
  for all using (public.is_platform_admin())
  with check (public.is_platform_admin());

-- Empresas ven y crean sus propias solicitudes
create policy "plan_requests_member" on public.plan_requests
  for select using (company_id = public.current_company_id());

create policy "plan_requests_insert" on public.plan_requests
  for insert with check (company_id = public.current_company_id());

-- ============================================================================
-- FIN DE LA MIGRACIÓN
-- ============================================================================
