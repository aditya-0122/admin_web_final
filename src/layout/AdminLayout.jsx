import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";

export default function AdminLayout() {
  return (
    <div
      style={{
        display: "flex",
        minHeight: "100vh",
        fontFamily: "system-ui",
        background: "#eaf2ff", // background global nyambung biru
      }}
    >
      <Sidebar />

      <div
        style={{
          flex: 1,
          background: "#eff6ff", // biru sangat muda (match sidebar)
        }}
      >
        <Topbar />

        <div style={{ padding: 20 }}>
          <Outlet />
        </div>
      </div>
    </div>
  );
}
