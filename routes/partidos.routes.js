const express = require("express");

const router = express.Router();

const controller = require("../controllers/partidos.controller");

const authMiddleware = require("../middleware/auth.middleware");

const validarAdmin = require("../middleware/admin.middleware");


/*
====================================
OBTENER TODOS LOS PARTIDOS (ADMIN)
====================================
*/

router.get(
    "/",
    authMiddleware,
    validarAdmin,
    controller.obtenerTodosPartidos
);


/*
====================================
OBTENER PARTIDOS POR JORNADA
====================================
*/

router.get(
    "/:jornadaId",
    controller.obtenerPartidosPorJornada
);


/*
====================================
CREAR PARTIDO
====================================
*/

router.post(
    "/",
    authMiddleware,
    validarAdmin,
    controller.crearPartido
);


/*
====================================
CREAR PARTIDOS EN LOTE
====================================
*/

router.post(
    "/lote",
    authMiddleware,
    validarAdmin,
    controller.crearPartidosLote
);


/*
====================================
EDITAR PARTIDO
====================================
*/

router.put(
    "/:id",
    authMiddleware,
    validarAdmin,
    controller.editarPartido
);


/*
====================================
ELIMINAR PARTIDO
====================================
*/

router.delete(
    "/:id",
    authMiddleware,
    validarAdmin,
    controller.eliminarPartido
);


module.exports = router;