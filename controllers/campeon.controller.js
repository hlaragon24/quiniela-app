const { campeonesPronosticados } = require("../config/campeon");
const { pronosticos } = require("../config/database");

let campeonReal = null;


const registrarPronosticoCampeon = (req, res) => {

    const { equipo } = req.body;

    const usuarioId = req.usuario.id;


    const existe = campeonesPronosticados.find(
        c => c.usuario_id === usuarioId
    );


    if (existe) {

        return res.status(400).json({
            mensaje: "Ya registraste tu campeón"
        });

    }


    campeonesPronosticados.push({
        usuario_id: usuarioId,
        equipo
    });


    res.json({
        mensaje: "Pronóstico de campeón registrado correctamente"
    });

};


const declararCampeonReal = (req, res) => {

    const { equipo } = req.body;

    campeonReal = equipo;


    campeonesPronosticados.forEach(pronostico => {

        if (pronostico.equipo === campeonReal) {

            pronosticos.push({
                usuario_id: pronostico.usuario_id,
                puntos: 10,
                tipo: "campeon"
            });

        }

    });


    res.json({
        mensaje: "Campeón declarado correctamente"
    });

};


const verCampeonReal = (req, res) => {

    res.json({
        campeonReal
    });

};


module.exports = {
    registrarPronosticoCampeon,
    declararCampeonReal,
    verCampeonReal
};