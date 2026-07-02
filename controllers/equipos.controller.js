const pool = require("../config/database");

const obtenerEquipos = async (req, res) => {
  try {
    const resultado = await pool.query(
      `SELECT id, nombre, abreviacion, escudo_url, color
       FROM equipos
       ORDER BY nombre ASC`
    );
    return res.json(resultado.rows);
  } catch (error) {
    console.error("Error obteniendo equipos:", error);
    return res.status(500).json({ mensaje: "Error obteniendo equipos" });
  }
};

const crearEquipo = async (req, res) => {
  const { nombre, abreviacion, escudo_url, color } = req.body;

  if (!nombre || typeof nombre !== "string" || !nombre.trim()) {
    return res.status(400).json({ mensaje: "El nombre del equipo es requerido" });
  }

  if (color && !/^#[0-9A-Fa-f]{6}$/.test(color)) {
    return res.status(400).json({ mensaje: "El color debe ser un hex válido (#RRGGBB)" });
  }

  try {
    const resultado = await pool.query(
      `INSERT INTO equipos (nombre, abreviacion, escudo_url, color)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [
        nombre.trim(),
        abreviacion?.trim().toUpperCase() || null,
        escudo_url?.trim() || null,
        color || "#6B7280"
      ]
    );
    return res.status(201).json({ mensaje: "Equipo creado correctamente", equipo: resultado.rows[0] });
  } catch (error) {
    if (error.code === "23505") {
      return res.status(409).json({ mensaje: "Ya existe un equipo con ese nombre" });
    }
    console.error("Error creando equipo:", error);
    return res.status(500).json({ mensaje: "Error creando equipo" });
  }
};

const actualizarEquipo = async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ mensaje: "ID de equipo inválido" });
  }

  const { nombre, abreviacion, escudo_url, color } = req.body;

  if (color && !/^#[0-9A-Fa-f]{6}$/.test(color)) {
    return res.status(400).json({ mensaje: "El color debe ser un hex válido (#RRGGBB)" });
  }

  try {
    const resultado = await pool.query(
      `UPDATE equipos
       SET
         nombre      = COALESCE($1, nombre),
         abreviacion = COALESCE($2, abreviacion),
         escudo_url  = COALESCE($3, escudo_url),
         color       = COALESCE($4, color)
       WHERE id = $5
       RETURNING *`,
      [
        nombre?.trim() || null,
        abreviacion?.trim().toUpperCase() || null,
        escudo_url?.trim() || null,
        color || null,
        id
      ]
    );

    if (resultado.rows.length === 0) {
      return res.status(404).json({ mensaje: "Equipo no encontrado" });
    }

    return res.json({ mensaje: "Equipo actualizado correctamente", equipo: resultado.rows[0] });
  } catch (error) {
    if (error.code === "23505") {
      return res.status(409).json({ mensaje: "Ya existe un equipo con ese nombre" });
    }
    console.error("Error actualizando equipo:", error);
    return res.status(500).json({ mensaje: "Error actualizando equipo" });
  }
};

const eliminarEquipo = async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ mensaje: "ID de equipo inválido" });
  }

  try {
    const resultado = await pool.query(
      `DELETE FROM equipos WHERE id = $1 RETURNING id`,
      [id]
    );

    if (resultado.rows.length === 0) {
      return res.status(404).json({ mensaje: "Equipo no encontrado" });
    }

    return res.json({ mensaje: "Equipo eliminado correctamente" });
  } catch (error) {
    console.error("Error eliminando equipo:", error);
    return res.status(500).json({ mensaje: "Error eliminando equipo" });
  }
};

module.exports = { obtenerEquipos, crearEquipo, actualizarEquipo, eliminarEquipo };
