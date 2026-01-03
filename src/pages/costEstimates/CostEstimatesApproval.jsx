import { useEffect, useMemo, useState } from "react";
import { api } from "../../services/api"; // 🔴 SESUAIKAN PATH

/**
 * CostEstimatesApproval.jsx
 * - List cost estimate (biasanya status submitted untuk approval)
 * - Approve / Reject
 *
 * Endpoint:
 * - GET  /api/admin/cost-estimates?status=submitted
 * - POST /api/admin/cost-estimates/{id}/approve
 * - POST /api/admin/cost-estimates/{id}/reject  (note opsional)
 */

/* =========================
   Helpers
========================= */
function unwrapList(resBody) {
  // resBody adalah "res.data" dari axios
  if (Array.isArray(resBody)) return resBody;
  if (resBody && Array.isArray(resBody.data)) return resBody.data;
  if (resBody && resBody.data && Array.isArray(resBody.data.data)) return resBody.data.data;
  return [];
}

function safeStr(v, fallback = "-") {
  const s = v == null ? "" : String(v);
  return s.trim() ? s : fallback;
}

function safeInt(v, fallback = 0) {
  const n = Number.parseInt(String(v), 10);
  return Number.isFinite(n) ? n : fallback;
}

function moneyId(n) {
  try {
    return new Intl.NumberFormat("id-ID").format(Number(n || 0));
  } catch (_) {
    return String(n || 0);
  }
}

const chipStyle = (bg) => ({
  display: "inline-flex",
  alignItems: "center",
  padding: "4px 10px",
  borderRadius: 999,
  background: bg,
  color: "#0f172a",
  fontSize: 12,
  fontWeight: 800,
});

function statusChip(status) {
  const s = (status || "").toLowerCase();
  if (s === "approved") return <span style={chipStyle("#bbf7d0")}>approved</span>;
  if (s === "submitted") return <span style={chipStyle("#fde68a")}>submitted</span>;
  if (s === "rejected") return <span style={chipStyle("#fecaca")}>rejected</span>;
  if (s === "draft") return <span style={chipStyle("#e5e7eb")}>draft</span>;
  return <span style={chipStyle("#e5e7eb")}>{safeStr(status, "-")}</span>;
}

function Modal({ open, title, children, onClose }) {
  if (!open) return null;

  return (
    <div
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose?.();
      }}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(15, 23, 42, 0.45)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
        zIndex: 50,
      }}
    >
      <div
        style={{
          width: "min(680px, 100%)",
          background: "#fff",
          borderRadius: 16,
          boxShadow: "0 15px 40px rgba(0,0,0,0.25)",
          overflow: "hidden",
        }}
      >
        <div style={{ padding: 14, borderBottom: "1px solid #e5e7eb", display: "flex", gap: 10 }}>
          <div style={{ fontWeight: 900, fontSize: 16, flex: 1 }}>{title}</div>
          <button
            onClick={onClose}
            style={{
              border: "1px solid #e5e7eb",
              background: "#fff",
              borderRadius: 10,
              padding: "6px 10px",
              cursor: "pointer",
              fontWeight: 800,
            }}
          >
            ✕
          </button>
        </div>
        <div style={{ padding: 14 }}>{children}</div>
      </div>
    </div>
  );
}

function Field({ label, children, hint }) {
  return (
    <div style={{ display: "grid", gap: 6 }}>
      <div style={{ fontSize: 12, fontWeight: 900, color: "#0f172a" }}>{label}</div>
      {children}
      {hint ? <div style={{ fontSize: 12, color: "#64748b" }}>{hint}</div> : null}
    </div>
  );
}

function Input({ ...props }) {
  return (
    <input
      {...props}
      style={{
        width: "100%",
        border: "1px solid #e5e7eb",
        borderRadius: 12,
        padding: "10px 12px",
        outline: "none",
        fontSize: 14,
        ...props.style,
      }}
    />
  );
}

function Textarea({ ...props }) {
  return (
    <textarea
      {...props}
      style={{
        width: "100%",
        border: "1px solid #e5e7eb",
        borderRadius: 12,
        padding: "10px 12px",
        outline: "none",
        fontSize: 14,
        resize: "vertical",
        ...props.style,
      }}
    />
  );
}

function Button({ variant = "primary", ...props }) {
  const styles =
    variant === "primary"
      ? { background: "#2563eb", color: "#fff", border: "1px solid #2563eb" }
      : variant === "danger"
      ? { background: "#dc2626", color: "#fff", border: "1px solid #dc2626" }
      : variant === "ghost"
      ? { background: "#fff", color: "#0f172a", border: "1px solid #e5e7eb" }
      : { background: "#0f172a", color: "#fff", border: "1px solid #0f172a" };

  return (
    <button
      {...props}
      style={{
        borderRadius: 12,
        padding: "10px 12px",
        fontWeight: 900,
        cursor: props.disabled ? "not-allowed" : "pointer",
        opacity: props.disabled ? 0.6 : 1,
        ...styles,
        ...props.style,
      }}
    />
  );
}

/* ===== mapping relasi ===== */
function getPlateFromEstimate(e) {
  const dr = e?.damage_report || e?.damageReport || e?.damage_report_id;
  const report = typeof dr === "object" && dr ? dr : e?.damage_report_rel;
  const vehicle = report?.vehicle;
  return safeStr(vehicle?.plate_number || vehicle?.plate || vehicle?.plateNumber, "-");
}

function getReportIdFromEstimate(e) {
  const dr = e?.damage_report || e?.damageReport;
  return safeInt(dr?.id || e?.damage_report_id, 0);
}

function getTechFromEstimate(e) {
  const tech = e?.technician;
  return safeStr(tech?.username || tech?.name || tech?.email, "-");
}

/* =========================
   Component
========================= */
export default function CostEstimatesApproval() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  // filters
  const [status, setStatus] = useState("submitted");
  const [q, setQ] = useState("");

  // reject modal
  const [openReject, setOpenReject] = useState(false);
  const [active, setActive] = useState(null);
  const [rejectNote, setRejectNote] = useState("");
  const [saving, setSaving] = useState(false);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return items;

    return items.filter((e) => {
      const plate = getPlateFromEstimate(e).toLowerCase();
      const tech = getTechFromEstimate(e).toLowerCase();
      const rid = String(getReportIdFromEstimate(e));
      const st = safeStr(e?.status, "").toLowerCase();
      const id = String(e?.id ?? "");
      return (
        plate.includes(needle) ||
        tech.includes(needle) ||
        rid.includes(needle) ||
        st.includes(needle) ||
        id.includes(needle)
      );
    });
  }, [items, q]);

  async function load() {
    setLoading(true);
    setErr("");
    try {
      const res = await api.get("/admin/cost-estimates", { params: { status } });
      setItems(unwrapList(res.data));
    } catch (e) {
      setErr(e.message || String(e));
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  async function approve(id) {
    const cid = safeInt(id, 0);
    if (cid <= 0) return alert("CostEstimate ID tidak valid.");

    setSaving(true);
    try {
      await api.post(`/admin/cost-estimates/${cid}/approve`, {}); // body kosong OK
      await load();
    } catch (e) {
      alert(e.message || String(e));
    } finally {
      setSaving(false);
    }
  }

  function openRejectModal(item) {
    setActive(item);
    setRejectNote("");
    setOpenReject(true);
  }

  async function reject() {
    const cid = safeInt(active?.id, 0);
    if (cid <= 0) return alert("CostEstimate ID tidak valid.");

    setSaving(true);
    try {
      await api.post(`/admin/cost-estimates/${cid}/reject`, rejectNote.trim() ? { note: rejectNote.trim() } : {});
      setOpenReject(false);
      setActive(null);
      await load();
    } catch (e) {
      alert(e.message || String(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ padding: 18 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <div style={{ fontSize: 20, fontWeight: 1000, color: "#0f172a" }}>Approval Estimasi Biaya</div>

        <div style={{ marginLeft: "auto", display: "flex", gap: 10, flexWrap: "wrap" }}>
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Cari plat / teknisi / reportId / status..."
            style={{ width: 320 }}
          />

          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            style={{
              border: "1px solid #e5e7eb",
              borderRadius: 12,
              padding: "10px 12px",
              fontWeight: 900,
              background: "#fff",
              cursor: "pointer",
            }}
          >
            <option value="submitted">submitted (pending)</option>
            <option value="approved">approved</option>
            <option value="rejected">rejected</option>
            <option value="draft">draft</option>
            <option value="all">all</option>
          </select>

          <Button variant="ghost" onClick={load} disabled={loading}>
            {loading ? "Loading..." : "Refresh"}
          </Button>
        </div>
      </div>

      <div style={{ marginTop: 12 }}>
        {err ? (
          <div
            style={{
              background: "#fee2e2",
              color: "#991b1b",
              padding: 12,
              borderRadius: 14,
              border: "1px solid #fecaca",
              fontWeight: 800,
            }}
          >
            {err}
          </div>
        ) : null}

        <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
          {loading ? (
            <div style={{ padding: 12, border: "1px solid #e5e7eb", borderRadius: 14, background: "#fff" }}>
              Loading...
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ padding: 12, border: "1px solid #e5e7eb", borderRadius: 14, background: "#fff" }}>
              Tidak ada data.
            </div>
          ) : (
            filtered.map((e) => {
              const id = safeInt(e?.id, 0);
              const st = safeStr(e?.status, "-");

              const labor = safeInt(e?.labor_cost, 0);
              const parts = safeInt(e?.parts_cost, 0);
              const other = safeInt(e?.other_cost, 0);
              const total = safeInt(e?.total_cost, labor + parts + other);

              const note = safeStr(e?.note, "-");
              const plate = getPlateFromEstimate(e);
              const tech = getTechFromEstimate(e);
              const reportId = getReportIdFromEstimate(e);

              const canApprove = String(st).toLowerCase() === "submitted";
              const canReject = String(st).toLowerCase() === "submitted";

              return (
                <div
                  key={id || Math.random()}
                  style={{
                    border: "1px solid #e5e7eb",
                    borderRadius: 16,
                    background: "#fff",
                    padding: 14,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                    <div style={{ fontWeight: 1000, color: "#0f172a" }}>
                      {plate} <span style={{ color: "#64748b", fontWeight: 900 }}>•</span> Report #{reportId}
                      <span style={{ color: "#64748b", fontWeight: 900 }}> • </span> Estimate #{id}
                    </div>
                    <div style={{ color: "#64748b", fontWeight: 900 }}>Teknisi: {tech}</div>
                    <div style={{ marginLeft: "auto" }}>{statusChip(st)}</div>
                  </div>

                  <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
                    <div style={{ display: "grid", gridTemplateColumns: "170px 1fr", gap: 10 }}>
                      <div style={{ color: "#64748b", fontWeight: 900 }}>Labor/Jasa</div>
                      <div style={{ fontWeight: 900 }}>Rp {moneyId(labor)}</div>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "170px 1fr", gap: 10 }}>
                      <div style={{ color: "#64748b", fontWeight: 900 }}>Sparepart</div>
                      <div style={{ fontWeight: 900 }}>Rp {moneyId(parts)}</div>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "170px 1fr", gap: 10 }}>
                      <div style={{ color: "#64748b", fontWeight: 900 }}>Lainnya</div>
                      <div style={{ fontWeight: 900 }}>Rp {moneyId(other)}</div>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "170px 1fr", gap: 10 }}>
                      <div style={{ color: "#64748b", fontWeight: 900 }}>Total</div>
                      <div style={{ fontWeight: 1000 }}>Rp {moneyId(total)}</div>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "170px 1fr", gap: 10 }}>
                      <div style={{ color: "#64748b", fontWeight: 900 }}>Catatan teknisi</div>
                      <div style={{ fontWeight: 800 }}>{note}</div>
                    </div>
                  </div>

                  <div style={{ marginTop: 12, display: "flex", gap: 10, flexWrap: "wrap" }}>
                    <Button variant="primary" disabled={!canApprove || saving} onClick={() => approve(id)}>
                      Approve
                    </Button>
                    <Button variant="danger" disabled={!canReject || saving} onClick={() => openRejectModal(e)}>
                      Reject
                    </Button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* REJECT MODAL */}
      <Modal
        open={openReject}
        title={`Reject Estimasi #${safeStr(active?.id, "-")} • ${getPlateFromEstimate(active)}`}
        onClose={() => (saving ? null : setOpenReject(false))}
      >
        <div style={{ display: "grid", gap: 12 }}>
          <Field label="Catatan admin (opsional)" hint="Isi alasan reject supaya teknisi bisa revisi">
            <Textarea
              rows={3}
              value={rejectNote}
              onChange={(e) => setRejectNote(e.target.value)}
              placeholder="contoh: rincian sparepart kurang jelas / biaya terlalu besar..."
            />
          </Field>

          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
            <Button variant="ghost" onClick={() => setOpenReject(false)} disabled={saving}>
              Batal
            </Button>
            <Button variant="danger" onClick={reject} disabled={saving}>
              {saving ? "Menyimpan..." : "Ya, Reject"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
