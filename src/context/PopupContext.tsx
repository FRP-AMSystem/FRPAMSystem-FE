import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  useEffect,
  type ReactNode,
} from "react";
import { AlertTriangle, CheckCircle2, Info, X } from "lucide-react";
import "./PopupContext.css";
import api from "../services/api";

type PopupType = "confirm" | "alert";
type PopupTone = "danger" | "warning" | "info" | "success";

interface PopupState {
  open: boolean;
  type: PopupType;
  tone: PopupTone;
  title: string;
  message: string;
  confirmText: string;
  cancelText: string;
  resolve?: (value: boolean) => void;
}

interface ConfirmOptions {
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  tone?: PopupTone;
}

interface AlertOptions {
  title?: string;
  message: string;
  confirmText?: string;
  tone?: PopupTone;
}

interface PopupContextValue {
  showConfirm: (messageOrOptions: string | ConfirmOptions) => Promise<boolean>;
  showAlert: (messageOrOptions: string | AlertOptions) => void;
}

const PopupContext = createContext<PopupContextValue | null>(null);

const initialState: PopupState = {
  open: false,
  type: "alert",
  tone: "info",
  title: "Notification",
  message: "",
  confirmText: "OK",
  cancelText: "Cancel",
};

function getDeleteSuccessMessage(
  url: string
): string {
  const normalizedUrl =
    url.toLowerCase();

  const mappings: Array<[
    string,
    string
  ]> = [
    [
      "equipmentinstances",
      "Equipment instance deleted successfully.",
    ],
    [
      "equipmenttypes",
      "Equipment type deleted successfully.",
    ],
    [
      "equipmentcategories",
      "Equipment category deleted successfully.",
    ],
    [
      "equipmentshortagelogs",
      "Equipment shortage log deleted successfully.",
    ],
    [
      "equipmentsubstitutions",
      "Equipment substitution deleted successfully.",
    ],
    [
      "humanresourceprofiles",
      "Human resource profile deleted successfully.",
    ],
    [
      "humanresourceskills",
      "Personnel skill removed successfully.",
    ],
    [
      "skills",
      "Skill deleted successfully.",
    ],
    [
      "landresources",
      "Land resource deleted successfully.",
    ],
    [
      "landrequirements",
      "Land requirement deleted successfully.",
    ],
    [
      "humanrequirements",
      "Human requirement deleted successfully.",
    ],
    [
      "experimentequipmentrequirements",
      "Equipment requirement deleted successfully.",
    ],
    [
      "experimentphases",
      "Experiment phase deleted successfully.",
    ],
    [
      "experiments",
      "Experiment deleted successfully.",
    ],
    [
      "allocationplans",
      "Allocation plan deleted successfully.",
    ],
    [
      "schedules",
      "Schedule deleted successfully.",
    ],
    [
      "notifications",
      "Notification deleted successfully.",
    ],
    [
      "areas",
      "Area deleted successfully.",
    ],
  ];

  const matched =
    mappings.find(
      ([fragment]) =>
        normalizedUrl.includes(
          fragment
        )
    );

  return (
    matched?.[1] ??
    "The item was deleted successfully."
  );
}

export function PopupProvider({ children }: { children: ReactNode }) {
  const [popup, setPopup] = useState<PopupState>(initialState);

  const closePopup = useCallback(
    (result: boolean) => {
      const resolve =
        popup.resolve;

      setPopup(initialState);

      resolve?.(result);
    },
    [popup.resolve]
  );

  const showConfirm = useCallback(
    (messageOrOptions: string | ConfirmOptions): Promise<boolean> => {
      const options: ConfirmOptions =
        typeof messageOrOptions === "string"
          ? { message: messageOrOptions }
          : messageOrOptions;

      return new Promise<boolean>((resolve) => {
        setPopup({
          open: true,
          type: "confirm",
          tone: options.tone ?? "warning",
          title: options.title ?? "Confirm action",
          message: options.message,
          confirmText: options.confirmText ?? "Confirm",
          cancelText: options.cancelText ?? "Cancel",
          resolve,
        });
      });
    },
    []
  );

  const showAlert = useCallback((messageOrOptions: string | AlertOptions) => {
    const options: AlertOptions =
      typeof messageOrOptions === "string"
        ? { message: messageOrOptions }
        : messageOrOptions;

    setPopup({
      open: true,
      type: "alert",
      tone: options.tone ?? "info",
      title: options.title ?? "Notification",
      message: options.message,
      confirmText: options.confirmText ?? "OK",
      cancelText: "Cancel",
    });
  }, []);

  useEffect(() => {
    const interceptorId =
      api.interceptors.response.use(
        (response) => {
          const method =
            response.config.method
              ?.toLowerCase();

          if (method === "delete") {
            const url =
              response.config.url ??
              "";

            showAlert({
              title:
                "Deleted Successfully",

              message:
                getDeleteSuccessMessage(
                  url
                ),

              confirmText:
                "OK",

              tone:
                "success",
            });
          }

          return response;
        },
        (error) =>
          Promise.reject(error)
      );

    return () => {
      api.interceptors.response.eject(
        interceptorId
      );
    };
  }, [showAlert]);

  const value = useMemo(
    () => ({ showConfirm, showAlert }),
    [showConfirm, showAlert]
  );

  const Icon =
    popup.tone === "danger" || popup.tone === "warning"
      ? AlertTriangle
      : popup.tone === "success"
        ? CheckCircle2
        : Info;

  return (
    <PopupContext.Provider value={value}>
      {children}

      {popup.open && (
        <div
          className="app-popup-overlay"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closePopup(false);
            }
          }}
        >
          <div
            className={`app-popup app-popup-${popup.tone}`}
            role="dialog"
            aria-modal="true"
            aria-labelledby="app-popup-title"
          >
            <div className="app-popup-header">
              <div className="app-popup-title-wrap">
                <span className="app-popup-icon">
                  <Icon size={20} />
                </span>
                <h3 id="app-popup-title">{popup.title}</h3>
              </div>
              <button
                type="button"
                className="app-popup-close"
                onClick={() => closePopup(false)}
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            <div className="app-popup-body">
              <p>{popup.message}</p>
            </div>

            <div className="app-popup-footer">
              {popup.type === "confirm" && (
                <button
                  type="button"
                  className="app-popup-btn app-popup-btn-secondary"
                  onClick={() => closePopup(false)}
                >
                  {popup.cancelText}
                </button>
              )}
              <button
                type="button"
                className="app-popup-btn app-popup-btn-primary"
                onClick={() => closePopup(true)}
              >
                {popup.confirmText}
              </button>
            </div>
          </div>
        </div>
      )}
    </PopupContext.Provider>
  );
}

export function usePopup(): PopupContextValue {
  const context = useContext(PopupContext);

  if (!context) {
    throw new Error("usePopup must be used inside PopupProvider.");
  }

  return context;
}
