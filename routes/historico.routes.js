const express = require("express");
const router = express.Router();

const pool = require("../config/database");


// GET histórico general por jornada
router.get("/jornada/:jornada", async (req, res) => {

  try {

    const jornada = req.params.jornada;

    const result = await pool.query(`
  SELECT
    p.id,
    p.local,
    p.visitante,
    p.es_comodin,
    r.goles_local AS real_local,
    r.goles_visitante AS real_visitante,
    u.email AS usuario,
    pr.resultado,
    pr.marcador_local,
    pr.marcador_visitante
  FROM pronosticos pr
  JOIN partidos p ON pr.partido_id = p.id
  JOIN usuarios u ON pr.usuario_id = u.id
  LEFT JOIN resultados r ON r.partido_id = p.id
  WHERE p.jornada_id = $1
  ORDER BY p.id
`, [jornada]);


    const tabla = {};

    result.rows.forEach(row => {

      const partidoNombre =
        `${row.local} vs ${row.visitante}`;


      if (!tabla[partidoNombre]) {

        tabla[partidoNombre] = {

          resultado_real:
            row.real_local !== null
              ? `${row.real_local}-${row.real_visitante}`
              : "-",

          pronosticos: {}

        };

      }


      let puntos = 0;

      if (
        row.real_local !== null &&
        row.real_visitante !== null
      ) {

        const marcadorExacto =
          Number(row.marcador_local) === Number(row.real_local) &&
          Number(row.marcador_visitante) === Number(row.real_visitante);


        let signoReal = "E";

        if (row.real_local > row.real_visitante)
          signoReal = "L";

        else if (row.real_local < row.real_visitante)
          signoReal = "V";


        const signoCorrecto =
          row.resultado === signoReal;


        // ⭐ PARTIDO COMODIN
        if (row.es_comodin) {

          if (marcadorExacto)
            puntos = 5;

          else if (signoCorrecto)
            puntos = 2;

        }

        // PARTIDO NORMAL
        else {

          if (marcadorExacto)
            puntos = 3;

          else if (signoCorrecto)
            puntos = 1;

        }

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

  }

  catch (error) {

    console.error(error);

    res.status(500).json({

      error: "Error obteniendo histórico"

    });

  }

});


module.exports = router;