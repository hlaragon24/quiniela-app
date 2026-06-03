const pool = require("../config/database");

const obtenerPagos = async (req, res) => {
  try {
    const resultado = await pool.query(`
      SELECT
        u.id AS usuario_id,
        u.nombre,
        u.email,

        COALESCE(p.id, null) AS pago_id,
        COALESCE(p.monto, 0) AS monto,
        COALESCE(p.pagado, false) AS pagado,
        p.fecha_pago,
        p.metodo_pago,
        p.notas,
        p.created_at,
        p.updated_at

      FROM usuarios u

      LEFT JOIN pagos_quiniela p
        ON p.usuario_id = u.id

      WHERE u.rol = 'jugador'

      ORDER BY
        pagado ASC,
        u.nombre ASC
    `);

    return res.json(resultado.rows);

  } catch (error) {
    console.error("Error obteniendo pagos:", error);

    return res.status(500).json({
      mensaje: "Error obteniendo pagos"
    });
  }
};

const guardarPago = async (req, res) => {
  const usuarioId = Number(req.params.usuarioId);
  const adminId = req.usuario?.id;

  const {
    monto,
    pagado,
    fecha_pago,
    metodo_pago,
    notas
  } = req.body;

  if (!Number.isInteger(usuarioId) || usuarioId <= 0) {
    return res.status(400).json({
      mensaje: "ID de usuario inválido"
    });
  }

  const montoNumero = Number(monto ?? 0);

  if (!Number.isFinite(montoNumero) || montoNumero < 0) {
    return res.status(400).json({
      mensaje: "Monto inválido"
    });
  }

  if (typeof pagado !== "boolean") {
    return res.status(400).json({
      mensaje: "Estado de pago inválido"
    });
  }

  try {
    const usuario = await pool.query(
      `
      SELECT id
      FROM usuarios
      WHERE id = $1
      AND rol = 'jugador'
      `,
      [usuarioId]
    );

    if (usuario.rows.length === 0) {
      return res.status(404).json({
        mensaje: "Jugador no encontrado"
      });
    }

    const fechaPagoFinal = pagado
      ? fecha_pago || new Date()
      : null;

    const resultado = await pool.query(
      `
      INSERT INTO pagos_quiniela (
        usuario_id,
        monto,
        pagado,
        fecha_pago,
        metodo_pago,
        notas,
        registrado_por
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)

      ON CONFLICT (usuario_id)
      DO UPDATE SET
        monto = EXCLUDED.monto,
        pagado = EXCLUDED.pagado,
        fecha_pago = EXCLUDED.fecha_pago,
        metodo_pago = EXCLUDED.metodo_pago,
        notas = EXCLUDED.notas,
        registrado_por = EXCLUDED.registrado_por,
        updated_at = NOW()

      RETURNING
        id,
        usuario_id,
        monto,
        pagado,
        fecha_pago,
        metodo_pago,
        notas,
        updated_at
      `,
      [
        usuarioId,
        montoNumero,
        pagado,
        fechaPagoFinal,
        metodo_pago || null,
        notas || null,
        adminId
      ]
    );

    return res.json({
      mensaje: "Pago actualizado correctamente",
      pago: resultado.rows[0]
    });

  } catch (error) {
    console.error("Error guardando pago:", error);

    return res.status(500).json({
      mensaje: "Error guardando pago"
    });
  }
};

module.exports = {
  obtenerPagos,
  guardarPago
};