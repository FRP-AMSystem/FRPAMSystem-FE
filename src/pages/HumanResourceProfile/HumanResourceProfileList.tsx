import {
  useCallback,
  useEffect,
  useState,
  type FormEvent,
} from "react";

import {
  Pencil,
  Plus,
  RotateCw,
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
import { getUsers } from "../../services/userService";
import type { User } from "../../types/user";

import type {
  HumanResourceProfile,
  HumanResourceProfileRequest,
  HumanResourceStatus,
} from "../../types/humanResourceProfile";

import "./HumanResourceProfileList.css";

type Role =
  | "Manager"
  | "Researcher"
  | "Technician" | "Student" | "Seasonal";

const ALLOWED_HR_ROLES = ["researcher", "seasonal", "student", "technician"];

export function isAllowedHrRole(roleName?: string | null, roleId?: number | null): boolean {
  if (roleId === 3 || roleId === 4 || roleId === 5) return true;
  if (!roleName) return false;
  const norm = roleName.toLowerCase().trim();
  if (norm === "admin" || norm === "manager") return false;
  return ALLOWED_HR_ROLES.some((r) => norm.includes(r));
}

export function getNormalizedHrRoleName(roleName?: string | null, roleId?: number | null): string {
  if (roleId === 5) return "Seasonal";
  if (roleId === 4) return "Technician";
  if (roleId === 3) return "Researcher";
  const norm = (roleName || "").toLowerCase().trim();
  if (norm === "student" || norm === "seasonal" || norm.includes("student") || norm.includes("seasonal")) return "Seasonal";
  if (norm === "technician" || norm.includes("technician") || norm.includes("tech")) return "Technician";
  if (norm === "researcher" || norm.includes("researcher")) return "Researcher";
  return roleName || "Staff";
}

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
    getCurrentRole();

  const canManage =
    role === "Admin" || role === "Manager";

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
  ] = useState<FormState>(emptyForm);
  const [eligibleUsers, setEligibleUsers] = useState<User[]>([]);

  const loadData =
    useCallback(async () => {
      try {
        setLoading(true);
        setError("");

        const [profilesData, usersData] = await Promise.all([
          getHumanResourceProfiles({
            keyword: appliedKeyword || undefined,
            status: statusFilter || undefined,
            page: 1,
            size: 300,
          }).catch(() => [] as HumanResourceProfile[]),
          getUsers().catch(() => [] as User[]),
        ]);

        // Filter only users belonging to the 3 permitted roles: Researcher, Seasonal (Student), Technician
        const allowedUsers = (usersData || []).filter((u: any) =>
          isAllowedHrRole(u.role || u.roleName, u.roleId)
        );
        setEligibleUsers(allowedUsers);

        const mergedList: HumanResourceProfile[] = [];
        const visitedUserIds = new Set<number>();

        // 1. Process profiles already created on Backend
        for (const p of profilesData) {
          const uId = p.userId;
          const matchedUser = allowedUsers.find(
            (u: any) => (u.userId ?? Number(u.id)) === uId
          );
          const effectiveRole = p.roleName || (matchedUser ? matchedUser.role : "");
          const effectiveRoleId = p.roleId || (matchedUser ? (matchedUser as any).roleId : null);

          if (isAllowedHrRole(effectiveRole, effectiveRoleId)) {
            const normRole = getNormalizedHrRoleName(effectiveRole, effectiveRoleId);
            mergedList.push({
              ...p,
              fullName: p.fullName || (matchedUser ? matchedUser.fullName : null),
              username: p.username || (matchedUser ? matchedUser.username : null),
              email: p.email || (matchedUser ? matchedUser.email : null),
              roleName: normRole,
              roleId: normRole === "Seasonal" ? 5 : normRole === "Technician" ? 4 : 3,
            });
            visitedUserIds.add(uId);
          }
        }

        // 2. Synthesize personnel entries for any eligible users (Seasonal, Technician, Researcher) who do not have a DB profile yet
        for (const u of allowedUsers) {
          const uId = (u as any).userId ?? Number(u.id);
          if (Number.isInteger(uId) && uId > 0 && !visitedUserIds.has(uId)) {
            const normRole = getNormalizedHrRoleName(u.role, (u as any).roleId);
            mergedList.push({
              humanResourceId: 0,
              userId: uId,
              fullName: u.fullName,
              username: u.username || null,
              email: u.email || null,
              roleName: normRole,
              roleId: normRole === "Seasonal" ? 5 : normRole === "Technician" ? 4 : 3,
              maxWorkingHoursPerDay: 8,
              currentWorkload: 0,
              status: "Available",
              createdAt: u.createdDate || null,
              updatedAt: null,
            });
            visitedUserIds.add(uId);
          }
        }

        // 3. Apply keyword or status filtering if set
        let finalItems = mergedList;
        if (appliedKeyword) {
          const kw = appliedKeyword.toLowerCase();
          finalItems = finalItems.filter(
            (i) =>
              (i.fullName && i.fullName.toLowerCase().includes(kw)) ||
              (i.username && i.username.toLowerCase().includes(kw)) ||
              (i.email && i.email.toLowerCase().includes(kw)) ||
              (i.roleName && i.roleName.toLowerCase().includes(kw))
          );
        }
        if (statusFilter) {
          finalItems = finalItems.filter((i) => i.status === statusFilter);
        }

        setItems(finalItems);
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
    const firstUserId = eligibleUsers.length > 0 ? String((eligibleUsers[0] as any).userId ?? eligibleUsers[0].id) : "";
    setForm({
      ...emptyForm,
      userId: firstUserId,
    });
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
                    <th>Person</th>
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
                          {item.roleName ? (
                            <span
                              className={`role-badge role-${item.roleName.toLowerCase()}`}
                            >
                              {item.roleName.toUpperCase()}
                            </span>
                          ) : item.roleId ? (
                            <span className="role-badge">
                              ROLE #{item.roleId}
                            </span>
                          ) : (
                            "-"
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
                                    item.humanResourceId
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
                <div className="profile-form-group">
                  <label htmlFor="humanProfileUserId">
                    Personnel User <span className="required">*</span>
                  </label>
                  {editing ? (
                    <input
                      id="humanProfileUserId"
                      type="text"
                      value={`${editing.fullName || editing.username || `User #${editing.userId}`} (${editing.roleName || "Staff"})`}
                      disabled
                      style={{ background: "#f8fafc", cursor: "not-allowed", fontWeight: 600 }}
                    />
                  ) : (
                    <select
                      id="humanProfileUserId"
                      value={form.userId}
                      onChange={(event) =>
                        updateForm("userId", event.target.value)
                      }
                      disabled={saving}
                      required
                    >
                      <option value="">-- Select Personnel (Researcher, Seasonal, Technician) --</option>
                      {eligibleUsers.map((u: any) => {
                        const uId = u.userId ?? u.id;
                        const normRole = getNormalizedHrRoleName(u.role, u.roleId);
                        return (
                          <option key={uId} value={uId}>
                            {u.fullName || u.username} ({normRole}) - {u.email || u.username || `ID: ${uId}`}
                          </option>
                        );
                      })}
                    </select>
                  )}
                </div>

                <div className="profile-form-group">
                  <label htmlFor="humanProfileStatus">Status</label>
                  <select
                    id="humanProfileStatus"
                    value={form.status}
                    onChange={(event) =>
                      updateForm(
                        "status",
                        event.target.value as HumanResourceStatus
                      )
                    }
                    disabled={saving}
                  >
                    {humanResourceStatuses.map((status) => (
                      <option key={status} value={status}>
                        {getStatusLabel(status)}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="profile-form-group">
                  <label htmlFor="humanProfileMaxHours">
                    Maximum Working Hours/Day <span className="required">*</span>
                  </label>
                  <input
                    id="humanProfileMaxHours"
                    type="number"
                    min="0.5"
                    max="24"
                    step="0.5"
                    placeholder="e.g. 8"
                    value={form.maxWorkingHoursPerDay}
                    onChange={(event) =>
                      updateForm("maxWorkingHoursPerDay", event.target.value)
                    }
                    disabled={saving}
                    required
                  />
                </div>

                <div className="profile-form-group">
                  <label htmlFor="humanProfileWorkload">
                    Current Workload <span className="required">*</span>
                  </label>
                  <input
                    id="humanProfileWorkload"
                    type="number"
                    min="0"
                    step="0.5"
                    placeholder="e.g. 0"
                    value={form.currentWorkload}
                    onChange={(event) =>
                      updateForm("currentWorkload", event.target.value)
                    }
                    disabled={saving}
                    required
                  />
                </div>
              </div>

              <div className="human-profile-dialog-actions">
                <button
                  type="button"
                  className="secondary"
                  onClick={closeDialog}
                  disabled={saving}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="primary"
                  disabled={saving || !form.userId}
                >
                  {saving ? (
                    <>
                      <RotateCw size={14} className="spin-icon" />
                      <span>Saving...</span>
                    </>
                  ) : editing ? (
                    "Save Changes"
                  ) : (
                    "Create Profile"
                  )}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}