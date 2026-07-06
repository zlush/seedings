-- Suscripciones de notificaciones push (Web Push / PWA).
create table if not exists push_subscriptions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  endpoint    text not null unique,
  p256dh      text not null,
  auth        text not null,
  created_at  timestamptz not null default now()
);
alter table push_subscriptions enable row level security;
-- Sin políticas: solo el service role (API) las maneja.
