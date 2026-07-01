const pool = require("../config/database");
const { resolverTorneoId } = require("../utils/torneo");

const resumenAdmin = async (req, res) => {
    try {
        const torneoId = await resolverTorneoId(req.query.torneo_id);

        const [
            jornadasAbiertas,
            jornadasCerradas,
            partidosSinResultado,
            partidosConResultado,
            totalPronosticos,
            liderRanking
        ] = await Promise.all([
            pool.query(
                `SELECT COUNT(*) FROM jornadas
                 WHERE fecha_cierre > NOW() AND torneo_id = $1`,
                [torneoId]
            ),
            pool.query(
                `SELECT COUNT(*) FROM jornadas
                 WHERE fecha_cierre <= NOW() AND torneo_id = $1`,
                [torneoId]
            ),
            pool.query(
                `SELECT COUNT(*) FROM partidos p
                 JOIN jornadas j ON p.jornada_id = j.id
                 LEFT JOIN resultados r ON p.id = r.partido_id
                 WHERE r.partido_id IS NULL AND j.torneo_id = $1`,
                [torneoId]
            ),
            pool.query(
                `SELECT COUNT(*) FROM partidos p
                 JOIN jornadas j ON p.jornada_id = j.id
                 JOIN resultados r ON p.id = r.partido_id
                 WHERE j.torneo_id = $1`,
                [torneoId]
            ),
            pool.query(
                `SELECT COUNT(*) FROM pronosticos pr
                 JOIN partidos p ON pr.partido_id = p.id
                 JOIN jornadas j ON p.jornada_id = j.id
                 WHERE j.torneo_id = $1`,
                [torneoId]
            ),
            pool.query(
                `SELECT u.nombre, SUM(pr.puntos) AS puntos
                 FROM usuarios u
                 JOIN pronosticos pr ON u.id = pr.usuario_id
                 JOIN partidos p ON pr.partido_id = p.id
                 JOIN jornadas j ON p.jornada_id = j.id
                 WHERE j.torneo_id = $1
                 GROUP BY u.nombre
                 ORDER BY puntos DESC
                 LIMIT 1`,
                [torneoId]
            )
        ]);

        res.json({
            torneo_id: torneoId,
            jornadas_abiertas: Number(jornadasAbiertas.rows[0].count),
            jornadas_cerradas: Number(jornadasCerradas.rows[0].count),
            partidos_sin_resultado: Number(partidosSinResultado.rows[0].count),
            partidos_con_resultado: Number(partidosConResultado.rows[0].count),
            total_pronosticos: totalPronosticos.rows[0].count,
            lider_actual: liderRanking.rows[0] || null
        });

    } catch (error) {
        if (error.status) {
            return res.status(error.status).json({ mensaje: error.mensaje });
        }
        console.error(error);
        res.status(500).json({ mensaje: "Error obteniendo resumen admin" });
    }
};

module.exports = {
    resumenAdmin
};
