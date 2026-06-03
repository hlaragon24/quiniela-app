const pool = require("../config/database");

/*
====================================
QUERY BASE: PUNTOS POR JORNADAS + CAMPEÓN
====================================
*/
const obtenerRankingGeneralBase = `
  WITH puntos_jornadas AS (
    SELECT
      u.id AS usuario_id,
      u.nombre,

      COALESCE(SUM(pr.puntos), 0) AS puntos_jornadas,

      COUNT(pr.id) AS pronosticos_realizados,

      COALESCE(SUM(
        CASE
          WHEN pr.puntos > 0 THEN 1
          ELSE 0
        END
      ), 0) AS aciertos,

      COALESCE(SUM(
        CASE
          WHEN pr.marcador_local = r.goles_local
           AND pr.marcador_visitante = r.goles_visitante
          THEN 1
          ELSE 0
        END
      ), 0) AS marcadores_exactos,

      COALESCE(SUM(
        CASE
          WHEN pr.resultado =
            CASE
              WHEN r.goles_local > r.goles_visitante THEN 'L'
              WHEN r.goles_visitante > r.goles_local THEN 'V'
              ELSE 'E'
            END
          THEN 1
          ELSE 0
        END
      ), 0) AS resultados_correctos

    FROM usuarios u

    LEFT JOIN pronosticos pr
      ON u.id = pr.usuario_id

    LEFT JOIN partidos p
      ON pr.partido_id = p.id

    LEFT JOIN resultados r
      ON p.id = r.partido_id

    GROUP BY
      u.id,
      u.nombre
  ),

  puntos_campeon AS (
    SELECT
      u.id AS usuario_id,
      CASE
        WHEN cr.equipo IS NOT NULL
         AND LOWER(TRIM(cp.equipo)) = LOWER(TRIM(cr.equipo))
        THEN cr.puntos
        ELSE 0
      END AS puntos_campeon,
      cp.equipo AS campeon_pronosticado,
      cr.equipo AS campeon_real

    FROM usuarios u

    LEFT JOIN campeon_pronosticos cp
      ON cp.usuario_id = u.id

    LEFT JOIN campeon_real cr
      ON TRUE
  ),

  ranking_base AS (
    SELECT
      pj.usuario_id AS id,
      pj.nombre,
      pj.puntos_jornadas,
      COALESCE(pc.puntos_campeon, 0) AS puntos_campeon,
      pj.puntos_jornadas + COALESCE(pc.puntos_campeon, 0) AS total,
      pj.pronosticos_realizados,
      pj.aciertos,
      pj.marcadores_exactos,
      pj.resultados_correctos,
      pc.campeon_pronosticado,
      pc.campeon_real

    FROM puntos_jornadas pj

    LEFT JOIN puntos_campeon pc
      ON pc.usuario_id = pj.usuario_id
  )

  SELECT
    DENSE_RANK() OVER (
      ORDER BY
        total DESC,
        marcadores_exactos DESC,
        resultados_correctos DESC,
        nombre ASC
    ) AS posicion,
    id,
    nombre,
    puntos_jornadas,
    puntos_campeon,
    total,
    pronosticos_realizados,
    aciertos,
    marcadores_exactos,
    resultados_correctos,
    campeon_pronosticado,
    campeon_real

  FROM ranking_base
`;

/*
====================================
HISTORIAL RANKING POR JORNADA
Incluye usuarios con 0 puntos
====================================
*/
const obtenerHistorialRanking = async (req, res) => {
  try {
    const resultado = await pool.query(`
      SELECT
        u.id,
        u.nombre,
        j.id AS jornada_id,
        j.numero AS jornada_numero,
        COALESCE(SUM(pr.puntos), 0) AS puntos
      FROM usuarios u

      CROSS JOIN jornadas j

      LEFT JOIN partidos p
        ON p.jornada_id = j.id

      LEFT JOIN pronosticos pr
        ON pr.usuario_id = u.id
       AND pr.partido_id = p.id

      GROUP BY
        u.id,
        u.nombre,
        j.id,
        j.numero

      ORDER BY
        j.numero ASC,
        puntos DESC,
        u.nombre ASC
    `);

    return res.json(resultado.rows);

  } catch (error) {
    console.error("Error obteniendo historial ranking:", error);

    return res.status(500).json({
      mensaje: "Error obteniendo historial ranking"
    });
  }
};

/*
====================================
RANKING GENERAL
Incluye puntos por jornadas + campeón
====================================
*/
const obtenerRankingGeneral = async (req, res) => {
  try {
    const resultado = await pool.query(`
      ${obtenerRankingGeneralBase}
      ORDER BY
        total DESC,
        marcadores_exactos DESC,
        resultados_correctos DESC,
        nombre ASC
    `);

    return res.json(resultado.rows);

  } catch (error) {
    console.error("Error obteniendo ranking general:", error);

    return res.status(500).json({
      mensaje: "Error obteniendo ranking general"
    });
  }
};

/*
====================================
MI RESUMEN DE RANKING
Para dashboard del jugador
====================================
*/
const obtenerMiResumenRanking = async (req, res) => {
  const usuarioId = req.usuario?.id;

  if (!usuarioId) {
    return res.status(401).json({
      mensaje: "Usuario no autenticado"
    });
  }

  try {
    const ranking = await pool.query(`
      ${obtenerRankingGeneralBase}
      ORDER BY
        total DESC,
        marcadores_exactos DESC,
        resultados_correctos DESC,
        nombre ASC
    `);

    const filas = ranking.rows;

    const jugador = filas.find(
      fila => Number(fila.id) === Number(usuarioId)
    );

    if (!jugador) {
      return res.status(404).json({
        mensaje: "Usuario no encontrado en ranking"
      });
    }

    const lider = filas[0] || null;

    return res.json({
      usuarioId: jugador.id,
      nombre: jugador.nombre,
      posicionGeneral: Number(jugador.posicion),
      totalJugadores: filas.length,
      puntosJornadas: Number(jugador.puntos_jornadas),
      puntosCampeon: Number(jugador.puntos_campeon),
      puntosTotales: Number(jugador.total),
      puntosLider: lider ? Number(lider.total) : Number(jugador.total),
      diferenciaLider: lider
        ? Number(lider.total) - Number(jugador.total)
        : 0,
      pronosticosRealizados: Number(jugador.pronosticos_realizados),
      aciertos: Number(jugador.aciertos),
      marcadoresExactos: Number(jugador.marcadores_exactos),
      resultadosCorrectos: Number(jugador.resultados_correctos),
      campeonPronosticado: jugador.campeon_pronosticado,
      campeonReal: jugador.campeon_real
    });

  } catch (error) {
    console.error("Error obteniendo mi resumen de ranking:", error);

    return res.status(500).json({
      mensaje: "Error obteniendo mi resumen de ranking"
    });
  }
};

/*
====================================
RANKING POR JORNADA
Incluye usuarios con 0 puntos
====================================
*/
const obtenerRankingPorJornada = async (req, res) => {
  const jornada_id = Number(req.params.jornada);

  if (!Number.isInteger(jornada_id) || jornada_id <= 0) {
    return res.status(400).json({
      mensaje: "ID de jornada inválido"
    });
  }

  try {
    const jornadaExiste = await pool.query(
      `
      SELECT id, numero, estado
      FROM jornadas
      WHERE id = $1
      `,
      [jornada_id]
    );

    if (jornadaExiste.rows.length === 0) {
      return res.status(404).json({
        mensaje: "Jornada no encontrada"
      });
    }

    const resultado = await pool.query(`
      SELECT
        DENSE_RANK() OVER (
          ORDER BY
            COALESCE(SUM(pr.puntos), 0) DESC,
            COALESCE(SUM(
              CASE
                WHEN pr.marcador_local = r.goles_local
                 AND pr.marcador_visitante = r.goles_visitante
                THEN 1
                ELSE 0
              END
            ), 0) DESC,
            COALESCE(SUM(
              CASE
                WHEN pr.resultado =
                  CASE
                    WHEN r.goles_local > r.goles_visitante THEN 'L'
                    WHEN r.goles_visitante > r.goles_local THEN 'V'
                    ELSE 'E'
                  END
                THEN 1
                ELSE 0
              END
            ), 0) DESC,
            u.nombre ASC
        ) AS posicion,

        u.id,
        u.nombre,

        COALESCE(SUM(pr.puntos), 0) AS total,

        COUNT(pr.id) AS pronosticos_realizados,

        COALESCE(SUM(
          CASE
            WHEN pr.puntos > 0 THEN 1
            ELSE 0
          END
        ), 0) AS aciertos,

        COALESCE(SUM(
          CASE
            WHEN pr.marcador_local = r.goles_local
             AND pr.marcador_visitante = r.goles_visitante
            THEN 1
            ELSE 0
          END
        ), 0) AS marcadores_exactos,

        COALESCE(SUM(
          CASE
            WHEN pr.resultado =
              CASE
                WHEN r.goles_local > r.goles_visitante THEN 'L'
                WHEN r.goles_visitante > r.goles_local THEN 'V'
                ELSE 'E'
              END
            THEN 1
            ELSE 0
          END
        ), 0) AS resultados_correctos

      FROM usuarios u

      LEFT JOIN partidos p
        ON p.jornada_id = $1

      LEFT JOIN pronosticos pr
        ON pr.usuario_id = u.id
       AND pr.partido_id = p.id

      LEFT JOIN resultados r
        ON p.id = r.partido_id

      GROUP BY
        u.id,
        u.nombre

      ORDER BY
        total DESC,
        marcadores_exactos DESC,
        resultados_correctos DESC,
        u.nombre ASC
    `, [jornada_id]);

    return res.json({
      jornada: jornadaExiste.rows[0],
      ranking: resultado.rows
    });

  } catch (error) {
    console.error("Error obteniendo ranking por jornada:", error);

    return res.status(500).json({
      mensaje: "Error obteniendo ranking por jornada"
    });
  }
};

module.exports = {
  obtenerRankingGeneral,
  obtenerRankingPorJornada,
  obtenerHistorialRanking,
  obtenerMiResumenRanking
};