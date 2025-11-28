import { parseKMZFile, debugKMZStructure } from './kmzParser';
import type { ExtractedData } from '../types';

/**
 * Analiza un archivo KMZ específico desde el sistema de archivos (Node.js)
 * Esta función está diseñada para ser ejecutada en un entorno Node.js
 */
export async function analyzeLocalKMZ(filePath: string): Promise<void> {
  try {
    // En un entorno Node.js, usar fs para leer el archivo
    const fs = await import('fs/promises');
    const path = await import('path');
    
    const fileBuffer = await fs.readFile(filePath);
    const fileName = path.basename(filePath);
    
    // Crear un objeto File-like para usar con nuestras funciones
    const file = new File([fileBuffer], fileName, { type: 'application/vnd.google-earth.kmz' });
    
    console.log(`\n🔍 Analizando archivo: ${fileName}`);
    console.log(`📦 Tamaño: ${(fileBuffer.length / 1024).toFixed(2)} KB\n`);
    
    // Primero analizar la estructura
    await debugKMZStructure(file);
    
    // Luego parsear los datos
    console.log('\n\n=== PARSING DE DATOS ===');
    const extractedData = await parseKMZFile(file);
    
    console.log(`\n✅ Total de ubicaciones extraídas: ${extractedData.length}`);
    
    // Analizar las fechas extraídas
    const withDate = extractedData.filter(d => d.date && d.date.trim() !== '');
    const withoutDate = extractedData.filter(d => !d.date || d.date.trim() === '');
    
    console.log(`\n📅 Análisis de fechas:`);
    console.log(`   - Con fecha: ${withDate.length} (${((withDate.length / extractedData.length) * 100).toFixed(1)}%)`);
    console.log(`   - Sin fecha: ${withoutDate.length} (${((withoutDate.length / extractedData.length) * 100).toFixed(1)}%)`);
    
    if (withDate.length > 0) {
      const uniqueDates = new Set(withDate.map(d => d.date));
      console.log(`   - Fechas únicas: ${uniqueDates.size}`);
      console.log(`   - Fechas encontradas:`, Array.from(uniqueDates).sort().slice(0, 10));
    }
    
    // Mostrar ejemplos
    console.log(`\n📋 Ejemplos de datos extraídos (primeros 5):`);
    extractedData.slice(0, 5).forEach((data, index) => {
      console.log(`\n   ${index + 1}. ${data.location || 'Sin ubicación'}`);
      console.log(`      - Fecha: ${data.date || 'N/A'} ${data.time || ''}`);
      console.log(`      - Coordenadas: ${data.latitude !== null ? `${data.latitude}, ${data.longitude}` : 'N/A'}`);
    });
    
    if (withoutDate.length > 0) {
      console.log(`\n⚠️  Ejemplos de datos SIN fecha (primeros 3):`);
      withoutDate.slice(0, 3).forEach((data, index) => {
        console.log(`\n   ${index + 1}. ${data.location || 'Sin ubicación'}`);
        console.log(`      - Coordenadas: ${data.latitude !== null ? `${data.latitude}, ${data.longitude}` : 'N/A'}`);
      });
    }
    
    console.log('\n=== FIN DE ANÁLISIS ===\n');
    
    return;
  } catch (error) {
    console.error('Error analizando archivo KMZ local:', error);
    throw error;
  }
}

