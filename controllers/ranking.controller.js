const pool = require("../config/database");


/*
====================================
RANKING GENERAL
====================================
*/

const obtenerRanking = async (req, res) => {

    try {

        const ranking = await pool.query(
            `
            SELECT
                usuarios.id,
                usuarios.nombre,
                COALESCE(SUM(pronosticos.puntos),0) AS puntos
            FROM usuarios
            LEFT JOIN pronosticos
            ON usuarios.id = pronosticos.usuario_id
            GROUP BY usuarios.id
            ORDER BY puntos DESC
            `
        );

        res.json(ranking.rows);

    } catch (error) {

        console.error(error);

        res.status(500).json({
            mensaje: "Error obteniendo ranking"
        });

    }

};


/*
====================================
RANKING POR JORNADA
====================================
*/

const obtenerRankingPorJornada = async (req, res) => {

    const jornada_id = parseInt(req.params.jornadaId);

    try {

        const ranking = await pool.query(
            `
            SELECT
                usuarios.id,
                usuarios.nombre,
                COALESCE(SUM(pronosticos.puntos),0) AS puntos
            FROM usuarios

            LEFT JOIN pronosticos
            ON usuarios.id = pronosticos.usuario_id

            LEFT JOIN partidos
            ON pronosticos.partido_id = partidos.id

            WHERE partidos.jornada_id = $1

            GROUP BY usuarios.id

            ORDER BY puntos DESC
            `,
            [jornada_id]
        );

        res.json(ranking.rows);

    } catch (error) {

        console.error(error);

        res.status(500).json({
            mensaje: "Error obteniendo ranking por jornada"
        });

    }

};


module.exports = {
    obtenerRanking,
    obtenerRankingPorJornada
};