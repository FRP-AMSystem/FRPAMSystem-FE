import { useState, useEffect, useCallback } from "react";
import DashboardLayout from "../../layouts/DashboardLayout";
import {
  Plus,
  Search,
  Trees,
  Wrench,
  Hammer,
  AlertCircle,
  RotateCw,
  MapPin,
  Edit2,
  Trash2
} from "lucide-react";
import {
  getAreas,
  createArea,
  updateArea,
  deleteArea,
  getLandResources,
  createLandResource,
  updateLandResource,
  deleteLandResource,
  getEquipmentCategories,
  getEquipmentTypes,
  createEquipmentType,
  updateEquipmentType,
  deleteEquipmentType,
  getEquipmentInstances,
  createEquipmentInstance,
  updateEquipmentInstance,
  deleteEquipmentInstance,
} from "../../services/resourceService";
import type {
  Area,
  LandResource,
  EquipmentCategory,
  EquipmentType,
  EquipmentInstance,
} from "../../types/resource";
import "./ResourcesPage.css";

type TabType = "land" | "equipment" | "tools";

interface ToastState {
  message: string;
  type: "success" | "error";
  visible: boolean;
}

export default function ResourcesPage() {
  const [activeTab, setActiveTab] = useState<TabType>("land");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  // Data states
  const [areas, setAreas] = useState<Area[]>([]);
  const [selectedAreaId, setSelectedAreaId] = useState<number | null>(null);
  const [landResources, setLandResources] = useState<LandResource[]>([]);
  const [categories, setCategories] = useState<EquipmentCategory[]>([]);
  const [equipmentTypes, setEquipmentTypes] = useState<EquipmentType[]>([]);
  const [equipmentInstances, setEquipmentInstances] = useState<EquipmentInstance[]>([]);

  // Search/Filters states
  const [searchQuery, setSearchQuery] = useState("");

  // Toast state
  const [toast, setToast] = useState<ToastState>({
    message: "",
    type: "success",
    visible: false,
  });

  // Modal active states
  const [modalType, setModalType] = useState<
    "area" | "land" | "equipment" | "tool" | null
  >(null);
  const [isEditMode, setIsEditMode] = useState(false);

  // Edit target states
  const [targetArea, setTargetArea] = useState<Area | null>(null);
  const [targetLand, setTargetLand] = useState<LandResource | null>(null);
  const [targetEquipment, setTargetEquipment] = useState<EquipmentInstance | null>(null);
  const [targetTool, setTargetTool] = useState<EquipmentType | null>(null);

  // Form states (Area)
  const [areaName, setAreaName] = useState("");
  const [areaDesc, setAreaDesc] = useState("");

  // Form states (Land)
  const [landCode, setLandCode] = useState("");
  const [landSize, setLandSize] = useState<number>(0);
  const [landLocation, setLandLocation] = useState("");
  const [landSoilType, setLandSoilType] = useState("");
  const [landStatus, setLandStatus] = useState<string>("Available");

  // Form states (EquipmentInstance)
  const [eqTypeId, setEqTypeId] = useState<number>(0);
  const [eqAssetCode, setEqAssetCode] = useState("");
  const [eqSerialNumber, setEqSerialNumber] = useState("");
  const [eqUsageHours, setEqUsageHours] = useState<number>(0);
  const [eqCondition, setEqCondition] = useState<string>("Excellent");
  const [eqStatus, setEqStatus] = useState<string>("Available");
  const [eqNote, setEqNote] = useState("");

  // Form states (Tool/EquipmentType by Quantity)
  const [toolCategoryId, setToolCategoryId] = useState<number>(0);
  const [toolName, setToolName] = useState("");
  const [toolQty, setToolQty] = useState<number>(0);
  const [toolDesc, setToolDesc] = useState("");

  const showToast = useCallback((message: string, type: "success" | "error" = "success") => {
    setToast({ message, type, visible: true });
  }, []);

  // Dismiss toast
  useEffect(() => {
    if (toast.visible) {
      const timer = setTimeout(() => {
        setToast((prev) => ({ ...prev, visible: false }));
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [toast.visible]);

  // Fetch all resources data
  const fetchAllData = useCallback(async (showSpinner = true) => {
    if (showSpinner) {
      setIsLoading(true);
    }
    setError("");
    try {
      const [
        areasData,
        landsData,
        categoriesData,
        typesData,
        instancesData,
      ] = await Promise.all([
        getAreas(),
        getLandResources(),
        getEquipmentCategories(),
        getEquipmentTypes(),
        getEquipmentInstances(),
      ]);

      setAreas(areasData);
      setLandResources(landsData);
      setCategories(categoriesData);
      setEquipmentTypes(typesData);
      setEquipmentInstances(instancesData);

      // Select first area as default if none is selected
      if (areasData.length > 0 && selectedAreaId === null) {
        setSelectedAreaId(areasData[0].areaId);
      }
    } catch (err: any) {
      console.error(err);
      setError("Failed to load resource data from server API.");
      showToast("Error retrieving data", "error");
    } finally {
      setIsLoading(false);
    }
  }, [selectedAreaId, showToast]);

  useEffect(() => {
    fetchAllData();
  }, []);

  // Reset form states on close
  const closeModal = () => {
    setModalType(null);
    setIsEditMode(false);
    setTargetArea(null);
    setTargetLand(null);
    setTargetEquipment(null);
    setTargetTool(null);

    // Area resets
    setAreaName("");
    setAreaDesc("");

    // Land resets
    setLandCode("");
    setLandSize(0);
    setLandLocation("");
    setLandSoilType("");
    setLandStatus("Available");

    // Equipment resets
    setEqTypeId(0);
    setEqAssetCode("");
    setEqSerialNumber("");
    setEqUsageHours(0);
    setEqCondition("Excellent");
    setEqStatus("Available");
    setEqNote("");

    // Tool resets
    setToolCategoryId(0);
    setToolName("");
    setToolQty(0);
    setToolDesc("");
  };

  // Open modals with pre-populated data for edit
  const openEditArea = (area: Area, e: React.MouseEvent) => {
    e.stopPropagation(); // prevent selecting the area item card
    setIsEditMode(true);
    setTargetArea(area);
    setAreaName(area.areaName);
    setAreaDesc(area.description || "");
    setModalType("area");
  };

  const openEditLand = (land: LandResource) => {
    setIsEditMode(true);
    setTargetLand(land);
    setLandCode(land.landCode);
    setLandSize(land.areaSize);
    setLandLocation(land.location || "");
    setLandSoilType(land.soilType || "");
    setLandStatus(land.status);
    setModalType("land");
  };

  const openEditEquipment = (instance: EquipmentInstance) => {
    setIsEditMode(true);
    setTargetEquipment(instance);
    setEqTypeId(instance.equipmentTypeId);
    setEqAssetCode(instance.assetCode);
    setEqSerialNumber(instance.serialNumber);
    setEqUsageHours(instance.totalUsageHours);
    setEqCondition(instance.conditionLevel);
    setEqStatus(instance.status);
    setEqNote(instance.note || "");
    setModalType("equipment");
  };

  const openEditTool = (tool: EquipmentType) => {
    setIsEditMode(true);
    setTargetTool(tool);
    setToolCategoryId(tool.equipmentCategoryId);
    setToolName(tool.name);
    setToolQty(tool.totalQuantity);
    setToolDesc(tool.description || "");
    setModalType("tool");
  };

  // Delete Handlers
  const handleDeleteArea = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm("Are you sure you want to delete this Area? This might affect land resources inside it.")) return;
    try {
      await deleteArea(id);
      showToast("Area deleted successfully!");
      if (selectedAreaId === id) {
        setSelectedAreaId(null);
      }
      fetchAllData(false);
    } catch (err: any) {
      showToast(err.response?.data?.message || "Failed to delete area", "error");
    }
  };

  const handleDeleteLand = async (id: number) => {
    if (!window.confirm("Are you sure you want to delete this Land resource?")) return;
    try {
      await deleteLandResource(id);
      showToast("Land resource deleted successfully!");
      fetchAllData(false);
    } catch (err: any) {
      showToast(err.response?.data?.message || "Failed to delete land resource", "error");
    }
  };

  const handleDeleteEquipment = async (id: number) => {
    if (!window.confirm("Are you sure you want to retire/delete this Equipment instance?")) return;
    try {
      await deleteEquipmentInstance(id);
      showToast("Equipment instance removed successfully!");
      fetchAllData(false);
    } catch (err: any) {
      showToast(err.response?.data?.message || "Failed to delete equipment instance", "error");
    }
  };

  const handleDeleteTool = async (id: number) => {
    if (!window.confirm("Are you sure you want to delete this Tool type?")) return;
    try {
      await deleteEquipmentType(id);
      showToast("Tool type deleted successfully!");
      fetchAllData(false);
    } catch (err: any) {
      showToast(err.response?.data?.message || "Failed to delete tool", "error");
    }
  };

  // Submit Handlers
  const handleAreaSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!areaName.trim()) return showToast("Area Name is required.", "error");

    try {
      if (isEditMode && targetArea) {
        await updateArea(targetArea.areaId, { areaName, description: areaDesc });
        showToast("Area updated successfully!");
      } else {
        const newArea = await createArea({ areaName, description: areaDesc });
        showToast("Area created successfully!");
        setSelectedAreaId(newArea.areaId);
      }
      closeModal();
      fetchAllData(false);
    } catch (err: any) {
      showToast(err.response?.data?.message || "Failed to save area.", "error");
    }
  };

  const handleLandSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAreaId) return showToast("No active Area selected.", "error");
    if (!landCode.trim()) return showToast("Land Code is required.", "error");
    if (landSize <= 0) return showToast("Land size must be greater than 0.", "error");

    try {
      const payload = {
        areaId: selectedAreaId,
        landCode,
        areaSize: Number(landSize),
        location: landLocation,
        soilType: landSoilType,
        status: landStatus as any,
      };

      if (isEditMode && targetLand) {
        await updateLandResource(targetLand.landId, payload);
        showToast("Land resource updated successfully!");
      } else {
        await createLandResource(payload);
        showToast("Land resource created successfully!");
      }
      closeModal();
      fetchAllData(false);
    } catch (err: any) {
      showToast(err.response?.data?.message || "Failed to save land resource.", "error");
    }
  };

  const handleEquipmentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!eqTypeId) return showToast("Please select an Equipment Type.", "error");
    if (!eqAssetCode.trim()) return showToast("Asset Code is required.", "error");

    try {
      const payload = {
        equipmentTypeId: eqTypeId,
        assetCode: eqAssetCode,
        serialNumber: eqSerialNumber,
        totalUsageHours: Number(eqUsageHours),
        conditionLevel: eqCondition as any,
        status: eqStatus as any,
        usageHoursSinceMaintenance: 0,
        maintenanceCount: isEditMode && targetEquipment ? targetEquipment.maintenanceCount : 0,
        note: eqNote,
      };

      if (isEditMode && targetEquipment) {
        await updateEquipmentInstance(targetEquipment.equipmentInstanceId, {
          ...payload,
          usageHoursSinceMaintenance: targetEquipment.usageHoursSinceMaintenance,
          lastMaintenanceDate: targetEquipment.lastMaintenanceDate,
          nextMaintenanceDate: targetEquipment.nextMaintenanceDate,
          effectiveMaintenanceIntervalHours: targetEquipment.effectiveMaintenanceIntervalHours,
        });
        showToast("Equipment instance updated successfully!");
      } else {
        await createEquipmentInstance(payload);
        showToast("Equipment instance created successfully!");
      }
      closeModal();
      fetchAllData(false);
    } catch (err: any) {
      showToast(err.response?.data?.message || "Failed to save equipment.", "error");
    }
  };

  const handleToolSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!toolCategoryId) return showToast("Please select a category.", "error");
    if (!toolName.trim()) return showToast("Tool name is required.", "error");

    try {
      const payload = {
        equipmentCategoryId: toolCategoryId,
        name: toolName,
        trackingType: "QuantityBased" as const,
        totalQuantity: Number(toolQty),
        description: toolDesc,
      };

      if (isEditMode && targetTool) {
        await updateEquipmentType(targetTool.equipmentTypeId, payload);
        showToast("Tool updated successfully!");
      } else {
        await createEquipmentType(payload);
        showToast("Tool type created successfully!");
      }
      closeModal();
      fetchAllData(false);
    } catch (err: any) {
      showToast(err.response?.data?.message || "Failed to save tool.", "error");
    }
  };

  // Adjust Quantity quickly for Tools
  const handleAdjustQuantity = async (tool: EquipmentType, amount: number) => {
    const newQty = Math.max(0, tool.totalQuantity + amount);
    try {
      await updateEquipmentType(tool.equipmentTypeId, {
        equipmentCategoryId: tool.equipmentCategoryId,
        name: tool.name,
        trackingType: "QuantityBased",
        totalQuantity: newQty,
        description: tool.description,
      });
      showToast(`Adjusted quantity for ${tool.name}`);
      fetchAllData(false);
    } catch (err: any) {
      showToast("Failed to adjust quantity.", "error");
    }
  };

  // Filter lists based on search queries
  const filteredLands = landResources
    .filter((land) => land.areaId === selectedAreaId)
    .filter(
      (land) =>
        land.landCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (land.soilType || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (land.location || "").toLowerCase().includes(searchQuery.toLowerCase())
    );

  const filteredEquipment = equipmentInstances
    .map((inst) => {
      const type = equipmentTypes.find((t) => t.equipmentTypeId === inst.equipmentTypeId);
      return { ...inst, typeName: type?.name || "Unknown", trackingType: type?.trackingType };
    })
    .filter((inst) => inst.trackingType === "Individual")
    .filter(
      (inst) =>
        inst.assetCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
        inst.serialNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        inst.typeName.toLowerCase().includes(searchQuery.toLowerCase())
    );

  const filteredTools = equipmentTypes
    .filter((t) => t.trackingType === "QuantityBased")
    .filter(
      (t) =>
        t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (t.description || "").toLowerCase().includes(searchQuery.toLowerCase())
    );

  const activeArea = areas.find((a) => a.areaId === selectedAreaId);

  return (
    <DashboardLayout>
      <div className="resources-page-container">
        {/* Header Block */}
        <div className="resources-header-panel">
          <div>
            <h2>Resource Management</h2>
            <p>Control areas, machinery assets, and field utilities tools.</p>
          </div>
          <div style={{ display: "flex", gap: "10px" }}>
            <button
              type="button"
              className="resource-action-btn secondary"
              onClick={() => fetchAllData(true)}
              disabled={isLoading}
            >
              <RotateCw size={14} className={isLoading ? "spin-icon" : ""} />
              <span>Refresh</span>
            </button>
            {activeTab === "land" && (
              <button
                type="button"
                className="resource-action-btn primary"
                onClick={() => setModalType("area")}
              >
                <Plus size={16} />
                <span>Add Area</span>
              </button>
            )}
            {activeTab === "equipment" && (
              <button
                type="button"
                className="resource-action-btn primary"
                onClick={() => {
                  // Pre-select first type
                  const instanceTypes = equipmentTypes.filter((t) => t.trackingType === "Individual");
                  if (instanceTypes.length > 0) setEqTypeId(instanceTypes[0].equipmentTypeId);
                  setModalType("equipment");
                }}
              >
                <Plus size={16} />
                <span>Add Equipment</span>
              </button>
            )}
            {activeTab === "tools" && (
              <button
                type="button"
                className="resource-action-btn primary"
                onClick={() => {
                  if (categories.length > 0) setToolCategoryId(categories[0].equipmentCategoryId);
                  setModalType("tool");
                }}
              >
                <Plus size={16} />
                <span>Add Tool</span>
              </button>
            )}
          </div>
        </div>

        {/* Tabs Swiper */}
        <div className="resources-tabs-bar">
          <button
            type="button"
            className={`resource-tab-btn ${activeTab === "land" ? "active" : ""}`}
            onClick={() => {
              setActiveTab("land");
              setSearchQuery("");
            }}
          >
            <Trees size={16} />
            <span>Land & Areas</span>
          </button>
          <button
            type="button"
            className={`resource-tab-btn ${activeTab === "equipment" ? "active" : ""}`}
            onClick={() => {
              setActiveTab("equipment");
              setSearchQuery("");
            }}
          >
            <Wrench size={16} />
            <span>Machinery Assets</span>
          </button>
          <button
            type="button"
            className={`resource-tab-btn ${activeTab === "tools" ? "active" : ""}`}
            onClick={() => {
              setActiveTab("tools");
              setSearchQuery("");
            }}
          >
            <Hammer size={16} />
            <span>Field Tools</span>
          </button>
        </div>

        {/* Main Content Area */}
        <div className="resources-content-panel">
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
              <h4>Error Loading Resources</h4>
              <p>{error}</p>
              <button
                type="button"
                className="resource-action-btn primary"
                onClick={() => fetchAllData(true)}
                style={{ marginTop: "16px", marginInline: "auto" }}
              >
                Try Again
              </button>
            </div>
          )}

          {!isLoading && !error && (
            <>
              {/* TAB 1: LAND & AREAS */}
              {activeTab === "land" && (
                <div className="land-tab-layout">
                  {/* Left Column: Areas list */}
                  <div className="areas-sidebar">
                    <div className="areas-sidebar-header">
                      <h4>Areas list</h4>
                    </div>
                    {areas.length === 0 ? (
                      <div className="no-data-alert">No Areas added yet.</div>
                    ) : (
                      <div className="areas-list">
                        {areas.map((area) => (
                          <div
                            key={area.areaId}
                            className={`area-item-card ${
                              selectedAreaId === area.areaId ? "active" : ""
                            }`}
                            onClick={() => setSelectedAreaId(area.areaId)}
                          >
                            <div className="area-item-card-header">
                              <span className="area-name-text">{area.areaName}</span>
                            </div>
                            <span className="area-desc-text">{area.description || "No description"}</span>
                            <div className="area-actions-row">
                              <button
                                type="button"
                                className="area-action-small-btn edit"
                                onClick={(e) => openEditArea(area, e)}
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                className="area-action-small-btn delete"
                                onClick={(e) => handleDeleteArea(area.areaId, e)}
                              >
                                Delete
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Right Column: Land Details table */}
                  <div className="lands-display-container">
                    <div className="lands-display-header">
                      <h3>
                        {activeArea ? `${activeArea.areaName} - Land Resources` : "Select an Area"}
                      </h3>
                      {activeArea && (
                        <button
                          type="button"
                          className="resource-action-btn primary"
                          onClick={() => setModalType("land")}
                        >
                          <Plus size={14} />
                          <span>Add Land</span>
                        </button>
                      )}
                    </div>

                    {activeArea ? (
                      <>
                        <div className="panel-control-bar">
                          <div className="search-input-wrapper">
                            <Search className="search-icon-inside" size={16} />
                            <input
                              type="text"
                              placeholder="Search lands in area..."
                              value={searchQuery}
                              onChange={(e) => setSearchQuery(e.target.value)}
                            />
                          </div>
                        </div>

                        {filteredLands.length === 0 ? (
                          <div className="no-data-alert">No land resources found matching the criteria.</div>
                        ) : (
                          <div className="table-responsive">
                            <table className="custom-table">
                              <thead>
                                <tr>
                                  <th>LAND CODE</th>
                                  <th>SIZE (m²)</th>
                                  <th>SOIL TYPE</th>
                                  <th>LOCATION</th>
                                  <th>STATUS</th>
                                  <th style={{ textAlign: "right" }}>ACTIONS</th>
                                </tr>
                              </thead>
                              <tbody>
                                {filteredLands.map((land) => (
                                  <tr key={land.landId}>
                                    <td style={{ fontWeight: 600, color: "var(--text-h)" }}>
                                      {land.landCode}
                                    </td>
                                    <td style={{ color: "var(--text)" }}>{land.areaSize}</td>
                                    <td style={{ color: "var(--text)" }}>{land.soilType || "—"}</td>
                                    <td style={{ color: "var(--text)" }}>
                                      <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                                        <MapPin size={12} />
                                        <span>{land.location || "—"}</span>
                                      </div>
                                    </td>
                                    <td>
                                      <span
                                        className={`land-status-badge ${land.status.toLowerCase()}`}
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
                                        {land.status}
                                      </span>
                                    </td>
                                    <td style={{ textAlign: "right" }}>
                                      <div className="table-actions-cell">
                                        <button
                                          type="button"
                                          className="action-btn-pill edit"
                                          onClick={() => openEditLand(land)}
                                        >
                                          <Edit2 size={12} />
                                          <span>Edit</span>
                                        </button>
                                        <button
                                          type="button"
                                          className="action-btn-pill delete"
                                          onClick={() => handleDeleteLand(land.landId)}
                                        >
                                          <Trash2 size={12} />
                                          <span>Delete</span>
                                        </button>
                                      </div>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="no-data-alert" style={{ border: "2px dashed var(--border)", borderRadius: "10px" }}>
                        Please select or add an Area on the left sidebar to manage its land resources.
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 2: MACHINERY EQUIPMENT */}
              {activeTab === "equipment" && (
                <div>
                  <div className="panel-control-bar">
                    <div className="search-input-wrapper">
                      <Search className="search-icon-inside" size={16} />
                      <input
                        type="text"
                        placeholder="Search machinery by name/code/serial..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                      />
                    </div>
                  </div>

                  {filteredEquipment.length === 0 ? (
                    <div className="no-data-alert">No machinery instances found.</div>
                  ) : (
                    <div className="table-responsive">
                      <table className="custom-table">
                        <thead>
                          <tr>
                            <th>ASSET CODE</th>
                            <th>SERIAL NUMBER</th>
                            <th>EQUIPMENT TYPE</th>
                            <th>TOTAL USAGE HOURS</th>
                            <th>CONDITION</th>
                            <th>STATUS</th>
                            <th style={{ textAlign: "right" }}>ACTIONS</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredEquipment.map((inst) => (
                            <tr key={inst.equipmentInstanceId}>
                              <td style={{ fontWeight: 600, color: "var(--text-h)" }}>
                                {inst.assetCode}
                              </td>
                              <td style={{ color: "var(--text)" }}>{inst.serialNumber || "—"}</td>
                              <td style={{ color: "var(--text)", fontWeight: 500 }}>
                                {inst.typeName}
                              </td>
                              <td style={{ color: "var(--text)" }}>{inst.totalUsageHours} hrs</td>
                              <td style={{ color: "var(--text)" }}>
                                <span
                                  style={{
                                    display: "inline-flex",
                                    padding: "2px 8px",
                                    borderRadius: "8px",
                                    fontSize: "11px",
                                    fontWeight: 600,
                                    backgroundColor: "var(--border)",
                                    color: "var(--text-h)",
                                  }}
                                >
                                  {inst.conditionLevel}
                                </span>
                              </td>
                              <td>
                                <span
                                  className={`land-status-badge ${
                                    inst.status === "Available"
                                      ? "available"
                                      : inst.status === "InUse"
                                      ? "allocated"
                                      : "maintenance"
                                  }`}
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
                                  {inst.status}
                                </span>
                              </td>
                              <td style={{ textAlign: "right" }}>
                                <div className="table-actions-cell">
                                  <button
                                    type="button"
                                    className="action-btn-pill edit"
                                    onClick={() => openEditEquipment(inst)}
                                  >
                                    <Edit2 size={12} />
                                    <span>Edit</span>
                                  </button>
                                  <button
                                    type="button"
                                    className="action-btn-pill delete"
                                    onClick={() => handleDeleteEquipment(inst.equipmentInstanceId)}
                                  >
                                    <Trash2 size={12} />
                                    <span>Retire</span>
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 3: TOOLS (BY QUANTITY) */}
              {activeTab === "tools" && (
                <div>
                  <div className="panel-control-bar">
                    <div className="search-input-wrapper">
                      <Search className="search-icon-inside" size={16} />
                      <input
                        type="text"
                        placeholder="Search tools by name..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                      />
                    </div>
                  </div>

                  {filteredTools.length === 0 ? (
                    <div className="no-data-alert">No quantity-managed tool types found.</div>
                  ) : (
                    <div className="table-responsive">
                      <table className="custom-table">
                        <thead>
                          <tr>
                            <th>TOOL NAME</th>
                            <th>CATEGORY</th>
                            <th style={{ width: "160px" }}>STOCK QUANTITY</th>
                            <th>DESCRIPTION</th>
                            <th style={{ textAlign: "right" }}>ACTIONS</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredTools.map((tool) => {
                            const cat = categories.find(
                              (c) => c.equipmentCategoryId === tool.equipmentCategoryId
                            );
                            return (
                              <tr key={tool.equipmentTypeId}>
                                <td style={{ fontWeight: 600, color: "var(--text-h)" }}>
                                  {tool.name}
                                </td>
                                <td style={{ color: "var(--text)" }}>
                                  {cat?.categoryName || "Tools Category"}
                                </td>
                                <td>
                                  <div className="quantity-control-wrapper">
                                    <button
                                      type="button"
                                      className="quantity-adjust-btn"
                                      onClick={() => handleAdjustQuantity(tool, -1)}
                                    >
                                      -
                                    </button>
                                    <span className="quantity-value-display">
                                      {tool.totalQuantity}
                                    </span>
                                    <button
                                      type="button"
                                      className="quantity-adjust-btn"
                                      onClick={() => handleAdjustQuantity(tool, 1)}
                                    >
                                      +
                                    </button>
                                  </div>
                                </td>
                                <td style={{ color: "var(--text)", fontSize: "13px" }}>
                                  {tool.description || "—"}
                                </td>
                                <td style={{ textAlign: "right" }}>
                                  <div className="table-actions-cell">
                                    <button
                                      type="button"
                                      className="action-btn-pill edit"
                                      onClick={() => openEditTool(tool)}
                                    >
                                      <Edit2 size={12} />
                                      <span>Edit</span>
                                    </button>
                                    <button
                                      type="button"
                                      className="action-btn-pill delete"
                                      onClick={() => handleDeleteTool(tool.equipmentTypeId)}
                                    >
                                      <Trash2 size={12} />
                                      <span>Delete</span>
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
                </div>
              )}
            </>
          )}
        </div>

        {/* ==========================================================
            MODAL DIALOGS
           ========================================================== */}

        {/* 1. Modal Area */}
        {modalType === "area" && (
          <div className="modal-overlay">
            <div className="modal-container" style={{ border: "1px solid var(--border)", background: "var(--card-bg)" }}>
              <div className="modal-header" style={{ borderBottom: "1px solid var(--border)" }}>
                <h3 style={{ color: "var(--text-h)" }}>
                  {isEditMode ? "Edit Area Details" : "Add Area"}
                </h3>
                <button type="button" className="modal-close-btn" onClick={closeModal}>
                  &times;
                </button>
              </div>

              <form onSubmit={handleAreaSubmit} className="modal-form">
                <div className="form-group">
                  <label htmlFor="areaName" style={{ color: "var(--text)" }}>Area Name <span className="required">*</span></label>
                  <input
                    type="text"
                    id="areaName"
                    placeholder="E.g., North Hill Zone, Sector B"
                    value={areaName}
                    onChange={(e) => setAreaName(e.target.value)}
                    required
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="areaDesc" style={{ color: "var(--text)" }}>Description</label>
                  <textarea
                    id="areaDesc"
                    rows={4}
                    placeholder="Explain location boundaries, soils, trees..."
                    value={areaDesc}
                    onChange={(e) => setAreaDesc(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "10px",
                      borderRadius: "8px",
                      border: "1px solid var(--border)",
                      backgroundColor: "var(--bg)",
                      color: "var(--text-h)",
                      outline: "none",
                    }}
                  />
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
                  <button type="submit" className="btn-primary">
                    {isEditMode ? "Update Area" : "Save Area"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* 2. Modal Land */}
        {modalType === "land" && (
          <div className="modal-overlay">
            <div className="modal-container" style={{ border: "1px solid var(--border)", background: "var(--card-bg)" }}>
              <div className="modal-header" style={{ borderBottom: "1px solid var(--border)" }}>
                <h3 style={{ color: "var(--text-h)" }}>
                  {isEditMode ? "Edit Land Details" : "Add Land Resource"}
                </h3>
                <button type="button" className="modal-close-btn" onClick={closeModal}>
                  &times;
                </button>
              </div>

              <form onSubmit={handleLandSubmit} className="modal-form">
                <div className="form-group">
                  <label htmlFor="landCode" style={{ color: "var(--text)" }}>Land Code <span className="required">*</span></label>
                  <input
                    type="text"
                    id="landCode"
                    placeholder="E.g., LAND-N01"
                    value={landCode}
                    onChange={(e) => setLandCode(e.target.value)}
                    required
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="landSize" style={{ color: "var(--text)" }}>Area Size (m²) <span className="required">*</span></label>
                  <input
                    type="number"
                    id="landSize"
                    placeholder="E.g., 5000"
                    value={landSize || ""}
                    onChange={(e) => setLandSize(Number(e.target.value))}
                    required
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="landSoil" style={{ color: "var(--text)" }}>Soil Type</label>
                  <input
                    type="text"
                    id="landSoil"
                    placeholder="E.g., Clay, Sandy loam"
                    value={landSoilType}
                    onChange={(e) => setLandSoilType(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="landLoc" style={{ color: "var(--text)" }}>Location</label>
                  <input
                    type="text"
                    id="landLoc"
                    placeholder="E.g., Latitude/Longitude or landmarks"
                    value={landLocation}
                    onChange={(e) => setLandLocation(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="landStat" style={{ color: "var(--text)" }}>Status</label>
                  <select
                    id="landStat"
                    value={landStatus}
                    onChange={(e) => setLandStatus(e.target.value)}
                  >
                    <option value="Available">Available</option>
                    <option value="Allocated">Allocated</option>
                    <option value="Maintenance">Maintenance</option>
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
                  <button type="submit" className="btn-primary">
                    {isEditMode ? "Update Land" : "Save Land"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* 3. Modal Equipment */}
        {modalType === "equipment" && (
          <div className="modal-overlay">
            <div className="modal-container" style={{ border: "1px solid var(--border)", background: "var(--card-bg)" }}>
              <div className="modal-header" style={{ borderBottom: "1px solid var(--border)" }}>
                <h3 style={{ color: "var(--text-h)" }}>
                  {isEditMode ? "Edit Machinery Details" : "Add Machinery Asset"}
                </h3>
                <button type="button" className="modal-close-btn" onClick={closeModal}>
                  &times;
                </button>
              </div>

              <form onSubmit={handleEquipmentSubmit} className="modal-form">
                <div className="form-group">
                  <label htmlFor="eqType" style={{ color: "var(--text)" }}>Equipment Type <span className="required">*</span></label>
                  <select
                    id="eqType"
                    value={eqTypeId || ""}
                    onChange={(e) => setEqTypeId(Number(e.target.value))}
                    disabled={isEditMode}
                    required
                  >
                    <option value="">Select machinery type</option>
                    {equipmentTypes
                      .filter((t) => t.trackingType === "Individual")
                      .map((t) => (
                        <option key={t.equipmentTypeId} value={t.equipmentTypeId}>
                          {t.name}
                        </option>
                      ))}
                  </select>
                </div>
                <div className="form-group">
                  <label htmlFor="eqAsset" style={{ color: "var(--text)" }}>Asset Code <span className="required">*</span></label>
                  <input
                    type="text"
                    id="eqAsset"
                    placeholder="E.g., ASSET-TR-001"
                    value={eqAssetCode}
                    onChange={(e) => setEqAssetCode(e.target.value)}
                    required
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="eqSerial" style={{ color: "var(--text)" }}>Serial Number</label>
                  <input
                    type="text"
                    id="eqSerial"
                    placeholder="E.g., SN-889104-B"
                    value={eqSerialNumber}
                    onChange={(e) => setEqSerialNumber(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="eqHours" style={{ color: "var(--text)" }}>Total Usage Hours</label>
                  <input
                    type="number"
                    id="eqHours"
                    placeholder="E.g., 120"
                    value={eqUsageHours || 0}
                    onChange={(e) => setEqUsageHours(Number(e.target.value))}
                  />
                </div>
                <div className="form-row">
                  <div className="form-group flex-1">
                    <label htmlFor="eqCond" style={{ color: "var(--text)" }}>Condition Level</label>
                    <select
                      id="eqCond"
                      value={eqCondition}
                      onChange={(e) => setEqCondition(e.target.value)}
                    >
                      <option value="Excellent">Excellent</option>
                      <option value="Good">Good</option>
                      <option value="Fair">Fair</option>
                      <option value="Poor">Poor</option>
                      <option value="Unusable">Unusable</option>
                    </select>
                  </div>
                  <div className="form-group flex-1">
                    <label htmlFor="eqStat" style={{ color: "var(--text)" }}>Status</label>
                    <select
                      id="eqStat"
                      value={eqStatus}
                      onChange={(e) => setEqStatus(e.target.value)}
                    >
                      <option value="Available">Available</option>
                      <option value="InUse">In Use</option>
                      <option value="Maintenance">Maintenance</option>
                      <option value="Retired">Retired</option>
                    </select>
                  </div>
                </div>
                <div className="form-group">
                  <label htmlFor="eqNote" style={{ color: "var(--text)" }}>Notes</label>
                  <input
                    type="text"
                    id="eqNote"
                    placeholder="Engine service needed, new tire etc."
                    value={eqNote}
                    onChange={(e) => setEqNote(e.target.value)}
                  />
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
                  <button type="submit" className="btn-primary">
                    {isEditMode ? "Update Asset" : "Save Asset"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* 4. Modal Tool (By Quantity) */}
        {modalType === "tool" && (
          <div className="modal-overlay">
            <div className="modal-container" style={{ border: "1px solid var(--border)", background: "var(--card-bg)" }}>
              <div className="modal-header" style={{ borderBottom: "1px solid var(--border)" }}>
                <h3 style={{ color: "var(--text-h)" }}>
                  {isEditMode ? "Edit Tool Configuration" : "Add Hand Tool Category"}
                </h3>
                <button type="button" className="modal-close-btn" onClick={closeModal}>
                  &times;
                </button>
              </div>

              <form onSubmit={handleToolSubmit} className="modal-form">
                <div className="form-group">
                  <label htmlFor="toolCat" style={{ color: "var(--text)" }}>Equipment Category <span className="required">*</span></label>
                  <select
                    id="toolCat"
                    value={toolCategoryId || ""}
                    onChange={(e) => setToolCategoryId(Number(e.target.value))}
                    disabled={isEditMode}
                    required
                  >
                    <option value="">Select Category</option>
                    {categories.map((c) => (
                      <option key={c.equipmentCategoryId} value={c.equipmentCategoryId}>
                        {c.categoryName}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label htmlFor="toolName" style={{ color: "var(--text)" }}>Tool Name <span className="required">*</span></label>
                  <input
                    type="text"
                    id="toolName"
                    placeholder="E.g., Field Shovel, Iron Spade"
                    value={toolName}
                    onChange={(e) => setToolName(e.target.value)}
                    required
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="toolQty" style={{ color: "var(--text)" }}>Initial Stock Quantity <span className="required">*</span></label>
                  <input
                    type="number"
                    id="toolQty"
                    placeholder="E.g., 50"
                    value={toolQty || ""}
                    onChange={(e) => setToolQty(Number(e.target.value))}
                    required
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="toolDesc" style={{ color: "var(--text)" }}>Description</label>
                  <textarea
                    id="toolDesc"
                    rows={3}
                    placeholder="E.g., Medium sizes, rubber handles..."
                    value={toolDesc}
                    onChange={(e) => setToolDesc(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "10px",
                      borderRadius: "8px",
                      border: "1px solid var(--border)",
                      backgroundColor: "var(--bg)",
                      color: "var(--text-h)",
                      outline: "none",
                    }}
                  />
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
                  <button type="submit" className="btn-primary">
                    {isEditMode ? "Update Tool" : "Save Tool"}
                  </button>
                </div>
              </form>
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
