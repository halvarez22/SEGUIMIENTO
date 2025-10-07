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

  // Obtener historial completo
  async getHistory(): Promise<HistoryEntry[]> {
    try {
      const q = query(
        collection(db, COLLECTION_NAME),
        orderBy('timestamp', 'desc'),
        limit(50)
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
  }
};
