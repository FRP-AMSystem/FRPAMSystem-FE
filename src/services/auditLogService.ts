import api from "./api";
import type {
  AuditLog,
  AuditLogListResult,
  AuditLogQuery,
} from "../types/auditLog";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function unwrap(payload: unknown): unknown {
  if (!isRecord(payload)) return payload;
  if ("data" in payload) return unwrap(payload.data);
  if ("result" in payload) return unwrap(payload.result);
  return payload;
}

function normalizeAuditLog(value: unknown): AuditLog {
  const item = isRecord(value) ? value : {};

  return {
    auditLogId: Number(item.auditLogId ?? item.id ?? 0),
    actorUserId: item.actorUserId != null ? Number(item.actorUserId) : null,
    actorFullName: typeof item.actorFullName === "string" ? item.actorFullName : null,
    actorUsername: typeof item.actorUsername === "string" ? item.actorUsername : null,
    actorRoleName: typeof item.actorRoleName === "string" ? item.actorRoleName : null,
    module: typeof item.module === "string" ? item.module : null,
    action: typeof item.action === "string" ? item.action : null,
    referenceType: typeof item.referenceType === "string" ? item.referenceType : null,
    referenceId: item.referenceId != null ? Number(item.referenceId) : null,
    severity: typeof item.severity === "string" ? item.severity : "INFO",
    description: typeof item.description === "string" ? item.description : null,
    metadata: typeof item.metadata === "string" ? item.metadata : null,
    createdAt: typeof item.createdAt === "string" ? item.createdAt : new Date().toISOString(),
  };
}

function normalizeList(payload: unknown): AuditLogListResult {
  const data = unwrap(payload);

  if (Array.isArray(data)) {
    const items = data.map(normalizeAuditLog);
    return {
      items,
      page: 1,
      size: items.length,
      total: items.length,
      totalPages: items.length > 0 ? 1 : 0,
    };
  }

  const value = isRecord(data) ? data : {};
  const rawItems = Array.isArray(value.items) ? value.items : [];
  const items = rawItems.map(normalizeAuditLog);

  return {
    items,
    page: Number(value.page ?? value.currentPage ?? 1),
    size: Number(value.size ?? value.pageSize ?? items.length),
    total: Number(value.total ?? value.totalCount ?? items.length),
    totalPages: Number(
      value.totalPages ??
        (Number(value.total ?? items.length) > 0 ? 1 : 0),
    ),
  };
}

export async function getAuditLogs(
  query: AuditLogQuery = {}
): Promise<AuditLogListResult> {
  const response = await api.get("/AuditLogs", {
    params: {
      Page: query.page ?? 1,
      PageSize: query.pageSize ?? 15,
      Module: query.module || undefined,
      Action: query.action || undefined,
      ActorUserId: query.actorUserId || undefined,
      Severity: query.severity || undefined,
      Search: query.search || undefined,
      FromDate: query.fromDate || undefined,
      ToDate: query.toDate || undefined,
    },
  });

  return normalizeList(response.data);
}

export async function getAuditLogById(id: number): Promise<AuditLog> {
  const response = await api.get(`/AuditLogs/${id}`);
  return normalizeAuditLog(unwrap(response.data));
}
