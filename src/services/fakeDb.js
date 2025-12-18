const KEY = "ADMIN_DUMMY_DB_V2";

const seed = {
  auth: { username: "admin", password: "admin123" },

  users: [
    { id: "u1", role: "driver", username: "driver01", active: true },
    { id: "u2", role: "technician", username: "tech01", active: true },
  ],

  vehicles: [
    { id: "v1", brand: "Toyota", plate: "N 1234 AB" },
    { id: "v2", brand: "Honda", plate: "L 8888 CD" },
  ],

  assignments: [
    { id: "a1", vehicleId: "v1", driverId: "u1", date: "2025-12-13" },
  ],

  followups: [
    {
      id: "f1",
      vehiclePlate: "N 1234 AB",
      title: "Suara aneh",
      status: "PENDING", // PENDING | APPROVED | REJECTED | DONE
      techNote: "Dicek bagian suspensi",
      adminNote: "",
      date: "2025-12-12",
      approvedAt: null,
      doneAt: null,
    },
  ],

  // Repair sekarang harus link ke followup
  repairs: [
    {
      id: "r1",
      followupId: "f1",              
      vehiclePlate: "N 1234 AB",
      technician: "tech01",
      action: "Ganti kampas rem",
      cost: 250000,
      date: "2025-12-10",
      partsUsed: [{ partId: "p1", qty: 1 }],
      finalized: true,               // ✅ sudah final
    },
  ],

  parts: [
    { id: "p1", name: "Kampas Rem", sku: "BRK-001", stock: 12, minStock: 5, buyPrice: 50000 },
  ],

  stockMovements: [
    // { id, partId, type: "IN"|"OUT", qty, note, date, ref? }
  ],

  finance: [
    { id: "t1", type: "expense", category: "Sparepart", amount: 250000, date: "2025-12-10", note: "Kampas rem" }
  ],
};

export function loadDb() {
  const raw = localStorage.getItem(KEY);
  return raw ? JSON.parse(raw) : seed;
}

export function saveDb(db) {
  localStorage.setItem(KEY, JSON.stringify(db));
}

export function uid(prefix = "id") {
  return `${prefix}_${Math.random().toString(16).slice(2)}_${Date.now()}`;
}
