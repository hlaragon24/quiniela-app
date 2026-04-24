const db = require("../config/database");
const { guardarPronostico, obtenerPronosticosUsuario } = require("./pronosticos.controller");

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

      await db.query(
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

const editarPartido = async (req, res) => {

    try {

        const { id } = req.params;

        const {
            jornada_id,
            local,
            visitante,
            fecha,
            es_comodin
        } = req.body;

        const resultado = await db.query(
            `
            UPDATE partidos
            SET
                jornada_id = $1,
                local = $2,
                visitante = $3,
                fecha = $4,
                es_comodin = $5
            WHERE id = $6
            RETURNING *
            `,
            [
                jornada_id,
                local,
                visitante,
                fecha,
                es_comodin,
                id
            ]
        );

        res.json(resultado.rows[0]);

    } catch (error) {

        console.error(error);

        res.status(500).json({
            mensaje: "Error editando partido"
        });

    }

};

const eliminarPartido = async (req, res) => {

    try {

        const { id } = req.params;

        await db.query(
            `
            DELETE FROM partidos
            WHERE id = $1
            `,
            [id]
        );

        res.json({
            mensaje: "Partido eliminado correctamente"
        });

    } catch (error) {

        console.error(error);

        res.status(500).json({
            mensaje: "Error eliminando partido"
        });

    }

};
const obtenerTodosPartidos = async (req, res) => {

    try {

        const resultado = await db.query(
            `
            SELECT *
            FROM partidos
            ORDER BY jornada_id, id
            `
        );

        res.json(resultado.rows);

    } catch (error) {

        console.error(error);

        res.status(500).json({
            mensaje: "Error obteniendo partidos"
        });

    }

};

module.exports = {
    obtenerTodosPartidos,
    obtenerPartidosPorJornada,
    crearPartido,
    crearPartidosLote,
    editarPartido,
    eliminarPartido,
    guardarPronostico,
    obtenerPronosticosUsuario,
    guardarPronosticosJornada,
};