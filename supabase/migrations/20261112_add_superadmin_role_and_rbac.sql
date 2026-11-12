-- ============================================================================
-- CYA ERP — MIGRACIÓN: INCORPORACIÓN DEL ROL 'superadmin' Y MATRIZ RBAC
-- ============================================================================
-- Actualiza la restricción de roles en profiles para soportar explícitamente:
--   'superadmin' -> Nivel Plataforma SaaS (Planes, Empresas globales, Auditoría)
--   'admin'      -> Nivel Empresa / Dueño (Gestión total de su negocio y colaboradores)
--   'empleado'   -> Nivel Operativo / Punto de Venta (Ventas, Caja POS, Clientes)
--   'vendedor'   -> Variante de ventas operativa
-- ============================================================================

begin;

-- 1. Actualizar la restricción de roles para admitir 'superadmin'
alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles
  add constraint profiles_role_check check (role in ('superadmin', 'admin', 'empleado', 'vendedor'));

-- 2. Sincronizar perfiles que ya cuenten con is_platform_admin = true al rol 'superadmin'
update public.profiles
   set role = 'superadmin'
 where is_platform_admin = true;

-- 3. Actualizar trigger de guardia para que ningún inquilino o usuario común
--    pueda escalarse o asignar el rol 'superadmin'
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

  -- Bloquear que cualquier usuario no-superadmin asigne el rol 'superadmin'
  if new.role = 'superadmin' and not public.is_platform_admin() then
    raise exception 'No autorizado: el rol superadmin solo puede ser asignado por la plataforma' using errcode = '42501';
  end if;

  if new.role is distinct from old.role or new.active is distinct from old.active then
    if not (public.is_platform_admin()
            or (public.is_company_admin() and old.id <> auth.uid())) then
      raise exception 'No autorizado: no puedes cambiar rol o estado' using errcode = '42501';
    end if;
  end if;

  return new;
end $$;

commit;
