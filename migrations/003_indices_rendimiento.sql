-- Índices para mejorar rendimiento en consultas frecuentes de ranking e histórico

CREATE INDEX IF NOT EXISTS idx_pronosticos_usuario_id ON pronosticos(usuario_id);
CREATE INDEX IF NOT EXISTS idx_pronosticos_partido_id ON pronosticos(partido_id);
CREATE INDEX IF NOT EXISTS idx_partidos_jornada_id    ON partidos(jornada_id);
CREATE INDEX IF NOT EXISTS idx_jornadas_torneo_id     ON jornadas(torneo_id);
CREATE INDEX IF NOT EXISTS idx_torneos_activo         ON torneos(activo) WHERE activo = true;
