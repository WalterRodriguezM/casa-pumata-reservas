-- 002_checkout_inclusivo.sql
-- El día de check-out queda ocupado (aseo de la casa): el rango de una reserva
-- pasa de [checkin, checkout) a [checkin, checkout], así no puede haber un
-- check-in el mismo día que sale otra reserva.
--
-- Correr a mano en el SQL Editor de Supabase. Es una sola transacción: si algo
-- falla, no cambia nada.
--
-- Como no tengo a la vista 001_fase1_modelo_datos.sql, la migración lee el
-- exclusion constraint existente de `reservas` y lo recrea igual (mismo nombre,
-- mismo WHERE de canceladas), cambiando solo el rango a inclusivo.

-- 0) PRE-CHEQUEO (opcional, correr antes por separado): reservas actuales que
--    chocarían con la regla nueva (mismo día de salida y entrada).
--
-- select a.id as reserva_a, b.id as reserva_b, a.fecha_checkout as dia_choque
-- from reservas a
-- join reservas b on a.id < b.id
--  and a.fecha_checkin <= b.fecha_checkout
--  and b.fecha_checkin <= a.fecha_checkout
-- where a.estado_reserva_id <> 3 and b.estado_reserva_id <> 3;

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
    raise exception 'No hay exclusion constraint en public.reservas; revisar 001.';
  end if;

  raise notice 'Constraint actual: % -> %', v_name, v_def;

  -- daterange(a, b, '[)')  ->  daterange(a, b, '[]')
  v_new := replace(v_def, '''[)''', '''[]''');
  -- daterange(a, b) (sin 3er argumento, implica '[)')  ->  daterange(a, b, '[]')
  if v_new = v_def then
    v_new := regexp_replace(
      v_def,
      'daterange\(([^,()]+),\s*([^,()]+)\)',
      'daterange(\1, \2, ''[]'')'
    );
  end if;

  if v_new = v_def then
    raise exception 'No pude convertir el rango a inclusivo automaticamente. Definicion: %', v_def;
  end if;

  execute format('alter table public.reservas drop constraint %I', v_name);
  execute format('alter table public.reservas add constraint %I %s', v_name, v_new);

  raise notice 'Constraint nuevo: % -> %', v_name, v_new;
end
$$;

commit;

-- 1) VERIFICACION (opcional): debe mostrar '[]' en la definicion.
-- select conname, pg_get_constraintdef(oid)
-- from pg_constraint
-- where conrelid = 'public.reservas'::regclass and contype = 'x';
--
-- 2) PRUEBA (opcional, dentro de begin/rollback): con una reserva existente que
--    sale el día X, insertar otra que entre el día X debe fallar con
--    "conflicting key value violates exclusion constraint".
