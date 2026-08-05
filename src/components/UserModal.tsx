import { useState, useEffect } from "react";
import type { Role } from "../types/role";
import type { User } from "../types/user";
import { createUser, updateUser } from "../services/userService";
import { logSystemActivity } from "../services/systemService";

interface UserModalProps {
  isOpen: boolean;
  roles: Role[];
  editUser: User | null;
  onClose: () => void;
  onSuccess: (message: string) => void;
  onError: (message: string) => void;
}

export default function UserModal({
  isOpen,
  roles,
  editUser,
  onClose,
  onSuccess,
  onError,
}: UserModalProps) {
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("");
  const [status, setStatus] = useState("Active");

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);


  useEffect(() => {
    if (isOpen) {
      if (editUser) {
        setFullName(editUser.fullName);
        setUsername(editUser.username || "");
        setEmail(editUser.email);
        setPassword("");
        setStatus(editUser.status || "Active");


        const matchedRole = roles.find(
          (r) => r.name.toLowerCase() === editUser.role.toLowerCase()
        );
        setRole(matchedRole ? matchedRole.id : "");
      } else {
        setFullName("");
        setUsername("");
        setEmail("");
        setPassword("");
        setRole("");
        setStatus("Active");
      }
      setErrors({});
    }
  }, [isOpen, editUser, roles]);

  if (!isOpen) return null;

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!fullName.trim()) {
      newErrors.fullName = "Full Name is required.";
    }

    if (!editUser) {
      if (!username.trim()) {
        newErrors.username = "Username is required.";
      }

      if (!email.trim()) {
        newErrors.email = "Email is required.";
      } else if (!/\S+@\S+\.\S+/.test(email)) {
        newErrors.email = "Invalid email format.";
      }

      if (!password) {
        newErrors.password = "Password is required.";
      } else if (password.length < 6) {
        newErrors.password = "Password must be at least 6 characters.";
      }
    }

    if (!role) {
      newErrors.role = "Role is required.";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    try {
      setIsSubmitting(true);

      if (editUser) {

        await updateUser(editUser.id, {
          fullName,
          username: username || editUser.username || "",
          roleId: Number(role),
          email: editUser.email,
        });


        localStorage.setItem(`status_${editUser.email}`, status);

        logSystemActivity(
          "User Profile Updated",
          `Admin updated profile details for user: ${fullName} (${editUser.email}).`,
          "Info"
        );

        onSuccess("User updated successfully!");
      } else {

        await createUser({
          fullName,
          username,
          email,
          password,
          roleId: Number(role),
        });

        localStorage.setItem(`createdDate_${email.trim()}`, new Date().toISOString());

        const roleObj = roles.find((r) => String(r.id) === String(role));
        logSystemActivity(
          "New User Account Registered",
          `Admin registered new system user: ${fullName} (${email}) with role ${roleObj?.name || "User"}.`,
          "Info"
        );

        onSuccess("User created successfully!");
      }

      onClose();
    } catch (err: any) {
      console.error(err);
      const serverMsg = err.response?.data?.message || (editUser ? "Failed to update user." : "Failed to create user.");
      onError(serverMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-container" style={{ border: "1px solid var(--border)", background: "var(--card-bg)" }}>
        <div className="modal-header" style={{ borderBottom: "1px solid var(--border)" }}>
          <h3 style={{ color: "var(--text-h)" }}>{editUser ? "Edit User Profile" : "Add New User"}</h3>
          <button type="button" className="modal-close-btn" onClick={onClose}>
            &times;
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal-form">
          <div className="form-group">
            <label htmlFor="fullName" style={{ color: "var(--text)" }}>Full Name <span className="required">*</span></label>
            <input
              type="text"
              id="fullName"
              placeholder="E.g., Alexander Thorne"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className={errors.fullName ? "input-error" : ""}
            />
            {errors.fullName && <span className="error-text">{errors.fullName}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="username" style={{ color: "var(--text)" }}>Username {editUser && <span style={{ fontSize: "11px", fontWeight: "normal", opacity: 0.7 }}>(Read-only)</span>} <span className="required">*</span></label>
            <input
              type="text"
              id="username"
              placeholder="E.g., alexthorn"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={!!editUser}
              style={editUser ? { backgroundColor: "var(--border)", cursor: "not-allowed", opacity: 0.8 } : {}}
              className={errors.username ? "input-error" : ""}
            />
            {errors.username && <span className="error-text">{errors.username}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="email" style={{ color: "var(--text)" }}>Email Address {editUser && <span style={{ fontSize: "11px", fontWeight: "normal", opacity: 0.7 }}>(Read-only)</span>} <span className="required">*</span></label>
            <input
              type="email"
              id="email"
              placeholder="alexander@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={!!editUser}
              style={editUser ? { backgroundColor: "var(--border)", cursor: "not-allowed", opacity: 0.8 } : {}}
              className={errors.email ? "input-error" : ""}
            />
            {errors.email && <span className="error-text">{errors.email}</span>}
          </div>

          {!editUser && (
            <div className="form-group">
              <label htmlFor="password" style={{ color: "var(--text)" }}>Password <span className="required">*</span></label>
              <input
                type="password"
                id="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={errors.password ? "input-error" : ""}
              />
              {errors.password && <span className="error-text">{errors.password}</span>}
            </div>
          )}

          <div className="form-row">
            <div className="form-group flex-1">
              <label htmlFor="role" style={{ color: "var(--text)" }}>Role <span className="required">*</span></label>
              <select
                id="role"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className={errors.role ? "input-error" : ""}
              >
                <option value="">Select a role</option>
                {roles.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
              {errors.role && <span className="error-text">{errors.role}</span>}
            </div>

            <div className="form-group flex-1">
              <label htmlFor="status" style={{ color: "var(--text)" }}>Status <span className="required">*</span></label>
              <select
                id="status"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className={errors.status ? "input-error" : ""}
              >
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
              {errors.status && <span className="error-text">{errors.status}</span>}
            </div>
          </div>

          <div className="modal-footer" style={{ borderTop: "1px solid var(--border)", marginTop: "20px" }}>
            <button
              type="button"
              className="btn-secondary"
              onClick={onClose}
              disabled={isSubmitting}
              style={{ color: "var(--text-h)", border: "1px solid var(--border)", background: "transparent" }}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={isSubmitting}
            >
              {isSubmitting ? (editUser ? "Updating..." : "Creating...") : (editUser ? "Update User" : "Save User")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
