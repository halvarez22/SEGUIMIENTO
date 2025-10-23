/**
 * Servicio de geocoding inverso para convertir coordenadas en direcciones legibles
 */

export interface GeocodingResult {
  display_name: string;
  address?: {
    road?: string;
    suburb?: string;
    city?: string;
    town?: string;
    village?: string;
    municipality?: string;
    county?: string;
    state?: string;
    country?: string;
  };
}

export class GeocodingService {
  private static readonly NOMINATIM_BASE_URL = 'https://nominatim.openstreetmap.org/reverse';
  private static lastRequestTime: number = 0;

  /**
   * Genera dirección aproximada basada en coordenadas conocidas (fallback offline)
   */
  public static generateApproximateAddress(latitude: number, longitude: number): string {
    // Coordenadas aproximadas de ciudades principales de México
    const cities = [
      { name: 'León, Guanajuato', lat: 21.1221, lng: -101.6841, radius: 0.1 },
      { name: 'Irapuato, Guanajuato', lat: 20.6767, lng: -101.3563, radius: 0.08 },
      { name: 'Celaya, Guanajuato', lat: 20.5222, lng: -100.8122, radius: 0.06 },
      { name: 'Silao, Guanajuato', lat: 20.9439, lng: -101.4278, radius: 0.05 },
      { name: 'Guanajuato Capital', lat: 21.0190, lng: -101.2574, radius: 0.08 },
      { name: 'San Miguel de Allende, Guanajuato', lat: 20.9149, lng: -100.7439, radius: 0.05 },
      { name: 'Querétaro, Querétaro', lat: 20.5888, lng: -100.3899, radius: 0.08 },
      { name: 'Aguascalientes, Aguascalientes', lat: 21.8764, lng: -102.2960, radius: 0.06 },
      { name: 'Zacatecas, Zacatecas', lat: 22.7709, lng: -102.5833, radius: 0.06 },
      { name: 'San Luis Potosí, SLP', lat: 22.1565, lng: -100.9855, radius: 0.08 },
      { name: 'México DF', lat: 19.4326, lng: -99.1332, radius: 0.15 },
      { name: 'Guadalajara, Jalisco', lat: 20.6597, lng: -103.3496, radius: 0.12 },
      { name: 'Monterrey, Nuevo León', lat: 25.6866, lng: -100.3161, radius: 0.12 },
      { name: 'Puebla, Puebla', lat: 19.0414, lng: -98.2063, radius: 0.08 },
      { name: 'Tijuana, Baja California', lat: 32.5149, lng: -117.0382, radius: 0.08 },
      { name: 'Juárez, Chihuahua', lat: 31.6904, lng: -106.4245, radius: 0.06 }
    ];

    // Buscar la ciudad más cercana
    let closestCity = cities[0];
    let minDistance = Number.MAX_VALUE;

    for (const city of cities) {
      const distance = Math.sqrt(
        Math.pow(latitude - city.lat, 2) + Math.pow(longitude - city.lng, 2)
      );
      if (distance < minDistance) {
        minDistance = distance;
        closestCity = city;
      }
    }

    // Si está dentro del radio de la ciudad, devolver dirección aproximada
    if (minDistance <= closestCity.radius) {
      // Calcular dirección aproximada dentro de la ciudad
      const latDiff = latitude - closestCity.lat;
      const lngDiff = longitude - closestCity.lng;

      let direction = '';
      if (Math.abs(latDiff) > Math.abs(lngDiff)) {
        direction = latDiff > 0 ? 'Norte' : 'Sur';
      } else {
        direction = lngDiff > 0 ? 'Este' : 'Oeste';
      }

      const distance = Math.sqrt(latDiff * latDiff + lngDiff * lngDiff) * 111; // km aproximados
      if (distance < 0.5) {
        return `Centro de ${closestCity.name}`;
      } else {
        return `${direction} de ${closestCity.name} (${(distance).toFixed(1)} km)`;
      }
    }

    // Si no está cerca de ninguna ciudad conocida, devolver zona general
    if (longitude < -105) return 'Noroeste de México';
    if (longitude > -95) return 'Sureste de México';
    if (latitude > 22) return 'Norte de México';
    return 'Centro de México';
  }

  /**
   * Convierte coordenadas (latitude, longitude) en una dirección legible
   */
  static async reverseGeocode(latitude: number, longitude: number): Promise<string> {
    try {
      // Usar un timeout para evitar esperas largas
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // Timeout más corto

      const params = new URLSearchParams({
        format: 'json',
        lat: latitude.toString(),
        lon: longitude.toString(),
        zoom: '18',
        addressdetails: '1',
        'accept-language': 'es'
      });

      // Delay más largo para evitar rate limiting (2 segundos entre llamadas)
      if (this.lastRequestTime) {
        const timeSinceLastRequest = Date.now() - this.lastRequestTime;
        if (timeSinceLastRequest < 2000) {
          await new Promise(resolve => setTimeout(resolve, 2000 - timeSinceLastRequest));
        }
      }
      this.lastRequestTime = Date.now();

      const response = await fetch(`${this.NOMINATIM_BASE_URL}?${params}`, {
        method: 'GET',
        headers: {
          'User-Agent': 'KMZ-Map-Viewer/1.0',
          'Accept': 'application/json',
          'Cache-Control': 'no-cache'
        },
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Error en geocoding: ${response.status} ${response.statusText}`);
      }

      const data: GeocodingResult = await response.json();
      return this.formatAddress(data);

    } catch (error) {
      // Si Nominatim falla, usar geocoding aproximado offline
      console.debug('Nominatim no disponible, usando geocoding aproximado:', error.message);
      return this.generateApproximateAddress(latitude, longitude);
    }
  }

  /**
   * Formatea el resultado de geocoding en una dirección legible
   */
  private static formatAddress(result: GeocodingResult): string {
    if (!result.address) {
      return result.display_name || 'Ubicación desconocida';
    }

    const addr = result.address;
    const parts: string[] = [];

    // Construir dirección de manera jerárquica
    if (addr.road) {
      parts.push(addr.road);
    }

    // Agregar zona urbana
    if (addr.suburb) {
      parts.push(addr.suburb);
    } else if (addr.city) {
      parts.push(addr.city);
    } else if (addr.town) {
      parts.push(addr.town);
    } else if (addr.village) {
      parts.push(addr.village);
    } else if (addr.municipality) {
      parts.push(addr.municipality);
    }

    // Agregar estado/provincia
    if (addr.county && !parts.includes(addr.county)) {
      parts.push(addr.county);
    }

    if (addr.state && !parts.includes(addr.state)) {
      parts.push(addr.state);
    }

    // Agregar país solo si es diferente a México
    if (addr.country && addr.country !== 'México' && addr.country !== 'Mexico') {
      parts.push(addr.country);
    }

    return parts.length > 0 ? parts.join(', ') : result.display_name;
  }

  /**
   * Cache de geocoding para evitar llamadas repetidas
   */
  private static cache = new Map<string, string>();

  /**
   * Versión cacheada del geocoding inverso
   */
  static async reverseGeocodeCached(latitude: number, longitude: number): Promise<string> {
    const key = `${latitude.toFixed(6)}_${longitude.toFixed(6)}`;

    if (this.cache.has(key)) {
      return this.cache.get(key)!;
    }

    const address = await this.reverseGeocode(latitude, longitude);
    this.cache.set(key, address);
    return address;
  }

  /**
   * Limpia el cache de geocoding
   */
  static clearCache(): void {
    this.cache.clear();
  }
}
