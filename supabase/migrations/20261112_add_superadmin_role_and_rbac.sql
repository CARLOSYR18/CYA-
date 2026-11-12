-- ============================================================================
-- CYA ERP — MIGRACIÓN: CREACIÓN DEL ROL 'superadmin' PARA EL CREADOR DE LA CUENTA
-- ============================================================================
-- 1. Permite 'superadmin' en profiles_role_check.
-- 2. Actualiza is_company_admin() e is_platform_admin() para otorgar autoridad plena.
-- 3. Actualiza create_company() para que quien crea la empresa sea 'superadmin'.
-- 4. Convierte tu cuenta '1599121@senati.pe' y cuentas maestras a 'superadmin'.
-- ============================================================================

begin;

-- 1. Actualizar restricción check para soportar 'superadmin'
alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles
  add constraint profiles_role_check check (role in ('superadmin', 'admin', 'empleado', 'vendedor'));

-- 2. Helper is_company_admin(): Superadmin y Admin tienen autoridad en su empresa
create or replace function public.is_company_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce(
    (select (role in ('superadmin', 'admin') or coalesce(is_platform_admin, false))
       from public.profiles
      where id = auth.uid() and active is not false), false);
$$;

-- 3. Helper is_platform_admin(): Reconoce a cuentas superadmin y platform admin
create or replace function public.is_platform_admin()
returns boolean as $$
declare
  v_is_super boolean;
begin
  select coalesce(is_platform_admin, false) or (role = 'superadmin') into v_is_super
  from public.profiles
  where id = auth.uid();

  return coalesce(v_is_super, false);
end;
$$ language plpgsql security definer stable;

-- 4. Actualizar create_company(): Quien crea la cuenta y funda la empresa es SUPER ADMIN
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

  -- El fundador / creador de la empresa adquiere el rol SUPER ADMIN
  update public.profiles
  set company_id = v_new_company.id,
      role = 'superadmin'
  where id = v_user_id;

  return to_jsonb(v_new_company);
end;
$$ language plpgsql security definer;

-- 5. Trigger de guardia contra escaladas indebidas
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

  -- Bloquear que empleados o usuarios no autorizados asignen 'superadmin'
  if new.role = 'superadmin' and not (public.is_company_admin() or public.is_platform_admin()) then
    raise exception 'No autorizado: el rol superadmin solo puede ser asignado por el creador' using errcode = '42501';
  end if;

  if new.role is distinct from old.role or new.active is distinct from old.active then
    if not (public.is_company_admin() or public.is_platform_admin()) then
      raise exception 'No autorizado: no tienes permisos para cambiar rol o estado' using errcode = '42501';
    end if;
  end if;

  return new;
end $$;

-- 6. ASIGNAR INMEDIATAMENTE ROL 'superadmin' A TU CUENTA CREADORA
update public.profiles
   set role = 'superadmin'
 where email = '1599121@senati.pe'
    or is_platform_admin = true;

commit;
