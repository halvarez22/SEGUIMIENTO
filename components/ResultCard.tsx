import React from 'react';
import type { ExtractedData, HistoryEntry } from '../types';
import { CalendarIcon, ClockIcon, MapPinIcon } from './icons';
import { MapDisplay } from './MapDisplay';
import { DateFilter } from './DateFilter';

interface ResultCardProps {
  currentResult: ExtractedData | null;
  filteredEntries: HistoryEntry[];
  showFilter: boolean;
  dateRange: { start: string | null; end: string | null };
  onDateRangeChange: (range: { start: string | null; end: string | null }) => void;
  minDate?: string;
  maxDate?: string;
}

export const ResultCard: React.FC<ResultCardProps> = ({ 
  currentResult, 
  filteredEntries,
  showFilter,
  dateRange,
  onDateRangeChange,
  minDate,
  maxDate
 }) => {

  return (
    <div className="bg-gray-800 shadow-2xl rounded-lg p-4 sm:p-6 animate-fade-in border border-gray-700">
      <h2 className="text-2xl font-bold text-white mb-6">Extraction Results</h2>
      
      {showFilter && (
        <div className="mb-6">
          <DateFilter 
            dateRange={dateRange}
            onDateRangeChange={onDateRangeChange}
            minDate={minDate}
            maxDate={maxDate}
          />
          <div className="mt-4 rounded-lg overflow-hidden border border-gray-600">
            <MapDisplay 
              entries={filteredEntries}
            />
          </div>
        </div>
      )}
      
      {currentResult && !showFilter && currentResult.latitude && currentResult.longitude && (
         <div className="mb-6 rounded-lg overflow-hidden border border-gray-600">
           <MapDisplay 
             entries={[{ id: 'current', data: currentResult, imagePreview: '', timestamp:'' }]}
           />
         </div>
      )}

      {currentResult && (
        <div className="space-y-4 sm:space-y-5 mt-6">
          <div className="flex items-start">
            <div className="flex-shrink-0 h-6 w-6 text-blue-400 mt-1">
              <CalendarIcon />
            </div>
            <div className="ml-4">
              <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider">Date</h3>
              <p className="text-lg text-gray-100">{currentResult.date || 'Not found'}</p>
            </div>
          </div>
          <div className="flex items-start">
            <div className="flex-shrink-0 h-6 w-6 text-blue-400 mt-1">
              <ClockIcon />
            </div>
            <div className="ml-4">
              <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider">Time</h3>
              <p className="text-lg text-gray-100">{currentResult.time || 'Not found'}</p>
            </div>
          </div>
          <div className="flex items-start">
            <div className="flex-shrink-0 h-6 w-6 text-blue-400 mt-1">
              <MapPinIcon />
            </div>
            <div className="ml-4">
              <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider">Location</h3>
              <p className="text-lg text-gray-100 leading-relaxed">{currentResult.location || 'Not found'}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Add a simple fade-in animation to tailwind config if possible, or use a style tag for simplicity.
// For this environment, we'll rely on a simple implementation if we can't modify tailwind.config.js
const style = document.createElement('style');
style.innerHTML = `
  @keyframes fade-in {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
  }
  .animate-fade-in {
    animation: fade-in 0.5s ease-out forwards;
  }
`;
document.head.appendChild(style);