import React, { useState, useEffect, useCallback } from "react";
import DashboardLayout from "../../../layouts/DashboardLayout";
import {
  Plus,
  Search,
  Clock,
  Trash2,
  AlertCircle,
  RotateCw,
  Edit2,
  Award,
  UserMinus,
  ChevronDown,
  X,
} from "lucide-react";
import {
  getHumanResourceProfiles,
  createHumanResourceProfile,
  updateHumanResourceProfile,
  deleteHumanResourceProfile,
  getSkills,
  getHumanResourceSkills,
  assignHumanResourceSkill,
  removeHumanResourceSkill,
} from "../../../services/personnelService";
import { getUsers } from "../../../services/userService";
import type { User } from "../../../types/user";
import type {
  HumanResourceProfile,
  Skill,
  HumanResourceSkill,
  HumanResourceStatus,
  SkillLevel,
} from "../../../types/personnel";
import "./PersonnelPage.css";

import { usePopup } from "../../../context/PopupContext";
import Pagination from "../../../components/Pagination";
import usePagination from "../../../hooks/usePagination";

interface ToastState {
  message: string;
  type: "success" | "error";
  visible: boolean;
}

const getRoleBadgeStyles = (role: string) => {
  const normalizedRole = (role || "").toLowerCase().trim();

  if (normalizedRole === "technician") {
    return {
      backgroundColor: "#FEF3C7",
      color: "#92400E",
    };
  }

  if (normalizedRole === "seasonal") {
    return {
      backgroundColor: "#CCFBF1",
      color: "#115E59",
    };
  }

  return {
    backgroundColor: "#F3F4F6",
    color: "#374151",
  };
};

const ALLOWED_HR_ROLES = new Set(["technician", "seasonal"]);

function isAllowedHrRole(roleName?: string | null): boolean {
  if (!roleName) return false;
  return ALLOWED_HR_ROLES.has(roleName.toLowerCase().trim());
}

function getNormalizedHrRoleName(roleName?: string | null): string {
  const normalizedRole = (roleName || "").toLowerCase().trim();

  if (normalizedRole === "technician") return "Technician";
  if (normalizedRole === "seasonal") return "Seasonal";

  return roleName || "Staff";
}

function getEffectiveHrStatus(profile: HumanResourceProfile): HumanResourceStatus {
  if (profile.status === "Inactive") {
    return "Inactive";
  }

  if (Number(profile.currentWorkload) > 0) {
    return "Busy";
  }

  return profile.status === "Busy" ? "Available" : profile.status;
}

function getUserId(user: User): number {
  const value = user.userId ?? Number(user.id);
  return Number.isInteger(value) && value > 0 ? value : 0;
}

function getUserRoleName(user?: User | null): string {
  if (!user) return "";

  if (typeof user.role === "string") {
    return user.role;
  }

  return user.role?.roleName || user.role?.name || user.roleName || "";
}

export default function PersonnelPage() {
  const { showConfirm } = usePopup();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const [profiles, setProfiles] = useState<HumanResourceProfile[]>([]);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [assignedSkills, setAssignedSkills] = useState<HumanResourceSkill[]>([]);
  const [users, setUsers] = useState<User[]>([]);

  const [searchQuery, setSearchQuery] = useState("");

  const [userSearchQuery, setUserSearchQuery] = useState("");
  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false);

  const [toast, setToast] = useState<ToastState>({
    message: "",
    type: "success",
    visible: false,
  });

  const [modalType, setModalType] = useState<"add" | "edit" | "skills" | null>(null);
  const [selectedProfile, setSelectedProfile] = useState<HumanResourceProfile | null>(null);

  const [formUserId, setFormUserId] = useState<number>(0);
  const [formMaxHours, setFormMaxHours] = useState<number>(8);
  const [formStatus, setFormStatus] = useState<HumanResourceStatus>("Available");

  const [formSkillId, setFormSkillId] = useState<number>(0);
  const [formSkillLevel, setFormSkillLevel] = useState<SkillLevel>("Intermediate");

  const [createSkillId, setCreateSkillId] = useState<number>(0);
  const [createSkillLevel, setCreateSkillLevel] = useState<SkillLevel>("Beginner");
  const [createSkills, setCreateSkills] = useState<
    Array<{
      skillId: number;
      skillName: string;
      skillLevel: SkillLevel;
    }>
  >([]);

  const showToast = useCallback((message: string, type: "success" | "error" = "success") => {
    setToast({ message, type, visible: true });
  }, []);

  useEffect(() => {
    if (toast.visible) {
      const timer = setTimeout(() => {
        setToast((prev) => ({ ...prev, visible: false }));
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [toast.visible]);

  const loadData = useCallback(async (showSpinner = true) => {
    if (showSpinner) {
      setIsLoading(true);
    }

    setError("");

    try {
      const [profilesData, skillsData, assignedSkillsData, usersData] = await Promise.all([
        getHumanResourceProfiles().catch(() => [] as HumanResourceProfile[]),
        getSkills().catch(() => [] as Skill[]),
        getHumanResourceSkills().catch(() => [] as HumanResourceSkill[]),
        getUsers().catch(() => [] as User[]),
      ]);

      const allowedUsers = (usersData || []).filter((user) =>
        isAllowedHrRole(getUserRoleName(user))
      );

      const normalizedProfiles: HumanResourceProfile[] = (profilesData || []).flatMap(
        (profile): HumanResourceProfile[] => {
          const matchedUser = allowedUsers.find(
            (user) => getUserId(user) === profile.userId
          );

          const effectiveRoleName = profile.roleName || getUserRoleName(matchedUser);
          if (!isAllowedHrRole(effectiveRoleName)) {
            return [];
          }

          const normalizedProfile: HumanResourceProfile = {
            ...profile,
            fullName: profile.fullName || matchedUser?.fullName || "",
            username: profile.username || matchedUser?.username || "",
            email: profile.email || matchedUser?.email || "",
            roleId: profile.roleId ?? null,
            roleName: getNormalizedHrRoleName(effectiveRoleName),
          };

          return [normalizedProfile];
        }
      );

      setProfiles(normalizedProfiles);
      setSkills(Array.isArray(skillsData) ? skillsData : []);
      setAssignedSkills(Array.isArray(assignedSkillsData) ? assignedSkillsData : []);
      setUsers(allowedUsers);
    } catch (err) {
      console.error("Failed to load Personnel & Skills data:", err);
      setError("Unable to load personnel data. Please try again.");
      setProfiles([]);
      setSkills([]);
      setAssignedSkills([]);
      setUsers([]);
    } finally {
      if (showSpinner) {
        setIsLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    void loadData(true);
  }, [loadData]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest(".searchable-select-container")) {
        setIsUserDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const closeModal = () => {
    setModalType(null);
    setSelectedProfile(null);
    setFormUserId(0);
    setFormMaxHours(8);
    setFormStatus("Available");
    setFormSkillId(0);
    setFormSkillLevel("Intermediate");
    setCreateSkillId(0);
    setCreateSkillLevel("Beginner");
    setCreateSkills([]);
    setUserSearchQuery("");
    setIsUserDropdownOpen(false);
  };

  const openEditProfile = (profile: HumanResourceProfile) => {
    setSelectedProfile(profile);
    setFormUserId(profile.userId);
    setFormMaxHours(profile.maxWorkingHoursPerDay);
    setFormStatus(profile.status);
    setModalType("edit");
  };

  const openManageSkills = (profile: HumanResourceProfile) => {
    setSelectedProfile(profile);
    if (skills.length > 0) {
      setFormSkillId(skills[0].skillId);
    }
    setModalType("skills");
  };

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!Number.isFinite(formMaxHours) || formMaxHours <= 0 || formMaxHours > 8) {
      showToast("Max Work Hours / Day must be greater than 0 and no more than 8.", "error");
      return;
    }

    if (modalType === "add") {
      if (!formUserId) {
        showToast("Please select a staff member.", "error");
        return;
      }

      if (createSkills.length === 0) {
        showToast("Please add at least one skill for this personnel resource.", "error");
        return;
      }

      try {
        const createdProfile = await createHumanResourceProfile({
          userId: formUserId,
          maxWorkingHoursPerDay: Number(formMaxHours),
          currentWorkload: 0,
          status: formStatus,
        });

        let profileId = Number(createdProfile?.humanResourceId || 0);

        if (profileId <= 0) {
          const refreshedProfiles = await getHumanResourceProfiles();
          const resolvedProfile = refreshedProfiles.find(
            (profile) => Number(profile.userId) === Number(formUserId)
          );

          profileId = Number(resolvedProfile?.humanResourceId || 0);
        }

        if (profileId <= 0) {
          throw new Error(
            "Human Resource Profile was created, but its ID could not be resolved for skill assignment."
          );
        }

        for (const selectedSkill of createSkills) {
          await assignHumanResourceSkill({
            humanResourceId: profileId,
            skillId: selectedSkill.skillId,
            skillLevel: selectedSkill.skillLevel,
          });
        }

        showToast("Human resource profile created!");
        closeModal();
        await loadData(false);
      } catch (err: any) {
        showToast(
          err.response?.data?.message ||
            err.response?.data?.error ||
            "Failed to create Human Resource Profile.",
          "error"
        );
      }

      return;
    }

    if (modalType === "edit" && selectedProfile) {
      try {
        await updateHumanResourceProfile(selectedProfile.humanResourceId, {
          userId: selectedProfile.userId,
          maxWorkingHoursPerDay: Number(formMaxHours),
          currentWorkload: selectedProfile.currentWorkload,
          status: formStatus,
        });

        showToast("Human resource profile updated!");
        closeModal();
        await loadData(false);
      } catch (err: any) {
        showToast(
          err.response?.data?.message ||
            err.response?.data?.error ||
            "Failed to update Human Resource Profile.",
          "error"
        );
      }
    }
  };

  const handleAddCreateSkill = () => {
    if (!createSkillId) {
      showToast("Please select a skill.", "error");
      return;
    }

    const selectedSkill = skills.find(
      (skill) => skill.skillId === createSkillId
    );

    if (!selectedSkill) {
      showToast("Selected skill was not found.", "error");
      return;
    }

    if (createSkills.some((skill) => skill.skillId === createSkillId)) {
      showToast("This skill has already been added.", "error");
      return;
    }

    setCreateSkills((current) => [
      ...current,
      {
        skillId: selectedSkill.skillId,
        skillName: selectedSkill.skillName,
        skillLevel: createSkillLevel,
      },
    ]);

    setCreateSkillId(0);
    setCreateSkillLevel("Beginner");
  };

  const handleRemoveCreateSkill = (skillId: number) => {
    setCreateSkills((current) =>
      current.filter((skill) => skill.skillId !== skillId)
    );
  };

  const handleRetireProfile = async (
    profile: HumanResourceProfile
  ) => {
    const humanResourceId = Number(
      profile.humanResourceId
    );

    if (
      !Number.isInteger(humanResourceId) ||
      humanResourceId <= 0
    ) {
      showToast(
        "Invalid Human Resource Profile ID.",
        "error"
      );
      return;
    }

    const confirmed = await showConfirm(
      `Retire ${profile.fullName || "this personnel"}? The Human Resource Profile will be deactivated from active personnel management.`
    );

    if (!confirmed) {
      return;
    }

    try {
      await deleteHumanResourceProfile(
        humanResourceId
      );

      showToast(
        `${
          profile.fullName || "Personnel"
        } retired successfully!`
      );

      await loadData(false);
    } catch (err: any) {
      const responseData =
        err?.response?.data;

      const message =
        responseData?.message ||
        responseData?.error ||
        responseData?.title ||
        (typeof responseData === "string"
          ? responseData
          : null) ||
        err?.message ||
        "Failed to retire Human Resource Profile.";

      showToast(message, "error");
    }
  };

  const handleAssignSkillSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProfile) return;
    if (!formSkillId) return showToast("Please select a skill.", "error");

    const exists = assignedSkills.some(
      (as) => as.humanResourceId === selectedProfile.humanResourceId && as.skillId === formSkillId
    );
    if (exists) return showToast("This skill is already assigned to the user.", "error");

    try {
      await assignHumanResourceSkill({
        humanResourceId: selectedProfile.humanResourceId,
        skillId: formSkillId,
        skillLevel: formSkillLevel,
      });
      showToast("Skill assigned successfully!");
      const updatedAssigned = await getHumanResourceSkills();
      setAssignedSkills(updatedAssigned);
    } catch (err: any) {
      showToast(err.response?.data?.message || "Failed to assign skill.", "error");
    }
  };

  const handleRemoveSkill = async (assignedSkillId: number) => {
    if (!await showConfirm("Remove this skill from user?")) return;
    try {
      await removeHumanResourceSkill(assignedSkillId);
      showToast("Skill removed.");
      const updatedAssigned = await getHumanResourceSkills();
      setAssignedSkills(updatedAssigned);
    } catch (err: any) {
      showToast("Failed to remove skill.", "error");
    }
  };

  const filteredProfiles = profiles.filter(
    (p) =>
      p.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.roleName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const existingProfileUserIds = new Set(profiles.map((profile) => profile.userId));

  const availableUsers = users.filter((user) => {
    const userId = getUserId(user);
    return userId > 0 && !existingProfileUserIds.has(userId);
  });


  const { currentPage: currentPageProfiles, pageSize: pageSizeProfiles, paginatedItems: paginatedItemsProfiles, setCurrentPage: setCurrentPageProfiles, setPageSize: setPageSizeProfiles } = usePagination(filteredProfiles, 10);

  return (
    <DashboardLayout>
      <div className="personnel-page-container">
<div className="personnel-header-panel">
          <div>
            <h2>Personnel & Skills</h2>
            <p>Configure workloads, daily working limits and expertise skills for forestry staff.</p>
          </div>
          <div style={{ display: "flex", gap: "10px" }}>
            <button
              type="button"
              className="resource-action-btn secondary"
              onClick={() => loadData(true)}
              disabled={isLoading}
            >
              <RotateCw size={14} className={isLoading ? "spin-icon" : ""} />
              <span>Refresh</span>
            </button>
            <button
              type="button"
              className="resource-action-btn primary"
              onClick={() => {
                setSelectedProfile(null);
                setFormUserId(0);
                setFormMaxHours(8);
                setFormStatus("Available");
                setCreateSkillId(0);
                setCreateSkillLevel("Beginner");
                setCreateSkills([]);
                setUserSearchQuery("");
                setIsUserDropdownOpen(false);
                setModalType("add");
              }}
            >
              <Plus size={16} />
              <span>Add Personnel</span>
            </button>
          </div>
        </div>
<div className="personnel-content-panel">
          {isLoading && (
            <div className="skeleton-loading-wrapper" style={{ padding: "40px 0" }}>
              <div className="skeleton-row header"></div>
              <div className="skeleton-row"></div>
              <div className="skeleton-row"></div>
              <div className="skeleton-row"></div>
            </div>
          )}

          {!isLoading && error && (
            <div className="error-state-box" style={{ padding: "40px" }}>
              <AlertCircle size={40} className="error-icon" />
              <h4>Error Loading Data</h4>
              <p>{error}</p>
              <button
                type="button"
                className="resource-action-btn primary"
                onClick={() => loadData(true)}
                style={{ marginTop: "16px", marginInline: "auto" }}
              >
                Try Again
              </button>
            </div>
          )}

          {!isLoading && !error && (
            <>
              <div className="personnel-control-bar">
                <div className="personnel-search-wrapper">
                  <Search className="personnel-search-icon" size={16} />
                  <input
                    type="text"
                    placeholder="Search personnel by name/role..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>

              {filteredProfiles.length === 0 ? (
                <div className="no-data-alert">No personnel profiles matching the search criteria.</div>
              ) : (
                <div className="table-responsive">
                  <table className="custom-table">
                    <thead>
                      <tr>
                        <th>STAFF MEMBER</th>
                        <th>ROLE & EMAIL</th>
                        <th>MAX HOURS / DAY</th>
                        <th>WORKLOAD STATUS</th>
                        <th>STATUS</th>
                        <th>ASSIGNED SKILLS</th>
                        <th style={{ textAlign: "right" }}>ACTIONS</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedItemsProfiles.map((profile) => {
                        const staffSkills = assignedSkills.filter(
                          (as) => as.humanResourceId === profile.humanResourceId
                        );
                        const effectiveStatus = getEffectiveHrStatus(profile);

                        return (
                          <tr key={profile.humanResourceId}>
                            <td style={{ fontWeight: 600, color: "var(--text-h)" }}>
                              {profile.fullName}
                            </td>
                            <td style={{ color: "var(--text)" }}>
                              <div style={{ marginBottom: "4px" }}>
                                <span
                                  style={{
                                    display: "inline-flex",
                                    padding: "2px 8px",
                                    borderRadius: "12px",
                                    fontSize: "11px",
                                    fontWeight: 700,
                                    textTransform: "uppercase",
                                    ...getRoleBadgeStyles(profile.roleName),
                                  }}
                                >
                                  {profile.roleName}
                                </span>
                              </div>
                              <div style={{ fontSize: "12px", opacity: 0.8 }}>{profile.email}</div>
                            </td>
                            <td style={{ color: "var(--text)", fontWeight: 500 }}>
                              <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                                <Clock size={13} />
                                <span>{profile.maxWorkingHoursPerDay} hrs</span>
                              </div>
                            </td>
                            <td>
                              <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                                <div style={{ fontSize: "11.5px", fontWeight: 600 }}>
                                  {profile.currentWorkload} / {profile.maxWorkingHoursPerDay} hrs allocated
                                </div>
                                <div
                                  style={{
                                    height: "6px",
                                    width: "120px",
                                    borderRadius: "3px",
                                    backgroundColor: "var(--border)",
                                    overflow: "hidden",
                                  }}
                                >
                                  <div
                                    style={{
                                      height: "100%",
                                      width: `${Math.min(
                                        100,
                                        (profile.currentWorkload / profile.maxWorkingHoursPerDay) * 100
                                      )}%`,
                                      backgroundColor:
                                        profile.currentWorkload > profile.maxWorkingHoursPerDay
                                          ? "#DC2626"
                                          : "var(--accent)",
                                    }}
                                  />
                                </div>
                              </div>
                            </td>
                            <td>
                              <span
                                className={`personnel-status-badge ${effectiveStatus.toLowerCase()}`}
                              >
                                <span
                                  style={{
                                    width: "6px",
                                    height: "6px",
                                    borderRadius: "50%",
                                    backgroundColor: "currentColor",
                                    display: "inline-block",
                                  }}
                                />
                                {effectiveStatus}
                              </span>
                            </td>
                            <td>
                              <div className="skills-cell-tags">
                                {staffSkills.length === 0 ? (
                                  <span style={{ fontSize: "12px", opacity: 0.6 }}>—</span>
                                ) : (
                                  staffSkills.map((sk) => (
                                    <span
                                      key={sk.humanResourceSkillId}
                                      className={`skill-tag-pill ${sk.skillLevel.toLowerCase()}`}
                                    >
                                      {sk.skillName} ({sk.skillLevel.charAt(0)})
                                    </span>
                                  ))
                                )}
                              </div>
                            </td>
                            <td style={{ textAlign: "right" }}>
                              <div className="table-actions-cell">
                                <button
                                  type="button"
                                  className="action-btn-pill edit"
                                  onClick={() => openEditProfile(profile)}
                                >
                                  <Edit2 size={12} />
                                  <span>Edit</span>
                                </button>
                                <button
                                  type="button"
                                  className="action-btn-pill skills"
                                  onClick={() => openManageSkills(profile)}
                                >
                                  <Award size={12} />
                                  <span>Skills</span>
                                </button>
                                <button
                                  type="button"
                                  className="action-btn-pill delete"
                                  onClick={() => handleRetireProfile(profile)}
                                >
                                  <UserMinus size={12} />
                                  <span>Retire</span>
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>

    <Pagination currentPage={currentPageProfiles} totalItems={filteredProfiles.length} pageSize={pageSizeProfiles} onPageChange={setCurrentPageProfiles} onPageSizeChange={setPageSizeProfiles} />
                </div>
              )}
            </>
          )}
        </div>

{modalType === "add" && (
          <div
            className="modal-overlay"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) {
                closeModal();
              }
            }}
          >
            <div
              className="modal-container"
              style={{
                width: "min(980px, calc(100vw - 48px))",
                maxHeight: "calc(100vh - 40px)",
                overflow: "hidden",
                display: "flex",
                flexDirection: "column",
                borderRadius: "14px",
                boxShadow: "0 24px 60px rgba(15, 23, 42, 0.20)",
              }}
            >
              <div
                className="modal-header"
                style={{
                  padding: "18px 22px",
                  alignItems: "flex-start",
                  borderBottom: "1px solid var(--border)",
                  background: "#ffffff",
                }}
              >
                <div style={{ minWidth: 0, paddingRight: "8px" }}>
                  <h3
                    style={{
                      margin: 0,
                      fontSize: "18px",
                      lineHeight: 1.3,
                      color: "var(--text-h)",
                    }}
                  >
                    Create Human Resource Profile
                  </h3>
                  <p
                    style={{
                      margin: "5px 0 0",
                      color: "var(--text)",
                      fontSize: "12px",
                      lineHeight: 1.5,
                      opacity: 0.72,
                    }}
                  >
                    Configure personnel identity, availability, working capacity
                    and professional skills.
                  </p>
                </div>

                <button
                  type="button"
                  className="modal-close-btn"
                  onClick={closeModal}
                  style={{
                    width: "32px",
                    height: "32px",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                    borderRadius: "50%",
                  }}
                  aria-label="Close"
                >
                  &times;
                </button>
              </div>

              <form
                onSubmit={handleProfileSubmit}
                style={{
                  minHeight: 0,
                  display: "flex",
                  flexDirection: "column",
                  background: "#ffffff",
                }}
              >
                <div
                  className="modal-form"
                  style={{
                    overflowY: "auto",
                    padding: "20px 22px 22px",
                  }}
                >
                  <section>
                    <div style={{ marginBottom: "12px" }}>
                      <h4
                        style={{
                          margin: 0,
                          color: "var(--text-h)",
                          fontSize: "13.5px",
                          fontWeight: 700,
                        }}
                      >
                        Personnel Information
                      </h4>
                      <p
                        style={{
                          margin: "4px 0 0",
                          color: "var(--text)",
                          fontSize: "11.5px",
                          lineHeight: 1.45,
                          opacity: 0.72,
                        }}
                      >
                        Select an existing Technician or Seasonal user. Profile
                        information is inherited from the account.
                      </p>
                    </div>

                    <div className="form-group" style={{ marginBottom: "12px" }}>
                      <label>
                        Personnel User <span className="required">*</span>
                      </label>

                      <div className="searchable-select-container">
                        <div
                          className="searchable-select-input-wrapper"
                          onClick={() =>
                            setIsUserDropdownOpen((current) => !current)
                          }
                          style={{
                            minHeight: "42px",
                            borderRadius: "8px",
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "10px",
                              flex: 1,
                              minWidth: 0,
                            }}
                          >
                            {(() => {
                              const selectedUser = availableUsers.find(
                                (user) => getUserId(user) === formUserId
                              );

                              if (!selectedUser) {
                                return (
                                  <span
                                    style={{
                                      fontSize: "13px",
                                      color: "var(--text)",
                                      opacity: 0.62,
                                    }}
                                  >
                                    Choose staff member (Type to search)...
                                  </span>
                                );
                              }

                              const roleDisplay = getNormalizedHrRoleName(
                                getUserRoleName(selectedUser)
                              );

                              return (
                                <>
                                  <div
                                    style={{
                                      width: "28px",
                                      height: "28px",
                                      borderRadius: "50%",
                                      backgroundColor: "#E8F5E9",
                                      color: "#1B5E20",
                                      display: "flex",
                                      alignItems: "center",
                                      justifyContent: "center",
                                      fontSize: "12px",
                                      fontWeight: 700,
                                      flexShrink: 0,
                                    }}
                                  >
                                    {(selectedUser.fullName || "P")
                                      .trim()
                                      .charAt(0)
                                      .toUpperCase()}
                                  </div>

                                  <span
                                    style={{
                                      fontSize: "13px",
                                      fontWeight: 600,
                                      color: "var(--text-h)",
                                      overflow: "hidden",
                                      textOverflow: "ellipsis",
                                      whiteSpace: "nowrap",
                                    }}
                                  >
                                    {selectedUser.fullName}
                                  </span>

                                  <span
                                    style={{
                                      fontSize: "10px",
                                      fontWeight: 700,
                                      padding: "2px 8px",
                                      borderRadius: "12px",
                                      textTransform: "uppercase",
                                      flexShrink: 0,
                                      ...getRoleBadgeStyles(roleDisplay),
                                    }}
                                  >
                                    {roleDisplay}
                                  </span>
                                </>
                              );
                            })()}
                          </div>

                          <ChevronDown size={16} />
                        </div>

                        {isUserDropdownOpen && (
                          <div className="searchable-select-dropdown">
                            <div className="searchable-select-search">
                              <Search
                                size={14}
                                className="searchable-select-search-icon"
                              />
                              <input
                                type="text"
                                placeholder="Search by name, email, or role..."
                                value={userSearchQuery}
                                onChange={(event) =>
                                  setUserSearchQuery(event.target.value)
                                }
                                autoFocus
                                onClick={(event) => event.stopPropagation()}
                              />
                            </div>

                            {availableUsers
                              .filter((user) => {
                                const query = userSearchQuery
                                  .trim()
                                  .toLowerCase();

                                if (!query) return true;

                                const roleName = getUserRoleName(user);

                                return (
                                  (user.fullName || "")
                                    .toLowerCase()
                                    .includes(query) ||
                                  (user.email || "")
                                    .toLowerCase()
                                    .includes(query) ||
                                  roleName.toLowerCase().includes(query)
                                );
                              })
                              .map((user) => {
                                const userId = getUserId(user);
                                const roleDisplay = getNormalizedHrRoleName(
                                  getUserRoleName(user)
                                );

                                return (
                                  <div
                                    key={userId}
                                    onClick={() => {
                                      setFormUserId(userId);
                                      setIsUserDropdownOpen(false);
                                      setUserSearchQuery("");
                                    }}
                                    style={{
                                      display: "flex",
                                      alignItems: "center",
                                      justifyContent: "space-between",
                                      gap: "12px",
                                      padding: "9px 10px",
                                      borderRadius: "7px",
                                      cursor: "pointer",
                                    }}
                                  >
                                    <div style={{ minWidth: 0 }}>
                                      <div
                                        style={{
                                          fontSize: "13px",
                                          fontWeight: 600,
                                          color: "var(--text-h)",
                                        }}
                                      >
                                        {user.fullName}
                                      </div>
                                      <div
                                        style={{
                                          marginTop: "2px",
                                          fontSize: "11px",
                                          color: "var(--text)",
                                          opacity: 0.72,
                                        }}
                                      >
                                        {user.email}
                                      </div>
                                    </div>

                                    <span
                                      style={{
                                        fontSize: "10px",
                                        fontWeight: 700,
                                        padding: "2px 8px",
                                        borderRadius: "12px",
                                        textTransform: "uppercase",
                                        flexShrink: 0,
                                        ...getRoleBadgeStyles(roleDisplay),
                                      }}
                                    >
                                      {roleDisplay}
                                    </span>
                                  </div>
                                );
                              })}
                          </div>
                        )}
                      </div>

                      {availableUsers.length === 0 && (
                        <p
                          style={{
                            margin: "7px 0 0",
                            color: "#DC2626",
                            fontSize: "12px",
                          }}
                        >
                          No eligible Technician or Seasonal user without a
                          Human Resource Profile is available.
                        </p>
                      )}
                    </div>

                    {(() => {
                      const selectedUser = availableUsers.find(
                        (user) => getUserId(user) === formUserId
                      );

                      return (
                        <div
                          style={{
                            display: "grid",
                            gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
                            gap: "14px",
                          }}
                        >
                          {[
                            ["FULL NAME", selectedUser?.fullName || "-"],
                            ["EMAIL", selectedUser?.email || "-"],
                            [
                              "ROLE",
                              selectedUser
                                ? getNormalizedHrRoleName(
                                    getUserRoleName(selectedUser)
                                  )
                                : "Staff",
                            ],
                          ].map(([label, value]) => (
                            <div
                              key={label}
                              style={{
                                minHeight: "62px",
                                padding: "11px 12px",
                                border: "1px solid var(--border)",
                                borderRadius: "9px",
                                background: "#F8FAFC",
                              }}
                            >
                              <div
                                style={{
                                  color: "var(--text)",
                                  fontSize: "9.5px",
                                  fontWeight: 700,
                                  letterSpacing: "0.02em",
                                  opacity: 0.68,
                                }}
                              >
                                {label}
                              </div>
                              <strong
                                style={{
                                  display: "block",
                                  marginTop: "7px",
                                  color: "var(--text-h)",
                                  fontSize: "12px",
                                  lineHeight: 1.35,
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                  whiteSpace: "nowrap",
                                }}
                              >
                                {value}
                              </strong>
                            </div>
                          ))}
                        </div>
                      );
                    })()}
                  </section>

                  <div
                    style={{
                      height: "1px",
                      margin: "18px 0",
                      background: "var(--border)",
                    }}
                  />

                  <section>
                    <div style={{ marginBottom: "12px" }}>
                      <h4
                        style={{
                          margin: 0,
                          color: "var(--text-h)",
                          fontSize: "13.5px",
                          fontWeight: 700,
                        }}
                      >
                        Work Information
                      </h4>
                      <p
                        style={{
                          margin: "4px 0 0",
                          color: "var(--text)",
                          fontSize: "11.5px",
                          lineHeight: 1.45,
                          opacity: 0.72,
                        }}
                      >
                        Configure daily capacity and resource availability.
                      </p>
                    </div>

                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                        gap: "16px",
                      }}
                    >
                      <div className="form-group" style={{ margin: 0 }}>
                        <label htmlFor="createHrStatus">Status</label>
                        <select
                          id="createHrStatus"
                          value={formStatus}
                          onChange={(event) =>
                            setFormStatus(
                              event.target.value as HumanResourceStatus
                            )
                          }
                          style={{ minHeight: "40px" }}
                        >
                          <option value="Available">Available</option>
                          <option value="Busy">Busy</option>
                          <option value="Inactive">Inactive</option>
                        </select>
                      </div>

                      <div className="form-group" style={{ margin: 0 }}>
                        <label htmlFor="createMaxHours">
                          Maximum Working Hours/Day{" "}
                          <span className="required">*</span>
                        </label>
                        <input
                          id="createMaxHours"
                          type="number"
                          min={0.5}
                          max={8}
                          step={0.5}
                          value={formMaxHours}
                          onChange={(event) =>
                            setFormMaxHours(Number(event.target.value))
                          }
                          required
                          style={{ minHeight: "40px" }}
                        />
                      </div>
                    </div>
                  </section>

                  <div
                    style={{
                      height: "1px",
                      margin: "18px 0",
                      background: "var(--border)",
                    }}
                  />

                  <section>
                    <div style={{ marginBottom: "12px" }}>
                      <h4
                        style={{
                          margin: 0,
                          color: "var(--text-h)",
                          fontSize: "13.5px",
                          fontWeight: 700,
                        }}
                      >
                        Skills & Expertise
                      </h4>
                      <p
                        style={{
                          margin: "4px 0 0",
                          color: "var(--text)",
                          fontSize: "11.5px",
                          lineHeight: 1.45,
                          opacity: 0.72,
                        }}
                      >
                        Assign one or more skills so allocation can match
                        personnel by role and required skill.
                      </p>
                    </div>

                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "minmax(0, 1.7fr) minmax(180px, 0.7fr) 120px",
                        gap: "12px",
                        alignItems: "end",
                      }}
                    >
                      <div className="form-group" style={{ margin: 0 }}>
                        <label htmlFor="createSkillId">Skill</label>
                        <select
                          id="createSkillId"
                          value={createSkillId || ""}
                          onChange={(event) =>
                            setCreateSkillId(Number(event.target.value))
                          }
                          style={{ minHeight: "40px" }}
                        >
                          <option value="">-- Select Skill --</option>
                          {skills
                            .filter(
                              (skill) =>
                                !createSkills.some(
                                  (selected) =>
                                    selected.skillId === skill.skillId
                                )
                            )
                            .map((skill) => (
                              <option key={skill.skillId} value={skill.skillId}>
                                {skill.skillName}
                              </option>
                            ))}
                        </select>
                      </div>

                      <div className="form-group" style={{ margin: 0 }}>
                        <label htmlFor="createSkillLevel">Skill Level</label>
                        <select
                          id="createSkillLevel"
                          value={createSkillLevel}
                          onChange={(event) =>
                            setCreateSkillLevel(
                              event.target.value as SkillLevel
                            )
                          }
                          style={{ minHeight: "40px" }}
                        >
                          <option value="Beginner">Beginner</option>
                          <option value="Intermediate">Intermediate</option>
                          <option value="Advanced">Advanced</option>
                          <option value="Expert">Expert</option>
                        </select>
                      </div>

                      <button
                        type="button"
                        className="resource-action-btn secondary"
                        onClick={handleAddCreateSkill}
                        disabled={!createSkillId}
                        style={{
                          minHeight: "40px",
                          justifyContent: "center",
                          whiteSpace: "nowrap",
                        }}
                      >
                        <Plus size={14} />
                        <span>Add Skill</span>
                      </button>
                    </div>

                    <div
                      style={{
                        marginTop: "10px",
                        minHeight: "48px",
                        padding: "9px 10px",
                        border: "1px dashed #CBD5E1",
                        borderRadius: "9px",
                        background: "#F8FAFC",
                      }}
                    >
                      {createSkills.length === 0 ? (
                        <div
                          style={{
                            padding: "6px",
                            textAlign: "center",
                            color: "var(--text)",
                            fontSize: "11.5px",
                            opacity: 0.68,
                          }}
                        >
                          No skill selected yet. At least one skill is required.
                        </div>
                      ) : (
                        <div
                          style={{
                            display: "flex",
                            flexWrap: "wrap",
                            gap: "7px",
                          }}
                        >
                          {createSkills.map((skill) => (
                            <span
                              key={skill.skillId}
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "7px",
                                padding: "6px 8px",
                                border: "1px solid #BBF7D0",
                                borderRadius: "8px",
                                background: "#F0FDF4",
                                color: "#166534",
                                fontSize: "11.5px",
                                fontWeight: 600,
                              }}
                            >
                              {skill.skillName} · {skill.skillLevel}
                              <button
                                type="button"
                                onClick={() =>
                                  handleRemoveCreateSkill(skill.skillId)
                                }
                                style={{
                                  padding: 0,
                                  border: 0,
                                  background: "transparent",
                                  color: "#166534",
                                  cursor: "pointer",
                                  lineHeight: 1,
                                  display: "inline-flex",
                                  alignItems: "center",
                                }}
                                aria-label={`Remove ${skill.skillName}`}
                              >
                                <X size={13} />
                              </button>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </section>
                </div>

                <div
                  className="modal-footer"
                  style={{
                    padding: "14px 22px",
                    borderTop: "1px solid var(--border)",
                    background: "#FAFBFC",
                  }}
                >
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={closeModal}
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    className="btn-primary"
                    disabled={
                      availableUsers.length === 0 ||
                      formUserId <= 0 ||
                      createSkills.length === 0
                    }
                  >
                    Create Resource Profile
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {modalType === "edit" && selectedProfile && (
          <div
            className="modal-overlay"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) {
                closeModal();
              }
            }}
          >
            <div
              className="modal-container"
              style={{ width: "min(520px, calc(100vw - 32px))" }}
            >
              <div className="modal-header">
                <div>
                  <h3 style={{ margin: 0 }}>Edit Personnel Profile</h3>
                  <p
                    style={{
                      margin: "4px 0 0",
                      color: "var(--text)",
                      fontSize: "12px",
                      opacity: 0.75,
                    }}
                  >
                    Update working capacity and allocation availability.
                  </p>
                </div>

                <button type="button" className="modal-close-btn" onClick={closeModal}>
                  &times;
                </button>
              </div>

              <form onSubmit={handleProfileSubmit}>
                <div className="modal-form">
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "12px",
                      padding: "14px",
                      border: "1px solid var(--border)",
                      borderRadius: "10px",
                      background: "var(--bg)",
                    }}
                  >
                    <div
                      style={{
                        width: "42px",
                        height: "42px",
                        flex: "0 0 42px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        borderRadius: "50%",
                        background: "#DCFCE7",
                        color: "#15803D",
                        fontSize: "14px",
                        fontWeight: 700,
                      }}
                    >
                      {selectedProfile.fullName.trim().charAt(0).toUpperCase() || "P"}
                    </div>

                    <div
                      style={{
                        minWidth: 0,
                        flex: 1,
                        display: "flex",
                        flexDirection: "column",
                        gap: "3px",
                      }}
                    >
                      <strong
                        style={{
                          overflow: "hidden",
                          color: "var(--text-h)",
                          fontSize: "13.5px",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {selectedProfile.fullName}
                      </strong>

                      <span
                        style={{
                          overflow: "hidden",
                          color: "var(--text)",
                          fontSize: "11.5px",
                          opacity: 0.75,
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {selectedProfile.email}
                      </span>
                    </div>

                    <span
                      style={{
                        flexShrink: 0,
                        padding: "3px 9px",
                        borderRadius: "999px",
                        fontSize: "10px",
                        fontWeight: 700,
                        textTransform: "uppercase",
                        ...getRoleBadgeStyles(selectedProfile.roleName),
                      }}
                    >
                      {selectedProfile.roleName}
                    </span>
                  </div>

                  <div
                    style={{
                      marginTop: "22px",
                      marginBottom: "14px",
                      color: "var(--text)",
                      fontSize: "11px",
                      fontWeight: 700,
                      letterSpacing: "0.05em",
                      textTransform: "uppercase",
                    }}
                  >
                    Work Configuration
                  </div>

                  <div className="form-group">
                    <label htmlFor="editMaxHours">
                      Max Work Hours / Day <span className="required">*</span>
                    </label>
                    <input
                      id="editMaxHours"
                      type="number"
                      min={0.5}
                      max={8}
                      step={0.5}
                      value={formMaxHours}
                      onChange={(event) =>
                        setFormMaxHours(Number(event.target.value))
                      }
                      required
                    />
                    <span
                      style={{
                        display: "block",
                        marginTop: "6px",
                        color: "var(--text)",
                        fontSize: "11px",
                        opacity: 0.7,
                      }}
                    >
                      Maximum working capacity is 8 hours per day.
                    </span>
                  </div>

                  <div className="form-group" style={{ marginTop: "18px" }}>
                    <label htmlFor="editStatus">
                      HR Allocation Status <span className="required">*</span>
                    </label>
                    <select
                      id="editStatus"
                      value={formStatus}
                      onChange={(event) =>
                        setFormStatus(event.target.value as HumanResourceStatus)
                      }
                      required
                    >
                      <option value="Available">Available</option>
                      <option value="Busy">Busy</option>
                      <option value="Inactive">Inactive</option>
                    </select>
                    <span
                      style={{
                        display: "block",
                        marginTop: "6px",
                        color: "var(--text)",
                        fontSize: "11px",
                        opacity: 0.7,
                      }}
                    >
                      Controls whether this personnel can be considered for allocation.
                    </span>
                  </div>

                  <div
                    style={{
                      marginTop: "20px",
                      padding: "14px",
                      border: "1px solid var(--border)",
                      borderRadius: "10px",
                      background: "var(--bg)",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: "12px",
                      }}
                    >
                      <span
                        style={{
                          color: "var(--text)",
                          fontSize: "12px",
                          fontWeight: 600,
                        }}
                      >
                        Current Workload
                      </span>

                      <strong
                        style={{
                          color: "var(--text-h)",
                          fontSize: "12px",
                        }}
                      >
                        {selectedProfile.currentWorkload} / {formMaxHours} hrs
                      </strong>
                    </div>

                    <div
                      style={{
                        height: "6px",
                        marginTop: "10px",
                        overflow: "hidden",
                        borderRadius: "999px",
                        background: "var(--border)",
                      }}
                    >
                      <div
                        style={{
                          width: `${Math.min(
                            100,
                            formMaxHours > 0
                              ? (selectedProfile.currentWorkload / formMaxHours) * 100
                              : 0
                          )}%`,
                          height: "100%",
                          borderRadius: "999px",
                          background:
                            selectedProfile.currentWorkload > formMaxHours
                              ? "#DC2626"
                              : "var(--accent)",
                          transition: "width 0.2s ease",
                        }}
                      />
                    </div>

                    <span
                      style={{
                        display: "block",
                        marginTop: "8px",
                        color: "var(--text)",
                        fontSize: "10.5px",
                        lineHeight: 1.45,
                        opacity: 0.7,
                      }}
                    >
                      Current workload is calculated from resource allocations and cannot be
                      edited manually.
                    </span>
                  </div>
                </div>

                <div className="modal-footer">
                  <button type="button" className="btn-secondary" onClick={closeModal}>
                    Cancel
                  </button>
                  <button type="submit" className="btn-primary">
                    Save Changes
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
{modalType === "skills" && selectedProfile && (
          <div className="modal-overlay">
            <div className="modal-container detail-modal" style={{ border: "1px solid var(--border)", background: "var(--card-bg)" }}>
              <div className="modal-header" style={{ borderBottom: "1px solid var(--border)" }}>
                <h3 style={{ color: "var(--text-h)" }}>
                  Skills Manager: {selectedProfile.fullName}
                </h3>
                <button type="button" className="modal-close-btn" onClick={closeModal}>
                  &times;
                </button>
              </div>

              <div className="modal-form" style={{ paddingBottom: "10px" }}>
                <label style={{ color: "var(--text-h)", fontWeight: 700, display: "block", marginBottom: "10px", fontSize: "14px" }}>
                  Assigned Skills ({assignedSkills.filter((as) => as.humanResourceId === selectedProfile.humanResourceId).length})
                </label>
<div className="skills-manager-list">
                  {assignedSkills.filter((as) => as.humanResourceId === selectedProfile.humanResourceId).length === 0 ? (
                    <div style={{ textAlign: "center", padding: "24px", color: "var(--text)", opacity: 0.6, fontSize: "13px" }}>
                      No skills currently assigned to this personnel.
                    </div>
                  ) : (
                    assignedSkills
                      .filter((as) => as.humanResourceId === selectedProfile.humanResourceId)
                      .map((sk) => (
                        <div key={sk.humanResourceSkillId} className="skill-manager-row">
                          <div className="skill-info-block">
                            <div className="skill-name-label">
                              <span>{sk.skillName}</span>
                              <span className={`skill-level-badge ${sk.skillLevel.toLowerCase()}`}>
                                {sk.skillLevel}
                              </span>
                            </div>
                            <span className="skill-desc-label">
                              {sk.skillDescription || "No description provided."}
                            </span>
                          </div>
                          <button
                            type="button"
                            className="skill-delete-icon-btn"
                            onClick={() => handleRemoveSkill(sk.humanResourceSkillId)}
                            title="Remove Skill"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      ))
                  )}
                </div>
<h4 className="add-skill-section-title">Assign New Specialty Skill</h4>
                <form onSubmit={handleAssignSkillSubmit} className="add-skill-inline-form">
                  <div className="inline-form-group">
                    <label htmlFor="skillSelect">Skill Type <span className="required">*</span></label>
                    <select
                      id="skillSelect"
                      value={formSkillId || ""}
                      onChange={(e) => setFormSkillId(Number(e.target.value))}
                      required
                    >
                      <option value="">Select a skill</option>
                      {skills.map((s) => (
                        <option key={s.skillId} value={s.skillId}>
                          {s.skillName}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="inline-form-group">
                    <label htmlFor="levelSelect">Skill Level <span className="required">*</span></label>
                    <select
                      id="levelSelect"
                      value={formSkillLevel}
                      onChange={(e) => setFormSkillLevel(e.target.value as SkillLevel)}
                      required
                    >
                      <option value="Beginner">Beginner</option>
                      <option value="Intermediate">Intermediate</option>
                      <option value="Advanced">Advanced</option>
                      <option value="Expert">Expert</option>
                    </select>
                  </div>

                  <button type="submit" className="add-skill-submit-btn">
                    <Plus size={16} />
                    <span>Assign</span>
                  </button>
                </form>

                <div className="modal-footer" style={{ borderTop: "1px solid var(--border)", marginTop: "24px", paddingBottom: 0 }}>
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={closeModal}
                    style={{ color: "var(--text-h)", border: "1px solid var(--border)", background: "transparent", marginInlineStart: "auto", padding: "8px 24px" }}
                  >
                    Done
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
{toast.visible && (
          <div className={`floating-toast ${toast.type}`}>
            <span className="toast-message">{toast.message}</span>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
