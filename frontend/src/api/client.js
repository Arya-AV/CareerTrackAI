import axios from "axios";

const defaultApiBaseUrl = () => {
  if (import.meta.env.VITE_API_BASE_URL) {
    return import.meta.env.VITE_API_BASE_URL;
  }

  if (typeof window !== "undefined") {
    return `${window.location.protocol}//${window.location.hostname}:5000`;
  }

  return "http://localhost:5000";
};

export const api = axios.create({
  baseURL: defaultApiBaseUrl(),
  withCredentials: true
});

export const publicApi = axios.create({
  baseURL: defaultApiBaseUrl(),
  withCredentials: true
});

let accessToken = null;

export const setAccessToken = (token) => {
  accessToken = token;
};

api.interceptors.request.use((config) => {
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const isAuthRoute = originalRequest.url?.startsWith("/api/auth/");

    if (error.response?.status === 401 && !originalRequest._retry && !isAuthRoute) {
      originalRequest._retry = true;
      const refreshResponse = await api.post("/api/auth/refresh");
      setAccessToken(refreshResponse.data.accessToken);
      originalRequest.headers.Authorization = `Bearer ${refreshResponse.data.accessToken}`;
      return api(originalRequest);
    }

    return Promise.reject(error);
  }
);
