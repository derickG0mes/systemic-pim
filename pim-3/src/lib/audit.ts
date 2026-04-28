export interface AuditLog {
  id: string;
  timestamp: Date;
  action: string;
  details: string;
  userId: string;
}

const logs: AuditLog[] = [];

export function addAuditLog(action: string, details: string, userId: string): AuditLog {
  const entry: AuditLog = {
    id: `log_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    timestamp: new Date(),
    action,
    details,
    userId,
  };
  logs.push(entry);
  return entry;
}

export function getAuditLogs(): AuditLog[] {
  return [...logs];
}
