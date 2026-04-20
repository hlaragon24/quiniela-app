const express = require("express");

const router = express.Router();

const {
    registrarResultado
} = require("../controllers/resultados.controller");

const verificarToken = require("../middleware/auth.middleware");

const verificarAdmin = require("../middleware/admin.middleware");


router.put(
    "/:partidoId",
    verificarToken,
    verificarAdmin,
    registrarResultado
);


module.exports = router;