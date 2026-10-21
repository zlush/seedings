-- Campaña de cada historia capturada, para filtrar la galería.
--
-- Es una copia del campo campaña_name_1 del contacto al momento de la mención,
-- no una referencia: ese campo es un solo slot y cambia cuando la creadora
-- entra a la campaña siguiente. contact_id permite volver al contacto del CRM.

alter table historias_capturadas add column if not exists campana text;
alter table historias_capturadas add column if not exists contact_id text;

create index if not exists historias_capturadas_campana_idx
  on historias_capturadas (campana, taken_at desc);
