const express = require("express");

const router = express.Router();

const controller = require("../controllers/ranking.controller");
const verificarToken = require("../middleware/auth.middleware");

router.get("/", controller.obtenerRankingGeneral);
router.get("/general", controller.obtenerRankingGeneral);
router.get("/mi-resumen", verificarToken, controller.obtenerMiResumenRanking);
router.get("/jornada/:jornada", controller.obtenerRankingPorJornada);
router.get("/historial", controller.obtenerHistorialRanking);

// Multi-torneo
router.get("/torneo/:torneoId", controller.obtenerRankingGeneral);
router.get("/torneo/:torneoId/ganadores", controller.obtenerGanadoresPorTorneo);

module.exports = router;
