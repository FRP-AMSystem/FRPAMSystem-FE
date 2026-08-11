import {
    useCallback,
    useEffect,
    useMemo,
    useState,
    type FormEvent,
} from "react";

import {
    CheckCircle,
    Cpu,
    Pencil,
    Plus,
    Search,
    Trash2,
    X,
} from "lucide-react";

import DashboardLayout from "../../layouts/DashboardLayout";

import {
    getEquipmentTypes,
} from "../../services/equipmentService";

import {
    confirmEquipmentReceipt,
    createEquipmentInstance,
    deleteEquipmentInstance,
    getEquipmentInstances,
    updateEquipmentInstance,
} from "../../services/equipmentInstanceService";

import type {
    EquipmentType,
} from "../../types/equipment";

import type {
    EquipmentConditionLevel,
    EquipmentInstance,
    EquipmentInstanceQuery,
    EquipmentInstanceRequest,
    EquipmentInstanceStatus,
} from "../../types/equipmentInstance";

import "./EquipmentInstanceList.css";

type Role =
    | "Manager"
    | "Researcher"
    | "Technician"
    | "Student";

interface FormState {
    equipmentTypeId: string;

    assetCode: string;
    serialNumber: string;

    usageHours: string;

    lastMaintenanceDate: string;
    nextMaintenanceDate: string;

    conditionLevel: EquipmentConditionLevel;
    status: EquipmentInstanceStatus;

    note: string;
}

const equipmentStatuses: EquipmentInstanceStatus[] = [
    "Available",
    "Reserved",
    "InUse",
    "Maintenance",
    "Broken",
    "Unavailable",
];

const conditionLevels: EquipmentConditionLevel[] = [
    "New",
    "Good",
    "Fair",
    "Poor",
    "Damaged",
];

const emptyForm: FormState = {
    equipmentTypeId: "",

    assetCode: "",
    serialNumber: "",

    usageHours: "0",

    lastMaintenanceDate: "",
    nextMaintenanceDate: "",

    conditionLevel: "Good",
    status: "Available",

    note: "",
};

function getCurrentRole(): Role {
    const storedRole =
        localStorage.getItem("role");

    if (
        storedRole === "Admin" ||
        storedRole === "Manager" ||
        storedRole === "Researcher" ||
        storedRole === "Technician" ||
        storedRole === "Student"
    ) {
        return storedRole;
    }

    return "Student";
}

function getErrorMessage(
    error: unknown
): string {
    if (
        typeof error === "object" &&
        error !== null &&
        "response" in error
    ) {
        const response = (
            error as {
                response?: {
                    data?: {
                        message?: string;
                        error?: string;
                        title?: string;

                        errors?: Record<
                            string,
                            string[]
                        >;
                    };
                };
            }
        ).response;

        if (response?.data?.errors) {
            return Object.values(
                response.data.errors
            )
                .flat()
                .join(" ");
        }

        return (
            response?.data?.message ||
            response?.data?.error ||
            response?.data?.title ||
            "Unable to complete the request."
        );
    }

    if (error instanceof Error) {
        return error.message;
    }

    return "Unable to complete the request.";
}

function toDateInputValue(
    value?: string | null
): string {
    if (!value) {
        return "";
    }

    const date = new Date(value);

    if (
        Number.isNaN(
            date.getTime()
        )
    ) {
        return value.slice(0, 10);
    }

    const year =
        date.getFullYear();

    const month =
        String(
            date.getMonth() + 1
        ).padStart(2, "0");

    const day =
        String(
            date.getDate()
        ).padStart(2, "0");

    return `${year}-${month}-${day}`;
}

function formatDate(
    value?: string | null
): string {
    if (!value) {
        return "-";
    }

    const date = new Date(value);

    if (
        Number.isNaN(
            date.getTime()
        )
    ) {
        return "-";
    }

    return date.toLocaleDateString(
        "vi-VN"
    );
}

function getEquipmentTypeLabel(
    equipmentType: EquipmentType
): string {
    return (
        equipmentType.equipmentTypeName ||
        `Equipment Type #${equipmentType.equipmentTypeId}`
    );
}

function getStatusLabel(
    status: EquipmentInstanceStatus
): string {
    switch (status) {
        case "InUse":
            return "In Use";

        default:
            return status;
    }
}

function getConditionClassName(
    conditionLevel: EquipmentConditionLevel
): string {
    return [
        "condition",
        conditionLevel.toLowerCase(),
    ].join(" ");
}

function getStatusClassName(
    status: EquipmentInstanceStatus
): string {
    return [
        "status",
        status.toLowerCase(),
    ].join(" ");
}

export default function EquipmentInstanceList() {
    const role =
        getCurrentRole();

    const canManage =
        role === "Admin" || role === "Manager";

    const [
        items,
        setItems,
    ] = useState<
        EquipmentInstance[]
    >([]);

    const [
        equipmentTypes,
        setEquipmentTypes,
    ] = useState<
        EquipmentType[]
    >([]);

    const [
        keyword,
        setKeyword,
    ] = useState("");

    const [
        appliedKeyword,
        setAppliedKeyword,
    ] = useState("");

    const [
        typeFilter,
        setTypeFilter,
    ] = useState("");

    const [
        statusFilter,
        setStatusFilter,
    ] = useState<
        EquipmentInstanceStatus | ""
    >("");

    const [
        conditionFilter,
        setConditionFilter,
    ] = useState<
        EquipmentConditionLevel | ""
    >("");

    const [
        loading,
        setLoading,
    ] = useState(true);

    const [
        saving,
        setSaving,
    ] = useState(false);

    const [
        deletingId,
        setDeletingId,
    ] = useState<number | null>(
        null
    );

    const [
        error,
        setError,
    ] = useState("");

    const [
        dialogOpen,
        setDialogOpen,
    ] = useState(false);

    const [
        editing,
        setEditing,
    ] = useState<
        EquipmentInstance | null
    >(null);

    const [
        form,
        setForm,
    ] = useState<FormState>(
        emptyForm
    );

    const [receiptConfirmItem, setReceiptConfirmItem] = useState<EquipmentInstance | null>(null);
    const [confirmCondition, setConfirmCondition] = useState<EquipmentConditionLevel>("Good");
    const [confirmNotes, setConfirmNotes] = useState("");
    const [confirming, setConfirming] = useState(false);

    const openConfirmReceipt = (item: EquipmentInstance) => {
        setReceiptConfirmItem(item);
        setConfirmCondition(item.conditionLevel || "Good");
        setConfirmNotes("");
        setError("");
    };

    const handleConfirmReceiptSubmit = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!receiptConfirmItem) return;
        try {
            setConfirming(true);
            setError("");
            await confirmEquipmentReceipt(receiptConfirmItem.equipmentInstanceId, {
                receivedCondition: confirmCondition,
                receiptNotes: confirmNotes.trim(),
            });
            setItems((prev) =>
                prev.map((inst) =>
                    inst.equipmentInstanceId === receiptConfirmItem.equipmentInstanceId
                        ? {
                              ...inst,
                              receiptConfirmed: true,
                              receiptConfirmedAt: new Date().toISOString(),
                              receiptNotes: confirmNotes.trim() || null,
                              receivedCondition: confirmCondition,
                              conditionLevel: confirmCondition,
                              status: "InUse",
                          }
                        : inst
                )
            );
            setReceiptConfirmItem(null);
        } catch (err: any) {
            setError(getErrorMessage(err));
        } finally {
            setConfirming(false);
        }
    };

    const typeMap =
        useMemo(() => {
            return new Map(
                equipmentTypes.map(
                    (equipmentType) => [
                        equipmentType.equipmentTypeId,
                        getEquipmentTypeLabel(
                            equipmentType
                        ),
                    ]
                )
            );
        }, [equipmentTypes]);

    const selectedEquipmentType =
        useMemo(() => {
            const equipmentTypeId =
                Number(
                    form.equipmentTypeId
                );

            return equipmentTypes.find(
                (equipmentType) =>
                    equipmentType.equipmentTypeId ===
                    equipmentTypeId
            );
        }, [
            equipmentTypes,
            form.equipmentTypeId,
        ]);

    const loadData =
        useCallback(async () => {
            try {
                setLoading(true);
                setError("");

                const query:
                    EquipmentInstanceQuery = {
                    keyword:
                        appliedKeyword ||
                        undefined,

                    equipmentTypeId:
                        typeFilter
                            ? Number(
                                typeFilter
                            )
                            : undefined,

                    status:
                        statusFilter ||
                        undefined,

                    conditionLevel:
                        conditionFilter ||
                        undefined,

                    page: 1,
                    size: 300,
                };

                const [
                    instanceData,
                    typeData,
                ] = await Promise.all([
                    getEquipmentInstances(
                        query
                    ),

                    getEquipmentTypes({
                        page: 1,
                        size: 300,
                    }),
                ]);

                setItems(
                    Array.isArray(
                        instanceData
                    )
                        ? instanceData
                        : []
                );

                setEquipmentTypes(
                    Array.isArray(
                        typeData
                    )
                        ? typeData
                        : []
                );
            } catch (loadError) {
                console.error(
                    "Load equipment instances failed:",
                    loadError
                );

                setError(
                    getErrorMessage(
                        loadError
                    )
                );

                setItems([]);
                setEquipmentTypes([]);
            } finally {
                setLoading(false);
            }
        }, [
            appliedKeyword,
            typeFilter,
            statusFilter,
            conditionFilter,
        ]);

    useEffect(() => {
        void loadData();
    }, [loadData]);

    const updateForm = <
        K extends keyof FormState,
    >(
        name: K,
        value: FormState[K]
    ) => {
        setForm(
            (current) => ({
                ...current,
                [name]: value,
            })
        );
    };

    const openCreate = () => {
        setEditing(null);
        setForm(emptyForm);
        setError("");
        setDialogOpen(true);
    };

    const openEdit = (
        item: EquipmentInstance
    ) => {
        setEditing(item);

        setForm({
            equipmentTypeId:
                String(
                    item.equipmentTypeId
                ),

            assetCode:
                item.assetCode || "",

            serialNumber:
                item.serialNumber || "",

            usageHours:
                String(
                    item.usageHours ?? 0
                ),

            lastMaintenanceDate:
                toDateInputValue(
                    item.lastMaintenanceDate
                ),

            nextMaintenanceDate:
                toDateInputValue(
                    item.nextMaintenanceDate
                ),

            conditionLevel:
                item.conditionLevel ||
                "Good",

            status:
                item.status ||
                "Available",

            note:
                item.note || "",
        });

        setError("");
        setDialogOpen(true);
    };

    const closeDialog = () => {
        if (saving) {
            return;
        }

        setDialogOpen(false);
        setEditing(null);
        setForm(emptyForm);
    };

    const handleSearch = () => {
        setAppliedKeyword(
            keyword.trim()
        );
    };

    const handleClearFilters = () => {
        setKeyword("");
        setAppliedKeyword("");
        setTypeFilter("");
        setStatusFilter("");
        setConditionFilter("");
        setError("");
    };

    const handleSubmit = async (
        event: FormEvent<HTMLFormElement>
    ) => {
        event.preventDefault();
        setError("");

        const equipmentTypeId =
            Number(
                form.equipmentTypeId
            );

        const usageHours =
            Number(
                form.usageHours
            );

        if (
            !Number.isInteger(
                equipmentTypeId
            ) ||
            equipmentTypeId <= 0
        ) {
            setError(
                "Please select a valid equipment type."
            );

            return;
        }

        if (
            !form.assetCode.trim()
        ) {
            setError(
                "Asset code is required."
            );

            return;
        }

        if (
            !Number.isFinite(
                usageHours
            ) ||
            usageHours < 0
        ) {
            setError(
                "Usage hours must be zero or greater."
            );

            return;
        }

        if (
            form.lastMaintenanceDate &&
            form.nextMaintenanceDate &&
            form.nextMaintenanceDate <
            form.lastMaintenanceDate
        ) {
            setError(
                "Next maintenance date cannot be earlier than the last maintenance date."
            );

            return;
        }

        const payload:
            EquipmentInstanceRequest = {
            equipmentTypeId,

            assetCode:
                form.assetCode.trim(),

            serialNumber:
                form.serialNumber.trim() ||
                null,

            usageHours,

            lastMaintenanceDate:
                form.lastMaintenanceDate ||
                null,

            nextMaintenanceDate:
                form.nextMaintenanceDate ||
                null,

            conditionLevel:
                form.conditionLevel,

            status:
                form.status,

            note:
                form.note.trim() ||
                null,
        };

        try {
            setSaving(true);
            setError("");

            if (editing) {
                await updateEquipmentInstance(
                    editing.equipmentInstanceId,
                    payload
                );
            } else {
                await createEquipmentInstance(
                    payload
                );
            }

            setDialogOpen(false);
            setEditing(null);
            setForm(emptyForm);

            await loadData();
        } catch (submitError) {
            console.error(
                "Save equipment instance failed:",
                submitError
            );

            setError(
                getErrorMessage(
                    submitError
                )
            );
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (
        item: EquipmentInstance
    ) => {
        const confirmed =
            window.confirm(
                `Delete equipment instance "${item.assetCode}"?`
            );

        if (!confirmed) {
            return;
        }

        try {
            setDeletingId(
                item.equipmentInstanceId
            );

            setError("");

            await deleteEquipmentInstance(
                item.equipmentInstanceId
            );

            setItems(
                (current) =>
                    current.filter(
                        (value) =>
                            value.equipmentInstanceId !==
                            item.equipmentInstanceId
                    )
            );
        } catch (deleteError) {
            console.error(
                "Delete equipment instance failed:",
                deleteError
            );

            setError(
                getErrorMessage(
                    deleteError
                )
            );
        } finally {
            setDeletingId(null);
        }
    };

    const hasActiveFilters =
        Boolean(
            keyword ||
            appliedKeyword ||
            typeFilter ||
            statusFilter ||
            conditionFilter
        );

    return (
        <DashboardLayout>
            <div className="equipment-instance-page">
                <header className="equipment-instance-header">
                    <div>
                        <p>
                            Dashboard / Equipment Instances
                        </p>

                        <h1>
                            Equipment Instances
                        </h1>

                        <span>
                            Manage individually tracked
                            assets, usage hours and
                            maintenance status.
                        </span>
                    </div>

                    {canManage && (
                        <button
                            type="button"
                            onClick={openCreate}
                        >
                            <Plus size={18} />

                            Add Instance
                        </button>
                    )}
                </header>

                <section className="equipment-instance-filter">
                    <div>
                        <Search size={18} />

                        <input
                            type="text"
                            value={keyword}
                            onChange={(event) =>
                                setKeyword(
                                    event.target.value
                                )
                            }
                            onKeyDown={(event) => {
                                if (
                                    event.key ===
                                    "Enter"
                                ) {
                                    handleSearch();
                                }
                            }}
                            placeholder="Asset code, serial number or note..."
                        />
                    </div>

                    <select
                        value={typeFilter}
                        onChange={(event) =>
                            setTypeFilter(
                                event.target.value
                            )
                        }
                    >
                        <option value="">
                            All equipment types
                        </option>

                        {equipmentTypes.map(
                            (equipmentType) => (
                                <option
                                    key={
                                        equipmentType.equipmentTypeId
                                    }
                                    value={
                                        equipmentType.equipmentTypeId
                                    }
                                >
                                    {getEquipmentTypeLabel(
                                        equipmentType
                                    )}
                                </option>
                            )
                        )}
                    </select>

                    <select
                        value={statusFilter}
                        onChange={(event) =>
                            setStatusFilter(
                                event.target
                                    .value as
                                | EquipmentInstanceStatus
                                | ""
                            )
                        }
                    >
                        <option value="">
                            All statuses
                        </option>

                        {equipmentStatuses.map(
                            (status) => (
                                <option
                                    key={status}
                                    value={status}
                                >
                                    {getStatusLabel(
                                        status
                                    )}
                                </option>
                            )
                        )}
                    </select>

                    <select
                        value={conditionFilter}
                        onChange={(event) =>
                            setConditionFilter(
                                event.target
                                    .value as
                                | EquipmentConditionLevel
                                | ""
                            )
                        }
                    >
                        <option value="">
                            All conditions
                        </option>

                        {conditionLevels.map(
                            (condition) => (
                                <option
                                    key={condition}
                                    value={condition}
                                >
                                    {condition}
                                </option>
                            )
                        )}
                    </select>

                    <button
                        type="button"
                        onClick={handleSearch}
                    >
                        Search
                    </button>

                    {hasActiveFilters && (
                        <button
                            type="button"
                            className="secondary"
                            onClick={
                                handleClearFilters
                            }
                        >
                            Clear
                        </button>
                    )}
                </section>

                {error && (
                    <div className="equipment-instance-error">
                        {error}
                    </div>
                )}

                <section className="equipment-instance-card">
                    <div className="equipment-instance-card-title">
                        <div>
                            <h2>
                                Instance List
                            </h2>

                            <p>
                                {items.length} tracked{" "}
                                {items.length === 1
                                    ? "asset"
                                    : "assets"}
                            </p>
                        </div>

                        <Cpu size={22} />
                    </div>

                    {loading ? (
                        <div className="equipment-instance-state">
                            Loading equipment instances...
                        </div>
                    ) : items.length === 0 ? (
                        <div className="equipment-instance-state">
                            No equipment instances found.
                        </div>
                    ) : (
                        <div className="equipment-instance-table-wrap">
                            <table>
                                <thead>
                                    <tr>
                                        <th>ID</th>
                                        <th>Asset</th>
                                        <th>
                                            Equipment type
                                        </th>
                                        <th>Condition</th>
                                        <th>Status</th>
                                        <th>Usage</th>
                                        <th>
                                            Maintenance
                                        </th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>

                                <tbody>
                                    {items.map(
                                        (item) => (
                                            <tr
                                                key={
                                                    item.equipmentInstanceId
                                                }
                                            >
                                                <td>
                                                    #
                                                    {
                                                        item.equipmentInstanceId
                                                    }
                                                </td>

                                                <td>
                                                    <strong>
                                                        {item.assetCode ||
                                                            "-"}
                                                    </strong>

                                                    <small>
                                                        {item.serialNumber ||
                                                            "No serial number"}
                                                    </small>
                                                </td>

                                                <td>
                                                    {item.equipmentTypeName ||
                                                        typeMap.get(
                                                            item.equipmentTypeId
                                                        ) ||
                                                        `Type #${item.equipmentTypeId}`}
                                                </td>

                                                <td>
                                                    <span
                                                        className={getConditionClassName(
                                                            item.conditionLevel
                                                        )}
                                                    >
                                                        {
                                                            item.conditionLevel
                                                        }
                                                    </span>
                                                </td>

                                                <td>
                                                    <span
                                                        className={getStatusClassName(
                                                            item.status
                                                        )}
                                                    >
                                                        {getStatusLabel(
                                                            item.status
                                                        )}
                                                    </span>
                                                </td>

                                                <td>
                                                    {(
                                                        item.usageHours ??
                                                        0
                                                    ).toLocaleString(
                                                        "vi-VN"
                                                    )}{" "}
                                                    h
                                                </td>

                                                <td>
                                                    <span>
                                                        Next:{" "}
                                                        {formatDate(
                                                            item.nextMaintenanceDate
                                                        )}
                                                    </span>

                                                    <small>
                                                        Last:{" "}
                                                        {formatDate(
                                                            item.lastMaintenanceDate
                                                        )}
                                                    </small>
                                                </td>

                                                <td>
                                                    <div className="equipment-instance-actions">
                                                        {item.receiptConfirmed ? (
                                                            <span className="receipt-status-confirmed" title={`Notes: ${item.receiptNotes || 'None'}`}>
                                                                <CheckCircle size={14} color="#16a34a" />
                                                                <span>Confirmed</span>
                                                            </span>
                                                        ) : (
                                                            <button
                                                                type="button"
                                                                className="action-btn-pill confirm-btn"
                                                                title="Confirm Receipt"
                                                                onClick={() => openConfirmReceipt(item)}
                                                            >
                                                                <CheckCircle size={12} />
                                                                <span>Confirm Receipt</span>
                                                            </button>
                                                        )}

                                                        {canManage && (
                                                            <>
                                                                <button
                                                                    type="button"
                                                                    className="action-btn-pill edit"
                                                                    title="Edit"
                                                                    onClick={() =>
                                                                        openEdit(
                                                                            item
                                                                        )
                                                                    }
                                                                >
                                                                    <Pencil size={12} />
                                                                    <span>Edit</span>
                                                                </button>

                                                                <button
                                                                    type="button"
                                                                    className="action-btn-pill delete"
                                                                    disabled={
                                                                        deletingId ===
                                                                        item.equipmentInstanceId
                                                                    }
                                                                    title="Delete"
                                                                    onClick={() =>
                                                                        void handleDelete(
                                                                            item
                                                                        )
                                                                    }
                                                                >
                                                                    <Trash2 size={12} />
                                                                    <span>Delete</span>
                                                                </button>
                                                            </>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        )
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}
                </section>

                {dialogOpen && (
                    <div
                        className="equipment-instance-overlay"
                        onMouseDown={(
                            event
                        ) => {
                            if (
                                event.target ===
                                event.currentTarget
                            ) {
                                closeDialog();
                            }
                        }}
                    >
                        <form
                            className="equipment-instance-dialog"
                            onSubmit={
                                handleSubmit
                            }
                        >
                            <div className="equipment-instance-dialog-head">
                                <div>
                                    <h2>
                                        {editing
                                            ? "Edit Equipment Instance"
                                            : "Create Equipment Instance"}
                                    </h2>

                                    <p>
                                        {selectedEquipmentType
                                            ? `Selected type: ${getEquipmentTypeLabel(
                                                selectedEquipmentType
                                            )}`
                                            : "Select an equipment type and enter asset information."}
                                    </p>
                                </div>

                                <button
                                    type="button"
                                    onClick={
                                        closeDialog
                                    }
                                    disabled={
                                        saving
                                    }
                                    aria-label="Close equipment instance form"
                                >
                                    <X size={19} />
                                </button>
                            </div>

                            <div className="equipment-instance-form-grid">
                                <label htmlFor="equipmentTypeId">
                                    Equipment type

                                    <select
                                        id="equipmentTypeId"
                                        value={
                                            form.equipmentTypeId
                                        }
                                        onChange={(
                                            event
                                        ) =>
                                            updateForm(
                                                "equipmentTypeId",
                                                event.target
                                                    .value
                                            )
                                        }
                                        disabled={
                                            saving
                                        }
                                        required
                                    >
                                        <option value="">
                                            Select type
                                        </option>

                                        {equipmentTypes.map(
                                            (
                                                equipmentType
                                            ) => (
                                                <option
                                                    key={
                                                        equipmentType.equipmentTypeId
                                                    }
                                                    value={
                                                        equipmentType.equipmentTypeId
                                                    }
                                                >
                                                    {getEquipmentTypeLabel(
                                                        equipmentType
                                                    )}
                                                </option>
                                            )
                                        )}
                                    </select>
                                </label>

                                <label htmlFor="assetCode">
                                    Asset code

                                    <input
                                        id="assetCode"
                                        type="text"
                                        value={
                                            form.assetCode
                                        }
                                        onChange={(
                                            event
                                        ) =>
                                            updateForm(
                                                "assetCode",
                                                event.target
                                                    .value
                                            )
                                        }
                                        disabled={
                                            saving
                                        }
                                        required
                                    />
                                </label>

                                <label htmlFor="serialNumber">
                                    Serial number

                                    <input
                                        id="serialNumber"
                                        type="text"
                                        value={
                                            form.serialNumber
                                        }
                                        onChange={(
                                            event
                                        ) =>
                                            updateForm(
                                                "serialNumber",
                                                event.target
                                                    .value
                                            )
                                        }
                                        disabled={
                                            saving
                                        }
                                    />
                                </label>

                                <label htmlFor="status">
                                    Status

                                    <select
                                        id="status"
                                        value={
                                            form.status
                                        }
                                        onChange={(
                                            event
                                        ) =>
                                            updateForm(
                                                "status",
                                                event.target
                                                    .value as EquipmentInstanceStatus
                                            )
                                        }
                                        disabled={
                                            saving
                                        }
                                    >
                                        {equipmentStatuses.map(
                                            (status) => (
                                                <option
                                                    key={
                                                        status
                                                    }
                                                    value={
                                                        status
                                                    }
                                                >
                                                    {getStatusLabel(
                                                        status
                                                    )}
                                                </option>
                                            )
                                        )}
                                    </select>
                                </label>

                                <label htmlFor="conditionLevel">
                                    Condition

                                    <select
                                        id="conditionLevel"
                                        value={
                                            form.conditionLevel
                                        }
                                        onChange={(
                                            event
                                        ) =>
                                            updateForm(
                                                "conditionLevel",
                                                event.target
                                                    .value as EquipmentConditionLevel
                                            )
                                        }
                                        disabled={
                                            saving
                                        }
                                    >
                                        {conditionLevels.map(
                                            (
                                                condition
                                            ) => (
                                                <option
                                                    key={
                                                        condition
                                                    }
                                                    value={
                                                        condition
                                                    }
                                                >
                                                    {
                                                        condition
                                                    }
                                                </option>
                                            )
                                        )}
                                    </select>
                                </label>

                                <label htmlFor="usageHours">
                                    Usage hours

                                    <input
                                        id="usageHours"
                                        type="number"
                                        min="0"
                                        step="0.1"
                                        value={
                                            form.usageHours
                                        }
                                        onChange={(
                                            event
                                        ) =>
                                            updateForm(
                                                "usageHours",
                                                event.target
                                                    .value
                                            )
                                        }
                                        disabled={
                                            saving
                                        }
                                        required
                                    />
                                </label>

                                <label htmlFor="lastMaintenanceDate">
                                    Last maintenance

                                    <input
                                        id="lastMaintenanceDate"
                                        type="date"
                                        value={
                                            form.lastMaintenanceDate
                                        }
                                        onChange={(
                                            event
                                        ) =>
                                            updateForm(
                                                "lastMaintenanceDate",
                                                event.target
                                                    .value
                                            )
                                        }
                                        disabled={
                                            saving
                                        }
                                    />
                                </label>

                                <label htmlFor="nextMaintenanceDate">
                                    Next maintenance

                                    <input
                                        id="nextMaintenanceDate"
                                        type="date"
                                        min={
                                            form.lastMaintenanceDate ||
                                            undefined
                                        }
                                        value={
                                            form.nextMaintenanceDate
                                        }
                                        onChange={(
                                            event
                                        ) =>
                                            updateForm(
                                                "nextMaintenanceDate",
                                                event.target
                                                    .value
                                            )
                                        }
                                        disabled={
                                            saving
                                        }
                                    />
                                </label>

                                <label
                                    htmlFor="note"
                                    className="wide"
                                >
                                    Note

                                    <textarea
                                        id="note"
                                        rows={4}
                                        value={
                                            form.note
                                        }
                                        onChange={(
                                            event
                                        ) =>
                                            updateForm(
                                                "note",
                                                event.target
                                                    .value
                                            )
                                        }
                                        disabled={
                                            saving
                                        }
                                    />
                                </label>
                            </div>

                            <div className="equipment-instance-dialog-actions">
                                <button
                                    type="button"
                                    className="secondary"
                                    disabled={
                                        saving
                                    }
                                    onClick={
                                        closeDialog
                                    }
                                >
                                    Cancel
                                </button>

                                <button
                                    type="submit"
                                    disabled={
                                        saving ||
                                        !form.equipmentTypeId ||
                                        !form.assetCode.trim()
                                    }
                                >
                                    {saving
                                        ? "Saving..."
                                        : editing
                                            ? "Save Changes"
                                            : "Create Instance"}
                                </button>
                            </div>
                        </form>
                    </div>
                )}

                {receiptConfirmItem && (
                    <div
                        className="equipment-instance-dialog-backdrop"
                        onClick={() => !confirming && setReceiptConfirmItem(null)}
                    >
                        <div
                            className="equipment-instance-dialog"
                            onClick={(e) => e.stopPropagation()}
                            style={{ maxWidth: "520px" }}
                        >
                            <div className="equipment-instance-dialog-title">
                                <div>
                                    <h2>Confirm Equipment Receipt</h2>
                                    <p>Confirm inspection and handover for Asset: <strong>{receiptConfirmItem.assetCode}</strong></p>
                                </div>
                                <button
                                    type="button"
                                    className="dialog-close-btn"
                                    onClick={() => !confirming && setReceiptConfirmItem(null)}
                                >
                                    <X size={18} />
                                </button>
                            </div>

                            <form onSubmit={handleConfirmReceiptSubmit}>
                                <div style={{ display: "flex", flexDirection: "column", gap: "16px", padding: "16px 0" }}>
                                    <div>
                                        <label style={{ fontSize: "13px", fontWeight: 600, color: "#374151", marginBottom: "6px", display: "block" }}>
                                            Inspected Condition Level <span style={{ color: "#ef4444" }}>*</span>
                                        </label>
                                        <select
                                            value={confirmCondition}
                                            onChange={(e) => setConfirmCondition(e.target.value as EquipmentConditionLevel)}
                                            style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid #d1d5db" }}
                                            disabled={confirming}
                                        >
                                            {conditionLevels.map((lvl) => (
                                                <option key={lvl} value={lvl}>
                                                    {lvl}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    <div>
                                        <label style={{ fontSize: "13px", fontWeight: 600, color: "#374151", marginBottom: "6px", display: "block" }}>
                                            Receipt Inspection Notes / Remarks
                                        </label>
                                        <textarea
                                            rows={3}
                                            value={confirmNotes}
                                            onChange={(e) => setConfirmNotes(e.target.value)}
                                            placeholder="Enter any initial condition notes, battery levels, or accessories inspected..."
                                            style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid #d1d5db" }}
                                            disabled={confirming}
                                        />
                                    </div>
                                </div>

                                <div className="equipment-instance-dialog-actions">
                                    <button
                                        type="button"
                                        className="secondary"
                                        disabled={confirming}
                                        onClick={() => setReceiptConfirmItem(null)}
                                    >
                                        Cancel
                                    </button>

                                    <button
                                        type="submit"
                                        disabled={confirming}
                                        style={{ background: "linear-gradient(135deg, #16a34a, #15803d)", color: "#ffffff", border: "none" }}
                                    >
                                        {confirming ? "Confirming..." : "Confirm Equipment Receipt"}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
}