require("dotenv").config();

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");

const FRONTEND_URL = process.env.FRONTEND_URL;
if (!FRONTEND_URL) {
  console.warn("⚠️  FRONTEND_URL no está configurada. CORS bloqueará peticiones del navegador.");
}

// Acepta tanto https://dominio.com como https://www.dominio.com
const allowedOrigins = (() => {
  if (!FRONTEND_URL) return [];
  const base = FRONTEND_URL.replace(/\/$/, "");
  const withWww = base.includes("://www.")
    ? base
    : base.replace("://", "://www.");
  const withoutWww = base.includes("://www.")
    ? base.replace("://www.", "://")
    : base;
  return [withWww, withoutWww];
})();

const app = express();

app.use(helmet());

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("Origin not allowed by CORS"));
    }
  },
  credentials: true
}));

app.use(express.json());

// Importar rutas
const partidosRoutes = require("./routes/partidos.routes");
const pronosticosRoutes = require("./routes/pronosticos.routes");
const resultadosRoutes = require("./routes/resultados.routes");
const rankingRoutes = require("./routes/ranking.routes");
const authRoutes = require("./routes/auth.routes");
const campeonRoutes = require("./routes/campeon.routes");
const jornadasRoutes = require("./routes/jornadas.routes");
const adminRoutes = require("./routes/admin.routes");
const historicoRoutes = require("./routes/historico.routes");
const usuariosRoutes = require("./routes/usuarios.routes");
const pagosRoutes = require("./routes/pagos.routes");
const torneosRoutes = require("./routes/torneos.routes");
const equiposRoutes = require("./routes/equipos.routes");

// Registrar rutas
app.use("/partidos", partidosRoutes);
app.use("/pronosticos", pronosticosRoutes);
app.use("/resultados", resultadosRoutes);
app.use("/ranking", rankingRoutes);
app.use("/auth", authRoutes);
app.use("/campeon", campeonRoutes);
app.use("/jornadas", jornadasRoutes);
app.use("/admin", adminRoutes);
app.use("/historico", historicoRoutes);
app.use("/usuarios", usuariosRoutes);
app.use("/pagos", pagosRoutes);
app.use("/torneos", torneosRoutes);
app.use("/equipos", equiposRoutes);

// Ruta base
app.get("/", (req, res) => {
  res.send("Servidor funcionando 🚀 Quiniela App activa");
});

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Ruta no encontrada
app.use((req, res) => {
  res.status(404).json({
    error: "Ruta no encontrada"
  });
});


const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});