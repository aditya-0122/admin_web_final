import { useEffect, useState } from "react";
import {
  createPart,
  deletePart,
  listParts,
  listStockMovements,
  stockMove,
  updatePart,

  //  approve/reject permintaan teknisi
  listPartUsages,
  approvePartUsage,
  rejectPartUsage,
} from "../../services/inventoryService";

// socket client
import { socket } from "../../lib/socket";

export default function Inventory() {
  const [search, setSearch] = useState("");
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);

  // data
  const [parts, setParts] = useState([]);
  const [moves, setMoves] = useState([]);

  // data part usage request (pending)
  const [usageLoading, setUsageLoading] = useState(false);
  const [usages, setUsages] = useState([]);

  // create/edit form
  const [name, setName] = useState("");
  const [sku, setSku] = useState("");
  const [stock, setStock] = useState(0);
  const [minStock, setMinStock] = useState(0);
  const [buyPrice, setBuyPrice] = useState(0);
  const [editingId, setEditingId] = useState(null);

  // stock IN form
  const [partId, setPartId] = useState("");
  const [qty, setQty] = useState(1);
  const [note, setNote] = useState("");

  // note untuk approve / reject
  const [approveNote, setApproveNote] = useState("");
  const [rejectReason, setRejectReason] = useState("");

  const loadAll = async () => {
    setLoading(true);
    setMsg("");
    try {
      const [p, m] = await Promise.all([listParts(search), listStockMovements()]);
      setParts(Array.isArray(p) ? p : []);
      setMoves(Array.isArray(m) ? m : []);
    } catch (e) {
      setMsg(`${e.message}`);
      setParts([]);
      setMoves([]);
    } finally {
      setLoading(false);
    }
  };

  // load request sparepart (pending)
  const loadUsages = async () => {
    setUsageLoading(true);
    setMsg("");
    try {
      const u = await listPartUsages({ status: "pending", limit: 100 });
      setUsages(Array.isArray(u) ? u : []);
    } catch (e) {
      setMsg(`${e.message}`);
      setUsages([]);
    } finally {
      setUsageLoading(false);
    }
  };

  // load awal + kalau search berubah
  useEffect(() => {
    loadAll();
    loadUsages();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  useEffect(() => {
    // connect socket sekali (aman kalau socket.io client auto-connect)
    if (typeof socket?.connect === "function" && !socket.connected) {
      socket.connect();
    }

    const joinAdminRoom = () => {
      // dukung dua bentuk join biar kompatibel
      try {
        socket.emit("join", "admin");
      } catch (_) {}
      try {
        socket.emit("join", { room: "admin" });
      } catch (_) {}
    };

    const refreshUsages = () => loadUsages();
    const refreshAll = () => {
      loadAll();
      loadUsages();
    };

    // === handler untuk server yang emit "event" umum ===
    const onGenericEvent = (evt) => {
      const type = evt?.type;

      if (type === "part_usage.requested") refreshUsages();
      if (type === "part_usage.rejected") refreshUsages();
      if (type === "part_usage.approved") refreshAll();

      if (type === "stock_movement.created") refreshAll();
      if (type === "part.created" || type === "part.updated" || type === "part.deleted")
        refreshAll();
    };

    // connect lifecycle
    socket.on("connect", joinAdminRoom);

    // kalau socket sudah keburu connected sebelum listener kepasang
    if (socket.connected) joinAdminRoom();

    // === event spesifik (recommended) ===
    socket.on("part_usage.requested", refreshUsages);
    socket.on("part_usage.rejected", refreshUsages);
    socket.on("part_usage.approved", refreshAll);
    socket.on("stock_movement.created", refreshAll);

    // optional: kalau server kamu kirim event part CRUD
    socket.on("part.created", refreshAll);
    socket.on("part.updated", refreshAll);
    socket.on("part.deleted", refreshAll);

    // === event generic fallback ===
    socket.on("event", onGenericEvent);

    return () => {
      socket.off("connect", joinAdminRoom);

      socket.off("part_usage.requested", refreshUsages);
      socket.off("part_usage.rejected", refreshUsages);
      socket.off("part_usage.approved", refreshAll);
      socket.off("stock_movement.created", refreshAll);

      socket.off("part.created", refreshAll);
      socket.off("part.updated", refreshAll);
      socket.off("part.deleted", refreshAll);

      socket.off("event", onGenericEvent);
    };
  }, []);

  const resetForm = () => {
    setName("");
    setSku("");
    setStock(0);
    setMinStock(0);
    setBuyPrice(0);
    setEditingId(null);
  };

  const onAddOrUpdate = async (e) => {
    e.preventDefault();
    setMsg("");
    try {
      if (editingId) {
        await updatePart(editingId, { name, sku, minStock, buyPrice });
        setMsg("Sparepart berhasil di-update.");
      } else {
        await createPart({ name, sku, stock, minStock, buyPrice });
        setMsg("Sparepart ditambahkan.");
      }
      resetForm();
      await loadAll();
    } catch (e2) {
      setMsg(`${e2.message}`);
    }
  };

  const onEdit = (p) => {
    setMsg("");
    setEditingId(p.id);
    setName(p.name || "");
    setSku(p.sku || "");
    setStock(0);
    setMinStock(Number(p.min_stock ?? p.minStock ?? 0));
    setBuyPrice(Number(p.buy_price ?? p.buyPrice ?? 0));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const onDelete = async (id) => {
    if (!confirm("Hapus sparepart ini?")) return;
    setMsg("");
    try {
      await deletePart(id);
      setMsg("Sparepart dihapus.");
      if (editingId === id) resetForm();
      await loadAll();
    } catch (e) {
      setMsg(`${e.message}`);
    }
  };

  const onMove = async (e) => {
    e.preventDefault();
    setMsg("");
    try {
      await stockMove({
        partId,
        type: "IN",
        qty,
        note,
      });

      setNote("");
      setQty(1);
      setPartId("");
      setMsg("✅ Stok masuk berhasil diperbarui.");
      await loadAll();
    } catch (e2) {
      setMsg(`❌ ${e2.message}`);
    }
  };

  //Approve request sparepart (stok OUT harus terjadi di backend)
  const onApproveUsage = async (u) => {
    if (!confirm("Approve permintaan sparepart ini? Stok akan OUT otomatis.")) return;
    setMsg("");
    try {
      await approvePartUsage(u.id, {
        note: approveNote || null,
        ref: u?.ref ?? null,
        date: null,
      });
      setApproveNote("");
      setMsg("Permintaan disetujui. Stok OUT diproses.");
      await Promise.all([loadAll(), loadUsages()]);
    } catch (e) {
      setMsg(`${e.message}`);
    }
  };

  //Reject request sparepart
  const onRejectUsage = async (u) => {
    if (!confirm("Reject permintaan sparepart ini?")) return;
    setMsg("");
    try {
      await rejectPartUsage(u.id, { reason: rejectReason || null });
      setRejectReason("");
      setMsg("Permintaan ditolak.");
      await loadUsages();
    } catch (e) {
      setMsg(`${e.message}`);
    }
  };

  // helper biar tanggalnya aman walau formatnya beda
  const fmtDate = (x) => {
    if (!x) return "-";
    return String(x).slice(0, 10);
  };

  // helper aman baca relasi (u.part, u.damageReport, u.technician dll)
  const uPartName = (u) => u?.part?.name ?? "-";
  const uPartSku = (u) => u?.part?.sku ?? "-";
  const uQty = (u) => u?.qty ?? "-";
  const uTech = (u) => u?.technician?.username ?? u?.user?.username ?? "-";
  const uReportId = (u) =>
    u?.damage_report_id ?? u?.damageReport?.id ?? u?.damage_report?.id ?? "-";
  const uPlate = (u) => {
    const dr = u?.damageReport ?? u?.damage_report;
    const v = dr?.vehicle;
    return v?.plate_number ?? "-";
  };

  return (
    <div>
      <h2 style={{ marginTop: 0 }}>Suku Cadang & Inventaris</h2>

      {msg && (
        <div
          style={{
            marginBottom: 10,
            color: msg.startsWith("❌") ? "#b00020" : "#1b5e20",
          }}
        >
          {msg}
        </div>
      )}

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

            <button style={btnPrimary()} disabled={loading}>
              {loading ? "Loading..." : editingId ? "Update" : "Simpan"}
            </button>
          </form>
        </div>

        <div style={card()}>
          <h3 style={{ marginTop: 0 }}>Stok Masuk (Restock)</h3>

          <form onSubmit={onMove} style={{ display: "grid", gap: 10 }}>
            <select value={partId} onChange={(e) => setPartId(e.target.value)} style={inp()} required>
              <option value="">Pilih sparepart</option>
              {parts.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.sku} — {p.name} (stok: {p.stock})
                </option>
              ))}
            </select>

            <select value="IN" style={inp()} disabled>
              <option value="IN">IN (Masuk)</option>
            </select>

            <input type="number" value={qty} onChange={(e) => setQty(e.target.value)} style={inp()} min={1} />
            <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Catatan (opsional)" style={inp()} />
            <button style={btnPrimary()} disabled={loading}>
              Proses IN
            </button>
          </form>
        </div>
      </div>

      {/*Approval request sparepart teknisi */}
      <div style={{ ...card(), marginTop: 16 }}>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <h3 style={{ margin: 0, flex: 1 }}>Approval Permintaan Sparepart (Teknisi)</h3>
          <button style={btnSecondary()} onClick={loadUsages} disabled={usageLoading} type="button">
            {usageLoading ? "Loading..." : "Refresh"}
          </button>
        </div>

        <div style={{ marginTop: 10, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <input value={approveNote} onChange={(e) => setApproveNote(e.target.value)} placeholder="Catatan approve (opsional)" style={inp()} />
          <input value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} placeholder="Alasan reject (opsional)" style={inp()} />
        </div>

        <table width="100%" cellPadding="10" style={{ borderCollapse: "collapse", marginTop: 10 }}>
          <thead>
            <tr style={{ background: "#f3f4f6" }}>
              <th align="left">Tanggal</th>
              <th align="left">Teknisi</th>
              <th align="left">Laporan</th>
              <th align="left">Plat</th>
              <th align="left">Sparepart</th>
              <th align="left">Qty</th>
              <th align="left">Status</th>
              <th align="left">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {usages.map((u) => (
              <tr key={u.id} style={{ borderBottom: "1px solid #eee" }}>
                <td>{fmtDate(u.created_at ?? u.date)}</td>
                <td>{uTech(u)}</td>
                <td>#{uReportId(u)}</td>
                <td>{uPlate(u)}</td>
                <td>
                  <b>{uPartSku(u)}</b> — {uPartName(u)}
                </td>
                <td>{uQty(u)}</td>
                <td style={{ color: "#111" }}>{u.status ?? "pending"}</td>
                <td style={{ display: "flex", gap: 8 }}>
                  <button style={btnPrimarySmall()} onClick={() => onApproveUsage(u)}>
                    Approve
                  </button>
                  <button style={btnDanger()} onClick={() => onRejectUsage(u)}>
                    Reject
                  </button>
                </td>
              </tr>
            ))}
            {!usages.length && (
              <tr>
                <td colSpan="8" style={{ color: "#666" }}>
                  Belum ada permintaan sparepart (pending).
                </td>
              </tr>
            )}
          </tbody>
        </table>
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
                <td>
                  <b>{p.sku}</b>
                </td>
                <td>{p.name}</td>
                <td
                  style={{
                    color:
                      Number(p.stock) <= Number(p.min_stock ?? p.minStock ?? 0) ? "#b00020" : "#111",
                  }}
                >
                  {p.stock}
                </td>
                <td>{p.min_stock ?? p.minStock}</td>
                <td>{Number(p.buy_price ?? p.buyPrice ?? 0).toLocaleString("id-ID")}</td>
                <td style={{ display: "flex", gap: 8 }}>
                  <button style={btnSecondary()} onClick={() => onEdit(p)}>
                    Edit
                  </button>
                  <button style={btnDanger()} onClick={() => onDelete(p.id)}>
                    Hapus
                  </button>
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
              <th align="left">Sparepart</th>
              <th align="left">SKU</th>
              <th align="left">Type</th>
              <th align="left">Qty</th>
              <th align="left">Note</th>
            </tr>
          </thead>
          <tbody>
            {moves.slice(0, 10).map((m) => (
              <tr key={m.id} style={{ borderBottom: "1px solid #eee" }}>
                <td>{fmtDate(m.date ?? m.movement_date ?? m.created_at)}</td>
                <td>{m.part?.name ?? "-"}</td>
                <td>{m.part?.sku ?? "-"}</td>
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
                <td colSpan="6" style={{ color: "#666" }}>
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

const theme = {
  primary: "#3B82F6",        
  primarySoft: "#DBEAFE",    
  primaryBorder: "#BFDBFE",  
  primaryDark: "#1D4ED8",    
  text: "#0F172A",
  muted: "#64748B",
  danger: "#DC2626",
  dangerBorder: "#FECACA",
  white: "#FFFFFF",
};

const card = () => ({
  background: theme.white,
  padding: 14,
  borderRadius: 14,
  border: `1px solid ${theme.primaryBorder}`,
  boxShadow: "0 4px 14px rgba(59,130,246,0.12)",
});

const inp = () => ({
  padding: 10,
  borderRadius: 10,
  border: `1px solid ${theme.primaryBorder}`,
  outline: "none",
  background: theme.white,
  color: theme.text,
});

const btnPrimary = () => ({
  padding: 10,
  borderRadius: 10,
  border: "none",
  background: theme.primary,
  color: "#fff",
  cursor: "pointer",
  fontWeight: 600,
});

const btnPrimarySmall = () => ({
  padding: "6px 10px",
  borderRadius: 10,
  border: "none",
  background: theme.primary,
  color: "#fff",
  cursor: "pointer",
  fontWeight: 600,
});

const btnSecondary = () => ({
  padding: "6px 10px",
  borderRadius: 10,
  border: `1px solid ${theme.primaryBorder}`,
  background: theme.primarySoft,
  color: theme.primaryDark,
  cursor: "pointer",
  fontWeight: 600,
});

const btnDanger = () => ({
  padding: "6px 10px",
  borderRadius: 10,
  border: `1px solid ${theme.dangerBorder}`,
  background: "#FEF2F2",
  color: theme.danger,
  cursor: "pointer",
  fontWeight: 600,
});

const btnGhost = () => ({
  padding: "6px 10px",
  borderRadius: 10,
  border: `1px solid ${theme.primaryBorder}`,
  background: theme.white,
  color: theme.primaryDark,
  cursor: "pointer",
});