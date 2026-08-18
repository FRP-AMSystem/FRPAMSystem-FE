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

    const [
        loading,
        setLoading,
    ] = useState(true);

    const [
        saving,
        setSaving,
    ] = useState(false);

    const [
        error,
        setError,
    ] = useState("");

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

    const selectedRole =
        useMemo(() => {
            return roles.find(
                (role) =>
                    role.roleId ===
                    Number(
                        form.roleId
                    )
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

                setExperiments(
                    Array.isArray(
                        experimentData
                    )
                        ? experimentData
                        : []
                );

                const allRoles = Array.isArray(roleData) ? roleData : [];
                const filteredRoles = allRoles.filter((r) => {
                    const normalized = r.roleName.trim().toLowerCase();
                    if (
                        normalized.includes("admin") ||
                        normalized.includes("manager") ||
                        normalized.includes("researcher")
                    ) {
                        return false;
                    }
                    return (
                        normalized === "seasonal" ||
                        normalized.includes("seasonal") ||
                        normalized === "technician" ||
                        normalized.includes("technician")
                    );
                });

                setRoles(
                    filteredRoles.length > 0
                        ? filteredRoles
                        : [
                            { roleId: 4, roleName: "Technician", id: "4", name: "Technician" },
                            { roleId: 5, roleName: "Seasonal", id: "5", name: "Seasonal" },
                        ]
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

                setError(
                    getErrorMessage(
                        loadError
                    )
                );
            } finally {
                setLoading(false);
            }
        }

        void loadFormData();
    }, []);

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

    const handleSubmit = async (
        event: FormEvent<HTMLFormElement>
    ) => {
        event.preventDefault();
        setError("");

        const experimentId =
            Number(
                form.experimentId
            );

        const roleId =
            Number(
                form.roleId
            );

        const quantity =
            Number(
                form.quantity
            );

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
            !Number.isInteger(
                experimentId
            ) ||
            experimentId <= 0
        ) {
            setError(
                "Please select a valid experiment."
            );

            return;
        }

        if (
            !Number.isInteger(
                roleId
            ) ||
            roleId <= 0
        ) {
            setError(
                "Please select a valid role."
            );

            return;
        }

        if (
            !Number.isInteger(
                quantity
            ) ||
            quantity <= 0
        ) {
            setError(
                "Quantity must be a positive integer."
            );

            return;
        }

        if (
            requiredSkillId !== null &&
            (
                !Number.isInteger(
                    requiredSkillId
                ) ||
                requiredSkillId <= 0
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
                "/human-requirements"
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
                            Dashboard / Human Requirements / Create
                        </p>

                        <h1>
                            Create Human Requirement
                        </h1>

                        <p>
                            Add human resource requirements
                            for an experiment before creating
                            an allocation plan.
                        </p>
                    </div>

                    <button
                        type="button"
                        className="requirement-back-button"
                        onClick={() =>
                            navigate(
                                "/human-requirements"
                            )
                        }
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
                    onSubmit={
                        handleSubmit
                    }
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
                            disabled={Boolean(
                                experimentIdFromUrl
                            )}
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
                                        Experiment #
                                        {
                                            experiment.experimentId
                                        }
                                        {" - "}
                                        {
                                            experiment.experimentName
                                        }
                                    </option>
                                )
                            )}
                        </select>

                        <label htmlFor="roleId">
                            Required Role
                        </label>

                        <select
                            id="roleId"
                            name="roleId"
                            value={
                                form.roleId
                            }
                            onChange={
                                handleChange
                            }
                            required
                        >
                            <option value="">
                                Select role
                            </option>

                            {roles.map(
                                (role) => (
                                    <option
                                        key={
                                            role.roleId
                                        }
                                        value={
                                            role.roleId
                                        }
                                    >
                                        Role #
                                        {role.roleId}
                                        {" - "}
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
                                        Skill #
                                        {skill.skillId}
                                        {" - "}
                                        {skill.skillName}
                                    </option>
                                )
                            )}
                        </select>

                        <label htmlFor="quantity">
                            Required Quantity
                        </label>

                        <input
                            id="quantity"
                            type="number"
                            name="quantity"
                            min="1"
                            step="1"
                            value={
                                form.quantity
                            }
                            onChange={
                                handleChange
                            }
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
                            placeholder="Example: 8"
                        />

                        <label htmlFor="note">
                            Note
                        </label>

                        <textarea
                            id="note"
                            name="note"
                            rows={5}
                            value={
                                form.note
                            }
                            onChange={
                                handleChange
                            }
                            placeholder="Enter requirement notes..."
                        />
                    </section>

                    <section className="requirement-form-card">
                        <h2>
                            Requirement Preview
                        </h2>

                        <div className="requirement-preview">
                            <div>
                                <span>
                                    Experiment
                                </span>

                                <strong>
                                    {selectedExperiment
                                        ? selectedExperiment.experimentName
                                        : "Not selected"}
                                </strong>
                            </div>

                            <div>
                                <span>
                                    Experiment ID
                                </span>

                                <strong>
                                    {selectedExperiment
                                        ? `#${selectedExperiment.experimentId}`
                                        : "-"}
                                </strong>
                            </div>

                            <div>
                                <span>
                                    Required Role
                                </span>

                                <strong>
                                    {selectedRole
                                        ? selectedRole.roleName
                                        : "Not selected"}
                                </strong>
                            </div>

                            <div>
                                <span>
                                    Role ID
                                </span>

                                <strong>
                                    {selectedRole
                                        ? `#${selectedRole.roleId}`
                                        : "-"}
                                </strong>
                            </div>

                            <div>
                                <span>
                                    Required Skill
                                </span>

                                <strong>
                                    {selectedSkill
                                        ? selectedSkill.skillName
                                        : "No specific skill"}
                                </strong>
                            </div>

                            <div>
                                <span>
                                    Skill ID
                                </span>

                                <strong>
                                    {selectedSkill
                                        ? `#${selectedSkill.skillId}`
                                        : "-"}
                                </strong>
                            </div>

                            <div>
                                <span>
                                    Quantity
                                </span>

                                <strong>
                                    {form.quantity ||
                                        "-"}
                                </strong>
                            </div>

                            <div>
                                <span>
                                    Hours Per Day
                                </span>

                                <strong>
                                    {form.workingHoursPerDay
                                        ? `${form.workingHoursPerDay} hours`
                                        : "-"}
                                </strong>
                            </div>
                        </div>

                        <div className="requirement-form-actions">
                            <button
                                type="button"
                                className="requirement-cancel-button"
                                disabled={saving}
                                onClick={() =>
                                    navigate(
                                        "/human-requirements"
                                    )
                                }
                            >
                                Cancel
                            </button>

                            <button
                                type="submit"
                                className="requirement-save-button"
                                disabled={
                                    saving ||
                                    !form.experimentId ||
                                    !form.roleId
                                }
                            >
                                {saving
                                    ? "Creating..."
                                    : "Create Human Requirement"}
                            </button>
                        </div>
                    </section>
                </form>
            </div>
        </DashboardLayout>
    );
}