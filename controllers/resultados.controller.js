const pool = require("../config/database");
const { registrarAuditoria } = require("../utils/auditoria");

/*
====================================
UTILIDADES
====================================
*/
const esEnteroNoNegativo = (valor) => {
    const numero = Number(valor);
    return Number.isInteger(numero) && numero >= 0;
};

const obtenerResultadoReal = (golesLocal, golesVisitante) => {
    if (golesLocal > golesVisitante) return "L";
    if (golesVisitante > golesLocal) return "V";
    return "E";
};

/*
====================================
REGISTRAR RESULTADO (ADMIN)
====================================
*/
const registrarResultado = async (req, res) => {
    const partido_id = Number(req.params.partidoId);

    const { goles_local, goles_visitante } = req.body;

    if (!Number.isInteger(partido_id) || partido_id <= 0) {
        return res.status(400).json({
            mensaje: "ID de partido inválido"
        });
    }

    if (!esEnteroNoNegativo(goles_local) || !esEnteroNoNegativo(goles_visitante)) {
        return res.status(400).json({
            mensaje: "Los goles deben ser números enteros no negativos"
        });
    }

    const client = await pool.connect();

    try {
        await client.query("BEGIN");

        const partidoResult = await client.query(
            `
      SELECT
        p.id,
        p.jornada_id,
        p.es_comodin,
        j.estado AS jornada_estado
      FROM partidos p
      JOIN jornadas j
        ON p.jornada_id = j.id
      WHERE p.id = $1
      `,
            [partido_id]
        );

        if (partidoResult.rows.length === 0) {
            await client.query("ROLLBACK");

            return res.status(404).json({
                mensaje: "Partido no encontrado"
            });
        }

        const partido = partidoResult.rows[0];

        await client.query(
            `
      INSERT INTO resultados
        (partido_id, goles_local, goles_visitante)
      VALUES
        ($1, $2, $3)
      ON CONFLICT (partido_id)
      DO UPDATE SET
        goles_local = EXCLUDED.goles_local,
        goles_visitante = EXCLUDED.goles_visitante
      `,
            [
                partido_id,
                Number(goles_local),
                Number(goles_visitante)
            ]
        );

        await calcularPuntosPartido(client, partido_id);

        await actualizarEstadoJornadaSiFinalizada(client, partido.jornada_id);

        await client.query("COMMIT");

        registrarAuditoria(pool, {
            usuario_id: req.usuario?.id,
            accion: "RESULTADO_GUARDADO",
            entidad: "partido",
            entidad_id: partido_id,
            detalle: { goles_local: Number(goles_local), goles_visitante: Number(goles_visitante) },
        });

        return res.json({
            mensaje: "Resultado registrado y puntos calculados correctamente"
        });

    } catch (error) {
        await client.query("ROLLBACK");

        console.error("Error registrando resultado:", error);

        return res.status(500).json({
            mensaje: "Error registrando resultado"
        });

    } finally {
        client.release();
    }
};

/*
====================================
CALCULAR PUNTOS DE UN PARTIDO
====================================
Regla:
- Resultado correcto normal: 1 punto
- Marcador exacto normal: +2 puntos
- Resultado correcto comodín: 2 puntos
- Marcador exacto comodín: +3 puntos
====================================
*/
const calcularPuntosPartido = async (client, partido_id) => {
    const resultadoPartido = await client.query(
        `
    SELECT
      r.partido_id,
      r.goles_local,
      r.goles_visitante,
      p.es_comodin
    FROM resultados r
    JOIN partidos p
      ON r.partido_id = p.id
    WHERE r.partido_id = $1
    `,
        [partido_id]
    );

    if (resultadoPartido.rows.length === 0) return;

    const partido = resultadoPartido.rows[0];

    const golesLocal = Number(partido.goles_local);
    const golesVisitante = Number(partido.goles_visitante);
    const resultadoReal = obtenerResultadoReal(golesLocal, golesVisitante);

    const puntosResultado = partido.es_comodin ? 2 : 1;
    const puntosMarcador = partido.es_comodin ? 3 : 2;

    await client.query(
        `
    UPDATE pronosticos
    SET
      puntos =
        CASE
          WHEN resultado = $2 THEN $3
          ELSE 0
        END
        +
        CASE
          WHEN marcador_local = $4
           AND marcador_visitante = $5 THEN $6
          ELSE 0
        END,
      updated_at = NOW()
    WHERE partido_id = $1
    `,
        [
            partido_id,
            resultadoReal,
            puntosResultado,
            golesLocal,
            golesVisitante,
            puntosMarcador
        ]
    );
};

/*
====================================
ACTUALIZAR ESTADO DE JORNADA
====================================
Si todos los partidos de una jornada tienen resultado,
la jornada pasa a finalizada.
====================================
*/
const actualizarEstadoJornadaSiFinalizada = async (client, jornada_id) => {
    const conteo = await client.query(
        `
    SELECT
      COUNT(p.id) AS total_partidos,
      COUNT(r.partido_id) AS total_resultados
    FROM partidos p
    LEFT JOIN resultados r
      ON p.id = r.partido_id
    WHERE p.jornada_id = $1
    `,
        [jornada_id]
    );

    const totalPartidos = Number(conteo.rows[0].total_partidos);
    const totalResultados = Number(conteo.rows[0].total_resultados);

    if (totalPartidos > 0 && totalPartidos === totalResultados) {
        await client.query(
            `
      UPDATE jornadas
      SET estado = 'finalizada'
      WHERE id = $1
      `,
            [jornada_id]
        );
    }
};

module.exports = {
    registrarResultado
};