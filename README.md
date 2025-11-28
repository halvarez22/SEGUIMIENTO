# 🚗 KMZ Map Viewer - Seguimiento GPS con IA

<div align="center">
  <img src="https://img.shields.io/badge/React-19.2.0-blue.svg" alt="React"/>
  <img src="https://img.shields.io/badge/TypeScript-5.8.2-blue.svg" alt="TypeScript"/>
  <img src="https://img.shields.io/badge/Vite-6.2.0-yellow.svg" alt="Vite"/>
  <img src="https://img.shields.io/badge/Firebase-12.3.0-orange.svg" alt="Firebase"/>
  <img src="https://img.shields.io/badge/Google%20Gemini-1.22.0-green.svg" alt="Gemini"/>
  <img src="https://img.shields.io/badge/Leaflet-Interactive%20Maps-green.svg" alt="Leaflet"/>
</div>

<div align="center">
  <h3>📍 Visualiza recorridos GPS • 🤖 Consultas con IA • 💾 Persistencia completa</h3>
</div>

---

## ✨ Características Principales

### 🗺️ **Visualización de Mapas**
- **Carga de archivos KMZ** con puntos georreferenciados
- **Mapas interactivos** con Leaflet
- **Minitarjetas informativas** al hacer clic en puntos
- **Información detallada**: consecutivo, hora, fecha, dirección

### 🤖 **IA Integrada con Google Gemini**
- **Chatbot inteligente** para consultas analíticas
- **Preguntas avanzadas**:
  - *"¿Cuáles son los 3 puntos más visitados?"*
  - *"¿Cuál es la ruta más utilizada?"*
  - *"¿Dónde estuvo el dispositivo el 10 de octubre entre 3:40pm y 5:30pm?"*

### 💾 **Persistencia Completa**
- **Firebase Firestore** para almacenamiento en la nube
- **localStorage** como respaldo local
- **Sincronización** automática entre dispositivos
- **Supervivencia** a recargas de página

### 📊 **Gestión Avanzada de Datos**
- **Backups automáticos** y restauración
- **Sistema de papelera** para eliminación segura
- **Auditoría completa** de todas las acciones
- **Filtros por fecha** y día específico
- **Estadísticas del historial**

---

## 🚀 Despliegue

### **Vercel (Recomendado)**
[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/[TU-USUARIO]/kmz-map-viewer)

### **Otros Proveedores**
- **Netlify**
- **Railway**
- **Render**
- **Heroku**

---

## 🛠️ Instalación y Configuración

### **Prerrequisitos**
- **Node.js** 18+
- **Cuenta de Firebase** (para persistencia)
- **API Key de Google Gemini** (para IA)

### **Instalación Local**

1. **Clona el repositorio:**
   ```bash
   git clone https://github.com/[TU-USUARIO]/kmz-map-viewer.git
   cd kmz-map-viewer
   ```

2. **Instala dependencias:**
   ```bash
   npm install
   ```

3. **Configura Firebase:**
   ```bash
   # Copia las credenciales a .env.local
   # Las variables necesarias están documentadas en .env.local.example
   ```

4. **Configura Google Gemini:**
   ```bash
   # Agrega tu API key en .env.local
   VITE_GEMINI_API_KEY=tu_api_key_aqui
   ```

5. **Ejecuta la aplicación:**
   ```bash
   npm run dev
   ```

---

## 🔧 Configuración de Firebase

### **1. Crear Proyecto en Firebase Console**
1. Ve a [Firebase Console](https://console.firebase.google.com/)
2. Crea un nuevo proyecto: `seguimiento-a66fe`
3. Habilita **Firestore Database**
4. Configura las **reglas de seguridad**

### **2. Reglas de Firestore**
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true;
    }
  }
}
```

### **3. Variables de Entorno**
Crea un archivo `.env.local`:
```bash
VITE_FIREBASE_API_KEY=tu_api_key
VITE_FIREBASE_AUTH_DOMAIN=seguimiento-a66fe.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=seguimiento-a66fe
VITE_FIREBASE_STORAGE_BUCKET=seguimiento-a66fe.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=tu_sender_id
VITE_FIREBASE_APP_ID=tu_app_id
VITE_GEMINI_API_KEY=tu_gemini_api_key
```

---

## 📁 Estructura del Proyecto

```
kmz-map-viewer/
├── public/
│   ├── kmz-data/          # Datos de ejemplo procesados
│   └── images/           # Archivos de imagen
├── src/
│   ├── components/       # Componentes React
│   │   ├── MapDisplay.tsx    # Visualización de mapas
│   │   ├── Chatbot.tsx       # IA integrada
│   │   ├── HistoryList.tsx   # Lista de historial
│   │   └── ...
│   ├── services/         # Servicios y utilidades
│   │   ├── firebase/        # Configuración Firebase
│   │   ├── geminiService.ts # Servicio de IA
│   │   ├── kmzService.ts    # Procesamiento KMZ
│   │   └── ...
│   ├── types.ts          # Definiciones TypeScript
│   └── ...
├── scripts/              # Scripts de automatización
├── kmz/                  # Archivos KMZ de ejemplo
└── README.md
```

---

## 🎯 Uso de la Aplicación

### **Cargar Datos GPS**
1. **Sube un archivo KMZ** desde tu dispositivo
2. La aplicación **procesa automáticamente** los puntos georreferenciados
3. **Visualiza el recorrido** en el mapa interactivo

### **Consultar con IA**
1. **Haz clic en el botón del chatbot** (🤖)
2. **Pregunta en lenguaje natural**:
   - "¿Dónde estuve ayer?"
   - "¿Cuál es mi ruta más frecuente?"
   - "¿Cuántos puntos visité hoy?"

### **Gestionar Datos**
- **Filtrar por fecha** usando el selector de días
- **Crear backups** antes de modificaciones importantes
- **Restaurar datos** desde backups guardados
- **Eliminar datos** de forma segura (van a papelera)

---

## 🔒 Seguridad

- **Variables de entorno** para credenciales sensibles
- **Reglas de Firebase** configurables por usuario
- **Auditoría completa** de todas las operaciones
- **Backups automáticos** antes de modificaciones

---

## 🤝 Contribuir

1. **Fork** el proyecto
2. **Crea una rama** para tu feature (`git checkout -b feature/nueva-funcionalidad`)
3. **Commit** tus cambios (`git commit -am 'Agrega nueva funcionalidad'`)
4. **Push** a la rama (`git push origin feature/nueva-funcionalidad`)
5. **Crea un Pull Request**

---

## 📄 Licencia

Este proyecto está bajo la Licencia MIT - ver el archivo [LICENSE](LICENSE) para más detalles.

---

## 📞 Soporte

¿Tienes preguntas o problemas?

- **Issues**: [GitHub Issues](https://github.com/[TU-USUARIO]/kmz-map-viewer/issues)
- **Documentación**: Ver archivos `*.md` en el repositorio

---

<div align="center">
  <p><strong>🚗 KMZ Map Viewer - Tu compañero de seguimiento GPS con IA 🤖</strong></p>
  <p>Desarrollado con ❤️ usando React, TypeScript, Firebase y Google Gemini</p>
</div>
