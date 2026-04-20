const pool = require("../config/db");

const crearPartido = async (req, res) => {

    try {

        const {
            jornada_id,
            local,
            visitante,
            fecha,
            es_comodin
        } = req.body;

        if (!jornada_id || !local || !visitante || !fecha) {

            return res.status(400).json({
                mensaje: "Faltan datos obligatorios"
            });

        }

        const nuevoPartido = await pool.query(
            `
            INSERT INTO partidos
            (
                jornada_id,
                local,
                visitante,
                fecha,
                es_comodin
            )
            VALUES ($1,$2,$3,$4,$5)
            RETURNING *
            `,
            [
                jornada_id,
                local,
                visitante,
                fecha,
                es_comodin ?? false
            ]
        );

        res.json({
            mensaje: "Partido creado correctamente",
            data: nuevoPartido.rows[0]
        });

    } catch (error) {

        console.error(error);

        res.status(500).json({
            mensaje: "Error creando partido"
        });

    }

};

module.exports = {
    obtenerPartidosPorJornada,
    crearPartido
};