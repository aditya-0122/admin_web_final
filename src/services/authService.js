import { api } from "./api";

const TOKEN_KEY = "ADMIN_TOKEN";

export function isLoggedIn() {
  return !!localStorage.getItem(TOKEN_KEY);
}

export async function login(username, password) {
  const { data } = await api.post("/login", { username, password });

  if (!data?.token) throw new Error("Token tidak ditemukan dari response /login.");

  localStorage.setItem(TOKEN_KEY, data.token);

  // optional: simpan user buat UI (kalau butuh)
  // localStorage.setItem("ADMIN_USER", JSON.stringify(data.user));

  return data; // { token, user }
}

export async function me() {
  const { data } = await api.get("/me");
  return data;
}

export async function logout() {
  try {
    await api.post("/logout");
  } finally {
    localStorage.removeItem(TOKEN_KEY);
    // localStorage.removeItem("ADMIN_USER");
  }
}
