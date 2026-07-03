const pool = require("../config/database");
const { resolverTorneoId } = require("../utils/torneo");


const obtenerJornadaPorNumero = async (req, res) => {
    try {
        const { numero } = req.params;
        const torneoId = await resolverTorneoId(req.query.torneo_id);

        const resultado = await pool.query(
            `SELECT * FROM jornadas WHERE numero = $1 AND torneo_id = $2 LIMIT 1`,
            [numero, torneoId]
        );

        if (resultado.rows.length === 0) {
            return res.status(404).json({ mensaje: "Jornada no encontrada" });
        }

        res.json(resultado.rows[0]);

    } catch (error) {
        if (error.status) {
            return res.status(error.status).json({ mensaje: error.mensaje });
        }
        console.error(error);
        res.status(500).json({ mensaje: "Error obteniendo jornada" });
    }
};


const crearJornada = async (req, res) => {
    try {
        const { numero, fecha_inicio, fecha_cierre, torneo_id } = req.body;

        if (!numero || !fecha_inicio || !fecha_cierre || !torneo_id) {
            return res.status(400).json({
                mensaje: "Datos incompletos. Se requiere: numero, fecha_inicio, fecha_cierre, torneo_id"
            });
        }

        const torneoIdNum = Number(torneo_id);
        if (!Number.isInteger(torneoIdNum) || torneoIdNum <= 0) {
            return res.status(400).json({ mensaje: "torneo_id inválido" });
        }

        const torneoExiste = await pool.query(`SELECT id FROM torneos WHERE id = $1`, [torneoIdNum]);
        if (torneoExiste.rows.length === 0) {
            return res.status(404).json({ mensaje: "Torneo no encontrado" });
        }

        const jornada = await pool.query(
            `INSERT INTO jornadas (numero, fecha_inicio, fecha_cierre, torneo_id, estado)
             VALUES ($1, $2, $3, $4, 'abierta')
             RETURNING *`,
            [numero, fecha_inicio, fecha_cierre, torneoIdNum]
        );

        res.json({
            mensaje: "Jornada creada correctamente",
            data: jornada.rows[0]
        });

    } catch (error) {
        if (error.code === "23505") {
            return res.status(400).json({
                mensaje: "Ya existe una jornada con ese número en este torneo"
            });
        }
        console.error(error);
        res.status(500).json({ mensaje: "Error creando jornada" });
    }
};


const obtenerJornadas = async (req, res) => {
    try {
        const torneoIdParam = req.query.torneo_id;
        let torneoId = null;

        if (torneoIdParam !== undefined) {
            torneoId = await resolverTorneoId(torneoIdParam);
        }

        const result = await pool.query(
            `SELECT id, numero, fecha_inicio, fecha_cierre, estado, torneo_id
             FROM jornadas
             WHERE ($1::int IS NULL OR torneo_id = $1)
             ORDER BY numero`,
            [torneoId]
        );

        res.json(result.rows);

    } catch (error) {
        if (error.status) {
            return res.status(error.status).json({ mensaje: error.mensaje });
        }
        console.error(error);
        res.status(500).json({ mensaje: "Error obteniendo jornadas" });
    }
};


const obtenerEstadoJornada = async (req, res) => {
    try {
        const { numero } = req.params;
        const torneoId = await resolverTorneoId(req.query.torneo_id);

        const resultado = await pool.query(
            `SELECT fecha_cierre FROM jornadas WHERE numero = $1 AND torneo_id = $2 LIMIT 1`,
            [numero, torneoId]
        );

        if (resultado.rows.length === 0) {
            return res.status(404).json({ mensaje: "Jornada no encontrada" });
        }

        const fechaCierre = new Date(resultado.rows[0].fecha_cierre);
        const ahora = new Date();

        res.json({ abierta: ahora < fechaCierre });

    } catch (error) {
        if (error.status) {
            return res.status(error.status).json({ mensaje: error.mensaje });
        }
        console.error(error);
        res.status(500).json({ mensaje: "Error consultando estado jornada" });
    }
};


const obtenerUltimaJornada = async (req, res) => {
    try {
        const torneoId = await resolverTorneoId(req.query.torneo_id);

        const resultado = await pool.query(
            `SELECT numero FROM jornadas WHERE torneo_id = $1 ORDER BY numero DESC LIMIT 1`,
            [torneoId]
        );

        if (!resultado.rows.length) {
            return res.json({ jornada: null });
        }

        res.json({ jornada: resultado.rows[0].numero });

    } catch (error) {
        if (error.status) {
            return res.status(error.status).json({ mensaje: error.mensaje });
        }
        console.error("Error obtenerUltimaJornada:", error);
        res.status(500).json({ mensaje: "Error obteniendo última jornada" });
    }
};


const actualizarJornada = async (req, res) => {
    try {
        const numero = Number(req.params.numero);

        if (!Number.isInteger(numero) || numero <= 0) {
            return res.status(400).json({ mensaje: "Número de jornada inválido" });
        }

        const { fecha_inicio, fecha_cierre, torneo_id } = req.body;

        if (!fecha_inicio || !fecha_cierre) {
            return res.status(400).json({
                mensaje: "fecha_inicio y fecha_cierre son obligatorias"
            });
        }

        if (isNaN(Date.parse(fecha_inicio)) || isNaN(Date.parse(fecha_cierre))) {
            return res.status(400).json({ mensaje: "Las fechas proporcionadas no son válidas" });
        }

        if (new Date(fecha_cierre) <= new Date(fecha_inicio)) {
            return res.status(400).json({
                mensaje: "fecha_cierre debe ser posterior a fecha_inicio"
            });
        }

        const torneoId = await resolverTorneoId(torneo_id);

        const resultado = await pool.query(
            `UPDATE jornadas
             SET fecha_inicio = $1, fecha_cierre = $2
             WHERE numero = $3 AND torneo_id = $4
             RETURNING *`,
            [fecha_inicio, fecha_cierre, numero, torneoId]
        );

        if (resultado.rows.length === 0) {
            return res.status(404).json({ mensaje: "Jornada no encontrada" });
        }

        res.json(resultado.rows[0]);

    } catch (error) {
        if (error.status) {
            return res.status(error.status).json({ mensaje: error.mensaje });
        }
        console.error(error);
        res.status(500).json({ mensaje: "Error actualizando jornada" });
    }
};


const cerrarJornada = async (req, res) => {
    try {
        const { numero } = req.params;
        const torneoId = await resolverTorneoId(req.body.torneo_id);

        const resultado = await pool.query(
            `UPDATE jornadas
             SET fecha_cierre = NOW(), estado = 'cerrada'
             WHERE numero = $1 AND torneo_id = $2
             RETURNING id`,
            [numero, torneoId]
        );

        if (resultado.rowCount === 0) {
            return res.status(404).json({ mensaje: "Jornada no encontrada" });
        }

        res.json({ mensaje: "Jornada cerrada correctamente" });

    } catch (error) {
        if (error.status) {
            return res.status(error.status).json({ mensaje: error.mensaje });
        }
        console.error(error);
        res.status(500).json({ mensaje: "Error cerrando jornada" });
    }
};


const abrirJornada = async (req, res) => {
    try {
        const { numero } = req.params;
        const torneoId = await resolverTorneoId(req.body?.torneo_id || req.query.torneo_id);

        const resultado = await pool.query(
            `UPDATE jornadas SET estado = 'abierta' WHERE numero = $1 AND torneo_id = $2 RETURNING id`,
            [numero, torneoId]
        );

        if (resultado.rowCount === 0) {
            return res.status(404).json({ mensaje: "Jornada no encontrada" });
        }

        res.json({ mensaje: "Jornada abierta correctamente" });

    } catch (error) {
        if (error.status) {
            return res.status(error.status).json({ mensaje: error.mensaje });
        }
        console.error(error);
        res.status(500).json({ mensaje: "Error abriendo jornada" });
    }
};


const eliminarJornada = async (req, res) => {
    try {
        const { numero } = req.params;
        const torneoId = await resolverTorneoId(req.query.torneo_id || req.body?.torneo_id);

        const resultado = await pool.query(
            `DELETE FROM jornadas WHERE numero = $1 AND torneo_id = $2 RETURNING id`,
            [numero, torneoId]
        );

        if (resultado.rows.length === 0) {
            return res.status(404).json({ mensaje: "Jornada no encontrada" });
        }

        res.json({ mensaje: "Jornada eliminada correctamente" });

    } catch (error) {
        if (error.status) {
            return res.status(error.status).json({ mensaje: error.mensaje });
        }
        console.error(error);
        res.status(500).json({ mensaje: "Error eliminando jornada" });
    }
};


/*
====================================
INSCRIPCIÓN POR JORNADA
Solo para torneos con tipo = 'jornada'
====================================
*/

const _resolverJornadaConTipo = async (client, jornadaId) => {
    const r = await client.query(
        `SELECT j.id, j.numero, j.fecha_cierre, j.estado, j.torneo_id, t.tipo
         FROM jornadas j
         JOIN torneos t ON j.torneo_id = t.id
         WHERE j.id = $1`,
        [jornadaId]
    );
    return r.rows[0] || null;
};

const inscribirJugador = async (req, res) => {
    const usuarioId = req.usuario.id;
    const jornadaId = Number(req.params.jornadaId);

    if (!Number.isInteger(jornadaId) || jornadaId <= 0) {
        return res.status(400).json({ mensaje: "ID de jornada inválido" });
    }

    const client = await pool.connect();
    try {
        await client.query("BEGIN");

        const jornada = await _resolverJornadaConTipo(client, jornadaId);

        if (!jornada) {
            await client.query("ROLLBACK");
            return res.status(404).json({ mensaje: "Jornada no encontrada" });
        }
        if (jornada.tipo !== "jornada") {
            await client.query("ROLLBACK");
            return res.status(400).json({ mensaje: "Este torneo no permite inscripción por jornada individual" });
        }
        if (jornada.estado === "finalizada") {
            await client.query("ROLLBACK");
            return res.status(400).json({ mensaje: "No puedes inscribirte a una jornada finalizada" });
        }
        if (jornada.fecha_cierre && new Date() >= new Date(jornada.fecha_cierre)) {
            await client.query("ROLLBACK");
            return res.status(400).json({ mensaje: "La jornada ya cerró, no puedes inscribirte" });
        }

        const yaInscrito = await client.query(
            `SELECT 1 FROM usuarios_jornadas WHERE usuario_id = $1 AND jornada_id = $2`,
            [usuarioId, jornadaId]
        );
        if (yaInscrito.rows.length > 0) {
            await client.query("ROLLBACK");
            return res.json({ mensaje: "Ya estás inscrito en esta jornada" });
        }

        await client.query(
            `INSERT INTO usuarios_jornadas (usuario_id, jornada_id) VALUES ($1, $2)`,
            [usuarioId, jornadaId]
        );

        await client.query(
            `INSERT INTO pagos_quiniela (usuario_id, torneo_id, jornada_id, monto, pagado)
             VALUES ($1, $2, $3, 0, false)
             ON CONFLICT (usuario_id, jornada_id) WHERE jornada_id IS NOT NULL DO NOTHING`,
            [usuarioId, jornada.torneo_id, jornadaId]
        );

        await client.query("COMMIT");
        return res.json({ mensaje: "Inscrito a la jornada correctamente", jornada_id: jornadaId, jornada_numero: jornada.numero });

    } catch (error) {
        await client.query("ROLLBACK");
        console.error("Error inscribiendo jugador:", error);
        return res.status(500).json({ mensaje: "Error inscribiendo jugador" });
    } finally {
        client.release();
    }
};

const desinscribirJugador = async (req, res) => {
    const usuarioId = req.usuario.id;
    const jornadaId = Number(req.params.jornadaId);

    if (!Number.isInteger(jornadaId) || jornadaId <= 0) {
        return res.status(400).json({ mensaje: "ID de jornada inválido" });
    }

    try {
        const resultado = await pool.query(
            `DELETE FROM usuarios_jornadas WHERE usuario_id = $1 AND jornada_id = $2 RETURNING id`,
            [usuarioId, jornadaId]
        );
        if (resultado.rows.length === 0) {
            return res.status(404).json({ mensaje: "No estabas inscrito en esta jornada" });
        }
        return res.json({ mensaje: "Desinscrito de la jornada correctamente" });
    } catch (error) {
        console.error("Error desinscribiendo jugador:", error);
        return res.status(500).json({ mensaje: "Error desinscribiendo jugador" });
    }
};

const obtenerParticipantesJornada = async (req, res) => {
    const jornadaId = Number(req.params.jornadaId);

    if (!Number.isInteger(jornadaId) || jornadaId <= 0) {
        return res.status(400).json({ mensaje: "ID de jornada inválido" });
    }

    try {
        const resultado = await pool.query(
            `SELECT u.id, u.nombre, u.email, uj.created_at AS inscrito_en,
                    COALESCE(p.pagado, false) AS pagado, COALESCE(p.monto, 0) AS monto
             FROM usuarios_jornadas uj
             JOIN usuarios u ON u.id = uj.usuario_id
             LEFT JOIN pagos_quiniela p ON p.usuario_id = u.id AND p.jornada_id = uj.jornada_id
             WHERE uj.jornada_id = $1
             ORDER BY u.nombre ASC`,
            [jornadaId]
        );
        return res.json(resultado.rows);
    } catch (error) {
        console.error("Error obteniendo participantes:", error);
        return res.status(500).json({ mensaje: "Error obteniendo participantes" });
    }
};

const asignarJugadorAJornada = async (req, res) => {
    const jornadaId = Number(req.params.jornadaId);
    const usuarioId = Number(req.params.usuarioId);

    if (!Number.isInteger(jornadaId) || jornadaId <= 0) {
        return res.status(400).json({ mensaje: "ID de jornada inválido" });
    }
    if (!Number.isInteger(usuarioId) || usuarioId <= 0) {
        return res.status(400).json({ mensaje: "ID de usuario inválido" });
    }

    const client = await pool.connect();
    try {
        await client.query("BEGIN");

        const jornada = await _resolverJornadaConTipo(client, jornadaId);
        if (!jornada) {
            await client.query("ROLLBACK");
            return res.status(404).json({ mensaje: "Jornada no encontrada" });
        }
        if (jornada.tipo !== "jornada") {
            await client.query("ROLLBACK");
            return res.status(400).json({ mensaje: "Este torneo no usa inscripción por jornada" });
        }

        const usuario = await client.query(
            `SELECT id FROM usuarios WHERE id = $1 AND rol = 'jugador'`,
            [usuarioId]
        );
        if (usuario.rows.length === 0) {
            await client.query("ROLLBACK");
            return res.status(404).json({ mensaje: "Jugador no encontrado" });
        }

        await client.query(
            `INSERT INTO usuarios_jornadas (usuario_id, jornada_id) VALUES ($1, $2)
             ON CONFLICT (usuario_id, jornada_id) DO NOTHING`,
            [usuarioId, jornadaId]
        );

        await client.query(
            `INSERT INTO pagos_quiniela (usuario_id, torneo_id, jornada_id, monto, pagado)
             VALUES ($1, $2, $3, 0, false)
             ON CONFLICT (usuario_id, jornada_id) WHERE jornada_id IS NOT NULL DO NOTHING`,
            [usuarioId, jornada.torneo_id, jornadaId]
        );

        await client.query("COMMIT");
        return res.status(201).json({ mensaje: "Jugador asignado a la jornada correctamente" });

    } catch (error) {
        await client.query("ROLLBACK");
        console.error("Error asignando jugador a jornada:", error);
        return res.status(500).json({ mensaje: "Error asignando jugador a jornada" });
    } finally {
        client.release();
    }
};

const removerJugadorDeJornada = async (req, res) => {
    const jornadaId = Number(req.params.jornadaId);
    const usuarioId = Number(req.params.usuarioId);

    if (!Number.isInteger(jornadaId) || jornadaId <= 0) {
        return res.status(400).json({ mensaje: "ID de jornada inválido" });
    }
    if (!Number.isInteger(usuarioId) || usuarioId <= 0) {
        return res.status(400).json({ mensaje: "ID de usuario inválido" });
    }

    try {
        const resultado = await pool.query(
            `DELETE FROM usuarios_jornadas WHERE usuario_id = $1 AND jornada_id = $2 RETURNING id`,
            [usuarioId, jornadaId]
        );
        if (resultado.rows.length === 0) {
            return res.status(404).json({ mensaje: "El jugador no estaba inscrito en esta jornada" });
        }
        return res.json({ mensaje: "Jugador removido de la jornada correctamente" });
    } catch (error) {
        console.error("Error removiendo jugador de jornada:", error);
        return res.status(500).json({ mensaje: "Error removiendo jugador de jornada" });
    }
};


module.exports = {
    obtenerJornadaPorNumero,
    crearJornada,
    obtenerJornadas,
    obtenerEstadoJornada,
    obtenerUltimaJornada,
    actualizarJornada,
    cerrarJornada,
    abrirJornada,
    eliminarJornada,
    inscribirJugador,
    desinscribirJugador,
    obtenerParticipantesJornada,
    asignarJugadorAJornada,
    removerJugadorDeJornada
};
