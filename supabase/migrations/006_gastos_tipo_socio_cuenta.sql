-- 006_gastos_tipo_socio_cuenta.sql
-- Gastos con tipo (casa o personal), socio y «con qué se pagó»; socios con su porcentaje.
--
--  * tipo 'casa'     -> gasto de la casa: lleva categoría y no lleva socio.
--  * tipo 'personal' -> gasto, retiro o préstamo de un socio: categoría fija «Personal» (id 12);
--                       socio_id null = «Por confirmar» (aún sin asignar).
--  * metodo_pago_id  -> «con qué se pagó» (catálogo metodos_pago; Efectivo = id 2 por defecto).
--
-- Los gastos que ya existen quedan como 'casa' y en Efectivo.
-- Correr a mano en el SQL Editor de Supabase (una sola transacción).

begin;

create table socios (
  id smallint primary key,
  nombre text not null unique,
  porcentaje numeric(5,2) not null check (porcentaje > 0 and porcentaje <= 100)
);

insert into socios (id, nombre, porcentaje) values
  (1, 'Nelson', 40),
  (2, 'María Josse', 60);

alter table socios enable row level security;
create policy "authenticated_full_access" on socios for all to authenticated using (true) with check (true);

insert into categorias_gasto (id, nombre) values
  (11, 'Comisión Booking/Airbnb'),
  (12, 'Personal')
on conflict do nothing;

alter table gastos
  add column tipo text not null default 'casa' check (tipo in ('casa', 'personal')),
  add column socio_id smallint references socios(id),
  add column metodo_pago_id smallint not null default 2 references metodos_pago(id);

-- Un gasto de la casa no lleva socio.
alter table gastos add constraint gastos_socio_solo_personal
  check (tipo = 'personal' or socio_id is null);

-- Los gastos personales usan la categoría «Personal» (id 12) y solo ellos.
-- IMPORTANTE: el id 12 se referencia fijo; si se cambia el catálogo, revisar esta constraint.
alter table gastos add constraint gastos_categoria_personal
  check ((tipo = 'personal') = (categoria_gasto_id = 12));

commit;

-- VERIFICACIÓN (opcional):
-- select * from socios;
-- select * from categorias_gasto order by id;
-- select tipo, count(*) from gastos group by tipo;
