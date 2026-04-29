# 📘 API DOCUMENTATION - FORMBUILDER SaaS v3.0

**Arquitectura:** Multi-tenant SaaS Platform  
**Base URL:** `http://localhost:3000`  
**Versión:** 3.0.0  
**Fecha:** 28 Abril 2026

---

## 🏗️ **ARQUITECTURA SaaS**

### **Multi-Tenancy Model**
```
┌─────────────────────────────────────────────────────────────┐
│                    SUPERADMIN (Global)                       │
│  - Gestiona todos los tenants                               │
│  - Control de pagos y suscripciones                         │
│  - Métricas de plataforma                                   │
└─────────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        ▼                     ▼                     ▼
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│  EMPRESA A   │    │  EMPRESA B   │    │  EMPRESA C   │
│  (Tenant 1)  │    │  (Tenant 2)  │    │  (Tenant 3)  │
├──────────────┤    ├──────────────┤    ├──────────────┤
│ • Usuarios   │    │ • Usuarios   │    │ • Usuarios   │
│ • Formularios│    │ • Formularios│    │ • Formularios│
│ • Grupos     │    │ • Grupos     │    │ • Grupos     │
│ • Datos      │    │ • Datos      │    │ • Datos      │
└──────────────┘    └──────────────┘    └──────────────┘
```

---

## 📊 **MODELOS DE DATOS**

### **1. Empresa (Tenant)**

```typescript
interface Empresa {
  _id: ObjectId;
  nombre: string;              // Nombre comercial
  slug: string;                // Identificador URL único
  logoUrl?: string;            // URL del logo
  status: 'activo' | 'suspendido' | 'pendiente_pago' | 'demo' | 'eliminado';
  motivoSuspension?: string;   // Razón de suspensión
  
  configuracionPlan: {
    planId: ObjectId;          // Ref a Plan
    fechaInicio: Date;
    fechaVencimiento: Date;    // Fecha límite de suscripción
    limiteUsuarios: number;     // Máximo usuarios permitidos
    limiteFormularios: number;// Máximo formularios
    almacenamientoMaxGB: number;
    usadoGB: number;            // Almacenamiento actual
  };
  
  branding: {
    colorPrimario: string;     // Hex color (#007bff)
    logoLogin?: string;        // Logo personalizado login
    favicon?: string;
  };
  
  contacto: {
    emailFacturacion: string;
    telefono?: string;
    direccion?: string;
    rfc?: string;
    razonSocial?: string;
  };
  
  // Soft Delete
  isDeleted: boolean;
  deletedAt?: Date;
  
  createdAt: Date;
  updatedAt: Date;
}
```

### **2. Plan (Subscription Plan)**

```typescript
interface Plan {
  _id: ObjectId;
  nombre: string;              // Ej: "Básico", "Profesional", "Enterprise"
  slug: string;                // URL-friendly ID
  descripcion: string;
  
  precioMensual: number;       // Precio en MXN
  precioAnual: number;         // Precio anual con descuento
  descuentoAnual: number;      // % de ahorro (calculado automático)
  
  caracteristicas: {
    maxUsuarios: number;
    maxFormularios: number;
    maxGrupos: number;
    maxRespuestasPorFormulario: number;
    almacenamientoGB: number;
    multimedia: boolean;       // Soporte fotos/videos
    gps: boolean;              // Geolocalización
    exportExcel: boolean;
    exportPDF: boolean;
    brandingPersonalizado: boolean;
    soportePrioritario: boolean;
    webhooks: boolean;
    apiAccess: boolean;
  };
  
  isPublic: boolean;           // Mostrar en marketplace
  isDestacado: boolean;        // Plan recomendado
  orden: number;               // Orden de visualización
  isActive: boolean;
  
  createdAt: Date;
  updatedAt: Date;
}
```

### **3. Pago (Payment Tracking)**

```typescript
interface Pago {
  _id: ObjectId;
  empresaId: ObjectId;         // Ref a Empresa
  planId: ObjectId;            // Ref a Plan
  
  monto: number;               // Monto pagado
  moneda: 'MXN' | 'USD' | 'EUR' | ...;
  
  tipoPago: 'nueva_suscripcion' | 'renovacion' | 'upgrade' | 
            'downgrade' | 'extra_usuarios' | 'extra_almacenamiento';
  
  periodo: {
    tipo: 'mensual' | 'anual';
    meses: number;
  };
  
  cuponAplicado?: {
    codigo: string;
    descuento: number;
    tipo: 'porcentaje' | 'fijo';
  };
  
  status: 'pendiente' | 'en_revision' | 'aprobado' | 'rechazado' | 'reembolsado';
  
  metodoPago: 'transferencia' | 'deposito' | 'efectivo' | 'tarjeta' | 'otro';
  comprobanteUrl?: string;     // Captura de transferencia
  referenciaBancaria?: string;
  
  fechaPeticion: Date;
  fechaRevision?: Date;
  fechaAprobacion?: Date;
  
  vigencia?: {
    fechaInicio: Date;
    fechaFin: Date;
  };
  
  revisadoPor?: ObjectId;      // Ref a User (admin)
  notasAdmin?: string;
  notasSolicitante?: string;
  
  createdAt: Date;
  updatedAt: Date;
}
```

### **4. Cupón (Marketing Coupon)**

```typescript
interface Cupon {
  _id: ObjectId;
  codigo: string;              // Código único (ej: "DESCUENTO50")
  descripcion?: string;
  
  tipo: 'porcentaje' | 'fijo';
  descuento: number;           // % o monto fijo
  
  usosMaximos: number;         // Total de usos permitidos
  usosActuales: number;        // Usos realizados
  usosMaximosPorEmpresa: number; // Límite por tenant
  
  usosPorEmpresa: [{
    empresaId: ObjectId;
    usos: number;
    ultimoUso: Date;
  }];
  
  fechaInicio: Date;
  fechaExpiracion: Date;
  
  planesAplicables?: ObjectId[]; // Planes válidos (vacío = todos)
  montoMinimo?: number;          // Monto mínimo de compra
  descuentoMaximo?: number;      // Tope para descuentos %
  
  isActive: boolean;
  creadoPor: ObjectId;
  
  createdAt: Date;
  updatedAt: Date;
}
```

### **5. Grupo (User Groups)**

```typescript
interface Grupo {
  _id: ObjectId;
  nombre: string;
  descripcion?: string;
  empresaId: ObjectId;         // Ref a Empresa
  
  color: string;               // Color identificativo (#hex)
  icono: string;               // Nombre del icono
  
  usuarios: [{
    usuarioId: ObjectId;         // Ref a User
    rolEnGrupo: 'lider' | 'miembro';
    fechaUnion: Date;
    agregadoPor: ObjectId;
  }];
  
  formulariosAsignados: [{
    formularioId: ObjectId;
    asignadoPor: ObjectId;
    fechaAsignacion: Date;
    fechaVencimiento?: Date;
    status: 'activo' | 'pausado' | 'completado';
  }];
  
  liderId?: ObjectId;
  isActive: boolean;
  
  // Soft Delete
  isDeleted: boolean;
  deletedAt?: Date;
  
  creadoPor: ObjectId;
  fechaCreacion: Date;
}
```

---

## 🔐 **ENDPOINTS API**

### **🔴 SUPERADMIN (Solo rol: superadmin)**

#### **Dashboard & Métricas**

##### `GET /api/admin/metrics`
**Obtener métricas globales de la plataforma**

**Headers:**
```
x-auth-token: <JWT_TOKEN_SUPERADMIN>
```

**Response 200:**
```json
{
  "exito": true,
  "data": {
    "resumen": {
      "totalEmpresas": 150,
      "empresasActivas": 120,
      "empresasDemo": 20,
      "empresasSuspendidas": 5,
      "empresasPendiente": 5,
      "totalUsuarios": 850,
      "pagosPendientesRevision": 8,
      "cuponesActivos": 5
    },
    "finanzas": {
      "mrr": 45000,
      "arr": 540000,
      "moneda": "MXN"
    },
    "almacenamiento": {
      "totalGlobalGB": "856.45",
      "promedioPorEmpresaGB": "5.71",
      "maxPorEmpresaGB": "48.23"
    },
    "distribucion": {
      "porPlan": [
        { "_id": "Básico", "cantidad": 80, "ingresosMensuales": 23920 },
        { "_id": "Profesional", "cantidad": 60, "ingresosMensuales": 35940 }
      ],
      "porStatus": {
        "activo": 120,
        "demo": 20,
        "suspendido": 5,
        "pendiente_pago": 5
      },
      "ingresosMensuales": [...] // Historial últimos 12 meses
    }
  }
}
```

---

#### **Gestión de Empresas**

##### `GET /api/admin/empresas`
**Listar todas las empresas con filtros y paginación**

**Query Parameters:**
```
?status=activo|suspendido|pendiente_pago|demo
&planId=<ID_PLAN>
&search=<texto_busqueda>
&page=1
&limit=20
&sortBy=fechaRegistro|nombre|status
&sortOrder=asc|desc
```

**Response 200:**
```json
{
  "exito": true,
  "data": [
    {
      "_id": "64f8a1b2...",
      "nombre": "Supermercados XYZ",
      "slug": "supermercados-xyz",
      "logoUrl": "uploads/.../logo.png",
      "status": "activo",
      "configuracionPlan": {
        "planId": { "nombre": "Profesional", "precioMensual": 599 },
        "fechaVencimiento": "2024-12-31",
        "limiteUsuarios": 20,
        "limiteFormularios": 50,
        "usadoGB": 12.5
      },
      "contacto": {
        "emailFacturacion": "facturacion@xyz.com"
      },
      "fechaRegistro": "2024-01-15"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "totalPages": 8
  }
}
```

##### `PATCH /api/admin/empresas/:id/suspender`
**Suspender una empresa (bloquea acceso a todos sus usuarios)**

**Body:**
```json
{
  "motivo": "Pago atrasado por más de 30 días"
}
```

**Response 200:**
```json
{
  "exito": true,
  "mensaje": "Empresa suspendida exitosamente",
  "data": {
    "_id": "64f8a1b2...",
    "status": "suspendido",
    "motivoSuspension": "Pago atrasado por más de 30 días"
  }
}
```

##### `PATCH /api/admin/empresas/:id/activar`
**Reactivar una empresa suspendida**

**Response 200:**
```json
{
  "exito": true,
  "mensaje": "Empresa activada exitosamente",
  "data": {
    "_id": "64f8a1b2...",
    "status": "activo",
    "motivoSuspension": null
  }
}
```

---

#### **Gestión de Planes**

##### `GET /api/admin/planes`
**Listar todos los planes (activos e inactivos)**

##### `POST /api/admin/planes`
**Crear nuevo plan de suscripción**

**Body:**
```json
{
  "nombre": "Enterprise",
  "slug": "enterprise",
  "descripcion": "Plan para grandes empresas con necesidades avanzadas",
  "precioMensual": 1499,
  "precioAnual": 14990,
  "caracteristicas": {
    "maxUsuarios": 100,
    "maxFormularios": 200,
    "maxGrupos": 50,
    "almacenamientoGB": 100,
    "multimedia": true,
    "gps": true,
    "exportExcel": true,
    "exportPDF": true,
    "brandingPersonalizado": true,
    "soportePrioritario": true,
    "webhooks": true,
    "apiAccess": true
  },
  "isPublic": true,
  "isDestacado": false,
  "orden": 4
}
```

**Response 201:**
```json
{
  "exito": true,
  "mensaje": "Plan creado exitosamente",
  "data": {
    "_id": "64f8a1b2...",
    "nombre": "Enterprise",
    "descuentoAnual": 17,  // Calculado automático
    ...
  }
}
```

##### `PUT /api/admin/planes/:id`
**Actualizar plan existente**

##### `PATCH /api/admin/planes/:id/toggle`
**Activar/Desactivar plan**

---

#### **Gestión de Pagos**

##### `GET /api/admin/pagos`
**Listar todas las solicitudes de pago**

**Query Parameters:**
```
?status=pendiente|aprobado|rechazado
&page=1&limit=20
```

##### `PATCH /api/admin/pagos/:id/aprobar`
**Aprobar pago y extender vigencia de empresa automáticamente**

**Body:**
```json
{
  "notas": "Pago verificado en estado de cuenta"
}
```

**Response 200:**
```json
{
  "exito": true,
  "mensaje": "Pago aprobado exitosamente",
  "data": {
    "pago": {
      "_id": "64f8a1b2...",
      "status": "aprobado",
      "fechaAprobacion": "2024-01-15T10:30:00Z",
      "vigencia": {
        "fechaInicio": "2024-01-15",
        "fechaFin": "2024-02-15"
      }
    },
    "empresaActualizada": {
      "id": "64f8a1b2...",
      "nuevoStatus": "activo",
      "fechaVencimiento": "2024-02-15T00:00:00Z",
      "diasAgregados": 30
    }
  }
}
```

##### `PATCH /api/admin/pagos/:id/rechazar`
**Rechazar solicitud de pago**

**Body:**
```json
{
  "razon": "El comprobante no coincide con el monto indicado"
}
```

---

#### **Gestión de Cupones**

##### `POST /api/admin/cupones`
**Crear cupón de descuento**

**Body:**
```json
{
  "codigo": "BLACKFRIDAY50",
  "tipo": "porcentaje",
  "descuento": 50,
  "usosMaximos": 500,
  "usosMaximosPorEmpresa": 1,
  "fechaExpiracion": "2024-11-30",
  "montoMinimo": 299,
  "planesAplicables": ["plan-id-1", "plan-id-2"]
}
```

---

### **🟢 GERENTE (Rol: gerente, superadmin)**

#### **Información y Uso de la Empresa**

##### `GET /api/empresa/usage`
**Obtener contadores de uso y límites del plan**

**Response 200:**
```json
{
  "exito": true,
  "data": {
    "empresa": {
      "nombre": "Supermercados XYZ",
      "slug": "supermercados-xyz",
      "logoUrl": "..."
    },
    "usage": {
      "usuarios": {
        "usado": 15,
        "limite": 20,
        "disponible": 5,
        "porcentaje": 75,
        "alerta": false
      },
      "formularios": {
        "usado": 35,
        "limite": 50,
        "disponible": 15,
        "porcentaje": 70,
        "alerta": false
      },
      "almacenamiento": {
        "usado": "12.45",
        "limite": 50,
        "disponible": "37.55",
        "porcentaje": 25,
        "alerta": false
      },
      "grupos": {
        "usado": 8,
        "limite": 10,
        "disponible": 2,
        "porcentaje": 80,
        "alerta": true
      }
    },
    "plan": {
      "nombre": "Profesional",
      "precioMensual": 599,
      "precioAnual": 5990,
      "caracteristicas": {
        "multimedia": true,
        "gps": true,
        "exportExcel": true,
        ...
      }
    },
    "suscripcion": {
      "status": "activo",
      "fechaVencimiento": "2024-12-31",
      "diasRestantes": 180,
      "estaActiva": true
    },
    "alertas": [
      "⚠️ Estás cerca del límite de grupos",
      "⏰ Tu plan vence en 180 días"
    ]
  }
}
```

---

#### **Gestión de Pagos**

##### `POST /api/empresa/pago`
**Enviar solicitud de pago con comprobante**

**Content-Type:** `multipart/form-data`

**Form Data:**
```
planId: "64f8a1b2..."
periodo: "anual"  // o "mensual"
monto: 5990
metodoPago: "transferencia"
referenciaBancaria: "1234567890"
notasSolicitante: "Renovación anual con descuento"
cuponCodigo: "BLACKFRIDAY50"  // Opcional
comprobante: [File]  // Imagen del comprobante
```

**Response 201:**
```json
{
  "exito": true,
  "mensaje": "Solicitud de pago enviada exitosamente",
  "data": {
    "pagoId": "64f8a1b2...",
    "status": "pendiente",
    "montoFinal": 2995,  // Con descuento aplicado
    "descuentoAplicado": 2995,
    "comprobanteUrl": "uploads/empresa-id/comprobantes/123456.jpg",
    "nextSteps": [
      "El administrador revisará tu pago",
      "Recibirás notificación por email",
      "Tu suscripción se extenderá automáticamente"
    ]
  }
}
```

##### `GET /api/empresa/pagos`
**Historial de pagos de la empresa**

**Response 200:**
```json
{
  "exito": true,
  "data": [
    {
      "_id": "64f8a1b2...",
      "planId": { "nombre": "Profesional" },
      "monto": 5990,
      "periodo": { "tipo": "anual", "meses": 12 },
      "status": "aprobado",
      "metodoPago": "transferencia",
      "fechaPeticion": "2024-01-15",
      "fechaAprobacion": "2024-01-16",
      "vigencia": {
        "fechaInicio": "2024-01-15",
        "fechaFin": "2025-01-15"
      }
    }
  ]
}
```

##### `POST /api/empresa/upgrade`
**Cambiar de plan (upgrade/downgrade)**

**Body:**
```json
{
  "nuevoPlanId": "64f8a1b2..."
}
```

**Response 200:**
```json
{
  "exito": true,
  "mensaje": "Plan actualizado exitosamente a Enterprise",
  "data": {
    "planAnterior": "Profesional",
    "planNuevo": "Enterprise",
    "tipoCambio": "upgrade",
    "nuevosLimites": {
      "usuarios": 100,
      "formularios": 200,
      "almacenamiento": 100
    }
  }
}
```

---

#### **Gestión de Grupos**

##### `POST /api/grupos`
**Crear nuevo grupo**

**Body:**
```json
{
  "nombre": "Inspectores de Seguridad",
  "descripcion": "Equipo encargado de inspecciones",
  "color": "#e74c3c",
  "icono": "shield",
  "usuariosIniciales": ["user-id-1", "user-id-2"]
}
```

**Response 201:**
```json
{
  "exito": true,
  "mensaje": "Grupo creado exitosamente",
  "data": {
    "_id": "64f8a1b2...",
    "nombre": "Inspectores de Seguridad",
    "usuarios": [...],
    "formulariosAsignados": []
  }
}
```

**Error 403 - Límite alcanzado:**
```json
{
  "error": "Límite de grupos alcanzado (10). Actualice su plan.",
  "code": "LIMIT_EXCEEDED",
  "tipoLimite": "grupos",
  "usado": 10,
  "limite": 10,
  "disponible": 0,
  "upgradeRecomendado": true
}
```

##### `GET /api/grupos`
**Listar grupos de la empresa**

##### `PATCH /api/grupos/:id/usuarios`
**Agregar usuario a grupo**

**Body:**
```json
{
  "usuarioId": "64f8a1b2..."
}
```

##### `DELETE /api/grupos/:id/usuarios/:usuarioId`
**Remover usuario de grupo**

##### `POST /api/grupos/:id/formularios`
**Asignar formulario a grupo**

**Body:**
```json
{
  "formularioId": "64f8a1b2...",
  "fechaVencimiento": "2024-12-31"
}
```

---

### **🔵 PÚBLICO (Sin autenticación)**

#### **Marketplace**

##### `GET /api/public/planes`
**Listar planes públicos para landing page**

**Response 200:**
```json
{
  "exito": true,
  "data": [
    {
      "id": "64f8a1b2...",
      "nombre": "Básico",
      "slug": "basico",
      "descripcion": "Perfecto para empezar",
      "precio": {
        "mensual": 299,
        "anual": 2990,
        "descuentoAnual": 17
      },
      "caracteristicas": {
        "maxUsuarios": 5,
        "maxFormularios": 10,
        "multimedia": true,
        "gps": true,
        ...
      },
      "destacado": false
    },
    {
      "id": "64f8a1b2...",
      "nombre": "Profesional",
      "slug": "profesional",
      "descripcion": "Para equipos en crecimiento",
      "precio": {
        "mensual": 599,
        "anual": 5990,
        "descuentoAnual": 17
      },
      "caracteristicas": {
        "maxUsuarios": 20,
        "maxFormularios": 50,
        ...
      },
      "destacado": true  // Plan recomendado
    }
  ]
}
```

##### `GET /api/public/planes/:slug`
**Detalle de un plan específico**

##### `POST /api/public/cupones/validar`
**Validar cupón antes de compra**

**Body:**
```json
{
  "codigo": "BLACKFRIDAY50",
  "planId": "64f8a1b2...",
  "monto": 5990
}
```

**Response 200:**
```json
{
  "exito": true,
  "data": {
    "codigo": "BLACKFRIDAY50",
    "tipo": "porcentaje",
    "descuento": 50,
    "descuentoCalculado": 2995,
    "precioFinal": 2995,
    "fechaExpiracion": "2024-11-30"
  }
}
```

**Response 400 (Cupón inválido):**
```json
{
  "exito": false,
  "error": "Cupón expirado",
  "code": "CUPON_INVALIDO"
}
```

---

#### **Onboarding**

##### `POST /api/public/registro`
**Registro público de nueva empresa (flujo completo)**

**Body:**
```json
{
  // Datos de la empresa
  "nombreEmpresa": "Mi Nueva Empresa",
  "emailFacturacion": "factura@miempresa.com",
  "telefono": "+52 55 1234 5678",
  
  // Datos del administrador
  "nombreAdmin": "Juan Pérez",
  "emailAdmin": "juan@miempresa.com",
  "password": "ContraseñaSegura123!",
  
  // Selección de plan
  "planId": "64f8a1b2...",
  "periodo": "anual",
  
  // Cupón (opcional)
  "cuponCodigo": "BIENVENIDO30"
}
```

**Response 201:**
```json
{
  "exito": true,
  "mensaje": "Empresa registrada exitosamente",
  "data": {
    "empresa": {
      "id": "64f8a1b2...",
      "nombre": "Mi Nueva Empresa",
      "slug": "mi-nueva-empresa",
      "status": "pendiente_pago"
    },
    "plan": {
      "nombre": "Profesional",
      "precioOriginal": 5990,
      "precioFinal": 4193,  // Con descuento aplicado
      "descuentoAplicado": 1797
    },
    "pagoPendiente": {
      "id": "64f8a1b2...",
      "monto": 4193,
      "status": "pendiente"
    },
    "nextSteps": [
      "Realizar el pago mediante transferencia bancaria",
      "Subir el comprobante en el portal",
      "Esperar aprobación del administrador"
    ]
  }
}
```

##### `GET /api/public/estadisticas`
**Estadísticas públicas para marketing**

**Response 200:**
```json
{
  "exito": true,
  "data": {
    "empresasRegistradas": 150,
    "empresasActivas": 120,
    "totalRespuestasProcesadas": 45000,
    "satisfaccion": 98
  }
}
```

---

## 🛡️ **MIDDLEWARES SaaS**

### **1. checkEnterpriseStatus**

Verifica que la empresa esté activa antes de permitir cualquier operación.

**Comportamiento:**
- Empresa `suspendido` → Retorna **403** con `code: 'EMPRESA_SUSPENDED'`
- Empresa `pendiente_pago` → Retorna **403** con `code: 'PAGO_PENDIENTE'`
- Permite acceso a rutas de pago aunque esté suspendida
- Agrega `req.empresa` para uso en controladores

### **2. checkSaaSLimits(tipoLimite)**

Verifica que no se excedan los límites del plan antes de crear recursos.

**Tipos de límite:**
- `'usuarios'` → Verifica `User.countDocuments() < limiteUsuarios`
- `'formularios'` → Verifica `Formulario.countDocuments() < limiteFormularios`
- `'almacenamiento'` → Verifica `usadoGB < almacenamientoMaxGB`
- `'grupos'` → Verifica `Grupo.countDocuments() < maxGrupos`

**Respuesta 403 si se excede:**
```json
{
  "error": "Límite de usuarios alcanzado (5). Actualice su plan.",
  "code": "LIMIT_EXCEEDED",
  "tipoLimite": "usuarios",
  "usado": 5,
  "limite": 5,
  "disponible": 0,
  "porcentajeUsado": 100,
  "upgradeRecomendado": true
}
```

### **3. dynamicStorage**

Configura Multer para organizar archivos automáticamente:

```
uploads/
├── {empresaId}/
│   ├── logos/
│   │   └── logo-{timestamp}-{random}.{ext}
│   ├── comprobantes/
│   │   └── comprobante-{timestamp}-{random}.{ext}
│   ├── formularios/
│   │   └── {formId}/
│   │       └── archivo-{timestamp}-{random}.{ext}
│   ├── perfiles/
│   │   └── {userId}/
│   │       └── foto-{timestamp}-{random}.{ext}
│   └── exports/
│       └── export-{timestamp}-{random}.{ext}
```

**Uso en rutas:**
```javascript
const { uploadLogo, uploadComprobante } = require('../middleware/dynamicStorage');

router.post('/logo', auth, uploadLogo.single('logo'), controller.updateLogo);
router.post('/pago', auth, uploadComprobante.single('comprobante'), controller.crearPago);
```

### **4. requirePlanFeature(featureName)**

Verifica que el plan tenga una característica específica.

**Características disponibles:**
- `multimedia` → Soporte para fotos/videos
- `gps` → Geolocalización
- `exportExcel` → Exportar a Excel
- `exportPDF` → Exportar a PDF
- `brandingPersonalizado` → Personalización de marca
- `soportePrioritario` → Soporte prioritario
- `webhooks` → Webhooks
- `apiAccess` → Acceso API

**Ejemplo:**
```javascript
const { requirePlanFeature } = require('../middleware/saasMiddleware');

router.post('/export/pdf', 
  auth, 
  requirePlanFeature('exportPDF'),
  controller.exportarPDF
);
```

---

## ⚠️ **CÓDIGOS DE ERROR**

| Código | Descripción | HTTP Status |
|--------|-------------|-------------|
| `EMPRESA_NOT_FOUND` | Empresa no existe | 404 |
| `EMPRESA_SUSPENDED` | Empresa suspendida | 403 |
| `EMPRESA_DELETED` | Empresa eliminada | 403 |
| `PAGO_PENDIENTE` | Pago pendiente de regularizar | 403 |
| `DEMO_EXPIRED` | Período de prueba terminado | 403 |
| `LIMIT_EXCEEDED` | Límite de plan alcanzado | 403 |
| `FEATURE_NOT_AVAILABLE` | Característica no incluida en plan | 403 |
| `CUPON_INVALIDO` | Cupón no válido o expirado | 400 |
| `PLAN_NOT_FOUND` | Plan no existe | 404 |
| `CHECK_STATUS_ERROR` | Error verificando estado | 500 |
| `CHECK_LIMITS_ERROR` | Error verificando límites | 500 |

---

## 🎨 **INTEGRACIÓN FRONTEND**

### **Ejemplo: Mostrar Alertas de Uso**

```vue
<script setup>
import { ref, onMounted } from 'vue';

const usage = ref(null);
const alertas = ref([]);

onMounted(async () => {
  const response = await fetch('/api/empresa/usage', {
    headers: { 'x-auth-token': localStorage.getItem('token') }
  });
  const data = await response.json();
  
  usage.value = data.data.usage;
  alertas.value = data.data.alertas;
});
</script>

<template>
  <div class="usage-dashboard">
    <!-- Alertas -->
    <div v-if="alertas.length" class="alertas">
      <div v-for="alerta in alertas" :key="alerta" class="alerta">
        {{ alerta }}
      </div>
    </div>
    
    <!-- Tarjetas de uso -->
    <div class="cards">
      <div class="card" :class="{ 'warning': usage?.usuarios.alerta }">
        <h3>Usuarios</h3>
        <div class="progress">
          <div class="bar" :style="{ width: usage?.usuarios.porcentaje + '%' }"></div>
        </div>
        <p>{{ usage?.usuarios.usado }} / {{ usage?.usuarios.limite }}</p>
      </div>
      
      <!-- Similar para formularios, almacenamiento, grupos -->
    </div>
    
    <!-- Upgrade si es necesario -->
    <button v-if="alertas.length" @click="irAUpgrade">
      Actualizar Plan
    </button>
  </div>
</template>
```

### **Ejemplo: Checkout con Cupón**

```javascript
const aplicarCupon = async (codigo, planId, monto) => {
  const response = await fetch('/api/public/cupones/validar', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ codigo, planId, monto })
  });
  
  const data = await response.json();
  
  if (data.exito) {
    return {
      valido: true,
      descuento: data.data.descuentoCalculado,
      precioFinal: data.data.precioFinal
    };
  } else {
    alert(data.error);
    return { valido: false };
  }
};
```

---

**Documentación generada por FormBuilder SaaS v3.0**
