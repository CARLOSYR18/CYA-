-- ============================================================================
-- CYA ERP — MIGRACIÓN OFICIAL: RLS, AISLAMIENTO Y SEGURIDAD MULTIEMPRESA
-- ============================================================================
-- Nombre: rls_cya.sql (versión aplicada en la base real de Supabase)
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
-- El rol se restringe estrictamente a admin, empleado o vendedor.
-- La condición de Super Admin de plataforma la rige exclusivamente el booleano is_platform_admin.
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  email text not null,
  role text not null default 'empleado' check (role in ('admin', 'empleado', 'vendedor')),
  company_id uuid references public.companies(id) on delete set null,
  is_platform_admin boolean not null default false,
  active boolean not null default true,
  avatar_url text,
  created_at timestamptz not null default now()
);

alter table public.profiles add column if not exists company_id uuid references public.companies(id) on delete set null;
alter table public.profiles add column if not exists is_platform_admin boolean not null default false;
alter table public.profiles add column if not exists avatar_url text;

-- Asegurar restricción estricta de roles autorizados
alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles
  add constraint profiles_role_check check (role in ('admin', 'empleado', 'vendedor'));

-- ----------------------------------------------------------------------------
-- 3. TABLAS DE NEGOCIO CON company_id
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

-- SKU único por empresa
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

-- Columnas exactas que usa el frontend: plan_period y price
create table if not exists public.plan_requests (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete set null,
  requested_plan text not null,
  plan_period text not null default 'trimestral',
  price numeric(12,2) not null default 0,
  voucher_url text,
  status text not null default 'pendiente' check (status in ('pendiente', 'aprobado', 'rechazado')),
  created_at timestamptz not null default now()
);
alter table public.plan_requests add column if not exists plan_period text not null default 'trimestral';
alter table public.plan_requests add column if not exists price numeric(12,2) not null default 0;

-- Columnas exactas que usa el frontend: usage_date y count
create table if not exists public.assistant_usage (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  usage_date date not null default current_date,
  count integer not null default 1,
  created_at timestamptz not null default now(),
  constraint assistant_usage_company_usage_date_key unique (company_id, usage_date)
);
alter table public.assistant_usage add column if not exists usage_date date not null default current_date;
alter table public.assistant_usage add column if not exists count integer not null default 1;

-- ----------------------------------------------------------------------------
-- 4. FUNCIONES DE AYUDA (SECURITY DEFINER)
-- ----------------------------------------------------------------------------
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

-- Helper: ¿el usuario actual es admin activo de su empresa?
create or replace function public.is_company_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce(
    (select role = 'admin' from public.profiles
      where id = auth.uid() and active is not false), false)
$$;

-- ----------------------------------------------------------------------------
-- 5. TRIGGER: NUEVO USUARIO
-- ----------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name, role, active, company_id, is_platform_admin)
  values (
    new.id,
    lower(trim(new.email)),
    coalesce(nullif(trim(new.raw_user_meta_data->>'full_name'), ''), split_part(new.email, '@', 1)),
    'empleado',
    true,
    null,
    false
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
-- 6. TRIGGERS DE GUARDIA CONTRA ESCALADA
-- ----------------------------------------------------------------------------
create or replace function public.guard_profiles_update()
returns trigger language plpgsql as $$
begin
  if current_user not in ('authenticated', 'anon') then
    return new;
  end if;

  if new.is_platform_admin is distinct from old.is_platform_admin then
    raise exception 'No autorizado: is_platform_admin no se puede modificar' using errcode = '42501';
  end if;

  if new.company_id is distinct from old.company_id then
    raise exception 'No autorizado: la empresa solo cambia mediante funciones del sistema' using errcode = '42501';
  end if;

  if new.role is distinct from old.role or new.active is distinct from old.active then
    if not (public.is_platform_admin()
            or (public.is_company_admin() and old.id <> auth.uid())) then
      raise exception 'No autorizado: no puedes cambiar rol o estado' using errcode = '42501';
    end if;
  end if;

  return new;
end $$;

drop trigger if exists trg_guard_profiles_update on public.profiles;
create trigger trg_guard_profiles_update
  before update on public.profiles
  for each row execute function public.guard_profiles_update();

create or replace function public.guard_companies_update()
returns trigger language plpgsql as $$
declare k text;
begin
  if current_user not in ('authenticated', 'anon') then
    return new;
  end if;
  if public.is_platform_admin() then
    return new;
  end if;
  foreach k in array array['plan','plan_period','plan_price','plan_started_at','plan_expires_at','active']
  loop
    if to_jsonb(new) -> k is distinct from to_jsonb(old) -> k then
      raise exception 'No autorizado: "%" solo lo cambia el administrador de la plataforma', k
        using errcode = '42501';
    end if;
  end loop;
  return new;
end $$;

drop trigger if exists trg_guard_companies_update on public.companies;
create trigger trg_guard_companies_update
  before update on public.companies
  for each row execute function public.guard_companies_update();

-- ----------------------------------------------------------------------------
-- 7. FUNCIONES RPC ATÓMICAS (SECURITY DEFINER)
-- ----------------------------------------------------------------------------

-- create_company: crea empresa y vincula al creador como primer admin
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

  select company_id into v_existing_comp from public.profiles where id = v_user_id;
  if v_existing_comp is not null then
    raise exception 'Ya tienes una empresa vinculada a tu cuenta.';
  end if;

  insert into public.companies (name, ruc, address, phone, logo_url, plan, active)
  values (trim(p_name), nullif(trim(p_ruc), ''), nullif(trim(p_address), ''), nullif(trim(p_phone), ''), nullif(trim(p_logo_url), ''), 'free', true)
  returning * into v_new_company;

  update public.profiles
  set company_id = v_new_company.id,
      role = 'admin'
  where id = v_user_id;

  return to_jsonb(v_new_company);
end;
$$ language plpgsql security definer;

-- add_user_to_my_company: vincula a un colaborador creado hace menos de 15 minutos
create or replace function public.add_user_to_my_company(
  p_user_id uuid,
  p_full_name text,
  p_role text default 'empleado',
  p_active boolean default true
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_company uuid := public.current_company_id();
  v_profile public.profiles%rowtype;
begin
  if v_company is null then
    raise exception 'No perteneces a ninguna empresa activa.' using errcode = '42501';
  end if;
  if not public.is_company_admin() then
    raise exception 'Solo un administrador puede vincular colaboradores.' using errcode = '42501';
  end if;
  if p_role not in ('admin', 'empleado', 'vendedor') then
    raise exception 'Rol no autorizado.';
  end if;

  update public.profiles
     set full_name = coalesce(nullif(trim(p_full_name), ''), full_name),
         role = p_role,
         active = coalesce(p_active, true),
         company_id = v_company
   where id = p_user_id
     and is_platform_admin = false
     and (
       (company_id is null and created_at >= now() - interval '15 minutes')
       or company_id = v_company
     )
  returning * into v_profile;

  if not found then
    raise exception 'No se pudo vincular al usuario (ya pertenece a otra empresa, pasaron más de 15 minutos o no existe).'
      using errcode = '42501';
  end if;
  return to_jsonb(v_profile);
end $$;

-- ----------------------------------------------------------------------------
-- 8. POLÍTICAS RLS
-- ----------------------------------------------------------------------------
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

-- Limpiar políticas previas
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
create policy "companies_superadmin_all" on public.companies
  for all using (public.is_platform_admin())
  with check (public.is_platform_admin());

create policy "companies_member_select" on public.companies
  for select using (id = public.current_company_id());

create policy "companies_admin_update" on public.companies
  for update using (
    id = public.current_company_id() and
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  )
  with check (id = public.current_company_id());

-- 8.2 PROFILES
create policy "profiles_superadmin_all" on public.profiles
  for all using (public.is_platform_admin())
  with check (public.is_platform_admin());

create policy "profiles_member_select" on public.profiles
  for select using (
    id = auth.uid() or
    (company_id is not null and company_id = public.current_company_id())
  );

create policy "profiles_self_update" on public.profiles
  for update using (id = auth.uid())
  with check (id = auth.uid());

create policy "profiles_company_admin_update" on public.profiles
  for update using (
    company_id is not null and
    company_id = public.current_company_id() and
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

-- 8.3 TABLAS DE NEGOCIO AISLADAS POR EMPRESA
create policy "categories_isolation" on public.categories
  for all using (company_id = public.current_company_id())
  with check (company_id = public.current_company_id());

create policy "suppliers_isolation" on public.suppliers
  for all using (company_id = public.current_company_id())
  with check (company_id = public.current_company_id());

create policy "clients_isolation" on public.clients
  for all using (company_id = public.current_company_id())
  with check (company_id = public.current_company_id());

create policy "products_isolation" on public.products
  for all using (company_id = public.current_company_id())
  with check (company_id = public.current_company_id());

create policy "movements_isolation" on public.inventory_movements
  for all using (company_id = public.current_company_id())
  with check (company_id = public.current_company_id());

create policy "sales_isolation" on public.sales
  for all using (company_id = public.current_company_id())
  with check (company_id = public.current_company_id());

create policy "purchases_isolation" on public.purchases
  for all using (company_id = public.current_company_id())
  with check (company_id = public.current_company_id());

create policy "assistant_usage_isolation" on public.assistant_usage
  for all using (company_id = public.current_company_id())
  with check (company_id = public.current_company_id());

-- 8.4 PLAN_REQUESTS
create policy "plan_requests_superadmin" on public.plan_requests
  for all using (public.is_platform_admin())
  with check (public.is_platform_admin());

create policy "plan_requests_member" on public.plan_requests
  for select using (company_id = public.current_company_id());

create policy "plan_requests_insert" on public.plan_requests
  for insert with check (company_id = public.current_company_id());

-- ----------------------------------------------------------------------------
-- 9. PERMISOS DE EJECUCIÓN (REVOKE / GRANT)
-- ----------------------------------------------------------------------------
revoke all on function public.create_company(text, text, text, text, text) from public, anon;
revoke all on function public.add_user_to_my_company(uuid, text, text, boolean) from public, anon;
grant execute on function public.create_company(text, text, text, text, text) to authenticated;
grant execute on function public.add_user_to_my_company(uuid, text, text, boolean) to authenticated;

