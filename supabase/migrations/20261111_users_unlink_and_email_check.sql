-- ============================================================================
-- CYA ERP — MIGRACIÓN: VALIDACIÓN GLOBAL DE CORREOS Y DESVINCULACIÓN SEGURA
-- ============================================================================
-- Resuelve dos problemas clave en Usuarios y Roles:
--   1. check_email_registered(p_email): Permite verificar de forma segura si un
--      correo ya existe en auth.users o public.profiles (incluyendo Super Admin
--      o cuentas de otras empresas) SIN exponer datos privados de otras cuentas.
--   2. remove_user_from_my_company(p_user_id): Permite a un administrador de
--      empresa desvincular/quitar a un colaborador (o a un Super Admin que
--      haya quedado vinculado previamente) de su empresa de forma segura.
-- ============================================================================

begin;

-- 1. Verificación global de disponibilidad de correo (sin exponer PII ni otras empresas)
create or replace function public.check_email_registered(p_email text)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_email text := lower(trim(coalesce(p_email, '')));
  v_company uuid := public.current_company_id();
  v_profile record;
  v_auth_exists boolean := false;
begin
  if auth.uid() is null then
    raise exception 'No autenticado.' using errcode = '42501';
  end if;

  if not (public.is_company_admin() or public.is_platform_admin()) then
    raise exception 'No autorizado para validar cuentas.' using errcode = '42501';
  end if;

  if v_email = '' then
    return jsonb_build_object(
      'exists', false,
      'is_platform_admin', false,
      'in_current_company', false,
      'has_company', false
    );
  end if;

  select p.id, p.company_id, p.is_platform_admin
    into v_profile
    from public.profiles p
   where lower(trim(p.email)) = v_email
   limit 1;

  select exists(
    select 1
      from auth.users u
     where lower(trim(u.email)) = v_email
  ) into v_auth_exists;

  return jsonb_build_object(
    'exists', (v_profile.id is not null or v_auth_exists),
    'is_platform_admin', coalesce(v_profile.is_platform_admin, false),
    'in_current_company', (v_company is not null and v_profile.company_id = v_company),
    'has_company', (v_profile.company_id is not null)
  );
end;
$$;

-- 2. Desvincular usuario / colaborador de la empresa activa de forma segura
create or replace function public.remove_user_from_my_company(p_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_company uuid := public.current_company_id();
  v_target public.profiles%rowtype;
begin
  if v_company is null then
    raise exception 'No perteneces a ninguna empresa activa.' using errcode = '42501';
  end if;

  if not public.is_company_admin() then
    raise exception 'Solo un administrador puede quitar usuarios de la empresa.' using errcode = '42501';
  end if;

  if p_user_id is null or p_user_id = auth.uid() then
    raise exception 'No puedes eliminar tu propia cuenta.' using errcode = '42501';
  end if;

  select *
    into v_target
    from public.profiles
   where id = p_user_id
     and company_id = v_company
   limit 1;

  if not found then
    raise exception 'El usuario no pertenece a tu empresa o ya fue removido.';
  end if;

  -- Si por algún motivo un Super Admin quedó vinculado a una empresa,
  -- se desvincula restaurando su estado global intacto (active = true, role = 'admin').
  if v_target.is_platform_admin then
    update public.profiles
       set company_id = null,
           role = 'admin',
           active = true
     where id = p_user_id;
  else
    -- Para colaboradores regulares, se revoca el acceso a la empresa manteniendo
    -- integridad referencial con ventas/movimientos históricos.
    update public.profiles
       set company_id = null,
           active = false
     where id = p_user_id
       and company_id = v_company;
  end if;

  return jsonb_build_object(
    'removed', true,
    'id', v_target.id,
    'email', v_target.email,
    'was_platform_admin', v_target.is_platform_admin
  );
end;
$$;

-- 3. Refuerzo en add_user_to_my_company: solo vincular cuentas recién creadas y sin empresa
create or replace function public.add_user_to_my_company(
  p_user_id uuid,
  p_full_name text,
  p_role text default 'empleado',
  p_active boolean default true
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
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
    raise exception 'No se pudo vincular al usuario: la cuenta ya pertenece a otra empresa, es administrador de plataforma o fue creada previamente.'
      using errcode = '42501';
  end if;
  return to_jsonb(v_profile);
end;
$$;

-- 4. Permisos estrictos
revoke all on function public.check_email_registered(text) from public, anon;
revoke all on function public.remove_user_from_my_company(uuid) from public, anon;
revoke all on function public.add_user_to_my_company(uuid, text, text, boolean) from public, anon;

grant execute on function public.check_email_registered(text) to authenticated;
grant execute on function public.remove_user_from_my_company(uuid) to authenticated;
grant execute on function public.add_user_to_my_company(uuid, text, text, boolean) to authenticated;

commit;
