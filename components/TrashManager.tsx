import React, { useState, useEffect } from 'react';
import { TrashService, TrashItem } from '../services/trashService';
import type { HistoryEntry } from '../types';

interface TrashManagerProps {
  onRestore: (history: HistoryEntry[]) => void;
  isOpen: boolean;
  onClose: () => void;
}

export const TrashManager: React.FC<TrashManagerProps> = ({
  onRestore,
  isOpen,
  onClose
}) => {
  const [trashItems, setTrashItems] = useState<TrashItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadTrashItems();
    }
  }, [isOpen]);

  const loadTrashItems = () => {
    setTrashItems(TrashService.listTrashItems());
  };

  const handleRestore = async (trashItem: TrashItem) => {
    if (loading) return;

    const confirmRestore = window.confirm(
      `¿Restaurar ${trashItem.totalPoints} puntos de datos?\n\n` +
      `Eliminado: ${new Date(trashItem.deletedAt).toLocaleString()}\n` +
      `Razón: ${trashItem.reason}\n\n` +
      `Esto agregará los datos de vuelta a tu historial.`
    );

    if (!confirmRestore) return;

    setLoading(true);
    try {
      const restoredHistory = TrashService.restoreFromTrash(trashItem.id);
      onRestore(restoredHistory);

      // Actualizar lista de papelera
      loadTrashItems();

      alert(`✅ Restaurados ${trashItem.totalPoints} puntos de datos`);
    } catch (error) {
      console.error('Error restoring from trash:', error);
      alert('❌ Error al restaurar desde papelera');
    } finally {
      setLoading(false);
    }
  };

  const handlePermanentDelete = async (trashItem: TrashItem) => {
    const success = TrashService.permanentlyDelete(trashItem.id);
    if (success) {
      loadTrashItems();
    }
  };

  const handleEmptyTrash = () => {
    TrashService.emptyTrash();
    loadTrashItems();
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (!isOpen) return null;

  const stats = TrashService.getTrashStats();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-lg max-w-4xl w-full max-h-[80vh] overflow-hidden">
        <div className="p-6 border-b border-gray-700">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold text-white">🗑️ Papelera de Datos</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white text-2xl"
            >
              ×
            </button>
          </div>

          <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-400">{stats.totalItems}</div>
              <div className="text-sm text-gray-400">Elementos</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-400">{stats.totalPoints}</div>
              <div className="text-sm text-gray-400">Puntos Totales</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-400">
                {stats.oldestItem ? formatDate(stats.oldestItem).split(',')[0] : 'N/A'}
              </div>
              <div className="text-sm text-gray-400">Más Antiguo</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-400">
                {stats.newestItem ? formatDate(stats.newestItem).split(',')[0] : 'N/A'}
              </div>
              <div className="text-sm text-gray-400">Más Reciente</div>
            </div>
          </div>
        </div>

        <div className="p-6 max-h-96 overflow-y-auto">
          {trashItems.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <div className="text-4xl mb-4">🗑️</div>
              <div>La papelera está vacía</div>
              <div className="text-sm mt-2">Los datos eliminados aparecerán aquí para posible recuperación</div>
            </div>
          ) : (
            <div className="space-y-4">
              {trashItems.map(item => (
                <div key={item.id} className="bg-gray-700 rounded-lg p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <div className="font-semibold text-white">
                        {item.totalPoints} puntos de datos
                      </div>
                      <div className="text-sm text-gray-400">
                        Eliminado: {formatDate(item.deletedAt)}
                      </div>
                      <div className="text-sm text-gray-500">
                        Razón: {item.reason}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleRestore(item)}
                        disabled={loading}
                        className="bg-green-600 hover:bg-green-700 disabled:bg-green-800 text-white px-3 py-2 rounded text-sm transition-colors"
                      >
                        🔄 Restaurar
                      </button>
                      <button
                        onClick={() => handlePermanentDelete(item)}
                        className="bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded text-sm transition-colors"
                      >
                        🗑️ Eliminar
                      </button>
                    </div>
                  </div>

                  <div className="text-xs text-gray-500 font-mono">
                    ID: {item.id}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {trashItems.length > 0 && (
          <div className="p-4 border-t border-gray-700 bg-gray-900">
            <div className="flex justify-between items-center">
              <div className="text-sm text-gray-400">
                ⚠️ Vaciar la papelera eliminará todos los elementos permanentemente
              </div>
              <button
                onClick={handleEmptyTrash}
                className="bg-red-700 hover:bg-red-800 text-white px-4 py-2 rounded text-sm transition-colors"
              >
                🗑️ Vaciar Papelera
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
