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
router.get(
  "/perfil",
  authMiddleware,
  controller.obtenerPerfilUsuario
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

// Torneos por usuario
router.get(
  "/:id/torneos",
  authMiddleware,
  validarAdmin,
  controller.obtenerTorneosPorUsuario
);

router.post(
  "/:id/torneos/:torneoId",
  authMiddleware,
  validarAdmin,
  controller.asignarUsuarioATorneo
);

router.delete(
  "/:id/torneos/:torneoId",
  authMiddleware,
  validarAdmin,
  controller.removerUsuarioDeTorneo
);

router.put("/:id", authMiddleware, validarAdmin, controller.editarDatosUsuario);

router.patch("/mi-password", authMiddleware, controller.cambiarMiPassword);

router.patch("/ping", authMiddleware, controller.pingActivo);
router.get("/activos", authMiddleware, controller.obtenerActivos);

module.exports = router;