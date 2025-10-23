import type { HistoryEntry } from '../types';

/**
 * Servicio para cargar datos de ejemplo KMZ
 */
export class SampleDataService {
  private static readonly SAMPLE_DATA_PATH = '/kmz-data/';

  /**
   * Carga todos los archivos de datos de ejemplo disponibles
   */
  static async loadAllSampleData(): Promise<HistoryEntry[]> {
    try {
      // Lista de archivos de ejemplo (basados en los archivos KMZ convertidos)
      // Excluimos archivos con 0 puntos según el análisis previo
      const sampleFiles = [
        'Martes 23 de Septiembre.json',        // 25 puntos
        'Miércoles 24 de Septiembre.json',     // 8 puntos
        'Jueves 25 de Septiembre.json',        // 14 puntos
        'Viernes 26 de Septiembre.json',       // 3 puntos
        'Lunes 29 de Septiembre.json',         // 17 puntos
        'Martes 30 de Septiembre.json',        // 5 puntos
        'Miércoles 1 de Octubre.json',         // 19 puntos
        'Jueves 2 de Octubre.json',            // 16 puntos
        'Jueves 9 de Octubre.json',            // 12 puntos
        'Viernes 10 de Octubre.json',          // 2 puntos
        'Viernes 17 de Octubre.json',          // 7 puntos
        'Lunes 20 de Octubre.json',            // 4 puntos
        'Sábado 18 de Octubre.json',           // 4 puntos
        'Domingo 19 de Octubre.json',          // 2 puntos
        'Lunes 22 de Septiembre.json'          // 1 punto
      ];

      const allEntries: HistoryEntry[] = [];

      for (const fileName of sampleFiles) {
        try {
          const entries = await this.loadSampleDataFile(fileName);
          allEntries.push(...entries);
        } catch (error) {
          console.warn(`No se pudo cargar ${fileName}:`, error);
          // Continuar con el siguiente archivo
        }
      }

      console.log(`✅ Cargados ${allEntries.length} puntos de datos de ejemplo`);
      return allEntries;

    } catch (error) {
      console.error('Error cargando datos de ejemplo:', error);
      throw new Error('No se pudieron cargar los datos de ejemplo');
    }
  }

  /**
   * Carga un archivo específico de datos de ejemplo
   */
  static async loadSampleDataFile(fileName: string): Promise<HistoryEntry[]> {
    const response = await fetch(`${this.SAMPLE_DATA_PATH}${fileName}`);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();

    if (!data.features || !Array.isArray(data.features)) {
      throw new Error('Formato de datos inválido');
    }

    // Convertir features a HistoryEntry
    return data.features.map((feature: any, index: number) => {
      let geometry = feature.geometry || null;

      // Convertir coordenadas GeoJSON estándar [lng, lat] a formato interno {latitude, longitude}
      if (geometry && geometry.type === 'Point' && Array.isArray(geometry.coordinates)) {
        const [longitude, latitude] = geometry.coordinates;
        geometry = {
          ...geometry,
          coordinates: [{ latitude, longitude }]
        };
      }

      return {
        id: `${data.fileName}_${index}_${Date.now()}_${Math.random()}`,
        data: {
          date: feature.date || '',
          time: feature.time || '',
          location: feature.location || feature.name || 'Ubicación sin nombre',
          latitude: feature.latitude || null,
          longitude: feature.longitude || null,
          geometry: geometry,
          name: feature.name || '',
          description: feature.description || '',
          properties: feature.properties || {}
        },
        timestamp: new Date().toISOString(),
        source: 'kmz' as const
      };
    });
  }

  /**
   * Obtiene la lista de archivos de ejemplo disponibles
   */
  static async getAvailableSampleFiles(): Promise<string[]> {
    try {
      // Lista basada en los archivos KMZ convertidos exitosamente
      return [
        'Martes 23 de Septiembre',        // 25 puntos - ruta completa
        'Miércoles 24 de Septiembre',     // 8 puntos
        'Jueves 25 de Septiembre',        // 14 puntos
        'Viernes 26 de Septiembre',       // 3 puntos
        'Lunes 29 de Septiembre',         // 17 puntos
        'Martes 30 de Septiembre',        // 5 puntos
        'Miércoles 1 de Octubre',         // 19 puntos
        'Jueves 2 de Octubre',            // 16 puntos
        'Jueves 9 de Octubre',            // 12 puntos
        'Viernes 10 de Octubre',          // 2 puntos
        'Viernes 17 de Octubre',          // 7 puntos
        'Lunes 20 de Octubre',            // 4 puntos
        'Sábado 18 de Octubre',           // 4 puntos
        'Domingo 19 de Octubre',          // 2 puntos
        'Lunes 22 de Septiembre'          // 1 punto
      ];
    } catch (error) {
      console.error('Error obteniendo archivos de ejemplo:', error);
      return [];
    }
  }

  /**
   * Verifica si hay archivos de ejemplo disponibles
   */
  static async hasSampleData(): Promise<boolean> {
    const files = await this.getAvailableSampleFiles();
    return files.length > 0;
  }
}
