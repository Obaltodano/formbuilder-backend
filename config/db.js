const mongoose = require('mongoose');

const conectarDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/formbuilder');
        console.log('✅ MongoDB Conectado');
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
};

module.exports = conectarDB;