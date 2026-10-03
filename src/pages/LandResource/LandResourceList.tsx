import {
    useCallback,
    useEffect,
    useMemo,
    useState,
    type FormEvent,
} from "react";

import {
    LandPlot,
    Pencil,
    Plus,
    Search,
    Trash2,
    X,
} from "lucide-react";

import DashboardLayout from "../../layouts/DashboardLayout";
import api from "../../services/api";
import { getAllAllocationLandDetails } from "../../services/allocationDetailService";

import {
    getAreas,
} from "../../services/areaService";

import {
    createLandResource,
    deleteLandResource,
    getAllSoilTypes,
    getLandResources,
    updateLandResource,
} from "../../services/landResourceService";

import type {
    Area,
} from "../../types/area";

import type {
    LandResource,
    LandResourceStatus,
} from "../../types/landResource";

import "./LandResourceList.css";

import { usePopup } from "../../context/PopupContext";
import Pagination from "../../components/Pagination";
import usePagination from "../../hooks/usePagination";

type Role = "Admin" | "Manager" | "Researcher" | "Technician" | "Student" | "Seasonal";

interface LandFormState {
    areaId: string;
    landCode: string;
    areaSize: string;
    location: string;
    soilType: string;
    status: LandResourceStatus;
}

const emptyForm: LandFormState = {
    areaId: "",
    landCode: "",
    areaSize: "",
    location: "",
    soilType: "",
    status: "Available",
};

function getErrorMessage(error: unknown): string {
    if (typeof error === "object" && error !== null && "response" in error) {
        const response = (error as { response?: { data?: { message?: string; error?: string; title?: string; errors?: Record<string, string[]> } } }).response;
        if (response?.data?.errors) return Object.values(response.data.errors).flat().join(" ");
        return response?.data?.message || response?.data?.error || response?.data?.title || "Unable to complete the request.";
    }
    return error instanceof Error ? error.message : "Unable to complete the request.";
}

function statusClass(status: LandResourceStatus): string {
    return `land-resource-status land-resource-status-${status.toLowerCase()}`;
}

export default function LandResourceList() {
  const { showConfirm } = usePopup();
    const role = (localStorage.getItem("role") || "Seasonal") as Role;
    const canManage = role === "Admin" || role === "Manager";
    const [items, setItems] = useState<LandResource[]>([]);
    const [effectiveStatuses, setEffectiveStatuses] = useState<
        Map<number, LandResourceStatus>
    >(() => new Map());
    const [areas, setAreas] = useState<Area[]>([]);
    const [soilTypes, setSoilTypes] = useState<string[]>([]);
    const [loadingSoilTypes, setLoadingSoilTypes] = useState(false);
    const [soilTypeError, setSoilTypeError] = useState("");
    const [keyword, setKeyword] = useState("");
    const [appliedKeyword, setAppliedKeyword] = useState("");
    const [areaFilter, setAreaFilter] = useState("");
    const [soilTypeFilter, setSoilTypeFilter] = useState("");
    const [statusFilter, setStatusFilter] = useState("");
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [deletingId, setDeletingId] = useState<number | null>(null);
    const [error, setError] = useState("");
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editing, setEditing] = useState<LandResource | null>(null);
    const [form, setForm] = useState<LandFormState>(emptyForm);

    const loadData = useCallback(async () => {
        try {
            setLoading(true);
            setError("");
            const [landData, areaData, allocationDetails] = await Promise.all([
                getLandResources({
                    keyword: appliedKeyword || undefined,
                    areaId: areaFilter ? Number(areaFilter) : undefined,
                    page: 1,
                    size: 300,
                }),
                getAreas({ page: 1, size: 300 }),
                getAllAllocationLandDetails().catch(() => []),
            ]);
            const filteredLandData = soilTypeFilter
                ? landData.filter(
                    (item) =>
                        (item.soilType || "")
                            .trim()
                            .toLowerCase() ===
                        soilTypeFilter
                            .trim()
                            .toLowerCase()
                )
                : landData;

            const today = new Date().toISOString().slice(0, 10);
            const candidateDetails = allocationDetails.filter((detail) => {
                const status = String(detail.status || "").toLowerCase();
                const endDate = String(detail.endDate || "").slice(0, 10);

                return (
                    status !== "cancelled" &&
                    status !== "completed" &&
                    (status === "inuse" || endDate >= today)
                );
            });
            const planIds = [...new Set(
                candidateDetails.map((detail) => detail.allocationPlanId)
            )];
            const planStatuses = await Promise.all(
                planIds.map(async (planId) => {
                    try {
                        const response = await api.get(`/AllocationPlans/${planId}`);
                        const plan =
                            response.data?.data ||
                            response.data?.result ||
                            response.data;
                        return [
                            planId,
                            String(plan?.approveStatus || "").toLowerCase(),
                        ] as const;
                    } catch {
                        return [planId, "unknown"] as const;
                    }
                })
            );
            const approvedPlanIds = new Set(
                planStatuses
                    .filter(([, status]) => status === "approved")
                    .map(([planId]) => planId)
            );
            const approvedDetails = candidateDetails.filter((detail) =>
                approvedPlanIds.has(detail.allocationPlanId)
            );
            const nextStatuses = new Map<number, LandResourceStatus>();

            for (const land of filteredLandData) {
                if (land.status === "Unavailable") {
                    nextStatuses.set(land.landId, "Unavailable");
                    continue;
                }

                const landDetails = approvedDetails.filter(
                    (detail) => detail.landId === land.landId
                );
                const currentlyInUse = landDetails.some((detail) => {
                    const status = String(detail.status || "").toLowerCase();
                    const startDate = String(detail.startDate || "").slice(0, 10);
                    const endDate = String(detail.endDate || "").slice(0, 10);

                    return (
                        status === "inuse" ||
                        (startDate <= today && today <= endDate)
                    );
                });

                if (currentlyInUse) {
                    nextStatuses.set(land.landId, "InUse");
                } else if (landDetails.length > 0) {
                    nextStatuses.set(land.landId, "Reserved");
                } else {
                    nextStatuses.set(land.landId, "Available");
                }
            }

            setItems(filteredLandData);
            setEffectiveStatuses(nextStatuses);
            setAreas(areaData);
        } catch (loadError) {
            setError(getErrorMessage(loadError));
            setItems([]);
        } finally {
            setLoading(false);
        }
    }, [appliedKeyword, areaFilter, soilTypeFilter]);

    useEffect(() => { void loadData(); }, [loadData]);

    useEffect(() => {
        const loadSoilTypes = async () => {
            try {
                setLoadingSoilTypes(true);
                setSoilTypeError("");

                const data = await getAllSoilTypes();
                setSoilTypes(Array.isArray(data) ? data : []);
            } catch (soilError) {
                console.error(
                    "Failed to load soil types:",
                    soilError
                );

                setSoilTypes([]);
                setSoilTypeError(
                    "Unable to load soil types."
                );
            } finally {
                setLoadingSoilTypes(false);
            }
        };

        void loadSoilTypes();
    }, []);

    const selectedArea = useMemo(() => areas.find((area) => area.areaId === Number(form.areaId)), [areas, form.areaId]);

    const openCreate = () => {
        setEditing(null);
        setForm(emptyForm);
        setDialogOpen(true);
    };

    const openEdit = (item: LandResource) => {
        setEditing(item);
        setForm({
            areaId: String(item.areaId),
            landCode: item.landCode,
            areaSize: String(item.areaSize),
            location: item.location || "",
            soilType: item.soilType,
            status: item.status,
        });
        setDialogOpen(true);
    };

    const closeDialog = () => {
        if (saving) return;

        setDialogOpen(false);
        setEditing(null);
        setForm(emptyForm);
        setError("");
    };

    const handleSubmit = async (event: FormEvent) => {
        event.preventDefault();
        const areaId = Number(form.areaId);
        const areaSize = Number(form.areaSize);
        if (!Number.isInteger(areaId) || areaId <= 0) { setError("Please select a valid area."); return; }
        if (!form.landCode.trim()) { setError("Land code is required."); return; }
        if (!Number.isFinite(areaSize) || areaSize <= 0) { setError("Area size must be greater than 0."); return; }
        if (!form.soilType.trim()) { setError("Soil type is required."); return; }

        try {
            setSaving(true);
            setError("");
            const payload = {
                areaId,
                landCode: form.landCode.trim(),
                areaSize,
                location: form.location.trim(),
                soilType: form.soilType.trim(),
                status: form.status,
            };
            if (editing) await updateLandResource(editing.landId, payload);
            else await createLandResource(payload);
            setDialogOpen(false);
            await loadData();
            setEditing(null);
            setForm(emptyForm);
        } catch (submitError) {
            setError(getErrorMessage(submitError));
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (item: LandResource) => {
        if (!await showConfirm(`Delete land resource "${item.landCode}"?`)) return;
        try {
            setDeletingId(item.landId);
            setError("");
            await deleteLandResource(item.landId);
            setItems((current) => current.filter((value) => value.landId !== item.landId));
        } catch (deleteError) {
            setError(getErrorMessage(deleteError));
        } finally {
            setDeletingId(null);
        }
    };


    const visibleItems = useMemo(
        () => items.filter(
            (item) =>
                !statusFilter ||
                (effectiveStatuses.get(item.landId) || item.status) === statusFilter
        ),
        [items, statusFilter, effectiveStatuses]
    );

    const { currentPage: currentPageList, pageSize: pageSizeList, paginatedItems: paginatedItemsList, setCurrentPage: setCurrentPageList, setPageSize: setPageSizeList } = usePagination(visibleItems, 10);

    return (
        <DashboardLayout>
            <div className="land-resource-page">
                <header className="land-resource-header">
                    <div><p>Dashboard / Land Resources</p><h1>Land Resources</h1><span>Manage forestry land plots, soil information, capacity and availability.</span></div>
                    {canManage && <button onClick={openCreate}><Plus size={18} /> Add Land Resource</button>}
                </header>

                <section className="land-resource-filter">
                    <div className="land-resource-search">
                        <Search size={18} />
                        <input
                            value={keyword}
                            onChange={(event) => setKeyword(event.target.value)}
                            onKeyDown={(event) => {
                                if (event.key === "Enter") {
                                    setAppliedKeyword(keyword.trim());
                                }
                            }}
                            placeholder="Search code, location or soil type..."
                        />
                    </div>

                    <select
                        value={areaFilter}
                        onChange={(event) => setAreaFilter(event.target.value)}
                    >
                        <option value="">All areas</option>
                        {areas.map((area) => (
                            <option
                                key={area.areaId}
                                value={area.areaId}
                            >
                                {area.areaName}
                            </option>
                        ))}
                    </select>

                    <select
                        value={soilTypeFilter}
                        onChange={(event) =>
                            setSoilTypeFilter(event.target.value)
                        }
                        disabled={loadingSoilTypes}
                    >
                        <option value="">
                            {loadingSoilTypes
                                ? "Loading soil types..."
                                : "All soil types"}
                        </option>

                        {soilTypes.map((soilType) => (
                            <option
                                key={soilType}
                                value={soilType}
                            >
                                {soilType}
                            </option>
                        ))}
                    </select>

                    <select
                        value={statusFilter}
                        onChange={(event) =>
                            setStatusFilter(event.target.value)
                        }
                    >
                        <option value="">All statuses</option>
                        <option value="Available">Available</option>
                        <option value="Reserved">Reserved</option>
                        <option value="InUse">In Use</option>
                        <option value="Maintenance">Maintenance</option>
                        <option value="Unavailable">Unavailable</option>
                    </select>

                    <button
                        type="button"
                        onClick={() => setAppliedKeyword(keyword.trim())}
                    >
                        Search
                    </button>

                    {(keyword ||
                        appliedKeyword ||
                        areaFilter ||
                        soilTypeFilter ||
                        statusFilter) && (
                        <button
                            type="button"
                            className="secondary"
                            onClick={() => {
                                setKeyword("");
                                setAppliedKeyword("");
                                setAreaFilter("");
                                setSoilTypeFilter("");
                                setStatusFilter("");
                            }}
                        >
                            Clear
                        </button>
                    )}
                </section>

                {error && <div className="land-resource-error">{error}</div>}

                <section className="land-resource-card">
                    <div className="land-resource-card-title"><div><h2>Land Resource List</h2><p>{visibleItems.length} land resources</p></div><LandPlot size={22} /></div>
                    {loading ? <div className="land-resource-state">Loading land resources...</div> : visibleItems.length === 0 ? <div className="land-resource-state">No land resources found.</div> : (
                        <div className="land-resource-table-wrap"><table><thead><tr><th>Land code</th><th>Area</th><th>Size</th><th>Location</th><th>Soil type</th><th>Status</th><th>Actions</th></tr></thead><tbody>
                            {paginatedItemsList.map((item) => {
                                const status = effectiveStatuses.get(item.landId) || item.status;

                                return <tr key={item.landId}><td><strong>{item.landCode}</strong></td><td>{item.areaName || `Area #${item.areaId}`}</td><td>{item.areaSize.toLocaleString("vi-VN")} m²</td><td>{item.location || "-"}</td><td>{item.soilType}</td><td><span className={statusClass(status)}>{status === "InUse" ? "In Use" : status}</span></td><td><div className="land-resource-actions">{canManage ? <><button type="button" className="action-btn-pill edit" title="Edit" onClick={() => openEdit(item)}><Pencil size={12} /><span>Edit</span></button><button type="button" className="action-btn-pill delete" disabled={deletingId === item.landId} title="Delete" onClick={() => void handleDelete(item)}><Trash2 size={12} /><span>Delete</span></button></> : <span>View only</span>}</div></td></tr>;
                            })}
                        </tbody></table>

      <Pagination currentPage={currentPageList} totalItems={visibleItems.length} pageSize={pageSizeList} onPageChange={setCurrentPageList} onPageSizeChange={setPageSizeList} /></div>
                    )}
                </section>

                {dialogOpen && <div className="land-resource-overlay" onMouseDown={(event) => event.target === event.currentTarget && closeDialog()}><form className="land-resource-dialog" onSubmit={handleSubmit}>
                    <div className="land-resource-dialog-head"><div><h2>{editing ? "Edit Land Resource" : "Create Land Resource"}</h2><p>{selectedArea ? `Selected area: ${selectedArea.areaName}` : "Select an area and enter land information."}</p></div><button type="button" onClick={closeDialog}><X size={19} /></button></div>
                    <div className="land-resource-form-grid">
                        <label>Area<select value={form.areaId} onChange={(event) => setForm((current) => ({ ...current, areaId: event.target.value }))} disabled={saving} required><option value="">Select area</option>{areas.map((area) => <option key={area.areaId} value={area.areaId}>{area.areaName}</option>)}</select></label>
                        <label>Land code<input value={form.landCode} onChange={(event) => setForm((current) => ({ ...current, landCode: event.target.value }))} disabled={saving} required /></label>
                        <label>Area size (m²)<input type="number" min="0.01" step="0.01" value={form.areaSize} onChange={(event) => setForm((current) => ({ ...current, areaSize: event.target.value }))} disabled={saving} required /></label>
                        <label>
                            Soil type
                            <input
                                type="text"
                                value={form.soilType}
                                onChange={(event) =>
                                    setForm((current) => ({
                                        ...current,
                                        soilType: event.target.value,
                                    }))
                                }
                                placeholder="E.g., Clay Soil, Sandy Soil, Loam..."
                                disabled={saving}
                                required
                            />
                        </label>
                        <label>Location<input value={form.location} onChange={(event) => setForm((current) => ({ ...current, location: event.target.value }))} disabled={saving} /></label>
                        <label>Status<select value={form.status} onChange={(event) => setForm((current) => ({ ...current, status: event.target.value as LandResourceStatus }))} disabled={saving}><option value="Available">Available</option><option value="Reserved">Reserved</option><option value="InUse">In Use</option><option value="Maintenance">Maintenance</option><option value="Unavailable">Unavailable</option></select></label>
                    </div>
                    <div className="land-resource-dialog-actions"><button type="button" className="secondary" onClick={closeDialog} disabled={saving}>Cancel</button><button type="submit" disabled={saving}>{saving ? "Saving..." : editing ? "Save Changes" : "Create Land Resource"}</button></div>
                </form></div>}
            </div>
        </DashboardLayout>
    );
}
