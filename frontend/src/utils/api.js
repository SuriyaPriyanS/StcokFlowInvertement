import axios from "axios";
import { store } from "../store";
import { logout } from "../store/slices/authSlice";

// Use VITE_API_URL env var (set in Vercel frontend project settings)
// Fallback: stable git-master backend deployment
const BASE_URL =
  import.meta.env.VITE_API_URL ||
  "https://stcok-flow-invertement-udsj-git-master-suriya2.vercel.app/api";

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
