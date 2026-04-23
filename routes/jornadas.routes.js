const express = require("express");

const router = express.Router();

const controller = require("../controllers/jornadas.controller");

const authMiddleware = require("../middleware/auth.middleware");

const validarAdmin = require("../middleware/admin.middleware");


// ✅ endpoint última jornada (ANTES de /:numero)
router.get("/ultima", controller.obtenerUltimaJornada);

router.get("/", controller.obtenerJornadas);

router.get("/:numero", controller.obtenerJornadaPorNumero);

router.get("/:numero/estado", controller.obtenerEstadoJornada);

router.post(
    "/",
    authMiddleware,
    validarAdmin,
    controller.crearJornada
);

module.exports = router;