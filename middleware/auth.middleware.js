const jwt = require("jsonwebtoken");

const { SECRET } = require("../config/jwt");

const verificarToken = (req, res, next) => {
  const authHeader = req.headers["authorization"];

  if (!authHeader) {
    return res.status(401).json({
      mensaje: "Token requerido"
    });
  }

  const partes = authHeader.split(" ");

  if (partes.length !== 2 || partes[0] !== "Bearer") {
    return res.status(401).json({
      mensaje: "Formato de token inválido"
    });
  }

  const token = partes[1];

  try {
    const decoded = jwt.verify(token, SECRET);

    req.usuario = decoded;

    next();
  } catch (error) {
    console.error("Error verificando token:", error.message);

    return res.status(401).json({
      mensaje: "Token inválido o expirado"
    });
  }
};

module.exports = verificarToken;