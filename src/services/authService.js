const KEY = "ADMIN_AUTH_V1";

export function isLoggedIn() {
  return localStorage.getItem(KEY) === "1";
}

export function login(username, password) {
  // dummy check
  if (username === "admin" && password === "admin123") {
    localStorage.setItem(KEY, "1");
    return true;
  }
  return false;
}

export function logout() {
  localStorage.removeItem(KEY);
}
