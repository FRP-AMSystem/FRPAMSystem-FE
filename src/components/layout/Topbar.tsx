import { Bell, Search, HelpCircle, Sun, Moon } from "lucide-react";
import { useTheme } from "../../context/ThemeContext";
import "./Topbar.css";

export default function Topbar() {
  const { theme, toggleTheme } = useTheme();

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

        <button 
          className="topbar-action-btn" 
          onClick={toggleTheme} 
          title={theme === "light" ? "Switch to Dark Mode" : "Switch to Light Mode"}
        >
          {theme === "light" ? (
            <Moon className="topbar-action-btn-icon" />
          ) : (
            <Sun className="topbar-action-btn-icon" />
          )}
        </button>
      </div>
    </header>
  );
}