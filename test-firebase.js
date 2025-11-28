// Script de prueba para verificar Firebase
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, getDocs, deleteDoc, doc } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyAPmuMx7osH3Wr4nmoHrVPra7T3rL2Ybi0",
  authDomain: "seguimiento-a66fe.firebaseapp.com",
  projectId: "seguimiento-a66fe",
  storageBucket: "seguimiento-a66fe.firebasestorage.app",
  messagingSenderId: "130555628405",
  appId: "1:130555628405:web:3110bf04f4572c1366213c"
};

console.log('🔥 Iniciando prueba de Firebase...');

try {
  const app = initializeApp(firebaseConfig);
  console.log('✅ Firebase inicializado correctamente');

  const db = getFirestore(app);
  console.log('📊 Firestore inicializado correctamente');

  // Probar escritura
  console.log('💾 Probando escritura...');
  const testData = {
    test: true,
    timestamp: new Date().toISOString(),
    message: 'Prueba de conectividad Firebase'
  };

  const docRef = await addDoc(collection(db, 'test_collection'), testData);
  console.log('✅ Documento escrito correctamente con ID:', docRef.id);

  // Probar lectura
  console.log('📖 Probando lectura...');
  const querySnapshot = await getDocs(collection(db, 'test_collection'));
  console.log('📄 Documentos encontrados:', querySnapshot.size);

  querySnapshot.forEach((doc) => {
    console.log('📋 Documento:', doc.id, doc.data());
  });

  // Limpiar datos de prueba
  console.log('🧹 Limpiando datos de prueba...');
  for (const docSnap of querySnapshot.docs) {
    await deleteDoc(doc(db, 'test_collection', docSnap.id));
    console.log('✅ Documento eliminado:', docSnap.id);
  }

  console.log('🎉 ¡PRUEBA DE FIREBASE EXITOSA!');
  console.log('✅ Lectura, escritura y eliminación funcionan correctamente');

} catch (error) {
  console.error('❌ ERROR EN PRUEBA DE FIREBASE:', error);
  console.error('🔍 Detalles del error:', error.message);
  process.exit(1);
}
