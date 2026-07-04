const express = require("express");
const router = express.Router();
const controller = require("../controllers/reglamento.controller");
const authMiddleware = require("../middleware/auth.middleware");
const validarAdmin = require("../middleware/admin.middleware");

router.get("/", controller.obtenerReglamento);
router.put("/", authMiddleware, validarAdmin, controller.actualizarReglamento);

module.exports = router;
