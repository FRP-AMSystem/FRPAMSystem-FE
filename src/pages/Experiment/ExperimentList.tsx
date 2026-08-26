import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  useLocation,
  useNavigate,
} from "react-router-dom";

import {
  Eye,
  Pencil,
  Trash2,
} from "lucide-react";

import DashboardLayout from "../../layouts/DashboardLayout";

import {
  deleteExperiment,
  getExperiments,
} from "../../services/experimentService";

import type {
  ExperimentResponse,
} from "../../types/experiment";

import {
  getCurrentUserTokenInfo,
} from "../../utils/storage";

import "./ExperimentList.css";

type Role =
  | "Admin"
  | "Manager"
  | "Researcher"
  | "Technician"
  | "Student"
  | "Seasonal";

interface ExperimentListLocationState {
  selectedStatus?: string;
  message?: string;
  experimentId?: number;
}

const priorityLabels: Record<
  number,
  string
> = {
  0: "Low",
  1: "Medium",
  2: "High",
  3: "Urgent",
};

function formatDate(
  date?: string | null
): string {
  if (!date) {
    return "-";
  }

  const parsedDate =
    new Date(date);

  if (
    Number.isNaN(
      parsedDate.getTime()
    )
  ) {
    return "-";
  }

  return new Intl.DateTimeFormat(
    "vi-VN",
    {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }
  ).format(parsedDate);
}

function getStatusClass(
  status?: string | null
): string {
  const normalizedStatus =
    (status || "unknown")
      .replace(/\s+/g, "")
      .toLowerCase();

  return `experiment-status status-${normalizedStatus}`;
}

function getPriorityLabel(
  priority?: number | null
): string {
  if (
    priority === null ||
    priority === undefined
  ) {
    return "-";
  }

  return (
    priorityLabels[priority] ||
    `Level ${priority}`
  );
}

function getErrorMessage(
  error: unknown
): string {
  if (
    typeof error === "object" &&
    error !== null &&
    "response" in error &&
    typeof (
      error as {
        response?: unknown;
      }
    ).response === "object" &&
    (
      error as {
        response?: {
          data?: {
            message?: string;
            title?: string;
          };
        };
      }
    ).response !== null
  ) {
    const response = (
      error as {
        response?: {
          data?: {
            message?: string;
            title?: string;
          };
        };
      }
    ).response;

    return (
      response?.data?.message ||
      response?.data?.title ||
      "Unable to process the request."
    );
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Unable to process the request.";
}

export default function ExperimentList() {
  const navigate =
    useNavigate();

  const location =
    useLocation();

  /*
   * State được truyền từ CreateExperiment sau khi
   * Create Plan (Save Draft) thành công.
   *
   * Ví dụ:
   *
   * navigate("/experiments", {
   *   state: {
   *     selectedStatus: "Draft",
   *     message: "...",
   *     experimentId: 123
   *   }
   * })
   */
  const navigationState =
    location.state as
      | ExperimentListLocationState
      | null;

  const currentUser =
    useMemo(
      () =>
        getCurrentUserTokenInfo(),
      []
    );

  const role =
    currentUser.role as Role;

  const isResearcher =
    role === "Admin" ||
    role === "Manager" ||
    role === "Researcher";

  const isPrivileged =
    role === "Admin" ||
    role === "Manager";

  const [
    experiments,
    setExperiments,
  ] = useState<
    ExperimentResponse[]
  >([]);

  const [
    keyword,
    setKeyword,
  ] = useState("");

  /*
   * Nếu quay về từ Create Experiment với:
   *
   * selectedStatus: "Draft"
   *
   * thì tab Draft sẽ được chọn ngay.
   */
  const [
    selectedStatus,
    setSelectedStatus,
  ] = useState<string>(
    navigationState
      ?.selectedStatus ||
      "All"
  );

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    error,
    setError,
  ] = useState("");

  const [
    successMessage,
    setSuccessMessage,
  ] = useState(
    navigationState?.message ||
      ""
  );

  const [
    deletingId,
    setDeletingId,
  ] = useState<
    number | null
  >(null);

  const loadExperiments =
    useCallback(
      async (
        searchKeyword = ""
      ) => {
        try {
          setLoading(true);
          setError("");

          const user =
            getCurrentUserTokenInfo();

          const {
            userId,
            fullName,
            email,
            role: userRole,
          } = user;

          const privileged =
            userRole ===
              "Admin" ||
            userRole ===
              "Manager";

          const data =
            await getExperiments({
              keyword:
                searchKeyword.trim() ||
                undefined,

              researcherId:
                !privileged &&
                userId > 0
                  ? userId
                  : undefined,

              page: 1,
              size: 100,
            });

          /*
           * Manager/Admin xem toàn bộ.
           *
           * Researcher và role khác chỉ xem experiment
           * liên quan tới chính user đang đăng nhập.
           */
          const userExperiments =
            privileged
              ? data
              : data.filter(
                  (item) => {
                    if (
                      userId > 0 &&
                      item.researcherId ===
                        userId
                    ) {
                      return true;
                    }

                    if (
                      fullName &&
                      (
                        item.researcherName
                          ?.toLowerCase()
                          .includes(
                            fullName.toLowerCase()
                          ) ||
                        item.createdByName
                          ?.toLowerCase()
                          .includes(
                            fullName.toLowerCase()
                          )
                      )
                    ) {
                      return true;
                    }

                    if (
                      email &&
                      (
                        item.researcherEmail
                          ?.toLowerCase() ===
                          email.toLowerCase() ||
                        item.createdByEmail
                          ?.toLowerCase() ===
                          email.toLowerCase()
                      )
                    ) {
                      return true;
                    }

                    return false;
                  }
                );

          setExperiments(
            userExperiments
          );
        } catch (
          loadError
        ) {
          console.error(
            "Failed to load experiments:",
            loadError
          );

          setExperiments(
            []
          );

          setError(
            getErrorMessage(
              loadError
            )
          );
        } finally {
          setLoading(false);
        }
      },
      []
    );

  useEffect(() => {
    void loadExperiments();
  }, [loadExperiments]);

  /*
   * Khi quay lại trang Experiment từ CreateExperiment,
   * update tab dựa vào state được truyền sang.
   */
  useEffect(() => {
    if (
      navigationState
        ?.selectedStatus
    ) {
      setSelectedStatus(
        navigationState.selectedStatus
      );
    }

    if (
      navigationState
        ?.message
    ) {
      setSuccessMessage(
        navigationState.message
      );
    }

    /*
     * Clear history state sau khi đã đọc xong
     * để refresh/back không hiện lại message cũ.
     */
    if (location.state) {
      window.history.replaceState(
        {},
        document.title
      );
    }
  }, [
    location.state,
    navigationState,
  ]);

  /*
   * Auto hide success message.
   */
  useEffect(() => {
    if (!successMessage) {
      return;
    }

    const timer =
      window.setTimeout(
        () => {
          setSuccessMessage(
            ""
          );
        },
        4000
      );

    return () => {
      window.clearTimeout(
        timer
      );
    };
  }, [successMessage]);

  const handleSearch = () => {
    void loadExperiments(
      keyword
    );
  };

  const handleDelete =
    async (
      experiment: ExperimentResponse
    ) => {
      if (
        !isResearcher ||
        deletingId !== null
      ) {
        return;
      }

      const confirmed =
        window.confirm(
          `Are you sure you want to delete "${experiment.experimentName}"?`
        );

      if (!confirmed) {
        return;
      }

      try {
        setDeletingId(
          experiment.experimentId
        );

        setError("");
        setSuccessMessage(
          ""
        );

        await deleteExperiment(
          experiment.experimentId
        );

        await loadExperiments(
          keyword
        );

        setSuccessMessage(
          `Experiment "${experiment.experimentName}" was deleted successfully.`
        );
      } catch (
        deleteError
      ) {
        console.error(
          "Delete experiment failed:",
          deleteError
        );

        setError(
          getErrorMessage(
            deleteError
          )
        );
      } finally {
        setDeletingId(
          null
        );
      }
    };

  /*
   * Filter theo tab đang chọn.
   */
  const filteredExperiments =
    useMemo(() => {
      if (
        selectedStatus ===
        "All"
      ) {
        return experiments;
      }

      return experiments.filter(
        (item) =>
          (
            item.status || ""
          ).toLowerCase() ===
          selectedStatus.toLowerCase()
      );
    }, [
      experiments,
      selectedStatus,
    ]);

  return (
    <DashboardLayout>
      <div className="experiment-page">
        <div className="experiment-header">
          <div>
            <h1>
              Experiments
            </h1>

            <p>
              Create an experiment
              first, then define
              its resource
              requirements and
              prepare an allocation
              plan.
            </p>
          </div>

          {isResearcher && (
            <button
              type="button"
              className="experiment-create-btn"
              onClick={() =>
                navigate(
                  "/experiments/create"
                )
              }
            >
              + Create Experiment
            </button>
          )}
        </div>

        {/* Search */}
        <div className="experiment-toolbar">
          <input
            value={
              keyword
            }
            onChange={(
              event
            ) =>
              setKeyword(
                event.target
                  .value
              )
            }
            onKeyDown={(
              event
            ) => {
              if (
                event.key ===
                "Enter"
              ) {
                handleSearch();
              }
            }}
            placeholder="Search experiments..."
            disabled={
              loading
            }
          />

          <button
            type="button"
            onClick={
              handleSearch
            }
            disabled={
              loading
            }
          >
            {loading
              ? "Searching..."
              : "Search"}
          </button>
        </div>

        {/* Status Filter Tabs */}
        <div className="experiment-tabs-bar">
          {[
            "All",
            "Draft",
            "Submitted",
            "Running",
            "Completed",
            "Cancelled",
          ].map(
            (status) => (
              <button
                key={
                  status
                }
                type="button"
                onClick={() =>
                  setSelectedStatus(
                    status
                  )
                }
                className={`experiment-tab-btn ${
                  selectedStatus ===
                  status
                    ? "active"
                    : ""
                }`}
              >
                {status ===
                "All"
                  ? "All Experiments"
                  : status}
              </button>
            )
          )}
        </div>

        {/* Success */}
        {successMessage && (
          <div
            style={{
              marginBottom:
                "16px",

              padding:
                "12px 16px",

              border:
                "1px solid #bbf7d0",

              background:
                "#f0fdf4",

              color:
                "#166534",

              borderRadius:
                "8px",

              fontSize:
                "14px",

              fontWeight:
                500,
            }}
          >
            {
              successMessage
            }
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="experiment-error">
            {error}
          </div>
        )}

        <div className="experiment-table-card">
          <h3>
            Experiment List
          </h3>

          {loading ? (
            <p className="loading-text">
              Loading
              experiments...
            </p>
          ) : (
            <table className="experiment-table">
              <thead>
                <tr>
                  <th>
                    Experiment
                    Name
                  </th>

                  <th>
                    Priority
                  </th>

                  <th>
                    Status
                  </th>

                  <th>
                    Expected
                    Start
                  </th>

                  <th>
                    Expected End
                  </th>

                  <th>
                    Deadline
                  </th>

                  <th>
                    Researcher
                  </th>

                  <th>
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody>
                {filteredExperiments.length ===
                0 ? (
                  <tr>
                    <td
                      colSpan={
                        8
                      }
                      className="empty-cell"
                    >
                      No
                      experiments
                      found.
                    </td>
                  </tr>
                ) : (
                  filteredExperiments.map(
                    (
                      item
                    ) => {
                      const isDeleting =
                        deletingId ===
                        item.experimentId;

                      const isDraft =
                        (
                          item.status ||
                          ""
                        ).toLowerCase() ===
                        "draft";

                      return (
                        <tr
                          key={
                            item.experimentId
                          }
                        >
                          <td
                            style={{
                              fontWeight:
                                600,
                            }}
                          >
                            {item.experimentName ||
                              "-"}
                          </td>

                          <td>
                            {getPriorityLabel(
                              item.priority
                            )}
                          </td>

                          <td>
                            <span
                              className={getStatusClass(
                                item.status
                              )}
                            >
                              {item.status ||
                                "Unknown"}
                            </span>
                          </td>

                          <td>
                            {formatDate(
                              item.expectStartDate
                            )}
                          </td>

                          <td>
                            {formatDate(
                              item.expectEndDate
                            )}
                          </td>

                          <td>
                            {formatDate(
                              item.deadline
                            )}
                          </td>

                          <td>
                            {item.researcherName ||
                              item.createdByName ||
                              "-"}
                          </td>

                          <td>
                            <div className="experiment-actions">
                              {isDraft &&
                              isResearcher ? (
                                /*
                                 * Draft:
                                 * Researcher mở lại để tiếp tục workflow.
                                 */
                                <button
                                  type="button"
                                  className="action-btn-pill edit !bg-emerald-600 !text-white hover:!bg-emerald-700"
                                  onClick={() =>
                                    navigate(
                                      `/experiments/${item.experimentId}`
                                    )
                                  }
                                  title="Open Draft & Select Planning Method (Manual or AI)"
                                  disabled={
                                    deletingId !==
                                    null
                                  }
                                >
                                  <span>
                                    Open
                                    Draft
                                  </span>
                                </button>
                              ) : (
                                /*
                                 * Experiment không còn Draft:
                                 * chỉ mở Detail bình thường.
                                 */
                                <button
                                  type="button"
                                  className="action-btn-pill view"
                                  onClick={() =>
                                    navigate(
                                      `/experiments/${item.experimentId}`
                                    )
                                  }
                                  disabled={
                                    deletingId !==
                                    null
                                  }
                                >
                                  <Eye
                                    size={
                                      12
                                    }
                                  />

                                  <span>
                                    View
                                  </span>
                                </button>
                              )}

                              {isResearcher && (
                                <button
                                  type="button"
                                  className="action-btn-pill edit"
                                  onClick={() =>
                                    navigate(
                                      `/experiments/${item.experimentId}/edit`
                                    )
                                  }
                                  disabled={
                                    deletingId !==
                                    null
                                  }
                                >
                                  <Pencil
                                    size={
                                      12
                                    }
                                  />

                                  <span>
                                    Edit
                                  </span>
                                </button>
                              )}

                              {isResearcher && (
                                <button
                                  type="button"
                                  className="action-btn-pill delete"
                                  onClick={() =>
                                    void handleDelete(
                                      item
                                    )
                                  }
                                  disabled={
                                    deletingId !==
                                    null
                                  }
                                >
                                  <Trash2
                                    size={
                                      12
                                    }
                                  />

                                  <span>
                                    {isDeleting
                                      ? "Deleting..."
                                      : "Delete"}
                                  </span>
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    }
                  )
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}