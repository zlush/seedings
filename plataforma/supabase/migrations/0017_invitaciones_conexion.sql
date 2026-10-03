-- Registro de las invitaciones automáticas a conectar Instagram.
--
-- Cuando una creadora sin conectar etiqueta a la marca, el sistema le escribe
-- solo para que conecte su cuenta. Esta tabla cumple dos funciones: impedir que
-- reciba más de una invitación cada 30 días aunque etiquete diez veces, y dejar
-- auditable a quién se le escribió y cuándo.

create table if not exists invitaciones_conexion (
  id          uuid primary key default gen_random_uuid(),
  username    text not null,           -- el @ normalizado de Instagram
  contact_id  text,                    -- contacto de GHL al que se envió
  email       text,
  enviado_at  timestamptz not null default now()
);

create index if not exists invitaciones_conexion_username_idx
  on invitaciones_conexion (username, enviado_at desc);

alter table invitaciones_conexion enable row level security; -- solo service role
