import React, { useState } from 'react';
import type { HistoryEntry } from '../types';
import { UpdateService } from '../services/updateService';
import { TrashService } from '../services/trashService';
import { TrashManager } from './TrashManager';

interface HistoryStatsProps {
  history: HistoryEntry[];
  onBackup?: () => void;
  onRestore?: (backupId: string) => void;
  onTrashRestore?: (restoredHistory: HistoryEntry[]) => void;
  availableBackups?: { id: string; timestamp: string; totalEntries: number }[];
}

export const HistoryStats: React.FC<HistoryStatsProps> = ({
  history,
  onBackup,
  onRestore,
  onTrashRestore,
  availableBackups = []
}) => {
  const [isTrashOpen, setIsTrashOpen] = useState(false);
  const stats = UpdateService.getHistoryStats(history);
  const trashStats = TrashService.getTrashStats();

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
      <h3 className="text-lg font-semibold text-white mb-4">📊 Estadísticas del Historial</h3>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
        <div className="text-center">
          <div className="text-2xl font-bold text-blue-400">{stats.totalPoints}</div>
          <div className="text-sm text-gray-400">Puntos Totales</div>
        </div>

        <div className="text-center">
          <div className="text-2xl font-bold text-green-400">{stats.kmzFiles}</div>
          <div className="text-sm text-gray-400">De KMZ</div>
        </div>

        <div className="text-center">
          <div className="text-2xl font-bold text-yellow-400">{stats.imageFiles}</div>
          <div className="text-sm text-gray-400">De Imágenes</div>
        </div>

        <div className="text-center">
          <div className="text-2xl font-bold text-purple-400">{availableBackups.length}</div>
          <div className="text-sm text-gray-400">Backups</div>
        </div>
      </div>

      {stats.dateRange && (
        <div className="mb-4 p-3 bg-gray-700 rounded">
          <div className="text-sm text-gray-300">
            📅 Rango de fechas: <span className="font-semibold">{stats.dateRange.start}</span> - <span className="font-semibold">{stats.dateRange.end}</span>
          </div>
          <div className="text-sm text-gray-400 mt-1">
            Última actualización: {formatDate(stats.lastUpdate)}
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {onBackup && (
          <button
            onClick={onBackup}
            className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded text-sm transition-colors"
          >
            💾 Crear Backup
          </button>
        )}

        {availableBackups.length > 0 && onRestore && (
          <div className="relative">
            <select
              onChange={(e) => {
                if (e.target.value && onRestore) {
                  onRestore(e.target.value);
                  e.target.value = '';
                }
              }}
              className="bg-gray-700 text-white px-3 py-2 rounded text-sm border border-gray-600"
              defaultValue=""
            >
              <option value="">🔄 Restaurar Backup</option>
              {availableBackups.map(backup => (
                <option key={backup.id} value={backup.id}>
                  {formatDate(backup.timestamp)} ({backup.totalEntries} pts)
                </option>
              ))}
            </select>
          </div>
        )}

        {(trashStats.totalItems > 0 || trashStats.totalPoints > 0) && (
          <button
            onClick={() => setIsTrashOpen(true)}
            className="bg-orange-600 hover:bg-orange-700 text-white px-3 py-2 rounded text-sm transition-colors"
          >
            🗑️ Papelera ({trashStats.totalItems})
          </button>
        )}
      </div>

      {availableBackups.length === 0 && trashStats.totalItems === 0 && (
        <div className="text-sm text-gray-500 mt-2">
          💡 Crea tu primer backup para proteger tus datos
        </div>
      )}

      {/* Trash Manager Modal */}
      <TrashManager
        isOpen={isTrashOpen}
        onClose={() => setIsTrashOpen(false)}
        onRestore={(restoredHistory) => {
          if (onTrashRestore) {
            onTrashRestore(restoredHistory);
          }
          setIsTrashOpen(false);
        }}
      />
    </div>
  );
};
