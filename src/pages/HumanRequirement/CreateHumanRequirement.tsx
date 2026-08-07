import {
  useEffect,
  useMemo,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";

import {
  useNavigate,
  useSearchParams,
} from "react-router-dom";

import DashboardLayout from "../../layouts/DashboardLayout";

import {
  getExperiments,
} from "../../services/experimentService";

import {
  getRoles,
} from "../../services/roleService";

import {
  getSkills,
} from "../../services/skillService";

import {
  createExperimentHumanRequirement,
} from "../../services/experimentHumanRequirementService";

import type {
  ExperimentResponse,
} from "../../types/experiment";

import type {
  RoleResponse,
} from "../../types/role";

import type {
  SkillResponse,
} from "../../types/skill";

import "../ExperimentEquipmentRequirement/RequirementForm.css";

interface HumanRequirementFormState {
  experimentId: string;
  roleId: string;
  quantity: string;
  requiredSkillId: string;
  workingHoursPerDay: string;
  note: string;
}

function getErrorMessage(
  error: unknown
): string {
  if (
    typeof error === "object" &&
    error !== null &&
    "response" in error
  ) {
    const response = (
      error as {
        response?: {
          data?: {
            message?: string;
            title?: string;
            errors?: Record<
              string,
              string[]
            >;
          };
        };
      }
    ).response;

    if (response?.data?.message) {
      return response.data.message;
    }

    if (response?.data?.errors) {
      return Object.values(
        response.data.errors
      )
        .flat()
        .join(" ");
    }

    if (response?.data?.title) {
      return response.data.title;
    }
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Cannot create human requirement.";
}

function isPositiveInteger(
  value: number
): boolean {
  return (
    Number.isInteger(value) &&
    value > 0
  );
}


function isDraftExperimentStatus(
  status?: string | null
): boolean {
  return (
    status === "Draft" ||
    status === "Created"
  );
}

export default function CreateHumanRequirement() {
  const navigate = useNavigate();
  const [searchParams] =
    useSearchParams();

  const experimentIdFromUrl =
    searchParams.get(
      "experimentId"
    ) ?? "";

  const [
    experiments,
    setExperiments,
  ] = useState<
    ExperimentResponse[]
  >([]);

  const [
    roles,
    setRoles,
  ] = useState<
    RoleResponse[]
  >([]);

  const [
    skills,
    setSkills,
  ] = useState<
    SkillResponse[]
  >([]);

  const [
    form,
    setForm,
  ] = useState<HumanRequirementFormState>({
    experimentId:
      experimentIdFromUrl,
    roleId: "",
    quantity: "1",
    requiredSkillId: "",
    workingHoursPerDay: "8",
    note: "",
  });

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [error, setError] =
    useState("");

  const selectedExperiment =
    useMemo(() => {
      return experiments.find(
        (experiment) =>
          experiment.experimentId ===
          Number(
            form.experimentId
          )
      );
    }, [
      experiments,
      form.experimentId,
    ]);

  const selectedExperimentIsEditable =
    selectedExperiment
      ? isDraftExperimentStatus(
          selectedExperiment.status
        )
      : false;

  const selectedRole =
    useMemo(() => {
      return roles.find(
        (role) =>
          role.roleId ===
          Number(form.roleId)
      );
    }, [
      roles,
      form.roleId,
    ]);

  const selectedSkill =
    useMemo(() => {
      return skills.find(
        (skill) =>
          skill.skillId ===
          Number(
            form.requiredSkillId
          )
      );
    }, [
      skills,
      form.requiredSkillId,
    ]);

  useEffect(() => {
    let active = true;

    async function loadFormData() {
      try {
        setLoading(true);
        setError("");

        const [
          experimentData,
          roleData,
          skillData,
        ] = await Promise.all([
          getExperiments({
            page: 1,
            size: 100,
          }),
          getRoles({
            page: 1,
            size: 100,
          }),
          getSkills({
            page: 1,
            size: 100,
          }),
        ]);

        if (!active) {
          return;
        }

        setExperiments(
          Array.isArray(
            experimentData
          )
            ? experimentData
            : []
        );

        setRoles(
          Array.isArray(roleData)
            ? roleData
            : []
        );

        setSkills(
          Array.isArray(skillData)
            ? skillData
            : []
        );
      } catch (loadError) {
        console.error(
          "Load human requirement form failed:",
          loadError
        );

        if (active) {
          setError(
            getErrorMessage(
              loadError
            )
          );
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void loadFormData();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!experimentIdFromUrl) {
      return;
    }

    setForm(
      (current) => ({
        ...current,
        experimentId:
          experimentIdFromUrl,
      })
    );
  }, [experimentIdFromUrl]);

  const handleChange = (
    event: ChangeEvent<
      | HTMLInputElement
      | HTMLSelectElement
      | HTMLTextAreaElement
    >
  ) => {
    const {
      name,
      value,
    } = event.target;

    setError("");

    setForm(
      (current) => ({
        ...current,
        [name]: value,
      })
    );
  };

  const goBack = () => {
    const experimentId =
      Number(
        form.experimentId ||
        experimentIdFromUrl
      );

    if (
      isPositiveInteger(
        experimentId
      )
    ) {
      navigate(
        `/human-requirements?experimentId=${experimentId}`
      );
      return;
    }

    navigate(
      "/human-requirements"
    );
  };

  const handleSubmit = async (
    event: FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();
    setError("");

    const experimentId =
      Number(form.experimentId);

    const roleId =
      Number(form.roleId);

    const quantity =
      Number(form.quantity);

    const requiredSkillId =
      form.requiredSkillId
        ? Number(
            form.requiredSkillId
          )
        : null;

    const workingHoursPerDay =
      form.workingHoursPerDay
        ? Number(
            form.workingHoursPerDay
          )
        : null;

    if (
      !isPositiveInteger(
        experimentId
      )
    ) {
      setError(
        "Please select a valid experiment."
      );
      return;
    }

    if (
      !selectedExperiment ||
      !selectedExperimentIsEditable
    ) {
      setError(
        "Human requirements can only be created while the experiment is in Draft status."
      );
      return;
    }

    if (
      !isPositiveInteger(
        roleId
      )
    ) {
      setError(
        "Please select a valid role."
      );
      return;
    }

    if (
      !isPositiveInteger(
        quantity
      )
    ) {
      setError(
        "Quantity must be a positive integer."
      );
      return;
    }

    if (
      requiredSkillId !== null &&
      !isPositiveInteger(
        requiredSkillId
      )
    ) {
      setError(
        "Required skill is invalid."
      );
      return;
    }

    if (
      workingHoursPerDay !== null &&
      (
        !Number.isFinite(
          workingHoursPerDay
        ) ||
        workingHoursPerDay <= 0 ||
        workingHoursPerDay > 24
      )
    ) {
      setError(
        "Working hours per day must be greater than 0 and not exceed 24."
      );
      return;
    }

    try {
      setSaving(true);

      await createExperimentHumanRequirement({
        experimentId,
        roleId,
        quantity,
        requiredSkillId,
        workingHoursPerDay,
        note:
          form.note.trim() ||
          null,
      });

      navigate(
        `/human-requirements?experimentId=${experimentId}`,
        {
          replace: true,
        }
      );
    } catch (submitError) {
      console.error(
        "Create human requirement failed:",
        submitError
      );

      setError(
        getErrorMessage(
          submitError
        )
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="requirement-form-page">
          <div className="requirement-form-loading">
            Loading human requirement form...
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="requirement-form-page">
        <div className="requirement-form-header">
          <div>
            <p className="requirement-breadcrumb">
              {experimentIdFromUrl
                ? `Dashboard / Experiments / #${experimentIdFromUrl} / Human Requirements / Create`
                : "Dashboard / Human Requirements / Create"}
            </p>

            <h1>
              Create Human Requirement
            </h1>

            <p>
              Define the personnel needed for the selected experiment before allocation planning.
            </p>
          </div>

          <button
            type="button"
            className="requirement-back-button"
            onClick={goBack}
          >
            ← Back
          </button>
        </div>

        {error && (
          <div className="requirement-form-error">
            {error}
          </div>
        )}

        <form
          className="requirement-form-layout"
          onSubmit={handleSubmit}
        >
          <section className="requirement-form-card">
            <h2>
              Human Requirement Information
            </h2>

            <label htmlFor="experimentId">
              Experiment
            </label>

            <select
              id="experimentId"
              name="experimentId"
              value={
                form.experimentId
              }
              onChange={
                handleChange
              }
              disabled={
                saving ||
                Boolean(
                  experimentIdFromUrl
                )
              }
              required
            >
              <option value="">
                Select experiment
              </option>

              {experiments.map(
                (experiment) => (
                  <option
                    key={
                      experiment.experimentId
                    }
                    value={
                      experiment.experimentId
                    }
                  >
                    {experiment.experimentName}
                  </option>
                )
              )}
            </select>

            {selectedExperiment && (
              <div className="form-note">
                Linked to:{" "}
                {
                  selectedExperiment.experimentName
                }
              </div>
            )}

            <label htmlFor="roleId">
              Required Role
            </label>

            <select
              id="roleId"
              name="roleId"
              value={form.roleId}
              onChange={
                handleChange
              }
              disabled={saving}
              required
            >
              <option value="">
                Select role
              </option>

              {roles.map(
                (role) => (
                  <option
                    key={role.roleId}
                    value={role.roleId}
                  >
                    {role.roleName}
                  </option>
                )
              )}
            </select>

            <label htmlFor="requiredSkillId">
              Required Skill
            </label>

            <select
              id="requiredSkillId"
              name="requiredSkillId"
              value={
                form.requiredSkillId
              }
              onChange={
                handleChange
              }
              disabled={saving}
            >
              <option value="">
                No specific skill required
              </option>

              {skills.map(
                (skill) => (
                  <option
                    key={
                      skill.skillId
                    }
                    value={
                      skill.skillId
                    }
                  >
                    {skill.skillName}
                  </option>
                )
              )}
            </select>

            <label htmlFor="quantity">
              Quantity
            </label>

            <input
              id="quantity"
              type="number"
              name="quantity"
              min="1"
              step="1"
              value={form.quantity}
              onChange={
                handleChange
              }
              disabled={saving}
              required
            />

            <label htmlFor="workingHoursPerDay">
              Working Hours Per Day
            </label>

            <input
              id="workingHoursPerDay"
              type="number"
              name="workingHoursPerDay"
              min="0.5"
              max="24"
              step="0.5"
              value={
                form.workingHoursPerDay
              }
              onChange={
                handleChange
              }
              disabled={saving}
            />

            <label htmlFor="note">
              Note
            </label>

            <textarea
              id="note"
              name="note"
              rows={4}
              value={form.note}
              onChange={
                handleChange
              }
              disabled={saving}
              placeholder="Optional note..."
            />
          </section>

          <section className="requirement-form-card">
            <h2>Preview</h2>

            <div className="requirement-preview">
              <div>
                <span>Experiment</span>
                <strong>
                  {selectedExperiment
                    ? selectedExperiment.experimentName
                    : "Not selected"}
                </strong>
              </div>

              <div>
                <span>Required Role</span>
                <strong>
                  {selectedRole
                    ? selectedRole.roleName
                    : "Not selected"}
                </strong>
              </div>

              <div>
                <span>Required Skill</span>
                <strong>
                  {selectedSkill
                    ? selectedSkill.skillName
                    : "No specific skill"}
                </strong>
              </div>

              <div>
                <span>Quantity</span>
                <strong>
                  {form.quantity || "-"}
                </strong>
              </div>

              <div>
                <span>
                  Working Hours / Day
                </span>
                <strong>
                  {form.workingHoursPerDay ||
                    "-"}
                </strong>
              </div>
            </div>

            <div className="requirement-form-actions">
              <button
                type="button"
                className="requirement-cancel-button"
                onClick={goBack}
                disabled={saving}
              >
                Cancel
              </button>

              <button
                type="submit"
                className="requirement-save-button"
                disabled={
                  saving ||
                  !selectedExperimentIsEditable ||
                  !form.experimentId ||
                  !form.roleId ||
                  !form.quantity
                }
              >
                {saving
                  ? "Creating..."
                  : "Create Requirement"}
              </button>
            </div>
          </section>
        </form>
      </div>
    </DashboardLayout>
  );
}
