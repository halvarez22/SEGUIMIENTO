import { 
  collection, 
  addDoc, 
  getDocs, 
  deleteDoc, 
  doc, 
  query, 
  orderBy, 
  limit,
  where,
  Timestamp
} from 'firebase/firestore';
import { db } from './config';
import type { HistoryEntry, ExtractedData } from '../types';

const COLLECTION_NAME = 'analysisHistory';

export const firestoreService = {
  // Guardar entrada en Firestore
  async saveEntry(data: ExtractedData, imagePreview: string): Promise<string> {
    try {
      const docRef = await addDoc(collection(db, COLLECTION_NAME), {
        data,
        imagePreview,
        timestamp: Timestamp.now(),
        createdAt: Timestamp.now()
      });
      return docRef.id;
    } catch (error) {
      console.error('Error saving to Firestore:', error);
      throw error;
    }
  },

  // Obtener historial completo (sin límite para ver todas las fechas)
  async getHistory(): Promise<HistoryEntry[]> {
    try {
      const q = query(
        collection(db, COLLECTION_NAME),
        orderBy('timestamp', 'desc')
        // Removido limit(50) para obtener todas las entradas y ver el rango completo de fechas
      );
      
      const querySnapshot = await getDocs(q);
      const history: HistoryEntry[] = [];
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        history.push({
          id: doc.id,
          data: data.data,
          imagePreview: data.imagePreview,
          timestamp: data.timestamp.toDate().toISOString()
        });
      });
      
      return history;
    } catch (error) {
      console.error('Error getting history from Firestore:', error);
      throw error;
    }
  },

  // Eliminar entrada específica
  async deleteEntry(id: string): Promise<void> {
    try {
      await deleteDoc(doc(db, COLLECTION_NAME, id));
    } catch (error) {
      console.error('Error deleting from Firestore:', error);
      throw error;
    }
  },

  // Limpiar todo el historial
  async clearHistory(): Promise<void> {
    try {
      const querySnapshot = await getDocs(collection(db, COLLECTION_NAME));
      const deletePromises = querySnapshot.docs.map(docSnapshot => 
        deleteDoc(doc(db, COLLECTION_NAME, docSnapshot.id))
      );
      await Promise.all(deletePromises);
    } catch (error) {
      console.error('Error clearing Firestore:', error);
      throw error;
    }
  },

  // Obtener TODOS los documentos sin límite (para análisis)
  async getAllEntries(): Promise<HistoryEntry[]> {
    try {
      const querySnapshot = await getDocs(collection(db, COLLECTION_NAME));
      const history: HistoryEntry[] = [];
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        history.push({
          id: doc.id,
          data: data.data,
          imagePreview: data.imagePreview,
          timestamp: data.timestamp?.toDate?.()?.toISOString() || data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString()
        });
      });
      
      return history;
    } catch (error) {
      console.error('Error getting all entries from Firestore:', error);
      throw error;
    }
  },

  // Analizar los datos guardados para ver qué información tenemos
  async analyzeStoredData(): Promise<void> {
    try {
      const allEntries = await this.getAllEntries();
      
      console.log('=== ANÁLISIS DE DATOS EN FIRESTORE ===');
      console.log(`Total de entradas: ${allEntries.length}`);
      
      // Analizar fechas
      const entriesWithDate = allEntries.filter(e => e.data.date && e.data.date.trim() !== '');
      const entriesWithoutDate = allEntries.filter(e => !e.data.date || e.data.date.trim() === '');
      
      console.log(`\n📅 Fechas:`);
      console.log(`   - Con fecha de captura: ${entriesWithDate.length} (${((entriesWithDate.length / allEntries.length) * 100).toFixed(1)}%)`);
      console.log(`   - Sin fecha de captura: ${entriesWithoutDate.length} (${((entriesWithoutDate.length / allEntries.length) * 100).toFixed(1)}%)`);
      
      // Fechas únicas encontradas
      const uniqueDates = new Set(entriesWithDate.map(e => e.data.date).filter(d => d));
      console.log(`   - Fechas únicas encontradas: ${uniqueDates.size}`);
      if (uniqueDates.size > 0 && uniqueDates.size <= 20) {
        console.log(`   - Fechas:`, Array.from(uniqueDates).sort());
      }
      
      // Analizar coordenadas
      const entriesWithCoords = allEntries.filter(e => e.data.latitude !== null && e.data.longitude !== null);
      const entriesWithoutCoords = allEntries.filter(e => e.data.latitude === null || e.data.longitude === null);
      
      console.log(`\n📍 Coordenadas:`);
      console.log(`   - Con coordenadas: ${entriesWithCoords.length} (${((entriesWithCoords.length / allEntries.length) * 100).toFixed(1)}%)`);
      console.log(`   - Sin coordenadas: ${entriesWithoutCoords.length} (${((entriesWithoutCoords.length / allEntries.length) * 100).toFixed(1)}%)`);
      
      // Analizar fechas de subida vs fechas de captura
      const entriesWithBothDates = entriesWithDate.filter(e => {
        const captureDate = e.data.date;
        const uploadDate = new Date(e.timestamp).toISOString().split('T')[0];
        return captureDate !== uploadDate;
      });
      
      console.log(`\n🔄 Comparación fechas:`);
      console.log(`   - Entradas donde fecha captura ≠ fecha subida: ${entriesWithBothDates.length}`);
      
      // Mostrar ejemplos de entradas sin fecha
      if (entriesWithoutDate.length > 0) {
        console.log(`\n⚠️  Ejemplos de entradas SIN fecha de captura (primeras 5):`);
        entriesWithoutDate.slice(0, 5).forEach((entry, index) => {
          console.log(`   ${index + 1}. ID: ${entry.id.substring(0, 20)}...`);
          console.log(`      - Ubicación: ${entry.data.location || 'N/A'}`);
          console.log(`      - Coordenadas: ${entry.data.latitude !== null ? `${entry.data.latitude}, ${entry.data.longitude}` : 'N/A'}`);
          console.log(`      - Fecha subida: ${new Date(entry.timestamp).toISOString().split('T')[0]}`);
        });
      }
      
      // Mostrar ejemplos de entradas con fecha
      if (entriesWithDate.length > 0) {
        console.log(`\n✅ Ejemplos de entradas CON fecha de captura (primeras 5):`);
        entriesWithDate.slice(0, 5).forEach((entry, index) => {
          console.log(`   ${index + 1}. ID: ${entry.id.substring(0, 20)}...`);
          console.log(`      - Ubicación: ${entry.data.location || 'N/A'}`);
          console.log(`      - Fecha captura: ${entry.data.date} ${entry.data.time || ''}`);
          console.log(`      - Fecha subida: ${new Date(entry.timestamp).toISOString().split('T')[0]}`);
          console.log(`      - Coordenadas: ${entry.data.latitude !== null ? `${entry.data.latitude}, ${entry.data.longitude}` : 'N/A'}`);
        });
      }
      
      console.log('\n=== FIN DE ANÁLISIS ===');
      
      return;
    } catch (error) {
      console.error('Error analizando datos de Firestore:', error);
      throw error;
    }
  },

  // Comparar datos de Firebase con el archivo GPS.kmz esperado
  async compareWithKMZ(): Promise<void> {
    try {
      const allEntries = await this.getAllEntries();
      
      // Datos esperados del GPS.kmz (basado en el análisis del archivo)
      const expectedKMZData = {
        totalPlacemarks: 233,
        uniqueDates: 22,
        dateRange: {
          start: '2024-09-23',
          end: '2024-10-26'
        },
        expectedDates: [
          '2024-09-23', '2024-09-24', '2024-09-25', '2024-09-26', '2024-09-29',
          '2024-09-30', '2024-10-01', '2024-10-02', '2024-10-04', '2024-10-05',
          '2024-10-09', '2024-10-10', '2024-10-17', '2024-10-18', '2024-10-19',
          '2024-10-20', '2024-10-21', '2024-10-22', '2024-10-23', '2024-10-24',
          '2024-10-25', '2024-10-26'
        ]
      };
      
      console.log('\n═══════════════════════════════════════════════════════');
      console.log('  COMPARACIÓN: Firebase vs GPS.kmz');
      console.log('═══════════════════════════════════════════════════════\n');
      
      console.log('📊 DATOS EN FIREBASE:');
      console.log(`   - Total de entradas: ${allEntries.length}`);
      
      const entriesWithDate = allEntries.filter(e => e.data.date && e.data.date.trim() !== '');
      const entriesWithoutDate = allEntries.filter(e => !e.data.date || e.data.date.trim() === '');
      const entriesWithCoords = allEntries.filter(e => e.data.latitude !== null && e.data.longitude !== null);
      
      console.log(`   - Con fecha de captura: ${entriesWithDate.length}`);
      console.log(`   - Sin fecha de captura: ${entriesWithoutDate.length}`);
      console.log(`   - Con coordenadas: ${entriesWithCoords.length}`);
      
      const uniqueDates = new Set(entriesWithDate.map(e => e.data.date).filter(d => d));
      console.log(`   - Fechas únicas: ${uniqueDates.size}`);
      
      if (uniqueDates.size > 0 && uniqueDates.size <= 30) {
        const sortedDates = Array.from(uniqueDates).sort();
        console.log(`   - Fechas encontradas: ${sortedDates.join(', ')}`);
      }
      
      console.log('\n📊 DATOS ESPERADOS DEL GPS.kmz:');
      console.log(`   - Total de Placemarks: ${expectedKMZData.totalPlacemarks}`);
      console.log(`   - Fechas únicas: ${expectedKMZData.uniqueDates}`);
      console.log(`   - Rango de fechas: ${expectedKMZData.dateRange.start} a ${expectedKMZData.dateRange.end}`);
      
      console.log('\n🔍 COMPARACIÓN:');
      
      // Comparar cantidad de entradas
      const entriesDiff = allEntries.length - expectedKMZData.totalPlacemarks;
      if (entriesDiff === 0) {
        console.log(`   ✅ Cantidad de entradas: COINCIDE (${allEntries.length})`);
      } else if (entriesDiff > 0) {
        console.log(`   ⚠️  Cantidad de entradas: Firebase tiene ${entriesDiff} MÁS que el KMZ`);
        console.log(`      (Firebase: ${allEntries.length}, KMZ: ${expectedKMZData.totalPlacemarks})`);
      } else {
        console.log(`   ⚠️  Cantidad de entradas: Firebase tiene ${Math.abs(entriesDiff)} MENOS que el KMZ`);
        console.log(`      (Firebase: ${allEntries.length}, KMZ: ${expectedKMZData.totalPlacemarks})`);
      }
      
      // Comparar fechas únicas
      const datesDiff = uniqueDates.size - expectedKMZData.uniqueDates;
      if (datesDiff === 0) {
        console.log(`   ✅ Fechas únicas: COINCIDE (${uniqueDates.size})`);
      } else {
        console.log(`   ⚠️  Fechas únicas: DIFERENCIA de ${Math.abs(datesDiff)}`);
        console.log(`      (Firebase: ${uniqueDates.size}, KMZ: ${expectedKMZData.uniqueDates})`);
      }
      
      // Comparar fechas específicas
      const firebaseDates = Array.from(uniqueDates).sort();
      const kmzDates = expectedKMZData.expectedDates.sort();
      const missingDates = kmzDates.filter(d => !firebaseDates.includes(d));
      const extraDates = firebaseDates.filter(d => !kmzDates.includes(d));
      
      if (missingDates.length === 0 && extraDates.length === 0) {
        console.log(`   ✅ Fechas específicas: TODAS COINCIDEN`);
      } else {
        if (missingDates.length > 0) {
          console.log(`   ⚠️  Fechas del KMZ que NO están en Firebase (${missingDates.length}):`);
          console.log(`      ${missingDates.join(', ')}`);
        }
        if (extraDates.length > 0) {
          console.log(`   ℹ️  Fechas en Firebase que NO están en el KMZ esperado (${extraDates.length}):`);
          console.log(`      ${extraDates.join(', ')}`);
          console.log(`      (Esto puede ser normal si hay folders adicionales en el KMZ)`);
        }
      }
      
      // Verificar si todas las fechas del KMZ están en Firebase
      const allKMZDatesPresent = missingDates.length === 0;
      if (allKMZDatesPresent) {
        console.log(`   ✅ Todas las fechas del KMZ están presentes en Firebase`);
      }
      
      // Analizar si las fechas son de captura o de subida
      const entriesWithCaptureDate = entriesWithDate.filter(e => {
        const captureDate = e.data.date;
        const uploadDate = new Date(e.timestamp).toISOString().split('T')[0];
        return captureDate !== uploadDate;
      });
      
      const entriesWithUploadDate = entriesWithDate.filter(e => {
        const captureDate = e.data.date;
        const uploadDate = new Date(e.timestamp).toISOString().split('T')[0];
        return captureDate === uploadDate;
      });
      
      console.log(`\n📅 ANÁLISIS DE FECHAS:`);
      console.log(`   - Entradas con fecha de captura ≠ fecha de subida: ${entriesWithCaptureDate.length}`);
      console.log(`   - Entradas donde fecha = fecha de subida: ${entriesWithUploadDate.length}`);
      
      if (entriesWithUploadDate.length > entriesWithCaptureDate.length) {
        console.log(`   ⚠️  PROBLEMA DETECTADO: La mayoría de las fechas parecen ser fechas de subida, no de captura.`);
        console.log(`      Esto sugiere que las fechas NO se extrajeron correctamente de los Folders del KMZ.`);
      } else if (entriesWithCaptureDate.length > 0) {
        console.log(`   ✅ Las fechas parecen ser fechas de captura reales (diferentes a las de subida).`);
      }
      
      // Resumen final
      console.log('\n📋 RESUMEN:');
      const isMatch = 
        entriesDiff === 0 && 
        missingDates.length === 0 && 
        entriesWithCaptureDate.length > entriesWithUploadDate.length;
      
      if (isMatch) {
        console.log('   ✅ Los datos en Firebase COINCIDEN con el archivo GPS.kmz');
        if (extraDates.length > 0) {
          console.log(`   ℹ️  Nota: Hay ${extraDates.length} fecha(s) adicional(es) en Firebase (probablemente de folders adicionales)`);
        }
      } else {
        console.log('   ⚠️  Los datos en Firebase NO coinciden completamente con el archivo GPS.kmz');
        if (missingDates.length > 0) {
          console.log('   💡 Recomendación: Reprocesar el archivo GPS.kmz con el parser mejorado');
        }
      }
      
      console.log('\n═══════════════════════════════════════════════════════\n');
      
      return;
    } catch (error) {
      console.error('Error comparando datos:', error);
      throw error;
    }
  }
};
