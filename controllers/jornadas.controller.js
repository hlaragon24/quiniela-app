const pool = require("../config/db");

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

module.exports = {
    crearJornada,
    obtenerJornadas
};