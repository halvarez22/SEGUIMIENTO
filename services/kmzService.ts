import JSZip from 'jszip';
import { DOMParser } from 'xmldom';
import { kml } from '@tmcw/togeojson';
import type { KMZDataSource, KMZData, KMZFeature, Coordinate, Geometry, GeoData } from '../types';

/**
 * Parsea un archivo KMZ y extrae las features geoespaciales
 */
export const parseKMZFile = async (kmzData: KMZDataSource): Promise<KMZData> => {
  try {
    // Descomprimir el archivo KMZ
    const zip = await JSZip.loadAsync(kmzData.data);

    // Buscar archivo KML dentro del ZIP
    const kmlFile = Object.keys(zip.files).find(fileName =>
      fileName.toLowerCase().endsWith('.kml')
    );

    if (!kmlFile) {
      throw new Error('No se encontró un archivo KML válido dentro del archivo KMZ');
    }

    // Leer el contenido del archivo KML
    const kmlContent = await zip.files[kmlFile].async('text');

    // Parsear KML a DOM
    const kmlDom = new DOMParser().parseFromString(kmlContent, 'text/xml');

    // Convertir KML a GeoJSON usando togeojson
    const geoJson = kml(kmlDom);

    // Extraer features del GeoJSON
    const features: KMZFeature[] = [];

    if (geoJson && geoJson.features) {
      geoJson.features.forEach((feature: any, index: number) => {
        const kmzFeature = convertGeoJSONFeatureToKMZFeature(feature, index);
        if (kmzFeature) {
          features.push(kmzFeature);
        }
      });
    }

    // Extraer metadatos si están disponibles
    const metadata = extractKMLMetadata(kmlDom);

    return {
      features,
      metadata
    };

  } catch (error) {
    console.error('Error parsing KMZ file:', error);
    throw new Error(`Error al procesar el archivo KMZ: ${error instanceof Error ? error.message : 'Error desconocido'}`);
  }
};

/**
 * Convierte una feature de GeoJSON a nuestro formato KMZFeature
 */
function convertGeoJSONFeatureToKMZFeature(feature: any, index: number): KMZFeature | null {
  try {
    const geometry = convertGeoJSONGeometryToGeometry(feature.geometry);
    if (!geometry) return null;

    // Extraer propiedades
    const properties = feature.properties || {};

    // Generar ID único
    const id = feature.id || `feature_${index}_${Date.now()}`;

    // Extraer timestamp si existe
    let timestamp: string | undefined;
    let date: string | undefined;
    let time: string | undefined;

    if (properties.timestamp || properties.begin || properties.end) {
      const ts = properties.timestamp || properties.begin || properties.end;
      if (ts) {
        const dateObj = new Date(ts);
        if (!isNaN(dateObj.getTime())) {
          timestamp = dateObj.toISOString();
          date = dateObj.toISOString().split('T')[0];
          time = dateObj.toTimeString().substring(0, 5);
        }
      }
    }

    // Extraer nombre y descripción
    const name = properties.name || `Feature ${index + 1}`;
    const description = properties.description || '';

    return {
      id,
      name,
      description,
      geometry,
      timestamp,
      date,
      time,
      properties
    };

  } catch (error) {
    console.error('Error converting GeoJSON feature:', error);
    return null;
  }
}

/**
 * Convierte geometría de GeoJSON a nuestro formato Geometry
 */
function convertGeoJSONGeometryToGeometry(geoGeometry: any): Geometry | null {
  if (!geoGeometry || !geoGeometry.type) return null;

  try {
    switch (geoGeometry.type) {
      case 'Point':
        const [lng, lat, alt] = geoGeometry.coordinates;
        return {
          type: 'Point',
          coordinates: [{
            latitude: lat,
            longitude: lng,
            altitude: alt
          }]
        };

      case 'LineString':
        const lineCoords: Coordinate[] = geoGeometry.coordinates.map(([lng, lat, alt]: [number, number, number?]) => ({
          latitude: lat,
          longitude: lng,
          altitude: alt
        }));
        return {
          type: 'LineString',
          coordinates: lineCoords
        };

      case 'Polygon':
        const polygonCoords: Coordinate[][] = geoGeometry.coordinates.map((ring: [number, number, number?][]) =>
          ring.map(([lng, lat, alt]) => ({
            latitude: lat,
            longitude: lng,
            altitude: alt
          }))
        );
        return {
          type: 'Polygon',
          coordinates: polygonCoords
        };

      default:
        console.warn(`Geometry type ${geoGeometry.type} not supported`);
        return null;
    }
  } catch (error) {
    console.error('Error converting geometry:', error);
    return null;
  }
}

/**
 * Extrae metadatos del documento KML
 */
function extractKMLMetadata(kmlDom: any): { name?: string; description?: string; created?: string } {
  const metadata: { name?: string; description?: string; created?: string } = {};

  try {
    // Verificar si es un documento DOM válido
    if (!kmlDom || typeof kmlDom.getElementsByTagName !== 'function') {
      console.warn('kmlDom is not a valid DOM document');
      return metadata;
    }

    // Buscar nombre del documento
    const nameElements = kmlDom.getElementsByTagName('name');
    if (nameElements.length > 0 && nameElements[0].textContent) {
      metadata.name = nameElements[0].textContent.trim();
    }

    // Buscar descripción del documento
    const descElements = kmlDom.getElementsByTagName('description');
    if (descElements.length > 0 && descElements[0].textContent) {
      metadata.description = descElements[0].textContent.trim();
    }

    // Fecha de creación (si está disponible)
    const created = new Date().toISOString();
    metadata.created = created;

  } catch (error) {
    console.error('Error extracting KML metadata:', error);
  }

  return metadata;
}

/**
 * Convierte datos KMZ a formato GeoData compatible con la aplicación
 */
// Función auxiliar para extraer fecha del nombre del archivo
const extractDateFromFileName = (fileName: string): string => {
  if (!fileName) return '';

  // Patrones para nombres de archivos como:
  // "Jueves 2 de Octubre.kmz", "Lunes 20 de Octubre.kmz", etc.
  const monthMap: { [key: string]: string } = {
    'enero': '01', 'febrero': '02', 'marzo': '03', 'abril': '04',
    'mayo': '05', 'junio': '06', 'julio': '07', 'agosto': '08',
    'septiembre': '09', 'octubre': '10', 'noviembre': '11', 'diciembre': '12'
  };

  // Buscar patrón: "Día número de Mes"
  const dateMatch = fileName.match(/(\d{1,2})\s+de\s+(\w+)/i);
  if (dateMatch) {
    const day = dateMatch[1].padStart(2, '0');
    const monthName = dateMatch[2].toLowerCase();
    const month = monthMap[monthName];

    if (month) {
      // Asumir año 2025 por contexto
      return `2025-${month}-${day}`;
    }
  }

  return '';
};

export const convertKMZToGeoData = (kmzData: KMZData, fileName?: string): GeoData[] => {
  // Extraer fecha del nombre del archivo
  const extractedDate = extractDateFromFileName(fileName || '');

  return kmzData.features.map(feature => {
    // Para geometrías Point, usar las primeras coordenadas
    let latitude: number | null = null;
    let longitude: number | null = null;

    if (feature.geometry.type === 'Point' && Array.isArray(feature.geometry.coordinates) && feature.geometry.coordinates.length > 0) {
      const coord = feature.geometry.coordinates[0];
      if (typeof coord === 'object' && 'latitude' in coord && 'longitude' in coord) {
        latitude = coord.latitude;
        longitude = coord.longitude;
      }
    }

    // Usar timestamp o generar uno basado en el nombre/feature
    const timestamp = feature.timestamp || new Date().toISOString();

    // Extraer fecha del archivo KMZ o asignar fecha base
    let date = extractedDate || feature.date || '';

    // Si aún no hay fecha, intentar extraer del nombre del archivo en el contexto de la app
    if (!date && fileName) {
      // Para "Jueves 2 de Octubre.kmz" -> "2025-10-02"
      const dateMatch = fileName.match(/(\d{1,2})\s+de\s+(\w+)\s+de\s+(\d{4})/i);
      if (dateMatch) {
        const day = dateMatch[1].padStart(2, '0');
        const monthName = dateMatch[2].toLowerCase();
        const year = dateMatch[3];

        const monthMap: { [key: string]: string } = {
          'enero': '01', 'febrero': '02', 'marzo': '03', 'abril': '04',
          'mayo': '05', 'junio': '06', 'julio': '07', 'agosto': '08',
          'septiembre': '09', 'octubre': '10', 'noviembre': '11', 'diciembre': '12'
        };

        const month = monthMap[monthName];
        if (month) {
          date = `${year}-${month}-${day}`;
        }
      }
    }

    // Último fallback
    if (!date) {
      date = '2025-10-02'; // Fecha base por defecto para archivos sin fecha
    }

    // EXTRAER HORA ÚNICAMENTE DEL NAME (manejar rangos: "1 - 8:50" o "5 - 11:33 a 16:01")
    let time = '';

    if (feature.name) {
      // Patrón para detectar rangos horarios: "número - HH:MM a HH:MM"
      const rangeMatch = feature.name.match(/(\d+)\s*-\s*(\d{1,2}:\d{2})(?:\s*a\s*(\d{1,2}:\d{2}))?/);
      if (rangeMatch) {
        const horaInicio = rangeMatch[2];
        const horaFin = rangeMatch[3];

        if (horaFin) {
          // Es un rango: "11:33 a 16:01"
          time = `${horaInicio} a ${horaFin}`;
        } else {
          // Es una hora simple: "08:50"
          time = horaInicio;
        }
      } else {
        // Fallback: buscar cualquier patrón de hora
        const anyTimeMatch = feature.name.match(/(\d{1,2}:\d{2}(?::\d{2})?)/);
        if (anyTimeMatch) {
          time = anyTimeMatch[1].substring(0, 5);
        }
      }
    }

    // NO usar feature.time, timestamp u otras fuentes - solo del name

    // Si no hay fecha del archivo, intentar extraer del nombre/descripción
    if (!date) {
      // Intentar encontrar patrón de fecha en el nombre/descripción
      const dateMatch = (feature.name + ' ' + feature.description).match(/(\d{4}-\d{2}-\d{2}|\d{2}\/\d{2}\/\d{4}|\d{2}-\d{2}-\d{4})/);
      if (dateMatch) {
        date = dateMatch[1];
        // Si el formato es DD/MM/YYYY o DD-MM-YYYY, convertir a YYYY-MM-DD
        if (date.match(/^\d{2}[\/\-]\d{2}[\/\-]\d{4}$/)) {
          const parts = date.split(/[\/\-]/);
          date = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
        }
      }
    }

    return {
      date,
      time,
      location: feature.name || feature.description || 'Ubicación sin nombre',
      latitude,
      longitude,
      geometry: feature.geometry,
      kmzId: feature.id,
      name: feature.name,
      description: feature.description,
      properties: feature.properties
    };
  });
};
