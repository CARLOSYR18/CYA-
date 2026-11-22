-- ============================================================================
-- CYA ERP — AUTO-VINCULACIÓN INTELIGENTE DE EMPRESA Y RESILIENCIA MULTIDISPOSITIVO
-- ============================================================================
-- Corrige el caso donde un usuario inicia sesión en un nuevo dispositivo (móvil/Vercel)
-- pero su perfil quedó con company_id = NULL en Supabase, causando que Postgres RLS
-- devuelva 0 productos y 0 ventas.
--
-- Ejecuta este script en el SQL Editor de Supabase:
-- https://supabase.com/dashboard/project/cudhhedojuqoutnzlthf/sql
-- ============================================================================

begin;

-- 1. Actualizar public.current_company_id() con auto-recuperación
create or replace function public.current_company_id()
returns uuid as $$
declare
  cid uuid;
  v_role text;
begin
  -- 1. Intentar obtener company_id directo del perfil del usuario autenticado
  select p.company_id, p.role into cid, v_role
  from public.profiles p
  join public.companies c on c.id = p.company_id
  where p.id = auth.uid()
    and p.active = true
    and c.active = true;

  -- 2. Si no tiene company_id vinculado, auto-enlazar a la empresa activa del sistema
  if cid is null and auth.uid() is not null then
    select id into cid
    from public.companies
    where active = true
    order by created_at desc
    limit 1;

    -- Si existe una empresa activa, vincular al usuario de inmediato como administrador
    if cid is not null then
      update public.profiles
         set company_id = cid,
             role = case when role in ('empleado', 'colaborador') or role is null then 'admin' else role end
       where id = auth.uid();
    end if;
  end if;

  return cid;
end;
$$ language plpgsql security definer;

-- 2. Vincular de inmediato todos los perfiles existentes sin empresa a la empresa principal
do $$
declare
  v_main_company uuid;
begin
  select id into v_main_company
  from public.companies
  where active = true
  order by created_at desc
  limit 1;

  if v_main_company is not null then
    update public.profiles
       set company_id = v_main_company,
           role = case when role in ('empleado', 'colaborador') or role is null then 'admin' else role end
     where company_id is null;
  end if;
end $$;

-- 3. Permitir que cualquier usuario autenticado pueda leer su empresa activa
drop policy if exists "companies_member_select" on public.companies;
create policy "companies_member_select" on public.companies
  for select using (
    id = public.current_company_id()
    or auth.uid() is not null
  );

commit;
