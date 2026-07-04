const pool = require("../config/database");
const { resolverTorneoId } = require("../utils/torneo");
const { registrarAuditoria } = require("../utils/auditoria");

const obtenerPagos = async (req, res) => {
    try {
        const torneoId = await resolverTorneoId(req.query.torneo_id);
        const jornadaId = req.query.jornada_id ? Number(req.query.jornada_id) : null;

        const torneoResult = await pool.query(
            `SELECT tipo FROM torneos WHERE id = $1`,
            [torneoId]
        );
        if (torneoResult.rows.length === 0) {
            return res.status(404).json({ mensaje: "Torneo no encontrado" });
        }

        const tipo = torneoResult.rows[0].tipo;

        // Con jornada_id: pagos por jornada específica (funciona para cualquier tipo de torneo)
        if (jornadaId) {
            if (!Number.isInteger(jornadaId) || jornadaId <= 0) {
                return res.status(400).json({ mensaje: "jornada_id inválido" });
            }

            if (tipo === "jornada") {
                // tipo=jornada: solo inscritos en esa jornada via usuarios_jornadas
                const resultado = await pool.query(`
                    SELECT
                        u.id AS usuario_id, u.nombre, u.email,
                        p.id AS pago_id,
                        COALESCE(p.monto, 0) AS monto,
                        COALESCE(p.pagado, false) AS pagado,
                        p.fecha_pago, p.metodo_pago, p.notas, p.jornada_id
                    FROM usuarios_jornadas uj
                    JOIN usuarios u ON u.id = uj.usuario_id
                    LEFT JOIN pagos_quiniela p
                        ON p.usuario_id = u.id AND p.jornada_id = uj.jornada_id
                    WHERE uj.jornada_id = $1
                    ORDER BY COALESCE(p.pagado, false) ASC, u.nombre ASC
                `, [jornadaId]);
                return res.json(resultado.rows);
            } else {
                // tipo=temporada + jornada_id: todos los inscritos al torneo con su pago por esta jornada
                const resultado = await pool.query(`
                    SELECT
                        u.id AS usuario_id, u.nombre, u.email,
                        p.id AS pago_id,
                        COALESCE(p.monto, 0) AS monto,
                        COALESCE(p.pagado, false) AS pagado,
                        p.fecha_pago, p.metodo_pago, p.notas, p.jornada_id
                    FROM usuarios u
                    INNER JOIN usuarios_torneos ut ON ut.usuario_id = u.id AND ut.torneo_id = $1
                    LEFT JOIN pagos_quiniela p
                        ON p.usuario_id = u.id AND p.jornada_id = $2
                    WHERE u.rol = 'jugador'
                    ORDER BY COALESCE(p.pagado, false) ASC, u.nombre ASC
                `, [torneoId, jornadaId]);
                return res.json(resultado.rows);
            }
        }

        if (tipo === "jornada") {
            return res.status(400).json({
                mensaje: "Para torneos tipo jornada debes enviar jornada_id como query param"
            });
        }

        // tipo='temporada' sin jornada_id: pago global del torneo
        const resultado = await pool.query(`
            SELECT
                u.id AS usuario_id, u.nombre, u.email,
                p.id AS pago_id,
                COALESCE(p.monto, 0) AS monto,
                COALESCE(p.pagado, false) AS pagado,
                p.fecha_pago, p.metodo_pago, p.notas
            FROM usuarios u
            LEFT JOIN pagos_quiniela p
                ON p.usuario_id = u.id
                AND p.torneo_id = $1
                AND p.jornada_id IS NULL
            WHERE u.rol = 'jugador'
            ORDER BY COALESCE(p.pagado, false) ASC, u.nombre ASC
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

    const { monto, pagado, fecha_pago, metodo_pago, notas } = req.body;

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
        const jornadaId = req.body.jornada_id ? Number(req.body.jornada_id) : null;

        const usuario = await pool.query(
            `SELECT id FROM usuarios WHERE id = $1 AND rol = 'jugador'`,
            [usuarioId]
        );
        if (usuario.rows.length === 0) {
            return res.status(404).json({ mensaje: "Jugador no encontrado" });
        }

        const fechaPagoFinal = pagado ? fecha_pago || new Date() : null;

        if (jornadaId) {
            // Pago por jornada (torneo tipo='jornada')
            const resultado = await pool.query(
                `INSERT INTO pagos_quiniela
                    (usuario_id, torneo_id, jornada_id, monto, pagado, fecha_pago, metodo_pago, notas, registrado_por)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                 ON CONFLICT (usuario_id, jornada_id) WHERE jornada_id IS NOT NULL
                 DO UPDATE SET
                     monto          = EXCLUDED.monto,
                     pagado         = EXCLUDED.pagado,
                     fecha_pago     = EXCLUDED.fecha_pago,
                     metodo_pago    = EXCLUDED.metodo_pago,
                     notas          = EXCLUDED.notas,
                     registrado_por = EXCLUDED.registrado_por,
                     updated_at     = NOW()
                 RETURNING id, usuario_id, monto, pagado, fecha_pago, metodo_pago, notas, torneo_id, jornada_id, updated_at`,
                [usuarioId, torneoId, jornadaId, montoNumero, pagado, fechaPagoFinal, metodo_pago || null, notas || null, adminId]
            );

            registrarAuditoria(pool, {
                usuario_id: adminId,
                accion: "PAGO_ACTUALIZADO",
                entidad: "pago",
                entidad_id: usuarioId,
                detalle: { torneo_id: torneoId, jornada_id: jornadaId, pagado, monto: montoNumero },
            });

            return res.json({
                mensaje: "Pago actualizado correctamente",
                pago: resultado.rows[0]
            });
        }

        // Pago por torneo (tipo='temporada')
        const resultado = await pool.query(
            `INSERT INTO pagos_quiniela
                (usuario_id, monto, pagado, fecha_pago, metodo_pago, notas, registrado_por, torneo_id)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
             ON CONFLICT (usuario_id, torneo_id) WHERE jornada_id IS NULL
             DO UPDATE SET
                 monto          = EXCLUDED.monto,
                 pagado         = EXCLUDED.pagado,
                 fecha_pago     = EXCLUDED.fecha_pago,
                 metodo_pago    = EXCLUDED.metodo_pago,
                 notas          = EXCLUDED.notas,
                 registrado_por = EXCLUDED.registrado_por,
                 updated_at     = NOW()
             RETURNING id, usuario_id, monto, pagado, fecha_pago, metodo_pago, notas, torneo_id, updated_at`,
            [usuarioId, montoNumero, pagado, fechaPagoFinal, metodo_pago || null, notas || null, adminId, torneoId]
        );

        registrarAuditoria(pool, {
            usuario_id: adminId,
            accion: "PAGO_ACTUALIZADO",
            entidad: "pago",
            entidad_id: usuarioId,
            detalle: { torneo_id: torneoId, jornada_id: null, pagado, monto: montoNumero },
        });

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

        const torneoResult = await pool.query(
            `SELECT tipo FROM torneos WHERE id = $1`,
            [torneoId]
        );
        if (torneoResult.rows.length === 0) {
            return res.status(404).json({ mensaje: "Torneo no encontrado" });
        }

        const tipo = torneoResult.rows[0].tipo;

        if (tipo === "jornada") {
            // Devuelve todos los pagos por jornada del usuario en este torneo
            const resultado = await pool.query(
                `SELECT
                    p.jornada_id,
                    j.numero AS jornada_numero,
                    COALESCE(p.monto, 0) AS monto,
                    COALESCE(p.pagado, false) AS pagado,
                    p.fecha_pago,
                    p.metodo_pago,
                    p.notas
                FROM pagos_quiniela p
                JOIN jornadas j ON j.id = p.jornada_id
                WHERE p.usuario_id = $1 AND p.torneo_id = $2 AND p.jornada_id IS NOT NULL
                ORDER BY j.numero ASC`,
                [usuarioId, torneoId]
            );
            return res.json(resultado.rows);
        }

        // tipo='temporada': pago global del torneo + pagos por jornada si los hay
        const [resultadoTorneo, resultadoJornadas] = await Promise.all([
            pool.query(
                `SELECT COALESCE(p.monto, 0) AS monto, COALESCE(p.pagado, false) AS pagado,
                        p.fecha_pago, p.metodo_pago, p.notas
                 FROM usuarios u
                 LEFT JOIN pagos_quiniela p
                     ON p.usuario_id = u.id AND p.torneo_id = $2 AND p.jornada_id IS NULL
                 WHERE u.id = $1`,
                [usuarioId, torneoId]
            ),
            pool.query(
                `SELECT p.jornada_id, j.numero AS jornada_numero,
                        COALESCE(p.monto, 0) AS monto, COALESCE(p.pagado, false) AS pagado
                 FROM pagos_quiniela p
                 JOIN jornadas j ON j.id = p.jornada_id
                 WHERE p.usuario_id = $1 AND j.torneo_id = $2 AND p.jornada_id IS NOT NULL
                 ORDER BY j.numero ASC`,
                [usuarioId, torneoId]
            )
        ]);
        const resultado = resultadoTorneo;

        if (resultado.rows.length === 0) {
            return res.status(404).json({ mensaje: "Usuario no encontrado" });
        }

        return res.json({
            ...resultado.rows[0],
            pagos_jornada: resultadoJornadas.rows
        });

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
