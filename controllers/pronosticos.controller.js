
const pool = require("../config/database");


/*
====================================
GUARDAR PRONÓSTICO
====================================
*/
const guardarPronostico = async (req, res) => {

    const {
        partido_id,
        resultado,
        marcador_local,
        marcador_visitante
    } = req.body;

    const usuario_id = req.usuario.id;

    try {

        // Validar resultado permitido
        const resultadosValidos = ["L", "E", "V"];

        if (!resultadosValidos.includes(resultado)) {

            return res.status(400).json({
                mensaje: "Resultado inválido. Solo se permite L, E o V"
            });

        }


        // Verificar si ya existe pronóstico del usuario para ese partido
        const existe = await pool.query(
            `SELECT * FROM pronosticos
             WHERE usuario_id = $1
             AND partido_id = $2`,
            [usuario_id, partido_id]
        );


        if (existe.rows.length > 0) {

            return res.status(400).json({
                mensaje: "Ya registraste pronóstico para este partido"
            });

        }


        // Guardar pronóstico
        await pool.query(
            `INSERT INTO pronosticos
             (usuario_id, partido_id, resultado, marcador_local, marcador_visitante)
             VALUES ($1, $2, $3, $4, $5)`,
            [
                usuario_id,
                partido_id,
                resultado,
                marcador_local,
                marcador_visitante
            ]
        );


        res.json({
            mensaje: "Pronóstico guardado correctamente"
        });

    } catch (error) {

        console.error(error);

        res.status(500).json({
            mensaje: "Error guardando pronóstico"
        });

    }

};


/*
====================================
VER PRONÓSTICOS DEL USUARIO
====================================
*/
const obtenerPronosticosUsuario = async (req, res) => {

    try {

        const usuarioId = req.usuario.id;

        const resultado = await pool.query(
            `
            SELECT
                partidos.id,
                partidos.local,
                partidos.visitante,
                partidos.es_comodin,
                partidos.jornada_id,
                resultados.goles_local,
                resultados.goles_visitante,
                pronosticos.puntos
            FROM pronosticos
            JOIN partidos
                ON pronosticos.partido_id = partidos.id
            LEFT JOIN resultados
                ON partidos.id = resultados.partido_id
            WHERE pronosticos.usuario_id = $1
            ORDER BY partidos.id
            `,
            [usuarioId]
        );

        res.json(resultado.rows);

    } catch (error) {

        console.error(error);

        res.status(500).json({
            mensaje: "Error obteniendo pronósticos usuario"
        });

    }

};


module.exports = {
    guardarPronostico,
    obtenerPronosticosUsuario
};