/**
 * Utilidades para geocodificación inversa (convertir coordenadas a direcciones)
 */

interface GeocodingResult {
  address: string;
  success: boolean;
}

/**
 * Convierte coordenadas a una dirección legible usando Nominatim (OpenStreetMap)
 * Servicio gratuito, sin API key requerida
 * 
 * @param latitude Latitud
 * @param longitude Longitud
 * @returns Dirección legible o null si falla
 */
export async function reverseGeocode(
  latitude: number,
  longitude: number
): Promise<string | null> {
  try {
    // Usar Nominatim (OpenStreetMap) - servicio gratuito
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`;
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Seguimiento_MAPS/1.0' // Nominatim requiere User-Agent
      }
    });

    if (!response.ok) {
      console.warn(`⚠️ Error en geocodificación inversa: ${response.status}`);
      return null;
    }

    const data = await response.json();
    
    if (data.error) {
      console.warn(`⚠️ Error en geocodificación: ${data.error}`);
      return null;
    }

    // Construir dirección legible desde los componentes
    const address = data.address;
    if (!address) return null;

    // Formato: Calle + Número, Colonia, Ciudad, Estado
    const parts: string[] = [];
    
    // Calle y número
    if (address.road) {
      const houseNumber = address.house_number ? `${address.house_number}` : '';
      parts.push(`${address.road}${houseNumber ? ' ' + houseNumber : ''}`.trim());
    }
    
    // Colonia o suburbio
    if (address.suburb || address.neighbourhood) {
      parts.push(address.suburb || address.neighbourhood);
    }
    
    // Ciudad
    if (address.city || address.town || address.village) {
      parts.push(address.city || address.town || address.village);
    }
    
    // Estado
    if (address.state) {
      parts.push(address.state);
    }

    // Si no hay partes, usar display_name completo
    if (parts.length === 0 && data.display_name) {
      return data.display_name;
    }

    return parts.join(', ') || data.display_name || null;
  } catch (error) {
    console.error('❌ Error en geocodificación inversa:', error);
    return null;
  }
}

/**
 * Obtiene una dirección legible para una entrada del historial.
 * Prioriza el campo location existente, y si no está disponible o es genérico,
 * hace geocodificación inversa.
 * 
 * @param entry Entrada del historial
 * @returns Dirección legible
 */
export async function getReadableAddress(entry: {
  location?: string;
  latitude: number | null;
  longitude: number | null;
}): Promise<string> {
  // Si ya tenemos una ubicación legible, usarla
  if (entry.location && entry.location.trim() && 
      entry.location !== 'Ubicación sin nombre' &&
      entry.location !== 'Unknown Location' &&
      !entry.location.match(/^-?\d+\.\d+,\s*-?\d+\.\d+$/)) { // No es solo coordenadas
    return entry.location;
  }

  // Si tenemos coordenadas pero no ubicación legible, hacer reverse geocoding
  if (entry.latitude !== null && entry.longitude !== null) {
    const address = await reverseGeocode(entry.latitude, entry.longitude);
    if (address) {
      return address;
    }
  }

  // Fallback: usar coordenadas si no hay otra opción
  if (entry.latitude !== null && entry.longitude !== null) {
    return `${entry.latitude.toFixed(6)}, ${entry.longitude.toFixed(6)}`;
  }

  return 'Ubicación desconocida';
}

/**
 * Procesa múltiples entradas en paralelo (con límite de concurrencia)
 * para evitar sobrecargar el servicio de geocodificación
 */
export async function getReadableAddresses(
  entries: Array<{ location?: string; latitude: number | null; longitude: number | null }>,
  concurrency: number = 5
): Promise<string[]> {
  const results: string[] = [];
  
  // Procesar en lotes para no sobrecargar el servicio
  for (let i = 0; i < entries.length; i += concurrency) {
    const batch = entries.slice(i, i + concurrency);
    const batchResults = await Promise.all(
      batch.map(entry => getReadableAddress(entry))
    );
    results.push(...batchResults);
    
    // Pequeña pausa entre lotes para respetar rate limits de Nominatim
    if (i + concurrency < entries.length) {
      await new Promise(resolve => setTimeout(resolve, 1000)); // 1 segundo entre lotes
    }
  }
  
  return results;
}

