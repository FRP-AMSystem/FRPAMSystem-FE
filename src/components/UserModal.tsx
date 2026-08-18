import { useState, useEffect } from "react";
import { Eye, EyeOff } from "lucide-react";
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
  const [showPassword, setShowPassword] = useState(false);
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

        const userRoleName = (editUser.role || "").toLowerCase();
        const matchedRole = roles.find(
          (r) =>
            r.name.toLowerCase() === userRoleName ||
            ((userRoleName === "student" || userRoleName === "seasonal") &&
              (r.name.toLowerCase() === "seasonal" || r.name.toLowerCase() === "student" || r.id === "5"))
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

      if (email.trim() && !/\S+@\S+\.\S+/.test(email.trim())) {
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

      const effectiveEmail = email.trim() || `${username.trim()}@frpam.edu.vn`;

      if (editUser) {
        await updateUser(editUser.id, {
          fullName,
          username: username || editUser.username || "",
          roleId: Number(role),
          email: editUser.email || effectiveEmail,
        });

        localStorage.setItem(`status_${editUser.email || editUser.username}`, status);

        logSystemActivity(
          "User Profile Updated",
          `Admin updated profile details for user: ${fullName} (${username || editUser.username}).`,
          "Info"
        );

        onSuccess("User updated successfully!");
      } else {
        await createUser({
          fullName,
          username: username.trim(),
          email: effectiveEmail,
          password,
          roleId: Number(role),
        });

        localStorage.setItem(
          `createdDate_${effectiveEmail}`,
          new Date().toISOString()
        );

        const roleObj = roles.find((r) => String(r.id) === String(role));
        logSystemActivity(
          "New User Account Registered",
          `Admin registered new system user: ${fullName} (username: ${username.trim()}) with role ${roleObj?.name || "User"}.`,
          "Info"
        );

        onSuccess("User created successfully!");
      }

      onClose();
    } catch (err: any) {
      console.error(err);
      const serverMsg =
        err.response?.data?.message ||
        (editUser ? "Failed to update user." : "Failed to create user.");
      onError(serverMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-container">
        <div className="modal-header">
          <h3>{editUser ? "Edit User Profile" : "Add New User"}</h3>
          <button type="button" className="modal-close-btn" onClick={onClose}>
            &times;
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal-form">
          <div className="form-group">
            <label htmlFor="fullName">
              Full Name <span className="required">*</span>
            </label>
            <input
              type="text"
              id="fullName"
              placeholder="E.g., Alexander Thorn"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className={errors.fullName ? "input-error" : ""}
            />
            {errors.fullName && (
              <span className="error-text">{errors.fullName}</span>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="username">
              Username{" "}
              {editUser && (
                <span className="label-hint">(Read-only)</span>
              )}{" "}
              <span className="required">*</span>
            </label>
            <input
              type="text"
              id="username"
              placeholder="E.g., alexthorn"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={!!editUser}
              className={`${errors.username ? "input-error" : ""} ${editUser ? "input-readonly" : ""}`}
            />
            {errors.username && (
              <span className="error-text">{errors.username}</span>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="email">
              Email Address (Optional){" "}
              {editUser && (
                <span className="label-hint">(Read-only)</span>
              )}
            </label>
            <input
              type="email"
              id="email"
              placeholder="E.g., alexander@frpam.edu.vn (optional)"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={!!editUser}
              className={`${errors.email ? "input-error" : ""} ${editUser ? "input-readonly" : ""}`}
            />
            {errors.email && (
              <span className="error-text">{errors.email}</span>
            )}
          </div>

          {!editUser && (
            <div className="form-group">
              <label htmlFor="password">
                Password <span className="required">*</span>
              </label>
              <div style={{ position: "relative", display: "flex", alignItems: "center", width: "100%" }}>
                <input
                  type={showPassword ? "text" : "password"}
                  id="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={errors.password ? "input-error" : ""}
                  style={{ width: "100%", paddingRight: "42px", boxSizing: "border-box" }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: "absolute",
                    right: "12px",
                    top: "50%",
                    transform: "translateY(-50%)",
                    background: "none",
                    border: "none",
                    color: "#64748b",
                    cursor: "pointer",
                    padding: "4px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    borderRadius: "4px",
                    transition: "color 0.15s ease",
                  }}
                  title={showPassword ? "Hide password" : "Show password"}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>
              {errors.password && (
                <span className="error-text">{errors.password}</span>
              )}
            </div>
          )}

          <div className="form-row">
            <div className="form-group flex-1">
              <label htmlFor="role">
                Role <span className="required">*</span>
              </label>
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
              {errors.role && (
                <span className="error-text">{errors.role}</span>
              )}
            </div>

            <div className="form-group flex-1">
              <label htmlFor="status">
                Status <span className="required">*</span>
              </label>
              <select
                id="status"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className={errors.status ? "input-error" : ""}
              >
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
              {errors.status && (
                <span className="error-text">{errors.status}</span>
              )}
            </div>
          </div>

          <div className="modal-footer">
            <button
              type="button"
              className="btn-secondary"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={isSubmitting}
            >
              {isSubmitting
                ? editUser
                  ? "Updating..."
                  : "Creating..."
                : editUser
                  ? "Update User"
                  : "Save User"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
