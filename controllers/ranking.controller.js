const pool = require("../config/database");


/*
====================================
RANKING GENERAL (acumulado)
====================================
*/
const obtenerRankingGeneral = async (req, res) => {

    try {

        const resultado = await pool.query(
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

        res.json(resultado.rows);

    } catch (error) {

        console.error(error);

        res.status(500).json({
            mensaje: "Error obteniendo ranking general"
        });

    }

};


/*
====================================
RANKING POR JORNADA
====================================
*/
const obtenerRankingPorJornada = async (req, res) => {

    try {

        const { jornada } = req.params;

        const resultado = await pool.query(
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
            [jornada]
        );

        res.json(resultado.rows);

    } catch (error) {

        console.error(error);

        res.status(500).json({
            mensaje: "Error obteniendo ranking por jornada"
        });

    }

};


module.exports = {
    obtenerRankingGeneral,
    obtenerRankingPorJornada
};