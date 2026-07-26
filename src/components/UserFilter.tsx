import type { Role } from "../types/role";

interface UserFilterProps {
  value: string;
  onChange: (value: string) => void;
  roles: Role[];
}

export default function UserFilter({
  value,
  onChange,
  roles,
}: UserFilterProps) {
  return (
    <div className="user-filter-wrapper">
      <select
        className="user-filter-select pill-dropdown-btn"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{ height: "38px", border: "1px solid #E5E7EB", borderRadius: "8px" }}
      >
        <option value="">All Roles</option>
        {roles.map((role) => (
          <option key={role.id} value={role.name}>
            {role.name}
          </option>
        ))}
      </select>
    </div>
  );
}
