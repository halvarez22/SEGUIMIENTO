export interface AuditLog {
  id: string;
  timestamp: string;
  action: string;
  details: Record<string, any>;
  userAgent?: string;
  sessionId?: string;
}

export class AuditService {
  private static readonly AUDIT_KEY = 'kmz_audit_logs';
  private static readonly MAX_LOGS = 1000;

  /**
   * Registrar una acción en el log de auditoría
   */
  static log(action: string, details: Record<string, any> = {}): void {
    const auditLog: AuditLog = {
      id: `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      action,
      details,
      userAgent: navigator.userAgent,
      sessionId: this.getSessionId()
    };

    try {
      const existingLogs = this.getLogs();
      existingLogs.unshift(auditLog); // Agregar al inicio

      // Mantener solo los logs más recientes
      if (existingLogs.length > this.MAX_LOGS) {
        existingLogs.splice(this.MAX_LOGS);
      }

      localStorage.setItem(this.AUDIT_KEY, JSON.stringify(existingLogs));

      // También loguear en consola para desarrollo
      console.log(`[AUDIT] ${action}:`, details);

    } catch (error) {
      console.error('Error logging audit:', error);
    }
  }

  /**
   * Obtener todos los logs de auditoría
   */
  static getLogs(): AuditLog[] {
    try {
      const stored = localStorage.getItem(this.AUDIT_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Error reading audit logs:', error);
      return [];
    }
  }

  /**
   * Obtener logs filtrados por acción
   */
  static getLogsByAction(action: string): AuditLog[] {
    return this.getLogs().filter(log => log.action === action);
  }

  /**
   * Obtener logs en un rango de fechas
   */
  static getLogsByDateRange(startDate: Date, endDate: Date): AuditLog[] {
    return this.getLogs().filter(log => {
      const logDate = new Date(log.timestamp);
      return logDate >= startDate && logDate <= endDate;
    });
  }

  /**
   * Limpiar logs antiguos (mantener últimos N días)
   */
  static cleanupOldLogs(daysToKeep: number = 30): void {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    const existingLogs = this.getLogs();
    const filteredLogs = existingLogs.filter(log =>
      new Date(log.timestamp) >= cutoffDate
    );

    localStorage.setItem(this.AUDIT_KEY, JSON.stringify(filteredLogs));
    console.log(`[AUDIT] Limpiados logs antiguos. Quedan ${filteredLogs.length} logs`);
  }

  /**
   * Exportar logs como JSON
   */
  static exportLogs(): string {
    const logs = this.getLogs();
    return JSON.stringify(logs, null, 2);
  }

  /**
   * Obtener estadísticas de auditoría
   */
  static getAuditStats(): {
    totalLogs: number;
    actions: Record<string, number>;
    dateRange: { start: string; end: string } | null;
    recentActivity: AuditLog[];
  } {
    const logs = this.getLogs();

    if (logs.length === 0) {
      return {
        totalLogs: 0,
        actions: {},
        dateRange: null,
        recentActivity: []
      };
    }

    // Contar acciones
    const actions: Record<string, number> = {};
    logs.forEach(log => {
      actions[log.action] = (actions[log.action] || 0) + 1;
    });

    // Rango de fechas
    const sortedLogs = logs.sort((a, b) =>
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    const dateRange = {
      start: sortedLogs[0].timestamp,
      end: sortedLogs[sortedLogs.length - 1].timestamp
    };

    // Actividad reciente (últimas 10)
    const recentActivity = logs.slice(0, 10);

    return {
      totalLogs: logs.length,
      actions,
      dateRange,
      recentActivity
    };
  }

  /**
   * Generar ID de sesión único
   */
  private static getSessionId(): string {
    let sessionId = sessionStorage.getItem('kmz_session_id');
    if (!sessionId) {
      sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      sessionStorage.setItem('kmz_session_id', sessionId);
    }
    return sessionId;
  }

  // Métodos de conveniencia para acciones comunes
  static logLogin(): void {
    this.log('USER_LOGIN');
  }

  static logLogout(): void {
    this.log('USER_LOGOUT');
  }

  static logBackupCreated(backupId: string, pointsCount: number): void {
    this.log('BACKUP_CREATED', { backupId, pointsCount });
  }

  static logBackupRestored(backupId: string, pointsCount: number): void {
    this.log('BACKUP_RESTORED', { backupId, pointsCount });
  }

  static logDataCleared(pointsCount: number, trashId: string): void {
    this.log('DATA_CLEARED', { pointsCount, trashId });
  }

  static logTrashRestored(trashId: string, pointsCount: number): void {
    this.log('TRASH_RESTORED', { trashId, pointsCount });
  }

  static logKMZProcessed(fileName: string, pointsCount: number): void {
    this.log('KMZ_PROCESSED', { fileName, pointsCount });
  }

  static logEntryDeleted(entryId: string): void {
    this.log('ENTRY_DELETED', { entryId });
  }

  static logUpdateApplied(added: number, skipped: number, total: number): void {
    this.log('UPDATE_APPLIED', { added, skipped, total });
  }
}
