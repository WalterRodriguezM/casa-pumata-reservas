-- 003_documento_opcional.sql
-- El documento del huésped pasa a ser opcional (uso personal/informal).
-- Reglas:
--   * tipo y número van juntos: o ambos con valor, o ambos vacíos.
--   * el unique (tipo, número) sigue vigente; Postgres no compara NULLs,
--     así que varios huéspedes sin documento no chocan entre sí.
--
-- Correr a mano en el SQL Editor de Supabase (una sola transacción).

begin;

alter table huespedes alter column tipo_documento_id drop not null;
alter table huespedes alter column numero_documento drop not null;

alter table huespedes
  add constraint huespedes_documento_completo
  check ((tipo_documento_id is null) = (numero_documento is null));

commit;
