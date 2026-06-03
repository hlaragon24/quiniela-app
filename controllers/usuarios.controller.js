const bcrypt = require("bcryptjs");
const pool = require("../config/database");

const rolesValidos = ["admin", "jugador"];

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

module.exports = {
  obtenerUsuarios,
  crearUsuario,
  actualizarRolUsuario,
  actualizarEstadoUsuario,
  resetearPasswordUsuario
};