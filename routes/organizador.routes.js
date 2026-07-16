const express = require("express");
const router = express.Router();
const ctrl = require("../controllers/organizador.controller");
const auth = require("../middleware/auth.middleware");
const soloAdmin = require("../middleware/admin.middleware");
const { adminOOrganizador } = require("../middleware/organizer.middleware");

// ── Jugadores del torneo (admin o el organizador asignado) ────────────────
router.get("/torneos/:torneoId/jugadores", auth, adminOOrganizador, ctrl.listarJugadores);
router.post("/torneos/:torneoId/jugadores", auth, adminOOrganizador, ctrl.crearJugador);
router.delete("/torneos/:torneoId/jugadores/:usuarioId", auth, adminOOrganizador, ctrl.removerJugador);
router.put("/torneos/:torneoId/jugadores/:usuarioId/password", auth, adminOOrganizador, ctrl.resetearPasswordJugador);

// ── Gestión de organizadores (solo super admin) ───────────────────────────
router.get("/torneos/:torneoId/organizadores", auth, soloAdmin, ctrl.listarOrganizadores);
router.post("/torneos/:torneoId/organizadores/:usuarioId", auth, soloAdmin, ctrl.asignarOrganizador);
router.delete("/torneos/:torneoId/organizadores/:usuarioId", auth, soloAdmin, ctrl.removerOrganizador);

module.exports = router;
