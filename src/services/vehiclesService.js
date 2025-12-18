import { loadDb, saveDb, uid } from "./fakeDb";

export function listVehicles(search = "") {
  const db = loadDb();
  const q = search.trim().toLowerCase();
  return db.vehicles.filter(v =>
    !q || v.brand.toLowerCase().includes(q) || v.plate.toLowerCase().includes(q)
  );
}

export function createVehicle({ brand, plate }) {
  const db = loadDb();
  const cleanPlate = plate.trim().toUpperCase();

  const exists = db.vehicles.some(v => v.plate.toUpperCase() === cleanPlate);
  if (exists) throw new Error("Plat nomor sudah digunakan. Harus unik.");

  const newV = { id: uid("v"), brand: brand.trim(), plate: cleanPlate };
  db.vehicles.unshift(newV);
  saveDb(db);
  return newV;
}

export function deleteVehicle(id) {
  const db = loadDb();
  db.vehicles = db.vehicles.filter(v => v.id !== id);
  saveDb(db);
}