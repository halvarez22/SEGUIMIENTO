# 🚀 Guía de Automatización Completa - KMZ Map Viewer

## 📋 Resumen Ejecutivo

Esta guía configura un **sistema completo de automatización** que incluye:

- ✅ **Carga automática diaria** de archivos KMZ desde Firebase Storage
- ✅ **Almacenamiento inteligente** en Firestore para consultas rápidas
- ✅ **IA conversacional avanzada** para consultas analíticas
- ✅ **Sistema de consultas** por fecha, hora y ubicación
- ✅ **Interfaz web completa** para gestión manual

---

## 🎯 Funcionalidades Implementadas

### 🤖 Consultas IA Disponibles

El chatbot ahora responde a:

1. **"dame los tres puntos más visitados"**
   - Muestra top 5 ubicaciones más frecuentadas
   - Incluye coordenadas y conteo de visitas

2. **"cuál es la ruta más utilizada"**
   - Muestra rutas ordenadas por uso
   - Incluye estadísticas de duración y puntos

3. **"dónde estuve el 15 de octubre entre las 3:40 pm y las 5:30 pm"**
   - Consultas específicas por fecha y rango horario
   - Formato flexible: "15 de octubre", "quince de octubre", etc.

4. **"estadísticas" o "cuántos puntos tengo"**
   - Resumen completo de datos
   - Total puntos, días, ubicaciones, rango de fechas

### 🔄 Sistema de Carga Automática

- **Firebase Storage**: Almacena archivos KMZ
- **Firestore**: Base de datos para consultas rápidas
- **Detección automática**: Archivos nuevos se procesan automáticamente
- **Historial de procesamiento**: Evita duplicados

---

## ⚙️ Configuración Paso a Paso

### Paso 1: Configurar Firebase

#### 1.1 Crear Proyecto Firebase
1. Ve a [Firebase Console](https://console.firebase.google.com/)
2. Crea un nuevo proyecto
3. Habilita **Authentication**, **Firestore** y **Storage**

#### 1.2 Obtener Credenciales
1. Ve a **Configuración del proyecto** → **General**
2. Desplázate a "Tus apps" → **Agregar app web**
3. Copia las credenciales generadas

#### 1.3 Configurar Variables de Entorno
Crea el archivo `.env.local` con:

```env
# Firebase Configuration
VITE_FIREBASE_API_KEY=your_api_key_here
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abcdef123456

# Gemini AI API Key
VITE_GEMINI_API_KEY=your_gemini_api_key_here
```

### Paso 2: Configurar Firebase Storage

#### 2.1 Crear Bucket y Carpetas
1. Ve a **Storage** en Firebase Console
2. Crea regla de seguridad para uploads:

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /kmz-files/{allPaths=**} {
      allow read, write: if request.auth != null;
      allow read: if true; // Permitir lectura pública para procesamiento
    }
  }
}
```

#### 2.2 Estructura de Carpetas
```
/kmz-files/
  ├── 2025-10-01_ruta_manana.kmz
  ├── 2025-10-01_ruta_tarde.kmz
  ├── 2025-10-02_ruta_manana.kmz
  └── ...
```

### Paso 3: Configurar Firestore

#### 3.1 Crear Colecciones
Firestore creará automáticamente las colecciones:
- `locations`: Datos geoespaciales procesados
- `processed_files`: Historial de archivos procesados
- `location_updates`: Actualizaciones de visitas

#### 3.2 Reglas de Seguridad
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if request.auth != null;
      allow read: if true; // Permitir lectura para consultas
    }
  }
}
```

### Paso 4: Configurar API de Gemini

1. Ve a [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Crea una nueva API key
3. Agrega al `.env.local` como `VITE_GEMINI_API_KEY`

---

## 🚀 Uso del Sistema

### Interfaz Web

1. **Configura Firebase**: Las variables de entorno se detectan automáticamente
2. **Sube archivos KMZ**: Usa el botón "Cargar Automáticamente"
3. **Activa carga automática**: Para procesamiento diario
4. **Consulta con IA**: Usa el chatbot para preguntas analíticas

### Consultas de Ejemplo

```
Usuario: "dame los tres puntos más visitados"
IA: 🏆 Puntos Más Visitados:
     1. León, Guanajuato - 15 visitas
     2. Irapuato, Guanajuato - 8 visitas
     3. Celaya, Guanajuato - 5 visitas

Usuario: "dónde estuve el 15 de octubre entre las 3:40 pm y las 5:30 pm"
IA: 📅 Ubicaciones el 15 de octubre entre 15:40 y 17:30:
     1. Centro de León, Guanajuato - 16:15
     2. Norte de León, Guanajuato (3.2 km) - 17:02

Usuario: "cuál es la ruta más utilizada"
IA: 🛣️ Rutas Más Utilizadas:
     1. Ruta del lunes - 25 usos, 18 puntos
     2. Ruta del viernes - 20 usos, 15 puntos
```

### Automatización por Línea de Comandos

```bash
# Procesar archivos nuevos manualmente
npm run auto-load

# Ver logs en tiempo real
npm run auto-load

# Programar ejecución diaria (ejemplo con cron en Linux/Mac)
crontab -e
# Agregar línea:
0 6 * * * cd /ruta/a/tu/proyecto && npm run auto-load
```

---

## 🔧 Solución de Problemas

### Error: "Firebase no está configurado"
- ✅ Verifica que `.env.local` existe con todas las variables
- ✅ Reinicia el servidor de desarrollo

### Error: "API key de Gemini no configurada"
- ✅ Configura `VITE_GEMINI_API_KEY` en `.env.local`
- ✅ Ve al chatbot y configura la key manualmente

### Error: "No se encontraron archivos en Storage"
- ✅ Sube archivos KMZ a la carpeta `kmz-files/` en Firebase Storage
- ✅ Verifica permisos de lectura/escritura

### Consultas IA no funcionan
- ✅ Asegúrate de tener API key de Gemini configurada
- ✅ Las consultas funcionan en español e inglés
- ✅ Formato flexible para fechas: "15 octubre", "quince de octubre"

---

## 📊 Arquitectura Técnica

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Firebase      │    │   Aplicación     │    │   Usuario       │
│   Storage       │◄──►│   Web/React      │◄──►│                 │
│                 │    │                  │    │                 │
│ • KMZ Files     │    │ • AutoLoadManager│    │ • Consultas IA  │
│ • Raw Data      │    │ • DataAnalysis   │    │ • Visualización │
└─────────────────┘    └──────────────────┘    └─────────────────┘
         ▲                       ▲                       ▲
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Firestore     │    │   Gemini AI      │    │   Map Display   │
│   Database      │◄──►│   Analysis       │◄──►│   Tooltips      │
│                 │    │   Queries        │    │                 │
│ • Processed     │    │ • Smart          │    │ • Interactive   │
│   Locations     │    │   Responses      │    │ • Markers       │
│ • Statistics    │    │                  │    │                 │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

### Flujo de Datos:

1. **Upload**: KMZ → Firebase Storage
2. **Processing**: Storage → Parsing → Firestore
3. **Analysis**: Firestore → DataAnalysisService → Consultas
4. **Response**: Consultas → Gemini AI → Usuario

---

## 🎯 Beneficios del Sistema

- ✅ **Automatización completa**: Carga diaria sin intervención
- ✅ **Consultas inteligentes**: IA entiende lenguaje natural
- ✅ **Escalabilidad**: Firebase maneja grandes volúmenes
- ✅ **Confiabilidad**: Fallback offline para geocoding
- ✅ **Flexibilidad**: Consultas por fecha, hora, frecuencia
- ✅ **Interfaz intuitiva**: Gestión manual cuando se necesita

---

## 🚀 Próximos Pasos

1. **Configura Firebase** siguiendo los pasos arriba
2. **Prueba las consultas IA** con datos de ejemplo
3. **Programa la carga automática** con cron/jobs
4. **Configura backups** automáticos de Firestore
5. **Monitorea logs** para optimización continua

¡Tu sistema de seguimiento GPS con IA está listo para uso profesional! 🎉

**¿Necesitas ayuda con algún paso específico de la configuración?**
