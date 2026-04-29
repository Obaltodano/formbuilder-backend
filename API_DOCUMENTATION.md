# 📚 Documentación de APIs - FormBuilder Backend

## 🚀 **Información General**

- **Base URL:** `http://localhost:3000`
- **Autenticación:** JWT (Header: `x-auth-token`)
- **Content-Type:** `application/json` (excepto para subida de archivos)
- **CORS:** Configurado para URLs específicas del frontend

---

## 🔐 **Autenticación**

### **Header Requerido**
```
x-auth-token: <JWT_TOKEN>
```

### **Roles de Usuario**
- `superadmin`: Acceso total al sistema
- `gerente`: Gestión de empleados y formularios de su empresa
- `empleado`: Solo puede responder formularios

---

## 📝 **Endpoints de Formularios**

### **POST /api/formularios**
**Crear un nuevo formulario**

```json
{
  "titulo": "Formulario de Seguridad",
  "campos": [
    {
      "label": "Nombre del empleado",
      "tipo": "text",
      "requerido": true
    },
    {
      "label": "Foto del incidente",
      "tipo": "file",
      "requerido": false
    },
    {
      "label": "Evaluación de limpieza",
      "tipo": "cuadricula_unica",
      "requerido": true,
      "filas": ["Pisos", "Baños", "Ventanas"],
      "columnas": ["Malo", "Regular", "Bueno"]
    }
  ]
}
```

**Response (201):**
```json
{
  "msg": "Formulario guardado con éxito",
  "data": {
    "_id": "64f8a1b2c3d4e5f6a7b8c9d0",
    "titulo": "Formulario de Seguridad",
    "campos": [...],
    "empresaId": "empresa-123",
    "creadoPor": "user-id",
    "fechaCreacion": "2024-01-15T10:30:00.000Z"
  }
}
```

### **GET /api/formularios**
**Obtener todos los formularios de la empresa del usuario**

**Response (200):**
```json
[
  {
    "_id": "64f8a1b2c3d4e5f6a7b8c9d0",
    "titulo": "Formulario de Seguridad",
    "campos": [...],
    "empresaId": "empresa-123",
    "esPlantilla": false,
    "fechaCreacion": "2024-01-15T10:30:00.000Z"
  }
]
```

### **GET /api/formularios/:id**
**Obtener un formulario específico por ID**

**Response (200):**
```json
{
  "_id": "64f8a1b2c3d4e5f6a7b8c9d0",
  "titulo": "Formulario de Seguridad",
  "campos": [...],
  "empresaId": "empresa-123",
  "esPlantilla": false,
  "fechaCreacion": "2024-01-15T10:30:00.000Z"
}
```

### **PUT /api/formularios/:id**
**Actualizar un formulario existente**

```json
{
  "titulo": "Formulario Actualizado",
  "campos": [
    {
      "label": "Campo modificado",
      "tipo": "text",
      "requerido": true
    }
  ]
}
```

### **DELETE /api/formularios/:id**
**Eliminar un formulario**

**Response (200):**
```json
{
  "msg": "Formulario eliminado"
}
```

---

## 📊 **Endpoints de Respuestas**

### **POST /api/respuestas**
**Enviar respuesta de formulario con archivos**

**Content-Type:** `multipart/form-data`

**Form Data:**
```
datos: {"campo1": "valor1", "campo2": "valor2"}
empresaId: "empresa-123"
formularioId: "64f8a1b2c3d4e5f6a7b8c9d0"
nombreFormulario: "Formulario de Seguridad"
archivos: [File, File, ...]
```

**Response (201):**
```json
{
  "mensaje": "Reporte y archivos guardados correctamente"
}
```

### **GET /api/respuestas**
**Obtener todas las respuestas de la empresa (para gerentes)**

**Response (200):**
```json
[
  {
    "_id": "64f8a1b2c3d4e5f6a7b8c9d1",
    "formularioId": {
      "_id": "64f8a1b2c3d4e5f6a7b8c9d0",
      "titulo": "Formulario de Seguridad"
    },
    "usuarioId": {
      "_id": "user-id",
      "nombre": "Juan Pérez"
    },
    "datos": {
      "campo1": "valor1",
      "campo2": ["uploads/empresa/juan/formulario/file1.jpg"]
    },
    "fechaEnvio": "2024-01-15T11:00:00.000Z"
  }
]
```

---

## 👥 **Endpoints de Usuarios**

### **GET /api/usuarios/perfil**
**Obtener perfil del usuario actual**

**Response (200):**
```json
{
  "_id": "user-id",
  "nombre": "Juan Pérez",
  "email": "juan@empresa.com",
  "rol": "empleado",
  "empresaId": "empresa-123",
  "dni": "12345678",
  "telefono": "+1234567890",
  "fotoUrl": "uploads/empresa/juan/perfil/foto.jpg",
  "perfilCompletado": true,
  "fechaRegistro": "2024-01-01T00:00:00.000Z"
}
```

### **PUT /api/usuarios/perfil**
**Actualizar datos del perfil**

```json
{
  "nombre": "Juan Pérez Actualizado",
  "dni": "87654321",
  "telefono": "+9876543210"
}
```

### **POST /api/usuarios/perfil/foto**
**Subir foto de perfil**

**Content-Type:** `multipart/form-data`

**Form Data:**
```
foto: [File]
```

**Response (200):**
```json
{
  "msg": "Foto actualizada",
  "fotoUrl": "uploads/empresa/juan/perfil/1642234567890-photo.jpg"
}
```

---

## 🔑 **Endpoints de Autenticación**

### **POST /api/auth/login**
**Iniciar sesión**

```json
{
  "email": "juan@empresa.com",
  "password": "password123"
}
```

**Response (200):**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "user-id",
    "nombre": "Juan Pérez",
    "email": "juan@empresa.com",
    "rol": "empleado",
    "empresaId": "empresa-123"
  }
}
```

### **POST /api/auth/register**
**Registrar nuevo usuario**

```json
{
  "nombre": "Nuevo Usuario",
  "email": "nuevo@empresa.com",
  "password": "password123",
  "rol": "empleado",
  "empresaId": "empresa-123"
}
```

---

## 🏢 **Endpoints de Empresa**

### **GET /api/backoffice/empresas**
**Obtener lista de empresas (Solo SuperAdmin)**

### **POST /api/backoffice/empresas**
**Crear nueva empresa (Solo SuperAdmin)**

### **GET /api/market/templates**
**Obtener plantillas de formularios disponibles**

**Response (200):**
```json
[
  {
    "_id": "template-id",
    "titulo": "Plantilla de Seguridad",
    "descripcion": "Formulario estándar de reportes de seguridad",
    "categoria": "Seguridad",
    "campos": [...],
    "precio": 0,
    "imagenPreview": "preview.jpg",
    "instalaciones": 150
  }
]
```

---

## 📁 **Manejo de Archivos**

### **Estructura de Carpetas**
```
uploads/
├── {empresaId}/
│   ├── {nombreUsuario}/
│   │   ├── perfil/
│   │   │   └── foto.jpg
│   │   └── {nombreFormulario}/
│   │       ├── 1642234567890-file1.jpg
│   │       └── 1642234567891-file2.pdf
```

### **Tipos de Archivos Soportados**
- Imágenes: `.jpg`, `.jpeg`, `.png`, `.gif`
- Documentos: `.pdf`, `.doc`, `.docx`
- Videos: `.mp4`, `.avi`, `.mov`

### **Límites**
- Tamaño máximo: 10MB por archivo
- Máximo 5 archivos por respuesta

---

## ⚠️ **Códigos de Error**

| Código | Descripción | Solución |
|--------|-------------|----------|
| 400 | Bad Request | Datos inválidos o faltantes |
| 401 | Unauthorized | Token inválido, expirado o ausente |
| 403 | Forbidden | No tienes permiso para esta empresa |
| 404 | Not Found | Recurso no encontrado |
| 409 | Conflict | Email duplicado o recurso ya existe |
| 413 | Payload Too Large | Archivo demasiado grande |
| 422 | Unprocessable Entity | Error de validación |
| 500 | Internal Server Error | Error del servidor |

---

## 🔧 **Ejemplos de Uso**

### **JavaScript/Fetch**
```javascript
// Crear formulario
const response = await fetch('/api/formularios', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-auth-token': localStorage.getItem('token')
  },
  body: JSON.stringify({
    titulo: 'Mi Formulario',
    campos: [{ label: 'Campo', tipo: 'text', requerido: true }]
  })
});

const data = await response.json();
```

### **cURL**
```bash
# Obtener formularios
curl -X GET http://localhost:3000/api/formularios \
  -H "x-auth-token: TU_JWT_TOKEN"

# Crear formulario
curl -X POST http://localhost:3000/api/formularios \
  -H "Content-Type: application/json" \
  -H "x-auth-token: TU_JWT_TOKEN" \
  -d '{"titulo":"Formulario Test","campos":[{"label":"Test","tipo":"text","requerido":true}]}'
```

---

## 🛡️ **Consideraciones de Seguridad**

1. **JWT Tokens:** Vencen en 24h (configurable)
2. **Rate Limiting:** Implementado en endpoints críticos
3. **Validación de Empresa:** Cada request verifica empresaId del usuario
4. **Sanitización:** Todos los inputs son validados y sanitizados
5. **CORS:** Restringido a dominios específicos
6. **File Upload:** Validación de tipo y tamaño de archivos

---

## 📝 **Notas de Desarrollo**

- **Base de Datos:** MongoDB con Mongoose ODM
- **Autenticación:** JWT con bcryptjs para passwords
- **File Storage:** Sistema de archivos local con estructura organizada
- **Logging:** Implementado con Winston (producción) y console (desarrollo)
- **Testing:** Jest con Supertest para pruebas unitarias
- **Environment Variables:** Usar `.env` para configuración sensible

---

## 🔄 **Versiones de API**

- **v1.0.0:** Versión actual estable
- **Backward Compatibility:** Mantenida para endpoints principales
- **Deprecation:** Se anunciará con 3 meses de anticipación

---

*Última actualización: Enero 2024*
