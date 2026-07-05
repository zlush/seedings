-- ============================================================================
-- Seedings · Vista Creador MVP — esquema inicial
-- Ejecutar en Supabase (SQL Editor o `supabase db push`).
-- ============================================================================

-- ---- Tablas -----------------------------------------------------------------

create table brands (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  contact_email text,
  created_at    timestamptz not null default now()
);

create table campaigns (
  id            uuid primary key default gen_random_uuid(),
  brand_id      uuid not null references brands(id) on delete cascade,
  name          text not null,
  brief         text,
  brief_images  jsonb not null default '[]',      -- rutas en Storage (bucket brief-images)
  deadline      date,
  status        text not null default 'active',
  created_at    timestamptz not null default now()
);

create table creators (
  id                    uuid primary key default gen_random_uuid(),
  user_id               uuid not null unique references auth.users(id) on delete cascade,
  instagram_username    text,
  ig_user_id            text,
  fb_page_id            text,
  page_token_encrypted  text,                      -- AES-256-GCM, cifrado en el server
  token_expires_at      timestamptz,
  created_at            timestamptz not null default now()
);

create table invitations (
  id           uuid primary key default gen_random_uuid(),
  campaign_id  uuid not null references campaigns(id) on delete cascade,
  email        text not null,
  token        text not null unique,
  status       text not null default 'sent',       -- sent | accepted | expired
  expires_at   timestamptz not null default (now() + interval '30 days'),
  created_at   timestamptz not null default now()
);

create table campaign_creators (
  id           uuid primary key default gen_random_uuid(),
  campaign_id  uuid not null references campaigns(id) on delete cascade,
  creator_id   uuid not null references creators(id) on delete cascade,
  status       text not null default 'pending',    -- pending | shipped | published | metrics_ready
  created_at   timestamptz not null default now(),
  unique (campaign_id, creator_id)
);

create table stories (
  id                    uuid primary key default gen_random_uuid(),
  campaign_creator_id   uuid not null references campaign_creators(id) on delete cascade,
  ig_media_id           text not null unique,
  permalink             text,
  media_type            text,
  media_backup_path     text,                       -- ruta en Storage (bucket story-backups)
  published_at          timestamptz,
  captured_at           timestamptz not null default now()
);

create table story_metrics (
  id                  uuid primary key default gen_random_uuid(),
  story_id            uuid not null references stories(id) on delete cascade,
  reach               int,
  replies             int,
  total_interactions  int,
  follows             int,
  profile_visits      int,
  shares              int,
  raw_json            jsonb,
  snapshot_at         timestamptz not null default now()
);

-- índice para el cron (stories aún dentro de la ventana de 24-26h)
create index stories_published_at_idx on stories(published_at);

-- ---- Row Level Security -----------------------------------------------------
-- Regla: un creador solo ve/toca SUS propias filas. brands/campaigns/invitations
-- se administran con service_role (bypass RLS), no desde el cliente.

alter table brands            enable row level security;
alter table campaigns         enable row level security;
alter table creators          enable row level security;
alter table invitations       enable row level security;
alter table campaign_creators enable row level security;
alter table stories           enable row level security;
alter table story_metrics     enable row level security;

-- creators: el usuario ve/edita su propia fila
create policy "creator ve su fila"
  on creators for select using (user_id = auth.uid());
create policy "creator edita su fila"
  on creators for update using (user_id = auth.uid());

-- campaign_creators: filas cuyo creator pertenece al usuario
create policy "creator ve sus asignaciones"
  on campaign_creators for select
  using (creator_id in (select id from creators where user_id = auth.uid()));

-- campaigns: el creador ve las campañas donde está asignado
create policy "creator ve sus campañas"
  on campaigns for select
  using (id in (
    select cc.campaign_id from campaign_creators cc
    join creators c on c.id = cc.creator_id
    where c.user_id = auth.uid()
  ));

-- stories / story_metrics: solo las de sus asignaciones
create policy "creator ve sus stories"
  on stories for select
  using (campaign_creator_id in (
    select cc.id from campaign_creators cc
    join creators c on c.id = cc.creator_id
    where c.user_id = auth.uid()
  ));

create policy "creator ve sus métricas"
  on story_metrics for select
  using (story_id in (
    select s.id from stories s
    join campaign_creators cc on cc.id = s.campaign_creator_id
    join creators c on c.id = cc.creator_id
    where c.user_id = auth.uid()
  ));

-- brands e invitations: sin políticas para anon/authenticated → solo service_role accede.
