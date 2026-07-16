const pool = require("../config/database");
const { resolverTorneoId } = require("../utils/torneo");

/*
====================================
UTILIDADES
====================================
*/
const resultadosValidos = ["L", "E", "V"];

const esEnteroPositivo = (valor) => {
  const numero = Number(valor);
  return Number.isInteger(numero) && numero > 0;
};

const esEnteroNoNegativo = (valor) => {
  const numero = Number(valor);
  return Number.isInteger(numero) && numero >= 0;
};

const hayDuplicados = (valores) => {
  return new Set(valores).size !== valores.length;
};

/*
====================================
GUARDAR PRONÓSTICO INDIVIDUAL
Bloqueo por jornada: fecha_cierre
====================================
*/
const guardarPronostico = async (req, res) => {
  const usuario_id = req.usuario.id;

  const {
    partido_id,
    resultado,
    marcador_local,
    marcador_visitante
  } = req.body;

  if (
    !esEnteroPositivo(partido_id) ||
    !resultadosValidos.includes(resultado) ||
    !esEnteroNoNegativo(marcador_local) ||
    !esEnteroNoNegativo(marcador_visitante)
  ) {
    return res.status(400).json({
      mensaje: "Datos de pronóstico inválidos"
    });
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const partidoResult = await client.query(
      `
      SELECT
        p.id,
        p.jornada_id,
        j.estado,
        j.fecha_cierre,
        j.torneo_id,
        t.tipo AS torneo_tipo
      FROM partidos p
      JOIN jornadas j ON p.jornada_id = j.id
      JOIN torneos t  ON j.torneo_id = t.id
      WHERE p.id = $1
      `,
      [Number(partido_id)]
    );

    if (partidoResult.rows.length === 0) {
      await client.query("ROLLBACK");

      return res.status(404).json({
        mensaje: "Partido no encontrado"
      });
    }

    const partido = partidoResult.rows[0];

    if (partido.torneo_tipo === "jornada") {
      const inscrito = await client.query(
        `SELECT 1 FROM usuarios_jornadas WHERE usuario_id = $1 AND jornada_id = $2`,
        [usuario_id, partido.jornada_id]
      );
      if (inscrito.rows.length === 0) {
        await client.query("ROLLBACK");
        return res.status(403).json({
          mensaje: "No estás inscrito en esta jornada"
        });
      }
    }

    // Verificar pago jerárquico: jornada primero, luego torneo
    {
      // 1. Chequeo por jornada (aplica para cualquier tipo de torneo)
      const pagoJornada = await client.query(
        `SELECT pagado FROM pagos_quiniela WHERE usuario_id = $1 AND jornada_id = $2`,
        [usuario_id, partido.jornada_id]
      );
      if (pagoJornada.rows.length > 0 && !pagoJornada.rows[0].pagado) {
        await client.query("ROLLBACK");
        return res.status(403).json({
          mensaje: "Tu pago para esta jornada está pendiente",
          codigo: "PAGO_PENDIENTE"
        });
      }

      // 2. Chequeo por torneo (solo si no hay pago por jornada y es tipo='temporada')
      if (partido.torneo_tipo === "temporada" && pagoJornada.rows.length === 0) {
        const pagoTorneo = await client.query(
          `SELECT pagado FROM pagos_quiniela WHERE usuario_id = $1 AND torneo_id = $2 AND jornada_id IS NULL`,
          [usuario_id, partido.torneo_id]
        );
        if (pagoTorneo.rows.length > 0 && !pagoTorneo.rows[0].pagado) {
          await client.query("ROLLBACK");
          return res.status(403).json({
            mensaje: "Tu pago para este torneo está pendiente",
            codigo: "PAGO_PENDIENTE"
          });
        }
      }
    }

    if (!partido.fecha_cierre) {
      await client.query("ROLLBACK");

      return res.status(400).json({
        mensaje: "La jornada no tiene fecha de cierre configurada"
      });
    }

    if (partido.estado !== "abierta") {
      await client.query("ROLLBACK");

      return res.status(403).json({
        mensaje: "La jornada no está abierta"
      });
    }

    const bloqueoResult = await client.query(
      `
      SELECT NOW() >= $1::timestamp AS bloqueada
      `,
      [partido.fecha_cierre]
    );

    if (bloqueoResult.rows[0].bloqueada) {
      await client.query("ROLLBACK");

      return res.status(403).json({
        mensaje: "La jornada ya está bloqueada. No puedes guardar ni modificar pronósticos."
      });
    }

    await client.query(
      `
      INSERT INTO pronosticos
        (
          usuario_id,
          partido_id,
          resultado,
          marcador_local,
          marcador_visitante
        )
      VALUES
        ($1, $2, $3, $4, $5)
      ON CONFLICT (usuario_id, partido_id)
      DO UPDATE SET
        resultado = EXCLUDED.resultado,
        marcador_local = EXCLUDED.marcador_local,
        marcador_visitante = EXCLUDED.marcador_visitante,
        updated_at = NOW()
      `,
      [
        usuario_id,
        Number(partido_id),
        resultado,
        Number(marcador_local),
        Number(marcador_visitante)
      ]
    );

    await client.query("COMMIT");

    return res.json({
      mensaje: "Pronóstico guardado correctamente",
      partido_id: Number(partido_id),
      jornada_id: partido.jornada_id
    });
  } catch (error) {
    await client.query("ROLLBACK");

    console.error("Error guardando pronóstico:", error);

    return res.status(500).json({
      mensaje: "Error guardando pronóstico"
    });
  } finally {
    client.release();
  }
};

/*
====================================
GUARDAR PRONÓSTICOS POR JORNADA
Bloqueo por jornada: fecha_cierre
====================================
*/
const guardarPronosticosJornada = async (req, res) => {
  const usuario_id = req.usuario.id;
  const pronosticos = req.body;

  if (!Array.isArray(pronosticos) || pronosticos.length === 0) {
    return res.status(400).json({
      mensaje: "Debes enviar al menos un pronóstico"
    });
  }

  for (const p of pronosticos) {
    if (
      !esEnteroPositivo(p.partido_id) ||
      !resultadosValidos.includes(p.resultado) ||
      !esEnteroNoNegativo(p.marcador_local) ||
      !esEnteroNoNegativo(p.marcador_visitante)
    ) {
      return res.status(400).json({
        mensaje: "Uno o más pronósticos tienen datos inválidos"
      });
    }
  }

  const idsPartidos = pronosticos.map((p) => Number(p.partido_id));

  if (hayDuplicados(idsPartidos)) {
    return res.status(400).json({
      mensaje: "No puedes enviar pronósticos duplicados para el mismo partido"
    });
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const partidosResult = await client.query(
      `
      SELECT
        p.id,
        p.jornada_id,
        j.estado,
        j.fecha_cierre,
        j.torneo_id,
        t.tipo AS torneo_tipo
      FROM partidos p
      JOIN jornadas j ON p.jornada_id = j.id
      JOIN torneos t  ON j.torneo_id = t.id
      WHERE p.id = ANY($1::int[])
      `,
      [idsPartidos]
    );

    if (partidosResult.rows.length !== idsPartidos.length) {
      await client.query("ROLLBACK");

      return res.status(404).json({
        mensaje: "Uno o más partidos no existen"
      });
    }

    const jornadasIds = [
      ...new Set(partidosResult.rows.map((p) => p.jornada_id))
    ];

    if (jornadasIds.length !== 1) {
      await client.query("ROLLBACK");

      return res.status(400).json({
        mensaje: "Todos los pronósticos deben pertenecer a la misma jornada"
      });
    }

    const jornada = partidosResult.rows[0];

    if (!jornada.fecha_cierre) {
      await client.query("ROLLBACK");

      return res.status(400).json({
        mensaje: "La jornada no tiene fecha de cierre configurada"
      });
    }

    if (jornada.estado !== "abierta") {
      await client.query("ROLLBACK");

      return res.status(403).json({
        mensaje: "La jornada no está abierta"
      });
    }

    const bloqueoResult = await client.query(
      `
      SELECT NOW() >= $1::timestamp AS bloqueada
      `,
      [jornada.fecha_cierre]
    );

    if (bloqueoResult.rows[0].bloqueada) {
      await client.query("ROLLBACK");

      return res.status(403).json({
        mensaje: "La jornada ya está bloqueada. No puedes guardar ni modificar pronósticos."
      });
    }

    if (jornada.torneo_tipo === "jornada") {
      const inscrito = await client.query(
        `SELECT 1 FROM usuarios_jornadas WHERE usuario_id = $1 AND jornada_id = $2`,
        [usuario_id, jornadasIds[0]]
      );
      if (inscrito.rows.length === 0) {
        await client.query("ROLLBACK");
        return res.status(403).json({
          mensaje: "No estás inscrito en esta jornada"
        });
      }
    }

    // Verificar pago: bloquear solo si existe registro con pagado=false
    {
      const pagoQuery = jornada.torneo_tipo === "jornada"
        ? `SELECT pagado FROM pagos_quiniela WHERE usuario_id = $1 AND jornada_id = $2`
        : `SELECT pagado FROM pagos_quiniela WHERE usuario_id = $1 AND torneo_id = $2 AND jornada_id IS NULL`;
      const pagoParams = jornada.torneo_tipo === "jornada"
        ? [usuario_id, jornadasIds[0]]
        : [usuario_id, jornada.torneo_id];

      const pagoResult = await client.query(pagoQuery, pagoParams);
      if (pagoResult.rows.length > 0 && !pagoResult.rows[0].pagado) {
        await client.query("ROLLBACK");
        return res.status(403).json({
          mensaje: jornada.torneo_tipo === "jornada"
            ? "Tu pago para esta jornada está pendiente"
            : "Tu pago para este torneo está pendiente",
          codigo: "PAGO_PENDIENTE"
        });
      }
    }

    const idsPartidosArr = pronosticos.map((p) => Number(p.partido_id));
    const resultadosArr = pronosticos.map((p) => p.resultado);
    const marcadoresLocalArr = pronosticos.map((p) => Number(p.marcador_local));
    const marcadoresVisitanteArr = pronosticos.map((p) => Number(p.marcador_visitante));

    await client.query(
      `
      INSERT INTO pronosticos
        (usuario_id, partido_id, resultado, marcador_local, marcador_visitante)
      SELECT
        $1,
        t.partido_id,
        t.resultado,
        t.marcador_local,
        t.marcador_visitante
      FROM unnest(
        $2::int[],
        $3::text[],
        $4::int[],
        $5::int[]
      ) AS t(partido_id, resultado, marcador_local, marcador_visitante)
      ON CONFLICT (usuario_id, partido_id)
      DO UPDATE SET
        resultado = EXCLUDED.resultado,
        marcador_local = EXCLUDED.marcador_local,
        marcador_visitante = EXCLUDED.marcador_visitante,
        updated_at = NOW()
      `,
      [usuario_id, idsPartidosArr, resultadosArr, marcadoresLocalArr, marcadoresVisitanteArr]
    );

    await client.query("COMMIT");

    return res.json({
      mensaje: "Pronósticos guardados correctamente",
      jornada_id: jornadasIds[0],
      total_guardados: pronosticos.length
    });
  } catch (error) {
    await client.query("ROLLBACK");

    console.error("Error guardando pronósticos:", error);

    return res.status(500).json({
      mensaje: "Error guardando pronósticos"
    });
  } finally {
    client.release();
  }
};

/*
====================================
VER PRONÓSTICOS DEL USUARIO
====================================
*/
const obtenerPronosticosUsuario = async (req, res) => {
  const usuario_id = req.usuario.id;

  try {
    const torneoId = await resolverTorneoId(req.query.torneo_id);

    const resultado = await pool.query(
      `
      SELECT
        p.id AS partido_id,
        p.local,
        p.visitante,
        p.es_comodin,
        p.jornada_id,

        j.numero AS jornada_numero,
        j.estado AS jornada_estado,
        j.fecha_inicio,
        j.fecha_cierre,

        r.goles_local,
        r.goles_visitante,

        pr.resultado AS pronostico_usuario,
        pr.marcador_local,
        pr.marcador_visitante,
        pr.puntos,
        pr.created_at,
        pr.updated_at,

        CASE
          WHEN NOW() >= j.fecha_cierre THEN true
          ELSE false
        END AS jornada_bloqueada

      FROM pronosticos pr

      JOIN partidos p
        ON pr.partido_id = p.id

      JOIN jornadas j
        ON p.jornada_id = j.id

      LEFT JOIN resultados r
        ON p.id = r.partido_id

      WHERE pr.usuario_id = $1
        AND j.torneo_id = $2

      ORDER BY j.numero, p.id
      `,
      [usuario_id, torneoId]
    );

    return res.json(resultado.rows);
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({ mensaje: error.mensaje });
    }
    console.error("Error obteniendo pronósticos usuario:", error);

    return res.status(500).json({
      mensaje: "Error obteniendo pronósticos usuario"
    });
  }
};

/*
====================================
VER PRONÓSTICOS DEL USUARIO POR JORNADA
====================================
*/
const obtenerPronosticosUsuarioPorJornada = async (req, res) => {
  const usuario_id = req.usuario.id;
  const jornadaId = Number(req.params.jornadaId);

  if (!esEnteroPositivo(jornadaId)) {
    return res.status(400).json({
      mensaje: "ID de jornada inválido"
    });
  }

  try {
    const resultado = await pool.query(
      `
      SELECT
        p.id AS partido_id,
        p.local,
        p.visitante,
        p.es_comodin,
        p.jornada_id,

        pr.resultado AS pronostico_usuario,
        pr.marcador_local,
        pr.marcador_visitante,
        pr.puntos

      FROM pronosticos pr

      JOIN partidos p
        ON pr.partido_id = p.id

      WHERE pr.usuario_id = $1
      AND p.jornada_id = $2

      ORDER BY p.id
      `,
      [usuario_id, jornadaId]
    );

    return res.json(resultado.rows);
  } catch (error) {
    console.error("Error obteniendo pronósticos por jornada:", error);

    return res.status(500).json({
      mensaje: "Error obteniendo pronósticos por jornada"
    });
  }
};

const obtenerHistoricoGeneralPronosticos = async (req, res) => {
  try {
    const torneoId = await resolverTorneoId(req.query.torneo_id);

    const resultado = await pool.query(`
      SELECT
        j.id AS jornada_id,
        j.numero AS jornada_numero,

        u.id AS usuario_id,
        u.nombre AS jugador,

        p.id AS partido_id,
        p.local,
        p.visitante,
        p.es_comodin,

        pr.resultado AS pronostico_resultado,
        pr.marcador_local AS pronostico_local,
        pr.marcador_visitante AS pronostico_visitante,

        r.goles_local,
        r.goles_visitante,

        CASE
          WHEN r.partido_id IS NULL THEN NULL
          WHEN r.goles_local > r.goles_visitante THEN 'L'
          WHEN r.goles_visitante > r.goles_local THEN 'V'
          ELSE 'E'
        END AS resultado_real,

        CASE
          WHEN r.partido_id IS NOT NULL
           AND pr.resultado =
            CASE
              WHEN r.goles_local > r.goles_visitante THEN 'L'
              WHEN r.goles_visitante > r.goles_local THEN 'V'
              ELSE 'E'
            END
          THEN true
          ELSE false
        END AS acerto_resultado,

        CASE
          WHEN r.partido_id IS NOT NULL
           AND pr.marcador_local = r.goles_local
           AND pr.marcador_visitante = r.goles_visitante
          THEN true
          ELSE false
        END AS acerto_marcador,

        CASE
          WHEN r.partido_id IS NULL THEN 0
          ELSE
            (
              CASE
                WHEN pr.resultado =
                  CASE
                    WHEN r.goles_local > r.goles_visitante THEN 'L'
                    WHEN r.goles_visitante > r.goles_local THEN 'V'
                    ELSE 'E'
                  END
                THEN
                  CASE WHEN p.es_comodin = true THEN 2 ELSE 1 END
                ELSE 0
              END
            )
            +
            (
              CASE
                WHEN pr.marcador_local = r.goles_local
                 AND pr.marcador_visitante = r.goles_visitante
                THEN
                  CASE WHEN p.es_comodin = true THEN 3 ELSE 2 END
                ELSE 0
              END
            )
        END AS puntos_calculados

      FROM pronosticos pr

      INNER JOIN usuarios u
        ON u.id = pr.usuario_id

      INNER JOIN partidos p
        ON p.id = pr.partido_id

      INNER JOIN jornadas j
        ON j.id = p.jornada_id
       AND j.torneo_id = $1

      LEFT JOIN resultados r
        ON r.partido_id = p.id

      ORDER BY
        j.numero DESC,
        u.nombre ASC,
        p.id ASC
    `, [torneoId]);

    return res.json(resultado.rows);

  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({ mensaje: error.mensaje });
    }
    console.error("Error obteniendo histórico general:", error);

    return res.status(500).json({
      mensaje: "Error obteniendo histórico general"
    });
  }
};

const obtenerPronosticosAdmin = async (req, res) => {
  const jornadaId = Number(req.params.jornadaId);
  if (!esEnteroPositivo(jornadaId)) return res.status(400).json({ mensaje: "ID de jornada inválido" });
  try {
    const resultado = await pool.query(`
      SELECT
        u.id AS usuario_id, u.nombre AS jugador,
        p.id AS partido_id, p.local, p.visitante, p.es_comodin,
        pr.resultado, pr.marcador_local, pr.marcador_visitante, pr.puntos,
        pr.updated_at
      FROM partidos p
      LEFT JOIN pronosticos pr ON pr.partido_id = p.id
      LEFT JOIN usuarios u ON u.id = pr.usuario_id
      WHERE p.jornada_id = $1
      ORDER BY p.id, u.nombre
    `, [jornadaId]);
    return res.json(resultado.rows);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ mensaje: "Error obteniendo pronósticos" });
  }
};

const actualizarPronosticoAdmin = async (req, res) => {
  const usuarioId = Number(req.params.usuarioId);
  const partidoId = Number(req.params.partidoId);
  const { resultado, marcador_local, marcador_visitante } = req.body;
  if (!esEnteroPositivo(usuarioId) || !esEnteroPositivo(partidoId)) return res.status(400).json({ mensaje: "IDs inválidos" });
  if (!resultadosValidos.includes(resultado)) return res.status(400).json({ mensaje: "Resultado inválido" });
  try {
    await pool.query(`
      INSERT INTO pronosticos (usuario_id, partido_id, resultado, marcador_local, marcador_visitante)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (usuario_id, partido_id) DO UPDATE SET
        resultado = EXCLUDED.resultado,
        marcador_local = EXCLUDED.marcador_local,
        marcador_visitante = EXCLUDED.marcador_visitante,
        updated_at = NOW()
    `, [usuarioId, partidoId, resultado, Number(marcador_local ?? 0), Number(marcador_visitante ?? 0)]);
    return res.json({ mensaje: "Pronóstico actualizado" });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ mensaje: "Error actualizando pronóstico" });
  }
};

const eliminarPronosticoAdmin = async (req, res) => {
  const usuarioId = Number(req.params.usuarioId);
  const partidoId = Number(req.params.partidoId);
  if (!esEnteroPositivo(usuarioId) || !esEnteroPositivo(partidoId)) return res.status(400).json({ mensaje: "IDs inválidos" });
  try {
    const r = await pool.query(
      `DELETE FROM pronosticos WHERE usuario_id = $1 AND partido_id = $2 RETURNING usuario_id`,
      [usuarioId, partidoId]
    );
    if (r.rows.length === 0) return res.status(404).json({ mensaje: "Pronóstico no encontrado" });
    return res.json({ mensaje: "Pronóstico eliminado" });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ mensaje: "Error eliminando pronóstico" });
  }
};

const obtenerParticipacionJornada = async (req, res) => {
  const jornadaId = Number(req.params.jornadaId);
  if (!esEnteroPositivo(jornadaId)) return res.status(400).json({ mensaje: "ID de jornada inválido" });

  try {
    const jornadaRes = await pool.query(`
      SELECT j.id, j.torneo_id, t.tipo AS torneo_tipo,
             COUNT(p.id) AS total_partidos
      FROM jornadas j
      JOIN torneos t ON t.id = j.torneo_id
      LEFT JOIN partidos p ON p.jornada_id = j.id
      WHERE j.id = $1
      GROUP BY j.id, j.torneo_id, t.tipo
    `, [jornadaId]);

    if (!jornadaRes.rows.length) return res.status(404).json({ mensaje: "Jornada no encontrada" });

    const { torneo_id, torneo_tipo, total_partidos } = jornadaRes.rows[0];
    const totalPartidosNum = Number(total_partidos);

    let jugadoresRes;
    if (torneo_tipo === "jornada") {
      jugadoresRes = await pool.query(`
        SELECT u.id, u.nombre
        FROM usuarios u
        JOIN usuarios_jornadas uj ON uj.usuario_id = u.id AND uj.jornada_id = $1
        WHERE u.activo = true
        ORDER BY u.nombre
      `, [jornadaId]);
    } else {
      jugadoresRes = await pool.query(`
        SELECT u.id, u.nombre
        FROM usuarios u
        JOIN usuarios_torneos ut ON ut.usuario_id = u.id AND ut.torneo_id = $1
        WHERE u.activo = true AND u.rol != 'admin'
        ORDER BY u.nombre
      `, [torneo_id]);
    }

    const pronosticosRes = await pool.query(`
      SELECT pr.usuario_id, COUNT(pr.partido_id) AS total
      FROM pronosticos pr
      JOIN partidos p ON p.id = pr.partido_id
      WHERE p.jornada_id = $1
      GROUP BY pr.usuario_id
    `, [jornadaId]);

    const pronosticosMap = {};
    pronosticosRes.rows.forEach(r => { pronosticosMap[r.usuario_id] = Number(r.total); });

    const jugadores = jugadoresRes.rows.map(j => ({
      usuario_id: j.id,
      nombre: j.nombre,
      pronosticos_enviados: pronosticosMap[j.id] || 0,
      total_partidos: totalPartidosNum,
      completo: totalPartidosNum > 0 && (pronosticosMap[j.id] || 0) >= totalPartidosNum
    }));

    jugadores.sort((a, b) => {
      if (a.completo !== b.completo) return b.completo - a.completo;
      return a.nombre.localeCompare(b.nombre);
    });

    return res.json({
      total_jugadores: jugadores.length,
      completaron: jugadores.filter(j => j.completo).length,
      pendientes: jugadores.filter(j => !j.completo).length,
      total_partidos: totalPartidosNum,
      jugadores
    });
  } catch (error) {
    console.error("Error obteniendo participación:", error);
    return res.status(500).json({ mensaje: "Error obteniendo participación" });
  }
};

module.exports = {
  guardarPronostico,
  obtenerPronosticosUsuario,
  guardarPronosticosJornada,
  obtenerPronosticosUsuarioPorJornada,
  obtenerHistoricoGeneralPronosticos,
  obtenerPronosticosAdmin,
  actualizarPronosticoAdmin,
  eliminarPronosticoAdmin,
  obtenerParticipacionJornada
};