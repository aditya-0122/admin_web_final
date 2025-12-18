import { loadDb, saveDb, uid } from "./fakeDb";

export function listAssignments() {
  const db = loadDb();
  return db.assignments;
}

export function createAssignment({ vehicleId, driverId, date }) {
  const db = loadDb();

  const driver = db.users.find(u => u.id === driverId && u.role === "driver" && u.active);
  if (!driver) throw new Error("Driver tidak valid atau nonaktif.");

  const vehicle = db.vehicles.find(v => v.id === vehicleId);
  if (!vehicle) throw new Error("Kendaraan tidak ditemukan.");

  // Jika kendaraan sudah di-assign, overwrite (anggap pindah driver)
  const existing = db.assignments.find(a => a.vehicleId === vehicleId);
  if (existing) {
    existing.driverId = driverId;
    existing.date = date;
  } else {
    db.assignments.unshift({ id: uid("a"), vehicleId, driverId, date });
  }

  saveDb(db);
}

export function deleteAssignment(id) {
  const db = loadDb();
  db.assignments = db.assignments.filter(a => a.id !== id);
  saveDb(db);
}