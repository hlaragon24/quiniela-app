const pool = require("../config/database");


/*
====================================
REGISTRAR RESULTADO (ADMIN)
====================================
*/
const registrarResultado = async (req, res) => {

    const partido_id = parseInt(req.params.partidoId);

    const {
        goles_local,
        goles_visitante
    } = req.body;


    try {

        // guardar resultado
        await pool.query(
            `
            INSERT INTO resultados
            (partido_id, goles_local, goles_visitante)
            VALUES ($1,$2,$3)
            ON CONFLICT (partido_id)
            DO UPDATE SET
                goles_local = EXCLUDED.goles_local,
                goles_visitante = EXCLUDED.goles_visitante
            `,
            [
                partido_id,
                goles_local,
                goles_visitante
            ]
        );


        // calcular puntos automáticamente
        await calcularPuntos(partido_id);


        res.json({
            mensaje: "Resultado registrado correctamente"
        });

    } catch (error) {

        console.error(error);

        res.status(500).json({
            mensaje: "Error registrando resultado"
        });

    }

};


/*
====================================
CALCULAR PUNTOS AUTOMÁTICAMENTE
====================================
*/
const calcularPuntos = async (partido_id) => {

    const resultadoPartido = await pool.query(
        `
        SELECT *
        FROM resultados
        WHERE partido_id = $1
        `,
        [partido_id]
    );


    if (resultadoPartido.rows.length === 0) return;


    const resultado = resultadoPartido.rows[0];


    const goles_local = resultado.goles_local;

    const goles_visitante = resultado.goles_visitante;


    let resultadoReal;


    if (goles_local > goles_visitante)
        resultadoReal = "L";
    else if (goles_visitante > goles_local)
        resultadoReal = "V";
    else
        resultadoReal = "E";


    const pronosticos = await pool.query(
        `
        SELECT *
        FROM pronosticos
        WHERE partido_id = $1
        `,
        [partido_id]
    );


    for (const pronostico of pronosticos.rows) {

        let puntos = 0;


        if (pronostico.resultado === resultadoReal)
            puntos += 1;


        if (
            pronostico.marcador_local === goles_local &&
            pronostico.marcador_visitante === goles_visitante
        )
            puntos += 2;


        await pool.query(
            `
            UPDATE pronosticos
            SET puntos = $1
            WHERE id = $2
            `,
            [
                puntos,
                pronostico.id
            ]
        );

    }

};


module.exports = {
    registrarResultado
};