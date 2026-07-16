const bcrypt = require("bcryptjs");
const pool = require("../config/database");

const rolesValidos = ["admin", "jugador", "organizer"];

const validarId = (id) => {
  return !isNaN(id) && Number.isInteger(id) && id > 0;
};

const validarEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

const obtenerUsuarios = async (req, res) => {
  try {
    const resultado = await pool.query(`
      SELECT
        id,
        nombre,
        email,
        rol,
        activo,
        created_at,
        updated_at
      FROM usuarios
      ORDER BY id ASC
    `);

    return res.json(resultado.rows);
  } catch (error) {
    console.error("Error obteniendo usuarios:", error);

    return res.status(500).json({
      mensaje: "Error obteniendo usuarios"
    });
  }
};

const actualizarRolUsuario = async (req, res) => {
  const id = Number(req.params.id);
  const { rol } = req.body;

  if (!validarId(id)) {
    return res.status(400).json({
      mensaje: "ID inválido"
    });
  }

  if (!rolesValidos.includes(rol)) {
    return res.status(400).json({
      mensaje: "Rol inválido"
    });
  }

  if (req.usuario.id === id && rol !== "admin") {
    return res.status(400).json({
      mensaje: "No puedes quitarte el rol de administrador"
    });
  }

  try {
    const resultado = await pool.query(
      `
      UPDATE usuarios
      SET rol = $1, updated_at = NOW()
      WHERE id = $2
      RETURNING id, nombre, email, rol, activo
      `,
      [rol, id]
    );

    if (resultado.rows.length === 0) {
      return res.status(404).json({
        mensaje: "Usuario no encontrado"
      });
    }

    return res.json({
      mensaje: "Rol actualizado correctamente",
      usuario: resultado.rows[0]
    });
  } catch (error) {
    console.error("Error actualizando rol:", error);

    return res.status(500).json({
      mensaje: "Error actualizando rol"
    });
  }
};

const actualizarEstadoUsuario = async (req, res) => {
  const id = Number(req.params.id);
  const { activo } = req.body;

  if (!validarId(id)) {
    return res.status(400).json({
      mensaje: "ID inválido"
    });
  }

  if (typeof activo !== "boolean") {
    return res.status(400).json({
      mensaje: "Estado inválido"
    });
  }

  if (req.usuario.id === id && activo === false) {
    return res.status(400).json({
      mensaje: "No puedes desactivar tu propio usuario"
    });
  }

  try {
    const resultado = await pool.query(
      `
      UPDATE usuarios
      SET activo = $1, updated_at = NOW()
      WHERE id = $2
      RETURNING id, nombre, email, rol, activo
      `,
      [activo, id]
    );

    if (resultado.rows.length === 0) {
      return res.status(404).json({
        mensaje: "Usuario no encontrado"
      });
    }

    return res.json({
      mensaje: activo ? "Usuario activado" : "Usuario desactivado",
      usuario: resultado.rows[0]
    });
  } catch (error) {
    console.error("Error actualizando estado:", error);

    return res.status(500).json({
      mensaje: "Error actualizando estado"
    });
  }
};

const resetearPasswordUsuario = async (req, res) => {
  const id = Number(req.params.id);
  const { password } = req.body;

  if (!validarId(id)) {
    return res.status(400).json({
      mensaje: "ID inválido"
    });
  }

  if (!password || password.length < 6) {
    return res.status(400).json({
      mensaje: "La contraseña debe tener al menos 6 caracteres"
    });
  }

  try {
    const passwordHash = await bcrypt.hash(password, 10);

    const resultado = await pool.query(
      `
      UPDATE usuarios
      SET password = $1, updated_at = NOW()
      WHERE id = $2
      RETURNING id, nombre, email, rol, activo
      `,
      [passwordHash, id]
    );

    if (resultado.rows.length === 0) {
      return res.status(404).json({
        mensaje: "Usuario no encontrado"
      });
    }

    return res.json({
      mensaje: "Contraseña actualizada correctamente"
    });
  } catch (error) {
    console.error("Error reseteando contraseña:", error);

    return res.status(500).json({
      mensaje: "Error reseteando contraseña"
    });
  }
};

const editarDatosUsuario = async (req, res) => {
  const id = Number(req.params.id);
  const { nombre, email } = req.body;
  if (!validarId(id)) return res.status(400).json({ mensaje: "ID inválido" });
  if (!nombre?.trim() && !email?.trim()) return res.status(400).json({ mensaje: "Envía nombre o email" });
  if (email && !validarEmail(email.trim())) return res.status(400).json({ mensaje: "Email inválido" });
  try {
    const resultado = await pool.query(
      `UPDATE usuarios SET
         nombre = COALESCE($1, nombre),
         email  = COALESCE($2, email)
       WHERE id = $3 RETURNING id, nombre, email`,
      [nombre?.trim() || null, email?.trim().toLowerCase() || null, id]
    );
    if (resultado.rows.length === 0) return res.status(404).json({ mensaje: "Usuario no encontrado" });
    return res.json({ mensaje: "Usuario actualizado", usuario: resultado.rows[0] });
  } catch (error) {
    if (error.code === "23505") return res.status(400).json({ mensaje: "El email ya está en uso" });
    console.error(error);
    return res.status(500).json({ mensaje: "Error actualizando usuario" });
  }
};

const crearUsuario = async (req, res) => {
  const { nombre, email, password, rol } = req.body;

  if (!nombre || !email || !password || !rol) {
    return res.status(400).json({
      mensaje: "Todos los campos son obligatorios"
    });
  }

  const emailNormalizado = email.trim().toLowerCase();

  if (!validarEmail(emailNormalizado)) {
    return res.status(400).json({
      mensaje: "Email inválido"
    });
  }

  if (!rolesValidos.includes(rol)) {
    return res.status(400).json({
      mensaje: "Rol inválido"
    });
  }

  if (password.length < 6) {
    return res.status(400).json({
      mensaje: "La contraseña debe tener al menos 6 caracteres"
    });
  }

  try {
    const existe = await pool.query(
      "SELECT id FROM usuarios WHERE email = $1",
      [emailNormalizado]
    );

    if (existe.rows.length > 0) {
      return res.status(400).json({
        mensaje: "Ya existe un usuario con ese email"
      });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const resultado = await pool.query(
      `
      INSERT INTO usuarios
        (nombre, email, password, rol, activo)
      VALUES
        ($1, $2, $3, $4, true)
      RETURNING id, nombre, email, rol, activo
      `,
      [nombre.trim(), emailNormalizado, passwordHash, rol]
    );

    return res.status(201).json({
      mensaje: "Usuario creado correctamente",
      usuario: resultado.rows[0]
    });
  } catch (error) {
    console.error("Error creando usuario:", error);

    return res.status(500).json({
      mensaje: "Error creando usuario"
    });
  }
};

const obtenerPerfilUsuario = async (req, res) => {
  const usuarioId = req.usuario.id;
  const torneoId = req.query.torneo_id ? Number(req.query.torneo_id) : null;

  try {
    const usuario = await pool.query(
      `SELECT id, nombre, email, created_at FROM usuarios WHERE id = $1`,
      [usuarioId]
    );

    if (usuario.rows.length === 0) {
      return res.status(404).json({ mensaje: "Usuario no encontrado" });
    }

    const torneoFiltro = torneoId
      ? `AND j.torneo_id = ${torneoId}`
      : "";

    const estadisticas = await pool.query(
      `
      SELECT
        COUNT(pr.id) AS pronosticos_realizados,

        COALESCE(SUM(CASE WHEN pr.puntos > 0 THEN 1 ELSE 0 END), 0) AS aciertos,

        COALESCE(SUM(CASE WHEN pr.puntos >= 2 THEN 1 ELSE 0 END), 0) AS marcadores_exactos,

        COALESCE(SUM(pr.puntos), 0) AS puntos_totales,

        COUNT(DISTINCT p.jornada_id) AS jornadas_jugadas

      FROM pronosticos pr
      JOIN partidos p ON p.id = pr.partido_id
      JOIN jornadas j ON j.id = p.jornada_id
      WHERE pr.usuario_id = $1
      ${torneoFiltro}
      `,
      [usuarioId]
    );

    const stats = estadisticas.rows[0];
    const pronosticosRealizados = Number(stats.pronosticos_realizados);
    const aciertos = Number(stats.aciertos);
    const efectividad = pronosticosRealizados > 0
      ? Math.round((aciertos / pronosticosRealizados) * 100)
      : 0;

    return res.json({
      ...usuario.rows[0],
      pronosticosRealizados,
      aciertos,
      marcadoresExactos: Number(stats.marcadores_exactos),
      puntosTotales: Number(stats.puntos_totales),
      jornadasJugadas: Number(stats.jornadas_jugadas),
      efectividad
    });

  } catch (error) {
    console.error(error);
    return res.status(500).json({ mensaje: "Error obteniendo perfil" });
  }
};

const cambiarMiPassword = async (req, res) => {
  const usuarioId = req.usuario.id;
  const { passwordActual, passwordNuevo } = req.body;

  if (!passwordActual || !passwordNuevo) {
    return res.status(400).json({ mensaje: "Debes enviar la contraseña actual y la nueva" });
  }

  if (passwordNuevo.length < 6) {
    return res.status(400).json({ mensaje: "La nueva contraseña debe tener al menos 6 caracteres" });
  }

  try {
    const result = await pool.query(
      `SELECT password FROM usuarios WHERE id = $1`,
      [usuarioId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ mensaje: "Usuario no encontrado" });
    }

    const esValida = await bcrypt.compare(passwordActual, result.rows[0].password);
    if (!esValida) {
      return res.status(401).json({ mensaje: "La contraseña actual no es correcta" });
    }

    const hash = await bcrypt.hash(passwordNuevo, 10);
    await pool.query(`UPDATE usuarios SET password = $1 WHERE id = $2`, [hash, usuarioId]);

    return res.json({ mensaje: "Contraseña actualizada correctamente" });
  } catch (error) {
    console.error("Error cambiando contraseña:", error);
    return res.status(500).json({ mensaje: "Error actualizando contraseña" });
  }
};

/*
====================================
TORNEOS DE UN USUARIO (ADMIN)
====================================
*/
const obtenerTorneosPorUsuario = async (req, res) => {
  const id = Number(req.params.id);

  if (!validarId(id)) {
    return res.status(400).json({ mensaje: "ID inválido" });
  }

  try {
    const usuarioExiste = await pool.query(
      `SELECT id FROM usuarios WHERE id = $1`,
      [id]
    );
    if (usuarioExiste.rows.length === 0) {
      return res.status(404).json({ mensaje: "Usuario no encontrado" });
    }

    const resultado = await pool.query(
      `SELECT t.id, t.nombre, t.temporada, t.estado, t.activo, t.fecha_inicio, t.fecha_fin, t.created_at,
              ut.created_at AS asignado_en
       FROM torneos t
       INNER JOIN usuarios_torneos ut ON ut.torneo_id = t.id
       WHERE ut.usuario_id = $1
       ORDER BY t.id DESC`,
      [id]
    );

    return res.json(resultado.rows);
  } catch (error) {
    console.error("Error obteniendo torneos del usuario:", error);
    return res.status(500).json({ mensaje: "Error obteniendo torneos del usuario" });
  }
};

/*
====================================
ASIGNAR USUARIO A TORNEO (ADMIN)
====================================
*/
const asignarUsuarioATorneo = async (req, res) => {
  const usuarioId = Number(req.params.id);
  const torneoId = Number(req.params.torneoId);

  if (!validarId(usuarioId)) {
    return res.status(400).json({ mensaje: "ID de usuario inválido" });
  }
  if (!validarId(torneoId)) {
    return res.status(400).json({ mensaje: "ID de torneo inválido" });
  }

  try {
    const [usuarioResult, torneoResult] = await Promise.all([
      pool.query(`SELECT id FROM usuarios WHERE id = $1`, [usuarioId]),
      pool.query(`SELECT id FROM torneos WHERE id = $1`, [torneoId])
    ]);

    if (usuarioResult.rows.length === 0) {
      return res.status(404).json({ mensaje: "Usuario no encontrado" });
    }
    if (torneoResult.rows.length === 0) {
      return res.status(404).json({ mensaje: "Torneo no encontrado" });
    }

    await pool.query(
      `INSERT INTO usuarios_torneos (usuario_id, torneo_id)
       VALUES ($1, $2)
       ON CONFLICT (usuario_id, torneo_id) DO NOTHING`,
      [usuarioId, torneoId]
    );

    return res.status(201).json({
      mensaje: "Usuario asignado al torneo correctamente",
      usuario_id: usuarioId,
      torneo_id: torneoId
    });
  } catch (error) {
    console.error("Error asignando usuario a torneo:", error);
    return res.status(500).json({ mensaje: "Error asignando usuario a torneo" });
  }
};

/*
====================================
REMOVER USUARIO DE TORNEO (ADMIN)
====================================
*/
const removerUsuarioDeTorneo = async (req, res) => {
  const usuarioId = Number(req.params.id);
  const torneoId = Number(req.params.torneoId);

  if (!validarId(usuarioId)) {
    return res.status(400).json({ mensaje: "ID de usuario inválido" });
  }
  if (!validarId(torneoId)) {
    return res.status(400).json({ mensaje: "ID de torneo inválido" });
  }

  try {
    const resultado = await pool.query(
      `DELETE FROM usuarios_torneos
       WHERE usuario_id = $1 AND torneo_id = $2
       RETURNING id`,
      [usuarioId, torneoId]
    );

    if (resultado.rows.length === 0) {
      return res.status(404).json({ mensaje: "El usuario no estaba asignado a ese torneo" });
    }

    return res.json({ mensaje: "Usuario removido del torneo correctamente" });
  } catch (error) {
    console.error("Error removiendo usuario de torneo:", error);
    return res.status(500).json({ mensaje: "Error removiendo usuario de torneo" });
  }
};

module.exports = {
  obtenerUsuarios,
  crearUsuario,
  actualizarRolUsuario,
  actualizarEstadoUsuario,
  resetearPasswordUsuario,
  editarDatosUsuario,
  obtenerPerfilUsuario,
  cambiarMiPassword,
  obtenerTorneosPorUsuario,
  asignarUsuarioATorneo,
  removerUsuarioDeTorneo
};