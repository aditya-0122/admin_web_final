import { api } from "./api";

/* =====================
   Helpers
===================== */
function unwrapList(resData) {
  if (Array.isArray(resData)) return resData;
  if (Array.isArray(resData?.data)) return resData.data;
  if (Array.isArray(resData?.data?.data)) return resData.data.data;
  return [];
}
function unwrapItem(resData) {
  return resData?.data ?? resData;
}

/* =====================
   PARTS
===================== */
export async function listParts(search = "") {
  const params = {};
  if (search) params.search = search;

  const { data } = await api.get("/admin/parts", { params });
  return unwrapList(data);
}

export async function createPart(payload) {
  const body = {
    name: payload.name,
    sku: payload.sku,
    stock: Number(payload.stock ?? 0),
    min_stock: Number(payload.minStock ?? payload.min_stock ?? 0),
    buy_price: Number(payload.buyPrice ?? payload.buy_price ?? 0),
  };
  const { data } = await api.post("/admin/parts", body);
  return unwrapItem(data);
}

export async function updatePart(id, payload) {
  const body = {
    name: payload.name,
    sku: payload.sku,
    min_stock: Number(payload.minStock ?? payload.min_stock ?? 0),
    buy_price: Number(payload.buyPrice ?? payload.buy_price ?? 0),
  };
  const { data } = await api.put(`/admin/parts/${id}`, body);
  return unwrapItem(data);
}

export async function deletePart(id) {
  const { data } = await api.delete(`/admin/parts/${id}`);
  return unwrapItem(data);
}

/* =====================
   STOCK MOVEMENTS (IN)
===================== */
export async function listStockMovements(limit = 50) {
  const { data } = await api.get("/admin/stock-movements", { params: { limit } });
  return unwrapList(data);
}

export async function stockMove(payload) {
  const body = {
    part_id: payload.partId,
    type: "IN",
    qty: Number(payload.qty ?? 0),
    note: payload.note ?? null,
    date: payload.date ?? null,
    ref: payload.ref ?? null,
  };

  const { data } = await api.post("/admin/stock-movements", body);
  const res = unwrapItem(data);
  return res?.movement ?? res;
}

/* =====================
   PART USAGE (Teknisi Request → Admin Approve/Reject)
===================== */

/*List permintaan sparepart dari teknisi*/
export async function listPartUsages({ status = "", limit = 50 } = {}) {
  const params = { limit };
  if (status) params.status = status;

  const { data } = await api.get("/admin/part-usages", { params });
  return unwrapList(data);
}

export async function approvePartUsage(id, payload = {}) {
  // backend kamu validasi: admin_note
  const body = {
    admin_note: payload.admin_note ?? payload.note ?? null,
  };

  const { data } = await api.post(`/admin/part-usages/${id}/approve`, body);
  return unwrapItem(data);
}

/*Reject request sparepart*/
export async function rejectPartUsage(id, payload = {}) {
  const body = {
    reason: payload.reason ?? payload.note ?? null,
  };

  const { data } = await api.post(`/admin/part-usages/${id}/reject`, body);
  return unwrapItem(data);
}