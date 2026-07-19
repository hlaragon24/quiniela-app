const pool = require("../config/database");
const { resolverTorneoId } = require("../utils/torneo");

/*
====================================
QUERY BASE: TABLA GENERAL
====================================
Reglas:
- Pronóstico correcto base: 1 punto
- Marcador exacto base: 2 puntos
- Comodín agrega +1 al pronóstico correcto
- Comodín agrega +1 al marcador exacto
- Campeón suma puntos aparte

$1 = torneo_id
====================================
*/
const obtenerRankingGeneralBase = `
  WITH campeon_actual AS (
    SELECT
      equipo,
      puntos
    FROM campeon_real
    WHERE torneo_id = $1
    ORDER BY id DESC
    LIMIT 1
  ),

  puntos_jornadas AS (
    SELECT
      u.id AS usuario_id,
      u.nombre,

      COALESCE(SUM(
        CASE
          WHEN j.id IS NOT NULL
           AND r.partido_id IS NOT NULL
           AND (p.es_comodin IS NULL OR p.es_comodin = false)
           AND pr.resultado =
            CASE
              WHEN r.goles_local > r.goles_visitante THEN 'L'
              WHEN r.goles_visitante > r.goles_local THEN 'V'
              ELSE 'E'
            END
          THEN 1
          ELSE 0
        END
      ), 0) AS puntos_pronostico,

      COALESCE(SUM(
        CASE
          WHEN j.id IS NOT NULL
           AND r.partido_id IS NOT NULL
           AND (p.es_comodin IS NULL OR p.es_comodin = false)
           AND pr.marcador_local = r.goles_local
           AND pr.marcador_visitante = r.goles_visitante
          THEN 2
          ELSE 0
        END
      ), 0) AS puntos_marcador,

      COALESCE(SUM(
        CASE
          WHEN j.id IS NOT NULL
           AND r.partido_id IS NOT NULL
           AND p.es_comodin = true
          THEN COALESCE(pr.puntos, 0)
          ELSE 0
        END
      ), 0) AS puntos_comodin,

      COUNT(CASE WHEN j.id IS NOT NULL THEN pr.id ELSE NULL END) AS pronosticos_realizados,

      COALESCE(SUM(
        CASE
          WHEN j.id IS NOT NULL
           AND pr.puntos > 0
          THEN 1
          ELSE 0
        END
      ), 0) AS aciertos,

      COALESCE(SUM(
        CASE
          WHEN j.id IS NOT NULL
           AND r.partido_id IS NOT NULL
           AND pr.marcador_local = r.goles_local
           AND pr.marcador_visitante = r.goles_visitante
          THEN 1
          ELSE 0
        END
      ), 0) AS marcadores_exactos,

      COALESCE(SUM(
        CASE
          WHEN j.id IS NOT NULL
           AND r.partido_id IS NOT NULL
           AND pr.resultado =
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
    INNER JOIN usuarios_torneos ut
      ON ut.usuario_id = u.id
     AND ut.torneo_id = $1

    LEFT JOIN pronosticos pr
      ON u.id = pr.usuario_id

    LEFT JOIN partidos p
      ON pr.partido_id = p.id

    LEFT JOIN jornadas j
      ON p.jornada_id = j.id
     AND j.torneo_id = $1

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
        WHEN ca.equipo IS NOT NULL
         AND LOWER(TRIM(cp.equipo)) = LOWER(TRIM(ca.equipo))
        THEN ca.puntos
        ELSE 0
      END AS puntos_campeon,
      cp.equipo AS campeon_pronosticado,
      ca.equipo AS campeon_real

    FROM usuarios u
    INNER JOIN usuarios_torneos ut
      ON ut.usuario_id = u.id
     AND ut.torneo_id = $1

    LEFT JOIN campeon_pronosticos cp
      ON cp.usuario_id = u.id
     AND cp.torneo_id = $1

    LEFT JOIN campeon_actual ca
      ON TRUE
  ),

  ranking_base AS (
    SELECT
      pj.usuario_id AS id,
      pj.nombre,

      pj.puntos_pronostico,
      pj.puntos_marcador,
      pj.puntos_comodin,
      COALESCE(pc.puntos_campeon, 0) AS puntos_campeon,

      (
        pj.puntos_pronostico
        + pj.puntos_marcador
        + pj.puntos_comodin
      ) AS puntos_jornadas,

      (
        pj.puntos_pronostico
        + pj.puntos_marcador
        + pj.puntos_comodin
        + COALESCE(pc.puntos_campeon, 0)
      ) AS total,

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

    puntos_pronostico,
    puntos_marcador,
    puntos_comodin,
    puntos_campeon,
    puntos_jornadas,
    total,

    pronosticos_realizados,
    aciertos,
    marcadores_exactos,
    resultados_correctos,
    campeon_pronosticado,
    campeon_real

  FROM ranking_base
`;

const obtenerHistorialRanking = async (req, res) => {
  try {
    const torneoId = await resolverTorneoId(req.query.torneo_id);

    const resultado = await pool.query(`
      SELECT
        u.id,
        u.nombre,
        j.id AS jornada_id,
        j.numero AS jornada_numero,
        COALESCE(SUM(pr.puntos), 0) AS puntos
      FROM usuarios u
      INNER JOIN usuarios_torneos ut
        ON ut.usuario_id = u.id
       AND ut.torneo_id = $1

      INNER JOIN jornadas j
        ON j.torneo_id = $1

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
    `, [torneoId]);

    return res.json(resultado.rows);

  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({ mensaje: error.mensaje });
    }
    console.error("Error obteniendo historial ranking:", error);
    return res.status(500).json({ mensaje: "Error obteniendo historial ranking" });
  }
};

const obtenerRankingGeneral = async (req, res) => {
  try {
    const torneoId = await resolverTorneoId(
      req.params.torneoId ?? req.query.torneo_id
    );

    const resultado = await pool.query(`
      ${obtenerRankingGeneralBase}
      ORDER BY
        total DESC,
        marcadores_exactos DESC,
        resultados_correctos DESC,
        nombre ASC
    `, [torneoId]);

    return res.json(resultado.rows);

  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({ mensaje: error.mensaje });
    }
    console.error("Error obteniendo ranking general:", error);
    return res.status(500).json({ mensaje: "Error obteniendo ranking general" });
  }
};

const obtenerMiResumenRanking = async (req, res) => {
  const usuarioId = req.usuario?.id;

  if (!usuarioId) {
    return res.status(401).json({ mensaje: "Usuario no autenticado" });
  }

  try {
    const torneoId = await resolverTorneoId(req.query.torneo_id);

    // $1 = torneoId (usado dentro de la CTE base), $2 = usuarioId (filtro externo)
    const resultado = await pool.query(`
      WITH ranking_completo AS (
        ${obtenerRankingGeneralBase}
        ORDER BY
          total DESC,
          marcadores_exactos DESC,
          resultados_correctos DESC,
          nombre ASC
      ),
      total_jugadores AS (
        SELECT COUNT(*) AS total FROM ranking_completo
      ),
      lider AS (
        SELECT total AS puntos_lider FROM ranking_completo LIMIT 1
      )
      SELECT
        rc.*,
        tj.total AS total_jugadores,
        l.puntos_lider
      FROM ranking_completo rc
      CROSS JOIN total_jugadores tj
      CROSS JOIN lider l
      WHERE rc.id = $2
    `, [torneoId, usuarioId]);

    if (resultado.rows.length === 0) {
      return res.status(404).json({ mensaje: "Usuario no encontrado en ranking" });
    }

    const jugador = resultado.rows[0];

    return res.json({
      usuarioId: jugador.id,
      nombre: jugador.nombre,

      posicionGeneral: Number(jugador.posicion),
      totalJugadores: Number(jugador.total_jugadores),

      puntosPronostico: Number(jugador.puntos_pronostico),
      puntosMarcador: Number(jugador.puntos_marcador),
      puntosComodin: Number(jugador.puntos_comodin),
      puntosCampeon: Number(jugador.puntos_campeon),
      puntosJornadas: Number(jugador.puntos_jornadas),
      puntosTotales: Number(jugador.total),

      puntosLider: Number(jugador.puntos_lider),
      diferenciaLider: Number(jugador.puntos_lider) - Number(jugador.total),

      pronosticosRealizados: Number(jugador.pronosticos_realizados),
      aciertos: Number(jugador.aciertos),
      marcadoresExactos: Number(jugador.marcadores_exactos),
      resultadosCorrectos: Number(jugador.resultados_correctos),

      campeonPronosticado: jugador.campeon_pronosticado,
      campeonReal: jugador.campeon_real
    });

  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({ mensaje: error.mensaje });
    }
    console.error("Error obteniendo mi resumen de ranking:", error);
    return res.status(500).json({ mensaje: "Error obteniendo mi resumen de ranking" });
  }
};

const obtenerRankingPorJornada = async (req, res) => {
  const jornada_id = Number(req.params.jornada);

  if (!Number.isInteger(jornada_id) || jornada_id <= 0) {
    return res.status(400).json({ mensaje: "ID de jornada inválido" });
  }

  try {
    const jornadaResult = await pool.query(
      `SELECT j.id, j.numero, j.estado, j.torneo_id, t.tipo AS torneo_tipo
       FROM jornadas j JOIN torneos t ON j.torneo_id = t.id
       WHERE j.id = $1`,
      [jornada_id]
    );

    if (jornadaResult.rows.length === 0) {
      return res.status(404).json({ mensaje: "Jornada no encontrada" });
    }

    const jornada = jornadaResult.rows[0];

    // Filtra participantes según el tipo de torneo
    const participantesSubquery = jornada.torneo_tipo === "jornada"
      ? `SELECT usuario_id FROM usuarios_jornadas WHERE jornada_id = $1`
      : `SELECT usuario_id FROM usuarios_torneos WHERE torneo_id = $2`;

    const resultado = await pool.query(`
      WITH elegibles AS (${participantesSubquery})
      SELECT
        DENSE_RANK() OVER (
          ORDER BY
            COALESCE(SUM(pr.puntos), 0) DESC,
            COALESCE(SUM(
              CASE
                WHEN pr.marcador_local = r.goles_local
                 AND pr.marcador_visitante = r.goles_visitante
                THEN 1 ELSE 0
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
                THEN 1 ELSE 0
              END
            ), 0) DESC,
            u.nombre ASC
        ) AS posicion,

        u.id,
        u.nombre,

        COALESCE(SUM(pr.puntos), 0) AS total,
        COUNT(pr.id) AS pronosticos_realizados,

        COALESCE(SUM(CASE WHEN pr.puntos > 0 THEN 1 ELSE 0 END), 0) AS aciertos,

        COALESCE(SUM(
          CASE
            WHEN pr.marcador_local = r.goles_local
             AND pr.marcador_visitante = r.goles_visitante
            THEN 1 ELSE 0
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
            THEN 1 ELSE 0
          END
        ), 0) AS resultados_correctos

      FROM usuarios u
      INNER JOIN elegibles e ON e.usuario_id = u.id
      LEFT JOIN partidos p ON p.jornada_id = $1
      LEFT JOIN pronosticos pr ON pr.usuario_id = u.id AND pr.partido_id = p.id
      LEFT JOIN resultados r ON p.id = r.partido_id

      GROUP BY u.id, u.nombre
      ORDER BY total DESC, marcadores_exactos DESC, resultados_correctos DESC, u.nombre ASC
    `, [jornada_id, jornada.torneo_id]);

    return res.json({
      jornada: { id: jornada.id, numero: jornada.numero, estado: jornada.estado },
      ranking: resultado.rows
    });

  } catch (error) {
    console.error("Error obteniendo ranking por jornada:", error);
    return res.status(500).json({ mensaje: "Error obteniendo ranking por jornada" });
  }
};

/*
====================================
GANADORES POR JORNADA DENTRO DE UN TORNEO
====================================
Retorna una fila por jornada con el usuario que más puntos obtuvo.
*/
const obtenerGanadoresPorTorneo = async (req, res) => {
  try {
    const torneoId = await resolverTorneoId(req.params.torneoId ?? req.query.torneo_id);

    const torneoTipoResult = await pool.query(
      `SELECT tipo FROM torneos WHERE id = $1`, [torneoId]
    );
    const torneoTipo = torneoTipoResult.rows[0]?.tipo ?? "temporada";

    const participantesJoin = torneoTipo === "jornada"
      ? `INNER JOIN usuarios_jornadas uj ON uj.usuario_id = u.id AND uj.jornada_id = j.id`
      : `INNER JOIN usuarios_torneos ut ON ut.usuario_id = u.id AND ut.torneo_id = $1`;

    const resultado = await pool.query(`
      SELECT
        j.id AS jornada_id,
        j.numero AS jornada_numero,
        j.estado,
        w.usuario_id,
        w.nombre,
        w.total AS puntos
      FROM jornadas j
      LEFT JOIN LATERAL (
        SELECT
          u.id AS usuario_id,
          u.nombre,
          COALESCE(SUM(pr.puntos), 0) AS total
        FROM usuarios u
        ${participantesJoin}
        LEFT JOIN pronosticos pr ON pr.usuario_id = u.id
        LEFT JOIN partidos p ON pr.partido_id = p.id AND p.jornada_id = j.id
        GROUP BY u.id, u.nombre
        ORDER BY total DESC, u.nombre ASC
        LIMIT 1
      ) w ON TRUE
      WHERE j.torneo_id = $1
      ORDER BY j.numero ASC
    `, [torneoId]);

    return res.json(resultado.rows);

  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({ mensaje: error.mensaje });
    }
    console.error("Error obteniendo ganadores por torneo:", error);
    return res.status(500).json({ mensaje: "Error obteniendo ganadores por torneo" });
  }
};

module.exports = {
  obtenerRankingGeneral,
  obtenerRankingPorJornada,
  obtenerHistorialRanking,
  obtenerMiResumenRanking,
  obtenerGanadoresPorTorneo
};
