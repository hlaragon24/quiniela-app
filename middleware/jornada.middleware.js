const pool = require("../config/database");

const validarJornadaAbierta = async (req, res, next) => {

    try {

        const { partido_id } = req.body;

        const partido = await pool.query(
            `
            SELECT jornada_id
            FROM partidos
            WHERE id = $1
            `,
            [partido_id]
        );

        if (partido.rows.length === 0) {

            return res.status(404).json({
                mensaje: "Partido no encontrado"
            });

        }

        const jornadaNumero = partido.rows[0].jornada_id;

        const jornada = await pool.query(
            `
            SELECT fecha_cierre
            FROM jornadas
            WHERE numero = $1
            `,
            [jornadaNumero]
        );

        if (jornada.rows.length === 0) {

            return res.status(404).json({
                mensaje: "Jornada no configurada"
            });

        }

        const ahora = new Date();

        const fechaCierre = new Date(
            jornada.rows[0].fecha_cierre
        );

        if (ahora >= fechaCierre) {

            return res.status(403).json({
                mensaje: "La jornada ya está cerrada"
            });

        }

        next();

    } catch (error) {

        console.error(error);

        res.status(500).json({
            mensaje: "Error validando jornada"
        });

    }

};

module.exports = validarJornadaAbierta;