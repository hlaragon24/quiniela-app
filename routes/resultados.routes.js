const express = require("express");

const router = express.Router();

const controller = require("../controllers/resultados.controller");

const authMiddleware = require("../middleware/auth.middleware");

const validarAdmin = require("../middleware/admin.middleware");


router.post(
  "/:partidoId",
  authMiddleware,
  validarAdmin,
  controller.registrarResultado
);


module.exports = router;