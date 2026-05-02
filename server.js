const path = require('path');
const express = require('express');
const conectarDB = require('./config/db');
const cors = require('cors');
require('dotenv').config();

const app = express();

// Conectar a la base de datos
conectarDB();

require('./models/User');       // Asegúrate de que el nombre del archivo sea correcto
require('./models/Formulario');
require('./models/Respuesta');

// Modelos SaaS
require('./models/Empresa');
require('./models/Plan');
require('./models/Pago');
require('./models/Cupon');
require('./models/Grupo');

// Middlewares
// CORS - Permitir cualquier origen en desarrollo
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, x-auth-token, Authorization');
    res.header('Access-Control-Allow-Credentials', 'true');
    
    // Responder inmediatamente a solicitudes OPTIONS (preflight)
    if (req.method === 'OPTIONS') {
        return res.sendStatus(200);
    }
    next();
});

// CORS middleware adicional para configuración específica
app.use(cors({
    origin: true, // Permitir cualquier origen en desarrollo
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'x-auth-token', 'Authorization', 'Origin', 'X-Requested-With', 'Accept'],
    credentials: true,
    preflightContinue: false,
    optionsSuccessStatus: 200
}));

app.use(express.json());

// Definir Rutas
app.use('/api/auth', require('./routes/auth'));
app.use('/api/usuarios', require('./routes/usuarios')); // Para que el gerente cree empleados
app.use('/api/usuarios', require('./routes/perfil')); // Rutas de perfil (Contrato v1.0)
app.use('/api/formularios', require('./routes/formularios'));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/api/respuestas', require('./routes/respuestas'));


// ... dentro de Definir Rutas
app.use('/api/backoffice', require('./routes/backoffice')); // Nueva ruta para el SuperAdmin
app.use('/api/market', require('./routes/market'));

// Rutas SaaS
app.use('/api/admin', require('./routes/admin')); // SuperAdmin dashboard
app.use('/api/empresa', require('./routes/empresa')); // Portal empresa/gerente
app.use('/api/public', require('./routes/public')); // Marketplace público

// Middleware de manejo de errores (debe ir después de todas las rutas)
const errorHandler = require('./middleware/errorHandler');
app.use(errorHandler);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Servidor en puerto ${PORT}`));

// Exportar para testing
module.exports = app;