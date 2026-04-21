const pool = require("../config/database");


const obtenerJornadaPorNumero = async (req, res) => {

    try {

        const { numero } = req.params;

        const resultado = await pool.query(
            `
            SELECT *
            FROM jornadas
            WHERE numero = $1
            `,
            [numero]
        );

        if (resultado.rows.length === 0) {

            return res.status(404).json({
                mensaje: "Jornada no encontrada"
            });

        }

        res.json(resultado.rows[0]);

    } catch (error) {

        console.error(error);

        res.status(500).json({
            mensaje: "Error obteniendo jornada"
        });

    }

};

const crearJornada = async (req, res) => {

    try {

        const {
            numero,
            fecha_inicio,
            fecha_cierre
        } = req.body;

        if (!numero || !fecha_inicio || !fecha_cierre) {

            return res.status(400).json({
                mensaje: "Datos incompletos"
            });

        }

        const jornada = await pool.query(
            `
            INSERT INTO jornadas
            (numero, fecha_inicio, fecha_cierre)
            VALUES ($1,$2,$3)
            RETURNING *
            `,
            [numero, fecha_inicio, fecha_cierre]
        );

        res.json({
            mensaje: "Jornada creada correctamente",
            data: jornada.rows[0]
        });

    } catch (error) {

        console.error(error);

        res.status(500).json({
            mensaje: "Error creando jornada"
        });

    }

};


const obtenerJornadas = async (req, res) => {

    try {

        const jornadas = await pool.query(
            `
            SELECT *
            FROM jornadas
            ORDER BY numero
            `
        );

        res.json(jornadas.rows);

    } catch (error) {

        console.error(error);

        res.status(500).json({
            mensaje: "Error obteniendo jornadas"
        });

    }

};

const obtenerEstadoJornada = async (req, res) => {

  try {

    const { numero } = req.params;

    const resultado = await pool.query(
      `
      SELECT fecha_cierre
      FROM jornadas
      WHERE numero = $1
      `,
      [numero]
    );

    if (resultado.rows.length === 0) {

      return res.status(404).json({
        mensaje: "Jornada no encontrada"
      });

    }

    const fechaCierre = new Date(
      resultado.rows[0].fecha_cierre
    );

    const ahora = new Date();

    res.json({
      abierta: ahora < fechaCierre
    });

  } catch (error) {

    console.error(error);

    res.status(500).json({
      mensaje: "Error consultando estado jornada"
    });

  }

};

module.exports = {
    obtenerJornadaPorNumero,
    crearJornada,
    obtenerJornadas,
    obtenerEstadoJornada
};