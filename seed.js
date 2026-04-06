const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');
require('dotenv').config();

const seedDB = async () => {
    try {
        // 1. Conectar a la base de datos
        await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/formbuilder ');
        console.log("🌱 Conectado para sembrar datos...");

        // 2. Limpiar usuarios existentes (Opcional, para no duplicar)
        await User.deleteMany({});

        // 3. Crear Contraseña base
        const salt = await bcrypt.genSalt(10);
        const passwordHashed = await bcrypt.hash('admin123', salt);

        // 4. Definir usuarios iniciales
        const usuarios = [
            {
                nombre: "Super Administrador",
                email: "super@sistema.com",
                password: passwordHashed,
                rol: "superadmin",
                empresaId: "SISTEMA_GLOBAL"
            },
            {
                nombre: "Gerente Juan",
                email: "juan@empresa-a.com",
                password: passwordHashed,
                rol: "gerente",
                empresaId: "EMPRESA_A"
            },
            {
                nombre: "Gerente Marta",
                email: "marta@empresa-b.com",
                password: passwordHashed,
                rol: "gerente",
                empresaId: "EMPRESA_B"
            },
            {
                nombre: "Usuario Pedro",
                email: "pedro@empresa-b.com",
                password: passwordHashed,
                rol: "empleado",
                empresaId: "EMPRESA_B"
            }
        ];

        // 5. Insertar en la BD
        await User.insertMany(usuarios);
        console.log("✅ Base de datos sembrada con éxito.");
        console.log("📧 Usuarios: super@sistema.com, juan@empresa-a.com, marta@empresa-b.com");
        console.log("🔑 Contraseña para todos: admin123");

        process.exit();
    } catch (error) {
        console.error("❌ Error sembrando datos:", error);
        process.exit(1);
    }
};

seedDB();