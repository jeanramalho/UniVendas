import { AuditLog } from '../types';
import { STORAGE_KEYS, loadLocalData, saveLocalData } from './supabase';
import { INITIAL_AUDIT_LOGS } from '../data/initialData';
import { fetchAuditLogsFromSupabase, saveAuditLogToSupabase } from './supabaseDb';

export function logAuditEvent(
  userId: string,
  userName: string,
  action: string,
  resource: string,
  details?: string,
  extra?: {
    resourceId?: string;
    oldValues?: Record<string, any>;
    newValues?: Record<string, any>;
    justification?: string;
  }
): AuditLog {
  const logs = loadLocalData<AuditLog[]>(STORAGE_KEYS.AUDIT_LOGS, INITIAL_AUDIT_LOGS);

  const newLog: AuditLog = {
    id: `aud-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
    userId,
    userName,
    action,
    resource,
    details,
    resourceId: extra?.resourceId,
    oldValues: extra?.oldValues,
    newValues: extra?.newValues,
    justification: extra?.justification,
    createdAt: new Date().toISOString()
  };

  const updatedLogs = [newLog, ...logs];
  saveLocalData(STORAGE_KEYS.AUDIT_LOGS, updatedLogs);
  void saveAuditLogToSupabase(newLog);
  return newLog;
}

export async function getAuditLogs(): Promise<AuditLog[]> {
  const dbLogs = await fetchAuditLogsFromSupabase();
  if (dbLogs && dbLogs.length > 0) {
    saveLocalData(STORAGE_KEYS.AUDIT_LOGS, dbLogs);
    return dbLogs;
  }

  return loadLocalData<AuditLog[]>(STORAGE_KEYS.AUDIT_LOGS, INITIAL_AUDIT_LOGS);
}
