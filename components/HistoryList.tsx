
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
     
      {filteredHistory.length === 0 ? (
         <p className="text-center text-gray-400 py-4">
           {history.length === 0 ? 'No history yet. Analyze an image to get started.' : 'No matching history found.'}
         </p>
      ) : (
        <ul className="space-y-3">
          {filteredHistory.map(entry => (
            <li 
              key={entry.id} 
              className="bg-gray-800 p-2 sm:p-3 rounded-lg flex items-center justify-between shadow-lg border border-gray-700/50 hover:border-blue-500 transition-colors group"
              title={`Analyzed on: ${new Date(entry.timestamp).toLocaleString()}`}
            >
              <div 
                className="flex items-center space-x-4 cursor-pointer flex-grow min-w-0" 
                onClick={() => onSelect(entry)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && onSelect(entry)}
              >
                <img src={entry.imagePreview} alt="History thumbnail" className="w-14 h-14 sm:w-16 sm:h-16 object-cover rounded-md bg-gray-700 flex-shrink-0" />
                <div className="overflow-hidden">
                  <p className="text-white font-semibold truncate group-hover:text-blue-400 transition-colors">{entry.data.location || 'Unknown Location'}</p>
                  <p className="text-gray-400 text-sm">{entry.data.date || 'Unknown Date'}</p>
                  <p className="text-gray-500 text-xs mt-1">
                    {new Date(entry.timestamp).toLocaleString()}
                  </p>
                </div>
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); onDelete(entry.id); }}
                className="ml-4 p-2 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded-full transition-all flex-shrink-0"
                aria-label="Delete history item"
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