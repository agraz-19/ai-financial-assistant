import { useEffect, useState } from "react";

import {
  fetchCurrentUser,
  loginWithCredentials,
  logout as clearSession,
  refreshAccessToken,
} from "../services/authService";
import {
  consumeAuthTokensFromHash,
  getAccessToken,
  getRefreshToken,
} from "../services/authStorage";
import { AuthContext } from "./authContext";

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const initializeAuth = async () => {
      consumeAuthTokensFromHash();

      const accessToken = getAccessToken();
      const refreshToken = getRefreshToken();

      if (!accessToken && !refreshToken) {
        if (isMounted) {
          setLoading(false);
        }
        return;
      }

      try {
        if (!accessToken && refreshToken) {
          await refreshAccessToken();
        }

        const currentUser = await fetchCurrentUser();

        if (isMounted) {
          setUser(currentUser);
        }
      } catch (error) {
        if (error.response?.status === 401 || error.response?.status === 403) {
          clearSession();
        }
        if (isMounted) {
          setUser(null);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    initializeAuth();

    return () => {
      isMounted = false;
    };
  }, []);

  const login = async (username, password) => {
    await loginWithCredentials(username, password);
    const currentUser = await fetchCurrentUser().catch(() => null);
    setUser(currentUser);
    return currentUser;
  };

  const logout = () => {
    clearSession();
    setUser(null);
  };

  const value = {
    user,
    loading,
    login,
    logout,
    isAuthenticated: Boolean(user || getAccessToken() || getRefreshToken()),
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
