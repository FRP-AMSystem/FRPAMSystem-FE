export interface AuditLog {
  auditLogId: number;
  actorUserId?: number | null;
  actorFullName?: string | null;
  actorUsername?: string | null;
  actorRoleName?: string | null;
  module?: string | null;
  action?: string | null;
  referenceType?: string | null;
  referenceId?: number | null;
  severity?: string | null;
  description?: string | null;
  metadata?: string | null;
  createdAt: string;
  normalizedAction?: "DELETE" | "CREATE" | "UPDATE" | "SUBMIT" | "APPROVE" | "REJECT" | "CANCEL" | "LOGIN" | "EXECUTE" | string;
  httpMethod?: string | null;
  httpStatusCode?: number | null;
}

export interface AuditLogQuery {
  page?: number;
  pageSize?: number;
  module?: string;
  action?: string;
  actorUserId?: number;
  severity?: string;
  search?: string;
  fromDate?: string;
  toDate?: string;
}

export interface AuditLogListResult {
  items: AuditLog[];
  page: number;
  size: number;
  total: number;
  totalPages: number;
}

export interface AuditRetentionConfig {
  autoDeleteEnabled: boolean;
  retentionDays: number;
  lastPurgedAt?: string | null;
}
