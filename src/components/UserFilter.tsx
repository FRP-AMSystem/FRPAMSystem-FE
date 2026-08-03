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
        className="user-filter-select"
        value={value}
        onChange={(e) => onChange(e.target.value)}
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
