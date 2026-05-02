# 🌱 SEED DATABASE - Guía de Uso

## 📋 ¿Qué hace el seed?

Recrea completamente la base de datos MongoDB con datos de prueba profesionales:

- ✅ **4 Planes de suscripción** (Gratis, Básico, Profesional, Empresarial)
- ✅ **1 SuperAdmin** del sistema
- ✅ **3 Empresas** completas con datos reales
- ✅ **Usuarios** (1 gerente + 4 empleados por empresa)
- ✅ **Formularios** (4 formularios funcionales por empresa)
- ✅ **Respuestas** (3-5 respuestas de ejemplo por formulario)
- ✅ **Grupos** (2 grupos de trabajo por empresa)

---

## 🚀 Cómo ejecutar

### Opción 1: Usando npm script (recomendado)

```bash
npm run seed
```

### Opción 2: Directamente con node

```bash
node seed-database.js
```

---

## 📊 Datos generados

### Planes de Suscripción

| Plan | Usuarios | Formularios | Respuestas | Storage | Precio/mes |
|------|----------|-------------|------------|---------|------------|
| Gratis | 3 | 5 | 100 | 0.5 GB | $0 |
| Básico | 10 | 20 | 1,000 | 2 GB | $29 |
| Profesional | 25 | 50 | 10,000 | 10 GB | $99 |
| Empresarial | 100 | 200 | 100,000 | 100 GB | $299 |

### Empresas creadas

| Empresa | Slug | Plan | Usuarios |
|---------|------|------|----------|
| Demo Empresa | `demo-empresa` | Gratis | 3 |
| Constructora XYZ | `constructora-xyz` | Básico | 10 |
| Manufactura ABC | `manufactura-abc` | Profesional | 25 |

### Credenciales de acceso

**SuperAdmin:**
- Email: `super@sistema.com`
- Password: `admin123`
- Rol: `superadmin`

**Gerentes (una por empresa):**
- `gerente@demo-empresa.com` / `admin123`
- `gerente@constructora-xyz.com` / `admin123`
- `gerente@manufactura-abc.com` / `admin123`

**Empleados:**
- `juan@demo-empresa.com` / `admin123`
- `maria@demo-empresa.com` / `admin123`
- `carlos@demo-empresa.com` / `admin123`
- `ana@demo-empresa.com` / `admin123`
- (Y así sucesivamente para cada empresa...)

---

## 📋 Formularios de ejemplo

Cada empresa tiene 4 formularios pre-configurados:

1. **Reporte de Inspección Diaria** - 7 campos (texto, dropdown, GPS, foto, cuadrícula, escala)
2. **Checklist de Seguridad Industrial** - 7 campos (múltiple, radio, fotos, video, adjunto)
3. **Control de Calidad - Producto Terminado** - 6 campos (número, cuadrícula múltiple, escala)
4. **Encuesta de Satisfacción del Cliente** - 7 campos (email, escalas, múltiple)

Todos los formularios incluyen los **14 tipos de campos** soportados por el sistema.

---

## ⚠️ Importante

### Antes de ejecutar el seed:

1. **Asegúrate de tener MongoDB corriendo:**
   ```bash
   # Verificar conexión
   mongosh --eval "db.adminCommand('ping')"
   ```

2. **Variables de entorno (.env):**
   ```
   MONGO_URI=mongodb://127.0.0.1:27017/formbuilder
   JWT_SECRET=tu_secreto_jwt
   ```

3. **El seed ELIMINA todos los datos existentes:**
   - ⚠️ **ADVERTENCIA:** Este script limpia completamente la base de datos antes de insertar nuevos datos.
   - No ejecutar en producción sin respaldo previo.

---

## 🔧 Troubleshooting

### Error: "Cannot connect to MongoDB"

```bash
# Verificar que MongoDB esté corriendo
sudo systemctl status mongod  # Linux
brew services list | grep mongodb  # macOS

# Iniciar MongoDB si no está corriendo
sudo systemctl start mongod  # Linux
brew services start mongodb-community  # macOS
```

### Error: "bcryptjs not found"

```bash
npm install
```

### Error: "Cannot find module '../server'"

Este error es normal si intentas importar el seed desde otro archivo. El seed se ejecuta de forma independiente.

---

## 🎯 Flujo de trabajo recomendado

### Para desarrollo frontend:

```bash
# 1. Iniciar MongoDB
sudo systemctl start mongod

# 2. Recrear base de datos con seed
npm run seed

# 3. Iniciar servidor backend
npm run dev

# 4. Login en frontend con credenciales de prueba
# Email: gerente@demo-empresa.com
# Password: admin123
```

### Para testing de API:

```bash
# 1. Recrear DB limpia
npm run seed

# 2. Ejecutar tests
npm test
```

---

## 📁 Estructura de archivos

```
backend/
├── seed-database.js      # Script principal de seed
├── SEED_GUIDE.md         # Esta guía
├── package.json          # Script npm "seed" agregado
└── models/               # Modelos usados por el seed
    ├── User.js
    ├── Empresa.js
    ├── Plan.js
    ├── Formulario.js
    ├── Respuesta.js
    ├── Grupo.js
    └── Pago.js
```

---

## 🔍 Verificar datos insertados

Después de ejecutar el seed, puedes verificar en MongoDB:

```bash
# Conectar a MongoDB
mongosh

# Usar base de datos
use formbuilder

# Contar documentos
db.users.countDocuments()      # Debe mostrar ~15
db.empresas.countDocuments()   # Debe mostrar 3
db.formularios.countDocuments() // Debe mostrar 12
db.respuestas.countDocuments() // Debe mostrar ~40-50
```

---

## 🎨 Personalización del seed

Puedes modificar `seed-database.js` para:

- Cambiar el número de empresas en `CONFIG.empresas`
- Modificar los planes en `planesSeed`
- Ajustar el número de usuarios, formularios o respuestas
- Cambiar las contraseñas por defecto
- Agregar más datos de prueba

---

**¡Listo para usar!** Ejecuta `npm run seed` y comienza a desarrollar. 🚀
