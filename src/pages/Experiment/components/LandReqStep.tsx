import React, {
  useEffect,
  useState,
} from "react";

import {
  Plus,
  Trash2,
  MapPin,
} from "lucide-react";

import {
  getAllSoilTypes,
} from "../../../services/landResourceService";

import "../PlanningWizard.css";

export interface LandReqFormItem {
  id: string;

  requiredArea: number;

  requiredSoilType?:
    | string
    | null;

  note?:
    | string
    | null;
}

interface LandReqStepProps {
  requirements:
    LandReqFormItem[];

  onChange: (
    requirements: LandReqFormItem[]
  ) => void;
}

export const LandReqStep:
  React.FC<LandReqStepProps> = ({
    requirements,
    onChange,
  }) => {
    const [
      soilTypes,
      setSoilTypes,
    ] = useState<string[]>([]);

    const [
      loadingSoilTypes,
      setLoadingSoilTypes,
    ] = useState(false);

    const [
      soilTypeError,
      setSoilTypeError,
    ] = useState("");

    useEffect(() => {
      const loadSoilTypes =
        async () => {
          try {
            setLoadingSoilTypes(
              true
            );

            setSoilTypeError("");

            const data =
              await getAllSoilTypes();

            setSoilTypes(data);
          } catch (error) {
            console.error(
              "Failed to load soil types:",
              error
            );

            setSoilTypeError(
              "Unable to load soil types."
            );
          } finally {
            setLoadingSoilTypes(
              false
            );
          }
        };

      void loadSoilTypes();
    }, []);

    const handleAddRequirement =
      () => {
        if (
          requirements.length >= 1
        ) {
          return;
        }

        const newReq:
          LandReqFormItem = {
          id: `land-temp-${Date.now()}-${Math.random()}`,

          requiredArea: 100,

          requiredSoilType: "",

          note: "",
        };

        onChange([newReq]);
      };

    const handleRemoveRequirement =
      (id: string) => {
        onChange(
          requirements.filter(
            (r) => r.id !== id
          )
        );
      };

    const handleUpdateRequirement =
      (
        id: string,
        field:
          keyof LandReqFormItem,
        value: unknown
      ) => {
        const updated =
          requirements.map(
            (r) =>
              r.id === id
                ? {
                    ...r,
                    [field]:
                      value,
                  }
                : r
          );

        onChange(updated);
      };

    const hasLand =
      requirements.length >= 1;

    return (
      <div className="planning-card">
        <div className="planning-card-header">
          <div>
            <h2>
              <MapPin
                size={20}
                color="#16a34a"
              />

              Step 5: Land & Soil Requirement
            </h2>

            <p>
              Each experiment
              requires exactly 1
              land plot. Specify
              plot surface area
              (m²), soil type,
              and site
              constraints.
            </p>
          </div>

          {!hasLand ? (
            <button
              type="button"
              onClick={
                handleAddRequirement
              }
              className="btn-primary-green"
            >
              <Plus size={16} />
              Configure Land
            </button>
          ) : (
            <span
              style={{
                display:
                  "inline-flex",

                alignItems:
                  "center",

                gap: "6px",

                padding:
                  "6px 12px",

                background:
                  "#dcfce7",

                color:
                  "#166534",

                borderRadius:
                  "9999px",

                fontSize:
                  "13px",

                fontWeight:
                  600,
              }}
            >
              ✓ 1 Land Resource
              Configured
            </span>
          )}
        </div>

        {!hasLand ? (
          <div className="planning-empty-box">
            <MapPin
              size={40}
            />

            <p>
              No land requirement
              configured yet
              (1 land required
              per experiment)
            </p>

            <button
              type="button"
              onClick={
                handleAddRequirement
              }
              className="btn-primary-green"
            >
              + Configure Land
              Requirement
            </button>
          </div>
        ) : (
          <div>
            {requirements.map(
              (req, index) => (
                <div
                  key={req.id}
                  className="planning-item-row"
                >
                  <div className="planning-item-top">
                    <span className="planning-item-badge">
                      Land Plot Req #
                      {index + 1}
                    </span>

                    <button
                      type="button"
                      onClick={() =>
                        handleRemoveRequirement(
                          req.id
                        )
                      }
                      className="planning-remove-btn"
                      title="Remove requirement"
                    >
                      <Trash2
                        size={16}
                      />
                    </button>
                  </div>

                  <div className="planning-form-grid">
                    <div className="planning-field-group">
                      <label>
                        Required Area
                        (m²){" "}

                        <span className="planning-required">
                          *
                        </span>
                      </label>

                      <input
                        type="number"
                        min={1}
                        value={
                          req.requiredArea
                        }
                        onChange={(
                          e
                        ) =>
                          handleUpdateRequirement(
                            req.id,
                            "requiredArea",
                            Math.max(
                              1,
                              parseFloat(
                                e
                                  .target
                                  .value
                              ) ||
                                1
                            )
                          )
                        }
                        placeholder="e.g. 500"
                        className="planning-input"
                        required
                      />
                    </div>

                    <div className="planning-field-group">
                      <label>
                        Required Soil
                        Type{" "}

                        <span className="planning-required">
                          *
                        </span>
                      </label>

                      <select
                        value={
                          req.requiredSoilType ||
                          ""
                        }
                        onChange={(
                          e
                        ) =>
                          handleUpdateRequirement(
                            req.id,
                            "requiredSoilType",
                            e.target
                              .value
                          )
                        }
                        className="planning-select"
                        disabled={
                          loadingSoilTypes
                        }
                        required
                      >
                        <option value="">
                          {loadingSoilTypes
                            ? "Loading soil types..."
                            : "Select soil type"}
                        </option>

                        {soilTypes.map(
                          (
                            soilType
                          ) => (
                            <option
                              key={
                                soilType
                              }
                              value={
                                soilType
                              }
                            >
                              {
                                soilType
                              }
                            </option>
                          )
                        )}
                      </select>

                      {soilTypeError && (
                        <span
                          style={{
                            display:
                              "block",

                            marginTop:
                              "6px",

                            color:
                              "#dc2626",

                            fontSize:
                              "12px",
                          }}
                        >
                          {
                            soilTypeError
                          }
                        </span>
                      )}

                      {!loadingSoilTypes &&
                        !soilTypeError &&
                        soilTypes.length ===
                          0 && (
                          <span
                            style={{
                              display:
                                "block",

                              marginTop:
                                "6px",

                              color:
                                "#64748b",

                              fontSize:
                                "12px",
                            }}
                          >
                            No soil
                            types
                            available.
                          </span>
                        )}
                    </div>

                    <div className="planning-form-full planning-field-group">
                      <label>
                        Site
                        Requirements /
                        Notes
                      </label>

                      <input
                        type="text"
                        value={
                          req.note ||
                          ""
                        }
                        onChange={(
                          e
                        ) =>
                          handleUpdateRequirement(
                            req.id,
                            "note",
                            e.target
                              .value
                          )
                        }
                        placeholder="e.g. Must be within Compartment 4B, slope < 15 degrees..."
                        className="planning-input"
                      />
                    </div>
                  </div>
                </div>
              )
            )}
          </div>
        )}
      </div>
    );
  };