-- 005_categoria_comision_ana.sql
-- La categoría de gasto «Cuidado» (id 10) pasa a ser «Comisión Ana».
-- Se renombra la fila (no se borra) para no perder gastos ya registrados con ese id:
-- si hubiera alguno, quedaría como «Comisión Ana».
--
-- Correr a mano en el SQL Editor de Supabase.

update categorias_gasto set nombre = 'Comisión Ana' where id = 10;

-- VERIFICACIÓN (opcional):
-- select * from categorias_gasto order by id;
-- select count(*) from gastos where categoria_gasto_id = 10;  -- gastos que quedan como Comisión Ana
