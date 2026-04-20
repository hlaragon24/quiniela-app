const express = require("express");

const router = express.Router();

const { obtenerPartidosPorJornada } = require("../controllers/partidos.controller");

router.get("/:jornadaId", obtenerPartidosPorJornada);

module.exports = router;