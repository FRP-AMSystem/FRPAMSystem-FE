import axios, {
  AxiosError,
  type InternalAxiosRequestConfig,
} from "axios";
import { clearAuth, getToken } from "../utils/storage";

interface ApiErrorResponse {
  message?: string;
  error?: string;
  title?: string;
  errors?: Record<string, string[]>;
}

const isLocalhost =
  typeof window !== "undefined" &&
  (window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1");

const API_BASE_URL = isLocalhost
  ? "/api"
  : (import.meta.env.VITE_API_BASE_URL as string)
  ? (import.meta.env.VITE_API_BASE_URL as string) + "/api"
  : "http://forestryresourceplanning.runasp.net/api";

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
  timeout: 30_000,
});

api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token =
      getToken() ||
      localStorage.getItem("token") ||
      localStorage.getItem("accessToken");

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error: AxiosError) => {
    return Promise.reject(error);
  }
);

api.interceptors.response.use(
  (response) => response,
  (error: AxiosError<ApiErrorResponse>) => {
    if (error.response?.status === 401) {
      clearAuth();
      if (
        typeof window !== "undefined" &&
        !window.location.pathname.startsWith("/login")
      ) {
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);

export const apiClient = api;
export default api;

