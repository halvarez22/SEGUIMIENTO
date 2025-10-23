#!/usr/bin/env node

/**
 * Script de configuración y prueba de Firebase
 * Uso: node firebase-setup.js
 */

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, getDocs } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL, listAll } from 'firebase/storage';

// Configuración de Firebase (usa las variables de entorno)
const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID
};

async function testFirebaseConnection() {
  console.log('🔥 Probando conexión a Firebase...');
  console.log('📋 Configuración:', {
    projectId: firebaseConfig.projectId,
    storageBucket: firebaseConfig.storageBucket
  });

  try {
    // Inicializar Firebase
    const app = initializeApp(firebaseConfig);
    console.log('✅ Firebase inicializado correctamente');

    // Probar Firestore
    console.log('📊 Probando Firestore...');
    const db = getFirestore(app);

    // Intentar leer la colección de prueba
    const testCollection = collection(db, 'test_connection');
    const snapshot = await getDocs(testCollection);
    console.log('✅ Firestore conectado - Documentos encontrados:', snapshot.size);

    // Probar Storage
    console.log('🗂️ Probando Firebase Storage...');
    const storage = getStorage(app);

    // Intentar listar archivos en la carpeta raíz
    const storageRef = ref(storage);
    try {
      const result = await listAll(storageRef);
      console.log('✅ Storage conectado - Archivos encontrados:', result.items.length);
      console.log('📁 Carpetas disponibles:', result.prefixes.map(p => p.name));
    } catch (storageError) {
      console.log('⚠️ Storage requiere configuración de reglas de seguridad');
      console.log('Para configurar: Ve a Firebase Console > Storage > Rules');
    }

    console.log('\n🎉 ¡Firebase está configurado correctamente!');
    console.log('\n📋 Próximos pasos:');
    console.log('1. Sube archivos KMZ a la carpeta "kmz-files/" en Firebase Storage');
    console.log('2. Usa el botón "Cargar Automáticamente" en la app');
    console.log('3. Configura reglas de seguridad según storage.rules');

  } catch (error) {
    console.error('❌ Error conectando a Firebase:', error.message);
    console.log('\n🔧 Solución:');
    console.log('1. Verifica que las variables de entorno en .env.local sean correctas');
    console.log('2. Asegúrate de que el proyecto Firebase esté activo');
    console.log('3. Configura las reglas de seguridad en Firebase Console');
  }
}

// Ejecutar si se llama directamente
if (import.meta.url === `file://${process.argv[1]}`) {
  testFirebaseConnection();
}

export { testFirebaseConnection };
