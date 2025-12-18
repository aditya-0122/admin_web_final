import { useMemo, useState } from "react";
import { loadDb } from "../../services/fakeDb";
import { finalizeRepair, listRepairs } from "../../services/repairsService";

export default function Repairs() {
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState("");
  const [msg, setMsg] = useState("");

  const db = useMemo(() => loadDb(), [msg]);
  const parts = db.parts;
  const technicians = db.users.filter(u => u.role === "technician");

  const repairs = useMemo(() => listRepairs({ search }), [search, msg]);

  const selected = repairs.find(r => r.id === selectedId);

  // form finalisasi
  const [technician, setTechnician] = useState("");
  const [action, setAction] = useState("");
  const [cost, setCost] = useState(0);

  const [partId, setPartId] = useState("");
  const [qty, setQty] = useState(1);
  const [partsUsed, setPartsUsed] = useState([]);

  const open = (r) => {
    setSelectedId(r.id);
    setMsg("");

    setTechnician(r.technician || "");
    setAction(r.action || "");
    setCost(r.cost || 0);

    setPartsUsed(r.partsUsed || []);
    setPartId("");
    setQty(1);
  };

  const addPart = () => {
    if (!partId) return;
    const q = Number(qty);
    if (!q || q <= 0) return;

    setPartsUsed(prev => {
      const exist = prev.find(x => x.partId === partId);
      if (exist) return prev.map(x => x.partId === partId ? { ...x, qty: x.qty + q } : x);
      return [...prev, { partId, qty: q }];
    });

    setPartId("");
    setQty(1);
  };

  const removePart = (id) => setPartsUsed(prev => prev.filter(x => x.partId !== id));
  const resolvePart = (id) => parts.find(p => p.id === id);

  const onFinalize = () => {
    try {
      finalizeRepair({ id: selected.id, technician, action, cost, partsUsed });
      setSelectedId("");
      setMsg("OK");
    } catch (e) {
      setMsg(e.message || "Gagal.");
    }
  };

  return (
    <div>
      <h2 style={{ marginTop: 0 }}>Riwayat Perbaikan</h2>

      <div style={card()}>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <h3 style={{ margin: 0, flex: 1 }}>Daftar Repair (hasil Generate dari Follow-up)</h3>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="search plat/tindakan/teknisi..."
            style={{ ...inp(), width: 320 }}
          />
        </div>

        <table width="100%" cellPadding="10" style={{ borderCollapse: "collapse", marginTop: 10 }}>
          <thead>
            <tr style={{ background: "#f3f4f6" }}>
              <th align="left">Tanggal</th>
              <th align="left">Plat</th>
              <th align="left">Status</th>
              <th align="left">Tindakan</th>
              <th align="left">Biaya</th>
              <th align="left">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {repairs.map(r => (
              <tr key={r.id} style={{ borderBottom: "1px solid #eee" }}>
                <td>{r.date}</td>
                <td><b>{r.vehiclePlate}</b></td>
                <td>
                  <span style={{
                    padding: "4px 10px",
                    borderRadius: 999,
                    background: r.finalized ? "#16a34a22" : "#f59e0b22",
                    color: r.finalized ? "#16a34a" : "#f59e0b",
                    fontWeight: 800
                  }}>
                    {r.finalized ? "FINAL" : "DRAFT"}
                  </span>
                </td>
                <td>{r.action || <span style={{ color: "#666" }}>- belum diisi -</span>}</td>
                <td>{Number(r.cost || 0).toLocaleString("id-ID")}</td>
                <td><button style={btn()} onClick={() => open(r)}>{r.finalized ? "Lihat" : "Finalisasi"}</button></td>
              </tr>
            ))}
            {!repairs.length && (
              <tr><td colSpan="6" style={{ color: "#666" }}>
                Belum ada repair. Buat dari Follow-up status DONE lalu klik Generate Repair.
              </td></tr>
            )}
          </tbody>
        </table>
      </div>

      {selected && (
        <div style={{ ...card(), marginTop: 14 }}>
          <h3 style={{ marginTop: 0 }}>
            {selected.vehiclePlate} — {selected.finalized ? "Detail Repair" : "Finalisasi Repair"}
          </h3>

          {msg && <div style={{ marginBottom: 10, color: "#b00020" }}>{msg}</div>}

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <select value={technician} onChange={(e) => setTechnician(e.target.value)} style={inp()} disabled={selected.finalized}>
              <option value="">Pilih teknisi (opsional)</option>
              {technicians.map(t => <option key={t.id} value={t.username}>{t.username}</option>)}
            </select>

            <input
              value={cost}
              onChange={(e) => setCost(e.target.value)}
              type="number"
              placeholder="Biaya (akan masuk Finance)"
              style={inp()}
              disabled={selected.finalized}
            />

            <input
              value={action}
              onChange={(e) => setAction(e.target.value)}
              placeholder="Tindakan / perbaikan"
              style={{ ...inp(), gridColumn: "1 / -1" }}
              disabled={selected.finalized}
            />
          </div>

          <div style={{ marginTop: 12, padding: 10, borderRadius: 12, border: "1px solid #eee", background: "#fafafa" }}>
            <div style={{ fontWeight: 800, marginBottom: 8 }}>Sparepart digunakan</div>

            {!selected.finalized && (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 90px 90px", gap: 8 }}>
                <select value={partId} onChange={(e) => setPartId(e.target.value)} style={inp()}>
                  <option value="">Pilih sparepart</option>
                  {parts.map(p => <option key={p.id} value={p.id}>{p.sku} — {p.name} (stok:{p.stock})</option>)}
                </select>
                <input type="number" value={qty} onChange={(e) => setQty(e.target.value)} style={inp()} />
                <button type="button" onClick={addPart} style={btn()}>Tambah</button>
              </div>
            )}

            <div style={{ marginTop: 10, display: "grid", gap: 6 }}>
              {partsUsed.map(x => {
                const p = resolvePart(x.partId);
                return (
                  <div key={x.partId} style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                    <div>{p?.name || "-"} — qty: <b>{x.qty}</b></div>
                    {!selected.finalized && (
                      <button type="button" onClick={() => removePart(x.partId)} style={btnDanger()}>hapus</button>
                    )}
                  </div>
                );
              })}
              {!partsUsed.length && <div style={{ color: "#666" }}>Belum ada sparepart.</div>}
            </div>
          </div>

          <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
            {!selected.finalized && (
              <button style={btnPrimary()} onClick={onFinalize}>
                Finalisasi (stok & finance otomatis)
              </button>
            )}
            <button style={btn()} onClick={() => setSelectedId("")}>Tutup</button>
          </div>

          <div style={{ marginTop: 10, color: "#666", fontSize: 13 }}>
            Finalisasi akan: kurangi stok sparepart + catat expense ke Finance.
          </div>
        </div>
      )}
    </div>
  );
}

const card = () => ({ 
  background: "#fff", 
  padding: "20px", 
  borderRadius: "16px", 
  boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)" 
});

const inp = () => ({ 
  padding: "10px 14px", 
  borderRadius: "10px", 
  border: "1px solid #e0f2fe", 
  background: "#f8fafc",
  outline: "none"
});

const btn = () => ({ 
  padding: "8px 14px", 
  borderRadius: "10px", 
  border: "1px solid #bae6fd", 
  background: "#f0f9ff", 
  color: "#0369a1", 
  fontWeight: "600",
  cursor: "pointer"
});

const btnPrimary = () => ({ 
  padding: "10px 16px", 
  borderRadius: "10px", 
  border: "none", 
  background: "#0ea5e9", 
  color: "#fff", 
  fontWeight: "600",
  cursor: "pointer",
  boxShadow: "0 2px 4px rgba(14, 165, 233, 0.3)"
});

const btnDanger = () => ({ 
  padding: "6px 12px", 
  borderRadius: "8px", 
  border: "1px solid #fecaca", 
  background: "#fff1f2", 
  color: "#e11d48", 
  fontSize: "12px",
  fontWeight: "600",
  cursor: "pointer" 
});