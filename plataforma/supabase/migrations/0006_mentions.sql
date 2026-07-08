-- Automatización por mención a @seedings.cl.

-- Cuenta de marca conectada que "recibe" las menciones (ej: @seedings.cl).
create table if not exists brand_accounts (
  id               uuid primary key default gen_random_uuid(),
  ig_user_id       text not null unique,
  username         text,
  token_encrypted  text not null,
  token_expires_at timestamptz,
  created_at       timestamptz not null default now()
);
alter table brand_accounts enable row level security; -- solo service role

-- Log crudo de eventos de webhook (para auditar y afinar el matching).
create table if not exists webhook_events (
  id           uuid primary key default gen_random_uuid(),
  field        text,
  payload      jsonb not null,
  matched      boolean not null default false,
  note         text,
  received_at  timestamptz not null default now()
);
alter table webhook_events enable row level security; -- solo service role

-- Origen 'mention' para stories capturadas automáticamente por la etiqueta.
-- (source ya existe; esto solo documenta el nuevo valor posible: api|manual|mention)
