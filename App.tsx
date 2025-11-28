import React, { useState, useCallback, useEffect, useMemo } from 'react';
import type { ExtractedData, HistoryEntry } from './types';
import { analyzeImageForLocation } from './services/geminiService';
import { firestoreService } from './firebase/firestore';
import { ImageUploader } from './components/ImageUploader';
import { ResultCard } from './components/ResultCard';
import { HistoryList } from './components/HistoryList';
import { MostVisitedPlaces } from './components/MostVisitedPlaces';
import { Spinner, ErrorIcon, ChatBubbleIcon } from './components/icons';
import { Login } from './components/Login';
import { resizeImage } from './utils/imageUtils';
import { getMostVisitedPlaces } from './utils/locationUtils';
import { parseKMZFile, isKMZFile } from './utils/kmzParser';
import { Chatbot } from './components/Chatbot';

// Exponer funciones de análisis en la consola para depuración
if (typeof window !== 'undefined') {
  (window as any).analyzeFirestoreData = async () => {
    await firestoreService.analyzeStoredData();
  };
  (window as any).compareWithKMZ = async () => {
    await firestoreService.compareWithKMZ();
  };
}

const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [authChecked, setAuthChecked] = useState<boolean>(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [extractedData, setExtractedData] = useState<ExtractedData | null>(null);
  const [loadingState, setLoadingState] = useState({ isLoading: false, message: '' });
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [dateRange, setDateRange] = useState<{ start: string | null; end: string | null }>({ start: null, end: null });
  const [isChatbotOpen, setIsChatbotOpen] = useState<boolean>(false);

   useEffect(() => {
    try {
      const storedAuth = localStorage.getItem('isAuthenticated');
      if (storedAuth === 'true') {
        setIsAuthenticated(true);
      }
    } catch (error) {
      console.error("Failed to read auth status from localStorage", error);
    } finally {
        setAuthChecked(true);
    }
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return;
    
    const loadHistory = async () => {
      try {
        const firestoreHistory = await firestoreService.getHistory();
        setHistory(firestoreHistory);
      } catch (error) {
        console.error("Failed to load history from Firestore", error);
        // Fallback to localStorage for migration
        try {
          const storedHistory = localStorage.getItem('analysisHistory');
          if (storedHistory) {
            const parsedHistory: HistoryEntry[] = JSON.parse(storedHistory);
            // Migration for old history items that don't have a timestamp
            const migratedHistory = parsedHistory.map(item => {
              if (item.timestamp) {
                return item;
              }
              // For old items, derive from the ID, which starts with an ISO string
              const potentialISODate = item.id.substring(0, 24);
              const date = new Date(potentialISODate);
              if (!isNaN(date.getTime())) {
                return { ...item, timestamp: date.toISOString() };
              }
              // Fallback for any unexpected ID format
              return { ...item, timestamp: new Date().toISOString() };
            });
            setHistory(migratedHistory);
          }
        } catch (localError) {
          console.error("Failed to load history from localStorage", localError);
          setHistory([]);
        }
      }
    };

    loadHistory();
  }, [isAuthenticated]);

  const sortedUniqueDates = useMemo(() => {
    const dates = new Set(history.map(entry => entry.data.date).filter(entryDate => entryDate && /^\d{4}-\d{2}-\d{2}$/.test(entryDate)));
    return Array.from(dates).sort((a, b) => new Date(a).getTime() - new Date(b).getTime());
  }, [history]);

  const minDate = sortedUniqueDates[0];
  const maxDate = sortedUniqueDates[sortedUniqueDates.length - 1];

  // Debug: Mostrar información de fechas en consola
  useEffect(() => {
    if (history.length > 0) {
      console.log('=== INFORMACIÓN DE FECHAS EN LA BASE DE DATOS ===');
      console.log(`Total de entradas en historial: ${history.length}`);
      console.log(`Fechas únicas encontradas: ${sortedUniqueDates.length}`);
      console.log(`Rango de fechas disponible:`);
      console.log(`  - Fecha mínima: ${minDate || 'No disponible'}`);
      console.log(`  - Fecha máxima: ${maxDate || 'No disponible'}`);
      console.log(`Todas las fechas únicas:`, sortedUniqueDates);
      
      // Mostrar distribución de fechas
      const dateCounts = new Map<string, number>();
      history.forEach(entry => {
        if (entry.data.date && /^\d{4}-\d{2}-\d{2}$/.test(entry.data.date)) {
          dateCounts.set(entry.data.date, (dateCounts.get(entry.data.date) || 0) + 1);
        }
      });
      console.log('Distribución de visitas por fecha:');
      Array.from(dateCounts.entries())
        .sort((a, b) => a[0].localeCompare(b[0]))
        .forEach(([date, count]) => {
          console.log(`  ${date}: ${count} visita(s)`);
        });
      console.log('================================================');
    }
  }, [history, sortedUniqueDates, minDate, maxDate]);

  const filteredHistory = useMemo(() => {
    const { start, end } = dateRange;

    if (!start && !end) {
      return history;
    }
    
    // Use T00:00:00 to parse dates in the local timezone
    const startDate = start ? new Date(`${start}T00:00:00`) : null;
    const endDate = end ? new Date(`${end}T00:00:00`) : null;

    if (endDate) {
      endDate.setHours(23, 59, 59, 999);
    }

    return history.filter(entry => {
      if (!entry.data.date || !/^\d{4}-\d{2}-\d{2}$/.test(entry.data.date)) return false;
      const entryDate = new Date(`${entry.data.date}T00:00:00`);
      
      if (isNaN(entryDate.getTime())) return false;

      let inRange = true;
      if (startDate && entryDate < startDate) {
        inRange = false;
      }
      if (endDate && entryDate > endDate) {
        inRange = false;
      }
      return inRange;
    });
  }, [history, dateRange]);

  const hasHistoryWithCoordinates = useMemo(() => 
    history.some(entry => entry.data.latitude !== null && entry.data.longitude !== null), 
  [history]);

  // Rango de fechas para lugares más visitados (separado del filtro del historial)
  const [mostVisitedDateRange, setMostVisitedDateRange] = useState<{ start: string | null; end: string | null }>({ start: null, end: null });

  // Filtrar historial para lugares más visitados según el rango de fechas seleccionado
  const filteredHistoryForMostVisited = useMemo(() => {
    const { start, end } = mostVisitedDateRange;

    if (!start && !end) {
      return history; // Si no hay filtro, usar todo el historial
    }
    
    const startDate = start ? new Date(`${start}T00:00:00`) : null;
    const endDate = end ? new Date(`${end}T00:00:00`) : null;

    if (endDate) {
      endDate.setHours(23, 59, 59, 999);
    }

    return history.filter(entry => {
      if (!entry.data.date || !/^\d{4}-\d{2}-\d{2}$/.test(entry.data.date)) return false;
      const entryDate = new Date(`${entry.data.date}T00:00:00`);
      
      if (isNaN(entryDate.getTime())) return false;

      let inRange = true;
      if (startDate && entryDate < startDate) {
        inRange = false;
      }
      if (endDate && entryDate > endDate) {
        inRange = false;
      }
      return inRange;
    });
  }, [history, mostVisitedDateRange]);

  const mostVisitedPlaces = useMemo(() => {
    // Excluir los top 2 lugares más visitados (casa/trabajo) y lugares dentro de 1km de ellos
    // Usar el historial filtrado por el rango de fechas seleccionado
    // Parámetros: limit=3, distanceThreshold=0.1km, excludeHome=true, geofenceRadius=1.0km, excludeTopN=2
    return getMostVisitedPlaces(filteredHistoryForMostVisited, 3, 0.1, true, 1.0, 2);
  }, [filteredHistoryForMostVisited]);

  const handleFileSelect = useCallback(async (files: File[]) => {
    if (files.length === 0) return;

    // Contar archivos KMZ vs imágenes
    const kmzFiles = files.filter(f => isKMZFile(f));
    const imageFiles = files.filter(f => !isKMZFile(f));
    
    setProgress({ current: 0, total: files.length });
    setLoadingState({ isLoading: true, message: `Preparando ${files.length} archivo(s)...` });
    setError(null);

    const analysisPromises = files.map(async (file) => {
      try {
        // Verificar si es un archivo KMZ/KML
        if (isKMZFile(file)) {
          console.log('📦 Procesando archivo KMZ/KML:', file.name);
          const fileIndex = files.indexOf(file) + 1;
          setLoadingState({ isLoading: true, message: `Extrayendo datos del KMZ (${fileIndex}/${files.length}): ${file.name}...` });
          
          // Parsear el archivo KMZ y extraer todas las ubicaciones
          const extractedDataArray = await parseKMZFile(file);
          
          console.log(`✅ Extraídas ${extractedDataArray.length} ubicaciones del archivo KMZ`);
          
          // Analizar fechas extraídas
          const withDate = extractedDataArray.filter(d => d.date && d.date.trim() !== '');
          const withoutDate = extractedDataArray.filter(d => !d.date || d.date.trim() === '');
          console.log(`📅 Fechas extraídas: ${withDate.length} con fecha, ${withoutDate.length} sin fecha`);
          
          if (withDate.length > 0) {
            const uniqueDates = [...new Set(withDate.map(d => d.date))].sort();
            console.log(`📅 Fechas únicas encontradas: ${uniqueDates.length}`);
            if (uniqueDates.length <= 10) {
              console.log(`📅 Fechas: ${uniqueDates.join(', ')}`);
            }
          }
          
          // Crear una entrada por cada ubicación extraída
          const entries = extractedDataArray.map((data, index) => ({
            id: new Date().toISOString() + Math.random() + index,
            data: data,
            imagePreview: '', // Los KMZ no tienen preview de imagen
            timestamp: new Date().toISOString(),
          }));
          
          // Actualizar progreso
          setProgress(prev => ({ ...prev, current: prev.current + 1 }));
          
          return {
            status: 'fulfilled',
            value: entries, // Retornar múltiples entradas
            fileName: file.name
          };
        } else {
          // Procesar como imagen
          const { base64Data, mimeType } = await resizeImage(file, 1024);
          
          // This is a good place to update the preview if needed, e.g., for the first image
          if (files.indexOf(file) === 0) {
             setImagePreview(`data:${mimeType};base64,${base64Data}`);
          }

          const data = await analyzeImageForLocation({ mimeType, data: base64Data });
          
          // After analysis, update progress
          setProgress(prev => ({ ...prev, current: prev.current + 1 }));

          return {
            status: 'fulfilled',
            value: [{
              id: new Date().toISOString() + Math.random(),
              data: data,
              imagePreview: `data:${mimeType};base64,${base64Data}`,
              timestamp: new Date().toISOString(),
            }], // Retornar como array para consistencia
            fileName: file.name
          };
        }
      } catch (err) {
        // Also update progress on failure to not stall the counter
        setProgress(prev => ({ ...prev, current: prev.current + 1 }));
        const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
        return {
          status: 'rejected',
          reason: `Failed to process '${file.name}': ${errorMessage}`,
        };
      }
    });

    // Update message to show processing has started
    if (kmzFiles.length > 0 && imageFiles.length > 0) {
      setLoadingState({ isLoading: true, message: `Procesando ${kmzFiles.length} KMZ y ${imageFiles.length} imagen(es)...` });
    } else if (kmzFiles.length > 0) {
      setLoadingState({ isLoading: true, message: `Extrayendo datos de ${kmzFiles.length} archivo(s) KMZ...` });
    } else {
      setLoadingState({ isLoading: true, message: `Analizando ${imageFiles.length} imagen(es)...` });
    }

    const results = await Promise.all(analysisPromises);
    
    const newEntries: HistoryEntry[] = [];
    const processingErrors: string[] = [];

    results.forEach(result => {
        if(result.status === 'fulfilled') {
            // result.value ahora es un array de entradas
            if (Array.isArray(result.value)) {
              newEntries.push(...result.value);
            } else {
              // Compatibilidad con formato anterior
              newEntries.push(result.value);
            }
        } else {
            processingErrors.push(result.reason);
        }
    });

    const reversedNewEntries = newEntries.reverse();

    if (reversedNewEntries.length > 0) {
      setExtractedData(reversedNewEntries[0].data);
      setImagePreview(reversedNewEntries[0].imagePreview);
      setDateRange({ start: null, end: null });

      // Save to Firebase
      try {
        for (const entry of reversedNewEntries) {
          await firestoreService.saveEntry(entry.data, entry.imagePreview);
        }
        
        // Update local state
        setHistory(prevHistory => {
          const updatedHistory = [...reversedNewEntries, ...prevHistory].slice(0, 50);
          return updatedHistory;
        });
      } catch (firestoreError) {
        console.error("Failed to save to Firestore, falling back to localStorage", firestoreError);
        // Fallback to localStorage
        setHistory(prevHistory => {
          const updatedHistory = [...reversedNewEntries, ...prevHistory].slice(0, 50);
          localStorage.setItem('analysisHistory', JSON.stringify(updatedHistory));
          return updatedHistory;
        });
      }
    }

    if (processingErrors.length > 0) {
      setError(
        `Analysis complete. ${newEntries.length} of ${files.length} images succeeded.\n\nErrors:\n- ${processingErrors.join('\n- ')}`
      );
    }
    
    setLoadingState({ isLoading: false, message: '' });
    setProgress({ current: 0, total: 0 });
  }, []);

  const handleSelectHistory = useCallback((entry: HistoryEntry) => {
    setExtractedData(entry.data);
    setImagePreview(entry.imagePreview);
    if(entry.data.date) {
      setDateRange({ start: entry.data.date, end: entry.data.date });
    }
    setError(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const handleDeleteHistory = useCallback(async (id: string) => {
    try {
      await firestoreService.deleteEntry(id);
      setHistory(prevHistory => prevHistory.filter(item => item.id !== id));
    } catch (error) {
      console.error("Failed to delete from Firestore, falling back to localStorage", error);
      // Fallback to localStorage
      setHistory(prevHistory => {
        const updatedHistory = prevHistory.filter(item => item.id !== id);
        localStorage.setItem('analysisHistory', JSON.stringify(updatedHistory));
        return updatedHistory;
      });
    }
  }, []);

  const handleClearHistory = useCallback(async () => {
    if (window.confirm('Are you sure you want to clear all history? This cannot be undone.')) {
      try {
        await firestoreService.clearHistory();
        setHistory([]);
        setDateRange({ start: null, end: null });
        setExtractedData(null);
        setImagePreview(null);
      } catch (error) {
        console.error("Failed to clear Firestore, falling back to localStorage", error);
        // Fallback to localStorage
        setHistory(() => {
          try {
            localStorage.removeItem('analysisHistory');
          } catch (localError) {
            console.error("Failed to clear history from localStorage", localError);
            window.alert("Your history has been cleared for this session, but could not be permanently removed from browser storage. This might be due to your browser's privacy settings.");
          }
          return [];
        });
        setDateRange({ start: null, end: null });
        setExtractedData(null);
        setImagePreview(null);
      }
    }
  }, []);

 const handleDateRangeChange = useCallback((range: { start: string | null; end: string | null }) => {
    setDateRange(range);
  }, []);

  const handleLogin = useCallback(() => {
    try {
      localStorage.setItem('isAuthenticated', 'true');
      setIsAuthenticated(true);
    } catch (error) {
      console.error("Failed to save auth status to localStorage", error);
      setIsAuthenticated(true);
      window.alert("Could not save your login session. You may be logged out when you refresh the page.");
    }
  }, []);

  const handleLogout = () => {
    if (window.confirm('Are you sure you want to log out? All local history will be cleared.')) {
        try {
            setIsAuthenticated(false);
            setHistory([]);
            setDateRange({ start: null, end: null });
            setExtractedData(null);
            setImagePreview(null);
            localStorage.removeItem('isAuthenticated');
            localStorage.removeItem('analysisHistory');
        } catch (error) {
            console.error("Failed to clear session from localStorage", error);
        }
    }
  };
  
  // Update loading message based on progress
  useEffect(() => {
    if (loadingState.isLoading && progress.total > 0) {
      const newMessage = `Analyzing images... (${progress.current} of ${progress.total})`;
      // Only update state if the message has actually changed to prevent an infinite loop.
      if (loadingState.message !== newMessage) {
        setLoadingState(prevState => ({
          ...prevState,
          message: newMessage,
        }));
      }
    }
  }, [progress, loadingState.isLoading, loadingState.message]);


  if (!authChecked) {
      return (
        <div className="min-h-screen bg-gray-900 flex items-center justify-center">
            <Spinner />
        </div>
      );
  }

  if (!isAuthenticated) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 flex flex-col items-center p-4 md:p-6 lg:p-8">
      <div className="w-full max-w-3xl mx-auto">
        <header className="flex flex-col sm:flex-row justify-between sm:items-center w-full mb-8">
            <div className="text-center sm:text-left">
                <h1 className="text-3xl sm:text-4xl font-bold text-white tracking-tight">
                    Image Location Extractor
                </h1>
                <p className="mt-1 sm:mt-2 text-base sm:text-lg text-gray-400">
                    Upload image(s) to magically extract date, time, and location.
                </p>
            </div>
            <div className="mt-4 sm:mt-0 sm:ml-6 flex flex-col sm:flex-row gap-2 flex-shrink-0 self-center">
              {/* Herramientas de análisis ocultas (disponibles en consola) */}
              {false && (
                <div className="flex flex-col gap-2">
                  <button 
                      onClick={async () => {
                        console.log('🔍 Iniciando análisis de datos en Firestore...');
                        console.log('📝 Abre la consola del navegador (F12) para ver los resultados');
                        await firestoreService.analyzeStoredData();
                      }}
                      className="bg-blue-600/50 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded-lg transition-colors text-sm"
                      title="Analizar datos en Firestore - Abre la consola (F12) para ver resultados"
                  >
                      🔍 Analizar BD
                  </button>
                  <button 
                      onClick={async () => {
                        console.log('🔍 Comparando Firebase con GPS.kmz...');
                        console.log('📝 Abre la consola del navegador (F12) para ver los resultados');
                        await firestoreService.compareWithKMZ();
                      }}
                      className="bg-purple-600/50 hover:bg-purple-600 text-white font-bold py-2 px-4 rounded-lg transition-colors text-sm"
                      title="Comparar Firebase con GPS.kmz - Abre la consola (F12) para ver resultados"
                  >
                      📊 Comparar KMZ
                  </button>
                </div>
              )}
              <button 
                  onClick={handleLogout}
                  className="bg-red-600/50 hover:bg-red-600 text-white font-bold py-2 px-4 rounded-lg transition-colors text-sm"
                  title="Log Out"
              >
                  Logout
              </button>
            </div>
        </header>

        <main className="relative">
          {loadingState.isLoading && (
            <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-gray-900/70 backdrop-blur-sm rounded-lg">
              <Spinner />
              <p className="mt-4 text-lg text-gray-300 animate-pulse">{loadingState.message}</p>
            </div>
          )}

          <ImageUploader
            onFileSelect={handleFileSelect}
            imagePreview={imagePreview}
            isLoading={loadingState.isLoading}
          />

          <div className="mt-8">
            {error && (
              <div className="flex flex-col items-center justify-center p-6 bg-red-900/20 border border-red-500 text-red-300 rounded-lg shadow-lg mb-8">
                <ErrorIcon />
                <p className="mt-2 font-semibold">Extraction Status</p>
                <p className="mt-1 text-sm text-center whitespace-pre-wrap">{error}</p>
              </div>
            )}
            
            {(history.length > 0 || extractedData) && (
               <ResultCard 
                currentResult={extractedData}
                filteredEntries={filteredHistory}
                showFilter={hasHistoryWithCoordinates}
                dateRange={dateRange}
                onDateRangeChange={handleDateRangeChange}
                minDate={minDate}
                maxDate={maxDate}
              />
            )}

            {!error && !extractedData && history.length === 0 && (
              <div className="text-center p-8 bg-gray-800 rounded-lg shadow-lg border-2 border-dashed border-gray-600">
                 <p className="text-gray-400">Your extracted data will appear here.</p>
              </div>
            )}
          </div>

          {mostVisitedPlaces.length > 0 && (
            <section className="mt-12 w-full">
              <MostVisitedPlaces 
                places={mostVisitedPlaces}
                minDate={minDate}
                maxDate={maxDate}
                dateRange={mostVisitedDateRange}
                onDateRangeChange={setMostVisitedDateRange}
                onPlaceClick={(place) => {
                  // Al hacer clic en un lugar, mostrar la primera entrada de ese lugar
                  if (place.entries.length > 0) {
                    handleSelectHistory(place.entries[0]);
                  }
                }}
              />
            </section>
          )}
          
          {history.length > 0 && (
            <section className="mt-12 w-full">
              <HistoryList
                history={history}
                onSelect={handleSelectHistory}
                onDelete={handleDeleteHistory}
                onClear={handleClearHistory}
                onDateClick={(date) => {
                  // Filtrar historial por fecha seleccionada
                  const entriesForDate = history.filter(entry => entry.data.date === date);
                  if (entriesForDate.length > 0) {
                    // Establecer el rango de fechas para mostrar solo ese día en el mapa
                    setDateRange({ start: date, end: date });
                    
                    // Hacer scroll al mapa de Extraction Results
                    setTimeout(() => {
                      const resultCard = document.querySelector('[data-result-card]');
                      if (resultCard) {
                        resultCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
                      }
                    }, 100);
                    
                    // Seleccionar la primera entrada de ese día para mostrar detalles
                    handleSelectHistory(entriesForDate[0]);
                  }
                }}
              />
            </section>
          )}

        </main>
      </div>
       <footer className="w-full max-w-3xl mx-auto text-center mt-12 text-gray-500 text-sm">
          <p>Powered by pai-b, &copy; Todos los derechos reservados</p>
        </footer>

        {history.length > 0 && (
          <>
            <button
              onClick={() => setIsChatbotOpen(true)}
              className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 bg-blue-600 hover:bg-blue-700 text-white p-4 rounded-full shadow-lg transition-transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-900 z-30"
              aria-label="Open travel assistant"
              title="Open Travel Assistant"
            >
              <ChatBubbleIcon />
            </button>
            <Chatbot
              isOpen={isChatbotOpen}
              onClose={() => setIsChatbotOpen(false)}
              history={history}
            />
          </>
        )}
    </div>
  );
};

export default App;
