const express = require("express");

const router = express.Router();

const controller = require("../controllers/ranking.controller");


router.get(
    "/",
    controller.obtenerRankingGeneral
);

router.get(
    "/jornada/:jornada",
    controller.obtenerRankingPorJornada
);

router.get(
    "/historial",
    controller.obtenerHistorialRanking
);


module.exports = router;