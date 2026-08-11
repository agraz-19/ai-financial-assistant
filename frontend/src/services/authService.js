import axios from "axios";

import { API_BASE_URL } from "./config";
import {
  clearAuthTokens,
  getAccessToken,
  getRefreshToken,
  setAuthTokens,
} from "./authStorage";

const authClient = axios.create({
  baseURL: API_BASE_URL,
});

export async function loginWithCredentials(username, password) {
  const { data } = await authClient.post("token/", {
    username,
    password,
  });

  setAuthTokens({
    access: data.access,
    refresh: data.refresh,
  });

  return data;
}

export async function refreshAccessToken() {
  const refreshToken = getRefreshToken();

  if (!refreshToken) {
    throw new Error("Missing refresh token");
  }

  const { data } = await authClient.post("token/refresh/", {
    refresh: refreshToken,
  });

  setAuthTokens({
    access: data.access,
    refresh: data.refresh || refreshToken,
  });

  return data.access;
}

export async function fetchCurrentUser() {
  const accessToken = getAccessToken();

  if (!accessToken) {
    throw new Error("Missing access token");
  }

  try {
    const { data } = await authClient.get("me/", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    return data;
  } catch (error) {
    if (error.response?.status === 401 && getRefreshToken()) {
      const newAccessToken = await refreshAccessToken();
      const { data } = await authClient.get("me/", {
        headers: {
          Authorization: `Bearer ${newAccessToken}`,
        },
      });

      return data;
    }

    throw error;
  }
}

export function logout() {
  clearAuthTokens();
}

export async function registerAccount({ username, email, password }) {
  const { data } = await authClient.post("register/", {
    username,
    email,
    password,
  });

  setAuthTokens({
    access: data.access,
    refresh: data.refresh,
  });

  return data;
}