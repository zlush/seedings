-- Captura automática: se guardan TODAS las historias del creador; el equipo
-- excluye del reporte las que no son de campaña.
alter table stories add column if not exists excluded boolean not null default false;
