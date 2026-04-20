const crearPartidosLote = async (req, res) => {

    try {

        const { jornada_id, partidos } = req.body;

        if (!jornada_id || !partidos || partidos.length === 0) {

            return res.status(400).json({
                mensaje: "Datos incompletos"
            });

        }

        const values = [];

        const placeholders = partidos.map((p, index) => {

            const baseIndex = index * 5;

            values.push(
                jornada_id,
                p.local,
                p.visitante,
                p.fecha,
                p.es_comodin ?? false
            );

            return `($${baseIndex + 1},$${baseIndex + 2},$${baseIndex + 3},$${baseIndex + 4},$${baseIndex + 5})`;

        });

        const query = `
            INSERT INTO partidos
            (
                jornada_id,
                local,
                visitante,
                fecha,
                es_comodin
            )
            VALUES
            ${placeholders.join(",")}
            RETURNING *
        `;

        const nuevosPartidos = await pool.query(query, values);

        res.json({
            mensaje: "Partidos creados correctamente",
            total: nuevosPartidos.rows.length,
            data: nuevosPartidos.rows
        });

    } catch (error) {

        console.error(error);

        res.status(500).json({
            mensaje: "Error creando partidos en lote"
        });

    }

};

module.exports = {
    obtenerPartidosPorJornada,
    crearPartido,
    crearPartidosLote
};