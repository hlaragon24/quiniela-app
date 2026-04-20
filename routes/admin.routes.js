const express = require("express");

const router = express.Router();

const controller = require("../controllers/admin.dashboard.controller");

const authMiddleware = require("../middleware/auth.middleware");

const validarAdmin = require("../middleware/admin.middleware");


router.get(
    "/resumen",
    authMiddleware,
    validarAdmin,
    controller.resumenAdmin
);

module.exports = router;