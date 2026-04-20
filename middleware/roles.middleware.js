const { users } = require("../data/users");


const soloAdmin = (req, res, next) => {

    const usuario = users.find(
        user => user.id === req.usuario.id
    );


    if (!usuario || usuario.rol !== "admin") {

        return res.status(403).json({
            mensaje: "Acceso solo para administradores"
        });

    }

    next();

};


module.exports = soloAdmin;