const ACCESS_TOKEN_KEY = "access_token";
const REFRESH_TOKEN_KEY = "refresh_token";

export function getAccessToken() {
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function getRefreshToken() {
  return localStorage.getItem(REFRESH_TOKEN_KEY);
}

export function setAuthTokens({ access, refresh }) {
  localStorage.setItem(ACCESS_TOKEN_KEY, access);

  if (refresh) {
    localStorage.setItem(REFRESH_TOKEN_KEY, refresh);
  }
}

export function clearAuthTokens() {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
}

export function consumeAuthTokensFromHash() {
  if (typeof window === "undefined") {
    return null;
  }

  const hash = window.location.hash.startsWith("#")
    ? window.location.hash.slice(1)
    : window.location.hash;

  if (!hash) {
    return null;
  }

  const params = new URLSearchParams(hash);
  const access = params.get("access");
  const refresh = params.get("refresh");

  if (!access || !refresh) {
    return null;
  }

  setAuthTokens({ access, refresh });
  window.history.replaceState(
    {},
    document.title,
    `${window.location.pathname}${window.location.search}`
  );

  return { access, refresh };
}
