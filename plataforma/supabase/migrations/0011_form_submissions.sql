-- Un envío del formulario público: los números de la historia + a qué campaña
-- corresponden. Los archivos (video y capturas) cuelgan de acá.
-- Reemplaza al "Form performance" de GHL, que solo recibía imágenes y obligaba
-- al equipo a transcribir los números a mano.
create table if not exists form_submissions (
  id                 uuid primary key default gen_random_uuid(),
  phone              text not null,
  campaign_id        uuid references campaigns(id) on delete set null,
  campaign_name      text,
  brand_name         text,
  -- Métricas declaradas por el creador (las mismas de story_metrics).
  reach              int,
  views              int,
  total_interactions int,
  replies            int,
  shares             int,
  note               text,
  excluded           boolean not null default false,
  ghl_contact_id     text,
  contact_name       text,
  contact_instagram  text,
  created_at         timestamptz not null default now()
);
create index if not exists form_submissions_phone_idx on form_submissions(phone);
alter table form_submissions enable row level security; -- solo service role

-- Cada archivo sabe de qué envío viene y si es contenido o una captura.
alter table creator_uploads add column if not exists submission_id uuid
  references form_submissions(id) on delete set null;
alter table creator_uploads add column if not exists kind text not null default 'contenido';
