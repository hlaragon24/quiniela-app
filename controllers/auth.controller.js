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

        // Verificar si usuario ya existe
        const usuarioExiste = await pool.query(
            "SELECT * FROM usuarios WHERE email = $1",
            [email]
        );

        if (usuarioExiste.rows.length > 0) {

            return res.status(400).json({
                mensaje: "El usuario ya existe"
            });

        }

        // Encriptar password
        const passwordHash = await bcrypt.hash(password, 10);

        // Insertar usuario en PostgreSQL
        await pool.query(
            `INSERT INTO usuarios (nombre, email, password)
             VALUES ($1, $2, $3)`,
            [nombre, email, passwordHash]
        );

        res.json({
            mensaje: "Usuario registrado correctamente"
        });

    } catch (error) {

        console.error(error);

        res.status(500).json({
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

        // Buscar usuario en PostgreSQL
        const resultado = await pool.query(
            "SELECT * FROM usuarios WHERE email = $1",
            [email]
        );

        if (resultado.rows.length === 0) {

            return res.status(404).json({
                mensaje: "Usuario no encontrado"
            });

        }

        const usuario = resultado.rows[0];

        // Validar password
        const passwordValido = await bcrypt.compare(
            password,
            usuario.password
        );

        if (!passwordValido) {

            return res.status(401).json({
                mensaje: "Password incorrecto"
            });

        }

        // Generar token JWT
        const token = jwt.sign(
            {
                id: usuario.id,
                rol: usuario.rol
            },
            SECRET,
            { expiresIn: "8h" }
        );

        res.json({
            mensaje: "Login correcto",
            token,
            usuario: {
                id: usuario.id,
                nombre: usuario.nombre,
                rol: usuario.rol
            }
        });

    } catch (error) {

        console.error(error);

        res.status(500).json({
            mensaje: "Error en login"
        });

    }

};


module.exports = {
    register,
    login
};