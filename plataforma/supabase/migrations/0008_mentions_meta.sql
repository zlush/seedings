-- Metadata de menciones/hashtags/etiquetas de la historia capturada.
alter table stories add column if not exists mentions jsonb;

-- Creadores que etiquetaron a @seedings.cl pero NO están conectados a la
-- plataforma: guardamos la media y avisamos al equipo para invitarlos.
create table if not exists unclaimed_stories (
  id                uuid primary key default gen_random_uuid(),
  username          text not null,
  ig_media_id       text unique,
  media_backup_path text,
  mentions          jsonb,
  published_at      timestamptz,
  notified          boolean not null default false,
  created_at        timestamptz not null default now()
);
alter table unclaimed_stories enable row level security; -- solo service role
