# 📘 GUÍA DE INTEGRACIÓN FRONTEND V2.0
## FormBuilder Dynamic Forms System

**Versión:** 2.0.0  
**Tecnología:** Vue 3 (Composition API) + Axios  
**Fecha:** 28 Abril 2026  
**Base URL:** `http://localhost:3000`

---

## 🎯 **ARQUITECTURA DEL SISTEMA**

### **Flujo de Datos**

```
┌─────────────────────────────────────────────────────────────┐
│  FORMULARIO DINÁMICO (JSON)                                │
│  - Labels como keys                                        │
│  - Tipos especiales: foto, video, geo, cuadrícula         │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│  MULTIPART/FORM-DATA                                       │
│  datos: JSON.stringify({"Label Campo": "valor"})          │
│  archivos: formData.append('Label Campo', fileBlob)       │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│  BACKEND ORGANIZA ARCHIVOS                                 │
│  uploads/{empresaId}/{usuario}/{tituloForm}/             │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│  RESPUESTA DEVUELVE RUTAS RELATIVAS                        │
│  {BASE_URL}/uploads/{empresa}/{usuario}/file.jpg          │
└─────────────────────────────────────────────────────────────┘
```

---

## 🛠️ **CONFIGURACIÓN AXIOS (Vue 3)**

```typescript
// composables/useApi.ts
import axios, { AxiosInstance, AxiosError } from 'axios';
import { ref } from 'vue';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

// Instancia Axios configurada
const apiClient: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  timeout: 30000, // 30s para uploads grandes
  headers: {
    'Content-Type': 'application/json'
  }
});

// Interceptor para agregar token
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('auth_token');
    if (token) {
      config.headers['x-auth-token'] = token;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Interceptor para manejar errores
apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('user_data');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Composable para usar en componentes
export const useApi = () => {
  const loading = ref(false);
  const error = ref<string | null>(null);

  const request = async <T>(
    method: string,
    url: string,
    data?: any,
    config?: any
  ): Promise<T> => {
    loading.value = true;
    error.value = null;
    
    try {
      const response = await apiClient.request({ method, url, data, ...config });
      return response.data;
    } catch (err: any) {
      error.value = err.response?.data?.msg || err.response?.data?.error || 'Error de conexión';
      throw error.value;
    } finally {
      loading.value = false;
    }
  };

  return { apiClient, loading, error, request };
};

export { BASE_URL };
```

---

## 🔐 **1. SISTEMA DE AUTENTICACIÓN**

### **Login de Usuario**

```vue
<!-- views/Login.vue -->
<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useApi } from '@/composables/useApi';

interface LoginResponse {
  token: string;
  usuario: {
    id: string;
    nombre: string;
    email: string;
    rol: 'superadmin' | 'gerente' | 'empleado';
    empresaId: string;
  };
}

const router = useRouter();
const { request, loading, error } = useApi();

const email = ref('');
const password = ref('');

const handleLogin = async () => {
  try {
    const result = await request<LoginResponse>('POST', '/api/auth/login', {
      email: email.value,
      password: password.value
    });

    // Guardar en localStorage
    localStorage.setItem('auth_token', result.token);
    localStorage.setItem('user_data', JSON.stringify(result.usuario));
    
    // Redirigir según rol
    const dashboardRoute = result.usuario.rol === 'empleado' 
      ? '/employee/dashboard' 
      : '/manager/dashboard';
    
    router.push(dashboardRoute);
    
  } catch (err) {
    console.error('Login failed:', err);
  }
};
</script>

<template>
  <div class="login-container">
    <form @submit.prevent="handleLogin">
      <h2>Iniciar Sesión</h2>
      
      <div v-if="error" class="alert alert-danger">
        {{ error }}
      </div>
      
      <div class="form-group">
        <label>Email</label>
        <input 
          v-model="email" 
          type="email" 
          required 
          placeholder="usuario@empresa.com"
        />
      </div>
      
      <div class="form-group">
        <label>Contraseña</label>
        <input 
          v-model="password" 
          type="password" 
          required 
          placeholder="••••••••"
        />
      </div>
      
      <button type="submit" :disabled="loading">
        {{ loading ? 'Ingresando...' : 'Ingresar' }}
      </button>
    </form>
  </div>
</template>
```

### **Registro (Solo Gerentes)**

```typescript
// composables/useAuth.ts
import { useApi } from './useApi';

interface RegisterData {
  nombre: string;
  email: string;
  password: string;
  rol: 'gerente' | 'empleado';
  empresaId: string;
}

export const useAuth = () => {
  const { request, loading, error } = useApi();

  const register = async (data: RegisterData) => {
    return await request<{ token: string; user: any }>(
      'POST', 
      '/api/auth/register', 
      data
    );
  };

  const getCurrentUser = () => {
    const userStr = localStorage.getItem('user_data');
    return userStr ? JSON.parse(userStr) : null;
  };

  const logout = () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user_data');
    window.location.href = '/login';
  };

  return { register, getCurrentUser, logout, loading, error };
};
```

---

## 📝 **2. SISTEMA DE FORMULARIOS DINÁMICOS**

### **Tipos de Campos Soportados**

```typescript
// types/form.types.ts

export type CampoTipo = 
  | 'text'           // Texto simple
  | 'textarea'       // Texto largo
  | 'number'         // Número
  | 'date'           // Fecha
  | 'email'          // Email
  | 'telefono'       // Teléfono
  | 'foto'           // 📷 Imagen (genera input file)
  | 'video'          // 🎥 Video (genera input file video)
  | 'geolocalizacion' // 📍 Coordenadas GPS (lat/lng)
  | 'cuadricula_unica'   // ☐ Cuadrícula selección única
  | 'cuadricula_multiple' // ☑️ Cuadrícula selección múltiple
  | 'escala'         // 📊 Escala 1-5 o 1-10
  | 'select'         // Lista desplegable
  | 'checkbox'       // Casilla única
  | 'radio';         // Opción única

export interface CampoConfig {
  label: string;           // ⭐ IMPORTANTE: Usar como KEY en datos
  tipo: CampoTipo;
  requerido: boolean;
  placeholder?: string;
  
  // Para cuadrículas
  filas?: string[];        // Ej: ["Limpieza", "Organización"]
  columnas?: string[];     // Ej: ["Malo", "Regular", "Bueno", "Excelente"]
  
  // Para escala
  min?: number;
  max?: number;
  
  // Para select
  opciones?: string[];
}

export interface Formulario {
  _id?: string;
  titulo: string;
  descripcion?: string;
  categoria?: string;
  empresaId: string;
  campos: CampoConfig[];
  esPlantilla?: boolean;
  fechaCreacion?: string;
}

export interface RespuestaDatos {
  [key: string]: any;  // ⭐ KEY = Label del campo
}
```

---

## 📤 **3. ENVÍO DE RESPUESTAS - MAPEO DE DATOS**

### **⭐ REGLA CRÍTICA: Labels como Keys**

```typescript
// ❌ INCORRECTO - Usar IDs
const datosIncorrectos = {
  "campo_123": "Valor",
  "campo_456": "Otro valor"
};

// ✅ CORRECTO - Usar Labels como keys
const datosCorrectos = {
  "Nombre del Empleado": "Juan Pérez",
  "Fecha de Inspección": "2024-01-15",
  "Calificación de Limpieza": "Bueno",  // Cuadrícula
  "Puntuación General": 8,               // Escala 1-10
  "Coordenadas GPS": { lat: 19.4326, lng: -99.1332 }  // Geolocalización
};
```

### **Componente de Envío de Respuesta**

```vue
<!-- components/FormResponse.vue -->
<script setup lang="ts">
import { ref, computed } from 'vue';
import { useApi, BASE_URL } from '@/composables/useApi';
import type { Formulario, CampoConfig, RespuestaDatos } from '@/types/form.types';

interface Props {
  formulario: Formulario;
}

const props = defineProps<Props>();
const emit = defineEmits(['submit-success', 'submit-error']);

const { request, loading } = useApi();

// ⭐ DATOS: Usar LABEL como key
const respuestaDatos = ref<RespuestaDatos>({});

// ⭐ ARCHIVOS: Mapa de label -> File[]
const archivosPorCampo = ref<Record<string, File[]>>({});

// Inicializar datos vacíos
props.formulario.campos.forEach(campo => {
  if (campo.tipo === 'cuadricula_unica') {
    respuestaDatos.value[campo.label] = {};
  } else if (campo.tipo === 'cuadricula_multiple') {
    respuestaDatos.value[campo.label] = {};
  } else if (campo.tipo === 'geolocalizacion') {
    respuestaDatos.value[campo.label] = { lat: null, lng: null };
  } else {
    respuestaDatos.value[campo.label] = '';
  }
});

// Manejar cambio en cuadrícula
const handleCuadriculaChange = (
  label: string, 
  fila: string, 
  columna: string, 
  isMultiple: boolean
) => {
  if (isMultiple) {
    // Cuadrícula múltiple: Array de selecciones
    if (!Array.isArray(respuestaDatos.value[label][fila])) {
      respuestaDatos.value[label][fila] = [];
    }
    
    const index = respuestaDatos.value[label][fila].indexOf(columna);
    if (index > -1) {
      respuestaDatos.value[label][fila].splice(index, 1);
    } else {
      respuestaDatos.value[label][fila].push(columna);
    }
  } else {
    // Cuadrícula única: Un valor por fila
    respuestaDatos.value[label][fila] = columna;
  }
};

// Manejar archivos (foto/video)
const handleFileChange = (label: string, event: Event) => {
  const input = event.target as HTMLInputElement;
  if (input.files && input.files.length > 0) {
    archivosPorCampo.value[label] = Array.from(input.files);
  }
};

// Obtener geolocalización
const obtenerGeolocalizacion = (label: string) => {
  if (!navigator.geolocation) {
    alert('Geolocalización no soportada');
    return;
  }
  
  navigator.geolocation.getCurrentPosition(
    (position) => {
      respuestaDatos.value[label] = {
        lat: position.coords.latitude,
        lng: position.coords.longitude,
        accuracy: position.coords.accuracy
      };
    },
    (error) => {
      alert('Error obteniendo ubicación: ' + error.message);
    },
    { enableHighAccuracy: true }
  );
};

// ⭐ ENVIAR RESPUESTA
const submitRespuesta = async () => {
  try {
    // Crear FormData
    const formData = new FormData();
    
    // 1. Agregar metadatos
    const user = JSON.parse(localStorage.getItem('user_data') || '{}');
    formData.append('empresaId', user.empresaId);
    formData.append('formularioId', props.formulario._id!);
    formData.append('nombreFormulario', props.formulario.titulo);
    formData.append('usuarioId', user.id);
    
    // 2. ⭐ DATOS JSON: Labels como keys
    formData.append('datos', JSON.stringify(respuestaDatos.value));
    
    // 3. ⭐ ARCHIVOS: Usar LABEL como fieldname
    Object.entries(archivosPorCampo.value).forEach(([label, files]) => {
      files.forEach((file, index) => {
        // ⭐ CRÍTICO: fieldname = label del campo
        formData.append(label, file);
      });
    });
    
    // Enviar
    const result = await request(
      'POST',
      '/api/respuestas',
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      }
    );
    
    emit('submit-success', result);
    
  } catch (error) {
    emit('submit-error', error);
  }
};

// Verificar si hay archivos multimedia
const tieneArchivos = computed(() => {
  return props.formulario.campos.some(
    c => c.tipo === 'foto' || c.tipo === 'video'
  );
});
</script>

<template>
  <form @submit.prevent="submitRespuesta" class="form-response">
    <h2>{{ formulario.titulo }}</h2>
    <p v-if="formulario.descripcion">{{ formulario.descripcion }}</p>
    
    <div 
      v-for="campo in formulario.campos" 
      :key="campo.label"
      class="campo-container"
    >
      <label class="campo-label">
        {{ campo.label }}
        <span v-if="campo.requerido" class="required">*</span>
      </label>
      
      <!-- TEXT / EMAIL / NUMBER / DATE -->
      <input
        v-if="['text', 'email', 'number', 'date', 'telefono'].includes(campo.tipo)"
        v-model="respuestaDatos[campo.label]"
        :type="campo.tipo === 'telefono' ? 'tel' : campo.tipo"
        :placeholder="campo.placeholder"
        :required="campo.requerido"
        class="form-control"
      />
      
      <!-- TEXTAREA -->
      <textarea
        v-else-if="campo.tipo === 'textarea'"
        v-model="respuestaDatos[campo.label]"
        :placeholder="campo.placeholder"
        :required="campo.requerido"
        class="form-control"
        rows="4"
      />
      
      <!-- FOTO / VIDEO -->
      <div v-else-if="campo.tipo === 'foto' || campo.tipo === 'video'" class="file-upload">
        <input
          :type="'file'"
          :accept="campo.tipo === 'foto' ? 'image/*' : 'video/*'"
          :multiple="true"
          @change="handleFileChange(campo.label, $event)"
          :required="campo.requerido"
        />
        <div class="file-preview">
          <span v-if="!archivosPorCampo[campo.label]?.length">
            📷 Seleccionar {{ campo.tipo === 'foto' ? 'fotos' : 'videos' }}
          </span>
          <span v-else>
            ✅ {{ archivosPorCampo[campo.label].length }} archivo(s) seleccionado(s)
          </span>
        </div>
      </div>
      
      <!-- GEOLOCALIZACIÓN -->
      <div v-else-if="campo.tipo === 'geolocalizacion'" class="geo-container">
        <button 
          type="button" 
          @click="obtenerGeolocalizacion(campo.label)"
          class="btn-geo"
        >
          📍 Obtener Ubicación GPS
        </button>
        <div v-if="respuestaDatos[campo.label]?.lat" class="geo-result">
          Lat: {{ respuestaDatos[campo.label].lat.toFixed(6) }}<br>
          Lng: {{ respuestaDatos[campo.label].lng.toFixed(6) }}
        </div>
      </div>
      
      <!-- CUADRÍCULA ÚNICA -->
      <div v-else-if="campo.tipo === 'cuadricula_unica'" class="cuadricula">
        <table class="table-cuadricula">
          <thead>
            <tr>
              <th></th>
              <th v-for="col in campo.columnas" :key="col">{{ col }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="fila in campo.filas" :key="fila">
              <td class="fila-label">{{ fila }}</td>
              <td v-for="col in campo.columnas" :key="col">
                <input
                  type="radio"
                  :name="`${campo.label}-${fila}`"
                  :value="col"
                  v-model="respuestaDatos[campo.label][fila]"
                  @change="handleCuadriculaChange(campo.label, fila, col, false)"
                />
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      
      <!-- CUADRÍCULA MÚLTIPLE -->
      <div v-else-if="campo.tipo === 'cuadricula_multiple'" class="cuadricula">
        <table class="table-cuadricula">
          <thead>
            <tr>
              <th></th>
              <th v-for="col in campo.columnas" :key="col">{{ col }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="fila in campo.filas" :key="fila">
              <td class="fila-label">{{ fila }}</td>
              <td v-for="col in campo.columnas" :key="col">
                <input
                  type="checkbox"
                  :value="col"
                  @change="handleCuadriculaChange(campo.label, fila, col, true)"
                />
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      
      <!-- ESCALA -->
      <div v-else-if="campo.tipo === 'escala'" class="escala-container">
        <div class="escala-options">
          <label 
            v-for="n in (campo.max || 5) - (campo.min || 1) + 1" 
            :key="n"
            class="escala-item"
          >
            <input
              type="radio"
              :value="(campo.min || 1) + n - 1"
              v-model="respuestaDatos[campo.label]"
            />
            <span>{{ (campo.min || 1) + n - 1 }}</span>
          </label>
        </div>
        <div class="escala-labels">
          <span>{{ campo.min || 1 }} - Muy malo</span>
          <span>{{ campo.max || 5 }} - Excelente</span>
        </div>
      </div>
      
      <!-- SELECT -->
      <select
        v-else-if="campo.tipo === 'select'"
        v-model="respuestaDatos[campo.label]"
        :required="campo.requerido"
        class="form-control"
      >
        <option value="">Selecciona una opción</option>
        <option v-for="opt in campo.opciones" :key="opt" :value="opt">
          {{ opt }}
        </option>
      </select>
    </div>
    
    <button 
      type="submit" 
      class="btn-submit"
      :disabled="loading"
    >
      {{ loading ? 'Enviando...' : 'Enviar Respuesta' }}
    </button>
  </form>
</template>

<style scoped>
.form-response {
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
}

.campo-container {
  margin-bottom: 24px;
}

.campo-label {
  display: block;
  font-weight: 600;
  margin-bottom: 8px;
  color: #333;
}

.required {
  color: #dc3545;
}

.form-control {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 14px;
}

.file-upload {
  border: 2px dashed #ddd;
  padding: 20px;
  text-align: center;
  border-radius: 8px;
  cursor: pointer;
}

.file-upload:hover {
  border-color: #007bff;
}

.table-cuadricula {
  width: 100%;
  border-collapse: collapse;
}

.table-cuadricula th,
.table-cuadricula td {
  padding: 10px;
  text-align: center;
  border: 1px solid #ddd;
}

.fila-label {
  text-align: left !important;
  font-weight: 500;
}

.escala-container {
  margin-top: 10px;
}

.escala-options {
  display: flex;
  gap: 15px;
  margin-bottom: 10px;
}

.escala-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  cursor: pointer;
}

.escala-item input {
  margin-bottom: 5px;
}

.escala-labels {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  color: #666;
}

.btn-geo {
  background: #28a745;
  color: white;
  padding: 10px 20px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
}

.geo-result {
  margin-top: 10px;
  padding: 10px;
  background: #e8f5e9;
  border-radius: 6px;
  font-family: monospace;
  font-size: 12px;
}

.btn-submit {
  width: 100%;
  padding: 15px;
  background: #007bff;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
}

.btn-submit:disabled {
  background: #6c757d;
  cursor: not-allowed;
}
</style>
```

---

## 📂 **4. ESTRUCTURA DE ARCHIVOS EN SERVIDOR**

### **Organización Automática**

```
uploads/
├── {empresaId}/                    # Ej: "empresa-supermercado-xyz"
│   ├── {nombreUsuario}/            # Ej: "juan-perez-garcia"
│   │   ├── perfil/
│   │   │   └── 1642234567890-foto.jpg
│   │   └── {tituloFormulario}/     # Ej: "evaluacion-seguridad-mensual"
│   │       ├── 1642234567890-foto-evidencia-1.jpg
│   │       ├── 1642234567891-foto-evidencia-2.jpg
│   │       └── 1642234567892-video-incidente.mp4
│   └── maria-lopez/
│       └── inventario-diario/
│           └── ...
└── ...
```

### **No necesitas crear carpetas manualmente**
El backend las organiza automáticamente basado en:
- `empresaId` del usuario autenticado
- `nombre` del usuario (limpiado)
- `titulo` del formulario (limpiado)

---

## 👁️ **5. VISUALIZACIÓN DE RESPUESTAS**

### **Rutas Relativas → URLs Completas**

```typescript
// composables/useRespuestas.ts
import { useApi, BASE_URL } from './useApi';
import { ref, computed } from 'vue';

export const useRespuestas = () => {
  const { request, loading, error } = useApi();
  const respuestas = ref<any[]>([]);

  const fetchRespuestas = async () => {
    respuestas.value = await request('GET', '/api/respuestas');
  };

  // ⭐ Convertir ruta relativa a URL completa
  const getFileUrl = (relativePath: string): string => {
    if (!relativePath) return '';
    if (relativePath.startsWith('http')) return relativePath;
    return `${BASE_URL}/${relativePath}`;
  };

  // ⭐ Verificar si un campo contiene archivos
  const isFileField = (value: any): boolean => {
    if (typeof value !== 'string') return false;
    return value.startsWith('uploads/') || 
           value.includes('.jpg') || 
           value.includes('.png') ||
           value.includes('.mp4');
  };

  // ⭐ Extraer archivos de la respuesta
  const extractFilesFromRespuesta = (respuesta: any) => {
    const files: { label: string; urls: string[] }[] = [];
    
    Object.entries(respuesta.datos).forEach(([key, value]) => {
      if (Array.isArray(value)) {
        // Array de rutas (múltiples archivos)
        const fileUrls = value
          .filter(v => isFileField(v))
          .map(v => getFileUrl(v));
        
        if (fileUrls.length > 0) {
          files.push({ label: key, urls: fileUrls });
        }
      } else if (isFileField(value)) {
        // Archivo único
        files.push({ label: key, urls: [getFileUrl(value)] });
      }
    });
    
    return files;
  };

  return {
    respuestas,
    loading,
    error,
    fetchRespuestas,
    getFileUrl,
    extractFilesFromRespuesta
  };
};
```

### **Componente de Visualización de Respuestas**

```vue
<!-- components/RespuestasList.vue -->
<script setup lang="ts">
import { onMounted } from 'vue';
import { useRespuestas } from '@/composables/useRespuestas';

const { 
  respuestas, 
  loading, 
  fetchRespuestas, 
  getFileUrl, 
  extractFilesFromRespuesta 
} = useRespuestas();

onMounted(() => {
  fetchRespuestas();
});

// Renderizar valor según tipo
const renderValue = (value: any): string => {
  if (value === null || value === undefined) return '-';
  if (typeof value === 'object') {
    if (value.lat && value.lng) {
      return `📍 ${value.lat.toFixed(4)}, ${value.lng.toFixed(4)}`;
    }
    return JSON.stringify(value);
  }
  return String(value);
};
</script>

<template>
  <div class="respuestas-container">
    <h2>Respuestas Recibidas</h2>
    
    <div v-if="loading" class="loading">Cargando...</div>
    
    <div v-else-if="respuestas.length === 0" class="empty">
      No hay respuestas aún
    </div>
    
    <div v-else class="respuestas-list">
      <div 
        v-for="respuesta in respuestas" 
        :key="respuesta._id"
        class="respuesta-card"
      >
        <div class="respuesta-header">
          <h3>{{ respuesta.formularioId?.titulo || 'Formulario' }}</h3>
          <span class="fecha">
            {{ new Date(respuesta.fechaEnvio).toLocaleString() }}
          </span>
        </div>
        
        <div class="respuesta-user">
          Por: {{ respuesta.usuarioId?.nombre || 'Usuario' }}
        </div>
        
        <!-- Datos del formulario -->
        <div class="respuesta-datos">
          <div 
            v-for="(value, key) in respuesta.datos" 
            :key="key"
            class="dato-row"
          >
            <label>{{ key }}:</label>
            <span class="value">{{ renderValue(value) }}</span>
          </div>
        </div>
        
        <!-- Archivos adjuntos -->
        <div 
          v-if="extractFilesFromRespuesta(respuesta).length > 0" 
          class="respuesta-archivos"
        >
          <h4>Archivos Adjuntos</h4>
          
          <div 
            v-for="fileGroup in extractFilesFromRespuesta(respuesta)" 
            :key="fileGroup.label"
            class="file-group"
          >
            <label>{{ fileGroup.label }}</label>
            <div class="file-grid">
              <div 
                v-for="(url, index) in fileGroup.urls" 
                :key="index"
                class="file-item"
              >
                <!-- Imagen -->
                <img 
                  v-if="url.match(/\.(jpg|jpeg|png|gif|webp)$/i)"
                  :src="url"
                  :alt="fileGroup.label"
                  class="preview-image"
                  @click="window.open(url, '_blank')"
                />
                
                <!-- Video -->
                <video 
                  v-else-if="url.match(/\.(mp4|webm|ogg)$/i)"
                  controls
                  class="preview-video"
                >
                  <source :src="url" />
                </video>
                
                <!-- Link genérico -->
                <a 
                  v-else
                  :href="url"
                  target="_blank"
                  class="file-link"
                >
                  📎 Ver archivo
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.respuestas-container {
  padding: 20px;
}

.respuesta-card {
  background: white;
  border-radius: 12px;
  padding: 20px;
  margin-bottom: 20px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}

.respuesta-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

.respuesta-header h3 {
  margin: 0;
  color: #333;
}

.fecha {
  color: #666;
  font-size: 14px;
}

.respuesta-user {
  color: #666;
  font-size: 14px;
  margin-bottom: 15px;
}

.dato-row {
  display: flex;
  padding: 8px 0;
  border-bottom: 1px solid #eee;
}

.dato-row label {
  font-weight: 600;
  width: 200px;
  color: #555;
}

.value {
  flex: 1;
  color: #333;
}

.respuesta-archivos {
  margin-top: 20px;
  padding-top: 20px;
  border-top: 2px solid #eee;
}

.respuesta-archivos h4 {
  margin-bottom: 15px;
  color: #333;
}

.file-group {
  margin-bottom: 20px;
}

.file-group label {
  display: block;
  font-weight: 600;
  margin-bottom: 10px;
  color: #666;
}

.file-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 10px;
}

.preview-image {
  width: 100%;
  height: 150px;
  object-fit: cover;
  border-radius: 8px;
  cursor: pointer;
  transition: transform 0.2s;
}

.preview-image:hover {
  transform: scale(1.05);
}

.preview-video {
  width: 100%;
  height: 150px;
  border-radius: 8px;
}

.file-link {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 150px;
  background: #f8f9fa;
  border-radius: 8px;
  text-decoration: none;
  color: #007bff;
}
</style>
```

---

## 🏗️ **6. BUILDER DE FORMULARIOS (Para Gerentes)**

```vue
<!-- components/FormBuilder.vue -->
<script setup lang="ts">
import { ref } from 'vue';
import { useApi } from '@/composables/useApi';
import type { Formulario, CampoConfig, CampoTipo } from '@/types/form.types';

const { request, loading } = useApi();

const formulario = ref<Formulario>({
  titulo: '',
  descripcion: '',
  categoria: '',
  campos: []
});

const tiposCampo: { value: CampoTipo; label: string; icon: string }[] = [
  { value: 'text', label: 'Texto', icon: '📝' },
  { value: 'textarea', label: 'Párrafo', icon: '📄' },
  { value: 'number', label: 'Número', icon: '🔢' },
  { value: 'date', label: 'Fecha', icon: '📅' },
  { value: 'email', label: 'Email', icon: '📧' },
  { value: 'telefono', label: 'Teléfono', icon: '📱' },
  { value: 'foto', label: 'Foto', icon: '📷' },
  { value: 'video', label: 'Video', icon: '🎥' },
  { value: 'geolocalizacion', label: 'GPS', icon: '📍' },
  { value: 'cuadricula_unica', label: 'Cuadrícula (1 opción)', icon: '☐' },
  { value: 'cuadricula_multiple', label: 'Cuadrícula (Múltiple)', icon: '☑️' },
  { value: 'escala', label: 'Escala', icon: '📊' },
  { value: 'select', label: 'Lista', icon: '📋' }
];

const agregarCampo = (tipo: CampoTipo) => {
  const nuevoCampo: CampoConfig = {
    label: `Campo ${formulario.value.campos.length + 1}`,
    tipo,
    requerido: false
  };

  // Configuraciones por tipo
  if (tipo.includes('cuadricula')) {
    nuevoCampo.filas = ['Fila 1', 'Fila 2'];
    nuevoCampo.columnas = ['Malo', 'Regular', 'Bueno', 'Excelente'];
  } else if (tipo === 'escala') {
    nuevoCampo.min = 1;
    nuevoCampo.max = 5;
  } else if (tipo === 'select') {
    nuevoCampo.opciones = ['Opción 1', 'Opción 2', 'Opción 3'];
  }

  formulario.value.campos.push(nuevoCampo);
};

const eliminarCampo = (index: number) => {
  formulario.value.campos.splice(index, 1);
};

const guardarFormulario = async () => {
  try {
    // Validaciones
    if (!formulario.value.titulo.trim()) {
      alert('El título es obligatorio');
      return;
    }
    
    if (formulario.value.campos.length === 0) {
      alert('Agrega al menos un campo');
      return;
    }

    // Validar que todos los campos tengan label
    for (const campo of formulario.value.campos) {
      if (!campo.label.trim()) {
        alert('Todos los campos deben tener un label');
        return;
      }
    }

    await request('POST', '/api/formularios', formulario.value);
    alert('Formulario creado exitosamente');
    
    // Reset
    formulario.value = { titulo: '', descripcion: '', categoria: '', campos: [] };
    
  } catch (error) {
    console.error(error);
  }
};
</script>

<template>
  <div class="form-builder">
    <h2>Crear Nuevo Formulario</h2>
    
    <div class="form-section">
      <label>Título del Formulario *</label>
      <input 
        v-model="formulario.titulo" 
        type="text" 
        placeholder="Ej: Evaluación de Seguridad Mensual"
      />
    </div>
    
    <div class="form-section">
      <label>Descripción</label>
      <textarea 
        v-model="formulario.descripcion"
        placeholder="Describe el propósito de este formulario..."
        rows="3"
      />
    </div>
    
    <div class="form-section">
      <label>Categoría</label>
      <select v-model="formulario.categoria">
        <option value="">Seleccionar...</option>
        <option value="Seguridad">Seguridad</option>
        <option value="Limpieza">Limpieza</option>
        <option value="Inventario">Inventario</option>
        <option value="RRHH">RRHH</option>
        <option value="Calidad">Calidad</option>
      </select>
    </div>
    
    <div class="campos-section">
      <h3>Campos del Formulario</h3>
      
      <div v-if="formulario.campos.length === 0" class="empty-campos">
        Haz clic en un tipo de campo para agregarlo
      </div>
      
      <div 
        v-for="(campo, index) in formulario.campos" 
        :key="index"
        class="campo-editor"
      >
        <div class="campo-header">
          <span class="campo-number">{{ index + 1 }}</span>
          <span class="campo-type">{{ tiposCampo.find(t => t.value === campo.tipo)?.icon }} {{ campo.tipo }}</span>
          <button @click="eliminarCampo(index)" class="btn-delete">🗑️</button>
        </div>
        
        <div class="campo-body">
          <div class="form-group">
            <label>Label (Nombre del campo) *</label>
            <input 
              v-model="campo.label" 
              type="text"
              placeholder="Ej: Nombre del Empleado"
            />
          </div>
          
          <div class="form-group checkbox">
            <label>
              <input v-model="campo.requerido" type="checkbox" />
              Campo obligatorio
            </label>
          </div>
          
          <!-- Configuración para cuadrículas -->
          <div v-if="campo.tipo.includes('cuadricula')" class="config-section">
            <label>Filas (separadas por coma)</label>
            <input 
              v-model="campo.filas" 
              type="text"
              placeholder="Fila 1, Fila 2, Fila 3"
              @change="campo.filas = $event.target.value.split(',').map(s => s.trim())"
            />
            
            <label>Columnas (separadas por coma)</label>
            <input 
              v-model="campo.columnas" 
              type="text"
              placeholder="Malo, Regular, Bueno, Excelente"
              @change="campo.columnas = $event.target.value.split(',').map(s => s.trim())"
            />
          </div>
          
          <!-- Configuración para escala -->
          <div v-if="campo.tipo === 'escala'" class="config-section">
            <div class="row">
              <div class="col">
                <label>Mínimo</label>
                <input v-model.number="campo.min" type="number" min="0" />
              </div>
              <div class="col">
                <label>Máximo</label>
                <input v-model.number="campo.max" type="number" min="1" />
              </div>
            </div>
          </div>
          
          <!-- Configuración para select -->
          <div v-if="campo.tipo === 'select'" class="config-section">
            <label>Opciones (separadas por coma)</label>
            <input 
              v-model="campo.opciones" 
              type="text"
              placeholder="Opción 1, Opción 2, Opción 3"
              @change="campo.opciones = $event.target.value.split(',').map(s => s.trim())"
            />
          </div>
        </div>
      </div>
    </div>
    
    <div class="tipo-campos-toolbar">
      <label>Agregar campo:</label>
      <div class="tipo-buttons">
        <button 
          v-for="tipo in tiposCampo" 
          :key="tipo.value"
          @click="agregarCampo(tipo.value)"
          class="tipo-btn"
          :title="tipo.label"
        >
          {{ tipo.icon }} {{ tipo.label }}
        </button>
      </div>
    </div>
    
    <button 
      @click="guardarFormulario" 
      class="btn-save"
      :disabled="loading"
    >
      {{ loading ? 'Guardando...' : '💾 Guardar Formulario' }}
    </button>
  </div>
</template>

<style scoped>
.form-builder {
  max-width: 900px;
  margin: 0 auto;
  padding: 30px;
}

.form-section {
  margin-bottom: 20px;
}

.form-section label {
  display: block;
  font-weight: 600;
  margin-bottom: 8px;
  color: #333;
}

.form-section input,
.form-section textarea,
.form-section select {
  width: 100%;
  padding: 12px;
  border: 1px solid #ddd;
  border-radius: 8px;
  font-size: 15px;
}

.campos-section {
  margin: 30px 0;
}

.empty-campos {
  text-align: center;
  padding: 40px;
  color: #999;
  background: #f8f9fa;
  border-radius: 8px;
}

.campo-editor {
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 12px;
  margin-bottom: 20px;
  overflow: hidden;
}

.campo-header {
  display: flex;
  align-items: center;
  padding: 15px 20px;
  background: #f8f9fa;
  border-bottom: 1px solid #e0e0e0;
}

.campo-number {
  background: #007bff;
  color: white;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  margin-right: 15px;
}

.campo-type {
  flex: 1;
  font-weight: 500;
  color: #555;
}

.btn-delete {
  background: none;
  border: none;
  font-size: 20px;
  cursor: pointer;
  padding: 5px;
}

.campo-body {
  padding: 20px;
}

.form-group {
  margin-bottom: 15px;
}

.form-group label {
  display: block;
  margin-bottom: 5px;
  font-size: 14px;
  color: #666;
}

.form-group input[type="text"],
.form-group input[type="number"] {
  width: 100%;
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 6px;
}

.form-group.checkbox label {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
}

.config-section {
  background: #f8f9fa;
  padding: 15px;
  border-radius: 8px;
  margin-top: 15px;
}

.config-section label {
  font-size: 13px;
  margin-bottom: 5px;
}

.row {
  display: flex;
  gap: 15px;
}

.col {
  flex: 1;
}

.tipo-campos-toolbar {
  margin: 30px 0;
  padding: 20px;
  background: #f8f9fa;
  border-radius: 12px;
}

.tipo-buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 10px;
}

.tipo-btn {
  padding: 10px 15px;
  background: white;
  border: 1px solid #ddd;
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s;
}

.tipo-btn:hover {
  background: #007bff;
  color: white;
  border-color: #007bff;
}

.btn-save {
  width: 100%;
  padding: 18px;
  background: #28a745;
  color: white;
  border: none;
  border-radius: 10px;
  font-size: 18px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s;
}

.btn-save:hover {
  background: #218838;
}

.btn-save:disabled {
  background: #6c757d;
  cursor: not-allowed;
}
</style>
```

---

## 📋 **RESUMEN RÁPIDO - CHECKLIST**

### **✅ Para Enviar Respuestas:**

1. **Datos JSON:** Usar `label` del campo como key
   ```javascript
   datos: JSON.stringify({"Nombre": "Juan", "Foto": []})
   ```

2. **Archivos:** Usar `label` como fieldname en FormData
   ```javascript
   formData.append('Foto Evidencia', fileBlob)
   ```

3. **Geolocalización:** Objeto con `lat` y `lng`
   ```javascript
   {"Coordenadas GPS": {lat: 19.43, lng: -99.13}}
   ```

4. **Cuadrícula:** Objeto con filas como keys
   ```javascript
   {"Evaluación": {"Puntualidad": "Bueno", "Calidad": "Excelente"}}
   ```

### **✅ Para Mostrar Respuestas:**

1. **Concatenar BASE_URL con ruta relativa**
   ```javascript
   const imageUrl = `${BASE_URL}/${respuesta.datos['Foto'][0]}`
   ```

2. **Archivos organizados automáticamente**
   ```
   uploads/{empresa}/{usuario}/{tituloForm}/archivo.jpg
   ```

---

**¿Preguntas?** Contacta al equipo de Backend.

**Documentación Técnica:** `API_DOCUMENTATION.md`

**¡Happy Coding con Vue 3!** 🚀
