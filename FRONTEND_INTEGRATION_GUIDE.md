# 📘 GUÍA DE INTEGRACIÓN - FRONTEND DEVELOPER

**FormBuilder Backend API**  
**Base URL:** `http://localhost:3000` (desarrollo)  
**Versión:** 1.0.0  
**Última Actualización:** 28 Abril 2026

---

## 🚀 **CONFIGURACIÓN INICIAL**

### **Axios Instance (Recomendado)**

```javascript
// api.js - Configuración base
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const api = axios.create({
  baseURL: API_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Interceptor para agregar token automáticamente
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers['x-auth-token'] = token;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Interceptor para manejar errores
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
```

---

## 🔐 **1. AUTENTICACIÓN**

### **Registro de Usuario**

```javascript
// services/authService.js

const registerUser = async (userData) => {
  try {
    const response = await api.post('/api/auth/register', {
      nombre: userData.nombre,
      email: userData.email,
      password: userData.password,
      rol: 'empleado', // o 'gerente'
      empresaId: userData.empresaId
    });
    
    // Guardar token
    localStorage.setItem('token', response.data.token);
    localStorage.setItem('user', JSON.stringify(response.data.user));
    
    return response.data;
  } catch (error) {
    throw error.response?.data?.error || 'Error al registrar usuario';
  }
};

// Uso:
const handleRegister = async () => {
  try {
    const result = await registerUser({
      nombre: 'Juan Pérez',
      email: 'juan@empresa.com',
      password: 'Password123!',
      empresaId: 'mi-empresa-123'
    });
    console.log('Usuario registrado:', result);
  } catch (error) {
    console.error('Error:', error);
  }
};
```

### **Login**

```javascript
const loginUser = async (email, password) => {
  try {
    const response = await api.post('/api/auth/login', {
      email,
      password
    });
    
    // Guardar en localStorage
    localStorage.setItem('token', response.data.token);
    localStorage.setItem('user', JSON.stringify(response.data.usuario));
    
    return response.data;
  } catch (error) {
    throw error.response?.data?.error || 'Error al iniciar sesión';
  }
};

// Uso en React:
const handleLogin = async (e) => {
  e.preventDefault();
  setLoading(true);
  
  try {
    const result = await loginUser(email, password);
    navigate('/dashboard');
  } catch (error) {
    setError(error);
  } finally {
    setLoading(false);
  }
};
```

### **Logout**

```javascript
const logoutUser = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  window.location.href = '/login';
};
```

### **Verificar Autenticación**

```javascript
const isAuthenticated = () => {
  return localStorage.getItem('token') !== null;
};

const getUser = () => {
  const userStr = localStorage.getItem('user');
  return userStr ? JSON.parse(userStr) : null;
};
```

---

## 👤 **2. PERFIL DE USUARIO**

### **Obtener Perfil**

```javascript
const getProfile = async () => {
  try {
    const response = await api.get('/api/usuarios/perfil');
    return response.data; // { nombre, email, dni, telefono, fotoUrl, ... }
  } catch (error) {
    throw error.response?.data?.msg || 'Error al obtener perfil';
  }
};

// Uso en React:
useEffect(() => {
  const loadProfile = async () => {
    const profile = await getProfile();
    setUserData(profile);
  };
  loadProfile();
}, []);
```

### **Actualizar Perfil**

```javascript
const updateProfile = async (profileData) => {
  try {
    const response = await api.put('/api/usuarios/perfil', {
      nombre: profileData.nombre,
      dni: profileData.dni,
      telefono: profileData.telefono
    });
    return response.data;
  } catch (error) {
    throw error.response?.data?.msg || 'Error al actualizar perfil';
  }
};
```

### **Subir Foto de Perfil**

```javascript
const uploadProfilePhoto = async (file) => {
  try {
    const formData = new FormData();
    formData.append('foto', file);
    
    const response = await api.post('/api/usuarios/perfil/foto', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    
    return response.data; // { msg, fotoUrl }
  } catch (error) {
    throw error.response?.data?.error || 'Error al subir foto';
  }
};

// Uso en React:
const handlePhotoUpload = async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  
  // Validar tipo y tamaño
  if (!file.type.startsWith('image/')) {
    alert('Solo imágenes permitidas');
    return;
  }
  
  if (file.size > 5 * 1024 * 1024) {
    alert('Máximo 5MB');
    return;
  }
  
  try {
    const result = await uploadProfilePhoto(file);
    setPhotoUrl(result.fotoUrl);
  } catch (error) {
    console.error(error);
  }
};
```

---

## 📝 **3. FORMULARIOS (CRUD)**

### **Crear Formulario**

```javascript
const createFormulario = async (formData) => {
  try {
    const response = await api.post('/api/formularios', {
      titulo: formData.titulo,
      descripcion: formData.descripcion,
      categoria: formData.categoria,
      campos: formData.campos // Array de campos
    });
    return response.data; // { msg, data: { _id, titulo, campos, ... } }
  } catch (error) {
    throw error.response?.data?.msg || 'Error al crear formulario';
  }
};

// Ejemplo de estructura de campos:
const ejemploFormulario = {
  titulo: 'Evaluación de Desempeño',
  descripcion: 'Formulario mensual de evaluación',
  categoria: 'RRHH',
  campos: [
    {
      label: 'Nombre del Empleado',
      tipo: 'text',
      requerido: true
    },
    {
      label: 'Fecha de Evaluación',
      tipo: 'date',
      requerido: true
    },
    {
      label: 'Puntualidad',
      tipo: 'cuadricula_unica',
      requerido: true,
      filas: ['Llegadas tarde', 'Cumplimiento de horario'],
      columnas: ['Malo', 'Regular', 'Bueno', 'Excelente']
    },
    {
      label: 'Habilidades Técnicas',
      tipo: 'cuadricula_multiple',
      requerido: false,
      filas: ['Excel', 'Word', 'PowerPoint'],
      columnas: ['Básico', 'Intermedio', 'Avanzado']
    },
    {
      label: 'Comentarios',
      tipo: 'textarea',
      requerido: false
    },
    {
      label: 'Evidencia Fotográfica',
      tipo: 'file',
      requerido: false
    }
  ]
};
```

### **Listar Formularios**

```javascript
const getFormularios = async () => {
  try {
    const response = await api.get('/api/formularios');
    return response.data; // Array de formularios
  } catch (error) {
    throw error.response?.data?.msg || 'Error al obtener formularios';
  }
};

// Uso en React:
useEffect(() => {
  const loadForms = async () => {
    try {
      const forms = await getFormularios();
      setFormularios(forms);
    } catch (error) {
      console.error(error);
    }
  };
  loadForms();
}, []);
```

### **Obtener Formulario por ID**

```javascript
const getFormularioById = async (formId) => {
  try {
    const response = await api.get(`/api/formularios/${formId}`);
    return response.data; // Objeto formulario completo
  } catch (error) {
    if (error.response?.status === 404) {
      throw 'Formulario no encontrado';
    }
    throw error.response?.data?.msg || 'Error al obtener formulario';
  }
};
```

### **Actualizar Formulario**

```javascript
const updateFormulario = async (formId, formData) => {
  try {
    const response = await api.put(`/api/formularios/${formId}`, {
      titulo: formData.titulo,
      campos: formData.campos
    });
    return response.data; // Formulario actualizado
  } catch (error) {
    throw error.response?.data?.msg || 'Error al actualizar formulario';
  }
};
```

### **Eliminar Formulario**

```javascript
const deleteFormulario = async (formId) => {
  try {
    const response = await api.delete(`/api/formularios/${formId}`);
    return response.data; // { msg: 'Formulario eliminado' }
  } catch (error) {
    throw error.response?.data?.msg || 'Error al eliminar formulario';
  }
};

// Uso con confirmación:
const handleDelete = async (formId) => {
  if (!window.confirm('¿Estás seguro de eliminar este formulario?')) {
    return;
  }
  
  try {
    await deleteFormulario(formId);
    setFormularios(forms => forms.filter(f => f._id !== formId));
  } catch (error) {
    alert(error);
  }
};
```

---

## 📊 **4. ENVÍO DE RESPUESTAS**

### **Enviar Respuesta con Archivos**

```javascript
const submitRespuesta = async (formularioId, respuestaData, files) => {
  try {
    const formData = new FormData();
    
    // Datos del formulario
    formData.append('formularioId', formularioId);
    formData.append('empresaId', getUser().empresaId);
    formData.append('nombreFormulario', respuestaData.nombreFormulario);
    
    // Datos de los campos como JSON
    formData.append('datos', JSON.stringify(respuestaData.datos));
    
    // Archivos
    if (files && files.length > 0) {
      files.forEach((file, index) => {
        formData.append(`archivo_${index}`, file);
      });
    }
    
    const response = await api.post('/api/respuestas', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    
    return response.data; // { mensaje: 'Reporte guardado...' }
  } catch (error) {
    throw error.response?.data?.error || 'Error al enviar respuesta';
  }
};

// Ejemplo completo:
const handleSubmit = async (e) => {
  e.preventDefault();
  setLoading(true);
  
  try {
    // Preparar datos
    const respuestaData = {
      nombreFormulario: 'Evaluación de Desempeño',
      datos: {
        'Nombre del Empleado': 'Juan Pérez',
        'Fecha de Evaluación': '2024-01-15',
        'Puntualidad': { 'Llegadas tarde': 'Bueno' },
        'Comentarios': 'Excelente desempeño este mes'
      }
    };
    
    // Archivos seleccionados
    const files = [
      document.getElementById('foto1').files[0],
      document.getElementById('foto2').files[0]
    ].filter(Boolean);
    
    await submitRespuesta('form-id-123', respuestaData, files);
    alert('¡Respuesta enviada exitosamente!');
    
  } catch (error) {
    alert('Error: ' + error);
  } finally {
    setLoading(false);
  }
};
```

### **Obtener Respuestas (Para Gerentes)**

```javascript
const getRespuestas = async () => {
  try {
    const response = await api.get('/api/respuestas');
    return response.data; // Array de respuestas
  } catch (error) {
    throw error.response?.data?.error || 'Error al obtener respuestas';
  }
};

// Estructura de respuesta:
/*
[
  {
    _id: "respuesta-id",
    formularioId: {
      _id: "form-id",
      titulo: "Evaluación..."
    },
    usuarioId: {
      _id: "user-id",
      nombre: "Juan Pérez"
    },
    datos: {
      "Nombre del Empleado": "Juan Pérez",
      "Fotos": ["uploads/.../foto1.jpg"]
    },
    fechaEnvio: "2024-01-15T10:30:00Z"
  }
]
*/

// Mostrar con URLs completas:
const getFileUrl = (relativePath) => {
  return `${API_URL}/${relativePath}`;
};

// En JSX:
// <img src={getFileUrl(respuesta.datos.Fotos[0])} alt="Evidencia" />
```

---

## 🎨 **5. EJEMPLOS DE COMPONENTES REACT**

### **Componente de Login**

```jsx
// components/Login.jsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      const result = await loginUser(email, password);
      navigate('/dashboard');
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <form onSubmit={handleSubmit}>
        <h2>Iniciar Sesión</h2>
        
        {error && <div className="error">{error}</div>}
        
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        
        <input
          type="password"
          placeholder="Contraseña"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        
        <button type="submit" disabled={loading}>
          {loading ? 'Cargando...' : 'Ingresar'}
        </button>
      </form>
    </div>
  );
};
```

### **Componente de Lista de Formularios**

```jsx
// components/FormulariosList.jsx
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

const FormulariosList = () => {
  const [formularios, setFormularios] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadFormularios();
  }, []);

  const loadFormularios = async () => {
    try {
      const data = await getFormularios();
      setFormularios(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('¿Eliminar este formulario?')) return;
    
    try {
      await deleteFormulario(id);
      setFormularios(forms => forms.filter(f => f._id !== id));
    } catch (error) {
      alert(error);
    }
  };

  if (loading) return <div>Cargando...</div>;

  return (
    <div className="formularios-list">
      <h2>Mis Formularios</h2>
      
      <Link to="/formularios/nuevo" className="btn-new">
        + Nuevo Formulario
      </Link>
      
      {formularios.length === 0 ? (
        <p>No tienes formularios creados</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Título</th>
              <th>Categoría</th>
              <th>Fecha</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {formularios.map(form => (
              <tr key={form._id}>
                <td>{form.titulo}</td>
                <td>{form.categoria}</td>
                <td>{new Date(form.fechaCreacion).toLocaleDateString()}</td>
                <td>
                  <Link to={`/formularios/${form._id}`}>Ver</Link>
                  {' | '}
                  <Link to={`/formularios/${form._id}/editar`}>Editar</Link>
                  {' | '}
                  <button onClick={() => handleDelete(form._id)}>
                    Eliminar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};
```

### **Componente de Builder de Formularios**

```jsx
// components/FormBuilder.jsx
import { useState } from 'react';

const CAMPO_TIPOS = [
  { value: 'text', label: 'Texto' },
  { value: 'number', label: 'Número' },
  { value: 'date', label: 'Fecha' },
  { value: 'textarea', label: 'Área de Texto' },
  { value: 'cuadricula_unica', label: 'Cuadrícula (Una opción)' },
  { value: 'cuadricula_multiple', label: 'Cuadrícula (Múltiple)' },
  { value: 'file', label: 'Archivo / Foto' }
];

const FormBuilder = () => {
  const [titulo, setTitulo] = useState('');
  const [campos, setCampos] = useState([]);
  const [saving, setSaving] = useState(false);

  const addCampo = () => {
    setCampos([...campos, {
      label: '',
      tipo: 'text',
      requerido: false,
      filas: [],
      columnas: []
    }]);
  };

  const updateCampo = (index, field, value) => {
    const nuevosCampos = [...campos];
    nuevosCampos[index][field] = value;
    setCampos(nuevosCampos);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    
    try {
      await createFormulario({ titulo, campos });
      alert('Formulario creado exitosamente');
    } catch (error) {
      alert(error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <h2>Crear Nuevo Formulario</h2>
      
      <input
        type="text"
        placeholder="Título del formulario"
        value={titulo}
        onChange={(e) => setTitulo(e.target.value)}
        required
      />
      
      <h3>Campos</h3>
      
      {campos.map((campo, index) => (
        <div key={index} className="campo-editor">
          <input
            type="text"
            placeholder="Etiqueta del campo"
            value={campo.label}
            onChange={(e) => updateCampo(index, 'label', e.target.value)}
          />
          
          <select
            value={campo.tipo}
            onChange={(e) => updateCampo(index, 'tipo', e.target.value)}
          >
            {CAMPO_TIPOS.map(tipo => (
              <option key={tipo.value} value={tipo.value}>
                {tipo.label}
              </option>
            ))}
          </select>
          
          <label>
            <input
              type="checkbox"
              checked={campo.requerido}
              onChange={(e) => updateCampo(index, 'requerido', e.target.checked)}
            />
            Requerido
          </label>
          
          {campo.tipo.includes('cuadricula') && (
            <div className="cuadricula-config">
              <input
                type="text"
                placeholder="Filas (separadas por coma)"
                onChange={(e) => updateCampo(index, 'filas', e.target.value.split(','))}
              />
              <input
                type="text"
                placeholder="Columnas (separadas por coma)"
                onChange={(e) => updateCampo(index, 'columnas', e.target.value.split(','))}
              />
            </div>
          )}
        </div>
      ))}
      
      <button type="button" onClick={addCampo}>
        + Agregar Campo
      </button>
      
      <button type="submit" disabled={saving}>
        {saving ? 'Guardando...' : 'Guardar Formulario'}
      </button>
    </form>
  );
};
```

---

## ⚠️ **6. MANEJO DE ERRORES COMUNES**

### **Códigos de Error y Acciones**

```javascript
// Error Handler centralizado
const handleApiError = (error) => {
  const status = error.response?.status;
  const message = error.response?.data?.msg || error.response?.data?.error || 'Error desconocido';
  
  switch (status) {
    case 400:
      // Bad Request - Datos inválidos
      return { type: 'validation', message };
      
    case 401:
      // Unauthorized - Token inválido o expirado
      localStorage.removeItem('token');
      window.location.href = '/login';
      return { type: 'auth', message: 'Sesión expirada. Por favor ingresa nuevamente.' };
      
    case 403:
      // Forbidden - Sin permisos
      return { type: 'permission', message: 'No tienes permiso para esta acción' };
      
    case 404:
      // Not Found
      return { type: 'notfound', message: 'Recurso no encontrado' };
      
    case 409:
      // Conflict - Duplicado
      return { type: 'conflict', message: 'El recurso ya existe' };
      
    case 413:
      // Payload Too Large
      return { type: 'size', message: 'Archivo demasiado grande. Máximo 10MB.' };
      
    case 500:
      // Server Error
      return { type: 'server', message: 'Error del servidor. Intenta más tarde.' };
      
    default:
      return { type: 'unknown', message };
  }
};

// Uso:
try {
  await someApiCall();
} catch (error) {
  const { type, message } = handleApiError(error);
  
  if (type === 'validation') {
    // Mostrar errores de validación en formulario
    setFormErrors(message);
  } else {
    // Mostrar alerta general
    alert(message);
  }
}
```

---

## 🔄 **7. UTILIDADES ADICIONALES**

### **Rutas Protegidas (React Router v6)**

```jsx
// components/PrivateRoute.jsx
import { Navigate } from 'react-router-dom';

const PrivateRoute = ({ children }) => {
  const isAuth = isAuthenticated();
  return isAuth ? children : <Navigate to="/login" replace />;
};

// App.jsx
import { BrowserRouter, Routes, Route } from 'react-router-dom';

const App = () => (
  <BrowserRouter>
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      
      {/* Rutas protegidas */}
      <Route path="/dashboard" element={
        <PrivateRoute><Dashboard /></PrivateRoute>
      } />
      <Route path="/formularios" element={
        <PrivateRoute><FormulariosList /></PrivateRoute>
      } />
      <Route path="/formularios/nuevo" element={
        <PrivateRoute><FormBuilder /></PrivateRoute>
      } />
    </Routes>
  </BrowserRouter>
);
```

### **Hook Personalizado para API**

```javascript
// hooks/useApi.js
import { useState, useCallback } from 'react';

export const useApi = (apiFunction) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const execute = useCallback(async (...params) => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await apiFunction(...params);
      setData(result);
      return result;
    } catch (err) {
      const errorMessage = err.response?.data?.msg || err.message;
      setError(errorMessage);
      throw errorMessage;
    } finally {
      setLoading(false);
    }
  }, [apiFunction]);

  return { data, loading, error, execute };
};

// Uso:
const FormulariosPage = () => {
  const { data: formularios, loading, error, execute: loadForms } = useApi(getFormularios);

  useEffect(() => {
    loadForms();
  }, []);

  if (loading) return <div>Cargando...</div>;
  if (error) return <div>Error: {error}</div>;
  
  return (
    <ul>
      {formularios?.map(form => <li key={form._id}>{form.titulo}</li>)}
    </ul>
  );
};
```

---

## 📱 **8. EJEMPLOS CON FETCH (Sin Axios)**

```javascript
// Si prefieres usar fetch nativo en lugar de axios

const API_URL = 'http://localhost:3000';

const fetchWithAuth = async (endpoint, options = {}) => {
  const token = localStorage.getItem('token');
  
  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...(token && { 'x-auth-token': token }),
      ...options.headers
    },
    ...options
  };
  
  const response = await fetch(`${API_URL}${endpoint}`, config);
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.msg || error.error || 'Error desconocido');
  }
  
  return response.json();
};

// Uso:
const loginWithFetch = async (email, password) => {
  const result = await fetchWithAuth('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password })
  });
  
  localStorage.setItem('token', result.token);
  return result;
};
```

---

## 📝 **RESUMEN RÁPIDO**

| Operación | Endpoint | Auth | Body |
|-----------|----------|------|------|
| **Login** | `POST /api/auth/login` | ❌ | `{email, password}` |
| **Register** | `POST /api/auth/register` | ❌ | `{nombre, email, password, rol, empresaId}` |
| **Get Profile** | `GET /api/usuarios/perfil` | ✅ | - |
| **Update Profile** | `PUT /api/usuarios/perfil` | ✅ | `{nombre, dni, telefono}` |
| **Upload Photo** | `POST /api/usuarios/perfil/foto` | ✅ | `FormData` |
| **List Forms** | `GET /api/formularios` | ✅ | - |
| **Create Form** | `POST /api/formularios` | ✅ | `{titulo, campos[]}` |
| **Get Form** | `GET /api/formularios/:id` | ✅ | - |
| **Update Form** | `PUT /api/formularios/:id` | ✅ | `{titulo, campos[]}` |
| **Delete Form** | `DELETE /api/formularios/:id` | ✅ | - |
| **Submit Response** | `POST /api/respuestas` | ✅ | `FormData` |
| **Get Responses** | `GET /api/respuestas` | ✅ | - |

---

**¿Preguntas?** Revisa el `API_DOCUMENTATION.md` para detalles técnicos completos.

**¡Happy Coding!** 🚀
