// Tipos para coordenadas y geometrías
export interface Coordinate {
  latitude: number;
  longitude: number;
  altitude?: number;
}

export interface Geometry {
  type: 'Point' | 'LineString' | 'Polygon';
  coordinates: Coordinate[] | Coordinate[][] | Coordinate[][][];
}

// Tipos para datos extraídos (compatibilidad hacia atrás)
export interface ExtractedData {
  date: string;
  time: string;
  location: string;
  latitude: number | null;
  longitude: number | null;
}

// Nuevos tipos para datos KMZ
export interface KMZFeature {
  id: string;
  name: string;
  description: string;
  geometry: Geometry;
  timestamp?: string; // ISO string
  date?: string; // YYYY-MM-DD
  time?: string; // HH:MM
  properties?: Record<string, any>; // Propiedades adicionales
}

// Tipo unificado para datos geoespaciales
export interface GeoData {
  // Campos comunes
  date: string;
  time: string;
  location: string;
  latitude: number | null;
  longitude: number | null;

  // Campos específicos de KMZ
  geometry?: Geometry;
  kmzId?: string;
  name?: string;
  description?: string;
  properties?: Record<string, any>;
}

// Unificar interfaces de historial
export interface HistoryEntry {
  id: string;
  data: GeoData;
  preview?: string; // Para compatibilidad con imágenes (opcional ahora)
  timestamp: string;
  source: 'image' | 'kmz'; // Indica el origen de los datos
}

// Interfaces para archivos KMZ
export interface KMZData {
  features: KMZFeature[];
  metadata?: {
    name?: string;
    description?: string;
    created?: string;
  };
}

export interface ImageDataSource {
  mimeType: string;
  data: string;
}

export interface KMZDataSource {
  fileName: string;
  data: ArrayBuffer;
}