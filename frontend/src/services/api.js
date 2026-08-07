import axios from "axios";

import { API_BASE_URL } from "./config";
import { clearAuthTokens, getAccessToken } from "./authStorage";
import { refreshAccessToken } from "./authService";

const api = axios.create({
  baseURL: API_BASE_URL,
});

api.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const status = error.response?.status;
    const requestUrl = originalRequest?.url || "";
    const isTokenEndpoint = requestUrl.includes("token/");

    if (
      status !== 401 ||
      !originalRequest ||
      originalRequest._retry ||
      isTokenEndpoint
    ) {
      if (status === 401 && !isTokenEndpoint) {
        clearAuthTokens();
        if (window.location.pathname !== "/login") {
          window.location.assign("/login");
        }
      }

      return Promise.reject(error);
    }

    originalRequest._retry = true;

    try {
      const newAccessToken = await refreshAccessToken();
      originalRequest.headers = originalRequest.headers ?? {};
      originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
      return api(originalRequest);
    } catch (refreshError) {
      clearAuthTokens();
      if (window.location.pathname !== "/login") {
        window.location.assign("/login");
      }
      return Promise.reject(refreshError);
    }
  }
);

export default api;
