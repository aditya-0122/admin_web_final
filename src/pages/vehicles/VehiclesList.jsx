import { useMemo, useState } from "react";
import { createVehicle, deleteVehicle, listVehicles } from "../../services/vehiclesService";

export default function VehiclesList() {
  const [search, setSearch] = useState("");
  const [brand, setBrand] = useState("");
  const [plate, setPlate] = useState("");
  const [err, setErr] = useState("");

  const vehicles = useMemo(() => listVehicles(search), [search, err]);

  const onAdd = (e) => {
    e.preventDefault();
    setErr("");
    try {
      createVehicle({ brand, plate });
      setBrand("");
      setPlate("");
    } catch (e) {
      setErr(e.message || "Gagal menambah kendaraan.");
    }
  };

  const onDelete = (id) => {
    if (!confirm("Hapus kendaraan ini?")) return;
    deleteVehicle(id);

    // trigger refresh via memo deps (tetap pakai trik kamu)
    setErr("");
    setErr(" ");
    setErr("");
  };

  return (
    <div>
      <h2 style={{ marginTop: 0, color: THEME.textTitle }}>Kendaraan</h2>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        {/* LEFT: ADD */}
        <div style={card()}>
          <h3 style={{ marginTop: 0, color: THEME.textTitle }}>Tambah Kendaraan</h3>

          <form onSubmit={onAdd} style={{ display: "grid", gap: 10 }}>
            <input
              placeholder="Merk (contoh: Toyota)"
              value={brand}
              onChange={(e) => setBrand(e.target.value)}
              style={inp()}
              required
            />

            <input
              placeholder="Plat (contoh: N 1234 AB)"
              value={plate}
              onChange={(e) => setPlate(e.target.value)}
              style={inp()}
              required
            />

            {err && <div style={{ color: THEME.danger, fontWeight: 700 }}>{err}</div>}

            <button style={btnPrimary()} type="submit">
              Simpan
            </button>
          </form>

          <p style={{ marginTop: 10, color: THEME.textMuted, fontSize: 13 }}>
            Plat nomor wajib unik. Kalau sama, ditolak (kayak mantan).
          </p>
        </div>

        {/* RIGHT: LIST */}
        <div style={card()}>
          <h3 style={{ marginTop: 0, color: THEME.textTitle }}>Daftar Kendaraan</h3>

          <input
            placeholder="Search merk/plat..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ ...inp(), width: "100%", marginBottom: 10 }}
          />

          <table width="100%" cellPadding="10" style={{ borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: THEME.tableHeadBg, color: THEME.textTitle }}>
                <th align="left">Merk</th>
                <th align="left">Plat</th>
                <th align="left">Aksi</th>
              </tr>
            </thead>

            <tbody>
              {vehicles.map((v) => (
                <tr key={v.id} style={{ borderBottom: `1px solid ${THEME.borderSoft}` }}>
                  <td style={{ color: THEME.textBody }}>{v.brand}</td>
                  <td>
                    <b style={{ color: THEME.textStrong }}>{v.plate}</b>
                  </td>
                  <td>
                    <button onClick={() => onDelete(v.id)} style={btnDanger()}>
                      Hapus
                    </button>
                  </td>
                </tr>
              ))}

              {!vehicles.length && (
                <tr>
                  <td colSpan="3" style={{ color: THEME.textMuted }}>
                    Belum ada data.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ===== THEME (MATCH SIDEBAR) =====
const THEME = {
  primary: "#2563eb",
  softBg: "#eff6ff",
  border: "#bfdbfe",
  borderSoft: "#e0e7ff",
  tableHeadBg: "#eff6ff",

  textTitle: "#1e3a8a",
  textStrong: "#0f172a",
  textBody: "#334155",
  textMuted: "#64748b",

  danger: "#b00020",
};

// ===== STYLES =====
const card = () => ({
  background: "#ffffff",
  padding: 16,
  borderRadius: 16,
  border: `1px solid ${THEME.border}`,
  boxShadow: "0 6px 16px rgba(15, 23, 42, 0.06)",
});

const inp = () => ({
  padding: 10,
  borderRadius: 10,
  border: `1px solid ${THEME.borderSoft}`,
  background: THEME.softBg,
  outline: "none",
});

const btnPrimary = () => ({
  padding: 10,
  borderRadius: 10,
  border: "none",
  background: THEME.primary,
  color: "#fff",
  fontWeight: 800,
  cursor: "pointer",
});

const btnDanger = () => ({
  padding: "6px 10px",
  borderRadius: 10,
  border: "1px solid #f2b8b5",
  background: "#ffffff",
  color: THEME.danger,
  fontWeight: 800,
  cursor: "pointer",
});
