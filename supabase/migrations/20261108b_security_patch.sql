-- ============================================================================
-- PARCHE DE SEGURIDAD CYA: TRIGGERS DE GUARDIA SECURITY INVOKER
-- ============================================================================
-- Corrige el bloqueo accidental de RPCs internas (create_company) permitiendo
-- que los procesos de sistema o roles internos (postgres, service_role)
-- operen legítimamente, mientras que los clientes directos ('authenticated', 'anon')
-- quedan estrictamente vigilados contra escalada de privilegios y autoservicio.
-- ============================================================================

-- 1. GUARDIA EN PROFILES (SECURITY INVOKER)
create or replace function public.guard_profiles_update()
returns trigger
security invoker
as $$
begin
  -- Si la modificación proviene de un contexto interno/RPC o superuser del sistema, permitir
  if current_user not in ('authenticated', 'anon') then
    return new;
  end if;

  -- Si es Super Administrador de la plataforma, permitir
  if public.is_platform_admin() then
    return new;
  end if;

  -- Ningún usuario o cliente puede otorgarse is_platform_admin
  if new.is_platform_admin is distinct from old.is_platform_admin then
    raise exception 'Solo un administrador de plataforma puede modificar is_platform_admin.';
  end if;

  -- Un usuario normal no puede cambiarse su propio rol o empresa directamente vía API
  if auth.uid() = old.id and old.company_id is not null then
    if new.role is distinct from old.role or new.company_id is distinct from old.company_id or new.active is distinct from old.active then
      raise exception 'No puedes alterar tu propio rol, empresa o estado de cuenta.';
    end if;
  end if;

  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_guard_profiles_update on public.profiles;
create trigger trg_guard_profiles_update
  before update on public.profiles
  for each row execute procedure public.guard_profiles_update();

-- 2. GUARDIA EN COMPANIES (SECURITY INVOKER)
create or replace function public.guard_companies_update()
returns trigger
security invoker
as $$
begin
  -- Si la modificación proviene de un contexto interno/RPC o superuser del sistema, permitir
  if current_user not in ('authenticated', 'anon') then
    return new;
  end if;

  -- Si es Super Administrador de la plataforma, permitir
  if public.is_platform_admin() then
    return new;
  end if;

  -- Bloquear autoservicio de planes y reactivación no autorizada desde el cliente
  if new.plan is distinct from old.plan or
     new.plan_period is distinct from old.plan_period or
     new.plan_price is distinct from old.plan_price or
     new.plan_started_at is distinct from old.plan_started_at or
     new.plan_expires_at is distinct from old.plan_expires_at or
     new.active is distinct from old.active then
    raise exception 'Los planes y estado de la empresa solo pueden ser autorizados por la Plataforma.';
  end if;

  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_guard_companies_update on public.companies;
create trigger trg_guard_companies_update
  before update on public.companies
  for each row execute procedure public.guard_companies_update();
