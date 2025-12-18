import { useEffect, useMemo, useState } from "react";
import {
  createVehicle,
  deleteVehicle,
  listVehicles,
  updateVehicle, // <-- pastikan ada di service kamu
} from "../../services/vehiclesService";

export default function VehiclesList() {
  // ===== FORM STATE =====
  const [brand, setBrand] = useState("");
  const [plate, setPlate] = useState("");

  // ===== SEARCH + DEBOUNCE =====
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 250);

  // ===== REFRESH KEY =====
  const [refreshKey, setRefreshKey] = useState(0);

  // ===== SORT =====
  const [sort, setSort] = useState({ key: "brand", dir: "asc" }); // key: brand|plate

  // ===== TOAST =====
  const [toast, setToast] = useState(null); // {type:'success'|'error', msg:string}

  // ===== DELETE MODAL =====
  const [deleteTarget, setDeleteTarget] = useState(null); // {id, brand, plate} | null

  // ===== INLINE EDIT =====
  const [editingId, setEditingId] = useState(null);
  const [editBrand, setEditBrand] = useState("");
  const [editPlate, setEditPlate] = useState("");

  // ===== LOAD VEHICLES =====
  const vehiclesRaw = useMemo(() => {
    // listVehicles(search) kamu kemungkinan sudah filter di service.
    // Kita lempar debouncedSearch agar tidak "ngegas" tiap ketik 1 huruf.
    return listVehicles(debouncedSearch);
  }, [debouncedSearch, refreshKey]);

  // ===== SORTED VEHICLES =====
  const vehicles = useMemo(() => {
    const arr = [...vehiclesRaw];
    const { key, dir } = sort;

    arr.sort((a, b) => {
      const va = (a[key] || "").toString().toLowerCase();
      const vb = (b[key] || "").toString().toLowerCase();
      if (va < vb) return dir === "asc" ? -1 : 1;
      if (va > vb) return dir === "asc" ? 1 : -1;
      return 0;
    });

    return arr;
  }, [vehiclesRaw, sort]);

  // ===== HELPERS =====
  const refresh = () => setRefreshKey((x) => x + 1);

  const showToast = (type, msg) => setToast({ type, msg });

  const normalizedPlate = (value) => normalizePlate(value);

  const validateForm = (b, p) => {
    const brandOk = b.trim().length >= 2;
    const plateOk = normalizePlate(p).length >= 4; // simple rule biar gak ribet
    return brandOk && plateOk;
  };

  const canSubmit = validateForm(brand, plate);

  // ===== ADD =====
  const onAdd = (e) => {
    e.preventDefault();

    const payload = {
      brand: brand.trim(),
      plate: normalizePlate(plate),
    };

    if (!validateForm(payload.brand, payload.plate)) {
      showToast("error", "Isi merk & plat dulu ya. Yang benar, bukan yang baper.");
      return;
    }

    try {
      createVehicle(payload);
      setBrand("");
      setPlate("");
      refresh();
      showToast("success", "Kendaraan berhasil ditambahkan ✅");
    } catch (err) {
      showToast("error", err?.message || "Gagal menambah kendaraan.");
    }
  };

  // ===== DELETE =====
  const requestDelete = (v) => setDeleteTarget(v);

  const confirmDelete = () => {
    if (!deleteTarget) return;
    try {
      deleteVehicle(deleteTarget.id);
      setDeleteTarget(null);
      refresh();
      showToast("success", "Kendaraan dihapus 🗑️");
    } catch (err) {
      showToast("error", err?.message || "Gagal menghapus kendaraan.");
    }
  };

  // ===== EDIT =====
  const startEdit = (v) => {
    setEditingId(v.id);
    setEditBrand(v.brand || "");
    setEditPlate(v.plate || "");
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditBrand("");
    setEditPlate("");
  };

  const saveEdit = (id) => {
    const payload = {
      id,
      brand: editBrand.trim(),
      plate: normalizePlate(editPlate),
    };

    if (!validateForm(payload.brand, payload.plate)) {
      showToast("error", "Data edit belum valid. Jangan asal ganti plat.");
      return;
    }

    try {
      updateVehicle(payload); // <-- penting
      cancelEdit();
      refresh();
      showToast("success", "Perubahan disimpan ✨");
    } catch (err) {
      showToast("error", err?.message || "Gagal menyimpan perubahan.");
    }
  };

  // ===== SORT TOGGLE =====
  const toggleSort = (key) => {
    setSort((prev) => {
      if (prev.key !== key) return { key, dir: "asc" };
      return { key, dir: prev.dir === "asc" ? "desc" : "asc" };
    });
  };

  return (
    <div>
      <h2 style={{ marginTop: 0, color: THEME.textTitle }}>Kendaraan</h2>

      {/* TOAST */}
      <Toast toast={toast} onClose={() => setToast(null)} />

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
              onChange={(e) => setPlate(normalizedPlate(e.target.value))}
              style={inp()}
              required
            />

            <button style={btnPrimary(!canSubmit)} type="submit" disabled={!canSubmit}>
              Simpan
            </button>
          </form>

          <p style={{ marginTop: 10, color: THEME.textMuted, fontSize: 13 }}>
            Plat nomor wajib unik. Kalau sama, akan ditolak.
          </p>
        </div>

        {/* RIGHT: LIST */}
        <div style={card()}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
            <h3 style={{ marginTop: 0, color: THEME.textTitle }}>Daftar Kendaraan</h3>
            <div style={{ color: THEME.textMuted, fontSize: 13 }}>
              Total: <b style={{ color: THEME.textStrong }}>{vehicles.length}</b>
            </div>
          </div>

          <input
            placeholder="Search merk/plat..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ ...inp(), width: "95%", marginBottom: 10 }}
          />

          <table width="100%" cellPadding="10" style={{ borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: THEME.tableHeadBg, color: THEME.textTitle }}>
                <th align="left" style={thClickable()} onClick={() => toggleSort("brand")}>
                  Merk {sortIcon(sort, "brand")}
                </th>
                <th align="left" style={thClickable()} onClick={() => toggleSort("plate")}>
                  Plat {sortIcon(sort, "plate")}
                </th>
                <th align="left">Aksi</th>
              </tr>
            </thead>

            <tbody>
              {vehicles.map((v) => {
                const isEditing = editingId === v.id;

                return (
                  <tr key={v.id} style={{ borderBottom: `1px solid ${THEME.borderSoft}` }}>
                    <td style={{ color: THEME.textBody }}>
                      {isEditing ? (
                        <input
                          value={editBrand}
                          onChange={(e) => setEditBrand(e.target.value)}
                          style={{ ...inp(), width: "100%" }}
                        />
                      ) : (
                        <Highlighted text={v.brand} q={debouncedSearch} />
                      )}
                    </td>

                    <td>
                      {isEditing ? (
                        <input
                          value={editPlate}
                          onChange={(e) => setEditPlate(normalizePlate(e.target.value))}
                          style={{ ...inp(), width: "100%" }}
                        />
                      ) : (
                        <b style={{ color: THEME.textStrong }}>
                          <Highlighted text={v.plate} q={debouncedSearch} strong />
                        </b>
                      )}
                    </td>

                    <td style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      {isEditing ? (
                        <>
                          <button onClick={() => saveEdit(v.id)} style={btnPrimary(false)} type="button">
                            Simpan
                          </button>
                          <button onClick={cancelEdit} style={btnGhost()} type="button">
                            Batal
                          </button>
                        </>
                      ) : (
                        <>
                          <button onClick={() => startEdit(v)} style={btnGhost()} type="button">
                            Edit
                          </button>
                          <button onClick={() => requestDelete(v)} style={btnDanger()} type="button">
                            Hapus
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                );
              })}

              {!vehicles.length && (
                <tr>
                  <td colSpan="3" style={{ color: THEME.textMuted }}>
                    Belum ada data. Tambahin 1 dulu biar tabelnya gak kesepian.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* DELETE MODAL */}
      <Modal
        open={!!deleteTarget}
        title="Konfirmasi Hapus"
        onClose={() => setDeleteTarget(null)}
        footer={
          <>
            <button style={btnGhost()} onClick={() => setDeleteTarget(null)}>
              Batal
            </button>
            <button style={btnDanger()} onClick={confirmDelete}>
              Ya, Hapus
            </button>
          </>
        }
      >
        {deleteTarget ? (
          <div style={{ color: THEME.textBody, lineHeight: 1.5 }}>
            Hapus kendaraan:
            <div style={{ marginTop: 8 }}>
              <b>{deleteTarget.brand}</b> — <b>{deleteTarget.plate}</b>
            </div>
            <div style={{ marginTop: 8, color: THEME.textMuted, fontSize: 13 }}>
              Ini beneran dihapus ya, bukan di-“ghosting”.
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}

/* =========================
   HOOK: DEBOUNCE
========================= */
function useDebounce(value, delay = 300) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return v;
}

function normalizePlate(s) {
  return (s || "")
    .toUpperCase()
    .replace(/[^A-Z0-9 ]/g, " ")
    .replace(/\s+/g, " ");
}

/* =========================
   UI: HIGHLIGHT
========================= */
function Highlighted({ text, q, strong }) {
  const t = (text ?? "").toString();
  const query = (q ?? "").trim();
  if (!query) return <span>{t}</span>;

  const idx = t.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return <span>{t}</span>;

  const before = t.slice(0, idx);
  const match = t.slice(idx, idx + query.length);
  const after = t.slice(idx + query.length);

  return (
    <span>
      {before}
      <span
        style={{
          background: THEME.softBg,
          border: `1px solid ${THEME.borderSoft}`,
          padding: "0 4px",
          borderRadius: 6,
          fontWeight: strong ? 900 : 700,
        }}
      >
        {match}
      </span>
      {after}
    </span>
  );
}

/* =========================
   UI: TOAST
========================= */
function Toast({ toast, onClose }) {
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(onClose, 2200);
    return () => clearTimeout(t);
  }, [toast, onClose]);

  if (!toast) return null;

  const isErr = toast.type === "error";
  return (
    <div
      style={{
        position: "fixed",
        right: 16,
        top: 16,
        zIndex: 9999,
        background: "#fff",
        border: `1px solid ${isErr ? "#f2b8b5" : THEME.borderSoft}`,
        boxShadow: "0 10px 24px rgba(15, 23, 42, 0.12)",
        padding: 12,
        borderRadius: 14,
        minWidth: 260,
      }}
    >
      <div style={{ fontWeight: 900, color: isErr ? THEME.danger : THEME.textTitle }}>
        {isErr ? "Oops" : "Sip"}
      </div>
      <div style={{ marginTop: 4, color: THEME.textBody }}>{toast.msg}</div>
    </div>
  );
}

/* =========================
   UI: MODAL
========================= */
function Modal({ open, title, children, footer, onClose }) {
  if (!open) return null;

  return (
    <div
      onMouseDown={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(15,23,42,0.35)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9998,
        padding: 16,
      }}
    >
      <div
        onMouseDown={(e) => e.stopPropagation()}
        style={{
          width: "min(520px, 100%)",
          background: "#fff",
          borderRadius: 18,
          border: `1px solid ${THEME.borderSoft}`,
          boxShadow: "0 18px 40px rgba(15, 23, 42, 0.25)",
          overflow: "hidden",
        }}
      >
        <div style={{ padding: 14, borderBottom: `1px solid ${THEME.borderSoft}` }}>
          <div style={{ fontWeight: 900, color: THEME.textTitle }}>{title}</div>
        </div>

        <div style={{ padding: 14 }}>{children}</div>

        <div
          style={{
            padding: 14,
            borderTop: `1px solid ${THEME.borderSoft}`,
            display: "flex",
            gap: 10,
            justifyContent: "flex-end",
            flexWrap: "wrap",
          }}
        >
          {footer}
        </div>
      </div>
    </div>
  );
}

/* =========================
   SORT ICON
========================= */
function sortIcon(sort, key) {
  if (sort.key !== key) return <span style={{ opacity: 0.35 }}>↕</span>;
  return sort.dir === "asc" ? <span>↑</span> : <span>↓</span>;
}

/* =========================
   THEME + STYLES
========================= */
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

const btnPrimary = (disabled) => ({
  padding: 10,
  borderRadius: 10,
  border: "none",
  background: disabled ? "#93c5fd" : THEME.primary,
  color: "#fff",
  fontWeight: 900,
  cursor: disabled ? "not-allowed" : "pointer",
});

const btnDanger = () => ({
  padding: "8px 12px",
  borderRadius: 10,
  border: "1px solid #f2b8b5",
  background: "#ffffff",
  color: THEME.danger,
  fontWeight: 900,
  cursor: "pointer",
});

const btnGhost = () => ({
  padding: "8px 12px",
  borderRadius: 10,
  border: `1px solid ${THEME.borderSoft}`,
  background: "#ffffff",
  color: THEME.textTitle,
  fontWeight: 900,
  cursor: "pointer",
});

const thClickable = () => ({
  cursor: "pointer",
  userSelect: "none",
});