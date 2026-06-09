-- ============================================================
-- FIX: Cambiar UNIQUE(numero) por UNIQUE(numero, torneo_id)
-- Permite tener jornada 1 en varios torneos distintos
-- Ejecutar en Neon DB
-- ============================================================

-- Eliminar la restricción única actual sobre solo numero
ALTER TABLE jornadas DROP CONSTRAINT IF EXISTS jornadas_numero_key;
ALTER TABLE jornadas DROP CONSTRAINT IF EXISTS jornadas_numero_unique;

-- Crear la nueva restricción compuesta
ALTER TABLE jornadas
  ADD CONSTRAINT jornadas_numero_torneo_unique UNIQUE (numero, torneo_id);
