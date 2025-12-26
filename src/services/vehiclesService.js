import { api } from "./api";

export async function listVehicles() {
  const res = await api.get("/admin/vehicles");
  return res.data;
}

export async function createVehicle(payload) {
  const res = await api.post("/admin/vehicles", payload);
  return res.data;
}

export async function updateVehicle(id, payload) {
  const res = await api.put(`/admin/vehicles/${id}`, payload);
  return res.data;
}

export async function deleteVehicle(id) {
  const res = await api.delete(`/admin/vehicles/${id}`);
  return res.data;
}