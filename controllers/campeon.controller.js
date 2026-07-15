const pool = require("../config/database");
const { resolverTorneoId } = require("../utils/torneo");

/*
====================================
UTILIDADES
====================================
*/
const normalizarEquipo = (equipo) => {
  if (!equipo || typeof equipo !== "string") return null;
  const limpio = equipo.trim();
  if (limpio.length < 2 || limpio.length > 100) return null;
  return limpio;
};

const fechaValida = (fecha) => {
  const parsed = new Date(fecha);
  return !Number.isNaN(parsed.getTime());
};

const obtenerConfigCampeon = async (torneoId) => {
  const resultado = await pool.query(
    `SELECT id, fecha_cierre, NOW() >= fecha_cierre AS bloqueado
     FROM campeon_config
     WHERE torneo_id = $1`,
    [torneoId]
  );
  return resultado.rows[0] || null;
};

/*
====================================
REGISTRAR PRONÓSTICO DE CAMPEÓN
====================================
*/
const registrarPronosticoCampeon = async (req, res) => {
  const usuarioId = req.usuario?.id;
  const equipo = normalizarEquipo(req.body.equipo);

  if (!usuarioId) {
    return res.status(401).json({ mensaje: "Usuario no autenticado" });
  }
  if (!equipo) {
    return res.status(400).json({ mensaje: "Equipo inválido" });
  }

  try {
    const torneoId = await resolverTorneoId(req.body.torneo_id);

    const config = await obtenerConfigCampeon(torneoId);
    if (!config) {
      return res.status(400).json({
        mensaje: "El administrador aún no ha configurado la fecha de cierre para campeón en este torneo"
      });
    }
    if (config.bloqueado) {
      return res.status(403).json({ mensaje: "El registro de campeón ya está cerrado" });
    }

    const campeonYaDeclarado = await pool.query(
      `SELECT id FROM campeon_real WHERE torneo_id = $1 LIMIT 1`,
      [torneoId]
    );
    if (campeonYaDeclarado.rows.length > 0) {
      return res.status(400).json({
        mensaje: "Ya no puedes registrar campeón porque el campeón real ya fue declarado"
      });
    }

    const resultado = await pool.query(
      `INSERT INTO campeon_pronosticos (usuario_id, equipo, torneo_id)
       VALUES ($1, $2, $3)
       RETURNING id, usuario_id, equipo, torneo_id, created_at`,
      [usuarioId, equipo, torneoId]
    );

    return res.status(201).json({
      mensaje: "Pronóstico de campeón registrado correctamente",
      pronostico: resultado.rows[0]
    });

  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({ mensaje: error.mensaje });
    }
    if (error.code === "23505") {
      return res.status(400).json({ mensaje: "Ya registraste tu campeón para este torneo" });
    }
    console.error("Error registrando pronóstico de campeón:", error);
    return res.status(500).json({ mensaje: "Error registrando pronóstico de campeón" });
  }
};

/*
====================================
VER MI PRONÓSTICO DE CAMPEÓN
====================================
*/
const verMiPronosticoCampeon = async (req, res) => {
  const usuarioId = req.usuario?.id;

  if (!usuarioId) {
    return res.status(401).json({ mensaje: "Usuario no autenticado" });
  }

  try {
    const torneoId = await resolverTorneoId(req.query.torneo_id);

    const resultado = await pool.query(
      `SELECT id, usuario_id, equipo, torneo_id, created_at, updated_at
       FROM campeon_pronosticos
       WHERE usuario_id = $1 AND torneo_id = $2`,
      [usuarioId, torneoId]
    );

    if (resultado.rows.length === 0) {
      return res.json({ registrado: false, pronostico: null });
    }
    return res.json({ registrado: true, pronostico: resultado.rows[0] });

  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({ mensaje: error.mensaje });
    }
    console.error("Error obteniendo mi pronóstico de campeón:", error);
    return res.status(500).json({ mensaje: "Error obteniendo mi pronóstico de campeón" });
  }
};

/*
====================================
ACTUALIZAR MI PRONÓSTICO DE CAMPEÓN
====================================
*/
const actualizarMiPronosticoCampeon = async (req, res) => {
  const usuarioId = req.usuario?.id;
  const equipo = normalizarEquipo(req.body.equipo);

  if (!usuarioId) {
    return res.status(401).json({ mensaje: "Usuario no autenticado" });
  }
  if (!equipo) {
    return res.status(400).json({ mensaje: "Equipo inválido" });
  }

  try {
    const torneoId = await resolverTorneoId(req.body.torneo_id);

    const config = await obtenerConfigCampeon(torneoId);
    if (!config) {
      return res.status(400).json({
        mensaje: "El administrador aún no ha configurado la fecha de cierre para campeón en este torneo"
      });
    }
    if (config.bloqueado) {
      return res.status(403).json({ mensaje: "La modificación de campeón ya está cerrada" });
    }

    const campeonYaDeclarado = await pool.query(
      `SELECT id FROM campeon_real WHERE torneo_id = $1 LIMIT 1`,
      [torneoId]
    );
    if (campeonYaDeclarado.rows.length > 0) {
      return res.status(400).json({
        mensaje: "Ya no puedes modificar tu campeón porque el campeón real ya fue declarado"
      });
    }

    const resultado = await pool.query(
      `UPDATE campeon_pronosticos
       SET equipo = $1, updated_at = NOW()
       WHERE usuario_id = $2 AND torneo_id = $3
       RETURNING id, usuario_id, equipo, torneo_id, created_at, updated_at`,
      [equipo, usuarioId, torneoId]
    );

    if (resultado.rows.length === 0) {
      return res.status(404).json({ mensaje: "Todavía no has registrado pronóstico de campeón para este torneo" });
    }

    return res.json({
      mensaje: "Pronóstico de campeón actualizado correctamente",
      pronostico: resultado.rows[0]
    });

  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({ mensaje: error.mensaje });
    }
    console.error("Error actualizando pronóstico de campeón:", error);
    return res.status(500).json({ mensaje: "Error actualizando pronóstico de campeón" });
  }
};

/*
====================================
DECLARAR CAMPEÓN REAL (ADMIN)
====================================
*/
const declararCampeonReal = async (req, res) => {
  const usuarioAdminId = req.usuario?.id;
  const equipo = normalizarEquipo(req.body.equipo);
  const puntos = Number(req.body.puntos ?? 10);

  if (!usuarioAdminId) {
    return res.status(401).json({ mensaje: "Usuario no autenticado" });
  }
  if (!equipo) {
    return res.status(400).json({ mensaje: "Equipo inválido" });
  }
  if (!Number.isInteger(puntos) || puntos < 0 || puntos > 100) {
    return res.status(400).json({ mensaje: "Puntos inválidos" });
  }

  try {
    const torneoId = await resolverTorneoId(req.body.torneo_id);

    const existe = await pool.query(
      `SELECT id FROM campeon_real WHERE torneo_id = $1 LIMIT 1`,
      [torneoId]
    );

    let resultado;
    if (existe.rows.length === 0) {
      resultado = await pool.query(
        `INSERT INTO campeon_real (equipo, puntos, declarado_por, torneo_id)
         VALUES ($1, $2, $3, $4)
         RETURNING id, equipo, puntos, declarado_por, torneo_id, created_at, updated_at`,
        [equipo, puntos, usuarioAdminId, torneoId]
      );
    } else {
      resultado = await pool.query(
        `UPDATE campeon_real
         SET equipo = $1, puntos = $2, declarado_por = $3, updated_at = NOW()
         WHERE id = $4
         RETURNING id, equipo, puntos, declarado_por, torneo_id, created_at, updated_at`,
        [equipo, puntos, usuarioAdminId, existe.rows[0].id]
      );
    }

    return res.json({
      mensaje: "Campeón real declarado correctamente",
      campeon: resultado.rows[0]
    });

  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({ mensaje: error.mensaje });
    }
    console.error("Error declarando campeón real:", error);
    return res.status(500).json({ mensaje: "Error declarando campeón real" });
  }
};

/*
====================================
VER CAMPEÓN REAL
====================================
*/
const verCampeonReal = async (req, res) => {
  try {
    const torneoId = await resolverTorneoId(req.query.torneo_id);

    const resultado = await pool.query(
      `SELECT id, equipo, puntos, torneo_id, created_at, updated_at
       FROM campeon_real
       WHERE torneo_id = $1
       ORDER BY id DESC LIMIT 1`,
      [torneoId]
    );

    if (resultado.rows.length === 0) {
      return res.json({ declarado: false, campeon: null });
    }
    return res.json({ declarado: true, campeon: resultado.rows[0] });

  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({ mensaje: error.mensaje });
    }
    console.error("Error obteniendo campeón real:", error);
    return res.status(500).json({ mensaje: "Error obteniendo campeón real" });
  }
};

/*
====================================
VER RESUMEN DE CAMPEÓN
====================================
*/
const verResumenCampeon = async (req, res) => {
  try {
    const torneoId = await resolverTorneoId(req.query.torneo_id);

    const resultado = await pool.query(
      `SELECT
        cp.usuario_id,
        u.nombre,
        cp.equipo AS campeon_pronosticado,
        cr.equipo AS campeon_real,
        COALESCE(cr.puntos, 0) AS puntos_disponibles,
        CASE
          WHEN cr.equipo IS NOT NULL
           AND LOWER(TRIM(cp.equipo)) = LOWER(TRIM(cr.equipo))
          THEN cr.puntos
          ELSE 0
        END AS puntos_obtenidos
      FROM campeon_pronosticos cp
      INNER JOIN usuarios u ON u.id = cp.usuario_id
      LEFT JOIN campeon_real cr ON cr.torneo_id = cp.torneo_id
      WHERE cp.torneo_id = $1
      ORDER BY puntos_obtenidos DESC, u.nombre ASC`,
      [torneoId]
    );

    return res.json(resultado.rows);

  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({ mensaje: error.mensaje });
    }
    console.error("Error obteniendo resumen de campeón:", error);
    return res.status(500).json({ mensaje: "Error obteniendo resumen de campeón" });
  }
};

/*
====================================
VER CONFIGURACIÓN DE CAMPEÓN
====================================
*/
const verConfigCampeon = async (req, res) => {
  try {
    const torneoId = await resolverTorneoId(req.query.torneo_id);
    const config = await obtenerConfigCampeon(torneoId);

    if (!config) {
      return res.json({ configurado: false, fecha_cierre: null, bloqueado: true });
    }
    return res.json({
      configurado: true,
      fecha_cierre: config.fecha_cierre,
      bloqueado: config.bloqueado
    });

  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({ mensaje: error.mensaje });
    }
    console.error("Error obteniendo configuración de campeón:", error);
    return res.status(500).json({ mensaje: "Error obteniendo configuración de campeón" });
  }
};

/*
====================================
ACTUALIZAR CONFIGURACIÓN DE CAMPEÓN (ADMIN)
====================================
*/
const actualizarConfigCampeon = async (req, res) => {
  const { fecha_cierre } = req.body;

  if (!fechaValida(fecha_cierre)) {
    return res.status(400).json({ mensaje: "Fecha de cierre inválida" });
  }

  try {
    const torneoId = await resolverTorneoId(req.body.torneo_id);

    const existe = await pool.query(
      `SELECT id FROM campeon_config WHERE torneo_id = $1`,
      [torneoId]
    );

    let resultado;
    if (existe.rows.length > 0) {
      resultado = await pool.query(
        `UPDATE campeon_config SET fecha_cierre = $1 WHERE torneo_id = $2
         RETURNING id, torneo_id, fecha_cierre`,
        [fecha_cierre, torneoId]
      );
    } else {
      resultado = await pool.query(
        `INSERT INTO campeon_config (id, torneo_id, fecha_cierre)
         OVERRIDING SYSTEM VALUE
         VALUES ((SELECT COALESCE(MAX(id), 0) + 1 FROM campeon_config), $1, $2)
         RETURNING id, torneo_id, fecha_cierre`,
        [torneoId, fecha_cierre]
      );
    }

    return res.json({
      mensaje: "Fecha de cierre de campeón actualizada correctamente",
      config: resultado.rows[0]
    });

  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({ mensaje: error.mensaje });
    }
    console.error("Error actualizando configuración de campeón:", error);
    return res.status(500).json({ mensaje: "Error actualizando configuración de campeón" });
  }
};

module.exports = {
  registrarPronosticoCampeon,
  verMiPronosticoCampeon,
  actualizarMiPronosticoCampeon,
  declararCampeonReal,
  verCampeonReal,
  verResumenCampeon,
  verConfigCampeon,
  actualizarConfigCampeon
};
