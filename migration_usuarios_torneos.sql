-- ============================================================
-- MIGRACIÓN: Tabla usuarios_torneos
-- Ejecutar DESPUÉS de migration_multi_torneo.sql
-- ============================================================

CREATE TABLE usuarios_torneos (
  id SERIAL PRIMARY KEY,
  usuario_id INT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  torneo_id  INT NOT NULL REFERENCES torneos(id)  ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (usuario_id, torneo_id)
);
