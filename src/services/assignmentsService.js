import { api } from "./api";

// GET /api/admin/vehicle-assignments
export async function listAssignments() {
  const res = await api.get("/admin/vehicle-assignments");
  return res.data;
}

// POST /api/admin/vehicle-assignments
export async function createAssignment({ vehicle_id, driver_id }) {
  const res = await api.post("/admin/vehicle-assignments", {
    vehicle_id: Number(vehicle_id),
    driver_id: Number(driver_id),
  });
  return res.data;
}

// DELETE /api/admin/vehicle-assignments/{id}
export async function deleteAssignment(id) {
  const res = await api.delete(`/admin/vehicle-assignments/${id}`);
  return res.data;
}