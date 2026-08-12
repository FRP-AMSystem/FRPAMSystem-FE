import axios, {
  AxiosError,
  type InternalAxiosRequestConfig,
} from "axios";
import { getToken } from "../utils/storage";

interface ApiErrorResponse {
  message?: string;
  error?: string;
  title?: string;
  errors?: Record<string, string[]>;
}

const API_BASE_URL =
  (import.meta.env.VITE_API_BASE_URL as string)
    ? (import.meta.env.VITE_API_BASE_URL as string) + "/api"
    : (typeof window !== "undefined" && window.location.hostname === "localhost"
        ? "/api"
        : "http://forestryresourceplanning.runasp.net/api");

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
    return Promise.reject(error);
  }
);

export const apiClient = api;
export default api;

