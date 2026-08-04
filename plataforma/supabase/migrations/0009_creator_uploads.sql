-- Videos que el creador sube desde el formulario público /subir.
-- Identidad = teléfono normalizado a E.164 (+569XXXXXXXX); sin login.
create table if not exists creator_uploads (
  id              uuid primary key default gen_random_uuid(),
  phone           text not null,                    -- E.164, llave con el CRM
  phone_raw       text,                             -- lo que tipeó el creador
  campaign_id     uuid references campaigns(id) on delete set null,
  campaign_name   text,                             -- variable del link (texto libre)
  brand_name      text,
  storage_path    text not null,                    -- bucket story-backups
  media_type      text,                             -- VIDEO | IMAGE
  note            text,
  ghl_contact_id  text,                             -- null = teléfono sin contacto en GHL
  created_at      timestamptz not null default now()
);
create index if not exists creator_uploads_phone_idx on creator_uploads(phone);
alter table creator_uploads enable row level security; -- solo service role

-- Links públicos temporales a la carpeta de un creador.
create table if not exists share_links (
  token       text primary key,
  phone       text not null,
  expires_at  timestamptz not null,
  created_at  timestamptz not null default now()
);
alter table share_links enable row level security; -- solo service role
