const pool = require("../config/database");

const obtenerAuditoria = async (req, res) => {
  try {
    const torneoId = req.query.torneo_id ? Number(req.query.torneo_id) : null;
    const limite = Math.min(Number(req.query.limit) || 100, 500);

    const resultado = await pool.query(
      `SELECT
         a.id,
         a.accion,
         a.entidad,
         a.entidad_id,
         a.detalle,
         a.created_at,
         u.nombre AS admin_nombre,
         u.email  AS admin_email
       FROM auditoria a
       LEFT JOIN usuarios u ON u.id = a.usuario_id
       ${torneoId ? "WHERE a.detalle::jsonb->>'torneo_id' = $2::text OR a.detalle IS NULL" : ""}
       ORDER BY a.created_at DESC
       LIMIT $1`,
      torneoId ? [limite, String(torneoId)] : [limite]
    );

    return res.json(resultado.rows);
  } catch (error) {
    console.error("Error obteniendo auditoría:", error);
    return res.status(500).json({ mensaje: "Error obteniendo auditoría" });
  }
};

module.exports = { obtenerAuditoria };
