const pool = require("../config/database");

// ── Helpers de acceso ────────────────────────────────────────────────────

const tieneAccesoJornada = async (usuarioId, jornadaId) => {
  const r = await pool.query(
    `SELECT 1 FROM torneos_organizadores torg
     JOIN jornadas j ON j.torneo_id = torg.torneo_id
     WHERE torg.usuario_id = $1 AND j.id = $2`,
    [usuarioId, jornadaId]
  );
  return r.rows.length > 0;
};

const tieneAccesoPartido = async (usuarioId, partidoId) => {
  const r = await pool.query(
    `SELECT 1 FROM torneos_organizadores torg
     JOIN jornadas j ON j.torneo_id = torg.torneo_id
     JOIN partidos p ON p.jornada_id = j.id
     WHERE torg.usuario_id = $1 AND p.id = $2`,
    [usuarioId, partidoId]
  );
  return r.rows.length > 0;
};

const tieneAccesoTorneo = async (usuarioId, torneoId) => {
  const r = await pool.query(
    `SELECT 1 FROM torneos_organizadores WHERE usuario_id = $1 AND torneo_id = $2`,
    [usuarioId, torneoId]
  );
  return r.rows.length > 0;
};

// ── Middleware: admin o organizer con acceso a resultado (por partido_id) ──

const adminOOrganizadorPorPartido = async (req, res, next) => {
  if (!req.usuario) return res.status(401).json({ mensaje: "No autenticado" });
  if (req.usuario.rol === "admin") return next();
  if (req.usuario.rol !== "organizer") return res.status(403).json({ mensaje: "Acceso denegado" });

  const partidoId = Number(req.params.partidoId);
  if (!partidoId) return res.status(400).json({ mensaje: "partidoId requerido" });

  try {
    const ok = await tieneAccesoPartido(req.usuario.id, partidoId);
    if (!ok) return res.status(403).json({ mensaje: "Sin acceso a este torneo" });
    next();
  } catch (e) {
    console.error(e);
    return res.status(500).json({ mensaje: "Error verificando acceso" });
  }
};

// ── Middleware: admin o organizer con acceso a jornada (por jornadaId param) ──

const adminOOrganizadorPorJornada = async (req, res, next) => {
  if (!req.usuario) return res.status(401).json({ mensaje: "No autenticado" });
  if (req.usuario.rol === "admin") return next();
  if (req.usuario.rol !== "organizer") return res.status(403).json({ mensaje: "Acceso denegado" });

  const jornadaId = Number(req.params.jornadaId);
  if (!jornadaId) return res.status(400).json({ mensaje: "jornadaId requerido" });

  try {
    const ok = await tieneAccesoJornada(req.usuario.id, jornadaId);
    if (!ok) return res.status(403).json({ mensaje: "Sin acceso a esta jornada" });
    next();
  } catch (e) {
    console.error(e);
    return res.status(500).json({ mensaje: "Error verificando acceso" });
  }
};

// ── Middleware: admin o organizer (sin verificar recurso específico) ──

const adminOOrganizador = (req, res, next) => {
  if (!req.usuario) return res.status(401).json({ mensaje: "No autenticado" });
  if (req.usuario.rol === "admin" || req.usuario.rol === "organizer") return next();
  return res.status(403).json({ mensaje: "Acceso denegado" });
};

module.exports = {
  tieneAccesoJornada,
  tieneAccesoPartido,
  tieneAccesoTorneo,
  adminOOrganizadorPorPartido,
  adminOOrganizadorPorJornada,
  adminOOrganizador,
};
