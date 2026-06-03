const pool = require("../config/database");

const normalizarEquipo = (equipo) => {
  if (!equipo || typeof equipo !== "string") return null;

  const limpio = equipo.trim();

  if (limpio.length < 2 || limpio.length > 100) return null;

  return limpio;
};

/*
====================================
REGISTRAR PRONÓSTICO DE CAMPEÓN
Un usuario solo puede registrar uno
====================================
*/
const registrarPronosticoCampeon = async (req, res) => {
  const usuarioId = req.usuario?.id;
  const equipo = normalizarEquipo(req.body.equipo);

  if (!usuarioId) {
    return res.status(401).json({
      mensaje: "Usuario no autenticado"
    });
  }

  if (!equipo) {
    return res.status(400).json({
      mensaje: "Equipo inválido"
    });
  }

  try {
    const campeonYaDeclarado = await pool.query(`
      SELECT id
      FROM campeon_real
      LIMIT 1
    `);

    if (campeonYaDeclarado.rows.length > 0) {
      return res.status(400).json({
        mensaje: "Ya no puedes registrar campeón porque el campeón real ya fue declarado"
      });
    }

    const resultado = await pool.query(
      `
      INSERT INTO campeon_pronosticos (
        usuario_id,
        equipo
      )
      VALUES ($1, $2)
      RETURNING
        id,
        usuario_id,
        equipo,
        created_at
      `,
      [usuarioId, equipo]
    );

    return res.status(201).json({
      mensaje: "Pronóstico de campeón registrado correctamente",
      pronostico: resultado.rows[0]
    });

  } catch (error) {
    if (error.code === "23505") {
      return res.status(400).json({
        mensaje: "Ya registraste tu campeón"
      });
    }

    console.error("Error registrando pronóstico de campeón:", error);

    return res.status(500).json({
      mensaje: "Error registrando pronóstico de campeón"
    });
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
    return res.status(401).json({
      mensaje: "Usuario no autenticado"
    });
  }

  try {
    const resultado = await pool.query(
      `
      SELECT
        id,
        usuario_id,
        equipo,
        created_at,
        updated_at
      FROM campeon_pronosticos
      WHERE usuario_id = $1
      `,
      [usuarioId]
    );

    if (resultado.rows.length === 0) {
      return res.json({
        registrado: false,
        pronostico: null
      });
    }

    return res.json({
      registrado: true,
      pronostico: resultado.rows[0]
    });

  } catch (error) {
    console.error("Error obteniendo mi pronóstico de campeón:", error);

    return res.status(500).json({
      mensaje: "Error obteniendo mi pronóstico de campeón"
    });
  }
};

/*
====================================
ACTUALIZAR MI PRONÓSTICO DE CAMPEÓN
Solo antes de declarar campeón real
====================================
*/
const actualizarMiPronosticoCampeon = async (req, res) => {
  const usuarioId = req.usuario?.id;
  const equipo = normalizarEquipo(req.body.equipo);

  if (!usuarioId) {
    return res.status(401).json({
      mensaje: "Usuario no autenticado"
    });
  }

  if (!equipo) {
    return res.status(400).json({
      mensaje: "Equipo inválido"
    });
  }

  try {
    const campeonYaDeclarado = await pool.query(`
      SELECT id
      FROM campeon_real
      LIMIT 1
    `);

    if (campeonYaDeclarado.rows.length > 0) {
      return res.status(400).json({
        mensaje: "Ya no puedes modificar tu campeón porque el campeón real ya fue declarado"
      });
    }

    const resultado = await pool.query(
      `
      UPDATE campeon_pronosticos
      SET
        equipo = $1,
        updated_at = NOW()
      WHERE usuario_id = $2
      RETURNING
        id,
        usuario_id,
        equipo,
        created_at,
        updated_at
      `,
      [equipo, usuarioId]
    );

    if (resultado.rows.length === 0) {
      return res.status(404).json({
        mensaje: "Todavía no has registrado pronóstico de campeón"
      });
    }

    return res.json({
      mensaje: "Pronóstico de campeón actualizado correctamente",
      pronostico: resultado.rows[0]
    });

  } catch (error) {
    console.error("Error actualizando pronóstico de campeón:", error);

    return res.status(500).json({
      mensaje: "Error actualizando pronóstico de campeón"
    });
  }
};

/*
====================================
DECLARAR CAMPEÓN REAL
Solo admin
====================================
*/
const declararCampeonReal = async (req, res) => {
  const usuarioAdminId = req.usuario?.id;
  const equipo = normalizarEquipo(req.body.equipo);
  const puntos = Number(req.body.puntos ?? 10);

  if (!usuarioAdminId) {
    return res.status(401).json({
      mensaje: "Usuario no autenticado"
    });
  }

  if (!equipo) {
    return res.status(400).json({
      mensaje: "Equipo inválido"
    });
  }

  if (!Number.isInteger(puntos) || puntos < 0 || puntos > 100) {
    return res.status(400).json({
      mensaje: "Puntos inválidos"
    });
  }

  try {
    const existe = await pool.query(`
      SELECT id
      FROM campeon_real
      LIMIT 1
    `);

    let resultado;

    if (existe.rows.length === 0) {
      resultado = await pool.query(
        `
        INSERT INTO campeon_real (
          equipo,
          puntos,
          declarado_por
        )
        VALUES ($1, $2, $3)
        RETURNING
          id,
          equipo,
          puntos,
          declarado_por,
          created_at,
          updated_at
        `,
        [equipo, puntos, usuarioAdminId]
      );
    } else {
      resultado = await pool.query(
        `
        UPDATE campeon_real
        SET
          equipo = $1,
          puntos = $2,
          declarado_por = $3,
          updated_at = NOW()
        WHERE id = $4
        RETURNING
          id,
          equipo,
          puntos,
          declarado_por,
          created_at,
          updated_at
        `,
        [equipo, puntos, usuarioAdminId, existe.rows[0].id]
      );
    }

    return res.json({
      mensaje: "Campeón real declarado correctamente",
      campeon: resultado.rows[0]
    });

  } catch (error) {
    console.error("Error declarando campeón real:", error);

    return res.status(500).json({
      mensaje: "Error declarando campeón real"
    });
  }
};

/*
====================================
VER CAMPEÓN REAL
Público
====================================
*/
const verCampeonReal = async (req, res) => {
  try {
    const resultado = await pool.query(`
      SELECT
        id,
        equipo,
        puntos,
        created_at,
        updated_at
      FROM campeon_real
      ORDER BY id DESC
      LIMIT 1
    `);

    if (resultado.rows.length === 0) {
      return res.json({
        declarado: false,
        campeon: null
      });
    }

    return res.json({
      declarado: true,
      campeon: resultado.rows[0]
    });

  } catch (error) {
    console.error("Error obteniendo campeón real:", error);

    return res.status(500).json({
      mensaje: "Error obteniendo campeón real"
    });
  }
};

/*
====================================
VER RESUMEN DE CAMPEÓN
Admin / ranking / dashboard
====================================
*/
const verResumenCampeon = async (req, res) => {
  try {
    const resultado = await pool.query(`
      SELECT
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
      INNER JOIN usuarios u
        ON u.id = cp.usuario_id
      LEFT JOIN campeon_real cr
        ON TRUE
      ORDER BY
        puntos_obtenidos DESC,
        u.nombre ASC
    `);

    return res.json(resultado.rows);

  } catch (error) {
    console.error("Error obteniendo resumen de campeón:", error);

    return res.status(500).json({
      mensaje: "Error obteniendo resumen de campeón"
    });
  }
};

module.exports = {
  registrarPronosticoCampeon,
  verMiPronosticoCampeon,
  actualizarMiPronosticoCampeon,
  declararCampeonReal,
  verCampeonReal,
  verResumenCampeon
};