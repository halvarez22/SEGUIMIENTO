import type { ExtractedData } from '../types';

/**
 * Parsea una fecha/hora en formato ISO 8601 y extrae fecha y hora
 */
function parseDateTime(dateTimeStr: string): { date: string; time: string } {
  let date = '';
  let time = '';
  
  // Formato ISO 8601: 2025-10-02T14:30:00Z o 2025-10-02T14:30:00 o 2025-10-02T14:30:00.000Z
  const dateTimeMatch = dateTimeStr.match(/(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?/);
  if (dateTimeMatch) {
    date = dateTimeMatch[1]; // YYYY-MM-DD
    time = `${dateTimeMatch[2]}:${dateTimeMatch[3]}`; // HH:MM
  } else {
    // Intentar solo fecha
    const dateMatch = dateTimeStr.match(/(\d{4}-\d{2}-\d{2})/);
    if (dateMatch) {
      date = dateMatch[1];
    }
  }
  
  return { date, time };
}

/**
 * Parsea un archivo KMZ y extrae información de ubicación
 * Los archivos KMZ son archivos ZIP que contienen archivos KML
 */
export async function parseKMZFile(file: File): Promise<ExtractedData[]> {
  try {
    // Leer el archivo como ArrayBuffer
    const arrayBuffer = await file.arrayBuffer();
    
    // Usar JSZip para descomprimir (si está disponible) o usar la API nativa
    // Por ahora, intentaremos leer el KML directamente si es un archivo simple
    // o usar la API de descompresión del navegador
    
    // Intentar descomprimir el KMZ (es un ZIP)
    const JSZip = (await import('jszip')).default;
    const zipFile = await JSZip.loadAsync(arrayBuffer);
    
    // Buscar el archivo KML dentro del ZIP
    let kmlContent = '';
    for (const fileName in zipFile.files) {
      if (fileName.endsWith('.kml') || fileName.endsWith('.KML')) {
        kmlContent = await zipFile.files[fileName].async('string');
        break;
      }
    }
    
    if (!kmlContent) {
      throw new Error('No se encontró archivo KML dentro del KMZ');
    }
    
    return parseKMLContent(kmlContent);
  } catch (error) {
    console.error('Error parsing KMZ file:', error);
    throw new Error(`Error al procesar archivo KMZ: ${error instanceof Error ? error.message : 'Error desconocido'}`);
  }
}

/**
 * Mapeo de nombres de meses en español a números
 */
const MONTHS_ES: { [key: string]: number } = {
  'enero': 1, 'febrero': 2, 'marzo': 3, 'abril': 4,
  'mayo': 5, 'junio': 6, 'julio': 7, 'agosto': 8,
  'septiembre': 9, 'octubre': 10, 'noviembre': 11, 'diciembre': 12
};

/**
 * Extrae fecha del nombre de un Folder (capa)
 * Intenta encontrar fechas en formatos comunes: YYYY-MM-DD, DD/MM/YYYY, y formatos en español
 */
function extractDateFromFolderName(folderName: string): { date: string; time: string } {
  let date = '';
  let time = '';
  
  // Formato YYYY-MM-DD (ej: "2025-10-07")
  const isoDateMatch = folderName.match(/(\d{4}-\d{2}-\d{2})/);
  if (isoDateMatch) {
    date = isoDateMatch[1];
    return { date, time };
  }
  
  // Formato en español: "Lunes 22 de Septiembre", "Martes 23 de Septiembre", etc.
  // Patrón: [Día de la semana] [DD] de [Mes]
  const spanishDateMatch = folderName.match(/(?:lunes|martes|miércoles|miercoles|jueves|viernes|sábado|sabado|domingo)\s+(\d{1,2})\s+de\s+(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)/i);
  if (spanishDateMatch) {
    const day = parseInt(spanishDateMatch[1]);
    const monthName = spanishDateMatch[2].toLowerCase();
    const month = MONTHS_ES[monthName];
    
    if (month && day >= 1 && day <= 31) {
      // Necesitamos determinar el año. Si no está en el nombre, usamos el año actual o inferimos del contexto
      // Por defecto, asumimos 2024 (año común para estos datos)
      // Si el mes es septiembre/octubre y estamos en 2025, podría ser 2024
      const currentYear = new Date().getFullYear();
      let year = currentYear;
      
      // Intentar buscar el año en el nombre del folder primero
      const yearMatch = folderName.match(/(\d{4})/);
      if (yearMatch) {
        const foundYear = parseInt(yearMatch[1]);
        if (foundYear >= 2020 && foundYear <= 2030) {
          year = foundYear;
        }
      }
      
      // Si no se encontró el año, inferirlo del contexto
      if (!yearMatch) {
        // Para datos de Google Maps, usar el año actual si estamos en ese año
        // Si estamos en 2025 y los datos son de septiembre/octubre 2025, usar 2025
        const currentMonth = new Date().getMonth() + 1;
        const currentDate = new Date();
        
        // Si el mes del folder es igual o anterior al mes actual del mismo año, usar año actual
        // Si el mes del folder es posterior al mes actual, podría ser del año anterior
        if (month <= currentMonth) {
          year = currentYear;
        } else {
          // Si el mes es futuro, probablemente es del año anterior
          year = currentYear - 1;
        }
        
        // Ajuste especial: si estamos en 2025 y los datos son de septiembre/octubre 2025
        // (meses recientes), usar 2025
        if (currentYear === 2025 && (month === 9 || month === 10)) {
          year = 2025;
        }
      }
      
      date = `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
      console.log(`📅 Fecha extraída de nombre español: "${folderName}" → ${date}`);
      return { date, time };
    }
  }
  
  // Formato DD/MM/YYYY o MM/DD/YYYY
  const slashDateMatch = folderName.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (slashDateMatch) {
    const [, part1, part2, year] = slashDateMatch;
    // Intentar determinar si es DD/MM o MM/DD (asumimos DD/MM para México)
    const day = parseInt(part1);
    const month = parseInt(part2);
    if (day <= 12 && month <= 12) {
      // Ambos podrían ser día o mes, usar el formato más común DD/MM
      date = `${year}-${part2.padStart(2, '0')}-${part1.padStart(2, '0')}`;
    } else if (day > 12) {
      // Claramente es DD/MM
      date = `${year}-${part2.padStart(2, '0')}-${part1.padStart(2, '0')}`;
    } else {
      // Probablemente es MM/DD
      date = `${year}-${part1.padStart(2, '0')}-${part2.padStart(2, '0')}`;
    }
    return { date, time };
  }
  
  // Formato DD-MM-YYYY
  const dashDateMatch = folderName.match(/(\d{1,2})-(\d{1,2})-(\d{4})/);
  if (dashDateMatch) {
    const [, part1, part2, year] = dashDateMatch;
    const day = parseInt(part1);
    const month = parseInt(part2);
    if (day > 12) {
      date = `${year}-${part2.padStart(2, '0')}-${part1.padStart(2, '0')}`;
    } else {
      date = `${year}-${part1.padStart(2, '0')}-${part2.padStart(2, '0')}`;
    }
    return { date, time };
  }
  
  return { date, time };
}

/**
 * Busca la fecha en un Folder (capa) y sus ancestros
 * Retorna la fecha encontrada en el Folder más cercano
 */
function findDateInFolderHierarchy(element: Element | null): { date: string; time: string } {
  let date = '';
  let time = '';
  
  if (!element) return { date, time };
  
  // Buscar en el Folder actual
  // 1. Buscar en TimeStamp del Folder
  const timeStampElement = element.querySelector('TimeStamp');
  if (timeStampElement) {
    const whenElement = timeStampElement.querySelector('when');
    if (whenElement && whenElement.textContent) {
      const dateTime = whenElement.textContent.trim();
      const parsed = parseDateTime(dateTime);
      if (parsed.date) {
        return parsed;
      }
    }
  }
  
  // 2. Buscar en TimeSpan del Folder
  const timeSpanElement = element.querySelector('TimeSpan');
  if (timeSpanElement) {
    const beginElement = timeSpanElement.querySelector('begin');
    if (beginElement && beginElement.textContent) {
      const dateTime = beginElement.textContent.trim();
      const parsed = parseDateTime(dateTime);
      if (parsed.date) {
        return parsed;
      }
    }
  }
  
  // 3. Buscar en el nombre del Folder (capa)
  const nameElement = element.querySelector('name');
  if (nameElement && nameElement.textContent) {
    const folderName = nameElement.textContent.trim();
    const parsed = extractDateFromFolderName(folderName);
    if (parsed.date) {
      return parsed;
    }
  }
  
  // 4. Buscar en la descripción del Folder
  const descriptionElement = element.querySelector('description');
  if (descriptionElement && descriptionElement.textContent) {
    const desc = descriptionElement.textContent.trim();
    const parsed = extractDateFromFolderName(desc);
    if (parsed.date) {
      return parsed;
    }
  }
  
  // Si no se encontró, buscar en el Folder padre
  let parent = element.parentElement;
  while (parent && parent.tagName !== 'kml' && parent.tagName !== 'Document') {
    if (parent.tagName === 'Folder' || parent.tagName === 'folder') {
      const parentDate = findDateInFolderHierarchy(parent);
      if (parentDate.date) {
        return parentDate;
      }
    }
    parent = parent.parentElement;
  }
  
  return { date, time };
}

/**
 * Parsea el contenido XML de un archivo KML y extrae información de ubicación
 * Ahora también busca fechas en los Folders (capas) que contienen los Placemarks
 */
function parseKMLContent(kmlContent: string): ExtractedData[] {
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(kmlContent, 'text/xml');
  
  // Verificar errores de parsing
  const parserError = xmlDoc.querySelector('parsererror');
  if (parserError) {
    throw new Error('Error al parsear el archivo KML: ' + parserError.textContent);
  }
  
  const results: ExtractedData[] = [];
  
  // Buscar todos los Placemarks en el KML
  const placemarks = xmlDoc.querySelectorAll('Placemark');
  
  placemarks.forEach((placemark) => {
    try {
      // Extraer coordenadas - buscar en diferentes lugares
      let latitude: number | null = null;
      let longitude: number | null = null;
      
      // Buscar coordenadas en Point
      const pointElement = placemark.querySelector('Point coordinates');
      const coordinatesElement = pointElement || placemark.querySelector('coordinates');
      
      if (coordinatesElement && coordinatesElement.textContent) {
        const coordsText = coordinatesElement.textContent.trim();
        // Las coordenadas pueden estar en una línea o múltiples líneas
        const coords = coordsText.split(/[\s,]+/).filter(c => c.trim());
        if (coords.length >= 2) {
          longitude = parseFloat(coords[0].trim());
          latitude = parseFloat(coords[1].trim());
        }
      }
      
      // Extraer fecha/hora - buscar en diferentes estructuras KML
      let dateStr = '';
      let timeStr = '';
      
      // 1. Buscar en TimeStamp del Placemark
      const timeStampElement = placemark.querySelector('TimeStamp');
      if (timeStampElement) {
        const whenElement = timeStampElement.querySelector('when');
        if (whenElement && whenElement.textContent) {
          const dateTime = whenElement.textContent.trim();
          const parsed = parseDateTime(dateTime);
          dateStr = parsed.date;
          timeStr = parsed.time;
        }
      }
      
      // 2. Buscar en TimeSpan del Placemark
      const timeSpanElement = placemark.querySelector('TimeSpan');
      if (timeSpanElement && !dateStr) {
        const beginElement = timeSpanElement.querySelector('begin');
        if (beginElement && beginElement.textContent) {
          const dateTime = beginElement.textContent.trim();
          const parsed = parseDateTime(dateTime);
          dateStr = parsed.date;
          timeStr = parsed.time;
        }
      }
      
      // 3. Buscar directamente en el Placemark
      if (!dateStr) {
        const whenElement = placemark.querySelector('when');
        const beginElement = placemark.querySelector('begin');
        const dateTimeElement = whenElement || beginElement;
        if (dateTimeElement && dateTimeElement.textContent) {
          const dateTime = dateTimeElement.textContent.trim();
          const parsed = parseDateTime(dateTime);
          dateStr = parsed.date;
          timeStr = parsed.time;
        }
      }
      
      // 4. NUEVO: Si no se encontró fecha en el Placemark, buscar en el Folder (capa) padre
      if (!dateStr) {
        let parent = placemark.parentElement;
        while (parent && parent.tagName !== 'kml' && parent.tagName !== 'Document') {
          if (parent.tagName === 'Folder' || parent.tagName === 'folder') {
            const folderDate = findDateInFolderHierarchy(parent);
            if (folderDate.date) {
              dateStr = folderDate.date;
              timeStr = folderDate.time;
              console.log(`📅 Fecha encontrada en Folder (capa): ${dateStr} ${timeStr ? `Hora: ${timeStr}` : ''}`);
              break;
            }
          }
          parent = parent.parentElement;
        }
      }
      
      // Extraer nombre/ubicación
      const nameElement = placemark.querySelector('name');
      const addressElement = placemark.querySelector('address');
      const descriptionElement = placemark.querySelector('description');
      
      let location = '';
      if (nameElement && nameElement.textContent) {
        location = nameElement.textContent.trim();
      } else if (addressElement && addressElement.textContent) {
        location = addressElement.textContent.trim();
      } else if (descriptionElement && descriptionElement.textContent) {
        // Intentar extraer dirección de la descripción
        const desc = descriptionElement.textContent.trim();
        location = desc;
      }
      
      // Solo agregar si tenemos al menos coordenadas o ubicación
      if (latitude !== null && longitude !== null) {
        console.log(`📍 Ubicación extraída del KMZ: ${location || 'Sin nombre'} - Fecha: ${dateStr || 'N/A'} ${timeStr ? `Hora: ${timeStr}` : ''} - Coord: ${latitude}, ${longitude}`);
        results.push({
          date: dateStr || '',
          time: timeStr || '',
          location: location || 'Ubicación sin nombre',
          latitude: latitude,
          longitude: longitude,
        });
      } else if (location) {
        // Si no hay coordenadas pero hay ubicación, intentar geocodificar después
        console.log(`📍 Ubicación extraída del KMZ (sin coordenadas): ${location} - Fecha: ${dateStr || 'N/A'}`);
        results.push({
          date: dateStr || '',
          time: timeStr || '',
          location: location,
          latitude: null,
          longitude: null,
        });
      }
    } catch (error) {
      console.warn('Error procesando un Placemark:', error);
    }
  });
  
  if (results.length === 0) {
    throw new Error('No se encontraron ubicaciones válidas en el archivo KML');
  }
  
  return results;
}

/**
 * Verifica si un archivo es KMZ o KML
 */
export function isKMZFile(file: File): boolean {
  const fileName = file.name.toLowerCase();
  return fileName.endsWith('.kmz') || fileName.endsWith('.kml');
}

/**
 * Función de depuración: Analiza la estructura de un KML para entender cómo están organizados los Folders
 * Útil para verificar dónde se encuentran las fechas en los archivos KMZ reales
 */
export async function debugKMZStructure(file: File): Promise<void> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const JSZip = (await import('jszip')).default;
    const zipFile = await JSZip.loadAsync(arrayBuffer);
    
    let kmlContent = '';
    for (const fileName in zipFile.files) {
      if (fileName.endsWith('.kml') || fileName.endsWith('.KML')) {
        kmlContent = await zipFile.files[fileName].async('string');
        break;
      }
    }
    
    if (!kmlContent) {
      console.error('No se encontró archivo KML dentro del KMZ');
      return;
    }
    
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(kmlContent, 'text/xml');
    
    console.log('=== ESTRUCTURA DEL KML ===');
    console.log('Archivo:', file.name);
    
    // Buscar todos los Folders
    const folders = xmlDoc.querySelectorAll('Folder');
    console.log(`\n📁 Total de Folders (capas) encontrados: ${folders.length}`);
    
    folders.forEach((folder, index) => {
      const nameElement = folder.querySelector('name');
      const folderName = nameElement?.textContent?.trim() || 'Sin nombre';
      
      const placemarks = folder.querySelectorAll('Placemark');
      console.log(`\n📁 Folder ${index + 1}: "${folderName}"`);
      console.log(`   - Placemarks dentro: ${placemarks.length}`);
      
      // Buscar fecha en el Folder
      const timeStamp = folder.querySelector('TimeStamp');
      const timeSpan = folder.querySelector('TimeSpan');
      const description = folder.querySelector('description');
      
      if (timeStamp) {
        const when = timeStamp.querySelector('when');
        console.log(`   - TimeStamp encontrado: ${when?.textContent || 'N/A'}`);
      }
      if (timeSpan) {
        const begin = timeSpan.querySelector('begin');
        const end = timeSpan.querySelector('end');
        console.log(`   - TimeSpan encontrado: begin=${begin?.textContent || 'N/A'}, end=${end?.textContent || 'N/A'}`);
      }
      if (description) {
        console.log(`   - Descripción: ${description.textContent?.substring(0, 100) || 'N/A'}...`);
      }
      
      // Intentar extraer fecha del nombre
      const extractedDate = extractDateFromFolderName(folderName);
      if (extractedDate.date) {
        console.log(`   ✅ Fecha extraída del nombre: ${extractedDate.date}`);
      }
    });
    
    // Buscar Placemarks fuera de Folders
    const allPlacemarks = xmlDoc.querySelectorAll('Placemark');
    const placemarksInFolders = Array.from(folders).reduce((count, folder) => {
      return count + folder.querySelectorAll('Placemark').length;
    }, 0);
    const placemarksOutsideFolders = allPlacemarks.length - placemarksInFolders;
    
    console.log(`\n📍 Total de Placemarks: ${allPlacemarks.length}`);
    console.log(`   - Dentro de Folders: ${placemarksInFolders}`);
    console.log(`   - Fuera de Folders: ${placemarksOutsideFolders}`);
    
    console.log('\n=== FIN DE ESTRUCTURA ===');
  } catch (error) {
    console.error('Error analizando estructura KMZ:', error);
  }
}

