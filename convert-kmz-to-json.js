import fs from 'fs';
import JSZip from 'jszip';
import { DOMParser } from 'xmldom';
import { kml } from '@tmcw/togeojson';

async function convertKMZToJSON(kmzPath, outputPath) {
  try {
    console.log(`Convirtiendo ${kmzPath}...`);

    // Leer archivo KMZ
    const buffer = fs.readFileSync(kmzPath);
    const zip = await JSZip.loadAsync(buffer);

    // Extraer KML
    const kmlContent = await zip.files['doc.kml'].async('text');

    // Parsear KML a DOM
    const parser = new DOMParser();
    const kmlDom = parser.parseFromString(kmlContent, 'text/xml');

    // Convertir a GeoJSON
    const geoJson = kml(kmlDom);

    // Procesar features
    const features = [];
    if (geoJson && geoJson.features) {
      geoJson.features.forEach((feature, index) => {
        const name = feature.properties?.name || `Point ${index + 1}`;

        // Extraer hora del nombre (formato: "1 - 6:07")
        const timeMatch = name.match(/(\d+)\s*-\s*(\d{1,2}):(\d{2})/);
        let date = '';
        let time = '';

        if (timeMatch) {
          time = `${timeMatch[2].padStart(2, '0')}:${timeMatch[3]}`;
          // Intentar extraer fecha del nombre del archivo
          const fileName = kmzPath.split('/').pop().split('\\').pop();
          const dateMatch = fileName.match(/(\d{1,2})\s+de\s+(\w+)\s+de\s+(\d{4})/i);
          if (dateMatch) {
            const day = dateMatch[1].padStart(2, '0');
            const month = getMonthNumber(dateMatch[2]);
            const year = dateMatch[3];
            date = `${year}-${month}-${day}`;
          }
        }

        // Extraer coordenadas
        let latitude = null;
        let longitude = null;

        if (feature.geometry?.type === 'Point' && feature.geometry.coordinates) {
          [longitude, latitude] = feature.geometry.coordinates;
        }

        const geoFeature = {
          id: `${kmzPath.split('/').pop()}_${index}`,
          name: name,
          description: feature.properties?.description || '',
          date: date,
          time: time,
          location: name,
          latitude: latitude,
          longitude: longitude,
          geometry: feature.geometry,
          properties: feature.properties || {},
          source: 'kmz'
        };

        features.push(geoFeature);
      });
    }

    // Crear objeto de resultado
    const result = {
      fileName: kmzPath.split('/').pop(),
      features: features,
      metadata: {
        totalPoints: features.length,
        dateRange: features.length > 0 ? {
          start: features[0].date,
          end: features[features.length - 1].date
        } : null
      }
    };

    // Guardar como JSON
    fs.writeFileSync(outputPath, JSON.stringify(result, null, 2));
    console.log(`✅ Convertido: ${features.length} puntos guardados en ${outputPath}`);

    return result;

  } catch (error) {
    console.error(`❌ Error convirtiendo ${kmzPath}:`, error.message);
    return null;
  }
}

function getMonthNumber(monthName) {
  const months = {
    'enero': '01', 'febrero': '02', 'marzo': '03', 'abril': '04',
    'mayo': '05', 'junio': '06', 'julio': '07', 'agosto': '08',
    'septiembre': '09', 'octubre': '10', 'noviembre': '11', 'diciembre': '12'
  };
  return months[monthName.toLowerCase()] || '01';
}

// Ejecutar conversión
async function main() {
  // Obtener todos los archivos KMZ disponibles
  const kmzFiles = fs.readdirSync('./kmz')
    .filter(f => f.endsWith('.kmz'))
    .map(f => './kmz/' + f);

  for (const kmzFile of kmzFiles) {
    const outputFile = `./public/kmz-data/${kmzFile.split('/').pop().replace('.kmz', '.json')}`;
    await convertKMZToJSON(kmzFile, outputFile);
  }

  console.log('🎉 Conversión completada!');
}

main().catch(console.error);

export { convertKMZToJSON };
