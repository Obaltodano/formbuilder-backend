const jwt = require('jsonwebtoken');

module.exports = function(req, res, next) {
    // 1. Intentar leer el token
    const token = req.header('x-auth-token');

    console.log("--- Verificando Token ---");
    console.log("Token recibido en header:", token ? "SÍ" : "NO");

    if (!token) {
        return res.status(401).json({ msg: 'No hay token, permiso denegado' });
    }

    try {
        // Asegúrate de que esta clave sea EXACTAMENTE la misma que en authController
        const cifrado = jwt.verify(token, process.env.JWT_SECRET); // <--- Usa la misma variable
        req.user = cifrado.usuario || cifrado;
        next();
    } catch (error) {
        console.log("Error al verificar token:", error.message);
        res.status(401).json({ msg: 'Token no válido o expirado' });
    }
};