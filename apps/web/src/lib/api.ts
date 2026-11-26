import axios from 'axios';

const baseURL =
  process.env.NEXT_PUBLIC_API_BASE || 'http://127.0.0.1:43210/bff';

export const api = axios.create({
  baseURL,
  withCredentials: true,
  timeout: 120_000,
});

// Lightweight token store interface to avoid circular import
type TokenGetter = () => string | null;
let getToken: TokenGetter = () => null;
export function bindTokenGetter(fn: TokenGetter) {
  getToken = fn;
}

api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers = config.headers ?? {};
    (config.headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
  }
  return config;
});

