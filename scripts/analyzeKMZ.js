/**
 * Script para analizar un archivo KMZ local
 * Ejecutar con: node scripts/analyzeKMZ.js
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import JSZip from 'jszip';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function analyzeKMZFile(filePath) {
  try {
    console.log(`\n🔍 Analizando archivo: ${filePath}\n`);
    
    // Leer el archivo
    const fileBuffer = await fs.readFile(filePath);
    const stats = await fs.stat(filePath);
    console.log(`📦 Tamaño del archivo: ${(stats.size / 1024).toFixed(2)} KB\n`);
    
    // Descomprimir KMZ
    const zipFile = await JSZip.loadAsync(fileBuffer);
    
    // Buscar archivo KML
    let kmlContent = '';
    let kmlFileName = '';
    for (const fileName in zipFile.files) {
      if (fileName.toLowerCase().endsWith('.kml')) {
        kmlContent = await zipFile.files[fileName].async('string');
        kmlFileName = fileName;
        break;
      }
    }
    
    if (!kmlContent) {
      throw new Error('No se encontró archivo KML dentro del KMZ');
    }
    
    console.log(`✅ Archivo KML encontrado: ${kmlFileName}`);
    console.log(`📄 Tamaño del KML: ${(kmlContent.length / 1024).toFixed(2)} KB\n`);
    
    // Parsear XML usando xmldom (necesita instalarse)
    // Alternativa: usar una librería XML simple o el parser del navegador
    let xmlDoc;
    try {
      // Intentar usar xmldom si está disponible
      const { DOMParser } = await import('@xmldom/xmldom');
      const parser = new DOMParser();
      xmlDoc = parser.parseFromString(kmlContent, 'text/xml');
    } catch (e) {
      // Si no está disponible, usar regex básico para extraer información
      console.log('⚠️  xmldom no disponible, usando análisis básico con regex...\n');
      analyzeKMZBasic(kmlContent);
      return;
    }
    
    // Verificar errores
    const parserError = xmlDoc.getElementsByTagName('parsererror');
    if (parserError.length > 0) {
      throw new Error('Error al parsear XML: ' + parserError[0].textContent);
    }
    
    console.log('=== ESTRUCTURA DEL KML ===\n');
    
    // Analizar Folders
    const folders = xmlDoc.getElementsByTagName('Folder');
    console.log(`📁 Total de Folders (capas) encontrados: ${folders.length}\n`);
    
    let totalPlacemarks = 0;
    const folderInfo = [];
    
    for (let i = 0; i < folders.length; i++) {
      const folder = folders[i];
      const nameElement = folder.getElementsByTagName('name')[0];
      const folderName = nameElement?.textContent?.trim() || 'Sin nombre';
      
      const placemarks = folder.getElementsByTagName('Placemark');
      const placemarkCount = placemarks.length;
      totalPlacemarks += placemarkCount;
      
      // Buscar fecha en el Folder
      const timeStamp = folder.getElementsByTagName('TimeStamp')[0];
      const timeSpan = folder.getElementsByTagName('TimeSpan')[0];
      const description = folder.getElementsByTagName('description')[0];
      
      let folderDate = null;
      let folderTime = null;
      
      if (timeStamp) {
        const when = timeStamp.getElementsByTagName('when')[0];
        if (when) {
          const dateTime = when.textContent.trim();
          const dateMatch = dateTime.match(/(\d{4}-\d{2}-\d{2})/);
          const timeMatch = dateTime.match(/T(\d{2}):(\d{2})/);
          if (dateMatch) folderDate = dateMatch[1];
          if (timeMatch) folderTime = `${timeMatch[1]}:${timeMatch[2]}`;
        }
      }
      
      if (!folderDate && timeSpan) {
        const begin = timeSpan.getElementsByTagName('begin')[0];
        if (begin) {
          const dateTime = begin.textContent.trim();
          const dateMatch = dateTime.match(/(\d{4}-\d{2}-\d{2})/);
          const timeMatch = dateTime.match(/T(\d{2}):(\d{2})/);
          if (dateMatch) folderDate = dateMatch[1];
          if (timeMatch) folderTime = `${timeMatch[1]}:${timeMatch[2]}`;
        }
      }
      
      // Intentar extraer fecha del nombre
      if (!folderDate) {
        const dateMatch = folderName.match(/(\d{4}-\d{2}-\d{2})/);
        if (dateMatch) {
          folderDate = dateMatch[1];
        } else {
          // Intentar otros formatos
          const slashMatch = folderName.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
          if (slashMatch) {
            const [, d, m, y] = slashMatch;
            folderDate = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
          }
        }
      }
      
      folderInfo.push({
        name: folderName,
        placemarkCount,
        date: folderDate,
        time: folderTime,
        hasTimeStamp: !!timeStamp,
        hasTimeSpan: !!timeSpan,
        hasDescription: !!description
      });
      
      console.log(`📁 Folder ${i + 1}: "${folderName}"`);
      console.log(`   - Placemarks: ${placemarkCount}`);
      if (folderDate) {
        console.log(`   ✅ Fecha encontrada: ${folderDate} ${folderTime || ''}`);
      } else {
        console.log(`   ⚠️  Sin fecha`);
      }
      if (timeStamp) console.log(`   - Tiene TimeStamp`);
      if (timeSpan) console.log(`   - Tiene TimeSpan`);
      if (description) {
        const descText = description.textContent?.substring(0, 80) || '';
        console.log(`   - Descripción: ${descText}...`);
      }
      console.log('');
    }
    
    // Analizar Placemarks fuera de Folders
    const allPlacemarks = xmlDoc.getElementsByTagName('Placemark');
    const placemarksOutsideFolders = allPlacemarks.length - totalPlacemarks;
    
    console.log(`\n📍 Resumen de Placemarks:`);
    console.log(`   - Total: ${allPlacemarks.length}`);
    console.log(`   - Dentro de Folders: ${totalPlacemarks}`);
    console.log(`   - Fuera de Folders: ${placemarksOutsideFolders}`);
    
    // Analizar fechas en Folders
    const foldersWithDate = folderInfo.filter(f => f.date);
    const foldersWithoutDate = folderInfo.filter(f => !f.date);
    
    console.log(`\n📅 Análisis de fechas en Folders:`);
    console.log(`   - Folders con fecha: ${foldersWithDate.length} (${((foldersWithDate.length / folders.length) * 100).toFixed(1)}%)`);
    console.log(`   - Folders sin fecha: ${foldersWithoutDate.length} (${((foldersWithoutDate.length / folders.length) * 100).toFixed(1)}%)`);
    
    if (foldersWithDate.length > 0) {
      const uniqueDates = [...new Set(foldersWithDate.map(f => f.date))].sort();
      console.log(`   - Fechas únicas encontradas: ${uniqueDates.length}`);
      if (uniqueDates.length <= 30) {
        console.log(`   - Fechas: ${uniqueDates.join(', ')}`);
      } else {
        console.log(`   - Primeras 10 fechas: ${uniqueDates.slice(0, 10).join(', ')}...`);
        console.log(`   - Últimas 10 fechas: ...${uniqueDates.slice(-10).join(', ')}`);
      }
    }
    
    // Analizar algunos Placemarks de ejemplo
    console.log(`\n🔍 Analizando Placemarks de ejemplo (primeros 3 Folders):\n`);
    for (let i = 0; i < Math.min(3, folders.length); i++) {
      const folder = folders[i];
      const nameElement = folder.getElementsByTagName('name')[0];
      const folderName = nameElement?.textContent?.trim() || 'Sin nombre';
      const placemarks = folder.getElementsByTagName('Placemark');
      
      console.log(`📁 Folder: "${folderName}"`);
      console.log(`   Placemarks dentro: ${placemarks.length}`);
      
      for (let j = 0; j < Math.min(3, placemarks.length); j++) {
        const placemark = placemarks[j];
        const pmName = placemark.getElementsByTagName('name')[0]?.textContent?.trim() || 'Sin nombre';
        const coordinates = placemark.getElementsByTagName('coordinates')[0]?.textContent?.trim() || '';
        const timeStamp = placemark.getElementsByTagName('TimeStamp')[0];
        const timeSpan = placemark.getElementsByTagName('TimeSpan')[0];
        
        let pmDate = null;
        let pmTime = null;
        
        if (timeStamp) {
          const when = timeStamp.getElementsByTagName('when')[0];
          if (when) {
            const dateTime = when.textContent.trim();
            const dateMatch = dateTime.match(/(\d{4}-\d{2}-\d{2})/);
            const timeMatch = dateTime.match(/T(\d{2}):(\d{2})/);
            if (dateMatch) pmDate = dateMatch[1];
            if (timeMatch) pmTime = `${timeMatch[1]}:${timeMatch[2]}`;
          }
        }
        
        if (!pmDate && timeSpan) {
          const begin = timeSpan.getElementsByTagName('begin')[0];
          if (begin) {
            const dateTime = begin.textContent.trim();
            const dateMatch = dateTime.match(/(\d{4}-\d{2}-\d{2})/);
            const timeMatch = dateTime.match(/T(\d{2}):(\d{2})/);
            if (dateMatch) pmDate = dateMatch[1];
            if (timeMatch) pmTime = `${timeMatch[1]}:${timeMatch[2]}`;
          }
        }
        
        const coords = coordinates.split(/[\s,]+/).filter(c => c.trim());
        const lat = coords.length >= 2 ? parseFloat(coords[1]) : null;
        const lon = coords.length >= 2 ? parseFloat(coords[0]) : null;
        
        console.log(`\n   📍 Placemark ${j + 1}: "${pmName}"`);
        console.log(`      - Coordenadas: ${lat !== null ? `${lat}, ${lon}` : 'N/A'}`);
        if (pmDate) {
          console.log(`      - Fecha propia: ${pmDate} ${pmTime || ''}`);
        } else {
          console.log(`      - Sin fecha propia (usará fecha del Folder)`);
        }
      }
      console.log('');
    }
    
    console.log('\n=== FIN DE ANÁLISIS ===\n');
    
  } catch (error) {
    console.error('❌ Error analizando archivo KMZ:', error);
    throw error;
  }
}

function analyzeKMZBasic(kmlContent) {
  console.log('=== ANÁLISIS BÁSICO DEL KML ===\n');
  
  // Contar Folders
  const folderMatches = kmlContent.match(/<Folder[^>]*>/gi);
  const folderCount = folderMatches ? folderMatches.length : 0;
  console.log(`📁 Folders encontrados (aproximado): ${folderCount}\n`);
  
  // Extraer nombres de Folders
  const folderNameRegex = /<Folder[^>]*>[\s\S]*?<name>([^<]+)<\/name>/gi;
  const folders = [];
  let match;
  
  while ((match = folderNameRegex.exec(kmlContent)) !== null) {
    folders.push(match[1].trim());
  }
  
  console.log(`📁 Nombres de Folders encontrados: ${folders.length}\n`);
  folders.slice(0, 20).forEach((name, index) => {
    console.log(`   ${index + 1}. "${name}"`);
    
    // Intentar extraer fecha del nombre
    const dateMatch = name.match(/(\d{4}-\d{2}-\d{2})/);
    if (dateMatch) {
      console.log(`      ✅ Fecha en nombre: ${dateMatch[1]}`);
    } else {
      const slashMatch = name.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
      if (slashMatch) {
        const [, d, m, y] = slashMatch;
        console.log(`      ✅ Fecha en nombre: ${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`);
      }
    }
  });
  
  if (folders.length > 20) {
    console.log(`   ... y ${folders.length - 20} más`);
  }
  
  // Contar Placemarks
  const placemarkMatches = kmlContent.match(/<Placemark[^>]*>/gi);
  const placemarkCount = placemarkMatches ? placemarkMatches.length : 0;
  console.log(`\n📍 Total de Placemarks (aproximado): ${placemarkCount}\n`);
  
  console.log('\n=== FIN DE ANÁLISIS BÁSICO ===\n');
}

// Ejecutar análisis
const filePath = path.join(__dirname, '..', 'data', 'GPS.kmz');
analyzeKMZFile(filePath).catch(console.error);

