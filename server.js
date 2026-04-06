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

// Middlewares
//permitir que el frontend pueda comunicarse con el backend sin problemas de CORS

app.use(cors({
    origin: '*', // El puerto de tu Frontend (Vite)
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'x-auth-token', 'Authorization'], // <--- ESTO ES VITAL
    credentials: true
}));


app.use(express.json());

// Definir Rutas
app.use('/api/auth', require('./routes/auth'));
app.use('/api/usuarios', require('./routes/usuarios')); // Para que el gerente cree empleados
app.use('/api/formularios', require('./routes/formularios'));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/api/respuestas', require('./routes/respuestas'));


// ... dentro de Definir Rutas
app.use('/api/backoffice', require('./routes/backoffice')); // Nueva ruta para el SuperAdmin
app.use('/api/market', require('./routes/market'));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Servidor en puerto ${PORT}`));