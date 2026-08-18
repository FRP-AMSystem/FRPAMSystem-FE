import {
  useCallback,
  useEffect,
  useState,
  type FormEvent,
} from "react";

import {
  BadgeCheck,
  Pencil,
  Plus,
  RotateCw,
  Search,
  Trash2,
  X,
} from "lucide-react";

import DashboardLayout from "../../layouts/DashboardLayout";

import {
  createSkill,
  deleteSkill,
  getSkills,
  updateSkill,
} from "../../services/skillService";

import type {
  Skill,
  SkillRequest,
} from "../../types/skill";

import "./SkillList.css";

type Role =
  | "Manager"
  | "Researcher"
  | "Technician" | "Student" | "Seasonal";

interface FormState {
  skillName: string;
  description: string;
}

const emptyForm: FormState = {
  skillName: "",
  description: "",
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

export default function SkillList() {
  const role =
    getCurrentRole();

  const canManage =
    role === "Admin" || role === "Manager";

  const [
    items,
    setItems,
  ] = useState<Skill[]>([]);

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
  ] = useState<Skill | null>(
    null
  );

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
          await getSkills({
            keyword:
              appliedKeyword ||
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
          "Load skills failed:",
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
    setForm(emptyForm);
    setError("");
    setDialogOpen(true);
  };

  const openEdit = (
    item: Skill
  ) => {
    setEditing(item);

    setForm({
      skillName:
        item.skillName,

      description:
        item.description || "",
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
      form.skillName.trim();

    if (!normalizedName) {
      setError(
        "Skill name is required."
      );

      return;
    }

    const payload:
      SkillRequest = {
      skillName:
        normalizedName,

      description:
        form.description.trim() ||
        null,
    };

    try {
      setSaving(true);

      if (editing) {
        await updateSkill(
          editing.skillId,
          payload
        );
      } else {
        await createSkill(
          payload
        );
      }

      setDialogOpen(false);
      setEditing(null);
      setForm(emptyForm);

      await loadData();
    } catch (submitError) {
      console.error(
        "Save skill failed:",
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
    item: Skill
  ) => {
    const confirmed =
      window.confirm(
        `Delete skill "${item.skillName}"?`
      );

    if (!confirmed) {
      return;
    }

    try {
      setDeletingId(
        item.skillId
      );

      setError("");

      await deleteSkill(
        item.skillId
      );

      setItems(
        (current) =>
          current.filter(
            (value) =>
              value.skillId !==
              item.skillId
          )
      );
    } catch (deleteError) {
      console.error(
        "Delete skill failed:",
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
      <div className="skill-page">
        <header className="skill-header">
          <div>
            <p>
              Dashboard / Skills
            </p>

            <h1>
              Skills
            </h1>

            <span>
              Manage the skills that can be
              assigned to human resources.
            </span>
          </div>

          {canManage && (
            <button
              type="button"
              onClick={openCreate}
            >
              <Plus size={18} />

              Add Skill
            </button>
          )}
        </header>

        <section className="skill-filter">
          <div className="skill-search">
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
              placeholder="Search skill name..."
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
          <div className="skill-error">
            {error}
          </div>
        )}

        <section className="skill-card">
          <div className="skill-card-title">
            <div>
              <h2>
                Skill List
              </h2>

              <p>
                {items.length}{" "}
                {items.length === 1
                  ? "skill"
                  : "skills"}
              </p>
            </div>

            <BadgeCheck size={22} />
          </div>

          {loading ? (
            <div className="skill-state">
              Loading skills...
            </div>
          ) : items.length === 0 ? (
            <div className="skill-state">
              No skills found.
            </div>
          ) : (
            <div className="skill-table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>
                      Skill Name
                    </th>
                    <th>
                      Description
                    </th>
                    <th>
                      Created
                    </th>
                    <th>
                      Updated
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
                          item.skillId
                        }
                      >
                        <td>
                          <strong>
                            {
                              item.skillName
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
                          {formatDate(
                            item.updatedAt
                          )}
                        </td>

                        <td>
                          <div className="skill-actions">
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
                                    item.skillId
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
            className="skill-overlay"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) {
                closeDialog();
              }
            }}
          >
            <form className="skill-dialog" onSubmit={handleSubmit}>
              <div className="skill-dialog-head">
                <div>
                  <h2>{editing ? "Edit Skill" : "Create Skill"}</h2>
                  <p>
                    {editing
                      ? "Update expertise skill details for personnel."
                      : "Add a new reusable skill for personnel profiles."}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={closeDialog}
                  disabled={saving}
                  aria-label="Close skill form"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="skill-dialog-body">
                <div className="skill-form-group">
                  <label htmlFor="skillName">
                    Skill Name <span className="required">*</span>
                  </label>
                  <input
                    id="skillName"
                    type="text"
                    placeholder="e.g. Forestry Drone Pilot"
                    value={form.skillName}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        skillName: event.target.value,
                      }))
                    }
                    disabled={saving}
                    maxLength={150}
                    required
                  />
                </div>

                <div className="skill-form-group">
                  <label htmlFor="skillDescription">Description</label>
                  <textarea
                    id="skillDescription"
                    placeholder="Describe the required competencies for this skill..."
                    value={form.description}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        description: event.target.value,
                      }))
                    }
                    disabled={saving}
                    rows={4}
                  />
                </div>
              </div>

              <div className="skill-dialog-actions">
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
                  disabled={saving || !form.skillName.trim()}
                >
                  {saving ? (
                    <>
                      <RotateCw size={14} className="spin-icon" />
                      <span>Saving...</span>
                    </>
                  ) : editing ? (
                    "Save Changes"
                  ) : (
                    "Create Skill"
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