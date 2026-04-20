const express = require("express");

const router = express.Router();

const controller = require("../controllers/jornadas.controller");

const authMiddleware = require("../middleware/auth.middleware");

const validarAdmin = require("../middleware/admin.middleware");


router.get(
    "/",
    controller.obtenerJornadas
);


router.post(
    "/",
    authMiddleware,
    validarAdmin,
    controller.crearJornada
);

module.exports = router;