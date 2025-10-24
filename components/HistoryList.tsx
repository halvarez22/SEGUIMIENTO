
import React, { useState, useMemo } from 'react';
import type { HistoryEntry } from '../types';
import { TrashIcon, SearchIcon } from './icons';

interface HistoryListProps {
  history: HistoryEntry[];
  onSelect: (entry: HistoryEntry) => void;
  onDelete: (id: string) => void;
  onClear: () => void;
}

export const HistoryList: React.FC<HistoryListProps> = ({ history, onSelect, onDelete, onClear }) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredHistory = useMemo(() => {
    if (!searchTerm) {
      return history;
    }
    const lowercasedTerm = searchTerm.toLowerCase();
    return history.filter(entry => 
      entry.data.location?.toLowerCase().includes(lowercasedTerm) ||
      entry.data.date?.toLowerCase().includes(lowercasedTerm) ||
      entry.data.time?.toLowerCase().includes(lowercasedTerm)
    );
  }, [history, searchTerm]);

  return (
    <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-3 sm:p-4 md:p-6">
      <div className="flex flex-col xs:flex-row xs:justify-between xs:items-center gap-3 xs:gap-0 mb-4">
        <h2 className="text-lg xs:text-xl sm:text-2xl font-bold text-white">Historial</h2>
        {history.length > 0 && (
          <button
            onClick={onClear}
            className="flex items-center justify-center space-x-1.5 text-sm font-semibold text-red-500 hover:text-red-400 transition-all px-3 py-2 xs:py-1 rounded-md bg-red-500/10 hover:bg-red-500/20 focus:outline-none focus:ring-2 focus:ring-red-500 touch-manipulation active:scale-95 self-start xs:self-auto min-h-[36px]"
          >
            <TrashIcon />
            <span>Limpiar Todo</span>
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
            placeholder="Buscar por ubicación, fecha u hora..."
            aria-label="Buscar en historial"
            className="w-full bg-gray-900/50 border border-gray-600 rounded-md py-3 sm:py-2 pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm sm:text-base touch-manipulation min-h-[44px] sm:min-h-0"
          />
        </div>
      )}
     
      {filteredHistory.length === 0 ? (
         <p className="text-center text-gray-400 py-4 text-sm sm:text-base">
           {history.length === 0 ? 'No hay historial aún. Sube un archivo KMZ para comenzar.' : 'No se encontraron resultados.'}
         </p>
      ) : (
        <ul className="space-y-2 sm:space-y-3">
          {filteredHistory.map(entry => (
            <li
              key={entry.id}
              className="bg-gray-800 p-3 sm:p-4 rounded-lg flex items-center justify-between shadow-lg border border-gray-700/50 hover:border-blue-500 transition-all group active:scale-[0.98] touch-manipulation"
              title={`Procesado el: ${new Date(entry.timestamp).toLocaleString('es-ES')}`}
            >
              <div
                className="flex items-center space-x-3 sm:space-x-4 cursor-pointer flex-grow min-w-0 py-1"
                onClick={() => onSelect(entry)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && onSelect(entry)}
              >
                {entry.preview ? (
                  <img src={entry.preview} alt="Miniatura del historial" className="w-12 h-12 xs:w-14 xs:h-14 sm:w-16 sm:h-16 object-cover rounded-md bg-gray-700 flex-shrink-0" />
                ) : (
                  <div className="w-12 h-12 xs:w-14 xs:h-14 sm:w-16 sm:h-16 bg-gray-700 rounded-md flex items-center justify-center flex-shrink-0">
                    {entry.source === 'kmz' ? (
                      <div className="text-blue-400 text-xs font-bold">KMZ</div>
                    ) : (
                      <div className="text-gray-400 text-xs">📍</div>
                    )}
                  </div>
                )}
                <div className="overflow-hidden flex-1 min-w-0">
                  <p className="text-white font-semibold truncate group-hover:text-blue-400 transition-colors text-sm sm:text-base leading-tight">
                    {entry.data.location || 'Ubicación Desconocida'}
                  </p>
                  <p className="text-gray-400 text-xs sm:text-sm leading-tight">
                    {entry.data.date || 'Fecha Desconocida'}
                  </p>
                  <p className="text-gray-500 text-xs leading-tight">
                    {new Date(entry.timestamp).toLocaleString('es-ES', {
                      day: '2-digit',
                      month: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                </div>
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); onDelete(entry.id); }}
                className="ml-2 sm:ml-4 p-2 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded-full transition-all flex-shrink-0 touch-manipulation active:scale-90 min-w-[36px] min-h-[36px] flex items-center justify-center"
                aria-label="Eliminar elemento del historial"
              >
                <TrashIcon />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};