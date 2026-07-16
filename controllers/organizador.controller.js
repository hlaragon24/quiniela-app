const bcrypt = require("bcryptjs");
const pool = require("../config/database");
const { tieneAccesoTorneo } = require("../middleware/organizer.middleware");

const esEnteroPositivo = (v) => {
  const n = Number(v);
  return Number.isInteger(n) && n > 0;
};

const validarEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

// ── GET /organizador/torneos/:torneoId/jugadores ──────────────────────────
const listarJugadores = async (req, res) => {
  const torneoId = Number(req.params.torneoId);
  if (!esEnteroPositivo(torneoId)) return res.status(400).json({ mensaje: "ID de torneo inválido" });

  if (req.usuario.rol !== "admin") {
    const ok = await tieneAccesoTorneo(req.usuario.id, torneoId);
    if (!ok) return res.status(403).json({ mensaje: "Sin acceso a este torneo" });
  }

  try {
    const r = await pool.query(`
      SELECT u.id, u.nombre, u.email, u.activo, u.rol, ut.created_at AS asignado_en
      FROM usuarios u
      JOIN usuarios_torneos ut ON ut.usuario_id = u.id AND ut.torneo_id = $1
      ORDER BY u.nombre ASC
    `, [torneoId]);
    return res.json(r.rows);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ mensaje: "Error listando jugadores" });
  }
};

// ── POST /organizador/torneos/:torneoId/jugadores — crear y asignar ───────
const crearJugador = async (req, res) => {
  const torneoId = Number(req.params.torneoId);
  if (!esEnteroPositivo(torneoId)) return res.status(400).json({ mensaje: "ID de torneo inválido" });

  if (req.usuario.rol !== "admin") {
    const ok = await tieneAccesoTorneo(req.usuario.id, torneoId);
    if (!ok) return res.status(403).json({ mensaje: "Sin acceso a este torneo" });
  }

  const { nombre, email, password } = req.body;
  if (!nombre?.trim() || !email?.trim() || !password) {
    return res.status(400).json({ mensaje: "nombre, email y password son obligatorios" });
  }
  const emailNorm = email.trim().toLowerCase();
  if (!validarEmail(emailNorm)) return res.status(400).json({ mensaje: "Email inválido" });
  if (password.length < 6) return res.status(400).json({ mensaje: "La contraseña debe tener al menos 6 caracteres" });

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const existe = await client.query(`SELECT id FROM usuarios WHERE email = $1`, [emailNorm]);
    let usuarioId;

    if (existe.rows.length > 0) {
      usuarioId = existe.rows[0].id;
    } else {
      const hash = await bcrypt.hash(password, 10);
      const nuevo = await client.query(
        `INSERT INTO usuarios (nombre, email, password, rol, activo) VALUES ($1, $2, $3, 'jugador', true) RETURNING id`,
        [nombre.trim(), emailNorm, hash]
      );
      usuarioId = nuevo.rows[0].id;
    }

    await client.query(
      `INSERT INTO usuarios_torneos (usuario_id, torneo_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
      [usuarioId, torneoId]
    );

    await client.query("COMMIT");
    return res.status(201).json({ mensaje: "Jugador agregado correctamente", usuario_id: usuarioId });
  } catch (e) {
    await client.query("ROLLBACK");
    if (e.code === "23505") return res.status(400).json({ mensaje: "El email ya está en uso" });
    console.error(e);
    return res.status(500).json({ mensaje: "Error creando jugador" });
  } finally {
    client.release();
  }
};

// ── DELETE /organizador/torneos/:torneoId/jugadores/:usuarioId ────────────
const removerJugador = async (req, res) => {
  const torneoId = Number(req.params.torneoId);
  const usuarioId = Number(req.params.usuarioId);
  if (!esEnteroPositivo(torneoId) || !esEnteroPositivo(usuarioId)) {
    return res.status(400).json({ mensaje: "IDs inválidos" });
  }

  if (req.usuario.rol !== "admin") {
    const ok = await tieneAccesoTorneo(req.usuario.id, torneoId);
    if (!ok) return res.status(403).json({ mensaje: "Sin acceso a este torneo" });
  }

  try {
    const r = await pool.query(
      `DELETE FROM usuarios_torneos WHERE usuario_id = $1 AND torneo_id = $2 RETURNING id`,
      [usuarioId, torneoId]
    );
    if (r.rows.length === 0) return res.status(404).json({ mensaje: "El jugador no estaba asignado a este torneo" });
    return res.json({ mensaje: "Jugador removido del torneo" });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ mensaje: "Error removiendo jugador" });
  }
};

// ── PUT /organizador/torneos/:torneoId/jugadores/:usuarioId/password ──────
const resetearPasswordJugador = async (req, res) => {
  const torneoId = Number(req.params.torneoId);
  const usuarioId = Number(req.params.usuarioId);
  const { password } = req.body;

  if (!esEnteroPositivo(torneoId) || !esEnteroPositivo(usuarioId)) {
    return res.status(400).json({ mensaje: "IDs inválidos" });
  }
  if (!password || password.length < 6) {
    return res.status(400).json({ mensaje: "La contraseña debe tener al menos 6 caracteres" });
  }

  if (req.usuario.rol !== "admin") {
    const ok = await tieneAccesoTorneo(req.usuario.id, torneoId);
    if (!ok) return res.status(403).json({ mensaje: "Sin acceso a este torneo" });

    const asignado = await pool.query(
      `SELECT 1 FROM usuarios_torneos WHERE usuario_id = $1 AND torneo_id = $2`,
      [usuarioId, torneoId]
    );
    if (asignado.rows.length === 0) return res.status(403).json({ mensaje: "El jugador no pertenece a tu torneo" });
  }

  try {
    const hash = await bcrypt.hash(password, 10);
    await pool.query(`UPDATE usuarios SET password = $1, updated_at = NOW() WHERE id = $2`, [hash, usuarioId]);
    return res.json({ mensaje: "Contraseña actualizada correctamente" });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ mensaje: "Error actualizando contraseña" });
  }
};

// ── GET /organizador/torneos/:torneoId/organizadores (solo admin) ─────────
const listarOrganizadores = async (req, res) => {
  const torneoId = Number(req.params.torneoId);
  if (!esEnteroPositivo(torneoId)) return res.status(400).json({ mensaje: "ID de torneo inválido" });

  try {
    const r = await pool.query(`
      SELECT u.id, u.nombre, u.email, torg.created_at AS asignado_en
      FROM usuarios u
      JOIN torneos_organizadores torg ON torg.usuario_id = u.id AND torg.torneo_id = $1
      ORDER BY u.nombre
    `, [torneoId]);
    return res.json(r.rows);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ mensaje: "Error listando organizadores" });
  }
};

// ── POST /organizador/torneos/:torneoId/organizadores/:usuarioId ──────────
const asignarOrganizador = async (req, res) => {
  const torneoId = Number(req.params.torneoId);
  const usuarioId = Number(req.params.usuarioId);
  if (!esEnteroPositivo(torneoId) || !esEnteroPositivo(usuarioId)) {
    return res.status(400).json({ mensaje: "IDs inválidos" });
  }

  try {
    const uRes = await pool.query(`SELECT rol FROM usuarios WHERE id = $1`, [usuarioId]);
    if (uRes.rows.length === 0) return res.status(404).json({ mensaje: "Usuario no encontrado" });
    if (uRes.rows[0].rol !== "organizer") {
      return res.status(400).json({ mensaje: "El usuario debe tener rol organizer" });
    }

    await pool.query(
      `INSERT INTO torneos_organizadores (torneo_id, usuario_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
      [torneoId, usuarioId]
    );
    return res.status(201).json({ mensaje: "Organizador asignado correctamente" });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ mensaje: "Error asignando organizador" });
  }
};

// ── DELETE /organizador/torneos/:torneoId/organizadores/:usuarioId ────────
const removerOrganizador = async (req, res) => {
  const torneoId = Number(req.params.torneoId);
  const usuarioId = Number(req.params.usuarioId);
  if (!esEnteroPositivo(torneoId) || !esEnteroPositivo(usuarioId)) {
    return res.status(400).json({ mensaje: "IDs inválidos" });
  }

  try {
    const r = await pool.query(
      `DELETE FROM torneos_organizadores WHERE torneo_id = $1 AND usuario_id = $2 RETURNING id`,
      [torneoId, usuarioId]
    );
    if (r.rows.length === 0) return res.status(404).json({ mensaje: "El organizador no estaba asignado a ese torneo" });
    return res.json({ mensaje: "Organizador removido" });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ mensaje: "Error removiendo organizador" });
  }
};

module.exports = {
  listarJugadores,
  crearJugador,
  removerJugador,
  resetearPasswordJugador,
  listarOrganizadores,
  asignarOrganizador,
  removerOrganizador,
};
