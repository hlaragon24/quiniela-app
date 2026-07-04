const express = require("express");
const router = express.Router();

const controller = require("../controllers/pronosticos.controller");

const authMiddleware = require("../middleware/auth.middleware");
const validarAdmin = require("../middleware/admin.middleware");

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
  "/usuario/:jornadaId",
  authMiddleware,
  controller.obtenerPronosticosUsuarioPorJornada
);

router.get(
  "/historico-general",
  authMiddleware,
  controller.obtenerHistoricoGeneralPronosticos
);

router.get("/admin/jornada/:jornadaId", authMiddleware, validarAdmin, controller.obtenerPronosticosAdmin);
router.put("/admin/:usuarioId/partido/:partidoId", authMiddleware, validarAdmin, controller.actualizarPronosticoAdmin);
router.delete("/admin/:usuarioId/partido/:partidoId", authMiddleware, validarAdmin, controller.eliminarPronosticoAdmin);

module.exports = router;