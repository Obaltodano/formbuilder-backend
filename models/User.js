const mongoose = require('mongoose');

const bcrypt = require('bcryptjs');

// ... (Aquí tienes tu UserSchema definido)

// Este "hook" se ejecuta automáticamente antes de cada .save()
UserSchema.pre('save', async function (next) {
    // Solo encriptar si la contraseña es nueva o fue modificada
    if (!this.isModified('password')) {
        return next();
    }

    try {
        const salt = await bcrypt.genSalt(10);
        this.password = await bcrypt.hash(this.password, salt);
        next();
    } catch (err) {
        next(err);
    }
});

module.exports = mongoose.model('User', UserSchema);