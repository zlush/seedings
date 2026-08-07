-- Cruce con el CRM por el usuario de Instagram: cuando alguien etiqueta a la
-- marca y no está conectado a la plataforma, igual sabemos quién es.
alter table unclaimed_stories add column if not exists ghl_contact_id text;
alter table unclaimed_stories add column if not exists contact_name text;
alter table unclaimed_stories add column if not exists contact_phone text;
alter table unclaimed_stories add column if not exists contact_fields jsonb;
