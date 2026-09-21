-- 004_relevo_mismo_dia_y_metodo_opcional.sql
-- 1) Vuelve a permitir que una reserva salga y otra entre el mismo día: el rango
--    de cada reserva pasa de [checkin, checkout] (002) a [checkin, checkout).
-- 2) El método de pago de una reserva pasa a ser opcional (hay reservas viejas sin dato).
-- 3) Agrega «Bancolombia Ana» y «Western Union» al catálogo de métodos de pago.
--
-- Correr a mano en el SQL Editor de Supabase (una sola transacción).

begin;

do $$
declare
  v_name text;
  v_def  text;
  v_new  text;
begin
  select c.conname, pg_get_constraintdef(c.oid)
    into v_name, v_def
  from pg_constraint c
  where c.conrelid = 'public.reservas'::regclass
    and c.contype = 'x';

  if v_name is null then
    raise exception 'No hay exclusion constraint en public.reservas; revisar 001/002.';
  end if;

  raise notice 'Constraint actual: % -> %', v_name, v_def;

  v_new := replace(v_def, '''[]''', '''[)''');

  if v_new = v_def then
    raise exception 'El constraint no usa el rango inclusivo [] esperado. Definicion: %', v_def;
  end if;

  execute format('alter table public.reservas drop constraint %I', v_name);
  execute format('alter table public.reservas add constraint %I %s', v_name, v_new);

  raise notice 'Constraint nuevo: % -> %', v_name, v_new;
end
$$;

alter table reservas alter column metodo_pago_id drop not null;

insert into metodos_pago (id, nombre) values
  (4, 'Bancolombia Ana'),
  (5, 'Western Union')
on conflict do nothing;

commit;

-- VERIFICACIÓN (opcional): el constraint debe mostrar '[)'.
-- select conname, pg_get_constraintdef(oid)
-- from pg_constraint
-- where conrelid = 'public.reservas'::regclass and contype = 'x';
-- select * from metodos_pago order by id;
