import axios from 'axios';

// In local Vite development, use the configured proxy so auth cookies stay same-origin.
// In Vercel/production, the Vercel rewrite proxies /api to Render. Set VITE_API_URL
// only when deploying without that rewrite or when using a custom API domain.
const configuredApiUrl = import.meta.env.VITE_API_URL?.trim();
function resolveApiBaseUrl(value) {
  const normalized = (value || '').replace(/\/+$/, '');
  if (!normalized) return '/api/v1';
  if (/\/api\/v1$/i.test(normalized)) return normalized;
  if (/\/api$/i.test(normalized)) return `${normalized}/v1`;
  return `${normalized}/api/v1`;
}

const API_BASE_URL = resolveApiBaseUrl(configuredApiUrl || (import.meta.env.DEV ? '' : 'https://pandalgo.onrender.com'));

export const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

let refreshPromise = null;

async function refreshAccessToken() {
  if (!refreshPromise) {
    refreshPromise = api.post('/auth/refresh', null, { timeout: 10000 }).finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
}

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
