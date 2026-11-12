-- ============================================================================
-- CYA ERP — PROTECCIÓN DE IDENTIDAD DE EMPRESA (BLOQUEO DE CAMBIO DE NOMBRE)
-- ============================================================================
-- Evita que un administrador de empresa cambie libremente el nombre registrado
-- de su empresa después de crearla (solo el Super Admin de plataforma puede
-- modificarlo ante una solicitud formal).
-- ============================================================================

begin;

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
  foreach k in array array['name','plan','plan_period','plan_price','plan_started_at','plan_expires_at','active']
  loop
    if to_jsonb(new) -> k is distinct from to_jsonb(old) -> k then
      raise exception 'No autorizado: "%" solo lo cambia el administrador de la plataforma', k
        using errcode = '42501';
    end if;
  end loop;
  return new;
end $$;

commit;
