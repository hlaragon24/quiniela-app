const bcrypt = require("bcryptjs");
const pool = require("../config/database");

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

    res.json(resultado.rows);
  } catch (error) {
    console.error("Error obteniendo usuarios:", error);

    res.status(500).json({
      mensaje: "Error obteniendo usuarios"
    });
  }
};

const actualizarRolUsuario = async (req, res) => {
  const id = Number(req.params.id);
  const { rol } = req.body;

  const rolesValidos = ["admin", "jugador"];

  if (!rolesValidos.includes(rol)) {
    return res.status(400).json({
      mensaje: "Rol inválido"
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

    res.json({
      mensaje: "Rol actualizado correctamente",
      usuario: resultado.rows[0]
    });
  } catch (error) {
    console.error("Error actualizando rol:", error);

    res.status(500).json({
      mensaje: "Error actualizando rol"
    });
  }
};

const actualizarEstadoUsuario = async (req, res) => {
  const id = Number(req.params.id);
  const { activo } = req.body;

  if (typeof activo !== "boolean") {
    return res.status(400).json({
      mensaje: "Estado inválido"
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

    res.json({
      mensaje: activo ? "Usuario activado" : "Usuario desactivado",
      usuario: resultado.rows[0]
    });
  } catch (error) {
    console.error("Error actualizando estado:", error);

    res.status(500).json({
      mensaje: "Error actualizando estado"
    });
  }
};

const resetearPasswordUsuario = async (req, res) => {
  const id = Number(req.params.id);
  const { password } = req.body;

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

    res.json({
      mensaje: "Contraseña actualizada correctamente"
    });
  } catch (error) {
    console.error("Error reseteando contraseña:", error);

    res.status(500).json({
      mensaje: "Error reseteando contraseña"
    });
  }
};

const crearUsuario = async (req, res) => {
  const { nombre, email, password, rol } = req.body;

  const rolesValidos = ["admin", "jugador"];

  if (!nombre || !email || !password || !rol) {
    return res.status(400).json({
      mensaje: "Todos los campos son obligatorios"
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
      [email]
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
      [nombre, email, passwordHash, rol]
    );

    res.json({
      mensaje: "Usuario creado correctamente",
      usuario: resultado.rows[0]
    });
  } catch (error) {
    console.error("Error creando usuario:", error);

    res.status(500).json({
      mensaje: "Error creando usuario"
    });
  }
};

module.exports = {
  obtenerUsuarios,
  createarUsuario,
  actualizarRolUsuario,
  actualizarEstadoUsuario,
  resetearPasswordUsuario
};