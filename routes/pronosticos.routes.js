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

router.post(
  "/guardar-jornada",
  authMiddleware,
  controller.guardarPronosticosJornada
);

router.get(
  "/usuario",
  authMiddleware,
  controller.obtenerPronosticosUsuario
);

router.get(
  "/mis-pronosticos",
  authMiddleware,
  controller.obtenerPronosticosUsuario
);

module.exports = router;