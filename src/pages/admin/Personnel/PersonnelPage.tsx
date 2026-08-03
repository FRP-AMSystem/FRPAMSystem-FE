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
  UserMinus
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
  SkillLevel,
} from "../../../types/personnel";
import "./PersonnelPage.css";

interface ToastState {
  message: string;
  type: "success" | "error";
  visible: boolean;
}

export default function PersonnelPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  // Data states
  const [profiles, setProfiles] = useState<HumanResourceProfile[]>([]);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [assignedSkills, setAssignedSkills] = useState<HumanResourceSkill[]>([]);
  const [users, setUsers] = useState<User[]>([]);

  // Search state
  const [searchQuery, setSearchQuery] = useState("");

  // Toast state
  const [toast, setToast] = useState<ToastState>({
    message: "",
    type: "success",
    visible: false,
  });

  // Modal active states
  const [modalType, setModalType] = useState<"add" | "edit" | "skills" | null>(null);
  const [selectedProfile, setSelectedProfile] = useState<HumanResourceProfile | null>(null);

  // Form states (Add/Edit Profile)
  const [formUserId, setFormUserId] = useState<number>(0);
  const [formMaxHours, setFormMaxHours] = useState<number>(8);
  const [formStatus, setFormStatus] = useState<string>("Available");

  // Form states (Assign Skill)
  const [formSkillId, setFormSkillId] = useState<number>(0);
  const [formSkillLevel, setFormSkillLevel] = useState<SkillLevel>("Intermediate");

  const showToast = useCallback((message: string, type: "success" | "error" = "success") => {
    setToast({ message, type, visible: true });
  }, []);

  // Dismiss toast auto
  useEffect(() => {
    if (toast.visible) {
      const timer = setTimeout(() => {
        setToast((prev) => ({ ...prev, visible: false }));
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [toast.visible]);

  // Load all data
  const loadData = useCallback(async (showSpinner = true) => {
    if (showSpinner) {
      setIsLoading(true);
    }
    setError("");
    try {
      const [profilesData, skillsData, assignedSkillsData, usersData] = await Promise.all([
        getHumanResourceProfiles(),
        getSkills(),
        getHumanResourceSkills(),
        getUsers(),
      ]);

      setProfiles(profilesData);
      setSkills(skillsData);
      setAssignedSkills(assignedSkillsData);
      setUsers(usersData);
    } catch (err: any) {
      console.error(err);
      setError("Failed to load personnel data from backend APIs.");
      showToast("Error retrieving data", "error");
    } finally {
      setIsLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadData();
  }, []);

  const closeModal = () => {
    setModalType(null);
    setSelectedProfile(null);
    setFormUserId(0);
    setFormMaxHours(8);
    setFormStatus("Available");
    setFormSkillId(0);
    setFormSkillLevel("Intermediate");
  };

  // Open Edit Profile Modal
  const openEditProfile = (profile: HumanResourceProfile) => {
    setSelectedProfile(profile);
    setFormUserId(profile.userId);
    setFormMaxHours(profile.maxWorkingHoursPerDay);
    setFormStatus(profile.status);
    setModalType("edit");
  };

  // Open Skills Manager Modal
  const openManageSkills = (profile: HumanResourceProfile) => {
    setSelectedProfile(profile);
    // Pre-select first skill
    if (skills.length > 0) {
      setFormSkillId(skills[0].skillId);
    }
    setModalType("skills");
  };

  // Handlers for Profile Submit
  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (modalType === "add") {
      if (!formUserId) return showToast("Please select a User.", "error");
      try {
        await createHumanResourceProfile({
          userId: formUserId,
          maxWorkingHoursPerDay: Number(formMaxHours),
          currentWorkload: 0,
          status: formStatus,
        });
        showToast("Human resource profile activated!");
        closeModal();
        loadData(false);
      } catch (err: any) {
        showToast(err.response?.data?.message || "Failed to activate profile.", "error");
      }
    } else if (modalType === "edit" && selectedProfile) {
      try {
        await updateHumanResourceProfile(selectedProfile.humanResourceId, {
          userId: selectedProfile.userId,
          maxWorkingHoursPerDay: Number(formMaxHours),
          currentWorkload: selectedProfile.currentWorkload,
          status: formStatus,
        });
        showToast("Human resource profile updated!");
        closeModal();
        loadData(false);
      } catch (err: any) {
        showToast(err.response?.data?.message || "Failed to update profile.", "error");
      }
    }
  };

  const handleDeleteProfile = async (id: number) => {
    if (!window.confirm("Are you sure you want to deactivate/delete this Human Resource profile?")) return;
    try {
      await deleteHumanResourceProfile(id);
      showToast("Profile deactivated successfully!");
      loadData(false);
    } catch (err: any) {
      showToast(err.response?.data?.message || "Failed to delete profile.", "error");
    }
  };

  // Handlers for Skill allocation
  const handleAssignSkillSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProfile) return;
    if (!formSkillId) return showToast("Please select a skill.", "error");

    // Check if skill already assigned
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
      // reload assigned skills list
      const updatedAssigned = await getHumanResourceSkills();
      setAssignedSkills(updatedAssigned);
    } catch (err: any) {
      showToast(err.response?.data?.message || "Failed to assign skill.", "error");
    }
  };

  const handleRemoveSkill = async (assignedSkillId: number) => {
    if (!window.confirm("Remove this skill from user?")) return;
    try {
      await removeHumanResourceSkill(assignedSkillId);
      showToast("Skill removed.");
      // reload assigned skills list
      const updatedAssigned = await getHumanResourceSkills();
      setAssignedSkills(updatedAssigned);
    } catch (err: any) {
      showToast("Failed to remove skill.", "error");
    }
  };

  // Filter profiles based on search query
  const filteredProfiles = profiles.filter(
    (p) =>
      p.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.roleName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Filter users that are NOT yet in HumanResourceProfiles
  const availableUsers = users.filter(
    (u) => {
      const uId = u.id; // Map key fallback
      return !profiles.some((p) => p.userId === Number(uId));
    }
  );

  return (
    <DashboardLayout>
      <div className="personnel-page-container">
        {/* Header Block */}
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
                  const firstUserId = Number(availableUsers[0].id);
                  setFormUserId(firstUserId);
                }
                setModalType("add");
              }}
            >
              <Plus size={16} />
              <span>Add Personnel</span>
            </button>
          </div>
        </div>

        {/* Content Block */}
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
                              <div style={{ fontWeight: 500, color: "var(--accent)" }}>
                                {profile.roleName}
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

        {/* ==========================================================
            MODAL DIALOGS
           ========================================================== */}

        {/* 1. Modal Add/Edit Profile */}
        {(modalType === "add" || modalType === "edit") && (
          <div className="modal-overlay">
            <div className="modal-container" style={{ border: "1px solid var(--border)", background: "var(--card-bg)" }}>
              <div className="modal-header" style={{ borderBottom: "1px solid var(--border)" }}>
                <h3 style={{ color: "var(--text-h)" }}>
                  {modalType === "add" ? "Activate Personnel Profile" : "Edit Profile configuration"}
                </h3>
                <button type="button" className="modal-close-btn" onClick={closeModal}>
                  &times;
                </button>
              </div>

              <form onSubmit={handleProfileSubmit} className="modal-form">
                {modalType === "add" ? (
                  <div className="form-group">
                    <label htmlFor="userId" style={{ color: "var(--text)" }}>Select Staff Member <span className="required">*</span></label>
                    <select
                      id="userId"
                      value={formUserId || ""}
                      onChange={(e) => setFormUserId(Number(e.target.value))}
                      required
                    >
                      <option value="">Choose User</option>
                      {availableUsers.map((u) => {
                        const uId = u.id;
                        const roleDisplay = u.role ?? (u as any).roleName ?? '';
                        return (
                          <option key={uId} value={uId}>
                            {u.fullName}{roleDisplay ? ` (${roleDisplay})` : ''}
                          </option>
                        );
                      })}
                    </select>
                    {availableUsers.length === 0 && (
                      <p style={{ fontSize: "12px", color: "#DC2626", marginTop: "4px" }}>
                        All existing system users already have personnel profiles active.
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="form-group">
                    <label style={{ color: "var(--text)", fontWeight: 600 }}>Staff Member</label>
                    <div style={{
                      padding: "10px",
                      borderRadius: "8px",
                      backgroundColor: "var(--bg)",
                      border: "1px solid var(--border)",
                      color: "var(--text-h)",
                      fontWeight: 500,
                    }}>
                      {selectedProfile?.fullName} ({selectedProfile?.roleName})
                    </div>
                  </div>
                )}

                <div className="form-group">
                  <label htmlFor="maxHours" style={{ color: "var(--text)" }}>Max Work Hours / Day <span className="required">*</span></label>
                  <input
                    type="number"
                    id="maxHours"
                    placeholder="E.g., 8"
                    min={1}
                    max={24}
                    value={formMaxHours}
                    onChange={(e) => setFormMaxHours(Number(e.target.value))}
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="hrStatus" style={{ color: "var(--text)" }}>HR Allocation Status</label>
                  <select
                    id="hrStatus"
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value)}
                  >
                    <option value="Available">Available</option>
                    <option value="Busy">Busy</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>

                <div className="modal-footer" style={{ borderTop: "1px solid var(--border)", marginTop: "20px" }}>
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={closeModal}
                    style={{ color: "var(--text-h)", border: "1px solid var(--border)", background: "transparent" }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn-primary"
                    disabled={modalType === "add" && availableUsers.length === 0}
                  >
                    {modalType === "add" ? "Activate Profile" : "Save Changes"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* 2. Modal Manage Skills */}
        {modalType === "skills" && selectedProfile && (
          <div className="modal-overlay">
            <div className="modal-container" style={{ border: "1px solid var(--border)", background: "var(--card-bg)" }}>
              <div className="modal-header" style={{ borderBottom: "1px solid var(--border)" }}>
                <h3 style={{ color: "var(--text-h)" }}>
                  Skills Manager: {selectedProfile.fullName}
                </h3>
                <button type="button" className="modal-close-btn" onClick={closeModal}>
                  &times;
                </button>
              </div>

              <div className="modal-form" style={{ paddingBottom: "10px" }}>
                <label style={{ color: "var(--text)", fontWeight: 600, display: "block", marginBottom: "8px" }}>
                  Assigned Skills ({assignedSkills.filter((as) => as.humanResourceId === selectedProfile.humanResourceId).length})
                </label>

                {/* List of currently assigned skills */}
                <div className="skills-manager-list">
                  {assignedSkills.filter((as) => as.humanResourceId === selectedProfile.humanResourceId).length === 0 ? (
                    <div style={{ textAlign: "center", padding: "20px", color: "var(--text)", opacity: 0.6, fontSize: "13px" }}>
                      No skills currently assigned to this personnel.
                    </div>
                  ) : (
                    assignedSkills
                      .filter((as) => as.humanResourceId === selectedProfile.humanResourceId)
                      .map((sk) => (
                        <div key={sk.humanResourceSkillId} className="skill-manager-row">
                          <div className="skill-info-block">
                            <div className="skill-name-label">
                              {sk.skillName}
                              <span className={`skill-level-badge ${sk.skillLevel.toLowerCase()}`}>
                                {sk.skillLevel}
                              </span>
                            </div>
                            <span className="skill-desc-label">
                              {sk.skillDescription || "No description"}
                            </span>
                          </div>
                          <button
                            type="button"
                            className="skill-delete-icon-btn"
                            onClick={() => handleRemoveSkill(sk.humanResourceSkillId)}
                            title="Remove Skill"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      ))
                  )}
                </div>

                {/* Assign New Skill Section */}
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

                  <div className="inline-form-group" style={{ maxWidth: "150px" }}>
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
                    <Plus size={14} />
                    <span>Assign</span>
                  </button>
                </form>

                <div className="modal-footer" style={{ borderTop: "1px solid var(--border)", marginTop: "24px", paddingBottom: 0 }}>
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={closeModal}
                    style={{ color: "var(--text-h)", border: "1px solid var(--border)", background: "transparent", marginInlineStart: "auto" }}
                  >
                    Done
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Floating Toast Notification */}
        {toast.visible && (
          <div className={`floating-toast ${toast.type}`}>
            <span className="toast-message">{toast.message}</span>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
