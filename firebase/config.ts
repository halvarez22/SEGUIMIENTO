import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

// Verificar que todas las variables de entorno necesarias estén presentes
const requiredEnvVars = [
  'VITE_FIREBASE_API_KEY',
  'VITE_FIREBASE_AUTH_DOMAIN',
  'VITE_FIREBASE_PROJECT_ID',
  'VITE_FIREBASE_STORAGE_BUCKET',
  'VITE_FIREBASE_MESSAGING_SENDER_ID',
  'VITE_FIREBASE_APP_ID'
];

const missingVars = requiredEnvVars.filter(varName => !import.meta.env[varName]);

let app: any = null;
let db: any = null;

if (missingVars.length > 0) {
  console.warn('⚠️ Firebase no está configurado. Variables faltantes:', missingVars);
  console.warn('La aplicación funcionará en modo local sin sincronización con Firebase.');
} else {
  console.log('🔥 Inicializando Firebase...');
  console.log('📋 Project ID:', import.meta.env.VITE_FIREBASE_PROJECT_ID);

  const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
  };

  try {
    // Initialize Firebase
    app = initializeApp(firebaseConfig);
    console.log('✅ Firebase inicializado correctamente');

    // Initialize Firestore
    db = getFirestore(app);
    console.log('📊 Firestore inicializado correctamente');

  } catch (error) {
    console.error('❌ Error inicializando Firebase:', error);
    app = null;
    db = null;
  }
}

// Exportar valores (pueden ser null si Firebase no está configurado)
export { db };
export default app;
