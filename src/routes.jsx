import { Routes, Route, Navigate } from "react-router-dom";

import AdminLayout from "./layout/AdminLayout";
import Dashboard from "./pages/Dashboard";
import Login from "./pages/auth/Login";
import Assignments from "./pages/assignments/Assignments";
import Finance from "./pages/finance/Finance";
import Followups from "./pages/followups/Followups";
import Inventory from "./pages/inventory/Inventory";
import Repairs from "./pages/repairs/Repairs";
import UsersList from "./pages/users/UsersList";
import VehiclesList from "./pages/vehicles/VehiclesList";
import { isLoggedIn } from "./services/authService";

function Protected({ children }) {
  return isLoggedIn() ? children : <Navigate to="/login" replace />;
}

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      <Route
        path="/"
        element={
          <Protected>
            <AdminLayout />
          </Protected>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="users" element={<UsersList />} />
        <Route path="vehicles" element={<VehiclesList />} />
        <Route path="assignments" element={<Assignments />} />
        <Route path="followups" element={<Followups />} />
        <Route path="repairs" element={<Repairs />} />
        <Route path="inventory" element={<Inventory />} />
        <Route path="finance" element={<Finance />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
