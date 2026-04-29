const errorHandler = (err, req, res, next) => {
    console.error('=== ERROR DETECTADO ===');
    console.error('Timestamp:', new Date().toISOString());
    console.error('URL:', req.originalUrl);
    console.error('Method:', req.method);
    console.error('User ID:', req.user?.id || req.user?._id || 'No autenticado');
    console.error('Error Message:', err.message);
    console.error('Stack Trace:', err.stack);
    console.error('======================');

    // Errores de Mongoose - Validación
    if (err.name === 'ValidationError') {
        const errores = Object.values(err.errors).map(error => error.message);
        return res.status(400).json({
            msg: 'Error de validación',
            errores: errores
        });
    }

    // Errores de Mongoose - Duplicado
    if (err.code === 11000) {
        const campo = Object.keys(err.keyValue)[0];
        return res.status(400).json({
            msg: `El campo ${campo} ya existe`,
            campo: campo
        });
    }

    // Errores de Mongoose - CastError (ID inválido)
    if (err.name === 'CastError') {
        return res.status(400).json({
            msg: 'ID inválido proporcionado'
        });
    }

    // Errores de JWT
    if (err.name === 'JsonWebTokenError') {
        return res.status(401).json({
            msg: 'Token inválido'
        });
    }

    if (err.name === 'TokenExpiredError') {
        return res.status(401).json({
            msg: 'Token expirado'
        });
    }

    // Error de multer (subida de archivos)
    if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
            msg: 'Archivo demasiado grande'
        });
    }

    if (err.code === 'LIMIT_UNEXPECTED_FILE') {
        return res.status(400).json({
            msg: 'Número de archivos excedido'
        });
    }

    // Error por defecto
    const statusCode = err.statusCode || 500;
    const message = process.env.NODE_ENV === 'production' 
        ? 'Error interno del servidor' 
        : err.message;

    res.status(statusCode).json({
        msg: message,
        ...(process.env.NODE_ENV !== 'production' && { stack: err.stack })
    });
};

module.exports = errorHandler;
