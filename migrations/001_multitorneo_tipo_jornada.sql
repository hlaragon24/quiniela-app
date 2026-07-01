-- ============================================================
-- MIGRACIÓN 001: Soporte multitorneo con tipo jornada/temporada
-- Ejecutar una sola vez contra la base de datos de producción
-- ============================================================

-- 1. Campo tipo en torneos
ALTER TABLE torneos
  ADD COLUMN IF NOT EXISTS tipo VARCHAR(20) DEFAULT 'temporada';

ALTER TABLE torneos
  DROP CONSTRAINT IF EXISTS torneos_tipo_check;

ALTER TABLE torneos
  ADD CONSTRAINT torneos_tipo_check
  CHECK (tipo IN ('jornada', 'temporada'));

-- 2. Tabla de inscripciones por jornada (para torneos tipo='jornada')
CREATE TABLE IF NOT EXISTS usuarios_jornadas (
  id          SERIAL PRIMARY KEY,
  usuario_id  INTEGER NOT NULL REFERENCES usuarios(id)  ON DELETE CASCADE,
  jornada_id  INTEGER NOT NULL REFERENCES jornadas(id)  ON DELETE CASCADE,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT uq_usuarios_jornadas UNIQUE (usuario_id, jornada_id)
);

-- 3. Agregar jornada_id a pagos_quiniela
ALTER TABLE pagos_quiniela
  ADD COLUMN IF NOT EXISTS jornada_id INTEGER REFERENCES jornadas(id);

-- 4. Reemplazar restricción única en pagos_quiniela
--    El nombre por defecto de PostgreSQL suele ser pagos_quiniela_usuario_id_torneo_id_key
--    Si falla, consulta: SELECT conname FROM pg_constraint WHERE conrelid = 'pagos_quiniela'::regclass;
ALTER TABLE pagos_quiniela
  DROP CONSTRAINT IF EXISTS pagos_quiniela_usuario_id_torneo_id_key;

-- Pago único por torneo (torneos tipo='temporada', sin jornada)
CREATE UNIQUE INDEX IF NOT EXISTS uix_pagos_temporada
  ON pagos_quiniela (usuario_id, torneo_id)
  WHERE jornada_id IS NULL;

-- Pago único por jornada (torneos tipo='jornada')
CREATE UNIQUE INDEX IF NOT EXISTS uix_pagos_jornada
  ON pagos_quiniela (usuario_id, jornada_id)
  WHERE jornada_id IS NOT NULL;
