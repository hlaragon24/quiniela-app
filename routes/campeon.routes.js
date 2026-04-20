const express = require("express");

const router = express.Router();

const {
    registrarPronosticoCampeon,
    declararCampeonReal,
    verCampeonReal
} = require("../controllers/campeon.controller");

const verificarToken = require("../middleware/auth.middleware");
const soloAdmin = require("../middleware/roles.middleware");


router.post("/", verificarToken, registrarPronosticoCampeon);

router.get("/", verCampeonReal);

router.put(
    "/admin",
    verificarToken,
    soloAdmin,
    declararCampeonReal
);

module.exports = router;