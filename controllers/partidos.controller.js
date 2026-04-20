const { partidos } = require("../data/database");

const obtenerPartidosPorJornada = (req, res) => {

    const jornadaId = parseInt(req.params.jornadaId);

    console.log(partidos);

    const partidosFiltrados = partidos.filter(
        partido => partido.jornada_id === jornadaId
    );

    res.json(partidosFiltrados);

};

module.exports = {
    obtenerPartidosPorJornada
};