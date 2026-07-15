-- Migración 004: hacer nullable la columna fecha en partidos
-- Ejecutar una sola vez en la base de datos de producción (Neon)
ALTER TABLE partidos ALTER COLUMN fecha DROP NOT NULL;
