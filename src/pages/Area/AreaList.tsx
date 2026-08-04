import {
  useCallback,
  useEffect,
  useState,
  type FormEvent,
} from "react";

import {
  Map,
  Pencil,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";

import DashboardLayout from "../../layouts/DashboardLayout";

import {
  createArea,
  deleteArea,
  getAreas,
  updateArea,
} from "../../services/areaService";

import type {
  Area,
  AreaRequest,
} from "../../types/area";

import "./AreaList.css";

type Role =
  | "Manager"
  | "Researcher"
  | "Technician"
  | "Student";

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

export default function AreaList() {
  const role =
    getCurrentRole();

  const canManage =
    role === "Manager";

  const [
    areas,
    setAreas,
  ] = useState<Area[]>([]);

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
  ] = useState<Area | null>(
    null
  );

  const [
    areaName,
    setAreaName,
  ] = useState("");

  const [
    description,
    setDescription,
  ] = useState("");

  const loadAreas =
    useCallback(async () => {
      try {
        setLoading(true);
        setError("");

        const data =
          await getAreas({
            keyword:
              appliedKeyword ||
              undefined,

            page: 1,
            size: 200,
          });

        setAreas(
          Array.isArray(data)
            ? data
            : []
        );
      } catch (loadError) {
        console.error(
          "Load areas failed:",
          loadError
        );

        setError(
          getErrorMessage(
            loadError
          )
        );

        setAreas([]);
      } finally {
        setLoading(false);
      }
    }, [appliedKeyword]);

  useEffect(() => {
    void loadAreas();
  }, [loadAreas]);

  const openCreate = () => {
    setEditing(null);
    setAreaName("");
    setDescription("");
    setError("");
    setDialogOpen(true);
  };

  const openEdit = (
    area: Area
  ) => {
    setEditing(area);
    setAreaName(
      area.areaName
    );
    setDescription(
      area.description || ""
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
    setAreaName("");
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
    setError("");

    const normalizedName =
      areaName.trim();

    if (!normalizedName) {
      setError(
        "Area name is required."
      );

      return;
    }

    const payload:
      AreaRequest = {
      areaName:
        normalizedName,

      description:
        description.trim() ||
        null,
    };

    try {
      setSaving(true);
      setError("");

      if (editing) {
        await updateArea(
          editing.areaId,
          payload
        );
      } else {
        await createArea(
          payload
        );
      }

      setDialogOpen(false);
      setEditing(null);
      setAreaName("");
      setDescription("");

      await loadAreas();
    } catch (submitError) {
      console.error(
        "Save area failed:",
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
    area: Area
  ) => {
    const confirmed =
      window.confirm(
        `Delete area "${area.areaName}"?`
      );

    if (!confirmed) {
      return;
    }

    try {
      setDeletingId(
        area.areaId
      );

      setError("");

      await deleteArea(
        area.areaId
      );

      setAreas(
        (current) =>
          current.filter(
            (item) =>
              item.areaId !==
              area.areaId
          )
      );
    } catch (deleteError) {
      console.error(
        "Delete area failed:",
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
      <div className="area-page">
        <header className="area-header">
          <div>
            <p>
              Dashboard / Areas
            </p>

            <h1>
              Areas
            </h1>

            <span>
              Manage geographical areas used
              to group forestry land resources.
            </span>
          </div>

          {canManage && (
            <button
              type="button"
              onClick={openCreate}
            >
              <Plus size={18} />

              Add Area
            </button>
          )}
        </header>

        <section className="area-filter">
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
              placeholder="Search areas..."
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
          <div className="area-error">
            {error}
          </div>
        )}

        <section className="area-card">
          <div className="area-card-title">
            <div>
              <h2>
                Area List
              </h2>

              <p>
                {areas.length}{" "}
                {areas.length === 1
                  ? "area"
                  : "areas"}
              </p>
            </div>

            <Map size={22} />
          </div>

          {loading ? (
            <div className="area-state">
              Loading areas...
            </div>
          ) : areas.length === 0 ? (
            <div className="area-state">
              No areas found.
            </div>
          ) : (
            <div className="area-table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>
                      Area name
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
                  {areas.map(
                    (area) => (
                      <tr
                        key={
                          area.areaId
                        }
                      >
                        <td>
                          #
                          {
                            area.areaId
                          }
                        </td>

                        <td>
                          <strong>
                            {
                              area.areaName
                            }
                          </strong>
                        </td>

                        <td>
                          {area.description ||
                            "No description"}
                        </td>

                        <td>
                          {formatDate(
                            area.createdAt
                          )}
                        </td>

                        <td>
                          <div className="area-actions">
                            {canManage ? (
                              <>
                                <button
                                  type="button"
                                  title="Edit"
                                  onClick={() =>
                                    openEdit(
                                      area
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
                                    area.areaId
                                  }
                                  title="Delete"
                                  onClick={() =>
                                    void handleDelete(
                                      area
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
            className="area-overlay"
            onMouseDown={(event) => {
              if (
                event.target ===
                event.currentTarget
              ) {
                closeDialog();
              }
            }}
          >
            <form
              className="area-dialog"
              onSubmit={
                handleSubmit
              }
            >
              <div className="area-dialog-head">
                <h2>
                  {editing
                    ? "Edit Area"
                    : "Create Area"}
                </h2>

                <button
                  type="button"
                  onClick={
                    closeDialog
                  }
                  disabled={
                    saving
                  }
                  aria-label="Close area form"
                >
                  <X size={19} />
                </button>
              </div>

              <label htmlFor="areaName">
                Area name

                <input
                  id="areaName"
                  type="text"
                  value={
                    areaName
                  }
                  onChange={(event) =>
                    setAreaName(
                      event.target.value
                    )
                  }
                  disabled={
                    saving
                  }
                  maxLength={150}
                  required
                />
              </label>

              <label htmlFor="areaDescription">
                Description

                <textarea
                  id="areaDescription"
                  value={
                    description
                  }
                  onChange={(event) =>
                    setDescription(
                      event.target.value
                    )
                  }
                  disabled={
                    saving
                  }
                  rows={5}
                />
              </label>

              <div className="area-dialog-actions">
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
                    !areaName.trim()
                  }
                >
                  {saving
                    ? "Saving..."
                    : editing
                      ? "Save Changes"
                      : "Create Area"}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}