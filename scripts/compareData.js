/**
 * Script para comparar datos de Firebase con el archivo GPS.kmz
 * Ejecutar con: node scripts/compareData.js
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import JSZip from 'jszip';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Mapeo de meses en español
const MONTHS_ES = {
  'enero': 1, 'febrero': 2, 'marzo': 3, 'abril': 4,
  'mayo': 5, 'junio': 6, 'julio': 7, 'agosto': 8,
  'septiembre': 9, 'octubre': 10, 'noviembre': 11, 'diciembre': 12
};

function extractDateFromSpanishName(folderName) {
  const match = folderName.match(/(?:lunes|martes|miércoles|miercoles|jueves|viernes|sábado|sabado|domingo)\s+(\d{1,2})\s+de\s+(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)/i);
  if (match) {
    const day = parseInt(match[1]);
    const monthName = match[2].toLowerCase();
    const month = MONTHS_ES[monthName];
    if (month && day >= 1 && day <= 31) {
      // Asumir año 2024 basado en los datos que vimos
      const year = 2024;
      return `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
    }
  }
  return null;
}

async function analyzeKMZFile(filePath) {
  try {
    console.log(`\n🔍 Analizando archivo KMZ: ${filePath}\n`);
    
    const fileBuffer = await fs.readFile(filePath);
    const zipFile = await JSZip.loadAsync(fileBuffer);
    
    let kmlContent = '';
    for (const fileName in zipFile.files) {
      if (fileName.toLowerCase().endsWith('.kml')) {
        kmlContent = await zipFile.files[fileName].async('string');
        break;
      }
    }
    
    if (!kmlContent) {
      throw new Error('No se encontró archivo KML dentro del KMZ');
    }
    
    // Analizar con regex básico
    const folders = [];
    const folderRegex = /<Folder[^>]*>([\s\S]*?)<\/Folder>/gi;
    let folderMatch;
    
    while ((folderMatch = folderRegex.exec(kmlContent)) !== null) {
      const folderContent = folderMatch[1];
      const nameMatch = folderContent.match(/<name>([^<]+)<\/name>/i);
      const folderName = nameMatch ? nameMatch[1].trim() : 'Sin nombre';
      
      // Contar Placemarks en este folder
      const placemarkMatches = folderContent.match(/<Placemark[^>]*>/gi);
      const placemarkCount = placemarkMatches ? placemarkMatches.length : 0;
      
      // Extraer fecha del nombre
      const date = extractDateFromSpanishName(folderName);
      
      // Extraer coordenadas de los Placemarks
      const coordinates = [];
      const coordRegex = /<coordinates>([^<]+)<\/coordinates>/gi;
      let coordMatch;
      
      while ((coordMatch = coordRegex.exec(folderContent)) !== null) {
        const coords = coordMatch[1].trim().split(/[\s,]+/).filter(c => c.trim());
        if (coords.length >= 2) {
          const lon = parseFloat(coords[0]);
          const lat = parseFloat(coords[1]);
          if (!isNaN(lat) && !isNaN(lon)) {
            coordinates.push({ lat, lon });
          }
        }
      }
      
      folders.push({
        name: folderName,
        date: date,
        placemarkCount: placemarkCount,
        coordinates: coordinates
      });
    }
    
    // También buscar Placemarks fuera de folders
    const allPlacemarks = kmlContent.match(/<Placemark[^>]*>/gi);
    const totalPlacemarks = allPlacemarks ? allPlacemarks.length : 0;
    
    return {
      folders: folders,
      totalPlacemarks: totalPlacemarks,
      totalCoordinates: folders.reduce((sum, f) => sum + f.coordinates.length, 0)
    };
    
  } catch (error) {
    console.error('Error analizando KMZ:', error);
    throw error;
  }
}

async function main() {
  try {
    console.log('═══════════════════════════════════════════════════════');
    console.log('  COMPARACIÓN: Firebase vs GPS.kmz');
    console.log('═══════════════════════════════════════════════════════\n');
    
    // Analizar el archivo KMZ
    const kmzPath = path.join(__dirname, '..', 'data', 'GPS.kmz');
    const kmzData = await analyzeKMZFile(kmzPath);
    
    console.log('\n📊 RESUMEN DEL ARCHIVO GPS.kmz:');
    console.log(`   - Total de Folders (capas/días): ${kmzData.folders.length}`);
    console.log(`   - Total de Placemarks: ${kmzData.totalPlacemarks}`);
    console.log(`   - Total de coordenadas extraídas: ${kmzData.totalCoordinates}`);
    
    // Fechas únicas en el KMZ
    const uniqueDates = [...new Set(kmzData.folders.filter(f => f.date).map(f => f.date))].sort();
    console.log(`   - Fechas únicas encontradas: ${uniqueDates.length}`);
    if (uniqueDates.length > 0 && uniqueDates.length <= 30) {
      console.log(`   - Fechas: ${uniqueDates.join(', ')}`);
    }
    
    // Folders con fecha vs sin fecha
    const foldersWithDate = kmzData.folders.filter(f => f.date);
    const foldersWithoutDate = kmzData.folders.filter(f => !f.date);
    console.log(`   - Folders con fecha: ${foldersWithDate.length}`);
    console.log(`   - Folders sin fecha: ${foldersWithoutDate.length}`);
    
    // Mostrar algunos ejemplos de folders
    console.log(`\n📁 Ejemplos de Folders (primeros 10):`);
    kmzData.folders.slice(0, 10).forEach((folder, index) => {
      console.log(`   ${index + 1}. "${folder.name}"`);
      console.log(`      - Fecha: ${folder.date || 'N/A'}`);
      console.log(`      - Placemarks: ${folder.placemarkCount}`);
      console.log(`      - Coordenadas: ${folder.coordinates.length}`);
    });
    
    console.log('\n\n⚠️  NOTA: Para comparar con Firebase, necesitas:');
    console.log('   1. Ejecutar la función analyzeStoredData() desde la consola del navegador');
    console.log('   2. O hacer clic en el botón "🔍 Analizar BD" en la interfaz');
    console.log('   3. Comparar los resultados manualmente');
    
    console.log('\n📋 INFORMACIÓN ESPERADA EN FIREBASE:');
    console.log(`   - Debería haber aproximadamente ${kmzData.totalPlacemarks} entradas`);
    console.log(`   - Debería haber ${uniqueDates.length} fechas únicas`);
    console.log(`   - Las fechas deberían ser: ${uniqueDates.slice(0, 5).join(', ')}${uniqueDates.length > 5 ? '...' : ''}`);
    
    console.log('\n═══════════════════════════════════════════════════════\n');
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

main();

