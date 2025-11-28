import type { HistoryEntry } from '../types';
import { UpdateService } from './updateService';

export interface AutoUpdateConfig {
  kmzFolderPath?: string;
  checkInterval?: number; // en minutos
  autoBackup?: boolean;
  maxDailyFiles?: number;
}

export interface UpdateCheckResult {
  hasNewFiles: boolean;
  newFiles: string[];
  lastCheck: Date;
  totalFiles: number;
}

export class AutoUpdateService {
  private static readonly CONFIG_KEY = 'kmz_auto_update_config';
  private static readonly LAST_CHECK_KEY = 'kmz_last_update_check';
  private static readonly PROCESSED_FILES_KEY = 'kmz_processed_files';

  /**
   * Configurar el sistema de actualización automática
   */
  static saveConfig(config: AutoUpdateConfig): void {
    localStorage.setItem(this.CONFIG_KEY, JSON.stringify(config));
  }

  /**
   * Obtener la configuración actual
   */
  static getConfig(): AutoUpdateConfig {
    const stored = localStorage.getItem(this.CONFIG_KEY);
    return stored ? JSON.parse(stored) : {
      checkInterval: 60, // 1 hora por defecto
      autoBackup: true,
      maxDailyFiles: 10
    };
  }

  /**
   * Verificar si hay archivos KMZ nuevos disponibles
   * (Esta función simula la verificación; en producción conectaría con una API o carpeta compartida)
   */
  static async checkForNewKMZFiles(): Promise<UpdateCheckResult> {
    const lastCheck = this.getLastCheckTime();
    const processedFiles = this.getProcessedFiles();

    // En una implementación real, aquí harías:
    // 1. Conectar con una API que liste archivos en la carpeta KMZ
    // 2. Comparar con los archivos ya procesados
    // 3. Retornar la lista de archivos nuevos

    // Por ahora, simulamos la detección
    const mockNewFiles = await this.simulateFileCheck(lastCheck, processedFiles);

    const result: UpdateCheckResult = {
      hasNewFiles: mockNewFiles.length > 0,
      newFiles: mockNewFiles,
      lastCheck: new Date(),
      totalFiles: processedFiles.length + mockNewFiles.length
    };

    // Actualizar timestamp de última verificación
    this.updateLastCheckTime();

    return result;
  }

  /**
   * Procesar automáticamente los nuevos archivos KMZ
   */
  static async processNewKMZFiles(
    newFiles: string[],
    currentHistory: HistoryEntry[]
  ): Promise<{ success: boolean; result?: any; error?: string }> {
    try {
      const config = this.getConfig();

      // Crear backup si está configurado
      if (config.autoBackup) {
        UpdateService.createBackup(currentHistory);
      }

      // Aquí iría la lógica para descargar/cargar los archivos KMZ
      // Por ahora, solo marcamos como procesados

      const processedFiles = this.getProcessedFiles();
      newFiles.forEach(fileName => {
        if (!processedFiles.includes(fileName)) {
          processedFiles.push(fileName);
        }
      });

      this.saveProcessedFiles(processedFiles);

      return {
        success: true,
        result: {
          processedFiles: newFiles.length,
          totalProcessed: processedFiles.length
        }
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error desconocido'
      };
    }
  }

  /**
   * Simular verificación de archivos nuevos (para desarrollo/testing)
   */
  private static async simulateFileCheck(
    lastCheck: Date | null,
    processedFiles: string[]
  ): Promise<string[]> {
    // Simular que hay archivos nuevos basados en fechas recientes
    const today = new Date();
    const newFiles: string[] = [];

    // Simular archivos de los últimos 7 días que no han sido procesados
    for (let i = 0; i < 7; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() - i);

      const fileName = this.formatFileName(date);
      if (!processedFiles.includes(fileName)) {
        newFiles.push(fileName);
      }
    }

    return newFiles.slice(0, 3); // Máximo 3 archivos nuevos simulados
  }

  /**
   * Formatear nombre de archivo basado en fecha (como en los archivos reales)
   */
  private static formatFileName(date: Date): string {
    const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    const months = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
                   'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

    const dayName = days[date.getDay()];
    const day = date.getDate();
    const monthName = months[date.getMonth()];
    const year = date.getFullYear();

    return `${dayName} ${day} de ${monthName}.kmz`;
  }

  /**
   * Obtener timestamp de última verificación
   */
  private static getLastCheckTime(): Date | null {
    const stored = localStorage.getItem(this.LAST_CHECK_KEY);
    return stored ? new Date(stored) : null;
  }

  /**
   * Actualizar timestamp de última verificación
   */
  private static updateLastCheckTime(): void {
    localStorage.setItem(this.LAST_CHECK_KEY, new Date().toISOString());
  }

  /**
   * Obtener lista de archivos ya procesados
   */
  private static getProcessedFiles(): string[] {
    const stored = localStorage.getItem(this.PROCESSED_FILES_KEY);
    return stored ? JSON.parse(stored) : [];
  }

  /**
   * Guardar lista de archivos procesados
   */
  private static saveProcessedFiles(files: string[]): void {
    localStorage.setItem(this.PROCESSED_FILES_KEY, JSON.stringify(files));
  }

  /**
   * Limpiar historial de archivos procesados (para testing)
   */
  static clearProcessedFiles(): void {
    localStorage.removeItem(this.PROCESSED_FILES_KEY);
    localStorage.removeItem(this.LAST_CHECK_KEY);
  }

  /**
   * Obtener estadísticas de actualización automática
   */
  static getAutoUpdateStats(): {
    lastCheck: Date | null;
    processedFiles: number;
    config: AutoUpdateConfig;
  } {
    return {
      lastCheck: this.getLastCheckTime(),
      processedFiles: this.getProcessedFiles().length,
      config: this.getConfig()
    };
  }

  /**
   * Configurar recordatorio para actualización manual
   */
  static shouldRemindManualUpdate(): boolean {
    const lastCheck = this.getLastCheckTime();
    const config = this.getConfig();

    if (!lastCheck || !config.checkInterval) return false;

    const hoursSinceLastCheck = (Date.now() - lastCheck.getTime()) / (1000 * 60 * 60);
    return hoursSinceLastCheck >= (config.checkInterval / 60); // convertir minutos a horas
  }
}
