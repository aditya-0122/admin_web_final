import { useEffect, useState } from "react";
import { socket } from "../../lib/socket";
import {
  listFollowupReports,
  getDamageReport,
  completeDamageReport,
} from "../../services/followupsService";

export default function Followups() {
  const [rows, setRows] = useState([]);
  const [selected, setSelected] = useState(null);
  const [adminNote, setAdminNote] = useState("");
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);

  const fmt = (iso) => {
    if (!iso) return "-";
    try {
      return new Date(iso).toLocaleString();
    } catch {
      return iso;
    }
  };

  const statusLabel = (s) => {
    if (!s) return "-";
    if (s === "approved_followup_admin") return "Approved Admin";
    if (s === "butuh_followup_admin") return "Butuh Follow-up Admin";
    if (s === "proses") return "Proses";
    if (s === "fatal") return "Fatal";
    if (s === "selesai") return "Selesai";
    return s;
  };

  const statusColor = (s) => {
    if (s === "proses") return "#f59e0b";
    if (s === "butuh_followup_admin") return "#2563eb";
    if (s === "approved_followup_admin") return "#0ea5e9";
    if (s === "selesai") return "#16a34a";
    return "#b00020";
  };

  const lastResponse = (report) => {
    const arr = report?.technicianResponses || report?.technician_responses || [];
    if (!Array.isArray(arr) || arr.length === 0) return null;
    return arr[arr.length - 1];
  };

  const vehicleLabel = (r) =>
    r?.vehicle?.plate_number
      ? `${r.vehicle.plate_number}${r.vehicle.brand ? ` (${r.vehicle.brand})` : ""}`
      : `Vehicle #${r?.vehicle_id ?? "-"}`;

  const driverLabel = (r) =>
    r?.driver?.username ? r.driver.username : `Driver #${r?.driver_id ?? "-"}`;

  const techLabel = (resp) =>
    resp?.technician?.username
      ? resp.technician.username
      : resp?.technician_id
      ? `Teknisi #${resp.technician_id}`
      : "-";

  const load = async () => {
    setMsg("");
    setLoading(true);
    try {
      const data = await listFollowupReports();
      setRows(Array.isArray(data) ? data : []);
    } catch (e) {
      setMsg(`❌ ${e.message || "Gagal memuat data."}`);
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  const reloadSelected = async (id) => {
    try {
      const full = await getDamageReport(id);
      setSelected(full);
    } catch {
      // silent
    }
  };

  useEffect(() => {
    load();
  }, []);

  // 🔴 REALTIME (NODE SOCKET)
  useEffect(() => {
    socket.emit("join", "admin");

    const refresh = (payload = {}) => {
      const reportId =
        payload.damage_report_id ?? payload.report_id ?? payload.id ?? null;

      load();

      if (selected?.id && reportId && Number(selected.id) === Number(reportId)) {
        reloadSelected(selected.id);
      }
    };

    // event yang berkaitan dengan flow followup
    socket.on("technician_response.created", refresh);
    socket.on("technician_response.updated", refresh);
    socket.on("damage_report.followup_created", refresh);
    socket.on("damage_report.followup_approved", refresh);

    // fallback event umum
    socket.on("dashboard.refresh", refresh);

    return () => {
      socket.off("technician_response.created", refresh);
      socket.off("technician_response.updated", refresh);
      socket.off("damage_report.followup_created", refresh);
      socket.off("damage_report.followup_approved", refresh);
      socket.off("dashboard.refresh", refresh);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected]);

  const open = async (r) => {
    setMsg("");
    setSelected(null);
    setAdminNote("");
    setLoading(true);
    try {
      const full = await getDamageReport(r.id);
      setSelected(full);

      const last = lastResponse(full);
      setAdminNote(last?.note || "");
    } catch (e) {
      setMsg(`❌ ${e.message || "Gagal ambil detail."}`);
    } finally {
      setLoading(false);
    }
  };

  const complete = async () => {
    if (!selected?.id) return;
    setMsg("");
    setLoading(true);
    try {
      await completeDamageReport({
        id: selected.id,
        admin_note: adminNote,
      });

      setMsg("✅ Follow-up disetujui oleh admin.");
      setSelected(null);
      await load();
    } catch (e) {
      setMsg(`❌ ${e.message || "Gagal update."}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h2 style={{ marginTop: 0 }}>Follow-up Kerusakan (Admin)</h2>

      <div style={card()}>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <div style={{ fontWeight: 900 }}>Butuh follow-up admin</div>

          <button style={btn()} onClick={load} disabled={loading}>
            {loading ? "Loading..." : "Refresh"}
          </button>

          <div style={{ marginLeft: "auto", color: "#64748b", fontSize: 13 }}>
            Total: <b style={{ color: "#0f172a" }}>{rows.length}</b>
          </div>
        </div>

        {msg && (
          <div
            style={{
              marginTop: 10,
              color: msg.startsWith("✅") ? "#2563eb" : "#b00020",
              fontWeight: 800,
            }}
          >
            {msg}
          </div>
        )}

        <table
          width="100%"
          cellPadding="10"
          style={{ borderCollapse: "collapse", marginTop: 10 }}
        >
          <thead>
            <tr style={{ background: "#f3f4f6" }}>
              <th align="left">Vehicle</th>
              <th align="left">Driver</th>
              <th align="left">Status Terakhir</th>
              <th align="left">Created</th>
              <th align="left">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const lr = lastResponse(r);
              const st = lr?.status || "butuh_followup_admin";
              return (
                <tr key={r.id} style={{ borderBottom: "1px solid #eee" }}>
                  <td><b>{vehicleLabel(r)}</b></td>
                  <td>{driverLabel(r)}</td>
                  <td>
                    <span
                      style={{
                        padding: "4px 10px",
                        borderRadius: 999,
                        background: `${statusColor(st)}22`,
                        color: statusColor(st),
                        fontWeight: 800,
                      }}
                    >
                      {statusLabel(st)}
                    </span>
                  </td>
                  <td>{fmt(r.created_at)}</td>
                  <td>
                    <button style={btn()} onClick={() => open(r)} disabled={loading}>
                      Detail
                    </button>
                  </td>
                </tr>
              );
            })}

            {!rows.length && (
              <tr>
                <td colSpan="5" style={{ color: "#666" }}>
                  {loading ? "Memuat data..." : "Tidak ada data follow-up."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {selected && (
        <div style={{ ...card(), marginTop: 14 }}>
          <h3 style={{ marginTop: 0 }}>
            {vehicleLabel(selected)} — {driverLabel(selected)}
          </h3>

          {(() => {
            const lr = lastResponse(selected);
            const st = lr?.status || "-";
            return (
              <div style={{ color: "#64748b", marginBottom: 10, lineHeight: 1.6 }}>
                <div><b>ID:</b> {selected.id}</div>
                <div><b>Created:</b> {fmt(selected.created_at)}</div>
                <div><b>Teknisi terakhir:</b> {techLabel(lr)}</div>
                <div>
                  <b>Status teknisi terakhir:</b>{" "}
                  <span style={{ color: statusColor(st), fontWeight: 900 }}>
                    {statusLabel(st)}
                  </span>
                </div>
              </div>
            );
          })()}

          <label>
            Catatan Admin (opsional)
            <textarea
              value={adminNote}
              onChange={(e) => setAdminNote(e.target.value)}
              style={{ ...inp(), width: "100%", height: 90, marginTop: 6 }}
              disabled={loading}
            />
          </label>

          <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
            <button style={btnPrimary()} onClick={complete} disabled={loading}>
              Tandai Selesai
            </button>
            <button style={btn()} onClick={() => setSelected(null)} disabled={loading}>
              Tutup
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* =====================
   STYLES (UNCHANGED)
===================== */
const card = () => ({
  background: "#fff",
  padding: 14,
  borderRadius: 14,
  border: "1px solid #e5e7eb",
  boxShadow: "0 8px 18px rgba(15,23,42,0.06)",
});
const inp = () => ({
  padding: 10,
  borderRadius: 10,
  border: "1px solid #ddd",
});
const btn = () => ({
  padding: "8px 10px",
  borderRadius: 10,
  border: "1px solid #ddd",
  background: "#fff",
  cursor: "pointer",
  fontWeight: 800,
});
const btnPrimary = () => ({
  padding: "8px 12px",
  borderRadius: 10,
  border: "none",
  background: "#111",
  color: "#fff",
  cursor: "pointer",
  fontWeight: 900,
});