#!/usr/bin/env node

/**
 * Script simple para verificar variables de entorno
 */

console.log('🔍 Verificando configuración de entorno...\n');

// Verificar variables de Firebase
const firebaseVars = [
  'VITE_FIREBASE_API_KEY',
  'VITE_FIREBASE_AUTH_DOMAIN',
  'VITE_FIREBASE_PROJECT_ID',
  'VITE_FIREBASE_STORAGE_BUCKET',
  'VITE_FIREBASE_MESSAGING_SENDER_ID',
  'VITE_FIREBASE_APP_ID'
];

console.log('Firebase Configuration:');
let firebaseOk = true;
firebaseVars.forEach(varName => {
  const value = process.env[varName];
  const status = value ? '✅' : '❌';
  console.log(`${status} ${varName}: ${value ? '[CONFIGURADO]' : '[FALTANTE]'}`);
  if (!value) firebaseOk = false;
});

// Verificar Gemini API Key
const geminiKey = process.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY;
console.log(`\n${geminiKey ? '✅' : '❌'} VITE_GEMINI_API_KEY: ${geminiKey ? '[CONFIGURADO]' : '[FALTANTE]'}`);

console.log('\n' + '='.repeat(50));

if (firebaseOk && geminiKey) {
  console.log('🎉 ¡Todas las configuraciones están correctas!');
  console.log('\nFirebase Storage debería funcionar ahora.');
  console.log('Sube archivos KMZ a la carpeta kmz-files/ en Firebase Console.');
} else {
  console.log('⚠️ Faltan configuraciones:');
  if (!firebaseOk) console.log('  - Configura las variables de Firebase en .env.local');
  if (!geminiKey) console.log('  - Configura VITE_GEMINI_API_KEY en .env.local');
}

console.log('\n📄 Archivo de referencia: FIREBASE_SETUP.md');
console.log('🔗 Firebase Console: https://console.firebase.google.com');
