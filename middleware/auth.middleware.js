const jwt = require("jsonwebtoken");

const SECRET = "quiniela-secret-key";


const verificarToken = (req, res, next) => {

    const token = req.headers.authorization;


    if (!token) {

        return res.status(401).json({
            mensaje: "Token requerido"
        });

    }


    try {

        const decoded = jwt.verify(token, SECRET);

        req.usuario = decoded;

        next();

    } catch {

        return res.status(401).json({
            mensaje: "Token inválido"
        });

    }

};


module.exports = verificarToken;