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

import {
    getAreas,
} from "../../services/areaService";

import {
    createLandResource,
    deleteLandResource,
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

type Role = "Manager" | "Researcher" | "Technician" | "Student";

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
    const role = (localStorage.getItem("role") || "Student") as Role;
    const canManage = role === "Admin" || role === "Manager";
    const [items, setItems] = useState<LandResource[]>([]);
    const [areas, setAreas] = useState<Area[]>([]);
    const [keyword, setKeyword] = useState("");
    const [appliedKeyword, setAppliedKeyword] = useState("");
    const [areaFilter, setAreaFilter] = useState("");
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
            const [landData, areaData] = await Promise.all([
                getLandResources({
                    keyword: appliedKeyword || undefined,
                    areaId: areaFilter ? Number(areaFilter) : undefined,
                    status: statusFilter ? statusFilter as LandResourceStatus : undefined,
                    page: 1,
                    size: 300,
                }),
                getAreas({ page: 1, size: 300 }),
            ]);
            setItems(landData);
            setAreas(areaData);
        } catch (loadError) {
            setError(getErrorMessage(loadError));
            setItems([]);
        } finally {
            setLoading(false);
        }
    }, [appliedKeyword, areaFilter, statusFilter]);

    useEffect(() => { void loadData(); }, [loadData]);

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
        if (!window.confirm(`Delete land resource "${item.landCode}"?`)) return;
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

    return (
        <DashboardLayout>
            <div className="land-resource-page">
                <header className="land-resource-header">
                    <div><p>Dashboard / Land Resources</p><h1>Land Resources</h1><span>Manage forestry land plots, soil information, capacity and availability.</span></div>
                    {canManage && <button onClick={openCreate}><Plus size={18} /> Add Land Resource</button>}
                </header>

                <section className="land-resource-filter">
                    <div className="land-resource-search"><Search size={18} /><input value={keyword} onChange={(event) => setKeyword(event.target.value)} onKeyDown={(event) => event.key === "Enter" && setAppliedKeyword(keyword.trim())} placeholder="Search code, location or soil type..." /></div>
                    <select value={areaFilter} onChange={(event) => setAreaFilter(event.target.value)}><option value="">All areas</option>{areas.map((area) => <option key={area.areaId} value={area.areaId}>{area.areaName}</option>)}</select>
                    <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}><option value="">All statuses</option><option value="Available">Available</option><option value="Reserved">Reserved</option><option value="InUse">In Use</option><option value="Maintenance">Maintenance</option><option value="Unavailable">Unavailable</option></select>
                    <button onClick={() => setAppliedKeyword(keyword.trim())}>Search</button>
                    {(keyword || appliedKeyword || areaFilter || statusFilter) && <button className="secondary" onClick={() => { setKeyword(""); setAppliedKeyword(""); setAreaFilter(""); setStatusFilter(""); }}>Clear</button>}
                </section>

                {error && <div className="land-resource-error">{error}</div>}

                <section className="land-resource-card">
                    <div className="land-resource-card-title"><div><h2>Land Resource List</h2><p>{items.length} land resources</p></div><LandPlot size={22} /></div>
                    {loading ? <div className="land-resource-state">Loading land resources...</div> : items.length === 0 ? <div className="land-resource-state">No land resources found.</div> : (
                        <div className="land-resource-table-wrap"><table><thead><tr><th>ID</th><th>Land code</th><th>Area</th><th>Size</th><th>Location</th><th>Soil type</th><th>Status</th><th>Actions</th></tr></thead><tbody>
                            {items.map((item) => <tr key={item.landId}><td>#{item.landId}</td><td><strong>{item.landCode}</strong></td><td>{item.areaName || `Area #${item.areaId}`}</td><td>{item.areaSize.toLocaleString("vi-VN")} ha</td><td>{item.location || "-"}</td><td>{item.soilType}</td><td><span className={statusClass(item.status)}>{item.status === "InUse" ? "In Use" : item.status}</span></td><td><div className="land-resource-actions">{canManage ? <><button type="button" className="action-btn-pill edit" title="Edit" onClick={() => openEdit(item)}><Pencil size={12} /><span>Edit</span></button><button type="button" className="action-btn-pill delete" disabled={deletingId === item.landId} title="Delete" onClick={() => void handleDelete(item)}><Trash2 size={12} /><span>Delete</span></button></> : <span>View only</span>}</div></td></tr>)}
                        </tbody></table></div>
                    )}
                </section>

                {dialogOpen && <div className="land-resource-overlay" onMouseDown={(event) => event.target === event.currentTarget && closeDialog()}><form className="land-resource-dialog" onSubmit={handleSubmit}>
                    <div className="land-resource-dialog-head"><div><h2>{editing ? "Edit Land Resource" : "Create Land Resource"}</h2><p>{selectedArea ? `Selected area: ${selectedArea.areaName}` : "Select an area and enter land information."}</p></div><button type="button" onClick={closeDialog}><X size={19} /></button></div>
                    <div className="land-resource-form-grid">
                        <label>Area<select value={form.areaId} onChange={(event) => setForm((current) => ({ ...current, areaId: event.target.value }))} disabled={saving} required><option value="">Select area</option>{areas.map((area) => <option key={area.areaId} value={area.areaId}>{area.areaName}</option>)}</select></label>
                        <label>Land code<input value={form.landCode} onChange={(event) => setForm((current) => ({ ...current, landCode: event.target.value }))} disabled={saving} required /></label>
                        <label>Area size (ha)<input type="number" min="0.01" step="0.01" value={form.areaSize} onChange={(event) => setForm((current) => ({ ...current, areaSize: event.target.value }))} disabled={saving} required /></label>
                        <label>Soil type<input value={form.soilType} onChange={(event) => setForm((current) => ({ ...current, soilType: event.target.value }))} disabled={saving} required /></label>
                        <label>Location<input value={form.location} onChange={(event) => setForm((current) => ({ ...current, location: event.target.value }))} disabled={saving} /></label>
                        <label>Status<select value={form.status} onChange={(event) => setForm((current) => ({ ...current, status: event.target.value as LandResourceStatus }))} disabled={saving}><option value="Available">Available</option><option value="Reserved">Reserved</option><option value="InUse">In Use</option><option value="Maintenance">Maintenance</option><option value="Unavailable">Unavailable</option></select></label>
                    </div>
                    <div className="land-resource-dialog-actions"><button type="button" className="secondary" onClick={closeDialog} disabled={saving}>Cancel</button><button type="submit" disabled={saving}>{saving ? "Saving..." : editing ? "Save Changes" : "Create Land Resource"}</button></div>
                </form></div>}
            </div>
        </DashboardLayout>
    );
}
