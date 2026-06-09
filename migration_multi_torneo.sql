-- ============================================================
-- MIGRACIÓN: Soporte Multi-Torneo
-- Ejecutar en orden en Neon DB
-- ============================================================

-- 1. Tabla torneos
CREATE TABLE torneos (
  id SERIAL PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL,
  temporada VARCHAR(20),
  estado VARCHAR(20) NOT NULL DEFAULT 'abierto',
  activo BOOLEAN NOT NULL DEFAULT false,
  fecha_inicio DATE,
  fecha_fin DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Torneo por defecto para todos los datos existentes
INSERT INTO torneos (nombre, temporada, estado, activo)
VALUES ('Torneo Inicial', '2025', 'abierto', true);

-- 3. jornadas → torneo_id
ALTER TABLE jornadas ADD COLUMN torneo_id INT REFERENCES torneos(id);
UPDATE jornadas SET torneo_id = 1;
ALTER TABLE jornadas ALTER COLUMN torneo_id SET NOT NULL;

-- 4. campeon_pronosticos → torneo_id
ALTER TABLE campeon_pronosticos ADD COLUMN torneo_id INT REFERENCES torneos(id);
UPDATE campeon_pronosticos SET torneo_id = 1;
ALTER TABLE campeon_pronosticos ALTER COLUMN torneo_id SET NOT NULL;
ALTER TABLE campeon_pronosticos DROP CONSTRAINT IF EXISTS campeon_pronosticos_usuario_id_key;
ALTER TABLE campeon_pronosticos ADD UNIQUE (usuario_id, torneo_id);

-- 5. campeon_real → torneo_id
ALTER TABLE campeon_real ADD COLUMN torneo_id INT REFERENCES torneos(id) DEFAULT 1;
ALTER TABLE campeon_real ADD UNIQUE (torneo_id);

-- 6. campeon_config → torneo_id (pasa de singleton a por-torneo)
ALTER TABLE campeon_config ADD COLUMN torneo_id INT REFERENCES torneos(id);
UPDATE campeon_config SET torneo_id = 1;
ALTER TABLE campeon_config ALTER COLUMN torneo_id SET NOT NULL;
ALTER TABLE campeon_config ADD UNIQUE (torneo_id);

-- 7. pagos_quiniela → torneo_id
ALTER TABLE pagos_quiniela ADD COLUMN torneo_id INT REFERENCES torneos(id);
UPDATE pagos_quiniela SET torneo_id = 1;
ALTER TABLE pagos_quiniela ALTER COLUMN torneo_id SET NOT NULL;
ALTER TABLE pagos_quiniela DROP CONSTRAINT IF EXISTS pagos_quiniela_usuario_id_key;
ALTER TABLE pagos_quiniela ADD UNIQUE (usuario_id, torneo_id);
