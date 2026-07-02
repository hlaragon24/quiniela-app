const express = require("express");
const router = express.Router();
const controller = require("../controllers/equipos.controller");
const authMiddleware = require("../middleware/auth.middleware");
const validarAdmin = require("../middleware/admin.middleware");

router.get("/", controller.obtenerEquipos);
router.post("/", authMiddleware, validarAdmin, controller.crearEquipo);
router.put("/:id", authMiddleware, validarAdmin, controller.actualizarEquipo);
router.delete("/:id", authMiddleware, validarAdmin, controller.eliminarEquipo);

module.exports = router;
