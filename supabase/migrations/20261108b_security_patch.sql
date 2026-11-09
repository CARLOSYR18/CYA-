-- ============================================================================
-- CYA — PARCHE DE SEGURIDAD sobre la migración del agente (profiles/companies)
-- ============================================================================
-- Corrige, sin tocar tus datos ni tus políticas RLS:
--   1. Un usuario sin empresa podía asignarse a sí mismo cualquier empresa y
--      rol (escalada entre empresas).
--   2. create_company podía quedar bloqueada por el propio guard.
--   3. Nadie podía marcar is_platform_admin desde el SQL Editor.
--   4. add_user_to_my_company permitía tomar usuarios sin empresa de hace
--      tiempo y cuentas de plataforma.
--   5. Rol 'superadmin' asignable por un admin de empresa.
--
-- CÓMO USAR: pégalo completo en el SQL Editor y ejecuta (una sola vez).
-- Corre en una transacción: si algo falla, no se aplica nada.
-- ============================================================================

begin;

-- 1. Rol 'superadmin' fuera: el acceso maestro es solo is_platform_admin.
update public.profiles set role = 'empleado' where role = 'superadmin';
alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles
  add constraint profiles_role_check check (role in ('admin', 'empleado', 'vendedor'));

-- 2. Helper: ¿el usuario actual es admin activo de su empresa?
create or replace function public.is_company_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce(
    (select role = 'admin' from public.profiles
      where id = auth.uid() and active is not false), false)
$$;

-- 3. Guard de profiles. SECURITY INVOKER: current_user es el rol real que hace
--    la llamada. Las funciones del servidor (create_company, etc.) y el SQL
--    Editor corren con otro rol y quedan exentos; la app (authenticated/anon)
--    no puede tocar is_platform_admin, company_id, role ni active salvo un
--    admin sobre OTRO usuario de su empresa.
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

-- 4. Guard de companies (plan, vencimiento y estado solo para la plataforma).
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

-- Asegura que los triggers existan y apunten a estas funciones.
drop trigger if exists trg_guard_profiles_update on public.profiles;
create trigger trg_guard_profiles_update
  before update on public.profiles
  for each row execute function public.guard_profiles_update();

drop trigger if exists trg_guard_companies_update on public.companies;
create trigger trg_guard_companies_update
  before update on public.companies
  for each row execute function public.guard_companies_update();

-- 5. Vincular colaboradores: solo perfiles recién creados (15 min), sin empresa,
--    que no sean cuentas de plataforma; o editar a alguien de la propia empresa.
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

-- 6. Solo usuarios con sesión pueden llamar a las funciones del sistema.
revoke all on function public.create_company(text, text, text, text, text) from public, anon;
revoke all on function public.add_user_to_my_company(uuid, text, text, boolean) from public, anon;
grant execute on function public.create_company(text, text, text, text, text) to authenticated;
grant execute on function public.add_user_to_my_company(uuid, text, text, boolean) to authenticated;

commit;
