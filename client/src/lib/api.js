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

export function saveAuthTokens(data) {
  setToken(ACCESS_TOKEN_SUFFIX, data?.accessToken);
  setToken(REFRESH_TOKEN_SUFFIX, data?.refreshToken);
}

export function clearAuthTokens() {
  setToken(ACCESS_TOKEN_SUFFIX, null);
  setToken(REFRESH_TOKEN_SUFFIX, null);
}

export function getStoredRefreshToken() {
  return getToken(REFRESH_TOKEN_SUFFIX);
}

let refreshPromise = null;

async function refreshAccessToken() {
  if (!refreshPromise) {
    const refreshToken = getToken(REFRESH_TOKEN_SUFFIX);
    refreshPromise = api.post('/auth/refresh', refreshToken ? { refreshToken } : null, { timeout: 10000 })
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
    return Promise.reject(new Error(message));
  }
);
