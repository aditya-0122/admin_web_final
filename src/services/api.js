// src/services/api.js
import axios from "axios";

export const TOKEN_KEY = "ADMIN_TOKEN";

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:8000/api",
  headers: {
    Accept: "application/json",
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

function extractMessage(err) {
  const data = err?.response?.data;
  if (data?.message) return data.message;

  const errors = data?.errors;
  if (errors && typeof errors === "object") {
    const firstKey = Object.keys(errors)[0];
    const firstMsg = errors[firstKey]?.[0];
    if (firstMsg) return firstMsg;
  }

  return err?.message || "Terjadi kesalahan.";
}

api.interceptors.response.use(
  (res) => res,
  (err) => {
    const status = err?.response?.status;

    // ✅ kalau token invalid/expired → bersihin token biar balik login
    if (status === 401) {
      localStorage.removeItem(TOKEN_KEY);
      // optional auto-redirect:
      if (window.location.pathname !== "/login") {
        window.location.href = "/login";
      }
    }

    return Promise.reject(new Error(extractMessage(err)));
  }
);
