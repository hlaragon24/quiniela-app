const express = require("express");
const router = express.Router();
const controller = require("../controllers/auditoria.controller");
const authMiddleware = require("../middleware/auth.middleware");
const validarAdmin = require("../middleware/admin.middleware");

router.get("/", authMiddleware, validarAdmin, controller.obtenerAuditoria);

module.exports = router;
