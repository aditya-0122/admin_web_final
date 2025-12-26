import { api } from "./api";

// unwrap helpers
function unwrapList(resData) {
  if (Array.isArray(resData)) return resData;
  if (Array.isArray(resData?.data)) return resData.data;
  if (Array.isArray(resData?.data?.data)) return resData.data.data;
  return [];
}

function unwrapItem(resData) {
  return resData?.data ?? resData;
}

export async function listRepairs({ search = "" } = {}) {
  const qs = search ? `?search=${encodeURIComponent(search)}` : "";
  const res = await api.get(`/admin/repairs${qs}`);
  return unwrapList(res.data);
}

export async function getRepair(id) {
  if (!id) throw new Error("ID repair kosong.");
  const res = await api.get(`/admin/repairs/${id}`);
  return unwrapItem(res.data);
}

/**
 * FINALIZE repair
 * POST /api/admin/repairs/{id}/finalize
 * Payload backend:
 * {
 *   technician_id: number,
 *   action: string,
 *   cost: number|null,
 *   parts_used: [{ part_id:number, qty:number }]
 * }
 */
export async function finalizeRepair({ id, technicianId, action, cost = 0, partsUsed = [] } = {}) {
  if (!id) throw new Error("ID repair kosong.");
  if (!technicianId) throw new Error("Teknisi wajib dipilih.");
  if (!action || !String(action).trim()) throw new Error("Tindakan wajib diisi.");

  const payload = {
    technician_id: Number(technicianId),           //  backend: technician_id
    action: String(action).trim(),                 //  backend: action
    cost: Number(cost || 0),                       //  backend: cost
    parts_used: (Array.isArray(partsUsed) ? partsUsed : []).map((x) => ({
      part_id: Number(x.partId),                   //  backend: part_id
      qty: Number(x.qty),                          //  backend: qty
    })),
  };

  const res = await api.post(`/admin/repairs/${id}/finalize`, payload);
  return res.data;
}