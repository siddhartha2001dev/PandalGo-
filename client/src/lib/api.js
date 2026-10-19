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

const ACCESS_TOKEN_KEY = 'pandalgo_access_token';
const REFRESH_TOKEN_KEY = 'pandalgo_refresh_token';
const DEVICE_ID_KEY = 'pandalgo_device_id';

function getStorageValue(key) {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function setStorageValue(key, value) {
  try {
    if (value) window.localStorage.setItem(key, value);
    else window.localStorage.removeItem(key);
  } catch {
    // Storage may be unavailable in private browsing; cookies still work.
  }
}

function getDeviceId() {
  let deviceId = getStorageValue(DEVICE_ID_KEY);
  if (!deviceId) {
    deviceId = window.crypto?.randomUUID?.() || `device-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    setStorageValue(DEVICE_ID_KEY, deviceId);
  }
  return deviceId;
}

export function saveAuthTokens(data) {
  setStorageValue(ACCESS_TOKEN_KEY, data?.accessToken);
  setStorageValue(REFRESH_TOKEN_KEY, data?.refreshToken);
}

export function clearAuthTokens() {
  setStorageValue(ACCESS_TOKEN_KEY, null);
  setStorageValue(REFRESH_TOKEN_KEY, null);
}

export function getStoredRefreshToken() {
  return getStorageValue(REFRESH_TOKEN_KEY);
}

let refreshPromise = null;

async function refreshAccessToken() {
  if (!refreshPromise) {
    const refreshToken = getStorageValue(REFRESH_TOKEN_KEY);
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
  const accessToken = getStorageValue(ACCESS_TOKEN_KEY);
  config.headers = config.headers || {};
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  config.headers['X-Device-Id'] = getDeviceId();
  config.headers['X-Device-Name'] = `${navigator.platform || 'Browser'} browser`;
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
