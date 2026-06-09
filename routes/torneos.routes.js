const express = require("express");
const router = express.Router();

const controller = require("../controllers/torneos.controller");
const authMiddleware = require("../middleware/auth.middleware");
const soloAdmin = require("../middleware/admin.middleware");

router.get("/", controller.obtenerTorneos);
router.get("/activo", controller.obtenerTorneoActivo);
router.get("/:id", controller.obtenerTorneoPorId);

router.post("/", authMiddleware, soloAdmin, controller.crearTorneo);
router.put("/:id", authMiddleware, soloAdmin, controller.actualizarTorneo);
router.patch("/:id/activar", authMiddleware, soloAdmin, controller.activarTorneo);
router.delete("/:id", authMiddleware, soloAdmin, controller.eliminarTorneo);

module.exports = router;
