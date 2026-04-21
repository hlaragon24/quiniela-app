const express = require("express");
const router = express.Router();

const controller = require("../controllers/pronosticos.controller");

const authMiddleware = require("../middleware/auth.middleware");


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


module.exports = router;