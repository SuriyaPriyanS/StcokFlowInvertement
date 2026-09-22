import axios from "axios";
import { store } from "../store";
import { logout } from "../store/slices/authSlice";

// Always use relative "/api" — works in BOTH environments with zero CORS:
//   DEV:  Vite proxy  →  /api  →  localhost:5000
//   PROD: Vercel route →  /api  →  Express serverless function (same domain)
const api = axios.create({
  baseURL: "/api",
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
