const pool = require("../data/database");

const resumenAdmin = async (req, res) => {

    try {

        const ahora = new Date();

        const jornadasAbiertas = await pool.query(
            `
            SELECT *
            FROM jornadas
            WHERE fecha_cierre > NOW()
            `
        );


        const jornadasCerradas = await pool.query(
            `
            SELECT *
            FROM jornadas
            WHERE fecha_cierre <= NOW()
            `
        );


        const partidosSinResultado = await pool.query(
            `
            SELECT *
            FROM partidos
            WHERE goles_local IS NULL
            `
        );


        const partidosConResultado = await pool.query(
            `
            SELECT *
            FROM partidos
            WHERE goles_local IS NOT NULL
            `
        );


        const totalPronosticos = await pool.query(
            `
            SELECT COUNT(*) FROM pronosticos
            `
        );


        const liderRanking = await pool.query(
            `
            SELECT
                usuarios.nombre,
                SUM(pronosticos.puntos) AS puntos
            FROM usuarios
            JOIN pronosticos
            ON usuarios.id = pronosticos.usuario_id
            GROUP BY usuarios.nombre
            ORDER BY puntos DESC
            LIMIT 1
            `
        );


        res.json({

            jornadas_abiertas: jornadasAbiertas.rows.length,

            jornadas_cerradas: jornadasCerradas.rows.length,

            partidos_sin_resultado: partidosSinResultado.rows.length,

            partidos_con_resultado: partidosConResultado.rows.length,

            total_pronosticos: totalPronosticos.rows[0].count,

            lider_actual: liderRanking.rows[0] || null

        });

    } catch (error) {

        console.error(error);

        res.status(500).json({
            mensaje: "Error obteniendo resumen admin"
        });

    }

};

module.exports = {
    resumenAdmin
};