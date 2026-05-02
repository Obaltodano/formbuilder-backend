# 📘 DOCUMENTACIÓN API - FORMBUILDER SaaS v1.0
> **Para Equipo Frontend** | Backend reestructurado según Contrato v1.0 | Mayo 2026

---

## 📍 **CONFIGURACIÓN BASE**

```javascript
const API_BASE_URL = 'http://localhost:3000';

// Configuración Axios recomendada
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Interceptor para agregar token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers['x-auth-token'] = token;
  }
  return config;
});
```

---

## 🔐 **1. AUTENTICACIÓN**

### **POST `/api/auth/login`**
Iniciar sesión y obtener token JWT.

**Request:**
```json
{
  "email": "gerente@empresa.com",
  "password": "contraseña123"
}
```

**Response 200:**
```json
{
  "exito": true,
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "_id": "65a1b2c3...",
    "nombre": "Juan Pérez",
    "email": "gerente@empresa.com",
    "rol": "gerente",
    "empresaId": "constructora-xyz",
    "fotoUrl": null,
    "perfil": {
      "dni": "12345678",
      "telefono": "+51 987 654 321",
      "departamento": "Operaciones",
      "cargo": "Supervisor"
    },
    "configuracion": {
      "notificacionesEmail": true,
      "tema": "dark"
    },
    "empresa": {
      "nombre": "Constructora XYZ",
      "status": "activa",
      "branding": {
        "nombreApp": "Reportes XYZ",
        "colorPrimario": "#3B82F6",
        "colorSecundario": "#1E293B",
        "logoUrl": null
      },
      "plan": {
        "id": "plan_pro",
        "nombre": "Profesional",
        "precio": 99.99,
        "limites": {
          "usuarios": 25,
          "formularios": 50,
          "storage": 5120,
          "respuestas": 10000
        }
      }
    }
  }
}
```

**Response 401 (Credenciales inválidas):**
```json
{
  "error": "Credenciales inválidas",
  "code": "INVALID_CREDENTIALS"
}
```

**Response 403 (Empresa no activa):**
```json
{
  "error": "Empresa suspendida. Contacte al administrador.",
  "code": "EMPRESA_NOT_ACTIVE",
  "status": "suspendida"
}
```

---

### **GET `/api/auth/verify`**
Verificar si el token es válido (para rutas protegidas).

**Headers:**
```
x-auth-token: <JWT_TOKEN>
```

**Response 200:**
```json
{
  "exito": true,
  "valido": true,
  "user": { /* mismo formato que login */ }
}
```

---

### **POST `/api/auth/logout`**
Cerrar sesión (registra logout en servidor).

**Headers:**
```
x-auth-token: <JWT_TOKEN>
```

**Response 200:**
```json
{
  "exito": true,
  "mensaje": "Sesión cerrada exitosamente"
}
```

---

## 👤 **2. PERFIL DE USUARIO**

### **GET `/api/usuarios/perfil`**
Obtener perfil del usuario logueado.

**Response 200:**
```json
{
  "exito": true,
  "data": {
    "_id": "65a1b2c3...",
    "nombre": "Juan Pérez",
    "email": "juan@empresa.com",
    "rol": "empleado",
    "empresaId": "constructora-xyz",
    "fotoUrl": "uploads/empresa/avatars/juan_1705321200000.png",
    "perfil": {
      "dni": "12345678",
      "telefono": "+51 999 888 777",
      "departamento": "Operaciones",
      "cargo": "Inspector"
    },
    "configuracion": {
      "notificacionesEmail": true,
      "tema": "dark"
    },
    "ultimoAcceso": "2024-01-15T14:30:00Z",
    "createdAt": "2024-01-10T08:00:00Z"
  }
}
```

---

### **PUT `/api/usuarios/perfil`**
Actualizar datos del perfil.

**Request:**
```json
{
  "nombre": "Juan Pérez Actualizado",
  "perfil": {
    "dni": "12345678",
    "telefono": "+51 999 888 777",
    "departamento": "Seguridad",
    "cargo": "Supervisor de Seguridad"
  }
}
```

**Response 200:**
```json
{
  "exito": true,
  "mensaje": "Perfil actualizado exitosamente",
  "data": { /* perfil actualizado */ }
}
```

---

### **POST `/api/usuarios/perfil/foto`**
Subir foto de perfil.

**Content-Type:** `multipart/form-data`

**FormData:**
```
fotoPerfil: File (JPEG, PNG, máx 5MB)
```

**Response 200:**
```json
{
  "exito": true,
  "mensaje": "Foto de perfil actualizada",
  "fotoUrl": "uploads/empresa/avatars/juan_1705321200000.png",
  "data": {
    "_id": "...",
    "fotoUrl": "uploads/empresa/avatars/juan_1705321200000.png"
  }
}
```

---

### **PUT `/api/usuarios/password`**
Cambiar contraseña.

**Request:**
```json
{
  "passwordActual": "oldpass123",
  "passwordNuevo": "newpass456"
}
```

**Response 200:**
```json
{
  "exito": true,
  "mensaje": "Contraseña actualizada exitosamente"
}
```

---

## 👥 **3. GESTIÓN DE EQUIPO (Solo Gerente/SuperAdmin)**

### **GET `/api/usuarios/equipo`**
Listar todos los usuarios de la empresa.

**Query Params (opcional para SuperAdmin):**
```
?empresaId=otra-empresa  (solo superadmin)
```

**Response 200:**
```json
{
  "exito": true,
  "count": 5,
  "data": [
    {
      "_id": "65a1b2c3...",
      "nombre": "María García",
      "email": "maria@empresa.com",
      "rol": "empleado",
      "fotoUrl": null,
      "perfil": { "cargo": "Inspector" },
      "activo": true,
      "createdAt": "2024-01-10T08:00:00Z"
    }
  ]
}
```

---

### **POST `/api/usuarios/registro-equipo`**
Crear nuevo usuario en la empresa.

**⚠️ Importante:** Verifica automáticamente el límite de usuarios del plan.

**Request:**
```json
{
  "nombre": "Nuevo Empleado",
  "email": "nuevo@empresa.com",
  "password": "temporal123",
  "rol": "empleado"  // o "gerente"
}
```

**Response 201:**
```json
{
  "exito": true,
  "mensaje": "Usuario creado exitosamente",
  "data": {
    "_id": "65a1b2c3...",
    "nombre": "Nuevo Empleado",
    "email": "nuevo@empresa.com",
    "rol": "empleado",
    "empresaId": "constructora-xyz",
    "activo": true
  }
}
```

**Response 403 (Límite excedido):**
```json
{
  "error": "Límite de usuarios alcanzado (25). Actualice su plan.",
  "code": "LIMITE_PLAN_EXCEDIDO",
  "recurso": "usuarios",
  "limite": 25,
  "usado": 25
}
```

---

### **DELETE `/api/usuarios/:id`**
Eliminar (desactivar) usuario del equipo.

**Response 200:**
```json
{
  "exito": true,
  "mensaje": "Usuario eliminado exitosamente"
}
```

**Response 400 (Último gerente):**
```json
{
  "error": "No se puede eliminar al único gerente de la empresa",
  "code": "LAST_GERENTE"
}
```

---

### **PATCH `/api/usuarios/:id/activar`**
Activar/desactivar usuario.

**Response 200:**
```json
{
  "exito": true,
  "mensaje": "Usuario desactivado",
  "data": { "activo": false }
}
```

---

## 📋 **4. FORMULARIOS**

### **GET `/api/formularios`**
Listar formularios de la empresa.

**Query Params:**
```
?activo=true&esPlantilla=false
```

**Response 200:**
```json
{
  "exito": true,
  "count": 10,
  "data": [
    {
      "_id": "65a1b2c3d4e5f6g7h8i9j0k1",
      "titulo": "Reporte de Inspección Diaria",
      "descripcion": "Formulario para registrar el estado diario",
      "empresaId": "constructora-xyz",
      "creadoPor": {
        "_id": "...",
        "nombre": "Juan Pérez",
        "email": "gerente@empresa.com"
      },
      "campos": [
        {
          "id": "campo_001",
          "label": "Nombre del inspector",
          "tipo": "texto_corto",
          "requerido": true,
          "placeholder": "Ej: Juan Pérez"
        },
        {
          "id": "campo_002",
          "tipo": "foto",
          "label": "Foto de evidencia",
          "requerido": true
        },
        {
          "id": "campo_003",
          "tipo": "cuadricula_unica",
          "label": "Evaluación de áreas",
          "requerido": true,
          "filas": ["Limpieza", "Organización", "Seguridad"],
          "columnas": ["Excelente", "Bueno", "Regular", "Malo"]
        }
      ],
      "activo": true,
      "esPlantilla": false,
      "createdAt": "2024-01-15T10:30:00Z",
      "updatedAt": "2024-01-15T10:30:00Z"
    }
  ]
}
```

---

### **GET `/api/formularios/:id`**
Obtener detalle de un formulario específico.

**Response 200:**
```json
{
  "exito": true,
  "data": { /* formulario completo */ }
}
```

---

### **POST `/api/formularios`**
Crear nuevo formulario.

**⚠️ Importante:** Verifica límite de formularios del plan.

**Request:**
```json
{
  "titulo": "Inspección de Seguridad",
  "descripcion": "Checklist de seguridad industrial",
  "campos": [
    {
      "id": "campo_001",
      "label": "Nombre del inspector",
      "tipo": "texto_corto",
      "requerido": true,
      "placeholder": "Ej: Juan Pérez"
    },
    {
      "id": "campo_002",
      "label": "Área de inspección",
      "tipo": "dropdown",
      "requerido": true,
      "opciones": ["Planta 1", "Planta 2", "Almacén"]
    },
    {
      "id": "campo_003",
      "label": "Foto del área",
      "tipo": "foto",
      "requerido": true
    },
    {
      "id": "campo_004",
      "label": "Coordenadas GPS",
      "tipo": "gps",
      "requerido": false
    },
    {
      "id": "campo_005",
      "label": "Estado de equipos",
      "tipo": "cuadricula_unica",
      "requerido": true,
      "filas": ["Compresor", "Generador", "Andamios"],
      "columnas": ["Operativo", "Dañado", "En mantenimiento"]
    },
    {
      "id": "campo_006",
      "label": "Nivel de satisfacción",
      "tipo": "escala",
      "requerido": true,
      "escalaConfig": {
        "min": 1,
        "max": 5,
        "etiquetaMin": "Muy insatisfecho",
        "etiquetaMax": "Muy satisfecho"
      }
    }
  ],
  "esPlantilla": false
}
```

**Response 201:**
```json
{
  "exito": true,
  "mensaje": "Formulario creado exitosamente",
  "data": { /* formulario creado */ }
}
```

**Response 403 (Límite excedido):**
```json
{
  "error": "Límite de formularios alcanzado (50). Actualice su plan.",
  "code": "LIMITE_PLAN_EXCEDIDO"
}
```

---

### **PUT `/api/formularios/:id`**
Actualizar formulario existente.

**Request:** (mismo formato que POST)

**Response 200:**
```json
{
  "exito": true,
  "mensaje": "Formulario actualizado exitosamente",
  "data": { /* formulario actualizado */ }
}
```

---

### **DELETE `/api/formularios/:id`**
Eliminar (desactivar) formulario.

**Response 200:**
```json
{
  "exito": true,
  "mensaje": "Formulario eliminado exitosamente"
}
```

---

### **PATCH `/api/formularios/:id/activar`**
Activar/desactivar formulario.

**Response 200:**
```json
{
  "exito": true,
  "mensaje": "Formulario desactivado",
  "data": { "activo": false }
}
```

---

## 📤 **5. RESPUESTAS (CRÍTICO - Multipart)**

### **POST `/api/respuestas`**
Enviar respuesta de formulario con archivos.

**⚠️ CRÍTICO:** Este endpoint requiere `multipart/form-data`.

**Content-Type:** `multipart/form-data`

**FormData:**
```javascript
const formData = new FormData();

// 1. Metadatos (strings)
formData.append('empresaId', 'constructora-xyz');
formData.append('formularioId', '65a1b2c3d4e5f6g7h8i9j0k1');

// 2. Datos JSON stringificados
// Las llaves son los campoId del formulario
formData.append('datos', JSON.stringify({
  "campo_001": "Juan Pérez",
  "campo_002": "Planta 1",
  "campo_004": "19.4326, -99.1332",  // GPS como "lat, lng"
  "campo_005": {
    "Compresor": "Operativo",
    "Generador": "En mantenimiento",
    "Andamios": "Operativo"
  },
  "campo_006": ["Casco", "Guantes", "Botas"],  // múltiple
  "campo_007": 4  // escala 1-5
}));

// 3. Archivos - EL NOMBRE DEL CAMPO debe coincidir con campoId
// El backend procesará estos archivos y actualizará el objeto 'datos'
formData.append('campo_003', fileObjectFoto);  // Foto
formData.append('campo_008', fileObjectVideo); // Video
formData.append('campo_009', fileObjectPDF);   // Adjunto

// Enviar
await axios.post('/api/respuestas', formData, {
  headers: { 'Content-Type': 'multipart/form-data' }
});
```

**Response 201:**
```json
{
  "exito": true,
  "mensaje": "Respuesta enviada exitosamente",
  "data": {
    "_id": "65a1b2c3d4e5f6g7h8i9j0k2",
    "formularioId": "65a1b2c3d4e5f6g7h8i9j0k1",
    "fechaEnvio": "2024-01-15T14:30:00Z",
    "archivosSubidos": 3
  }
}
```

**Response 403 (Límite de respuestas excedido):**
```json
{
  "error": "Límite de respuestas alcanzado (10000). Actualice su plan.",
  "code": "LIMITE_PLAN_EXCEDIDO"
}
```

---

### **GET `/api/respuestas`**
Listar respuestas.

**Query Params:**
```
?formularioId=xxx  // Filtrar por formulario específico
```

**Response 200:**
```json
{
  "exito": true,
  "count": 150,
  "data": [
    {
      "_id": "65a1b2c3d4e5f6g7h8i9j0k2",
      "formularioId": {
        "_id": "...",
        "titulo": "Reporte de Inspección Diaria"
      },
      "usuarioId": {
        "_id": "...",
        "nombre": "María García",
        "email": "maria@empresa.com",
        "fotoUrl": "..."
      },
      "datos": {
        "campo_001": "Juan Pérez",
        "campo_002": "Planta 1",
        "campo_003": "uploads/constructora-xyz/respuestas/campo_003_1705321200000.jpg",
        "campo_004": "19.4326, -99.1332",
        "campo_005": { "Compresor": "Operativo" },
        "campo_006": ["Casco", "Guantes"],
        "campo_007": 5
      },
      "archivos": [
        {
          "campoId": "campo_003",
          "path": "uploads/constructora-xyz/respuestas/campo_003_1705321200000.jpg",
          "tipo": "foto",
          "originalName": "foto.jpg",
          "mimetype": "image/jpeg",
          "size": 2048000
        }
      ],
      "fechaEnvio": "2024-01-15T14:30:00Z"
    }
  ]
}
```

---

### **GET `/api/respuestas/:id`**
Obtener respuesta específica.

**Response 200:**
```json
{
  "exito": true,
  "data": { /* respuesta completa */ }
}
```

---

### **DELETE `/api/respuestas/:id`**
Eliminar respuesta (y archivos asociados).

**Permisos:** Gerente, SuperAdmin, o el creador de la respuesta.

**Response 200:**
```json
{
  "exito": true,
  "mensaje": "Respuesta eliminada exitosamente"
}
```

---

## 🎨 **6. BRANDING (Configuración de Marca)**

### **GET `/api/empresa/branding`**
Obtener configuración de marca de la empresa.

**Response 200:**
```json
{
  "exito": true,
  "data": {
    "nombreApp": "Reportes XYZ",
    "logoUrl": "http://localhost:3000/uploads/constructora-xyz/logo.png",
    "colorPrimario": "#3B82F6",
    "colorSecundario": "#1E293B",
    "favicon": null
  }
}
```

---

### **PUT `/api/empresa/branding`**
Actualizar branding (solo gerente/superadmin).

**Request:**
```json
{
  "nombreApp": "Nuevo Nombre",
  "colorPrimario": "#EF4444",
  "colorSecundario": "#1E293B"
}
```

**Response 200:**
```json
{
  "exito": true,
  "mensaje": "Branding actualizado exitosamente",
  "data": {
    "nombreApp": "Nuevo Nombre",
    "colorPrimario": "#EF4444",
    "colorSecundario": "#1E293B"
  }
}
```

---

### **POST `/api/empresa/logo`**
Subir logo de la empresa (multipart).

**Content-Type:** `multipart/form-data`

**FormData:**
```
logoFile: File (JPEG, PNG, SVG, máx 5MB)
```

**Response 200:**
```json
{
  "exito": true,
  "mensaje": "Logo subido exitosamente",
  "logoUrl": "uploads/constructora-xyz/logo_1705321200000.png",
  "data": {
    "logoUrl": "uploads/constructora-xyz/logo_1705321200000.png"
  }
}
```

---

## 📊 **7. USO Y LÍMITES DEL PLAN**

### **GET `/api/empresa/usage`**
Obtener estadísticas de uso de la empresa.

**Response 200:**
```json
{
  "exito": true,
  "data": {
    "empresa": {
      "nombre": "Constructora XYZ",
      "slug": "constructora-xyz",
      "logoUrl": "..."
    },
    "usados": {
      "usuarios": 15,
      "formularios": 35,
      "storage": 1245,  // MB
      "respuestas": 850
    },
    "limites": {
      "usuarios": 25,
      "formularios": 50,
      "storage": 5120,  // MB
      "respuestas": 10000
    },
    "porcentajes": {
      "usuarios": 60,      // 15/25
      "formularios": 70,   // 35/50
      "storage": 24,       // 1245/5120
      "respuestas": 8.5    // 850/10000
    },
    "alertas": [
      "⚠️ Estás cerca del límite de formularios (70% usado)"
    ]
  }
}
```

---

### **GET `/api/empresa/limits`**
Obtener solo los límites del plan actual.

**Response 200:**
```json
{
  "exito": true,
  "data": {
    "plan": {
      "id": "plan_pro",
      "nombre": "Profesional",
      "limites": {
        "usuarios": 25,
        "formularios": 50,
        "storage": 5120,
        "respuestas": 10000
      }
    }
  }
}
```

---

## 💰 **8. PAGOS (Gerente/SuperAdmin)**

### **GET `/api/empresa/pagos`**
Historial de pagos de la empresa.

**Response 200:**
```json
{
  "exito": true,
  "data": [
    {
      "_id": "...",
      "monto": 99.99,
      "periodo": { "tipo": "mensual", "meses": 1 },
      "status": "aprobado",
      "metodoPago": "transferencia",
      "fechaPeticion": "2024-01-15T10:00:00Z",
      "fechaAprobacion": "2024-01-16T09:30:00Z",
      "vigencia": {
        "fechaInicio": "2024-01-15",
        "fechaFin": "2024-02-15"
      }
    }
  ]
}
```

---

## ❌ **CÓDIGOS DE ERROR COMUNES**

| Código | HTTP | Descripción |
|--------|------|-------------|
| `TOKEN_MISSING` | 401 | No se envió token en header |
| `TOKEN_INVALID` | 401 | Token expirado o inválido |
| `USER_NOT_FOUND` | 404 | Usuario no existe |
| `USER_INACTIVE` | 401 | Usuario desactivado |
| `ROLE_REQUIRED` | 403 | Rol insuficiente |
| `EMPRESA_NOT_FOUND` | 404 | Empresa no existe |
| `EMPRESA_NOT_ACTIVE` | 403 | Empresa suspendida/demo/pendiente |
| `EMPRESA_ACCESS_DENIED` | 403 | Usuario no pertenece a esta empresa |
| `LIMITE_PLAN_EXCEDIDO` | 403 | Se alcanzó el límite del plan |
| `MISSING_FIELDS` | 400 | Faltan campos obligatorios |
| `EMAIL_EXISTS` | 409 | Email ya registrado |
| `INVALID_CREDENTIALS` | 401 | Email o password incorrectos |
| `INVALID_COLOR` | 400 | Color hexadecimal inválido |
| `NO_FILE` | 400 | No se envió archivo |
| `LAST_GERENTE` | 400 | No se puede eliminar al último gerente |
| `SERVER_ERROR` | 500 | Error interno del servidor |

---

## 📁 **CONVENCIONES IMPORTANTES**

### **1. Identificadores de Campos**
- En el frontend: usar `campo.id` (generado al crear campo)
- En respuestas: la llave en `datos` debe ser el `campo.id`
- **NO usar el `label` como llave principal**

### **2. Archivos en FormData**
- El `name` del campo del archivo debe coincidir con `campo.id`
- Ejemplo: `formData.append('campo_003', file)` donde `campo_003` es el ID del campo

### **3. Rutas de Archivos**
- Las fotos/videos/adjuntos en respuestas se guardan en:
  ```
  uploads/{empresaId}/respuestas/{campoId}_{timestamp}.{ext}
  ```
- El backend devuelve la ruta relativa completa en `datos[campoId]`

### **4. Fechas**
- Todas las fechas están en formato ISO 8601: `2024-01-15T14:30:00Z`

---

**Documentación generada para FormBuilder SaaS v1.0**
