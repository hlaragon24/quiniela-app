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

router.put(
  "/:numero",
  authMiddleware,
  validarAdmin,
  controller.actualizarJornada
);

router.patch(
  "/:numero/cerrar",
  authMiddleware,
  validarAdmin,
  controller.cerrarJornada
);

router.patch(
  "/:numero/abrir",
  authMiddleware,
  validarAdmin,
  controller.abrirJornada
);

router.delete(
  "/:numero",
  authMiddleware,
  validarAdmin,
  controller.eliminarJornada
);

module.exports = router;