const express = require("express");

const router = express.Router();

const { guardarPronostico } = require("../controllers/pronosticos.controller");

const verificarToken = require("../middleware/auth.middleware");


router.post(
    "/",
    verificarToken,
    guardarPronostico
);

module.exports = router;