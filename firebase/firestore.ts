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

// Verificar si Firebase está disponible
const isFirebaseAvailable = db !== null;
import type { HistoryEntry, GeoData } from '../types';

const COLLECTION_NAME = 'analysisHistory';

export const firestoreService = {
  // Guardar entrada en Firestore
  async saveEntry(data: GeoData, preview?: string): Promise<string> {
    if (!isFirebaseAvailable) {
      console.log('⚠️ Firebase no disponible, guardando solo en localStorage');
      // Retornar un ID dummy cuando Firebase no está disponible
      return `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    try {
      const docData: any = {
        data,
        timestamp: Timestamp.now(),
        createdAt: Timestamp.now(),
        source: data.geometry ? 'kmz' : 'image' // Indicar la fuente
      };

      // Solo agregar preview si no es undefined
      if (preview !== undefined) {
        docData.preview = preview;
      }

      const docRef = await addDoc(collection(db!, COLLECTION_NAME), docData);
      console.log('✅ Documento guardado en Firestore con ID:', docRef.id);
      return docRef.id;
    } catch (error) {
      console.error('❌ Error saving to Firestore:', error);
      console.error('🔍 Detalles del error:', error.message);
      throw error;
    }
  },

  // Obtener historial completo
  async getHistory(): Promise<HistoryEntry[]> {
    if (!isFirebaseAvailable) {
      console.log('⚠️ Firebase no disponible, retornando array vacío');
      return [];
    }

    try {
      const q = query(
        collection(db!, COLLECTION_NAME),
        orderBy('timestamp', 'desc'),
        limit(50)
      );

      const querySnapshot = await getDocs(q);
      console.log('📄 Documentos encontrados en Firestore:', querySnapshot.size);

      const history: HistoryEntry[] = [];

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        history.push({
          id: doc.id,
          data: data.data,
          preview: data.preview || data.imagePreview || undefined, // Compatibilidad con versiones anteriores
          timestamp: data.timestamp.toDate().toISOString(),
          source: data.source || 'image' // Default para datos antiguos
        });
      });

      return history;
    } catch (error) {
      console.error('❌ Error getting history from Firestore:', error);
      throw error;
    }
  },

  // Eliminar entrada específica
  async deleteEntry(id: string): Promise<void> {
    if (!isFirebaseAvailable) {
      console.warn('Firebase no disponible, no se puede eliminar de Firestore');
      return;
    }

    try {
      await deleteDoc(doc(db!, COLLECTION_NAME, id));
    } catch (error) {
      console.error('Error deleting from Firestore:', error);
      throw error;
    }
  },

  // Limpiar todo el historial
  async clearHistory(): Promise<void> {
    if (!isFirebaseAvailable) {
      console.warn('Firebase no disponible, no se puede limpiar Firestore');
      return;
    }

    try {
      const querySnapshot = await getDocs(collection(db!, COLLECTION_NAME));
      const deletePromises = querySnapshot.docs.map(docSnapshot =>
        deleteDoc(doc(db!, COLLECTION_NAME, docSnapshot.id))
      );
      await Promise.all(deletePromises);
    } catch (error) {
      console.error('Error clearing Firestore:', error);
      throw error;
    }
  }
};
