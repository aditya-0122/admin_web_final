import { useNavigate } from "react-router-dom";
import { logout } from "../services/authService";

export default function Topbar() {
  const nav = useNavigate();

  return (
    <header
      style={{
        background: "#eff6ff", // biru sangat muda (match sidebar family)
        padding: "12px 20px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        borderBottom: "1px solid #bfdbfe",
      }}
    >
      <div style={{ fontWeight: 800, color: "#1e3a8a" }}>Admin</div>

      <button
        onClick={() => {
          logout();
          nav("/login");
        }}
        style={{
          padding: "8px 12px",
          borderRadius: 10,
          border: "1px solid #c7d2fe",
          background: "#2563eb",
          color: "#fff",
          fontWeight: 700,
          cursor: "pointer",
        }}
        onMouseEnter={(e) => (e.currentTarget.style.background = "#1d4ed8")}
        onMouseLeave={(e) => (e.currentTarget.style.background = "#2563eb")}
      >
        Logout
      </button>
    </header>
  );
}