import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from "react";

import {
  BadgeCheck,
  BriefcaseBusiness,
  Mail,
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
  syncHumanResourceProfileSkills,
  updateHumanResourceProfile,
} from "../../services/humanResourceProfileService";

import {
  getHumanResourceSkills,
} from "../../services/humanResourceSkillService";

import {
  getSkills,
} from "../../services/skillService";

import {
  getUsers,
} from "../../services/userService";

import {
  getRoles,
  normalizeRoleName,
  type RoleItem,
} from "../../services/roleService";

import type {
  User,
} from "../../types/user";

import type {
  HumanResourceProfile,
  HumanResourceProfileRequest,
  HumanResourceStatus,
} from "../../types/humanResourceProfile";

import type {
  HumanResourceSkill,
  SkillLevel,
} from "../../types/humanResourceSkill";

import type {
  Skill,
} from "../../types/skill";

import "./HumanResourceProfileList.css";

import { usePopup } from "../../context/PopupContext";
import Pagination from "../../components/Pagination";
import usePagination from "../../hooks/usePagination";

type Role =
  | "Admin"
  | "Manager"
  | "Researcher"
  | "Technician"
  | "Student"
  | "Seasonal";

type SelectedSkill = {
  skillId: number;
  skillName: string;
  skillLevel: SkillLevel;
};

interface FormState {
  userId: string;
  maxWorkingHoursPerDay: string;
  status: HumanResourceStatus;
}

const ALLOWED_HR_ROLES = [
  "researcher",
  "seasonal",
  "student",
  "technician",
];

const humanResourceStatuses: HumanResourceStatus[] = [
  "Available",
  "Busy",
  "Inactive",
];

function getEffectiveHumanResourceStatus(
  profile: Pick<
    HumanResourceProfile,
    "status" | "currentWorkload" | "maxWorkingHoursPerDay"
  >
): HumanResourceStatus {
  if (profile.status === "Inactive") {
    return "Inactive";
  }

  const workload = Number(profile.currentWorkload) || 0;

  return workload > 0
    ? "Busy"
    : "Available";
}

const skillLevels: SkillLevel[] = [
  "Beginner",
  "Intermediate",
  "Advanced",
  "Expert",
];

const emptyForm: FormState = {
  userId: "",
  maxWorkingHoursPerDay: "8",
  status: "Available",
};

export function isAllowedHrRole(
  roleName?: string | null,
  roleId?: number | null
): boolean {
  if (
    roleId === 3 ||
    roleId === 4 ||
    roleId === 5
  ) {
    return true;
  }

  if (!roleName) {
    return false;
  }

  const norm =
    roleName
      .toLowerCase()
      .trim();

  if (
    norm === "admin" ||
    norm === "manager"
  ) {
    return false;
  }

  return ALLOWED_HR_ROLES.some(
    (role) =>
      norm.includes(role)
  );
}

export function getNormalizedHrRoleName(
  roleName?: string | null,
  roleId?: number | null
): string {
  if (roleId === 5) {
    return "Seasonal";
  }

  if (roleId === 4) {
    return "Technician";
  }

  if (roleId === 3) {
    return "Researcher";
  }

  const norm =
    (roleName || "")
      .toLowerCase()
      .trim();

  if (
    norm === "student" ||
    norm === "seasonal" ||
    norm.includes("student") ||
    norm.includes("seasonal")
  ) {
    return "Seasonal";
  }

  if (
    norm === "technician" ||
    norm.includes("technician") ||
    norm.includes("tech")
  ) {
    return "Technician";
  }

  if (
    norm === "researcher" ||
    norm.includes("researcher")
  ) {
    return "Researcher";
  }

  return roleName || "Staff";
}

function getCurrentRole(): Role {
  const storedRole =
    localStorage.getItem("role");

  if (
    storedRole === "Admin" ||
    storedRole === "Manager" ||
    storedRole === "Researcher" ||
    storedRole === "Technician" ||
    storedRole === "Student" ||
    storedRole === "Seasonal"
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

  const date =
    new Date(value);

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

function getStatusClassName(
  status: HumanResourceStatus
): string {
  return [
    "human-profile-status",
    `human-profile-status-${status.toLowerCase()}`,
  ].join(" ");
}

type RawUserRoleObject = {
  roleId?: number | string | null;
  roleName?: string | null;
  id?: number | string | null;
  name?: string | null;
};

type RawUserShape = {
  id?: string | number;
  userId?: number | string;
  fullName?: string | null;
  username?: string | null;
  email?: string | null;
  role?: string | RawUserRoleObject | null;
  roleId?: number | string | null;
  roleName?: string | null;
  status?: string | null;
  createdDate?: string | null;
  createdAt?: string | null;
  created_at?: string | null;
};

function getUserId(
  user: User | RawUserShape
): number {
  const rawUser =
    user as RawUserShape;

  const value =
    Number(
      rawUser.userId ??
      rawUser.id ??
      0
    );

  return Number.isInteger(value)
    ? value
    : 0;
}

function getUserRoleId(
  user?: User | RawUserShape
): number | null {
  if (!user) {
    return null;
  }

  const rawUser =
    user as RawUserShape;

  const nestedRole =
    rawUser.role &&
    typeof rawUser.role === "object"
      ? rawUser.role
      : null;

  const value =
    Number(
      rawUser.roleId ??
      nestedRole?.roleId ??
      nestedRole?.id ??
      0
    );

  return (
    Number.isInteger(value) &&
    value > 0
  )
    ? value
    : null;
}

function getUserRoleName(
  user?: User | RawUserShape
): string {
  if (!user) {
    return "";
  }

  const rawUser =
    user as RawUserShape;

  if (
    typeof rawUser.role === "string"
  ) {
    return rawUser.role.trim();
  }

  if (
    rawUser.role &&
    typeof rawUser.role === "object"
  ) {
    const nestedName =
      rawUser.role.roleName ??
      rawUser.role.name;

    if (
      typeof nestedName === "string"
    ) {
      return nestedName.trim();
    }
  }

  if (
    typeof rawUser.roleName ===
    "string"
  ) {
    return rawUser.roleName.trim();
  }

  return "";
}

function normalizePersonnelUsers(
  usersData: unknown,
  rolesData: Array<{
    roleId: number;
    roleName: string;
  }>
): User[] {
  const rawUsers =
    Array.isArray(usersData)
      ? usersData
      : [];

  return rawUsers
    .map((rawItem) => {
      const user =
        rawItem as RawUserShape;

      const userId =
        Number(
          user.userId ??
          user.id ??
          0
        );

      if (
        !Number.isInteger(userId) ||
        userId <= 0
      ) {
        return null;
      }

      const roleId =
        getUserRoleId(
          user as User
        );

      let roleName =
        getUserRoleName(
          user as User
        );

      if (
        !roleName &&
        roleId
      ) {
        const matchedRole =
          rolesData.find(
            (role) =>
              Number(role.roleId) ===
              roleId
          );

        roleName =
          matchedRole?.roleName ||
          "";
      }

      roleName =
        normalizeRoleName(
          roleName
        );

      return {
        ...user,

        id:
          String(userId),

        fullName:
          user.fullName ||
          user.username ||
          `User #${userId}`,

        username:
          user.username ||
          "",

        email:
          user.email ||
          "",

        role:
          roleName,

        status:
          user.status ||
          "Active",

        createdDate:
          user.createdDate ||
          user.createdAt ||
          user.created_at ||
          new Date().toISOString(),

        // These extra runtime fields are intentionally preserved.
        userId,
        roleId:
          roleId ?? undefined,
        roleName,
      } as User;
    })
    .filter(
      (user): user is User =>
        user !== null
    );
}

function skillRowsForResource(
  rows: HumanResourceSkill[],
  humanResourceId: number
): HumanResourceSkill[] {
  if (
    !Number.isInteger(
      humanResourceId
    ) ||
    humanResourceId <= 0
  ) {
    return [];
  }

  return rows.filter(
    (row) =>
      row.humanResourceId ===
      humanResourceId
  );
}

export default function HumanResourceProfileList() {
  const { showConfirm } = usePopup();
  const role =
    getCurrentRole();

  const canManage =
    role === "Admin" ||
    role === "Manager";

  const [
    items,
    setItems,
  ] = useState<
    HumanResourceProfile[]
  >([]);

  const [
    eligibleUsers,
    setEligibleUsers,
  ] = useState<User[]>([]);

  const [
    skills,
    setSkills,
  ] = useState<Skill[]>([]);

  const [
    resourceSkills,
    setResourceSkills,
  ] = useState<
    HumanResourceSkill[]
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

  const [
    selectedSkillId,
    setSelectedSkillId,
  ] = useState("");

  const [
    selectedSkillLevel,
    setSelectedSkillLevel,
  ] = useState<SkillLevel>(
    "Beginner"
  );

  const [
    selectedSkills,
    setSelectedSkills,
  ] = useState<
    SelectedSkill[]
  >([]);

  const loadData =
    useCallback(async () => {
      try {
        setLoading(true);
        setError("");

        const [
          profilesData,
          usersData,
          rolesData,
          skillsData,
          resourceSkillsData,
        ] = await Promise.all([
          getHumanResourceProfiles({
            keyword:
              appliedKeyword ||
              undefined,

            page: 1,
            size: 300,
          }).catch(
            () =>
              [] as HumanResourceProfile[]
          ),

          getUsers().catch(
            () => [] as User[]
          ),

          getRoles({
            page: 1,
            size: 100,
          }).catch(
            () => [] as RoleItem[]
          ),

          getSkills({
            page: 1,
            size: 300,
          }).catch(
            () => [] as Skill[]
          ),

          getHumanResourceSkills({
            page: 1,
            size: 1000,
          }).catch(
            () =>
              [] as HumanResourceSkill[]
          ),
        ]);

        /*
         * /Users can return role information in different shapes:
         *   role: "Technician"
         *   roleName: "Technician"
         *   roleId: 4
         *   role: { roleId: 4, roleName: "Technician" }
         *
         * Normalize all of them before filtering. Without this step,
         * the Personnel dropdown can become empty even though users exist.
         */
        const normalizedUsers =
          normalizePersonnelUsers(
            usersData,
            rolesData.map(
              (role) => ({
                roleId:
                  Number(
                    role.roleId
                  ),

                roleName:
                  role.roleName,
              })
            )
          );

        const allowedUsers =
          normalizedUsers.filter(
            (user) =>
              isAllowedHrRole(
                getUserRoleName(
                  user
                ),
                getUserRoleId(
                  user
                )
              )
          );

        console.info(
          "Human Resource Profile personnel options:",
          {
            rawUsers:
              Array.isArray(
                usersData
              )
                ? usersData.length
                : 0,

            roles:
              rolesData.length,

            eligibleUsers:
              allowedUsers.length,

            eligible:
              allowedUsers.map(
                (user) => ({
                  userId:
                    getUserId(
                      user
                    ),

                  fullName:
                    user.fullName,

                  role:
                    getUserRoleName(
                      user
                    ),

                  roleId:
                    getUserRoleId(
                      user
                    ),
                })
              ),
          }
        );

        setEligibleUsers(
          allowedUsers
        );

        setSkills(
          skillsData
            .filter(
              (skill) =>
                skill.skillId > 0
            )
            .sort(
              (a, b) =>
                a.skillName.localeCompare(
                  b.skillName
                )
            )
        );

        setResourceSkills(
          resourceSkillsData
        );

        const mergedList:
          HumanResourceProfile[] = [];

        const visitedUserIds =
          new Set<number>();

        for (
          const profile of
          profilesData
        ) {
          const matchedUser =
            allowedUsers.find(
              (user) =>
                getUserId(user) ===
                profile.userId
            );

          const effectiveRole =
            profile.roleName ||
            getUserRoleName(
              matchedUser
            ) ||
            "";

          const effectiveRoleId =
            profile.roleId ||
            getUserRoleId(
              matchedUser
            );

          if (
            isAllowedHrRole(
              effectiveRole,
              effectiveRoleId
            )
          ) {
            const normalizedRole =
              getNormalizedHrRoleName(
                effectiveRole,
                effectiveRoleId
              );

            mergedList.push({
              ...profile,

              fullName:
                profile.fullName ||
                matchedUser?.fullName ||
                null,

              username:
                profile.username ||
                matchedUser?.username ||
                null,

              email:
                profile.email ||
                matchedUser?.email ||
                null,

              roleName:
                normalizedRole,

              roleId:
                normalizedRole ===
                "Seasonal"
                  ? 5
                  : normalizedRole ===
                    "Technician"
                    ? 4
                    : 3,
            });

            visitedUserIds.add(
              profile.userId
            );
          }
        }

        for (
          const user of allowedUsers
        ) {
          const userId =
            getUserId(user);

          if (
            userId > 0 &&
            !visitedUserIds.has(
              userId
            )
          ) {
            const normalizedRole =
              getNormalizedHrRoleName(
                getUserRoleName(
                  user
                ),
                getUserRoleId(
                  user
                )
              );

            mergedList.push({
              humanResourceId: 0,
              userId,

              fullName:
                user.fullName,

              username:
                user.username ||
                null,

              email:
                user.email ||
                null,

              roleName:
                normalizedRole,

              roleId:
                normalizedRole ===
                "Seasonal"
                  ? 5
                  : normalizedRole ===
                    "Technician"
                    ? 4
                    : 3,

              maxWorkingHoursPerDay:
                8,

              currentWorkload:
                0,

              status:
                "Available",

              createdAt:
                user.createdDate ||
                null,

              updatedAt:
                null,
            });
          }
        }

        let finalItems =
          mergedList;

        if (appliedKeyword) {
          const normalizedKeyword =
            appliedKeyword
              .toLowerCase();

          finalItems =
            finalItems.filter(
              (item) =>
                item.fullName
                  ?.toLowerCase()
                  .includes(
                    normalizedKeyword
                  ) ||
                item.username
                  ?.toLowerCase()
                  .includes(
                    normalizedKeyword
                  ) ||
                item.email
                  ?.toLowerCase()
                  .includes(
                    normalizedKeyword
                  ) ||
                item.roleName
                  ?.toLowerCase()
                  .includes(
                    normalizedKeyword
                  )
            );
        }

        if (statusFilter) {
          finalItems =
            finalItems.filter(
              (item) =>
                getEffectiveHumanResourceStatus(item) ===
                statusFilter
            );
        }

        setItems(
          finalItems
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

  const createdProfileUserIds =
    useMemo(
      () =>
        new Set(
          items
            .filter(
              (item) =>
                item.humanResourceId >
                0
            )
            .map(
              (item) =>
                item.userId
            )
        ),
      [items]
    );

  const createUserOptions =
    useMemo(
      () =>
        eligibleUsers.filter(
          (user) =>
            !createdProfileUserIds.has(
              getUserId(user)
            )
        ),
      [
        eligibleUsers,
        createdProfileUserIds,
      ]
    );

  const selectedUser =
    useMemo(
      () =>
        eligibleUsers.find(
          (user) =>
            getUserId(user) ===
            Number(form.userId)
        ) ||
        null,
      [
        eligibleUsers,
        form.userId,
      ]
    );

  const availableSkillsToAdd =
    useMemo(
      () =>
        skills.filter(
          (skill) =>
            !selectedSkills.some(
              (selected) =>
                selected.skillId ===
                skill.skillId
            )
        ),
      [
        skills,
        selectedSkills,
      ]
    );

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

  const resetSkillForm =
    () => {
      setSelectedSkillId("");
      setSelectedSkillLevel(
        "Beginner"
      );
      setSelectedSkills([]);
    };

  const openCreate = () => {
    setEditing(null);

    setForm({
      ...emptyForm,
      userId: "",
    });

    resetSkillForm();
    setError("");
    setDialogOpen(true);
  };

  const openEdit = (
    item: HumanResourceProfile
  ) => {
    setEditing(item);

    setForm({
      userId:
        String(item.userId),

      maxWorkingHoursPerDay:
        String(
          item.maxWorkingHoursPerDay ??
          8
        ),

      status:
        item.status ||
        "Available",
    });

    const currentSkills =
      skillRowsForResource(
        resourceSkills,
        item.humanResourceId
      ).map(
        (row) => ({
          skillId:
            row.skillId,

          skillName:
            row.skillName ||
            skills.find(
              (skill) =>
                skill.skillId ===
                row.skillId
            )?.skillName ||
            `Skill #${row.skillId}`,

          skillLevel:
            row.skillLevel,
        })
      );

    setSelectedSkills(
      currentSkills
    );

    setSelectedSkillId("");
    setSelectedSkillLevel(
      "Beginner"
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
    setForm(emptyForm);
    resetSkillForm();
  };

  const handleAddSkill =
    () => {
      const skillId =
        Number(
          selectedSkillId
        );

      if (
        !Number.isInteger(
          skillId
        ) ||
        skillId <= 0
      ) {
        setError(
          "Please select a skill before adding."
        );

        return;
      }

      const skill =
        skills.find(
          (item) =>
            item.skillId ===
            skillId
        );

      if (!skill) {
        setError(
          "Selected skill was not found."
        );

        return;
      }

      if (
        selectedSkills.some(
          (item) =>
            item.skillId ===
            skillId
        )
      ) {
        setError(
          `"${skill.skillName}" has already been added.`
        );

        return;
      }

      setSelectedSkills(
        (current) => [
          ...current,
          {
            skillId,
            skillName:
              skill.skillName,
            skillLevel:
              selectedSkillLevel,
          },
        ]
      );

      setSelectedSkillId("");
      setSelectedSkillLevel(
        "Beginner"
      );
      setError("");
    };

  const handleRemoveSkill =
    (skillId: number) => {
      setSelectedSkills(
        (current) =>
          current.filter(
            (item) =>
              item.skillId !==
              skillId
          )
      );
    };

  const handleSearch = () => {
    setAppliedKeyword(
      keyword.trim()
    );
  };

  const handleClearFilters =
    () => {
      setKeyword("");
      setAppliedKeyword("");
      setStatusFilter("");
      setError("");
    };

  const resolveSavedProfileId =
    async (
      savedProfile:
        HumanResourceProfile,
      userId: number
    ): Promise<number> => {
      if (
        savedProfile
          .humanResourceId > 0
      ) {
        return savedProfile
          .humanResourceId;
      }

      const refreshed =
        await getHumanResourceProfiles({
          userId,
          page: 1,
          size: 20,
        });

      const found =
        refreshed.find(
          (profile) =>
            profile.userId ===
            userId &&
            profile.humanResourceId >
            0
        );

      if (!found) {
        throw new Error(
          "Human Resource Profile was saved, but its ID could not be resolved for skill assignment."
        );
      }

      return found.humanResourceId;
    };

  const handleSubmit =
    async (
      event:
        FormEvent<HTMLFormElement>
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

      if (
        !Number.isInteger(
          userId
        ) ||
        userId <= 0
      ) {
        setError(
          "Please select a valid personnel user."
        );

        return;
      }

      if (
        !Number.isFinite(
          maxWorkingHoursPerDay
        ) ||
        maxWorkingHoursPerDay <=
          0 ||
        maxWorkingHoursPerDay >
          24
      ) {
        setError(
          "Maximum working hours must be greater than 0 and no more than 24 hours/day."
        );

        return;
      }

      if (
        selectedSkills.length ===
        0
      ) {
        setError(
          "Please add at least one skill for this personnel resource."
        );

        return;
      }

      const payload:
        HumanResourceProfileRequest = {
        userId,
        maxWorkingHoursPerDay,
        currentWorkload:
          editing?.currentWorkload ??
          0,
        status:
          form.status,
      };

      try {
        setSaving(true);
        setError("");

        let savedProfile:
          HumanResourceProfile;

        if (
          editing &&
          editing.humanResourceId >
            0
        ) {
          savedProfile =
            await updateHumanResourceProfile(
              editing.humanResourceId,
              payload
            );
        } else {
          savedProfile =
            await createHumanResourceProfile(
              payload
            );
        }

        const profileId =
          await resolveSavedProfileId(
            savedProfile,
            userId
          );

        await syncHumanResourceProfileSkills(
          profileId,
          {
            skills:
              selectedSkills.map(
                (skill) => ({
                  skillId:
                    skill.skillId,

                  skillLevel:
                    skill.skillLevel,
                })
              ),
          }
        );

        setDialogOpen(false);
        setEditing(null);
        setForm(emptyForm);
        resetSkillForm();

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

  const handleDelete =
    async (
      item:
        HumanResourceProfile
    ) => {
      if (
        item.humanResourceId <=
        0
      ) {
        setError(
          "This personnel user does not have a persisted Human Resource Profile yet."
        );

        return;
      }

      const confirmed =
        await showConfirm(
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

        await loadData();
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

  const { currentPage, pageSize, paginatedItems, setCurrentPage, setPageSize } =
    usePagination(items, 10);

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
              workload, working hours and
              professional skills.
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
                  {status}
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
                  ? "personnel"
                  : "personnel"}
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
                    <th>Skills</th>
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
                  {paginatedItems.map(
                    (item) => {
                      const itemSkills =
                        skillRowsForResource(
                          resourceSkills,
                          item.humanResourceId
                        );

                      return (
                        <tr
                          key={`${item.userId}-${item.humanResourceId}`}
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
                                ROLE #
                                {item.roleId}
                              </span>
                            ) : (
                              "-"
                            )}
                          </td>

                          <td>
                            {itemSkills.length >
                            0 ? (
                              <div className="human-profile-skill-cell">
                                {itemSkills
                                  .slice(
                                    0,
                                    2
                                  )
                                  .map(
                                    (
                                      skill
                                    ) => (
                                      <span
                                        key={
                                          skill.humanResourceSkillId
                                        }
                                      >
                                        {skill.skillName ||
                                          `Skill #${skill.skillId}`}
                                        <small>
                                          {skill.skillLevel}
                                        </small>
                                      </span>
                                    )
                                  )}

                                {itemSkills.length >
                                  2 && (
                                  <em>
                                    +
                                    {itemSkills.length -
                                      2}{" "}
                                    more
                                  </em>
                                )}
                              </div>
                            ) : (
                              <span className="human-profile-no-skill">
                                Not configured
                              </span>
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
                            {(() => {
                              const effectiveStatus =
                                getEffectiveHumanResourceStatus(item);

                              return (
                            <span
                              className={getStatusClassName(
                                effectiveStatus
                              )}
                            >
                              {effectiveStatus}
                            </span>
                              );
                            })()}
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
                                    title={
                                      item.humanResourceId >
                                      0
                                        ? "Edit"
                                        : "Create profile"
                                    }
                                    onClick={() =>
                                      openEdit(
                                        item
                                      )
                                    }
                                  >
                                    {item.humanResourceId >
                                    0 ? (
                                      <Pencil size={12} />
                                    ) : (
                                      <Plus size={12} />
                                    )}

                                    <span>
                                      {item.humanResourceId >
                                      0
                                        ? "Edit"
                                        : "Create"}
                                    </span>
                                  </button>

                                  {item.humanResourceId >
                                    0 && (
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
                                      <span>
                                        Delete
                                      </span>
                                    </button>
                                  )}
                                </>
                              ) : (
                                <span>
                                  View only
                                </span>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    }
                  )}
                </tbody>
              </table>
                  <Pagination
                    currentPage={currentPage}
                    totalItems={items.length}
                    pageSize={pageSize}
                    onPageChange={setCurrentPage}
                    onPageSizeChange={setPageSize}
                  />
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
              className="human-profile-dialog human-profile-dialog-large"
              onSubmit={
                handleSubmit
              }
            >
              <div className="human-profile-dialog-head">
                <div>
                  <h2>
                    {editing &&
                    editing.humanResourceId >
                      0
                      ? "Edit Human Resource Profile"
                      : "Create Human Resource Profile"}
                  </h2>

                  <p>
                    Configure personnel identity,
                    availability, workload and
                    professional skills.
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

              <div className="human-profile-dialog-body">
                <section className="human-profile-form-section">
                  <div className="human-profile-section-title">
                    <UserRound size={17} />

                    <div>
                      <h3>
                        Personnel Information
                      </h3>

                      <p>
                        Select an existing system user. Name, email and role are inherited from the account.
                      </p>
                    </div>
                  </div>

                  <div className="human-profile-form-grid">
                    <div className="profile-form-group profile-form-group-full">
                      <label htmlFor="humanProfileUserId">
                        Personnel User{" "}
                        <span className="required">
                          *
                        </span>
                      </label>

                      {editing ? (
                        <input
                          id="humanProfileUserId"
                          type="text"
                          value={`${
                            editing.fullName ||
                            editing.username ||
                            `User #${editing.userId}`
                          } (${
                            editing.roleName ||
                            "Staff"
                          })`}
                          disabled
                        />
                      ) : (
                        <select
                          id="humanProfileUserId"
                          value={
                            form.userId
                          }
                          onChange={(
                            event
                          ) =>
                            updateForm(
                              "userId",
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
                            -- Select Personnel --
                          </option>

                          {createUserOptions.length ===
                            0 && (
                            <option
                              value=""
                              disabled
                            >
                              No eligible personnel user is available
                            </option>
                          )}

                          {createUserOptions.map(
                            (user) => {
                              const userId =
                                getUserId(
                                  user
                                );

                              const normalizedRole =
                                getNormalizedHrRoleName(
                                  getUserRoleName(
                                    user
                                  ),
                                  getUserRoleId(
                                    user
                                  )
                                );

                              return (
                                <option
                                  key={
                                    userId
                                  }
                                  value={
                                    userId
                                  }
                                >
                                  {user.fullName ||
                                    user.username}{" "}
                                  ({normalizedRole}) -{" "}
                                  {user.email ||
                                    user.username ||
                                    `ID: ${userId}`}
                                </option>
                              );
                            }
                          )}
                        </select>
                      )}
                    </div>

                    <div className="human-profile-user-preview">
                      <div>
                        <UserRound
                          size={16}
                        />
                        <span>
                          Full Name
                        </span>
                        <strong>
                          {selectedUser?.fullName ||
                            editing?.fullName ||
                            "-"}
                        </strong>
                      </div>

                      <div>
                        <Mail
                          size={16}
                        />
                        <span>
                          Email
                        </span>
                        <strong>
                          {selectedUser?.email ||
                            editing?.email ||
                            "-"}
                        </strong>
                      </div>

                      <div>
                        <BriefcaseBusiness
                          size={16}
                        />
                        <span>
                          Role
                        </span>
                        <strong>
                          {getNormalizedHrRoleName(
                            getUserRoleName(
                              selectedUser ||
                                undefined
                            ) ||
                              editing?.roleName,
                            getUserRoleId(
                              selectedUser ||
                                undefined
                            ) ||
                              editing?.roleId
                          )}
                        </strong>
                      </div>
                    </div>
                  </div>
                </section>

                <section className="human-profile-form-section">
                  <div className="human-profile-section-title">
                    <BriefcaseBusiness
                      size={17}
                    />

                    <div>
                      <h3>
                        Work Information
                      </h3>

                      <p>
                        Configure daily capacity, current workload and resource availability.
                      </p>
                    </div>
                  </div>

                  <div className="human-profile-form-grid">
                    <div className="profile-form-group">
                      <label htmlFor="humanProfileStatus">
                        Status
                      </label>

                      <select
                        id="humanProfileStatus"
                        value={
                          form.status
                        }
                        onChange={(
                          event
                        ) =>
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
                          (
                            status
                          ) => (
                            <option
                              key={
                                status
                              }
                              value={
                                status
                              }
                            >
                              {
                                status
                              }
                            </option>
                          )
                        )}
                      </select>
                    </div>

                    <div className="profile-form-group">
                      <label htmlFor="humanProfileMaxHours">
                        Maximum Working Hours/Day{" "}
                        <span className="required">
                          *
                        </span>
                      </label>

                      <input
                        id="humanProfileMaxHours"
                        type="number"
                        min="0.5"
                        max="24"
                        step="0.5"
                        placeholder="e.g. 8"
                        value={
                          form.maxWorkingHoursPerDay
                        }
                        onChange={(
                          event
                        ) =>
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
                    </div>

                  </div>
                </section>

                <section className="human-profile-form-section">
                  <div className="human-profile-section-title">
                    <BadgeCheck
                      size={17}
                    />

                    <div>
                      <h3>
                        Skills & Expertise
                      </h3>

                      <p>
                        Assign one or more skills so allocation can match personnel by role and required skill.
                      </p>
                    </div>
                  </div>

                  <div className="human-profile-skill-picker">
                    <div className="profile-form-group">
                      <label htmlFor="humanProfileSkill">
                        Skill
                      </label>

                      <select
                        id="humanProfileSkill"
                        value={
                          selectedSkillId
                        }
                        onChange={(
                          event
                        ) =>
                          setSelectedSkillId(
                            event.target
                              .value
                          )
                        }
                        disabled={
                          saving
                        }
                      >
                        <option value="">
                          -- Select Skill --
                        </option>

                        {availableSkillsToAdd.map(
                          (skill) => (
                            <option
                              key={
                                skill.skillId
                              }
                              value={
                                skill.skillId
                              }
                            >
                              {
                                skill.skillName
                              }
                            </option>
                          )
                        )}
                      </select>
                    </div>

                    <div className="profile-form-group">
                      <label htmlFor="humanProfileSkillLevel">
                        Skill Level
                      </label>

                      <select
                        id="humanProfileSkillLevel"
                        value={
                          selectedSkillLevel
                        }
                        onChange={(
                          event
                        ) =>
                          setSelectedSkillLevel(
                            event.target
                              .value as SkillLevel
                          )
                        }
                        disabled={
                          saving
                        }
                      >
                        {skillLevels.map(
                          (level) => (
                            <option
                              key={
                                level
                              }
                              value={
                                level
                              }
                            >
                              {
                                level
                              }
                            </option>
                          )
                        )}
                      </select>
                    </div>

                    <button
                      type="button"
                      className="human-profile-add-skill"
                      onClick={
                        handleAddSkill
                      }
                      disabled={
                        saving ||
                        !selectedSkillId
                      }
                    >
                      <Plus size={15} />
                      Add Skill
                    </button>
                  </div>

                  <div className="human-profile-selected-skills">
                    {selectedSkills.length ===
                    0 ? (
                      <div className="human-profile-empty-skills">
                        No skill selected yet. At least one skill is required.
                      </div>
                    ) : (
                      selectedSkills.map(
                        (skill) => (
                          <div
                            key={
                              skill.skillId
                            }
                            className="human-profile-selected-skill"
                          >
                            <div>
                              <strong>
                                {
                                  skill.skillName
                                }
                              </strong>

                              <span>
                                {
                                  skill.skillLevel
                                }
                              </span>
                            </div>

                            <button
                              type="button"
                              onClick={() =>
                                handleRemoveSkill(
                                  skill.skillId
                                )
                              }
                              disabled={
                                saving
                              }
                              aria-label={`Remove ${skill.skillName}`}
                            >
                              <X size={14} />
                            </button>
                          </div>
                        )
                      )
                    )}
                  </div>
                </section>
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
                  className="primary"
                  disabled={
                    saving ||
                    !form.userId ||
                    selectedSkills.length ===
                      0
                  }
                >
                  {saving ? (
                    <>
                      <RotateCw
                        size={14}
                        className="spin-icon"
                      />

                      <span>
                        Saving...
                      </span>
                    </>
                  ) : editing &&
                    editing.humanResourceId >
                      0 ? (
                    "Save Changes"
                  ) : (
                    "Create Resource Profile"
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
