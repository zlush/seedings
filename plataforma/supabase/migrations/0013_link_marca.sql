-- Link permanente por marca: el cliente entra sin cuenta ni contraseña.
-- Es un token largo y aleatorio; se genera desde el panel cuando se necesita.
alter table brands add column if not exists share_token text unique;
