import api from "./api";
import type {
  EquipmentChangeRequest,
  EquipmentChangeRequestPayload,
  EquipmentExtensionRequest,
  EquipmentExtensionRequestPayload,
  EquipmentRequestQuery,
} from "../types/equipmentRequest";

function validateId(id: number): void {
  if (!Number.isInteger(id) || id <= 0) {
    throw new Error("Equipment request ID is invalid.");
  }
}

function cleanParams(params: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(params).filter(([, value]) => value !== undefined && value !== null && value !== "")
  );
}

function unwrap<T>(payload: unknown): T {
  if (typeof payload !== "object" || payload === null) return payload as T;
  const record = payload as Record<string, unknown>;
  if (record.data !== undefined) return unwrap<T>(record.data);
  if (record.result !== undefined) return unwrap<T>(record.result);
  return payload as T;
}

function normalizeList<T>(payload: unknown): T[] {
  const value = unwrap<unknown>(payload);
  if (Array.isArray(value)) return value as T[];
  if (typeof value === "object" && value !== null && Array.isArray((value as { items?: unknown }).items)) {
    return (value as { items: T[] }).items;
  }
  return [];
}

function normalizeRequestId(
  record: Record<string, unknown>,
  kind: "extension" | "change"
): number {
  const kindName = kind === "extension" ? "extension" : "change";
  const normalizeKey = (key: string) => key.toLowerCase().replace(/[^a-z0-9]/g, "");
  const preferredKeys = [
    "id",
    `${kindName}RequestId`,
    `equipment${kindName}RequestId`,
    `${kindName}Id`,
    "requestId",
  ];

  for (const preferredKey of preferredKeys) {
    const matchingKey = Object.keys(record).find(
      (key) => normalizeKey(key) === normalizeKey(preferredKey)
    );
    const value = matchingKey ? Number(record[matchingKey]) : NaN;
    if (Number.isInteger(value) && value > 0) return value;
  }

  // Handle backend entity naming variations such as EquipmentExtensionId or
  // EquipmentExtensionRequestID without mistaking Allocation/Requested IDs.
  const idEntry = Object.entries(record).find(([key, value]) => {
    const normalizedKey = normalizeKey(key);
    return (
      Number.isInteger(Number(value)) &&
      Number(value) > 0 &&
      normalizedKey.endsWith("id") &&
      (normalizedKey.includes("request") || normalizedKey.includes(kindName)) &&
      !normalizedKey.includes("allocation") &&
      !normalizedKey.includes("requested") &&
      !normalizedKey.includes("equipmenttype") &&
      !normalizedKey.includes("equipmentinstance") &&
      !normalizedKey.includes("requestedby")
    );
  });

  return idEntry ? Number(idEntry[1]) : 0;
}

export async function getEquipmentExtensionRequests(
  query: EquipmentRequestQuery = {}
): Promise<EquipmentExtensionRequest[]> {
  const response = await api.get("/EquipmentExtensionRequests", {
    params: cleanParams({
      AllocationEquipmentDetailId: query.allocationEquipmentDetailId,
      RequestedBy: query.requestedBy,
      Status: query.status,
      Page: query.page ?? 1,
      Size: query.size ?? 100,
    }),
  });
  return normalizeList<Record<string, unknown>>(response.data).map((record) => ({
    ...record,
    id: normalizeRequestId(record, "extension"),
    allocationEquipmentDetailId: Number(record.allocationEquipmentDetailId ?? 0),
    requestedBy: Number(record.requestedBy ?? record.requesterId ?? 0),
    requestedEndDate: String(record.requestedEndDate ?? ""),
    reason: (record.reason ?? null) as string | null,
    status: (record.status ?? null) as string | null,
  } as EquipmentExtensionRequest));
}

export async function createEquipmentExtensionRequest(
  payload: EquipmentExtensionRequestPayload
): Promise<EquipmentExtensionRequest> {
  validateId(payload.allocationEquipmentDetailId);
  if (!Number.isFinite(Date.parse(payload.requestedEndDate))) {
    throw new Error("Requested end date is invalid.");
  }
  const response = await api.post("/EquipmentExtensionRequests", {
    allocationEquipmentDetailId: payload.allocationEquipmentDetailId,
    requestedEndDate: payload.requestedEndDate,
    reason: payload.reason?.trim() || null,
  });
  return unwrap<EquipmentExtensionRequest>(response.data);
}

export async function approveEquipmentExtensionRequest(id: number): Promise<void> {
  validateId(id);
  await api.patch(`/EquipmentExtensionRequests/${id}/approve`);
}

export async function rejectEquipmentExtensionRequest(
  id: number,
  rejectionReason: string
): Promise<void> {
  validateId(id);
  if (!rejectionReason.trim()) {
    throw new Error("Rejection reason is required.");
  }
  await api.patch(`/EquipmentExtensionRequests/${id}/reject`, {
    rejectionReason: rejectionReason.trim(),
  });
}

export async function getEquipmentChangeRequests(
  query: EquipmentRequestQuery & {
    requestedEquipmentTypeId?: number;
    requestedEquipmentInstanceId?: number;
  } = {}
): Promise<EquipmentChangeRequest[]> {
  const response = await api.get("/EquipmentChangeRequests", {
    params: cleanParams({
      AllocationEquipmentDetailId: query.allocationEquipmentDetailId,
      RequestedBy: query.requestedBy,
      RequestedEquipmentTypeId: query.requestedEquipmentTypeId,
      RequestedEquipmentInstanceId: query.requestedEquipmentInstanceId,
      Status: query.status,
      Page: query.page ?? 1,
      Size: query.size ?? 100,
    }),
  });
  return normalizeList<Record<string, unknown>>(response.data).map((record) => ({
    ...record,
    id: normalizeRequestId(record, "change"),
    allocationEquipmentDetailId: Number(record.allocationEquipmentDetailId ?? 0),
    requestedBy: Number(record.requestedBy ?? record.requesterId ?? 0),
    requestedEquipmentTypeId: Number(record.requestedEquipmentTypeId ?? 0),
    requestedEquipmentInstanceId: record.requestedEquipmentInstanceId == null
      ? null
      : Number(record.requestedEquipmentInstanceId),
    reason: (record.reason ?? null) as string | null,
    status: (record.status ?? null) as string | null,
  } as EquipmentChangeRequest));
}

export async function createEquipmentChangeRequest(
  payload: EquipmentChangeRequestPayload
): Promise<EquipmentChangeRequest> {
  validateId(payload.allocationEquipmentDetailId);
  validateId(payload.requestedEquipmentTypeId);
  if (payload.requestedEquipmentInstanceId != null) {
    validateId(payload.requestedEquipmentInstanceId);
  }
  const response = await api.post("/EquipmentChangeRequests", {
    allocationEquipmentDetailId: payload.allocationEquipmentDetailId,
    requestedEquipmentTypeId: payload.requestedEquipmentTypeId,
    requestedEquipmentInstanceId: payload.requestedEquipmentInstanceId ?? null,
    reason: payload.reason?.trim() || null,
  });
  return unwrap<EquipmentChangeRequest>(response.data);
}

export async function approveEquipmentChangeRequest(id: number): Promise<void> {
  validateId(id);
  await api.patch(`/EquipmentChangeRequests/${id}/approve`);
}

export async function rejectEquipmentChangeRequest(
  id: number,
  rejectionReason: string
): Promise<void> {
  validateId(id);
  if (!rejectionReason.trim()) {
    throw new Error("Rejection reason is required.");
  }
  await api.patch(`/EquipmentChangeRequests/${id}/reject`, {
    rejectionReason: rejectionReason.trim(),
  });
}
