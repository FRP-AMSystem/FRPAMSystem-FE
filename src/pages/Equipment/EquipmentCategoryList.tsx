import {
    useCallback,
    useEffect,
    useState,
    type FormEvent,
} from "react";

import {
    Boxes,
    Pencil,
    Plus,
    Search,
    Trash2,
    X,
} from "lucide-react";

import DashboardLayout from "../../layouts/DashboardLayout";

import {
    createEquipmentCategory,
    deleteEquipmentCategory,
    getEquipmentCategories,
    updateEquipmentCategory,
} from "../../services/equipmentCategoryService";

import type {
    EquipmentCategory,
    EquipmentCategoryRequest,
} from "../../types/equipmentCategory";

import "./EquipmentCategoryList.css";

type Role =
    | "Manager"
    | "Researcher"
    | "Technician"
    | "Student";

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
                        title?: string;
                        error?: string;
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

function getCurrentRole(): Role {
    const storedRole =
        localStorage.getItem("role");

    if (
        storedRole === "Manager" ||
        storedRole === "Researcher" ||
        storedRole === "Technician" ||
        storedRole === "Student"
    ) {
        return storedRole;
    }

    return "Student";
}

export default function EquipmentCategoryList() {
    const role =
        getCurrentRole();

    const canManage =
        role === "Manager";

    const [
        items,
        setItems,
    ] = useState<
        EquipmentCategory[]
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
        EquipmentCategory | null
    >(null);

    const [
        categoryName,
        setCategoryName,
    ] = useState("");

    const [
        description,
        setDescription,
    ] = useState("");

    const loadData =
        useCallback(async () => {
            try {
                setLoading(true);
                setError("");

                const data =
                    await getEquipmentCategories({
                        keyword:
                            appliedKeyword ||
                            undefined,

                        page: 1,
                        size: 200,
                    });

                setItems(
                    Array.isArray(data)
                        ? data
                        : []
                );
            } catch (loadError) {
                console.error(
                    "Load equipment categories failed:",
                    loadError
                );

                setError(
                    getErrorMessage(
                        loadError
                    )
                );

                setItems([]);
            } finally {
                setLoading(false);
            }
        }, [appliedKeyword]);

    useEffect(() => {
        void loadData();
    }, [loadData]);

    const openCreate = () => {
        setEditing(null);
        setCategoryName("");
        setDescription("");
        setError("");
        setDialogOpen(true);
    };

    const openEdit = (
        item: EquipmentCategory
    ) => {
        setEditing(item);

        setCategoryName(
            item.equipmentCategoryName
        );

        setDescription(
            item.description || ""
        );

        setError("");
        setDialogOpen(true);
    };

    const closeDialog = () => {
        if (saving) {
            return;
        }

        setDialogOpen(false);
        setEditing(null);
        setCategoryName("");
        setDescription("");
    };

    const handleSearch = () => {
        setAppliedKeyword(
            keyword.trim()
        );
    };

    const handleClear = () => {
        setKeyword("");
        setAppliedKeyword("");
        setError("");
    };

    const handleSubmit = async (
        event: FormEvent<HTMLFormElement>
    ) => {
        event.preventDefault();

        const normalizedName =
            categoryName.trim();

        if (!normalizedName) {
            setError(
                "Category name is required."
            );

            return;
        }

        const payload:
            EquipmentCategoryRequest = {
            equipmentCategoryName:
                normalizedName,

            description:
                description.trim() ||
                null,
        };

        try {
            setSaving(true);
            setError("");

            if (editing) {
                await updateEquipmentCategory(
                    editing.equipmentCategoryId,
                    payload
                );
            } else {
                await createEquipmentCategory(
                    payload
                );
            }

            setDialogOpen(false);
            setEditing(null);
            setCategoryName("");
            setDescription("");

            await loadData();
        } catch (submitError) {
            console.error(
                "Save equipment category failed:",
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
        item: EquipmentCategory
    ) => {
        const confirmed =
            window.confirm(
                `Delete category "${item.equipmentCategoryName}"?`
            );

        if (!confirmed) {
            return;
        }

        try {
            setDeletingId(
                item.equipmentCategoryId
            );

            setError("");

            await deleteEquipmentCategory(
                item.equipmentCategoryId
            );

            setItems(
                (current) =>
                    current.filter(
                        (value) =>
                            value.equipmentCategoryId !==
                            item.equipmentCategoryId
                    )
            );
        } catch (deleteError) {
            console.error(
                "Delete equipment category failed:",
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

    return (
        <DashboardLayout>
            <div className="equipment-category-page">
                <header className="equipment-category-header">
                    <div>
                        <p>
                            Dashboard / Equipment Categories
                        </p>

                        <h1>
                            Equipment Categories
                        </h1>

                        <span>
                            Organize equipment types into
                            reusable inventory categories.
                        </span>
                    </div>

                    {canManage && (
                        <button
                            type="button"
                            onClick={openCreate}
                        >
                            <Plus size={18} />

                            Add Category
                        </button>
                    )}
                </header>

                <section className="equipment-category-filter">
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
                            placeholder="Search categories..."
                        />
                    </div>

                    <button
                        type="button"
                        onClick={handleSearch}
                    >
                        Search
                    </button>

                    {(keyword ||
                        appliedKeyword) && (
                            <button
                                type="button"
                                className="secondary"
                                onClick={handleClear}
                            >
                                Clear
                            </button>
                        )}
                </section>

                {error && (
                    <div className="equipment-category-error">
                        {error}
                    </div>
                )}

                <section className="equipment-category-card">
                    <div className="equipment-category-card-title">
                        <div>
                            <h2>
                                Category List
                            </h2>

                            <p>
                                {items.length}{" "}
                                {items.length === 1
                                    ? "category"
                                    : "categories"}
                            </p>
                        </div>

                        <Boxes size={22} />
                    </div>

                    {loading ? (
                        <div className="equipment-category-state">
                            Loading categories...
                        </div>
                    ) : items.length === 0 ? (
                        <div className="equipment-category-state">
                            No categories found.
                        </div>
                    ) : (
                        <div className="equipment-category-table-wrap">
                            <table>
                                <thead>
                                    <tr>
                                        <th>ID</th>
                                        <th>
                                            Category name
                                        </th>
                                        <th>
                                            Description
                                        </th>
                                        <th>
                                            Created
                                        </th>
                                        <th>
                                            Actions
                                        </th>
                                    </tr>
                                </thead>

                                <tbody>
                                    {items.map(
                                        (item) => (
                                            <tr
                                                key={
                                                    item.equipmentCategoryId
                                                }
                                            >
                                                <td>
                                                    #
                                                    {
                                                        item.equipmentCategoryId
                                                    }
                                                </td>

                                                <td>
                                                    <strong>
                                                        {
                                                            item.equipmentCategoryName
                                                        }
                                                    </strong>
                                                </td>

                                                <td>
                                                    {item.description ||
                                                        "No description"}
                                                </td>

                                                <td>
                                                    {formatDate(
                                                        item.createdAt
                                                    )}
                                                </td>

                                                <td>
                                                    <div className="equipment-category-actions">
                                                        {canManage ? (
                                                            <>
                                                                <button
                                                                    type="button"
                                                                    title="Edit"
                                                                    onClick={() =>
                                                                        openEdit(
                                                                            item
                                                                        )
                                                                    }
                                                                >
                                                                    <Pencil
                                                                        size={
                                                                            16
                                                                        }
                                                                    />
                                                                </button>

                                                                <button
                                                                    type="button"
                                                                    className="danger"
                                                                    disabled={
                                                                        deletingId ===
                                                                        item.equipmentCategoryId
                                                                    }
                                                                    title="Delete"
                                                                    onClick={() =>
                                                                        void handleDelete(
                                                                            item
                                                                        )
                                                                    }
                                                                >
                                                                    <Trash2
                                                                        size={
                                                                            16
                                                                        }
                                                                    />
                                                                </button>
                                                            </>
                                                        ) : (
                                                            <span>
                                                                View only
                                                            </span>
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
                        className="equipment-category-overlay"
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
                            className="equipment-category-dialog"
                            onSubmit={
                                handleSubmit
                            }
                        >
                            <div className="equipment-category-dialog-head">
                                <h2>
                                    {editing
                                        ? "Edit Category"
                                        : "Create Category"}
                                </h2>

                                <button
                                    type="button"
                                    onClick={
                                        closeDialog
                                    }
                                    disabled={
                                        saving
                                    }
                                    aria-label="Close category form"
                                >
                                    <X size={19} />
                                </button>
                            </div>

                            <label htmlFor="equipmentCategoryName">
                                Category name

                                <input
                                    id="equipmentCategoryName"
                                    type="text"
                                    value={
                                        categoryName
                                    }
                                    onChange={(
                                        event
                                    ) =>
                                        setCategoryName(
                                            event.target
                                                .value
                                        )
                                    }
                                    disabled={
                                        saving
                                    }
                                    maxLength={150}
                                    required
                                />
                            </label>

                            <label htmlFor="equipmentCategoryDescription">
                                Description

                                <textarea
                                    id="equipmentCategoryDescription"
                                    value={
                                        description
                                    }
                                    onChange={(
                                        event
                                    ) =>
                                        setDescription(
                                            event.target
                                                .value
                                        )
                                    }
                                    disabled={
                                        saving
                                    }
                                    rows={5}
                                />
                            </label>

                            <div className="equipment-category-dialog-actions">
                                <button
                                    type="button"
                                    className="secondary"
                                    onClick={
                                        closeDialog
                                    }
                                    disabled={
                                        saving
                                    }
                                >
                                    Cancel
                                </button>

                                <button
                                    type="submit"
                                    disabled={
                                        saving ||
                                        !categoryName.trim()
                                    }
                                >
                                    {saving
                                        ? "Saving..."
                                        : editing
                                            ? "Save Changes"
                                            : "Create Category"}
                                </button>
                            </div>
                        </form>
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
}