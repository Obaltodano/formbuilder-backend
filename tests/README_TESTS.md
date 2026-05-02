# 🧪 Tests API v1.0 - FormBuilder SaaS

## 📋 Cobertura de Tests

| Módulo | Endpoints Testeados | Archivo |
|--------|---------------------|---------|
| **Auth** | POST /login, GET /verify, POST /logout | `api.v1.test.js` |
| **Perfil** | GET/PUT /perfil, PUT /password, POST /perfil/foto | `api.v1.test.js` |
| **Equipo** | GET /equipo, POST /registro-equipo, DELETE /:id | `api.v1.test.js` |
| **Formularios** | GET/POST/PUT/PATCH /formularios | `api.v1.test.js` |
| **Respuestas** | POST (multipart), GET, DELETE /respuestas | `api.v1.test.js` |
| **Branding** | GET/PUT /branding, POST /logo | `api.v1.test.js` |
| **Uso** | GET /usage, GET /limits | `api.v1.test.js` |
| **Pagos** | GET /pagos | `api.v1.test.js` |

---

## 🚀 Cómo Ejecutar

### 1. Asegúrate de tener el servidor configurado

```bash
# En server.js, exporta la app para testing:
module.exports = app;
```

### 2. Ejecutar todos los tests

```bash
npm test
# o
npx jest tests/api.v1.test.js
```

### 3. Ejecutar con cobertura

```bash
npm run test:coverage
```

### 4. Ejecutar en modo watch (desarrollo)

```bash
npm run test:watch
```

---

## 📁 Estructura de Tests

```
tests/
├── api.v1.test.js          # Tests completos de API
├── saas.test.js            # Tests de funcionalidad SaaS
├── README_TESTS.md         # Este archivo
└── test-image.png          # Archivos de prueba (temporales)
```

---

## 🎯 Tests por Endpoint

### 🔐 Auth
- ✅ Login exitoso retorna token + empresa completa
- ✅ Login fallido retorna 401 + código `INVALID_CREDENTIALS`
- ✅ Verify token válido retorna 200
- ✅ Verify sin token retorna 401 + `TOKEN_MISSING`
- ✅ Logout exitoso retorna 200

### 👤 Perfil
- ✅ GET /perfil retorna datos completos del usuario
- ✅ PUT /perfil actualiza nombre y perfil
- ✅ POST /perfil/foto sube imagen (multipart)
- ✅ PUT /password cambia contraseña con validación

### 👥 Gestión de Equipo
- ✅ GET /equipo lista usuarios de la empresa
- ✅ POST /registro-equipo crea usuario con límite de plan
- ❌ Email duplicado retorna 409 + `EMAIL_EXISTS`
- ❌ Empleado no puede crear usuarios (403)

### 📋 Formularios
- ✅ POST crea formulario con 14 tipos de campos
- ❌ Sin campos retorna 400
- ❌ Empleado no puede crear (403)
- ✅ GET lista formularios con filtros
- ✅ GET /:id retorna formulario específico
- ✅ PUT actualiza formulario
- ✅ PATCH /:id/activar toggle estado

### 📤 Respuestas (CRÍTICO)
- ✅ POST envía respuesta con datos JSON
- ✅ POST envía respuesta con archivos (multipart)
- ✅ Los archivos se guardan con campoId como nombre de campo
- ✅ Las rutas de archivos se actualizan en `datos`
- ❌ Sin datos requeridos retorna 400
- ✅ GET lista respuestas
- ✅ GET /:id retorna respuesta con archivos
- ✅ DELETE elimina respuesta y archivos físicos

### 🎨 Branding
- ✅ GET /branding retorna configuración de marca
- ✅ PUT /branding actualiza colores y nombreApp
- ❌ Color hexadecimal inválido retorna 400
- ✅ POST /logo sube imagen (multipart)

### 📊 Uso y Límites
- ✅ GET /usage retorna usados, límites, porcentajes, alertas
- ✅ GET /limits retorna límites del plan actual

### 💰 Pagos
- ✅ GET /pagos retorna historial

---

## 📝 Notas para el Equipo Frontend

### Multipart / FormData

```javascript
// Ejemplo de envío de respuesta con archivos
const formData = new FormData();
formData.append('empresaId', 'mi-empresa');
formData.append('formularioId', 'id-del-form');
formData.append('datos', JSON.stringify({
  campo_001: 'Texto',
  campo_005: 'se-actualiza-con-ruta-del-archivo'
}));
formData.append('campo_005', fileInput.files[0]); // El nombre debe ser el campoId

await axios.post('/api/respuestas', formData, {
  headers: { 'Content-Type': 'multipart/form-data' }
});
```

### Headers Requeridos

```javascript
// Todas las rutas protegidas necesitan:
headers: {
  'x-auth-token': localStorage.getItem('token')
}
```

### Códigos de Error Esperados

| Código | HTTP | Cuándo ocurre |
|--------|------|---------------|
| `TOKEN_MISSING` | 401 | Sin header x-auth-token |
| `TOKEN_INVALID` | 401 | Token expirado o mal formado |
| `INVALID_CREDENTIALS` | 401 | Login fallido |
| `ROLE_REQUIRED` | 403 | Rol insuficiente |
| `EMPRESA_NOT_ACTIVE` | 403 | Empresa suspendida |
| `LIMITE_PLAN_EXCEDIDO` | 403 | Se alcanzó límite del plan |
| `EMAIL_EXISTS` | 409 | Email ya registrado |
| `FORMULARIO_NOT_FOUND` | 404 | ID de formulario inválido |
| `MISSING_FIELDS` | 400 | Faltan campos obligatorios |
| `INVALID_COLOR` | 400 | Color hex inválido |

---

## 🔧 Configuración de Jest

En `package.json`:

```json
{
  "scripts": {
    "test": "jest --detectOpenHandles",
    "test:watch": "jest --watch --detectOpenHandles",
    "test:coverage": "jest --coverage --detectOpenHandles"
  },
  "jest": {
    "testEnvironment": "node",
    "coveragePathIgnorePatterns": [
      "/node_modules/"
    ],
    "testTimeout": 30000
  }
}
```

---

## 🐛 Troubleshooting

### Error: "Cannot find module '../server'"
Asegúrate de que `server.js` exporte la app:
```javascript
module.exports = app;
```

### Error: "Connection already closed"
Los tests cierran la conexión a MongoDB al final. Asegúrate de que `afterAll` cierre la conexión correctamente.

### Error: "EADDRINUSE: Port 3000 already in use"
Cierra el servidor antes de correr tests, o usa un puerto diferente en los tests.

---

**Documentación de Tests v1.0** | FormBuilder SaaS
