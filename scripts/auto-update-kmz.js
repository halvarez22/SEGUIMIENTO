#!/usr/bin/env node

/**
 * Script de actualización automática de archivos KMZ
 *
 * Uso:
 *   node scripts/auto-update-kmz.js [ruta-carpeta-kmz]
 *
 * Ejemplos:
 *   node scripts/auto-update-kmz.js /ruta/a/carpeta/kmz
 *   node scripts/auto-update-kmz.js ./kmz
 *   node scripts/auto-update-kmz.js  # usa carpeta por defecto
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { UpdateService } from '../services/updateService.js';
import { AutoUpdateService } from '../services/autoUpdateService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuración
const DEFAULT_KMZ_FOLDER = path.join(__dirname, '..', 'kmz');
const LOG_FILE = path.join(__dirname, '..', 'logs', 'auto-update.log');

/**
 * Logger para el script
 */
class Logger {
  static log(message, level = 'INFO') {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] [${level}] ${message}`;

    console.log(logMessage);

    // Asegurar que existe el directorio de logs
    const logDir = path.dirname(LOG_FILE);
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }

    // Escribir en archivo de log
    fs.appendFileSync(LOG_FILE, logMessage + '\n');
  }

  static error(message) {
    this.log(message, 'ERROR');
  }

  static success(message) {
    this.log(message, 'SUCCESS');
  }
}

/**
 * Obtener archivos KMZ de una carpeta
 */
function getKMZFilesFromFolder(folderPath) {
  try {
    if (!fs.existsSync(folderPath)) {
      throw new Error(`La carpeta no existe: ${folderPath}`);
    }

    const files = fs.readdirSync(folderPath)
      .filter(file => file.toLowerCase().endsWith('.kmz'))
      .map(file => path.join(folderPath, file));

    Logger.log(`Encontrados ${files.length} archivos KMZ en ${folderPath}`);
    return files;
  } catch (error) {
    Logger.error(`Error leyendo carpeta KMZ: ${error.message}`);
    return [];
  }
}

/**
 * Leer archivo KMZ como ArrayBuffer
 */
function readKMZFile(filePath) {
  try {
    const buffer = fs.readFileSync(filePath);
    return {
      fileName: path.basename(filePath),
      data: buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength)
    };
  } catch (error) {
    Logger.error(`Error leyendo archivo ${filePath}: ${error.message}`);
    return null;
  }
}

/**
 * Función principal
 */
async function main() {
  const args = process.argv.slice(2);
  const kmzFolder = args[0] || DEFAULT_KMZ_FOLDER;

  Logger.log(`🚀 Iniciando actualización automática de KMZ`);
  Logger.log(`📁 Carpeta KMZ: ${kmzFolder}`);

  try {
    // Verificar si hay actualizaciones disponibles
    Logger.log(`🔍 Verificando archivos nuevos...`);
    const updateCheck = await AutoUpdateService.checkForNewKMZFiles();

    if (!updateCheck.hasNewFiles) {
      Logger.success(`✅ No hay archivos KMZ nuevos para procesar`);
      return;
    }

    Logger.success(`🎯 Encontrados ${updateCheck.newFiles.length} archivos potencialmente nuevos`);

    // Simular carga del historial actual (en producción esto vendría de la app)
    // Por ahora, asumimos que no hay historial para evitar conflictos
    const currentHistory = [];

    // Obtener archivos KMZ de la carpeta
    const kmzFiles = getKMZFilesFromFolder(kmzFolder);

    if (kmzFiles.length === 0) {
      Logger.error(`❌ No se encontraron archivos KMZ en la carpeta especificada`);
      return;
    }

    // Filtrar solo archivos que no han sido procesados
    const processedFiles = AutoUpdateService.getAutoUpdateStats().processedFiles || [];
    const newFiles = kmzFiles.filter(filePath => {
      const fileName = path.basename(filePath);
      return !processedFiles.includes(fileName);
    });

    if (newFiles.length === 0) {
      Logger.success(`✅ Todos los archivos KMZ ya han sido procesados`);
      return;
    }

    Logger.log(`📤 Procesando ${newFiles.length} archivos KMZ nuevos...`);

    // Leer archivos KMZ
    const kmzDataSources = newFiles
      .map(readKMZFile)
      .filter(Boolean);

    if (kmzDataSources.length === 0) {
      Logger.error(`❌ No se pudieron leer los archivos KMZ`);
      return;
    }

    // Crear backup si hay datos existentes
    if (currentHistory.length > 0) {
      const backupId = UpdateService.createBackup(currentHistory);
      Logger.success(`💾 Backup creado: ${backupId}`);
    }

    // Procesar actualización
    const { updatedHistory, result } = await UpdateService.updateWithNewKMZFiles(
      kmzDataSources.map(ds => new File([ds.data], ds.fileName)),
      currentHistory
    );

    // Log resultados
    Logger.success(`✅ Actualización completada:`);
    Logger.success(`   📊 Agregados: ${result.added}`);
    Logger.success(`   ⏭️ Omitidos: ${result.skipped}`);
    Logger.success(`   📈 Total: ${result.totalAfter}`);

    if (result.errors.length > 0) {
      Logger.error(`   ❌ Errores: ${result.errors.length}`);
      result.errors.forEach(error => Logger.error(`      ${error}`));
    }

    // Actualizar lista de archivos procesados
    const allProcessedFiles = [...processedFiles, ...kmzDataSources.map(ds => ds.fileName)];
    // Nota: En una implementación real, guardaríamos esto en el AutoUpdateService

    Logger.success(`🎉 Actualización automática completada exitosamente`);

  } catch (error) {
    Logger.error(`❌ Error en actualización automática: ${error.message}`);
    process.exit(1);
  }
}

// Ejecutar si se llama directamente
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    Logger.error(`Error fatal: ${error.message}`);
    process.exit(1);
  });
}

export { main as runAutoUpdate };
