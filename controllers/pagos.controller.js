const pool = require("../config/database");
const { resolverTorneoId } = require("../utils/torneo");

const obtenerPagos = async (req, res) => {
    try {
        const torneoId = await resolverTorneoId(req.query.torneo_id);

        const resultado = await pool.query(`
      SELECT
        u.id AS usuario_id,
        u.nombre,
        u.email,

        p.id AS pago_id,
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
       AND p.torneo_id = $1

      WHERE u.rol = 'jugador'

      ORDER BY
        pagado ASC,
        u.nombre ASC
    `, [torneoId]);

        return res.json(resultado.rows);

    } catch (error) {
        if (error.status) {
            return res.status(error.status).json({ mensaje: error.mensaje });
        }
        console.error("Error obteniendo pagos:", error);
        return res.status(500).json({ mensaje: "Error obteniendo pagos" });
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
        return res.status(400).json({ mensaje: "ID de usuario inválido" });
    }

    const montoNumero = Number(monto ?? 0);
    if (!Number.isFinite(montoNumero) || montoNumero < 0) {
        return res.status(400).json({ mensaje: "Monto inválido" });
    }

    if (typeof pagado !== "boolean") {
        return res.status(400).json({ mensaje: "Estado de pago inválido" });
    }

    try {
        const torneoId = await resolverTorneoId(req.body.torneo_id);

        const usuario = await pool.query(
            `SELECT id FROM usuarios WHERE id = $1 AND rol = 'jugador'`,
            [usuarioId]
        );
        if (usuario.rows.length === 0) {
            return res.status(404).json({ mensaje: "Jugador no encontrado" });
        }

        const fechaPagoFinal = pagado ? fecha_pago || new Date() : null;

        const resultado = await pool.query(
            `INSERT INTO pagos_quiniela (
        usuario_id,
        monto,
        pagado,
        fecha_pago,
        metodo_pago,
        notas,
        registrado_por,
        torneo_id
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)

      ON CONFLICT (usuario_id, torneo_id)
      DO UPDATE SET
        monto = EXCLUDED.monto,
        pagado = EXCLUDED.pagado,
        fecha_pago = EXCLUDED.fecha_pago,
        metodo_pago = EXCLUDED.metodo_pago,
        notas = EXCLUDED.notas,
        registrado_por = EXCLUDED.registrado_por,
        updated_at = NOW()

      RETURNING
        id, usuario_id, monto, pagado, fecha_pago, metodo_pago, notas, torneo_id, updated_at`,
            [
                usuarioId,
                montoNumero,
                pagado,
                fechaPagoFinal,
                metodo_pago || null,
                notas || null,
                adminId,
                torneoId
            ]
        );

        return res.json({
            mensaje: "Pago actualizado correctamente",
            pago: resultado.rows[0]
        });

    } catch (error) {
        if (error.status) {
            return res.status(error.status).json({ mensaje: error.mensaje });
        }
        console.error("Error guardando pago:", error);
        return res.status(500).json({ mensaje: "Error guardando pago" });
    }
};

const obtenerMiPago = async (req, res) => {
    const usuarioId = req.usuario?.id;

    if (!usuarioId) {
        return res.status(401).json({ mensaje: "Usuario no autenticado" });
    }

    try {
        const torneoId = await resolverTorneoId(req.query.torneo_id);

        const resultado = await pool.query(
            `SELECT
        u.id AS usuario_id,
        u.nombre,
        u.email,
        COALESCE(p.monto, 0) AS monto,
        COALESCE(p.pagado, false) AS pagado,
        p.fecha_pago,
        p.metodo_pago,
        p.notas
      FROM usuarios u
      LEFT JOIN pagos_quiniela p
        ON p.usuario_id = u.id
       AND p.torneo_id = $2
      WHERE u.id = $1`,
            [usuarioId, torneoId]
        );

        if (resultado.rows.length === 0) {
            return res.status(404).json({ mensaje: "Usuario no encontrado" });
        }

        return res.json(resultado.rows[0]);

    } catch (error) {
        if (error.status) {
            return res.status(error.status).json({ mensaje: error.mensaje });
        }
        console.error("Error obteniendo mi pago:", error);
        return res.status(500).json({ mensaje: "Error obteniendo mi pago" });
    }
};

module.exports = {
    obtenerPagos,
    guardarPago,
    obtenerMiPago
};
