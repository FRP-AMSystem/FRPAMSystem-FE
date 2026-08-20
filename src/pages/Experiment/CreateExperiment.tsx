import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import {
  ArrowLeft,
  ArrowRight,
  Save,
} from "lucide-react";

import DashboardLayout from "../../layouts/DashboardLayout";

import {
  createExperiment,
  getExperiments,
} from "../../services/experimentService";

import {
  createExperimentPhase,
} from "../../services/experimentPhaseService";

import {
  createExperimentEquipmentRequirement,
} from "../../services/experimentEquipmentRequirementService";

import {
  createExperimentHumanRequirement,
} from "../../services/experimentHumanRequirementService";

import {
  createExperimentLandRequirement,
} from "../../services/experimentLandRequirementService";

import {
  useNotification,
} from "../../context/NotificationContext";

import {
  PlanningStepper,
} from "./components/PlanningStepper";

import {
  ExperimentStep,
  type ExperimentStepData,
} from "./components/ExperimentStep";

import {
  PhasesStep,
  type PhaseFormItem,
} from "./components/PhasesStep";

import {
  EquipmentReqStep,
  type EquipmentReqFormItem,
} from "./components/EquipmentReqStep";

import {
  HumanReqStep,
  type HumanReqFormItem,
  isAllowedRole,
} from "./components/HumanReqStep";

import {
  LandReqStep,
  type LandReqFormItem,
} from "./components/LandReqStep";

import "./PlanningWizard.css";

function convertDateToIso(
  dateStr?: string | null
): string {
  if (!dateStr) {
    const now = new Date();

    const y = now.getFullYear();

    const m = String(
      now.getMonth() + 1
    ).padStart(2, "0");

    const d = String(
      now.getDate()
    ).padStart(2, "0");

    return `${y}-${m}-${d}T00:00:00`;
  }

  const clean =
    dateStr.slice(0, 10);

  return `${clean}T00:00:00`;
}

function getApiErrorMessage(
  error: unknown
): string {
  if (!axios.isAxiosError(error)) {
    if (error instanceof Error) {
      return error.message;
    }

    return "Create experiment failed.";
  }

  const responseData =
    error.response?.data;

  if (
    typeof responseData ===
      "string" &&
    responseData.trim()
  ) {
    return responseData;
  }

  if (
    responseData &&
    typeof responseData ===
      "object" &&
    "errors" in responseData
  ) {
    const errors = (
      responseData as {
        errors?: Record<
          string,
          unknown
        >;
      }
    ).errors;

    if (errors) {
      const messages =
        Object.entries(errors)
          .flatMap(
            ([field, value]) => {
              const fieldErrors =
                Array.isArray(
                  value
                )
                  ? value
                  : [
                      String(
                        value
                      ),
                    ];

              return fieldErrors.map(
                (message) =>
                  `${field}: ${String(
                    message
                  )}`
              );
            }
          )
          .join(" ");

      if (messages) {
        return messages;
      }
    }
  }

  if (
    responseData &&
    typeof responseData ===
      "object"
  ) {
    const data =
      responseData as {
        message?: string;
        error?: string;
        title?: string;
        detail?: string;
      };

    return (
      data.message ||
      data.error ||
      data.title ||
      data.detail ||
      `Create experiment failed${
        error.response?.status
          ? ` (${error.response.status})`
          : ""
      }.`
    );
  }

  return `Create experiment failed${
    error.response?.status
      ? ` (${error.response.status})`
      : ""
  }.`;
}

export default function CreateExperiment() {
  const navigate =
    useNavigate();

  const {
    sendLocalNotification,
    fetchUnreadCount,
  } = useNotification();

  const [
    currentStep,
    setCurrentStep,
  ] = useState(1);

  const [
    expData,
    setExpData,
  ] =
    useState<ExperimentStepData>({
      experimentName: "",
      description: "",
      expectStartDate: "",
      expectEndDate: "",
      deadline: "",
      priority: "1",
    });

  const [
    phases,
    setPhases,
  ] =
    useState<PhaseFormItem[]>([]);

  const [
    equipmentReqs,
    setEquipmentReqs,
  ] =
    useState<
      EquipmentReqFormItem[]
    >([]);

  const [
    humanReqs,
    setHumanReqs,
  ] =
    useState<
      HumanReqFormItem[]
    >([]);

  const [
    landReqs,
    setLandReqs,
  ] =
    useState<
      LandReqFormItem[]
    >([]);

  const [
    saving,
    setSaving,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState("");

  const handleNextStep = () => {
    setError("");

    if (currentStep === 1) {
      if (
        !expData.experimentName.trim()
      ) {
        setError(
          "Experiment name is required."
        );

        return;
      }

      if (
        expData.expectStartDate &&
        expData.expectEndDate &&
        expData.expectStartDate >
          expData.expectEndDate
      ) {
        setError(
          "Expected end date must be after expected start date."
        );

        return;
      }

      if (
        expData.deadline &&
        expData.expectEndDate &&
        expData.deadline <
          expData.expectEndDate
      ) {
        setError(
          "Submission deadline must be on or after expected end date."
        );

        return;
      }

      if (
        expData.deadline &&
        expData.expectStartDate &&
        expData.deadline <
          expData.expectStartDate
      ) {
        setError(
          "Submission deadline cannot be earlier than start date."
        );

        return;
      }
    }

    if (currentStep === 4) {
      for (
        const hr of humanReqs
      ) {
        if (
          hr.roleName &&
          !isAllowedRole(
            hr.roleName
          )
        ) {
          setError(
            `Invalid role "${hr.roleName}". Only Seasonal and Technician roles are allowed.`
          );

          return;
        }
      }
    }

    if (
      currentStep === 5 &&
      landReqs.length > 1
    ) {
      setError(
        "An experiment can have at most one Land Resource requirement."
      );

      return;
    }

    if (currentStep < 5) {
      setCurrentStep(
        (prev) => prev + 1
      );
    }
  };

  const handlePrevStep = () => {
    setError("");

    if (currentStep > 1) {
      setCurrentStep(
        (prev) => prev - 1
      );
    }
  };

  const resolveResearcherId =
    (): number => {
      const rawUserId =
        localStorage.getItem(
          "userId"
        ) ||
        localStorage.getItem(
          "researcherId"
        ) ||
        localStorage.getItem(
          "id"
        );

      const parsed =
        Number(rawUserId);

      if (
        Number.isInteger(
          parsed
        ) &&
        parsed > 0
      ) {
        return parsed;
      }

      return 1;
    };

  /*
   * CREATE PLAN
   *
   * Flow:
   *
   * 1. Create Experiment = Draft
   * 2. Save phases
   * 3. Save equipment requirements
   * 4. Save human requirements
   * 5. Save land requirement
   * 6. DO NOT submit
   * 7. Redirect to Experiments / Draft
   */
  const handleCreatePlan =
    async () => {
      setError("");

      const trimmedName =
        expData.experimentName.trim();

      if (!trimmedName) {
        setError(
          "Experiment name is required."
        );

        setCurrentStep(1);

        return;
      }

      if (
        expData.expectStartDate &&
        expData.expectEndDate &&
        expData.expectStartDate >
          expData.expectEndDate
      ) {
        setError(
          "Expected end date must be after expected start date."
        );

        setCurrentStep(1);

        return;
      }

      if (
        expData.deadline &&
        expData.expectEndDate &&
        expData.deadline <
          expData.expectEndDate
      ) {
        setError(
          "Submission deadline must be on or after expected end date."
        );

        setCurrentStep(1);

        return;
      }

      if (
        landReqs.length > 1
      ) {
        setError(
          "An experiment can have at most one Land Resource requirement."
        );

        return;
      }

      for (
        const hr of humanReqs
      ) {
        if (
          hr.roleName &&
          !isAllowedRole(
            hr.roleName
          )
        ) {
          setError(
            `Invalid role "${hr.roleName}". Only Seasonal and Technician roles are allowed.`
          );

          return;
        }
      }

      setSaving(true);

      try {
        /*
         * Check duplicate experiment name
         */
        try {
          const existingList =
            await getExperiments(
              {
                keyword:
                  trimmedName,

                size: 20,
              }
            );

          const isDuplicate =
            (
              existingList ||
              []
            ).some(
              (item) =>
                item.experimentName
                  ?.trim()
                  .toLowerCase() ===
                trimmedName.toLowerCase()
            );

          if (isDuplicate) {
            setError(
              `An experiment plan named "${trimmedName}" already exists in the system. Please choose a different name.`
            );

            setCurrentStep(1);

            return;
          }
        } catch (
          checkError
        ) {
          console.warn(
            "Could not check duplicate experiment name:",
            checkError
          );
        }

        /*
         * STEP 1
         * Create Experiment as DRAFT
         */
        const createdExp =
          await createExperiment(
            {
              experimentName:
                trimmedName,

              description:
                expData.description
                  .trim() ||
                undefined,

              researcherId:
                resolveResearcherId(),

              expectStartDate:
                convertDateToIso(
                  expData.expectStartDate
                ),

              expectEndDate:
                convertDateToIso(
                  expData.expectEndDate
                ),

              deadline:
                convertDateToIso(
                  expData.deadline
                ),

              priority:
                Number(
                  expData.priority
                ) || 1,

              status: "Draft",
            }
          );

        if (
          !createdExp ||
          !createdExp.experimentId
        ) {
          throw new Error(
            "Experiment creation returned an empty response."
          );
        }

        const expId =
          createdExp.experimentId;

        /*
         * STEP 2
         * Save experiment phases
         */
        const orderedPhases =
          phases.map(
            (
              phase,
              index
            ) => ({
              ...phase,

              phaseOrder:
                index + 1,
            })
          );

        for (
          const phase of
          orderedPhases
        ) {
          if (
            !phase.phaseName.trim()
          ) {
            continue;
          }

          try {
            await createExperimentPhase(
              {
                experimentId:
                  expId,

                phaseName:
                  phase.phaseName.trim(),

                phaseDescription:
                  phase.phaseDescription
                    .trim() ||
                  null,

                phaseOrder:
                  phase.phaseOrder,

                expectedStartDate:
                  convertDateToIso(
                    phase.expectedStartDate
                  ),

                expectedEndDate:
                  convertDateToIso(
                    phase.expectedEndDate
                  ),

                status:
                  "Planned",
              }
            );
          } catch (
            phaseError
          ) {
            console.warn(
              "Phase creation failed:",
              phaseError
            );
          }
        }

        /*
         * STEP 3
         * Save equipment requirements
         */
        for (
          const equipment of
          equipmentReqs
        ) {
          try {
            const matchedPhase =
              phases.find(
                (phase) =>
                  String(
                    phase.id
                  ) ===
                  String(
                    equipment.phaseId
                  )
              ) ||
              (phases.length ===
              1
                ? phases[0]
                : null);

            const phaseName =
              matchedPhase?.phaseName ||
              equipment.phaseName ||
              "";

            const phasePrefix =
              phaseName
                ? `[${phaseName}] `
                : "";

            const cleanNote =
              (
                equipment.note ||
                ""
              ).replace(
                /^\[.*?\]\s*/,
                ""
              );

            const finalNote =
              cleanNote
                ? `${phasePrefix}${cleanNote}`.trim()
                : phasePrefix
                  ? phasePrefix.trim()
                  : undefined;

            await createExperimentEquipmentRequirement(
              {
                experimentId:
                  expId,

                equipmentTypeId:
                  equipment.equipmentTypeId,

                quantity:
                  equipment.quantity,

                allowSubstitute:
                  equipment.allowSubstitute,

                minAcceptableEfficiency:
                  equipment.minAcceptableEfficiency,

                note:
                  finalNote,
              }
            );
          } catch (
            equipmentError
          ) {
            console.warn(
              "Equipment requirement creation failed:",
              equipmentError
            );
          }
        }

        /*
         * STEP 4
         * Save human requirements
         */
        for (
          const human of
          humanReqs
        ) {
          try {
            const matchedPhase =
              phases.find(
                (phase) =>
                  String(
                    phase.id
                  ) ===
                  String(
                    human.phaseId
                  )
              ) ||
              (phases.length ===
              1
                ? phases[0]
                : null);

            const phaseName =
              matchedPhase?.phaseName ||
              human.phaseName ||
              "";

            const phasePrefix =
              phaseName
                ? `[${phaseName}] `
                : "";

            const cleanNote =
              (
                human.note ||
                ""
              ).replace(
                /^\[.*?\]\s*/,
                ""
              );

            const finalNote =
              cleanNote
                ? `${phasePrefix}${cleanNote}`.trim()
                : phasePrefix
                  ? phasePrefix.trim()
                  : null;

            await createExperimentHumanRequirement(
              {
                experimentId:
                  expId,

                roleId:
                  human.roleId,

                quantity:
                  human.quantity,

                requiredSkillId:
                  human.requiredSkillId ??
                  null,

                workingHoursPerDay:
                  human.workingHoursPerDay ??
                  null,

                note:
                  finalNote,
              }
            );
          } catch (
            humanError
          ) {
            console.warn(
              "Human requirement creation failed:",
              humanError
            );
          }
        }

        /*
         * STEP 5
         * Save max 1 land requirement
         */
        if (
          landReqs.length >
          0
        ) {
          const land =
            landReqs[0];

          try {
            await createExperimentLandRequirement(
              {
                experimentId:
                  expId,

                requiredArea:
                  land.requiredArea,

                requiredSoilType:
                  land.requiredSoilType ||
                  "",

                note:
                  land.note ||
                  null,
              }
            );
          } catch (
            landError
          ) {
            console.warn(
              "Land requirement creation failed:",
              landError
            );
          }
        }

        /*
         * IMPORTANT:
         *
         * Không gọi:
         *
         * POST /Experiments/{id}/submit
         *
         * vì Create Plan chỉ lưu DRAFT.
         */

        sendLocalNotification(
          {
            title:
              "Experiment Draft Created",

            message: `Experiment "${createdExp.experimentName}" has been saved as Draft.`,

            notificationType:
              "Success",

            referenceType:
              "Experiment",

            referenceId:
              expId,
          }
        );

        void fetchUnreadCount();

        /*
         * Quay lại Experiment List
         * và yêu cầu mở tab Draft.
         */
        navigate(
          "/experiments",
          {
            state: {
              selectedStatus:
                "Draft",

              message: `Experiment "${createdExp.experimentName}" was saved as Draft.`,

              experimentId:
                expId,
            },
          }
        );
      } catch (
        createError: unknown
      ) {
        console.error(
          "Create Experiment failed:",
          createError
        );

        if (
          axios.isAxiosError(
            createError
          ) &&
          createError.response
            ?.data
        ) {
          console.error(
            "Backend Error Detail:",
            createError
              .response.data
          );
        }

        const apiMessage =
          getApiErrorMessage(
            createError
          );

        if (
          apiMessage.includes(
            "500"
          ) ||
          apiMessage
            .toLowerCase()
            .includes(
              "internal server error"
            )
        ) {
          setError(
            `Failed to create experiment. The name "${trimmedName}" might be duplicated or the data is invalid. Please check the name.`
          );
        } else {
          setError(
            apiMessage
          );
        }
      } finally {
        setSaving(false);
      }
    };

  return (
    <DashboardLayout>
      <div className="planning-wizard-page">
        <div className="planning-wizard-header">
          <div>
            <p className="breadcrumb">
              Dashboard / Experiments /
              New Experiment
            </p>

            <h1>
              New Experiment
            </h1>

            <p>
              Step-by-step experiment
              creation wizard
            </p>
          </div>

          <div
            style={{
              display: "flex",
              alignItems:
                "center",
              gap: "12px",
            }}
          >
            <button
              type="button"
              onClick={() =>
                navigate(
                  "/experiments"
                )
              }
              className="planning-back-btn"
            >
              <ArrowLeft
                size={16}
              />

              Back to Experiments
            </button>
          </div>
        </div>

        <PlanningStepper
          currentStep={
            currentStep
          }
          onStepClick={(
            step
          ) =>
            setCurrentStep(
              step
            )
          }
        />

        {error && (
          <div className="planning-alert-error">
            {error}
          </div>
        )}

        {currentStep ===
          1 && (
          <ExperimentStep
            data={expData}
            onChange={(
              updated
            ) =>
              setExpData(
                (prev) => ({
                  ...prev,
                  ...updated,
                })
              )
            }
          />
        )}

        {currentStep ===
          2 && (
          <PhasesStep
            phases={phases}
            onChange={
              setPhases
            }
            baseStartDate={
              expData.expectStartDate
            }
            baseEndDate={
              expData.expectEndDate
            }
          />
        )}

        {currentStep ===
          3 && (
          <EquipmentReqStep
            phases={phases}
            requirements={
              equipmentReqs
            }
            onChange={
              setEquipmentReqs
            }
          />
        )}

        {currentStep ===
          4 && (
          <HumanReqStep
            phases={phases}
            requirements={
              humanReqs
            }
            onChange={
              setHumanReqs
            }
          />
        )}

        {currentStep ===
          5 && (
          <LandReqStep
            requirements={
              landReqs
            }
            onChange={
              setLandReqs
            }
          />
        )}

        <div className="planning-actions-bar">
          <button
            type="button"
            onClick={
              handlePrevStep
            }
            disabled={
              currentStep ===
                1 ||
              saving
            }
            className="btn-secondary-white"
          >
            <ArrowLeft
              size={16}
            />

            Back
          </button>

          {currentStep <
          5 ? (
            <button
              type="button"
              onClick={
                handleNextStep
              }
              disabled={
                saving
              }
              className="btn-primary-green"
            >
              Next

              <ArrowRight
                size={16}
              />
            </button>
          ) : (
            <button
              type="button"
              onClick={() =>
                void handleCreatePlan()
              }
              disabled={
                saving
              }
              className="btn-primary-green"
              style={{
                padding:
                  "12px 28px",
                fontSize:
                  "15px",
              }}
            >
              {saving ? (
                <>
                  Saving Draft...
                </>
              ) : (
                <>
                  <Save
                    size={18}
                  />

                  Create Plan
                  (Save Draft)
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}