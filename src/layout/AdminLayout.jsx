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
        background: "#eaf2ff", 
      }}
    >
      <Sidebar />

      <div
        style={{
          flex: 1,
          background: "#eff6ff", 
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
