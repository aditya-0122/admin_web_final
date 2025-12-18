import { useMemo, useState } from "react";
import { createUser, deleteUser, listUsers, toggleUserActive } from "../../services/usersService";

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
      <h2 style={{ marginTop: 0 }}>Driver & Teknisi</h2>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1.3fr", gap: 16 }}>
        <div style={{ background: "#fff", padding: 14, borderRadius: 14 }}>
          <h3 style={{ marginTop: 0 }}>Buat Akun</h3>

          <form onSubmit={onAdd} style={{ display: "grid", gap: 10 }}>
            <select value={newRole} onChange={(e) => setNewRole(e.target.value)}
              style={inp()}
            >
              <option value="driver">Driver</option>
              <option value="technician">Teknisi</option>
            </select>

            <input placeholder="username (unik)" value={username} onChange={(e) => setUsername(e.target.value)}
              style={inp()} required
            />
            <input placeholder="password (dummy)" value={password} onChange={(e) => setPassword(e.target.value)}
              style={inp()} required
            />

            <button style={btnPrimary()}>Simpan</button>
            {msg && <div style={{ color: msg.startsWith("❌") ? "#b00020" : "#1b5e20" }}>{msg}</div>}
          </form>

          <p style={{ marginTop: 10, color: "#666", fontSize: 13 }}>
            Username harus unik. Kalau kembar, sistem protes duluan.
          </p>
        </div>

        <div style={{ background: "#fff", padding: 14, borderRadius: 14 }}>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <h3 style={{ margin: 0, flex: 1 }}>Daftar Akun</h3>
            <select value={role} onChange={(e) => setRole(e.target.value)} style={inp()}>
              <option value="driver">Driver</option>
              <option value="technician">Teknisi</option>
            </select>
          </div>

          <input placeholder="search username..." value={search} onChange={(e) => setSearch(e.target.value)}
            style={{ ...inp(), width: "100%", marginTop: 10, marginBottom: 10 }}
          />

          <table width="100%" cellPadding="10" style={{ borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#f3f4f6" }}>
                <th align="left">Username</th>
                <th align="left">Status</th>
                <th align="left">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id} style={{ borderBottom: "1px solid #eee" }}>
                  <td><b>{u.username}</b></td>
                  <td>{u.active ? "Aktif" : "Nonaktif"}</td>
                  <td style={{ display: "flex", gap: 8 }}>
                    <button style={btn()} onClick={() => onToggle(u.id)}>
                      {u.active ? "Nonaktifkan" : "Aktifkan"}
                    </button>
                    <button style={btnDanger()} onClick={() => onDelete(u.id)}>Hapus</button>
                  </td>
                </tr>
              ))}
              {!users.length && <tr><td colSpan="3" style={{ color: "#666" }}>Belum ada data.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

const inp = () => ({ padding: 10, borderRadius: 10, border: "1px solid #ddd" });
const btnPrimary = () => ({ padding: 10, borderRadius: 10, border: "none", background: "#111", color: "#fff", cursor: "pointer" });
const btn = () => ({ padding: "6px 10px", borderRadius: 10, border: "1px solid #ddd", background: "#fff", cursor: "pointer" });
const btnDanger = () => ({ ...btn(), border: "1px solid #f2b8b5", color: "#b00020" });