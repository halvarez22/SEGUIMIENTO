# 🗺️ Guía de Actualización - KMZ Map Viewer

## 📋 Sistema de Actualización Diaria

Tu aplicación **KMZ Map Viewer** ahora incluye un sistema completo para actualizar diariamente con nuevos archivos KMZ sin perder el historial existente.

## 🔄 Tipos de Actualización

### 1. **Actualización Manual (Recomendado)**
Sube nuevos archivos KMZ directamente desde la interfaz web.

### 2. **Actualización Automática**
Usa scripts programados para procesar carpetas automáticamente.

## 🚀 Cómo Usar la Actualización Manual

### Paso 1: Verificar Archivos Nuevos
1. En la aplicación web, haz clic en **"🔄 Verificar Novedades"**
2. El sistema buscará archivos KMZ que no hayan sido procesados aún
3. Si encuentra nuevos archivos, mostrará una notificación

### Paso 2: Actualizar con Archivos Nuevos
1. Una vez detectados los archivos nuevos, aparecerá el botón **"🔄 Actualizar con Nuevos KMZ"**
2. Haz clic y selecciona los archivos KMZ nuevos desde tu dispositivo
3. El sistema automáticamente:
   - ✅ Crea un backup del historial actual
   - 🔄 Fusiona los nuevos datos sin duplicados
   - 💾 Guarda en Firebase y localStorage
   - 📊 Muestra estadísticas de la actualización

### Paso 3: Verificar Resultados
- Revisa las estadísticas actualizadas
- Confirma que los nuevos puntos aparecen en el mapa
- Consulta el chatbot sobre los nuevos datos

## ⚙️ Actualización Automática con Scripts

### Configuración Inicial

```bash
# Instalar dependencias
npm install

# Crear directorio de logs
mkdir logs
```

### Ejecutar Actualización Automática

```bash
# Usar carpeta KMZ por defecto (./kmz)
npm run update-kmz

# Especificar carpeta personalizada
npm run update-kmz:folder /ruta/a/tu/carpeta/kmz

# O directamente con node
node scripts/auto-update-kmz.js /ruta/a/carpeta/kmz
```

### Programar Actualizaciones Diarias

#### En Windows (Programador de Tareas)
1. Abre **Programador de Tareas**
2. Crea nueva tarea básica
3. Configura:
   - **Programa**: `cmd.exe`
   - **Argumentos**: `/c cd /d "C:\IA_nubes\Seguimiento" && npm run update-kmz`
   - **Programar**: Diario a las 6:00 AM

#### En Linux/Mac (Cron)
```bash
# Editar crontab
crontab -e

# Agregar línea para ejecutar diariamente a las 6:00
0 6 * * * cd /ruta/a/Seguimiento && npm run update-kmz
```

## 📊 Características del Sistema de Actualización

### 🔒 **Seguridad de Datos**
- **Backup automático** antes de cada actualización
- **Detección de duplicados** inteligente
- **Recuperación fácil** desde backups
- **Historial completo** preservado

### 🎯 **Detección Inteligente**
- Basada en **fecha + coordenadas + hora**
- Evita duplicados por contenido similar
- Maneja archivos con nombres diferentes pero mismos datos

### 📈 **Estadísticas Detalladas**
- **Puntos agregados**: Nuevos datos incorporados
- **Puntos omitidos**: Duplicados detectados
- **Errores**: Problemas durante el procesamiento
- **Total final**: Conteo actualizado

### 💾 **Sistema de Backups**
- **Máximo 5 backups** automáticos
- **Identificación única** por timestamp
- **Restauración manual** desde la interfaz
- **Limpieza automática** de backups antiguos

## 🔧 Configuración Avanzada

### Archivo de Configuración
El sistema guarda configuración en `localStorage`:
- `kmz_auto_update_config`: Configuración general
- `kmz_last_update_check`: Última verificación
- `kmz_processed_files`: Archivos ya procesados

### Personalización
```javascript
// Configurar intervalo de verificación (minutos)
AutoUpdateService.saveConfig({
  checkInterval: 120, // 2 horas
  autoBackup: true,
  maxDailyFiles: 5
});
```

## 🚨 Solución de Problemas

### Problema: Archivos no se detectan como nuevos
**Solución**: El sistema usa nombres de archivos para identificar archivos procesados. Si cambiaste nombres, limpia el historial:
```javascript
AutoUpdateService.clearProcessedFiles();
```

### Problema: Duplicados aparecen
**Solución**: El sistema detecta duplicados por fecha+hora+coordenadas. Si hay variaciones mínimas, ajusta manualmente.

### Problema: Error de memoria con archivos grandes
**Solución**: Procesa archivos en lotes más pequeños o aumenta límite de memoria de Node.js:
```bash
node --max-old-space-size=4096 scripts/auto-update-kmz.js
```

## 📋 Checklist de Actualización Diaria

- [ ] Verificar que hay archivos KMZ nuevos en la carpeta
- [ ] Ejecutar script de actualización automática
- [ ] Revisar logs en `logs/auto-update.log`
- [ ] Verificar estadísticas en la aplicación web
- [ ] Confirmar que nuevos puntos aparecen en el mapa
- [ ] Hacer backup manual si es día importante

## 🎯 Beneficios del Sistema

✅ **Actualización diaria** sin intervención manual
✅ **Historial completo** siempre preservado
✅ **Detección automática** de archivos nuevos
✅ **Backups automáticos** para seguridad
✅ **Procesamiento inteligente** sin duplicados
✅ **Monitoreo completo** con logs detallados
✅ **Recuperación fácil** en caso de problemas

¡Tu **KMZ Map Viewer** ahora está completamente automatizado para actualizaciones diarias! 🎉
