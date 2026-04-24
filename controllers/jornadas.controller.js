const pool = require("../config/database");


const obtenerJornadaPorNumero = async (req, res) => {

    try {

        const { numero } = req.params;

        const resultado = await pool.query(
            `
            SELECT *
            FROM jornadas
            WHERE numero = $1
            `,
            [numero]
        );

        if (resultado.rows.length === 0) {

            return res.status(404).json({
                mensaje: "Jornada no encontrada"
            });

        }

        res.json(resultado.rows[0]);

    } catch (error) {

        console.error(error);

        res.status(500).json({
            mensaje: "Error obteniendo jornada"
        });

    }

};

const crearJornada = async (req, res) => {

    try {

        const {
            numero,
            fecha_inicio,
            fecha_cierre
        } = req.body;

        if (!numero || !fecha_inicio || !fecha_cierre) {

            return res.status(400).json({
                mensaje: "Datos incompletos"
            });

        }

        const jornada = await pool.query(
            `
            INSERT INTO jornadas
            (numero, fecha_inicio, fecha_cierre)
            VALUES ($1,$2,$3)
            RETURNING *
            `,
            [numero, fecha_inicio, fecha_cierre]
        );

        res.json({
            mensaje: "Jornada creada correctamente",
            data: jornada.rows[0]
        });

    } catch (error) {

        console.error(error);

        res.status(500).json({
            mensaje: "Error creando jornada"
        });

    }

};


const obtenerJornadas = async (req, res) => {

    try {

        const result = await pool.query(`
      SELECT
        numero,
        fecha_inicio,
        fecha_cierre,
        CASE
          WHEN NOW() > fecha_cierre THEN 'cerrada'
          ELSE 'abierta'
        END AS estado
      FROM jornadas
      ORDER BY numero
    `);

        res.json(result.rows);

    }

    catch (error) {

        console.error(error);

        res.status(500).json({
            mensaje: "Error obteniendo jornadas"
        });

    }

};

const obtenerEstadoJornada = async (req, res) => {

    try {

        const { numero } = req.params;

        const resultado = await pool.query(
            `
      SELECT fecha_cierre
      FROM jornadas
      WHERE numero = $1
      `,
            [numero]
        );

        if (resultado.rows.length === 0) {

            return res.status(404).json({
                mensaje: "Jornada no encontrada"
            });

        }

        const fechaCierre = new Date(
            resultado.rows[0].fecha_cierre
        );

        const ahora = new Date();

        res.json({
            abierta: ahora < fechaCierre
        });

    } catch (error) {

        console.error(error);

        res.status(500).json({
            mensaje: "Error consultando estado jornada"
        });

    }

};

const obtenerUltimaJornada = async (req, res) => {

    try {

        const resultado = await pool.query(`
            SELECT numero
            FROM jornadas
            ORDER BY numero DESC
            LIMIT 1
        `);

        if (!resultado.rows.length) {

            return res.json({
                jornada: null
            });

        }

        res.json({
            jornada: resultado.rows[0].numero
        });

    }

    catch (error) {

        console.error("Error obtenerUltimaJornada:", error);

        res.status(500).json({
            mensaje: "Error obteniendo última jornada"
        });

    }

};

const actualizarJornada = async (req, res) => {

    try {

        const { numero } = req.params;

        const { fecha_inicio, fecha_cierre } = req.body;

        const resultado = await pool.query(
            `
      UPDATE jornadas
      SET fecha_inicio = $1,
          fecha_cierre = $2
      WHERE numero = $3
      RETURNING *
      `,
            [fecha_inicio, fecha_cierre, numero]
        );

        res.json(resultado.rows[0]);

    } catch (error) {

        console.error(error);

        res.status(500).json({
            mensaje: "Error actualizando jornada"
        });

    }

};


const cerrarJornada = async (req, res) => {

    try {

        const { numero } = req.params;

        await pool.query(
            `
            UPDATE jornadas
            SET
                fecha_cierre = NOW(),
                estado = 'cerrada'
            WHERE numero = $1
            `,
            [numero]
        );

        res.json({
            mensaje: "Jornada cerrada correctamente"
        });

    } catch (error) {

        console.error(error);

        res.status(500).json({
            mensaje: "Error cerrando jornada"
        });

    }

};


const abrirJornada = async (req, res) => {

    try {

        const { numero } = req.params;

        await pool.query(
            `
            UPDATE jornadas
            SET estado = 'abierta'
            WHERE numero = $1
            `,
            [numero]
        );

        res.json({
            mensaje: "Jornada abierta correctamente"
        });

    } catch (error) {

        console.error(error);

        res.status(500).json({
            mensaje: "Error abriendo jornada"
        });

    }

};


const eliminarJornada = async (req, res) => {

    try {

        const { numero } = req.params;

        await pool.query(
            `
      DELETE FROM jornadas
      WHERE numero = $1
      `,
            [numero]
        );

        res.json({
            mensaje: "Jornada eliminada correctamente"
        });

    } catch (error) {

        console.error(error);

        res.status(500).json({
            mensaje: "Error eliminando jornada"
        });

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
    eliminarJornada
};