import { NavLink } from "react-router-dom";

const linkStyle = ({ isActive }) => ({
  display: "block",
  padding: "10px 12px",
  borderRadius: 10,
  textDecoration: "none",
  color: isActive ? "#ffffff" : "#1e3a8a", // PUTIH saat aktif
  background: isActive ? "#2563eb" : "transparent", // biru tua saat aktif
  fontWeight: isActive ? 700 : 500,
  transition: "all 0.2s ease", // biar halus, nggak kagetin
});

export default function Sidebar() {
  return (
    <aside
      style={{
        width: 250,
        padding: 16,
        background: "#bfdbfe", // biru muda
        color: "#0f172a",
      }}
    >
      <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 12 }}>
        Admin Panel
      </div>

      <div style={{ fontSize: 12, opacity: 0.8, marginBottom: 16 }}>
        React dummy mode (API nanti nyusul)
      </div>

      <nav style={{ display: "grid", gap: 8 }}>
        <NavLink to="/" end style={linkStyle}>Dashboard</NavLink>
        <NavLink to="/users" style={linkStyle}>Driver & Teknisi</NavLink>
        <NavLink to="/vehicles" style={linkStyle}>Kendaraan</NavLink>
        <NavLink to="/assignments" style={linkStyle}>Assign Kendaraan</NavLink>
        <NavLink to="/followups" style={linkStyle}>Follow-up Teknisi</NavLink>
        <NavLink to="/repairs" style={linkStyle}>Riwayat Perbaikan</NavLink>
        <NavLink to="/inventory" style={linkStyle}>Suku Cadang</NavLink>
        <NavLink to="/finance" style={linkStyle}>Keuangan</NavLink>
      </nav>
    </aside>
  );
}
