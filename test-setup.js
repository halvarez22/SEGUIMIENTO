// Script para verificar la configuración de la aplicación
console.log('🔍 Verificando configuración de KMZ Map Viewer...\n');

// Verificar variables de entorno
console.log('📋 Variables de entorno:');
console.log('VITE_API_KEY:', import.meta.env.VITE_API_KEY ? '✅ Configurada' : '❌ No configurada');
console.log('VITE_FIREBASE_API_KEY:', import.meta.env.VITE_FIREBASE_API_KEY ? '✅ Configurada' : '❌ No configurada');
console.log('VITE_FIREBASE_PROJECT_ID:', import.meta.env.VITE_FIREBASE_PROJECT_ID || '❌ No configurada');

console.log('\n🔧 Servicios:');

// Verificar Firebase
try {
  const { db } = await import('./firebase/config.js');
  console.log('Firebase:', db ? '✅ Disponible' : '⚠️ No disponible (modo local)');
} catch (error) {
  console.log('Firebase:', '❌ Error al cargar');
}

// Verificar Gemini
try {
  const { isChatbotAvailable } = await import('./services/geminiService.js');
  console.log('Chatbot IA:', isChatbotAvailable() ? '✅ Disponible' : '⚠️ No disponible (requiere API key)');
} catch (error) {
  console.log('Chatbot IA:', '❌ Error al cargar');
}

console.log('\n📁 Archivos de datos:');

// Verificar archivos KMZ procesados
try {
  const fs = await import('fs');
  const kmzPath = './public/kmz-data';
  if (fs.existsSync(kmzPath)) {
    const files = fs.readdirSync(kmzPath).filter(f => f.endsWith('.json'));
    console.log(`Archivos KMZ procesados: ${files.length} archivos`);
  } else {
    console.log('Archivos KMZ procesados: ❌ Directorio no encontrado');
  }
} catch (error) {
  console.log('Archivos KMZ procesados: ❌ Error al verificar');
}

console.log('\n✅ Verificación completada!');
console.log('Si hay errores marcados con ❌, revisa la configuración.');
console.log('Si hay advertencias ⚠️, algunas funciones estarán limitadas pero la app funcionará.');
