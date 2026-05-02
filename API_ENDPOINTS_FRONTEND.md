# 📚 API Endpoints - FormBuilder SaaS v1.0

**Base URL:** `http://localhost:3000/api`

---

## 🔐 AUTENTICACIÓN (`/api/auth`)

| Método | Endpoint | Descripción | Headers |
|--------|----------|-------------|---------|
| POST | `/auth/login` | Login usuario | - |
| POST | `/auth/register` | Registro usuario | - |
| GET | `/auth/verify` | Verificar token válido | `x-auth-token` |
| POST | `/auth/logout` | Cerrar sesión | `x-auth-token` |
| POST | `/auth/change-password` | Cambiar contraseña | `x-auth-token` |
| GET | `/auth/profile` | Obtener perfil (alias) | `x-auth-token` |
| PUT | `/auth/profile` | Actualizar perfil (alias) | `x-auth-token` |
| GET | `/auth/usuarios` | Listar equipo (alias) | `x-auth-token` |

### Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "gerente@demo-empresa.com",
  "password": "admin123"
}
```

### Registro
```http
POST /api/auth/register
Content-Type: application/json

{
  "nombre": "Juan Pérez",
  "email": "juan@empresa.com",
  "password": "admin123",
  "rol": "gerente",
  "empresaId": "demo-empresa"
}
```

---

## 👤 PERFIL DE USUARIO (`/api/usuarios`)

| Método | Endpoint | Descripción | Auth |
|--------|----------|-------------|------|
| GET | `/usuarios/perfil` | Obtener perfil | ✅ |
| PUT | `/usuarios/perfil` | Actualizar perfil | ✅ |
| POST | `/usuarios/perfil/foto` | Subir foto de perfil | ✅ |
| PUT | `/usuarios/password` | Cambiar contraseña | ✅ |

### Obtener Perfil
```http
GET /api/usuarios/perfil
x-auth-token: <token>
```

### Actualizar Perfil
```http
PUT /api/usuarios/perfil
Content-Type: application/json
x-auth-token: <token>

{
  "nombre": "Juan Actualizado",
  "telefono": "+1234567890",
  "perfil": {
    "bio": "Mi biografía"
  }
}
```

---

## 👥 GESTIÓN DE EQUIPO (`/api/usuarios`)

| Método | Endpoint | Descripción | Rol |
|--------|----------|-------------|-----|
| GET | `/usuarios/equipo` | Listar equipo | gerente, superadmin |
| POST | `/usuarios/registro-equipo` | Crear empleado | gerente, superadmin |
| DELETE | `/usuarios/:id` | Eliminar usuario | gerente, superadmin |
| PATCH | `/usuarios/:id/activar` | Activar/Desactivar | gerente, superadmin |

### Listar Equipo
```http
GET /api/usuarios/equipo
x-auth-token: <token>
```

### Crear Empleado
```http
POST /api/usuarios/registro-equipo
Content-Type: application/json
x-auth-token: <token>

{
  "nombre": "Nuevo Empleado",
  "email": "empleado@empresa.com",
  "password": "temp123",
  "rol": "empleado"
}
```

---

## 📋 FORMULARIOS (`/api/formularios`)

| Método | Endpoint | Descripción | Rol |
|--------|----------|-------------|-----|
| GET | `/formularios` | Listar formularios | Todos |
| GET | `/formularios/:id` | Obtener formulario | Todos |
| POST | `/formularios` | Crear formulario | gerente, superadmin |
| PUT | `/formularios/:id` | Actualizar formulario | gerente, superadmin |
| DELETE | `/formularios/:id` | Eliminar formulario | gerente, superadmin |
| PATCH | `/formularios/:id/activar` | Activar/Desactivar | gerente, superadmin |

### Listar Formularios
```http
GET /api/formularios
x-auth-token: <token>
```

### Crear Formulario
```http
POST /api/formularios
Content-Type: application/json
x-auth-token: <token>

{
  "titulo": "Formulario de Inspección",
  "descripcion": "Descripción",
  "campos": [
    {
      "id": "campo_001",
      "tipo": "texto_corto",
      "label": "Nombre",
      "requerido": true
    }
  ]
}
```

---

## 📝 RESPUESTAS (`/api/respuestas`)

| Método | Endpoint | Descripción | Auth |
|--------|----------|-------------|------|
| GET | `/respuestas` | Listar respuestas | ✅ |
| GET | `/respuestas/:id` | Obtener respuesta | ✅ |
| POST | `/respuestas` | Enviar respuesta (con archivos) | ✅ |
| DELETE | `/respuestas/:id` | Eliminar respuesta | ✅ |

### Listar Respuestas
```http
GET /api/respuestas
x-auth-token: <token>
```

### Crear Respuesta (con archivos)
```http
POST /api/respuestas
Content-Type: multipart/form-data
x-auth-token: <token>

formData:
  - formularioId: <id>
  - campo_001: "valor"
  - archivo_001: [File]
```

---

## 🏢 EMPRESA / GERENTE (`/api/empresa`)

### Branding
| Método | Endpoint | Descripción | Rol |
|--------|----------|-------------|-----|
| GET | `/empresa/branding` | Obtener branding | Todos |
| PUT | `/empresa/branding` | Actualizar branding | gerente, superadmin |
| POST | `/empresa/logo` | Subir logo (multipart) | gerente, superadmin |

### Info y Límites
| Método | Endpoint | Descripción | Auth |
|--------|----------|-------------|------|
| GET | `/empresa/usage` | Ver uso de recursos | ✅ |
| GET | `/empresa/limits` | Ver límites del plan | ✅ |
| GET | `/empresa` | Info completa empresa | ✅ |
| GET | `/empresa/metrics` | Métricas de la empresa | gerente, superadmin |
| PUT | `/empresa` | Actualizar empresa | gerente, superadmin |

### Pagos
| Método | Endpoint | Descripción | Rol |
|--------|----------|-------------|-----|
| GET | `/empresa/pagos` | Historial de pagos | gerente, superadmin |
| POST | `/empresa/pago` | Solicitar pago | gerente, superadmin |
| POST | `/empresa/upgrade` | Cambiar de plan | gerente, superadmin |

### Grupos
| Método | Endpoint | Descripción | Rol |
|--------|----------|-------------|-----|
| GET | `/empresa/grupos` | Listar grupos | Todos |
| POST | `/empresa/grupos` | Crear grupo | gerente, superadmin |
| PATCH | `/empresa/grupos/:id/usuarios` | Agregar usuario | gerente, superadmin |
| DELETE | `/empresa/grupos/:id/usuarios/:usuarioId` | Remover usuario | gerente, superadmin |
| POST | `/empresa/grupos/:id/formularios` | Asignar formulario | gerente, superadmin |

### Ejemplo: Actualizar Branding
```http
PUT /api/empresa/branding
Content-Type: application/json
x-auth-token: <token>

{
  "nombreApp": "Mi App",
  "colorPrimario": "#3B82F6",
  "colorSecundario": "#10B981"
}
```

---

## 👑 SUPERADMIN (`/api/admin`)

### Dashboard
| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/admin/metrics` | Métricas del dashboard |

### Empresas
| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/admin/empresas` | Listar empresas |
| POST | `/admin/empresas` | Crear empresa |
| PATCH | `/admin/empresas/:id/suspender` | Suspender empresa |
| PATCH | `/admin/empresas/:id/activar` | Activar empresa |

### Planes
| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/admin/planes` | Listar planes |
| POST | `/admin/planes` | Crear plan |
| PUT | `/admin/planes/:id` | Actualizar plan |
| PATCH | `/admin/planes/:id/toggle` | Activar/Desactivar plan |

### Pagos
| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/admin/pagos` | Listar pagos |
| PATCH | `/admin/pagos/:id/aprobar` | Aprobar pago |
| PATCH | `/admin/pagos/:id/rechazar` | Rechazar pago |

### Cupones
| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/admin/cupones` | Listar cupones |
| POST | `/admin/cupones` | Crear cupón |
| PATCH | `/admin/cupones/:id/toggle` | Activar/Desactivar cupón |

### Crear Empresa (SuperAdmin)
```http
POST /api/admin/empresas
Content-Type: application/json
x-auth-token: <token_superadmin>

{
  "nombre": "Nueva Empresa",
  "empresaId": "nueva-empresa",
  "email": "admin@nueva-empresa.com",
  "password": "admin123",
  "nombreAdmin": "Juan Pérez",
  "planId": "<id_plan>"
}
```

---

## 🌐 PÚBLICO (`/api/public`)

| Método | Endpoint | Descripción | Auth |
|--------|----------|-------------|------|
| GET | `/public/planes` | Listar planes públicos | - |
| GET | `/public/planes/:slug` | Detalle de plan | - |
| POST | `/public/cupones/validar` | Validar cupón | - |
| POST | `/public/registro` | Registrar empresa | - |
| GET | `/public/estadisticas` | Estadísticas públicas | - |

### Registrar Empresa (Público)
```http
POST /api/public/registro
Content-Type: application/json

{
  "nombre": "Nueva Empresa",
  "empresaId": "nueva-empresa",
  "email": "admin@empresa.com",
  "password": "admin123",
  "nombreAdmin": "Juan Pérez",
  "planId": "<id_plan>"
}
```

---

## 🛒 MARKETPLACE (`/api/market`)

| Método | Endpoint | Descripción | Auth |
|--------|----------|-------------|------|
| GET | `/market/templates` | Listar plantillas | ✅ |
| POST | `/market/instalar/:id` | Instalar plantilla | ✅ |

---

## 📁 ARCHIVOS ESTÁTICOS

| Ruta | Descripción |
|------|-------------|
| `/uploads/:path` | Archivos subidos (fotos, logos, respuestas) |

---

## 🔑 Códigos de Error Comunes

| Código | HTTP | Descripción |
|--------|------|-------------|
| `INVALID_CREDENTIALS` | 401 | Email o contraseña incorrectos |
| `USER_INACTIVE` | 401 | Usuario desactivado |
| `EMPRESA_NOT_FOUND` | 404 | Empresa no existe |
| `EMPRESA_NOT_ACTIVE` | 403 | Empresa suspendida/pendiente |
| `MISSING_FIELDS` | 400 | Faltan campos requeridos |
| `EMAIL_EXISTS` | 409 | Email ya registrado |
| `EMPRESAID_EXISTS` | 409 | empresaId ya en uso |
| `LIMIT_EXCEEDED` | 403 | Límite de plan excedido |
| `UNAUTHORIZED` | 403 | Sin permisos para esta acción |

---

## 👤 Credenciales de Prueba

### SuperAdmin
- Email: `super@sistema.com`
- Password: `admin123`

### Gerentes
- Email: `gerente@demo-empresa.com`
- Password: `admin123`

### Empleados
- Email: `juan@demo-empresa.com`
- Password: `admin123`

---

**Documento generado:** Mayo 2026 | **Versión API:** v1.0
