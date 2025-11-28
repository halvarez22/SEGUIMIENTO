// Script para inspeccionar archivos KMZ
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const kmzDir = './kmz';
const files = fs.readdirSync(kmzDir).filter(f => f.endsWith('.kmz'));

console.log('Analizando archivos KMZ...');
console.log('Total de archivos:', files.length);

files.slice(0, 5).forEach(filename => {
  const filePath = path.join(kmzDir, filename);
  const stats = fs.statSync(filePath);

  console.log(`\nArchivo: ${filename}`);
  console.log(`  Tamaño: ${stats.size} bytes`);
  console.log(`  Modificado: ${stats.mtime.toISOString()}`);

  // Leer primeros bytes para ver si es un ZIP válido
  const buffer = fs.readFileSync(filePath);
  const header = buffer.slice(0, 4).toString('hex');
  console.log(`  Header ZIP: ${header} (${header === '504b0304' ? 'VALIDO' : 'INVALIDO'})`);

  // Si es muy pequeño, mostrar contenido
  if (stats.size < 1000) {
    console.log(`  Contenido (primeros 200 bytes):`);
    console.log(buffer.slice(0, 200).toString('utf8').replace(/[^\x20-\x7E\n]/g, '.'));
  }
});
