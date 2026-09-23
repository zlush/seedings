-- Métricas de las historias que etiquetan a la marca.
--
-- historias_capturadas ya sabe QUIÉN publicó y CUÁNDO; lo que falta es el
-- resultado. Los números solo salen del token de la creadora conectada, y hay
-- que leerlos antes de que la historia expire: después Instagram la borra y las
-- métricas dejan de existir.
--
-- metrics_state distingue "no hay números" de "todavía no terminó de medirse":
--   sin_conexion      → la creadora no tiene su Instagram conectado
--   midiendo          → conectada y la historia sigue viva; los números suben
--   final             → última lectura antes de expirar
--   expiro_sin_medir  → expiró sin que pudiéramos leerla

alter table historias_capturadas add column if not exists reach int;
alter table historias_capturadas add column if not exists views int;
alter table historias_capturadas add column if not exists total_interactions int;
alter table historias_capturadas add column if not exists replies int;
alter table historias_capturadas add column if not exists shares int;
alter table historias_capturadas add column if not exists metrics_at timestamptz;
alter table historias_capturadas add column if not exists metrics_state text;

-- La pasada periódica solo mira lo que aún no está cerrado.
create index if not exists historias_capturadas_pendientes_idx
  on historias_capturadas (expires_at)
  where menciona_marca and (metrics_state is null or metrics_state <> 'final');
