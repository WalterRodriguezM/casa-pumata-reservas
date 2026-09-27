-- =========================================================
-- Casa Pumata - Sistema de Reservas
-- Migración 001 - Fase 1: Modelo de datos base
-- Ejecutar manualmente en el SQL Editor de Supabase.
-- =========================================================

-- Extensión necesaria para gen_random_uuid()
create extension if not exists pgcrypto;

-- =========================================================
-- CATÁLOGOS
-- Tablas propias en vez de enums, para poder gestionarlas
-- por SQL sin necesidad de redeploy (patrón de La Loma).
-- =========================================================

create table tipos_documento (
  id smallint primary key,
  nombre text not null unique
);

insert into tipos_documento (id, nombre) values
  (1, 'Cédula de ciudadanía'),
  (2, 'Cédula de extranjería'),
  (3, 'Pasaporte'),
  (4, 'Otro');

create table generos (
  id smallint primary key,
  nombre text not null unique
);

insert into generos (id, nombre) values
  (1, 'Masculino'),
  (2, 'Femenino'),
  (3, 'Otro');

create table origenes_reserva (
  id smallint primary key,
  nombre text not null unique
);

insert into origenes_reserva (id, nombre) values
  (1, 'Booking'),
  (2, 'Airbnb'),
  (3, 'Directo'),
  (4, 'Otro');

create table metodos_pago (
  id smallint primary key,
  nombre text not null unique
);

insert into metodos_pago (id, nombre) values
  (1, 'Transferencia'),
  (2, 'Efectivo'),
  (3, 'Otro');

-- IMPORTANTE: el id 3 (Cancelada) se referencia más abajo
-- de forma hardcodeada en el exclusion constraint. Si se
-- agregan o reordenan estados, revisar esa constraint.
create table estados_reserva (
  id smallint primary key,
  nombre text not null unique
);

insert into estados_reserva (id, nombre) values
  (1, 'Pendiente'),
  (2, 'Confirmada'),
  (3, 'Cancelada');

create table categorias_gasto (
  id smallint primary key,
  nombre text not null unique
);

insert into categorias_gasto (id, nombre) values
  (1, 'Gas'),
  (2, 'Agua'),
  (3, 'Electricidad'),
  (4, 'Internet'),
  (5, 'Cable'),
  (6, 'Aseo'),
  (7, 'Mantenimiento'),
  (8, 'Impuestos'),
  (9, 'Pagos generales'),
  (10, 'Cuidado');

-- =========================================================
-- TABLAS PRINCIPALES
-- =========================================================

create table huespedes (
  id uuid primary key default gen_random_uuid(),
  nombre_completo text not null,
  tipo_documento_id smallint not null references tipos_documento(id),
  numero_documento text not null,
  telefono text,
  correo text,
  genero_id smallint references generos(id),
  created_at timestamptz not null default now(),
  unique (tipo_documento_id, numero_documento)
);

create index idx_huespedes_nombre on huespedes using gin (nombre_completo gin_trgm_ops);
-- Nota: el índice de arriba requiere la extensión pg_trgm para
-- búsqueda en vivo por nombre (ILIKE '%...%' eficiente).
-- Si falla, correr antes: create extension if not exists pg_trgm;

create table reservas (
  id uuid primary key default gen_random_uuid(),
  huesped_id uuid not null references huespedes(id),
  fecha_checkin date not null,
  fecha_checkout date not null check (fecha_checkout > fecha_checkin),
  origen_reserva_id smallint not null references origenes_reserva(id),
  metodo_pago_id smallint not null references metodos_pago(id),
  estado_reserva_id smallint not null references estados_reserva(id) default 1,
  monto_total numeric(12,2) not null default 0,
  monto_pagado numeric(12,2) not null default 0,
  numero_huespedes int not null default 1,
  notas text,
  created_at timestamptz not null default now(),

  -- Evita doble-reserva de fechas a nivel de base de datos.
  -- Solo bloquea overlaps entre reservas NO canceladas
  -- (id 3 = Cancelada, ver tabla estados_reserva arriba).
  exclude using gist (
    daterange(fecha_checkin, fecha_checkout, '[)') with &&
  ) where (estado_reserva_id <> 3)
);

create table gastos (
  id uuid primary key default gen_random_uuid(),
  fecha date not null,
  categoria_gasto_id smallint not null references categorias_gasto(id),
  monto numeric(12,2) not null,
  descripcion text,
  created_at timestamptz not null default now()
);

-- =========================================================
-- RLS - un solo usuario, sin roles diferenciados.
-- "Cualquier autenticado puede todo" (patrón de La Loma).
-- =========================================================

alter table tipos_documento enable row level security;
alter table generos enable row level security;
alter table origenes_reserva enable row level security;
alter table metodos_pago enable row level security;
alter table estados_reserva enable row level security;
alter table categorias_gasto enable row level security;
alter table huespedes enable row level security;
alter table reservas enable row level security;
alter table gastos enable row level security;

create policy "authenticated_full_access" on tipos_documento for all to authenticated using (true) with check (true);
create policy "authenticated_full_access" on generos for all to authenticated using (true) with check (true);
create policy "authenticated_full_access" on origenes_reserva for all to authenticated using (true) with check (true);
create policy "authenticated_full_access" on metodos_pago for all to authenticated using (true) with check (true);
create policy "authenticated_full_access" on estados_reserva for all to authenticated using (true) with check (true);
create policy "authenticated_full_access" on categorias_gasto for all to authenticated using (true) with check (true);
create policy "authenticated_full_access" on huespedes for all to authenticated using (true) with check (true);
create policy "authenticated_full_access" on reservas for all to authenticated using (true) with check (true);
create policy "authenticated_full_access" on gastos for all to authenticated using (true) with check (true);
