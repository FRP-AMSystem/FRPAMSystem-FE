import {
    useCallback,
    useEffect,
    useMemo,
    useState,
    type FormEvent,
} from "react";

import { createPortal } from "react-dom";

import {
    CheckCircle,
    Cpu,
    Pencil,
    Plus,
    Search,
    Trash2,
    X,
    RotateCcw,
} from "lucide-react";

import DashboardLayout from "../../layouts/DashboardLayout";
import ToastPopup, { type ToastType } from "../../components/common/ToastPopup";

import {
    getEquipmentTypes,
} from "../../services/equipmentService";

import {
    confirmEquipmentReceipt,
    createEquipmentInstance,
    deleteEquipmentInstance,
    getEquipmentInstances,
    updateEquipmentInstance,
    returnEquipmentInstance,
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

import { usePopup } from "../../context/PopupContext";

type Role =
    | "Admin"
    | "Manager"
    | "Researcher"
    | "Technician"
    | "Student"
    | "Seasonal";

interface FormState {
    equipmentTypeId: string;

    assetCode: string;
    serialNumber: string;

    usageHours: string;

    lastMaintenanceDate: string;
    nextMaintenanceDate: string;

    conditionLevel: EquipmentConditionLevel;

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
        (storedRole === "Student" || storedRole === "Seasonal")
    ) {
        return storedRole;
    }

    return "Seasonal";
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
  const { showConfirm, showAlert } = usePopup();
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
    const [confirmNotes, setConfirmNotes] = useState("");
    const [confirming, setConfirming] = useState(false);

    // Return equipment modal state
    const [returnModalItem, setReturnModalItem] = useState<EquipmentInstance | null>(null);
    const [returnCondition, setReturnCondition] = useState<EquipmentConditionLevel>("Good");
    const [returnNotes, setReturnNotes] = useState("");
    const [usageHoursInc, setUsageHoursInc] = useState("0");
    const [returning, setReturning] = useState(false);

    const [toast, setToast] = useState<{
        visible: boolean;
        type: ToastType;
        title?: string;
        message: string;
    }>({
        visible: false,
        type: "error",
        message: "",
    });

    const showToast = (message: string, type: ToastType = "error", title?: string) => {
        if (type === "error") setError(message);
        setToast({
            visible: true,
            type,
            title: title || (type === "error" ? "Lỗi thực thi" : "Thành công"),
            message,
        });
    };

    const openConfirmReceipt = (item: EquipmentInstance) => {
        setReceiptConfirmItem(item);
        setConfirmNotes("");
        setError("");
    };

    const handleConfirmReceiptSubmit = async (
        e: FormEvent<HTMLFormElement>
    ) => {
        e.preventDefault();

        if (
            !receiptConfirmItem ||
            confirming
        ) {
            return;
        }

        const currentItem =
            receiptConfirmItem;

        try {
            setConfirming(true);
            setError("");

            await confirmEquipmentReceipt(
                currentItem.equipmentInstanceId,
                {
                    note:
                        confirmNotes.trim() ||
                        undefined,
                }
            );

            setReceiptConfirmItem(null);
            setConfirmNotes("");

            await loadData();

            showAlert({
                title:
                    "Receipt Confirmed",

                message:
                    `Equipment "${currentItem.assetCode}" was confirmed successfully.`,

                confirmText:
                    "OK",

                tone:
                    "success",
            });
        } catch (err: unknown) {
            console.error(
                "Confirm equipment receipt failed:",
                err
            );

            showAlert({
                title:
                    "Unable to Confirm Receipt",

                message:
                    getErrorMessage(err),

                confirmText:
                    "OK",

                tone:
                    "danger",
            });
        } finally {
            setConfirming(false);
        }
    };

    const handleConfirmReturnSubmit = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!returnModalItem) return;
        try {
            setReturning(true);
            setError("");
            await returnEquipmentInstance(returnModalItem.equipmentInstanceId, {
                returnCondition: returnCondition,
                returnNotes: returnNotes.trim() || undefined,
                usageHoursIncrement: Number(usageHoursInc) || 0,
            });
            showToast(`Đã hoàn trả thiết bị "${returnModalItem.assetCode}" về kho (Available) thành công!`, "success", "Hoàn trả thiết bị thành công");
            setReturnModalItem(null);
            await loadData();
        } catch (err: any) {
            showToast(getErrorMessage(err), "error");
        } finally {
            setReturning(false);
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
                editing?.status ||
                "Available",

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
            await showConfirm(
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
                                                                onClick={(event) => {
                                                                    event.preventDefault();
                                                                    event.stopPropagation();
                                                                    openConfirmReceipt(item);
                                                                }}
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
                                        max={
                                            form.nextMaintenanceDate ||
                                            undefined
                                        }
                                        onClick={(event) => {
                                            if (!saving) {
                                                event.currentTarget.showPicker?.();
                                            }
                                        }}
                                        onChange={(event) => {
                                            const value =
                                                event.target.value;

                                            setForm((current) => ({
                                                ...current,
                                                lastMaintenanceDate:
                                                    value,
                                                nextMaintenanceDate:
                                                    current.nextMaintenanceDate &&
                                                    value &&
                                                    current.nextMaintenanceDate <
                                                        value
                                                        ? ""
                                                        : current.nextMaintenanceDate,
                                            }));
                                        }}
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
                                        onClick={(event) => {
                                            if (!saving) {
                                                event.currentTarget.showPicker?.();
                                            }
                                        }}
                                        onChange={(event) =>
                                            updateForm(
                                                "nextMaintenanceDate",
                                                event.target.value
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

                {receiptConfirmItem &&
                    createPortal(
                        <div
                            onMouseDown={(event) => {
                                if (
                                    event.target === event.currentTarget &&
                                    !confirming
                                ) {
                                    setReceiptConfirmItem(null);
                                }
                            }}
                            style={{
                                position: "fixed",
                                inset: 0,
                                zIndex: 50000,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                padding: "24px",
                                background: "rgba(15, 23, 42, 0.48)",
                                backdropFilter: "blur(2px)",
                            }}
                        >
                            <div
                                role="dialog"
                                aria-modal="true"
                                aria-labelledby="confirm-receipt-title"
                                onMouseDown={(event) =>
                                    event.stopPropagation()
                                }
                                style={{
                                    width:
                                        "min(520px, calc(100vw - 32px))",
                                    overflow: "hidden",
                                    border: "1px solid #e2e8f0",
                                    borderRadius: "14px",
                                    background: "#ffffff",
                                    boxShadow:
                                        "0 24px 60px rgba(15, 23, 42, 0.22)",
                                }}
                            >
                                <div
                                    style={{
                                        display: "flex",
                                        alignItems: "flex-start",
                                        justifyContent: "space-between",
                                        gap: "16px",
                                        padding: "20px 22px",
                                        borderBottom:
                                            "1px solid #e2e8f0",
                                    }}
                                >
                                    <div>
                                        <h2
                                            id="confirm-receipt-title"
                                            style={{
                                                margin: 0,
                                                color: "#0f172a",
                                                fontSize: "18px",
                                                fontWeight: 700,
                                                lineHeight: 1.4,
                                            }}
                                        >
                                            Confirm Equipment Receipt
                                        </h2>

                                        <p
                                            style={{
                                                margin: "6px 0 0",
                                                color: "#64748b",
                                                fontSize: "13px",
                                                lineHeight: 1.5,
                                            }}
                                        >
                                            Confirm receipt for asset{" "}
                                            <strong
                                                style={{
                                                    color: "#334155",
                                                    fontWeight: 700,
                                                }}
                                            >
                                                {receiptConfirmItem.assetCode}
                                            </strong>
                                            .
                                        </p>
                                    </div>

                                    <button
                                        type="button"
                                        disabled={confirming}
                                        onClick={() =>
                                            setReceiptConfirmItem(null)
                                        }
                                        aria-label="Close"
                                        style={{
                                            width: "34px",
                                            height: "34px",
                                            flex: "0 0 34px",
                                            display: "inline-flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                            padding: 0,
                                            border: "none",
                                            borderRadius: "8px",
                                            background: "transparent",
                                            color: "#64748b",
                                            cursor: confirming
                                                ? "not-allowed"
                                                : "pointer",
                                        }}
                                    >
                                        <X size={18} />
                                    </button>
                                </div>

                                <form
                                    onSubmit={
                                        handleConfirmReceiptSubmit
                                    }
                                >
                                    <div
                                        style={{
                                            padding: "22px",
                                            background: "#ffffff",
                                        }}
                                    >
                                        <label
                                            htmlFor="confirmReceiptNotes"
                                            style={{
                                                display: "block",
                                                marginBottom: "8px",
                                                color: "#475569",
                                                fontSize: "13px",
                                                fontWeight: 600,
                                            }}
                                        >
                                            Receipt Notes / Remarks
                                        </label>

                                        <textarea
                                            id="confirmReceiptNotes"
                                            rows={4}
                                            value={confirmNotes}
                                            onChange={(event) =>
                                                setConfirmNotes(
                                                    event.target.value
                                                )
                                            }
                                            disabled={confirming}
                                            placeholder="Enter receipt notes or handover remarks..."
                                            style={{
                                                display: "block",
                                                width: "100%",
                                                minHeight: "110px",
                                                boxSizing: "border-box",
                                                resize: "vertical",
                                                padding: "12px 14px",
                                                border:
                                                    "1px solid #cbd5e1",
                                                borderRadius: "8px",
                                                backgroundColor: "#ffffff",
                                                color: "#0f172a",
                                                fontFamily: "inherit",
                                                fontSize: "14px",
                                                fontWeight: 400,
                                                lineHeight: 1.5,
                                                outline: "none",
                                                transition:
                                                    "border-color 0.15s ease, box-shadow 0.15s ease",
                                            }}
                                            onFocus={(event) => {
                                                event.currentTarget.style.borderColor =
                                                    "#22c55e";

                                                event.currentTarget.style.boxShadow =
                                                    "0 0 0 3px rgba(34, 197, 94, 0.12)";
                                            }}
                                            onBlur={(event) => {
                                                event.currentTarget.style.borderColor =
                                                    "#cbd5e1";

                                                event.currentTarget.style.boxShadow =
                                                    "none";
                                            }}
                                        />
                                    </div>

                                    <div
                                        style={{
                                            display: "flex",
                                            justifyContent: "flex-end",
                                            alignItems: "center",
                                            gap: "10px",
                                            padding: "15px 22px",
                                            borderTop:
                                                "1px solid #e2e8f0",
                                            background: "#f8fafc",
                                        }}
                                    >
                                        <button
                                            type="button"
                                            disabled={confirming}
                                            onClick={() =>
                                                setReceiptConfirmItem(
                                                    null
                                                )
                                            }
                                            style={{
                                                height: "40px",
                                                minWidth: "92px",
                                                padding: "0 18px",
                                                border:
                                                    "1px solid #cbd5e1",
                                                borderRadius: "8px",
                                                background: "#ffffff",
                                                color: "#334155",
                                                fontSize: "13px",
                                                fontWeight: 600,
                                                cursor: confirming
                                                    ? "not-allowed"
                                                    : "pointer",
                                            }}
                                        >
                                            Cancel
                                        </button>

                                        <button
                                            type="submit"
                                            disabled={confirming}
                                            style={{
                                                height: "40px",
                                                minWidth: "150px",
                                                padding: "0 20px",
                                                border: "none",
                                                borderRadius: "8px",
                                                background: confirming
                                                    ? "#86efac"
                                                    : "#16a34a",
                                                color: "#ffffff",
                                                fontSize: "13px",
                                                fontWeight: 700,
                                                cursor: confirming
                                                    ? "not-allowed"
                                                    : "pointer",
                                                boxShadow: confirming
                                                    ? "none"
                                                    : "0 2px 5px rgba(22, 163, 74, 0.20)",
                                            }}
                                        >
                                            {confirming
                                                ? "Confirming..."
                                                : "Confirm Receipt"}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>,
                        document.body
                    )}

                {returnModalItem && (
                    <div
                        className="equipment-instance-dialog-backdrop"
                        onClick={() => !returning && setReturnModalItem(null)}
                    >
                        <div
                            className="equipment-instance-dialog"
                            onClick={(e) => e.stopPropagation()}
                            style={{ maxWidth: "520px" }}
                        >
                            <div className="equipment-instance-dialog-title">
                                <div>
                                    <h2>Confirm Equipment Return</h2>
                                    <p>Return Asset: <strong>{returnModalItem.assetCode}</strong> to warehouse</p>
                                </div>
                                <button
                                    type="button"
                                    className="dialog-close-btn"
                                    onClick={() => !returning && setReturnModalItem(null)}
                                >
                                    <X size={18} />
                                </button>
                            </div>

                            <form onSubmit={handleConfirmReturnSubmit}>
                                <div className="equipment-instance-form-grid" style={{ gridTemplateColumns: "1fr", gap: "18px" }}>
                                    <div>
                                        <label style={{ fontSize: "13px", fontWeight: 600, color: "#374151", marginBottom: "6px", display: "block" }}>
                                            Return Condition Level <span style={{ color: "#ef4444" }}>*</span>
                                        </label>
                                        <select
                                            value={returnCondition}
                                            onChange={(e) => setReturnCondition(e.target.value as EquipmentConditionLevel)}
                                            style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid #d1d5db" }}
                                            disabled={returning}
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
                                            Usage Hours Added
                                        </label>
                                        <input
                                            type="number"
                                            min="0"
                                            step="0.1"
                                            value={usageHoursInc}
                                            onChange={(e) => setUsageHoursInc(e.target.value)}
                                            style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid #d1d5db" }}
                                            disabled={returning}
                                        />
                                    </div>

                                    <div>
                                        <label style={{ fontSize: "13px", fontWeight: 600, color: "#374151", marginBottom: "6px", display: "block" }}>
                                            Return Notes / Damage Remarks
                                        </label>
                                        <textarea
                                            rows={3}
                                            value={returnNotes}
                                            onChange={(e) => setReturnNotes(e.target.value)}
                                            placeholder="Enter damage notes, missing accessories, or general remarks..."
                                            style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid #d1d5db" }}
                                            disabled={returning}
                                        />
                                    </div>
                                </div>

                                <div className="equipment-instance-dialog-actions">
                                    <button
                                        type="button"
                                        className="secondary"
                                        disabled={returning}
                                        onClick={() => setReturnModalItem(null)}
                                    >
                                        Cancel
                                    </button>

                                    <button
                                        type="submit"
                                        disabled={returning}
                                        style={{ background: "linear-gradient(135deg, #2563eb, #1d4ed8)", color: "#ffffff", border: "none" }}
                                    >
                                        {returning ? "Returning..." : "Confirm Return"}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* Global Toast / Popup Alert */}
                <ToastPopup
                    visible={toast.visible}
                    type={toast.type}
                    title={toast.title}
                    message={toast.message}
                    onClose={() => setToast((prev) => ({ ...prev, visible: false }))}
                />
            </div>
        </DashboardLayout>
    );
}