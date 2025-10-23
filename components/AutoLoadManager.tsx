import React, { useState, useEffect } from 'react';
import { AutoLoadService, AutoLoadResult } from '../services/autoLoadService';
import { UploadIcon, CheckCircleIcon, XCircleIcon, RefreshIcon } from './icons';

interface AutoLoadManagerProps {
  onDataLoaded?: () => void;
}

export const AutoLoadManager: React.FC<AutoLoadManagerProps> = ({ onDataLoaded }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [lastResult, setLastResult] = useState<AutoLoadResult | null>(null);
  const [availableFiles, setAvailableFiles] = useState<string[]>([]);
  const [isAutoLoadEnabled, setIsAutoLoadEnabled] = useState(false);

  // Cargar lista de archivos disponibles
  useEffect(() => {
    loadAvailableFiles();
  }, []);

  // Configurar carga automática si está habilitada
  useEffect(() => {
    if (isAutoLoadEnabled) {
      // Configurar carga automática cada 24 horas
      AutoLoadService.scheduleDailyLoad(24);
      console.log('✅ Carga automática diaria configurada');
    }
  }, [isAutoLoadEnabled]);

  const loadAvailableFiles = async () => {
    try {
      const files = await AutoLoadService.listAvailableFiles();
      setAvailableFiles(files);
    } catch (error) {
      console.error('Error cargando lista de archivos:', error);
    }
  };

  const handleAutoLoad = async () => {
    setIsLoading(true);
    setLastResult(null);

    try {
      const result = await AutoLoadService.loadFromFirebaseStorage();
      setLastResult(result);

      if (result.success && onDataLoaded) {
        onDataLoaded();
      }

      console.log('Resultado de carga automática:', result);

    } catch (error) {
      console.error('Error en carga automática:', error);
      setLastResult({
        success: false,
        loadedFiles: 0,
        skippedFiles: 0,
        errors: [`Error inesperado: ${error instanceof Error ? error.message : 'Error desconocido'}`],
        processedFiles: []
      });
    } finally {
      setIsLoading(false);
    }
  };

  const toggleAutoLoad = () => {
    setIsAutoLoadEnabled(!isAutoLoadEnabled);
  };

  return (
    <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4 sm:p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
          <UploadIcon />
          Gestión de Datos Automática
        </h3>
        <button
          onClick={loadAvailableFiles}
          className="p-2 text-gray-400 hover:text-white transition-colors"
          title="Actualizar lista de archivos"
        >
          <RefreshIcon />
        </button>
      </div>

      {/* Estado de Firebase */}
      <div className="mb-4 p-3 bg-gray-700/50 rounded-lg">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${availableFiles.length > 0 ? 'bg-green-400' : 'bg-yellow-400'}`}></div>
          <span className="text-sm text-gray-300">
            Firebase: {availableFiles.length > 0 ? 'Conectado' : 'Verificando conexión...'}
          </span>
        </div>
        <div className="text-xs text-gray-400 mt-1">
          Archivos disponibles: {availableFiles.length}
        </div>
      </div>

      {/* Controles de carga automática */}
      <div className="space-y-3 mb-6">
        <button
          onClick={handleAutoLoad}
          disabled={isLoading}
          className="w-full flex items-center justify-center gap-2 bg-blue-600/50 hover:bg-blue-600 disabled:bg-blue-800 text-white font-bold py-3 px-4 rounded-lg transition-colors disabled:cursor-not-allowed"
        >
          {isLoading ? (
            <>
              <RefreshIcon className="animate-spin" />
              Cargando archivos...
            </>
          ) : (
            <>
              <UploadIcon />
              Cargar Archivos Automáticamente
            </>
          )}
        </button>

        <button
          onClick={toggleAutoLoad}
          className={`w-full flex items-center justify-center gap-2 font-bold py-2 px-4 rounded-lg transition-colors ${
            isAutoLoadEnabled
              ? 'bg-green-600/50 hover:bg-green-600 text-white'
              : 'bg-gray-600/50 hover:bg-gray-600 text-gray-300'
          }`}
        >
          {isAutoLoadEnabled ? (
            <>
              <CheckCircleIcon />
              Carga Automática: ACTIVADA (cada 24h)
            </>
          ) : (
            <>
              <XCircleIcon />
              Carga Automática: DESACTIVADA
            </>
          )}
        </button>
      </div>

      {/* Resultado de la última carga */}
      {lastResult && (
        <div className={`p-4 rounded-lg border ${
          lastResult.success
            ? 'bg-green-900/20 border-green-500 text-green-300'
            : 'bg-red-900/20 border-red-500 text-red-300'
        }`}>
          <h4 className={`font-semibold mb-2 flex items-center gap-2 ${
            lastResult.success ? 'text-green-300' : 'text-red-300'
          }`}>
            {lastResult.success ? <CheckCircleIcon /> : <XCircleIcon />}
            Resultado de Carga Automática
          </h4>

          <div className="space-y-1 text-sm">
            <div>📁 Archivos cargados: <span className="font-bold">{lastResult.loadedFiles}</span></div>
            <div>⏭️ Archivos omitidos: <span className="font-bold">{lastResult.skippedFiles}</span></div>
            <div>❌ Errores: <span className="font-bold">{lastResult.errors.length}</span></div>
          </div>

          {lastResult.processedFiles.length > 0 && (
            <div className="mt-3">
              <div className="text-sm font-semibold mb-1">Archivos procesados:</div>
              <ul className="text-xs list-disc list-inside space-y-1">
                {lastResult.processedFiles.map((file, index) => (
                  <li key={index}>{file}</li>
                ))}
              </ul>
            </div>
          )}

          {lastResult.errors.length > 0 && (
            <div className="mt-3">
              <div className="text-sm font-semibold mb-1 text-red-300">Errores:</div>
              <ul className="text-xs list-disc list-inside space-y-1 text-red-200">
                {lastResult.errors.map((error, index) => (
                  <li key={index}>{error}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Lista de archivos disponibles */}
      {availableFiles.length > 0 && (
        <div className="mt-6">
          <h4 className="text-sm font-semibold text-gray-300 mb-3">Archivos Disponibles en Firebase:</h4>
          <div className="max-h-32 overflow-y-auto space-y-1">
            {availableFiles.map((file, index) => (
              <div key={index} className="text-xs bg-gray-700/30 px-2 py-1 rounded text-gray-400">
                {file}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Información de uso */}
      <div className="mt-6 p-3 bg-blue-900/20 border border-blue-500/30 rounded-lg">
        <h5 className="text-sm font-semibold text-blue-300 mb-2">💡 Cómo usar:</h5>
        <ul className="text-xs text-blue-200 space-y-1">
          <li>• Sube archivos KMZ a la carpeta <code>kmz-files/</code> en Firebase Storage</li>
          <li>• Haz clic en "Cargar Automáticamente" para procesar archivos nuevos</li>
          <li>• Activa "Carga Automática" para procesamiento diario</li>
          <li>• Los datos se guardan en Firestore para consultas rápidas</li>
        </ul>
      </div>
    </div>
  );
};
