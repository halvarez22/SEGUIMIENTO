
import React, { useState, useMemo, useRef } from 'react';
import type { HistoryEntry } from '../types';
import { TrashIcon, SearchIcon, MapPinIcon } from './icons';

interface HistoryListProps {
  history: HistoryEntry[];
  onSelect: (entry: HistoryEntry) => void;
  onDelete: (id: string) => void;
  onClear: () => void;
  onDateClick?: (date: string) => void;
}

export const HistoryList: React.FC<HistoryListProps> = ({ history, onSelect, onDelete, onClear, onDateClick }) => {
  const [searchTerm, setSearchTerm] = useState('');

  // Agrupar historial por fecha
  const historyByDate = useMemo(() => {
    const grouped: { [date: string]: HistoryEntry[] } = {};
    
    history.forEach(entry => {
      const date = entry.data.date || 'Sin fecha';
      if (!grouped[date]) {
        grouped[date] = [];
      }
      grouped[date].push(entry);
    });
    
    // Ordenar fechas de más reciente a más antigua
    const sortedDates = Object.keys(grouped).sort((a, b) => {
      if (a === 'Sin fecha') return 1;
      if (b === 'Sin fecha') return -1;
      return new Date(b).getTime() - new Date(a).getTime();
    });
    
    return { grouped, sortedDates };
  }, [history]);

  // Filtrar fechas por término de búsqueda
  const filteredDates = useMemo(() => {
    if (!searchTerm) {
      return historyByDate.sortedDates;
    }
    const lowercasedTerm = searchTerm.toLowerCase();
    return historyByDate.sortedDates.filter(date => {
      const entries = historyByDate.grouped[date];
      return entries.some(entry => 
        entry.data.location?.toLowerCase().includes(lowercasedTerm) ||
        entry.data.date?.toLowerCase().includes(lowercasedTerm) ||
        entry.data.time?.toLowerCase().includes(lowercasedTerm)
      );
    });
  }, [historyByDate, searchTerm]);

  // Formatear fecha para mostrar
  const formatDateDisplay = (dateStr: string): string => {
    if (dateStr === 'Sin fecha') return dateStr;
    try {
      const date = new Date(dateStr + 'T00:00:00');
      const day = date.getDate();
      const month = date.getMonth() + 1;
      const year = date.getFullYear();
      const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
      const dayName = dayNames[date.getDay()];
      return `${dayName}, ${day}/${month}/${year}`;
    } catch {
      return dateStr;
    }
  };

  // Obtener rango de horarios para un día
  const getTimeRange = (entries: HistoryEntry[]): string => {
    const times = entries
      .map(e => e.data.time)
      .filter(t => t && /^\d{2}:\d{2}$/.test(t))
      .sort();
    
    if (times.length === 0) return '';
    if (times.length === 1) return times[0];
    
    const min = times[0];
    const max = times[times.length - 1];
    return min === max ? min : `${min} a ${max}`;
  };

  return (
    <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4 sm:p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl sm:text-2xl font-bold text-white">History</h2>
        {history.length > 0 && (
          <button
            onClick={onClear}
            className="flex items-center space-x-1.5 text-sm font-semibold text-red-500 hover:text-red-400 transition-colors px-3 py-1 rounded-md bg-red-500/10 hover:bg-red-500/20 focus:outline-none focus:ring-2 focus:ring-red-500"
          >
            <TrashIcon />
            <span>Clear All</span>
          </button>
        )}
      </div>

      {history.length > 0 && (
         <div className="relative mb-4">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3">
            <SearchIcon />
          </span>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by location, date, or time..."
            aria-label="Search history"
            className="w-full bg-gray-900/50 border border-gray-600 rounded-md py-2 pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      )}
     
      {filteredDates.length === 0 ? (
         <p className="text-center text-gray-400 py-4">
           {history.length === 0 ? 'No history yet. Analyze an image to get started.' : 'No matching history found.'}
         </p>
      ) : (
        <ul className="space-y-2">
          {filteredDates.map(date => {
            const entries = historyByDate.grouped[date];
            const entryCount = entries.length;
            const timeRange = getTimeRange(entries);
            
            return (
              <li 
                key={date}
                className="bg-gray-800 p-4 rounded-lg shadow-lg border border-gray-700/50 hover:border-blue-500 transition-all cursor-pointer group"
                onClick={() => {
                  if (onDateClick) {
                    onDateClick(date);
                  }
                }}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && onDateClick) {
                    onDateClick(date);
                  }
                }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4 flex-grow min-w-0">
                    <div className="w-12 h-12 rounded-md bg-blue-600/20 flex-shrink-0 flex items-center justify-center border border-blue-500/30">
                      <MapPinIcon className="text-blue-400" />
                    </div>
                    <div className="overflow-hidden flex-grow">
                      <p className="text-white font-semibold text-lg group-hover:text-blue-400 transition-colors">
                        {formatDateDisplay(date)}
                      </p>
                      <div className="flex items-center space-x-3 mt-1">
                        <p className="text-gray-400 text-sm">
                          <span className="font-semibold text-blue-400">{entryCount}</span>
                          {' '}
                          {entryCount === 1 ? 'punto' : 'puntos'}
                        </p>
                        {timeRange && (
                          <p className="text-gray-500 text-sm">
                            {timeRange}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex-shrink-0 ml-4">
                    <span className="text-gray-500 group-hover:text-blue-400 transition-colors text-sm font-medium">
                      Ver en mapa →
                    </span>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};