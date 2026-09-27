@AGENTS.md
## Contexto del proyecto: Casa Pumata - Sistema de Reservas

Sistema de gestión de reservas para una casa de alquiler (Booking/Airbnb),
un solo usuario, sin roles. Basado en el mismo patrón que
La Loma Hotel (proyecto hermano), pero simplificado.

### Stack
Next.js (App Router) + Supabase (Postgres + Auth) + Vercel + Resend.

### Decisiones de alcance (kickoff)
- Un solo usuario, sin tabla `perfiles` ni roles — RLS simple:
  "cualquier autenticado puede todo".
- Sin TRA/SIRE por ahora — uso personal/informal, no listado
  públicamente en plataformas. Se retoma si se decide abrir al público.
- Cada reserva ocupa siempre la casa completa — no hay concepto de
  "habitación" como unidad reservable independiente.
- Uso no comercial por ahora → Vercel Hobby (no Pro).
- Dominio: *.vercel.app por ahora, sin dominio propio. Fase de
  confirmaciones por correo (Resend) pospuesta hasta tener dominio.

### Fases
0. Infraestructura — hecha
1. Modelo de datos (reservas, catálogos, exclusion constraint) — hecha
2. Wizard de reserva (fechas → detalles → confirmación) — hecha
3. Calendario de ocupación — hecha
4. Registro de gastos — hecha (tipo casa/personal, socio, cuenta)
5. Reportes (filtros por período + desglose) — hecha (incluye cuadre por socio)
6. Confirmaciones por correo — POSPUESTA hasta tener dominio propio

### Estado de la base (migraciones)
Producción tiene aplicadas 001–006 y la carga de reservas 2026 del Excel.
`000_extensiones.sql` solo se corre al montar un proyecto nuevo (en
producción ya está). La próxima migración nueva es la 007.

### Patrones a reutilizar de La Loma
Ver documento de patrones reutilizables del proyecto. En resumen:
catálogos pequeños como tablas propias (no enums), estados derivados
en vez de columnas duplicadas, fire-and-forget para integraciones
externas, migraciones SQL las corre el humano manualmente en el SQL
Editor de Supabase (nunca el agente de forma directa).

## Convención de trabajo: validar antes de construir

- Para cualquier componente de UI (calendario, wizard, formularios,
  reportes): mostrar un mockup/diseño visual para aprobación antes
  de escribir el código final. No construir directamente sobre la
  base de una descripción textual sin validar el diseño visual antes.
- No asumir nada que no esté explícitamente confirmado — ante
  cualquier ambigüedad o decisión de diseño/alcance, preguntar y
  validar antes de decidir o de escribir código, en vez de tomar el
  camino más razonable por cuenta propia.