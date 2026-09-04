-- Historias capturadas por el descargador (/descargador).
--
-- Se separa a propósito de unclaimed_stories: esa tabla significa "alguien
-- etiquetó a la marca pero no es creador registrado" y alimenta la sección
-- "Menciones sin creador" del panel. Aquí caen perfiles públicos cualesquiera,
-- etiqueten o no a la marca, así que mezclarlas rompería esa vista.

create table if not exists historias_capturadas (
  id                uuid primary key default gen_random_uuid(),
  username          text not null,
  -- Único: capturar dos veces el mismo perfil no duplica filas.
  ig_media_id       text not null unique,
  media_type        text,                       -- VIDEO | IMAGE
  media_backup_path text,                       -- ruta dentro del bucket story-backups
  taken_at          timestamptz,
  expires_at        timestamptz,                -- cuándo caduca en Instagram
  duration_seconds  numeric,
  menciones         text[] not null default '{}',
  menciona_marca    boolean not null default false,
  captured_at       timestamptz not null default now()
);

create index if not exists historias_capturadas_username_idx
  on historias_capturadas (username, taken_at desc);

create index if not exists historias_capturadas_marca_idx
  on historias_capturadas (menciona_marca) where menciona_marca;

alter table historias_capturadas enable row level security; -- solo service role
