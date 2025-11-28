import type { HistoryEntry, GeoData, KMZData } from '../types';
import { parseKMZFile, convertKMZToGeoData } from './kmzService';
import { SampleDataService } from './sampleDataService';

export interface UpdateResult {
  added: number;
  skipped: number;
  errors: string[];
  totalBefore: number;
  totalAfter: number;
}

export class UpdateService {
  /**
   * Actualiza el historial con nuevos datos KMZ sin perder el historial existente
   */
  static async updateWithNewKMZFiles(
    newKMZFiles: File[],
    existingHistory: HistoryEntry[]
  ): Promise<{ updatedHistory: HistoryEntry[]; result: UpdateResult }> {
    const result: UpdateResult = {
      added: 0,
      skipped: 0,
      errors: [],
      totalBefore: existingHistory.length,
      totalAfter: existingHistory.length
    };

    const updatedHistory = [...existingHistory];
    const processedEntries: HistoryEntry[] = [];

    for (const file of newKMZFiles) {
      try {
        console.log(`Procesando archivo KMZ: ${file.name}`);

        // Leer archivo como ArrayBuffer
        const arrayBuffer = await file.arrayBuffer();
        const kmzDataSource = {
          fileName: file.name,
          data: arrayBuffer
        };

        // Parsear KMZ
        const kmzData = await parseKMZFile(kmzDataSource);

        // Convertir a GeoData
        const geoDataArray = convertKMZToGeoData(kmzData, file.name);

        // Crear entradas de historial
        const fileEntries = geoDataArray.map(geoData => ({
          id: this.generateUniqueId(file.name, geoData),
          data: geoData,
          timestamp: new Date().toISOString(),
          source: 'kmz' as const
        }));

        // Filtrar duplicados y agregar nuevos
        const { newEntries, skippedCount } = this.mergeEntries(updatedHistory, fileEntries);

        processedEntries.push(...newEntries);
        result.added += newEntries.length;
        result.skipped += skippedCount;

        console.log(`✅ ${file.name}: ${newEntries.length} nuevos, ${skippedCount} omitidos`);

      } catch (error) {
        const errorMsg = `Error procesando ${file.name}: ${error instanceof Error ? error.message : 'Error desconocido'}`;
        result.errors.push(errorMsg);
        console.error(errorMsg);
      }
    }

    // Agregar todas las entradas nuevas
    updatedHistory.push(...processedEntries);
    result.totalAfter = updatedHistory.length;

    return { updatedHistory, result };
  }

  /**
   * Genera un ID único basado en el archivo y datos para evitar duplicados
   */
  private static generateUniqueId(fileName: string, geoData: GeoData): string {
    // Crear hash basado en fecha, hora, coordenadas y archivo
    const key = `${fileName}_${geoData.date}_${geoData.time}_${geoData.latitude}_${geoData.longitude}`;
    return btoa(key).replace(/[^a-zA-Z0-9]/g, '').substring(0, 32);
  }

  /**
   * Fusiona nuevas entradas evitando duplicados
   */
  private static mergeEntries(
    existingHistory: HistoryEntry[],
    newEntries: HistoryEntry[]
  ): { newEntries: HistoryEntry[]; skippedCount: number } {
    const existingIds = new Set(existingHistory.map(entry => entry.id));
    const existingKeys = new Set(
      existingHistory.map(entry =>
        `${entry.data.date}_${entry.data.time}_${entry.data.latitude}_${entry.data.longitude}`
      )
    );

    const uniqueNewEntries: HistoryEntry[] = [];
    let skippedCount = 0;

    for (const newEntry of newEntries) {
      const entryKey = `${newEntry.data.date}_${newEntry.data.time}_${newEntry.data.latitude}_${newEntry.data.longitude}`;

      // Verificar si ya existe por ID o por contenido similar
      if (!existingIds.has(newEntry.id) && !existingKeys.has(entryKey)) {
        uniqueNewEntries.push(newEntry);
      } else {
        skippedCount++;
      }
    }

    return { newEntries: uniqueNewEntries, skippedCount };
  }

  /**
   * Crea un backup del historial actual
   */
  static createBackup(history: HistoryEntry[]): string {
    const backupData = {
      timestamp: new Date().toISOString(),
      totalEntries: history.length,
      data: history,
      version: '1.0'
    };

    const backupJson = JSON.stringify(backupData, null, 2);
    const backupId = `backup_${Date.now()}`;

    // Guardar en localStorage con prefijo
    localStorage.setItem(`kmz_backup_${backupId}`, backupJson);

    // Mantener solo los últimos 5 backups
    this.cleanupOldBackups();

    return backupId;
  }

  /**
   * Restaura desde un backup
   */
  static restoreFromBackup(backupId: string): HistoryEntry[] | null {
    const backupJson = localStorage.getItem(`kmz_backup_${backupId}`);
    if (!backupJson) return null;

    try {
      const backupData = JSON.parse(backupJson);
      return backupData.data || [];
    } catch (error) {
      console.error('Error restaurando backup:', error);
      return null;
    }
  }

  /**
   * Lista todos los backups disponibles
   */
  static listBackups(): { id: string; timestamp: string; totalEntries: number }[] {
    const backups: { id: string; timestamp: string; totalEntries: number }[] = [];

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('kmz_backup_')) {
        try {
          const backupJson = localStorage.getItem(key);
          if (backupJson) {
            const backupData = JSON.parse(backupJson);
            backups.push({
              id: key.replace('kmz_backup_', ''),
              timestamp: backupData.timestamp,
              totalEntries: backupData.totalEntries
            });
          }
        } catch (error) {
          // Ignorar backups corruptos
        }
      }
    }

    return backups.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }

  /**
   * Limpia backups antiguos (mantener solo los más recientes)
   */
  private static cleanupOldBackups(maxBackups: number = 5): void {
    const backups = this.listBackups();

    if (backups.length > maxBackups) {
      const backupsToDelete = backups.slice(maxBackups);
      backupsToDelete.forEach(backup => {
        localStorage.removeItem(`kmz_backup_${backup.id}`);
      });
    }
  }

  /**
   * Verifica si hay archivos KMZ nuevos disponibles en una carpeta específica
   * (Esto sería útil si tuvieras una carpeta compartida o API)
   */
  static async checkForNewKMZFiles(): Promise<{ available: boolean; count?: number; lastModified?: Date }> {
    // Esta función podría conectarse a una API o carpeta compartida
    // Por ahora, retorna que no hay sistema automático configurado
    return { available: false };
  }

  /**
   * Obtiene estadísticas del historial
   */
  static getHistoryStats(history: HistoryEntry[]): {
    totalPoints: number;
    dateRange: { start: string; end: string } | null;
    kmzFiles: number;
    imageFiles: number;
    lastUpdate: string;
  } {
    if (history.length === 0) {
      return {
        totalPoints: 0,
        dateRange: null,
        kmzFiles: 0,
        imageFiles: 0,
        lastUpdate: new Date().toISOString()
      };
    }

    const dates = history
      .map(entry => entry.data.date)
      .filter(date => date)
      .sort();

    const kmzCount = history.filter(entry => entry.source === 'kmz').length;
    const imageCount = history.filter(entry => entry.source === 'image').length;

    const lastUpdate = history
      .map(entry => entry.timestamp)
      .sort()
      .reverse()[0] || new Date().toISOString();

    return {
      totalPoints: history.length,
      dateRange: dates.length > 0 ? {
        start: dates[0],
        end: dates[dates.length - 1]
      } : null,
      kmzFiles: kmzCount,
      imageFiles: imageCount,
      lastUpdate
    };
  }
}
