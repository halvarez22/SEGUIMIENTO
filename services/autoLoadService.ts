import { getStorage, ref, uploadBytes, getDownloadURL, listAll } from 'firebase/storage';
import { collection, addDoc, serverTimestamp, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase/config';
import { parseKMZFile, convertKMZToGeoData } from './kmzService';
import type { GeoData } from '../types';

export interface AutoLoadResult {
  success: boolean;
  loadedFiles: number;
  skippedFiles: number;
  errors: string[];
  processedFiles: string[];
}

export class AutoLoadService {

  /**
   * Carga automáticamente archivos KMZ desde Firebase Storage
   */
  static async loadFromFirebaseStorage(): Promise<AutoLoadResult> {
    const result: AutoLoadResult = {
      success: false,
      loadedFiles: 0,
      skippedFiles: 0,
      errors: [],
      processedFiles: []
    };

    try {
      if (!db) {
        result.errors.push('Firebase no está configurado');
        return result;
      }

      const storage = getStorage();
      const kmzFolderRef = ref(storage, 'kmz-files/');

      // Listar archivos en la carpeta kmz-files
      const fileList = await listAll(kmzFolderRef);

      console.log(`Encontrados ${fileList.items.length} archivos en Firebase Storage`);

      for (const fileRef of fileList.items) {
        try {
          // Verificar si el archivo ya fue procesado
          const fileName = fileRef.name;
          const alreadyProcessed = await this.isFileAlreadyProcessed(fileName);

          if (alreadyProcessed) {
            result.skippedFiles++;
            console.log(`Archivo ${fileName} ya procesado, omitiendo`);
            continue;
          }

          // Descargar y procesar el archivo
          console.log(`Procesando archivo: ${fileName}`);
          const downloadURL = await getDownloadURL(fileRef);

          // Descargar el archivo como ArrayBuffer
          const response = await fetch(downloadURL);
          const arrayBuffer = await response.arrayBuffer();

          const kmzDataSource = {
            fileName: fileName,
            data: arrayBuffer
          };

          // Procesar KMZ
          const kmzData = await parseKMZFile(kmzDataSource);
          const geoDataArray = convertKMZToGeoData(kmzData, fileName);

          // Guardar en Firestore
          for (const geoData of geoDataArray) {
            await this.saveGeoDataToFirestore(geoData, fileName);
          }

          // Marcar como procesado
          await this.markFileAsProcessed(fileName);

          result.loadedFiles++;
          result.processedFiles.push(fileName);

          console.log(`✅ Archivo ${fileName} procesado exitosamente`);

        } catch (error) {
          const errorMsg = `Error procesando ${fileRef.name}: ${error instanceof Error ? error.message : 'Error desconocido'}`;
          result.errors.push(errorMsg);
          console.error(errorMsg);
        }
      }

      result.success = true;
      return result;

    } catch (error) {
      const errorMsg = `Error en carga automática: ${error instanceof Error ? error.message : 'Error desconocido'}`;
      result.errors.push(errorMsg);
      console.error(errorMsg);
      return result;
    }
  }

  /**
   * Carga archivos KMZ desde una carpeta local
   */
  static async loadFromLocalFolder(folderPath: string): Promise<AutoLoadResult> {
    const result: AutoLoadResult = {
      success: false,
      loadedFiles: 0,
      skippedFiles: 0,
      errors: [],
      processedFiles: []
    };

    try {
      // Usar Node.js fs para leer archivos locales (esto requiere backend)
      // Por ahora, simulamos la funcionalidad
      console.warn('Carga desde carpeta local requiere implementación del backend');
      result.errors.push('Funcionalidad de carga local no implementada aún');
      return result;

    } catch (error) {
      result.errors.push(`Error cargando desde carpeta local: ${error instanceof Error ? error.message : 'Error desconocido'}`);
      return result;
    }
  }

  /**
   * Verifica si un archivo ya fue procesado
   */
  private static async isFileAlreadyProcessed(fileName: string): Promise<boolean> {
    try {
      if (!db) return false;

      const q = query(
        collection(db, 'processed_files'),
        where('fileName', '==', fileName)
      );

      const querySnapshot = await getDocs(q);
      return !querySnapshot.empty;

    } catch (error) {
      console.error('Error verificando archivo procesado:', error);
      return false;
    }
  }

  /**
   * Marca un archivo como procesado
   */
  private static async markFileAsProcessed(fileName: string): Promise<void> {
    try {
      if (!db) return;

      await addDoc(collection(db, 'processed_files'), {
        fileName,
        processedAt: serverTimestamp(),
        status: 'completed'
      });

    } catch (error) {
      console.error('Error marcando archivo como procesado:', error);
    }
  }

  /**
   * Guarda datos geoespaciales en Firestore
   */
  private static async saveGeoDataToFirestore(geoData: GeoData, sourceFile: string): Promise<void> {
    try {
      if (!db) {
        throw new Error('Firestore no disponible');
      }

      await addDoc(collection(db, 'locations'), {
        ...geoData,
        sourceFile,
        createdAt: serverTimestamp(),
        // Agregar campos para análisis
        visitCount: 1,
        lastVisit: serverTimestamp()
      });

    } catch (error) {
      console.error('Error guardando en Firestore:', error);
      throw error;
    }
  }

  /**
   * Actualiza conteo de visitas para una ubicación
   */
  static async updateVisitCount(latitude: number, longitude: number): Promise<void> {
    try {
      if (!db) return;

      // Buscar ubicación existente (con tolerancia de coordenadas)
      const latMin = latitude - 0.001;
      const latMax = latitude + 0.001;
      const lngMin = longitude - 0.001;
      const lngMax = longitude + 0.001;

      // Nota: Firestore no soporta consultas de rango en múltiples campos fácilmente
      // Esta es una simplificación - en producción necesitarías índices compuestos
      const q = query(
        collection(db, 'locations'),
        where('latitude', '>=', latMin),
        where('latitude', '<=', latMax)
      );

      const querySnapshot = await getDocs(q);

      // Buscar coincidencia exacta en longitud
      let existingDoc = null;
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        if (data.longitude >= lngMin && data.longitude <= lngMax) {
          existingDoc = doc;
        }
      });

      if (existingDoc) {
        // Actualizar conteo de visitas
        const currentCount = existingDoc.data().visitCount || 0;
        await addDoc(collection(db, 'location_updates'), {
          locationId: existingDoc.id,
          newVisitCount: currentCount + 1,
          timestamp: serverTimestamp()
        });
      }

    } catch (error) {
      console.error('Error actualizando conteo de visitas:', error);
    }
  }

  /**
   * Configura carga automática diaria (programada)
   */
  static scheduleDailyLoad(intervalHours: number = 24): void {
    console.log(`Configurando carga automática cada ${intervalHours} horas`);

    setInterval(async () => {
      console.log('Ejecutando carga automática programada...');
      const result = await this.loadFromFirebaseStorage();

      if (result.success) {
        console.log(`✅ Carga automática completada: ${result.loadedFiles} archivos nuevos`);
      } else {
        console.error('❌ Error en carga automática:', result.errors);
      }
    }, intervalHours * 60 * 60 * 1000); // Convertir horas a milisegundos
  }

  /**
   * Lista archivos disponibles en Firebase Storage
   */
  static async listAvailableFiles(): Promise<string[]> {
    try {
      if (!db) return [];

      const storage = getStorage();
      const kmzFolderRef = ref(storage, 'kmz-files/');
      const fileList = await listAll(kmzFolderRef);

      return fileList.items.map(item => item.name);
    } catch (error) {
      console.error('Error listando archivos:', error);
      return [];
    }
  }
}
