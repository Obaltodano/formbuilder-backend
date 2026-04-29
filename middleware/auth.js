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
        
        // Estandarizar: siempre asignar el objeto completo del token decodificado
        req.user = cifrado;
        
        // Logging para debugging (remover en producción)
        console.log("Token válido para usuario ID:", req.user.id || req.user._id);
        next();
    } catch (error) {
        console.log("Error al verificar token:", error.message);
        res.status(401).json({ msg: 'Token no válido o expirado' });
    }
};