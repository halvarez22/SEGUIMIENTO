import React, { useEffect, useRef, useState } from 'react';
import type { HistoryEntry, Geometry, Coordinate } from '../types';
import { GeocodingService } from '../services/geocodingService';

// Since we can't import types from leaflet without adding a dependency,
// we'll declare the L object from the global scope.
declare const L: any;

interface MapDisplayProps {
  entries: HistoryEntry[];
  selectedDate?: string | null;
}

// Helper to create the icon SVG string with type-specific inner symbols
const createMarkerIconSVG = (color: string, type: 'start' | 'end' | 'intermediate' = 'intermediate') => {
  let innerIcon;
  switch (type) {
    case 'start':
      // A triangle "play" icon, indicating the beginning of a route
      innerIcon = `<path d="M14 12 L20 16 L14 20 Z" fill="${color}"/>`;
      break;
    case 'end':
      // A square "stop" icon, indicating the end of a route
      innerIcon = `<rect x="13" y="13" width="6" height="6" fill="${color}"/>`;
      break;
    case 'intermediate':
    default:
      // A simple circle for intermediate points or single points
      innerIcon = `<circle cx="16" cy="16" r="4" fill="${color}"/>`;
      break;
  }
  
  return `
    <svg viewBox="0 0 32 48" xmlns="http://www.w3.org/2000/svg" style="filter: drop-shadow(0px 2px 3px rgba(0, 0, 0, 0.5));">
      <path d="M16 0C7.163 0 0 7.163 0 16c0 8.837 16 32 16 32s16-23.163 16-32C32 7.163 24.837 0 16 0z" fill="${color}"/>
      <circle cx="16" cy="16" r="7" fill="#FFFFFF"/>
      ${innerIcon}
    </svg>
  `;
};

// Add styles to ensure the custom icon's container is transparent.
const style = document.createElement('style');
style.innerHTML = `
  .custom-map-marker .leaflet-div-icon {
    background: transparent !important;
    border: none !important;
  }
  /* Tooltip styling - compact version */
  .leaflet-tooltip.custom-leaflet-tooltip {
    background: transparent;
    border: none;
    box-shadow: none;
    padding: 0;
  }
`;
if (!document.head.querySelector('#custom-marker-style')) {
  style.id = 'custom-marker-style';
  document.head.appendChild(style);
}

export const MapDisplay: React.FC<MapDisplayProps> = ({ entries, selectedDate }) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const layerGroupRef = useRef<any>(null); // To hold all markers and polylines
  const [geocodedAddresses, setGeocodedAddresses] = useState<Map<string, string>>(new Map());
  const [geocodingLoading, setGeocodingLoading] = useState<Set<string>>(new Set());

  // Función para geocodificar direcciones
  const geocodeCoordinates = async (latitude: number, longitude: number): Promise<string> => {
    const key = `${latitude.toFixed(6)}_${longitude.toFixed(6)}`;
    if (geocodedAddresses.has(key)) {
      return geocodedAddresses.get(key)!;
    }

    // Marcar como cargando
    setGeocodingLoading(prev => new Set(prev.add(key)));

    try {
      const address = await GeocodingService.reverseGeocodeCached(latitude, longitude);
      setGeocodedAddresses(prev => new Map(prev.set(key, address)));
      setGeocodingLoading(prev => {
        const newSet = new Set(prev);
        newSet.delete(key);
        return newSet;
      });
      return address;
    } catch (error) {
      console.warn('Error geocoding coordinates:', error);
      const fallbackAddress = `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
      setGeocodedAddresses(prev => new Map(prev.set(key, fallbackAddress)));
      setGeocodingLoading(prev => {
        const newSet = new Set(prev);
        newSet.delete(key);
        return newSet;
      });
      return fallbackAddress;
    }
  };

  // Función auxiliar para extraer hora de inicio de un timeText (maneja rangos)
  const extractStartTime = (timeText: string): string => {
    if (!timeText) return '00:00';

    // Si es un rango como "11:33 a 16:01", tomar la primera hora
    const rangeMatch = timeText.match(/^(\d{1,2}:\d{2})/);
    if (rangeMatch) {
      return rangeMatch[1];
    }

    // Si es una hora simple
    return timeText;
  };

  // Función para calcular el número consecutivo del punto en la ruta del día seleccionado
  const getPointIndexInDay = (entry: HistoryEntry, allEntries: HistoryEntry[]): number => {
    if (!selectedDate) return -1;

    // Filtrar solo las entradas del día seleccionado y ordenarlas cronológicamente
    const dayEntries = allEntries
      .filter(e => e.data.date === selectedDate)
      .sort((a, b) => {
        const timeA = extractStartTime(a.data.time || '');
        const timeB = extractStartTime(b.data.time || '');
        const dateTimeA = new Date(`${a.data.date}T${timeA}:00`).getTime();
        const dateTimeB = new Date(`${b.data.date}T${timeB}:00`).getTime();
        return dateTimeA - dateTimeB;
      });

    // Encontrar el índice de esta entrada en el día seleccionado
    return dayEntries.findIndex(e => e.id === entry.id);
  };

  // Efecto para geocodificar todas las coordenadas cuando cambian los entries
  useEffect(() => {
    const geocodeAllCoordinates = async () => {
      const coordinatesToGeocode: Array<{ lat: number; lng: number }> = [];

      entries.forEach(entry => {
        if (entry.data.geometry?.type === 'Point' && entry.data.geometry.coordinates.length > 0) {
          const coord = entry.data.geometry.coordinates[0];
          if (typeof coord === 'object' && 'latitude' in coord && 'longitude' in coord) {
            coordinatesToGeocode.push({ lat: coord.latitude, lng: coord.longitude });
          }
        } else if (entry.data.latitude !== null && entry.data.longitude !== null) {
          coordinatesToGeocode.push({ lat: entry.data.latitude, lng: entry.data.longitude });
        }
      });

      // Geocodificar solo las coordenadas únicas, máximo 5 a la vez para evitar rate limiting
      const uniqueCoords = coordinatesToGeocode.filter((coord, index, arr) =>
        arr.findIndex(c => c.lat === coord.lat && c.lng === coord.lng) === index
      );

      // Procesar en lotes de 1 para evitar rate limiting de Nominatim
      const batchSize = 1;
      for (let i = 0; i < uniqueCoords.length; i += batchSize) {
        const batch = uniqueCoords.slice(i, i + batchSize);
        await Promise.all(batch.map(coord => geocodeCoordinates(coord.lat, coord.lng)));

        // Delay más largo entre requests para evitar bloqueo
        if (i + batchSize < uniqueCoords.length) {
          await new Promise(resolve => setTimeout(resolve, 3000)); // 3 segundos entre requests
        }
      }
    };

    if (entries.length > 0 && entries.length <= 10) { // Solo geocodificar si no hay demasiados puntos
      geocodeAllCoordinates();
    }
  }, [entries]);

  // Initialize map
  useEffect(() => {
    if (mapContainerRef.current && !mapRef.current && typeof L !== 'undefined') {
      mapRef.current = L.map(mapContainerRef.current, {
        zoomControl: true, // Explicitly enable zoom controls
      }).setView([20.5, -100.5], 5); // Default view

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      }).addTo(mapRef.current);

      // Initialize the layer group and add it to the map
      layerGroupRef.current = L.layerGroup().addTo(mapRef.current);
    }
    
    // Cleanup on unmount
    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []); // Empty dependency array means this runs once on mount

  // Helper function to render geometry on map
  const renderGeometry = (geometry: Geometry, entry: HistoryEntry, color: string = '#2563EB', markerType: 'start' | 'end' | 'intermediate' = 'intermediate', pointIndex?: number, allEntries?: HistoryEntry[]) => {
    const bounds: [number, number][] = [];

    switch (geometry.type) {
      case 'Point':
        if (Array.isArray(geometry.coordinates) && geometry.coordinates.length > 0) {
          const coord = geometry.coordinates[0];
          if (typeof coord === 'object' && 'latitude' in coord && 'longitude' in coord) {
            bounds.push([coord.latitude, coord.longitude]);

            // Create marker with tooltip for individual points
            const icon = L.divIcon({
              html: createMarkerIconSVG(color, markerType),
              className: 'custom-map-marker',
              iconSize: [32, 48],
              iconAnchor: [16, 48],
              popupAnchor: [0, -48]
            });

            const cardContent = createTooltipContent(entry, pointIndex, allEntries);
            L.marker([coord.latitude, coord.longitude], { icon })
              .addTo(layerGroupRef.current)
              .bindPopup(cardContent)
              .bindTooltip(cardContent, {
                sticky: true,
                className: 'custom-leaflet-tooltip'
              });
          }
        }
        break;

      case 'LineString':
        if (Array.isArray(geometry.coordinates)) {
          const lineCoords: [number, number][] = geometry.coordinates
            .filter(coord => typeof coord === 'object' && 'latitude' in coord && 'longitude' in coord)
            .map(coord => [coord.latitude, coord.longitude]);
          bounds.push(...lineCoords);

          L.polyline(lineCoords, {
            color: color,
            weight: 4,
            opacity: 0.8
          }).addTo(layerGroupRef.current);

          // Add markers at start and end of line
          if (lineCoords.length > 0) {
            const startIcon = L.divIcon({
              html: createMarkerIconSVG('#16A34A', 'start'),
              className: 'custom-map-marker',
              iconSize: [32, 48],
              iconAnchor: [16, 48],
              popupAnchor: [0, -48]
            });
            const endIcon = L.divIcon({
              html: createMarkerIconSVG('#DC2626', 'end'),
              className: 'custom-map-marker',
              iconSize: [32, 48],
              iconAnchor: [16, 48],
              popupAnchor: [0, -48]
            });

            // Start marker (sin tooltip para no interferir con marcadores individuales)
            L.marker(lineCoords[0], { icon: startIcon })
              .addTo(layerGroupRef.current);

            // End marker (sin tooltip para no interferir con marcadores individuales)
            if (lineCoords.length > 1) {
              L.marker(lineCoords[lineCoords.length - 1], { icon: endIcon })
                .addTo(layerGroupRef.current);
            }

            // Intermediate markers for LineString - only if we have many points
            if (lineCoords.length > 3) {
              for (let i = 1; i < lineCoords.length - 1; i++) {
                const intermediateIcon = L.divIcon({
                  html: createMarkerIconSVG('#2563EB', 'intermediate'),
                  className: 'custom-map-marker',
                  iconSize: [24, 36], // Smaller for intermediate points
                  iconAnchor: [12, 36],
                  popupAnchor: [0, -36]
                });

                L.marker(lineCoords[i], { icon: intermediateIcon })
                  .addTo(layerGroupRef.current);
              }
            }
          }
        }
        break;

      case 'Polygon':
        if (Array.isArray(geometry.coordinates)) {
          const polygonCoords: [number, number][][] = geometry.coordinates
            .filter(ring => Array.isArray(ring))
            .map(ring => ring
              .filter(coord => typeof coord === 'object' && 'latitude' in coord && 'longitude' in coord)
              .map(coord => [coord.latitude, coord.longitude])
            );
          bounds.push(...polygonCoords.flat());

          L.polygon(polygonCoords, {
            color: color,
            weight: 2,
            opacity: 0.8,
            fillColor: color,
            fillOpacity: 0.2
          }).addTo(layerGroupRef.current);

          // Add marker at centroid
          if (polygonCoords.length > 0 && polygonCoords[0].length > 0) {
            const centroid = calculateCentroid(polygonCoords[0]);
            if (centroid) {
              bounds.push(centroid);

            const icon = L.divIcon({
              html: createMarkerIconSVG(color, markerType),
              className: 'custom-map-marker',
              iconSize: [32, 48],
              iconAnchor: [16, 48],
              popupAnchor: [0, -48]
            });

              const cardContent = createTooltipContent(entry, pointIndex, entries);
              L.marker(centroid, { icon })
                .addTo(layerGroupRef.current)
                .bindPopup(cardContent)
                .bindTooltip(cardContent, {
                  sticky: true,
                  className: 'custom-leaflet-tooltip'
                });
            }
          }
        }
        break;
    }

    return bounds;
  };

  // Helper function to create tooltip content (compact version)
  const createTooltipContent = (entry: HistoryEntry, pointIndex?: number, allEntries?: HistoryEntry[]) => {
    let dateText = entry.data.date || 'N/A';
    let timeText = entry.data.time || 'N/A';

    // Si no hay fecha, usar fecha del archivo KMZ o fecha actual
    if (dateText === 'N/A') {
      // Intentar extraer fecha del nombre del archivo si está disponible
      dateText = '2025-10-02'; // Fecha base para el archivo "Jueves 2 de Octubre"
    }

    // Si no hay hora, intentar extraer del nombre del punto
    if (timeText === 'N/A' || !timeText) {
      const pointName = entry.data.name || entry.data.location || '';

      // Patrón para detectar rangos horarios: "número - HH:MM a HH:MM"
      const rangeMatch = pointName.match(/(\d+)\s*-\s*(\d{1,2}:\d{2})(?:\s*a\s*(\d{1,2}:\d{2}))?/);
      if (rangeMatch) {
        const horaInicio = rangeMatch[2];
        const horaFin = rangeMatch[3];

        if (horaFin) {
          // Es un rango: "11:33 a 16:01"
          timeText = `${horaInicio} a ${horaFin}`;
        } else {
          // Es una hora simple: "08:50"
          timeText = horaInicio;
        }
      } else {
        // Fallback: buscar cualquier patrón de hora
        const anyTimeMatch = pointName.match(/(\d{1,2}:\d{2}(?::\d{2})?)/);
        if (anyTimeMatch) {
          timeText = anyTimeMatch[1].substring(0, 5);
        }
      }
    }

    // Obtener dirección geocodificada si hay coordenadas
    let locationText = entry.data.location || entry.data.name || 'N/A';
    if (entry.data.latitude !== null && entry.data.longitude !== null) {
      const key = `${entry.data.latitude.toFixed(6)}_${entry.data.longitude.toFixed(6)}`;
      if (geocodedAddresses.has(key)) {
        locationText = geocodedAddresses.get(key)!;
      } else if (geocodingLoading.has(key)) {
        // Mostrar indicador de carga mientras se geocodifica
        locationText = 'Cargando dirección...';
      } else {
        // Si no hay geocodificación, usar geocoding offline aproximado inmediatamente
        try {
          // Llamar directamente al geocoding offline como fallback inmediato
          GeocodingService.reverseGeocodeCached(entry.data.latitude, entry.data.longitude)
            .then(address => {
              setGeocodedAddresses(prev => new Map(prev.set(key, address)));
            })
            .catch(error => {
              // Fallback final: dirección aproximada basada en coordenadas
              const approxAddress = GeocodingService.generateApproximateAddress(entry.data.latitude, entry.data.longitude);
              setGeocodedAddresses(prev => new Map(prev.set(key, approxAddress)));
            });
          locationText = 'Calculando dirección...';
        } catch (error) {
          locationText = `${entry.data.latitude.toFixed(4)}, ${entry.data.longitude.toFixed(4)}`;
        }
      }
    }

    // Calcular número consecutivo - EXTRAER DEL NOMBRE DEL PUNTO (como "1 - 8:50")
    let pointNumber = '';

    // PRIMERO: intentar extraer el número directamente del nombre del punto
    const pointName = entry.data.name || entry.data.location || '';
    const numberMatch = pointName.match(/^(\d+)\s*-\s*/);
    if (numberMatch) {
      pointNumber = `Punto ${numberMatch[1]}`;
    } else {
      // SEGUNDO: usar lógica de ordenamiento cronológico como fallback
      if (selectedDate && allEntries) {
        // Si hay día seleccionado, mostrar número en la ruta del día
        const dayIndex = getPointIndexInDay(entry, allEntries);
        if (dayIndex >= 0) {
          pointNumber = `Punto ${dayIndex + 1}`;
        }
      } else if (allEntries) {
        // Si no hay día seleccionado, mostrar número basado en orden cronológico general
        const sortedEntries = [...allEntries].sort((a, b) => {
          const timeA = extractStartTime(a.data.time || '');
          const timeB = extractStartTime(b.data.time || '');
          const dateTimeA = new Date(`${a.data.date}T${timeA}:00`).getTime();
          const dateTimeB = new Date(`${b.data.date}T${timeB}:00`).getTime();
          return dateTimeA - dateTimeB;
        });
        const globalIndex = sortedEntries.findIndex(e => e.id === entry.id);
        if (globalIndex >= 0) {
          pointNumber = `Punto ${globalIndex + 1}`;
        }
      } else if (pointIndex !== undefined) {
        pointNumber = `Punto ${pointIndex + 1}`;
      }
    }

    return `
      <div style="background: rgba(31, 41, 55, 0.95); color: #f9fafb; padding: 8px 12px; border-radius: 6px; border: 1px solid #4b5563; box-shadow: 0 4px 12px rgba(0,0,0,0.5); font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 12px; line-height: 1.4; max-width: 250px;">
        ${pointNumber ? `<div style="font-weight: 700; margin-bottom: 4px; color: #fbbf24;">🏷️ ${pointNumber}</div>` : ''}
        <div style="font-weight: 600; margin-bottom: 4px; color: #60a5fa;">📅 ${dateText} ${timeText}</div>
        <div style="color: #d1d5db;">📍 ${locationText}</div>
      </div>`;
  };

  // Helper function to calculate centroid of polygon
  const calculateCentroid = (coords: [number, number][]): [number, number] | null => {
    if (coords.length === 0) return null;

    let latSum = 0;
    let lngSum = 0;

    coords.forEach(([lat, lng]) => {
      latSum += lat;
      lngSum += lng;
    });

    return [latSum / coords.length, lngSum / coords.length];
  };

  // Update markers and geometries when props change
  useEffect(() => {
    if (mapRef.current && layerGroupRef.current) {
      // Clear existing markers and routes
      layerGroupRef.current.clearLayers();

      const allBounds: [number, number][] = [];

      // Sort entries by timestamp for route creation
      const sortedEntries = [...entries].sort((a, b) => {
        const timeA = new Date(a.timestamp).getTime();
        const timeB = new Date(b.timestamp).getTime();
        return timeA - timeB;
      });

      // If we have multiple entries, create a route connecting them (chronologically ordered)
      if (sortedEntries.length > 1) {
        // Collect all valid coordinates for the route
        const routePoints: Coordinate[] = [];

        sortedEntries.forEach((entry) => {
          if (entry.data.geometry && entry.data.geometry.type === 'Point' &&
              Array.isArray(entry.data.geometry.coordinates) && entry.data.geometry.coordinates.length > 0) {
            const coord = entry.data.geometry.coordinates[0];
            if (typeof coord === 'object' && 'latitude' in coord && 'longitude' in coord) {
              routePoints.push(coord);
            }
          } else if (entry.data.latitude !== null && entry.data.longitude !== null) {
            routePoints.push({
              latitude: entry.data.latitude,
              longitude: entry.data.longitude
            });
          }
        });

        // If we have at least 2 points, create a route line
        if (routePoints.length >= 2) {
          const routeGeometry: Geometry = {
            type: 'LineString',
            coordinates: routePoints
          };

          // Create a route entry for rendering - NO agregar al array de entries
          const routeEntry: HistoryEntry = {
            id: 'route_' + Date.now(),
            data: {
              date: '',
              time: '',
              location: 'Ruta seguida',
              latitude: null,
              longitude: null,
              geometry: routeGeometry,
              name: 'Ruta seguida',
              description: `Ruta con ${routePoints.length} puntos`,
              properties: {}
            },
            timestamp: new Date().toISOString(),
            source: 'kmz'
          };

          // SOLO renderizar la geometría de la ruta, no agregar al estado
          const bounds = renderGeometry(routeGeometry, routeEntry, '#2563EB', 'intermediate', undefined, entries);
          allBounds.push(...bounds);
        }
      }

      // Process each individual entry for markers (sorted chronologically)
      sortedEntries.forEach((entry, chronologicalIndex) => {
        let color = '#2563EB'; // Default blue
        let markerType: 'start' | 'end' | 'intermediate' = 'intermediate';

        // Assign colors based on chronological position: green for start, red for end, blue for intermediate
        if (sortedEntries.length > 1) {
          if (chronologicalIndex === 0) {
            color = '#16A34A'; // Green for start
            markerType = 'start';
          } else if (chronologicalIndex === sortedEntries.length - 1) {
            color = '#DC2626'; // Red for end
            markerType = 'end';
          } else {
            color = '#2563EB'; // Blue for intermediate
            markerType = 'intermediate';
          }
        }

        // Check if entry has geometry (KMZ data)
        if (entry.data.geometry) {
          const bounds = renderGeometry(entry.data.geometry, entry, color, markerType, chronologicalIndex, entries);
          allBounds.push(...bounds);
        }
        // Fallback to legacy latitude/longitude format
        else if (entry.data.latitude !== null && entry.data.longitude !== null) {
          const geometry: Geometry = {
            type: 'Point',
            coordinates: [{
              latitude: entry.data.latitude,
              longitude: entry.data.longitude
            }]
          };
          const bounds = renderGeometry(geometry, entry, color, markerType, chronologicalIndex, entries);
          allBounds.push(...bounds);
        }
      });

      // Adjust map view to fit all geometries
      if (allBounds.length > 0) {
        mapRef.current.flyToBounds(allBounds, { padding: [50, 50], maxZoom: 15 });
      }
    }
  }, [entries, geocodedAddresses]);

  return <div ref={mapContainerRef} className="z-0 h-[250px] sm:h-[300px] md:h-[400px] lg:h-[500px] w-full rounded-lg overflow-hidden" />;
};
