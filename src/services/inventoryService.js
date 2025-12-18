import { loadDb, saveDb, uid } from "./fakeDb";

export function listParts(search = "") {
  const db = loadDb();
  const q = search.trim().toLowerCase();
  return db.parts.filter(p =>
    !q || p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q)
  );
}

export function createPart({ name, sku, stock, minStock, buyPrice }) {
  const db = loadDb();
  const cleanSku = sku.trim().toUpperCase();
  if (!name.trim()) throw new Error("Nama sparepart wajib diisi.");
  if (!cleanSku) throw new Error("SKU wajib diisi.");

  const exists = db.parts.some(p => p.sku.toUpperCase() === cleanSku);
  if (exists) throw new Error("SKU sudah ada. Harus unik.");

  const part = {
    id: uid("p"),
    name: name.trim(),
    sku: cleanSku,
    stock: Number(stock || 0),
    minStock: Number(minStock || 0),
    buyPrice: Number(buyPrice || 0),
  };

  db.parts.unshift(part);
  saveDb(db);
  return part;
}

// export function updatePart(id, patch) {
//   const db = loadDb();
//   const p = db.parts.find(x => x.id === id);
//   if (!p) throw new Error("Sparepart tidak ditemukan.");

//   if (patch.name !== undefined) p.name = patch.name.trim();
//   if (patch.minStock !== undefined) p.minStock = Number(patch.minStock || 0);
//   if (patch.buyPrice !== undefined) p.buyPrice = Number(patch.buyPrice || 0);

//   saveDb(db);
//   return p;
// }

export function deletePart(id) {
  const db = loadDb();
  db.parts = db.parts.filter(p => p.id !== id);
  saveDb(db);
}

export function stockMove({ partId, type, qty, note, date, ref }) {
  const db = loadDb();
  const p = db.parts.find(x => x.id === partId);
  if (!p) throw new Error("Sparepart tidak ditemukan.");
  const n = Number(qty);
  if (!n || n <= 0) throw new Error("Qty harus > 0.");
  if (!["IN", "OUT"].includes(type)) throw new Error("Type tidak valid.");

  if (type === "OUT" && p.stock < n) throw new Error("Stok tidak cukup.");

  p.stock = type === "IN" ? p.stock + n : p.stock - n;

  db.stockMovements.unshift({
    id: uid("sm"),
    partId,
    type,
    qty: n,
    note: (note || "").trim(),
    date: date || new Date().toISOString().slice(0, 10),
    ref: ref || "",
  });

  saveDb(db);
  return p;
}

export function listStockMovements() {
  const db = loadDb();
  return db.stockMovements;
}

export function updatePart(id, { name, sku, minStock, buyPrice }) {
  const db = loadDb();
  const p = db.parts.find(x => x.id === id);
  if (!p) throw new Error("Sparepart tidak ditemukan.");

  const newName = String(name || "").trim();
  const newSku = String(sku || "").trim().toUpperCase();

  if (!newName) throw new Error("Nama sparepart wajib diisi.");
  if (!newSku) throw new Error("SKU wajib diisi.");

  // SKU unik (kecuali item itu sendiri)
  const exists = db.parts.some(x => x.id !== id && (x.sku || "").toUpperCase() === newSku);
  if (exists) throw new Error("SKU sudah digunakan.");

  p.name = newName;
  p.sku = newSku;
  p.minStock = Number(minStock || 0);
  p.buyPrice = Number(buyPrice || 0);

  saveDb(db);
  return p;
}