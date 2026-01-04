import { useEffect, useMemo, useState } from "react";
import {
  createPart,
  deletePart,
  listParts,
  listStockMovements,
  stockMove,
  updatePart,
  listPartUsages,
  approvePartUsage,
  rejectPartUsage,
} from "../../services/inventoryService";

import { socket } from "../../lib/socket";

export default function Inventory() {
  const [search, setSearch] = useState("");
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);

  // data
  const [parts, setParts] = useState([]);
  const [moves, setMoves] = useState([]);

  // ✅ data part usage request (pending)
  const [usageLoading, setUsageLoading] = useState(false);
  const [usages, setUsages] = useState([]);

  // create/edit form
  const [name, setName] = useState("");
  const [sku, setSku] = useState("");

  // ✅ jangan tampil 0 sebelum user isi → pakai string kosong
  const [stock, setStock] = useState("");      // stok awal saat create
  const [minStock, setMinStock] = useState(""); // min stok
  const [buyPrice, setBuyPrice] = useState(""); // harga beli
  const [editingId, setEditingId] = useState(null);

  // edit buffer
  const [editBrandDummy, setEditBrandDummy] = useState(""); // keep placeholder if needed (not used)
  // stock IN form
  const [partId, setPartId] = useState("");
  const [qty, setQty] = useState(1);
  const [note, setNote] = useState("");

  // ✅ note untuk approve / reject
  const [approveNote, setApproveNote] = useState("");
  const [rejectReason, setRejectReason] = useState("");

  // ==========================
  // ✅ PAGINATION SETTINGS
  // ==========================
  const PAGE_SIZE_PARTS = 8;
  const PAGE_SIZE_MOVES = 10;
  const PAGE_SIZE_USAGES = 8;

  const [pageParts, setPageParts] = useState(1);
  const [pageMoves, setPageMoves] = useState(1);
  const [pageUsages, setPageUsages] = useState(1);

  const resetPages = () => {
    setPageParts(1);
    setPageMoves(1);
    setPageUsages(1);
  };

  const toIntOrNull = (v) => {
    const s = String(v ?? "").trim();
    if (s === "") return null;
    const n = Number(s);
    if (!Number.isFinite(n)) return null;
    return n;
  };

  const loadAll = async () => {
    setLoading(true);
    setMsg("");
    try {
      const [p, m] = await Promise.all([listParts(search), listStockMovements()]);
      setParts(Array.isArray(p) ? p : []);
      setMoves(Array.isArray(m) ? m : []);
    } catch (e) {
      setMsg(`❌ ${e.message}`);
      setParts([]);
      setMoves([]);
    } finally {
      setLoading(false);
    }
  };

  const loadUsages = async () => {
    setUsageLoading(true);
    setMsg("");
    try {
      const u = await listPartUsages({ status: "pending", limit: 100 });
      setUsages(Array.isArray(u) ? u : []);
    } catch (e) {
      setMsg(`❌ ${e.message}`);
      setUsages([]);
    } finally {
      setUsageLoading(false);
    }
  };

  // load awal + kalau search berubah
  useEffect(() => {
    loadAll();
    loadUsages();
    resetPages();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  // =====================
  // REALTIME SOCKET
  // =====================
  useEffect(() => {
    if (typeof socket?.connect === "function" && !socket.connected) {
      socket.connect();
    }

    const joinAdminRoom = () => {
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

    const onGenericEvent = (evt) => {
      const type = evt?.type;

      if (type === "part_usage.requested") refreshUsages();
      if (type === "part_usage.rejected") refreshUsages();
      if (type === "part_usage.approved") refreshAll();

      if (type === "stock_movement.created") refreshAll();
      if (type === "part.created" || type === "part.updated" || type === "part.deleted")
        refreshAll();
    };

    socket.on("connect", joinAdminRoom);
    if (socket.connected) joinAdminRoom();

    socket.on("part_usage.requested", refreshUsages);
    socket.on("part_usage.rejected", refreshUsages);
    socket.on("part_usage.approved", refreshAll);
    socket.on("stock_movement.created", refreshAll);

    socket.on("part.created", refreshAll);
    socket.on("part.updated", refreshAll);
    socket.on("part.deleted", refreshAll);

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const resetForm = () => {
    setName("");
    setSku("");
    setStock("");     // ✅ reset ke kosong
    setMinStock("");
    setBuyPrice("");
    setEditingId(null);
  };

  const onAddOrUpdate = async (e) => {
    e.preventDefault();
    setMsg("");
    try {
      if (editingId) {
        await updatePart(editingId, {
          name: name.trim(),
          sku: sku.trim(),
          minStock: toIntOrNull(minStock) ?? 0,
          buyPrice: toIntOrNull(buyPrice) ?? 0,
        });
        setMsg("✅ Sparepart berhasil di-update.");
      } else {
        await createPart({
          name: name.trim(),
          sku: sku.trim(),
          stock: toIntOrNull(stock) ?? 0,
          minStock: toIntOrNull(minStock) ?? 0,
          buyPrice: toIntOrNull(buyPrice) ?? 0,
        });
        setMsg("✅ Sparepart ditambahkan.");
      }
      resetForm();
      await loadAll();
    } catch (e2) {
      setMsg(`❌ ${e2.message}`);
    }
  };

  const onEdit = (p) => {
    setMsg("");
    setEditingId(p.id);

    setName(p.name || "");
    setSku(p.sku || "");

    // ✅ jangan set stok jadi 0 ketika edit → tampilkan stok saat ini (readOnly)
    setStock(String(p.stock ?? "")); // tampil current stock

    setMinStock(String(Number(p.min_stock ?? p.minStock ?? 0)));
    setBuyPrice(String(Number(p.buy_price ?? p.buyPrice ?? 0)));

    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const onDelete = async (id) => {
    if (!confirm("Hapus sparepart ini?")) return;
    setMsg("");
    try {
      await deletePart(id);
      setMsg("✅ Sparepart dihapus.");
      if (editingId === id) resetForm();
      await loadAll();
    } catch (e) {
      setMsg(`❌ ${e.message}`);
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
      setMsg("✅ Permintaan disetujui. Stok OUT diproses.");
      await Promise.all([loadAll(), loadUsages()]);
    } catch (e) {
      setMsg(`❌ ${e.message}`);
    }
  };

  const onRejectUsage = async (u) => {
    if (!confirm("Reject permintaan sparepart ini?")) return;
    setMsg("");
    try {
      await rejectPartUsage(u.id, { reason: rejectReason || null });
      setRejectReason("");
      setMsg("✅ Permintaan ditolak.");
      await loadUsages();
    } catch (e) {
      setMsg(`❌ ${e.message}`);
    }
  };

  const fmtDate = (x) => {
    if (!x) return "-";
    return String(x).slice(0, 10);
  };

  const uPartName = (u) => u?.part?.name ?? "-";
  const uPartSku = (u) => u?.part?.sku ?? "-";
  const uQty = (u) => u?.qty ?? "-";
  const uTech = (u) => u?.technician?.username ?? u?.user?.username ?? "-";
  const uReportId = (u) => u?.damage_report_id ?? u?.damageReport?.id ?? u?.damage_report?.id ?? "-";
  const uPlate = (u) => {
    const dr = u?.damageReport ?? u?.damage_report;
    const v = dr?.vehicle;
    return v?.plate_number ?? "-";
  };

  // ==========================
  // ✅ SORTING + PAGINATION DATA
  // ==========================
  const partsSorted = useMemo(() => {
    const arr = [...(Array.isArray(parts) ? parts : [])];
    arr.sort((a, b) => {
      const sa = `${a?.sku ?? ""}`.toLowerCase();
      const sb = `${b?.sku ?? ""}`.toLowerCase();
      if (sa < sb) return -1;
      if (sa > sb) return 1;
      const na = `${a?.name ?? ""}`.toLowerCase();
      const nb = `${b?.name ?? ""}`.toLowerCase();
      if (na < nb) return -1;
      if (na > nb) return 1;
      return 0;
    });
    return arr;
  }, [parts]);

  const movesSorted = useMemo(() => {
    const arr = [...(Array.isArray(moves) ? moves : [])];
    // terbaru di atas
    arr.sort((a, b) => {
      const ta = new Date(a?.date ?? a?.movement_date ?? a?.created_at ?? 0).getTime();
      const tb = new Date(b?.date ?? b?.movement_date ?? b?.created_at ?? 0).getTime();
      return tb - ta;
    });
    return arr;
  }, [moves]);

  const usagesSorted = useMemo(() => {
    const arr = [...(Array.isArray(usages) ? usages : [])];
    arr.sort((a, b) => {
      const ta = new Date(a?.created_at ?? a?.date ?? 0).getTime();
      const tb = new Date(b?.created_at ?? b?.date ?? 0).getTime();
      return tb - ta;
    });
    return arr;
  }, [usages]);

  const totalPagesParts = Math.max(1, Math.ceil(partsSorted.length / PAGE_SIZE_PARTS));
  const totalPagesMoves = Math.max(1, Math.ceil(movesSorted.length / PAGE_SIZE_MOVES));
  const totalPagesUsages = Math.max(1, Math.ceil(usagesSorted.length / PAGE_SIZE_USAGES));

  useEffect(() => {
    setPageParts((p) => Math.min(p, totalPagesParts));
  }, [totalPagesParts]);

  useEffect(() => {
    setPageMoves((p) => Math.min(p, totalPagesMoves));
  }, [totalPagesMoves]);

  useEffect(() => {
    setPageUsages((p) => Math.min(p, totalPagesUsages));
  }, [totalPagesUsages]);

  const pagePartsData = useMemo(() => {
    const start = (pageParts - 1) * PAGE_SIZE_PARTS;
    return partsSorted.slice(start, start + PAGE_SIZE_PARTS);
  }, [partsSorted, pageParts]);

  const pageMovesData = useMemo(() => {
    const start = (pageMoves - 1) * PAGE_SIZE_MOVES;
    return movesSorted.slice(start, start + PAGE_SIZE_MOVES);
  }, [movesSorted, pageMoves]);

  const pageUsagesData = useMemo(() => {
    const start = (pageUsages - 1) * PAGE_SIZE_USAGES;
    return usagesSorted.slice(start, start + PAGE_SIZE_USAGES);
  }, [usagesSorted, pageUsages]);

  return (
    <div>
      <h2 style={{ marginTop: 0 }}>Suku Cadang & Inventaris</h2>

      {msg && (
        <div
          style={{
            marginBottom: 10,
            color: msg.startsWith("❌") ? "#b00020" : "#1b5e20",
            fontWeight: 700,
          }}
        >
          {msg}
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1.1fr 1fr", gap: 16 }}>
        {/* FORM PART */}
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

            {/* ✅ stok awal: saat create boleh isi, saat edit tampil current stock readOnly */}
            <input
              type="number"
              value={stock}
              onChange={(e) => setStock(e.target.value)}
              placeholder={editingId ? "Stok saat ini (read-only)" : "Stok awal (opsional)"}
              style={inp()}
              readOnly={!!editingId}   // ✅ bukan disabled (biar bisa klik/scroll/select)
            />

            <input
              type="number"
              value={minStock}
              onChange={(e) => setMinStock(e.target.value)}
              placeholder="Min stok (opsional)"
              style={inp()}
            />
            <input
              type="number"
              value={buyPrice}
              onChange={(e) => setBuyPrice(e.target.value)}
              placeholder="Harga beli (opsional)"
              style={inp()}
            />

            <button style={btnPrimary()} disabled={loading}>
              {loading ? "Loading..." : editingId ? "Update" : "Simpan"}
            </button>

            {editingId && (
              <div style={{ fontSize: 12, color: theme.muted, lineHeight: 1.5 }}>
                * Stok tidak diedit dari sini. Pakai menu <b>Stok Masuk (Restock)</b> / (OUT via approval pemakaian teknisi).
              </div>
            )}
          </form>
        </div>

        {/* STOCK IN */}
        <div style={card()}>
          <h3 style={{ marginTop: 0 }}>Stok Masuk (Restock)</h3>

          <form onSubmit={onMove} style={{ display: "grid", gap: 10 }}>
            {/* ✅ searchable select */}
            <SearchableSelect
              value={partId}
              onChange={setPartId}
              options={partsSorted.map((p) => ({
                value: String(p.id),
                label: `${p.sku} — ${p.name}`,
                meta: `(stok: ${p.stock})`,
              }))}
              placeholder="Cari sparepart (SKU / nama)..."
              disabled={loading}
            />

            <select value="IN" style={inp()} disabled>
              <option value="IN">IN (Masuk)</option>
            </select>

            <input
              type="number"
              value={qty}
              onChange={(e) => setQty(e.target.value)}
              style={inp()}
              min={1}
            />
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Catatan (opsional)"
              style={inp()}
            />
            <button style={btnPrimary()} disabled={loading}>
              Proses IN
            </button>
          </form>
        </div>
      </div>

      {/* APPROVAL REQUEST TEKNISI */}
      <div style={{ ...card(), marginTop: 16 }}>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <h3 style={{ margin: 0, flex: 1 }}>Approval Permintaan Sparepart (Teknisi)</h3>
          <button
            style={btnSecondary()}
            onClick={loadUsages}
            disabled={usageLoading}
            type="button"
          >
            {usageLoading ? "Loading..." : "Refresh"}
          </button>
        </div>

        <div style={{ marginTop: 10, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <input
            value={approveNote}
            onChange={(e) => setApproveNote(e.target.value)}
            placeholder="Catatan approve (opsional)"
            style={inp()}
          />
          <input
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder="Alasan reject (opsional)"
            style={inp()}
          />
        </div>

        <DataTableWrapper>
          <table width="100%" cellPadding="10" style={{ borderCollapse: "collapse" }}>
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
              {pageUsagesData.map((u) => (
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
                    <button style={btnPrimarySmall()} onClick={() => onApproveUsage(u)} type="button">
                      Approve
                    </button>
                    <button style={btnDanger()} onClick={() => onRejectUsage(u)} type="button">
                      Reject
                    </button>
                  </td>
                </tr>
              ))}
              {!usagesSorted.length && (
                <tr>
                  <td colSpan="8" style={{ color: "#666" }}>
                    Belum ada permintaan sparepart (pending).
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </DataTableWrapper>

        {usagesSorted.length > 0 && (
          <Pager
            page={pageUsages}
            totalPages={totalPagesUsages}
            totalRows={usagesSorted.length}
            pageSize={PAGE_SIZE_USAGES}
            onPrev={() => setPageUsages((p) => Math.max(1, p - 1))}
            onNext={() => setPageUsages((p) => Math.min(totalPagesUsages, p + 1))}
          />
        )}
      </div>

      {/* PARTS + MOVES */}
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

        <DataTableWrapper>
          <table width="100%" cellPadding="10" style={{ borderCollapse: "collapse" }}>
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
              {pagePartsData.map((p) => (
                <tr key={p.id} style={{ borderBottom: "1px solid #eee" }}>
                  <td><b>{p.sku}</b></td>
                  <td>{p.name}</td>
                  <td
                    style={{
                      color:
                        Number(p.stock) <= Number(p.min_stock ?? p.minStock ?? 0)
                          ? "#b00020"
                          : "#111",
                      fontWeight: 800,
                    }}
                  >
                    {p.stock}
                  </td>
                  <td>{p.min_stock ?? p.minStock}</td>
                  <td>{Number(p.buy_price ?? p.buyPrice ?? 0).toLocaleString("id-ID")}</td>
                  <td style={{ display: "flex", gap: 8 }}>
                    <button style={btnSecondary()} onClick={() => onEdit(p)} type="button">
                      Edit
                    </button>
                    <button style={btnDanger()} onClick={() => onDelete(p.id)} type="button">
                      Hapus
                    </button>
                  </td>
                </tr>
              ))}

              {!partsSorted.length && (
                <tr>
                  <td colSpan="6" style={{ color: "#666" }}>
                    Belum ada data.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </DataTableWrapper>

        {partsSorted.length > 0 && (
          <Pager
            page={pageParts}
            totalPages={totalPagesParts}
            totalRows={partsSorted.length}
            pageSize={PAGE_SIZE_PARTS}
            onPrev={() => setPageParts((p) => Math.max(1, p - 1))}
            onNext={() => setPageParts((p) => Math.min(totalPagesParts, p + 1))}
          />
        )}

        <h4 style={{ marginTop: 16 }}>Log Mutasi Stok (Historical)</h4>

        <DataTableWrapper>
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
              {pageMovesData.map((m) => (
                <tr key={m.id} style={{ borderBottom: "1px solid #eee" }}>
                  <td>{fmtDate(m.date ?? m.movement_date ?? m.created_at)}</td>
                  <td>{m.part?.name ?? "-"}</td>
                  <td>{m.part?.sku ?? "-"}</td>
                  <td><b>{m.type}</b></td>
                  <td>{m.qty}</td>
                  <td style={{ color: "#555" }}>
                    {m.note}
                    {m.ref ? <span style={{ color: "#888" }}> (ref: {m.ref})</span> : ""}
                  </td>
                </tr>
              ))}
              {!movesSorted.length && (
                <tr>
                  <td colSpan="6" style={{ color: "#666" }}>
                    Belum ada mutasi.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </DataTableWrapper>

        {movesSorted.length > 0 && (
          <Pager
            page={pageMoves}
            totalPages={totalPagesMoves}
            totalRows={movesSorted.length}
            pageSize={PAGE_SIZE_MOVES}
            onPrev={() => setPageMoves((p) => Math.max(1, p - 1))}
            onNext={() => setPageMoves((p) => Math.min(totalPagesMoves, p + 1))}
          />
        )}
      </div>
    </div>
  );
}

/* ==========================
   COMPONENTS: DataTable + Pager + SearchableSelect
========================== */

function DataTableWrapper({ children }) {
  return (
    <div
      style={{
        marginTop: 10,
        border: `1px solid ${theme.primaryBorder}`,
        borderRadius: 12,
        overflow: "auto",
        maxHeight: 420,
        background: "#fff",
      }}
    >
      {children}
    </div>
  );
}

function Pager({ page, totalPages, totalRows, pageSize, onPrev, onNext }) {
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(totalRows, page * pageSize);

  return (
    <div
      style={{
        marginTop: 10,
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        gap: 10,
        flexWrap: "wrap",
      }}
    >
      <div style={{ color: theme.muted, fontWeight: 700, fontSize: 13 }}>
        Menampilkan {from}-{to} dari {totalRows} (Hal {page}/{totalPages})
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <button
          style={{
            ...btnSecondary(),
            opacity: page === 1 ? 0.6 : 1,
            cursor: page === 1 ? "not-allowed" : "pointer",
          }}
          onClick={onPrev}
          disabled={page === 1}
          type="button"
        >
          Prev
        </button>
        <button
          style={{
            ...btnSecondary(),
            opacity: page === totalPages ? 0.6 : 1,
            cursor: page === totalPages ? "not-allowed" : "pointer",
          }}
          onClick={onNext}
          disabled={page === totalPages}
          type="button"
        >
          Next
        </button>
      </div>
    </div>
  );
}

// ✅ Searchable select tanpa library
function SearchableSelect({ value, onChange, options, placeholder, disabled }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const selected = options.find((o) => String(o.value) === String(value));

  const filtered = useMemo(() => {
    const s = (q || "").trim().toLowerCase();
    if (!s) return options;
    return options.filter((o) => {
      const label = `${o.label ?? ""} ${o.meta ?? ""}`.toLowerCase();
      return label.includes(s);
    });
  }, [options, q]);

  useEffect(() => {
    const onDoc = (e) => {
      // close kalau klik di luar
      if (!e.target.closest?.("[data-ss-root='1']")) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const pick = (val) => {
    onChange(val);
    setOpen(false);
    setQ("");
  };

  return (
    <div data-ss-root="1" style={{ position: "relative" }}>
      <input
        value={open ? q : selected ? `${selected.label} ${selected.meta ?? ""}` : ""}
        onChange={(e) => {
          setQ(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        placeholder={placeholder}
        style={inp()}
        disabled={disabled}
        readOnly={!open} // saat belum open, input jadi display saja
        onClick={() => setOpen(true)}
      />

      {/* hidden native input untuk required */}
      <input type="hidden" value={value} required />

      {open && !disabled && (
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: "calc(100% + 6px)",
            background: "#fff",
            border: `1px solid ${theme.primaryBorder}`,
            borderRadius: 12,
            boxShadow: "0 12px 30px rgba(15,23,42,0.12)",
            zIndex: 50,
            maxHeight: 260,
            overflow: "auto",
          }}
        >
          {filtered.length ? (
            filtered.map((o) => (
              <div
                key={o.value}
                onMouseDown={(e) => {
                  e.preventDefault();
                  pick(o.value);
                }}
                style={{
                  padding: "10px 12px",
                  cursor: "pointer",
                  borderBottom: "1px solid #f1f5f9",
                  fontWeight: 700,
                  color: "#0f172a",
                }}
              >
                {o.label}{" "}
                {o.meta ? <span style={{ color: theme.muted, fontWeight: 600 }}>{o.meta}</span> : null}
              </div>
            ))
          ) : (
            <div style={{ padding: 12, color: theme.muted }}>Tidak ada hasil.</div>
          )}
        </div>
      )}
    </div>
  );
}

/* =====================
   STYLES (SAME THEME)
===================== */

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