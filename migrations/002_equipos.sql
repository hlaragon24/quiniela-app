-- ============================================================
-- MIGRACIÓN 002: Tabla de equipos con escudos
-- Ejecutar una sola vez contra la base de datos
-- ============================================================

CREATE TABLE IF NOT EXISTS equipos (
  id          SERIAL PRIMARY KEY,
  nombre      VARCHAR(100) NOT NULL UNIQUE,
  abreviacion VARCHAR(5),
  escudo_url  VARCHAR(500),
  color       VARCHAR(7) NOT NULL DEFAULT '#6B7280',
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
