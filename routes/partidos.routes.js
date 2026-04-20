const express = require("express");

const router = express.Router();

const controller = require("../controllers/partidos.controller");

const authMiddleware = require("../middleware/auth.middleware");

const validarAdmin = require("../middleware/admin.middleware");


router.get(
    "/:jornadaId",
    controller.obtenerPartidosPorJornada
);


router.post(
    "/",
    authMiddleware,
    validarAdmin,
    controller.crearPartido
);
router.post(
    "/lote",
    authMiddleware,
    validarAdmin,  
    controller.crearPartidosLote
);
module.exports = router;