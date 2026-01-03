import { api } from "./api";

/**
 * ADMIN - Cost Estimate Approval Services
 * Routes:
 * GET  /admin/cost-estimates?status=
 * POST /admin/cost-estimates/{costEstimate}/approve
 * POST /admin/cost-estimates/{costEstimate}/reject
 */

// list cost estimates (filter status optional)
export async function listCostEstimates({ status } = {}) {
  const { data } = await api.get("/admin/cost-estimates", {
    params: status ? { status } : undefined,
  });

  // support kalau backend return array langsung atau {data:[...]}
  if (Array.isArray(data)) return data;
  if (data && Array.isArray(data.data)) return data.data;
  return [];
}

// approve cost estimate
export async function approveCostEstimate({ costEstimateId } = {}) {
  if (!costEstimateId) throw new Error("costEstimateId wajib diisi.");

  const { data } = await api.post(
    `/admin/cost-estimates/${costEstimateId}/approve`,
    {}
  );
  return data;
}

// reject cost estimate
export async function rejectCostEstimate({ costEstimateId, note } = {}) {
  if (!costEstimateId) throw new Error("costEstimateId wajib diisi.");

  const payload = note && note.trim() ? { note: note.trim() } : {};

  const { data } = await api.post(
    `/admin/cost-estimates/${costEstimateId}/reject`,
    payload
  );
  return data;
}
