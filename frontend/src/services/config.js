const rawApiBaseUrl = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000/api/";

export const API_BASE_URL = rawApiBaseUrl.endsWith("/")
  ? rawApiBaseUrl
  : `${rawApiBaseUrl}/`;

export const BACKEND_BASE_URL = API_BASE_URL.replace(/api\/$/, "");
