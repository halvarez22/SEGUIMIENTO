import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { db } from '../firebase/config';
import type { HistoryEntry, GeoData } from '../types';

export interface VisitFrequency {
  location: string;
  coordinates: { lat: number; lng: number };
  visitCount: number;
  lastVisit: string;
  averageTimeSpent?: number;
}

export interface RouteUsage {
  route: string;
  usageCount: number;
  totalPoints: number;
  averageDuration: number;
  mostUsedDay: string;
}

export interface TimeLocationQuery {
  date: string;
  startTime: string;
  endTime: string;
  locations: Array<{
    name: string;
    coordinates: { lat: number; lng: number };
    time: string;
  }>;
}

export class DataAnalysisService {

  /**
   * Obtiene los puntos más visitados
   */
  static async getMostVisitedPoints(limitCount: number = 10): Promise<VisitFrequency[]> {
    try {
      if (!db) {
        console.warn('Firebase no disponible, usando datos locales');
        return this.getMostVisitedPointsLocal(limitCount);
      }

      // Consulta a Firestore
      const q = query(collection(db, 'locations'), orderBy('visitCount', 'desc'), limit(limitCount));
      const querySnapshot = await getDocs(q);

      const results: VisitFrequency[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        results.push({
          location: data.location || 'Ubicación desconocida',
          coordinates: { lat: data.latitude, lng: data.longitude },
          visitCount: data.visitCount || 0,
          lastVisit: data.lastVisit || '',
          averageTimeSpent: data.averageTimeSpent
        });
      });

      return results;
    } catch (error) {
      console.error('Error obteniendo puntos más visitados:', error);
      return this.getMostVisitedPointsLocal(limitCount);
    }
  }

  /**
   * Versión local cuando Firebase no está disponible
   */
  private static getMostVisitedPointsLocal(limitCount: number = 10): VisitFrequency[] {
    try {
      const storedHistory = localStorage.getItem('analysisHistory');
      if (!storedHistory) return [];

      const history: HistoryEntry[] = JSON.parse(storedHistory);

      // Agrupar por coordenadas aproximadas (redondeadas a 4 decimales)
      const locationGroups: { [key: string]: VisitFrequency } = {};

      history.forEach(entry => {
        if (entry.data.latitude && entry.data.longitude) {
          const key = `${entry.data.latitude.toFixed(4)}_${entry.data.longitude.toFixed(4)}`;

          if (!locationGroups[key]) {
            locationGroups[key] = {
              location: entry.data.location || `Ubicación ${key}`,
              coordinates: { lat: entry.data.latitude, lng: entry.data.longitude },
              visitCount: 0,
              lastVisit: entry.timestamp
            };
          }

          locationGroups[key].visitCount++;
          if (entry.timestamp > locationGroups[key].lastVisit) {
            locationGroups[key].lastVisit = entry.timestamp;
          }
        }
      });

      // Convertir a array y ordenar por frecuencia
      return Object.values(locationGroups)
        .sort((a, b) => b.visitCount - a.visitCount)
        .slice(0, limitCount);

    } catch (error) {
      console.error('Error en análisis local:', error);
      return [];
    }
  }

  /**
   * Obtiene las rutas más utilizadas
   */
  static async getMostUsedRoutes(limitCount: number = 5): Promise<RouteUsage[]> {
    try {
      if (!db) {
        return this.getMostUsedRoutesLocal(limitCount);
      }

      // Consulta rutas más utilizadas
      const q = query(collection(db, 'routes'), orderBy('usageCount', 'desc'), limit(limitCount));
      const querySnapshot = await getDocs(q);

      const results: RouteUsage[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        results.push({
          route: data.routeName || 'Ruta sin nombre',
          usageCount: data.usageCount || 0,
          totalPoints: data.totalPoints || 0,
          averageDuration: data.averageDuration || 0,
          mostUsedDay: data.mostUsedDay || ''
        });
      });

      return results;
    } catch (error) {
      console.error('Error obteniendo rutas más utilizadas:', error);
      return this.getMostUsedRoutesLocal(limitCount);
    }
  }

  /**
   * Versión local de rutas más utilizadas
   */
  private static getMostUsedRoutesLocal(limitCount: number = 5): RouteUsage[] {
    try {
      const storedHistory = localStorage.getItem('analysisHistory');
      if (!storedHistory) return [];

      const history: HistoryEntry[] = JSON.parse(storedHistory);

      // Agrupar por fecha (cada fecha = una ruta)
      const routeGroups: { [key: string]: RouteUsage } = {};

      history.forEach(entry => {
        const date = entry.data.date;
        if (date) {
          if (!routeGroups[date]) {
            routeGroups[date] = {
              route: `Ruta del ${new Date(date).toLocaleDateString('es-ES')}`,
              usageCount: 0,
              totalPoints: 0,
              averageDuration: 0,
              mostUsedDay: date
            };
          }
          routeGroups[date].usageCount++;
          routeGroups[date].totalPoints++;
        }
      });

      return Object.values(routeGroups)
        .sort((a, b) => b.usageCount - a.usageCount)
        .slice(0, limitCount);

    } catch (error) {
      console.error('Error en análisis local de rutas:', error);
      return [];
    }
  }

  /**
   * Consulta ubicaciones por fecha y rango horario
   */
  static async getLocationsByTimeRange(
    date: string,
    startTime: string,
    endTime: string
  ): Promise<TimeLocationQuery> {
    try {
      if (!db) {
        return this.getLocationsByTimeRangeLocal(date, startTime, endTime);
      }

      // Consulta a Firestore por fecha y rango horario
      const q = query(
        collection(db, 'locations'),
        where('date', '==', date),
        orderBy('time')
      );

      const querySnapshot = await getDocs(q);
      const locations: TimeLocationQuery['locations'] = [];

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        const entryTime = data.time || '';

        // Verificar si la hora está en el rango
        if (this.isTimeInRange(entryTime, startTime, endTime)) {
          locations.push({
            name: data.location || 'Ubicación desconocida',
            coordinates: { lat: data.latitude, lng: data.longitude },
            time: entryTime
          });
        }
      });

      return {
        date,
        startTime,
        endTime,
        locations: locations.sort((a, b) => a.time.localeCompare(b.time))
      };

    } catch (error) {
      console.error('Error consultando por rango horario:', error);
      return this.getLocationsByTimeRangeLocal(date, startTime, endTime);
    }
  }

  /**
   * Versión local de consulta por rango horario
   */
  private static getLocationsByTimeRangeLocal(
    date: string,
    startTime: string,
    endTime: string
  ): TimeLocationQuery {
    try {
      const storedHistory = localStorage.getItem('analysisHistory');
      if (!storedHistory) {
        return { date, startTime, endTime, locations: [] };
      }

      const history: HistoryEntry[] = JSON.parse(storedHistory);
      const locations: TimeLocationQuery['locations'] = [];

      history.forEach(entry => {
        // Verificar fecha
        if (entry.data.date === date) {
          const entryTime = entry.data.time || '';

          // Verificar rango horario
          if (this.isTimeInRange(entryTime, startTime, endTime)) {
            locations.push({
              name: entry.data.location || 'Ubicación desconocida',
              coordinates: {
                lat: entry.data.latitude || 0,
                lng: entry.data.longitude || 0
              },
              time: entryTime
            });
          }
        }
      });

      return {
        date,
        startTime,
        endTime,
        locations: locations.sort((a, b) => a.time.localeCompare(b.time))
      };

    } catch (error) {
      console.error('Error en consulta local por rango:', error);
      return { date, startTime, endTime, locations: [] };
    }
  }

  /**
   * Verifica si una hora está dentro de un rango (maneja rangos como "11:33 a 16:01")
   */
  private static isTimeInRange(timeStr: string, startTime: string, endTime: string): boolean {
    if (!timeStr) return false;

    // Si es un rango, usar la hora de inicio
    const startHour = timeStr.includes('a') ? timeStr.split('a')[0].trim() : timeStr;

    try {
      const entryTime = new Date(`2000-01-01T${startHour}:00`).getTime();
      const startLimit = new Date(`2000-01-01T${startTime}:00`).getTime();
      const endLimit = new Date(`2000-01-01T${endTime}:00`).getTime();

      return entryTime >= startLimit && entryTime <= endLimit;
    } catch (error) {
      console.warn('Error parseando hora:', timeStr);
      return false;
    }
  }

  /**
   * Genera estadísticas generales
   */
  static async getGeneralStats(): Promise<{
    totalPoints: number;
    totalDays: number;
    totalLocations: number;
    dateRange: { start: string; end: string };
  }> {
    try {
      if (!db) {
        return this.getGeneralStatsLocal();
      }

      // Consulta básica para estadísticas
      const querySnapshot = await getDocs(collection(db, 'locations'));
      const locations = new Set<string>();
      const dates = new Set<string>();
      let totalPoints = 0;

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        totalPoints++;
        if (data.location) locations.add(data.location);
        if (data.date) dates.add(data.date);
      });

      const dateArray = Array.from(dates).sort();

      return {
        totalPoints,
        totalDays: dates.size,
        totalLocations: locations.size,
        dateRange: {
          start: dateArray[0] || '',
          end: dateArray[dateArray.length - 1] || ''
        }
      };

    } catch (error) {
      console.error('Error obteniendo estadísticas:', error);
      return this.getGeneralStatsLocal();
    }
  }

  /**
   * Estadísticas locales
   */
  private static getGeneralStatsLocal(): {
    totalPoints: number;
    totalDays: number;
    totalLocations: number;
    dateRange: { start: string; end: string };
  } {
    try {
      const storedHistory = localStorage.getItem('analysisHistory');
      if (!storedHistory) {
        return { totalPoints: 0, totalDays: 0, totalLocations: 0, dateRange: { start: '', end: '' } };
      }

      const history: HistoryEntry[] = JSON.parse(storedHistory);
      const locations = new Set<string>();
      const dates = new Set<string>();

      history.forEach(entry => {
        if (entry.data.location) locations.add(entry.data.location);
        if (entry.data.date) dates.add(entry.data.date);
      });

      const dateArray = Array.from(dates).sort();

      return {
        totalPoints: history.length,
        totalDays: dates.size,
        totalLocations: locations.size,
        dateRange: {
          start: dateArray[0] || '',
          end: dateArray[dateArray.length - 1] || ''
        }
      };

    } catch (error) {
      console.error('Error en estadísticas locales:', error);
      return { totalPoints: 0, totalDays: 0, totalLocations: 0, dateRange: { start: '', end: '' } };
    }
  }
}
