import { loadDb } from "../services/fakeDb.js";

export default function Dashboard() {
  const db = loadDb();
  return (
    <div>
      <h2 style={{ marginTop: 0 }}>Dashboard</h2>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
        <Card title="Driver" value={db.users.filter(u => u.role === "driver").length} />
        <Card title="Teknisi" value={db.users.filter(u => u.role === "technician").length} />
        <Card title="Kendaraan" value={db.vehicles.length} />
        <Card title="Follow-up Pending" value={db.followups.filter(f => f.status === "PENDING").length} />
        <Card title="Sparepart" value={db.parts.length} />
        <Card title="Transaksi" value={db.finance.length} />
      </div>
    </div>
  );
}

function Card({ title, value }) {
  return (
    <div style={{ background: "#fff", padding: 14, borderRadius: 14 }}>
      <div style={{ color: "#666", fontSize: 13 }}>{title}</div>
      <div style={{ fontSize: 28, fontWeight: 800 }}>{value}</div>
    </div>
  );
}
