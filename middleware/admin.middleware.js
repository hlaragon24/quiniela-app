const validarAdmin = (req, res, next) => {

    try {

        if (!req.user) {

            return res.status(401).json({
                mensaje: "Usuario no autenticado"
            });

        }

        if (req.user.rol !== "admin") {

            return res.status(403).json({
                mensaje: "Acceso solo para administradores"
            });

        }

        next();

    } catch (error) {

        console.error(error);

        res.status(500).json({
            mensaje: "Error validando permisos"
        });

    }

};

module.exports = validarAdmin;