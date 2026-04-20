const express = require("express");

const app = express();

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



//console.log("resultadosRoutes =", resultadosRoutes);


// Registrar rutas en Express
app.use("/partidos", partidosRoutes);
app.use("/pronosticos", pronosticosRoutes);
app.use("/resultados", resultadosRoutes);
app.use("/ranking", rankingRoutes);
app.use("/auth", authRoutes);
app.use("/campeon", campeonRoutes);
app.use("/ranking", rankingRoutes);
app.use("/jornadas", jornadasRoutes);
app.use("/admin", adminRoutes);

// Ruta base de prueba
app.get("/", (req, res) => {
    res.send("Servidor funcionando 🚀 Quiniela App activa");
});


const PORT = process.env.PORT || 3000;


// Levantar servidor
app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
