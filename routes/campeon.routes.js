const express = require("express");

const router = express.Router();

const {
  registrarPronosticoCampeon,
  verMiPronosticoCampeon,
  actualizarMiPronosticoCampeon,
  declararCampeonReal,
  verCampeonReal,
  verResumenCampeon,
  verConfigCampeon,
  actualizarConfigCampeon
} = require("../controllers/campeon.controller");

const verificarToken = require("../middleware/auth.middleware");
const soloAdmin = require("../middleware/roles.middleware");

/*
====================================
JUGADOR
====================================
*/
router.post(
  "/",
  verificarToken,
  registrarPronosticoCampeon
);

router.get(
  "/mi-pronostico",
  verificarToken,
  verMiPronosticoCampeon
);

router.put(
  "/mi-pronostico",
  verificarToken,
  actualizarMiPronosticoCampeon
);

/*
====================================
PÚBLICO
====================================
*/
router.get(
  "/",
  verCampeonReal
);

/*
====================================
ADMIN
====================================
*/
router.put(
  "/admin",
  verificarToken,
  soloAdmin,
  declararCampeonReal
);

router.get(
  "/admin/resumen",
  verificarToken,
  soloAdmin,
  verResumenCampeon
);
router.get(
  "/config",
  verConfigCampeon
);

router.put(
  "/admin/config",
  verificarToken,
  soloAdmin,
  actualizarConfigCampeon
);

module.exports = router;