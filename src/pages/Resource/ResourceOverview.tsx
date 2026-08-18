import type {
  ComponentType,
} from "react";

import {
  useNavigate,
} from "react-router-dom";

import {
  AlertTriangle,
  ArrowRight,
  ArrowRightLeft,
  CalendarDays,
  ClipboardList,
  Cpu,
  LandPlot,
  Layers3,
  Map,
  Trees,
  Truck,
  UserRound,
  UserRoundCheck,
  Users,
} from "lucide-react";

import DashboardLayout from "../../layouts/DashboardLayout";

import "./ResourceOverview.css";

type Role =
  | "Admin"
  | "Manager"
  | "Researcher"
  | "Technician" | "Student" | "Seasonal";

interface ResourceIconProps {
  size?: number;
  className?: string;
}

interface ResourceMenuItem {
  title: string;
  description: string;
  path: string;
  icon: ComponentType<ResourceIconProps>;
  allowedRoles: Role[];
  category:
  | "equipment"
  | "human"
  | "land"
  | "planning"
  | "monitoring";
}

const allRoles: Role[] = [
  "Admin",
  "Manager",
  "Researcher",
  "Technician",
  "Student",
];

const resourceMenuItems: ResourceMenuItem[] = [
  {
    title: "Equipment Types",
    description:
      "View equipment types, tracking types, total quantities and available stock.",
    path: "/equipment",
    icon: Truck,
    allowedRoles: allRoles,
    category: "equipment",
  },
  {
    title: "Equipment Categories",
    description:
      "Manage categories for sorting and grouping technical equipment.",
    path: "/equipment-categories",
    icon: ClipboardList,
    allowedRoles: allRoles,
    category: "equipment",
  },
  {
    title: "Equipment Instances",
    description:
      "Track individual equipment assets by code, serial number and condition.",
    path: "/equipment-instances",
    icon: Cpu,
    allowedRoles: allRoles,
    category: "equipment",
  },
  {
    title: "Equipment Substitutions",
    description:
      "Configure alternative equipment types and efficiency multiplier rates.",
    path: "/equipment-substitutions",
    icon: ArrowRightLeft,
    allowedRoles: allRoles,
    category: "equipment",
  },
  {
    title: "Equipment Shortage Logs",
    description:
      "Review log records of equipment shortages during experiment allocations.",
    path: "/equipment-shortage-logs",
    icon: AlertTriangle,
    allowedRoles: allRoles,
    category: "equipment",
  },
  {
    title: "Personnel Directory",
    description:
      "View personnel profiles, roles, assigned skills and workload status.",
    path: "/admin/personnel",
    icon: UserRoundCheck,
    allowedRoles: allRoles,
    category: "human",
  },
  {
    title: "Human Resources",
    description:
      "Manage human resource profiles, maximum working hours and availability.",
    path: "/human-resource-profiles",
    icon: UserRound,
    allowedRoles: allRoles,
    category: "human",
  },
  {
    title: "Land Resources",
    description:
      "View forestry land plots, soil conditions, locations and area sizes.",
    path: "/land-resources",
    icon: LandPlot,
    allowedRoles: allRoles,
    category: "land",
  },
  {
    title: "Forestry Areas",
    description:
      "Manage geographic forestry zones, sectors and land plot groupings.",
    path: "/areas",
    icon: Map,
    allowedRoles: allRoles,
    category: "land",
  },
  {
    title: "Equipment Requirements",
    description:
      "View required equipment quantities and minimum efficiency for experiments.",
    path: "/equipment-requirements",
    icon: ClipboardList,
    allowedRoles: allRoles,
    category: "equipment",
  },
  {
    title: "Human Requirements",
    description:
      "Review required roles, skills, personnel quantities and working hours.",
    path: "/human-requirements",
    icon: Users,
    allowedRoles: allRoles,
    category: "human",
  },
  {
    title: "Land Requirements",
    description:
      "Review required land area, soil conditions and notes for each experiment.",
    path: "/land-requirements",
    icon: LandPlot,
    allowedRoles: allRoles,
    category: "land",
  },
  {
    title: "Allocation Plans",
    description:
      "View resource allocation plans and assigned equipment, human and land resources.",
    path: "/allocation",
    icon: Layers3,
    allowedRoles: allRoles,
    category: "planning",
  },
  {
    title: "Schedules",
    description:
      "View resource usage periods, assigned personnel and experiment timeline schedules.",
    path: "/schedules",
    icon: CalendarDays,
    allowedRoles: allRoles,
    category: "planning",
  },
  {
    title: "Schedule Conflicts",
    description:
      "Detect overlapping schedules, duplicate human assignments and resource conflicts.",
    path: "/conflicts",
    icon: AlertTriangle,
    allowedRoles: allRoles,
    category: "monitoring",
  },
];

function getCurrentRole(): Role {
  const storedRole =
    localStorage.getItem("role");

  if (
    storedRole === "Admin" ||
    storedRole === "Manager" ||
    storedRole === "Researcher" ||
    storedRole === "Technician" ||
    (storedRole === "Student" || storedRole === "Seasonal")
  ) {
    return storedRole;
  }

  return "Seasonal";
}

function getCategoryLabel(
  category: ResourceMenuItem["category"]
): string {
  switch (category) {
    case "equipment":
      return "Equipment";

    case "human":
      return "Human";

    case "land":
      return "Land";

    case "planning":
      return "Planning";

    case "monitoring":
      return "Monitoring";

    default:
      return "Resource";
  }
}

function getCategoryClassName(
  category: ResourceMenuItem["category"]
): string {
  return [
    "resource-overview-category",
    `resource-overview-category-${category}`,
  ].join(" ");
}

export default function ResourceOverview() {
  const navigate =
    useNavigate();

  const role =
    getCurrentRole();

  const visibleItems =
    resourceMenuItems.filter(
      (item) =>
        item.allowedRoles.includes(
          role
        )
    );

  const requirementCount =
    visibleItems.filter(
      (item) =>
        item.path.includes(
          "requirements"
        )
    ).length;

  const planningCount =
    visibleItems.filter(
      (item) =>
        item.category ===
        "planning" ||
        item.category ===
        "monitoring"
    ).length;

  return (
    <DashboardLayout>
      <div className="resource-overview-page">
        <header className="resource-overview-header">
          <div>
            <p className="resource-overview-breadcrumb">
              Dashboard / Resources
            </p>

            <h1>
              Resource Management
            </h1>

            <p className="resource-overview-description">
              Access equipment, human,
              land, allocation and schedule
              information from one place.
            </p>
          </div>

          <div className="resource-overview-header-icon">
            <Trees size={30} />
          </div>
        </header>

        <section className="resource-overview-summary">
          <article className="resource-overview-summary-card">
            <div className="resource-overview-summary-icon">
              <Layers3 size={21} />
            </div>

            <div>
              <span>
                Available Modules
              </span>

              <strong>
                {visibleItems.length}
              </strong>
            </div>
          </article>

          <article className="resource-overview-summary-card">
            <div className="resource-overview-summary-icon">
              <ClipboardList
                size={21}
              />
            </div>

            <div>
              <span>
                Requirement Modules
              </span>

              <strong>
                {requirementCount}
              </strong>
            </div>
          </article>

          <article className="resource-overview-summary-card">
            <div className="resource-overview-summary-icon">
              <CalendarDays
                size={21}
              />
            </div>

            <div>
              <span>
                Planning Modules
              </span>

              <strong>
                {planningCount}
              </strong>
            </div>
          </article>

          <article className="resource-overview-summary-card">
            <div className="resource-overview-summary-icon">
              <Users size={21} />
            </div>

            <div>
              <span>
                Current Role
              </span>

              <strong className="resource-overview-role">
                {role}
              </strong>
            </div>
          </article>
        </section>

        <section className="resource-overview-content">
          <div className="resource-overview-section-heading">
            <div>
              <h2>
                Resource Modules
              </h2>

              <p>
                Select a module to view
                or manage its information.
              </p>
            </div>
          </div>

          <div className="resource-overview-grid">
            {visibleItems.map(
              (item) => {
                const Icon =
                  item.icon;

                return (
                  <article
                    key={item.path}
                    className="resource-overview-card"
                  >
                    <div className="resource-overview-card-top">
                      <div className="resource-overview-card-icon">
                        <Icon size={24} />
                      </div>

                      <span
                        className={getCategoryClassName(
                          item.category
                        )}
                      >
                        {getCategoryLabel(
                          item.category
                        )}
                      </span>
                    </div>

                    <div className="resource-overview-card-content">
                      <h3>
                        {item.title}
                      </h3>

                      <p>
                        {item.description}
                      </p>
                    </div>

                    <button
                      type="button"
                      className="resource-overview-open-button"
                      onClick={() =>
                        navigate(
                          item.path
                        )
                      }
                    >
                      Open Module

                      <ArrowRight
                        size={17}
                      />
                    </button>
                  </article>
                );
              }
            )}
          </div>
        </section>

        <section className="resource-overview-workflow">
          <div className="resource-overview-workflow-heading">
            <Layers3 size={21} />

            <div>
              <h2>
                Resource Workflow
              </h2>

              <p>
                The recommended order for
                preparing and assigning
                experiment resources.
              </p>
            </div>
          </div>

          <div className="resource-overview-workflow-list">
            <div className="resource-overview-workflow-step">
              <span>1</span>

              <div>
                <strong>
                  Define Requirements
                </strong>

                <p>
                  Create equipment, human
                  and land requirements for
                  an experiment.
                </p>
              </div>
            </div>

            <div className="resource-overview-workflow-arrow">
              <ArrowRight size={19} />
            </div>

            <div className="resource-overview-workflow-step">
              <span>2</span>

              <div>
                <strong>
                  Create Allocation
                </strong>

                <p>
                  Assign suitable equipment,
                  personnel and land resources.
                </p>
              </div>
            </div>

            <div className="resource-overview-workflow-arrow">
              <ArrowRight size={19} />
            </div>

            <div className="resource-overview-workflow-step">
              <span>3</span>

              <div>
                <strong>
                  Manager Approval
                </strong>

                <p>
                  Submit the allocation for
                  manager approval or
                  rejection.
                </p>
              </div>
            </div>

            <div className="resource-overview-workflow-arrow">
              <ArrowRight size={19} />
            </div>

            <div className="resource-overview-workflow-step">
              <span>4</span>

              <div>
                <strong>
                  Schedule Resources
                </strong>

                <p>
                  Create schedules and
                  review possible resource
                  conflicts.
                </p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </DashboardLayout>
  );
}