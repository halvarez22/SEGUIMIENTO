/**
 * Script para limpiar Firebase y recargar datos del GPS.kmz
 * Ejecutar con: node scripts/reloadKMZData.js
 * 
 * IMPORTANTE: Necesita las variables de entorno de Firebase configuradas
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import JSZip from 'jszip';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, getDocs, deleteDoc, doc, Timestamp } from 'firebase/firestore';
import { config } from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Cargar variables de entorno
config({ path: path.join(__dirname, '..', '.env.local') });

// Configuración de Firebase
const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID,
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const COLLECTION_NAME = 'analysisHistory';

// Mapeo de meses en español
const MONTHS_ES = {
  'enero': 1, 'febrero': 2, 'marzo': 3, 'abril': 4,
  'mayo': 5, 'junio': 6, 'julio': 7, 'agosto': 8,
  'septiembre': 9, 'octubre': 10, 'noviembre': 11, 'diciembre': 12
};

function parseDateTime(dateTimeStr) {
  let date = '';
  let time = '';
  
  const dateTimeMatch = dateTimeStr.match(/(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?/);
  if (dateTimeMatch) {
    date = dateTimeMatch[1];
    time = `${dateTimeMatch[2]}:${dateTimeMatch[3]}`;
  } else {
    const dateMatch = dateTimeStr.match(/(\d{4}-\d{2}-\d{2})/);
    if (dateMatch) {
      date = dateMatch[1];
    }
  }
  
  return { date, time };
}

function extractDateFromSpanishName(folderName) {
  const match = folderName.match(/(?:lunes|martes|miércoles|miercoles|jueves|viernes|sábado|sabado|domingo)\s+(\d{1,2})\s+de\s+(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)/i);
  if (match) {
    const day = parseInt(match[1]);
    const monthName = match[2].toLowerCase();
    const month = MONTHS_ES[monthName];
    
    if (month && day >= 1 && day <= 31) {
      // Determinar el año basándose en el año actual
      const currentYear = new Date().getFullYear();
      const currentMonth = new Date().getMonth() + 1;
      
      // Si el mes del folder es igual o anterior al mes actual, usar año actual
      // Si el mes es futuro, usar año anterior
      let year = currentYear;
      if (month > currentMonth) {
        year = currentYear - 1;
      }
      
      // Ajuste especial: si estamos en 2025 y los datos son de septiembre/octubre, usar 2025
      if (currentYear === 2025 && (month === 9 || month === 10)) {
        year = 2025;
      }
      
      return `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
    }
  }
  return null;
}

function findDateInFolderHierarchy(folderElement, allFolders) {
  // Buscar fecha en el folder actual
  const nameElement = folderElement.querySelector('name');
  if (nameElement) {
    const folderName = nameElement.textContent?.trim() || '';
    const date = extractDateFromSpanishName(folderName);
    if (date) return { date, time: '' };
  }
  
  // Buscar en TimeStamp
  const timeStamp = folderElement.querySelector('TimeStamp');
  if (timeStamp) {
    const when = timeStamp.querySelector('when');
    if (when) {
      const parsed = parseDateTime(when.textContent?.trim() || '');
      if (parsed.date) return parsed;
    }
  }
  
  // Buscar en TimeSpan
  const timeSpan = folderElement.querySelector('TimeSpan');
  if (timeSpan) {
    const begin = timeSpan.querySelector('begin');
    if (begin) {
      const parsed = parseDateTime(begin.textContent?.trim() || '');
      if (parsed.date) return parsed;
    }
  }
  
  return { date: '', time: '' };
}

async function parseKMZFile(filePath) {
  try {
    console.log(`\n📦 Procesando archivo: ${filePath}\n`);
    
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
    
    // Parsear XML usando xmldom
    const { DOMParser } = await import('@xmldom/xmldom');
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(kmlContent, 'text/xml');
    
    const results = [];
    const placemarks = xmlDoc.getElementsByTagName('Placemark');
    
    console.log(`📍 Encontrados ${placemarks.length} Placemarks\n`);
    
    // Primero, crear un mapa de Folders con sus fechas
    const folders = xmlDoc.getElementsByTagName('Folder');
    const folderDateMap = new Map();
    
    for (let f = 0; f < folders.length; f++) {
      const folder = folders[f];
      const nameElements = folder.getElementsByTagName('name');
      if (nameElements.length > 0) {
        const folderName = nameElements[0].textContent?.trim() || '';
        const date = extractDateFromSpanishName(folderName);
        if (date) {
          folderDateMap.set(folder, date);
        }
      }
    }
    
    for (let i = 0; i < placemarks.length; i++) {
      const placemark = placemarks[i];
      
      try {
        // Extraer coordenadas
        let latitude = null;
        let longitude = null;
        
        const coordinatesElements = placemark.getElementsByTagName('coordinates');
        if (coordinatesElements.length > 0) {
          const coordsText = coordinatesElements[0].textContent?.trim() || '';
          const coords = coordsText.split(/[\s,]+/).filter(c => c.trim());
          if (coords.length >= 2) {
            longitude = parseFloat(coords[0].trim());
            latitude = parseFloat(coords[1].trim());
          }
        }
        
        // Extraer fecha/hora del Placemark
        let dateStr = '';
        let timeStr = '';
        
        const timeStamps = placemark.getElementsByTagName('TimeStamp');
        if (timeStamps.length > 0) {
          const whenElements = timeStamps[0].getElementsByTagName('when');
          if (whenElements.length > 0 && whenElements[0].textContent) {
            const parsed = parseDateTime(whenElements[0].textContent.trim());
            dateStr = parsed.date;
            timeStr = parsed.time;
          }
        }
        
        const timeSpans = placemark.getElementsByTagName('TimeSpan');
        if (timeSpans.length > 0 && !dateStr) {
          const beginElements = timeSpans[0].getElementsByTagName('begin');
          if (beginElements.length > 0 && beginElements[0].textContent) {
            const parsed = parseDateTime(beginElements[0].textContent.trim());
            dateStr = parsed.date;
            timeStr = parsed.time;
          }
        }
        
        // Si no tiene fecha, buscar en el Folder padre
        if (!dateStr) {
          let parent = placemark.parentNode;
          while (parent && parent.nodeName !== 'kml' && parent.nodeName !== 'Document') {
            if (parent.nodeName === 'Folder' || parent.nodeName === 'folder') {
              if (folderDateMap.has(parent)) {
                dateStr = folderDateMap.get(parent);
                break;
              }
              // También buscar en el nombre del folder directamente
              const nameElements = parent.getElementsByTagName('name');
              if (nameElements.length > 0) {
                const folderName = nameElements[0].textContent?.trim() || '';
                const date = extractDateFromSpanishName(folderName);
                if (date) {
                  dateStr = date;
                  break;
                }
              }
            }
            parent = parent.parentNode;
          }
        }
        
        // Extraer ubicación
        const nameElements = placemark.getElementsByTagName('name');
        const addressElements = placemark.getElementsByTagName('address');
        const descriptionElements = placemark.getElementsByTagName('description');
        
        let location = '';
        if (nameElements.length > 0 && nameElements[0].textContent) {
          location = nameElements[0].textContent.trim();
        } else if (addressElements.length > 0 && addressElements[0].textContent) {
          location = addressElements[0].textContent.trim();
        } else if (descriptionElements.length > 0 && descriptionElements[0].textContent) {
          location = descriptionElements[0].textContent.trim();
        }
        
        if (latitude !== null && longitude !== null) {
          results.push({
            date: dateStr || '',
            time: timeStr || '',
            location: location || 'Ubicación sin nombre',
            latitude: latitude,
            longitude: longitude,
          });
        } else if (location) {
          results.push({
            date: dateStr || '',
            time: timeStr || '',
            location: location,
            latitude: null,
            longitude: null,
          });
        }
      } catch (error) {
        console.warn(`Error procesando Placemark ${i + 1}:`, error.message);
      }
    }
    
    console.log(`✅ Extraídas ${results.length} ubicaciones válidas\n`);
    
    // Estadísticas
    const withDate = results.filter(r => r.date);
    const withoutDate = results.filter(r => !r.date);
    const uniqueDates = [...new Set(withDate.map(r => r.date))].sort();
    
    console.log(`📅 Estadísticas:`);
    console.log(`   - Con fecha: ${withDate.length}`);
    console.log(`   - Sin fecha: ${withoutDate.length}`);
    console.log(`   - Fechas únicas: ${uniqueDates.length}`);
    if (uniqueDates.length > 0 && uniqueDates.length <= 25) {
      console.log(`   - Fechas: ${uniqueDates.join(', ')}`);
    }
    
    return results;
  } catch (error) {
    console.error('Error parseando KMZ:', error);
    throw error;
  }
}

async function clearFirestore() {
  try {
    console.log('🗑️  Limpiando base de datos...\n');
    const querySnapshot = await getDocs(collection(db, COLLECTION_NAME));
    const deletePromises = querySnapshot.docs.map(docSnapshot => 
      deleteDoc(doc(db, COLLECTION_NAME, docSnapshot.id))
    );
    await Promise.all(deletePromises);
    console.log(`✅ Eliminadas ${querySnapshot.docs.length} entradas de Firebase\n`);
  } catch (error) {
    console.error('Error limpiando Firebase:', error);
    throw error;
  }
}

async function saveToFirestore(dataArray) {
  try {
    console.log(`\n💾 Guardando ${dataArray.length} entradas en Firebase...\n`);
    
    let saved = 0;
    let errors = 0;
    
    for (let i = 0; i < dataArray.length; i++) {
      const data = dataArray[i];
      try {
        await addDoc(collection(db, COLLECTION_NAME), {
          data: data,
          imagePreview: '',
          timestamp: Timestamp.now(),
          createdAt: Timestamp.now()
        });
        saved++;
        
        if ((i + 1) % 50 === 0) {
          console.log(`   Progreso: ${i + 1}/${dataArray.length} (${saved} guardadas, ${errors} errores)`);
        }
      } catch (error) {
        errors++;
        console.error(`   Error guardando entrada ${i + 1}:`, error.message);
      }
    }
    
    console.log(`\n✅ Guardadas ${saved} entradas exitosamente`);
    if (errors > 0) {
      console.log(`⚠️  ${errors} entradas con errores`);
    }
  } catch (error) {
    console.error('Error guardando en Firebase:', error);
    throw error;
  }
}

async function main() {
  try {
    console.log('═══════════════════════════════════════════════════════');
    console.log('  RECARGA DE DATOS: GPS.kmz → Firebase');
    console.log('═══════════════════════════════════════════════════════\n');
    
    // Verificar configuración de Firebase
    if (!firebaseConfig.apiKey) {
      throw new Error('Variables de entorno de Firebase no configuradas. Verifica .env.local');
    }
    
    // 1. Limpiar Firebase
    await clearFirestore();
    
    // 2. Procesar archivo KMZ
    const kmzPath = path.join(__dirname, '..', 'data', 'GPS.kmz');
    const extractedData = await parseKMZFile(kmzPath);
    
    if (extractedData.length === 0) {
      throw new Error('No se extrajeron datos del archivo KMZ');
    }
    
    // 3. Guardar en Firebase
    await saveToFirestore(extractedData);
    
    console.log('\n═══════════════════════════════════════════════════════');
    console.log('  ✅ PROCESO COMPLETADO EXITOSAMENTE');
    console.log('═══════════════════════════════════════════════════════\n');
    
  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    console.error(error);
    process.exit(1);
  }
}

main();

