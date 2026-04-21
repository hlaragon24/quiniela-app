const db = require("../config/database");

console.log("TIPO DB:", typeof db);
console.log("DB:", db);

const obtenerPartidosPorJornada = async (req, res) => {
    try {
        const { jornadaId } = req.params;

        const resultado = await db.query(
            "SELECT * FROM partidos WHERE jornada_id = $1 ORDER BY id",
            [jornadaId]
        );

        res.json(resultado.rows);

    } catch (error) {
        console.error(error);
        res.status(500).json({
            mensaje: "Error al obtener partidos"
        });
    }
};


const crearPartido = async (req, res) => {
    try {
        const {
            jornada_id,
            local,
            visitante,
            fecha,
            es_comodin
        } = req.body;

        const resultado = await db.query(
            `
            INSERT INTO partidos
            (jornada_id, local, visitante, fecha, es_comodin)
            VALUES ($1,$2,$3,$4,$5)
            RETURNING *
            `,
            [jornada_id, local, visitante, fecha, es_comodin]
        );

        res.json(resultado.rows[0]);

    } catch (error) {
        console.error(error);
        res.status(500).json({
            mensaje: "Error al crear partido"
        });
    }
};

const guardarPronosticosJornada = async (req, res) => {

  const usuario_id = req.usuario.id;
  const pronosticos = req.body;

  try {

    for (const p of pronosticos) {

      await pool.query(
        `
        INSERT INTO pronosticos
        (usuario_id, partido_id, resultado, marcador_local, marcador_visitante)

        VALUES ($1,$2,$3,$4,$5)

        ON CONFLICT (usuario_id, partido_id)

        DO UPDATE SET
          resultado = EXCLUDED.resultado,
          marcador_local = EXCLUDED.marcador_local,
          marcador_visitante = EXCLUDED.marcador_visitante
        `,
        [
          usuario_id,
          p.partido_id,
          p.resultado,
          p.marcador_local,
          p.marcador_visitante
        ]
      );

    }

    res.json({
      mensaje: "Pronósticos guardados correctamente"
    });

  } catch (error) {

    console.error(error);

    res.status(500).json({
      mensaje: "Error guardando pronósticos"
    });

  }

};


const crearPartidosLote = async (req, res) => {
    try {

        const partidos = req.body;

        for (let partido of partidos) {

            await db.query(
                `
                INSERT INTO partidos
                (jornada_id, local, visitante, fecha, es_comodin)
                VALUES ($1,$2,$3,$4,$5)
                `,
                [
                    partido.jornada_id,
                    partido.local,
                    partido.visitante,
                    partido.fecha,
                    partido.es_comodin
                ]
            );
        }

        res.json({
            mensaje: "Partidos creados correctamente"
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({
            mensaje: "Error al crear partidos en lote"
        });
    }
};


module.exports = {
    obtenerPartidosPorJornada,
    crearPartido,
    crearPartidosLote
};