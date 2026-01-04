import { useEffect, useMemo, useState } from "react";
import { listUsers } from "../../services/usersService";
import { listVehicles } from "../../services/vehiclesService";
import { socket } from "../../lib/socket";
import {
  createAssignment,
  deleteAssignment,
  listAssignments,
} from "../../services/assignmentsService";

export default function Assignments() {
  const [vehicleId, setVehicleId] = useState("");
  const [driverId, setDriverId] = useState("");
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);

  const [assignments, setAssignments] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [vehicles, setVehicles] = useState([]);

  // ==========================
  // ✅ PAGINATION
  // ==========================
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 5;

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [a, u, v] = await Promise.all([
        listAssignments(),
        listUsers({ role: "driver", search: "" }),
        listVehicles({ search: "" }),
      ]);

      setAssignments(Array.isArray(a) ? a : []);
      setDrivers(Array.isArray(u) ? u : []);
      setVehicles(Array.isArray(v) ? v : []);
    } catch (err) {
      setMsg(`❌ ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 🔴 REALTIME UPDATE (tanpa reload)
  useEffect(() => {
    socket.emit("join", "admin");

    const refresh = () => fetchAll();

    socket.on("assignment.created", refresh);
    socket.on("assignment.deleted", refresh);
    socket.on("assignment.updated", refresh);

    socket.on("dashboard.refresh", refresh);

    return () => {
      socket.off("assignment.created", refresh);
      socket.off("assignment.deleted", refresh);
      socket.off("assignment.updated", refresh);
      socket.off("dashboard.refresh", refresh);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // reset page ketika data berubah (biar ga nyangkut di page akhir)
  useEffect(() => {
    setPage(1);
  }, [assignments.length]);

  // computed pagination
  const totalPages = useMemo(() => {
    return Math.max(1, Math.ceil(assignments.length / PAGE_SIZE));
  }, [assignments.length]);

  const pageAssignments = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return assignments.slice(start, start + PAGE_SIZE);
  }, [assignments, page]);

  // pastikan page valid kalau totalPages mengecil
  useEffect(() => {
    setPage((p) => Math.min(p, totalPages));
  }, [totalPages]);

  const onSave = async (e) => {
    e.preventDefault();
    setMsg("");
    try {
      await createAssignment({ vehicle_id: vehicleId, driver_id: driverId });
      setVehicleId("");
      setDriverId("");
      setMsg("✅ Assignment tersimpan.");
      await fetchAll();
    } catch (err) {
      setMsg(`❌ ${err.message}`);
    }
  };

  const onDelete = async (id) => {
    if (!confirm("Hapus assignment ini?")) return;
    setMsg("");
    try {
      await deleteAssignment(id);
      setMsg("✅ Assignment dihapus.");
      await fetchAll();
    } catch (err) {
      setMsg(`❌ ${err.message}`);
    }
  };

  const resolveVehicle = (a) => a?.vehicle?.plate_number || "-";
  const resolveDriver = (a) => a?.driver?.username || "-";

  return (
    <div>
      <h2 style={{ marginTop: 0, color: THEME.textTitle }}>Assign Kendaraan</h2>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1.4fr", gap: 16 }}>
        {/* LEFT */}
        <div style={card()}>
          <h3 style={{ marginTop: 0, color: THEME.textTitle }}>Buat Assignment</h3>

          <form onSubmit={onSave} style={{ display: "grid", gap: 10 }}>
            <select
              value={vehicleId}
              onChange={(e) => setVehicleId(e.target.value)}
              style={inp()}
              required
              disabled={loading}
            >
              <option value="">Pilih kendaraan</option>
              {vehicles.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.brand || "-"} — {v.plate_number}
                </option>
              ))}
            </select>

            <select
              value={driverId}
              onChange={(e) => setDriverId(e.target.value)}
              style={inp()}
              required
              disabled={loading}
            >
              <option value="">Pilih driver</option>
              {drivers.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.username} {d.active ? "" : "(nonaktif)"}
                </option>
              ))}
            </select>

            <button style={btnPrimary()} type="submit" disabled={loading}>
              {loading ? "Loading..." : "Simpan"}
            </button>

            {msg && (
              <div
                style={{
                  color: msg.startsWith("❌") ? THEME.danger : THEME.primary,
                  fontWeight: 700,
                }}
              >
                {msg}
              </div>
            )}
          </form>

          <p style={{ marginTop: 10, color: THEME.textMuted, fontSize: 13 }}>
            1 kendaraan cuma boleh punya 1 driver aktif (unik per kendaraan).
          </p>
        </div>

        {/* RIGHT */}
        <div style={card()}>
          <h3 style={{ marginTop: 0, color: THEME.textTitle }}>Daftar Assignment</h3>

          {/* WRAPPER biar tabel gak kepanjangan */}
          <div
            style={{
              marginTop: 8,
              maxHeight: 360,
              overflowY: "auto",
              borderRadius: 12,
              border: `1px solid ${THEME.borderSoft}`,
              background: "#fff",
            }}
          >
            <table width="100%" cellPadding="10" style={{ borderCollapse: "collapse" }}>
              <thead>
                <tr
                  style={{
                    background: THEME.tableHeadBg,
                    color: THEME.textTitle,
                    position: "sticky",
                    top: 0,
                    zIndex: 2,
                  }}
                >
                  <th align="left">Kendaraan</th>
                  <th align="left">Driver</th>
                  <th align="left">Assigned At</th>
                  <th align="left">Aksi</th>
                </tr>
              </thead>

              <tbody>
                {pageAssignments.map((a) => (
                  <tr key={a.id} style={{ borderBottom: `1px solid ${THEME.borderSoft}` }}>
                    <td>
                      <b style={{ color: THEME.textStrong }}>{resolveVehicle(a)}</b>
                    </td>
                    <td style={{ color: THEME.textBody }}>{resolveDriver(a)}</td>
                    <td style={{ color: THEME.textBody }}>
                      {a.assigned_at ? new Date(a.assigned_at).toLocaleString() : "-"}
                    </td>
                    <td>
                      <button style={btnDanger()} onClick={() => onDelete(a.id)} disabled={loading}>
                        Hapus
                      </button>
                    </td>
                  </tr>
                ))}

                {!assignments.length && (
                  <tr>
                    <td colSpan="4" style={{ color: THEME.textMuted }}>
                      {loading ? "Memuat data..." : "Belum ada assignment."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* PAGINATION */}
          {assignments.length > 0 && (
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginTop: 10,
                gap: 10,
                flexWrap: "wrap",
              }}
            >
              <div style={{ color: THEME.textMuted, fontWeight: 700, fontSize: 13 }}>
                Halaman {page} / {totalPages} — Menampilkan {pageAssignments.length} dari {assignments.length} data
              </div>

              <div style={{ display: "flex", gap: 8 }}>
                <button
                  style={{
                    ...btnSecondary(),
                    opacity: page === 1 ? 0.6 : 1,
                    cursor: page === 1 ? "not-allowed" : "pointer",
                  }}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  Prev
                </button>

                <button
                  style={{
                    ...btnSecondary(),
                    opacity: page === totalPages ? 0.6 : 1,
                    cursor: page === totalPages ? "not-allowed" : "pointer",
                  }}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
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

// ===== THEME (MATCH SIDEBAR) =====
const THEME = {
  primary: "#2563eb",
  primaryDark: "#1d4ed8",
  softBg: "#eff6ff",
  border: "#bfdbfe",
  borderSoft: "#e0e7ff",
  tableHeadBg: "#eff6ff",
  textTitle: "#1e3a8a",
  textStrong: "#0f172a",
  textBody: "#334155",
  textMuted: "#64748b",
  danger: "#b00020",
};

const card = () => ({
  background: "#ffffff",
  padding: 16,
  borderRadius: 16,
  border: `1px solid ${THEME.border}`,
  boxShadow: "0 6px 16px rgba(15, 23, 42, 0.06)",
});

const inp = () => ({
  padding: 10,
  borderRadius: 10,
  border: `1px solid ${THEME.borderSoft}`,
  background: THEME.softBg,
  outline: "none",
});

const btnPrimary = () => ({
  padding: 10,
  borderRadius: 10,
  border: "none",
  background: THEME.primary,
  color: "#fff",
  fontWeight: 800,
  cursor: "pointer",
});

const btnSecondary = () => ({
  padding: "6px 10px",
  borderRadius: 10,
  border: `1px solid ${THEME.borderSoft}`,
  background: THEME.softBg,
  color: THEME.primaryDark,
  fontWeight: 800,
  cursor: "pointer",
});

const btnDanger = () => ({
  padding: "6px 10px",
  borderRadius: 10,
  border: "1px solid #f2b8b5",
  background: "#fff",
  color: THEME.danger,
  fontWeight: 800,
  cursor: "pointer",
});
