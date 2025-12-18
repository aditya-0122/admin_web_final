import { loadDb, saveDb, uid } from "./fakeDb";

export function listUsers({ role = "", search = "" } = {}) {
  const db = loadDb();
  const q = search.trim().toLowerCase();

  return db.users
    .filter(u => (!role || u.role === role))
    .filter(u => (!q || u.username.toLowerCase().includes(q)));
}

export function createUser({ role, username, password }) {
  const db = loadDb();
  const clean = username.trim().toLowerCase();

  if (!clean) throw new Error("Username wajib diisi.");
  if (!password || password.length < 4) throw new Error("Password minimal 4 karakter.");
  if (!["driver", "technician"].includes(role)) throw new Error("Role tidak valid.");

  const exists = db.users.some(u => u.username.toLowerCase() === clean);
  if (exists) throw new Error("Username sudah dipakai. Harus unik.");

  const user = { id: uid("u"), role, username: clean, active: true };
  db.users.unshift(user);
  saveDb(db);

  // password dummy tidak disimpan (karena dummy mode)
  return user;
}

export function toggleUserActive(id) {
  const db = loadDb();
  const u = db.users.find(x => x.id === id);
  if (!u) throw new Error("User tidak ditemukan.");
  u.active = !u.active;
  saveDb(db);
  return u;
}

export function deleteUser(id) {
  const db = loadDb();
  db.users = db.users.filter(u => u.id !== id);
  saveDb(db);
}