const db = require("../config/database");

const validarId = (id) => {
  return !isNaN(id) && Number.isInteger(id) && id > 0;
};

const validarDatosPartido = (partido) => {
  if (
    !partido.jornada_id ||
    !partido.local ||
    !partido.visitante
  ) {
    return false;
  }

  return true;
};

/*
====================================
OBTENER PARTIDOS POR JORNADA
====================================
*/
const obtenerPartidosPorJornada = async (req, res) => {
  const jornadaId = Number(req.params.jornadaId);

  if (!validarId(jornadaId)) {
    return res.status(400).json({
      mensaje: "ID de jornada inválido"
    });
  }

  try {
    const resultado = await db.query(
      `
      SELECT
        p.*,
        el.escudo_url  AS escudo_local,
        el.abreviacion AS abrev_local,
        el.color       AS color_local,
        ev.escudo_url  AS escudo_visitante,
        ev.abreviacion AS abrev_visitante,
        ev.color       AS color_visitante
      FROM partidos p
      LEFT JOIN equipos el ON LOWER(TRIM(el.nombre)) = LOWER(TRIM(p.local))
      LEFT JOIN equipos ev ON LOWER(TRIM(ev.nombre)) = LOWER(TRIM(p.visitante))
      WHERE p.jornada_id = $1
      ORDER BY p.id
      `,
      [jornadaId]
    );

    return res.json(resultado.rows);
  } catch (error) {
    console.error("Error obtenerPartidosPorJornada:", error);

    return res.status(500).json({
      mensaje: "Error al obtener partidos"
    });
  }
};

/*
====================================
CREAR PARTIDO
====================================
*/
const crearPartido = async (req, res) => {
  const {
    jornada_id,
    local,
    visitante,
    es_comodin = false
  } = req.body;

  if (!validarDatosPartido(req.body)) {
    return res.status(400).json({
      mensaje: "Todos los campos obligatorios del partido son requeridos"
    });
  }

  if (!validarId(Number(jornada_id))) {
    return res.status(400).json({
      mensaje: "ID de jornada inválido"
    });
  }

  try {
    const resultado = await db.query(
      `
      INSERT INTO partidos
        (jornada_id, local, visitante, es_comodin)
      VALUES
        ($1, $2, $3, $4)
      RETURNING *
      `,
      [
        Number(jornada_id),
        local.trim(),
        visitante.trim(),
        Boolean(es_comodin)
      ]
    );

    return res.status(201).json({
      mensaje: "Partido creado correctamente",
      partido: resultado.rows[0]
    });
  } catch (error) {
    console.error("Error crearPartido:", error);

    return res.status(500).json({
      mensaje: "Error al crear partido",
      detalle: error.message
    });
  }
};

/*
====================================
CREAR PARTIDOS EN LOTE
====================================
*/
const crearPartidosLote = async (req, res) => {
  const partidos = req.body;

  if (!Array.isArray(partidos) || partidos.length === 0) {
    return res.status(400).json({
      mensaje: "Debes enviar una lista de partidos"
    });
  }

  for (const partido of partidos) {
    if (!validarDatosPartido(partido)) {
      return res.status(400).json({
        mensaje: "Todos los partidos deben tener jornada_id, local y visitante"
      });
    }

    if (!validarId(Number(partido.jornada_id))) {
      return res.status(400).json({
        mensaje: "Uno o más partidos tienen ID de jornada inválido"
      });
    }
  }

  const client = await db.connect();

  try {
    await client.query("BEGIN");

    for (const partido of partidos) {
      await client.query(
        `
        INSERT INTO partidos
          (jornada_id, local, visitante, es_comodin)
        VALUES
          ($1, $2, $3, $4)
        `,
        [
          Number(partido.jornada_id),
          partido.local.trim(),
          partido.visitante.trim(),
          Boolean(partido.es_comodin)
        ]
      );
    }

    await client.query("COMMIT");

    return res.status(201).json({
      mensaje: "Partidos creados correctamente",
      total: partidos.length
    });
  } catch (error) {
    await client.query("ROLLBACK");

    console.error("Error crearPartidosLote:", error);

    return res.status(500).json({
      mensaje: "Error al crear partidos en lote"
    });
  } finally {
    client.release();
  }
};

/*
====================================
EDITAR PARTIDO
====================================
*/
const editarPartido = async (req, res) => {
  const id = Number(req.params.id);

  const {
    jornada_id,
    local,
    visitante,
    es_comodin = false
  } = req.body;

  if (!validarId(id)) {
    return res.status(400).json({
      mensaje: "ID de partido inválido"
    });
  }

  if (!validarDatosPartido(req.body)) {
    return res.status(400).json({
      mensaje: "Todos los campos obligatorios del partido son requeridos"
    });
  }

  if (!validarId(Number(jornada_id))) {
    return res.status(400).json({
      mensaje: "ID de jornada inválido"
    });
  }

  try {
    const resultado = await db.query(
      `
      UPDATE partidos
      SET
        jornada_id = $1,
        local = $2,
        visitante = $3,
        es_comodin = $4
      WHERE id = $5
      RETURNING *
      `,
      [
        Number(jornada_id),
        local.trim(),
        visitante.trim(),
        Boolean(es_comodin),
        id
      ]
    );

    if (resultado.rows.length === 0) {
      return res.status(404).json({
        mensaje: "Partido no encontrado"
      });
    }

    return res.json({
      mensaje: "Partido actualizado correctamente",
      partido: resultado.rows[0]
    });
  } catch (error) {
    console.error("Error editarPartido:", error);

    return res.status(500).json({
      mensaje: "Error editando partido"
    });
  }
};

/*
====================================
ELIMINAR PARTIDO
====================================
*/
const eliminarPartido = async (req, res) => {
  const id = Number(req.params.id);

  if (!validarId(id)) {
    return res.status(400).json({
      mensaje: "ID de partido inválido"
    });
  }

  try {
    const resultado = await db.query(
      `
      DELETE FROM partidos
      WHERE id = $1
      RETURNING id
      `,
      [id]
    );

    if (resultado.rows.length === 0) {
      return res.status(404).json({
        mensaje: "Partido no encontrado"
      });
    }

    return res.json({
      mensaje: "Partido eliminado correctamente"
    });
  } catch (error) {
    console.error("Error eliminarPartido:", error);

    return res.status(500).json({
      mensaje: "Error eliminando partido"
    });
  }
};

/*
====================================
OBTENER TODOS LOS PARTIDOS ADMIN
====================================
*/
const obtenerTodosPartidos = async (req, res) => {
  try {
    const resultado = await db.query(
      `
      SELECT
        p.*,
        el.escudo_url  AS escudo_local,
        el.abreviacion AS abrev_local,
        el.color       AS color_local,
        ev.escudo_url  AS escudo_visitante,
        ev.abreviacion AS abrev_visitante,
        ev.color       AS color_visitante
      FROM partidos p
      LEFT JOIN equipos el ON LOWER(TRIM(el.nombre)) = LOWER(TRIM(p.local))
      LEFT JOIN equipos ev ON LOWER(TRIM(ev.nombre)) = LOWER(TRIM(p.visitante))
      ORDER BY p.jornada_id, p.id
      `
    );

    return res.json(resultado.rows);
  } catch (error) {
    console.error("Error obtenerTodosPartidos:", error);

    return res.status(500).json({
      mensaje: "Error obteniendo partidos"
    });
  }
};

module.exports = {
  obtenerTodosPartidos,
  obtenerPartidosPorJornada,
  crearPartido,
  crearPartidosLote,
  editarPartido,
  eliminarPartido
};