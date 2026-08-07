import {
  useCallback,
  useEffect,
  useState,
  type FormEvent,
} from "react";

import {
  Pencil,
  Plus,
  Search,
  Trash2,
  UserRound,
  X,
} from "lucide-react";

import DashboardLayout from "../../layouts/DashboardLayout";

import {
  createHumanResourceProfile,
  deleteHumanResourceProfile,
  getHumanResourceProfiles,
  updateHumanResourceProfile,
} from "../../services/humanResourceProfileService";

import type {
  HumanResourceProfile,
  HumanResourceProfileRequest,
  HumanResourceStatus,
} from "../../types/humanResourceProfile";

import {
  getPermissions,
  getStoredRole,
} from "../../config/rolePermissions";

import "./HumanResourceProfileList.css";

interface FormState {
  userId: string;
  maxWorkingHoursPerDay: string;
  currentWorkload: string;
  status: HumanResourceStatus;
}

const humanResourceStatuses: HumanResourceStatus[] = [
  "Available",
  "Busy",
  "Unavailable",
  "Inactive",
];

const emptyForm: FormState = {
  userId: "",
  maxWorkingHoursPerDay: "8",
  currentWorkload: "0",
  status: "Available",
};

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

function getProfileName(
  profile: HumanResourceProfile
): string {
  return (
    profile.fullName ||
    profile.username ||
    profile.email ||
    `User #${profile.userId}`
  );
}

function getStatusLabel(
  status: HumanResourceStatus
): string {
  return status;
}

function getStatusClassName(
  status: HumanResourceStatus
): string {
  return [
    "human-profile-status",
    `human-profile-status-${status.toLowerCase()}`,
  ].join(" ");
}

export default function HumanResourceProfileList() {
  const role =
    getStoredRole();

  const permission =
    getPermissions(role);

  const canManage =
    permission.canManageResources;

  const [
    items,
    setItems,
  ] = useState<
    HumanResourceProfile[]
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
    statusFilter,
    setStatusFilter,
  ] = useState<
    HumanResourceStatus | ""
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
    HumanResourceProfile | null
  >(null);

  const [
    form,
    setForm,
  ] = useState<FormState>(
    emptyForm
  );

  const loadData =
    useCallback(async () => {
      try {
        setLoading(true);
        setError("");

        const data =
          await getHumanResourceProfiles({
            keyword:
              appliedKeyword ||
              undefined,

            status:
              statusFilter ||
              undefined,

            page: 1,
            size: 300,
          });

        setItems(
          Array.isArray(data)
            ? data
            : []
        );
      } catch (loadError) {
        console.error(
          "Load human resource profiles failed:",
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
    }, [
      appliedKeyword,
      statusFilter,
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
    item: HumanResourceProfile
  ) => {
    setEditing(item);

    setForm({
      userId:
        String(
          item.userId
        ),

      maxWorkingHoursPerDay:
        String(
          item.maxWorkingHoursPerDay ??
          8
        ),

      currentWorkload:
        String(
          item.currentWorkload ??
          0
        ),

      status:
        item.status ||
        "Available",
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
    setStatusFilter("");
    setError("");
  };

  const handleSubmit = async (
    event: FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();
    setError("");

    const userId =
      Number(
        form.userId
      );

    const maxWorkingHoursPerDay =
      Number(
        form.maxWorkingHoursPerDay
      );

    const currentWorkload =
      Number(
        form.currentWorkload
      );

    if (
      !Number.isInteger(userId) ||
      userId <= 0
    ) {
      setError(
        "User ID must be a positive integer."
      );

      return;
    }

    if (
      !Number.isFinite(
        maxWorkingHoursPerDay
      ) ||
      maxWorkingHoursPerDay <= 0 ||
      maxWorkingHoursPerDay > 24
    ) {
      setError(
        "Maximum working hours must be between 0 and 24."
      );

      return;
    }

    if (
      !Number.isFinite(
        currentWorkload
      ) ||
      currentWorkload < 0
    ) {
      setError(
        "Current workload must be zero or greater."
      );

      return;
    }

    const payload:
      HumanResourceProfileRequest = {
      userId,

      maxWorkingHoursPerDay,

      currentWorkload,

      status:
        form.status,
    };

    try {
      setSaving(true);
      setError("");

      if (editing) {
        await updateHumanResourceProfile(
          editing.humanResourceId,
          payload
        );
      } else {
        await createHumanResourceProfile(
          payload
        );
      }

      setDialogOpen(false);
      setEditing(null);
      setForm(emptyForm);

      await loadData();
    } catch (submitError) {
      console.error(
        "Save human resource profile failed:",
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
    item: HumanResourceProfile
  ) => {
    const confirmed =
      window.confirm(
        `Delete human resource profile "${getProfileName(
          item
        )}"?`
      );

    if (!confirmed) {
      return;
    }

    try {
      setDeletingId(
        item.humanResourceId
      );

      setError("");

      await deleteHumanResourceProfile(
        item.humanResourceId
      );

      setItems(
        (current) =>
          current.filter(
            (value) =>
              value.humanResourceId !==
              item.humanResourceId
          )
      );
    } catch (deleteError) {
      console.error(
        "Delete human resource profile failed:",
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
      statusFilter
    );

  return (
    <DashboardLayout>
      <div className="human-profile-page">
        <header className="human-profile-header">
          <div>
            <p>
              Dashboard / Human Resource Profiles
            </p>

            <h1>
              Human Resource Profiles
            </h1>

            <span>
              Manage personnel availability,
              workload and maximum working
              hours.
            </span>
          </div>

          {canManage && (
            <button
              type="button"
              onClick={openCreate}
            >
              <Plus size={18} />

              Add Profile
            </button>
          )}
        </header>

        <section className="human-profile-filter">
          <div className="human-profile-search">
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
              placeholder="Search name, username or email..."
            />
          </div>

          <select
            value={statusFilter}
            onChange={(event) =>
              setStatusFilter(
                event.target
                  .value as
                  | HumanResourceStatus
                  | ""
              )
            }
          >
            <option value="">
              All statuses
            </option>

            {humanResourceStatuses.map(
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
          <div className="human-profile-error">
            {error}
          </div>
        )}

        <section className="human-profile-card">
          <div className="human-profile-card-title">
            <div>
              <h2>
                Human Resource List
              </h2>

              <p>
                {items.length}{" "}
                {items.length === 1
                  ? "profile"
                  : "profiles"}
              </p>
            </div>

            <UserRound size={22} />
          </div>

          {loading ? (
            <div className="human-profile-state">
              Loading human resource profiles...
            </div>
          ) : items.length === 0 ? (
            <div className="human-profile-state">
              No human resource profiles found.
            </div>
          ) : (
            <div className="human-profile-table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Person</th>
                    <th>User ID</th>
                    <th>Role</th>
                    <th>
                      Max Hours/Day
                    </th>
                    <th>
                      Current Workload
                    </th>
                    <th>Status</th>
                    <th>Created</th>
                    <th>Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {items.map(
                    (item) => (
                      <tr
                        key={
                          item.humanResourceId
                        }
                      >
                        <td>
                          #
                          {
                            item.humanResourceId
                          }
                        </td>

                        <td>
                          <strong>
                            {getProfileName(
                              item
                            )}
                          </strong>

                          <small>
                            {item.email ||
                              item.username ||
                              "-"}
                          </small>
                        </td>

                        <td>
                          #
                          {
                            item.userId
                          }
                        </td>

                        <td>
                          {item.roleName ||
                            (
                              item.roleId
                                ? `Role #${item.roleId}`
                                : "-"
                            )}
                        </td>

                        <td>
                          {
                            item.maxWorkingHoursPerDay
                          }{" "}
                          hours
                        </td>

                        <td>
                          {
                            item.currentWorkload
                          }
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
                          {formatDate(
                            item.createdAt
                          )}
                        </td>

                        <td>
                          <div className="human-profile-actions">
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
                                    item.humanResourceId
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
            className="human-profile-overlay"
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
              className="human-profile-dialog"
              onSubmit={
                handleSubmit
              }
            >
              <div className="human-profile-dialog-head">
                <div>
                  <h2>
                    {editing
                      ? "Edit Human Resource Profile"
                      : "Create Human Resource Profile"}
                  </h2>

                  <p>
                    {editing
                      ? getProfileName(
                          editing
                        )
                      : "Enter the user and workload information."}
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
                  aria-label="Close human resource profile form"
                >
                  <X size={19} />
                </button>
              </div>

              <div className="human-profile-form-grid">
                <label htmlFor="humanProfileUserId">
                  User ID

                  <input
                    id="humanProfileUserId"
                    type="number"
                    min="1"
                    step="1"
                    value={
                      form.userId
                    }
                    onChange={(event) =>
                      updateForm(
                        "userId",
                        event.target
                          .value
                      )
                    }
                    disabled={
                      saving ||
                      Boolean(
                        editing
                      )
                    }
                    required
                  />
                </label>

                <label htmlFor="humanProfileStatus">
                  Status

                  <select
                    id="humanProfileStatus"
                    value={
                      form.status
                    }
                    onChange={(event) =>
                      updateForm(
                        "status",
                        event.target
                          .value as HumanResourceStatus
                      )
                    }
                    disabled={
                      saving
                    }
                  >
                    {humanResourceStatuses.map(
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

                <label htmlFor="humanProfileMaxHours">
                  Maximum Working Hours/Day

                  <input
                    id="humanProfileMaxHours"
                    type="number"
                    min="0.5"
                    max="24"
                    step="0.5"
                    value={
                      form.maxWorkingHoursPerDay
                    }
                    onChange={(event) =>
                      updateForm(
                        "maxWorkingHoursPerDay",
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

                <label htmlFor="humanProfileWorkload">
                  Current Workload

                  <input
                    id="humanProfileWorkload"
                    type="number"
                    min="0"
                    step="0.5"
                    value={
                      form.currentWorkload
                    }
                    onChange={(event) =>
                      updateForm(
                        "currentWorkload",
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
              </div>

              <div className="human-profile-dialog-actions">
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
                    !form.userId
                  }
                >
                  {saving
                    ? "Saving..."
                    : editing
                      ? "Save Changes"
                      : "Create Profile"}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}