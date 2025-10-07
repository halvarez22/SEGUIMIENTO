import React, { useState, useCallback, useEffect, useMemo } from 'react';
import type { ExtractedData, HistoryEntry } from './types';
import { analyzeImageForLocation } from './services/geminiService';
import { firestoreService } from './firebase/firestore';
import { ImageUploader } from './components/ImageUploader';
import { ResultCard } from './components/ResultCard';
import { HistoryList } from './components/HistoryList';
import { Spinner, ErrorIcon, ChatBubbleIcon } from './components/icons';
import { Login } from './components/Login';
import { resizeImage } from './utils/imageUtils';
import { Chatbot } from './components/Chatbot';

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

  const handleFileSelect = useCallback(async (files: File[]) => {
    if (files.length === 0) return;

    setProgress({ current: 0, total: files.length });
    setLoadingState({ isLoading: true, message: `Preparing ${files.length} image(s)...` });
    setError(null);

    const analysisPromises = files.map(async (file) => {
      try {
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
          value: {
            id: new Date().toISOString() + Math.random(),
            data: data,
            imagePreview: `data:${mimeType};base64,${base64Data}`,
            timestamp: new Date().toISOString(),
          },
          fileName: file.name
        };
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

    // Update message to show analysis has started
    setLoadingState({ isLoading: true, message: `Analyzing images... (0 of ${files.length})` });

    const results = await Promise.all(analysisPromises);
    
    const newEntries: HistoryEntry[] = [];
    const processingErrors: string[] = [];

    results.forEach(result => {
        if(result.status === 'fulfilled') {
            newEntries.push(result.value);
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
            <button 
                onClick={handleLogout}
                className="mt-4 sm:mt-0 sm:ml-6 flex-shrink-0 bg-red-600/50 hover:bg-red-600 text-white font-bold py-2 px-4 rounded-lg transition-colors text-sm self-center"
                title="Log Out"
            >
                Logout
            </button>
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
          
          {history.length > 0 && (
            <section className="mt-12 w-full">
              <HistoryList
                history={history}
                onSelect={handleSelectHistory}
                onDelete={handleDeleteHistory}
                onClear={handleClearHistory}
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
