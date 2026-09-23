import axios from "axios";
import { store } from "../store";
import { logout } from "../store/slices/authSlice";

// Priority order:
//  1. VITE_API_URL env var (set in Vercel project settings for cross-domain deployments)
//  2. "/api" fallback — works for:
//       - Local dev: Vite proxy → localhost:5000  (zero CORS)
//       - Vercel same-project: /api routes to Express on same domain  (zero CORS)
const getBaseUrl = () => {
  if (import.meta.env.DEV) {
    return "/api";
  }
  const rawUrl = (import.meta.env.VITE_API_URL || "https://stcok-flow-invertement-udsj.vercel.app/api").trim();
  // Automatically strip any Vercel preview/branch subdomains (e.g. -git-master-suriya2) that trigger Vercel SSO 401/302 blocks
  return rawUrl.replace(/-git-[^.]+\.vercel\.app/, ".vercel.app");
};

const BASE_URL = getBaseUrl();

const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor to attach JWT token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle session expiration (401 Unauthorized)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      console.warn("Unauthorized API call, logging out user...");
      store.dispatch(logout());
    }
    return Promise.reject(error);
  }
);

export default api;
