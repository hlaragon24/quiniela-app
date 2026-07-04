const pool = require("../config/database");

const INIT_TABLE = `
  CREATE TABLE IF NOT EXISTS reglamento (
    torneo_id INT PRIMARY KEY,
    contenido TEXT NOT NULL DEFAULT '',
    updated_at TIMESTAMPTZ DEFAULT NOW()
  )
`;

const obtenerReglamento = async (req, res) => {
  try {
    await pool.query(INIT_TABLE);
    const torneoId = req.query.torneo_id ? Number(req.query.torneo_id) : null;
    if (!torneoId) return res.status(400).json({ mensaje: "torneo_id requerido" });
    const resultado = await pool.query(
      `SELECT contenido, updated_at FROM reglamento WHERE torneo_id = $1`,
      [torneoId]
    );
    return res.json({ contenido: resultado.rows[0]?.contenido ?? "" });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ mensaje: "Error obteniendo reglamento" });
  }
};

const actualizarReglamento = async (req, res) => {
  try {
    await pool.query(INIT_TABLE);
    const { torneo_id, contenido } = req.body;
    if (!torneo_id) return res.status(400).json({ mensaje: "torneo_id requerido" });
    await pool.query(
      `INSERT INTO reglamento (torneo_id, contenido, updated_at)
       VALUES ($1, $2, NOW())
       ON CONFLICT (torneo_id) DO UPDATE SET contenido = $2, updated_at = NOW()`,
      [Number(torneo_id), contenido ?? ""]
    );
    return res.json({ mensaje: "Reglamento guardado" });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ mensaje: "Error guardando reglamento" });
  }
};

module.exports = { obtenerReglamento, actualizarReglamento };
