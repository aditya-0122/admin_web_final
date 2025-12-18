import { useNavigate } from "react-router-dom";
import { logout } from "../services/authService";

export default function Topbar() {
  const nav = useNavigate();
  return (
    <header style={{
      background: "#fff", padding: "12px 20px", display: "flex",
      alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid #eee"
    }}>
      <div style={{ fontWeight: 700 }}>Admin</div>
      <button
        onClick={() => { logout(); nav("/login"); }}
        style={{ padding: "8px 12px", borderRadius: 10, border: "1px solid #ddd", cursor: "pointer" }}
      >
        Logout
      </button>
    </header>
  );
}
