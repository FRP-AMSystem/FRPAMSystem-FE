import React, { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  FlaskConical,
  Plus,
  Eye,
  Edit,
  Sparkles,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import type { ExperimentResponse } from "../../../types/experiment";

interface ResearcherExperimentPipelineProps {
  experiments: ExperimentResponse[];
}

type PipelineFilter = "ALL" | "Draft" | "Submitted" | "Planning" | "Running" | "Completed";

function formatDate(val?: string | null): string {
  if (!val) return "—";
  const d = new Date(val);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("vi-VN");
}

function getPriorityBadge(priority?: number | null) {
  const p = priority ?? 1;
  if (p >= 3) {
    return <span style={{ color: "#dc2626", background: "#fef2f2", border: "1px solid #fecaca", padding: "2px 8px", borderRadius: 999, fontSize: 11, fontWeight: 700 }}>High Priority</span>;
  }
  if (p === 2) {
    return <span style={{ color: "#d97706", background: "#fffbeb", border: "1px solid #fde68a", padding: "2px 8px", borderRadius: 999, fontSize: 11, fontWeight: 700 }}>Medium</span>;
  }
  return <span style={{ color: "#475569", background: "#f1f5f9", border: "1px solid #e2e8f0", padding: "2px 8px", borderRadius: 999, fontSize: 11, fontWeight: 600 }}>Normal</span>;
}

function getStatusPill(status?: string | null) {
  const s = status || "Draft";
  switch (s.toLowerCase()) {
    case "running":
    case "inprogress":
      return <span className="pipeline-step-badge running" style={{ cursor: "default" }}><Clock size={12} /> Running</span>;
    case "planning":
    case "ready":
      return <span className="pipeline-step-badge planning" style={{ cursor: "default" }}><Sparkles size={12} /> Planning</span>;
    case "submitted":
      return <span className="pipeline-step-badge submitted" style={{ cursor: "default" }}><AlertTriangle size={12} /> Submitted</span>;
    case "completed":
      return <span className="pipeline-step-badge completed" style={{ cursor: "default" }}><CheckCircle2 size={12} /> Completed</span>;
    default:
      return <span className="pipeline-step-badge draft" style={{ cursor: "default" }}>Draft</span>;
  }
}

export const ResearcherExperimentPipeline: React.FC<ResearcherExperimentPipelineProps> = ({
  experiments,
}) => {
  const navigate = useNavigate();
  const [filter, setFilter] = useState<PipelineFilter>("ALL");
  const [currentPage, setCurrentPage] = useState<number>(1);
  const pageSize = 5;

  const counts = useMemo(() => {
    return {
      all: experiments.length,
      draft: experiments.filter((e) => (e.status || "Draft").toLowerCase() === "draft").length,
      submitted: experiments.filter((e) => (e.status || "").toLowerCase() === "submitted").length,
      planning: experiments.filter((e) => {
        const s = (e.status || "").toLowerCase();
        return s === "planning" || s === "ready";
      }).length,
      running: experiments.filter((e) => (e.status || "").toLowerCase() === "running").length,
      completed: experiments.filter((e) => (e.status || "").toLowerCase() === "completed").length,
    };
  }, [experiments]);

  const filteredExperiments = useMemo(() => {
    if (filter === "ALL") return experiments;
    if (filter === "Planning") {
      return experiments.filter((e) => {
        const s = (e.status || "").toLowerCase();
        return s === "planning" || s === "ready";
      });
    }
    return experiments.filter((e) => (e.status || "Draft").toLowerCase() === filter.toLowerCase());
  }, [experiments, filter]);

  const totalPages = Math.max(1, Math.ceil(filteredExperiments.length / pageSize));

  const handleFilterChange = (newFilter: PipelineFilter) => {
    setFilter(newFilter);
    setCurrentPage(1);
  };

  const paginatedExperiments = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return filteredExperiments.slice(startIndex, startIndex + pageSize);
  }, [filteredExperiments, currentPage, pageSize]);

  return (
    <div className="researcher-card">
      <div className="researcher-card-header">
        <div>
          <h3 className="researcher-card-title">
            <FlaskConical size={18} style={{ color: "#059669" }} />
            Experiment Lifecycle Pipeline
          </h3>
          <p className="researcher-card-subtitle">
            Track and manage your research experiments through each stage of development
          </p>
        </div>
        <button
          type="button"
          onClick={() => navigate("/experiments/create")}
          className="researcher-btn-light"
          style={{ background: "#059669", color: "#ffffff" }}
        >
          <Plus size={14} />
          <span>New Experiment</span>
        </button>
      </div>

      {/* Interactive Pipeline Funnel */}
      <div className="pipeline-funnel-bar">
        <button
          type="button"
          onClick={() => handleFilterChange("ALL")}
          className={`pipeline-step-badge ${filter === "ALL" ? "active-all" : "all"}`}
        >
          All ({counts.all})
        </button>
        <button
          type="button"
          onClick={() => handleFilterChange("Draft")}
          className={`pipeline-step-badge draft ${filter === "Draft" ? "active" : ""}`}
        >
          Draft ({counts.draft})
        </button>
        <button
          type="button"
          onClick={() => handleFilterChange("Submitted")}
          className={`pipeline-step-badge submitted ${filter === "Submitted" ? "active" : ""}`}
        >
          Submitted ({counts.submitted})
        </button>
        <button
          type="button"
          onClick={() => handleFilterChange("Planning")}
          className={`pipeline-step-badge planning ${filter === "Planning" ? "active" : ""}`}
        >
          Planning / Ready ({counts.planning})
        </button>
        <button
          type="button"
          onClick={() => handleFilterChange("Running")}
          className={`pipeline-step-badge running ${filter === "Running" ? "active" : ""}`}
        >
          Running ({counts.running})
        </button>
        <button
          type="button"
          onClick={() => handleFilterChange("Completed")}
          className={`pipeline-step-badge completed ${filter === "Completed" ? "active" : ""}`}
        >
          Completed ({counts.completed})
        </button>
      </div>

      {/* Scrollable Experiments List */}
      <div className="pipeline-scroll-container">
        {paginatedExperiments.length === 0 ? (
          <div style={{ textAlign: "center", padding: "40px 20px", color: "#94a3b8" }}>
            <FlaskConical size={32} style={{ margin: "0 auto 8px", opacity: 0.5 }} />
            <p style={{ margin: 0, fontWeight: 600, color: "#64748b" }}>
              No experiments found in this stage ({filter}).
            </p>
          </div>
        ) : (
          paginatedExperiments.map((exp) => (
            <div key={exp.experimentId} className="experiment-row-item">
              <div className="exp-main-info">
                <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                  <span
                    onClick={() => navigate(`/experiments/${exp.experimentId}`)}
                    className="exp-name-link"
                    style={{ cursor: "pointer" }}
                  >
                    {exp.experimentName}
                  </span>
                  {getStatusPill(exp.status)}
                  {getPriorityBadge(exp.priority)}
                </div>
                <div className="exp-meta-row">
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                    <Calendar size={13} />
                    {formatDate(exp.expectStartDate)} → {formatDate(exp.expectEndDate || exp.deadline)}
                  </span>
                  {exp.description && (
                    <span style={{ maxWidth: 350, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      • {exp.description}
                    </span>
                  )}
                </div>
              </div>

              <div className="exp-actions-group">
                <button
                  type="button"
                  onClick={() => navigate(`/experiments/${exp.experimentId}`)}
                  className="dashboard-btn-secondary"
                  style={{ padding: "5px 10px", fontSize: 12 }}
                  title="View Detail"
                >
                  <Eye size={13} />
                  <span>View</span>
                </button>
                <button
                  type="button"
                  onClick={() => navigate(`/experiments/${exp.experimentId}/edit`)}
                  className="dashboard-btn-secondary"
                  style={{ padding: "5px 10px", fontSize: 12 }}
                  title="Edit Experiment"
                >
                  <Edit size={13} />
                  <span>Edit</span>
                </button>
                <button
                  type="button"
                  onClick={() => navigate(`/experiments/${exp.experimentId}/ai-suggestions`)}
                  className="dashboard-btn-secondary"
                  style={{ padding: "5px 10px", fontSize: 12, color: "#7e22ce", borderColor: "#d8b4fe" }}
                  title="AI Optimizer"
                >
                  <Sparkles size={13} />
                  <span>AI Match</span>
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Pagination Footer */}
      {filteredExperiments.length > 0 && (
        <div className="pipeline-pagination-bar">
          <div>
            Showing{" "}
            <strong>
              {(currentPage - 1) * pageSize + 1} -{" "}
              {Math.min(currentPage * pageSize, filteredExperiments.length)}
            </strong>{" "}
            of <strong>{filteredExperiments.length}</strong> experiments
          </div>

          <div className="pipeline-pagination-controls">
            <button
              type="button"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="pagination-btn"
              title="Previous page"
            >
              <ChevronLeft size={14} />
            </button>

            {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => {
              // Only display around current page if there are many pages
              if (
                totalPages <= 7 ||
                pageNum === 1 ||
                pageNum === totalPages ||
                (pageNum >= currentPage - 1 && pageNum <= currentPage + 1)
              ) {
                return (
                  <button
                    key={pageNum}
                    type="button"
                    onClick={() => setCurrentPage(pageNum)}
                    className={`pagination-btn ${currentPage === pageNum ? "active" : ""}`}
                  >
                    {pageNum}
                  </button>
                );
              }
              if (pageNum === currentPage - 2 || pageNum === currentPage + 2) {
                return (
                  <span key={pageNum} style={{ padding: "0 2px", color: "#94a3b8" }}>
                    ...
                  </span>
                );
              }
              return null;
            })}

            <button
              type="button"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="pagination-btn"
              title="Next page"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
