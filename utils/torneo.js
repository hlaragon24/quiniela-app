const pool = require("../config/database");

const resolverTorneoId = async (torneoIdParam) => {
  if (torneoIdParam !== undefined && torneoIdParam !== null && torneoIdParam !== "") {
    const id = Number(torneoIdParam);
    if (!Number.isInteger(id) || id <= 0) {
      throw { status: 400, mensaje: "ID de torneo inválido" };
    }
    return id;
  }
  const r = await pool.query(`SELECT id FROM torneos WHERE activo = true LIMIT 1`);
  if (r.rows.length === 0) {
    throw { status: 400, mensaje: "No hay torneo activo" };
  }
  return r.rows[0].id;
};

module.exports = { resolverTorneoId };
