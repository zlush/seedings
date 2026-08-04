-- Datos del contacto copiados del CRM al momento de subir, para que el video
-- quede con nombre y no solo con un número, y se pueda buscar por eso.
alter table creator_uploads add column if not exists contact_name text;
alter table creator_uploads add column if not exists contact_email text;
alter table creator_uploads add column if not exists contact_instagram text;
alter table creator_uploads add column if not exists contact_campaign text; -- campaña activa según el CRM
alter table creator_uploads add column if not exists contact_fields jsonb;  -- resto de los campos, para buscar
