-- Reproducciones (views) de la Story — presente en el reporte del equipo.
alter table story_metrics add column if not exists views int;
