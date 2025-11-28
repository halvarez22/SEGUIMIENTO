import JSZip from 'jszip';
import fs from 'fs';

async function createSampleKMZ() {
  // Crear contenido KML básico con algunos puntos de ejemplo
  const kmlContent = `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <name>Ruta de Ejemplo - Martes 23 de Septiembre</name>
    <Placemark>
      <name>1 - 6:07</name>
      <description>Punto inicial de la ruta</description>
      <Point>
        <coordinates>-101.692814739223,21.16407343611272,0</coordinates>
      </Point>
    </Placemark>
    <Placemark>
      <name>2 - 6:48</name>
      <description>Segundo punto</description>
      <Point>
        <coordinates>-101.7043435925101,21.16562442663307,0</coordinates>
      </Point>
    </Placemark>
    <Placemark>
      <name>3 - 7:59</name>
      <description>Tercer punto</description>
      <Point>
        <coordinates>-101.703063,21.1636042,0</coordinates>
      </Point>
    </Placemark>
    <Placemark>
      <name>4 - 8:03</name>
      <description>Cuarto punto</description>
      <Point>
        <coordinates>-101.6932644,21.1610228,0</coordinates>
      </Point>
    </Placemark>
    <Placemark>
      <name>25 - 20:29</name>
      <description>Punto final de la ruta</description>
      <Point>
        <coordinates>-101.692535,21.1635397,0</coordinates>
      </Point>
    </Placemark>
  </Document>
</kml>`;

  // Crear archivo ZIP con el KML
  const zip = new JSZip();
  zip.file('doc.kml', kmlContent);

  // Generar buffer del ZIP
  const buffer = await zip.generateAsync({ type: 'nodebuffer' });

  // Guardar como archivo KMZ
  fs.writeFileSync('public/ejemplo-ruta.kmz', buffer);

  console.log('✅ Archivo KMZ de ejemplo creado: public/ejemplo-ruta.kmz');
}

createSampleKMZ().catch(console.error);
