import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from "react";

import {
  BadgeCheck,
  Pencil,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";

import DashboardLayout from "../../layouts/DashboardLayout";

import {
  createHumanResourceSkill,
  deleteHumanResourceSkill,
  getHumanResourceSkills,
  updateHumanResourceSkill,
} from "../../services/humanResourceSkillService";

import {
  getHumanResourceProfiles,
} from "../../services/humanResourceProfileService";

import {
  getSkills,
} from "../../services/skillService";

import type {
  HumanResourceProfile,
} from "../../types/humanResourceProfile";

import type {
  Skill,
} from "../../types/skill";

import type {
  HumanResourceSkill,
  HumanResourceSkillRequest,
  SkillLevel,
} from "../../types/humanResourceSkill";

import {
  getPermissions,
  getStoredRole,
} from "../../config/rolePermissions";

import "./HumanResourceSkillList.css";

interface FormState {
  humanResourceId: string;
  skillId: string;
  skillLevel: SkillLevel;
}

const skillLevels: SkillLevel[] = [
  "Beginner",
  "Intermediate",
  "Advanced",
  "Expert",
];

const emptyForm: FormState = {
  humanResourceId: "",
  skillId: "",
  skillLevel: "Beginner",
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

function getHumanName(
  profile: HumanResourceProfile
): string {
  return (
    profile.fullName ||
    profile.username ||
    profile.email ||
    `Human resource #${profile.humanResourceId}`
  );
}

function getAssignmentHumanName(
  item: HumanResourceSkill,
  profileMap: Map<number, string>
): string {
  return (
    item.fullName ||
    item.username ||
    item.email ||
    profileMap.get(
      item.humanResourceId
    ) ||
    `Human resource #${item.humanResourceId}`
  );
}

function getSkillName(
  item: HumanResourceSkill,
  skillMap: Map<number, string>
): string {
  return (
    item.skillName ||
    skillMap.get(item.skillId) ||
    `Skill #${item.skillId}`
  );
}

export default function HumanResourceSkillList() {
  const role =
    getStoredRole();

  const permission =
    getPermissions(role);

  const canManage =
    permission.canManageResources;

  const [
    items,
    setItems,
  ] = useState<HumanResourceSkill[]>([]);

  const [
    profiles,
    setProfiles,
  ] = useState<HumanResourceProfile[]>([]);

  const [
    skills,
    setSkills,
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
    profileFilter,
    setProfileFilter,
  ] = useState("");

  const [
    skillFilter,
    setSkillFilter,
  ] = useState("");

  const [
    levelFilter,
    setLevelFilter,
  ] = useState<SkillLevel | "">("");

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
  ] = useState<number | null>(null);

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
  ] = useState<HumanResourceSkill | null>(
    null
  );

  const [
    form,
    setForm,
  ] = useState<FormState>(
    emptyForm
  );

  const profileMap = useMemo(
    () =>
      new Map(
        profiles.map(
          (profile) => [
            profile.humanResourceId,
            getHumanName(profile),
          ]
        )
      ),
    [profiles]
  );

  const skillMap = useMemo(
    () =>
      new Map(
        skills.map(
          (skill) => [
            skill.skillId,
            skill.skillName,
          ]
        )
      ),
    [skills]
  );

  const loadData = useCallback(
    async () => {
      try {
        setLoading(true);
        setError("");

        const [
          assignmentData,
          profileData,
          skillData,
        ] = await Promise.all([
          getHumanResourceSkills({
            keyword:
              appliedKeyword ||
              undefined,

            humanResourceId:
              profileFilter
                ? Number(profileFilter)
                : undefined,

            skillId:
              skillFilter
                ? Number(skillFilter)
                : undefined,

            skillLevel:
              levelFilter ||
              undefined,

            page: 1,
            size: 300,
          }),

          getHumanResourceProfiles({
            page: 1,
            size: 300,
          }),

          getSkills({
            page: 1,
            size: 300,
          }),
        ]);

        setItems(
          Array.isArray(assignmentData)
            ? assignmentData
            : []
        );

        setProfiles(
          Array.isArray(profileData)
            ? profileData
            : []
        );

        setSkills(
          Array.isArray(skillData)
            ? skillData
            : []
        );
      } catch (loadError) {
        console.error(
          "Load human resource skills failed:",
          loadError
        );

        setError(
          getErrorMessage(loadError)
        );

        setItems([]);
      } finally {
        setLoading(false);
      }
    },
    [
      appliedKeyword,
      profileFilter,
      skillFilter,
      levelFilter,
    ]
  );

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
    item: HumanResourceSkill
  ) => {
    setEditing(item);

    setForm({
      humanResourceId:
        String(item.humanResourceId),

      skillId:
        String(item.skillId),

      skillLevel:
        item.skillLevel,
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

  const handleSubmit = async (
    event: FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();
    setError("");

    const humanResourceId =
      Number(form.humanResourceId);

    const skillId =
      Number(form.skillId);

    if (
      !Number.isInteger(
        humanResourceId
      ) ||
      humanResourceId <= 0
    ) {
      setError(
        "Please select a valid human resource."
      );

      return;
    }

    if (
      !Number.isInteger(skillId) ||
      skillId <= 0
    ) {
      setError(
        "Please select a valid skill."
      );

      return;
    }

    const duplicate = items.some(
      (item) =>
        item.humanResourceId ===
          humanResourceId &&
        item.skillId === skillId &&
        item.humanResourceSkillId !==
          editing?.humanResourceSkillId
    );

    if (duplicate) {
      setError(
        "This skill is already assigned to the selected human resource."
      );

      return;
    }

    const payload:
      HumanResourceSkillRequest = {
      humanResourceId,
      skillId,
      skillLevel:
        form.skillLevel,
    };

    try {
      setSaving(true);

      if (editing) {
        await updateHumanResourceSkill(
          editing.humanResourceSkillId,
          payload
        );
      } else {
        await createHumanResourceSkill(
          payload
        );
      }

      setDialogOpen(false);
      setEditing(null);
      setForm(emptyForm);

      await loadData();
    } catch (submitError) {
      console.error(
        "Save human resource skill failed:",
        submitError
      );

      setError(
        getErrorMessage(submitError)
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (
    item: HumanResourceSkill
  ) => {
    const confirmed =
      window.confirm(
        `Remove "${getSkillName(
          item,
          skillMap
        )}" from "${getAssignmentHumanName(
          item,
          profileMap
        )}"?`
      );

    if (!confirmed) {
      return;
    }

    try {
      setDeletingId(
        item.humanResourceSkillId
      );

      setError("");

      await deleteHumanResourceSkill(
        item.humanResourceSkillId
      );

      setItems(
        (current) =>
          current.filter(
            (value) =>
              value.humanResourceSkillId !==
              item.humanResourceSkillId
          )
      );
    } catch (deleteError) {
      setError(
        getErrorMessage(deleteError)
      );
    } finally {
      setDeletingId(null);
    }
  };

  const clearFilters = () => {
    setKeyword("");
    setAppliedKeyword("");
    setProfileFilter("");
    setSkillFilter("");
    setLevelFilter("");
  };

  return (
    <DashboardLayout>
      <div className="human-skill-page">
        <header className="human-skill-header">
          <div>
            <p>
              Dashboard / Human Resource Skills
            </p>

            <h1>
              Human Resource Skills
            </h1>

            <span>
              Assign skills and proficiency
              levels to human resources.
            </span>
          </div>

          {canManage && (
            <button
              type="button"
              onClick={openCreate}
            >
              <Plus size={18} />

              Assign Skill
            </button>
          )}
        </header>

        <section className="human-skill-filter">
          <div className="human-skill-search">
            <Search size={18} />

            <input
              value={keyword}
              onChange={(event) =>
                setKeyword(
                  event.target.value
                )
              }
              onKeyDown={(event) => {
                if (
                  event.key === "Enter"
                ) {
                  setAppliedKeyword(
                    keyword.trim()
                  );
                }
              }}
              placeholder="Search person or skill..."
            />
          </div>

          <select
            value={profileFilter}
            onChange={(event) =>
              setProfileFilter(
                event.target.value
              )
            }
          >
            <option value="">
              All human resources
            </option>

            {profiles.map(
              (profile) => (
                <option
                  key={
                    profile.humanResourceId
                  }
                  value={
                    profile.humanResourceId
                  }
                >
                  {getHumanName(profile)}
                </option>
              )
            )}
          </select>

          <select
            value={skillFilter}
            onChange={(event) =>
              setSkillFilter(
                event.target.value
              )
            }
          >
            <option value="">
              All skills
            </option>

            {skills.map(
              (skill) => (
                <option
                  key={skill.skillId}
                  value={skill.skillId}
                >
                  {skill.skillName}
                </option>
              )
            )}
          </select>

          <select
            value={levelFilter}
            onChange={(event) =>
              setLevelFilter(
                event.target.value as
                  | SkillLevel
                  | ""
              )
            }
          >
            <option value="">
              All levels
            </option>

            {skillLevels.map(
              (level) => (
                <option
                  key={level}
                  value={level}
                >
                  {level}
                </option>
              )
            )}
          </select>

          <button
            type="button"
            onClick={() =>
              setAppliedKeyword(
                keyword.trim()
              )
            }
          >
            Search
          </button>

          {(keyword ||
            appliedKeyword ||
            profileFilter ||
            skillFilter ||
            levelFilter) && (
            <button
              type="button"
              className="secondary"
              onClick={clearFilters}
            >
              Clear
            </button>
          )}
        </section>

        {error && (
          <div className="human-skill-error">
            {error}
          </div>
        )}

        <section className="human-skill-card">
          <div className="human-skill-card-title">
            <div>
              <h2>
                Assigned Skills
              </h2>

              <p>
                {items.length} assignments
              </p>
            </div>

            <BadgeCheck size={22} />
          </div>

          {loading ? (
            <div className="human-skill-state">
              Loading human resource skills...
            </div>
          ) : items.length === 0 ? (
            <div className="human-skill-state">
              No skill assignments found.
            </div>
          ) : (
            <div className="human-skill-table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Human Resource</th>
                    <th>Role</th>
                    <th>Skill</th>
                    <th>Level</th>
                    <th>Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {items.map(
                    (item) => (
                      <tr
                        key={
                          item.humanResourceSkillId
                        }
                      >
                        <td>
                          #
                          {
                            item.humanResourceSkillId
                          }
                        </td>

                        <td>
                          <strong>
                            {getAssignmentHumanName(
                              item,
                              profileMap
                            )}
                          </strong>

                          <small>
                            {item.email ||
                              `Human resource #${item.humanResourceId}`}
                          </small>
                        </td>

                        <td>
                          {item.roleName ||
                            "-"}
                        </td>

                        <td>
                          {getSkillName(
                            item,
                            skillMap
                          )}
                        </td>

                        <td>
                          <span
                            className={`human-skill-level human-skill-level-${item.skillLevel.toLowerCase()}`}
                          >
                            {item.skillLevel}
                          </span>
                        </td>

                        <td>
                          <div className="human-skill-actions">
                            {canManage ? (
                              <>
                                <button
                                  type="button"
                                  title="Edit"
                                  onClick={() =>
                                    openEdit(item)
                                  }
                                >
                                  <Pencil
                                    size={16}
                                  />
                                </button>

                                <button
                                  type="button"
                                  className="danger"
                                  disabled={
                                    deletingId ===
                                    item.humanResourceSkillId
                                  }
                                  title="Delete"
                                  onClick={() =>
                                    void handleDelete(
                                      item
                                    )
                                  }
                                >
                                  <Trash2
                                    size={16}
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
            className="human-skill-overlay"
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
              className="human-skill-dialog"
              onSubmit={handleSubmit}
            >
              <div className="human-skill-dialog-head">
                <h2>
                  {editing
                    ? "Edit Skill Assignment"
                    : "Assign Skill"}
                </h2>

                <button
                  type="button"
                  onClick={closeDialog}
                  disabled={saving}
                >
                  <X size={19} />
                </button>
              </div>

              <label>
                Human Resource

                <select
                  value={
                    form.humanResourceId
                  }
                  onChange={(event) =>
                    setForm(
                      (current) => ({
                        ...current,
                        humanResourceId:
                          event.target.value,
                      })
                    )
                  }
                  disabled={saving}
                  required
                >
                  <option value="">
                    Select human resource
                  </option>

                  {profiles.map(
                    (profile) => (
                      <option
                        key={
                          profile.humanResourceId
                        }
                        value={
                          profile.humanResourceId
                        }
                      >
                        {getHumanName(
                          profile
                        )}
                      </option>
                    )
                  )}
                </select>
              </label>

              <label>
                Skill

                <select
                  value={form.skillId}
                  onChange={(event) =>
                    setForm(
                      (current) => ({
                        ...current,
                        skillId:
                          event.target.value,
                      })
                    )
                  }
                  disabled={saving}
                  required
                >
                  <option value="">
                    Select skill
                  </option>

                  {skills.map(
                    (skill) => (
                      <option
                        key={
                          skill.skillId
                        }
                        value={
                          skill.skillId
                        }
                      >
                        {skill.skillName}
                      </option>
                    )
                  )}
                </select>
              </label>

              <label>
                Skill Level

                <select
                  value={
                    form.skillLevel
                  }
                  onChange={(event) =>
                    setForm(
                      (current) => ({
                        ...current,
                        skillLevel:
                          event.target
                            .value as SkillLevel,
                      })
                    )
                  }
                  disabled={saving}
                >
                  {skillLevels.map(
                    (level) => (
                      <option
                        key={level}
                        value={level}
                      >
                        {level}
                      </option>
                    )
                  )}
                </select>
              </label>

              <div className="human-skill-dialog-actions">
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
                  disabled={
                    saving ||
                    !form.humanResourceId ||
                    !form.skillId
                  }
                >
                  {saving
                    ? "Saving..."
                    : editing
                      ? "Save Changes"
                      : "Assign Skill"}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}