import { Bell, Search, HelpCircle } from "lucide-react";
import "./Topbar.css";

export default function Topbar() {
  return (
    <header className="topbar">
      <div className="topbar-left">
        <h1 className="topbar-header-title">Forestry Resource Planning</h1>
      </div>

      <div className="topbar-right">
        <div className="topbar-search">
          <Search className="topbar-search-icon" />
          <input
            type="text"
            placeholder="Search resources..."
            className="topbar-search-input"
          />
        </div>

        {/* TODO: Connect active notifications alerts count to database */}
        <button className="topbar-action-btn" title="Notifications">
          <Bell className="topbar-action-btn-icon" />
        </button>

        <button className="topbar-action-btn" title="Help / Documentation">
          <HelpCircle className="topbar-action-btn-icon" />
        </button>
      </div>
    </header>
  );
}