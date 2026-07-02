import { useEffect, useMemo, useState } from "react";

import DashboardLayout from "../../layouts/DashboardLayout";

import {
  getEquipmentCategories,
  getEquipmentInstances,
  getEquipmentTypes,
} from "../../services/equipmentService";

import type {
  EquipmentCategory,
  EquipmentInstance,
  EquipmentType,
} from "../../types/equipment";

import "./EquipmentList.css";

type TabType = "instances" | "types" | "categories";

type Role = "Manager" | "Researcher" | "Technician" | "Student";

export default function EquipmentList() {
  const role = (localStorage.getItem("role") || "Student") as Role;

  const [activeTab, setActiveTab] = useState<TabType>("instances");

  const [instances, setInstances] = useState<EquipmentInstance[]>([]);
  const [types, setTypes] = useState<EquipmentType[]>([]);
  const [categories, setCategories] = useState<EquipmentCategory[]>([]);

  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  const canManage = role === "Researcher";

  useEffect(() => {
    async function loadEquipmentData() {
      try {
        setLoading(true);

        const [instanceData, typeData, categoryData] = await Promise.all([
          getEquipmentInstances(),
          getEquipmentTypes(),
          getEquipmentCategories(),
        ]);

        setInstances(instanceData);
        setTypes(typeData);
        setCategories(categoryData);
      } catch (error) {
        console.error("Failed to load equipment data:", error);
        setInstances([]);
        setTypes([]);
        setCategories([]);
      } finally {
        setLoading(false);
      }
    }

    loadEquipmentData();
  }, []);

  const filteredInstances = useMemo(() => {
    const keyword = search.toLowerCase();

    return instances.filter((item) => {
      return (
        item.instanceName?.toLowerCase().includes(keyword) ||
        item.code?.toLowerCase().includes(keyword) ||
        item.status?.toLowerCase().includes(keyword) ||
        item.location?.toLowerCase().includes(keyword) ||
        item.equipmentTypeName?.toLowerCase().includes(keyword) ||
        item.equipmentCategoryName?.toLowerCase().includes(keyword)
      );
    });
  }, [instances, search]);

  const filteredTypes = useMemo(() => {
    const keyword = search.toLowerCase();

    return types.filter((item) => {
      return (
        item.typeName?.toLowerCase().includes(keyword) ||
        item.categoryName?.toLowerCase().includes(keyword) ||
        item.description?.toLowerCase().includes(keyword)
      );
    });
  }, [types, search]);

  const filteredCategories = useMemo(() => {
    const keyword = search.toLowerCase();

    return categories.filter((item) => {
      return (
        item.categoryName?.toLowerCase().includes(keyword) ||
        item.description?.toLowerCase().includes(keyword)
      );
    });
  }, [categories, search]);

  return (
    <DashboardLayout>
      <div className="equipment-page">
        <div className="equipment-header">
          <div>
            <h1>Equipment Management</h1>
            <p>
              View equipment instances, equipment types and equipment categories.
            </p>
          </div>

          {canManage && (
            <button className="equipment-create-btn">+ Add Equipment</button>
          )}
        </div>

        <div className="equipment-toolbar">
          <div className="equipment-tabs">
            <button
              className={activeTab === "instances" ? "active" : ""}
              onClick={() => setActiveTab("instances")}
            >
              Instances
            </button>

            <button
              className={activeTab === "types" ? "active" : ""}
              onClick={() => setActiveTab("types")}
            >
              Types
            </button>

            <button
              className={activeTab === "categories" ? "active" : ""}
              onClick={() => setActiveTab("categories")}
            >
              Categories
            </button>
          </div>

          <input
            className="equipment-search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search equipment..."
          />
        </div>

        {loading ? (
          <div className="equipment-loading">Loading equipment data...</div>
        ) : (
          <>
            {activeTab === "instances" && (
              <div className="equipment-table-card">
                <h3>Equipment Instances</h3>

                <table className="equipment-table">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Instance Name</th>
                      <th>Code</th>
                      <th>Type</th>
                      <th>Category</th>
                      <th>Status</th>
                      <th>Location</th>
                      <th>Actions</th>
                    </tr>
                  </thead>

                  <tbody>
                    {filteredInstances.map((item) => (
                      <tr key={item.equipmentInstanceId}>
                        <td>#{item.equipmentInstanceId}</td>
                        <td>{item.instanceName}</td>
                        <td>{item.code || "-"}</td>
                        <td>{item.equipmentTypeName || item.equipmentTypeId}</td>
                        <td>{item.equipmentCategoryName || "-"}</td>
                        <td>
                          <span
                            className={`equipment-status status-${(
                              item.status || "unknown"
                            ).toLowerCase()}`}
                          >
                            {item.status || "Unknown"}
                          </span>
                        </td>
                        <td>{item.location || "-"}</td>
                        <td>
                          <div className="equipment-actions">
                            <button>View</button>

                            {canManage && (
                              <>
                                <button>Edit</button>
                                <button className="danger-btn">Delete</button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}

                    {filteredInstances.length === 0 && (
                      <tr>
                        <td colSpan={8} className="empty-cell">
                          No equipment instances found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {activeTab === "types" && (
              <div className="equipment-table-card">
                <h3>Equipment Types</h3>

                <table className="equipment-table">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Type Name</th>
                      <th>Category</th>
                      <th>Description</th>
                      <th>Actions</th>
                    </tr>
                  </thead>

                  <tbody>
                    {filteredTypes.map((item) => (
                      <tr key={item.equipmentTypeId}>
                        <td>#{item.equipmentTypeId}</td>
                        <td>{item.typeName}</td>
                        <td>{item.categoryName || item.equipmentCategoryId}</td>
                        <td>{item.description || "-"}</td>
                        <td>
                          <div className="equipment-actions">
                            <button>View</button>

                            {canManage && (
                              <>
                                <button>Edit</button>
                                <button className="danger-btn">Delete</button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}

                    {filteredTypes.length === 0 && (
                      <tr>
                        <td colSpan={5} className="empty-cell">
                          No equipment types found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {activeTab === "categories" && (
              <div className="equipment-table-card">
                <h3>Equipment Categories</h3>

                <table className="equipment-table">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Category Name</th>
                      <th>Description</th>
                      <th>Actions</th>
                    </tr>
                  </thead>

                  <tbody>
                    {filteredCategories.map((item) => (
                      <tr key={item.equipmentCategoryId}>
                        <td>#{item.equipmentCategoryId}</td>
                        <td>{item.categoryName}</td>
                        <td>{item.description || "-"}</td>
                        <td>
                          <div className="equipment-actions">
                            <button>View</button>

                            {canManage && (
                              <>
                                <button>Edit</button>
                                <button className="danger-btn">Delete</button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}

                    {filteredCategories.length === 0 && (
                      <tr>
                        <td colSpan={4} className="empty-cell">
                          No equipment categories found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  );
}