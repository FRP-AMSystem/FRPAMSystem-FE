import type {
  ComponentType,
} from "react";

import {
  useNavigate,
} from "react-router-dom";

import {
  AlertTriangle,
  ArrowRight,
  CalendarDays,
  ClipboardList,
  LandPlot,
  Layers3,
  Trees,
  Truck,
  Users,
} from "lucide-react";

import DashboardLayout from "../../layouts/DashboardLayout";

import "./ResourceOverview.css";

type Role =
  | "Manager"
  | "Researcher"
  | "Technician"
  | "Student";

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

const resourceMenuItems: ResourceMenuItem[] = [
  {
    title: "Equipment",
    description:
      "View equipment types, categories, tracking information and available quantities.",
    path: "/equipment",
    icon: Truck,
    allowedRoles: [
      "Manager",
      "Researcher",
      "Technician",
      "Student",
    ],
    category: "equipment",
  },
  {
    title: "Equipment Requirements",
    description:
      "View the equipment quantities and minimum efficiency required for experiments.",
    path: "/equipment-requirements",
    icon: ClipboardList,
    allowedRoles: [
      "Manager",
      "Researcher",
      "Technician",
      "Student",
    ],
    category: "equipment",
  },
  {
    title: "Human Requirements",
    description:
      "Review required roles, skills, personnel quantities and working-hour requirements.",
    path: "/human-requirements",
    icon: Users,
    allowedRoles: [
      "Manager",
      "Researcher",
      "Technician",
      "Student",
    ],
    category: "human",
  },
  {
    title: "Land Requirements",
    description:
      "Review required land area, soil conditions and notes for each experiment.",
    path: "/land-requirements",
    icon: LandPlot,
    allowedRoles: [
      "Manager",
      "Researcher",
      "Technician",
      "Student",
    ],
    category: "land",
  },
  {
    title: "Allocation Plans",
    description:
      "View resource allocation plans and the equipment, human and land resources assigned.",
    path: "/allocation",
    icon: Layers3,
    allowedRoles: [
      "Manager",
      "Researcher",
      "Technician",
      "Student",
    ],
    category: "planning",
  },
  {
    title: "Schedules",
    description:
      "View resource usage periods, assigned personnel and experiment-phase schedules.",
    path: "/schedules",
    icon: CalendarDays,
    allowedRoles: [
      "Manager",
      "Researcher",
      "Technician",
      "Student",
    ],
    category: "planning",
  },
  {
    title: "Schedule Conflicts",
    description:
      "Detect overlapping schedules, duplicate human assignments and allocation conflicts.",
    path: "/conflicts",
    icon: AlertTriangle,
    allowedRoles: [
      "Manager",
      "Researcher",
      "Technician",
    ],
    category: "monitoring",
  },
];

function getCurrentRole(): Role {
  const storedRole =
    localStorage.getItem("role");

  if (
    storedRole === "Manager" ||
    storedRole === "Researcher" ||
    storedRole === "Technician" ||
    storedRole === "Student"
  ) {
    return storedRole;
  }

  return "Student";
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