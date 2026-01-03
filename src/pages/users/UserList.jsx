import { useEffect, useMemo, useState } from "react";
import { createUser, deleteUser, listUsers, toggleUserActive } from "../../services/usersService";
import { socket } from "../../lib/socket";

export default function UsersList() {
  const [role, setRole] = useState("driver");
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 250);

  const [newRole, setNewRole] = useState("driver");
  const [username, setUsername] = useState("");
  const [loginKey, setLoginKey] = useState("");

  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);

  const [users, setUsers] = useState([]);
  const [refreshKey, setRefreshKey] = useState(0);

  // ✅ DataTable: pagination + scroll
  const PAGE_SIZE = 10;
  const [page, setPage] = useState(1);

  const refresh = () => setRefreshKey((x) => x + 1);

  const load = async () => {
    setLoading(true);
    setMsg("");
    try {
      const rows = await listUsers({ role, search: debouncedSearch });
      setUsers(Array.isArray(rows) ? rows : []);
    } catch (err) {
      setMsg(`❌ ${err.message || "Gagal memuat data."}`);
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let alive = true;
    (async () => {
      if (!alive) return;
      await load();
    })();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role, debouncedSearch, refreshKey]);

  // reset page saat filter berubah
  useEffect(() => {
    setPage(1);
  }, [role, debouncedSearch]);

  // 🔴 REALTIME LISTENER
  useEffect(() => {
    socket.emit("join", "admin");

    const onRealtime = () => refresh();

    socket.on("user.created", onRealtime);
    socket.on("user.updated", onRealtime);
    socket.on("user.deleted", onRealtime);

    socket.on("dashboard.refresh", onRealtime);

    return () => {
      socket.off("user.created", onRealtime);
      socket.off("user.updated", onRealtime);
      socket.off("user.deleted", onRealtime);
      socket.off("dashboard.refresh", onRealtime);
    };
  }, []);

  const onAdd = async (e) => {
    e.preventDefault();
    setMsg("");

    const cleanUsername = username.trim();
    const cleanKey = loginKey.trim();

    if (!cleanUsername) return setMsg("❌ Username wajib diisi.");
    if (cleanKey.length < 6) return setMsg("❌ Password minimal 6 karakter.");

    setLoading(true);
    try {
      await createUser({ role: newRole, username: cleanUsername, login_key: cleanKey });
      setUsername("");
      setLoginKey("");
      setMsg("✅ Akun berhasil dibuat.");
      refresh();
    } catch (err) {
      setMsg(`❌ ${err.message || "Gagal."}`);
    } finally {
      setLoading(false);
    }
  };

  const onToggle = async (u) => {
    setMsg("");
    setLoading(true);
    try {
      await toggleUserActive(u.id, !u.is_active);
      setMsg("✅ Status diperbarui.");
      refresh();
    } catch (err) {
      setMsg(`❌ ${err.message || "Gagal update status."}`);
    } finally {
      setLoading(false);
    }
  };

  const onDelete = async (u) => {
    if (!confirm(`Hapus akun "${u.username}"?`)) return;
    setMsg("");
    setLoading(true);
    try {
      await deleteUser(u.id);
      setMsg("✅ Akun dihapus.");
      refresh();
    } catch (err) {
      setMsg(`❌ ${err.message || "Gagal hapus."}`);
    } finally {
      setLoading(false);
    }
  };

  // ✅ sorting optional biar rapih (username A-Z)
  const usersSorted = useMemo(() => {
    const arr = [...(Array.isArray(users) ? users : [])];
    arr.sort((a, b) => {
      const ua = (a?.username ?? "").toString().toLowerCase();
      const ub = (b?.username ?? "").toString().toLowerCase();
      if (ua < ub) return -1;
      if (ua > ub) return 1;
      return 0;
    });
    return arr;
  }, [users]);

  const totalPages = Math.max(1, Math.ceil(usersSorted.length / PAGE_SIZE));

  useEffect(() => {
    setPage((p) => Math.min(p, totalPages));
  }, [totalPages]);

  const pageData = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return usersSorted.slice(start, start + PAGE_SIZE);
  }, [usersSorted, page]);

  return (
    <div>
      <h2 style={{ marginTop: 0, color: "#1e3a8a" }}>Driver & Teknisi</h2>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1.3fr", gap: 16 }}>
        {/* LEFT */}
        <div style={card()}>
          <h3 style={{ marginTop: 0, color: "#1e3a8a" }}>Buat Akun</h3>

          <form onSubmit={onAdd} style={{ display: "grid", gap: 10 }}>
            <select value={newRole} onChange={(e) => setNewRole(e.target.value)} style={inp()} disabled={loading}>
              <option value="driver">Driver</option>
              <option value="teknisi">Teknisi</option>
            </select>

            <input
              placeholder="username (unik)"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              style={inp()}
              required
              disabled={loading}
            />

            <input
              placeholder="password (min 6 karakter)"
              type="password"
              value={loginKey}
              onChange={(e) => setLoginKey(e.target.value)}
              style={inp()}
              required
              disabled={loading}
            />

            <button style={btnPrimary()} type="submit" disabled={loading}>
              {loading ? "Menyimpan..." : "Simpan"}
            </button>

            {msg && (
              <div style={{ color: msg.startsWith("❌") ? "#b00020" : "#1d4ed8", fontWeight: 700 }}>
                {msg}
              </div>
            )}
          </form>
        </div>

        {/* RIGHT */}
        <div style={card()}>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <h3 style={{ margin: 0, flex: 1, color: "#1e3a8a" }}>Daftar Akun</h3>

            <select value={role} onChange={(e) => setRole(e.target.value)} style={inp()} disabled={loading}>
              <option value="driver">Driver</option>
              <option value="teknisi">Teknisi</option>
            </select>

            <button style={btn()} onClick={load} type="button" disabled={loading}>
              {loading ? "Loading..." : "Refresh"}
            </button>
          </div>

          <input
            placeholder="search username..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ ...inp(), width: "100%", marginTop: 10, marginBottom: 10 }}
            disabled={loading}
          />

          {/* ✅ DataTable wrapper: scroll + max height */}
          <div
            style={{
              border: "1px solid #e0e7ff",
              borderRadius: 12,
              overflow: "auto",
              maxHeight: 420, // ✅ bisa scroll
              background: "#fff",
            }}
          >
            <table width="100%" cellPadding="10" style={{ borderCollapse: "collapse", minWidth: 520 }}>
              <thead>
                <tr style={{ background: "#eff6ff", color: "#1e3a8a", position: "sticky", top: 0 }}>
                  <th align="left">Username</th>
                  <th align="left">Status</th>
                  <th align="left">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {pageData.map((u) => (
                  <tr key={u.id} style={{ borderBottom: "1px solid #e0e7ff" }}>
                    <td>
                      <b>{u.username}</b>
                      <div style={{ fontSize: 12, color: "#64748b" }}>role: {u.role}</div>
                    </td>
                    <td>
                      <span style={badge(!!u.is_active)}>{u.is_active ? "Aktif" : "Nonaktif"}</span>
                    </td>
                    <td style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      <button style={btn()} onClick={() => onToggle(u)} disabled={loading} type="button">
                        {u.is_active ? "Nonaktifkan" : "Aktifkan"}
                      </button>
                      <button style={btnDanger()} onClick={() => onDelete(u)} disabled={loading} type="button">
                        Hapus
                      </button>
                    </td>
                  </tr>
                ))}

                {!usersSorted.length && !loading && (
                  <tr>
                    <td colSpan="3">Belum ada data.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* ✅ Pagination 10 */}
          {usersSorted.length > 0 && (
            <div
              style={{
                marginTop: 10,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 10,
                flexWrap: "wrap",
              }}
            >
              <div style={{ color: "#64748b", fontWeight: 700, fontSize: 13 }}>
                Menampilkan {(page - 1) * PAGE_SIZE + 1}-
                {Math.min(usersSorted.length, page * PAGE_SIZE)} dari {usersSorted.length} (Hal {page}/{totalPages})
              </div>

              <div style={{ display: "flex", gap: 8 }}>
                <button
                  style={{
                    ...btn(),
                    opacity: page === 1 ? 0.6 : 1,
                    cursor: page === 1 ? "not-allowed" : "pointer",
                  }}
                  disabled={page === 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  type="button"
                >
                  Prev
                </button>
                <button
                  style={{
                    ...btn(),
                    opacity: page === totalPages ? 0.6 : 1,
                    cursor: page === totalPages ? "not-allowed" : "pointer",
                  }}
                  disabled={page === totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  type="button"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function useDebounce(value, delay = 250) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

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
  fontWeight: 800,
  cursor: "pointer",
});

const btn = () => ({
  padding: "6px 10px",
  borderRadius: 10,
  border: "1px solid #c7d2fe",
  background: "#ffffff",
  color: "#1e3a8a",
  fontWeight: 700,
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
  fontWeight: 800,
  background: active ? "#dbeafe" : "#e2e8f0",
  color: active ? "#1d4ed8" : "#334155",
  border: `1px solid ${active ? "#bfdbfe" : "#cbd5e1"}`,
});
