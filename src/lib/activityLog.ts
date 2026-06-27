import { api } from './api';

export interface ActivityLogPayload {
  module: string;
  action: string;
  entityId?: string | null;
  entityName?: string | null;
  oldValue?: Record<string, any> | null;
  newValue?: Record<string, any> | null;
  status?: 'success' | 'failure';
  details?: string | null;
}

/**
 * Fire-and-forget centralized activity logging helper.
 * Never throws or blocks — if logging fails, the main action still succeeds.
 */
export function logActivity(payload: ActivityLogPayload): void {
  api.createActivityLog(payload).catch((err) => {
    console.warn('[ActivityLog] Failed to write log entry:', err?.message ?? err);
  });
}
