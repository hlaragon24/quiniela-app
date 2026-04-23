const pool = require("../config/database");


/*
====================================
HISTORIAL RANKING
====================================
*/
const obtenerHistorialRanking = async (req, res) => {

  try {

    const resultado = await pool.query(`

      SELECT
        u.id,
        u.nombre,
        p.jornada_id,
        COALESCE(SUM(pr.puntos),0) AS total

      FROM usuarios u

      LEFT JOIN pronosticos pr
        ON u.id = pr.usuario_id

      LEFT JOIN partidos p
        ON pr.partido_id = p.id

      GROUP BY u.id, p.jornada_id

      ORDER BY u.id, p.jornada_id

    `);

    res.json(resultado.rows);

  }

  catch (error) {

    console.error(error);

    res.status(500).json({
      mensaje: "Error obteniendo historial ranking"
    });

  }

};



/*
====================================
RANKING GENERAL
====================================
*/
const obtenerRankingGeneral = async (req, res) => {

  try {

    const resultado = await pool.query(`

      SELECT
        u.id,
        u.nombre,


        SUM(
          CASE
            WHEN pr.marcador_local::int = p.local
            AND pr.marcador_visitante::int = p.visitante
            THEN
              CASE
                WHEN p.es_comodin = true THEN 3
                ELSE 2
              END
            ELSE 0
          END
        ) AS puntos_marcador,


        SUM(
          CASE
            WHEN pr.resultado =
              CASE
                WHEN p.local > p.visitante THEN 'L'
                WHEN p.local < p.visitante THEN 'V'
                ELSE 'E'
              END
            THEN
              CASE
                WHEN p.es_comodin = true THEN 2
                ELSE 1
              END
            ELSE 0
          END
        ) AS puntos_resultado,


        COALESCE(SUM(pr.puntos),0) AS total


      FROM usuarios u

      LEFT JOIN pronosticos pr
        ON u.id = pr.usuario_id

      LEFT JOIN partidos p
        ON pr.partido_id = p.id

      GROUP BY u.id

      ORDER BY total DESC

    `);

    res.json(resultado.rows);

  }

  catch (error) {

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

    const jornada = parseInt(req.params.jornada);

    const resultado = await pool.query(`

      SELECT
        u.id,
        u.nombre,


        SUM(
          CASE
            WHEN pr.marcador_local = p.local
            AND pr.marcador_visitante = p.visitante
            THEN
              CASE
                WHEN p.es_comodin = true THEN 3
                ELSE 2
              END
            ELSE 0
          END
        ) AS puntos_marcador,


        SUM(
          CASE
            WHEN pr.resultado =
              CASE
                WHEN p.local > p.visitante THEN 'L'
                WHEN p.local < p.visitante THEN 'V'
                ELSE 'E'
              END
            THEN
              CASE
                WHEN p.es_comodin = true THEN 2
                ELSE 1
              END
            ELSE 0
          END
        ) AS puntos_resultado,


        COALESCE(SUM(pr.puntos),0) AS total


      FROM usuarios u

      LEFT JOIN pronosticos pr
        ON u.id = pr.usuario_id

      LEFT JOIN partidos p
        ON pr.partido_id = p.id


      WHERE p.jornada_id = $1::int

      GROUP BY u.id

      ORDER BY total DESC

    `, [jornada]);


    res.json(resultado.rows);

  }

  catch (error) {

    console.error(error);

    res.status(500).json({
      mensaje: "Error obteniendo ranking por jornada"
    });

  }

};



module.exports = {

  obtenerRankingGeneral,
  obtenerRankingPorJornada,
  obtenerHistorialRanking

};