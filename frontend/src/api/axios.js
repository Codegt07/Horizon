import axios from "axios";

/**
 * Shared Axios instance for all API calls.
 *
 * withCredentials: true ensures the browser sends the httpOnly JWT cookie on
 * every request. Never store the token in localStorage or sessionStorage.
 *
 * In development, Vite's proxy forwards /api/* to localhost:5000, so the
 * cookie is set and sent on the same origin (localhost:5173 → localhost:5000
 * via the proxy). In production, set VITE_API_BASE_URL to the deployed
 * backend URL and ensure CORS is configured to allow that origin.
 */
const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? "",
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

export default api;
