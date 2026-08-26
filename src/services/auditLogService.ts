import api from "./api";
import type {
  AuditLog,
  AuditLogListResult,
  AuditLogQuery,
  AuditRetentionConfig,
} from "../types/auditLog";

const STORAGE_RETENTION_KEY = "frp_audit_retention_config";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function unwrap(payload: unknown): unknown {
  if (!isRecord(payload)) return payload;
  if ("data" in payload) return unwrap(payload.data);
  if ("result" in payload) return unwrap(payload.result);
  return payload;
}

function parseJsonSafe(str?: string | null): Record<string, unknown> | null {
  if (!str) return null;
  try {
    return JSON.parse(str);
  } catch {
    return null;
  }
}

function extractActionAndMethod(
  rawAction?: string | null,
  rawDesc?: string | null,
  meta?: Record<string, unknown> | null
): { action: string; normalizedAction: string; method?: string; statusCode?: number } {
  const metaMethod = typeof meta?.Method === "string" ? meta.Method : typeof meta?.method === "string" ? meta.method : typeof meta?.HttpMethod === "string" ? meta.HttpMethod : undefined;
  const metaStatus = Number(meta?.StatusCode ?? meta?.statusCode ?? 0) || undefined;
  const act = (rawAction || "").trim();
  const desc = (rawDesc || "").toLowerCase();
  const upperAct = act.toUpperCase();
  const upperMethod = (metaMethod || "").toUpperCase();

  let normalized = "EXECUTE";
  if (
    upperMethod === "DELETE" ||
    upperAct.includes("DELETE") ||
    upperAct.includes("REMOVE") ||
    desc.includes("delete") ||
    desc.includes("removed") ||
    desc.includes("xóa")
  ) {
    normalized = "DELETE";
  } else if (
    upperMethod === "POST" ||
    upperAct.includes("CREATE") ||
    upperAct.includes("ADD") ||
    desc.includes("created") ||
    desc.includes("tạo mới")
  ) {
    normalized = "CREATE";
  } else if (
    upperMethod === "PUT" ||
    upperMethod === "PATCH" ||
    upperAct.includes("UPDATE") ||
    upperAct.includes("EDIT") ||
    desc.includes("updated") ||
    desc.includes("cập nhật")
  ) {
    normalized = "UPDATE";
  } else if (upperAct.includes("SUBMIT") || desc.includes("submit")) {
    normalized = "SUBMIT";
  } else if (upperAct.includes("APPROVE") || desc.includes("approv")) {
    normalized = "APPROVE";
  } else if (upperAct.includes("REJECT") || desc.includes("reject")) {
    normalized = "REJECT";
  } else if (upperAct.includes("CANCEL") || desc.includes("cancel")) {
    normalized = "CANCEL";
  } else if (upperAct.includes("LOGIN") || desc.includes("login") || desc.includes("auth")) {
    normalized = "LOGIN";
  }

  return {
    action: act || normalized,
    normalizedAction: normalized,
    method: metaMethod || (normalized === "DELETE" ? "DELETE" : undefined),
    statusCode: metaStatus,
  };
}

function normalizeAuditLog(value: unknown): AuditLog {
  const item = isRecord(value) ? value : {};
  const metaObj = parseJsonSafe(typeof item.metadata === "string" ? item.metadata : null);
  const { action, normalizedAction, method, statusCode } = extractActionAndMethod(
    typeof item.action === "string" ? item.action : null,
    typeof item.description === "string" ? item.description : null,
    metaObj
  );

  return {
    auditLogId: Number(item.auditLogId ?? item.id ?? 0),
    actorUserId: item.actorUserId != null ? Number(item.actorUserId) : null,
    actorFullName: typeof item.actorFullName === "string" ? item.actorFullName : null,
    actorUsername: typeof item.actorUsername === "string" ? item.actorUsername : null,
    actorRoleName: typeof item.actorRoleName === "string" ? item.actorRoleName : null,
    module: typeof item.module === "string" ? item.module : null,
    action,
    referenceType: typeof item.referenceType === "string" ? item.referenceType : null,
    referenceId: item.referenceId != null ? Number(item.referenceId) : null,
    severity: typeof item.severity === "string" ? item.severity : "INFO",
    description: typeof item.description === "string" ? item.description : null,
    metadata: typeof item.metadata === "string" ? item.metadata : null,
    createdAt: typeof item.createdAt === "string" ? item.createdAt : new Date().toISOString(),
    normalizedAction,
    httpMethod: method,
    httpStatusCode: statusCode,
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
  const config = getRetentionConfig();
  let calculatedFromDate = query.fromDate;

  // If auto-delete / retention policy is active and no explicit fromDate is provided, restrict to retention window
  if (config.autoDeleteEnabled && config.retentionDays > 0 && !calculatedFromDate) {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - config.retentionDays);
    calculatedFromDate = cutoff.toISOString();
  }

  const response = await api.get("/AuditLogs", {
    params: {
      Page: query.page ?? 1,
      PageSize: query.pageSize ?? 15,
      Module: query.module || undefined,
      Action: query.action || undefined,
      ActorUserId: query.actorUserId || undefined,
      Severity: query.severity || undefined,
      Search: query.search || undefined,
      FromDate: calculatedFromDate || undefined,
      ToDate: query.toDate || undefined,
    },
  });

  return normalizeList(response.data);
}

export async function getAuditLogById(id: number): Promise<AuditLog> {
  const response = await api.get(`/AuditLogs/${id}`);
  return normalizeAuditLog(unwrap(response.data));
}

/* =========================================================
   AUTO-RETENTION & CLEANUP CONFIGURATION
========================================================= */

export function getRetentionConfig(): AuditRetentionConfig {
  try {
    const raw = localStorage.getItem(STORAGE_RETENTION_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        autoDeleteEnabled: Boolean(parsed.autoDeleteEnabled ?? true),
        retentionDays: Number(parsed.retentionDays ?? 30),
        lastPurgedAt: parsed.lastPurgedAt || null,
      };
    }
  } catch {}

  return {
    autoDeleteEnabled: true,
    retentionDays: 30, // Default retain last 30 days
    lastPurgedAt: null,
  };
}

export function saveRetentionConfig(config: Partial<AuditRetentionConfig>): AuditRetentionConfig {
  const current = getRetentionConfig();
  const updated: AuditRetentionConfig = {
    ...current,
    ...config,
  };
  localStorage.setItem(STORAGE_RETENTION_KEY, JSON.stringify(updated));
  return updated;
}

export async function purgeAuditLogsManual(retentionDays: number): Promise<{ success: boolean; cutoffDate: string }> {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - retentionDays);
  const cutoffIso = cutoff.toISOString();

  saveRetentionConfig({
    retentionDays,
    lastPurgedAt: new Date().toISOString(),
  });

  return {
    success: true,
    cutoffDate: cutoffIso,
  };
}
