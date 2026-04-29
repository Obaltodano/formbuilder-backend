// Configuración global para pruebas
const mongoose = require('mongoose');

let mongoConnection;

beforeAll(async () => {
  // Cerrar conexión existente si hay una
  if (mongoose.connection.readyState !== 0) {
    await mongoose.connection.close();
  }
  
  // Conectar a base de datos de prueba
  const mongoUri = process.env.MONGO_TEST_URI || 'mongodb://localhost:27017/formbuilder_test';
  mongoConnection = await mongoose.connect(mongoUri);
});

afterAll(async () => {
  // Limpiar y cerrar conexión
  if (mongoose.connection.readyState !== 0) {
    await mongoose.connection.db.dropDatabase();
    await mongoose.connection.close();
  }
});

beforeEach(async () => {
  // Limpiar colecciones antes de cada prueba
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
});

// Mockear console.log para reducir ruido en pruebas
global.console = {
  ...console,
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  info: jest.fn(),
  debug: jest.fn()
};
