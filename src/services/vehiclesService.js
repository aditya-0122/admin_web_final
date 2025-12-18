import { loadDb, saveDb, uid } from "./fakeDb.js";

export function listVehicles(search = "") {
  const db = loadDb();
  const q = search.trim().toLowerCase();
  return db.vehicles.filter(v =>
    !q || v.brand.toLowerCase().includes(q) || v.plate.toLowerCase().includes(q)
  );
}

export function createVehicle({ brand, plate }) {
  const db = loadDb();

  const cleanBrand = brand.trim();
  const cleanPlate = plate.trim().toUpperCase();

  if (!validatePlateFormat(cleanPlate)) {
    throw new Error("Format plat harus: HURUF spasi ANGKA spasi HURUF (contoh: N 1234 AB)");
  }

  const exists = db.vehicles.some(
    v => v.plate.toUpperCase() === cleanPlate
  );
  if (exists) throw new Error("Plat nomor sudah digunakan. Harus unik.");

  const newV = { id: uid("v"), brand: cleanBrand, plate: cleanPlate };
  db.vehicles.unshift(newV);
  saveDb(db);
  return newV;
}


export function deleteVehicle(id) {
  const db = loadDb();
  db.vehicles = db.vehicles.filter(v => v.id !== id);
  saveDb(db);
}

function validatePlateFormat(plate) {
  const regex = /^[A-Z]{1,2} [0-9]{1,4} [A-Z]{1,3}$/;
  return regex.test(plate);
}