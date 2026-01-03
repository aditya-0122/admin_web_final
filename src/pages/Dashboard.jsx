import { useEffect, useState } from "react";
import { api } from "../services/api";
import { socket } from "../lib/socket";

export default function Dashboard() {
  const [stats, setStats] = useState({
    drivers: 0,
    technicians: 0,
    vehicles: 0,
    followups: 0,
    parts: 0,
    transactions: 0,
  });

  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  // =============================
  // LOAD DATA DARI BACKEND
  // =============================
  const loadStats = async () => {
    setLoading(true);
    setMsg("");
    try {
      /**
       * ⚠️ Endpoint ini kamu buat di backend:
       * GET /api/admin/dashboard
       */
      const { data } = await api.get("/admin/dashboard");

      setStats({
      drivers: data.drivers ?? 0,
      technicians: data.technicians ?? 0,
      vehicles: data.vehicles ?? 0,
      followups: data.followups ?? 0,   
      parts: data.parts ?? 0,           
      transactions: data.transactions ?? 0,
    });
    } catch (e) {
      setMsg(`❌ ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  // =============================
  // LOAD AWAL
  // =============================
  useEffect(() => {
    loadStats();
  }, []);

  // =============================
  // REALTIME SOCKET
  // =============================
  useEffect(() => {
    socket.connect();
    socket.emit("join", "admin");

    const refresh = () => {
      loadStats();
    };

    // semua event penting refresh dashboard
    socket.on("dashboard.refresh", refresh);
    socket.on("damage_report.followup_created", refresh);
    socket.on("damage_report.followup_approved", refresh);
    socket.on("part_usage.requested", refresh);
    socket.on("part_usage.approved", refresh);
    socket.on("repair.finalized", refresh);
    socket.on("finance.transaction.created", refresh);

    return () => {
      socket.off("dashboard.refresh", refresh);
      socket.off("damage_report.followup_created", refresh);
      socket.off("damage_report.followup_approved", refresh);
      socket.off("part_usage.requested", refresh);
      socket.off("part_usage.approved", refresh);
      socket.off("repair.finalized", refresh);
      socket.off("finance.transaction.created", refresh);
      socket.disconnect();
    };
  }, []);

  return (
    <div>
      <h2 style={{ marginTop: 0 }}>Dashboard</h2>

      {msg && (
        <div
          style={{
            marginBottom: 12,
            color: msg.startsWith("❌") ? "#b00020" : "#2563eb",
            fontWeight: 700,
          }}
        >
          {msg}
        </div>
      )}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: 12,
        }}
      >
        <Card title="Driver" value={stats.drivers} loading={loading} />
        <Card title="Teknisi" value={stats.technicians} loading={loading} />
        <Card title="Kendaraan" value={stats.vehicles} loading={loading} />
        <Card title="Follow-up Pending" value={stats.followups} loading={loading} />
        <Card title="Sparepart" value={stats.parts} loading={loading} />
        <Card title="Transaksi" value={stats.transactions} loading={loading} />
      </div>
    </div>
  );
}

// =============================
// CARD COMPONENT
// =============================
function Card({ title, value, loading }) {
  return (
    <div
      style={{
        background: "#fff",
        padding: 14,
        borderRadius: 14,
        border: "1px solid #e5e7eb",
        boxShadow: "0 6px 14px rgba(15,23,42,0.06)",
      }}
    >
      <div style={{ color: "#64748b", fontSize: 13 }}>{title}</div>
      <div style={{ fontSize: 28, fontWeight: 800 }}>
        {loading ? "…" : value}
      </div>
    </div>
  );
}
