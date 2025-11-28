import React, { useState, useRef } from 'react';
import type { MostVisitedPlace } from '../utils/locationUtils';
import { getMedalColor } from '../utils/locationUtils';
import { MapPinIcon } from './icons';
import { MapDisplay } from './MapDisplay';
import { DateFilter } from './DateFilter';

interface MostVisitedPlacesProps {
  places: MostVisitedPlace[];
  minDate?: string;
  maxDate?: string;
  dateRange: { start: string | null; end: string | null };
  onDateRangeChange: (range: { start: string | null; end: string | null }) => void;
  onPlaceClick?: (place: MostVisitedPlace) => void;
}

// Función para convertir formato 24h a 12h con am/pm
const formatTime12h = (time24h: string): string => {
  if (!time24h || !/^\d{2}:\d{2}$/.test(time24h)) return time24h;
  
  const [hours, minutes] = time24h.split(':').map(Number);
  const period = hours >= 12 ? 'pm' : 'am';
  const hours12 = hours % 12 || 12;
  
  return `${hours12}:${minutes.toString().padStart(2, '0')}${period}`;
};

export const MostVisitedPlaces: React.FC<MostVisitedPlacesProps> = ({
  places,
  minDate,
  maxDate,
  dateRange,
  onDateRangeChange,
  onPlaceClick,
}) => {
  const [selectedPlaceIndex, setSelectedPlaceIndex] = useState<number | null>(null);
  const mapSectionRef = useRef<HTMLDivElement>(null);

  if (places.length === 0) {
    return null;
  }

  const getMedalIcon = (position: number) => {
    switch (position) {
      case 1:
        return '🥇';
      case 2:
        return '🥈';
      case 3:
        return '🥉';
      default:
        return `${position}°`;
    }
  };

  const getMedalColorClass = (position: number) => {
    switch (position) {
      case 1:
        return 'bg-yellow-500/20 border-yellow-500/50';
      case 2:
        return 'bg-gray-400/20 border-gray-400/50';
      case 3:
        return 'bg-orange-600/20 border-orange-600/50';
      default:
        return 'bg-blue-500/20 border-blue-500/50';
    }
  };

  // Preparar entradas para el mapa (solo lugares con coordenadas)
  // Si hay un lugar seleccionado, mostrar solo las entradas de ese lugar
  // Si no hay lugar seleccionado, mostrar todas las entradas
  const entriesWithCoords = selectedPlaceIndex !== null && places[selectedPlaceIndex]
    ? places[selectedPlaceIndex].entries.filter(e => e.data.latitude !== null && e.data.longitude !== null)
    : places
        .filter((place) => place.latitude !== null && place.longitude !== null)
        .flatMap((place) => place.entries);
  
  // Obtener el lugar resaltado si hay uno seleccionado
  const highlightedPlace = selectedPlaceIndex !== null && places[selectedPlaceIndex]?.latitude !== null && places[selectedPlaceIndex]?.longitude !== null
    ? {
        latitude: places[selectedPlaceIndex].latitude!,
        longitude: places[selectedPlaceIndex].longitude!,
        color: getMedalColor(selectedPlaceIndex + 1),
        distanceThreshold: 0.1, // 100 metros en km
        centerMarker: true // Activar centrado y marcador del centroide
      }
    : null;

  const handlePlaceClick = (place: MostVisitedPlace, index: number) => {
    console.log(`📍 Click en lugar #${index + 1}:`, place.location);
    console.log(`   - Coordenadas: ${place.latitude}, ${place.longitude}`);
    console.log(`   - Entradas: ${place.entries.length}`);
    
    // Si se hace clic en el mismo lugar, deseleccionarlo
    if (selectedPlaceIndex === index) {
      console.log('   - Deseleccionando lugar');
      setSelectedPlaceIndex(null);
    } else {
      console.log(`   - Seleccionando lugar #${index + 1}`);
      setSelectedPlaceIndex(index);
      
      // Scroll automático al mapa de "Lugares Más Visitados"
      setTimeout(() => {
        if (mapSectionRef.current) {
          mapSectionRef.current.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'center' 
          });
          console.log('   - Scroll al mapa de Lugares Más Visitados');
        }
      }, 100); // Pequeño delay para asegurar que el estado se actualizó
    }
    
    // Llamar al callback del padre si existe
    if (onPlaceClick) {
      onPlaceClick(place);
    }
  };

  return (
    <div className="bg-gray-800 shadow-2xl rounded-lg p-4 sm:p-6 animate-fade-in border border-gray-700">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <h2 className="text-2xl font-bold text-white">
          Lugares Más Visitados
        </h2>
        {minDate && maxDate && (
          <div className="w-full sm:w-auto">
            <DateFilter 
              dateRange={dateRange}
              onDateRangeChange={onDateRangeChange}
              minDate={minDate}
              maxDate={maxDate}
            />
          </div>
        )}
      </div>
      
      {minDate && maxDate && (
        <div className="mb-4 text-sm text-gray-400">
          <p>
            Rango disponible: <span className="text-gray-300 font-semibold">{minDate}</span> hasta <span className="text-gray-300 font-semibold">{maxDate}</span>
          </p>
          {dateRange.start || dateRange.end ? (
            <p className="mt-1">
              Mostrando lugares visitados entre: <span className="text-blue-400 font-semibold">
                {dateRange.start || minDate} - {dateRange.end || maxDate}
              </span>
            </p>
          ) : (
            <p className="mt-1 text-gray-500">
              Mostrando todos los lugares del historial completo
            </p>
          )}
        </div>
      )}

      <div className="space-y-4 mb-6">
        {places.map((place, index) => {
          const isSelected = selectedPlaceIndex === index;
          return (
          <div
            key={`${place.latitude}-${place.longitude}-${place.location}`}
            className={`p-4 rounded-lg border-2 ${getMedalColorClass(
              index + 1
            )} transition-all hover:scale-[1.02] ${
              onPlaceClick ? 'cursor-pointer' : ''
            } ${isSelected ? 'ring-4 ring-offset-2 ring-offset-gray-800' : ''}`}
            style={isSelected ? { 
              boxShadow: `0 0 0 4px ${getMedalColor(index + 1)}60, 0 4px 6px -1px rgba(0, 0, 0, 0.3)`
            } : {}}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-start space-x-4 flex-grow min-w-0">
                <div className="flex-shrink-0 text-3xl">
                  {getMedalIcon(index + 1)}
                </div>
                <div className="flex-grow min-w-0">
                  <div className="flex items-center space-x-2 mb-3">
                    <div className="flex-shrink-0 h-5 w-5" style={{ color: getMedalColor(index + 1) }}>
                      <MapPinIcon />
                    </div>
                    <h3 className="text-lg font-semibold text-white truncate">
                      Sitio más visitado #{index + 1}: {place.location}
                    </h3>
                  </div>
                  
                  {/* Número de visitas */}
                  <div className="mb-2">
                    <span className="text-sm text-gray-400">
                      <span className="font-semibold" style={{ color: getMedalColor(index + 1) }}>
                        {place.visitCount}
                      </span>
                      {' '}
                      {place.visitCount === 1 ? 'visita' : 'visitas'}
                    </span>
                  </div>

                  {/* Fechas de visita */}
                  {place.visitDates.length > 0 && (
                    <div className="mb-2">
                      <span className="text-xs text-gray-500 font-semibold">Visitado en fechas: </span>
                      <span className="text-xs text-gray-300">
                        {place.visitDates.length <= 5
                          ? place.visitDates.map(d => {
                              const date = new Date(d + 'T00:00:00');
                              const day = date.getDate();
                              const month = date.getMonth() + 1;
                              return `${day}/${month}`;
                            }).join(', ')
                          : `${place.visitDates.slice(0, 3).map(d => {
                              const date = new Date(d + 'T00:00:00');
                              const day = date.getDate();
                              const month = date.getMonth() + 1;
                              return `${day}/${month}`;
                            }).join(', ')} y ${place.visitDates.length - 3} más`}
                      </span>
                    </div>
                  )}

                  {/* Horarios de visita */}
                  {place.timeRange && (
                    <div className="mb-2">
                      <span className="text-xs text-gray-500 font-semibold">Visitado en horarios entre: </span>
                      <span className="text-xs text-gray-300">
                        {formatTime12h(place.timeRange.min)} - {formatTime12h(place.timeRange.max)}
                      </span>
                    </div>
                  )}

                  {/* Coordenada del centroide */}
                  {place.latitude !== null && place.longitude !== null && (
                    <div className="mt-2 pt-2 border-t border-gray-600/50">
                      <span className="text-xs text-gray-500">Centroide: </span>
                      <span className="text-xs text-gray-300 font-mono">
                        {place.latitude.toFixed(6)}, {place.longitude.toFixed(6)}
                      </span>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Botón para mostrar en el mapa */}
              {place.latitude !== null && place.longitude !== null && (
                <div className="flex-shrink-0 ml-4">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handlePlaceClick(place, index);
                    }}
                    className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all hover:scale-105 ${
                      isSelected ? 'ring-2 ring-offset-2 ring-offset-gray-800' : ''
                    }`}
                    style={{
                      backgroundColor: isSelected ? getMedalColor(index + 1) : `${getMedalColor(index + 1)}40`,
                      color: isSelected ? '#FFFFFF' : getMedalColor(index + 1),
                      border: `2px solid ${getMedalColor(index + 1)}`,
                      boxShadow: isSelected ? `0 0 0 4px ${getMedalColor(index + 1)}60` : 'none'
                    }}
                  >
                    {isSelected ? 'Ocultar en Mapa' : 'Mostrar en Mapa'}
                  </button>
                </div>
              )}
            </div>
          </div>
          );
        })}
      </div>

      {entriesWithCoords.length > 0 && (
        <div ref={mapSectionRef} className="mt-6 rounded-lg overflow-hidden border border-gray-600">
          <h3 className="text-lg font-semibold text-white mb-3 px-2">
            Mapa de Lugares Más Visitados
            {selectedPlaceIndex !== null && (
              <span className="text-sm font-normal text-gray-400 ml-2">
                (Resaltando puntos dentro de 100m del lugar {selectedPlaceIndex + 1}°)
              </span>
            )}
          </h3>
          <MapDisplay 
            entries={entriesWithCoords} 
            highlightedPlace={highlightedPlace}
          />
        </div>
      )}
    </div>
  );
};

