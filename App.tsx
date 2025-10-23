import React, { useState, useCallback, useEffect, useMemo } from 'react';
import type { GeoData, HistoryEntry, KMZDataSource } from './types';
import { getChatbotResponse } from './services/geminiService';
import { parseKMZFile, convertKMZToGeoData } from './services/kmzService';
import { firestoreService } from './firebase/firestore';
import { db } from './firebase/config';
import { KMZUploader } from './components/KMZUploader';
import { ResultCard } from './components/ResultCard';
import { HistoryList } from './components/HistoryList';
import { Spinner, ErrorIcon, ChatBubbleIcon } from './components/icons';
import { Login } from './components/Login';
import { Chatbot } from './components/Chatbot';
import { HistoryStats } from './components/HistoryStats';
import { SampleDataService } from './services/sampleDataService';
import { UpdateService, UpdateResult } from './services/updateService';
import { AutoUpdateService, UpdateCheckResult } from './services/autoUpdateService';
import { AuditService } from './services/auditService';
import { ApiKeySetup } from './components/ApiKeySetup';
import { DaySelector } from './components/DaySelector';
// import { AutoLoadManager } from './components/AutoLoadManager'; // Desactivado temporalmente
import { GeocodingService } from './services/geocodingService';
import { isChatbotAvailable } from './services/geminiService';

const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [authChecked, setAuthChecked] = useState<boolean>(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [extractedData, setExtractedData] = useState<GeoData | null>(null);
  const [loadingState, setLoadingState] = useState({ isLoading: false, message: '' });
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [dateRange, setDateRange] = useState<{ start: string | null; end: string | null }>({ start: null, end: null });
  const [isChatbotOpen, setIsChatbotOpen] = useState<boolean>(false);
  const [isLoadingSampleData, setIsLoadingSampleData] = useState<boolean>(false);
  const [isUpdating, setIsUpdating] = useState<boolean>(false);
  const [updateResult, setUpdateResult] = useState<UpdateResult | null>(null);
  const [availableBackups, setAvailableBackups] = useState<{ id: string; timestamp: string; totalEntries: number }[]>([]);
  const [updateCheckResult, setUpdateCheckResult] = useState<UpdateCheckResult | null>(null);
  const [checkingForUpdates, setCheckingForUpdates] = useState<boolean>(false);
  const [updateNotification, setUpdateNotification] = useState<string | null>(null);
  const [showApiKeySetup, setShowApiKeySetup] = useState<boolean>(false);
  const [isFirebaseAvailable, setIsFirebaseAvailable] = useState<boolean>(db !== null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [geocodingCache, setGeocodingCache] = useState<Map<string, string>>(new Map());
  const [enrichedFilteredHistory, setEnrichedFilteredHistory] = useState<HistoryEntry[]>([]);

   useEffect(() => {
    try {
      // Restaurar lógica normal de autenticación
      const storedAuth = localStorage.getItem('isAuthenticated');
      if (storedAuth === 'true') {
        setIsAuthenticated(true);
        AuditService.logLogin();
      }
      // Si no hay autenticación previa, mostrar login
    } catch (error) {
      console.error("Failed to read auth status from localStorage", error);
    } finally {
        setAuthChecked(true);
    }
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return;

    const loadHistory = async () => {
      console.log('🔄 [LOAD] Iniciando carga de historial...');
      console.log('🔄 [LOAD] isFirebaseAvailable:', isFirebaseAvailable);
      console.log('🔄 [LOAD] isAuthenticated:', isAuthenticated);

      try {
        console.log('🔄 [LOAD] Intentando cargar desde Firestore...');
        const firestoreHistory = await firestoreService.getHistory();
        console.log('✅ [LOAD] Datos de Firebase obtenidos:', firestoreHistory.length, 'entradas');

        let finalHistory = firestoreHistory;

        // Si Firebase no está disponible o no hay datos, intentar localStorage
        if (!isFirebaseAvailable || finalHistory.length === 0) {
          console.log('🔄 [LOAD] Firebase no disponible o vacío, intentando localStorage...');
          try {
            const storedHistory = localStorage.getItem('analysisHistory');
            console.log('🔄 [LOAD] localStorage contiene:', storedHistory ? `${storedHistory.length} chars` : 'NADA');

            if (storedHistory) {
              const parsedHistory: HistoryEntry[] = JSON.parse(storedHistory);
              console.log('✅ [LOAD] localStorage parseado correctamente:', parsedHistory.length, 'entradas');

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

              console.log('✅ [LOAD] Migración completada:', migratedHistory.length, 'entradas');

              // Combinar datos de Firebase con localStorage si Firebase tiene datos
              if (finalHistory.length > 0) {
                finalHistory = [...migratedHistory, ...finalHistory];
                console.log('✅ [LOAD] Datos combinados: localStorage + Firebase =', finalHistory.length);
              } else {
                finalHistory = migratedHistory;
                console.log('✅ [LOAD] Usando solo localStorage:', finalHistory.length);
              }
            } else {
              console.log('❌ [LOAD] localStorage vacío');
            }
          } catch (localError) {
            console.error("❌ [LOAD] Error cargando localStorage:", localError);
          }
        } else {
          console.log('✅ [LOAD] Usando solo Firebase:', finalHistory.length);
        }

        console.log('🎯 [LOAD] Historial final:', finalHistory.length, 'entradas');
        console.log('🎯 [LOAD] Primeras 3 entradas:', finalHistory.slice(0, 3).map(h => ({ id: h.id.substring(0, 20), date: h.data.date })));

        setHistory(finalHistory);

      } catch (error) {
        console.error("❌ [LOAD] Error cargando Firestore:", error);

        // Intentar cargar desde localStorage como fallback
        try {
          const storedHistory = localStorage.getItem('analysisHistory');
          console.log('🔄 [LOAD] Fallback: intentando localStorage...');

          if (storedHistory) {
            const parsedHistory: HistoryEntry[] = JSON.parse(storedHistory);
            console.log('✅ [LOAD] Fallback exitoso:', parsedHistory.length, 'entradas');
            setHistory(parsedHistory);
          } else {
            console.log('❌ [LOAD] Fallback fallido: localStorage vacío');
            setHistory([]);
          }
        } catch (localError) {
          console.error("❌ [LOAD] Error en fallback localStorage:", localError);
          setHistory([]);
        }
      }
    };

    loadHistory();
  }, [isAuthenticated, isFirebaseAvailable]);

  // Cargar backups disponibles y verificar actualizaciones
  useEffect(() => {
    if (isAuthenticated) {
      const backups = UpdateService.listBackups();
      setAvailableBackups(backups);

      // Verificar si hay recordatorio para actualización manual
      if (AutoUpdateService.shouldRemindManualUpdate()) {
        handleCheckForUpdates();
      }

      // Mostrar notificación sobre API key si no está configurada
      if (!isChatbotAvailable()) {
        setTimeout(() => {
          if (window.confirm(
            '🤖 El chatbot inteligente requiere una API key de Gemini para funcionar.\n\n' +
            '¿Te gustaría configurarla ahora?\n\n' +
            'El resto de la aplicación (mapa, datos, backups) funciona perfectamente sin ella.'
          )) {
            setShowApiKeySetup(true);
          }
        }, 2000); // Mostrar después de 2 segundos para no ser intrusivo
      }
    }
  }, [isAuthenticated]);

  const sortedUniqueDates = useMemo(() => {
    const dates = new Set(history.map(entry => entry.data.date).filter(entryDate => entryDate && /^\d{4}-\d{2}-\d{2}$/.test(entryDate)) as string[]);
    return Array.from(dates).sort((a, b) => new Date(a).getTime() - new Date(b).getTime());
  }, [history]);

  const minDate = sortedUniqueDates[0];
  const maxDate = sortedUniqueDates[sortedUniqueDates.length - 1];

  const filteredHistory = useMemo(() => {
    // Si hay un día específico seleccionado, filtrar solo por ese día
    if (selectedDate) {
      return history.filter(entry => {
        return entry.data.date === selectedDate;
      });
    }

    // Si no hay día seleccionado, usar el rango de fechas
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
  }, [history, dateRange, selectedDate]);

  const hasHistoryWithCoordinates = useMemo(() =>
    history.some(entry => entry.data.latitude !== null && entry.data.longitude !== null),
  [history]);

  // Enriquecer entradas con geocoding
  useEffect(() => {
    const enrichHistory = async () => {
      if (filteredHistory.length === 0) {
        setEnrichedFilteredHistory([]);
        return;
      }

      try {
        const enriched = await Promise.all(
          filteredHistory.map(async (entry) => {
            let location = entry.data.location;

            // Si no tenemos una ubicación geocodificada legible y tenemos coordenadas, obtenerla
            if ((!location || location === entry.data.name || location.startsWith('Ubicación Desconocida') ||
                 /^\d+\.\d+,\s*-\d+\.\d+$/.test(location)) &&
                entry.data.latitude !== null && entry.data.longitude !== null) {
              try {
                const geocodedLocation = await GeocodingService.reverseGeocodeCached(
                  entry.data.latitude,
                  entry.data.longitude
                );
                location = geocodedLocation;
              } catch (error) {
                console.warn('Error geocoding coordinates:', error);
                location = `${entry.data.latitude.toFixed(6)}, ${entry.data.longitude.toFixed(6)}`;
              }
            }

            return {
              ...entry,
              data: {
                ...entry.data,
                location: location || `${entry.data.latitude?.toFixed(6) || 'N/A'}, ${entry.data.longitude?.toFixed(6) || 'N/A'}`
              }
            };
          })
        );

        setEnrichedFilteredHistory(enriched);
      } catch (error) {
        console.error('Error enriching history:', error);
        setEnrichedFilteredHistory(filteredHistory);
      }
    };

    enrichHistory();
  }, [filteredHistory]);

  // Función para manejar selección de día
  const handleDateSelect = useCallback((date: string | null) => {
    setSelectedDate(date);
    // Limpiar geocoding cache cuando cambia la selección
    GeocodingService.clearCache();
    setGeocodingCache(new Map());
  }, []);

  const handleFileSelect = useCallback(async (files: File[]) => {
    if (files.length === 0) return;

    setProgress({ current: 0, total: files.length });
    setLoadingState({ isLoading: true, message: `Preparando ${files.length} archivo(s) KMZ...` });
    setError(null);

    const processingPromises = files.map(async (file) => {
      try {
        // Leer archivo como ArrayBuffer
        const arrayBuffer = await file.arrayBuffer();
        const kmzDataSource: KMZDataSource = {
          fileName: file.name,
          data: arrayBuffer
        };

        // Parsear archivo KMZ
        const kmzData = await parseKMZFile(kmzDataSource);

        // Convertir a formato GeoData
        const geoDataArray = convertKMZToGeoData(kmzData, kmzDataSource.fileName);

        // After processing, update progress
        setProgress(prev => ({ ...prev, current: prev.current + 1 }));

        return {
          status: 'fulfilled',
          value: geoDataArray.map(geoData => ({
            id: `${file.name}_${Date.now()}_${Math.random()}`,
            data: geoData,
            timestamp: new Date().toISOString(),
            source: 'kmz' as const
          })),
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

    // Update message to show processing has started
    setLoadingState({ isLoading: true, message: `Procesando archivos KMZ... (0 of ${files.length})` });

    const results = await Promise.all(processingPromises);

    const newEntries: HistoryEntry[] = [];
    const processingErrors: string[] = [];

    results.forEach(result => {
        if(result.status === 'fulfilled') {
            newEntries.push(...result.value);
        } else {
            processingErrors.push(result.reason);
        }
    });

    if (newEntries.length > 0) {
      setExtractedData(newEntries[0].data);
      setFileName(files[0].name);
      setDateRange({ start: null, end: null });

      // Save to Firebase
      console.log('💾 [SAVE] Iniciando guardado de', newEntries.length, 'entradas nuevas');
      try {
        console.log('💾 [SAVE] Guardando en Firebase...');
        for (const entry of newEntries) {
          console.log('💾 [SAVE] Guardando entrada:', entry.id.substring(0, 20), entry.data.date);
          await firestoreService.saveEntry(entry.data, undefined); // No preview for KMZ
        }
        console.log('✅ [SAVE] Todas las entradas guardadas en Firebase');

        // Update local state
        setHistory(prevHistory => {
          const updatedHistory = [...newEntries, ...prevHistory].slice(0, 50);
          console.log('💾 [SAVE] Estado local actualizado:', updatedHistory.length, 'entradas totales');

          // También guardar en localStorage como respaldo
          try {
            localStorage.setItem('analysisHistory', JSON.stringify(updatedHistory));
            console.log('💾 [SAVE] Respaldo guardado en localStorage');
          } catch (localError) {
            console.error('❌ [SAVE] Error guardando respaldo localStorage:', localError);
          }

          return updatedHistory;
        });
      } catch (firestoreError) {
        console.error("❌ [SAVE] Error guardando en Firestore:", firestoreError);
        console.log('💾 [SAVE] Intentando fallback a localStorage...');

        // Fallback to localStorage
        setHistory(prevHistory => {
          const updatedHistory = [...newEntries, ...prevHistory].slice(0, 50);
          try {
            localStorage.setItem('analysisHistory', JSON.stringify(updatedHistory));
            console.log('✅ [SAVE] Fallback exitoso: guardado en localStorage');
          } catch (localError) {
            console.error('❌ [SAVE] Error en fallback localStorage:', localError);
          }
          return updatedHistory;
        });
      }
    }

    if (processingErrors.length > 0) {
      setError(
        `Procesamiento completado. ${newEntries.length} features procesadas de ${files.length} archivos.\n\nErrores:\n- ${processingErrors.join('\n- ')}`
      );
    }

    setLoadingState({ isLoading: false, message: '' });
    setProgress({ current: 0, total: 0 });
  }, []);

  const handleSelectHistory = useCallback((entry: HistoryEntry) => {
    setExtractedData(entry.data);
    setFileName(entry.source === 'kmz' ? `Archivo: ${entry.id.split('_')[0]}` : null);
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
    // PRIMERA CONFIRMACIÓN - Backup obligatorio
    const backupFirst = window.confirm(
      '🚨 ATENCIÓN: Esta acción ELIMINARÁ TODOS los datos del historial\n\n' +
      '✅ Se creará automáticamente un backup de seguridad ANTES de proceder.\n\n' +
      '¿Deseas continuar y crear el backup?'
    );

    if (!backupFirst) return;

    // Crear backup OBLIGATORIO antes de cualquier eliminación
    try {
      const backupId = UpdateService.createBackup(history);
      alert(`✅ Backup de seguridad creado: ${backupId}\n\nAhora puedes restaurar los datos en cualquier momento.`);
    } catch (backupError) {
      alert('❌ ERROR: No se pudo crear el backup de seguridad. Operación cancelada para proteger tus datos.');
      return;
    }

    // SEGUNDA CONFIRMACIÓN - Verificación del backup
    const backupVerified = window.confirm(
      '✅ Backup creado exitosamente.\n\n' +
      '⚠️ ÚLTIMA CONFIRMACIÓN:\n\n' +
      '¿Estás ABSOLUTAMENTE seguro de que quieres ELIMINAR TODOS los datos?\n\n' +
      'Esta acción NO se puede deshacer, pero podrás restaurar desde el backup creado.'
    );

    if (!backupVerified) return;

    // TERCERA CONFIRMACIÓN - Verificación final con conteo
    const finalConfirm = window.confirm(
      `🚨 CONFIRMACIÓN FINAL 🚨\n\n` +
      `Se eliminarán: ${history.length} puntos de datos\n` +
      `Fecha del último punto: ${history.length > 0 ? history[0].timestamp.split('T')[0] : 'N/A'}\n\n` +
      `¿Confirmas la eliminación permanente?\n\n` +
      `Escribe "ELIMINAR" si estás seguro:`
    );

    if (!finalConfirm) return;

    // Verificación adicional con texto
    const verificationText = prompt(
      'Para confirmar, escribe exactamente: "ELIMINAR TODO EL HISTORIAL"'
    );

    if (verificationText !== 'ELIMINAR TODO EL HISTORIAL') {
      alert('❌ Verificación fallida. Operación cancelada.');
      return;
    }

    // Finalmente, mover a papelera en lugar de eliminar
    try {
      // En lugar de eliminar, mover a "papelera"
      const trashId = `trash_${Date.now()}`;
      localStorage.setItem(`kmz_trash_${trashId}`, JSON.stringify({
        originalHistory: history,
        deletedAt: new Date().toISOString(),
        backupId: UpdateService.listBackups()[0]?.id || 'unknown',
        reason: 'user_requested_clear'
      }));

      // Limpiar estado de la aplicación
      setHistory([]);
      setDateRange({ start: null, end: null });
      setExtractedData(null);
      setFileName(null);

      alert(
        `🗑️ Historial movido a papelera (NO eliminado)\n\n` +
        `ID de papelera: ${trashId}\n\n` +
        `Los datos están seguros y pueden ser recuperados si es necesario.`
      );

      // Log de auditoría
      AuditService.logDataCleared(history.length, trashId);

    } catch (error) {
      console.error("Error moving history to trash:", error);
      alert('❌ Error al mover historial a papelera. Operación cancelada.');
    }
  }, [history]);

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

  const handleLogout = useCallback(() => {
    const logoutConfirm = window.confirm(
      '¿Cerrar sesión?\n\n' +
      '⚠️ IMPORTANTE: Tu historial de datos GPS se mantendrá seguro.\n\n' +
      'Solo se cerrará la sesión actual.'
    );

    if (!logoutConfirm) return;

    try {
      // NO eliminar el historial, solo la sesión
      setIsAuthenticated(false);
      setHistory([]); // Limpiar estado visual, pero datos permanecen en localStorage y Firebase
      setDateRange({ start: null, end: null });
      setExtractedData(null);
      setFileName(null);
      localStorage.removeItem('isAuthenticated');

      // NO eliminar analysisHistory - los datos se mantienen seguros
      AuditService.logLogout();
    } catch (error) {
      console.error("Error during logout:", error);
    }
  }, []);

  const handleLoadSampleData = useCallback(async () => {
    if (isLoadingSampleData) return;

    const confirmLoad = window.confirm(
      '¿Cargar datos de ejemplo? Esto agregará rutas GPS de ejemplo de varios días. ' +
      'Los datos se guardarán en tu historial local.'
    );

    if (!confirmLoad) return;

    setIsLoadingSampleData(true);
    setError(null);

    try {
      const sampleEntries = await SampleDataService.loadAllSampleData();

      if (sampleEntries.length > 0) {
        // Guardar en Firebase
        try {
          for (const entry of sampleEntries) {
            await firestoreService.saveEntry(entry.data, undefined);
          }

          // Actualizar estado local
          setHistory(prevHistory => {
            const updatedHistory = [...sampleEntries, ...prevHistory].slice(0, 50);
            return updatedHistory;
          });

          console.log(`✅ Cargados ${sampleEntries.length} puntos de datos de ejemplo`);
          alert(`¡Datos de ejemplo cargados! Se agregaron ${sampleEntries.length} puntos de rutas GPS.`);

        } catch (firestoreError) {
          console.error("Failed to save sample data to Firestore, falling back to localStorage", firestoreError);
          setHistory(prevHistory => {
            const updatedHistory = [...sampleEntries, ...prevHistory].slice(0, 50);
            localStorage.setItem('analysisHistory', JSON.stringify(updatedHistory));
            return updatedHistory;
          });
        }
      } else {
        alert('No se encontraron datos de ejemplo disponibles.');
      }

    } catch (error) {
      console.error('Error cargando datos de ejemplo:', error);
      setError('Error al cargar los datos de ejemplo. Revisa la consola para más detalles.');
    } finally {
      setIsLoadingSampleData(false);
    }
  }, [isLoadingSampleData]);

  const handleUpdateWithKMZ = useCallback(async (files: File[]) => {
    if (isUpdating) return;

    const confirmUpdate = window.confirm(
      `¿Actualizar historial con ${files.length} archivo(s) KMZ?\n\n` +
      'Esto agregará nuevos datos GPS sin eliminar los existentes. ' +
      'Se creará automáticamente un backup antes de la actualización.'
    );

    if (!confirmUpdate) return;

    setIsUpdating(true);
    setUpdateResult(null);
    setError(null);

    try {
      // Crear backup automático
      const backupId = UpdateService.createBackup(history);
      console.log(`✅ Backup creado: ${backupId}`);

      // Actualizar con archivos nuevos
      const { updatedHistory, result } = await UpdateService.updateWithNewKMZFiles(files, history);

      // Guardar en Firebase
      try {
        for (const entry of updatedHistory.slice(history.length)) { // Solo los nuevos
          await firestoreService.saveEntry(entry.data, undefined);
        }

        // Actualizar estado local
        setHistory(updatedHistory);
        setUpdateResult(result);

        // Actualizar lista de backups
        setAvailableBackups(UpdateService.listBackups());

        alert(`✅ Actualización completada!\n\n` +
              `📊 ${result.added} nuevos puntos agregados\n` +
              `⏭️ ${result.skipped} puntos omitidos (duplicados)\n` +
              `📈 Total: ${result.totalAfter} puntos`);

      } catch (firestoreError) {
        console.error("Failed to save updated data to Firestore, falling back to localStorage", firestoreError);
        setHistory(updatedHistory);
        setUpdateResult(result);
        localStorage.setItem('analysisHistory', JSON.stringify(updatedHistory));
      }

    } catch (error) {
      console.error('Error updating with KMZ files:', error);
      setError('Error al actualizar con archivos KMZ. Revisa la consola para más detalles.');
    } finally {
      setIsUpdating(false);
    }
  }, [isUpdating, history]);

  const handleCreateBackup = useCallback(() => {
    try {
      const backupId = UpdateService.createBackup(history);
      setAvailableBackups(UpdateService.listBackups());
      AuditService.logBackupCreated(backupId, history.length);
      alert(`✅ Backup creado exitosamente!\n\nID: ${backupId}`);
    } catch (error) {
      console.error('Error creating backup:', error);
      alert('❌ Error al crear el backup');
    }
  }, [history]);

  const handleRestoreBackup = useCallback(async (backupId: string) => {
    const confirmRestore = window.confirm(
      '¿Restaurar desde este backup?\n\n' +
      'Esto reemplazará todos los datos actuales con la versión del backup.'
    );

    if (!confirmRestore) return;

    try {
      const backupData = UpdateService.restoreFromBackup(backupId);
      if (backupData) {
        // Crear backup del estado actual antes de restaurar
        UpdateService.createBackup(history);

        // Restaurar datos
        setHistory(backupData);
        localStorage.setItem('analysisHistory', JSON.stringify(backupData));

        // Limpiar estados
        setUpdateResult(null);
        setFileName(null);
        setExtractedData(null);

        AuditService.logBackupRestored(backupId, backupData.length);
        alert(`✅ Restauración completada!\n\nRestaurados ${backupData.length} puntos desde el backup.`);
      } else {
        alert('❌ Error: No se pudo encontrar el backup seleccionado');
      }
    } catch (error) {
      console.error('Error restoring backup:', error);
      alert('❌ Error al restaurar el backup');
    }
  }, [history]);

  const handleCheckForUpdates = useCallback(async () => {
    if (checkingForUpdates) return;

    setCheckingForUpdates(true);
    setUpdateNotification(null);

    try {
      const result = await AutoUpdateService.checkForNewKMZFiles();
      setUpdateCheckResult(result);

      if (result.hasNewFiles) {
        const message = `🎯 ¡Encontrados ${result.newFiles.length} archivos KMZ nuevos disponibles para actualizar!`;
        setUpdateNotification(message);
        console.log(message, result.newFiles);

        // Mostrar alerta también
        setTimeout(() => {
          alert(`${message}\n\nArchivos encontrados:\n${result.newFiles.join('\n')}\n\nUsa el botón "🔄 Actualizar con Nuevos KMZ" para cargarlos.`);
        }, 500);
      } else {
        setUpdateNotification('✅ No hay archivos KMZ nuevos disponibles.');
        setTimeout(() => setUpdateNotification(null), 3000);
      }
    } catch (error) {
      console.error('Error checking for updates:', error);
      setUpdateNotification('❌ Error al verificar actualizaciones.');
      setTimeout(() => setUpdateNotification(null), 3000);
    } finally {
      setCheckingForUpdates(false);
    }
  }, [checkingForUpdates]);
  
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
                <div className="flex items-center gap-3 mb-2">
                    <h1 className="text-3xl sm:text-4xl font-bold text-white tracking-tight">
                        KMZ Map Viewer
                    </h1>
                    <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${
                        isFirebaseAvailable
                            ? 'bg-green-900/50 text-green-300 border border-green-500'
                            : 'bg-yellow-900/50 text-yellow-300 border border-yellow-500'
                    }`}>
                        <div className={`w-2 h-2 rounded-full ${
                            isFirebaseAvailable ? 'bg-green-400' : 'bg-yellow-400'
                        }`}></div>
                        {isFirebaseAvailable ? 'Conectado' : 'Modo Local'}
                    </div>
                </div>
                        <p className="text-base sm:text-lg text-gray-400">
                            {history.length === 0
                                ? 'Carga un archivo KMZ desde tu dispositivo para comenzar.'
                                : `Mostrando ${enrichedFilteredHistory.length} puntos geoespaciales. ${isFirebaseAvailable ? 'Datos sincronizados en la nube.' : 'Modo local activo.'}`
                            }
                        </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-4">
                <div className="flex flex-col sm:flex-row gap-2">
                    {history.length === 0 && (
                        <button
                            onClick={handleLoadSampleData}
                            disabled={isLoadingSampleData}
                            className="flex-shrink-0 bg-green-600/50 hover:bg-green-600 disabled:bg-green-800 text-white font-bold py-2 px-4 rounded-lg transition-colors text-sm disabled:cursor-not-allowed"
                            title="Cargar datos de ejemplo KMZ para probar la aplicación"
                        >
                            {isLoadingSampleData ? 'Cargando...' : '📍 Cargar Ejemplos'}
                        </button>
                    )}

                    {updateCheckResult?.hasNewFiles && (
                        <div className="flex items-center gap-2">
                            <button
                                onClick={handleCheckForUpdates}
                                disabled={checkingForUpdates}
                                className="flex-shrink-0 bg-blue-600/50 hover:bg-blue-600 disabled:bg-blue-800 text-white font-bold py-2 px-4 rounded-lg transition-colors text-sm disabled:cursor-not-allowed"
                                title="Verificar archivos KMZ nuevos"
                            >
                                {checkingForUpdates ? '🔍 Verificando...' : '🔄 Verificar Novedades'}
                            </button>
                            <span className="bg-yellow-500 text-black text-xs px-2 py-1 rounded-full font-bold animate-pulse">
                                {updateCheckResult.newFiles.length} nuevos
                            </span>
                        </div>
                    )}
                </div>
                <button
                    onClick={handleLogout}
                    className="mt-4 sm:mt-0 flex-shrink-0 bg-red-600/50 hover:bg-red-600 text-white font-bold py-2 px-4 rounded-lg transition-colors text-sm self-center"
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

          <KMZUploader
            onFileSelect={handleFileSelect}
            onUpdateSelect={handleUpdateWithKMZ}
            fileName={fileName}
            isLoading={loadingState.isLoading || isUpdating}
            hasExistingData={history.length > 0}
          />

          {/* Mostrar resultado de actualización */}
          {updateResult && (
            <div className="mt-6 p-4 bg-green-900/20 border border-green-500 text-green-300 rounded-lg">
              <h4 className="font-semibold mb-2">✅ Actualización Completada</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>📊 Agregados: <span className="font-bold">{updateResult.added}</span></div>
                <div>⏭️ Omitidos: <span className="font-bold">{updateResult.skipped}</span></div>
                <div>❌ Errores: <span className="font-bold">{updateResult.errors.length}</span></div>
                <div>📈 Total: <span className="font-bold">{updateResult.totalAfter}</span></div>
              </div>
              {updateResult.errors.length > 0 && (
                <details className="mt-2">
                  <summary className="cursor-pointer text-sm">Ver errores</summary>
                  <ul className="mt-1 text-xs list-disc list-inside">
                    {updateResult.errors.map((error, index) => (
                      <li key={index}>{error}</li>
                    ))}
                  </ul>
                </details>
              )}
            </div>
          )}

          {/* Notificación de actualizaciones */}
          {updateNotification && (
            <div className="mt-6 p-4 bg-blue-900/20 border border-blue-500 text-blue-300 rounded-lg animate-pulse">
              <p className="font-semibold">{updateNotification}</p>
            </div>
          )}

          {/* Estadísticas del historial */}
          {history.length > 0 && (
            <div className="mt-6">
              <HistoryStats
                history={history}
                onBackup={handleCreateBackup}
                onRestore={handleRestoreBackup}
                onTrashRestore={(restoredHistory) => {
                  // Agregar los datos restaurados al historial actual
                  setHistory(prevHistory => [...restoredHistory, ...prevHistory]);
                  alert(`✅ Restaurados ${restoredHistory.length} puntos desde la papelera`);
                }}
                availableBackups={availableBackups}
              />
            </div>
          )}

          {/* Gestión de carga automática - DESACTIVADA temporalmente por problemas de Firebase */}
          {false && history.length > 0 && (
            <div className="mt-6">
              <AutoLoadManager
                onDataLoaded={() => {
                  // Recargar datos después de carga automática
                  window.location.reload();
                }}
              />
            </div>
          )}

          {/* Selector de día - solo cuando hay datos cargados */}
          {history.length > 0 && selectedDate === null && (
            <div className="mt-6">
              <DaySelector
                availableDates={sortedUniqueDates}
                selectedDate={selectedDate}
                onDateSelect={handleDateSelect}
                isLoading={false}
              />
            </div>
          )}

          {/* Mostrar día seleccionado */}
          {selectedDate && (
            <div className="mt-6 p-4 bg-blue-900/20 border border-blue-500 text-blue-300 rounded-lg">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="font-semibold">Día seleccionado: {new Date(selectedDate + 'T00:00:00').toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</h3>
                  <p className="text-sm text-blue-200 mt-1">Mostrando {enrichedFilteredHistory.length} puntos de este día</p>
                </div>
                <button
                  onClick={() => handleDateSelect(null)}
                  className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded transition-colors"
                >
                  Cambiar día
                </button>
              </div>
            </div>
          )}

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
                filteredEntries={enrichedFilteredHistory}
                showFilter={hasHistoryWithCoordinates}
                dateRange={dateRange}
                onDateRangeChange={handleDateRangeChange}
                minDate={minDate}
                maxDate={maxDate}
                selectedDate={selectedDate}
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
              className={`fixed bottom-4 right-4 sm:bottom-6 sm:right-6 text-white p-4 rounded-full shadow-lg transition-transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 z-30 ${
                isChatbotAvailable()
                  ? 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500'
                  : 'bg-yellow-600 hover:bg-yellow-700 focus:ring-yellow-500'
              }`}
              aria-label="Open travel assistant"
              title={isChatbotAvailable() ? "Open Travel Assistant" : "Chatbot limitado - Configurar API key para IA completa"}
            >
              {isChatbotAvailable() ? <ChatBubbleIcon /> : <span className="text-lg">🤖</span>}
            </button>

            {!isChatbotAvailable() && (
              <button
                onClick={() => setShowApiKeySetup(true)}
                className="fixed bottom-20 right-4 sm:bottom-24 sm:right-6 bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded-lg shadow-lg transition-colors text-sm z-30"
                title="Configurar API key de Gemini para habilitar chatbot con IA"
              >
                🔑 Habilitar IA
              </button>
            )}
            <Chatbot
              isOpen={isChatbotOpen}
              onClose={() => setIsChatbotOpen(false)}
              history={history}
            />

            {/* API Key Setup Modal */}
            <ApiKeySetup
              isOpen={showApiKeySetup}
              onClose={() => setShowApiKeySetup(false)}
              onApiKeySet={() => {
                setShowApiKeySetup(false);
                // Mostrar notificación de éxito
                alert('✅ ¡API key configurada exitosamente! El chatbot con IA ahora está disponible.');
              }}
            />
          </>
        )}
    </div>
  );
};

export default App;
