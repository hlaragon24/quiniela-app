const express = require("express");

const router = express.Router();

const controller = require("../controllers/usuarios.controller");

const authMiddleware = require("../middleware/auth.middleware");
const validarAdmin = require("../middleware/admin.middleware");

router.get(
  "/",
  authMiddleware,
  validarAdmin,
  controller.obtenerUsuarios
);

router.put(
  "/:id/rol",
  authMiddleware,
  validarAdmin,
  controller.actualizarRolUsuario
);

router.put(
  "/:id/estado",
  authMiddleware,
  validarAdmin,
  controller.actualizarEstadoUsuario
);

router.put(
  "/:id/password",
  authMiddleware,
  validarAdmin,
  controller.resetearPasswordUsuario
);
router.post(
  "/",
  authMiddleware,
  validarAdmin,
  controller.crearUsuario
);

module.exports = router;