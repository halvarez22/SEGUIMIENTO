import React from 'react';

interface PaginationControlsProps {
  currentPage: number;
  totalPages: number;
  startItem: number;
  endItem: number;
  totalItems: number;
  itemsPerPage: number;
  onPageChange: (page: number) => void;
  onNextPage: () => void;
  onPrevPage: () => void;
  isMobile: boolean;
}

export const PaginationControls: React.FC<PaginationControlsProps> = ({
  currentPage,
  totalPages,
  startItem,
  endItem,
  totalItems,
  itemsPerPage,
  onPageChange,
  onNextPage,
  onPrevPage,
  isMobile
}) => {
  if (totalPages <= 1) return null;

  const renderPageButtons = () => {
    const buttons = [];
    const maxVisiblePages = isMobile ? 3 : 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

    // Ajustar si estamos cerca del final
    if (endPage - startPage + 1 < maxVisiblePages) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    // Botón de primera página si es necesario
    if (startPage > 1) {
      buttons.push(
        <button
          key="first"
          onClick={() => onPageChange(1)}
          className="px-3 py-2 mx-1 bg-gray-600 hover:bg-gray-700 text-white rounded transition-colors text-sm"
        >
          1
        </button>
      );
      if (startPage > 2) {
        buttons.push(
          <span key="ellipsis1" className="px-2 py-2 text-gray-400">
            ...
          </span>
        );
      }
    }

    // Botones de páginas
    for (let i = startPage; i <= endPage; i++) {
      buttons.push(
        <button
          key={i}
          onClick={() => onPageChange(i)}
          className={`px-3 py-2 mx-1 rounded transition-colors text-sm ${
            i === currentPage
              ? 'bg-blue-600 text-white'
              : 'bg-gray-600 hover:bg-gray-700 text-white'
          }`}
        >
          {i}
        </button>
      );
    }

    // Botón de última página si es necesario
    if (endPage < totalPages) {
      if (endPage < totalPages - 1) {
        buttons.push(
          <span key="ellipsis2" className="px-2 py-2 text-gray-400">
            ...
          </span>
        );
      }
      buttons.push(
        <button
          key="last"
          onClick={() => onPageChange(totalPages)}
          className="px-3 py-2 mx-1 bg-gray-600 hover:bg-gray-700 text-white rounded transition-colors text-sm"
        >
          {totalPages}
        </button>
      );
    }

    return buttons;
  };

  return (
    <div className="mt-4 sm:mt-6 flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4 p-3 sm:p-4 bg-gray-800 rounded-xl shadow-lg">
      {/* Información de resultados */}
      <div className="text-xs sm:text-sm text-gray-300 text-center sm:text-left w-full sm:w-auto">
        <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
          <span>
            Mostrando <span className="font-semibold text-white">{startItem}-{endItem}</span> de{' '}
            <span className="font-semibold text-white">{totalItems}</span>
          </span>
          {isMobile && (
            <span className="text-xs text-gray-400">
              ({itemsPerPage} por página)
            </span>
          )}
        </div>
      </div>

      {/* Controles de navegación */}
      <div className="flex items-center gap-2 w-full sm:w-auto justify-center">
        {/* Botón Anterior */}
        <button
          onClick={onPrevPage}
          disabled={currentPage === 1}
          className={`px-4 py-2.5 sm:px-3 sm:py-2 rounded-lg transition-all text-sm font-medium touch-manipulation active:scale-95 ${
            currentPage === 1
              ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
              : 'bg-gray-600 hover:bg-gray-700 active:bg-gray-800 text-white shadow-md'
          }`}
        >
          {isMobile ? '⬅️' : 'Anterior'}
        </button>

        {/* Números de página */}
        <div className="hidden sm:flex items-center">
          {renderPageButtons()}
        </div>

        {/* Indicador de página en móvil */}
        <div className="sm:hidden text-sm text-gray-300">
          {currentPage} / {totalPages}
        </div>

        {/* Botón Siguiente */}
        <button
          onClick={onNextPage}
          disabled={currentPage === totalPages}
          className={`px-4 py-2.5 sm:px-3 sm:py-2 rounded-lg transition-all text-sm font-medium touch-manipulation active:scale-95 ${
            currentPage === totalPages
              ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
              : 'bg-gray-600 hover:bg-gray-700 active:bg-gray-800 text-white shadow-md'
          }`}
        >
          {isMobile ? '➡️' : 'Siguiente'}
        </button>
      </div>
    </div>
  );
};
