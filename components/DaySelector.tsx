import React from 'react';

interface DaySelectorProps {
  availableDates: string[];
  selectedDate: string | null;
  onDateSelect: (date: string | null) => void;
  isLoading?: boolean;
}

export const DaySelector: React.FC<DaySelectorProps> = ({
  availableDates,
  selectedDate,
  onDateSelect,
  isLoading = false
}) => {
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString + 'T00:00:00');
      return {
        day: date.toLocaleDateString('es-ES', { weekday: 'long' }),
        date: date.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' }),
        short: date.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' })
      };
    } catch (error) {
      return {
        day: 'Fecha inválida',
        date: dateString,
        short: dateString
      };
    }
  };

  const handleDateClick = (date: string) => {
    if (selectedDate === date) {
      onDateSelect(null); // Deseleccionar si ya está seleccionado
    } else {
      onDateSelect(date);
    }
  };

  if (availableDates.length === 0) {
    return (
      <div className="bg-gray-900/50 p-4 rounded-lg border border-gray-700">
        <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-2">
          Seleccionar Día
        </h3>
        <p className="text-gray-400 text-sm">No hay fechas disponibles</p>
      </div>
    );
  }

  return (
    <div className="bg-gray-900/50 p-4 rounded-lg border border-gray-700">
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-sm font-bold text-white uppercase tracking-wider">
          Seleccionar Día
        </h3>
        {selectedDate && (
          <button
            onClick={() => onDateSelect(null)}
            className="text-xs font-medium text-gray-400 hover:text-gray-300 underline"
            disabled={isLoading}
          >
            Limpiar selección
          </button>
        )}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-4">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
          <span className="ml-2 text-gray-400">Cargando...</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 max-h-60 overflow-y-auto">
          {availableDates.map(date => {
            const formatted = formatDate(date);
            const isSelected = selectedDate === date;

            return (
              <button
                key={date}
                onClick={() => handleDateClick(date)}
                className={`p-3 rounded-md text-left transition-all duration-200 border ${
                  isSelected
                    ? 'bg-blue-600 border-blue-500 text-white shadow-lg'
                    : 'bg-gray-800 border-gray-600 text-gray-300 hover:bg-gray-700 hover:border-gray-500'
                }`}
                title={`Seleccionar ${formatted.date}`}
              >
                <div className="text-sm font-medium capitalize">
                  {formatted.day}
                </div>
                <div className={`text-xs ${isSelected ? 'text-blue-100' : 'text-gray-400'}`}>
                  {formatted.date}
                </div>
              </button>
            );
          })}
        </div>
      )}

      {selectedDate && (
        <div className="mt-3 p-2 bg-blue-900/50 border border-blue-500 rounded-md">
          <p className="text-xs text-blue-300 font-medium">
            Día seleccionado: {formatDate(selectedDate).date}
          </p>
        </div>
      )}
    </div>
  );
};
