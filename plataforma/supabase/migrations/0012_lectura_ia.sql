-- Lectura automática de las capturas de métricas.
-- Reemplaza al escenario de Make que mandaba las imágenes a un modelo de visión:
-- ahora la plataforma las lee al recibirlas.
alter table form_submissions add column if not exists ai_reach int;
alter table form_submissions add column if not exists ai_views int;
alter table form_submissions add column if not exists ai_total_interactions int;
-- 'creador' = los tipeó; 'ia' = los leyó de las capturas; 'ambos' = coinciden.
alter table form_submissions add column if not exists metrics_source text;
-- Métricas donde el creador y la lectura NO coinciden — para que el equipo revise.
alter table form_submissions add column if not exists metrics_mismatch text[];
