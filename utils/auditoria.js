const pool = require("../config/database");

const INIT_TABLE = `
  CREATE TABLE IF NOT EXISTS auditoria (
    id SERIAL PRIMARY KEY,
    usuario_id INT,
    accion VARCHAR(80) NOT NULL,
    entidad VARCHAR(50),
    entidad_id INT,
    detalle TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
  )
`;

let tableReady = false;

const registrarAuditoria = async (db, { usuario_id, accion, entidad, entidad_id, detalle }) => {
  try {
    if (!tableReady) {
      await pool.query(INIT_TABLE);
      tableReady = true;
    }
    await db.query(
      `INSERT INTO auditoria (usuario_id, accion, entidad, entidad_id, detalle)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        usuario_id ?? null,
        accion,
        entidad ?? null,
        entidad_id ?? null,
        detalle ? JSON.stringify(detalle) : null,
      ]
    );
  } catch (err) {
    console.error("Error registrando auditoría:", err.message);
  }
};

module.exports = { registrarAuditoria };
