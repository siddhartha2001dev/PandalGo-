import axios from 'axios';

// In local Vite development, use the configured proxy so auth cookies stay same-origin.
// In Vercel/production, the Vercel rewrite proxies /api to Render. Set VITE_API_URL
// only when deploying without that rewrite or when using a custom API domain.
const configuredApiUrl = import.meta.env.VITE_API_URL?.trim();
const DEFAULT_API_URL = 'https://pandalgo-y5tm.onrender.com';
const isLegacyApiUrl = /https?:\/\/pandalgo\.onrender\.com(?:\/|$)/i.test(configuredApiUrl || '');
function resolveApiBaseUrl(value) {
  const normalized = (value || '').replace(/\/+$/, '');
  if (!normalized) return '/api/v1';
  if (/\/api\/v1$/i.test(normalized)) return normalized;
  if (/\/api$/i.test(normalized)) return `${normalized}/v1`;
  return `${normalized}/api/v1`;
}

const API_BASE_URL = resolveApiBaseUrl(
  isLegacyApiUrl
    ? DEFAULT_API_URL
    : configuredApiUrl || (import.meta.env.DEV ? '' : DEFAULT_API_URL)
);

export const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

const TAB_ID_KEY = 'pandalgo_tab_id';
const ACCESS_TOKEN_SUFFIX = 'access_token';
const REFRESH_TOKEN_SUFFIX = 'refresh_token';
const DEVICE_ID_SUFFIX = 'device_id';
let inMemoryTabId = null;
let inMemoryDeviceId = null;
let proactiveRefreshTimer = null;

function readStorage(storage, key) {
  try {
    return storage?.getItem(key);
  } catch {
    return null;
  }
}

function writeStorage(storage, key, value) {
  try {
    if (value) storage?.setItem(key, value);
    else storage?.removeItem(key);
  } catch {
    // Storage may be unavailable in private browsing; cookies still work.
  }
}

function getTabId() {
  let tabId = inMemoryTabId || readStorage(window.sessionStorage, TAB_ID_KEY);
  if (!tabId) {
    tabId = window.crypto?.randomUUID?.() || `tab-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    writeStorage(window.sessionStorage, TAB_ID_KEY, tabId);
  }
  inMemoryTabId = tabId;
  return tabId;
}

function scopedKey(suffix) {
  // sessionStorage gives each normal browser tab its own namespace. The matching
  // localStorage entry keeps that tab's session available after a reload.
  return `pandalgo:tab:${getTabId()}:${suffix}`;
}

function getToken(suffix) {
  const key = scopedKey(suffix);
  return readStorage(window.sessionStorage, key) || readStorage(window.localStorage, key);
}

function setToken(suffix, value) {
  const key = scopedKey(suffix);
  writeStorage(window.sessionStorage, key, value);
  writeStorage(window.localStorage, key, value);
}

function getDeviceId() {
  const key = scopedKey(DEVICE_ID_SUFFIX);
  let deviceId = inMemoryDeviceId || readStorage(window.sessionStorage, key) || readStorage(window.localStorage, key);
  if (!deviceId) {
    deviceId = window.crypto?.randomUUID?.() || `device-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    writeStorage(window.sessionStorage, key, deviceId);
    writeStorage(window.localStorage, key, deviceId);
  }
  inMemoryDeviceId = deviceId;
  return deviceId;
}

function getTokenExpiry(token) {
  try {
    const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
    return Number(payload.exp) * 1000;
  } catch {
    return 0;
  }
}

function scheduleProactiveRefresh(token) {
  if (proactiveRefreshTimer) {
    window.clearTimeout(proactiveRefreshTimer);
    proactiveRefreshTimer = null;
  }

  const expiresAt = getTokenExpiry(token);
  if (!expiresAt) return;

  // Refresh two minutes before expiry so normal API calls never need to wait
  // for a 401 challenge during an admin form submission.
  const delay = Math.max(30_000, expiresAt - Date.now() - 120_000);
  proactiveRefreshTimer = window.setTimeout(() => {
    proactiveRefreshTimer = null;
    refreshAccessToken().catch(() => {
      // Keep the current session intact. The next request can retry refresh;
      // transient network failures must not log a user out.
    });
  }, delay);
}

export function saveAuthTokens(data) {
  setToken(ACCESS_TOKEN_SUFFIX, data?.accessToken);
  setToken(REFRESH_TOKEN_SUFFIX, data?.refreshToken);
  if (data?.accessToken) scheduleProactiveRefresh(data.accessToken);
}

export function clearAuthTokens() {
  if (proactiveRefreshTimer) {
    window.clearTimeout(proactiveRefreshTimer);
    proactiveRefreshTimer = null;
  }
  setToken(ACCESS_TOKEN_SUFFIX, null);
  setToken(REFRESH_TOKEN_SUFFIX, null);
}

export function getStoredRefreshToken() {
  return getToken(REFRESH_TOKEN_SUFFIX);
}

export async function restoreAuthSession() {
  const accessToken = getToken(ACCESS_TOKEN_SUFFIX);
  const refreshToken = getToken(REFRESH_TOKEN_SUFFIX);
  if (!refreshToken) return false;

  if (accessToken && getTokenExpiry(accessToken) > Date.now() + 120_000) {
    scheduleProactiveRefresh(accessToken);
    return true;
  }

  await refreshAccessToken();
  return true;
}

let refreshPromise = null;

async function refreshAccessToken() {
  if (!refreshPromise) {
    const refreshToken = getToken(REFRESH_TOKEN_SUFFIX);
    refreshPromise = api.post('/auth/refresh', refreshToken ? { refreshToken } : null, {
      timeout: 10000,
      // Do not send the shared browser cookie when refreshing a tab-scoped token.
      withCredentials: false,
    })
      .then((response) => {
        saveAuthTokens(response.data);
        return response;
      })
      .finally(() => {
      refreshPromise = null;
      });
  }
  return refreshPromise;
}

api.interceptors.request.use((config) => {
  const accessToken = getToken(ACCESS_TOKEN_SUFFIX);
  config.headers = config.headers || {};
  // Let the browser add the multipart boundary for FormData uploads. Keeping
  // the JSON default here makes multer receive an empty `req.files` array.
  if (typeof FormData !== 'undefined' && config.data instanceof FormData) {
    delete config.headers['Content-Type'];
  }
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  config.headers['X-Device-Id'] = getDeviceId();
  config.headers['X-Device-Name'] = `${navigator.platform || 'Browser'} tab ${getTabId().slice(0, 8)}`;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const isAuthEndpoint = originalRequest?.url?.includes('/auth/login') ||
      originalRequest?.url?.includes('/auth/register') ||
      originalRequest?.url?.includes('/auth/refresh') ||
      originalRequest?.url?.includes('/auth/logout');

    if (error.response?.status === 401 && !originalRequest?._retry && !isAuthEndpoint) {
      originalRequest._retry = true;
      try {
        await refreshAccessToken();
        return api(originalRequest);
      } catch {
        // Continue with the original authentication error.
      }
    }

    const message = error.response?.data?.message || error.message || 'Something went wrong';
    const normalizedError = new Error(message);
    normalizedError.response = error.response;
    normalizedError.code = error.code;
    return Promise.reject(normalizedError);
  }
);
