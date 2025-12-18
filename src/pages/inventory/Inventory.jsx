import { useMemo, useState } from "react";
import {
  createPart,
  deletePart,
  listParts,
  listStockMovements,
  stockMove,
  updatePart, 
} from "../../services/inventoryService";

export default function Inventory() {
  const [search, setSearch] = useState("");
  const [msg, setMsg] = useState("");

  // create form
  const [name, setName] = useState("");
  const [sku, setSku] = useState("");
  const [stock, setStock] = useState(0);
  const [minStock, setMinStock] = useState(0);
  const [buyPrice, setBuyPrice] = useState(0);

  // edit mode
  const [editingId, setEditingId] = useState(null);

  // stock move form (IN only)
  const [partId, setPartId] = useState("");
  const [type] = useState("IN"); // dikunci
  const [qty, setQty] = useState(1);
  const [note, setNote] = useState("");

  const parts = useMemo(() => listParts(search), [search, msg]);
  const moves = useMemo(() => listStockMovements(), [msg]);

  const resetForm = () => {
    setName("");
    setSku("");
    setStock(0);
    setMinStock(0);
    setBuyPrice(0);
    setEditingId(null);
  };

  const onAddOrUpdate = (e) => {
    e.preventDefault();
    setMsg("");

    try {
      // MODE EDIT
      if (editingId) {
        updatePart(editingId, { name, sku, minStock, buyPrice });
        resetForm();
        setMsg("✅ Sparepart berhasil di-update.");
        return;
      }

      // MODE CREATE
      createPart({ name, sku, stock, minStock, buyPrice });
      resetForm();
      setMsg("✅ Sparepart ditambahkan.");
    } catch (e2) {
      // ✅ kalau gagal karena SKU sudah dipakai, tawarkan update
      const err = String(e2.message || "");
      const skuUpper = String(sku || "").trim().toUpperCase();
      const existing = parts.find(p => (p.sku || "").toUpperCase() === skuUpper);

      if (err.toLowerCase().includes("sku") && existing) {
        const ok = confirm(
          `SKU "${skuUpper}" sudah ada (${existing.name}).\n` +
          `Mau update data sparepart yang sudah ada ini?`
        );
        if (ok) {
          setEditingId(existing.id);
          setName(existing.name);
          setSku(existing.sku);
          setMinStock(existing.minStock ?? 0);
          setBuyPrice(existing.buyPrice ?? 0);
          setStock(0); // stok awal hanya untuk create
          setMsg("✏️ Mode edit aktif. Silakan ubah lalu klik Update.");
          return;
        }
      }

      setMsg(`❌ ${e2.message}`);
    }
  };

  const onEdit = (p) => {
    setMsg("");
    setEditingId(p.id);
    setName(p.name || "");
    setSku(p.sku || "");
    setStock(0); // stok awal hanya untuk create
    setMinStock(Number(p.minStock || 0));
    setBuyPrice(Number(p.buyPrice || 0));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const onDelete = (id) => {
    if (!confirm("Hapus sparepart ini?")) return;
    deletePart(id);
    setMsg("✅ Sparepart dihapus.");
    if (editingId === id) resetForm();
  };

  const onMove = (e) => {
    e.preventDefault();
    setMsg("");
    try {
      // guard keras: OUT tidak boleh dari Inventory
      if (type === "OUT") {
        throw new Error("Stok keluar hanya dicatat dari pemakaian sparepart pada Repair (finalisasi).");
      }

      stockMove({ partId, type: "IN", qty, note });
      setNote("");
      setQty(1);
      setPartId("");
      setMsg("✅ Stok masuk berhasil diperbarui.");
    } catch (e2) {
      setMsg(`❌ ${e2.message}`);
    }
  };

  return (
    <div>
      <h2 style={{ marginTop: 0 }}>Suku Cadang & Inventaris</h2>

      <div style={{ display: "grid", gridTemplateColumns: "1.1fr 1fr", gap: 16 }}>
        <div style={card()}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <h3 style={{ marginTop: 0, flex: 1 }}>
              {editingId ? "Edit Sparepart" : "Tambah Sparepart"}
            </h3>
            {editingId && (
              <button style={btnGhost()} type="button" onClick={resetForm}>
                Batal Edit
              </button>
            )}
          </div>

          <form onSubmit={onAddOrUpdate} style={{ display: "grid", gap: 10 }}>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nama sparepart"
              style={inp()}
              required
            />
            <input
              value={sku}
              onChange={(e) => setSku(e.target.value)}
              placeholder="SKU (unik)"
              style={inp()}
              required
            />

            {/* stok awal hanya untuk create */}
            <input
              type="number"
              value={stock}
              onChange={(e) => setStock(e.target.value)}
              placeholder={editingId ? "Stok awal (disable saat edit)" : "Stok awal"}
              style={inp()}
              disabled={!!editingId}
            />

            <input
              type="number"
              value={minStock}
              onChange={(e) => setMinStock(e.target.value)}
              placeholder="Min stok"
              style={inp()}
            />
            <input
              type="number"
              value={buyPrice}
              onChange={(e) => setBuyPrice(e.target.value)}
              placeholder="Harga beli"
              style={inp()}
            />

            <button style={btnPrimary()}>
              {editingId ? "Update" : "Simpan"}
            </button>
          </form>

          {msg && (
            <div style={{ marginTop: 10, color: msg.startsWith("❌") ? "#b00020" : "#1b5e20" }}>
              {msg}
            </div>
          )}
        </div>

        <div style={card()}>
          <h3 style={{ marginTop: 0 }}>Stok Masuk (Restock)</h3>
          <div style={{ color: "#666", fontSize: 13, marginBottom: 10 }}>
            Stok <b>keluar</b> tidak bisa dari sini. Keluar otomatis saat <b>Repair finalisasi</b>.
          </div>

          <form onSubmit={onMove} style={{ display: "grid", gap: 10 }}>
            <select value={partId} onChange={(e) => setPartId(e.target.value)} style={inp()} required>
              <option value="">Pilih sparepart</option>
              {parts.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.sku} — {p.name} (stok: {p.stock})
                </option>
              ))}
            </select>

            {/* type dikunci IN */}
            <select value="IN" style={inp()} disabled>
              <option value="IN">IN (Masuk)</option>
            </select>

            <input type="number" value={qty} onChange={(e) => setQty(e.target.value)} style={inp()} />
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Catatan (opsional)"
              style={inp()}
            />
            <button style={btnPrimary()}>Proses IN</button>
          </form>
        </div>
      </div>

      <div style={{ ...card(), marginTop: 16 }}>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <h3 style={{ margin: 0, flex: 1 }}>Daftar Sparepart</h3>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="search nama/SKU..."
            style={{ ...inp(), width: 260 }}
          />
        </div>

        <table width="100%" cellPadding="10" style={{ borderCollapse: "collapse", marginTop: 10 }}>
          <thead>
            <tr style={{ background: "#f3f4f6" }}>
              <th align="left">SKU</th>
              <th align="left">Nama</th>
              <th align="left">Stok</th>
              <th align="left">Min</th>
              <th align="left">Harga Beli</th>
              <th align="left">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {parts.map((p) => (
              <tr key={p.id} style={{ borderBottom: "1px solid #eee" }}>
                <td><b>{p.sku}</b></td>
                <td>{p.name}</td>
                <td style={{ color: p.stock <= p.minStock ? "#b00020" : "#111" }}>
                  {p.stock} {p.stock <= p.minStock ? "(menipis)" : ""}
                </td>
                <td>{p.minStock}</td>
                <td>{Number(p.buyPrice || 0).toLocaleString("id-ID")}</td>
                <td style={{ display: "flex", gap: 8 }}>
                  <button style={btnSecondary()} onClick={() => onEdit(p)}>Edit</button>
                  <button style={btnDanger()} onClick={() => onDelete(p.id)}>Hapus</button>
                </td>
              </tr>
            ))}
            {!parts.length && (
              <tr>
                <td colSpan="6" style={{ color: "#666" }}>
                  Belum ada data.
                </td>
              </tr>
            )}
          </tbody>
        </table>

        <h4 style={{ marginTop: 16 }}>Log Mutasi Stok</h4>
        <table width="100%" cellPadding="10" style={{ borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "#f3f4f6" }}>
              <th align="left">Tanggal</th>
              <th align="left">Type</th>
              <th align="left">Qty</th>
              <th align="left">Note</th>
            </tr>
          </thead>
          <tbody>
            {moves.slice(0, 10).map((m) => (
              <tr key={m.id} style={{ borderBottom: "1px solid #eee" }}>
                <td>{m.date}</td>
                <td>{m.type}</td>
                <td>{m.qty}</td>
                <td style={{ color: "#555" }}>
                  {m.note}
                  {m.ref ? <span style={{ color: "#888" }}> (ref: {m.ref})</span> : ""}
                </td>
              </tr>
            ))}
            {!moves.length && (
              <tr>
                <td colSpan="4" style={{ color: "#666" }}>
                  Belum ada mutasi.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const card = () => ({ background: "#fff", padding: 14, borderRadius: 14 });
const inp = () => ({ padding: 10, borderRadius: 10, border: "1px solid #ddd" });
const btnPrimary = () => ({
  padding: 10,
  borderRadius: 10,
  border: "none",
  background: "#111",
  color: "#fff",
  cursor: "pointer",
});
const btnSecondary = () => ({
  padding: "6px 10px",
  borderRadius: 10,
  border: "1px solid #ddd",
  background: "#fff",
  color: "#111",
  cursor: "pointer",
});
const btnDanger = () => ({
  padding: "6px 10px",
  borderRadius: 10,
  border: "1px solid #f2b8b5",
  background: "#fff",
  color: "#b00020",
  cursor: "pointer",
});
const btnGhost = () => ({
  padding: "6px 10px",
  borderRadius: 10,
  border: "1px solid #e5e7eb",
  background: "#fff",
  color: "#111",
  cursor: "pointer",
});