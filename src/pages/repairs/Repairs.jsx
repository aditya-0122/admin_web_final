import { useEffect, useMemo, useState } from "react";
import { listParts } from "../../services/inventoryService";
import { finalizeRepair, listRepairs } from "../../services/repairsService";
import { listTechnicians } from "../../services/usersService";
import { socket } from "../../lib/socket";

export default function Repairs() {
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState(null);
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);

  const [repairs, setRepairs] = useState([]);
  const [parts, setParts] = useState([]);
  const [technicians, setTechnicians] = useState([]);

  // form finalisasi
  const [technicianId, setTechnicianId] = useState("");
  const [action, setAction] = useState("");
  const [cost, setCost] = useState("");

  const [partId, setPartId] = useState("");
  const [qty, setQty] = useState(1);
  const [partsUsed, setPartsUsed] = useState([]);

  // ✅ PAGINATION
  const PAGE_SIZE = 5;
  const [page, setPage] = useState(1);

  const loadAll = async () => {
    setLoading(true);
    setMsg("");
    try {
      const [rData, pData, tData] = await Promise.all([
        listRepairs({ search }),
        listParts(""), // sesuai punyamu
        listTechnicians(),
      ]);

      setRepairs(Array.isArray(rData) ? rData : []);
      setParts(Array.isArray(pData) ? pData : []);
      setTechnicians(Array.isArray(tData) ? tData : []);
    } catch (e) {
      setMsg(`❌ ${e?.message || "Gagal memuat data."}`);
      setRepairs([]);
      setParts([]);
      setTechnicians([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  // ==========================
  // 🔴 REALTIME REPAIR SYNC
  // ==========================
  useEffect(() => {
    socket.connect();
    socket.emit("join", "admin");

    const refresh = () => loadAll();

    socket.on("repair.created", refresh);
    socket.on("repair.finalized", refresh);
    socket.on("damage_report.followup_approved", refresh);

    return () => {
      socket.off("repair.created", refresh);
      socket.off("repair.finalized", refresh);
      socket.off("damage_report.followup_approved", refresh);
      socket.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selected = useMemo(() => {
    if (!selectedId) return null;
    return repairs.find((r) => Number(r.id) === Number(selectedId)) || null;
  }, [repairs, selectedId]);

  // ✅ PAGINATION computed
  const totalPages = useMemo(() => {
    return Math.max(1, Math.ceil((repairs?.length || 0) / PAGE_SIZE));
  }, [repairs]);

  useEffect(() => {
    // kalau search berubah / data berubah, pastikan page valid
    setPage((p) => Math.min(Math.max(1, p), totalPages));
  }, [totalPages]);

  useEffect(() => {
    // reset ke page 1 kalau search berubah
    setPage(1);
  }, [search]);

  const repairsPaged = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return (repairs || []).slice(start, start + PAGE_SIZE);
  }, [repairs, page]);

  const open = (r) => {
    setSelectedId(Number(r.id));
    setMsg("");

    // isi form:
    setTechnicianId(r.technician_id ? String(r.technician_id) : "");
    setAction(r.action || "");
    setCost(r.cost != null ? String(r.cost) : "");

    setPartsUsed(Array.isArray(r.partsUsed) ? r.partsUsed : []);
    setPartId("");
    setQty(1);
  };

  const resolvePart = (id) => parts.find((p) => Number(p.id) === Number(id));

  const addPart = () => {
    if (!partId) return;
    const pid = Number(partId);
    const q = Number(qty);
    if (!pid || !q || q <= 0) return;

    setPartsUsed((prev) => {
      const exist = prev.find((x) => Number(x.partId) === pid);
      if (exist) {
        return prev.map((x) =>
          Number(x.partId) === pid ? { ...x, qty: Number(x.qty) + q } : x
        );
      }
      return [...prev, { partId: pid, qty: q }];
    });

    setPartId("");
    setQty(1);
  };

  const removePart = (pid) =>
    setPartsUsed((prev) => prev.filter((x) => Number(x.partId) !== Number(pid)));

  const onFinalize = async () => {
    if (!selected) return;
    setLoading(true);
    setMsg("");
    try {
      await finalizeRepair({
        id: selected.id,
        technicianId,
        action,
        cost,
        partsUsed,
      });

      setSelectedId(null);
      setMsg("✅ Finalisasi berhasil.");
      await loadAll();
    } catch (e) {
      setMsg(`❌ ${e?.message || "Gagal."}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ paddingBottom: 40 }}>
      <h2 style={{ marginTop: 0, color: THEME.textTitle }}>Riwayat Perbaikan</h2>

      <div style={card()}>
        <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 15 }}>
          <h3 style={{ margin: 0, flex: 1, color: THEME.textTitle }}>Daftar Repair</h3>

          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search plat/tindakan/teknisi..."
            style={{ ...inp(), width: 320 }}
          />

          <button style={btn()} type="button" onClick={loadAll} disabled={loading}>
            {loading ? "Loading..." : "Refresh"}
          </button>
        </div>

        {msg && (
          <div style={{ marginBottom: 10, color: msg.startsWith("❌") ? THEME.danger : THEME.primary, fontWeight: 700 }}>
            {msg}
          </div>
        )}

        {/* table wrapper biar ga maksa layar kecil */}
        <div style={{ overflowX: "auto" }}>
          <table style={tableStyle()}>
            <thead>
              <tr>
                <th style={thStyle()}>Tanggal</th>
                <th style={thStyle()}>Plat</th>
                <th style={thStyle()}>Status</th>
                <th style={thStyle()}>Tindakan</th>
                <th style={thStyle()}>Biaya</th>
                <th style={thStyle()}>Aksi</th>
              </tr>
            </thead>

            <tbody>
              {repairsPaged.map((r) => (
                <tr key={r.id}>
                  <td style={tdStyle()}>{r.date}</td>
                  <td style={tdStyle()}>
                    <b style={{ color: THEME.textStrong }}>{r.vehiclePlate}</b>
                  </td>
                  <td style={tdStyle()}>
                    <span style={statusPill(r.finalized)}>{r.finalized ? "FINAL" : "DRAFT"}</span>
                  </td>
                  <td style={tdStyle()}>
                    {r.action || <span style={{ color: THEME.textMuted }}>- belum diisi -</span>}
                  </td>
                  <td style={tdStyle()}>Rp {Number(r.cost || 0).toLocaleString("id-ID")}</td>
                  <td style={tdStyle()}>
                    <button style={btn()} onClick={() => open(r)} disabled={loading}>
                      {r.finalized ? "Lihat" : "Finalisasi"}
                    </button>
                  </td>
                </tr>
              ))}

              {!repairs.length && (
                <tr>
                  <td colSpan="6" style={{ ...tdStyle(), textAlign: "center", color: THEME.textMuted }}>
                    Belum ada data repair.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* ✅ Pagination controls (muncul kalau data > 5) */}
        {repairs.length > PAGE_SIZE && (
          <div
            style={{
              marginTop: 12,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 10,
              flexWrap: "wrap",
            }}
          >
            <div style={{ color: THEME.textMuted, fontSize: 13, fontWeight: 700 }}>
              Menampilkan {(page - 1) * PAGE_SIZE + 1}-
              {Math.min(page * PAGE_SIZE, repairs.length)} dari {repairs.length} • Hal {page}/{totalPages}
            </div>

            <div style={{ display: "flex", gap: 8 }}>
              <button
                style={btnPager(page === 1)}
                disabled={page === 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                type="button"
              >
                Prev
              </button>

              <button
                style={btnPager(page === totalPages)}
                disabled={page === totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                type="button"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {selected && (
        <div style={{ ...card(), marginTop: 20 }}>
          <h3 style={{ marginTop: 0, color: THEME.textTitle }}>
            {selected.vehiclePlate} — {selected.finalized ? "Detail Repair" : "Finalisasi Repair"}
          </h3>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <select
              value={technicianId}
              onChange={(e) => setTechnicianId(e.target.value)}
              style={inp()}
              disabled={selected.finalized || loading}
            >
              <option value="">Pilih teknisi</option>
              {technicians.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.username} (id:{t.id})
                </option>
              ))}
            </select>

            <input
              value={cost}
              onChange={(e) => setCost(e.target.value)}
              type="number"
              placeholder="Biaya (akan masuk Finance)"
              style={inp()}
              disabled={selected.finalized || loading}
            />

            <input
              value={action}
              onChange={(e) => setAction(e.target.value)}
              placeholder="Tindakan / perbaikan"
              style={{ ...inp(), gridColumn: "1 / -1" }}
              disabled={selected.finalized || loading}
            />
          </div>

          <div style={partsBox()}>
            <div style={{ fontWeight: 800, marginBottom: 8, color: THEME.textTitle }}>
              Sparepart digunakan
            </div>

            {!selected.finalized && (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 90px 90px", gap: 8, marginBottom: 10 }}>
                <select value={partId} onChange={(e) => setPartId(e.target.value)} style={inp()} disabled={loading}>
                  <option value="">Pilih sparepart</option>
                  {parts.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.sku} — {p.name} (stok:{p.stock})
                    </option>
                  ))}
                </select>

                <input
                  type="number"
                  value={qty}
                  onChange={(e) => setQty(e.target.value)}
                  style={inp()}
                  min={1}
                  disabled={loading}
                />

                <button type="button" onClick={addPart} style={btnPrimary()} disabled={loading}>
                  Tambah
                </button>
              </div>
            )}

            <div style={{ display: "grid", gap: 6 }}>
              {partsUsed.map((x) => {
                const p = resolvePart(x.partId);
                return (
                  <div key={x.partId} style={partItem()}>
                    <div style={{ color: THEME.textBody }}>
                      {p?.name || "-"} — qty: <b style={{ color: THEME.textStrong }}>{x.qty}</b>
                    </div>
                    {!selected.finalized && (
                      <button type="button" onClick={() => removePart(x.partId)} style={btnDanger()} disabled={loading}>
                        hapus
                      </button>
                    )}
                  </div>
                );
              })}
              {!partsUsed.length && <div style={{ color: THEME.textMuted }}>Belum ada sparepart.</div>}
            </div>
          </div>

          <div style={{ display: "flex", gap: 10, marginTop: 15 }}>
            {!selected.finalized && (
              <button style={btnPrimary()} onClick={onFinalize} disabled={loading}>
                {loading ? "Memproses..." : "Finalisasi"}
              </button>
            )}
            <button style={btn()} onClick={() => setSelectedId(null)} disabled={loading}>
              Tutup
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

const THEME = {
  primary: "#0ea5e9",
  softBg: "#f0f9ff",
  border: "#bae6fd",
  borderSoft: "#e2e8f0",
  textTitle: "#0369a1",
  textStrong: "#0f172a",
  textBody: "#334155",
  textMuted: "#64748b",
  danger: "#e11d48",
};

const card = () => ({
  background: "#ffffff",
  padding: 20,
  borderRadius: 16,
  border: `1px solid ${THEME.border}`,
  boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.05)",
});

const inp = () => ({
  padding: "10px 14px",
  borderRadius: "10px",
  border: `1px solid ${THEME.borderSoft}`,
  background: "#f8fafc",
  outline: "none",
});

const btn = () => ({
  padding: "8px 16px",
  borderRadius: "10px",
  border: `1px solid ${THEME.border}`,
  background: THEME.softBg,
  color: THEME.textTitle,
  fontWeight: "700",
  cursor: "pointer",
});

const btnPager = (disabled) => ({
  ...btn(),
  opacity: disabled ? 0.6 : 1,
  cursor: disabled ? "not-allowed" : "pointer",
});

const btnPrimary = () => ({
  padding: "10px 20px",
  borderRadius: "10px",
  border: "none",
  background: THEME.primary,
  color: "#ffffff",
  fontWeight: "700",
  cursor: "pointer",
});

const btnDanger = () => ({
  padding: "6px 12px",
  borderRadius: "8px",
  border: `1px solid ${THEME.danger}33`,
  background: "#fff1f2",
  color: THEME.danger,
  fontWeight: "700",
  cursor: "pointer",
  fontSize: "12px",
});

const tableStyle = () => ({
  width: "100%",
  borderCollapse: "collapse",
  border: `1px solid ${THEME.borderSoft}`,
  minWidth: 760,
});

const thStyle = () => ({
  background: "#f8fafc",
  padding: "12px",
  border: `1px solid ${THEME.borderSoft}`,
  textAlign: "left",
  color: THEME.textTitle,
  fontSize: "14px",
});

const tdStyle = () => ({
  padding: "12px",
  border: `1px solid ${THEME.borderSoft}`,
  fontSize: "14px",
  color: THEME.textBody,
});

const partsBox = () => ({
  marginTop: 15,
  padding: 15,
  borderRadius: 12,
  background: "#f8fafc",
  border: `1px solid ${THEME.borderSoft}`,
});

const partItem = () => ({
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  padding: "8px 12px",
  background: "#fff",
  border: `1px solid ${THEME.borderSoft}`,
  borderRadius: "8px",
});

const statusPill = (finalized) => ({
  padding: "4px 10px",
  borderRadius: 999,
  background: finalized ? "#dcfce7" : "#fef3c7",
  color: finalized ? "#15803d" : "#b45309",
  fontSize: "12px",
  fontWeight: "800",
});