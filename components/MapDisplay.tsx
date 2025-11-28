import React, { useEffect, useRef } from 'react';
import type { HistoryEntry } from '../types';
import { calculateDistance } from '../utils/locationUtils';

// Since we can't import types from leaflet without adding a dependency,
// we'll declare the L object from the global scope.
declare const L: any;

interface HighlightedPlace {
  latitude: number;
  longitude: number;
  color: string;
  distanceThreshold: number; // en km
  centerMarker?: boolean; // Si es true, centra el mapa y muestra marcador especial en el centroide
}

interface MapDisplayProps {
  entries: HistoryEntry[];
  highlightedPlace?: HighlightedPlace | null;
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
  /* Tooltip styling */
  .leaflet-tooltip.custom-leaflet-tooltip {
    background-color: #1f2937; /* bg-gray-800 */
    color: #f9fafb; /* text-gray-100 */
    border: 1px solid #4b5563; /* border-gray-600 */
    border-radius: 8px; /* rounded-lg */
    padding: 0;
    box-shadow: 0 4px 12px rgba(0,0,0,0.5);
    white-space: normal; /* Allow word wrap */
  }
  .custom-tooltip-content {
    max-width: 280px;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol";
  }
  .custom-tooltip-content h4 {
    font-weight: 700;
    margin: 0;
    padding: 8px 12px;
    font-size: 1em;
    border-bottom: 1px solid #4b5563;
  }
  .custom-tooltip-content .route-start {
    background-color: rgba(22, 163, 74, 0.2);
    color: #4ade80; /* green-400 */
  }
  .custom-tooltip-content .route-end {
    background-color: rgba(220, 38, 38, 0.2);
    color: #f87171; /* red-400 */
  }
  .custom-tooltip-content .tooltip-body {
    padding: 8px 12px 10px 12px;
  }
  .custom-tooltip-content .tooltip-label {
    color: #9ca3af; /* text-gray-400 */
    font-size: 0.75em;
    font-weight: 600;
    margin: 8px 0 2px 0;
    text-transform: uppercase;
  }
  .custom-tooltip-content .tooltip-value {
    color: #f9fafb; /* text-gray-100 */
    margin: 0 0 4px 0;
    font-size: 0.9em;
    line-height: 1.4;
    word-wrap: break-word;
  }
`;
if (!document.head.querySelector('#custom-marker-style')) {
  style.id = 'custom-marker-style';
  document.head.appendChild(style);
}

export const MapDisplay: React.FC<MapDisplayProps> = ({ entries, highlightedPlace }) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const layerGroupRef = useRef<any>(null); // To hold all markers and polylines

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

  // Update markers and route when props change
  useEffect(() => {
    if (mapRef.current && layerGroupRef.current) {
      // Clear existing markers and routes
      layerGroupRef.current.clearLayers();
      
      console.log('🗺️ MapDisplay: Actualizando mapa');
      console.log(`   - Entradas recibidas: ${entries.length}`);
      console.log(`   - Lugar resaltado:`, highlightedPlace ? `Sí (${highlightedPlace.latitude}, ${highlightedPlace.longitude})` : 'No');

       // Filtrar entradas válidas (coordenadas son obligatorias, fecha/hora son opcionales)
       const validEntries = entries.filter(entry => 
        entry.data.latitude !== null && 
        entry.data.longitude !== null
        // Removido el filtro estricto de fecha/hora para permitir entradas del KMZ sin hora
      );

      // Sort entries by date and time to create the route (si tienen fecha/hora)
      const sortedEntries = validEntries.sort((a, b) => {
        try {
            // Si ambos tienen fecha y hora, ordenar por fecha/hora
            if (a.data.date && a.data.time && b.data.date && b.data.time) {
              const dateA = new Date(`${a.data.date}T${a.data.time}:00`);
              const dateB = new Date(`${b.data.date}T${b.data.time}:00`);
              if (!isNaN(dateA.getTime()) && !isNaN(dateB.getTime())) {
                return dateA.getTime() - dateB.getTime();
              }
            }
            // Si solo tienen fecha, ordenar por fecha
            if (a.data.date && b.data.date) {
              const dateA = new Date(`${a.data.date}T00:00:00`);
              const dateB = new Date(`${b.data.date}T00:00:00`);
              if (!isNaN(dateA.getTime()) && !isNaN(dateB.getTime())) {
                return dateA.getTime() - dateB.getTime();
              }
            }
            return 0;
        } catch (e) {
            return 0;
        }
      });


      // Si no hay entradas válidas después del filtro, usar todas las que tengan coordenadas
      const entriesToShow = sortedEntries.length > 0 ? sortedEntries : validEntries;
      
      if (entriesToShow.length === 0) {
        return;
      }

      // Create custom icons
      const createIcon = (svg: string) => L.divIcon({
        html: svg,
        className: 'custom-map-marker',
        iconSize: [32, 48],
        iconAnchor: [16, 48],
        popupAnchor: [0, -48]
      });
      
      const startIcon = createIcon(createMarkerIconSVG('#16A34A', 'start')); // Green with play icon
      const endIcon = createIcon(createMarkerIconSVG('#DC2626', 'end')); // Red with stop icon
      const intermediateIcon = createIcon(createMarkerIconSVG('#2563EB', 'intermediate')); // Blue with circle

      const visibleMarkersBounds: [number, number][] = [];
      
      // Determinar qué entradas están dentro del rango del lugar resaltado
      const entriesInRange = new Set<string>();
      if (highlightedPlace) {
        entriesToShow.forEach((entry) => {
          if (entry.data.latitude !== null && entry.data.longitude !== null) {
            const distance = calculateDistance(
              highlightedPlace.latitude,
              highlightedPlace.longitude,
              entry.data.latitude,
              entry.data.longitude
            );
            if (distance <= highlightedPlace.distanceThreshold) {
              entriesInRange.add(entry.id);
            }
          }
        });
      }
      
      // Add markers
      entriesToShow.forEach((entry, index) => {
        if (entry.data.latitude !== null && entry.data.longitude !== null) {
           let icon;
           let tooltipStatusHeader = '';
           
           // Si hay un lugar resaltado y esta entrada está en el rango, usar el color del lugar resaltado
           const isInHighlightedRange = highlightedPlace && entriesInRange.has(entry.id);
           const highlightColor = isInHighlightedRange ? highlightedPlace!.color : null;

           if (entriesToShow.length > 1) {
             if (index === 0) {
               icon = createIcon(createMarkerIconSVG(highlightColor || '#16A34A', 'start'));
               tooltipStatusHeader = `<h4 class="route-start">Inicio Recorrido</h4>`;
             } else if (index === entriesToShow.length - 1) {
               icon = createIcon(createMarkerIconSVG(highlightColor || '#DC2626', 'end'));
               tooltipStatusHeader = `<h4 class="route-end">Final del Recorrido</h4>`;
             } else {
               icon = createIcon(createMarkerIconSVG(highlightColor || '#2563EB', 'intermediate'));
             }
           } else {
             icon = createIcon(createMarkerIconSVG(highlightColor || '#2563EB', 'intermediate')); // Single point
           }
          
           const dateText = entry.data.date || 'N/A';
           const timeText = entry.data.time || 'Sin hora';
           const locationText = entry.data.location || 'N/A';
           
           const cardContent = `
            <div class="custom-tooltip-content">
              ${tooltipStatusHeader}
              <div class="tooltip-body">
                  <p class="tooltip-label">Date</p>
                  <p class="tooltip-value">${dateText}</p>
                  <p class="tooltip-label">Time</p>
                  <p class="tooltip-value">${timeText}</p>
                  <p class="tooltip-label">Location</p>
                  <p class="tooltip-value">${locationText}</p>
              </div>
            </div>`;

           L.marker([entry.data.latitude, entry.data.longitude], { icon })
            .addTo(layerGroupRef.current)
            .bindPopup(cardContent)
            .bindTooltip(cardContent, {
              sticky: true,
              className: 'custom-leaflet-tooltip'
            });
          
          visibleMarkersBounds.push([entry.data.latitude, entry.data.longitude]);
        }
      });
      
      // Draw the route if more than one point
      if (entriesToShow.length > 1) {
        const routeCoordinates = entriesToShow.map(entry => [entry.data.latitude, entry.data.longitude] as [number, number]);
        // Si hay un lugar resaltado, usar su color para la ruta si todos los puntos están en el rango
        const allInRange = highlightedPlace && entriesToShow.every(entry => 
          entry.data.latitude !== null && 
          entry.data.longitude !== null && 
          entriesInRange.has(entry.id)
        );
        const routeColor = allInRange ? highlightedPlace!.color : '#3B82F6';
        L.polyline(routeCoordinates, { color: routeColor, weight: 4, opacity: 0.8 }).addTo(layerGroupRef.current);
      }
      
      // Dibujar un círculo alrededor del lugar resaltado para mostrar el área de 100m
      if (highlightedPlace) {
        // Círculo de 100m
        L.circle([highlightedPlace.latitude, highlightedPlace.longitude], {
          radius: highlightedPlace.distanceThreshold * 1000, // convertir km a metros
          color: highlightedPlace.color,
          fillColor: highlightedPlace.color,
          fillOpacity: 0.2,
          weight: 2,
          opacity: 0.6
        }).addTo(layerGroupRef.current);

        // Si se debe mostrar el marcador del centroide
        if (highlightedPlace.centerMarker) {
          // Crear un marcador especial más grande para el centroide con el color del botón
          const largeCenterIcon = L.divIcon({
            html: createMarkerIconSVG(highlightedPlace.color, 'intermediate'),
            className: 'custom-map-marker center-marker',
            iconSize: [48, 72], // Más grande para destacar
            iconAnchor: [24, 72],
            popupAnchor: [0, -72]
          });
          
          const centroidMarker = L.marker([highlightedPlace.latitude, highlightedPlace.longitude], { 
            icon: largeCenterIcon,
            zIndexOffset: 1000 // Asegurar que esté por encima de otros marcadores
          })
          .addTo(layerGroupRef.current)
          .bindPopup(`
            <div class="custom-tooltip-content">
              <h4 style="color: ${highlightedPlace.color}; font-weight: bold; margin-bottom: 8px; font-size: 1.1em;">
                🎯 Centroide del Lugar
              </h4>
              <div class="tooltip-body">
                <p class="tooltip-label">Coordenadas</p>
                <p class="tooltip-value">${highlightedPlace.latitude.toFixed(6)}, ${highlightedPlace.longitude.toFixed(6)}</p>
                <p class="tooltip-label">Radio de agrupación</p>
                <p class="tooltip-value">${(highlightedPlace.distanceThreshold * 1000).toFixed(0)} metros</p>
              </div>
            </div>
          `);
          
          // Abrir el popup automáticamente para destacar el centroide
          centroidMarker.openPopup();

          // Centrar el mapa en el centroide con zoom apropiado
          mapRef.current.flyTo(
            [highlightedPlace.latitude, highlightedPlace.longitude],
            16, // Zoom level para ver bien el área de 100m
            { duration: 1 }
          );
        }
      }
      
      // Adjust map view to fit all visible markers (solo si no hay un lugar resaltado con centerMarker)
      if (visibleMarkersBounds.length > 0 && (!highlightedPlace || !highlightedPlace.centerMarker)) {
        mapRef.current.flyToBounds(visibleMarkersBounds, { padding: [50, 50], maxZoom: 15 });
      }
    }
  }, [entries, highlightedPlace]);

  return <div ref={mapContainerRef} className="z-0 h-[300px] md:h-[400px] w-full" />;
};
