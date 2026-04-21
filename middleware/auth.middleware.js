const jwt = require("jsonwebtoken");

const SECRET = "quiniela-secret-key";


const verificarToken = (req, res, next) => {

    const authHeader = req.headers.authorization;


    if (!authHeader) {

        return res.status(401).json({
            mensaje: "Token requerido"
        });

    }


    try {

        const token = authHeader.split(" ")[1];

        const decoded = jwt.verify(token, SECRET);

        req.usuario = decoded;

        next();

    } catch (error) {

        return res.status(401).json({
            mensaje: "Token inválido"
        });

    }

};


module.exports = verificarToken;