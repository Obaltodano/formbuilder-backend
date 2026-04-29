// Middleware para validar que el usuario tenga acceso a la empresa
const validateEmpresa = (req, res, next) => {
    // Extraer empresaId de diferentes fuentes posibles
    const empresaFromBody = req.body.empresaId;
    const empresaFromParams = req.params.empresaId;
    const empresaFromUser = req.user?.empresaId;
    
    // Determinar qué empresaId usar en la validación
    const targetEmpresaId = empresaFromBody || empresaFromParams;
    
    // Validar que el usuario autenticado pertenezca a la empresa
    if (!empresaFromUser) {
        return res.status(401).json({
            msg: 'Usuario no tiene empresa asignada'
        });
    }
    
    if (targetEmpresaId && targetEmpresaId !== empresaFromUser) {
        return res.status(403).json({
            msg: 'No tienes permiso para acceder a esta empresa'
        });
    }
    
    // Agregar empresaId validada al request para uso en controladores
    req.empresaValidada = empresaFromUser;
    next();
};

module.exports = validateEmpresa;
