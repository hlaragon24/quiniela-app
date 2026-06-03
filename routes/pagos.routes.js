const express = require("express");

const router = express.Router();

const controller = require("../controllers/pagos.controller");

const authMiddleware = require("../middleware/auth.middleware");
const validarAdmin = require("../middleware/admin.middleware");

router.get(
  "/",
  authMiddleware,
  validarAdmin,
  controller.obtenerPagos
);

router.put(
  "/:usuarioId",
  authMiddleware,
  validarAdmin,
  controller.guardarPago
);

module.exports = router;