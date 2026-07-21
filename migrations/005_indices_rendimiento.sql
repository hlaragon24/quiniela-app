-- Migración 005: Índices de rendimiento para queries de ranking
-- Ejecutar una sola vez en producción: psql $DATABASE_URL -f migrations/005_indices_rendimiento.sql

CREATE INDEX IF NOT EXISTS idx_pronosticos_partido
  ON pronosticos(partido_id);

CREATE INDEX IF NOT EXISTS idx_pronosticos_usuario
  ON pronosticos(usuario_id);

CREATE INDEX IF NOT EXISTS idx_pronosticos_usuario_partido
  ON pronosticos(usuario_id, partido_id);

CREATE INDEX IF NOT EXISTS idx_partidos_jornada
  ON partidos(jornada_id);

CREATE INDEX IF NOT EXISTS idx_jornadas_torneo_numero
  ON jornadas(torneo_id, numero);

CREATE INDEX IF NOT EXISTS idx_usuarios_torneos_torneo
  ON usuarios_torneos(torneo_id);

CREATE INDEX IF NOT EXISTS idx_usuarios_torneos_usuario
  ON usuarios_torneos(usuario_id);

CREATE INDEX IF NOT EXISTS idx_resultados_partido
  ON resultados(partido_id);
