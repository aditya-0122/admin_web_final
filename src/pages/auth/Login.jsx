import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { login } from "../../services/authService";

export default function Login() {
  const nav = useNavigate();
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("admin123");
  const [err, setErr] = useState("");

  const onSubmit = (e) => {
    e.preventDefault();
    const ok = login(username, password);
    if (!ok) return setErr("Username/password salah.");
    nav("/");
  };

  return (
    <div style={{
      minHeight: "100vh", display: "grid", placeItems: "center", background: "#0b1220",
      fontFamily: "system-ui"
    }}>
      <form onSubmit={onSubmit} style={{
        width: 360, background: "#fff", padding: 18, borderRadius: 16
      }}>
        <h2 style={{ margin: 0 }}>Login Admin</h2>
        <p style={{ marginTop: 6, color: "#666" }}>
          Dummy login: <b>admin</b> / <b>admin123</b>
        </p>

        <label style={{ display: "block", marginTop: 12 }}>
          Username
          <input value={username} onChange={(e) => setUsername(e.target.value)}
            style={{ width: "100%", padding: 10, borderRadius: 10, border: "1px solid #ddd", marginTop: 6 }}
          />
        </label>

        <label style={{ display: "block", marginTop: 12 }}>
          Password
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
            style={{ width: "100%", padding: 10, borderRadius: 10, border: "1px solid #ddd", marginTop: 6 }}
          />
        </label>

        {err && <div style={{ marginTop: 10, color: "#b00020" }}>{err}</div>}

        <button style={{
          width: "100%", marginTop: 14, padding: 10, borderRadius: 10,
          border: "none", background: "#111", color: "#fff", cursor: "pointer"
        }}>
          Masuk
        </button>
      </form>
    </div>
  );
}
