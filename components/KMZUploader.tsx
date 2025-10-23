import React, { useRef } from 'react';
import { Spinner } from './icons';

interface KMZUploaderProps {
  onFileSelect: (files: File[]) => void;
  onUpdateSelect?: (files: File[]) => void;
  fileName: string | null;
  isLoading: boolean;
  hasExistingData?: boolean;
}

export const KMZUploader: React.FC<KMZUploaderProps> = ({
  onFileSelect,
  onUpdateSelect,
  fileName,
  isLoading,
  hasExistingData = false
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      // Validar que sean archivos KMZ
      const fileArray = Array.from(files);
      const invalidFiles = fileArray.filter(file => !file.name.toLowerCase().endsWith('.kmz'));
      if (invalidFiles.length > 0) {
        alert(`Solo se permiten archivos KMZ. Los siguientes archivos no son válidos: ${invalidFiles.map(f => f.name).join(', ')}`);
        return;
      }

      // Determinar si es modo actualización o subida normal
      const isUpdateMode = event.target.getAttribute('data-mode') === 'update';

      if (isUpdateMode && onUpdateSelect) {
        onUpdateSelect(fileArray);
      } else {
        onFileSelect(fileArray);
      }

      // Limpiar el atributo data-mode
      if (event.target) {
        event.target.removeAttribute('data-mode');
        event.target.value = '';
      }
    }
  };

  const handleClick = () => {
    if (isLoading) return;
    fileInputRef.current?.click();
  };

  const uploaderClasses = `relative w-full h-56 sm:h-64 border-2 border-dashed border-gray-500 rounded-md flex items-center justify-center bg-gray-900/50 overflow-hidden transition-colors ${
    isLoading ? 'cursor-wait' : 'cursor-pointer hover:border-blue-500'
  }`;

  return (
    <div className="w-full p-4 bg-gray-800 rounded-lg shadow-xl border border-gray-700">
      <div
        className={uploaderClasses}
        onClick={handleClick}
      >
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          className="hidden"
          accept=".kmz"
          disabled={isLoading}
          multiple
        />
        {fileName ? (
          <div className="text-center text-green-400">
            <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-10 w-10 sm:h-12 sm:w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="mt-2 text-sm sm:text-base font-semibold">Archivo seleccionado:</p>
            <p className="text-xs break-all">{fileName}</p>
          </div>
        ) : (
          <div className="text-center text-gray-400">
            <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-10 w-10 sm:h-12 sm:w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V21a4 4 0 01-4 4H7z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 7h-4a1 1 0 00-1 1v12a4 4 0 01-4 4h4m4-16v12a4 4 0 01-4 4h4" />
            </svg>
            <p className="mt-2 text-sm sm:text-base">Haz clic para subir archivo(s) KMZ</p>
            <p className="text-xs">Solo archivos .kmz</p>
          </div>
        )}

        {/* Loading Overlay */}
        {isLoading && (
          <div className="absolute inset-0 bg-gray-900/60 flex items-center justify-center rounded-md backdrop-blur-sm">
            <Spinner />
          </div>
        )}
      </div>
      <div className="mt-4 space-y-2">
        <button
          onClick={handleClick}
          disabled={isLoading}
          className="w-full bg-blue-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50"
        >
          {isLoading ? 'Procesando...' : fileName ? 'Subir Más Archivos KMZ' : 'Seleccionar Archivo(s) KMZ'}
        </button>

        {hasExistingData && onUpdateSelect && (
          <button
            onClick={() => {
              if (fileInputRef.current) {
                fileInputRef.current.setAttribute('data-mode', 'update');
                fileInputRef.current.click();
              }
            }}
            disabled={isLoading}
            className="w-full bg-green-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-opacity-50 text-sm"
          >
            🔄 Actualizar con Nuevos KMZ
          </button>
        )}
      </div>
    </div>
  );
};