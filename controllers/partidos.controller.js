const db = require("../config/database");

console.log("🔥 CONTROLLER PARTIDOS CARGADO");


/*
====================================
OBTENER PARTIDOS POR JORNADA
====================================
*/
const obtenerPartidosPorJornada = async (req, res) => {

    try {

        const { jornadaId } = req.params;

        const resultado = await db.query(
            `
            SELECT 
                p.*
            FROM partidos p
            WHERE p.jornada_id = $1
            ORDER BY p.id
            `,
            [jornadaId]
        );

        res.json(resultado.rows);

    } catch (error) {

        console.error("Error obtenerPartidosPorJornada:", error);

        res.status(500).json({
            mensaje: "Error al obtener partidos"
        });

    }

};


/*
====================================
CREAR PARTIDO
====================================
*/
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

        console.error("Error crearPartido:", error);

        res.status(500).json({
            mensaje: "Error al crear partido"
        });

    }

};


/*
====================================
CREAR PARTIDOS EN LOTE
====================================
*/
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

        console.error("Error crearPartidosLote:", error);

        res.status(500).json({
            mensaje: "Error al crear partidos en lote"
        });

    }

};


/*
====================================
EDITAR PARTIDO
====================================
*/
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

        console.error("Error editarPartido:", error);

        res.status(500).json({
            mensaje: "Error editando partido"
        });

    }

};


/*
====================================
ELIMINAR PARTIDO
====================================
*/
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

        console.error("Error eliminarPartido:", error);

        res.status(500).json({
            mensaje: "Error eliminando partido"
        });

    }

};


/*
====================================
OBTENER TODOS LOS PARTIDOS (ADMIN)
====================================
*/
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

        console.error("Error obtenerTodosPartidos:", error);

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
    eliminarPartido
};