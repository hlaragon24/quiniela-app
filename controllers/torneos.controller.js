const pool = require("../config/database");

const esEnteroPositivo = (v) => {
  const n = Number(v);
  return Number.isInteger(n) && n > 0;
};

const estadosValidos = ["abierto", "finalizado"];
const tiposValidos = ["temporada", "jornada"];

/*
====================================
OBTENER TODOS LOS TORNEOS
====================================
*/
const obtenerTorneos = async (req, res) => {
  try {
    const resultado = await pool.query(`
      SELECT id, nombre, temporada, tipo, estado, activo, fecha_inicio, fecha_fin, created_at
      FROM torneos
      ORDER BY id DESC
    `);
    return res.json(resultado.rows);
  } catch (error) {
    console.error("Error obteniendo torneos:", error);
    return res.status(500).json({ mensaje: "Error obteniendo torneos" });
  }
};

/*
====================================
OBTENER TORNEO ACTIVO
====================================
*/
const obtenerTorneoActivo = async (req, res) => {
  try {
    const resultado = await pool.query(`
      SELECT id, nombre, temporada, tipo, estado, activo, fecha_inicio, fecha_fin, created_at
      FROM torneos
      WHERE activo = true
      LIMIT 1
    `);
    if (resultado.rows.length === 0) {
      return res.status(404).json({ mensaje: "No hay torneo activo" });
    }
    return res.json(resultado.rows[0]);
  } catch (error) {
    console.error("Error obteniendo torneo activo:", error);
    return res.status(500).json({ mensaje: "Error obteniendo torneo activo" });
  }
};

/*
====================================
OBTENER TORNEO POR ID
====================================
*/
const obtenerTorneoPorId = async (req, res) => {
  const id = Number(req.params.id);
  if (!esEnteroPositivo(id)) {
    return res.status(400).json({ mensaje: "ID de torneo inválido" });
  }
  try {
    const resultado = await pool.query(
      `SELECT id, nombre, temporada, estado, activo, fecha_inicio, fecha_fin, created_at
       FROM torneos WHERE id = $1`,
      [id]
    );
    if (resultado.rows.length === 0) {
      return res.status(404).json({ mensaje: "Torneo no encontrado" });
    }
    return res.json(resultado.rows[0]);
  } catch (error) {
    console.error("Error obteniendo torneo:", error);
    return res.status(500).json({ mensaje: "Error obteniendo torneo" });
  }
};

/*
====================================
CREAR TORNEO (ADMIN)
====================================
*/
const crearTorneo = async (req, res) => {
  const { nombre, temporada, fecha_inicio, fecha_fin, tipo } = req.body;

  if (!nombre || typeof nombre !== "string" || nombre.trim().length < 2) {
    return res.status(400).json({ mensaje: "Nombre de torneo inválido" });
  }
  if (tipo && !tiposValidos.includes(tipo)) {
    return res.status(400).json({ mensaje: "Tipo inválido. Valores válidos: temporada, jornada" });
  }
  if (fecha_inicio && isNaN(Date.parse(fecha_inicio))) {
    return res.status(400).json({ mensaje: "fecha_inicio inválida" });
  }
  if (fecha_fin && isNaN(Date.parse(fecha_fin))) {
    return res.status(400).json({ mensaje: "fecha_fin inválida" });
  }
  if (fecha_inicio && fecha_fin && new Date(fecha_fin) <= new Date(fecha_inicio)) {
    return res.status(400).json({ mensaje: "fecha_fin debe ser posterior a fecha_inicio" });
  }

  try {
    const resultado = await pool.query(
      `INSERT INTO torneos (nombre, temporada, fecha_inicio, fecha_fin, tipo)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [nombre.trim(), temporada || null, fecha_inicio || null, fecha_fin || null, tipo || "temporada"]
    );
    return res.status(201).json({
      mensaje: "Torneo creado correctamente",
      torneo: resultado.rows[0]
    });
  } catch (error) {
    console.error("Error creando torneo:", error);
    return res.status(500).json({ mensaje: "Error creando torneo" });
  }
};

/*
====================================
ACTUALIZAR TORNEO (ADMIN)
====================================
*/
const actualizarTorneo = async (req, res) => {
  const id = Number(req.params.id);
  if (!esEnteroPositivo(id)) {
    return res.status(400).json({ mensaje: "ID de torneo inválido" });
  }

  const { nombre, temporada, estado, fecha_inicio, fecha_fin, tipo } = req.body;

  if (nombre !== undefined && (typeof nombre !== "string" || nombre.trim().length < 2)) {
    return res.status(400).json({ mensaje: "Nombre de torneo inválido" });
  }
  if (estado !== undefined && !estadosValidos.includes(estado)) {
    return res.status(400).json({ mensaje: "Estado inválido. Valores válidos: abierto, finalizado" });
  }
  if (tipo !== undefined && !tiposValidos.includes(tipo)) {
    return res.status(400).json({ mensaje: "Tipo inválido. Valores válidos: temporada, jornada" });
  }
  if (fecha_inicio && isNaN(Date.parse(fecha_inicio))) {
    return res.status(400).json({ mensaje: "fecha_inicio inválida" });
  }
  if (fecha_fin && isNaN(Date.parse(fecha_fin))) {
    return res.status(400).json({ mensaje: "fecha_fin inválida" });
  }

  try {
    const resultado = await pool.query(
      `UPDATE torneos
       SET
         nombre       = COALESCE($1, nombre),
         temporada    = COALESCE($2, temporada),
         estado       = COALESCE($3, estado),
         fecha_inicio = COALESCE($4, fecha_inicio),
         fecha_fin    = COALESCE($5, fecha_fin),
         tipo         = COALESCE($6, tipo)
       WHERE id = $7
       RETURNING *`,
      [
        nombre ? nombre.trim() : null,
        temporada || null,
        estado || null,
        fecha_inicio || null,
        fecha_fin || null,
        tipo || null,
        id
      ]
    );
    if (resultado.rows.length === 0) {
      return res.status(404).json({ mensaje: "Torneo no encontrado" });
    }
    return res.json({ mensaje: "Torneo actualizado correctamente", torneo: resultado.rows[0] });
  } catch (error) {
    console.error("Error actualizando torneo:", error);
    return res.status(500).json({ mensaje: "Error actualizando torneo" });
  }
};

/*
====================================
ACTIVAR TORNEO (ADMIN)
====================================
Pone activo=true al torneo indicado y activo=false a todos los demás.
*/
const activarTorneo = async (req, res) => {
  const id = Number(req.params.id);
  if (!esEnteroPositivo(id)) {
    return res.status(400).json({ mensaje: "ID de torneo inválido" });
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const existe = await client.query(`SELECT id FROM torneos WHERE id = $1`, [id]);
    if (existe.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ mensaje: "Torneo no encontrado" });
    }

    await client.query(`UPDATE torneos SET activo = false`);
    await client.query(`UPDATE torneos SET activo = true WHERE id = $1`, [id]);

    await client.query("COMMIT");

    return res.json({ mensaje: "Torneo activado correctamente" });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Error activando torneo:", error);
    return res.status(500).json({ mensaje: "Error activando torneo" });
  } finally {
    client.release();
  }
};

/*
====================================
ELIMINAR TORNEO (ADMIN)
====================================
Solo se puede eliminar si no tiene jornadas asociadas.
*/
const eliminarTorneo = async (req, res) => {
  const id = Number(req.params.id);
  if (!esEnteroPositivo(id)) {
    return res.status(400).json({ mensaje: "ID de torneo inválido" });
  }

  try {
    const jornadas = await pool.query(
      `SELECT COUNT(*) AS total FROM jornadas WHERE torneo_id = $1`,
      [id]
    );
    if (Number(jornadas.rows[0].total) > 0) {
      return res.status(400).json({
        mensaje: "No se puede eliminar un torneo que tiene jornadas asociadas"
      });
    }

    const resultado = await pool.query(
      `DELETE FROM torneos WHERE id = $1 RETURNING id`,
      [id]
    );
    if (resultado.rows.length === 0) {
      return res.status(404).json({ mensaje: "Torneo no encontrado" });
    }

    return res.json({ mensaje: "Torneo eliminado correctamente" });
  } catch (error) {
    console.error("Error eliminando torneo:", error);
    return res.status(500).json({ mensaje: "Error eliminando torneo" });
  }
};

/*
====================================
MIS TORNEOS (JUGADOR AUTENTICADO)
====================================
Retorna los torneos a los que el jugador ha sido asignado.
*/
const obtenerMisTorneos = async (req, res) => {
  const usuarioId = req.usuario?.id;

  if (!usuarioId) {
    return res.status(401).json({ mensaje: "Usuario no autenticado" });
  }

  try {
    const resultado = await pool.query(
      `SELECT t.id, t.nombre, t.temporada, t.estado, t.activo, t.fecha_inicio, t.fecha_fin, t.created_at
       FROM torneos t
       INNER JOIN usuarios_torneos ut ON ut.torneo_id = t.id
       WHERE ut.usuario_id = $1
       ORDER BY t.id DESC`,
      [usuarioId]
    );
    return res.json(resultado.rows);
  } catch (error) {
    console.error("Error obteniendo mis torneos:", error);
    return res.status(500).json({ mensaje: "Error obteniendo mis torneos" });
  }
};

module.exports = {
  obtenerTorneos,
  obtenerTorneoActivo,
  obtenerTorneoPorId,
  crearTorneo,
  actualizarTorneo,
  activarTorneo,
  eliminarTorneo,
  obtenerMisTorneos
};
