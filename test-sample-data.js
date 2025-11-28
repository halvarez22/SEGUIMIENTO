import { SampleDataService } from './services/sampleDataService.js';

// Test básico de carga de datos de ejemplo
async function testSampleData() {
  try {
    console.log('🧪 Probando carga de datos de ejemplo...');

    // Verificar archivos disponibles
    const availableFiles = await SampleDataService.getAvailableSampleFiles();
    console.log(`📁 Archivos disponibles: ${availableFiles.length}`);
    console.log('Primeros 3 archivos:', availableFiles.slice(0, 3));

    // Verificar si hay datos disponibles
    const hasData = await SampleDataService.hasSampleData();
    console.log(`✅ ¿Hay datos disponibles?: ${hasData}`);

    // Cargar un archivo de ejemplo pequeño para probar
    if (availableFiles.length > 0) {
      const testFile = 'Viernes 26 de Septiembre.json'; // Solo 3 puntos
      console.log(`\n🔍 Probando carga de archivo: ${testFile}`);

      const sampleEntries = await SampleDataService.loadSampleDataFile(testFile);
      console.log(`✅ Cargados ${sampleEntries.length} puntos del archivo de prueba`);

      if (sampleEntries.length > 0) {
        const firstEntry = sampleEntries[0];
        console.log('📍 Primer punto de ejemplo:');
        console.log(`   Nombre: ${firstEntry.data.name}`);
        console.log(`   Ubicación: ${firstEntry.data.location}`);
        console.log(`   Coordenadas: ${firstEntry.data.latitude}, ${firstEntry.data.longitude}`);
        console.log(`   Fuente: ${firstEntry.source}`);
        console.log(`   Fecha: ${firstEntry.data.date}`);
        console.log(`   Hora: ${firstEntry.data.time}`);
      }
    }

    console.log('\n🎉 Test completado exitosamente!');

  } catch (error) {
    console.error('❌ Error en el test:', error);
  }
}

testSampleData();
