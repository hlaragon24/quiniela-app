const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const pool = require("../config/database");
const { SECRET } = require("../config/jwt");

/*
====================================
REGISTER
====================================
*/
const register = async (req, res) => {
  const { nombre, email, password } = req.body;

  try {
    if (!nombre || !email || !password) {
      return res.status(400).json({
        mensaje: "Todos los campos son obligatorios"
      });
    }

    const emailNormalizado = email.trim().toLowerCase();

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(emailNormalizado)) {
      return res.status(400).json({
        mensaje: "Email inválido"
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        mensaje: "La contraseña debe tener mínimo 6 caracteres"
      });
    }

    const usuarioExiste = await pool.query(
      "SELECT id FROM usuarios WHERE email = $1",
      [emailNormalizado]
    );

    if (usuarioExiste.rows.length > 0) {
      return res.status(400).json({
        mensaje: "El usuario ya existe"
      });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    await pool.query(
      `INSERT INTO usuarios (nombre, email, password)
       VALUES ($1, $2, $3)`,
      [nombre.trim(), emailNormalizado, passwordHash]
    );

    return res.status(201).json({
      mensaje: "Usuario registrado correctamente"
    });
  } catch (error) {
    console.error("Error registrando usuario:", error);

    return res.status(500).json({
      mensaje: "Error registrando usuario"
    });
  }
};

/*
====================================
LOGIN
====================================
*/
const login = async (req, res) => {
  const { email, password } = req.body;

  try {
    if (!email || !password) {
      return res.status(400).json({
        mensaje: "Email y password son obligatorios"
      });
    }

    const emailNormalizado = email.trim().toLowerCase();

    const resultado = await pool.query(
      "SELECT * FROM usuarios WHERE email = $1",
      [emailNormalizado]
    );

    if (resultado.rows.length === 0) {
      return res.status(401).json({
        mensaje: "Credenciales inválidas"
      });
    }

    const usuario = resultado.rows[0];

    if (usuario.activo === false) {
      return res.status(403).json({
        mensaje: "Usuario desactivado"
      });
    }

    const passwordValido = await bcrypt.compare(
      password,
      usuario.password
    );

    if (!passwordValido) {
      return res.status(401).json({
        mensaje: "Credenciales inválidas"
      });
    }

    const token = jwt.sign(
      {
        id: usuario.id,
        rol: usuario.rol
      },
      SECRET,
      { expiresIn: "8h" }
    );

    return res.json({
      mensaje: "Login correcto",
      token,
      usuario: {
        id: usuario.id,
        nombre: usuario.nombre,
        email: usuario.email,
        rol: usuario.rol
      }
    });
  } catch (error) {
    console.error("Error en login:", error);

    return res.status(500).json({
      mensaje: "Error en login"
    });
  }
};

module.exports = {
  register,
  login
};