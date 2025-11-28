import React from 'react';

interface DateFilterProps {
  dateRange: { start: string | null; end: string | null };
  onDateRangeChange: (range: { start: string | null; end: string | null }) => void;
  minDate?: string;
  maxDate?: string;
}

export const DateFilter: React.FC<DateFilterProps> = ({ dateRange, onDateRangeChange, minDate, maxDate }) => {

  const handleStartDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    const newStart = e.target.value || null;
    onDateRangeChange({ ...dateRange, start: newStart });
  };

  const handleEndDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    const newEnd = e.target.value || null;
    // Si la fecha de fin es anterior a la de inicio, ajustarla
    if (newEnd && dateRange.start && newEnd < dateRange.start) {
      onDateRangeChange({ start: dateRange.start, end: dateRange.start });
    } else {
      onDateRangeChange({ ...dateRange, end: newEnd });
    }
  };
  
  const handleClear = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    onDateRangeChange({ start: null, end: null });
  };

  return (
    <div className="bg-gray-900/50 p-4 rounded-lg border border-gray-700">
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-sm font-bold text-white uppercase tracking-wider">Filtrar por Rango de Fechas</h3>
        {(dateRange.start || dateRange.end) && (
          <button 
            onClick={handleClear} 
            className="text-xs font-medium text-gray-400 hover:text-gray-300 transition-colors px-2 py-1 rounded hover:bg-gray-800"
            type="button"
          >
            Limpiar
          </button>
        )}
      </div>
      <div className="flex flex-col sm:flex-row sm:space-x-4 space-y-2 sm:space-y-0">
        <div className="flex-1">
          <label htmlFor="most-visited-start-date" className="block text-xs font-medium text-gray-400 mb-1">
            Fecha Inicio
          </label>
          <input
            type="date"
            id="most-visited-start-date"
            value={dateRange.start || ''}
            onChange={handleStartDateChange}
            min={minDate || undefined}
            max={maxDate || undefined}
            className="w-full bg-gray-700 border border-gray-600 rounded-md py-2 px-3 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 cursor-pointer"
            style={{ colorScheme: 'dark' }}
            title="Selecciona la fecha de inicio para filtrar"
          />
        </div>
        <div className="flex-1">
          <label htmlFor="most-visited-end-date" className="block text-xs font-medium text-gray-400 mb-1">
            Fecha Fin
          </label>
          <input
            type="date"
            id="most-visited-end-date"
            value={dateRange.end || ''}
            onChange={handleEndDateChange}
            min={dateRange.start || minDate || undefined}
            max={maxDate || undefined}
            className="w-full bg-gray-700 border border-gray-600 rounded-md py-2 px-3 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 cursor-pointer"
            style={{ colorScheme: 'dark' }}
            title="Selecciona la fecha de fin para filtrar"
            disabled={!dateRange.start}
          />
        </div>
      </div>
    </div>
  );
};