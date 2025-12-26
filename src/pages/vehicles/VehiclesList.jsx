import { useEffect, useMemo, useState } from "react";
import {
  createVehicle,
  deleteVehicle,
  listVehicles,
  updateVehicle,
} from "../../services/vehiclesService";

export default function VehiclesList() {
  // ===== FORM STATE =====
  const [brand, setBrand] = useState("");
  const [model, setModel] = useState("");
  const [plateNumber, setPlateNumber] = useState("");
  const [year, setYear] = useState("");

  // ===== SEARCH + DEBOUNCE =====
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 250);

  // ===== REFRESH KEY =====
  const [refreshKey, setRefreshKey] = useState(0);

  // ===== SORT =====
  const [sort, setSort] = useState({ key: "brand", dir: "asc" }); // brand|plate_number|model|year

  // ===== TOAST =====
  const [toast, setToast] = useState(null);

  // ===== DELETE MODAL =====
  const [deleteTarget, setDeleteTarget] = useState(null);

  // ===== INLINE EDIT =====
  const [editingId, setEditingId] = useState(null);
  const [editBrand, setEditBrand] = useState("");
  const [editModel, setEditModel] = useState("");
  const [editPlateNumber, setEditPlateNumber] = useState("");
  const [editYear, setEditYear] = useState("");

  // ===== DATA STATE (ASYNC) =====
  const [vehiclesRaw, setVehiclesRaw] = useState([]);
  const [loading, setLoading] = useState(false);

  // ===== HELPERS =====
  const refresh = () => setRefreshKey((x) => x + 1);
  const showToast = (type, msg) => setToast({ type, msg });

  const parseYear = (v) => {
    const n = Number(String(v).trim());
    if (!n) return null;
    if (n < 1900 || n > new Date().getFullYear() + 1) return null;
    return n;
  };

  /* =========================
     PLATE VALIDATION (WAJIB "B 1239 ODF")
  ========================= */
  const isValidPlateFormat = (s) => {
    const plate = normalizePlateFinal(s);
    // [Huruf 1-2] spasi [Angka 1-4] spasi [Huruf 1-3]
    return /^[A-Z]{1,2}\s\d{1,4}\s[A-Z]{1,3}$/.test(plate);
  };

  // brand wajib minimal 2 char, plate wajib format dengan spasi
  const validateForm = (b, p) => {
    const brandOk = (b ?? "").trim().length >= 2;
    const plateOk = isValidPlateFormat(p);
    return brandOk && plateOk;
  };

  const canSubmit = validateForm(brand, plateNumber);

  // ===== FETCH VEHICLES (ASYNC) =====
  useEffect(() => {
    let alive = true;

    (async () => {
      setLoading(true);
      try {
        const data = await listVehicles();
        if (!alive) return;
        setVehiclesRaw(Array.isArray(data) ? data : []);
      } catch (err) {
        if (!alive) return;
        showToast("error", err?.message || "Gagal memuat kendaraan.");
        setVehiclesRaw([]);
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [refreshKey]);

  // ===== FILTER (CLIENT-SIDE SEARCH) =====
  const filtered = useMemo(() => {
    const q = (debouncedSearch || "").trim().toLowerCase();
    if (!q) return vehiclesRaw;

    return vehiclesRaw.filter((v) => {
      const brand = (v.brand || "").toLowerCase();
      const model = (v.model || "").toLowerCase();
      const plate = (v.plate_number || "").toLowerCase();
      const year = v.year != null ? String(v.year) : "";
      return (
        brand.includes(q) || model.includes(q) || plate.includes(q) || year.includes(q)
      );
    });
  }, [vehiclesRaw, debouncedSearch]);

  // ===== SORTED VEHICLES =====
  const vehicles = useMemo(() => {
    const arr = [...filtered];
    const { key, dir } = sort;

    arr.sort((a, b) => {
      const va = (a[key] ?? "").toString().toLowerCase();
      const vb = (b[key] ?? "").toString().toLowerCase();
      if (va < vb) return dir === "asc" ? -1 : 1;
      if (va > vb) return dir === "asc" ? 1 : -1;
      return 0;
    });

    return arr;
  }, [filtered, sort]);

  // ===== ADD =====
  const onAdd = async (e) => {
    e.preventDefault();

    const payload = {
      brand: brand.trim() || null,
      model: model.trim() || null,
      plate_number: normalizePlateFinal(plateNumber),
      year: parseYear(year),
    };

    if (!validateForm(payload.brand ?? "", payload.plate_number)) {
      showToast("error", 'Plat wajib format "B 1239 ODF" (pakai spasi).');
      return;
    }

    try {
      await createVehicle(payload);
      setBrand("");
      setModel("");
      setPlateNumber("");
      setYear("");
      refresh();
      showToast("success", "Kendaraan berhasil ditambahkan ✅");
    } catch (err) {
      showToast("error", err?.message || "Gagal menambah kendaraan.");
    }
  };

  // ===== DELETE =====
  const requestDelete = (v) => setDeleteTarget(v);

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteVehicle(deleteTarget.id);
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
    setEditModel(v.model || "");
    setEditPlateNumber(v.plate_number || "");
    setEditYear(v.year != null ? String(v.year) : "");
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditBrand("");
    setEditModel("");
    setEditPlateNumber("");
    setEditYear("");
  };

  const saveEdit = async (id) => {
    const payload = {
      brand: editBrand.trim() || null,
      model: editModel.trim() || null,
      plate_number: normalizePlateFinal(editPlateNumber),
      year: parseYear(editYear),
    };

    if (!validateForm(payload.brand ?? "", payload.plate_number)) {
      showToast("error", 'Plat edit wajib format "B 1239 ODF" (pakai spasi).');
      return;
    }

    try {
      await updateVehicle(id, payload);
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

      <Toast toast={toast} onClose={() => setToast(null)} />

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        {/* LEFT: ADD */}
        <div style={card()}>
          <h3 style={{ marginTop: 0, color: THEME.textTitle }}>Tambah Kendaraan</h3>

          <form onSubmit={onAdd} style={{ display: "grid", gap: 10 }}>
            <input
              placeholder="Brand"
              value={brand}
              onChange={(e) => setBrand(e.target.value)}
              style={inp()}
              required
              disabled={loading}
            />

            <input
              placeholder="Model (opsional)"
              value={model}
              onChange={(e) => setModel(e.target.value)}
              style={inp()}
              disabled={loading}
            />

            <input
              placeholder='Plat (contoh: "B 1239 ODF")'
              value={plateNumber}
              onChange={(e) => setPlateNumber(normalizePlateTyping(e.target.value))}
              onBlur={() => setPlateNumber(normalizePlateFinal(plateNumber))}
              style={inp()}
              required
              disabled={loading}
            />

            <input
              placeholder="Tahun (opsional)"
              value={year}
              onChange={(e) => setYear(e.target.value.replace(/[^\d]/g, ""))}
              style={inp()}
              inputMode="numeric"
              disabled={loading}
            />

            <button
              style={btnPrimary(!canSubmit || loading)}
              type="submit"
              disabled={!canSubmit || loading}
            >
              {loading ? "Memuat..." : "Simpan"}
            </button>
          </form>

          <p style={{ marginTop: 10, color: THEME.textMuted, fontSize: 13 }}>
            Plate number wajib unik. Kalau sama, backend bakal nolak (tegas tapi adil).
          </p>
        </div>

        {/* RIGHT: LIST */}
        <div style={card()}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 10,
            }}
          >
            <h3 style={{ marginTop: 0, color: THEME.textTitle }}>Daftar Kendaraan</h3>
            <div style={{ color: THEME.textMuted, fontSize: 13 }}>
              Total: <b style={{ color: THEME.textStrong }}>{vehicles.length}</b>
            </div>
          </div>

          <input
            placeholder="Search brand/model/plat..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ ...inp(), width: "95%", marginBottom: 10 }}
            disabled={loading}
          />

          <table width="100%" cellPadding="10" style={{ borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: THEME.tableHeadBg, color: THEME.textTitle }}>
                <th align="left" style={thClickable()} onClick={() => toggleSort("brand")}>
                  Brand {sortIcon(sort, "brand")}
                </th>
                <th align="left" style={thClickable()} onClick={() => toggleSort("model")}>
                  Model {sortIcon(sort, "model")}
                </th>
                <th
                  align="left"
                  style={thClickable()}
                  onClick={() => toggleSort("plate_number")}
                >
                  Plate {sortIcon(sort, "plate_number")}
                </th>
                <th align="left" style={thClickable()} onClick={() => toggleSort("year")}>
                  Year {sortIcon(sort, "year")}
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
                          disabled={loading}
                        />
                      ) : (
                        <Highlighted text={v.brand} q={debouncedSearch} />
                      )}
                    </td>

                    <td style={{ color: THEME.textBody }}>
                      {isEditing ? (
                        <input
                          value={editModel}
                          onChange={(e) => setEditModel(e.target.value)}
                          style={{ ...inp(), width: "100%" }}
                          disabled={loading}
                        />
                      ) : (
                        <Highlighted text={v.model} q={debouncedSearch} />
                      )}
                    </td>

                    <td>
                      {isEditing ? (
                        <input
                          value={editPlateNumber}
                          onChange={(e) => setEditPlateNumber(normalizePlateTyping(e.target.value))}
                          onBlur={() =>
                            setEditPlateNumber(normalizePlateFinal(editPlateNumber))
                          }
                          style={{ ...inp(), width: "100%" }}
                          disabled={loading}
                        />
                      ) : (
                        <b style={{ color: THEME.textStrong }}>
                          <Highlighted text={v.plate_number} q={debouncedSearch} strong />
                        </b>
                      )}
                    </td>

                    <td style={{ color: THEME.textBody }}>
                      {isEditing ? (
                        <input
                          value={editYear}
                          onChange={(e) => setEditYear(e.target.value.replace(/[^\d]/g, ""))}
                          style={{ ...inp(), width: "100%" }}
                          inputMode="numeric"
                          disabled={loading}
                        />
                      ) : (
                        <span>{v.year ?? "-"}</span>
                      )}
                    </td>

                    <td style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      {isEditing ? (
                        <>
                          <button
                            onClick={() => saveEdit(v.id)}
                            style={btnPrimary(false)}
                            type="button"
                            disabled={loading}
                          >
                            Simpan
                          </button>
                          <button
                            onClick={cancelEdit}
                            style={btnGhost()}
                            type="button"
                            disabled={loading}
                          >
                            Batal
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => startEdit(v)}
                            style={btnGhost()}
                            type="button"
                            disabled={loading}
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => requestDelete(v)}
                            style={btnDanger()}
                            type="button"
                            disabled={loading}
                          >
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
                  <td colSpan="5" style={{ color: THEME.textMuted }}>
                    {loading
                      ? "Memuat data..."
                      : "Belum ada data. Tambahin 1 dulu biar tabelnya punya teman ngobrol."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal
        open={!!deleteTarget}
        title="Konfirmasi Hapus"
        onClose={() => setDeleteTarget(null)}
        footer={
          <>
            <button
              style={btnGhost()}
              onClick={() => setDeleteTarget(null)}
              disabled={loading}
            >
              Batal
            </button>
            <button style={btnDanger()} onClick={confirmDelete} disabled={loading}>
              Ya, Hapus
            </button>
          </>
        }
      >
        {deleteTarget ? (
          <div style={{ color: THEME.textBody, lineHeight: 1.5 }}>
            Hapus kendaraan:
            <div style={{ marginTop: 8 }}>
              <b>{deleteTarget.brand}</b> — <b>{deleteTarget.plate_number}</b>
            </div>
            <div style={{ marginTop: 8, color: THEME.textMuted, fontSize: 13 }}>
              Ini beneran dihapus ya, bukan di-"seen" doang.
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

/* =========================
   PLATE NORMALIZE
========================= */
function normalizePlateTyping(s) {
  // enak buat input: boleh trailing space, tapi tetap rapi
  return (s || "")
    .toUpperCase()
    .replace(/[^A-Z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .replace(/^\s+/, ""); // hapus spasi di depan saja
}

function normalizePlateFinal(s) {
  // buat simpan: no leading/trailing spaces
  return normalizePlateTyping(s).trim();
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
          width: "min(720px, 100%)",
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