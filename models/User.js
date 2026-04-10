const mongoose = require('mongoose');

const bcrypt = require('bcryptjs');

// ... (Aquí tienes tu UserSchema definido)
const UserSchema = new mongoose.Schema({
    nombre: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    rol: { type: String, enum: ['superadmin', 'gerente', 'empleado'], default: 'empleado' },
    empresaId: { type: String, required: true },
    fechaRegistro: { type: Date, default: Date.now }
});

// Este "hook" se ejecuta automáticamente antes de cada .save()
UserSchema.pre('save', async function () {
    // Solo encriptar si la contraseña es nueva o fue modificada
    if (!this.isModified('password')) {
        return ;
    }

    try {
        const salt = await bcrypt.genSalt(10);
        this.password = await bcrypt.hash(this.password, salt);
    } catch (err) {
        throw err;
    }
});

module.exports = mongoose.model('User', UserSchema);