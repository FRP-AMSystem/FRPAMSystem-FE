import { Search } from "lucide-react";

interface UserSearchProps {
  value: string;
  onChange: (value: string) => void;
}

export default function UserSearch({ value, onChange }: UserSearchProps) {
  return (
    <div className="user-search-wrapper">
      <Search className="user-search-icon" size={16} />
      <input
        type="text"
        className="user-search-input"
        placeholder="Search by full name or email..."
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}
