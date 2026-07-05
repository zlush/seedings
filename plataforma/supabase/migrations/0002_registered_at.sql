-- Paso de registro previo a conectar Instagram.
-- registered_at se setea cuando el creador completa el formulario de registro
-- (o automáticamente si ya existe como contacto en el CRM).
alter table creators add column if not exists registered_at timestamptz;
