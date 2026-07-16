const express = require("express");

const router = express.Router();

const controller = require("../controllers/resultados.controller");

const authMiddleware = require("../middleware/auth.middleware");
const { adminOOrganizadorPorPartido } = require("../middleware/organizer.middleware");

router.post(
  "/:partidoId",
  authMiddleware,
  adminOOrganizadorPorPartido,
  controller.registrarResultado
);


module.exports = router;