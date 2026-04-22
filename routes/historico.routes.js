const express = require("express");
const router = express.Router();

const pool = require("../config/database");

router.get("/jornada/:jornada", async (req, res) => {

  const jornada = req.params.jornada;

  try {

    const result = await pool.query(`
  SELECT
    p.id,
    p.local,
    p.visitante,
    pr.marcador_local AS real_local,
    pr.marcador_visitante AS real_visitante,
    u.email AS usuario,
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

      const partidoNombre =
        `${row.equipo_local} vs ${row.equipo_visitante}`;

      if (!tabla[partidoNombre]) {

        tabla[partidoNombre] = {

          resultado_real:
            `${row.real_local}-${row.real_visitante}`,

          pronosticos: {}

        };

      }

      let puntos = 0;

      const signoReal =
        row.real_local > row.real_visitante
          ? "L"
          : row.real_local < row.real_visitante
            ? "V"
            : "E";


      if (
        row.marcador_local === row.real_local &&
        row.marcador_visitante === row.real_visitante
      ) {

        puntos = 3;

      }

      else if (row.resultado === signoReal) {

        puntos = 1;

      }


      tabla[partidoNombre].pronosticos[row.usuario] = {

        pronostico:
          `${row.resultado} ${row.marcador_local}-${row.marcador_visitante}`,

        puntos

      };

    });

    const respuesta = Object.keys(tabla).map(partido => ({

      partido,

      resultado_real:
        tabla[partido].resultado_real,

      pronosticos:
        tabla[partido].pronosticos

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