import { loadDb, saveDb, uid } from "./fakeDb";
import { stockMove } from "./inventoryService";
import { createTransaction } from "./financeService";

/**
 * LIST REPAIRS
 * hanya tampilkan data, tidak ada side-effect
 */
export function listRepairs({ search = "" } = {}) {
  const db = loadDb();
  const q = String(search || "").trim().toLowerCase();

  return db.repairs.filter(r =>
    !q ||
    (r.vehiclePlate || "").toLowerCase().includes(q) ||
    (r.technician || "").toLowerCase().includes(q) ||
    (r.action || "").toLowerCase().includes(q)
  );
}

/**
 * ❌ CREATE MANUAL REPAIR DIHAPUS LOGIKANYA
 * Admin TIDAK BOLEH create repair langsung
 * Repair HARUS dari follow-up
 */
export function createRepair() {
  throw new Error("Repair harus dibuat dari Follow-up yang sudah DONE.");
}

/**
 * ✅ GENERATE DRAFT REPAIR DARI FOLLOW-UP
 * belum ada stok keluar, belum ada expense
 */
export function generateRepairFromFollowup(followupId) {
  const db = loadDb();

  const f = db.followups.find(x => x.id === followupId);
  if (!f) throw new Error("Follow-up tidak ditemukan.");
  if (f.status !== "DONE") {
    throw new Error("Repair hanya bisa dibuat dari follow-up berstatus DONE.");
  }

  const exists = db.repairs.some(r => r.followupId === followupId);
  if (exists) throw new Error("Repair untuk follow-up ini sudah dibuat.");

  const repair = {
    id: uid("r"),
    followupId: f.id,
    vehiclePlate: f.vehiclePlate,
    technician: "",
    action: "",
    cost: 0,
    date: new Date().toISOString().slice(0, 10),
    partsUsed: [],
    finalized: false,
  };

  db.repairs.unshift(repair);
  saveDb(db);
  return repair;
}

/**
 * ✅ FINALISASI REPAIR
 * SATU-SATUNYA TEMPAT:
 * - stok OUT
 * - transaksi expense
 */
export function finalizeRepair({ id, technician, action, cost, partsUsed }) {
  const db = loadDb();
  const r = db.repairs.find(x => x.id === id);

  if (!r) throw new Error("Repair tidak ditemukan.");
  if (r.finalized) throw new Error("Repair sudah final.");
  if (!r.followupId) throw new Error("Repair tidak valid (bukan dari follow-up).");

  if (!action || !action.trim()) {
    throw new Error("Tindakan wajib diisi.");
  }

  const numCost = Number(cost || 0);

  const used = (partsUsed || [])
    .filter(x => x.partId && Number(x.qty) > 0)
    .map(x => ({ partId: x.partId, qty: Number(x.qty) }));

  // update repair
  r.technician = (technician || "").trim();
  r.action = action.trim();
  r.cost = numCost;
  r.partsUsed = used;
  r.finalized = true;

  saveDb(db);

  // 🔥 STOK KELUAR (HANYA DI SINI)
  used.forEach(u => {
    stockMove({
      partId: u.partId,
      type: "OUT",
      qty: u.qty,
      note: `Dipakai oleh ${r.technician || "teknisi"} untuk repair ${r.vehiclePlate}`,
      ref: r.id,
      date: r.date,
    });
  });

  // 🔥 EXPENSE (HANYA DI SINI)
  if (numCost > 0) {
    createTransaction({
      type: "expense",
      category: "Repair",
      amount: numCost,
      date: r.date,
      note: `Repair ${r.vehiclePlate}: ${r.action}`,
    });
  }

  return r;
}