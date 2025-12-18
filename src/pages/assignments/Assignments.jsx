import { useMemo, useState } from "react";
import { loadDb } from "../../services/fakeDb";
import {
  createAssignment,
  deleteAssignment,
  listAssignments,
} from "../../services/assignmentsService";

export default function Assignments() {
  const [vehicleId, setVehicleId] = useState("");
  const [driverId, setDriverId] = useState("");
  const [msg, setMsg] = useState("");

  const db = useMemo(() => loadDb(), [msg]);
  const assignments = useMemo(() => listAssignments(), [msg]);

  const drivers = db.users.filter((u) => u.role === "driver");
  const vehicles = db.vehicles;

  const resolveDriver = (id) => db.users.find((u) => u.id === id)?.username || "-";
  const resolveVehicle = (id) => db.vehicles.find((v) => v.id === id)?.plate || "-";

  const onSave = (e) => {
    e.preventDefault();
    setMsg("");
    try {
      createAssignment({
        vehicleId,
        driverId,
        date: new Date().toISOString().slice(0, 10),
      });
      setVehicleId("");
      setDriverId("");
      setMsg("✅ Assignment tersimpan.");
    } catch (err) {
      setMsg(`❌ ${err.message || "Gagal."}`);
    }
  };

  const onDelete = (id) => {
    if (!confirm("Hapus assignment ini?")) return;
    deleteAssignment(id);
    setMsg("✅ Assignment dihapus.");
  };

  return (
    <div>
      <h2 style={{ marginTop: 0, color: THEME.textTitle }}>Assign Kendaraan</h2>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1.4fr", gap: 16 }}>
        {/* LEFT */}
        <div style={card()}>
          <h3 style={{ marginTop: 0, color: THEME.textTitle }}>Buat / Ubah Assignment</h3>

          <form onSubmit={onSave} style={{ display: "grid", gap: 10 }}>
            <select
              value={vehicleId}
              onChange={(e) => setVehicleId(e.target.value)}
              style={inp()}
              required
            >
              <option value="">Pilih kendaraan</option>
              {vehicles.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.brand} — {v.plate}
                </option>
              ))}
            </select>

            <select
              value={driverId}
              onChange={(e) => setDriverId(e.target.value)}
              style={inp()}
              required
            >
              <option value="">Pilih driver</option>
              {drivers.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.username} {d.active ? "" : "(nonaktif)"}
                </option>
              ))}
            </select>

            <button style={btnPrimary()} type="submit">
              Simpan
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
            Kalau driver nonaktif dipilih, nanti sistem “ngedumel” di dunia nyata 😄
          </p>
        </div>

        {/* RIGHT */}
        <div style={card()}>
          <h3 style={{ marginTop: 0, color: THEME.textTitle }}>Daftar Assignment</h3>

          <table width="100%" cellPadding="10" style={{ borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: THEME.tableHeadBg, color: THEME.textTitle }}>
                <th align="left">Kendaraan</th>
                <th align="left">Driver</th>
                <th align="left">Tanggal</th>
                <th align="left">Aksi</th>
              </tr>
            </thead>

            <tbody>
              {assignments.map((a) => (
                <tr key={a.id} style={{ borderBottom: `1px solid ${THEME.borderSoft}` }}>
                  <td>
                    <b style={{ color: THEME.textStrong }}>{resolveVehicle(a.vehicleId)}</b>
                  </td>
                  <td style={{ color: THEME.textBody }}>{resolveDriver(a.driverId)}</td>
                  <td style={{ color: THEME.textBody }}>{a.date}</td>
                  <td>
                    <button style={btnDanger()} onClick={() => onDelete(a.id)}>
                      Hapus
                    </button>
                  </td>
                </tr>
              ))}

              {!assignments.length && (
                <tr>
                  <td colSpan="4" style={{ color: THEME.textMuted }}>
                    Belum ada assignment.
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

// ===== STYLES =====
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

const btnDanger = () => ({
  padding: "6px 10px",
  borderRadius: 10,
  border: "1px solid #f2b8b5",
  background: "#fff",
  color: THEME.danger,
  fontWeight: 800,
  cursor: "pointer",
});
