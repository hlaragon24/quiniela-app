const express = require("express");
const rateLimit = require("express-rate-limit");

const router = express.Router();

const {
    register,
    login
} = require("../controllers/auth.controller");

const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20,
    standardHeaders: true,
    legacyHeaders: false,
    message: { mensaje: "Demasiados intentos, espera 15 minutos" }
});

router.post("/register", authLimiter, register);

router.post("/login", authLimiter, login);


module.exports = router;