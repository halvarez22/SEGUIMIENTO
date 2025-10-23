import type { HistoryEntry } from '../types';

export interface TrashItem {
  id: string;
  originalHistory: HistoryEntry[];
  deletedAt: string;
  backupId: string;
  reason: string;
  totalPoints: number;
}

export class TrashService {
  private static readonly TRASH_PREFIX = 'kmz_trash_';
  private static readonly MAX_TRASH_ITEMS = 10;

  /**
   * Mover elementos a la papelera
   */
  static moveToTrash(history: HistoryEntry[], reason: string = 'manual_delete'): string {
    const trashId = `${this.TRASH_PREFIX}${Date.now()}`;

    const trashItem: TrashItem = {
      id: trashId,
      originalHistory: history,
      deletedAt: new Date().toISOString(),
      backupId: 'unknown', // Se actualizará desde UpdateService si existe
      reason,
      totalPoints: history.length
    };

    try {
      localStorage.setItem(trashId, JSON.stringify(trashItem));
      this.cleanupOldTrash();
      console.log(`[AUDIT] Movido a papelera: ${trashId}, ${history.length} puntos, razón: ${reason}`);
      return trashId;
    } catch (error) {
      console.error('Error moving to trash:', error);
      throw new Error('No se pudo mover a la papelera');
    }
  }

  /**
   * Recuperar elementos de la papelera
   */
  static restoreFromTrash(trashId: string): HistoryEntry[] {
    try {
      const trashData = localStorage.getItem(trashId);
      if (!trashData) {
        throw new Error('Elemento no encontrado en papelera');
      }

      const trashItem: TrashItem = JSON.parse(trashData);

      // Log de restauración
      console.log(`[AUDIT] Restaurado de papelera: ${trashId}, ${trashItem.totalPoints} puntos`);

      return trashItem.originalHistory;
    } catch (error) {
      console.error('Error restoring from trash:', error);
      throw new Error('Error al restaurar desde papelera');
    }
  }

  /**
   * Listar elementos en papelera
   */
  static listTrashItems(): TrashItem[] {
    const trashItems: TrashItem[] = [];

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(this.TRASH_PREFIX)) {
        try {
          const trashData = localStorage.getItem(key);
          if (trashData) {
            const trashItem: TrashItem = JSON.parse(trashData);
            trashItems.push(trashItem);
          }
        } catch (error) {
          console.warn(`Error parsing trash item ${key}:`, error);
        }
      }
    }

    // Ordenar por fecha de eliminación (más reciente primero)
    return trashItems.sort((a, b) =>
      new Date(b.deletedAt).getTime() - new Date(a.deletedAt).getTime()
    );
  }

  /**
   * Eliminar permanentemente de la papelera
   */
  static permanentlyDelete(trashId: string): boolean {
    // CONFIRMACIÓN EXTRA para eliminación permanente
    const confirmDelete = window.confirm(
      '🚨 ELIMINACIÓN PERMANENTE 🚨\n\n' +
      'Esta acción ELIMINARÁ DEFINITIVAMENTE los datos de la papelera.\n\n' +
      'NO se podrán recuperar después.\n\n' +
      '¿Estás ABSOLUTAMENTE seguro?'
    );

    if (!confirmDelete) return false;

    const verification = prompt('Escribe "ELIMINAR PERMANENTE" para confirmar:');
    if (verification !== 'ELIMINAR PERMANENTE') {
      alert('Verificación fallida. Operación cancelada.');
      return false;
    }

    try {
      const trashData = localStorage.getItem(trashId);
      if (trashData) {
        const trashItem: TrashItem = JSON.parse(trashData);
        localStorage.removeItem(trashId);
        console.log(`[AUDIT] Eliminación permanente: ${trashId}, ${trashItem.totalPoints} puntos`);
        alert(`✅ Eliminado permanentemente: ${trashItem.totalPoints} puntos`);
        return true;
      }
    } catch (error) {
      console.error('Error permanently deleting from trash:', error);
      alert('❌ Error al eliminar permanentemente');
    }

    return false;
  }

  /**
   * Vaciar completamente la papelera
   */
  static emptyTrash(): boolean {
    const trashItems = this.listTrashItems();

    if (trashItems.length === 0) {
      alert('La papelera ya está vacía');
      return true;
    }

    const confirmEmpty = window.confirm(
      `¿Vaciar papelera?\n\nSe eliminarán ${trashItems.length} elementos (${trashItems.reduce((sum, item) => sum + item.totalPoints, 0)} puntos totales)`
    );

    if (!confirmEmpty) return false;

    let deletedCount = 0;
    trashItems.forEach(item => {
      try {
        localStorage.removeItem(item.id);
        deletedCount++;
      } catch (error) {
        console.warn(`Error deleting trash item ${item.id}:`, error);
      }
    });

    console.log(`[AUDIT] Papelera vaciada: ${deletedCount} elementos eliminados`);
    alert(`🗑️ Papelera vaciada: ${deletedCount} elementos eliminados`);
    return true;
  }

  /**
   * Limpiar elementos antiguos de papelera (mantener máximo)
   */
  private static cleanupOldTrash(): void {
    const trashItems = this.listTrashItems();

    if (trashItems.length > this.MAX_TRASH_ITEMS) {
      const itemsToDelete = trashItems.slice(this.MAX_TRASH_ITEMS);
      itemsToDelete.forEach(item => {
        try {
          localStorage.removeItem(item.id);
          console.log(`[AUDIT] Limpieza automática de papelera: ${item.id}`);
        } catch (error) {
          console.warn(`Error cleaning up trash item ${item.id}:`, error);
        }
      });
    }
  }

  /**
   * Obtener estadísticas de la papelera
   */
  static getTrashStats(): {
    totalItems: number;
    totalPoints: number;
    oldestItem: string | null;
    newestItem: string | null;
  } {
    const trashItems = this.listTrashItems();

    if (trashItems.length === 0) {
      return {
        totalItems: 0,
        totalPoints: 0,
        oldestItem: null,
        newestItem: null
      };
    }

    const totalPoints = trashItems.reduce((sum, item) => sum + item.totalPoints, 0);
    const oldestItem = trashItems[trashItems.length - 1].deletedAt;
    const newestItem = trashItems[0].deletedAt;

    return {
      totalItems: trashItems.length,
      totalPoints,
      oldestItem,
      newestItem
    };
  }
}
