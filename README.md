# Casa Pumata · Reservas

Sistema de reservas, gastos y reportes de Casa Pumata (casa de alquiler completa).
Un solo usuario, sin roles.

**Stack:** Next.js (App Router) · Supabase (Postgres + Auth) · Vercel.

## Correr en local

1. `npm install`
2. Crear `.env.local` con:
   ```
   NEXT_PUBLIC_SUPABASE_URL=...
   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=...
   ```
3. `npm run dev` y abrir <http://localhost:3001> (el puerto está fijo en 3001).

Local usa la misma base de Supabase que producción: lo que se crea en local queda en los datos reales.

## Deploy

Cada push a `main` se publica solo en Vercel.

## Base de datos

Las migraciones están en `supabase/migrations/` y se corren **a mano** en el SQL Editor de Supabase, en orden.

| Migración | Qué hace |
|---|---|
| 000_extensiones | Activa `pg_trgm`. Solo para un proyecto nuevo; en producción ya está. |
| 001_fase1_modelo_datos | Catálogos, huéspedes, reservas, gastos y RLS («cualquier autenticado puede todo»). |
| 002_checkout_inclusivo | El día de check-out quedaba ocupado (la 004 lo revierte). |
| 003_documento_opcional | El documento del huésped pasa a ser opcional. |
| 004_relevo_mismo_dia_y_metodo_opcional | Un huésped puede salir y otro entrar el mismo día; método de pago opcional. |
| 005_categoria_comision_ana | La categoría «Cuidado» pasa a «Comisión Ana». |
| 006_gastos_tipo_socio_cuenta | Socios (Nelson 40 %, María Josse 60 %), gastos casa/personal, socio y cuenta. |

La carpeta `importar/` (Excel y script de carga de reservas) tiene datos personales y no va al repo.

## Pantallas

- **Home:** próximas reservas, ocupación del mes e ingresos contra gastos de la casa.
- **Calendario:** ocupación del mes; arrastrar sobre días libres abre el wizard de reserva.
- **Reservas:** listado con filtros por huésped, año y mes de check-in, origen y estado.
- **Gastos:** tabla editable con filtros por año, mes, tipo, socio, categoría y cuenta.
- **Reportes:** resumen del período con comparación, gráfico por mes, exportación a CSV y cuadre por socio.

## Reglas de negocio

- **Ocupación:** una reserva ocupa las noches del check-in a la noche anterior al check-out. El día de salida otra reserva puede entrar.
- **Cruce de fechas:** la base impide que dos reservas no canceladas se crucen.
- **Ingresos:** monto cobrado de las reservas, contado en el mes del check-in.
- **Utilidad a repartir:** ingresos cobrados − gastos de la casa. Se reparte según el porcentaje de cada socio.
- **Saldo de cada socio:** su parte de la utilidad − sus gastos personales, retiros y préstamos.
- **Saldo de caja:** utilidad − todos los retiros personales, incluidos los «Por confirmar». Es igual a la suma de los saldos de los socios menos los retiros por confirmar.
- **Comisión de Ana:** 7 % del valor bruto en reservas de Booking y Airbnb, 10 % en las demás.
- **Comparación en Reportes:** un mes se compara con el mes anterior; el año completo o varios meses, con los mismos meses del año anterior.
