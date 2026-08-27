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
  const [formCurrentWorkload, setFormCurrentWorkload] = useState<number>(0);
  const [formStatus, setFormStatus] = useState<HumanResourceStatus>("Available");

  const [formSkillId, setFormSkillId] = useState<number>(0);
  const [formSkillLevel, setFormSkillLevel] = useState<SkillLevel>("Intermediate");

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
    setFormCurrentWorkload(0);
    setFormStatus("Available");
    setFormSkillId(0);
    setFormSkillLevel("Intermediate");
    setUserSearchQuery("");
    setIsUserDropdownOpen(false);
  };

  const openEditProfile = (profile: HumanResourceProfile) => {
    setSelectedProfile(profile);
    setFormUserId(profile.userId);
    setFormMaxHours(profile.maxWorkingHoursPerDay);
    setFormCurrentWorkload(profile.currentWorkload);
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

    if (!Number.isFinite(formCurrentWorkload) || formCurrentWorkload < 0) {
      showToast("Current Workload must be 0 or greater.", "error");
      return;
    }

    if (modalType === "add") {
      if (!formUserId) {
        showToast("Please select a staff member.", "error");
        return;
      }

      try {
        await createHumanResourceProfile({
          userId: formUserId,
          maxWorkingHoursPerDay: Number(formMaxHours),
          currentWorkload: Number(formCurrentWorkload),
          status: formStatus,
        });

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

  const handleDeleteProfile = async (id: number) => {
    if (!await showConfirm("Are you sure you want to deactivate/delete this Human Resource profile?")) return;
    try {
      if (id > 0) {
        await deleteHumanResourceProfile(id);
      }
      showToast("Profile deactivated successfully!");
      loadData(false);
    } catch (err: any) {
      showToast(err.response?.data?.message || "Failed to delete profile.", "error");
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
                if (availableUsers.length > 0) {
                  const firstUserId = Number((availableUsers[0] as any).userId ?? availableUsers[0].id);
                  setFormUserId(firstUserId);
                } else {
                  setFormUserId(0);
                }
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
                      {filteredProfiles.map((profile) => {
                        const staffSkills = assignedSkills.filter(
                          (as) => as.humanResourceId === profile.humanResourceId
                        );

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
                                className={`personnel-status-badge ${profile.status.toLowerCase()}`}
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
                                {profile.status}
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
                                  onClick={() => handleDeleteProfile(profile.humanResourceId)}
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
                </div>
              )}
            </>
          )}
        </div>

{modalType === "add" && (
          <div className="modal-overlay">
            <div className="modal-container">
              <div className="modal-header">
                <h3>Create Human Resource Profile</h3>
                <button type="button" className="modal-close-btn" onClick={closeModal}>
                  &times;
                </button>
              </div>

              <form onSubmit={handleProfileSubmit} className="modal-form">
                <div className="form-group">
                  <label>
                    Select Staff Member <span className="required">*</span>
                  </label>

                  <div className="searchable-select-container">
                    <div
                      className="searchable-select-input-wrapper"
                      onClick={() => setIsUserDropdownOpen(!isUserDropdownOpen)}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "10px",
                          flex: 1,
                          overflow: "hidden",
                        }}
                      >
                        {(() => {
                          const selectedUser = availableUsers.find(
                            (u) => Number((u as any).userId ?? u.id) === formUserId
                          );

                          if (selectedUser) {
                            const roleDisplay = getNormalizedHrRoleName(
                              getUserRoleName(selectedUser)
                            );

                            return (
                              <>
                                <div
                                  style={{
                                    width: "26px",
                                    height: "26px",
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
                                  {selectedUser.fullName.trim().charAt(0).toUpperCase()}
                                </div>

                                <span
                                  style={{
                                    fontSize: "13.5px",
                                    fontWeight: 600,
                                    color: "var(--text-h)",
                                  }}
                                >
                                  {selectedUser.fullName}
                                </span>

                                <span
                                  style={{
                                    fontSize: "11px",
                                    fontWeight: 700,
                                    padding: "2px 8px",
                                    borderRadius: "12px",
                                    textTransform: "uppercase",
                                    ...getRoleBadgeStyles(roleDisplay),
                                  }}
                                >
                                  {roleDisplay}
                                </span>
                              </>
                            );
                          }

                          return (
                            <span
                              style={{
                                fontSize: "13.5px",
                                color: "var(--text)",
                                opacity: 0.6,
                              }}
                            >
                              Choose staff member (Type to search)...
                            </span>
                          );
                        })()}
                      </div>

                      <ChevronDown
                        size={16}
                        style={{
                          color: "var(--text)",
                          opacity: 0.6,
                          flexShrink: 0,
                        }}
                      />
                    </div>

                    {isUserDropdownOpen && (
                      <div className="searchable-select-dropdown">
                        <div className="searchable-select-search">
                          <Search size={14} className="searchable-select-search-icon" />
                          <input
                            type="text"
                            placeholder="Search by name, email, or role..."
                            value={userSearchQuery}
                            onChange={(e) => setUserSearchQuery(e.target.value)}
                            autoFocus
                            onClick={(e) => e.stopPropagation()}
                          />
                        </div>

                        {availableUsers
                          .filter((u) => {
                            const q = userSearchQuery.trim().toLowerCase();
                            if (!q) return true;
                            const roleName = getUserRoleName(u);
                            return (
                              u.fullName.toLowerCase().includes(q) ||
                              u.email.toLowerCase().includes(q) ||
                              roleName.toLowerCase().includes(q)
                            );
                          })
                          .map((u) => {
                            const uId = getUserId(u);
                            const isSelected = formUserId === uId;
                            const roleDisplay = getNormalizedHrRoleName(getUserRoleName(u));

                            return (
                              <div
                                key={uId}
                                onClick={() => {
                                  setFormUserId(uId);
                                  setIsUserDropdownOpen(false);
                                  setUserSearchQuery("");
                                }}
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "space-between",
                                  padding: "8px 10px",
                                  borderRadius: "6px",
                                  cursor: "pointer",
                                  backgroundColor: isSelected
                                    ? "var(--border)"
                                    : "transparent",
                                  transition: "background 0.15s ease",
                                }}
                                onMouseEnter={(e) => {
                                  if (!isSelected) {
                                    e.currentTarget.style.backgroundColor = "var(--bg)";
                                  }
                                }}
                                onMouseLeave={(e) => {
                                  if (!isSelected) {
                                    e.currentTarget.style.backgroundColor = "transparent";
                                  }
                                }}
                              >
                                <div
                                  style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "10px",
                                  }}
                                >
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
                                    {u.fullName.trim().charAt(0).toUpperCase()}
                                  </div>

                                  <div>
                                    <div
                                      style={{
                                        fontSize: "13px",
                                        fontWeight: 600,
                                        color: "var(--text-h)",
                                      }}
                                    >
                                      {u.fullName}
                                    </div>

                                    <div
                                      style={{
                                        fontSize: "11px",
                                        color: "var(--text)",
                                        opacity: 0.7,
                                      }}
                                    >
                                      {u.email}
                                    </div>
                                  </div>
                                </div>

                                <span
                                  style={{
                                    fontSize: "10px",
                                    fontWeight: 700,
                                    padding: "2px 8px",
                                    borderRadius: "12px",
                                    textTransform: "uppercase",
                                    ...getRoleBadgeStyles(roleDisplay),
                                  }}
                                >
                                  {roleDisplay}
                                </span>
                              </div>
                            );
                          })}

                        {availableUsers.filter((u) => {
                          const q = userSearchQuery.trim().toLowerCase();
                          if (!q) return true;
                          const roleName = getUserRoleName(u);
                          return (
                            u.fullName.toLowerCase().includes(q) ||
                            u.email.toLowerCase().includes(q) ||
                            roleName.toLowerCase().includes(q)
                          );
                        }).length === 0 && (
                          <div
                            style={{
                              padding: "12px",
                              textAlign: "center",
                              fontSize: "12.5px",
                              color: "var(--text)",
                              opacity: 0.6,
                            }}
                          >
                            No matching staff members found
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {availableUsers.length === 0 && (
                    <p
                      style={{
                        fontSize: "12px",
                        color: "#DC2626",
                        marginTop: "6px",
                      }}
                    >
                      No eligible user without a Human Resource Profile is available.
                    </p>
                  )}
                </div>

                <div className="form-group">
                  <label htmlFor="maxHours">
                    Max Work Hours / Day <span className="required">*</span>
                  </label>
                  <input
                    type="number"
                    id="maxHours"
                    placeholder="E.g., 8"
                    min={1}
                    max={8}
                    value={formMaxHours}
                    onChange={(e) => setFormMaxHours(Number(e.target.value))}
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="currentWorkload">
                    Current Workload <span className="required">*</span>
                  </label>
                  <input
                    type="number"
                    id="currentWorkload"
                    placeholder="E.g., 0"
                    min={0}
                    step={0.5}
                    value={formCurrentWorkload}
                    onChange={(e) => setFormCurrentWorkload(Number(e.target.value))}
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="hrStatus">
                    HR Allocation Status <span className="required">*</span>
                  </label>
                  <select
                    id="hrStatus"
                    value={formStatus}
                    onChange={(e) =>
                      setFormStatus(e.target.value as HumanResourceStatus)
                    }
                  >
                    <option value="Available">Available</option>
                    <option value="Busy">Busy</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>

                <div className="modal-footer">
                  <button type="button" className="btn-secondary" onClick={closeModal}>
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn-primary"
                    disabled={availableUsers.length === 0 || formUserId <= 0}
                  >
                    Create Profile
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
