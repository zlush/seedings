-- Subida manual de stories expiradas (>24h):
-- source: 'api' (capturada en vivo) | 'manual' (subida por el creador después).
-- metrics_screenshot_path: captura de los insights de IG como evidencia.
alter table stories add column if not exists source text not null default 'api';
alter table stories add column if not exists metrics_screenshot_path text;
