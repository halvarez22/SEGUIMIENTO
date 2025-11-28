#!/usr/bin/env node

/**
 * Script de carga automática diaria de archivos KMZ
 * Ejecuta: node scripts/auto-load-daily.js
 */

const { AutoLoadService } = require('../dist/services/autoLoadService.js');

async function main() {
  console.log('🚀 Iniciando carga automática diaria de archivos KMZ...');
  console.log(`📅 Fecha: ${new Date().toISOString()}`);

  try {
    const result = await AutoLoadService.loadFromFirebaseStorage();

    console.log('\n📊 RESULTADO DE CARGA AUTOMÁTICA:');
    console.log(`✅ Archivos cargados: ${result.loadedFiles}`);
    console.log(`⏭️ Archivos omitidos: ${result.skippedFiles}`);
    console.log(`❌ Errores: ${result.errors.length}`);

    if (result.processedFiles.length > 0) {
      console.log('\n📁 Archivos procesados:');
      result.processedFiles.forEach(file => console.log(`  ✅ ${file}`));
    }

    if (result.errors.length > 0) {
      console.log('\n❌ Errores encontrados:');
      result.errors.forEach(error => console.log(`  ⚠️ ${error}`));
    }

    if (result.success) {
      console.log('\n🎉 Carga automática completada exitosamente!');
      process.exit(0);
    } else {
      console.log('\n💥 Carga automática falló!');
      process.exit(1);
    }

  } catch (error) {
    console.error('💥 Error fatal en carga automática:', error);
    process.exit(1);
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  main();
}

module.exports = { main };
