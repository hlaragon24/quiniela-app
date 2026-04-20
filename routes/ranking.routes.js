const express = require("express");

const router = express.Router();

const {
    obtenerRanking,
    obtenerRankingPorJornada
} = require("../controllers/ranking.controller");


router.get("/", obtenerRanking);

router.get("/jornada/:jornadaId", obtenerRankingPorJornada);


module.exports = router;