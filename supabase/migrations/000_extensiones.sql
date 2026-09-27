-- 000_extensiones.sql
-- Extensiones que necesitan las migraciones siguientes. Correr antes de la 001
-- solo al montar un proyecto de Supabase nuevo; en producción ya están activas
-- (si ya existen, `if not exists` no hace nada).
--
--  * pg_trgm  -> operador gin_trgm_ops del índice idx_huespedes_nombre (001),
--                para la búsqueda de huéspedes por nombre (ILIKE '%...%').
--
-- No hace falta nada más:
--  * gen_random_uuid() viene incluida en Postgres 13+ (la 001 igual crea pgcrypto).
--  * El exclusion constraint de reservas usa solo un daterange con &&, que GiST
--    soporta sin btree_gist.
--
-- En Supabase las extensiones van en el esquema `extensions`, que ya está en el
-- search_path del SQL Editor.
--
-- Correr a mano en el SQL Editor de Supabase.

create extension if not exists pg_trgm with schema extensions;

-- VERIFICACIÓN (opcional):
-- select extname, extnamespace::regnamespace from pg_extension where extname = 'pg_trgm';
