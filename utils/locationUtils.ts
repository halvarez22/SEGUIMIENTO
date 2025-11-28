import type { HistoryEntry } from '../types';

export interface MostVisitedPlace {
  location: string;
  latitude: number | null; // Coordenada del centroide (centro del círculo de 100m)
  longitude: number | null; // Coordenada del centroide (centro del círculo de 100m)
  visitCount: number;
  entries: HistoryEntry[];
  // Información adicional
  visitDates: string[]; // Fechas únicas de visita (YYYY-MM-DD)
  timeRange: { min: string; max: string } | null; // Rango de horarios (HH:MM)
  allTimes: string[]; // Todos los horarios de visita
}

/**
 * Calcula la distancia en kilómetros entre dos puntos geográficos usando la fórmula de Haversine
 */
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Radio de la Tierra en kilómetros
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Encuentra los lugares más visitados del historial.
 * Agrupa lugares por coordenadas (si están disponibles) o por nombre de ubicación.
 * @param history El historial completo de entradas
 * @param limit Número máximo de lugares a retornar (por defecto 3)
 * @param distanceThreshold Distancia máxima en km para considerar dos coordenadas como el mismo lugar (por defecto 0.1 km = 100m)
 * @param excludeHomeGeofence Si es true, excluye los lugares más visitados (casa/trabajo) y sus alrededores
 * @param geofenceRadius Radio en km para la geocerca alrededor de los lugares a excluir (por defecto 0.2 km = 200m)
 * @param excludeTopN Número de lugares más visitados a excluir directamente (por defecto 2, casa y trabajo)
 * @returns Array de los lugares más visitados ordenados por frecuencia (excluyendo casa/trabajo y sus alrededores)
 */
export function getMostVisitedPlaces(
  history: HistoryEntry[],
  limit: number = 3,
  distanceThreshold: number = 0.1,
  excludeHomeGeofence: boolean = true,
  geofenceRadius: number = 0.2,
  excludeTopN: number = 2
): MostVisitedPlace[] {
  if (history.length === 0) {
    return [];
  }

  // Agrupar entradas por lugar
  const placeMap = new Map<string, HistoryEntry[]>();

  // Primero, agrupar por coordenadas si están disponibles
  const entriesWithCoords = history.filter(
    (entry) => entry.data.latitude !== null && entry.data.longitude !== null
  );
  const entriesWithoutCoords = history.filter(
    (entry) => entry.data.latitude === null || entry.data.longitude === null
  );

  // Procesar entradas con coordenadas
  for (const entry of entriesWithCoords) {
    const lat = entry.data.latitude!;
    const lon = entry.data.longitude!;
    let foundGroup = false;

    // Buscar si esta entrada pertenece a algún grupo existente
    for (const [key, entries] of placeMap.entries()) {
      // Solo comparar con grupos que tienen coordenadas
      const coordsEntries = entries.filter(
        (e) => e.data.latitude !== null && e.data.longitude !== null
      );
      if (coordsEntries.length === 0) continue;

      // Calcular el centroide del grupo (promedio de coordenadas)
      const avgLat =
        coordsEntries.reduce((sum, e) => sum + e.data.latitude!, 0) /
        coordsEntries.length;
      const avgLon =
        coordsEntries.reduce((sum, e) => sum + e.data.longitude!, 0) /
        coordsEntries.length;

      const distance = calculateDistance(lat, lon, avgLat, avgLon);
      if (distance <= distanceThreshold) {
        // Pertenece a este grupo
        entries.push(entry);
        foundGroup = true;
        break;
      }
    }

    // Si no pertenece a ningún grupo, crear uno nuevo
    if (!foundGroup) {
      const key = `${lat.toFixed(6)},${lon.toFixed(6)}`;
      placeMap.set(key, [entry]);
    }
  }

  // Procesar entradas sin coordenadas, agrupar por nombre de ubicación
  for (const entry of entriesWithoutCoords) {
    const locationName = entry.data.location?.trim().toLowerCase() || 'unknown';
    const existingEntries = placeMap.get(`name:${locationName}`);
    if (existingEntries) {
      existingEntries.push(entry);
    } else {
      placeMap.set(`name:${locationName}`, [entry]);
    }
  }

  // Convertir el mapa a array y calcular estadísticas
  const places: MostVisitedPlace[] = Array.from(placeMap.entries()).map(
    ([key, entries]) => {
      const firstEntry = entries[0];
      // Si es un grupo por coordenadas, usar la ubicación más común o la primera
      let locationName = firstEntry.data.location || 'Ubicación desconocida';
      
      // Si hay múltiples entradas, intentar encontrar el nombre más común
      if (entries.length > 1) {
        const locationCounts = new Map<string, number>();
        entries.forEach((e) => {
          const loc = e.data.location?.trim() || 'Ubicación desconocida';
          locationCounts.set(loc, (locationCounts.get(loc) || 0) + 1);
        });
        const mostCommon = Array.from(locationCounts.entries()).sort(
          (a, b) => b[1] - a[1]
        )[0];
        locationName = mostCommon[0];
      }

      // Calcular coordenadas: usar centroide si hay múltiples entradas con coordenadas
      let finalLat: number | null = firstEntry.data.latitude;
      let finalLon: number | null = firstEntry.data.longitude;
      
      const coordsEntries = entries.filter(
        (e) => e.data.latitude !== null && e.data.longitude !== null
      );
      if (coordsEntries.length > 1) {
        // Calcular centroide (centro del círculo de 100m)
        finalLat =
          coordsEntries.reduce((sum, e) => sum + e.data.latitude!, 0) /
          coordsEntries.length;
        finalLon =
          coordsEntries.reduce((sum, e) => sum + e.data.longitude!, 0) /
          coordsEntries.length;
      } else if (coordsEntries.length === 1) {
        finalLat = coordsEntries[0].data.latitude;
        finalLon = coordsEntries[0].data.longitude;
      }

      // Calcular fechas de visita (únicas)
      const datesSet = new Set<string>();
      entries.forEach((e) => {
        if (e.data.date && /^\d{4}-\d{2}-\d{2}$/.test(e.data.date)) {
          datesSet.add(e.data.date);
        }
      });
      const visitDates = Array.from(datesSet).sort();

      // Calcular horarios de visita
      const times: string[] = [];
      entries.forEach((e) => {
        if (e.data.time && /^\d{2}:\d{2}$/.test(e.data.time)) {
          times.push(e.data.time);
        }
      });
      
      let timeRange: { min: string; max: string } | null = null;
      if (times.length > 0) {
        const sortedTimes = [...times].sort();
        timeRange = {
          min: sortedTimes[0],
          max: sortedTimes[sortedTimes.length - 1],
        };
      }

      return {
        location: locationName,
        latitude: finalLat,
        longitude: finalLon,
        visitCount: entries.length,
        entries: entries,
        visitDates: visitDates,
        timeRange: timeRange,
        allTimes: times,
      };
    }
  );

  // Ordenar por número de visitas (descendente)
  const sortedPlaces = places.sort((a, b) => b.visitCount - a.visitCount);

  // Crear geocerca basada en los lugares más visitados (casa/trabajo) para excluirlos
  let geofenceCenters: Array<{ latitude: number; longitude: number; visitCount: number }> = [];
  const placesToExclude = new Set<number>(); // Índices de lugares a excluir directamente
  
  if (excludeHomeGeofence && sortedPlaces.length > excludeTopN) {
    // Excluir los top N lugares más visitados directamente (casa, trabajo, etc.)
    for (let i = 0; i < excludeTopN && i < sortedPlaces.length; i++) {
      const place = sortedPlaces[i];
      placesToExclude.add(i);
      
      // Si tiene coordenadas, agregarlo a la geocerca para excluir lugares cercanos también
      if (place.latitude !== null && place.longitude !== null) {
        geofenceCenters.push({
          latitude: place.latitude,
          longitude: place.longitude,
          visitCount: place.visitCount
        });
      }
    }
    
    // Si hay múltiples centros de geocerca cercanos, unirlos en un solo centro
    if (geofenceCenters.length > 1) {
      const mergedCenters: Array<{ latitude: number; longitude: number; visitCount: number }> = [];
      const processed = new Set<number>();
      
      for (let i = 0; i < geofenceCenters.length; i++) {
        if (processed.has(i)) continue;
        
        const current = geofenceCenters[i];
        const nearby: Array<{ latitude: number; longitude: number; visitCount: number }> = [current];
        processed.add(i);
        
        // Buscar otros centros cercanos (dentro de 500m)
        for (let j = i + 1; j < geofenceCenters.length; j++) {
          if (processed.has(j)) continue;
          
          const other = geofenceCenters[j];
          const distance = calculateDistance(
            current.latitude,
            current.longitude,
            other.latitude,
            other.longitude
          );
          
          if (distance <= 0.5) {
            nearby.push(other);
            processed.add(j);
          }
        }
        
        // Si hay múltiples centros cercanos, calcular el centroide
        if (nearby.length > 1) {
          const totalVisits = nearby.reduce((sum, c) => sum + c.visitCount, 0);
          const weightedLat = nearby.reduce((sum, c) => sum + c.latitude * c.visitCount, 0) / totalVisits;
          const weightedLon = nearby.reduce((sum, c) => sum + c.longitude * c.visitCount, 0) / totalVisits;
          
          mergedCenters.push({
            latitude: weightedLat,
            longitude: weightedLon,
            visitCount: totalVisits
          });
        } else {
          mergedCenters.push(current);
        }
      }
      
      geofenceCenters = mergedCenters;
    }
  }

  // Filtrar lugares: excluir los top N lugares directamente Y los que están dentro de la geocerca
  let filteredPlaces = sortedPlaces.filter((place, index) => {
    // Excluir directamente los top N lugares más visitados
    if (placesToExclude.has(index)) {
      return false;
    }
    
    // Si no tiene coordenadas, mantenerlo (no podemos verificar si está en la geocerca)
    if (place.latitude === null || place.longitude === null) {
      return true;
    }

    // Si no hay geocerca definida, mantener todos los lugares
    if (geofenceCenters.length === 0) {
      return true;
    }

    // Verificar si el lugar está dentro de alguna de las geocercas
    for (const center of geofenceCenters) {
      const distance = calculateDistance(
        center.latitude,
        center.longitude,
        place.latitude!,
        place.longitude!
      );
      // Si está dentro del radio de la geocerca, excluirlo
      if (distance <= geofenceRadius) {
        return false;
      }
    }

    // Si no está dentro de ninguna geocerca, mantenerlo
    return true;
  });

  // Retornar los top N lugares (excluyendo casa/trabajo y sus alrededores)
  return filteredPlaces.slice(0, limit);
}

/**
 * Obtiene el color de la medalla según la posición (1, 2, 3)
 */
export function getMedalColor(position: number): string {
  switch (position) {
    case 1:
      return '#FCD34D'; // Amarillo dorado (oro)
    case 2:
      return '#9CA3AF'; // Gris plateado (plata)
    case 3:
      return '#EA580C'; // Naranja (bronce)
    default:
      return '#3B82F6'; // Azul por defecto
  }
}

