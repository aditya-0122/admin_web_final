import { useMemo, useState } from "react";
import {
  createUser,
  deleteUser,
  listUsers,
  toggleUserActive,
} from "../../services/usersService";

export default function UsersList() {
  const [role, setRole] = useState("driver");
  const [search, setSearch] = useState("");

  const [newRole, setNewRole] = useState("driver");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const [msg, setMsg] = useState("");

  const users = useMemo(() => listUsers({ role, search }), [role, search, msg]);

  const onAdd = (e) => {
    e.preventDefault();
    setMsg("");
    try {
      createUser({ role: newRole, username, password });
      setUsername("");
      setPassword("");
      setMsg("✅ Akun berhasil dibuat.");
    } catch (err) {
      setMsg(`❌ ${err.message || "Gagal."}`);
    }
  };

  const onToggle = (id) => {
    toggleUserActive(id);
    setMsg("✅ Status diperbarui.");
  };

  const onDelete = (id) => {
    if (!confirm("Hapus akun ini?")) return;
    deleteUser(id);
    setMsg("✅ Akun dihapus.");
  };

  return (
    <div>
      <h2 style={{ marginTop: 0, color: "#1e3a8a" }}>Driver & Teknisi</h2>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1.3fr", gap: 16 }}>
        {/* LEFT: CREATE USER */}
        <div style={card()}>
          <h3 style={{ marginTop: 0, color: "#1e3a8a" }}>Buat Akun</h3>

          <form onSubmit={onAdd} style={{ display: "grid", gap: 10 }}>
            <select
              value={newRole}
              onChange={(e) => setNewRole(e.target.value)}
              style={inp()}
            >
              <option value="driver">Driver</option>
              <option value="technician">Teknisi</option>
            </select>

            <input
              placeholder="username (unik)"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              style={inp()}
              required
            />

            <input
              placeholder="password (dummy)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={inp()}
              required
            />

            <button style={btnPrimary()} type="submit">
              Simpan
            </button>

            {msg && (
              <div
                style={{
                  color: msg.startsWith("❌") ? "#b00020" : "#1d4ed8",
                  fontWeight: 600,
                }}
              >
                {msg}
              </div>
            )}
          </form>

          <p style={{ marginTop: 10, color: "#334155", fontSize: 13 }}>
            Username harus unik. Kalau kembar, sistem protes duluan.
          </p>
        </div>

        {/* RIGHT: LIST USERS */}
        <div style={card()}>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <h3 style={{ margin: 0, flex: 1, color: "#1e3a8a" }}>Daftar Akun</h3>

            <select value={role} onChange={(e) => setRole(e.target.value)} style={inp()}>
              <option value="driver">Driver</option>
              <option value="technician">Teknisi</option>
            </select>
          </div>

          <input
            placeholder="search username..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ ...inp(), width: "100%", marginTop: 10, marginBottom: 10 }}
          />

          <table width="100%" cellPadding="10" style={{ borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#eff6ff", color: "#1e3a8a" }}>
                <th align="left">Username</th>
                <th align="left">Status</th>
                <th align="left">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} style={{ borderBottom: "1px solid #e0e7ff" }}>
                  <td>
                    <b style={{ color: "#0f172a" }}>{u.username}</b>
                  </td>
                  <td>
                    <span style={badge(u.active)}>
                      {u.active ? "Aktif" : "Nonaktif"}
                    </span>
                  </td>
                  <td style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <button style={btn()} onClick={() => onToggle(u.id)}>
                      {u.active ? "Nonaktifkan" : "Aktifkan"}
                    </button>
                    <button style={btnDanger()} onClick={() => onDelete(u.id)}>
                      Hapus
                    </button>
                  </td>
                </tr>
              ))}

              {!users.length && (
                <tr>
                  <td colSpan="3" style={{ color: "#334155" }}>
                    Belum ada data.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ===== THEME (MATCH SIDEBAR) =====
const card = () => ({
  background: "#ffffff",
  padding: 16,
  borderRadius: 16,
  border: "1px solid #dbeafe",
  boxShadow: "0 6px 16px rgba(15, 23, 42, 0.06)",
});

const inp = () => ({
  padding: 10,
  borderRadius: 10,
  border: "1px solid #c7d2fe",
  background: "#eff6ff",
  outline: "none",
});

const btnPrimary = () => ({
  padding: 10,
  borderRadius: 10,
  border: "none",
  background: "#2563eb",
  color: "#fff",
  fontWeight: 700,
  cursor: "pointer",
});

const btn = () => ({
  padding: "6px 10px",
  borderRadius: 10,
  border: "1px solid #c7d2fe",
  background: "#ffffff",
  color: "#1e3a8a",
  fontWeight: 600,
  cursor: "pointer",
});

const btnDanger = () => ({
  ...btn(),
  border: "1px solid #f2b8b5",
  color: "#b00020",
});

const badge = (active) => ({
  display: "inline-block",
  padding: "4px 10px",
  borderRadius: 999,
  fontSize: 12,
  fontWeight: 700,
  background: active ? "#dbeafe" : "#e2e8f0",
  color: active ? "#1d4ed8" : "#334155",
  border: `1px solid ${active ? "#bfdbfe" : "#cbd5e1"}`,
});
