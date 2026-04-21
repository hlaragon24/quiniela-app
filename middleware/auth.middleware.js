const jwt = require("jsonwebtoken");

const { SECRET } = require("../config/jwt");

const verificarToken = (req, res, next) => {

    const authHeader = req.headers.authorization;

    if (!authHeader) {

        return res.status(401).json({
            mensaje: "Token requerido"
        });

    }

    // formato esperado:
    // Authorization: Bearer eyJhbGciOiJIUzI1NiIs...

    const token = authHeader.split(" ")[1];

    if (!token) {

        return res.status(401).json({
            mensaje: "Token inválido"
        });

    }

    try {

        const decoded = jwt.verify(token, SECRET);

        req.usuario = decoded;

        next();

    } catch (error) {

        console.error("Error verificando token:", error.message);

        return res.status(401).json({
            mensaje: "Token inválido"
        });

    }

};

module.exports = verificarToken;