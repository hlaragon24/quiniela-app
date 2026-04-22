const express = require("express");
const router = express.Router();

const pool = require("../config/database");

router.get("/jornada/:jornada", async (req, res) => {

  const jornada = req.params.jornada;

  try {

    const result = await pool.query(`
      SELECT
        p.local,
        p.visitante,
        u.nombre AS usuario,
        pr.resultado,
        pr.marcador_local,
        pr.marcador_visitante
      FROM pronosticos pr
      JOIN partidos p ON pr.partido_id = p.id
      JOIN usuarios u ON pr.usuario_id = u.id
      WHERE p.jornada_id = $1
      ORDER BY p.id
    `, [jornada]);

    const tabla = {};

    result.rows.forEach(row => {

      const partido =
        `${row.local} vs ${row.visitante}`;

      if (!tabla[partido]) {

        tabla[partido] = {};

      }

      tabla[partido][row.usuario] =
        `${row.resultado} ${row.marcador_local}-${row.marcador_visitante}`;

    });

    const respuesta = Object.keys(tabla).map(partido => ({

      partido,
      pronosticos: tabla[partido]

    }));

    res.json(respuesta);

  } catch (error) {

    console.error(error);

    res.status(500).json({
      error: "Error obteniendo histórico"
    });

  }

});

module.exports = router;