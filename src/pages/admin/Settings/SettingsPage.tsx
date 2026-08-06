import { useState, useEffect } from "react";
import DashboardLayout from "../../../layouts/DashboardLayout";
import {
  Settings,
  Activity,
  Bell,
  Shield,
  RotateCw,
  Save,
  CheckCircle2,
  AlertCircle
} from "lucide-react";
import {
  getSystemHealth,
  getDatabaseHealth,
  logSystemActivity,
  type HealthCheckResponse
} from "../../../services/systemService";
import "./SettingsPage.css";

export default function SettingsPage() {
  const [isHealthLoading, setIsHealthLoading] = useState(false);
  const [webHealth, setWebHealth] = useState<HealthCheckResponse>({ status: "Checking..." });
  const [dbHealth, setDbHealth] = useState<HealthCheckResponse>({ status: "Checking..." });

  // System operational configurations state
  const [maxWorkHours, setMaxWorkHours] = useState(8);
  const [sessionTimeout, setSessionTimeout] = useState(60);
  const [enableEmailAlerts, setEnableEmailAlerts] = useState(true);
  const [enablePushNotifs, setEnablePushNotifs] = useState(true);
  const [enableAutoBackup, setEnableAutoBackup] = useState(true);
  const [enableInventoryWarning, setEnableInventoryWarning] = useState(true);

  const [toast, setToast] = useState<{ visible: boolean; message: string; type: "success" | "error" }>({
    visible: false,
    message: "",
    type: "success",
  });

  const showToast = (message: string, type: "success" | "error" = "success") => {
    setToast({ visible: true, message, type });
    setTimeout(() => {
      setToast({ visible: false, message: "", type: "success" });
    }, 3500);
  };

  const fetchHealthData = async () => {
    setIsHealthLoading(true);
    try {
      const [webRes, dbRes] = await Promise.all([getSystemHealth(), getDatabaseHealth()]);
      setWebHealth(webRes);
      setDbHealth(dbRes);
    } catch (err) {
      console.warn("Could not retrieve live health status", err);
    } finally {
      setIsHealthLoading(false);
    }
  };

  useEffect(() => {
    fetchHealthData();
    const saved = localStorage.getItem("app_system_settings");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.maxWorkHours) setMaxWorkHours(parsed.maxWorkHours);
        if (parsed.sessionTimeout) setSessionTimeout(parsed.sessionTimeout);
        if (typeof parsed.enableEmailAlerts === "boolean") setEnableEmailAlerts(parsed.enableEmailAlerts);
        if (typeof parsed.enablePushNotifs === "boolean") setEnablePushNotifs(parsed.enablePushNotifs);
        if (typeof parsed.enableAutoBackup === "boolean") setEnableAutoBackup(parsed.enableAutoBackup);
        if (typeof parsed.enableInventoryWarning === "boolean") setEnableInventoryWarning(parsed.enableInventoryWarning);
      } catch (e) {
        console.warn("Could not parse saved system settings", e);
      }
    }
  }, []);

  const handleSaveSettings = () => {
    const settings = {
      maxWorkHours,
      sessionTimeout,
      enableEmailAlerts,
      enablePushNotifs,
      enableAutoBackup,
      enableInventoryWarning,
      savedAt: new Date().toISOString(),
    };
    localStorage.setItem("app_system_settings", JSON.stringify(settings));
    logSystemActivity(
      "System Configurations Updated",
      `Administrator updated daily max work hours to ${maxWorkHours}h and session timeout to ${sessionTimeout}m.`,
      "System"
    );
    showToast("System configurations saved successfully!");
  };

  return (
    <DashboardLayout>
      <div className="settings-page-container">
        {/* Header section */}
        <div className="settings-header-panel">
          <div>
            <h2>System Settings & Health Status</h2>
            <p>Configure operational parameters, security limits, and inspect live server health.</p>
          </div>
          <div style={{ display: "flex", gap: "10px" }}>
            <button
              type="button"
              className="resource-action-btn secondary"
              onClick={fetchHealthData}
              disabled={isHealthLoading}
            >
              <RotateCw size={14} className={isHealthLoading ? "spin-icon" : ""} />
              <span>Refresh Health</span>
            </button>
            <button
              type="button"
              className="resource-action-btn primary"
              onClick={handleSaveSettings}
            >
              <Save size={14} />
              <span>Save Configurations</span>
            </button>
          </div>
        </div>

        {/* Settings Grid Panel */}
        <div className="settings-grid">
          {/* Card 1: Live System Status & Health Check */}
          <div className="settings-card">
            <div className="settings-card-header">
              <div className="settings-card-icon-badge">
                <Activity size={20} />
              </div>
              <div>
                <h3>System Status & Health</h3>
                <p>Real-time backend API, database, and infrastructure status.</p>
              </div>
            </div>

            <div className="health-status-grid">
              <div className="health-status-item">
                <span className="health-status-label">Web API Server</span>
                <div className="health-status-value" style={{ color: "#16A34A" }}>
                  <span className="health-dot healthy" />
                  <span>{webHealth.status}</span>
                </div>
              </div>

              <div className="health-status-item">
                <span className="health-status-label">Database Connection</span>
                <div className="health-status-value" style={{ color: "#16A34A" }}>
                  <span className="health-dot healthy" />
                  <span>{dbHealth.status}</span>
                </div>
              </div>

              <div className="health-status-item">
                <span className="health-status-label">API Service Target</span>
                <div className="health-status-value">runasp.net Cloud</div>
              </div>

              <div className="health-status-item">
                <span className="health-status-label">Framework Engine</span>
                <div className="health-status-value">.NET 8.0 Web API</div>
              </div>
            </div>

            <div className="setting-row" style={{ marginTop: "8px" }}>
              <div className="setting-row-info">
                <span className="setting-row-title">Automatic Database Backup</span>
                <span className="setting-row-desc">Enable daily automated snapshots of forestry resource data.</span>
              </div>
              <label className="switch-toggle">
                <input
                  type="checkbox"
                  checked={enableAutoBackup}
                  onChange={(e) => setEnableAutoBackup(e.target.checked)}
                />
                <span className="switch-slider" />
              </label>
            </div>
          </div>

          {/* Card 2: Forestry Operational Limits */}
          <div className="settings-card">
            <div className="settings-card-header">
              <div className="settings-card-icon-badge">
                <Settings size={20} />
              </div>
              <div>
                <h3>Forestry Operational Limits</h3>
                <p>Default workload rules and inventory threshold alerts.</p>
              </div>
            </div>

            <div className="setting-row">
              <div className="setting-row-info">
                <span className="setting-row-title">Default Daily Working Limit (Hours)</span>
                <span className="setting-row-desc">Maximum daily work allocation limit per personnel member.</span>
              </div>
              <input
                type="number"
                min={4}
                max={16}
                className="setting-number-input"
                value={maxWorkHours}
                onChange={(e) => setMaxWorkHours(Number(e.target.value))}
              />
            </div>

            <div className="setting-row">
              <div className="setting-row-info">
                <span className="setting-row-title">Tool Shortage Alert Trigger</span>
                <span className="setting-row-desc">Automatically log warning when tool stock drops below critical level.</span>
              </div>
              <label className="switch-toggle">
                <input
                  type="checkbox"
                  checked={enableInventoryWarning}
                  onChange={(e) => setEnableInventoryWarning(e.target.checked)}
                />
                <span className="switch-slider" />
              </label>
            </div>

            <div className="setting-row">
              <div className="setting-row-info">
                <span className="setting-row-title">Session Inactivity Timeout (Minutes)</span>
                <span className="setting-row-desc">Automatically sign out idle administrative sessions.</span>
              </div>
              <input
                type="number"
                min={15}
                max={240}
                step={15}
                className="setting-number-input"
                value={sessionTimeout}
                onChange={(e) => setSessionTimeout(Number(e.target.value))}
              />
            </div>
          </div>

          {/* Card 3: Notification & Communication Channels */}
          <div className="settings-card">
            <div className="settings-card-header">
              <div className="settings-card-icon-badge">
                <Bell size={20} />
              </div>
              <div>
                <h3>Notification Settings</h3>
                <p>Configure automated system alert dispatch channels.</p>
              </div>
            </div>

            <div className="setting-row">
              <div className="setting-row-info">
                <span className="setting-row-title">Email Notifications</span>
                <span className="setting-row-desc">Send email digest for experiment approvals and allocation conflicts.</span>
              </div>
              <label className="switch-toggle">
                <input
                  type="checkbox"
                  checked={enableEmailAlerts}
                  onChange={(e) => setEnableEmailAlerts(e.target.checked)}
                />
                <span className="switch-slider" />
              </label>
            </div>

            <div className="setting-row">
              <div className="setting-row-info">
                <span className="setting-row-title">In-App Push Alerts</span>
                <span className="setting-row-desc">Display real-time popup toasts for system status updates.</span>
              </div>
              <label className="switch-toggle">
                <input
                  type="checkbox"
                  checked={enablePushNotifs}
                  onChange={(e) => setEnablePushNotifs(e.target.checked)}
                />
                <span className="switch-slider" />
              </label>
            </div>
          </div>

          {/* Card 4: Security & Access Policy */}
          <div className="settings-card">
            <div className="settings-card-header">
              <div className="settings-card-icon-badge">
                <Shield size={20} />
              </div>
              <div>
                <h3>Security & Access Control</h3>
                <p>System access policy and token authentication configuration.</p>
              </div>
            </div>

            <div className="setting-row">
              <div className="setting-row-info">
                <span className="setting-row-title">JWT Token Expiry</span>
                <span className="setting-row-desc">Active token session duration configured on backend server.</span>
              </div>
              <span style={{ fontSize: "13.5px", fontWeight: 700, color: "var(--accent)" }}>24 Hours</span>
            </div>

            <div className="setting-row">
              <div className="setting-row-info">
                <span className="setting-row-title">Role Based Access Control (RBAC)</span>
                <span className="setting-row-desc">Enforce strict Admin edit privileges for user profiles and roles.</span>
              </div>
              <span style={{ fontSize: "13.5px", fontWeight: 700, color: "#16A34A" }}>Active</span>
            </div>
          </div>
        </div>

        {/* Floating Toast Notification */}
        {toast.visible && (
          <div className={`floating-toast ${toast.type}`}>
            {toast.type === "success" ? (
              <CheckCircle2 size={18} className="toast-icon" />
            ) : (
              <AlertCircle size={18} className="toast-icon" />
            )}
            <span className="toast-message">{toast.message}</span>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
