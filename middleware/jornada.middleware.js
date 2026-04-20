const pool = require("../config/db");

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

        const jornada_id = partido.rows[0].jornada_id;

        const primerPartido = await pool.query(
            `
            SELECT MIN(fecha) AS fecha_inicio
            FROM partidos
            WHERE jornada_id = $1
            `,
            [jornada_id]
        );

        const fechaInicio = new Date(primerPartido.rows[0].fecha_inicio);

        const fechaBloqueo = new Date(fechaInicio);

        fechaBloqueo.setHours(fechaBloqueo.getHours() - 1);

        const ahora = new Date();

        if (ahora >= fechaBloqueo) {

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