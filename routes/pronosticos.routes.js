const express = require("express");

const router = express.Router();

const controller = require("../controllers/pronosticos.controller");

const authMiddleware = require("../middleware/auth.middleware");

const validarJornadaAbierta = require("../middleware/jornada.middleware");

router.post(
    "/",
    authMiddleware,
    validarJornadaAbierta,
    controller.guardarPronostico
);

module.exports = router;