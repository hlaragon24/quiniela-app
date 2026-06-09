if (!process.env.JWT_SECRET) {
  throw new Error("JWT_SECRET no está configurado en las variables de entorno");
}

module.exports = {
  SECRET: process.env.JWT_SECRET
};