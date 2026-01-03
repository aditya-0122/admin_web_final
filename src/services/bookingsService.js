import { api } from "./api";

/**
 * ADMIN - Booking Approval Services
 * Routes:
 * GET  /admin/bookings?status=
 * POST /admin/bookings/{booking}/approve
 * POST /admin/bookings/{booking}/cancel
 */

// list bookings (filter status optional)
export async function listBookings({ status } = {}) {
  const { data } = await api.get("/admin/bookings", {
    params: status ? { status } : undefined,
  });

  // support kalau backend return array langsung atau {data:[...]}
  if (Array.isArray(data)) return data;
  if (data && Array.isArray(data.data)) return data.data;
  return [];
}

// approve booking
export async function approveBooking({
  bookingId,
  estimatedStartAt,
  estimatedFinishAt,
  queueNumber,
  noteAdmin,
} = {}) {
  if (!bookingId) throw new Error("bookingId wajib diisi.");
  if (!estimatedStartAt) throw new Error("estimatedStartAt wajib diisi.");
  if (!estimatedFinishAt) throw new Error("estimatedFinishAt wajib diisi.");

  const payload = {
    estimated_start_at: toIso(estimatedStartAt),
    estimated_finish_at: toIso(estimatedFinishAt),
    ...(queueNumber !== undefined && queueNumber !== null
      ? { queue_number: Number(queueNumber) }
      : {}),
    ...(noteAdmin && noteAdmin.trim()
      ? { note_admin: noteAdmin.trim() }
      : {}),
  };

  const { data } = await api.post(`/admin/bookings/${bookingId}/approve`, payload);
  return data;
}

// cancel booking
export async function cancelBooking({ bookingId, noteAdmin } = {}) {
  if (!bookingId) throw new Error("bookingId wajib diisi.");

  const payload =
    noteAdmin && noteAdmin.trim() ? { note_admin: noteAdmin.trim() } : {};

  const { data } = await api.post(`/admin/bookings/${bookingId}/cancel`, payload);
  return data;
}

// helper: Date | string => ISO string
function toIso(v) {
  if (v instanceof Date) return v.toISOString();
  // kalau sudah ISO string, biarkan
  if (typeof v === "string") return v;
  throw new Error("Format tanggal tidak valid (harus Date atau string ISO).");
}
